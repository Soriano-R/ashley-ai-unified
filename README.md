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


## Supported AI Models

Ashley AI Unified supports a wide range of models for both general and specialized tasks. Models are available in multiple formats:

- **PyTorch**: High-performance, GPU-accelerated inference
- **GGUF**: Lightweight, CPU-friendly, quantized for local/offline use
- **API**: Cloud-based inference (OpenAI GPT)

### Model List

| Key | Name | Max Length | Format | Category | Description |
|-----|------|------------|--------|----------|-------------|
| code-llama-13b | CodeLlama-13b-Instruct-hf | 16,384 | PyTorch | Coding | Code Llama 13B - Specialized for coding |
| code-llama-13b-gguf | CodeLlama-13b-Instruct-hf | 16,384 | GGUF | Coding | Code Llama 13B - Specialized for coding (GGUF) |
| code-llama-7b | CodeLlama-7b-Python-hf | 8,192 | PyTorch | Coding | CodeLlama 7B Python HF - Python code generation |
| code-llama-7b-gguf | CodeLlama-7b-Python-hf | 8,192 | GGUF | Coding | CodeLlama 7B Python HF - Python code generation (GGUF) |
| deepseek-coder-v2 | DeepSeek-Coder-V2-Instruct | 8,192 | PyTorch | Coding | DeepSeek Coder V2 Instruct - Coding, code completion |
| deepseek-coder-v2-gguf | DeepSeek-Coder-V2-Instruct | 8,192 | GGUF | Coding | DeepSeek Coder V2 Instruct - Coding, code completion (GGUF) |
| deepseek-r1 | DeepSeek-R1 | 8,192 | PyTorch | Coding | DeepSeek R1 - Coding, general AI |
| deepseek-r1-gguf | DeepSeek-R1 | 8,192 | GGUF | Coding | DeepSeek R1 - Coding, general AI (GGUF) |
| deepseek-math-7b | DeepSeek-Math-7B-Instruct | 8,192 | PyTorch | Math | DeepSeek Math 7B Instruct - Math, reasoning |
| deepseek-math-7b-gguf | DeepSeek-Math-7B-Instruct | 8,192 | GGUF | Math | DeepSeek Math 7B Instruct - Math, reasoning (GGUF) |
| qwen-2.5-7b | Qwen2.5-7B-Instruct | 32,768 | PyTorch | General | Qwen 2.5 7B - Long context support |
| qwen-2.5-7b-gguf | Qwen2.5-7B-Instruct | 32,768 | GGUF | General | Qwen 2.5 7B - Long context support (GGUF) |
| undiopenhermes-7b | UndiOpenHermes-2.5-Mistral-7B | 8,192 | PyTorch | NSFW | UndiOpenHermes 2.5 Mistral 7B - NSFW, uncensored |
| undiopenhermes-7b-gguf | UndiOpenHermes-2.5-Mistral-7B | 8,192 | GGUF | NSFW | UndiOpenHermes 2.5 Mistral 7B - NSFW, uncensored (GGUF) |
| openhermes-7b-gptq | OpenHermes-2.5-Mistral-7B-GPTQ | 8,192 | PyTorch | NSFW | OpenHermes 2.5 Mistral 7B GPTQ - NSFW, uncensored |
| openhermes-7b-gptq-gguf | OpenHermes-2.5-Mistral-7B-GPTQ | 8,192 | GGUF | NSFW | OpenHermes 2.5 Mistral 7B GPTQ - NSFW, uncensored (GGUF) |
| nous-hermes-7b-gptq | Nous-Hermes-2-Mistral-7B-GPTQ | 8,192 | PyTorch | NSFW | Nous Hermes 2 Mistral 7B GPTQ - NSFW, uncensored |
| nous-hermes-7b-gptq-gguf | Nous-Hermes-2-Mistral-7B-GPTQ | 8,192 | GGUF | NSFW | Nous Hermes 2 Mistral 7B GPTQ - NSFW, uncensored (GGUF) |
| chronos-hermes-13b-gptq | Chronos-Hermes-13B-GPTQ | 16,384 | PyTorch | NSFW | Chronos Hermes 13B GPTQ - NSFW, uncensored |
| chronos-hermes-13b-gptq-gguf | Chronos-Hermes-13B-GPTQ | 16,384 | GGUF | NSFW | Chronos Hermes 13B GPTQ - NSFW, uncensored (GGUF) |
| undiplatypus2-13b-gptq | UndiPlatypus2-13B-GPTQ | 16,384 | PyTorch | NSFW | UndiPlatypus2 13B GPTQ - NSFW, uncensored |
| undiplatypus2-13b-gptq-gguf | UndiPlatypus2-13B-GPTQ | 16,384 | GGUF | NSFW | UndiPlatypus2 13B GPTQ - NSFW, uncensored (GGUF) |
| openorca-platypus2-13b-gptq | OpenOrca-Platypus2-13B-GPTQ | 16,384 | PyTorch | NSFW | OpenOrca Platypus2 13B GPTQ - NSFW, uncensored |
| openorca-platypus2-13b-gptq-gguf | OpenOrca-Platypus2-13B-GPTQ | 16,384 | GGUF | NSFW | OpenOrca Platypus2 13B GPTQ - NSFW, uncensored (GGUF) |
| openai | openai/gpt-3.5-turbo | 4,096 | API | General | OpenAI GPT-3.5 Turbo (API-based, cloud inference) |

See `python-service/pytorch_models.json` and `model_list_functional.csv` for full details.

## Recent Code Changes

- **UserManager Modal**: Refactored for business-style UI, single source of truth, and password field support
- **Admin Features**: Add User modal, improved validation, preview, and branding
- **Model Management**: Unified PyTorch and GGUF model configs, CSV export for model list
- **Persona Mapping**: Improved persona file handling and mapping
- **Bug Fixes**: JSX structure cleanup, duplicate modal code removed

## CSV Export

All supported models are available in CSV format for easy reference and integration:

- `model_list_functional.csv`: Lists all models, formats, categories, and descriptions

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