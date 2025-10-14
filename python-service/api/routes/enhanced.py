"""
Enhanced API Routes for Ashley AI with PyTorch and Internet Access
"""

import logging
from uuid import uuid4
from typing import Any, Dict, List, Optional, Tuple

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, root_validator

from app.persona_registry import MODEL_CATEGORIES, PERSONA_CATEGORIES, persona_payload
from core.enhanced_chat_engine import get_enhanced_chat_engine
from core.pytorch_manager import get_pytorch_manager
from tools.internet_access import get_internet_manager

logger = logging.getLogger(__name__)

router = APIRouter()


class ChatMessagePayload(BaseModel):
    role: str
    content: str

    @root_validator(pre=True)
    def validate_fields(cls, values: Dict[str, Any]) -> Dict[str, Any]:
        role = (values.get("role") or "").strip().lower()
        content = values.get("content")
        if role not in {"system", "user", "assistant"}:
            raise ValueError("role must be 'system', 'user', or 'assistant'")
        if content is None or str(content).strip() == "":
            raise ValueError("content is required for each chat message")
        values["role"] = role
        values["content"] = str(content)
        return values


class EnhancedChatRequest(BaseModel):
    message: Optional[str] = Field(
        None, description="Latest user message. Optional if provided in messages history."
    )
    messages: Optional[List[ChatMessagePayload]] = Field(
        default=None,
        description="Full conversation history in chronological order.",
    )
    persona: Optional[str] = Field(None, description="Persona identifier to use.")
    use_internet: Optional[bool] = Field(
        None, description="Force internet usage (auto-detect when omitted)."
    )
    model_id: Optional[str] = Field(
        None, description="Specific model to use. Use 'auto' for automatic routing."
    )
    max_new_tokens: Optional[int] = Field(
        1024, description="Maximum tokens to generate for this response."
    )
    temperature: Optional[float] = Field(
        0.7, description="Sampling temperature for generation."
    )
    top_p: Optional[float] = Field(0.9, description="Top-p nucleus sampling value.")

    @root_validator(pre=True)
    def ensure_message_payload(cls, values: Dict[str, Any]) -> Dict[str, Any]:
        message = values.get("message")
        messages = values.get("messages")
        if not message and not messages:
            raise ValueError("Either 'message' or 'messages' must be provided.")
        return values


class EnhancedChatResponse(BaseModel):
    response: str
    message: str
    messages: List[Dict[str, str]]
    persona_used: str
    persona_label: Optional[str] = None
    internet_used: bool
    model_used: Optional[str] = None
    allowed_models: List[str] = Field(default_factory=list)
    sources: List[str] = Field(default_factory=list)
    generation_time: float
    error: Optional[str] = None


class InternetSearchRequest(BaseModel):
    query: str = Field(..., description="Search query")
    max_results: Optional[int] = Field(5, description="Maximum results to return.")


class InternetSearchResponse(BaseModel):
    query: str
    results: Dict[str, Any]
    total_results: int
    sources_used: List[str]
    timestamp: str


class ModelSwitchRequest(BaseModel):
    model_id: str = Field(..., description="Model ID to switch to")


class PersonaSetRequest(BaseModel):
    persona_name: str = Field(..., description="Persona name to set")


class SystemStatusResponse(BaseModel):
    pytorch_models: Dict[str, Any]
    internet_access: Dict[str, Any]
    current_persona: str
    context_length: int
    system_time: str


class ModelListResponse(BaseModel):
    models: List[Dict[str, Any]]


class FineTuningRequest(BaseModel):
    model_id: str = Field(..., description="Model to prepare for fine-tuning")
    lora_config: Optional[Dict[str, Any]] = Field(
        None, description="LoRA configuration"
    )


def _resolve_history_and_message(
    request: EnhancedChatRequest,
) -> Tuple[List[Dict[str, str]], str]:
    history: List[Dict[str, str]] = []
    if request.messages:
        history = [msg.dict() for msg in request.messages]

    latest_message = request.message
    if latest_message:
        latest_message = latest_message.strip()
        if not latest_message:
            latest_message = None

    if not latest_message and history:
        latest_message = history[-1]["content"]

    if not latest_message:
        raise HTTPException(
            status_code=400,
            detail="Unable to resolve user message from payload.",
        )

    if request.message:
        # Ensure latest user turn is present in history when message provided separately.
        if not history or history[-1]["content"] != request.message:
            history.append({"role": "user", "content": request.message.strip()})

    return history, latest_message


# Proxy-compatible endpoints for Next.js
@router.post("/chat", response_model=EnhancedChatResponse)
async def proxy_chat(request: EnhancedChatRequest):
    try:
        history, user_message = _resolve_history_and_message(request)

        chat_engine = get_enhanced_chat_engine()
        result = chat_engine.generate_response(
            message=user_message,
            persona_name=request.persona,
            history=history,
            use_internet=request.use_internet,
            model_id=request.model_id,
            max_new_tokens=request.max_new_tokens,
            temperature=request.temperature,
            top_p=request.top_p,
        )

        assistant_text = result.get("response") or ""
        conversation = [*history, {"role": "assistant", "content": assistant_text}]

        payload = {
            **result,
            "response": assistant_text,
            "message": assistant_text,
            "messages": conversation,
            "allowed_models": result.get("allowed_models", []),
        }
        return JSONResponse(payload)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Proxy chat error")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/chat/models")
async def proxy_chat_models():
    try:
        pytorch_manager = get_pytorch_manager()
        models = pytorch_manager.list_available_models()
        return {
            "models": models,
            "categories": MODEL_CATEGORIES,
            "model_categories": MODEL_CATEGORIES,
        }
    except Exception as e:
        logger.error(f"Proxy chat models error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/personas")
async def proxy_personas():
    try:
        pytorch_manager = get_pytorch_manager()
        models = pytorch_manager.list_available_models()
        personas = persona_payload(models)
        return {
            "personas": personas,
            "models": models,
            "persona_categories": PERSONA_CATEGORIES,
            "model_categories": MODEL_CATEGORIES,
        }
    except Exception as e:
        logger.error(f"Proxy personas error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/image")
async def proxy_image(payload: Dict[str, Any]):
    try:
        prompt = (payload.get("prompt") or "").strip()
        if not prompt:
            raise HTTPException(status_code=400, detail="Prompt is required")

        size = (payload.get("size") or "1024x1024").lower()
        width, height = {
            "1792x1024": (1792, 1024),
            "1024x1792": (1024, 1792),
        }.get(size, (1024, 1024))

        seed = uuid4().hex
        image_url = f"https://picsum.photos/seed/{seed}/{width}/{height}"
        return {
            "success": True,
            "image_url": image_url,
            "prompt_used": prompt,
            "persona_used": payload.get("persona"),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Proxy image error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/internet")
async def proxy_internet(payload: 'InternetSearchRequest'):
    try:
        internet_manager = get_internet_manager()
        results = internet_manager.comprehensive_search(payload.query)
        return results
    except Exception as e:
        logger.error(f"Proxy internet error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Request/Response Models
# Enhanced Chat Endpoint
@router.post("/chat/enhanced", response_model=EnhancedChatResponse)
async def enhanced_chat(request: EnhancedChatRequest):
    """
    Enhanced chat with PyTorch models, internet access, and personas
    """
    try:
        chat_engine = get_enhanced_chat_engine()
        
        # Generate response with all enhancements
        result = chat_engine.generate_response(
            message=request.message,
            persona_name=request.persona,
            use_internet=request.use_internet,
            model_id=request.model_id,
            max_new_tokens=request.max_new_tokens,
            temperature=request.temperature,
            top_p=request.top_p
        )
        
        return EnhancedChatResponse(**result)
        
    except Exception as e:
        logger.error(f"Enhanced chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Internet Search Endpoint
@router.post("/internet/search", response_model=InternetSearchResponse)
async def internet_search(request: InternetSearchRequest):
    """
    Perform comprehensive internet search
    """
    try:
        internet_manager = get_internet_manager()
        
        # Update max_results in config temporarily
        original_max = internet_manager.config.get("max_results", 5)
        internet_manager.config["max_results"] = request.max_results
        
        # Perform search
        results = internet_manager.comprehensive_search(request.query)
        
        # Restore original config
        internet_manager.config["max_results"] = original_max
        
        return InternetSearchResponse(
            query=results["query"],
            results=results["results"],
            total_results=results["total_results"],
            sources_used=results["sources_used"],
            timestamp=results["timestamp"]
        )
        
    except Exception as e:
        logger.error(f"Internet search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Model Management Endpoints
@router.get("/models/list", response_model=ModelListResponse)
async def list_models():
    """
    List available PyTorch models
    """
    try:
        pytorch_manager = get_pytorch_manager()
        models = pytorch_manager.list_available_models()
        
        return ModelListResponse(models=models)
        
    except Exception as e:
        logger.error(f"List models error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/models/switch")
async def switch_model(request: ModelSwitchRequest):
    """
    Switch to a different PyTorch model
    """
    try:
        chat_engine = get_enhanced_chat_engine()
        success = chat_engine.switch_model(request.model_id)
        
        if success:
            return {"message": f"Successfully switched to model {request.model_id}"}
        else:
            raise HTTPException(status_code=400, detail=f"Failed to switch to model {request.model_id}")
            
    except Exception as e:
        logger.error(f"Model switch error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/models/prepare-training")
async def prepare_model_for_training(request: FineTuningRequest):
    """
    Prepare a model for fine-tuning
    """
    try:
        pytorch_manager = get_pytorch_manager()
        
        # Load model if not already loaded
        if not pytorch_manager.load_model(request.model_id):
            raise HTTPException(status_code=400, detail=f"Failed to load model {request.model_id}")
        
        # Prepare for fine-tuning
        success = pytorch_manager.prepare_for_finetuning(
            request.model_id,
            lora_config=request.lora_config
        )
        
        if success:
            return {"message": f"Model {request.model_id} prepared for fine-tuning"}
        else:
            raise HTTPException(status_code=400, detail=f"Failed to prepare model {request.model_id} for training")
            
    except Exception as e:
        logger.error(f"Prepare training error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Persona Management
@router.post("/persona/set")
async def set_persona(request: PersonaSetRequest):
    """
    Set the current persona
    """
    try:
        chat_engine = get_enhanced_chat_engine()
        success = chat_engine.set_persona(request.persona_name)
        
        if success:
            return {"message": f"Persona set to {request.persona_name}"}
        else:
            raise HTTPException(status_code=400, detail=f"Failed to set persona to {request.persona_name}")
            
    except Exception as e:
        logger.error(f"Set persona error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/persona/current")
async def get_current_persona():
    """
    Get the current persona
    """
    try:
        chat_engine = get_enhanced_chat_engine()
        return {"current_persona": chat_engine.current_persona}
        
    except Exception as e:
        logger.error(f"Get persona error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# System Status and Management
@router.get("/system/status", response_model=SystemStatusResponse)
async def get_system_status():
    """
    Get comprehensive system status
    """
    try:
        chat_engine = get_enhanced_chat_engine()
        status = chat_engine.get_system_status()
        
        return SystemStatusResponse(**status)
        
    except Exception as e:
        logger.error(f"System status error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/internet/usage")
async def get_internet_usage():
    """
    Get internet API usage statistics
    """
    try:
        internet_manager = get_internet_manager()
        usage_report = internet_manager.get_usage_status()
        
        return usage_report
        
    except Exception as e:
        logger.error(f"Internet usage error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/context/clear")
async def clear_context():
    """
    Clear conversation context
    """
    try:
        chat_engine = get_enhanced_chat_engine()
        chat_engine.clear_context()
        
        return {"message": "Context cleared successfully"}
        
    except Exception as e:
        logger.error(f"Clear context error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Model Information and Memory Management
@router.get("/models/info")
async def get_model_info():
    """
    Get detailed model information and memory usage
    """
    try:
        pytorch_manager = get_pytorch_manager()
        info = pytorch_manager.get_model_info()
        
        return info
        
    except Exception as e:
        logger.error(f"Model info error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/models/unload")
async def unload_model(model_id: Optional[str] = None):
    """
    Unload model to free memory
    """
    try:
        pytorch_manager = get_pytorch_manager()
        pytorch_manager.unload_model(model_id)
        
        if model_id:
            return {"message": f"Model {model_id} unloaded successfully"}
        else:
            return {"message": "Current model unloaded successfully"}
            
    except Exception as e:
        logger.error(f"Unload model error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Health Check for Enhanced System
@router.get("/health/enhanced")
async def enhanced_health_check():
    """
    Comprehensive health check for enhanced system
    """
    try:
        chat_engine = get_enhanced_chat_engine()
        pytorch_manager = get_pytorch_manager()
        internet_manager = get_internet_manager()
        
        health_status = {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "components": {
                "pytorch_manager": {
                    "status": "available" if pytorch_manager.current_model else "no_model_loaded",
                    "device": pytorch_manager.device,
                    "models_loaded": len([m for m in pytorch_manager.models.values() if m.get("loaded", False)])
                },
                "internet_manager": {
                    "status": "available",
                    "cache_size": len(internet_manager.cache)
                },
                "chat_engine": {
                    "status": "available",
                    "current_persona": chat_engine.current_persona,
                    "context_length": len(chat_engine.context_history)
                }
            }
        }
        
        return health_status
        
    except Exception as e:
        logger.error(f"Enhanced health check error: {e}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

# Utility endpoint for testing internet connection
@router.get("/internet/test")
async def test_internet_connection():
    """
    Test internet connectivity and API quotas
    """
    try:
        internet_manager = get_internet_manager()
        
        # Test with a simple query
        test_query = "test connectivity"
        results = internet_manager.search_duckduckgo_free(test_query)
        
        usage_report = internet_manager.get_usage_status()
        
        return {
            "internet_accessible": len(results) > 0,
            "test_results": len(results),
            "usage_report": usage_report,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Internet test error: {e}")
        return {
            "internet_accessible": False,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }
