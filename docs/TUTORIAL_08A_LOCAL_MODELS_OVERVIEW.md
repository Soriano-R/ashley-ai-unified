# Tutorial 8A: Local Models Overview and Setup

## Table of Contents
1. [Introduction to Local Models](#introduction-to-local-models)
2. [Model Size Considerations (7B-13B)](#model-size-considerations-7b-13b)
3. [Hardware Requirements](#hardware-requirements)
4. [Storage Strategy](#storage-strategy)
5. [Model Format Types](#model-format-types)
6. [Installation Prerequisites](#installation-prerequisites)
7. [Directory Structure Setup](#directory-structure-setup)
8. [Model Quantization Explained](#model-quantization-explained)

## Introduction to Local Models

Local models provide several advantages for Ashley AI:
- **Privacy**: All processing happens on your hardware
- **Cost Control**: No API fees after initial setup
- **Customization**: Fine-tune models for specific use cases
- **Offline Capability**: Work without internet connection
- **Performance**: Optimized for your specific hardware

### Why 7B-13B Model Range?

This size range offers the optimal balance of:
- **Performance**: Capable of sophisticated reasoning and generation
- **Resource Efficiency**: Runs on consumer hardware (12-24GB VRAM)
- **Quality**: Near-GPT-3.5 level performance for many tasks
- **Speed**: Fast inference times for real-time applications

## Model Size Considerations (7B-13B)

### Memory Requirements by Size

```python
MODEL_MEMORY_REQUIREMENTS = {
    "7B_Models": {
        "fp16": "14 GB VRAM",
        "q8_0": "7.5 GB VRAM", 
        "q4_k_m": "4.5 GB VRAM",
        "q4_0": "4.0 GB VRAM",
        "recommended": "RTX 3090/4090 (24GB) or RTX 4070Ti (16GB)"
    },
    "8B_Models": {
        "fp16": "16 GB VRAM",
        "q8_0": "8.5 GB VRAM",
        "q4_k_m": "5.0 GB VRAM", 
        "q4_0": "4.5 GB VRAM",
        "recommended": "RTX 3090/4090 (24GB)"
    },
    "13B_Models": {
        "fp16": "26 GB VRAM",
        "q8_0": "14 GB VRAM",
        "q4_k_m": "8.0 GB VRAM",
        "q4_0": "7.0 GB VRAM",
        "recommended": "RTX 3090/4090 (24GB) or A100 (40GB)"
    }
}
```

### Performance vs Quality Trade-offs

| Quantization | Quality | Speed | Memory | Use Case |
|-------------|---------|-------|---------|----------|
| fp16 | Highest | Slowest | Most | Research/Fine-tuning |
| q8_0 | Very High | Fast | High | Production Quality |
| q4_k_m | High | Very Fast | Medium | **Recommended Balance** |
| q4_0 | Good | Fastest | Least | Resource Constrained |

## Hardware Requirements

### Minimum Requirements
```yaml
GPU: 
  - VRAM: 8GB (for 7B q4_k_m models)
  - Examples: RTX 3070, RTX 4060Ti, RTX 3080

CPU:
  - Cores: 8+ cores
  - RAM: 16GB+ system RAM
  - Architecture: x64 with AVX2 support

Storage:
  - Space: 100GB+ free space
  - Type: SSD recommended for faster loading
  - Speed: NVMe preferred for large models
```

### Recommended Requirements
```yaml
GPU:
  - VRAM: 16-24GB (for multiple models or 13B)
  - Examples: RTX 3090, RTX 4090, RTX 4080

CPU:
  - Cores: 12+ cores (Intel i7/i9, AMD Ryzen 7/9)
  - RAM: 32GB+ system RAM
  - Cache: Large L3 cache beneficial

Storage:
  - Space: 500GB+ dedicated for models
  - Type: NVMe SSD
  - Speed: PCIe 4.0 for optimal performance
```

## Storage Strategy

### Directory Structure
```bash
/opt/ashley-ai/models/
├── chat/                     # Text generation models
│   ├── 7b/
│   │   ├── llama-3.1-8b-instruct.q4_k_m.gguf
│   │   ├── qwen2.5-7b-instruct.q4_k_m.gguf
│   │   └── mixtral-8x7b-instruct.q4_k_m.gguf
│   ├── 13b/
│   │   ├── llama-2-13b-chat.q4_k_m.gguf
│   │   └── vicuna-13b-v1.5.q4_k_m.gguf
│   └── specialized/
│       ├── codellama-13b-instruct.q4_k_m.gguf
│       ├── medalpaca-13b.q4_k_m.gguf
│       └── wizard-vicuna-13b-uncensored.q4_k_m.gguf
├── image/                    # Image generation models
│   ├── stable-diffusion/
│   │   ├── sd-v1.5.safetensors
│   │   ├── sd-xl-base.safetensors
│   │   └── sd-xl-refiner.safetensors
│   └── controlnet/
├── voice/                    # Voice models
│   ├── tts/
│   │   ├── xtts-v2/
│   │   └── bark/
│   └── stt/
│       └── whisper/
├── embeddings/              # Text embedding models
│   ├── all-MiniLM-L6-v2/
│   └── bge-large-en-v1.5/
└── cache/                   # Model cache and temporary files
    ├── tokenizers/
    └── temp/
```

### Storage Configuration
```bash
# Create model directory structure
sudo mkdir -p /opt/ashley-ai/models/{chat/{7b,13b,specialized},image/{stable-diffusion,controlnet},voice/{tts,stt},embeddings,cache/{tokenizers,temp}}

# Set permissions
sudo chown -R $USER:$USER /opt/ashley-ai/models
chmod -R 755 /opt/ashley-ai/models

# Create symlink for easy access
ln -s /opt/ashley-ai/models ~/models
```

## Model Format Types

### GGUF Format (Recommended)
- **Best for**: CPU inference with llama.cpp
- **Advantages**: Optimized quantization, fast loading
- **File Extension**: `.gguf`
- **Library**: llama-cpp-python

### Safetensors Format
- **Best for**: GPU inference with transformers
- **Advantages**: Secure loading, PyTorch compatible
- **File Extension**: `.safetensors`
- **Library**: transformers, diffusers

### ONNX Format
- **Best for**: Cross-platform deployment
- **Advantages**: Hardware agnostic, optimized
- **File Extension**: `.onnx`
- **Library**: onnxruntime

## Installation Prerequisites

### Step 1: Update Ashley AI Dependencies

```bash
cd /Users/soriano/Projects/ashley-ai-unified/python-service

# Install local model support
pip install llama-cpp-python
pip install transformers[torch]
pip install accelerate
pip install bitsandbytes
pip install diffusers
pip install sentence-transformers
```

### Step 2: GPU-Specific Installation

#### For NVIDIA GPUs
```bash
# Install CUDA-enabled llama-cpp-python
CMAKE_ARGS="-DLLAMA_CUBLAS=on" pip install llama-cpp-python --force-reinstall --no-cache-dir

# Install PyTorch with CUDA
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
```

#### For Apple Silicon (M1/M2/M3)
```bash
# Install Metal-enabled llama-cpp-python
CMAKE_ARGS="-DLLAMA_METAL=on" pip install llama-cpp-python --force-reinstall --no-cache-dir

# Install PyTorch with MPS support
pip install torch torchvision torchaudio
```

#### For CPU-Only
```bash
# Standard installation
pip install llama-cpp-python

# Install CPU-optimized PyTorch
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
```

### Step 3: Verify Installation

```python
# Test script to verify installations
import torch
import transformers
from llama_cpp import Llama

def test_installations():
    print("=== Installation Verification ===")
    
    # PyTorch
    print(f"PyTorch Version: {torch.__version__}")
    print(f"CUDA Available: {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        print(f"CUDA Version: {torch.version.cuda}")
        print(f"GPU Count: {torch.cuda.device_count()}")
        print(f"GPU Name: {torch.cuda.get_device_name(0)}")
    
    # Transformers
    print(f"Transformers Version: {transformers.__version__}")
    
    # MPS (Apple Silicon)
    if hasattr(torch.backends, 'mps'):
        print(f"MPS Available: {torch.backends.mps.is_available()}")
    
    print("✅ All installations verified!")

if __name__ == "__main__":
    test_installations()
```

## Directory Structure Setup

### Step 1: Create Model Configuration

```python
# Create config/models.py
import os
from pathlib import Path

class ModelConfig:
    """Configuration for local models"""
    
    def __init__(self):
        self.base_path = Path("/opt/ashley-ai/models")
        self.cache_path = self.base_path / "cache"
        
        # Model paths
        self.chat_models_path = self.base_path / "chat"
        self.image_models_path = self.base_path / "image"
        self.voice_models_path = self.base_path / "voice"
        self.embedding_models_path = self.base_path / "embeddings"
        
        # Ensure directories exist
        self._create_directories()
    
    def _create_directories(self):
        """Create all necessary directories"""
        directories = [
            self.base_path,
            self.cache_path,
            self.chat_models_path / "7b",
            self.chat_models_path / "13b", 
            self.chat_models_path / "specialized",
            self.image_models_path / "stable-diffusion",
            self.image_models_path / "controlnet",
            self.voice_models_path / "tts",
            self.voice_models_path / "stt",
            self.embedding_models_path,
            self.cache_path / "tokenizers",
            self.cache_path / "temp"
        ]
        
        for directory in directories:
            directory.mkdir(parents=True, exist_ok=True)
            print(f"Created directory: {directory}")
    
    def get_model_path(self, model_type: str, model_name: str) -> Path:
        """Get full path for a model"""
        type_mapping = {
            "chat_7b": self.chat_models_path / "7b",
            "chat_13b": self.chat_models_path / "13b",
            "chat_specialized": self.chat_models_path / "specialized",
            "image": self.image_models_path,
            "voice_tts": self.voice_models_path / "tts",
            "voice_stt": self.voice_models_path / "stt",
            "embedding": self.embedding_models_path
        }
        
        base_dir = type_mapping.get(model_type)
        if not base_dir:
            raise ValueError(f"Unknown model type: {model_type}")
        
        return base_dir / model_name
    
    def list_available_models(self):
        """List all available models"""
        models = {}
        
        for category in ["7b", "13b", "specialized"]:
            category_path = self.chat_models_path / category
            if category_path.exists():
                models[f"chat_{category}"] = [
                    f.name for f in category_path.iterdir() 
                    if f.suffix in ['.gguf', '.bin', '.safetensors']
                ]
        
        return models

# Usage example
if __name__ == "__main__":
    config = ModelConfig()
    models = config.list_available_models()
    print("Available models:", models)
```

### Step 2: Environment Variables

```bash
# Add to your .env file
echo "LOCAL_MODELS_ENABLED=true" >> .env
echo "LOCAL_MODELS_PATH=/opt/ashley-ai/models" >> .env
echo "MODEL_CACHE_PATH=/opt/ashley-ai/models/cache" >> .env
echo "DEFAULT_CHAT_MODEL=llama-3.1-8b-instruct.q4_k_m.gguf" >> .env
echo "DEFAULT_IMAGE_MODEL=stable-diffusion-xl-base-1.0" >> .env
echo "ENABLE_GPU_INFERENCE=true" >> .env
```

## Model Quantization Explained

### Understanding Quantization

Quantization reduces model precision to save memory and increase speed:

| Format | Bits | Description | Quality Loss | Memory Savings |
|--------|------|-------------|--------------|----------------|
| fp16 | 16 | Half precision | None | 50% |
| q8_0 | 8 | 8-bit quantization | Minimal | 75% |
| q4_k_m | 4 | 4-bit with mixed precision | Low | 87.5% |
| q4_0 | 4 | 4-bit uniform | Moderate | 87.5% |
| q3_k_m | 3 | 3-bit with mixed precision | Higher | 90% |

### Recommended Quantization by Use Case

```python
QUANTIZATION_RECOMMENDATIONS = {
    "development": "q4_k_m",  # Good balance
    "production": "q8_0",     # High quality
    "mobile": "q4_0",         # Maximum efficiency
    "research": "fp16",       # Full precision
    "batch_processing": "q3_k_m"  # Maximum throughput
}
```

### Quality Comparison

```python
def quantization_comparison():
    """
    Estimated quality retention by quantization level
    """
    return {
        "fp16": {"quality": "100%", "speed": "1x", "memory": "100%"},
        "q8_0": {"quality": "99%", "speed": "1.5x", "memory": "50%"},
        "q4_k_m": {"quality": "95%", "speed": "3x", "memory": "25%"},
        "q4_0": {"quality": "90%", "speed": "4x", "memory": "25%"},
        "q3_k_m": {"quality": "85%", "speed": "5x", "memory": "20%"}
    }
```

## Next Steps

In the next part of this tutorial series, we'll cover:
- **Tutorial 8B**: Specific model recommendations by use case
- **Tutorial 8C**: Model download and installation procedures
- **Tutorial 8D**: Code integration and configuration
- **Tutorial 8E**: Performance optimization and troubleshooting

### Quick Start Checklist
- [ ] Verify hardware requirements
- [ ] Install dependencies
- [ ] Create directory structure
- [ ] Configure environment variables
- [ ] Test installation verification script

This foundation prepares your system for downloading and running local models with Ashley AI. The next tutorial will cover specific model recommendations for different use cases including coding, general use, specialized domains, and uncensored models.