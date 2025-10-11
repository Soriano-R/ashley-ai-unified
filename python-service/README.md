# Ashley AI Enhanced Python Microservice

This is the enhanced Python microservice for Ashley AI, featuring **PyTorch model support** and **comprehensive internet access**.

## 🚀 Quick Start

```bash
# Navigate to the python-service directory
cd /Users/soriano/Projects/ashley-ai-unified/python-service

# Run the startup script (handles everything automatically)
./start.sh
```

The service will be available at:
- **API**: http://127.0.0.1:8001
- **Documentation**: http://127.0.0.1:8001/docs
- **Health Check**: http://127.0.0.1:8001/health

## 📋 Manual Setup

If you prefer manual setup:

1. **Copy Backend Files** (if not already done):
   ```bash
   cp -r ../ashley-ai-backend/{app,core,tools,storage,personas,knowledge} .
   ```

2. **Activate Virtual Environment**:
   ```bash
   source ../ashley-ai-backend/chatbot_env/bin/activate
   ```

3. **Install Enhanced Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Test Enhanced Features**:
   ```bash
   python test_enhanced.py
   ```

5. **Start the Service**:
   ```bash
   python main.py
   ```

## 🔧 Features

### PyTorch Models
- Direct PyTorch model loading (.bin, .safetensors)
- Automatic quantization (4-bit, 8-bit)
- LoRA fine-tuning preparation
- Memory optimization

### Internet Access
- Multi-source search (Google, Bing, DuckDuckGo, Wikipedia)
- Automatic fallbacks
- Usage tracking and quota management
- Content summarization

### Enhanced Chat
- Unified PyTorch + Internet + Persona system
- Smart context detection
- Streaming responses
- Session management

## 📚 API Endpoints

### Enhanced Chat
```
POST /api/chat/enhanced
```

### Model Management
```
GET /api/models/pytorch/available
POST /api/models/pytorch/load
GET /api/models/pytorch/status
```

### Internet Search
```
POST /api/internet/search
GET /api/internet/usage
```

### System
```
GET /health
GET /api/system/status
```

## 🧪 Testing

Run the test suite to verify all enhanced features:

```bash
python test_enhanced.py
```

This will test:
- PyTorch model manager
- Internet access system  
- Enhanced chat engine
- API route imports

## 🔑 Configuration

### API Keys (Optional)
Set these environment variables for enhanced internet search:

```bash
export GOOGLE_API_KEY="your_google_api_key"
export GOOGLE_CSE_ID="your_custom_search_engine_id"
export BING_API_KEY="your_bing_api_key"
```

**Note**: The system works without API keys using free fallback sources (DuckDuckGo, Wikipedia).

### Redis (Optional)
For enhanced caching and usage tracking:

```bash
export REDIS_URL="redis://localhost:6379"
```

## 🏗️ Architecture

```
FastAPI Microservice (Port 8001)
├── Legacy Endpoints (backward compatibility)
├── Enhanced Routes (/api/*)
│   ├── PyTorch Model Manager
│   ├── Internet Access System
│   ├── Enhanced Chat Engine
│   └── System Status
└── Graceful Degradation (works with/without enhanced features)
```

## 🔄 Integration with Next.js Frontend

The microservice is designed to integrate with the Next.js frontend:

1. **Internal Port**: Runs on 127.0.0.1:8001 (not exposed externally)
2. **API Proxy**: Next.js API routes proxy requests to this service
3. **CORS**: Configured for localhost:3000 frontend
4. **Session Management**: Maintains compatibility with existing session system

See `IMPLEMENTATION.md` for detailed implementation notes.