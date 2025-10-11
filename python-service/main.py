"""
Python AI Microservice for Ashley AI
Runs internally on port 8001, called by Next.js API routes
Uses existing chatbot_env virtual environment
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

# Import your existing backend logic (after migration)
# from app.config import get_settings
# from app.orchestrator import get_orchestrator

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan management"""
    logger.info("Starting Ashley AI Python Microservice")
    yield
    logger.info("Shutting down Ashley AI Python Microservice")


def create_app() -> FastAPI:
    """Create and configure the FastAPI microservice"""
    app = FastAPI(
        title="Ashley AI Python Microservice",
        description="Internal AI service for Next.js frontend",
        version="1.0.0",
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
    
    # Health check
    @app.get("/health")
    async def health_check():
        return {"status": "healthy", "service": "ashley-ai-python-microservice"}
    
    # Placeholder endpoints (we'll implement these)
    @app.post("/chat/stream")
    async def stream_chat(request: dict):
        return {"message": "Chat streaming endpoint - to be implemented"}
    
    @app.get("/chat/models")
    async def get_models():
        return [
            {"name": "gpt-4o", "description": "Advanced reasoning and vision"},
            {"name": "gpt-4o-mini", "description": "Fast and efficient"},
        ]
    
    @app.post("/auth/validate")
    async def validate_auth(request: dict):
        return {"valid": True, "user": {"id": "demo", "role": "user"}}
    
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