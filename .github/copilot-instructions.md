# Ashley AI Unified - Copilot Instructions

## Project Overview
**Ashley AI Unified** is a full-stack Next.js application with an integrated Python AI microservice. This project combines the React frontend with Python AI capabilities in a single deployable application, using the existing `chatbot_env` virtual environment.

**Status: IN DEVELOPMENT** - Unified architecture replacing separate frontend/backend repositories.

**Architecture: Hybrid Next.js + Python Microservice**
- ✅ Single codebase and deployment
- ✅ No CORS complexity  
- ✅ Uses existing `chatbot_env` virtual environment
- ✅ Reuses proven AI logic from ashley-ai-backend

## Project Structure

### Unified Architecture
```
ashley-ai-unified/
├── src/app/                    # Next.js App Router
│   ├── api/                   # Next.js API routes (proxy to Python)
│   │   ├── auth/route.ts     # Authentication endpoints
│   │   ├── chat/route.ts     # Chat streaming proxy
│   │   └── ...               # Other API endpoints
│   ├── (auth)/               # Authentication pages
│   ├── (dashboard)/          # Main chat interface
│   └── layout.tsx            # Root layout
├── src/components/           # React components (migrated from ashley-ai-frontend)
├── src/lib/                  # Utilities, types, Python service client
├── src/types/               # TypeScript type definitions
├── python-service/          # Python AI microservice (internal port 8001)
│   ├── main.py             # FastAPI service entry point
│   ├── app/                # Core AI logic (from ashley-ai-backend)
│   ├── tools/              # AI tools (OpenAI, search, etc.)
│   ├── storage/            # Data persistence
│   └── personas/           # AI personality prompts
├── package.json            # Next.js dependencies
├── requirements.txt        # Python dependencies
└── ../chatbot_env/         # Existing virtual environment (IMPORTANT!)
```

## Development Environment

### Virtual Environment Usage
**CRITICAL**: This project uses the existing `chatbot_env` virtual environment located at `/Users/soriano/Projects/chatbot_env/`

**Setup Commands:**
```bash
cd /Users/soriano/Projects/ashley-ai-unified

# Quick setup (recommended)
./setup-dev.sh

# Manual setup
npm install
source ../chatbot_env/bin/activate
pip install -r requirements.txt
npm run dev
```

**Scripts:**
- `npm run dev` - Starts both Next.js and Python service
- `npm run dev:next` - Next.js frontend only (port 3000)
- `npm run dev:python` - Python microservice only (port 8001)
- `./test-setup.sh` - Verify environment setup

### How It Works
1. **Next.js Frontend** (port 3000) - User interface and authentication
2. **Next.js API Routes** (`/src/app/api/*`) - Proxy layer handling auth, sessions
3. **Python Microservice** (port 8001) - AI logic, OpenAI integration, tools
4. **Internal Communication** - Next.js API → Python service (no CORS issues)

## Migration Status

### ✅ Completed
- Project structure created
- Next.js + Python service integration
- Virtual environment integration (`chatbot_env`)
- Development scripts and setup automation
- Docker Compose configuration
- Migration and test scripts

### 🚧 In Progress  
- Copy React components from `ashley-ai-frontend`
- Copy Python AI logic from `ashley-ai-backend`
- Implement Next.js API route proxies
- Update component imports and types
- Test end-to-end integration

### 📋 Next Steps
1. Run migration script: `./migrate.sh`
2. Copy frontend components and backend logic
3. Update imports and fix integration issues
4. Test streaming chat functionality
5. Deploy as unified application

## Key Benefits of Unified Architecture

### ✅ Advantages
- **Single Deployment**: One application, one domain
- **No CORS Issues**: Internal API communication
- **Simplified Development**: Single `npm run dev` command
- **Better Performance**: No external API calls
- **Easier Authentication**: Session management in Next.js
- **Uses Existing Environment**: Leverages proven `chatbot_env` setup

### 🔄 Migration Benefits
- **Reuses Proven Code**: All AI logic from ashley-ai-backend works unchanged
- **Keeps UI Components**: React components from ashley-ai-frontend
- **Environment Continuity**: Same `chatbot_env` with all dependencies
- **Testing Continuity**: Existing pytest tests still work

## Development Guidelines

### When Working on Frontend (Next.js)
- **Components**: Add to `src/components/`
- **API Routes**: Create in `src/app/api/` as proxy to Python service
- **Types**: Define in `src/types/` and import with `@/types`
- **Utilities**: Add to `src/lib/`

### When Working on Backend (Python)
- **AI Logic**: Modify in `python-service/app/`
- **Tools**: Add/update in `python-service/tools/`
- **Storage**: Modify in `python-service/storage/`
- **FastAPI**: Update endpoints in `python-service/main.py`

### Integration Patterns
- **API Proxy**: Next.js API routes proxy to Python service
- **Authentication**: Handle in Next.js, validate in Python
- **Streaming**: Use Server-Sent Events through Next.js API
- **File Uploads**: Handle in Next.js API, process in Python

## Important Notes

### Virtual Environment
- **Always use**: `source ../chatbot_env/bin/activate`
- **Never create new**: Reuse existing environment with all dependencies
- **Path is relative**: `../chatbot_env/` from ashley-ai-unified directory

### Port Configuration
- **3000**: Next.js frontend (public)
- **8001**: Python microservice (internal only)
- **No external**: Python service not accessible from outside

### Migration Strategy
1. **Incremental**: Copy and test components one by one
2. **Preserve Logic**: Don't rewrite AI functionality, just integrate
3. **Test Continuously**: Use `./test-setup.sh` to verify setup
4. **Keep Working**: Maintain existing ashley-ai-backend until migration complete

This unified architecture provides the best of both worlds: modern React frontend with powerful Python AI backend, all in a single, easily deployable application.