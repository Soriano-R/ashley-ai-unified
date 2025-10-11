# Ashley AI - Unified Full-Stack Application

A unified Next.js application with Python AI microservice backend. Combines the React frontend with Python AI capabilities in a single deployable project.

## Architecture

### Hybrid Architecture: Next.js + Python Microservice
```
ashley-ai-unified/
├── src/app/                    # Next.js App Router
│   ├── api/                   # Next.js API routes (proxy to Python)
│   ├── (auth)/               # Authentication pages
│   └── (dashboard)/          # Main chat interface
├── src/components/           # React components (from ashley-ai-frontend)
├── src/lib/                  # Utilities, types, Python service client
├── python-service/           # Python AI microservice (from ashley-ai-backend)
│   ├── main.py              # FastAPI service (internal port 8001)
│   ├── app/                 # Core AI logic
│   ├── tools/               # AI tools (OpenAI, search, etc.)
│   └── storage/             # Data persistence
├── package.json             # Next.js dependencies
├── requirements.txt         # Python dependencies
└── docker-compose.yml       # Development environment
```

### How It Works
1. **Single Domain**: Everything runs under one Next.js application
2. **Next.js API Routes**: Handle auth, sessions, and proxy AI requests  
3. **Python Microservice**: Runs internally on port 8001, handles AI logic
4. **No CORS Issues**: Frontend → Next.js API → Python service (all internal)
5. **Single Deployment**: Deploy as one application with Python subprocess

## Quick Start

### Prerequisites
- Existing `chatbot_env` virtual environment in `/Users/soriano/Projects/chatbot_env/`
- Node.js 18+ installed
- Python 3.11+ installed

### Development Setup
```bash
# Clone or create the unified project
cd /Users/soriano/Projects/ashley-ai-unified

# Run the setup script (uses existing chatbot_env)
./setup-dev.sh

# Start development (runs both Next.js and Python service)
npm run dev
```

### Manual Setup (Alternative)
```bash
# Install Next.js dependencies
npm install

# Activate existing virtual environment
source ../chatbot_env/bin/activate

# Install any missing Python dependencies
pip install -r requirements.txt

# Start development
npm run dev
```

### Production
```bash
# Build and start
npm run build
npm start
```

## Benefits of This Architecture

**Single codebase and deployment**  
**No CORS complexity**  
**Easier development workflow**  
**Keep existing Python AI logic unchanged**  
**Better performance (no external API calls)**  
**Simplified authentication**  
**Single domain for SEO and security**

## Project Status

**COMPLETED**: Unified structure with working integration
- React components fully migrated from ashley-ai-frontend
- Python AI logic integrated from ashley-ai-backend  
- Next.js API routes working as proxy layer
- Full chat functionality tested and verified
- Both development servers running successfully
- Authentication and session management working
- Beautiful original UI restored and functional

## Technology Stack

### Frontend (Next.js)
- **Framework**: Next.js 15.5.4 with Turbopack
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Icons**: Heroicons React
- **Features**: App Router, Server Components, Real-time Chat

### Backend (Python Microservice)
- **Framework**: FastAPI with uvicorn
- **AI**: OpenAI GPT models with streaming
- **Tools**: Web search, code execution, file Q&A
- **Storage**: Session management, memory, moderation logs
- **Features**: Multi-persona system, admin controls

## Development Commands

```bash
# Start both services (Next.js + Python)
npm run dev

# Start only Next.js frontend
npm run dev:next

# Start only Python backend
npm run dev:python

# Build for production
npm run build

# Test the setup
./comprehensive-test.sh
```

## API Integration

The Next.js frontend communicates with the Python backend through:
- **Health Check**: `/api/python/health`
- **Chat Streaming**: `/api/python/chat/stream`
- **Personas**: `/api/python/personas`
- **Sessions**: `/api/python/sessions/*`
- **Files**: `/api/python/files/*`

## Deployment

This unified architecture supports:
- **Vercel**: Next.js with Python API routes
- **Docker**: Single container with both services
- **Traditional hosting**: Standard web server deployment
- **Cloud platforms**: AWS, GCP, Azure with minimal configuration