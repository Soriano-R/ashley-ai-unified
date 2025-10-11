# Ashley AI Chatbot Tutorial - Part 3: Python Backend Development

## Overview

In this part, we'll build the complete Python backend that powers Ashley AI. This includes the chat orchestrator, OpenAI integration, session management, and all the core AI functionality.

## Core Backend Architecture

### Step 1: Create AI Orchestrator

Create `python-service/app/orchestrator.py`:

```python
"""
ChatOrchestrator - Main AI conversation handler
"""
import os
import json
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime
import openai
from openai import OpenAI

from .config import settings

logger = logging.getLogger(__name__)

class ChatOrchestrator:
    """Orchestrates AI conversations with OpenAI"""
    
    def __init__(self):
        """Initialize the chat orchestrator"""
        self.client = None
        self.personas = {}
        self.sessions = {}
        self._initialize_openai()
        self._load_personas()
    
    def _initialize_openai(self):
        """Initialize OpenAI client"""
        try:
            if not settings.openai_api_key:
                raise ValueError("OpenAI API key not found in environment variables")
            
            self.client = OpenAI(api_key=settings.openai_api_key)
            logger.info("OpenAI client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize OpenAI client: {e}")
            raise
    
    def _load_personas(self):
        """Load AI personas from configuration"""
        self.personas = {
            "Ashley": {
                "name": "Ashley",
                "system_prompt": """You are Ashley, a helpful and knowledgeable AI assistant. 
                You are friendly, professional, and always strive to provide accurate and helpful information. 
                You can assist with a wide range of topics including programming, data analysis, creative writing, 
                problem-solving, and general questions. Always be concise but thorough in your responses.""",
                "temperature": 0.7,
                "max_tokens": 2000
            },
            "Technical": {
                "name": "Technical Expert",
                "system_prompt": """You are a technical expert AI assistant specializing in programming, 
                software development, system architecture, and technical problem-solving. You provide 
                detailed, accurate technical guidance with code examples when appropriate. You focus on 
                best practices, efficiency, and maintainable solutions.""",
                "temperature": 0.3,
                "max_tokens": 3000
            },
            "Creative": {
                "name": "Creative Assistant",
                "system_prompt": """You are a creative AI assistant specializing in writing, brainstorming, 
                creative problem-solving, and artistic endeavors. You help with creative writing, content 
                creation, storytelling, and generating innovative ideas. You're imaginative and inspiring 
                while maintaining helpfulness.""",
                "temperature": 0.9,
                "max_tokens": 2500
            }
        }
        logger.info(f"Loaded {len(self.personas)} personas")
    
    async def chat(self, message: str, persona: str = "Ashley", session_id: str = "default") -> Dict[str, Any]:
        """
        Process a chat message and return AI response
        
        Args:
            message: User's message
            persona: AI persona to use
            session_id: Session identifier for conversation history
            
        Returns:
            Dictionary containing response and metadata
        """
        try:
            # Get or create session
            if session_id not in self.sessions:
                self.sessions[session_id] = {
                    "messages": [],
                    "created_at": datetime.now(),
                    "persona": persona
                }
            
            session = self.sessions[session_id]
            persona_config = self.personas.get(persona, self.personas["Ashley"])
            
            # Build conversation history
            messages = [
                {"role": "system", "content": persona_config["system_prompt"]}
            ]
            
            # Add conversation history (keep last 10 exchanges to manage context length)
            recent_messages = session["messages"][-20:]  # Last 20 messages (10 exchanges)
            messages.extend(recent_messages)
            
            # Add current user message
            user_message = {"role": "user", "content": message}
            messages.append(user_message)
            
            # Call OpenAI API
            response = await self._call_openai(messages, persona_config)
            
            # Store messages in session
            session["messages"].append(user_message)
            session["messages"].append({"role": "assistant", "content": response["content"]})
            session["updated_at"] = datetime.now()
            
            return {
                "response": response["content"],
                "persona": persona,
                "session_id": session_id,
                "tokens_used": response.get("tokens_used", 0),
                "model": response.get("model", settings.openai_model)
            }
            
        except Exception as e:
            logger.error(f"Error in chat processing: {e}")
            return {
                "response": "I apologize, but I encountered an error processing your message. Please try again.",
                "persona": persona,
                "session_id": session_id,
                "error": str(e)
            }
    
    async def _call_openai(self, messages: List[Dict], persona_config: Dict) -> Dict[str, Any]:
        """Make API call to OpenAI"""
        try:
            response = self.client.chat.completions.create(
                model=settings.openai_model,
                messages=messages,
                temperature=persona_config.get("temperature", 0.7),
                max_tokens=persona_config.get("max_tokens", 2000),
                stream=False
            )
            
            return {
                "content": response.choices[0].message.content,
                "tokens_used": response.usage.total_tokens,
                "model": response.model
            }
            
        except Exception as e:
            logger.error(f"OpenAI API call failed: {e}")
            raise
    
    def get_session_history(self, session_id: str) -> Optional[Dict]:
        """Get conversation history for a session"""
        return self.sessions.get(session_id)
    
    def clear_session(self, session_id: str) -> bool:
        """Clear conversation history for a session"""
        if session_id in self.sessions:
            del self.sessions[session_id]
            return True
        return False
    
    def get_available_personas(self) -> List[str]:
        """Get list of available personas"""
        return list(self.personas.keys())
```

### Step 2: Create Session Manager

Create `python-service/core/session_manager.py`:

```python
"""
Session Manager - Handles user sessions and conversation state
"""
import uuid
import json
import os
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

class SessionManager:
    """Manages user sessions and conversation persistence"""
    
    def __init__(self, storage_path: str = "storage/data"):
        """Initialize session manager with storage path"""
        self.storage_path = Path(storage_path)
        self.storage_path.mkdir(parents=True, exist_ok=True)
        self.sessions: Dict[str, Dict] = {}
        self._load_sessions()
    
    def create_session(self, user_id: Optional[str] = None) -> str:
        """Create a new session and return session ID"""
        session_id = str(uuid.uuid4())
        
        session_data = {
            "session_id": session_id,
            "user_id": user_id,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "messages": [],
            "metadata": {}
        }
        
        self.sessions[session_id] = session_data
        self._save_session(session_id)
        
        logger.info(f"Created new session: {session_id}")
        return session_id
    
    def get_session(self, session_id: str) -> Optional[Dict]:
        """Get session data by ID"""
        return self.sessions.get(session_id)
    
    def update_session(self, session_id: str, data: Dict) -> bool:
        """Update session data"""
        if session_id not in self.sessions:
            return False
        
        self.sessions[session_id].update(data)
        self.sessions[session_id]["updated_at"] = datetime.now().isoformat()
        self._save_session(session_id)
        
        return True
    
    def add_message(self, session_id: str, message: Dict) -> bool:
        """Add a message to session history"""
        if session_id not in self.sessions:
            return False
        
        message["timestamp"] = datetime.now().isoformat()
        self.sessions[session_id]["messages"].append(message)
        self.sessions[session_id]["updated_at"] = datetime.now().isoformat()
        self._save_session(session_id)
        
        return True
    
    def get_messages(self, session_id: str, limit: Optional[int] = None) -> List[Dict]:
        """Get messages from session"""
        session = self.sessions.get(session_id)
        if not session:
            return []
        
        messages = session.get("messages", [])
        if limit:
            return messages[-limit:]
        return messages
    
    def delete_session(self, session_id: str) -> bool:
        """Delete a session"""
        if session_id in self.sessions:
            del self.sessions[session_id]
            
            # Remove session file
            session_file = self.storage_path / f"{session_id}.json"
            if session_file.exists():
                session_file.unlink()
            
            logger.info(f"Deleted session: {session_id}")
            return True
        return False
    
    def list_sessions(self, user_id: Optional[str] = None) -> List[Dict]:
        """List all sessions, optionally filtered by user ID"""
        sessions = []
        for session_data in self.sessions.values():
            if user_id is None or session_data.get("user_id") == user_id:
                # Return session metadata without full message history
                session_summary = {
                    "session_id": session_data["session_id"],
                    "user_id": session_data.get("user_id"),
                    "created_at": session_data["created_at"],
                    "updated_at": session_data["updated_at"],
                    "message_count": len(session_data.get("messages", [])),
                    "metadata": session_data.get("metadata", {})
                }
                sessions.append(session_summary)
        
        return sorted(sessions, key=lambda x: x["updated_at"], reverse=True)
    
    def cleanup_old_sessions(self, days: int = 30) -> int:
        """Clean up sessions older than specified days"""
        cutoff_date = datetime.now() - timedelta(days=days)
        sessions_to_delete = []
        
        for session_id, session_data in self.sessions.items():
            updated_at = datetime.fromisoformat(session_data["updated_at"])
            if updated_at < cutoff_date:
                sessions_to_delete.append(session_id)
        
        for session_id in sessions_to_delete:
            self.delete_session(session_id)
        
        logger.info(f"Cleaned up {len(sessions_to_delete)} old sessions")
        return len(sessions_to_delete)
    
    def _load_sessions(self):
        """Load sessions from storage"""
        try:
            for session_file in self.storage_path.glob("*.json"):
                session_id = session_file.stem
                with open(session_file, "r") as f:
                    session_data = json.load(f)
                    self.sessions[session_id] = session_data
            
            logger.info(f"Loaded {len(self.sessions)} sessions from storage")
        except Exception as e:
            logger.error(f"Error loading sessions: {e}")
    
    def _save_session(self, session_id: str):
        """Save session to storage"""
        try:
            session_file = self.storage_path / f"{session_id}.json"
            with open(session_file, "w") as f:
                json.dump(self.sessions[session_id], f, indent=2)
        except Exception as e:
            logger.error(f"Error saving session {session_id}: {e}")
```

### Step 3: Create Content Moderation

Create `python-service/app/moderation.py`:

```python
"""
Content Moderation - Safety and content filtering
"""
import logging
import re
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from openai import OpenAI
from .config import settings

logger = logging.getLogger(__name__)

@dataclass
class ModerationResult:
    """Result of content moderation check"""
    is_safe: bool
    flagged_categories: List[str]
    confidence_score: float
    reason: Optional[str] = None

class ContentModerator:
    """Handles content moderation and safety checks"""
    
    def __init__(self):
        """Initialize content moderator"""
        self.client = OpenAI(api_key=settings.openai_api_key) if settings.openai_api_key else None
        self.blocked_patterns = self._load_blocked_patterns()
        self.safe_words = self._load_safe_words()
    
    def _load_blocked_patterns(self) -> List[str]:
        """Load patterns that should be blocked"""
        return [
            # Add patterns for content you want to block
            r"(?i)\b(spam|phishing|scam)\b",
            r"(?i)\b(hack|exploit|vulnerability)\b.*(?i)\b(password|login|credential)\b",
            # Add more patterns as needed
        ]
    
    def _load_safe_words(self) -> List[str]:
        """Load words that indicate safe content"""
        return [
            "help", "assist", "learn", "understand", "explain",
            "code", "program", "develop", "create", "build",
            "question", "answer", "solve", "problem", "issue"
        ]
    
    async def moderate_content(self, text: str) -> ModerationResult:
        """
        Moderate content using multiple checks
        
        Args:
            text: Content to moderate
            
        Returns:
            ModerationResult with safety assessment
        """
        try:
            # Quick pattern-based check first
            pattern_result = self._check_patterns(text)
            if not pattern_result.is_safe:
                return pattern_result
            
            # OpenAI moderation API check
            if self.client:
                openai_result = await self._openai_moderation(text)
                if not openai_result.is_safe:
                    return openai_result
            
            # Content length check
            length_result = self._check_length(text)
            if not length_result.is_safe:
                return length_result
            
            # All checks passed
            return ModerationResult(
                is_safe=True,
                flagged_categories=[],
                confidence_score=0.95,
                reason="Content passed all safety checks"
            )
            
        except Exception as e:
            logger.error(f"Error in content moderation: {e}")
            # Fail safe - allow content but log the error
            return ModerationResult(
                is_safe=True,
                flagged_categories=["moderation_error"],
                confidence_score=0.0,
                reason=f"Moderation check failed: {str(e)}"
            )
    
    def _check_patterns(self, text: str) -> ModerationResult:
        """Check text against blocked patterns"""
        flagged_categories = []
        
        for pattern in self.blocked_patterns:
            if re.search(pattern, text):
                flagged_categories.append("pattern_match")
                break
        
        if flagged_categories:
            return ModerationResult(
                is_safe=False,
                flagged_categories=flagged_categories,
                confidence_score=0.8,
                reason="Content matched blocked patterns"
            )
        
        return ModerationResult(
            is_safe=True,
            flagged_categories=[],
            confidence_score=0.9
        )
    
    async def _openai_moderation(self, text: str) -> ModerationResult:
        """Use OpenAI's moderation API"""
        try:
            response = self.client.moderations.create(input=text)
            result = response.results[0]
            
            if result.flagged:
                flagged_categories = [
                    category for category, flagged in result.categories.model_dump().items()
                    if flagged
                ]
                
                return ModerationResult(
                    is_safe=False,
                    flagged_categories=flagged_categories,
                    confidence_score=max(result.category_scores.model_dump().values()),
                    reason="Content flagged by OpenAI moderation"
                )
            
            return ModerationResult(
                is_safe=True,
                flagged_categories=[],
                confidence_score=1.0 - max(result.category_scores.model_dump().values())
            )
            
        except Exception as e:
            logger.error(f"OpenAI moderation check failed: {e}")
            # Return safe result if moderation API fails
            return ModerationResult(
                is_safe=True,
                flagged_categories=["api_error"],
                confidence_score=0.5,
                reason="Moderation API unavailable"
            )
    
    def _check_length(self, text: str) -> ModerationResult:
        """Check if content length is reasonable"""
        max_length = 10000  # Maximum characters allowed
        
        if len(text) > max_length:
            return ModerationResult(
                is_safe=False,
                flagged_categories=["excessive_length"],
                confidence_score=1.0,
                reason=f"Content exceeds maximum length of {max_length} characters"
            )
        
        return ModerationResult(
            is_safe=True,
            flagged_categories=[],
            confidence_score=1.0
        )
    
    def sanitize_input(self, text: str) -> str:
        """Sanitize user input"""
        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text.strip())
        
        # Remove potential script tags or HTML
        text = re.sub(r'<[^>]+>', '', text)
        
        # Limit length
        max_input_length = 5000
        if len(text) > max_input_length:
            text = text[:max_input_length] + "..."
        
        return text
```

### Step 4: Update Main FastAPI Application

Update `python-service/main.py` to include all the new functionality:

```python
"""
Ashley AI Python Microservice
Complete FastAPI application with AI orchestration
"""
import os
import sys
import logging
from pathlib import Path
from typing import Optional

# Add the current directory to Python path
sys.path.append(str(Path(__file__).parent))

import uvicorn
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from typing import AsyncGenerator
from pydantic import BaseModel

# Import our modules
from app.orchestrator import ChatOrchestrator
from app.moderation import ContentModerator
from core.session_manager import SessionManager
from app.config import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Global instances
orchestrator: Optional[ChatOrchestrator] = None
moderator: Optional[ContentModerator] = None
session_manager: Optional[SessionManager] = None

# Pydantic models
class ChatMessage(BaseModel):
    message: str
    persona: str = "Ashley"
    session_id: str = "default"

class ChatResponse(BaseModel):
    response: str
    session_id: str
    persona: str
    tokens_used: Optional[int] = None
    model: Optional[str] = None

class SessionCreate(BaseModel):
    user_id: Optional[str] = None

class SessionResponse(BaseModel):
    session_id: str
    created_at: str

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan management"""
    global orchestrator, moderator, session_manager
    
    logger.info("Starting Ashley AI Python Microservice")
    
    try:
        # Initialize services
        session_manager = SessionManager()
        moderator = ContentModerator()
        orchestrator = ChatOrchestrator()
        
        logger.info("All services initialized successfully")
        logger.info("Ashley AI Python Microservice startup complete")
    except Exception as e:
        logger.error(f"Failed to initialize services: {e}")
        raise
    
    yield
    
    logger.info("Shutting down Ashley AI Python Microservice")

def create_app() -> FastAPI:
    """Create and configure the FastAPI application"""
    app = FastAPI(
        title="Ashley AI Python Microservice",
        description="AI-powered chatbot backend service",
        version="1.0.0",
        lifespan=lifespan,
        docs_url="/docs",
    )
    
    # CORS configuration
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE"],
        allow_headers=["*"],
    )
    
    # Dependency to get services
    def get_orchestrator() -> ChatOrchestrator:
        if orchestrator is None:
            raise HTTPException(status_code=503, detail="Chat orchestrator not available")
        return orchestrator
    
    def get_moderator() -> ContentModerator:
        if moderator is None:
            raise HTTPException(status_code=503, detail="Content moderator not available")
        return moderator
    
    def get_session_manager() -> SessionManager:
        if session_manager is None:
            raise HTTPException(status_code=503, detail="Session manager not available")
        return session_manager
    
    # Health check endpoint
    @app.get("/health")
    async def health_check():
        return {
            "status": "healthy",
            "service": "ashley-ai-python-microservice",
            "version": "1.0.0"
        }
    
    # Chat endpoint
    @app.post("/chat", response_model=ChatResponse)
    async def chat(
        message: ChatMessage,
        orch: ChatOrchestrator = Depends(get_orchestrator),
        mod: ContentModerator = Depends(get_moderator)
    ):
        """Process a chat message"""
        try:
            # Sanitize and moderate input
            sanitized_message = mod.sanitize_input(message.message)
            moderation_result = await mod.moderate_content(sanitized_message)
            
            if not moderation_result.is_safe:
                raise HTTPException(
                    status_code=400,
                    detail=f"Content not allowed: {moderation_result.reason}"
                )
            
            # Process chat message
            result = await orch.chat(
                message=sanitized_message,
                persona=message.persona,
                session_id=message.session_id
            )
            
            return ChatResponse(**result)
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error processing chat message: {e}")
            raise HTTPException(status_code=500, detail="Internal server error")
    
    # Session management endpoints
    @app.post("/sessions", response_model=SessionResponse)
    async def create_session(
        session_data: SessionCreate,
        sm: SessionManager = Depends(get_session_manager)
    ):
        """Create a new session"""
        session_id = sm.create_session(user_id=session_data.user_id)
        session = sm.get_session(session_id)
        
        return SessionResponse(
            session_id=session_id,
            created_at=session["created_at"]
        )
    
    @app.get("/sessions/{session_id}")
    async def get_session(
        session_id: str,
        sm: SessionManager = Depends(get_session_manager)
    ):
        """Get session details"""
        session = sm.get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        return session
    
    @app.delete("/sessions/{session_id}")
    async def delete_session(
        session_id: str,
        sm: SessionManager = Depends(get_session_manager)
    ):
        """Delete a session"""
        if not sm.delete_session(session_id):
            raise HTTPException(status_code=404, detail="Session not found")
        return {"message": "Session deleted successfully"}
    
    @app.get("/sessions")
    async def list_sessions(
        user_id: Optional[str] = None,
        sm: SessionManager = Depends(get_session_manager)
    ):
        """List all sessions"""
        sessions = sm.list_sessions(user_id=user_id)
        return {"sessions": sessions}
    
    # Personas endpoint
    @app.get("/personas")
    async def get_personas(orch: ChatOrchestrator = Depends(get_orchestrator)):
        """Get available AI personas"""
        return {"personas": orch.get_available_personas()}
    
    return app

# Create the FastAPI app
app = create_app()

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.service_host,
        port=settings.service_port,
        reload=True,
        log_level="info"
    )
```

## Testing the Backend

### Step 1: Test Basic Functionality

Start the Python service:

```bash
cd python-service
source ../chatbot_env/bin/activate
python main.py
```

### Step 2: Test API Endpoints

Test the health endpoint:

```bash
curl http://localhost:8001/health
```

Test the personas endpoint:

```bash
curl http://localhost:8001/personas
```

Test creating a session:

```bash
curl -X POST http://localhost:8001/sessions \
  -H "Content-Type: application/json" \
  -d '{}'
```

Test a chat message (replace SESSION_ID with the ID from the previous step):

```bash
curl -X POST http://localhost:8001/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello, how are you?",
    "persona": "Ashley",
    "session_id": "SESSION_ID"
  }'
```

## Error Handling and Logging

The backend includes comprehensive error handling and logging. Check the console output when running the service to see detailed logs of all operations.

## Next Steps

Your Python backend is now complete and functional! In the next part of this tutorial, we'll:
- Build the Next.js frontend user interface
- Create beautiful React components
- Implement authentication and user management
- Connect the frontend to the Python backend

Continue to **TUTORIAL_04_FRONTEND_DEVELOPMENT.md** to proceed with frontend development.

## Troubleshooting

### Common Backend Issues

**OpenAI API Errors**:
- Verify your API key is correct in `.env`
- Check that you have OpenAI credits available
- Ensure your API key has chat completions permissions

**Import Errors**:
- Ensure all dependencies are installed: `pip install -r requirements.txt`
- Verify virtual environment is activated
- Check that all Python files are in the correct directories

**Port Conflicts**:
- Check if port 8001 is in use: `lsof -i :8001`
- Kill existing processes or change the port in configuration