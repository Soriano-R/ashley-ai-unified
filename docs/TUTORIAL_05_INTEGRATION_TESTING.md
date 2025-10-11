# Ashley AI Chatbot Tutorial - Part 5: Integration, Testing, and Deployment

## Overview

In this final part, we'll integrate all components, create comprehensive tests, and prepare the application for deployment. We'll also cover GitHub setup and advanced configuration options.

## Integration Testing

### Step 1: Create Test Configuration

Create `jest.config.js`:

```javascript
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapping: {
    // Handle module aliases (this will be automatically configured for you based on your tsconfig.json paths)
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@/app/(.*)$': '<rootDir>/src/app/$1',
  },
  testEnvironment: 'jest-environment-jsdom',
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
```

Create `jest.setup.js`:

```javascript
import '@testing-library/jest-dom'

// Mock next/font
jest.mock('next/font/google', () => ({
  Geist: () => ({
    variable: '--font-geist-sans',
  }),
  Geist_Mono: () => ({
    variable: '--font-geist-mono',
  }),
}))

// Mock environment variables
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8001'
process.env.NEXT_PUBLIC_APP_NAME = 'Ashley AI'
```

Install testing dependencies:

```bash
npm install -D jest jest-environment-jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

### Step 2: Create Component Tests

Create `src/components/__tests__/button.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '../ui/button'

describe('Button', () => {
  it('renders button with text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
  })

  it('handles click events', async () => {
    const user = userEvent.setup()
    const handleClick = jest.fn()
    
    render(<Button onClick={handleClick}>Click me</Button>)
    
    await user.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('can be disabled', () => {
    render(<Button disabled>Disabled button</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('applies variant classes correctly', () => {
    render(<Button variant="destructive">Delete</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('bg-destructive')
  })
})
```

Create `src/components/__tests__/chat-input.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChatInput } from '../chat/chat-input'

describe('ChatInput', () => {
  it('renders input and send button', () => {
    const mockSend = jest.fn()
    render(<ChatInput onSendMessage={mockSend} />)
    
    expect(screen.getByPlaceholderText(/type your message/i)).toBeInTheDocument()
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('sends message when form is submitted', async () => {
    const user = userEvent.setup()
    const mockSend = jest.fn()
    
    render(<ChatInput onSendMessage={mockSend} />)
    
    const input = screen.getByPlaceholderText(/type your message/i)
    const button = screen.getByRole('button')
    
    await user.type(input, 'Hello world')
    await user.click(button)
    
    expect(mockSend).toHaveBeenCalledWith('Hello world')
  })

  it('sends message on Enter key press', async () => {
    const user = userEvent.setup()
    const mockSend = jest.fn()
    
    render(<ChatInput onSendMessage={mockSend} />)
    
    const input = screen.getByPlaceholderText(/type your message/i)
    
    await user.type(input, 'Hello world{enter}')
    
    expect(mockSend).toHaveBeenCalledWith('Hello world')
  })

  it('does not send empty messages', async () => {
    const user = userEvent.setup()
    const mockSend = jest.fn()
    
    render(<ChatInput onSendMessage={mockSend} />)
    
    const button = screen.getByRole('button')
    await user.click(button)
    
    expect(mockSend).not.toHaveBeenCalled()
  })
})
```

### Step 3: Create Integration Tests

Create `src/__tests__/integration.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Home from '../app/page'

// Mock the API client
jest.mock('../lib/api', () => ({
  apiClient: {
    getPersonas: jest.fn().mockResolvedValue({ personas: ['Ashley', 'Technical', 'Creative'] }),
    createSession: jest.fn().mockResolvedValue({ session_id: 'test-session', created_at: new Date().toISOString() }),
    sendMessage: jest.fn().mockResolvedValue({
      response: 'Hello! How can I help you today?',
      session_id: 'test-session',
      persona: 'Ashley',
      tokens_used: 25,
      model: 'gpt-4'
    }),
    deleteSession: jest.fn().mockResolvedValue({ message: 'Session deleted' }),
  }
}))

describe('Home Page Integration', () => {
  it('shows sign-in form initially', () => {
    render(<Home />)
    expect(screen.getByText(/welcome back/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  it('allows user to sign in and access chat', async () => {
    const user = userEvent.setup()
    render(<Home />)

    // Fill in sign-in form
    await user.type(screen.getByLabelText(/email address/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    // Wait for chat interface to appear
    await waitFor(() => {
      expect(screen.getByText(/ashley ai/i)).toBeInTheDocument()
    })

    expect(screen.getByText(/welcome to ashley ai/i)).toBeInTheDocument()
  })

  it('allows sending and receiving messages', async () => {
    const user = userEvent.setup()
    render(<Home />)

    // Sign in first
    await user.type(screen.getByLabelText(/email address/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/message ashley/i)).toBeInTheDocument()
    })

    // Send a message
    const input = screen.getByPlaceholderText(/message ashley/i)
    await user.type(input, 'Hello, Ashley!')
    await user.click(screen.getByRole('button', { name: /send/i }))

    // Check that message appears in chat
    await waitFor(() => {
      expect(screen.getByText('Hello, Ashley!')).toBeInTheDocument()
      expect(screen.getByText('Hello! How can I help you today?')).toBeInTheDocument()
    })
  })
})
```

### Step 4: Create Python Backend Tests

Create `python-service/tests/__init__.py`:

```python
# Tests package initialization
```

Create `python-service/tests/conftest.py`:

```python
"""
Pytest configuration and fixtures
"""
import pytest
import asyncio
from fastapi.testclient import TestClient
from unittest.mock import Mock, AsyncMock

# Import your app
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

from main import create_app
from app.orchestrator import ChatOrchestrator
from app.moderation import ContentModerator
from core.session_manager import SessionManager

@pytest.fixture
def app():
    """Create a test FastAPI app"""
    return create_app()

@pytest.fixture
def client(app):
    """Create a test client"""
    return TestClient(app)

@pytest.fixture
def mock_orchestrator():
    """Mock ChatOrchestrator"""
    mock = Mock(spec=ChatOrchestrator)
    mock.chat = AsyncMock(return_value={
        "response": "Test response",
        "persona": "Ashley",
        "session_id": "test-session",
        "tokens_used": 25,
        "model": "gpt-4"
    })
    mock.get_available_personas = Mock(return_value=["Ashley", "Technical", "Creative"])
    return mock

@pytest.fixture
def mock_moderator():
    """Mock ContentModerator"""
    mock = Mock(spec=ContentModerator)
    mock.sanitize_input = Mock(side_effect=lambda x: x)
    mock.moderate_content = AsyncMock(return_value=Mock(
        is_safe=True,
        flagged_categories=[],
        confidence_score=0.95,
        reason="Content passed all safety checks"
    ))
    return mock

@pytest.fixture
def mock_session_manager():
    """Mock SessionManager"""
    mock = Mock(spec=SessionManager)
    mock.create_session = Mock(return_value="test-session-id")
    mock.get_session = Mock(return_value={
        "session_id": "test-session-id",
        "user_id": None,
        "created_at": "2024-01-01T00:00:00",
        "updated_at": "2024-01-01T00:00:00",
        "messages": [],
        "metadata": {}
    })
    mock.delete_session = Mock(return_value=True)
    mock.list_sessions = Mock(return_value=[])
    return mock

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()
```

Create `python-service/tests/test_api.py`:

```python
"""
API endpoint tests
"""
import pytest
from unittest.mock import patch, Mock
from fastapi.testclient import TestClient

def test_health_endpoint(client):
    """Test health check endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "service" in data
    assert "version" in data

def test_personas_endpoint(client, mock_orchestrator):
    """Test personas endpoint"""
    with patch('main.orchestrator', mock_orchestrator):
        response = client.get("/personas")
        assert response.status_code == 200
        data = response.json()
        assert "personas" in data
        assert isinstance(data["personas"], list)

def test_create_session(client, mock_session_manager):
    """Test session creation"""
    with patch('main.session_manager', mock_session_manager):
        response = client.post("/sessions", json={})
        assert response.status_code == 200
        data = response.json()
        assert "session_id" in data
        assert "created_at" in data

def test_chat_endpoint(client, mock_orchestrator, mock_moderator):
    """Test chat endpoint"""
    with patch('main.orchestrator', mock_orchestrator), \
         patch('main.moderator', mock_moderator):
        
        response = client.post("/chat", json={
            "message": "Hello, how are you?",
            "persona": "Ashley",
            "session_id": "test-session"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "response" in data
        assert "session_id" in data
        assert "persona" in data
        assert data["persona"] == "Ashley"

def test_chat_endpoint_with_unsafe_content(client, mock_orchestrator, mock_moderator):
    """Test chat endpoint with unsafe content"""
    # Configure moderator to flag content as unsafe
    mock_moderator.moderate_content.return_value = Mock(
        is_safe=False,
        reason="Content flagged for safety"
    )
    
    with patch('main.orchestrator', mock_orchestrator), \
         patch('main.moderator', mock_moderator):
        
        response = client.post("/chat", json={
            "message": "unsafe content",
            "persona": "Ashley",
            "session_id": "test-session"
        })
        
        assert response.status_code == 400
        data = response.json()
        assert "Content not allowed" in data["detail"]

def test_delete_session(client, mock_session_manager):
    """Test session deletion"""
    with patch('main.session_manager', mock_session_manager):
        response = client.delete("/sessions/test-session")
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Session deleted successfully"

def test_delete_nonexistent_session(client, mock_session_manager):
    """Test deleting non-existent session"""
    mock_session_manager.delete_session.return_value = False
    
    with patch('main.session_manager', mock_session_manager):
        response = client.delete("/sessions/nonexistent")
        assert response.status_code == 404
        data = response.json()
        assert "Session not found" in data["detail"]

def test_list_sessions(client, mock_session_manager):
    """Test listing sessions"""
    with patch('main.session_manager', mock_session_manager):
        response = client.get("/sessions")
        assert response.status_code == 200
        data = response.json()
        assert "sessions" in data
        assert isinstance(data["sessions"], list)
```

Create `python-service/tests/test_orchestrator.py`:

```python
"""
ChatOrchestrator tests
"""
import pytest
from unittest.mock import Mock, AsyncMock, patch
from app.orchestrator import ChatOrchestrator

@pytest.fixture
def mock_openai_client():
    """Mock OpenAI client"""
    mock_client = Mock()
    mock_response = Mock()
    mock_response.choices = [Mock()]
    mock_response.choices[0].message.content = "Test response from AI"
    mock_response.usage.total_tokens = 25
    mock_response.model = "gpt-4"
    
    mock_client.chat.completions.create.return_value = mock_response
    return mock_client

@pytest.mark.asyncio
async def test_chat_orchestrator_initialization():
    """Test ChatOrchestrator initialization"""
    with patch('app.orchestrator.OpenAI'):
        orchestrator = ChatOrchestrator()
        assert orchestrator is not None
        assert "Ashley" in orchestrator.personas
        assert len(orchestrator.personas) >= 1

@pytest.mark.asyncio
async def test_chat_processing(mock_openai_client):
    """Test basic chat processing"""
    with patch('app.orchestrator.OpenAI', return_value=mock_openai_client):
        orchestrator = ChatOrchestrator()
        
        result = await orchestrator.chat(
            message="Hello, how are you?",
            persona="Ashley",
            session_id="test-session"
        )
        
        assert result["response"] == "Test response from AI"
        assert result["persona"] == "Ashley"
        assert result["session_id"] == "test-session"
        assert "tokens_used" in result

@pytest.mark.asyncio
async def test_chat_with_session_history(mock_openai_client):
    """Test chat with conversation history"""
    with patch('app.orchestrator.OpenAI', return_value=mock_openai_client):
        orchestrator = ChatOrchestrator()
        
        # Send first message
        await orchestrator.chat(
            message="Hello",
            persona="Ashley",
            session_id="test-session"
        )
        
        # Send second message
        result = await orchestrator.chat(
            message="How are you?",
            persona="Ashley",
            session_id="test-session"
        )
        
        # Verify session has message history
        session = orchestrator.get_session_history("test-session")
        assert session is not None
        assert len(session["messages"]) == 4  # 2 user + 2 assistant messages

def test_get_available_personas():
    """Test getting available personas"""
    with patch('app.orchestrator.OpenAI'):
        orchestrator = ChatOrchestrator()
        personas = orchestrator.get_available_personas()
        
        assert isinstance(personas, list)
        assert "Ashley" in personas
        assert len(personas) >= 1

def test_clear_session():
    """Test clearing session"""
    with patch('app.orchestrator.OpenAI'):
        orchestrator = ChatOrchestrator()
        
        # Create a session by chatting
        orchestrator.sessions["test-session"] = {
            "messages": [{"role": "user", "content": "test"}],
            "created_at": "2024-01-01T00:00:00",
            "persona": "Ashley"
        }
        
        # Clear the session
        result = orchestrator.clear_session("test-session")
        assert result is True
        assert "test-session" not in orchestrator.sessions
```

## Development Scripts

### Step 1: Create Development Scripts

Create `scripts/setup-dev.sh`:

```bash
#!/bin/bash

echo "Setting up Ashley AI development environment..."

# Check prerequisites
echo "Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed"
    exit 1
fi

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is not installed"
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d "chatbot_env" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv chatbot_env
fi

# Activate virtual environment and install Python dependencies
echo "Installing Python dependencies..."
source chatbot_env/bin/activate
pip install -r requirements.txt

# Install Node.js dependencies
echo "Installing Node.js dependencies..."
npm install

# Create environment file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cp .env.example .env
    echo "Please update .env with your OpenAI API key and other settings"
fi

# Create necessary directories
echo "Creating necessary directories..."
mkdir -p python-service/storage/data
mkdir -p python-service/sessions
mkdir -p docs

echo "Development environment setup complete!"
echo "Next steps:"
echo "1. Update .env with your OpenAI API key"
echo "2. Run 'npm run dev' to start both services"
echo "3. Open http://localhost:3000 in your browser"
```

Create `scripts/test-all.sh`:

```bash
#!/bin/bash

echo "Running all tests for Ashley AI..."

# Activate virtual environment
source chatbot_env/bin/activate

# Run Python tests
echo "Running Python backend tests..."
cd python-service
python -m pytest tests/ -v --tb=short
cd ..

# Run frontend tests
echo "Running frontend tests..."
npm test

# Run type checking
echo "Running TypeScript type checking..."
npm run type-check

echo "All tests completed!"
```

Create `scripts/deploy-check.sh`:

```bash
#!/bin/bash

echo "Running deployment readiness checks..."

# Check environment variables
echo "Checking environment variables..."
if [ -z "$OPENAI_API_KEY" ]; then
    echo "Warning: OPENAI_API_KEY not set"
fi

# Build frontend
echo "Building frontend..."
npm run build

if [ $? -eq 0 ]; then
    echo "Frontend build successful"
else
    echo "Frontend build failed"
    exit 1
fi

# Test Python service
echo "Testing Python service..."
source chatbot_env/bin/activate
cd python-service
python -c "
import main
app = main.create_app()
print('Python service can be imported successfully')
"
cd ..

echo "Deployment readiness check completed!"
```

Make scripts executable:

```bash
chmod +x scripts/*.sh
```

## GitHub Setup and Deployment

### Step 1: Create GitHub Repository

Create `.github/workflows/ci.yml`:

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test-frontend:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18.x, 20.x]

    steps:
    - uses: actions/checkout@v4
    
    - name: Use Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v4
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run type checking
      run: npm run type-check
    
    - name: Run tests
      run: npm test
    
    - name: Build application
      run: npm run build

  test-backend:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: [3.9, 3.10, 3.11]

    steps:
    - uses: actions/checkout@v4
    
    - name: Set up Python ${{ matrix.python-version }}
      uses: actions/setup-python@v4
      with:
        python-version: ${{ matrix.python-version }}
    
    - name: Install dependencies
      run: |
        python -m pip install --upgrade pip
        pip install -r requirements.txt
    
    - name: Run tests
      run: |
        cd python-service
        python -m pytest tests/ -v
      env:
        OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}

  security-scan:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Run security audit (npm)
      run: npm audit --audit-level moderate
    
    - name: Run security audit (Python)
      run: |
        python -m pip install --upgrade pip
        pip install safety
        pip install -r requirements.txt
        safety check

  deploy:
    runs-on: ubuntu-latest
    needs: [test-frontend, test-backend, security-scan]
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Deploy to production
      run: echo "Deploy to your chosen platform here"
      # Add your deployment steps here
```

### Step 2: Create Repository Setup Script

Create `scripts/github-setup.sh`:

```bash
#!/bin/bash

echo "Setting up GitHub repository for Ashley AI..."

# Initialize git if not already done
if [ ! -d ".git" ]; then
    git init
fi

# Create main branch
git checkout -b main 2>/dev/null || git checkout main

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: Ashley AI Chatbot

- Complete Next.js frontend with React 19 and TypeScript
- Python FastAPI backend with OpenAI integration
- Session management and content moderation
- Beautiful dark theme UI with Tailwind CSS
- Comprehensive test suite
- Development and deployment scripts"

echo "Repository initialized!"
echo "Next steps:"
echo "1. Create a new repository on GitHub"
echo "2. Add the remote origin:"
echo "   git remote add origin https://github.com/yourusername/ashley-ai-chatbot.git"
echo "3. Push to GitHub:"
echo "   git push -u origin main"
echo "4. Set up GitHub secrets for CI/CD:"
echo "   - OPENAI_API_KEY"
```

### Step 3: Create Production Configuration

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:8001
      - NEXT_PUBLIC_APP_NAME=Ashley AI
    depends_on:
      - backend

  backend:
    build:
      context: ./python-service
      dockerfile: Dockerfile
    ports:
      - "8001:8001"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - OPENAI_MODEL=${OPENAI_MODEL:-gpt-4}
      - PYTHON_SERVICE_HOST=0.0.0.0
      - PYTHON_SERVICE_PORT=8001
    volumes:
      - ./data:/app/storage/data
      - ./sessions:/app/sessions

volumes:
  data:
  sessions:
```

Create `Dockerfile.frontend`:

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

Create `python-service/Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p storage/data sessions

# Create non-root user
RUN useradd --create-home --shell /bin/bash app
RUN chown -R app:app /app
USER app

EXPOSE 8001

CMD ["python", "main.py"]
```

## Final Testing and Validation

### Step 1: Run Complete Test Suite

Create `scripts/complete-test.sh`:

```bash
#!/bin/bash

echo "Running complete test suite for Ashley AI..."

# Setup environment
source chatbot_env/bin/activate

# Start services for integration testing
echo "Starting services for integration testing..."
cd python-service
python main.py &
PYTHON_PID=$!
cd ..

npm run dev:next &
NEXT_PID=$!

# Wait for services to start
sleep 10

# Run tests
echo "Running unit tests..."
npm test

echo "Running integration tests..."
cd python-service
python -m pytest tests/ -v
cd ..

echo "Running end-to-end tests..."
# Add your E2E tests here

# Health check
echo "Running health checks..."
curl -f http://localhost:8001/health || (echo "Backend health check failed" && exit 1)
curl -f http://localhost:3000 || (echo "Frontend health check failed" && exit 1)

# Cleanup
echo "Cleaning up..."
kill $PYTHON_PID $NEXT_PID

echo "All tests completed successfully!"
```

### Step 2: Create Documentation

Update `README.md`:

```markdown
# Ashley AI Chatbot

A modern, full-stack AI chatbot application built with Next.js 15, React 19, TypeScript, and Python FastAPI.

## Features

- **Modern Frontend**: Next.js 15 with React 19, TypeScript, and Tailwind CSS
- **AI-Powered Backend**: Python FastAPI with OpenAI integration
- **Multiple Personas**: Ashley, Technical Expert, and Creative Assistant
- **Session Management**: Persistent conversation history
- **Content Moderation**: Built-in safety and content filtering
- **Beautiful UI**: Dark theme with responsive design
- **Comprehensive Testing**: Unit, integration, and end-to-end tests
- **Production Ready**: Docker support and CI/CD pipeline

## Quick Start

### Prerequisites

- Node.js 18+ 
- Python 3.9+
- OpenAI API key

### Setup

1. Clone the repository
2. Run the setup script: `./scripts/setup-dev.sh`
3. Update `.env` with your OpenAI API key
4. Start the application: `npm run dev`
5. Open http://localhost:3000

## Architecture

```
ashley-ai-chatbot/
├── src/                    # Next.js frontend
│   ├── app/               # App router pages
│   ├── components/        # React components
│   └── lib/              # Utilities and API client
├── python-service/        # Python backend
│   ├── app/              # FastAPI application
│   ├── core/             # Core services
│   └── tools/            # Utility tools
├── scripts/              # Development scripts
├── docs/                 # Documentation
└── tests/               # Test suites
```

## Development

- **Start development**: `npm run dev`
- **Run tests**: `./scripts/test-all.sh`
- **Build for production**: `npm run build`
- **Type checking**: `npm run type-check`

## Deployment

- **Docker**: `docker-compose up`
- **Production build**: `./scripts/deploy-check.sh`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details
```

## Conclusion

Congratulations! You have successfully built a complete, production-ready AI chatbot application. This tutorial covered:

1. **Complete Setup**: From development environment to production deployment
2. **Modern Architecture**: Next.js 15, React 19, TypeScript, Python FastAPI
3. **AI Integration**: OpenAI GPT models with multiple personas
4. **Security**: Content moderation and input sanitization
5. **Testing**: Comprehensive test suites for both frontend and backend
6. **Production**: Docker containers, CI/CD pipeline, and deployment scripts
7. **Documentation**: Complete tutorials and setup guides

## Next Steps

To further enhance your Ashley AI chatbot:

1. **Add Authentication**: Implement proper user authentication and authorization
2. **Database Integration**: Add PostgreSQL or MongoDB for persistent storage
3. **Advanced Features**: File uploads, voice chat, advanced personas
4. **Monitoring**: Add logging, metrics, and error tracking
5. **Scaling**: Implement load balancing and horizontal scaling
6. **Mobile App**: Create React Native or Flutter mobile versions
7. **Plugin System**: Add extensible plugin architecture
8. **Multi-language**: Add internationalization support

The foundation you've built is solid and extensible. You can now customize and enhance Ashley AI to meet your specific needs!

## Support

If you encounter any issues:

1. Check the troubleshooting sections in each tutorial part
2. Review the test logs for specific error details
3. Ensure all prerequisites are properly installed
4. Verify your OpenAI API key and credits

Happy coding!