# Image Generation and Voice Capabilities

This document outlines the image generation and text-to-speech (voice) capabilities available in the Ashley AI system, **excluding OpenAI's offerings**.

## Image Generation

### 1. OpenRouter - Gemini 2.5 Flash Image (FREE) ✅ **AVAILABLE NOW**

**Model ID**: `openrouter-gemini-image-free`
**Provider**: Google via OpenRouter
**Cost**: **Completely FREE**
**Format**: API-based (OpenRouter)

#### Capabilities:
- **Image Generation**: 1024x1024 resolution
- **Contextual Understanding**: Advanced AI that understands context from your conversation
- **Multimodal**: Combines text intelligence with visual quality
- **Use Cases**:
  - Logo design and iterations
  - Comic panels with consistent characters
  - Website mockups and page designs
  - Creative art generation
  - Product visualization

#### Setup:
1. Get your free OpenRouter API key: https://openrouter.ai/keys
2. Add to `.env` file:
   ```bash
   OPENROUTER_API_KEY=your-key-here
   ```
3. Select "Gemini 2.5 Flash Image (Free)" from the model dropdown
4. Request image generation in your chat

#### Example Usage:
```
User: "Generate an image of a sunset over mountains with a lake"
Ashley: [Uses Gemini 2.5 Flash Image to generate 1024x1024 image]
```

#### Technical Details:
- **Endpoint**: `https://openrouter.ai/api/v1/chat/completions`
- **Model Name**: `google/gemini-2.5-flash-image-preview:free`
- **Modalities**: `["image", "text"]`
- **No Rate Limits** on free tier (subject to OpenRouter's fair use policy)

---

### 2. Stable Diffusion (Local) ⚠️ **OPTIONAL - REQUIRES SETUP**

**Provider**: Local installation
**Cost**: **FREE** (runs on your hardware)
**Requirements**: NVIDIA GPU with 6GB+ VRAM recommended (or Apple Silicon)

#### Capabilities:
- **Complete Privacy**: All generation happens locally
- **No API Costs**: Unlimited generations
- **Customizable Models**: SD 3.5, SDXL, custom checkpoints
- **Fine-tuning**: Train custom models for specific styles

#### Setup Requirements:
```bash
# Install dependencies
pip install torch torchvision diffusers transformers accelerate

# For Apple Silicon (MPS)
pip install --upgrade torch torchvision --index-url https://download.pytorch.org/whl/cpu

# Lightweight option (SD 3.5 Medium)
# Requires ~6GB VRAM

# Full quality option (SD 3.5 Large)
# Requires ~24GB VRAM
```

#### System Requirements:
- **Minimum**: 6GB VRAM (NVIDIA GTX 1660 or Apple M1/M2)
- **Recommended**: 12GB+ VRAM (NVIDIA RTX 3060 or Apple M1 Pro/Max)
- **Python**: 3.8+ (3.10.6 recommended)
- **Storage**: 10-50GB for model files

#### Note:
- Not currently integrated into the system
- Can be added if desired
- Best for users with powerful local hardware

---

## Voice / Text-to-Speech (TTS)

### Voice Mode with Persona Consistency ✅ **CONFIGURED**

The system includes persona-specific voice mappings to ensure each Ashley persona has a **unique voice** that matches their personality.

### Persona Voice Profiles

Configuration file: [persona_voice_mapping.json](python-service/persona_voice_mapping.json)

#### Ashley - Girlfriend (`ashley-girlfriend`)
- **Voice**: Warm, friendly, affectionate female
- **Tone**: Warm and caring
- **Pitch**: Medium-high
- **Speaking Rate**: Normal
- **Description**: Sounds like a loving, supportive partner

#### Ashley - Girlfriend Explicit (`ashley-girlfriend-explicit`)
- **Voice**: Seductive, sultry, playful female
- **Tone**: Sultry and enticing
- **Pitch**: Medium-low
- **Speaking Rate**: Slow and deliberate
- **Description**: More sensual and intimate voice

#### Ashley - Data Analyst (`ashley-data-analyst`)
- **Voice**: Professional, clear, analytical female
- **Tone**: Professional and focused
- **Pitch**: Medium
- **Speaking Rate**: Normal
- **Description**: Confident business professional voice

#### Ashley - Data Scientist (`ashley-data-scientist`)
- **Voice**: Intelligent, articulate, confident female
- **Tone**: Confident and authoritative
- **Pitch**: Medium
- **Speaking Rate**: Slightly fast
- **Description**: Academic/technical expert voice

---

### TTS Engine: Coqui XTTS-v2 (Local, FREE) 🎯 **RECOMMENDED**

**Cost**: **Completely FREE**
**Privacy**: 100% local processing
**Quality**: High-quality voice cloning

#### Key Features:
- **Voice Cloning**: Create unique voices from just 10-second audio samples
- **17 Languages**: Multilingual support
- **Low Latency**: <200ms for streaming TTS
- **Persona Voices**: Each Ashley persona gets a distinct voice
- **No Internet Required**: Runs entirely on your machine

#### Installation:
```bash
# Install Coqui TTS
pip install TTS

# Or from source for latest features
git clone https://github.com/idiap/coqui-ai-TTS
cd coqui-ai-TTS
pip install -e .
```

#### Basic Usage:
```python
from TTS.api import TTS

# Initialize XTTS-v2
tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2")

# Generate speech with voice cloning
wav = tts.tts(
    text="Hello! I'm Ashley, your AI girlfriend.",
    speaker_wav="voices/ashley-girlfriend.wav",  # 10+ second sample
    language="en"
)

# Save audio file
tts.tts_to_file(
    text="Hello world!",
    speaker_wav="voices/ashley-girlfriend.wav",
    file_path="output.wav",
    language="en"
)
```

#### Custom Voice Cloning:

To create persona-specific voices:

1. **Record voice samples** (10+ seconds each):
   - Clear audio with minimal background noise
   - Consistent tone matching persona
   - Examples: `voices/ashley-girlfriend.wav`, `voices/ashley-data-analyst.wav`

2. **Configure in persona_voice_mapping.json**:
   ```json
   {
     "ashley-girlfriend": {
       "sample_audio_path": "voices/ashley-girlfriend.wav"
     }
   }
   ```

3. **Use in code**:
   ```python
   # Voice automatically matches persona
   tts.generate_for_persona("ashley-girlfriend", "Hello there!")
   ```

#### Performance:
- **CPU Only**: ~2-5 seconds per sentence
- **GPU (NVIDIA)**: <1 second per sentence
- **Apple Silicon (MPS)**: ~1-2 seconds per sentence
- **Streaming**: Real-time speech synthesis possible

---

## Integration Status

### ✅ Fully Integrated:
1. **OpenRouter Gemini 2.5 Flash Image** - Ready to use
2. **Persona Voice Mappings** - Configuration complete
3. **Model Detection** - System recognizes image generation models

### ⚠️ Partially Integrated:
1. **Voice Mode Handler** - Frontend hooks exist but not connected to backend
2. **TTS Backend** - Coqui TTS not yet installed/integrated

### ❌ Not Integrated:
1. **Stable Diffusion** - Local image generation (optional)
2. **Image Display in Chat** - UI doesn't show generated images yet
3. **TTS Audio Playback** - Voice responses not yet playing in browser

---

## Setup Instructions

### Minimal Setup (Free OpenRouter Image Generation):

```bash
# 1. Get OpenRouter API key
# Visit: https://openrouter.ai/keys

# 2. Add to .env file
echo "OPENROUTER_API_KEY=your-key-here" >> .env

# 3. Restart services
npm run dev

# 4. Select "Gemini 2.5 Flash Image (Free)" model in UI
```

### Full Setup (Image + Voice):

```bash
# 1. OpenRouter setup (above)

# 2. Install Coqui TTS
pip install TTS

# 3. Download XTTS-v2 model (automatic on first run)
python -c "from TTS.api import TTS; TTS('tts_models/multilingual/multi-dataset/xtts_v2')"

# 4. (Optional) Add custom voice samples
mkdir -p python-service/voices/
# Record and save:
# - voices/ashley-girlfriend.wav
# - voices/ashley-data-analyst.wav
# - voices/ashley-data-scientist.wav
# - voices/ashley-girlfriend-explicit.wav

# 5. Restart services
npm run dev
```

---

## API Costs Comparison

| Feature | Provider | Cost | Notes |
|---------|----------|------|-------|
| **Image Generation** | OpenRouter (Gemini) | **FREE** | 1024x1024, no rate limits |
| **Image Generation** | Stable Diffusion (Local) | **FREE** | Requires GPU/hardware |
| **Image Generation** | OpenAI DALL-E 3 | ~$0.04/image | High quality, 1024x1024 |
| **Voice/TTS** | Coqui XTTS-v2 (Local) | **FREE** | Voice cloning, unlimited |
| **Voice/TTS** | OpenAI TTS | ~$0.015/1K chars | High quality voices |
| **Voice/TTS** | ElevenLabs | $5-22/month | Premium voice cloning |

---

## Ethical Considerations

### Voice Cloning:
- ⚠️ **Do NOT** use to impersonate real individuals without consent
- ⚠️ **Do NOT** create deepfakes or spread misinformation
- ✅ **DO** use for creative projects, virtual assistants, accessibility
- ✅ **DO** ensure voice samples are legally obtained

### Image Generation:
- ⚠️ Be mindful of copyright and attribution
- ✅ OpenRouter/Google handle model ethics and safety filters

---

## Technical Architecture

### Model Configuration:
```json
{
  "openrouter-gemini-image-free": {
    "model_name": "google/gemini-2.5-flash-image-preview:free",
    "format": "openrouter-image",
    "capabilities": ["image-generation", "creative"],
    "modalities": ["image", "text"],
    "trainable": false
  }
}
```

### Voice Configuration:
```json
{
  "voice_mappings": {
    "ashley-girlfriend": {
      "voice_description": "Warm, friendly, affectionate female voice",
      "tone": "warm",
      "coqui_speaker": "female-1",
      "sample_audio_path": "voices/ashley-girlfriend.wav"
    }
  },
  "tts_config": {
    "engine": "coqui",
    "model": "tts_models/multilingual/multi-dataset/xtts_v2",
    "streaming": true
  }
}
```

---

## Future Enhancements

### Planned:
1. **Image Display in Chat UI** - Show generated images inline
2. **Voice Playback Controls** - Play/pause/skip TTS audio
3. **Custom Voice Upload** - Users provide their own voice samples
4. **Image History** - Gallery of all generated images
5. **Multi-image Generation** - Generate multiple variations

### Under Consideration:
1. **Stable Diffusion Integration** - For users with powerful GPUs
2. **Voice Emotion Control** - Adjust tone/emotion per message
3. **Real-time Voice Chat** - Live voice conversations with Ashley
4. **Image Editing** - Modify generated images with prompts

---

## Troubleshooting

### Image Generation Not Working:
```bash
# Check if OpenRouter API key is set
grep OPENROUTER_API_KEY .env

# Test API key
curl -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  https://openrouter.ai/api/v1/models
```

### Voice Generation Slow:
```bash
# Enable GPU acceleration (NVIDIA)
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

# Enable MPS (Apple Silicon)
export PYTORCH_ENABLE_MPS_FALLBACK=1
```

### Out of Memory Errors:
```bash
# Use smaller TTS model
TTS("tts_models/en/ljspeech/tacotron2-DDC")  # Faster, less VRAM

# Quantize Stable Diffusion
# Edit diffusion script to use fp16 or int8 precision
```

---

## Resources

- **OpenRouter Docs**: https://openrouter.ai/docs
- **Coqui TTS GitHub**: https://github.com/idiap/coqui-ai-TTS
- **XTTS-v2 Guide**: https://coqui-tts.readthedocs.io/en/latest/
- **Stable Diffusion**: https://stability.ai/stable-diffusion
- **Hugging Face Diffusers**: https://huggingface.co/docs/diffusers/

---

## Summary

### What's Available RIGHT NOW (Free):

✅ **Image Generation**: Gemini 2.5 Flash Image via OpenRouter (1024x1024, free, unlimited)
✅ **Persona Voice Mapping**: Each Ashley persona has unique voice characteristics configured
⚠️ **Voice Generation**: Coqui XTTS-v2 configured but not yet integrated into backend

### What You Need:
1. OpenRouter API key (free): https://openrouter.ai/keys
2. (Optional) Coqui TTS installed: `pip install TTS`
3. (Optional) Custom voice samples for persona cloning

### Next Steps:
- Add image display to chat UI
- Integrate Coqui TTS backend API endpoint
- Connect voice playback to frontend
- Add user controls for voice/image features
