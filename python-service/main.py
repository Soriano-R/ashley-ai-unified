"""
Python AI Microservice for Ashley AI
Runs internally on port 8001, called by Next.js API routes
Uses existing chatbot_env virtual environment
Enhanced with PyTorch models and Internet access
"""
from __future__ import annotations

import os
import sys
import logging
from pathlib import Path

# Add the backend modules to path (they will be copied from ashley-ai-backend)
sys.path.append(str(Path(__file__).parent))

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from typing import AsyncGenerator
from pydantic import BaseModel

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Import your existing backend logic
from app.orchestrator import ChatOrchestrator

# Import enhanced API routes
try:
    from api.routes.enhanced import router as enhanced_router
    ENHANCED_FEATURES_AVAILABLE = True
    logger.info("Enhanced features (PyTorch + Internet) available")
except ImportError as e:
    logger.warning(f"Enhanced features not available: {e}")
    ENHANCED_FEATURES_AVAILABLE = False


class ChatRequest(BaseModel):
    message: str
    persona: str = "Ashley"
    session_id: str = "default"


class ChatResponse(BaseModel):
    response: str
    session_id: str


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan management"""
    logger.info("Starting Ashley AI Python Microservice")
    if ENHANCED_FEATURES_AVAILABLE:
        logger.info("Enhanced features enabled")
    logger.info("Ashley AI Python Microservice startup complete")
    yield
    logger.info("Shutting down Ashley AI Python Microservice")


def create_app() -> FastAPI:
    """Create and configure the FastAPI microservice"""
    app = FastAPI(
        title="Ashley AI Python Microservice",
        description="Internal AI service with Enhanced PyTorch + Internet capabilities",
        version="2.0.0",
        lifespan=lifespan,
        docs_url="/docs",  # Available at http://127.0.0.1:8001/docs
    )
    
    # CORS for Next.js (though this will be internal)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE"],
        allow_headers=["*"],
    )
    
    # Include enhanced routes if available
    if ENHANCED_FEATURES_AVAILABLE:
        app.include_router(enhanced_router, prefix="/api", tags=["Enhanced Features"])
        logger.info("Enhanced API routes registered")
    
    # Initialize the orchestrator at module level
    try:
        from app.orchestrator import ChatOrchestrator
        orchestrator = ChatOrchestrator()
        logger.info("ChatOrchestrator initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize ChatOrchestrator: {e}")
        orchestrator = None

    # Health check
    @app.get("/health")
    async def health_check():
        status = {
            "status": "healthy", 
            "service": "ashley-ai-python-microservice",
            "version": "2.0.0",
            "enhanced_features": ENHANCED_FEATURES_AVAILABLE
        }
        return status
    
    # Legacy chat endpoint (for backward compatibility)
    @app.post("/chat/stream")
    async def stream_chat(request: ChatRequest):
        if not orchestrator:
            raise HTTPException(status_code=500, detail="Orchestrator not initialized")
        
        try:
            # Create a basic chat state for the request
            from app.state import ChatState
            state = ChatState(session_id=request.session_id)
            state.persona = request.persona or "Ashley"
            
            # Use the orchestrator to generate response
            result_generator = orchestrator.stream_reply(
                state=state,
                user_text=request.message
            )
            
            # Collect the streaming response
            response_text = ""
            for chunk in result_generator:
                if isinstance(chunk, str):
                    response_text += chunk
            
            return ChatResponse(response=response_text, session_id=request.session_id)
        except Exception as e:
            logger.error(f"Chat error: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @app.get("/chat/models")
    async def get_models():
        models = [
            {"name": "gpt-4o", "description": "Advanced reasoning and vision"},
            {"name": "gpt-4o-mini", "description": "Fast and efficient"},
        ]
        
        # Add PyTorch models if available
        if ENHANCED_FEATURES_AVAILABLE:
            try:
                from core.pytorch_manager import get_pytorch_manager
                pytorch_manager = get_pytorch_manager()
                pytorch_models = pytorch_manager.list_available_models()
                for model in pytorch_models:
                    models.append({
                        "name": model["id"],
                        "description": f"PyTorch: {model['description']}",
                        "type": "pytorch"
                    })
            except Exception as e:
                logger.warning(f"Could not load PyTorch models: {e}")
        
        return models
    
    @app.post("/auth/validate")
    async def validate_auth(request: dict):
        # Simple auth validation for now
        return {"valid": True, "user": {"id": "demo", "role": "user"}}
    
    @app.get("/personas")
    async def get_personas():
        return [
            {"name": "Ashley", "description": "Friendly AI assistant"},
            {"name": "Python Expert", "description": "Python programming specialist"},
            {"name": "SQL Expert", "description": "Database and SQL specialist"},
            {"name": "Technical Expert", "description": "Technical analysis and engineering"},
            {"name": "Creative Muse", "description": "Creative writing and artistic inspiration"},
            {"name": "Data Analyst", "description": "Data analysis and business intelligence"},
        ]
    
    return app


# Create the app
app = create_app()


if __name__ == "__main__":
    # Run the microservice on port 8001 (internal)
    uvicorn.run(
        "main:app",
        host="127.0.0.1",  # Only accessible locally
        port=8001,
        reload=True,
        log_level="info",
    )
