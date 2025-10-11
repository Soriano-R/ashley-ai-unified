# Tutorial 7: Quickpod GPU Server Setup for Ashley AI

## Table of Contents
1. [Introduction](#introduction)
2. [Understanding Quickpod](#understanding-quickpod)
3. [GPU Requirements Analysis](#gpu-requirements-analysis)
4. [Account Setup and Verification](#account-setup-and-verification)
5. [Choosing the Right GPU Server](#choosing-the-right-gpu-server)
6. [Server Rental and Configuration](#server-rental-and-configuration)
7. [Environment Setup](#environment-setup)
8. [Ashley AI Installation](#ashley-ai-installation)
9. [Remote Access Configuration](#remote-access-configuration)
10. [Performance Optimization](#performance-optimization)
11. [Monitoring and Maintenance](#monitoring-and-maintenance)
12. [Cost Management](#cost-management)
13. [Troubleshooting](#troubleshooting)
14. [Security Best Practices](#security-best-practices)

## Introduction

This tutorial provides comprehensive instructions for setting up a GPU server from Quickpod to run Ashley AI with enhanced performance for local model inference, image generation, and other GPU-intensive tasks.

### What You'll Learn
- How to evaluate and select appropriate GPU configurations
- Complete Quickpod account setup and server rental process
- Environment configuration for AI workloads
- Remote development setup with VS Code and Jupyter
- Performance optimization and cost management strategies

### Prerequisites
- Completed Tutorial 1-5 (Ashley AI setup and understanding)
- Basic understanding of Linux command line
- Credit card or payment method for server rental
- Stable internet connection for remote development

## Understanding Quickpod

### What is Quickpod?
Quickpod is a cloud GPU rental service that provides on-demand access to high-performance graphics cards for machine learning, AI development, and computational tasks.

### Key Features
- **Flexible Rental**: Pay-per-hour or extended rental periods
- **GPU Variety**: RTX 3090, RTX 4090, A100, H100, and more
- **Pre-configured Environments**: Docker containers with ML frameworks
- **SSH Access**: Full root access to your rented server
- **Jupyter Integration**: Browser-based development environment

### Pricing Model
- Hourly rates starting from $0.50/hour for RTX 3090
- Premium GPUs (A100, H100) range from $2-8/hour
- Storage fees for persistent data
- Network usage typically included

## GPU Requirements Analysis

### Ashley AI GPU Needs Assessment

#### Memory Requirements
```python
# Estimated VRAM usage for different Ashley AI components:

MODEL_MEMORY_REQUIREMENTS = {
    "llama_3_8b_q4": "6-8 GB VRAM",     # Primary chat model
    "qwen_7b_q4": "5-7 GB VRAM",        # Alternative chat model
    "stable_diffusion": "4-6 GB VRAM",  # Image generation
    "whisper_large": "2-3 GB VRAM",     # Speech recognition
    "embedding_model": "1-2 GB VRAM",   # Text embeddings
}

# Recommended minimum: 12GB VRAM
# Optimal: 16-24GB VRAM for multiple concurrent models
```

#### Performance Considerations
- **RTX 3090**: 24GB VRAM, excellent for development and testing
- **RTX 4090**: 24GB VRAM, better performance than 3090
- **A100**: 40GB/80GB VRAM, professional-grade for production
- **H100**: 80GB VRAM, cutting-edge performance (expensive)

### Recommended Configurations

#### Budget Setup (Development)
```yaml
GPU: RTX 3090 (24GB)
CPU: 8+ cores
RAM: 32GB
Storage: 100GB SSD
Estimated Cost: $0.80-1.20/hour
```

#### Professional Setup (Production)
```yaml
GPU: RTX 4090 (24GB) or A100 (40GB)
CPU: 16+ cores  
RAM: 64GB
Storage: 200GB SSD
Estimated Cost: $1.50-3.00/hour
```

#### Enterprise Setup (High Performance)
```yaml
GPU: A100 (80GB) or H100
CPU: 32+ cores
RAM: 128GB
Storage: 500GB SSD
Estimated Cost: $4.00-8.00/hour
```

## Account Setup and Verification

### Step 1: Create Quickpod Account

1. **Visit Quickpod Website**
   ```bash
   # Open your browser and navigate to:
   https://www.quickpod.ai
   ```

2. **Register Account**
   - Click "Sign Up" 
   - Enter email address and create password
   - Verify email address from confirmation email
   - Complete profile information

3. **Payment Method Setup**
   - Navigate to "Billing" section
   - Add credit card or payment method
   - Set up billing alerts (recommended)

### Step 2: Account Verification

1. **Identity Verification**
   - Some GPU tiers require ID verification
   - Upload government-issued ID if prompted
   - Wait for verification (usually 24-48 hours)

2. **Credit Limits**
   - New accounts typically have spending limits
   - Contact support to increase limits if needed
   - Consider starting with lower-tier GPUs initially

## Choosing the Right GPU Server

### Step 1: Browse Available GPUs

1. **Access GPU Marketplace**
   ```bash
   # Log into Quickpod dashboard
   # Navigate to "Browse GPUs" or "Marketplace"
   ```

2. **Filter Options**
   - GPU Type (RTX 3090, 4090, A100, etc.)
   - VRAM Amount (16GB, 24GB, 40GB, 80GB)
   - Price Range
   - Availability Region

### Step 2: Evaluate Server Specifications

#### Recommended Selection Criteria
```python
def evaluate_gpu_server(server_spec):
    """
    Evaluation criteria for GPU server selection
    """
    criteria = {
        "gpu_vram": server_spec["vram"] >= 16,  # Minimum 16GB
        "cpu_cores": server_spec["cpu_cores"] >= 8,  # Minimum 8 cores
        "ram_gb": server_spec["ram"] >= 32,  # Minimum 32GB RAM
        "storage_gb": server_spec["storage"] >= 100,  # Minimum 100GB
        "network_speed": server_spec["network"] >= 1000,  # 1Gbps+
        "price_per_hour": server_spec["price"] <= 2.0,  # Budget constraint
    }
    
    score = sum(criteria.values()) / len(criteria)
    return score > 0.8  # 80% criteria met
```

### Step 3: Check Availability and Pricing

1. **Real-time Availability**
   - GPU availability changes frequently
   - Consider multiple regions for better availability
   - Set up availability alerts for preferred configurations

2. **Pricing Comparison**
   ```bash
   # Example pricing analysis (as of 2025):
   RTX 3090 (24GB): $0.80-1.20/hour
   RTX 4090 (24GB): $1.20-1.80/hour  
   A100 (40GB): $2.50-4.00/hour
   A100 (80GB): $4.00-6.00/hour
   H100 (80GB): $6.00-10.00/hour
   ```

## Server Rental and Configuration

### Step 1: Rent GPU Server

1. **Select Configuration**
   ```yaml
   # Example rental configuration:
   GPU: RTX 4090 24GB
   CPU: 16 cores Intel Xeon
   RAM: 64GB DDR4
   Storage: 200GB NVMe SSD
   Operating System: Ubuntu 22.04 LTS
   ```

2. **Configure Rental Duration**
   - Hourly: Pay as you go
   - Daily: Often 10-20% discount
   - Weekly: 20-30% discount
   - Monthly: 30-50% discount

3. **Complete Rental Process**
   - Review configuration and pricing
   - Accept terms of service
   - Confirm payment method
   - Submit rental request

### Step 2: Server Provisioning

1. **Wait for Provisioning**
   - Typically takes 2-10 minutes
   - Receive email notification when ready
   - Note down server IP address and credentials

2. **Initial Connection Test**
   ```bash
   # Test SSH connection (replace with your server IP)
   ssh root@YOUR_SERVER_IP
   
   # If successful, you should see Ubuntu welcome message
   ```

## Environment Setup

### Step 1: System Updates and Dependencies

```bash
# Connect to your server
ssh root@YOUR_SERVER_IP

# Update system packages
apt update && apt upgrade -y

# Install essential tools
apt install -y curl wget git vim htop nvtop tree unzip

# Install Python and pip
apt install -y python3 python3-pip python3-venv

# Install Node.js and npm
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verify installations
python3 --version
node --version
npm --version
nvidia-smi  # Check GPU status
```

### Step 2: NVIDIA Drivers and CUDA

```bash
# Check current GPU and driver status
nvidia-smi

# Install CUDA Toolkit (if not already installed)
wget https://developer.download.nvidia.com/compute/cuda/12.2.0/local_installers/cuda_12.2.0_535.54.03_linux.run
chmod +x cuda_12.2.0_535.54.03_linux.run
./cuda_12.2.0_535.54.03_linux.run

# Add CUDA to PATH
echo 'export PATH="/usr/local/cuda/bin:$PATH"' >> ~/.bashrc
echo 'export LD_LIBRARY_PATH="/usr/local/cuda/lib64:$LD_LIBRARY_PATH"' >> ~/.bashrc
source ~/.bashrc

# Verify CUDA installation
nvcc --version
```

### Step 3: Docker Setup (Optional but Recommended)

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install NVIDIA Container Toolkit
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | tee /etc/apt/sources-list.d/nvidia-docker.list

apt update && apt install -y nvidia-docker2
systemctl restart docker

# Test GPU access in Docker
docker run --rm --gpus all nvidia/cuda:12.2-base-ubuntu22.04 nvidia-smi
```

## Ashley AI Installation

### Step 1: Clone Repository

```bash
# Create working directory
mkdir -p /opt/ashley-ai
cd /opt/ashley-ai

# Clone Ashley AI repository
git clone https://github.com/Soriano-R/ashley-ai-unified.git
cd ashley-ai-unified

# Create environment file
cp .env.example .env
```

### Step 2: Environment Configuration

```bash
# Edit environment variables
vim .env

# Add your API keys and configuration:
```

```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4

# Server Configuration
NEXT_PUBLIC_API_URL=http://YOUR_SERVER_IP:8001
PYTHON_SERVICE_HOST=0.0.0.0
PYTHON_SERVICE_PORT=8001

# Local Model Configuration (for GPU inference)
USE_LOCAL_MODELS=true
LOCAL_MODEL_PATH=/opt/ashley-ai/models
GPU_MEMORY_FRACTION=0.8

# Security
SECRET_KEY=your_secret_key_here
ALLOWED_HOSTS=*
```

### Step 3: Python Service Setup

```bash
# Navigate to Python service directory
cd /opt/ashley-ai/ashley-ai-unified/python-service

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Install additional GPU-specific packages
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
pip install accelerate transformers[torch] diffusers

# Download models (optional - for local inference)
mkdir -p /opt/ashley-ai/models
cd /opt/ashley-ai/models

# Download Llama 3.1 8B model (example)
wget https://huggingface.co/microsoft/DialoGPT-medium/resolve/main/pytorch_model.bin
```

### Step 4: Frontend Setup

```bash
# Navigate to project root
cd /opt/ashley-ai/ashley-ai-unified

# Install Node.js dependencies
npm install

# Build frontend for production
npm run build
```

### Step 5: Start Services

```bash
# Terminal 1: Start Python service
cd /opt/ashley-ai/ashley-ai-unified/python-service
source venv/bin/activate
python main.py

# Terminal 2: Start Next.js frontend (in development)
cd /opt/ashley-ai/ashley-ai-unified
npm run dev

# For production, use PM2:
npm install -g pm2
pm2 start ecosystem.config.js
```

## Remote Access Configuration

### Step 1: SSH Key Setup

```bash
# On your local machine, generate SSH key pair
ssh-keygen -t rsa -b 4096 -c "your_email@example.com"

# Copy public key to server
ssh-copy-id root@YOUR_SERVER_IP

# Test passwordless login
ssh root@YOUR_SERVER_IP
```

### Step 2: VS Code Remote Development

1. **Install VS Code Extensions**
   - Remote - SSH
   - Remote - SSH: Editing Configuration Files
   - Python
   - Jupyter

2. **Configure SSH Connection**
   ```bash
   # On your local machine, edit SSH config
   vim ~/.ssh/config
   
   # Add server configuration:
   Host quickpod-ashley
       HostName YOUR_SERVER_IP
       User root
       Port 22
       IdentityFile ~/.ssh/id_rsa
   ```

3. **Connect via VS Code**
   - Open VS Code
   - Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
   - Type "Remote-SSH: Connect to Host"
   - Select your configured host

### Step 3: Jupyter Notebook Setup

```bash
# On the server, install Jupyter
pip install jupyter jupyterlab ipywidgets

# Generate Jupyter config
jupyter notebook --generate-config

# Set up password protection
jupyter notebook password

# Start Jupyter with GPU access
jupyter lab --ip=0.0.0.0 --port=8888 --no-browser --allow-root

# Access via browser at: http://YOUR_SERVER_IP:8888
```

### Step 4: Port Forwarding

```bash
# Forward ports for local development
ssh -L 3000:localhost:3000 -L 8001:localhost:8001 -L 8888:localhost:8888 root@YOUR_SERVER_IP

# Now access services locally:
# Ashley AI Frontend: http://localhost:3000
# Python API: http://localhost:8001
# Jupyter Lab: http://localhost:8888
```

## Performance Optimization

### Step 1: GPU Memory Management

```python
# Add to your Python service configuration
import torch

# Optimize GPU memory usage
def optimize_gpu_memory():
    if torch.cuda.is_available():
        # Clear cache
        torch.cuda.empty_cache()
        
        # Set memory fraction
        torch.cuda.set_per_process_memory_fraction(0.8)
        
        # Enable memory-efficient attention
        torch.backends.cuda.enable_flash_sdp(True)
        
        print(f"GPU Memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f}GB")
        print(f"GPU Memory Used: {torch.cuda.memory_allocated() / 1e9:.1f}GB")

# Call during initialization
optimize_gpu_memory()
```

### Step 2: Model Loading Optimization

```python
# Efficient model loading configuration
MODEL_CONFIG = {
    "torch_dtype": torch.float16,  # Use half precision
    "device_map": "auto",          # Auto device mapping
    "low_cpu_mem_usage": True,     # Reduce CPU memory usage
    "load_in_8bit": False,         # Set to True for 8-bit quantization
    "load_in_4bit": True,          # 4-bit quantization for memory savings
}

# Example model loading
from transformers import AutoModelForCausalLM, AutoTokenizer

def load_model_optimized(model_name):
    model = AutoModelForCausalLM.from_pretrained(
        model_name,
        **MODEL_CONFIG
    )
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    return model, tokenizer
```

### Step 3: System Monitoring

```bash
# Install monitoring tools
pip install gpustat psutil

# Create monitoring script
cat > /opt/ashley-ai/monitor.py << 'EOF'
#!/usr/bin/env python3
import time
import psutil
import subprocess
import json
from datetime import datetime

def get_gpu_stats():
    try:
        result = subprocess.run(['nvidia-smi', '--query-gpu=utilization.gpu,memory.used,memory.total,temperature.gpu', '--format=csv,noheader,nounits'], 
                              capture_output=True, text=True)
        if result.returncode == 0:
            line = result.stdout.strip()
            gpu_util, mem_used, mem_total, temp = line.split(', ')
            return {
                'gpu_utilization': int(gpu_util),
                'memory_used_mb': int(mem_used),
                'memory_total_mb': int(mem_total),
                'temperature_c': int(temp)
            }
    except:
        pass
    return {}

def monitor_system():
    while True:
        stats = {
            'timestamp': datetime.now().isoformat(),
            'cpu_percent': psutil.cpu_percent(interval=1),
            'memory_percent': psutil.virtual_memory().percent,
            'disk_percent': psutil.disk_usage('/').percent,
            'gpu_stats': get_gpu_stats()
        }
        
        print(json.dumps(stats, indent=2))
        time.sleep(30)

if __name__ == "__main__":
    monitor_system()
EOF

# Make executable and run
chmod +x /opt/ashley-ai/monitor.py
python3 /opt/ashley-ai/monitor.py
```

## Monitoring and Maintenance

### Step 1: Automated Monitoring Setup

```bash
# Create monitoring dashboard script
cat > /opt/ashley-ai/dashboard.sh << 'EOF'
#!/bin/bash

echo "=== Ashley AI Server Status ==="
echo "Date: $(date)"
echo "Uptime: $(uptime)"
echo ""

echo "=== GPU Status ==="
nvidia-smi --query-gpu=name,memory.used,memory.total,utilization.gpu,temperature.gpu --format=csv

echo ""
echo "=== CPU and Memory ==="
echo "CPU Usage: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')%"
echo "Memory Usage: $(free | grep Mem | awk '{printf("%.1f%%", $3/$2 * 100.0)}')"

echo ""
echo "=== Disk Usage ==="
df -h | grep -E "^/dev"

echo ""
echo "=== Active Processes ==="
ps aux | grep -E "(python|node)" | grep -v grep | head -10

echo ""
echo "=== Network Connections ==="
netstat -tuln | grep -E ":(3000|8001|8888)"
EOF

chmod +x /opt/ashley-ai/dashboard.sh

# Run dashboard
./dashboard.sh
```

### Step 2: Log Management

```bash
# Create log directory
mkdir -p /opt/ashley-ai/logs

# Set up log rotation
cat > /etc/logrotate.d/ashley-ai << 'EOF'
/opt/ashley-ai/logs/*.log {
    daily
    missingok
    rotate 7
    compress
    notifempty
    create 644 root root
}
EOF

# Configure application logging
export ASHLEY_LOG_DIR="/opt/ashley-ai/logs"
export ASHLEY_LOG_LEVEL="INFO"
```

### Step 3: Backup Strategy

```bash
# Create backup script
cat > /opt/ashley-ai/backup.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/opt/ashley-ai/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup configuration files
tar -czf "$BACKUP_DIR/config_$DATE.tar.gz" \
    /opt/ashley-ai/ashley-ai-unified/.env \
    /opt/ashley-ai/ashley-ai-unified/package.json \
    /opt/ashley-ai/ashley-ai-unified/python-service/requirements.txt

# Backup custom models (if any)
if [ -d "/opt/ashley-ai/models" ]; then
    tar -czf "$BACKUP_DIR/models_$DATE.tar.gz" /opt/ashley-ai/models
fi

# Cleanup old backups (keep last 7 days)
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

chmod +x /opt/ashley-ai/backup.sh

# Schedule daily backups
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/ashley-ai/backup.sh") | crontab -
```

## Cost Management

### Step 1: Usage Tracking

```python
# Create cost tracking script
cat > /opt/ashley-ai/cost_tracker.py << 'EOF'
#!/usr/bin/env python3
import time
import json
from datetime import datetime, timedelta

class CostTracker:
    def __init__(self, hourly_rate=1.50):
        self.hourly_rate = hourly_rate
        self.start_time = datetime.now()
        self.usage_log = []
    
    def log_usage(self, activity):
        entry = {
            'timestamp': datetime.now().isoformat(),
            'activity': activity,
            'runtime_hours': self.get_runtime_hours(),
            'estimated_cost': self.get_current_cost()
        }
        self.usage_log.append(entry)
        
    def get_runtime_hours(self):
        return (datetime.now() - self.start_time).total_seconds() / 3600
    
    def get_current_cost(self):
        return self.get_runtime_hours() * self.hourly_rate
    
    def generate_report(self):
        runtime = self.get_runtime_hours()
        cost = self.get_current_cost()
        
        report = f"""
=== Cost Report ===
Server Start Time: {self.start_time}
Current Runtime: {runtime:.2f} hours
Hourly Rate: ${self.hourly_rate}
Current Cost: ${cost:.2f}

Daily Projection: ${cost * 24 / runtime if runtime > 0 else 0:.2f}
Weekly Projection: ${cost * 168 / runtime if runtime > 0 else 0:.2f}
Monthly Projection: ${cost * 720 / runtime if runtime > 0 else 0:.2f}
"""
        return report

# Initialize tracker
tracker = CostTracker(hourly_rate=1.50)  # Adjust your rate
tracker.log_usage("Server started")

print(tracker.generate_report())
EOF

python3 /opt/ashley-ai/cost_tracker.py
```

### Step 2: Auto-shutdown Configuration

```bash
# Create auto-shutdown script for idle detection
cat > /opt/ashley-ai/auto_shutdown.sh << 'EOF'
#!/bin/bash

IDLE_TIME_MINUTES=60  # Shutdown after 60 minutes of inactivity
CHECK_INTERVAL=300    # Check every 5 minutes

while true; do
    # Check GPU utilization
    GPU_UTIL=$(nvidia-smi --query-gpu=utilization.gpu --format=csv,noheader,nounits)
    
    # Check active processes
    ACTIVE_PROCESSES=$(ps aux | grep -E "(python.*main\.py|node.*next)" | grep -v grep | wc -l)
    
    # Check if system is idle
    if [ "$GPU_UTIL" -lt 5 ] && [ "$ACTIVE_PROCESSES" -eq 0 ]; then
        echo "System appears idle. GPU: ${GPU_UTIL}%, Processes: ${ACTIVE_PROCESSES}"
        
        # Check idle time
        IDLE_MINUTES=$(who -u | awk '{print $6}' | head -1 | tr -d '()')
        
        if [ "$IDLE_MINUTES" -gt "$IDLE_TIME_MINUTES" ]; then
            echo "Shutting down due to inactivity..."
            # Add your shutdown command here
            # shutdown -h now
        fi
    fi
    
    sleep $CHECK_INTERVAL
done
EOF

chmod +x /opt/ashley-ai/auto_shutdown.sh

# Run in background (optional)
# nohup /opt/ashley-ai/auto_shutdown.sh &
```

### Step 3: Budget Alerts

```python
# Email alert system for budget monitoring
cat > /opt/ashley-ai/budget_alert.py << 'EOF'
#!/usr/bin/env python3
import smtplib
from email.mime.text import MIMEText
from datetime import datetime

class BudgetMonitor:
    def __init__(self, daily_budget=50.0, email_config=None):
        self.daily_budget = daily_budget
        self.email_config = email_config or {}
        
    def check_budget(self, current_cost):
        percentage = (current_cost / self.daily_budget) * 100
        
        if percentage >= 80:
            self.send_alert(f"Budget Alert: {percentage:.1f}% of daily budget used (${current_cost:.2f}/${self.daily_budget:.2f})")
            
    def send_alert(self, message):
        if not self.email_config:
            print(f"BUDGET ALERT: {message}")
            return
            
        # Email implementation
        msg = MIMEText(message)
        msg['Subject'] = 'Ashley AI Budget Alert'
        msg['From'] = self.email_config['from']
        msg['To'] = self.email_config['to']
        
        try:
            with smtplib.SMTP(self.email_config['smtp_server'], 587) as server:
                server.starttls()
                server.login(self.email_config['username'], self.email_config['password'])
                server.send_message(msg)
        except Exception as e:
            print(f"Failed to send alert: {e}")

# Usage example
monitor = BudgetMonitor(daily_budget=50.0)
monitor.check_budget(40.0)  # Example current cost
EOF
```

## Troubleshooting

### Common Issues and Solutions

#### Issue 1: GPU Not Detected
```bash
# Check GPU status
nvidia-smi

# If command not found, install drivers
apt update
apt install nvidia-driver-535

# Reboot server
reboot

# Verify after reboot
nvidia-smi
```

#### Issue 2: CUDA Out of Memory
```python
# Solution: Implement memory management
import torch

def clear_gpu_memory():
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        torch.cuda.synchronize()

# Add to your model loading code
def load_model_with_memory_check(model_path):
    try:
        clear_gpu_memory()
        model = load_model(model_path)
        return model
    except RuntimeError as e:
        if "out of memory" in str(e):
            print("GPU memory full, trying with reduced batch size...")
            clear_gpu_memory()
            # Implement reduced memory loading
        raise e
```

#### Issue 3: Connection Timeouts
```bash
# Check firewall settings
ufw status

# Open required ports
ufw allow 22    # SSH
ufw allow 3000  # Next.js
ufw allow 8001  # Python API
ufw allow 8888  # Jupyter

# Check service status
systemctl status networking
systemctl status ssh
```

#### Issue 4: Model Loading Failures
```python
# Robust model loading with fallbacks
def load_model_robust(model_name, fallback_models=None):
    fallback_models = fallback_models or []
    
    for model in [model_name] + fallback_models:
        try:
            print(f"Attempting to load {model}...")
            return load_model(model)
        except Exception as e:
            print(f"Failed to load {model}: {e}")
            continue
    
    raise Exception("All model loading attempts failed")
```

#### Issue 5: Performance Issues
```bash
# Check system resources
htop
nvidia-smi -l 1
iotop

# Optimize system settings
echo 'vm.swappiness=10' >> /etc/sysctl.conf
echo 'net.core.rmem_max=134217728' >> /etc/sysctl.conf
sysctl -p

# Check for memory leaks
ps aux --sort=-%mem | head -10
```

## Security Best Practices

### Step 1: SSH Hardening

```bash
# Edit SSH configuration
vim /etc/ssh/sshd_config

# Recommended settings:
# Port 2222                    # Change default port
# PermitRootLogin yes          # Keep as needed
# PasswordAuthentication no    # Disable password auth
# PubkeyAuthentication yes     # Enable key auth
# MaxAuthTries 3              # Limit auth attempts

# Restart SSH service
systemctl restart ssh
```

### Step 2: Firewall Configuration

```bash
# Enable UFW firewall
ufw enable

# Default policies
ufw default deny incoming
ufw default allow outgoing

# Allow specific services
ufw allow 2222/tcp  # SSH (if changed port)
ufw allow from YOUR_IP_ADDRESS to any port 3000  # Next.js (restrict to your IP)
ufw allow from YOUR_IP_ADDRESS to any port 8001  # API
ufw allow from YOUR_IP_ADDRESS to any port 8888  # Jupyter

# Check rules
ufw status verbose
```

### Step 3: API Security

```python
# Add authentication to your API endpoints
from functools import wraps
import jwt

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return {'error': 'No token provided'}, 401
        
        try:
            jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        except jwt.InvalidTokenError:
            return {'error': 'Invalid token'}, 401
        
        return f(*args, **kwargs)
    return decorated

# Apply to sensitive endpoints
@app.route('/api/admin', methods=['POST'])
@require_auth
def admin_endpoint():
    # Protected endpoint logic
    pass
```

### Step 4: Environment Security

```bash
# Secure sensitive files
chmod 600 /opt/ashley-ai/ashley-ai-unified/.env
chown root:root /opt/ashley-ai/ashley-ai-unified/.env

# Create backup of environment
cp /opt/ashley-ai/ashley-ai-unified/.env /opt/ashley-ai/ashley-ai-unified/.env.backup

# Use environment variable encryption (optional)
# Install age encryption tool
apt install age

# Encrypt sensitive files
age -r $(cat ~/.ssh/id_rsa.pub) -o .env.age .env
```

## Next Steps

### Production Deployment Checklist
- [ ] SSL/TLS certificate setup with Let's Encrypt
- [ ] Domain name configuration
- [ ] Load balancer setup (if multiple instances)
- [ ] Database backup strategy
- [ ] Monitoring and alerting system
- [ ] Disaster recovery plan

### Scaling Considerations
- [ ] Multiple GPU server coordination
- [ ] Model serving optimization
- [ ] Caching strategy implementation
- [ ] API rate limiting
- [ ] Cost optimization review

### Additional Resources
- [Quickpod Documentation](https://docs.quickpod.ai)
- [NVIDIA CUDA Documentation](https://docs.nvidia.com/cuda/)
- [PyTorch GPU Documentation](https://pytorch.org/docs/stable/notes/cuda.html)
- [Ashley AI GitHub Repository](https://github.com/Soriano-R/ashley-ai-unified)

## Conclusion

You now have a complete setup of Ashley AI running on a high-performance GPU server from Quickpod. This configuration provides:

- **High Performance**: GPU acceleration for model inference and image generation
- **Remote Development**: Full VS Code and Jupyter integration
- **Cost Management**: Monitoring and auto-shutdown capabilities
- **Security**: Hardened server configuration
- **Scalability**: Foundation for production deployment

The GPU server setup enables Ashley AI to run sophisticated local models, perform real-time image generation, and handle multiple concurrent users while maintaining optimal performance.

Remember to monitor your costs and shut down the server when not in use to optimize expenses. The investment in GPU compute power significantly enhances Ashley AI's capabilities and provides a professional development environment.