# Local Model Priority Setup - Complete Guide

## Summary of Changes

This document summarizes all the changes made to prioritize local models over API models, with comprehensive persona-model mapping and fine-tuning guidance.

## Configuration Changes

### 1. Environment Variables (.env)

```bash
# Primary local model (CHANGED from openai to local)
DEFAULT_MODEL=nous-hermes-2-mistral-7b-gptq

# Fallback API model (CHANGED from primary to fallback)
FALLBACK_MODEL=openai
FALLBACK_API_MODEL=gpt-4o-mini

# Model preloading (NEW - for faster response times)
PRELOAD_MODELS=nous-hermes-2-mistral-7b-gptq
```

### 2. Persona-Model Mapping (NEW)

Created `python-service/persona_model_mapping.json` with intelligent model selection:

```json
{
  "ashley-girlfriend": {
    "primary": "nous-hermes-2-mistral-7b-gptq",
    "alternatives": ["openhermes-2.5-mistral-7b-gptq", "mistral-7b"],
    "fallback": "openai"
  },
  "ashley-girlfriend-explicit": {
    "primary": "undiopenhermes-7b",
    "alternatives": ["undiplatypus2-13b-gptq"],
    "fallback": "openai"
  },
  "ashley-data-analyst": {
    "primary": "qwen-2.5-7b",
    "alternatives": ["mistral-7b"],
    "fallback": "openai"
  },
  "ashley-data-scientist": {
    "primary": "deepseek-coder-v2",
    "alternatives": ["code-llama-13b"],
    "fallback": "openai"
  }
}
```

### 3. Model Selection Logic (UPDATED)

Updated `core/enhanced_chat_engine.py` with **LOCAL-FIRST** priority:

**Priority Order:**
1. ✅ **Local PyTorch/GPTQ models** (Primary)
2. ✅ **Alternative local models** (If primary unavailable)
3. ⚠️  **OpenAI API** (Only as last resort)

**Key Features:**
- Automatic persona-to-model mapping
- Graceful fallback chain
- Model availability checking
- Detailed logging for debugging

### 4. Removed Large Models

**Removed DeepSeek-R1 (70B+)** from `pytorch_models.json`:
- Reason: 100+ GB size, hours to download
- Cached files cleaned (7.6MB removed)
- System now focuses on efficient 7B-13B models

## Model Strategy

### Recommended Model Sizes

| Use Case | Model Size | VRAM | Example |
|----------|-----------|------|---------|
| **Girlfriend Persona** | 7B | 8GB | nous-hermes-2-mistral-7b-gptq |
| **NSFW/Explicit** | 7B-13B | 8-16GB | undiopenhermes-7b |
| **Data Analysis** | 7B | 8GB | qwen-2.5-7b |
| **Coding/ML** | 7B-13B | 12-20GB | deepseek-coder-v2 |

### GGUF vs PyTorch

**GGUF (Quantized):**
- ✅ Smaller size
- ✅ Faster on CPU
- ✅ Lower memory usage
- ❌ Cannot be fine-tuned directly

**PyTorch (Full):**
- ✅ Can be fine-tuned
- ✅ Highest quality
- ✅ Support for LoRA adapters
- ❌ Larger file size
- ❌ Requires more VRAM

**Recommendation:** Use PyTorch for models you plan to fine-tune, GGUF for deployment.

## Fine-Tuning Guide

See [FINETUNING_GUIDE.md](FINETUNING_GUIDE.md) for complete instructions on:

1. **LoRA Fine-Tuning** (Recommended)
   - 8GB VRAM required
   - 2-6 hours training time
   - 10-100MB adapter files
   - Perfect for persona customization

2. **QLoRA** (Limited Hardware)
   - 6GB VRAM required
   - 3-8 hours training time
   - Same quality as LoRA

3. **Full Fine-Tuning** (Advanced)
   - 40GB+ VRAM required
   - Days of training
   - For major model modifications

### Quick Start Example

```python
# Create training data
training_data = [
    {
        "instruction": "You are Ashley, a warm girlfriend AI.",
        "input": "Hi Ashley!",
        "output": "Hey babe! I've been thinking about you!"
    }
    # ... more examples
]

# Fine-tune with LoRA
python finetune_lora.py

# Use in Ashley AI
# Update persona_model_mapping.json:
{
  "ashley-girlfriend": {
    "primary": "ashley-girlfriend-finetuned"
  }
}
```

## Testing the Setup

### 1. Restart Backend

```bash
# Stop current backend
lsof -ti :8001 | xargs kill -9

# Start with new configuration
./start-backend.sh
```

### 2. Test Local Model Loading

```bash
curl -s http://127.0.0.1:8001/api/chat \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "messages":[{"role":"user","content":"Hi Ashley"}],
    "persona":"ashley-girlfriend"
  }' | jq
```

**Expected Response:**
```json
{
  "response": "Hey there! How are you doing?",
  "model_used": "nous-hermes-2-mistral-7b-gptq",  // LOCAL model
  "persona_used": "ashley-girlfriend",
  "internet_used": false,
  "generation_time": 2.5
}
```

### 3. Monitor Logs

Watch for these log messages:
```
✓ Selected LOCAL model 'nous-hermes-2-mistral-7b-gptq' for persona 'ashley-girlfriend'
✓ Successfully preloaded model: nous-hermes-2-mistral-7b-gptq
```

**Warning signs:**
```
⚠ No local models available, using API fallback: openai
```

## Troubleshooting

### Issue: Backend uses OpenAI instead of local model

**Solutions:**
1. Check `.env` has `DEFAULT_MODEL=nous-hermes-2-mistral-7b-gptq`
2. Verify model exists in `pytorch_models.json`
3. Check persona mapping in `persona_model_mapping.json`
4. Restart backend to load new config

### Issue: Model fails to load

**Solutions:**
1. Check available disk space (need 5-20GB per model)
2. Verify VRAM/RAM (need 8GB+ for 7B models)
3. Check Hugging Face token is valid
4. Try GGUF variant instead of PyTorch

### Issue: Slow first response

**Expected behavior:**
- First request: 30-60 seconds (model download)
- Subsequent requests: 2-5 seconds

**Solutions:**
1. Use `PRELOAD_MODELS` to load at startup
2. Models are cached after first use
3. Consider using smaller GGUF models

## Performance Optimization

### 1. Preload Frequently Used Models

```bash
# In .env
PRELOAD_MODELS=nous-hermes-2-mistral-7b-gptq,openhermes-2.5-mistral-7b-gptq
```

### 2. Use GGUF for CPU-Only Systems

```json
{
  "ashley-girlfriend": {
    "primary": "nous-hermes-2-mistral-7b-gptq-gguf"
  }
}
```

### 3. Monitor Memory Usage

```bash
# Check memory usage
htop  # or top on macOS

# Check model cache size
du -sh python-service/.cache/models/
```

## Architecture

### Model Selection Flow

```
User Request
    ↓
Persona Identified (e.g., "ashley-girlfriend")
    ↓
Check persona_model_mapping.json
    ↓
PRIMARY: nous-hermes-2-mistral-7b-gptq
    ↓ (if unavailable)
ALTERNATIVES: [openhermes-2.5-mistral-7b-gptq, mistral-7b]
    ↓ (if all unavailable)
FALLBACK: openai (API)
```

### File Structure

```
ashley-ai-unified/
├── .env (Configuration)
├── python-service/
│   ├── persona_model_mapping.json (NEW - Persona→Model mapping)
│   ├── pytorch_models.json (Model registry)
│   └── core/
│       └── enhanced_chat_engine.py (UPDATED - Local-first logic)
├── FINETUNING_GUIDE.md (NEW - Complete fine-tuning guide)
├── MODEL_PRELOADING.md (Model preloading documentation)
└── LOCAL_MODEL_SETUP.md (This file)
```

## Next Steps

1. **Restart Backend** with new configuration
2. **Test Local Models** with chat requests
3. **Monitor Performance** and adjust as needed
4. **Fine-Tune Models** for better persona matching (optional)
5. **Scale Up** by adding more models to preload list

## Benefits of This Setup

✅ **Privacy**: All chat data processed locally (no API calls unless fallback)
✅ **Cost**: No API costs for successful local model requests
✅ **Speed**: 2-5 seconds response time (after first load)
✅ **Customization**: Can fine-tune models for specific personas
✅ **Reliability**: Works offline once models are cached
✅ **Flexibility**: Easy to switch models per persona

## Resources

- [FINETUNING_GUIDE.md](FINETUNING_GUIDE.md) - Complete fine-tuning tutorial
- [MODEL_PRELOADING.md](MODEL_PRELOADING.md) - Model preloading documentation
- [Hugging Face Models](https://huggingface.co/models) - Browse available models
- [TheBloke's Quantized Models](https://huggingface.co/TheBloke) - High-quality GPTQ models

## Support

For issues or questions:
1. Check logs: `python-service/logs/`
2. Review this documentation
3. Open an issue on GitHub
4. Check Hugging Face forums for model-specific issues
