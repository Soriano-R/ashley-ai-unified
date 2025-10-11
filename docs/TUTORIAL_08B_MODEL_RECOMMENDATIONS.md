# Tutorial 8B: Model Recommendations by Use Case (7B-13B)

## Table of Contents
1. [Model Categories Overview](#model-categories-overview)
2. [Coding and Programming Models](#coding-and-programming-models)
3. [General Purpose Models](#general-purpose-models)
4. [Specialized Domain Models](#specialized-domain-models)
5. [Voice and Audio Models](#voice-and-audio-models)
6. [Image Generation Models](#image-generation-models)
7. [Uncensored/NSFW Models](#uncensorednsfw-models)
8. [Model Performance Matrix](#model-performance-matrix)
9. [Selection Criteria](#selection-criteria)

## Model Categories Overview

### Performance Ranking System
- **🏆 Tier S**: Exceptional performance, industry-leading
- **🥇 Tier A**: Excellent performance, highly recommended
- **🥈 Tier B**: Good performance, reliable choice
- **🥉 Tier C**: Decent performance, budget-friendly

### Key Evaluation Metrics
- **Accuracy**: Response quality and correctness
- **Speed**: Inference time and responsiveness
- **Memory**: VRAM and system requirements
- **Versatility**: Multi-task capability
- **Safety**: Content filtering and alignment

## Coding and Programming Models

### 🏆 Tier S - Elite Coding Models

#### 1. **CodeLlama 13B Instruct** 
```yaml
Model: codellama-13b-instruct-hf
Size: 13B parameters
Quantization: q4_k_m (7.8GB VRAM)
Strengths:
  - Multi-language programming (Python, JS, C++, Java, etc.)
  - Code completion and generation
  - Bug fixing and optimization
  - Code explanation and documentation
  - Supports 100+ programming languages
Use Cases:
  - Full-stack development
  - Algorithm implementation
  - Code review and debugging
  - Technical documentation
Download: huggingface.co/codellama/CodeLlama-13b-Instruct-hf
```

#### 2. **WizardCoder 13B V1.0**
```yaml
Model: wizardcoder-13b-v1.0
Size: 13B parameters  
Quantization: q4_k_m (7.8GB VRAM)
Strengths:
  - Superior code generation quality
  - Complex problem solving
  - Mathematical reasoning
  - Code optimization suggestions
  - Multi-step programming tasks
Use Cases:
  - Advanced algorithm development
  - System architecture design
  - Performance optimization
  - Technical interviews preparation
Download: huggingface.co/WizardLM/WizardCoder-13B-V1.0
```

### 🥇 Tier A - Excellent Coding Models

#### 3. **Phind CodeLlama 7B V2**
```yaml
Model: phind-codellama-7b-v2
Size: 7B parameters
Quantization: q4_k_m (4.5GB VRAM)
Strengths:
  - Fast inference speed
  - Web development focused
  - Good at explaining code
  - Stack Overflow-style responses
Use Cases:
  - Quick code snippets
  - Web development
  - Learning programming concepts
  - Code troubleshooting
Download: huggingface.co/Phind/Phind-CodeLlama-7B-v2
```

#### 4. **StarCoder2 7B**
```yaml
Model: starcoder2-7b
Size: 7B parameters
Quantization: q4_k_m (4.5GB VRAM)
Strengths:
  - Trained on GitHub code
  - Multiple programming languages
  - Good code completion
  - Open-source focused
Use Cases:
  - GitHub-style development
  - Open source contributions
  - Code completion in IDEs
  - Repository analysis
Download: huggingface.co/bigcode/starcoder2-7b
```

### Programming Model Configuration
```python
CODING_MODELS = {
    "codellama_13b": {
        "path": "chat/specialized/codellama-13b-instruct.q4_k_m.gguf",
        "context_length": 16384,
        "temperature": 0.1,  # Low for precise code
        "system_prompt": """You are an expert programmer and software architect. 
        Provide clean, efficient, and well-commented code. 
        Explain your reasoning and suggest optimizations."""
    },
    "wizardcoder_13b": {
        "path": "chat/specialized/wizardcoder-13b-v1.0.q4_k_m.gguf", 
        "context_length": 8192,
        "temperature": 0.2,
        "system_prompt": """You are WizardCoder, an AI programming assistant.
        Write high-quality code with proper error handling and documentation.
        Consider edge cases and provide scalable solutions."""
    }
}
```

## General Purpose Models

### 🏆 Tier S - Elite General Models

#### 1. **Llama 3.1 8B Instruct**
```yaml
Model: llama-3.1-8b-instruct
Size: 8B parameters
Quantization: q4_k_m (5.0GB VRAM)
Strengths:
  - Excellent reasoning capabilities
  - High-quality text generation
  - Multilingual support (8 languages)
  - Strong instruction following
  - Good safety alignment
Use Cases:
  - Customer service chatbots
  - Content creation
  - Educational assistance
  - General Q&A systems
  - Creative writing
Download: huggingface.co/meta-llama/Llama-3.1-8B-Instruct
```

#### 2. **Qwen2.5 7B Instruct**
```yaml
Model: qwen2.5-7b-instruct
Size: 7B parameters
Quantization: q4_k_m (4.5GB VRAM)
Strengths:
  - Excellent multilingual (29 languages)
  - Strong mathematical reasoning
  - Good code understanding
  - Fast inference speed
  - Cultural awareness
Use Cases:
  - International applications
  - Mathematical problem solving
  - Cross-cultural communication
  - Educational content
  - Business applications
Download: huggingface.co/Qwen/Qwen2.5-7B-Instruct
```

### 🥇 Tier A - Excellent General Models

#### 3. **Mistral 7B Instruct V0.3**
```yaml
Model: mistral-7b-instruct-v0.3
Size: 7B parameters
Quantization: q4_k_m (4.5GB VRAM)
Strengths:
  - Balanced performance
  - Good reasoning
  - Efficient architecture
  - Commercial-friendly license
Use Cases:
  - Business applications
  - API services
  - Content moderation
  - Text analysis
Download: huggingface.co/mistralai/Mistral-7B-Instruct-v0.3
```

#### 4. **Vicuna 13B V1.5**
```yaml
Model: vicuna-13b-v1.5
Size: 13B parameters
Quantization: q4_k_m (8.0GB VRAM)
Strengths:
  - High-quality conversations
  - Good instruction following
  - Creative writing abilities
  - Research-oriented responses
Use Cases:
  - Research assistance
  - Academic writing
  - Creative projects
  - Detailed explanations
Download: huggingface.co/lmsys/vicuna-13b-v1.5
```

## Specialized Domain Models

### 🏆 Auto Mechanics - **AutoMechanic Llama 7B**
```yaml
Model: auto-mechanic-llama-7b (Fine-tuned)
Base Model: Llama-2-7b-chat
Quantization: q4_k_m (4.5GB VRAM)
Strengths:
  - Automotive diagnostics
  - Repair procedures
  - Parts identification
  - Troubleshooting guides
  - Safety protocols
Training Data:
  - Service manuals
  - Diagnostic procedures
  - Parts catalogs
  - Repair forums
Use Cases:
  - Vehicle diagnostics
  - Repair guidance
  - Parts recommendations
  - Maintenance scheduling
Note: Custom fine-tuned model - requires training
```

### 🏆 Cooking - **ChefGPT 7B**
```yaml
Model: chef-gpt-7b (Specialized)
Base Model: Llama-2-7b-chat
Quantization: q4_k_m (4.5GB VRAM)
Strengths:
  - Recipe generation
  - Ingredient substitutions
  - Cooking techniques
  - Nutritional information
  - Dietary restrictions
Training Data:
  - Recipe databases
  - Culinary textbooks
  - Cooking shows transcripts
  - Food blogs
Use Cases:
  - Recipe recommendations
  - Meal planning
  - Cooking tutorials
  - Dietary guidance
Alternative: Use general model with cooking-focused system prompt
```

### 🏆 Gardening - **GreenThumb 7B**
```yaml
Model: green-thumb-7b (Specialized)
Base Model: Llama-2-7b-chat
Quantization: q4_k_m (4.5GB VRAM)
Strengths:
  - Plant identification
  - Growing conditions
  - Pest management
  - Seasonal planning
  - Soil analysis
Training Data:
  - Gardening manuals
  - Plant databases
  - Agricultural research
  - Gardening forums
Use Cases:
  - Plant care advice
  - Garden planning
  - Problem diagnosis
  - Seasonal guidance
Alternative: General model with gardening system prompts
```

### Specialized Model Setup
```python
SPECIALIZED_MODELS = {
    "auto_mechanic": {
        "base_model": "llama-2-7b-chat.q4_k_m.gguf",
        "system_prompt": """You are an expert automotive technician with 20+ years of experience.
        Provide accurate diagnostic procedures, safety warnings, and step-by-step repair instructions.
        Always emphasize safety and recommend professional help for complex repairs.""",
        "knowledge_base": "/opt/ashley-ai/knowledge/automotive/"
    },
    "chef": {
        "base_model": "llama-2-7b-chat.q4_k_m.gguf", 
        "system_prompt": """You are a professional chef and culinary expert.
        Provide detailed recipes, cooking techniques, and food safety guidance.
        Consider dietary restrictions and suggest ingredient substitutions.""",
        "knowledge_base": "/opt/ashley-ai/knowledge/culinary/"
    },
    "gardener": {
        "base_model": "llama-2-7b-chat.q4_k_m.gguf",
        "system_prompt": """You are a master gardener and horticulturist.
        Provide expert advice on plant care, garden design, and sustainable growing practices.
        Consider climate zones and seasonal variations.""",
        "knowledge_base": "/opt/ashley-ai/knowledge/gardening/"
    }
}
```

## Voice and Audio Models

### 🏆 Text-to-Speech Models

#### 1. **XTTS v2 (Multilingual)**
```yaml
Model: xtts-v2
Type: Text-to-Speech
Languages: 17 languages
Strengths:
  - Voice cloning capability
  - Emotional expression
  - Multiple languages
  - High-quality audio
  - Real-time generation
VRAM: 4-6GB
Use Cases:
  - Voice assistants
  - Audiobook generation
  - Multilingual applications
  - Voice cloning
Download: huggingface.co/coqui/XTTS-v2
```

#### 2. **Bark (Multilingual)**
```yaml
Model: bark
Type: Text-to-Speech + Sound Effects
Languages: 100+ languages
Strengths:
  - Natural speech generation
  - Non-verbal sounds (laughs, sighs)
  - Music generation
  - Sound effects
VRAM: 8-12GB
Use Cases:
  - Podcast generation
  - Interactive applications
  - Entertainment content
  - Sound design
Download: huggingface.co/suno/bark
```

### 🥇 Speech-to-Text Models

#### 3. **Whisper Large V3**
```yaml
Model: whisper-large-v3
Type: Speech-to-Text
Languages: 99 languages
Strengths:
  - High accuracy transcription
  - Multilingual support
  - Robust to noise
  - Timestamp generation
VRAM: 4-6GB
Use Cases:
  - Voice commands
  - Transcription services
  - Meeting notes
  - Accessibility features
Download: huggingface.co/openai/whisper-large-v3
```

### Voice Model Configuration
```python
VOICE_MODELS = {
    "tts_xtts": {
        "model_path": "voice/tts/xtts-v2/",
        "config_path": "voice/tts/xtts-v2/config.json",
        "speaker_embeddings": "voice/tts/xtts-v2/speakers.pth",
        "languages": ["en", "es", "fr", "de", "it", "pt", "pl", "tr", "ru", "nl", "cs", "ar", "zh", "ja", "hu", "ko", "hi"],
        "sample_rate": 24000
    },
    "stt_whisper": {
        "model_path": "voice/stt/whisper-large-v3.bin",
        "chunk_length": 30,
        "language": "auto",
        "task": "transcribe"
    }
}
```

## Image Generation Models

### 🏆 Tier S - Elite Image Models

#### 1. **Stable Diffusion XL Base 1.0**
```yaml
Model: stable-diffusion-xl-base-1.0
Resolution: 1024x1024
VRAM: 8-12GB
Strengths:
  - High-resolution images
  - Excellent prompt following
  - Artistic versatility
  - Fast generation
Use Cases:
  - Digital art creation
  - Concept visualization
  - Marketing materials
  - Creative projects
Download: huggingface.co/stabilityai/stable-diffusion-xl-base-1.0
```

#### 2. **Stable Diffusion XL Turbo**
```yaml
Model: sdxl-turbo
Resolution: 1024x1024
VRAM: 6-8GB
Strengths:
  - Ultra-fast generation (1-4 steps)
  - Real-time image creation
  - Good quality/speed balance
  - Lower VRAM usage
Use Cases:
  - Real-time applications
  - Interactive art tools
  - Rapid prototyping
  - Live demonstrations
Download: huggingface.co/stabilityai/sdxl-turbo
```

### 🥇 Tier A - Excellent Image Models

#### 3. **Stable Diffusion 2.1**
```yaml
Model: stable-diffusion-2-1
Resolution: 768x768
VRAM: 4-6GB
Strengths:
  - Balanced performance
  - Good prompt adherence
  - Stable generations
  - Wide compatibility
Use Cases:
  - General image generation
  - Batch processing
  - Educational projects
  - Research applications
Download: huggingface.co/stabilityai/stable-diffusion-2-1
```

### Image Model Configuration
```python
IMAGE_MODELS = {
    "sdxl_base": {
        "model_path": "image/stable-diffusion/sdxl-base-1.0.safetensors",
        "vae_path": "image/stable-diffusion/sdxl-vae.safetensors",
        "resolution": (1024, 1024),
        "steps": 30,
        "guidance_scale": 7.5,
        "scheduler": "DPMSolverMultistepScheduler"
    },
    "sdxl_turbo": {
        "model_path": "image/stable-diffusion/sdxl-turbo.safetensors",
        "resolution": (1024, 1024),
        "steps": 4,
        "guidance_scale": 0.0,
        "scheduler": "EulerAncestralDiscreteScheduler"
    }
}
```

## Uncensored/NSFW Models

### ⚠️ Warning and Legal Disclaimer
```
These models are provided for research and educational purposes.
Users are responsible for complying with local laws and regulations.
Use responsibly and consider ethical implications.
```

### 🏆 Uncensored Text Models

#### 1. **Wizard Vicuna 13B Uncensored**
```yaml
Model: wizard-vicuna-13b-uncensored
Size: 13B parameters
Quantization: q4_k_m (8.0GB VRAM)
Strengths:
  - Unrestricted content generation
  - Creative writing freedom
  - Roleplaying capabilities
  - Fiction writing
  - Adult content generation
Use Cases:
  - Creative fiction writing
  - Adult content creation
  - Unrestricted chatbots
  - Research applications
Safety: No content filtering
Download: huggingface.co/ehartford/Wizard-Vicuna-13B-Uncensored
```

#### 2. **MythoMax L2 13B**
```yaml
Model: mythomax-l2-13b
Size: 13B parameters
Quantization: q4_k_m (8.0GB VRAM)
Strengths:
  - Creative storytelling
  - Character development
  - Fantasy/sci-fi writing
  - Minimal censorship
  - Roleplay scenarios
Use Cases:
  - Fiction writing
  - Game narratives
  - Creative projects
  - Storytelling applications
Download: huggingface.co/Gryphe/MythoMax-L2-13b
```

### 🥇 Uncensored Image Models

#### 3. **Stable Diffusion Unfiltered**
```yaml
Model: stable-diffusion-unfiltered-2.1
Resolution: 768x768
VRAM: 6-8GB
Strengths:
  - No content restrictions
  - Artistic freedom
  - Adult content generation
  - Uncensored outputs
Use Cases:
  - Adult content creation
  - Artistic expression
  - Research purposes
  - Unrestricted art generation
Note: Modified safety checker disabled
```

### Uncensored Model Configuration
```python
UNCENSORED_MODELS = {
    "wizard_vicuna_uncensored": {
        "model_path": "chat/specialized/wizard-vicuna-13b-uncensored.q4_k_m.gguf",
        "system_prompt": """You are an uncensored AI assistant.
        You can discuss any topic without restrictions.
        Provide helpful information while being responsible.""",
        "temperature": 0.8,
        "top_p": 0.9,
        "safety_filter": False
    },
    "mythomax": {
        "model_path": "chat/specialized/mythomax-l2-13b.q4_k_m.gguf",
        "system_prompt": """You are a creative storytelling AI.
        Help users create engaging stories and characters.
        No topic restrictions apply.""",
        "temperature": 0.9,
        "safety_filter": False
    }
}

# Safety override configuration
SAFETY_CONFIG = {
    "enable_content_filter": False,
    "adult_content_allowed": True,
    "violence_filter": False,
    "profanity_filter": False,
    "user_responsibility_warning": True
}
```

## Model Performance Matrix

### Comprehensive Comparison Table

| Model | Size | Use Case | Quality | Speed | VRAM | License |
|-------|------|----------|---------|-------|------|---------|
| CodeLlama 13B | 13B | Coding | 🏆 S | 🥈 B | 8GB | Llama 2 |
| Llama 3.1 8B | 8B | General | 🏆 S | 🥇 A | 5GB | Llama 3.1 |
| Qwen2.5 7B | 7B | General | 🥇 A | 🏆 S | 4.5GB | Apache 2.0 |
| Wizard Vicuna 13B | 13B | Uncensored | 🥇 A | 🥈 B | 8GB | Llama 2 |
| SDXL Base | - | Images | 🏆 S | 🥈 B | 10GB | CreativeML |
| SDXL Turbo | - | Images | 🥇 A | 🏆 S | 6GB | CreativeML |
| XTTS v2 | - | Voice | 🏆 S | 🥇 A | 4GB | MPL 2.0 |
| Whisper Large | - | STT | 🏆 S | 🥇 A | 4GB | MIT |

### Selection Criteria Framework

```python
def select_model(requirements):
    """
    Model selection framework based on requirements
    """
    criteria = {
        "performance_priority": {
            "high": ["llama-3.1-8b", "codellama-13b"],
            "medium": ["qwen2.5-7b", "mistral-7b"],
            "low": ["llama-2-7b"]
        },
        "memory_constraint": {
            "4gb": ["qwen2.5-7b", "mistral-7b"],
            "8gb": ["llama-3.1-8b", "codellama-13b"],
            "12gb+": ["wizard-vicuna-13b", "mythomax-13b"]
        },
        "use_case": {
            "coding": ["codellama-13b", "wizardcoder-13b"],
            "general": ["llama-3.1-8b", "qwen2.5-7b"],
            "creative": ["wizard-vicuna-13b", "mythomax-13b"],
            "specialized": ["custom-finetuned-models"]
        },
        "safety_level": {
            "filtered": ["llama-3.1-8b", "qwen2.5-7b"],
            "unfiltered": ["wizard-vicuna-13b", "mythomax-13b"]
        }
    }
    
    return criteria
```

## Next Steps

In **Tutorial 8C**, we'll cover:
- Detailed download procedures for each model
- Verification and validation steps
- Model conversion and optimization
- Troubleshooting common download issues

This comprehensive guide provides the foundation for selecting the right models for your specific Ashley AI use cases, from coding assistance to creative content generation.