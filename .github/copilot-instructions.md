
# Ashley AI Unified – Copilot Agent Instructions

## Big Picture Architecture
Ashley AI Unified is a full-stack Next.js app with an integrated Python FastAPI microservice. The project merges React frontend and Python AI backend in a single deployable codebase, using the existing `chatbot_env` virtual environment. All code, tests, and scripts are unified for seamless development and deployment.

### Major Components & Data Flow
- **Frontend:** Next.js 15+ (TypeScript, Tailwind CSS, App Router)
- **Backend:** Python FastAPI microservice (internal port 8001)
- **API Integration:** Next.js API routes (`src/app/api/*`) act as proxies to Python service
- **Session/Auth:** Managed in Next.js, validated in Python
- **Streaming:** Chat uses Server-Sent Events via API proxy
- **Personas:** AI personalities in `python-service/personas/`
- **Model Management:** PyTorch & GGUF models via Python endpoints (`/api/models/pytorch/*`)
- **Internet Search:** Python endpoints support multi-source search (API keys optional)

### Directory Structure & Key Files
- `src/components/` – React UI components (UserManager, ChatInterface, etc.)
- `src/app/api/` – Next.js API routes (proxy pattern)
- `src/types/`, `src/lib/` – Shared types/utilities
- `python-service/app/` – Core AI logic
- `python-service/tools/` – AI tools (OpenAI, search, etc.)
- `python-service/storage/` – Data persistence (users, sessions)
- `python-service/personas/` – Persona prompt files
- `python-service/main.py` – FastAPI entry point
- `model_list_functional.csv`, `python-service/pytorch_models.json` – Model registry/configs

## Developer Workflow
- **Setup:**
  - Always activate the existing virtualenv: `source ../chatbot_env/bin/activate`
  - Use `./setup-dev.sh` for unified install (Node + Python)
- **Start Dev Servers:**
  - `npm run dev` (runs both Next.js and Python service)
  - `npm run dev:next` (Next.js only)
  - `npm run dev:python` (Python only)
- **Build/Deploy:**
  - `npm run build` → `npm start` (production)
  - Docker: see `docker-compose.yml`
- **Testing:**
  - `./test-setup.sh` (integration)
  - `python python-service/test_enhanced.py` (backend)
  - `./comprehensive-test.sh` (full stack)

## Project-Specific Conventions
- **Frontend:**
  - Use business-style modals and admin panels (see `UserManager.tsx`)
  - API routes always proxy to Python endpoints for AI logic
  - Types in `src/types/`, utilities in `src/lib/`
- **Backend:**
  - All new AI tools go in `python-service/tools/` and are exposed via `main.py`
  - Model configs in `python-service/pytorch_models.json` and `model_list_functional.csv`
  - Persona files in `python-service/personas/` (one persona per file)
- **Integration:**
  - All communication is internal (no CORS)
  - API endpoints: `/api/python/*` (Next.js proxy) → Python microservice
  - Health check: `/api/python/health`
  - Chat: `/api/python/chat/stream`
  - Model management: `/api/python/models/pytorch/*`
  - Internet search: `/api/python/internet/*`

## Models & Local Model Patterns
- Supports both PyTorch and GGUF models (see `python-service/pytorch_models.json`)
- Model registry and CSV export in `model_list_functional.csv`
- Local models stored in `/opt/ashley-ai/models/` (see tutorial docs)
- Quantization and hardware requirements documented in `docs/TUTORIAL_08A_LOCAL_MODELS_OVERVIEW.md`

## Integration Points & External Dependencies
- **Virtualenv:** Always use `../chatbot_env/` (never create new)
- **API Keys:** For enhanced search, set `GOOGLE_API_KEY`, `BING_API_KEY` as env vars
- **Redis:** Optional for caching (`REDIS_URL`)
- **OpenAI:** API key required for GPT features

## Example: Adding a New AI Tool
1. Add Python logic to `python-service/tools/`
2. Expose endpoint in `python-service/main.py`
3. Proxy via Next.js API route in `src/app/api/`
4. Update frontend to call new API route

## Troubleshooting & Testing
- Use `./test-setup.sh` for environment checks
- Backend: run `python python-service/test_enhanced.py`
- For integration issues, check API proxy logic in `src/app/api/`
- See `docs/TUTORIAL_05_TESTING_TROUBLESHOOTING.md` for common issues

## References
- See `README.md` (root, python-service/, docs/) for architecture, setup, and workflow details
- See `docs/` for step-by-step tutorials and advanced features

---
**Feedback:** If any section is unclear or missing, please specify so it can be improved for future AI agents.
**Feedback:** If any section is unclear or missing, please specify so it can be improved for future AI agents.
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