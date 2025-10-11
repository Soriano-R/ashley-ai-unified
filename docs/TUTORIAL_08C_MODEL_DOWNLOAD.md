# Tutorial 8C: Model Download and Installation

## Table of Contents
1. [Download Methods Overview](#download-methods-overview)
2. [Hugging Face Hub Downloads](#hugging-face-hub-downloads)
3. [Direct Download Scripts](#direct-download-scripts)
4. [Model Verification](#model-verification)
5. [Batch Download Automation](#batch-download-automation)
6. [Storage Management](#storage-management)
7. [Download Troubleshooting](#download-troubleshooting)
8. [Model Registry Setup](#model-registry-setup)

## Download Methods Overview

### Available Download Methods
1. **Hugging Face Hub CLI** - Official tool, most reliable
2. **Git LFS** - For large files, version control
3. **Direct HTTP** - wget/curl, simple but limited
4. **Python Scripts** - Automated with error handling
5. **Torrent/P2P** - For popular models (unofficial)

### Prerequisites Installation
```bash
# Install Hugging Face Hub
pip install huggingface_hub

# Install Git LFS
# macOS
brew install git-lfs

# Ubuntu/Debian
apt install git-lfs

# Initialize Git LFS
git lfs install

# Install additional tools
pip install tqdm requests accelerate
```

## Hugging Face Hub Downloads

### Method 1: Using huggingface-cli

#### Basic Model Download
```bash
# Download complete model
huggingface-cli download meta-llama/Llama-3.1-8B-Instruct \
  --local-dir /opt/ashley-ai/models/chat/8b/llama-3.1-8b-instruct \
  --local-dir-use-symlinks False

# Download specific quantized version
huggingface-cli download TheBloke/Llama-2-13B-Chat-GGUF \
  llama-2-13b-chat.Q4_K_M.gguf \
  --local-dir /opt/ashley-ai/models/chat/13b \
  --local-dir-use-symlinks False
```

#### Download with Authentication (for gated models)
```bash
# Login to Hugging Face
huggingface-cli login

# Download gated model (like Llama models)
huggingface-cli download meta-llama/Llama-3.1-8B-Instruct \
  --token YOUR_HF_TOKEN \
  --local-dir /opt/ashley-ai/models/chat/8b/llama-3.1-8b-instruct
```

### Method 2: Python Download Script

```python
#!/usr/bin/env python3
"""
Ashley AI Model Download Script
Automated downloading with progress tracking and error handling
"""

import os
import sys
from pathlib import Path
from huggingface_hub import hf_hub_download, snapshot_download
from tqdm import tqdm
import hashlib

class ModelDownloader:
    def __init__(self, base_path="/opt/ashley-ai/models"):
        self.base_path = Path(base_path)
        self.base_path.mkdir(parents=True, exist_ok=True)
        
    def download_gguf_model(self, repo_id, filename, category="chat", size="7b"):
        """Download GGUF format model"""
        local_dir = self.base_path / category / size
        local_dir.mkdir(parents=True, exist_ok=True)
        
        try:
            print(f"Downloading {filename} from {repo_id}...")
            file_path = hf_hub_download(
                repo_id=repo_id,
                filename=filename,
                local_dir=local_dir,
                local_dir_use_symlinks=False,
                resume_download=True
            )
            print(f"✅ Downloaded: {file_path}")
            return file_path
            
        except Exception as e:
            print(f"❌ Failed to download {filename}: {e}")
            return None
    
    def download_full_model(self, repo_id, local_name, category="chat"):
        """Download complete model repository"""
        local_dir = self.base_path / category / local_name
        
        try:
            print(f"Downloading complete model {repo_id}...")
            snapshot_download(
                repo_id=repo_id,
                local_dir=local_dir,
                local_dir_use_symlinks=False,
                resume_download=True
            )
            print(f"✅ Downloaded complete model: {local_dir}")
            return local_dir
            
        except Exception as e:
            print(f"❌ Failed to download {repo_id}: {e}")
            return None
    
    def verify_download(self, file_path, expected_size=None):
        """Verify downloaded file integrity"""
        if not os.path.exists(file_path):
            return False
            
        file_size = os.path.getsize(file_path)
        
        if expected_size and file_size != expected_size:
            print(f"⚠️  Size mismatch: {file_size} vs expected {expected_size}")
            return False
            
        print(f"✅ File verified: {file_path} ({file_size:,} bytes)")
        return True

# Usage example
if __name__ == "__main__":
    downloader = ModelDownloader()
    
    # Download CodeLlama 13B
    downloader.download_gguf_model(
        "TheBloke/CodeLlama-13B-Instruct-GGUF",
        "codellama-13b-instruct.Q4_K_M.gguf",
        "chat",
        "specialized"
    )
```

## Direct Download Scripts

### Essential Models Download Script

```bash
#!/bin/bash
# Ashley AI Essential Models Download Script

set -e

BASE_PATH="/opt/ashley-ai/models"
HF_TOKEN="${HF_TOKEN:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

download_model() {
    local repo_id="$1"
    local filename="$2"
    local local_path="$3"
    
    log_info "Downloading $filename from $repo_id"
    
    mkdir -p "$(dirname "$local_path")"
    
    if [ -n "$HF_TOKEN" ]; then
        huggingface-cli download "$repo_id" "$filename" \
            --local-dir "$(dirname "$local_path")" \
            --token "$HF_TOKEN" \
            --local-dir-use-symlinks False
    else
        huggingface-cli download "$repo_id" "$filename" \
            --local-dir "$(dirname "$local_path")" \
            --local-dir-use-symlinks False
    fi
    
    if [ $? -eq 0 ]; then
        log_info "✅ Successfully downloaded $filename"
    else
        log_error "❌ Failed to download $filename"
        return 1
    fi
}

# Essential Chat Models
log_info "Starting Ashley AI essential models download..."

# 1. Llama 3.1 8B Instruct (General Purpose)
download_model \
    "meta-llama/Llama-3.1-8B-Instruct" \
    "consolidated.00.pth" \
    "$BASE_PATH/chat/8b/llama-3.1-8b-instruct/consolidated.00.pth"

# Alternative: GGUF version
download_model \
    "huggingfaceh4/llama-3.1-8b-instruct-gguf" \
    "llama-3.1-8b-instruct.Q4_K_M.gguf" \
    "$BASE_PATH/chat/8b/llama-3.1-8b-instruct.Q4_K_M.gguf"

# 2. Qwen2.5 7B Instruct (Multilingual)
download_model \
    "Qwen/Qwen2.5-7B-Instruct-GGUF" \
    "qwen2.5-7b-instruct.q4_k_m.gguf" \
    "$BASE_PATH/chat/7b/qwen2.5-7b-instruct.q4_k_m.gguf"

# 3. CodeLlama 13B (Programming)
download_model \
    "TheBloke/CodeLlama-13B-Instruct-GGUF" \
    "codellama-13b-instruct.Q4_K_M.gguf" \
    "$BASE_PATH/chat/specialized/codellama-13b-instruct.Q4_K_M.gguf"

# 4. Wizard Vicuna 13B Uncensored
download_model \
    "TheBloke/Wizard-Vicuna-13B-Uncensored-GGUF" \
    "wizard-vicuna-13b-uncensored.Q4_K_M.gguf" \
    "$BASE_PATH/chat/specialized/wizard-vicuna-13b-uncensored.Q4_K_M.gguf"

log_info "Essential chat models download completed!"
```

### Image Models Download Script

```bash
#!/bin/bash
# Ashley AI Image Models Download Script

BASE_PATH="/opt/ashley-ai/models/image"

log_info "Downloading image generation models..."

# 1. Stable Diffusion XL Base
download_model \
    "stabilityai/stable-diffusion-xl-base-1.0" \
    "sd_xl_base_1.0.safetensors" \
    "$BASE_PATH/stable-diffusion/sdxl-base-1.0.safetensors"

# 2. Stable Diffusion XL Turbo
download_model \
    "stabilityai/sdxl-turbo" \
    "sd_xl_turbo_1.0.safetensors" \
    "$BASE_PATH/stable-diffusion/sdxl-turbo.safetensors"

# 3. VAE for SDXL
download_model \
    "madebyollin/sdxl-vae-fp16-fix" \
    "diffusion_pytorch_model.safetensors" \
    "$BASE_PATH/stable-diffusion/sdxl-vae.safetensors"

log_info "Image models download completed!"
```

### Voice Models Download Script

```bash
#!/bin/bash
# Ashley AI Voice Models Download Script

BASE_PATH="/opt/ashley-ai/models/voice"

log_info "Downloading voice models..."

# 1. XTTS v2 (Text-to-Speech)
git clone https://huggingface.co/coqui/XTTS-v2 "$BASE_PATH/tts/xtts-v2"

# 2. Whisper Large v3 (Speech-to-Text)
download_model \
    "openai/whisper-large-v3" \
    "pytorch_model.bin" \
    "$BASE_PATH/stt/whisper-large-v3/pytorch_model.bin"

download_model \
    "openai/whisper-large-v3" \
    "config.json" \
    "$BASE_PATH/stt/whisper-large-v3/config.json"

log_info "Voice models download completed!"
```

## Model Verification

### Checksum Verification Script

```python
#!/usr/bin/env python3
"""
Model integrity verification script
"""

import hashlib
import json
from pathlib import Path

class ModelVerifier:
    def __init__(self, models_path="/opt/ashley-ai/models"):
        self.models_path = Path(models_path)
        self.checksums_file = self.models_path / "checksums.json"
        
    def calculate_sha256(self, file_path):
        """Calculate SHA256 hash of file"""
        sha256_hash = hashlib.sha256()
        
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                sha256_hash.update(chunk)
                
        return sha256_hash.hexdigest()
    
    def verify_model(self, model_path, expected_hash=None):
        """Verify model file integrity"""
        if not model_path.exists():
            return False, "File not found"
            
        calculated_hash = self.calculate_sha256(model_path)
        
        if expected_hash:
            if calculated_hash == expected_hash:
                return True, "Hash verified"
            else:
                return False, f"Hash mismatch: {calculated_hash} vs {expected_hash}"
        else:
            return True, f"Hash calculated: {calculated_hash}"
    
    def create_checksums_database(self):
        """Create checksums database for all models"""
        checksums = {}
        
        for model_file in self.models_path.rglob("*.gguf"):
            relative_path = model_file.relative_to(self.models_path)
            hash_value = self.calculate_sha256(model_file)
            checksums[str(relative_path)] = {
                "sha256": hash_value,
                "size": model_file.stat().st_size,
                "path": str(model_file)
            }
            print(f"✅ Processed: {relative_path}")
        
        with open(self.checksums_file, 'w') as f:
            json.dump(checksums, f, indent=2)
            
        print(f"📝 Checksums saved to: {self.checksums_file}")
        return checksums
    
    def verify_all_models(self):
        """Verify all models against stored checksums"""
        if not self.checksums_file.exists():
            print("❌ No checksums file found. Creating one...")
            return self.create_checksums_database()
        
        with open(self.checksums_file) as f:
            stored_checksums = json.load(f)
        
        results = {}
        for relative_path, data in stored_checksums.items():
            model_path = Path(data["path"])
            
            if model_path.exists():
                is_valid, message = self.verify_model(
                    model_path, 
                    data["sha256"]
                )
                results[relative_path] = {
                    "valid": is_valid,
                    "message": message
                }
                
                status = "✅" if is_valid else "❌"
                print(f"{status} {relative_path}: {message}")
            else:
                results[relative_path] = {
                    "valid": False,
                    "message": "File not found"
                }
                print(f"❌ {relative_path}: File not found")
        
        return results

# Usage
if __name__ == "__main__":
    verifier = ModelVerifier()
    verifier.verify_all_models()
```

## Batch Download Automation

### Complete Model Suite Installer

```python
#!/usr/bin/env python3
"""
Complete Ashley AI Model Suite Installer
Downloads all recommended models with progress tracking
"""

import os
import json
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from huggingface_hub import hf_hub_download
from tqdm import tqdm

class ModelSuiteInstaller:
    def __init__(self, base_path="/opt/ashley-ai/models", max_workers=3):
        self.base_path = Path(base_path)
        self.max_workers = max_workers
        self.download_progress = {}
        
        # Model definitions
        self.model_suite = {
            "essential_chat": [
                {
                    "name": "Llama 3.1 8B Instruct",
                    "repo_id": "huggingfaceh4/llama-3.1-8b-instruct-gguf",
                    "filename": "llama-3.1-8b-instruct.Q4_K_M.gguf",
                    "local_path": "chat/8b/llama-3.1-8b-instruct.Q4_K_M.gguf",
                    "size_gb": 5.0,
                    "priority": 1
                },
                {
                    "name": "Qwen2.5 7B Instruct", 
                    "repo_id": "Qwen/Qwen2.5-7B-Instruct-GGUF",
                    "filename": "qwen2.5-7b-instruct.q4_k_m.gguf",
                    "local_path": "chat/7b/qwen2.5-7b-instruct.q4_k_m.gguf",
                    "size_gb": 4.5,
                    "priority": 1
                }
            ],
            "coding_models": [
                {
                    "name": "CodeLlama 13B Instruct",
                    "repo_id": "TheBloke/CodeLlama-13B-Instruct-GGUF",
                    "filename": "codellama-13b-instruct.Q4_K_M.gguf",
                    "local_path": "chat/specialized/codellama-13b-instruct.Q4_K_M.gguf",
                    "size_gb": 7.8,
                    "priority": 2
                },
                {
                    "name": "WizardCoder 13B",
                    "repo_id": "TheBloke/WizardCoder-13B-V1.0-GGUF",
                    "filename": "wizardcoder-13b-v1.0.Q4_K_M.gguf", 
                    "local_path": "chat/specialized/wizardcoder-13b-v1.0.Q4_K_M.gguf",
                    "size_gb": 7.8,
                    "priority": 3
                }
            ],
            "uncensored_models": [
                {
                    "name": "Wizard Vicuna 13B Uncensored",
                    "repo_id": "TheBloke/Wizard-Vicuna-13B-Uncensored-GGUF",
                    "filename": "wizard-vicuna-13b-uncensored.Q4_K_M.gguf",
                    "local_path": "chat/specialized/wizard-vicuna-13b-uncensored.Q4_K_M.gguf",
                    "size_gb": 8.0,
                    "priority": 4
                },
                {
                    "name": "MythoMax L2 13B",
                    "repo_id": "TheBloke/MythoMax-L2-13B-GGUF",
                    "filename": "mythomax-l2-13b.Q4_K_M.gguf",
                    "local_path": "chat/specialized/mythomax-l2-13b.Q4_K_M.gguf",
                    "size_gb": 8.0,
                    "priority": 4
                }
            ]
        }
    
    def download_single_model(self, model_config):
        """Download a single model with progress tracking"""
        try:
            local_path = self.base_path / model_config["local_path"]
            local_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Check if already exists
            if local_path.exists():
                print(f"✅ Already exists: {model_config['name']}")
                return True
                
            print(f"📥 Downloading: {model_config['name']} ({model_config['size_gb']}GB)")
            
            file_path = hf_hub_download(
                repo_id=model_config["repo_id"],
                filename=model_config["filename"],
                local_dir=local_path.parent,
                local_dir_use_symlinks=False,
                resume_download=True
            )
            
            print(f"✅ Completed: {model_config['name']}")
            return True
            
        except Exception as e:
            print(f"❌ Failed: {model_config['name']} - {e}")
            return False
    
    def install_category(self, category_name, models):
        """Install all models in a category"""
        print(f"\n🚀 Installing {category_name.replace('_', ' ').title()}...")
        
        successful = 0
        total = len(models)
        
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            futures = {
                executor.submit(self.download_single_model, model): model 
                for model in models
            }
            
            for future in as_completed(futures):
                if future.result():
                    successful += 1
        
        print(f"📊 {category_name}: {successful}/{total} models installed")
        return successful == total
    
    def install_full_suite(self, categories=None):
        """Install complete model suite"""
        if categories is None:
            categories = list(self.model_suite.keys())
        
        print("🎯 Ashley AI Model Suite Installation")
        print("=" * 50)
        
        total_size = 0
        for category in categories:
            for model in self.model_suite.get(category, []):
                total_size += model["size_gb"]
        
        print(f"📦 Total download size: ~{total_size:.1f}GB")
        print(f"💾 Installation path: {self.base_path}")
        
        # Check available space
        available_space = self.get_available_space()
        if available_space < total_size:
            print(f"❌ Insufficient disk space: {available_space:.1f}GB available, {total_size:.1f}GB needed")
            return False
        
        # Install by category
        results = {}
        for category in categories:
            if category in self.model_suite:
                results[category] = self.install_category(
                    category, 
                    self.model_suite[category]
                )
        
        # Summary
        print("\n📋 Installation Summary:")
        print("=" * 30)
        for category, success in results.items():
            status = "✅ Success" if success else "❌ Failed"
            print(f"{category.replace('_', ' ').title()}: {status}")
        
        return all(results.values())
    
    def get_available_space(self):
        """Get available disk space in GB"""
        statvfs = os.statvfs(self.base_path)
        available_bytes = statvfs.f_frsize * statvfs.f_bavail
        return available_bytes / (1024**3)  # Convert to GB

# Command line interface
if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Ashley AI Model Suite Installer")
    parser.add_argument("--category", choices=["essential_chat", "coding_models", "uncensored_models"], 
                       help="Install specific category only")
    parser.add_argument("--path", default="/opt/ashley-ai/models", 
                       help="Installation path")
    parser.add_argument("--workers", type=int, default=3,
                       help="Number of concurrent downloads")
    
    args = parser.parse_args()
    
    installer = ModelSuiteInstaller(args.path, args.workers)
    
    if args.category:
        installer.install_category(args.category, installer.model_suite[args.category])
    else:
        installer.install_full_suite()
```

## Storage Management

### Disk Space Monitor

```python
#!/usr/bin/env python3
"""
Storage monitoring and cleanup for model management
"""

import os
import shutil
from pathlib import Path
import json
from datetime import datetime

class ModelStorageManager:
    def __init__(self, models_path="/opt/ashley-ai/models"):
        self.models_path = Path(models_path)
        
    def get_storage_stats(self):
        """Get detailed storage statistics"""
        stats = {
            "total_models": 0,
            "total_size_gb": 0,
            "categories": {},
            "largest_models": [],
            "disk_usage": {}
        }
        
        # Get disk usage
        total, used, free = shutil.disk_usage(self.models_path)
        stats["disk_usage"] = {
            "total_gb": total / (1024**3),
            "used_gb": used / (1024**3), 
            "free_gb": free / (1024**3),
            "usage_percent": (used / total) * 100
        }
        
        # Analyze model files
        model_files = []
        for model_file in self.models_path.rglob("*.gguf"):
            size_gb = model_file.stat().st_size / (1024**3)
            category = model_file.parts[-3] if len(model_file.parts) > 2 else "unknown"
            
            model_files.append({
                "name": model_file.name,
                "path": str(model_file),
                "size_gb": size_gb,
                "category": category,
                "last_accessed": datetime.fromtimestamp(model_file.stat().st_atime)
            })
            
            stats["total_models"] += 1
            stats["total_size_gb"] += size_gb
            
            if category not in stats["categories"]:
                stats["categories"][category] = {"count": 0, "size_gb": 0}
            stats["categories"][category]["count"] += 1
            stats["categories"][category]["size_gb"] += size_gb
        
        # Sort by size for largest models
        stats["largest_models"] = sorted(
            model_files, 
            key=lambda x: x["size_gb"], 
            reverse=True
        )[:10]
        
        return stats
    
    def cleanup_unused_models(self, days_unused=30):
        """Remove models not accessed in specified days"""
        cutoff_date = datetime.now().timestamp() - (days_unused * 24 * 3600)
        removed_models = []
        
        for model_file in self.models_path.rglob("*.gguf"):
            if model_file.stat().st_atime < cutoff_date:
                size_gb = model_file.stat().st_size / (1024**3)
                removed_models.append({
                    "name": model_file.name,
                    "size_gb": size_gb
                })
                model_file.unlink()
                print(f"🗑️  Removed unused model: {model_file.name}")
        
        return removed_models
    
    def generate_storage_report(self):
        """Generate comprehensive storage report"""
        stats = self.get_storage_stats()
        
        report = f"""
📊 Ashley AI Storage Report
{'='*50}
Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

💾 Disk Usage:
  Total Space: {stats['disk_usage']['total_gb']:.1f}GB
  Used Space:  {stats['disk_usage']['used_gb']:.1f}GB  
  Free Space:  {stats['disk_usage']['free_gb']:.1f}GB
  Usage:       {stats['disk_usage']['usage_percent']:.1f}%

📦 Model Statistics:
  Total Models: {stats['total_models']}
  Total Size:   {stats['total_size_gb']:.1f}GB

📁 By Category:
"""
        
        for category, data in stats['categories'].items():
            report += f"  {category.title()}: {data['count']} models, {data['size_gb']:.1f}GB\n"
        
        report += "\n🏆 Largest Models:\n"
        for model in stats['largest_models'][:5]:
            report += f"  {model['name']}: {model['size_gb']:.1f}GB\n"
        
        return report

# Usage
if __name__ == "__main__":
    manager = ModelStorageManager()
    print(manager.generate_storage_report())
```

## Download Troubleshooting

### Common Issues and Solutions

#### Issue 1: Download Interruptions
```python
def resume_interrupted_download(repo_id, filename, local_path):
    """Resume interrupted download with retry logic"""
    max_retries = 3
    retry_count = 0
    
    while retry_count < max_retries:
        try:
            file_path = hf_hub_download(
                repo_id=repo_id,
                filename=filename,
                local_dir=local_path,
                resume_download=True,  # Key parameter
                local_dir_use_symlinks=False
            )
            return file_path
            
        except Exception as e:
            retry_count += 1
            print(f"Retry {retry_count}/{max_retries}: {e}")
            time.sleep(5 * retry_count)  # Exponential backoff
    
    raise Exception(f"Failed after {max_retries} retries")
```

#### Issue 2: Authentication Problems
```bash
# Clear and reset Hugging Face authentication
huggingface-cli logout
rm -f ~/.cache/huggingface/token
huggingface-cli login

# Or set token directly
export HF_TOKEN="your_token_here"
```

#### Issue 3: Disk Space Issues
```python
def check_space_before_download(model_size_gb, target_path):
    """Check available space before starting download"""
    total, used, free = shutil.disk_usage(target_path)
    free_gb = free / (1024**3)
    
    if free_gb < model_size_gb * 1.1:  # 10% buffer
        raise Exception(f"Insufficient space: {free_gb:.1f}GB available, {model_size_gb:.1f}GB needed")
    
    return True
```

#### Issue 4: Network Connectivity
```python
def test_connectivity():
    """Test connection to Hugging Face Hub"""
    import requests
    
    try:
        response = requests.get("https://huggingface.co", timeout=10)
        if response.status_code == 200:
            print("✅ Connection to Hugging Face successful")
            return True
    except:
        print("❌ Cannot connect to Hugging Face")
        return False
```

## Model Registry Setup

### Model Registry Configuration

```python
#!/usr/bin/env python3
"""
Ashley AI Model Registry
Manages model metadata, versions, and configurations
"""

import json
import yaml
from pathlib import Path
from typing import Dict, List, Optional

class ModelRegistry:
    def __init__(self, registry_path="/opt/ashley-ai/models/registry.json"):
        self.registry_path = Path(registry_path)
        self.registry = self.load_registry()
    
    def load_registry(self) -> Dict:
        """Load model registry from file"""
        if self.registry_path.exists():
            with open(self.registry_path) as f:
                return json.load(f)
        return {"models": {}, "configurations": {}, "metadata": {}}
    
    def save_registry(self):
        """Save registry to file"""
        self.registry_path.parent.mkdir(parents=True, exist_ok=True)
        with open(self.registry_path, 'w') as f:
            json.dump(self.registry, f, indent=2)
    
    def register_model(self, 
                      model_id: str,
                      model_path: str,
                      model_type: str,
                      size: str,
                      quantization: str,
                      use_cases: List[str],
                      metadata: Optional[Dict] = None):
        """Register a new model"""
        
        self.registry["models"][model_id] = {
            "path": model_path,
            "type": model_type,
            "size": size,
            "quantization": quantization,
            "use_cases": use_cases,
            "metadata": metadata or {},
            "registered_at": str(datetime.now()),
            "status": "available"
        }
        
        self.save_registry()
        print(f"✅ Registered model: {model_id}")
    
    def get_models_by_use_case(self, use_case: str) -> List[Dict]:
        """Get all models suitable for a use case"""
        matching_models = []
        
        for model_id, config in self.registry["models"].items():
            if use_case in config["use_cases"]:
                matching_models.append({
                    "id": model_id,
                    **config
                })
        
        return matching_models
    
    def recommend_model(self, 
                       use_case: str,
                       max_vram_gb: float = 8.0,
                       prefer_speed: bool = False) -> Optional[Dict]:
        """Recommend best model for use case and constraints"""
        
        candidates = self.get_models_by_use_case(use_case)
        
        # Filter by VRAM constraint
        suitable_models = []
        for model in candidates:
            estimated_vram = self.estimate_vram_usage(
                model["size"], 
                model["quantization"]
            )
            if estimated_vram <= max_vram_gb:
                model["estimated_vram"] = estimated_vram
                suitable_models.append(model)
        
        if not suitable_models:
            return None
        
        # Sort by preference
        if prefer_speed:
            # Prefer smaller, faster models
            suitable_models.sort(key=lambda x: x["estimated_vram"])
        else:
            # Prefer larger, higher quality models
            suitable_models.sort(key=lambda x: x["estimated_vram"], reverse=True)
        
        return suitable_models[0]
    
    def estimate_vram_usage(self, size: str, quantization: str) -> float:
        """Estimate VRAM usage for model"""
        
        size_multiplier = {
            "7b": 7,
            "8b": 8,
            "13b": 13
        }.get(size.lower(), 7)
        
        quantization_factor = {
            "fp16": 2.0,
            "q8_0": 1.0,
            "q4_k_m": 0.6,
            "q4_0": 0.5
        }.get(quantization.lower(), 0.6)
        
        return size_multiplier * quantization_factor

# Initialize registry with downloaded models
def initialize_registry():
    """Initialize registry with standard model configurations"""
    
    registry = ModelRegistry()
    
    # Register essential models
    models_to_register = [
        {
            "model_id": "llama_3_1_8b_instruct",
            "model_path": "chat/8b/llama-3.1-8b-instruct.Q4_K_M.gguf",
            "model_type": "chat",
            "size": "8b",
            "quantization": "q4_k_m",
            "use_cases": ["general", "conversation", "reasoning"],
            "metadata": {"license": "llama3.1", "languages": ["en"]}
        },
        {
            "model_id": "codellama_13b_instruct",
            "model_path": "chat/specialized/codellama-13b-instruct.Q4_K_M.gguf",
            "model_type": "chat",
            "size": "13b", 
            "quantization": "q4_k_m",
            "use_cases": ["coding", "programming", "development"],
            "metadata": {"license": "llama2", "specialty": "programming"}
        },
        {
            "model_id": "qwen2_5_7b_instruct",
            "model_path": "chat/7b/qwen2.5-7b-instruct.q4_k_m.gguf",
            "model_type": "chat",
            "size": "7b",
            "quantization": "q4_k_m", 
            "use_cases": ["general", "multilingual", "math"],
            "metadata": {"license": "apache2", "languages": ["en", "zh", "es", "fr", "de"]}
        }
    ]
    
    for model_config in models_to_register:
        registry.register_model(**model_config)
    
    return registry

if __name__ == "__main__":
    # Initialize registry
    registry = initialize_registry()
    
    # Example: Find best coding model for 8GB VRAM
    recommendation = registry.recommend_model(
        use_case="coding",
        max_vram_gb=8.0,
        prefer_speed=False
    )
    
    if recommendation:
        print(f"Recommended model: {recommendation['id']}")
        print(f"Estimated VRAM: {recommendation['estimated_vram']:.1f}GB")
```

## Next Steps

In **Tutorial 8D**, we'll cover:
- Code integration and configuration
- Model loading optimization  
- API endpoint setup
- Performance tuning

This comprehensive download and installation guide ensures you have all the tools and scripts needed to efficiently manage your Ashley AI model collection.