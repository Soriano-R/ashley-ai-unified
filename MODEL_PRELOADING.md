# Model Preloading Configuration

## Overview

The Ashley AI system now supports preloading PyTorch models at startup. This feature allows you to download and load models before the first chat request, eliminating long wait times during user interactions.

## Configuration

### Environment Variable

Add the following to your `.env` file:

```bash
# Model preloading configuration
# Comma-separated list of model IDs to preload at startup
PRELOAD_MODELS=model1,model2,model3
```

### Examples

#### No Preloading (Default - Fastest Startup)
```bash
PRELOAD_MODELS=
```

#### Preload Small Models (Recommended)
```bash
PRELOAD_MODELS=openhermes-2.5-mistral-7b-gptq,nous-hermes-2-mistral-7b-gptq
```

#### Preload Multiple Models
```bash
PRELOAD_MODELS=openhermes-2.5-mistral-7b-gptq,platypus2-13b-gptq,deepseek-math-7b
```

## Available Models

Based on your `pytorch_models.json`, here are some recommended models by size:

### Small Models (7B - Fast to load, good performance)
- `openhermes-2.5-mistral-7b-gptq` - General purpose chat
- `nous-hermes-2-mistral-7b-gptq` - Creative writing
- `deepseek-math-7b` - Math and logic
- `deepseek-math-7b-gguf` - Math (CPU optimized)

### Medium Models (13B - Slower, better quality)
- `platypus2-13b-gptq` - General purpose
- `chronos-hermes-13b-gptq` - Time-aware responses
- `undiplatypus2-13b-gptq` - NSFW variant

### Large Models (70B+ - VERY SLOW, requires significant resources)
- `deepseek-r1` - Advanced reasoning (174 files, 100+ GB)
- `deepseek-coder-v2` - Advanced coding

## Important Warnings

### DeepSeek-R1 Warning
**DO NOT preload `deepseek-r1` unless you:**
- Have 100+ GB of free disk space
- Have fast internet (hours to download 174 files)
- Have 32+ GB RAM/VRAM
- Are willing to wait hours for startup

### Recommended Approach

1. **Start with no preloading** (empty PRELOAD_MODELS)
2. **Use OpenAI API for Ashley girlfriend** (DEFAULT_MODEL=openai)
3. **Only preload models you use frequently** and are smaller (7B-13B)
4. **Monitor disk space and memory** when preloading

## How It Works

1. On backend startup (`python main.py`), the system reads `PRELOAD_MODELS`
2. Each model in the list is downloaded (if not cached) and loaded into memory
3. Models are ready immediately when a chat request arrives
4. If a model is not preloaded, it loads on-demand (first request will be slow)

## Current Default Behavior

- Ashley girlfriend persona uses `DEFAULT_MODEL=openai` (no PyTorch model needed)
- No models are preloaded (fastest startup)
- PyTorch models load on-demand when requested

## Troubleshooting

### Backend Takes Too Long to Start
- Remove large models from PRELOAD_MODELS
- Leave PRELOAD_MODELS empty
- Use OpenAI API instead of local models

### Chat Requests Timeout
- Increase timeout in `src/app/api/chat/route.ts` (currently 30 seconds)
- Use smaller models or OpenAI API
- Preload the model to avoid first-request delay

### Out of Memory
- Reduce number of preloaded models
- Use GGUF variants (CPU optimized, less memory)
- Use smaller models (7B instead of 13B/70B)

## Example Configuration for Fast Startup + Good Performance

```bash
# .env
DEFAULT_MODEL=openai
FALLBACK_MODEL=gpt-4o-mini
PRELOAD_MODELS=
```

This configuration:
- Uses OpenAI API for Ashley (fast, high quality)
- No preloading (instant startup)
- PyTorch models available on-demand if needed
