# Fine-Tuning PyTorch Models for Ashley AI

## Overview

This guide explains how to fine-tune PyTorch models for your Ashley AI personas. Fine-tuning allows you to customize models to better match your specific use cases and personality traits.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Understanding Your Options](#understanding-your-options)
3. [Fine-Tuning Methods](#fine-tuning-methods)
4. [Step-by-Step Guide](#step-by-step-guide)
5. [Best Practices](#best-practices)
6. [Troubleshooting](#troubleshooting)

## Prerequisites

### Hardware Requirements

**Minimum (Small 7B models):**
- RAM: 16GB+
- VRAM: 8GB+ (GPU) or 32GB+ RAM (CPU-only)
- Storage: 50GB+ free space

**Recommended (7B-13B models):**
- RAM: 32GB+
- VRAM: 16GB+ (NVIDIA GPU with CUDA)
- Storage: 100GB+ free space
- Apple Silicon M1/M2/M3 with 32GB+ unified memory

### Software Requirements

```bash
# Core dependencies (already in requirements.txt)
pip install torch transformers datasets peft bitsandbytes accelerate

# Optional but recommended
pip install wandb tensorboard  # For tracking training
```

## Understanding Your Options

### 1. GGUF Models (Quantized - CPU Friendly)
- **Pros**: Smaller file size, faster inference on CPU, lower memory usage
- **Cons**: Cannot be fine-tuned directly (must convert to PyTorch first)
- **Best for**: Deployment, inference-only use cases

### 2. PyTorch Models (Full Precision)
- **Pros**: Can be fine-tuned, highest quality outputs
- **Cons**: Larger file size, requires more VRAM/RAM
- **Best for**: Training, fine-tuning, GPU inference

### Recommendation
**For fine-tuning**: Start with PyTorch models (7B size)
**For deployment**: Convert to GGUF after fine-tuning

## Fine-Tuning Methods

### 1. LoRA (Low-Rank Adaptation) - RECOMMENDED

**Best for**: Most use cases, efficient training, persona customization

**Advantages:**
- Requires only 4-8GB VRAM for 7B models
- Fast training (hours instead of days)
- Small adapter files (10-100MB instead of GBs)
- Can switch between multiple personas easily

**When to use:**
- Customizing conversation style
- Adding personality traits
- Teaching domain-specific knowledge
- Adapting to specific relationship dynamics

### 2. Full Fine-Tuning

**Best for**: Major model modifications, research

**Advantages:**
- Complete control over model weights
- Can fundamentally change model behavior

**Disadvantages:**
- Requires 40GB+ VRAM for 7B models
- Slow training (days to weeks)
- Large checkpoint files (13-70GB)
- Risk of catastrophic forgetting

**When to use:**
- You have powerful hardware (A100/H100 GPUs)
- Need major behavioral changes
- Building a completely custom model

### 3. QLoRA (Quantized LoRA) - BEST BALANCE

**Best for**: Limited VRAM, high quality results

**Advantages:**
- Train 7B models with 6GB VRAM
- Quality almost as good as full LoRA
- Faster than full fine-tuning

**When to use:**
- Limited GPU memory
- Want LoRA benefits with less hardware

## Step-by-Step Guide

### Method 1: Fine-Tuning with LoRA (Recommended)

#### Step 1: Prepare Your Dataset

Create a JSON file with conversation examples:

```json
[
  {
    "instruction": "You are Ashley, a warm and affectionate girlfriend AI.",
    "input": "Hi Ashley, how was your day?",
    "output": "Hey babe! My day was pretty good, been thinking about you actually. How was yours? Tell me everything!"
  },
  {
    "instruction": "You are Ashley, a warm and affectionate girlfriend AI.",
    "input": "I'm feeling stressed about work.",
    "output": "Aw, I'm sorry you're stressed, love. Come here, let's talk about it. What's going on? I'm here for you."
  }
]
```

**Dataset Guidelines:**
- 100-1000 examples for good results
- 1000-10000 examples for excellent results
- Include diverse conversation scenarios
- Match your desired persona's tone and style
- Cover edge cases and different moods

#### Step 2: Create Training Script

```python
# finetune_lora.py
import torch
from datasets import load_dataset
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    TrainingArguments,
    Trainer,
    DataCollatorForLanguageModeling
)
from peft import LoraConfig, get_peft_model, TaskType

# Configuration
MODEL_NAME = "TheBloke/Nous-Hermes-2-Mistral-7B-DPO-GPTQ"  # Your base model
OUTPUT_DIR = "./ashley-girlfriend-lora"
DATASET_PATH = "./ashley_training_data.json"

# Load tokenizer and model
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
tokenizer.pad_token = tokenizer.eos_token

model = AutoModelForCausalLM.from_pretrained(
    MODEL_NAME,
    torch_dtype=torch.float16,
    device_map="auto",
    trust_remote_code=True
)

# LoRA Configuration
lora_config = LoraConfig(
    task_type=TaskType.CAUSAL_LM,
    r=16,  # Rank (higher = more parameters, 8-64 typical)
    lora_alpha=32,  # Scaling factor (usually 2x rank)
    lora_dropout=0.05,
    target_modules=["q_proj", "v_proj"],  # Which layers to adapt
)

model = get_peft_model(model, lora_config)
model.print_trainable_parameters()

# Load and prepare dataset
def format_instruction(example):
    text = f"### Instruction: {example['instruction']}\\n### Input: {example['input']}\\n### Response: {example['output']}"
    return tokenizer(text, truncation=True, max_length=512)

dataset = load_dataset("json", data_files=DATASET_PATH, split="train")
tokenized_dataset = dataset.map(format_instruction, remove_columns=dataset.column_names)

# Training arguments
training_args = TrainingArguments(
    output_dir=OUTPUT_DIR,
    num_train_epochs=3,
    per_device_train_batch_size=4,
    gradient_accumulation_steps=4,
    learning_rate=2e-4,
    fp16=True,
    logging_steps=10,
    save_steps=100,
    eval_steps=100,
    warmup_steps=100,
    save_total_limit=3,
)

# Train
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=tokenized_dataset,
    data_collator=DataCollatorForLanguageModeling(tokenizer, mlm=False),
)

trainer.train()

# Save the LoRA adapter
model.save_pretrained(OUTPUT_DIR)
tokenizer.save_pretrained(OUTPUT_DIR)

print(f"✓ Fine-tuning complete! LoRA adapter saved to {OUTPUT_DIR}")
```

#### Step 3: Run Training

```bash
# Activate your environment
source chatbot_env/bin/activate  # or your venv path

# Run training (will take 1-6 hours depending on data size and hardware)
python finetune_lora.py

# Monitor training (optional)
tensorboard --logdir=./ashley-girlfriend-lora/runs
```

#### Step 4: Use the Fine-Tuned Model

Update your `pytorch_models.json`:

```json
{
  "ashley-girlfriend-finetuned": {
    "model_name": "TheBloke/Nous-Hermes-2-Mistral-7B-DPO-GPTQ",
    "lora_adapter": "./ashley-girlfriend-lora",
    "display_name": "Ashley Girlfriend (Fine-tuned)",
    "max_length": 8192,
    "quantization": "gptq",
    "format": "pytorch",
    "description": "Custom fine-tuned model for Ashley girlfriend persona",
    "categories": ["general"],
    "capabilities": ["relationship", "conversation"]
  }
}
```

Update `persona_model_mapping.json`:

```json
{
  "ashley-girlfriend": {
    "primary": "ashley-girlfriend-finetuned",
    "alternatives": ["nous-hermes-2-mistral-7b-gptq"],
    "fallback": "openai"
  }
}
```

### Method 2: QLoRA (For Limited VRAM)

```python
# finetune_qlora.py
from transformers import BitsAndBytesConfig

# 4-bit quantization config
bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.float16,
    bnb_4bit_use_double_quant=True,
)

model = AutoModelForCausalLM.from_pretrained(
    MODEL_NAME,
    quantization_config=bnb_config,
    device_map="auto",
    trust_remote_code=True
)

# Rest is the same as LoRA training...
```

## Best Practices

### Dataset Creation

1. **Quality over Quantity**: 500 high-quality examples > 5000 poor examples
2. **Diversity**: Include various conversation types (greeting, advice, romance, casual chat)
3. **Consistency**: Maintain consistent personality traits across all examples
4. **Natural Language**: Write as a human would, not as a chatbot
5. **Context**: Include conversation history when relevant

### Training Parameters

**For 7B models:**
- Learning rate: 2e-4 to 5e-4
- Epochs: 3-5
- Batch size: 4-8 (with gradient accumulation)
- LoRA rank: 8-32 (16 is good default)

**Signs of good training:**
- Loss decreases steadily
- Validation loss doesn't increase (no overfitting)
- Generated text improves over epochs

**Signs of bad training:**
- Loss stops decreasing early (too low learning rate)
- Loss oscillates wildly (too high learning rate)
- Validation loss increases (overfitting - reduce epochs)

### Evaluation

Test your model with:
```python
def test_model(prompt):
    inputs = tokenizer(prompt, return_tensors="pt").to("cuda")
    outputs = model.generate(**inputs, max_length=200)
    return tokenizer.decode(outputs[0])

# Test various scenarios
test_prompts = [
    "Hi Ashley, I missed you!",
    "I'm having a bad day...",
    "What do you want to do tonight?",
]

for prompt in test_prompts:
    print(f"Prompt: {prompt}")
    print(f"Response: {test_model(prompt)}\n")
```

## Converting to GGUF (For Production)

After fine-tuning, convert to GGUF for efficient inference:

```bash
# Install llama.cpp
git clone https://github.com/ggerganov/llama.cpp
cd llama.cpp
make

# Convert PyTorch model to GGUF
python convert.py /path/to/your/finetuned/model --outfile ashley-girlfriend.gguf --outtype q4_k_m

# Use in your application
# Update pytorch_models.json with the GGUF path
```

## Troubleshooting

### Out of Memory (OOM)

**Solutions:**
1. Reduce batch size
2. Increase gradient accumulation steps
3. Use QLoRA instead of LoRA
4. Use smaller model (7B instead of 13B)
5. Use CPU offloading: `device_map="auto"`

### Model Not Learning

**Solutions:**
1. Increase learning rate
2. Train for more epochs
3. Check dataset quality
4. Increase LoRA rank
5. Verify data formatting is correct

### Catastrophic Forgetting

**Solutions:**
1. Reduce learning rate
2. Train for fewer epochs
3. Use smaller LoRA rank
4. Mix original training data with your custom data (10:1 ratio)

## Resources

- [Hugging Face Fine-tuning Guide](https://huggingface.co/docs/transformers/training)
- [PEFT Documentation](https://huggingface.co/docs/peft/index)
- [LoRA Paper](https://arxiv.org/abs/2106.09685)
- [QLoRA Paper](https://arxiv.org/abs/2305.14314)

## Quick Reference

| Task | Method | VRAM | Time | Quality |
|------|--------|------|------|---------|
| Persona Style | LoRA | 8GB | 2-4h | Excellent |
| Limited Hardware | QLoRA | 6GB | 3-6h | Very Good |
| Major Changes | Full FT | 40GB+ | Days | Best |
| Quick Test | LoRA (r=8) | 6GB | 1-2h | Good |

## Next Steps

1. Create your training dataset
2. Choose a fine-tuning method (LoRA recommended)
3. Run training script
4. Evaluate results
5. Integrate into Ashley AI
6. Monitor and iterate

For questions or help, check the community forums or open an issue on GitHub.
