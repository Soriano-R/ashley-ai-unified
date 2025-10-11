# Tutorial 8D: Code Integration and Configuration

## Table of Contents
1. [Model Loading Architecture](#model-loading-architecture)
2. [Core Integration Code](#core-integration-code)
3. [API Endpoint Implementation](#api-endpoint-implementation)
4. [Model Switching System](#model-switching-system)
5. [Performance Optimization](#performance-optimization)
6. [Error Handling](#error-handling)
7. [Configuration Management](#configuration-management)
8. [Testing and Validation](#testing-and-validation)

## Model Loading Architecture

### Local Model Manager

```python
# core/local_model_manager.py
"""
Ashley AI Local Model Manager
Handles loading, caching, and switching between local models
"""

import os
import gc
import torch
import threading
from pathlib import Path
from typing import Dict, Optional, List, Any
from dataclasses import dataclass
from llama_cpp import Llama
from transformers import AutoTokenizer, AutoModelForCausalLM
from diffusers import StableDiffusionXLPipeline
import logging

@dataclass
class ModelConfig:
    """Model configuration dataclass"""
    model_id: str
    model_path: str
    model_type: str  # 'chat', 'image', 'voice'
    format: str  # 'gguf', 'safetensors', 'pytorch'
    quantization: str
    context_length: int
    temperature: float
    max_tokens: int
    gpu_layers: int
    system_prompt: str
    use_cases: List[str]
    memory_required_gb: float

class LocalModelManager:
    """Manages local model loading and inference"""
    
    def __init__(self, models_path: str = "/opt/ashley-ai/models"):
        self.models_path = Path(models_path)
        self.loaded_models: Dict[str, Any] = {}
        self.model_configs: Dict[str, ModelConfig] = {}
        self.current_model_id: Optional[str] = None
        self.lock = threading.Lock()
        
        # Device detection
        self.device = self._detect_device()
        self.max_memory_gb = self._get_max_memory()
        
        # Load model configurations
        self._load_model_configs()
        
    def _detect_device(self) -> str:
        """Detect optimal device for inference"""
        if torch.cuda.is_available():
            return f"cuda:{torch.cuda.current_device()}"
        elif hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
            return "mps"
        else:
            return "cpu"
    
    def _get_max_memory(self) -> float:
        """Get maximum available memory in GB"""
        if "cuda" in self.device:
            return torch.cuda.get_device_properties(0).total_memory / (1024**3)
        elif self.device == "mps":
            # Approximate for Apple Silicon
            return 16.0  # Conservative estimate
        else:
            import psutil
            return psutil.virtual_memory().total / (1024**3)
    
    def _load_model_configs(self):
        """Load model configurations from registry"""
        config_file = self.models_path / "model_configs.json"
        
        if config_file.exists():
            import json
            with open(config_file) as f:
                configs = json.load(f)
                
            for model_id, config_data in configs.items():
                self.model_configs[model_id] = ModelConfig(**config_data)
        else:
            # Default configurations
            self._create_default_configs()
    
    def _create_default_configs(self):
        """Create default model configurations"""
        default_configs = {
            "llama_3_1_8b": ModelConfig(
                model_id="llama_3_1_8b",
                model_path="chat/8b/llama-3.1-8b-instruct.Q4_K_M.gguf",
                model_type="chat",
                format="gguf",
                quantization="q4_k_m",
                context_length=8192,
                temperature=0.7,
                max_tokens=2048,
                gpu_layers=35,
                system_prompt="You are Ashley, a helpful AI assistant.",
                use_cases=["general", "conversation"],
                memory_required_gb=5.0
            ),
            "codellama_13b": ModelConfig(
                model_id="codellama_13b",
                model_path="chat/specialized/codellama-13b-instruct.Q4_K_M.gguf",
                model_type="chat",
                format="gguf",
                quantization="q4_k_m",
                context_length=16384,
                temperature=0.1,
                max_tokens=4096,
                gpu_layers=40,
                system_prompt="You are an expert programmer. Provide clean, efficient code.",
                use_cases=["coding", "programming"],
                memory_required_gb=8.0
            ),
            "wizard_vicuna_uncensored": ModelConfig(
                model_id="wizard_vicuna_uncensored",
                model_path="chat/specialized/wizard-vicuna-13b-uncensored.Q4_K_M.gguf",
                model_type="chat",
                format="gguf",
                quantization="q4_k_m",
                context_length=8192,
                temperature=0.8,
                max_tokens=2048,
                gpu_layers=40,
                system_prompt="You are an uncensored AI assistant.",
                use_cases=["creative", "uncensored"],
                memory_required_gb=8.0
            )
        }
        
        self.model_configs.update(default_configs)
    
    def load_model(self, model_id: str, force_reload: bool = False) -> bool:
        """Load a specific model"""
        with self.lock:
            if model_id in self.loaded_models and not force_reload:
                self.current_model_id = model_id
                return True
            
            if model_id not in self.model_configs:
                logging.error(f"Model {model_id} not found in configurations")
                return False
            
            config = self.model_configs[model_id]
            model_path = self.models_path / config.model_path
            
            if not model_path.exists():
                logging.error(f"Model file not found: {model_path}")
                return False
            
            # Check memory requirements
            if config.memory_required_gb > self.max_memory_gb:
                logging.error(f"Insufficient memory for {model_id}: {config.memory_required_gb}GB required")
                return False
            
            # Unload current model if memory constrained
            if self.current_model_id and config.memory_required_gb > 6.0:
                self.unload_model(self.current_model_id)
            
            try:
                # Load based on format
                if config.format == "gguf":
                    model = self._load_gguf_model(model_path, config)
                elif config.format == "safetensors":
                    model = self._load_transformer_model(model_path, config)
                else:
                    raise ValueError(f"Unsupported format: {config.format}")
                
                self.loaded_models[model_id] = model
                self.current_model_id = model_id
                
                logging.info(f"Successfully loaded model: {model_id}")
                return True
                
            except Exception as e:
                logging.error(f"Failed to load model {model_id}: {e}")
                return False
    
    def _load_gguf_model(self, model_path: Path, config: ModelConfig) -> Llama:
        """Load GGUF format model using llama-cpp-python"""
        
        # Adjust GPU layers based on available memory
        gpu_layers = config.gpu_layers if "cuda" in self.device else 0
        
        model = Llama(
            model_path=str(model_path),
            n_ctx=config.context_length,
            n_gpu_layers=gpu_layers,
            verbose=False,
            n_threads=os.cpu_count() // 2,
            use_mmap=True,
            use_mlock=False,
            logits_all=False,
            embedding=False,
            offload_kqv=True,
            flash_attn=True
        )
        
        return model
    
    def _load_transformer_model(self, model_path: Path, config: ModelConfig):
        """Load transformer model using Hugging Face transformers"""
        
        tokenizer = AutoTokenizer.from_pretrained(str(model_path))
        model = AutoModelForCausalLM.from_pretrained(
            str(model_path),
            device_map="auto" if "cuda" in self.device else None,
            torch_dtype=torch.float16 if "cuda" in self.device else torch.float32,
            low_cpu_mem_usage=True,
            trust_remote_code=True
        )
        
        return {"model": model, "tokenizer": tokenizer}
    
    def generate_response(self, 
                         prompt: str,
                         model_id: Optional[str] = None,
                         **kwargs) -> str:
        """Generate response using specified or current model"""
        
        target_model = model_id or self.current_model_id
        
        if not target_model or target_model not in self.loaded_models:
            if target_model and not self.load_model(target_model):
                raise ValueError(f"Failed to load model: {target_model}")
            elif not target_model:
                raise ValueError("No model loaded")
        
        model = self.loaded_models[target_model]
        config = self.model_configs[target_model]
        
        # Prepare prompt with system message
        formatted_prompt = f"{config.system_prompt}\n\nUser: {prompt}\nAssistant:"
        
        try:
            if isinstance(model, Llama):
                return self._generate_gguf_response(model, formatted_prompt, config, **kwargs)
            else:
                return self._generate_transformer_response(model, formatted_prompt, config, **kwargs)
                
        except Exception as e:
            logging.error(f"Generation failed: {e}")
            raise
    
    def _generate_gguf_response(self, 
                               model: Llama, 
                               prompt: str, 
                               config: ModelConfig,
                               **kwargs) -> str:
        """Generate response using GGUF model"""
        
        response = model(
            prompt,
            max_tokens=kwargs.get('max_tokens', config.max_tokens),
            temperature=kwargs.get('temperature', config.temperature),
            top_p=kwargs.get('top_p', 0.9),
            top_k=kwargs.get('top_k', 40),
            repeat_penalty=kwargs.get('repeat_penalty', 1.1),
            stop=kwargs.get('stop', ["User:", "Human:", "\n\n"])
        )
        
        return response['choices'][0]['text'].strip()
    
    def _generate_transformer_response(self, 
                                     model_dict: Dict, 
                                     prompt: str, 
                                     config: ModelConfig,
                                     **kwargs) -> str:
        """Generate response using transformer model"""
        
        model = model_dict["model"]
        tokenizer = model_dict["tokenizer"]
        
        inputs = tokenizer.encode(prompt, return_tensors="pt")
        if "cuda" in self.device:
            inputs = inputs.to(self.device)
        
        with torch.no_grad():
            outputs = model.generate(
                inputs,
                max_new_tokens=kwargs.get('max_tokens', config.max_tokens),
                temperature=kwargs.get('temperature', config.temperature),
                do_sample=True,
                top_p=kwargs.get('top_p', 0.9),
                pad_token_id=tokenizer.eos_token_id
            )
        
        response = tokenizer.decode(outputs[0], skip_special_tokens=True)
        # Remove the input prompt from response
        return response[len(prompt):].strip()
    
    def unload_model(self, model_id: str):
        """Unload a specific model from memory"""
        with self.lock:
            if model_id in self.loaded_models:
                del self.loaded_models[model_id]
                
                # Clear GPU cache
                if "cuda" in self.device:
                    torch.cuda.empty_cache()
                
                gc.collect()
                logging.info(f"Unloaded model: {model_id}")
    
    def get_available_models(self) -> List[Dict]:
        """Get list of available models"""
        models = []
        for model_id, config in self.model_configs.items():
            model_path = self.models_path / config.model_path
            models.append({
                "id": model_id,
                "name": model_id.replace("_", " ").title(),
                "type": config.model_type,
                "use_cases": config.use_cases,
                "memory_required_gb": config.memory_required_gb,
                "available": model_path.exists(),
                "loaded": model_id in self.loaded_models,
                "current": model_id == self.current_model_id
            })
        
        return models
    
    def get_model_info(self, model_id: str) -> Optional[Dict]:
        """Get detailed information about a specific model"""
        if model_id not in self.model_configs:
            return None
        
        config = self.model_configs[model_id]
        model_path = self.models_path / config.model_path
        
        info = {
            "id": model_id,
            "config": config.__dict__,
            "path": str(model_path),
            "exists": model_path.exists(),
            "loaded": model_id in self.loaded_models,
            "current": model_id == self.current_model_id
        }
        
        if model_path.exists():
            info["file_size_gb"] = model_path.stat().st_size / (1024**3)
        
        return info

# Global model manager instance
model_manager = LocalModelManager()
```

## Core Integration Code

### Updated Main Application

```python
# app/main.py (Updated)
"""
Ashley AI Main Application with Local Model Support
"""

import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from core.local_model_manager import model_manager
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    
    # Startup
    logger.info("🚀 Starting Ashley AI with Local Model Support")
    
    # Initialize local models if enabled
    if os.getenv("LOCAL_MODELS_ENABLED", "false").lower() == "true":
        logger.info("🤖 Local models enabled, initializing...")
        
        # Load default model
        default_model = os.getenv("DEFAULT_CHAT_MODEL", "llama_3_1_8b")
        if model_manager.load_model(default_model):
            logger.info(f"✅ Loaded default model: {default_model}")
        else:
            logger.warning(f"⚠️  Failed to load default model: {default_model}")
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down Ashley AI")
    
    # Cleanup loaded models
    for model_id in list(model_manager.loaded_models.keys()):
        model_manager.unload_model(model_id)

# Create FastAPI app with lifespan
app = FastAPI(
    title="Ashley AI",
    description="Intelligent AI Assistant with Local Model Support",
    version="2.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import routers
from api.routes.chat import router as chat_router
from api.routes.models import router as models_router
from api.routes.health import router as health_router

# Register routers
app.include_router(health_router, prefix="/api", tags=["health"])
app.include_router(chat_router, prefix="/api/chat", tags=["chat"])
app.include_router(models_router, prefix="/api/models", tags=["models"])

if __name__ == "__main__":
    import uvicorn
    
    host = os.getenv("PYTHON_SERVICE_HOST", "0.0.0.0")
    port = int(os.getenv("PYTHON_SERVICE_PORT", 8001))
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=False,  # Disable reload in production
        workers=1      # Single worker for model loading
    )
```

### Enhanced Chat Router

```python
# api/routes/chat.py (Enhanced)
"""
Enhanced chat router with local model support
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from core.local_model_manager import model_manager
from core.chat_engine import ChatEngine
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

class ChatRequest(BaseModel):
    message: str
    model_id: Optional[str] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    system_prompt: Optional[str] = None
    conversation_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    model_used: str
    tokens_used: int
    generation_time: float
    conversation_id: Optional[str] = None

class ModelSwitchRequest(BaseModel):
    model_id: str
    force_reload: Optional[bool] = False

@router.post("/message", response_model=ChatResponse)
async def chat_message(request: ChatRequest, background_tasks: BackgroundTasks):
    """Process chat message with local or remote model"""
    
    try:
        import time
        start_time = time.time()
        
        # Determine which model to use
        use_local = os.getenv("LOCAL_MODELS_ENABLED", "false").lower() == "true"
        
        if use_local and model_manager.loaded_models:
            # Use local model
            target_model = request.model_id or model_manager.current_model_id
            
            if not target_model:
                raise HTTPException(status_code=400, detail="No model available")
            
            # Generate response
            response_text = model_manager.generate_response(
                prompt=request.message,
                model_id=target_model,
                temperature=request.temperature,
                max_tokens=request.max_tokens
            )
            
            generation_time = time.time() - start_time
            
            return ChatResponse(
                response=response_text,
                model_used=target_model,
                tokens_used=len(response_text.split()),  # Approximate
                generation_time=generation_time,
                conversation_id=request.conversation_id
            )
        
        else:
            # Fall back to remote model (OpenAI)
            chat_engine = ChatEngine()
            
            response_text = await chat_engine.generate_response(
                message=request.message,
                conversation_id=request.conversation_id,
                temperature=request.temperature,
                max_tokens=request.max_tokens
            )
            
            generation_time = time.time() - start_time
            
            return ChatResponse(
                response=response_text,
                model_used="openai-gpt-4",
                tokens_used=len(response_text.split()),
                generation_time=generation_time,
                conversation_id=request.conversation_id
            )
            
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/switch-model")
async def switch_model(request: ModelSwitchRequest):
    """Switch to a different local model"""
    
    if not os.getenv("LOCAL_MODELS_ENABLED", "false").lower() == "true":
        raise HTTPException(status_code=400, detail="Local models not enabled")
    
    try:
        success = model_manager.load_model(request.model_id, request.force_reload)
        
        if success:
            return {
                "success": True,
                "message": f"Switched to model: {request.model_id}",
                "current_model": request.model_id
            }
        else:
            raise HTTPException(status_code=400, detail=f"Failed to load model: {request.model_id}")
            
    except Exception as e:
        logger.error(f"Model switch error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/current-model")
async def get_current_model():
    """Get currently loaded model information"""
    
    if not model_manager.current_model_id:
        return {"current_model": None, "local_enabled": False}
    
    model_info = model_manager.get_model_info(model_manager.current_model_id)
    
    return {
        "current_model": model_manager.current_model_id,
        "model_info": model_info,
        "local_enabled": True
    }

@router.get("/conversation-history/{conversation_id}")
async def get_conversation_history(conversation_id: str):
    """Get conversation history (implement based on your storage system)"""
    # This would integrate with your session storage system
    pass

@router.delete("/conversation/{conversation_id}")
async def delete_conversation(conversation_id: str):
    """Delete conversation history"""
    # This would integrate with your session storage system
    pass
```

### Models Management Router

```python
# api/routes/models.py (New)
"""
Models management API endpoints
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Dict, Optional
from core.local_model_manager import model_manager
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

class ModelInfo(BaseModel):
    id: str
    name: str
    type: str
    use_cases: List[str]
    memory_required_gb: float
    available: bool
    loaded: bool
    current: bool

class ModelLoadRequest(BaseModel):
    model_id: str
    force_reload: Optional[bool] = False

class ModelUnloadRequest(BaseModel):
    model_id: str

@router.get("/available", response_model=List[ModelInfo])
async def get_available_models():
    """Get list of all available models"""
    
    try:
        models = model_manager.get_available_models()
        return [ModelInfo(**model) for model in models]
        
    except Exception as e:
        logger.error(f"Error getting models: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/loaded")
async def get_loaded_models():
    """Get list of currently loaded models"""
    
    loaded_models = []
    
    for model_id in model_manager.loaded_models.keys():
        model_info = model_manager.get_model_info(model_id)
        if model_info:
            loaded_models.append(model_info)
    
    return {"loaded_models": loaded_models}

@router.get("/{model_id}")
async def get_model_details(model_id: str):
    """Get detailed information about a specific model"""
    
    model_info = model_manager.get_model_info(model_id)
    
    if not model_info:
        raise HTTPException(status_code=404, detail=f"Model not found: {model_id}")
    
    return model_info

@router.post("/{model_id}/load")
async def load_model(model_id: str, request: ModelLoadRequest):
    """Load a specific model"""
    
    try:
        success = model_manager.load_model(model_id, request.force_reload)
        
        if success:
            return {
                "success": True,
                "message": f"Model {model_id} loaded successfully",
                "model_id": model_id
            }
        else:
            raise HTTPException(status_code=400, detail=f"Failed to load model: {model_id}")
            
    except Exception as e:
        logger.error(f"Model load error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{model_id}/unload")
async def unload_model(model_id: str):
    """Unload a specific model"""
    
    try:
        if model_id not in model_manager.loaded_models:
            raise HTTPException(status_code=400, detail=f"Model not loaded: {model_id}")
        
        model_manager.unload_model(model_id)
        
        return {
            "success": True,
            "message": f"Model {model_id} unloaded successfully"
        }
        
    except Exception as e:
        logger.error(f"Model unload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/system/status")
async def get_system_status():
    """Get system resource status"""
    
    import psutil
    import torch
    
    status = {
        "cpu_percent": psutil.cpu_percent(),
        "memory_percent": psutil.virtual_memory().percent,
        "disk_usage": psutil.disk_usage('/').percent
    }
    
    if torch.cuda.is_available():
        status["gpu"] = {
            "available": True,
            "device_count": torch.cuda.device_count(),
            "current_device": torch.cuda.current_device(),
            "memory_allocated": torch.cuda.memory_allocated() / (1024**3),
            "memory_reserved": torch.cuda.memory_reserved() / (1024**3),
            "memory_total": torch.cuda.get_device_properties(0).total_memory / (1024**3)
        }
    else:
        status["gpu"] = {"available": False}
    
    return status

@router.post("/system/cleanup")
async def cleanup_memory():
    """Clean up system memory"""
    
    import gc
    import torch
    
    # Run garbage collection
    gc.collect()
    
    # Clear GPU cache if available
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
    
    return {"message": "Memory cleanup completed"}

@router.get("/recommendations")
async def get_model_recommendations(
    use_case: str,
    max_vram_gb: Optional[float] = 8.0,
    prefer_speed: Optional[bool] = False
):
    """Get model recommendations based on use case and constraints"""
    
    # This would integrate with the model registry
    # For now, return simple recommendations
    
    recommendations = {
        "coding": ["codellama_13b", "llama_3_1_8b"],
        "general": ["llama_3_1_8b", "qwen2_5_7b"],
        "creative": ["wizard_vicuna_uncensored", "mythomax_13b"],
        "uncensored": ["wizard_vicuna_uncensored", "mythomax_13b"]
    }
    
    recommended_models = recommendations.get(use_case, ["llama_3_1_8b"])
    
    # Filter by memory constraint
    available_models = model_manager.get_available_models()
    suitable_models = [
        model for model in available_models
        if model["id"] in recommended_models 
        and model["memory_required_gb"] <= max_vram_gb
        and model["available"]
    ]
    
    # Sort by preference
    if prefer_speed:
        suitable_models.sort(key=lambda x: x["memory_required_gb"])
    else:
        suitable_models.sort(key=lambda x: x["memory_required_gb"], reverse=True)
    
    return {
        "use_case": use_case,
        "constraints": {
            "max_vram_gb": max_vram_gb,
            "prefer_speed": prefer_speed
        },
        "recommendations": suitable_models
    }
```

## Model Switching System

### Frontend Model Selector Component

```typescript
// src/components/ModelSelector.tsx
import React, { useState, useEffect } from 'react';
import { Button, Select, Card, Badge, Alert, Spinner } from '@/components/ui';

interface Model {
  id: string;
  name: string;
  type: string;
  use_cases: string[];
  memory_required_gb: number;
  available: boolean;
  loaded: boolean;
  current: boolean;
}

interface SystemStatus {
  cpu_percent: number;
  memory_percent: number;
  gpu?: {
    available: boolean;
    memory_allocated: number;
    memory_total: number;
  };
}

export const ModelSelector: React.FC = () => {
  const [models, setModels] = useState<Model[]>([]);
  const [currentModel, setCurrentModel] = useState<string | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchModels();
    fetchSystemStatus();
    
    // Refresh every 30 seconds
    const interval = setInterval(() => {
      fetchSystemStatus();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchModels = async () => {
    try {
      const response = await fetch('/api/models/available');
      const data = await response.json();
      setModels(data);
      
      const current = data.find((m: Model) => m.current);
      setCurrentModel(current?.id || null);
    } catch (err) {
      setError('Failed to fetch models');
    }
  };

  const fetchSystemStatus = async () => {
    try {
      const response = await fetch('/api/models/system/status');
      const data = await response.json();
      setSystemStatus(data);
    } catch (err) {
      console.error('Failed to fetch system status');
    }
  };

  const switchModel = async (modelId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/models/${modelId}/load`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_id: modelId })
      });
      
      if (response.ok) {
        setCurrentModel(modelId);
        await fetchModels(); // Refresh model states
        await fetchSystemStatus(); // Refresh system status
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Failed to switch model');
      }
    } catch (err) {
      setError('Network error while switching model');
    } finally {
      setLoading(false);
    }
  };

  const unloadModel = async (modelId: string) => {
    setLoading(true);
    
    try {
      const response = await fetch(`/api/models/${modelId}/unload`, {
        method: 'POST'
      });
      
      if (response.ok) {
        await fetchModels();
        await fetchSystemStatus();
      }
    } catch (err) {
      setError('Failed to unload model');
    } finally {
      setLoading(false);
    }
  };

  const cleanupMemory = async () => {
    setLoading(true);
    
    try {
      await fetch('/api/models/system/cleanup', { method: 'POST' });
      await fetchSystemStatus();
    } catch (err) {
      setError('Failed to cleanup memory');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Current Model Status */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-2">Current Model</h3>
        {currentModel ? (
          <div className="flex items-center justify-between">
            <div>
              <Badge variant="success">
                {models.find(m => m.id === currentModel)?.name || currentModel}
              </Badge>
              <p className="text-sm text-gray-600 mt-1">
                Use cases: {models.find(m => m.id === currentModel)?.use_cases.join(', ')}
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => currentModel && unloadModel(currentModel)}
              disabled={loading}
            >
              Unload
            </Button>
          </div>
        ) : (
          <p className="text-gray-500">No model loaded</p>
        )}
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          {error}
          <Button variant="link" onClick={() => setError(null)}>Dismiss</Button>
        </Alert>
      )}

      {/* System Status */}
      {systemStatus && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">System Status</h3>
            <Button variant="outline" size="sm" onClick={cleanupMemory} disabled={loading}>
              Cleanup Memory
            </Button>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">CPU:</span>
              <span className="ml-2 font-medium">{systemStatus.cpu_percent.toFixed(1)}%</span>
            </div>
            <div>
              <span className="text-gray-600">Memory:</span>
              <span className="ml-2 font-medium">{systemStatus.memory_percent.toFixed(1)}%</span>
            </div>
            
            {systemStatus.gpu?.available && (
              <>
                <div>
                  <span className="text-gray-600">GPU Memory:</span>
                  <span className="ml-2 font-medium">
                    {systemStatus.gpu.memory_allocated.toFixed(1)} / {systemStatus.gpu.memory_total.toFixed(1)} GB
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">GPU Usage:</span>
                  <span className="ml-2 font-medium">
                    {((systemStatus.gpu.memory_allocated / systemStatus.gpu.memory_total) * 100).toFixed(1)}%
                  </span>
                </div>
              </>
            )}
          </div>
        </Card>
      )}

      {/* Available Models */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4">Available Models</h3>
        
        <div className="space-y-3">
          {models.map((model) => (
            <div
              key={model.id}
              className={`p-3 border rounded-lg transition-colors ${
                model.current ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{model.name}</span>
                    
                    {!model.available && (
                      <Badge variant="destructive" size="sm">Not Downloaded</Badge>
                    )}
                    
                    {model.loaded && (
                      <Badge variant="success" size="sm">Loaded</Badge>
                    )}
                    
                    {model.current && (
                      <Badge variant="default" size="sm">Current</Badge>
                    )}
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    <p>Type: {model.type} | Memory: {model.memory_required_gb}GB</p>
                    <p>Use cases: {model.use_cases.join(', ')}</p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  {model.available && !model.current && (
                    <Button
                      size="sm"
                      onClick={() => switchModel(model.id)}
                      disabled={loading}
                    >
                      {loading ? <Spinner size="sm" /> : 'Load'}
                    </Button>
                  )}
                  
                  {model.loaded && !model.current && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => unloadModel(model.id)}
                      disabled={loading}
                    >
                      Unload
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
```

### Model Configuration Updates

```python
# Update .env file with local model settings
LOCAL_MODELS_ENABLED=true
LOCAL_MODELS_PATH=/opt/ashley-ai/models
MODEL_CACHE_PATH=/opt/ashley-ai/models/cache
DEFAULT_CHAT_MODEL=llama_3_1_8b
DEFAULT_IMAGE_MODEL=sdxl_base
DEFAULT_VOICE_MODEL=xtts_v2

# Model performance settings
GPU_MEMORY_FRACTION=0.8
CPU_THREADS=8
ENABLE_MODEL_SWITCHING=true
ENABLE_GPU_INFERENCE=true

# Model-specific settings
LLAMA_GPU_LAYERS=35
CODELLAMA_CONTEXT_LENGTH=16384
UNCENSORED_SAFETY_FILTER=false
```

## Performance Optimization

### Model Loading Optimization

```python
# core/model_optimizer.py
"""
Model performance optimization utilities
"""

import torch
import gc
from typing import Optional
import psutil

class ModelOptimizer:
    """Optimize model performance and memory usage"""
    
    @staticmethod
    def optimize_memory_usage():
        """Optimize system memory usage"""
        
        # Python garbage collection
        gc.collect()
        
        # Clear GPU cache
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            torch.cuda.synchronize()
        
        # Force memory cleanup
        if hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
            torch.mps.empty_cache()
    
    @staticmethod
    def get_optimal_batch_size(model_size_gb: float, available_memory_gb: float) -> int:
        """Calculate optimal batch size based on available memory"""
        
        # Conservative estimation
        memory_per_sample = model_size_gb * 0.1  # 10% of model size per sample
        max_batch_size = int(available_memory_gb / memory_per_sample)
        
        # Clamp to reasonable values
        return max(1, min(max_batch_size, 32))
    
    @staticmethod
    def get_optimal_gpu_layers(model_size_gb: float, gpu_memory_gb: float) -> int:
        """Calculate optimal number of GPU layers"""
        
        if gpu_memory_gb < 4:
            return 0  # CPU only
        elif gpu_memory_gb < 8:
            return int(32 * (gpu_memory_gb / model_size_gb))
        else:
            return -1  # All layers on GPU
    
    @staticmethod
    def monitor_performance() -> dict:
        """Monitor system performance metrics"""
        
        metrics = {
            "cpu_percent": psutil.cpu_percent(interval=1),
            "memory_percent": psutil.virtual_memory().percent,
            "memory_available_gb": psutil.virtual_memory().available / (1024**3)
        }
        
        if torch.cuda.is_available():
            metrics["gpu"] = {
                "memory_allocated_gb": torch.cuda.memory_allocated() / (1024**3),
                "memory_reserved_gb": torch.cuda.memory_reserved() / (1024**3),
                "memory_total_gb": torch.cuda.get_device_properties(0).total_memory / (1024**3),
                "utilization_percent": (torch.cuda.memory_allocated() / torch.cuda.get_device_properties(0).total_memory) * 100
            }
        
        return metrics
```

## Testing and Validation

### Model Integration Tests

```python
# tests/test_local_models.py
"""
Tests for local model integration
"""

import pytest
import tempfile
from pathlib import Path
from core.local_model_manager import LocalModelManager, ModelConfig

class TestLocalModelManager:
    
    @pytest.fixture
    def temp_models_path(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            yield temp_dir
    
    @pytest.fixture
    def model_manager(self, temp_models_path):
        return LocalModelManager(models_path=temp_models_path)
    
    def test_model_manager_initialization(self, model_manager):
        """Test model manager initializes correctly"""
        assert model_manager.models_path.exists()
        assert isinstance(model_manager.model_configs, dict)
        assert model_manager.device in ["cpu", "cuda:0", "mps"]
    
    def test_model_config_creation(self, model_manager):
        """Test model configuration creation"""
        config = ModelConfig(
            model_id="test_model",
            model_path="test/path.gguf",
            model_type="chat",
            format="gguf",
            quantization="q4_k_m",
            context_length=2048,
            temperature=0.7,
            max_tokens=1024,
            gpu_layers=20,
            system_prompt="Test prompt",
            use_cases=["test"],
            memory_required_gb=4.0
        )
        
        assert config.model_id == "test_model"
        assert config.memory_required_gb == 4.0
    
    def test_get_available_models(self, model_manager):
        """Test getting available models list"""
        models = model_manager.get_available_models()
        assert isinstance(models, list)
        
        for model in models:
            assert "id" in model
            assert "name" in model
            assert "available" in model
    
    def test_device_detection(self, model_manager):
        """Test device detection works"""
        device = model_manager._detect_device()
        assert device in ["cpu", "cuda:0", "mps"]
    
    def test_memory_estimation(self, model_manager):
        """Test memory estimation"""
        max_memory = model_manager._get_max_memory()
        assert max_memory > 0
    
    @pytest.mark.integration
    def test_model_loading_without_file(self, model_manager):
        """Test model loading fails gracefully when file doesn't exist"""
        success = model_manager.load_model("nonexistent_model")
        assert success is False
    
    def test_model_registry_integration(self, model_manager):
        """Test model registry integration"""
        model_info = model_manager.get_model_info("llama_3_1_8b")
        
        if model_info:
            assert "id" in model_info
            assert "config" in model_info
            assert "exists" in model_info

# API Integration Tests
class TestModelAPI:
    
    @pytest.fixture
    def client(self):
        from fastapi.testclient import TestClient
        from main import app
        return TestClient(app)
    
    def test_get_available_models(self, client):
        """Test models API endpoint"""
        response = client.get("/api/models/available")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_system_status(self, client):
        """Test system status endpoint"""
        response = client.get("/api/models/system/status")
        assert response.status_code == 200
        
        data = response.json()
        assert "cpu_percent" in data
        assert "memory_percent" in data
    
    def test_model_recommendations(self, client):
        """Test model recommendations endpoint"""
        response = client.get("/api/models/recommendations?use_case=coding&max_vram_gb=8")
        assert response.status_code == 200
        
        data = response.json()
        assert "use_case" in data
        assert "recommendations" in data

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
```

### Performance Benchmarks

```python
# tests/benchmark_models.py
"""
Performance benchmarking for local models
"""

import time
import statistics
from core.local_model_manager import model_manager

def benchmark_model_loading():
    """Benchmark model loading times"""
    models_to_test = ["llama_3_1_8b", "codellama_13b"]
    results = {}
    
    for model_id in models_to_test:
        if model_id not in model_manager.model_configs:
            continue
            
        times = []
        
        for i in range(3):  # 3 runs
            start_time = time.time()
            success = model_manager.load_model(model_id, force_reload=True)
            load_time = time.time() - start_time
            
            if success:
                times.append(load_time)
                model_manager.unload_model(model_id)
            
            time.sleep(2)  # Cool down
        
        if times:
            results[model_id] = {
                "avg_load_time": statistics.mean(times),
                "min_load_time": min(times),
                "max_load_time": max(times),
                "std_dev": statistics.stdev(times) if len(times) > 1 else 0
            }
    
    return results

def benchmark_inference_speed():
    """Benchmark inference speed"""
    test_prompts = [
        "Hello, how are you?",
        "Write a Python function to calculate fibonacci numbers.",
        "Explain the concept of machine learning in simple terms."
    ]
    
    models_to_test = ["llama_3_1_8b"]
    results = {}
    
    for model_id in models_to_test:
        if not model_manager.load_model(model_id):
            continue
        
        model_results = []
        
        for prompt in test_prompts:
            start_time = time.time()
            
            try:
                response = model_manager.generate_response(
                    prompt=prompt,
                    max_tokens=100
                )
                
                generation_time = time.time() - start_time
                tokens_per_second = len(response.split()) / generation_time
                
                model_results.append({
                    "prompt": prompt[:30] + "...",
                    "generation_time": generation_time,
                    "tokens_per_second": tokens_per_second,
                    "response_length": len(response)
                })
                
            except Exception as e:
                print(f"Error with prompt '{prompt[:30]}...': {e}")
        
        if model_results:
            avg_tps = statistics.mean([r["tokens_per_second"] for r in model_results])
            results[model_id] = {
                "individual_results": model_results,
                "avg_tokens_per_second": avg_tps
            }
        
        model_manager.unload_model(model_id)
    
    return results

if __name__ == "__main__":
    print("🏃 Running Model Performance Benchmarks")
    print("=" * 50)
    
    # Benchmark loading
    print("\n📥 Model Loading Benchmark:")
    loading_results = benchmark_model_loading()
    
    for model_id, stats in loading_results.items():
        print(f"\n{model_id}:")
        print(f"  Average Load Time: {stats['avg_load_time']:.2f}s")
        print(f"  Min/Max: {stats['min_load_time']:.2f}s / {stats['max_load_time']:.2f}s")
    
    # Benchmark inference
    print("\n⚡ Inference Speed Benchmark:")
    inference_results = benchmark_inference_speed()
    
    for model_id, stats in inference_results.items():
        print(f"\n{model_id}:")
        print(f"  Average Tokens/Second: {stats['avg_tokens_per_second']:.2f}")
        
        for result in stats["individual_results"]:
            print(f"    '{result['prompt']}': {result['tokens_per_second']:.2f} t/s")
```

## Next Steps

This completes the comprehensive local models tutorial series! You now have:

✅ **Complete Local Model Integration** with Ashley AI
✅ **Model Management System** with loading, switching, and optimization
✅ **API Endpoints** for model control and monitoring
✅ **Frontend Components** for model selection and system monitoring
✅ **Performance Optimization** and memory management
✅ **Testing Framework** and benchmarking tools

### What You Can Do Now:

1. **Run Multiple Models**: Switch between coding, general, and specialized models
2. **Monitor Performance**: Track system resources and optimize usage
3. **Customize Configurations**: Adjust model parameters for your specific needs
4. **Extend Functionality**: Add new models and use cases easily

### Recommended Next Actions:

1. Download and test essential models from Tutorial 8C
2. Configure your preferred models in the registry
3. Test the model switching functionality
4. Run performance benchmarks to optimize settings
5. Integrate with your existing Ashley AI workflow

The local models system is now fully integrated and ready for production use!