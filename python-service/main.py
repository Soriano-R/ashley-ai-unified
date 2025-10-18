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
from dotenv import load_dotenv
from huggingface_hub import login as hf_login

from app.logging import configure_logging

load_dotenv()
configure_logging()
logger = logging.getLogger(__name__)
HF_TOKEN = os.getenv("HUGGINGFACE_TOKEN")
if HF_TOKEN:
    try:
        hf_login(token=HF_TOKEN)
        logger.info("Authenticated with Hugging Face Hub using token from .env")
    except Exception as e:
        logger.warning(f"Failed to authenticate with Hugging Face Hub: {e}")
else:
    logger.warning("No Hugging Face token found in environment. Private/gated models may not be accessible.")
sys.path.append(str(Path(__file__).parent))

import uvicorn
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from typing import AsyncGenerator
from fastapi.responses import JSONResponse

# Import your existing backend logic
from app.orchestrator import ChatOrchestrator
from app.persona_registry import MODEL_CATEGORIES, persona_payload
from core.pytorch_manager import get_pytorch_manager

# Import enhanced API routes
try:
    from api.routes.enhanced import router as enhanced_router
    ENHANCED_FEATURES_AVAILABLE = True
    logger.info("Enhanced features (PyTorch + Internet) available")
except ImportError as e:
    logger.warning(f"Enhanced features not available: {e}")
    ENHANCED_FEATURES_AVAILABLE = False


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
    # Configure logging
    """Create and configure the FastAPI microservice"""
    app = FastAPI(
        title="Ashley AI Python Microservice",
        description="Internal AI service with Enhanced PyTorch + Internet capabilities",
        version="2.0.0",
        lifespan=lifespan,
        docs_url="/docs",  # Available at http://127.0.0.1:8001/docs
    )
    
    # Hugging Face authentication using .env token
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

        # Preload models if configured
        preload_models = os.getenv("PRELOAD_MODELS", "").strip()
        if preload_models:
            model_list = [m.strip() for m in preload_models.split(",") if m.strip()]
            if model_list and ENHANCED_FEATURES_AVAILABLE:
                logger.info(f"Preloading {len(model_list)} models from PRELOAD_MODELS environment variable")
                from core.enhanced_chat_engine import get_enhanced_chat_engine
                chat_engine = get_enhanced_chat_engine()
                chat_engine.preload_models(model_list)
        else:
            logger.info("No models configured for preloading (PRELOAD_MODELS is empty)")
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
    
    @app.post("/chat/stream")
    async def deprecated_stream_chat():
        return JSONResponse(
            status_code=410,
            content={"error": "Deprecated. Use /api/chat for chat streaming."}
        )

    @app.get("/chat/models")
    async def deprecated_models():
        return JSONResponse(
            status_code=410,
            content={"error": "Deprecated. Use /api/chat/models for model listing."}
        )
    
    import bcrypt
    import json
    from pathlib import Path

    USERS_FILE = Path(__file__).parent / "storage" / "users.json"

    def hash_password(password: str) -> str:
        """Hash password using bcrypt with salt"""
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    def verify_password(password: str, hashed: str) -> bool:
        """Verify password against bcrypt hash"""
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

    def load_users():
        if USERS_FILE.exists():
            with open(USERS_FILE, "r") as f:
                return json.load(f)
        return {}

    def save_users(users):
        USERS_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(USERS_FILE, "w") as f:
            json.dump(users, f, indent=2)

    @app.post("/auth/register")
    async def register_user(request: Request):
        data = await request.json()
        email = data.get("email")
        password = data.get("password")
        if not email or not password:
            raise HTTPException(status_code=400, detail="Email and password required")
        users = load_users()
        if email in users:
            raise HTTPException(status_code=400, detail="User already exists")
        users[email] = {
            "password": hash_password(password),
            "role": "user"
        }
        save_users(users)
        return {"success": True, "user": {"id": email, "role": "user"}}

    @app.post("/auth/validate")
    async def validate_auth(request: Request):
        data = await request.json()
        email = data.get("email")
        password = data.get("password")
        users = load_users()
        user = users.get(email)
        if not user or not verify_password(password, user["password"]):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        return {"valid": True, "user": {"id": email, "role": user["role"]}}
    
    @app.get("/personas")
    async def get_personas():
        manager = get_pytorch_manager()
        models = manager.list_available_models()
        return {
            "personas": persona_payload(models),
            "models": models,
            "categories": MODEL_CATEGORIES,
        }
    
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
