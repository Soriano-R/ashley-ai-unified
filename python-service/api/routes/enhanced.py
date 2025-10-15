"""
Enhanced API Routes for Ashley AI with PyTorch and Internet Access
"""

import asyncio
import logging
from copy import deepcopy
from datetime import datetime
from uuid import uuid4
from typing import Any, Dict, List, Optional, Tuple, Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, root_validator

from app.persona_registry import (
    MODEL_CATEGORIES,
    get_persona_categories,
    persona_payload,
)
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


class ChatMessage(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str


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
    messages: List[ChatMessage]
    persona_used: str
    persona_label: Optional[str] = None
    internet_used: bool
    model_used: Optional[str] = None
    allowed_models: List[str] = Field(default_factory=list)
    sources: List[str] = Field(default_factory=list)
    generation_time: float
    error: Optional[str] = None
    warning: Optional[str] = None


class InternetSearchRequest(BaseModel):
    query: str = Field(..., description="Search query")
    max_results: Optional[int] = Field(5, description="Maximum results to return.")


class InternetSearchResponse(BaseModel):
    query: str
    results: Dict[str, Any]
    total_results: int
    sources_used: List[str]
    timestamp: str


class ModelCatalogResponse(BaseModel):
    models: List[Dict[str, Any]]
    categories: Dict[str, Dict[str, str]]
    model_categories: Dict[str, Dict[str, str]]


class PersonaCatalogResponse(BaseModel):
    personas: List[Dict[str, Any]]
    models: List[Dict[str, Any]]
    persona_categories: Dict[str, Dict[str, str]]
    model_categories: Dict[str, Dict[str, str]]
    warning: Optional[str] = None


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


class MessageResponse(BaseModel):
    message: str


class ModelInfoResponse(BaseModel):
    info: Dict[str, Any]


class ImageGenerationResponse(BaseModel):
    success: bool
    image_url: str
    prompt_used: str
    persona_used: Optional[str] = None


class CurrentPersonaResponse(BaseModel):
    current_persona: str


class InternetUsageResponse(BaseModel):
    timestamp: str
    services: Dict[str, Any]


class HealthComponentStatus(BaseModel):
    status: Literal["available", "unavailable", "degraded"]
    detail: Optional[str] = None


class HealthSummaryResponse(BaseModel):
    status: Literal["healthy", "unhealthy"]
    timestamp: str
    components: Dict[str, HealthComponentStatus]


class InternetTestResponse(BaseModel):
    internet_accessible: bool
    timestamp: str
    test_results: Optional[int] = None
    status: Optional[str] = None



class FineTuningRequest(BaseModel):
    model_id: str = Field(..., description="Model to prepare for fine-tuning")
    lora_config: Optional[Dict[str, Any]] = Field(
        None, description="LoRA configuration"
    )


def _http_error(status_code: int, code: str, message: str) -> HTTPException:
    return HTTPException(status_code=status_code, detail={"code": code, "message": message})


def _convert_history(history: List[Dict[str, str]]) -> List[ChatMessage]:
    converted: List[ChatMessage] = []
    for entry in history:
        try:
            converted.append(ChatMessage(role=entry["role"], content=entry["content"]))
        except KeyError:
            logger.warning("Skipping malformed history entry: %s", entry)
    return converted


def _limit_search_results(result: Dict[str, Any], max_total: Optional[int]) -> Dict[str, Any]:
    if not max_total:
        return result

    trimmed = deepcopy(result)
    remaining = max_total
    for source, entries in trimmed.get("results", {}).items():
        if remaining <= 0:
            trimmed["results"][source] = []
            continue
        trimmed_entries = entries[:remaining]
        trimmed["results"][source] = trimmed_entries
        remaining -= len(trimmed_entries)

    trimmed["total_results"] = sum(len(entries) for entries in trimmed.get("results", {}).values())
    return trimmed


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
        result = await chat_engine.generate_response(
            message=user_message,
            persona_name=request.persona,
            use_internet=request.use_internet,
            model_id=request.model_id,
            history=history,
            max_new_tokens=request.max_new_tokens,
            temperature=request.temperature,
            top_p=request.top_p,
        )

        required_keys = {"response", "persona_used", "internet_used", "generation_time"}
        if not required_keys.issubset(result):
            logger.error("Chat engine returned incomplete payload: %s", result.keys())
            raise _http_error(502, "CHAT_RESPONSE_INVALID", "Chat service returned an incomplete response.")

        assistant_text = str(result.get("response") or "")
        conversation = _convert_history(history)
        conversation.append(ChatMessage(role="assistant", content=assistant_text))

        payload = EnhancedChatResponse(
            response=assistant_text,
            message=assistant_text,
            messages=conversation,
            persona_used=str(result.get("persona_used")),
            persona_label=result.get("persona_label"),
            internet_used=bool(result.get("internet_used")),
            model_used=result.get("model_used"),
            allowed_models=list(result.get("allowed_models") or []),
            sources=list(result.get("sources") or []),
            generation_time=float(result.get("generation_time") or 0.0),
            error=result.get("error"),
            warning=result.get("warning"),
        )
        return payload
    except HTTPException:
        raise
    except Exception:
        logger.exception("Proxy chat error")
        raise _http_error(500, "CHAT_REQUEST_FAILED", "Chat service failed to respond.")


@router.get("/chat/models", response_model=ModelCatalogResponse)
async def proxy_chat_models():
    try:
        pytorch_manager = get_pytorch_manager()
        models = await asyncio.to_thread(pytorch_manager.list_available_models)
        return ModelCatalogResponse(
            models=models,
            categories=MODEL_CATEGORIES,
            model_categories=MODEL_CATEGORIES,
        )
    except Exception:
        logger.exception("Proxy chat models error")
        raise _http_error(500, "MODEL_CATALOG_FAILED", "Unable to retrieve model catalog.")


@router.get("/personas", response_model=PersonaCatalogResponse)
async def proxy_personas():
    try:
        pytorch_manager = get_pytorch_manager()
        models = await asyncio.to_thread(pytorch_manager.list_available_models)
        personas = await asyncio.to_thread(persona_payload, models)
        return PersonaCatalogResponse(
            personas=personas,
            models=models,
            persona_categories=get_persona_categories(),
            model_categories=MODEL_CATEGORIES,
        )
    except Exception:
        logger.exception("Proxy personas error")
        raise _http_error(500, "PERSONA_CATALOG_FAILED", "Unable to retrieve personas.")


@router.post("/image", response_model=ImageGenerationResponse)
async def proxy_image(payload: Dict[str, Any]):
    try:
        prompt = (payload.get("prompt") or "").strip()
        if not prompt:
            raise _http_error(400, "IMAGE_PROMPT_REQUIRED", "Image prompt is required.")

        size = (payload.get("size") or "1024x1024").lower()
        width, height = {
            "1792x1024": (1792, 1024),
            "1024x1792": (1024, 1792),
        }.get(size, (1024, 1024))

        seed = uuid4().hex
        image_url = f"https://picsum.photos/seed/{seed}/{width}/{height}"
        return ImageGenerationResponse(
            success=True,
            image_url=image_url,
            prompt_used=prompt,
            persona_used=payload.get("persona"),
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Proxy image error")
        raise _http_error(500, "IMAGE_GENERATION_FAILED", "Image service is currently unavailable.")

@router.post("/internet", response_model=InternetSearchResponse)
async def proxy_internet(payload: InternetSearchRequest):
    try:
        internet_manager = get_internet_manager()
        results = await asyncio.to_thread(internet_manager.comprehensive_search, payload.query)
        trimmed = _limit_search_results(results, payload.max_results)
        return InternetSearchResponse(**trimmed)
    except Exception:
        logger.exception("Proxy internet error")
        raise _http_error(500, "INTERNET_SEARCH_FAILED", "Internet search service is unavailable.")

# Request/Response Models
# Enhanced Chat Endpoint
@router.post("/chat/enhanced", response_model=EnhancedChatResponse)
async def enhanced_chat(request: EnhancedChatRequest):
    """
    Enhanced chat with PyTorch models, internet access, and personas
    """
    return await proxy_chat(request)

# Internet Search Endpoint
@router.post("/internet/search", response_model=InternetSearchResponse)
async def internet_search(request: InternetSearchRequest):
    """
    Perform comprehensive internet search
    """
    try:
        internet_manager = get_internet_manager()
        results = await asyncio.to_thread(internet_manager.comprehensive_search, request.query)
        trimmed = _limit_search_results(results, request.max_results)
        return InternetSearchResponse(**trimmed)
    except Exception:
        logger.exception("Internet search error")
        raise _http_error(500, "INTERNET_SEARCH_FAILED", "Unable to complete internet search.")

# Model Management Endpoints
@router.get("/models/list", response_model=ModelListResponse)
async def list_models():
    """
    List available PyTorch models
    """
    try:
        pytorch_manager = get_pytorch_manager()
        models = await asyncio.to_thread(pytorch_manager.list_available_models)
        return ModelListResponse(models=models)
    except Exception:
        logger.exception("List models error")
        raise _http_error(500, "MODEL_LIST_FAILED", "Unable to list available models.")

@router.post("/models/switch", response_model=MessageResponse)
async def switch_model(request: ModelSwitchRequest):
    """
    Switch to a different PyTorch model
    """
    try:
        chat_engine = get_enhanced_chat_engine()
        success = await asyncio.to_thread(chat_engine.switch_model, request.model_id)

        if success:
            return MessageResponse(message=f"Successfully switched to model {request.model_id}")

        raise _http_error(400, "MODEL_SWITCH_FAILED", f"Failed to switch to model {request.model_id}.")

    except HTTPException:
        raise
    except Exception:
        logger.exception("Model switch error")
        raise _http_error(500, "MODEL_SWITCH_ERROR", "Unable to switch models at this time.")

@router.post("/models/prepare-training", response_model=MessageResponse)
async def prepare_model_for_training(request: FineTuningRequest):
    """
    Prepare a model for fine-tuning
    """
    try:
        pytorch_manager = get_pytorch_manager()
        
        # Load model if not already loaded
        loaded = await asyncio.to_thread(pytorch_manager.load_model, request.model_id)
        if not loaded:
            raise _http_error(400, "MODEL_LOAD_FAILED", f"Failed to load model {request.model_id} for fine-tuning.")

        success = await asyncio.to_thread(
            pytorch_manager.prepare_for_finetuning,
            request.model_id,
            lora_config=request.lora_config,
        )

        if success:
            return MessageResponse(message=f"Model {request.model_id} prepared for fine-tuning.")

        raise _http_error(
            400,
            "MODEL_PREPARE_FAILED",
            f"Failed to prepare model {request.model_id} for fine-tuning.",
        )

    except HTTPException:
        raise
    except AttributeError:
        logger.exception("Fine-tuning not implemented for current model manager")
        raise _http_error(501, "LORA_NOT_IMPLEMENTED", "Fine-tuning is not supported in this deployment.")
    except Exception:
        logger.exception("Prepare training error")
        raise _http_error(500, "MODEL_PREPARE_ERROR", "Unable to prepare model for fine-tuning.")

# Persona Management
@router.post("/persona/set", response_model=MessageResponse)
async def set_persona(request: PersonaSetRequest):
    """
    Set the current persona
    """
    try:
        chat_engine = get_enhanced_chat_engine()
        success = await asyncio.to_thread(chat_engine.set_persona, request.persona_name)

        if success:
            return MessageResponse(message=f"Persona set to {request.persona_name}")

        raise _http_error(400, "PERSONA_SET_FAILED", f"Failed to set persona to {request.persona_name}.")

    except HTTPException:
        raise
    except Exception:
        logger.exception("Set persona error")
        raise _http_error(500, "PERSONA_SET_ERROR", "Unable to update persona.")


@router.get("/persona/current", response_model=CurrentPersonaResponse)
async def get_current_persona():
    """
    Get the current persona
    """
    try:
        chat_engine = get_enhanced_chat_engine()
        return CurrentPersonaResponse(current_persona=chat_engine.current_persona)

    except Exception:
        logger.exception("Get persona error")
        raise _http_error(500, "PERSONA_FETCH_ERROR", "Unable to retrieve current persona.")

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
        
    except Exception:
        logger.exception("System status error")
        raise _http_error(500, "SYSTEM_STATUS_ERROR", "Unable to retrieve system status.")

@router.get("/internet/usage", response_model=InternetUsageResponse)
async def get_internet_usage():
    """
    Get internet API usage statistics
    """
    try:
        internet_manager = get_internet_manager()
        usage_report = await asyncio.to_thread(internet_manager.get_usage_status)
        return InternetUsageResponse(**usage_report)
    except Exception:
        logger.exception("Internet usage error")
        raise _http_error(500, "INTERNET_USAGE_ERROR", "Unable to retrieve internet usage status.")

@router.post("/context/clear", response_model=MessageResponse)
async def clear_context():
    """
    Clear conversation context
    """
    try:
        chat_engine = get_enhanced_chat_engine()
        await asyncio.to_thread(chat_engine.clear_context)
        return MessageResponse(message="Context cleared successfully.")
    except Exception:
        logger.exception("Clear context error")
        raise _http_error(500, "CONTEXT_CLEAR_ERROR", "Unable to clear conversation context.")

# Model Information and Memory Management
@router.get("/models/info", response_model=ModelInfoResponse)
async def get_model_info():
    """
    Get detailed model information and memory usage
    """
    try:
        pytorch_manager = get_pytorch_manager()
        info = await asyncio.to_thread(pytorch_manager.get_model_info)
        return ModelInfoResponse(info=info)
    except Exception:
        logger.exception("Model info error")
        raise _http_error(500, "MODEL_INFO_ERROR", "Unable to fetch model information.")

@router.post("/models/unload", response_model=MessageResponse)
async def unload_model(model_id: Optional[str] = None):
    """
    Unload model to free memory
    """
    try:
        pytorch_manager = get_pytorch_manager()
        await asyncio.to_thread(pytorch_manager.unload_model, model_id)

        if model_id:
            return MessageResponse(message=f"Model {model_id} unloaded successfully.")
        return MessageResponse(message="Current model unloaded successfully.")

    except Exception:
        logger.exception("Unload model error")
        raise _http_error(500, "MODEL_UNLOAD_ERROR", "Unable to unload model.")

# Health Check for Enhanced System
@router.get("/health/enhanced", response_model=HealthSummaryResponse)
async def enhanced_health_check():
    """
    Comprehensive health check for enhanced system
    """
    try:
        chat_engine = get_enhanced_chat_engine()
        pytorch_manager = get_pytorch_manager()
        internet_manager = get_internet_manager()
        components = {
            "pytorch_manager": HealthComponentStatus(
                status="available" if pytorch_manager.current_model else "degraded",
                detail=None,
            ),
            "internet_manager": HealthComponentStatus(
                status="available" if internet_manager.cache is not None else "degraded",
                detail=None,
            ),
            "chat_engine": HealthComponentStatus(
                status="available",
                detail=None,
            ),
        }
        overall_status = "healthy" if all(
            component.status == "available" for component in components.values()
        ) else "degraded"
        if overall_status == "degraded":
            overall_status = "unhealthy"

        return HealthSummaryResponse(
            status=overall_status,
            timestamp=datetime.utcnow().isoformat() + "Z",
            components=components,
        )

    except Exception:
        logger.exception("Enhanced health check error")
        return HealthSummaryResponse(
            status="unhealthy",
            timestamp=datetime.utcnow().isoformat() + "Z",
            components={"system": HealthComponentStatus(status="unavailable")},
        )

# Utility endpoint for testing internet connection
@router.get("/internet/test", response_model=InternetTestResponse)
async def test_internet_connection():
    """
    Test internet connectivity and API quotas
    """
    try:
        internet_manager = get_internet_manager()
        results = await asyncio.to_thread(internet_manager.search_duckduckgo_free, "connectivity probe")
        accessible = bool(results)
        return InternetTestResponse(
            internet_accessible=accessible,
            test_results=len(results) if accessible else 0,
            status="ok" if accessible else "degraded",
            timestamp=datetime.utcnow().isoformat() + "Z",
        )

    except Exception:
        logger.exception("Internet test error")
        return InternetTestResponse(
            internet_accessible=False,
            status="error",
            timestamp=datetime.utcnow().isoformat() + "Z",
        )
