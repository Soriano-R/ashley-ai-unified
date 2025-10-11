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

✅ **Single codebase and deployment**  
✅ **No CORS complexity**  
✅ **Easier development workflow**  
✅ **Keep existing Python AI logic unchanged**  
✅ **Better performance (no external API calls)**  
✅ **Simplified authentication**  
✅ **Single domain for SEO and security**

## Migration Status

- 🚧 **In Progress**: Setting up unified structure
- 📋 **Next**: Copy React components from ashley-ai-frontend
- 📋 **Next**: Copy Python logic from ashley-ai-backend  
- 📋 **Next**: Create Next.js API routes as proxy layer
- 📋 **Next**: Test integration and deployment