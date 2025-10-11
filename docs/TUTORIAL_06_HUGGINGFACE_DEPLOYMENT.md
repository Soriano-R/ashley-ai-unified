# Ashley AI Chatbot Tutorial - Part 6: Hugging Face Pro Deployment

## Overview

This tutorial will guide you through deploying your Ashley AI chatbot application to Hugging Face Pro. Hugging Face Spaces provides an excellent platform for hosting AI applications with built-in support for popular frameworks and easy scaling options.

## Table of Contents

1. [Prerequisites and Setup](#prerequisites-and-setup)
2. [Hugging Face Account Configuration](#hugging-face-account-configuration)
3. [Project Adaptation for Hugging Face](#project-adaptation-for-hugging-face)
4. [Creating Hugging Face Spaces](#creating-hugging-face-spaces)
5. [Environment Configuration](#environment-configuration)
6. [Deployment Process](#deployment-process)
7. [Custom Domain and Pro Features](#custom-domain-and-pro-features)
8. [Monitoring and Maintenance](#monitoring-and-maintenance)
9. [Troubleshooting](#troubleshooting)

## Prerequisites and Setup

### Required Accounts and Access

Before beginning deployment, ensure you have:

#### Hugging Face Pro Account
- **Hugging Face Pro Subscription**: Required for advanced features and better performance
- **API Access**: For deployment and management
- **Storage Quota**: Pro accounts include increased storage and compute resources

#### OpenAI Integration
- **OpenAI API Key**: Your existing API key from the tutorial
- **Sufficient Credits**: Ensure your OpenAI account has adequate credits for production use

#### Development Environment
- **Completed Ashley AI Project**: From the previous tutorial parts
- **Git Repository**: With all code committed and pushed
- **Local Testing**: Verified working application

### Hugging Face Pro Benefits

Hugging Face Pro provides several advantages for hosting Ashley AI:

- **Increased Resources**: More CPU, RAM, and storage
- **Custom Domains**: Professional URLs for your application
- **Private Spaces**: Keep your code and data private
- **Better Performance**: Faster loading and response times
- **Priority Support**: Dedicated support for Pro users
- **Advanced Analytics**: Detailed usage statistics and monitoring

## Hugging Face Account Configuration

### Step 1: Upgrade to Hugging Face Pro

1. **Visit Hugging Face**: Go to https://huggingface.co
2. **Sign In**: Use your existing account or create a new one
3. **Upgrade to Pro**: 
   - Click on your profile menu
   - Select "Settings"
   - Navigate to "Billing"
   - Choose the Pro plan
   - Complete the payment process

### Step 2: Generate Access Tokens

1. **Navigate to Settings**: Click your profile → Settings
2. **Access Tokens**: Go to the "Access Tokens" section
3. **Create New Token**:
   - Name: "Ashley-AI-Deployment"
   - Type: "Write" (for deployment capabilities)
   - Scopes: Select all relevant scopes
4. **Copy Token**: Save this token securely - you'll need it for deployment

### Step 3: Configure Git Integration

1. **Install Hugging Face CLI**:
   ```bash
   pip install huggingface_hub
   ```

2. **Login to Hugging Face**:
   ```bash
   huggingface-cli login
   ```
   Enter your access token when prompted.

3. **Verify Authentication**:
   ```bash
   huggingface-cli whoami
   ```

## Project Adaptation for Hugging Face

### Step 1: Create Hugging Face-Specific Configuration

Create `app.py` in your project root (Hugging Face Spaces entry point):

```python
"""
Ashley AI - Hugging Face Spaces Entry Point
Gradio interface for the Ashley AI chatbot
"""
import os
import sys
import gradio as gr
import asyncio
from typing import List, Tuple, Optional
from datetime import datetime

# Add python-service to path
sys.path.append('python-service')

from python_service.app.orchestrator import ChatOrchestrator
from python_service.app.moderation import ContentModerator
from python_service.core.session_manager import SessionManager

# Initialize global components
orchestrator = None
moderator = None
session_manager = None

def initialize_services():
    """Initialize AI services"""
    global orchestrator, moderator, session_manager
    
    try:
        session_manager = SessionManager(storage_path="data/sessions")
        moderator = ContentModerator()
        orchestrator = ChatOrchestrator()
        return True, "Services initialized successfully"
    except Exception as e:
        return False, f"Failed to initialize services: {str(e)}"

async def chat_with_ashley(
    message: str, 
    chat_history: List[Tuple[str, str]], 
    persona: str,
    session_id: Optional[str] = None
) -> Tuple[List[Tuple[str, str]], str]:
    """
    Process chat message and return updated history
    
    Args:
        message: User input message
        chat_history: Previous conversation history
        persona: Selected AI persona
        session_id: Session identifier
    
    Returns:
        Updated chat history and empty message input
    """
    global orchestrator, moderator, session_manager
    
    if not message.strip():
        return chat_history, ""
    
    try:
        # Generate session ID if not provided
        if not session_id:
            session_id = session_manager.create_session()
        
        # Moderate content
        moderation_result = await moderator.moderate_content(message)
        if not moderation_result.is_safe:
            error_response = f"I cannot process that message: {moderation_result.reason}"
            chat_history.append((message, error_response))
            return chat_history, ""
        
        # Process with AI
        result = await orchestrator.chat(
            message=message,
            persona=persona,
            session_id=session_id
        )
        
        # Update chat history
        chat_history.append((message, result["response"]))
        
        # Store in session
        session_manager.add_message(session_id, {
            "role": "user",
            "content": message,
            "timestamp": datetime.now().isoformat()
        })
        session_manager.add_message(session_id, {
            "role": "assistant", 
            "content": result["response"],
            "persona": persona,
            "timestamp": datetime.now().isoformat()
        })
        
        return chat_history, ""
        
    except Exception as e:
        error_response = f"I apologize, but I encountered an error: {str(e)}"
        chat_history.append((message, error_response))
        return chat_history, ""

def clear_conversation():
    """Clear the conversation history"""
    return [], ""

def get_system_status():
    """Get current system status"""
    global orchestrator, moderator, session_manager
    
    status = {
        "Orchestrator": "✓ Ready" if orchestrator else "✗ Not Ready",
        "Moderator": "✓ Ready" if moderator else "✗ Not Ready", 
        "Session Manager": "✓ Ready" if session_manager else "✗ Not Ready",
        "OpenAI API": "✓ Connected" if os.getenv("OPENAI_API_KEY") else "✗ No API Key"
    }
    
    return "\n".join([f"{k}: {v}" for k, v in status.items()])

def create_gradio_interface():
    """Create the Gradio interface"""
    
    # Initialize services
    success, message = initialize_services()
    
    # Custom CSS for Ashley AI branding
    custom_css = """
    .gradio-container {
        background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
        font-family: 'Inter', sans-serif;
    }
    
    .gradio-container .wrap {
        max-width: 1200px;
        margin: 0 auto;
    }
    
    .header-text {
        text-align: center;
        color: #e2e8f0;
        margin-bottom: 2rem;
    }
    
    .status-box {
        background: rgba(30, 41, 59, 0.8);
        border: 1px solid rgba(71, 85, 105, 0.3);
        border-radius: 0.5rem;
        padding: 1rem;
        color: #e2e8f0;
        font-family: 'JetBrains Mono', monospace;
    }
    
    .chat-container {
        background: rgba(15, 23, 42, 0.9);
        border-radius: 1rem;
        border: 1px solid rgba(71, 85, 105, 0.2);
    }
    """
    
    with gr.Blocks(css=custom_css, title="Ashley AI - Intelligent Assistant") as interface:
        
        # Header
        gr.HTML("""
        <div class="header-text">
            <h1 style="font-size: 2.5rem; font-weight: bold; margin-bottom: 0.5rem; 
                       background: linear-gradient(45deg, #3b82f6, #8b5cf6); 
                       -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                Ashley AI
            </h1>
            <p style="font-size: 1.25rem; opacity: 0.8;">
                Your intelligent AI assistant powered by advanced language models
            </p>
        </div>
        """)
        
        # System Status
        with gr.Row():
            with gr.Column(scale=1):
                status_display = gr.Textbox(
                    label="System Status",
                    value=get_system_status(),
                    interactive=False,
                    lines=4,
                    elem_classes=["status-box"]
                )
                refresh_status = gr.Button("Refresh Status", variant="secondary")
        
        # Main Chat Interface
        with gr.Row():
            with gr.Column(scale=4):
                # Persona Selection
                persona_dropdown = gr.Dropdown(
                    choices=["Ashley", "Technical", "Creative"],
                    value="Ashley",
                    label="AI Persona",
                    info="Choose the AI personality for your conversation"
                )
                
                # Chat Interface
                chatbot = gr.Chatbot(
                    label="Conversation",
                    height=500,
                    show_label=True,
                    container=True,
                    elem_classes=["chat-container"]
                )
                
                # Input Controls
                with gr.Row():
                    msg_input = gr.Textbox(
                        label="Message",
                        placeholder="Type your message to Ashley AI...",
                        lines=2,
                        scale=4
                    )
                    send_btn = gr.Button("Send", variant="primary", scale=1)
                
                # Control Buttons
                with gr.Row():
                    clear_btn = gr.Button("Clear Conversation", variant="secondary")
                    
            # Sidebar with Information
            with gr.Column(scale=1):
                gr.Markdown("""
                ## About Ashley AI
                
                Ashley AI is a sophisticated chatbot with multiple personalities:
                
                **Ashley**: General assistant for everyday questions and tasks
                
                **Technical**: Expert in programming, development, and technical topics
                
                **Creative**: Specialized in writing, brainstorming, and creative endeavors
                
                ## Features
                - Intelligent conversation with context awareness
                - Content moderation for safe interactions  
                - Session management and history
                - Multiple AI personalities
                - Real-time responses
                
                ## Usage Tips
                - Be specific in your questions for better responses
                - Switch personas based on your needs
                - Use clear, well-formed sentences
                - Try different conversation styles
                """)
        
        # Event Handlers
        def submit_message(message, history, persona):
            """Handle message submission"""
            if not message.strip():
                return history, ""
            
            # Run async function in event loop
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                updated_history, empty_input = loop.run_until_complete(
                    chat_with_ashley(message, history, persona)
                )
                return updated_history, empty_input
            finally:
                loop.close()
        
        # Wire up event handlers
        send_btn.click(
            fn=submit_message,
            inputs=[msg_input, chatbot, persona_dropdown],
            outputs=[chatbot, msg_input]
        )
        
        msg_input.submit(
            fn=submit_message,
            inputs=[msg_input, chatbot, persona_dropdown], 
            outputs=[chatbot, msg_input]
        )
        
        clear_btn.click(
            fn=clear_conversation,
            outputs=[chatbot, msg_input]
        )
        
        refresh_status.click(
            fn=get_system_status,
            outputs=[status_display]
        )
        
        # Footer
        gr.HTML("""
        <div style="text-align: center; padding: 2rem; color: #64748b; font-size: 0.875rem;">
            <p>Ashley AI - Built with ❤️ using Hugging Face Spaces</p>
            <p>Powered by OpenAI GPT-4 • Hosted on Hugging Face Pro</p>
        </div>
        """)
    
    return interface

if __name__ == "__main__":
    # Create and launch the interface
    demo = create_gradio_interface()
    
    # Launch with appropriate settings for Hugging Face Spaces
    demo.launch(
        server_name="0.0.0.0",
        server_port=7860,  # Hugging Face Spaces default port
        share=False,
        show_error=True,
        quiet=False
    )
```

### Step 2: Create Hugging Face Requirements File

Create `requirements.txt` specifically for Hugging Face:

```txt
# Core Hugging Face Dependencies
gradio==4.7.1
huggingface_hub==0.19.4

# AI and ML Dependencies
openai==1.3.0
langchain==0.0.350
langchain-openai==0.0.2

# Web Framework (for background services)
fastapi==0.104.1
uvicorn[standard]==0.24.0

# Data Processing
pydantic==2.5.0
python-multipart==0.0.6
python-dotenv==1.0.0

# Utilities
aiofiles==23.2.1
httpx==0.25.2
tenacity==8.2.3

# Development and Testing
pytest==7.4.3
pytest-asyncio==0.21.1
```

### Step 3: Create Hugging Face Space Configuration

Create `README.md` for the Hugging Face Space:

```markdown
---
title: Ashley AI Chatbot
emoji: 🤖
colorFrom: blue
colorTo: purple
sdk: gradio
sdk_version: 4.7.1
app_file: app.py
pinned: false
license: mit
short_description: Intelligent AI assistant with multiple personalities
tags:
  - chatbot
  - openai
  - gpt-4
  - assistant
  - ai
---

# Ashley AI - Intelligent Assistant

A sophisticated AI chatbot with multiple personalities, built with modern technologies and deployed on Hugging Face Spaces.

## Features

- **Multiple AI Personas**: Ashley (general), Technical (programming), Creative (writing)
- **Advanced Conversation**: Context-aware responses with memory
- **Content Moderation**: Built-in safety and filtering
- **Beautiful Interface**: Modern Gradio-based UI
- **Real-time Chat**: Instant responses powered by OpenAI GPT-4

## Usage

1. Select your preferred AI persona from the dropdown
2. Type your message in the input field
3. Click "Send" or press Enter to chat
4. Use "Clear Conversation" to start fresh

## Configuration

To use this Space, you need to configure your OpenAI API key in the Space settings.

## About

Ashley AI is a full-stack chatbot application adapted for Hugging Face Spaces. It combines the power of OpenAI's language models with a beautiful, user-friendly interface.

Built with:
- Python & FastAPI
- OpenAI GPT-4
- Gradio for the interface
- Hugging Face Spaces for hosting

## Support

For issues or questions, please refer to the documentation or contact support.
```

### Step 4: Adapt Python Service Structure

Create a simplified structure for Hugging Face deployment. Create `python_service/` directory with adapted modules:

Create `python_service/app/orchestrator.py`:

```python
"""
Simplified ChatOrchestrator for Hugging Face Spaces
"""
import os
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime
from openai import OpenAI

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
            api_key = os.getenv("OPENAI_API_KEY")
            if not api_key:
                raise ValueError("OpenAI API key not found. Please set OPENAI_API_KEY in Space settings.")
            
            self.client = OpenAI(api_key=api_key)
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
            
            # Add recent conversation history (last 10 exchanges)
            recent_messages = session["messages"][-20:]
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
                "model": response.get("model", "gpt-4")
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
                model=os.getenv("OPENAI_MODEL", "gpt-4"),
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

## Creating Hugging Face Spaces

### Step 1: Create New Space

1. **Navigate to Hugging Face**: Go to https://huggingface.co/spaces
2. **Create New Space**:
   - Click "Create new Space"
   - **Owner**: Your username or organization
   - **Space name**: `ashley-ai-chatbot`
   - **License**: MIT
   - **SDK**: Gradio
   - **Visibility**: Private (Pro feature)
3. **Initialize Space**: Choose to create with README

### Step 2: Configure Space Settings

1. **Access Space Settings**: Click the "Settings" tab in your new Space
2. **Configure Variables**:
   - Add **Repository secrets** for sensitive data
   - Set **Environment variables** for configuration

#### Required Environment Variables

Add these in the Space settings under "Repository secrets":

```
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4
HF_TOKEN=your_huggingface_token
```

### Step 3: Upload Project Files

#### Option A: Git Clone and Push (Recommended)

```bash
# Clone your Hugging Face Space repository
git clone https://huggingface.co/spaces/YOUR_USERNAME/ashley-ai-chatbot
cd ashley-ai-chatbot

# Copy necessary files from your Ashley AI project
cp ../ashley-ai-unified/app.py .
cp ../ashley-ai-unified/requirements.txt .
cp -r ../ashley-ai-unified/python_service .

# Commit and push
git add .
git commit -m "Initial deployment of Ashley AI to Hugging Face Spaces"
git push
```

#### Option B: Web Interface Upload

1. **Navigate to Files Tab**: In your Space
2. **Upload Files**: Drag and drop or use the upload button
3. **Required Files**:
   - `app.py` (main Gradio application)
   - `requirements.txt` (dependencies)
   - `python_service/` directory (backend modules)
   - `README.md` (Space configuration)

## Environment Configuration

### Step 1: OpenAI API Configuration

1. **Add OpenAI API Key**:
   - Go to Space Settings → Repository secrets
   - Add secret: `OPENAI_API_KEY` with your API key value
   - Add secret: `OPENAI_MODEL` with value `gpt-4`

2. **Verify API Access**:
   - Ensure your OpenAI account has sufficient credits
   - Test API key validity in your local environment first

### Step 2: Hugging Face Space Configuration

Configure your Space for optimal performance:

```yaml
# In your Space's README.md, add configuration
---
title: Ashley AI Chatbot
emoji: 🤖
colorFrom: blue
colorTo: purple
sdk: gradio
sdk_version: 4.7.1
app_file: app.py
pinned: false
license: mit
python_version: 3.9
requirements: requirements.txt
---
```

### Step 3: Custom Domain Setup (Pro Feature)

1. **Access Pro Settings**: In your Space settings
2. **Custom Domain**:
   - Click "Custom domain" section
   - Enter your desired subdomain: `ashley-ai.hf.space`
   - Or configure your own domain: `chat.yourcompany.com`
3. **DNS Configuration**: Follow Hugging Face instructions for DNS setup

## Deployment Process

### Step 1: Automated Deployment

Once you push files to your Space repository:

1. **Automatic Build**: Hugging Face automatically detects changes
2. **Dependencies Installation**: Requirements are installed automatically
3. **Application Launch**: Gradio app starts on port 7860
4. **Health Checks**: System validates deployment

### Step 2: Monitor Deployment

1. **Build Logs**: Check the "Logs" tab for deployment progress
2. **Runtime Status**: Monitor application health in the interface
3. **Error Handling**: Address any deployment issues immediately

### Step 3: Test Deployment

1. **Access Your Space**: Visit your Space URL
2. **Test Chat Functionality**: Send test messages to verify AI responses
3. **Check All Personas**: Test Ashley, Technical, and Creative personas
4. **Verify Features**: Test conversation history, clearing, etc.

## Custom Domain and Pro Features

### Pro Features Available

1. **Private Spaces**: Keep your application and code private
2. **Custom Domains**: Professional URLs for your application
3. **Increased Resources**: Better performance and reliability
4. **Priority Support**: Faster response to issues
5. **Advanced Analytics**: Detailed usage metrics

### Setting Up Custom Domain

1. **Configure DNS**:
   ```
   CNAME chat.yourcompany.com -> proxy.hf.space
   ```

2. **SSL Certificate**: Automatically provided by Hugging Face

3. **Update Environment**: Configure any hardcoded URLs in your application

### Analytics and Monitoring

Access detailed analytics through your Pro dashboard:

- **Usage Statistics**: Number of conversations, users, messages
- **Performance Metrics**: Response times, error rates
- **Resource Usage**: CPU, memory, and bandwidth consumption
- **Geographic Data**: User locations and access patterns

## Monitoring and Maintenance

### Step 1: Application Monitoring

Create `monitoring.py` for health checks:

```python
"""
Application monitoring for Hugging Face deployment
"""
import os
import time
import logging
from datetime import datetime
import gradio as gr

class ApplicationMonitor:
    """Monitor application health and performance"""
    
    def __init__(self):
        self.start_time = datetime.now()
        self.request_count = 0
        self.error_count = 0
    
    def log_request(self):
        """Log a request"""
        self.request_count += 1
    
    def log_error(self, error: str):
        """Log an error"""
        self.error_count += 1
        logging.error(f"Application error: {error}")
    
    def get_health_status(self) -> dict:
        """Get current health status"""
        uptime = datetime.now() - self.start_time
        
        return {
            "status": "healthy" if self.error_count < 10 else "degraded",
            "uptime": str(uptime),
            "requests": self.request_count,
            "errors": self.error_count,
            "error_rate": self.error_count / max(self.request_count, 1) * 100,
            "openai_configured": bool(os.getenv("OPENAI_API_KEY")),
            "timestamp": datetime.now().isoformat()
        }

# Global monitor instance
monitor = ApplicationMonitor()
```

### Step 2: Logging Configuration

Add comprehensive logging to your `app.py`:

```python
import logging

# Configure logging for Hugging Face Spaces
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),  # Console output visible in Hugging Face logs
        logging.FileHandler('ashley-ai.log', mode='a')  # File logging
    ]
)

logger = logging.getLogger(__name__)
```

### Step 3: Error Handling and Recovery

Implement robust error handling:

```python
def safe_chat_wrapper(message, history, persona):
    """Wrapper with comprehensive error handling"""
    try:
        return submit_message(message, history, persona)
    except Exception as e:
        logger.error(f"Chat error: {e}")
        monitor.log_error(str(e))
        
        # Return user-friendly error message
        error_msg = "I'm experiencing technical difficulties. Please try again in a moment."
        history.append((message, error_msg))
        return history, ""
```

## Troubleshooting

### Common Deployment Issues

#### 1. Dependencies Not Installing

**Problem**: Requirements installation fails

**Solution**:
```bash
# Test requirements locally first
pip install -r requirements.txt

# Ensure all versions are compatible
pip freeze > requirements.txt
```

#### 2. OpenAI API Key Issues

**Problem**: API authentication fails

**Solutions**:
- Verify API key is correctly set in Space secrets
- Check OpenAI account has sufficient credits
- Ensure API key has necessary permissions

#### 3. Memory or Timeout Issues

**Problem**: Application crashes or times out

**Solutions**:
- Optimize conversation history storage
- Implement request timeout handling
- Use Hugging Face Pro for increased resources

#### 4. Gradio Interface Issues

**Problem**: UI doesn't load or responds slowly

**Solutions**:
```python
# Optimize Gradio configuration
demo.launch(
    server_name="0.0.0.0",
    server_port=7860,
    share=False,
    show_error=True,
    quiet=False,
    max_threads=40,  # Increase thread pool
    show_tips=False,
    enable_queue=True  # Enable request queuing
)
```

### Performance Optimization

#### 1. Response Time Optimization

```python
# Implement response caching
from functools import lru_cache

@lru_cache(maxsize=100)
def get_cached_response(message_hash: str, persona: str):
    """Cache frequent responses"""
    # Implementation here
    pass
```

#### 2. Memory Management

```python
# Limit session history to prevent memory issues
def cleanup_old_sessions(self):
    """Remove old sessions to free memory"""
    current_time = datetime.now()
    
    for session_id in list(self.sessions.keys()):
        session = self.sessions[session_id]
        if (current_time - session["updated_at"]).hours > 24:
            del self.sessions[session_id]
```

#### 3. API Rate Limiting

```python
import time
from functools import wraps

def rate_limit(calls_per_minute=60):
    """Rate limiting decorator"""
    def decorator(func):
        func.call_times = []
        
        @wraps(func)
        def wrapper(*args, **kwargs):
            now = time.time()
            # Remove calls older than 1 minute
            func.call_times = [t for t in func.call_times if now - t < 60]
            
            if len(func.call_times) >= calls_per_minute:
                sleep_time = 60 - (now - func.call_times[0])
                time.sleep(sleep_time)
            
            func.call_times.append(now)
            return func(*args, **kwargs)
        
        return wrapper
    return decorator
```

### Debugging on Hugging Face

#### 1. Access Logs

View real-time logs in your Space:
- Go to your Space
- Click the "Logs" tab
- Monitor for errors and performance issues

#### 2. Local Testing

Test your deployment locally before pushing:

```bash
# Install Gradio locally
pip install gradio

# Run your app locally
python app.py

# Test at http://localhost:7860
```

#### 3. Staged Deployment

Use a separate staging Space for testing:

1. Create `ashley-ai-staging` Space
2. Test changes there first
3. Deploy to production Space once verified

## Security Considerations

### 1. API Key Protection

- **Never commit API keys** to your repository
- **Use Hugging Face secrets** for sensitive configuration
- **Rotate keys regularly** for security

### 2. Input Validation

Implement comprehensive input validation:

```python
def validate_input(message: str) -> bool:
    """Validate user input for security"""
    if len(message) > 5000:  # Prevent extremely long messages
        return False
    
    # Add other validation rules as needed
    return True
```

### 3. Rate Limiting

Implement user-based rate limiting to prevent abuse:

```python
from collections import defaultdict
import time

class RateLimiter:
    def __init__(self, max_requests=60, window=60):
        self.max_requests = max_requests
        self.window = window
        self.requests = defaultdict(list)
    
    def is_allowed(self, user_id: str) -> bool:
        now = time.time()
        user_requests = self.requests[user_id]
        
        # Remove old requests
        user_requests[:] = [req for req in user_requests if now - req < self.window]
        
        if len(user_requests) >= self.max_requests:
            return False
        
        user_requests.append(now)
        return True
```

## Scaling and Advanced Features

### 1. Database Integration

For production use, consider adding persistent storage:

```python
# Example with SQLite for session persistence
import sqlite3
from contextlib import contextmanager

@contextmanager
def get_db_connection():
    conn = sqlite3.connect('ashley_ai.db')
    try:
        yield conn
    finally:
        conn.close()

def init_database():
    """Initialize database tables"""
    with get_db_connection() as conn:
        conn.execute('''
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                created_at TEXT,
                updated_at TEXT,
                messages TEXT
            )
        ''')
        conn.commit()
```

### 2. User Authentication

Add user management:

```python
def authenticate_user(username: str, password: str) -> bool:
    """Simple authentication (implement proper auth in production)"""
    # Implement your authentication logic
    return True

def get_user_session(user_id: str) -> str:
    """Get or create user-specific session"""
    # Implementation here
    pass
```

### 3. Advanced Analytics

Implement usage tracking:

```python
def track_usage(user_id: str, message: str, response: str, persona: str):
    """Track usage for analytics"""
    usage_data = {
        "user_id": user_id,
        "timestamp": datetime.now().isoformat(),
        "message_length": len(message),
        "response_length": len(response),
        "persona": persona
    }
    
    # Store or send to analytics service
    with open('usage.log', 'a') as f:
        f.write(json.dumps(usage_data) + '\n')
```

## Conclusion

You now have a comprehensive guide for deploying Ashley AI to Hugging Face Pro. This deployment provides:

- **Professional Hosting**: Reliable, scalable infrastructure
- **Custom Branding**: Your own domain and interface
- **Advanced Features**: Pro-level resources and support
- **Easy Maintenance**: Simple updates and monitoring
- **Cost Effective**: Reasonable pricing for professional hosting

### Next Steps

1. **Deploy Your Application**: Follow the steps to get Ashley AI live
2. **Monitor Performance**: Use the monitoring tools provided
3. **Gather User Feedback**: Collect input for improvements
4. **Iterate and Improve**: Regular updates and feature additions
5. **Scale as Needed**: Upgrade resources based on usage

Your Ashley AI chatbot is now ready for production use on Hugging Face Pro!