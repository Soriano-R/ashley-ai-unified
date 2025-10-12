"""
PyTorch Model Manager for Ashley AI
Handles loading, inference, and fine-tuning of PyTorch models
"""

import os
import torch
from typing import Dict, List, Optional, Union, Any
from transformers import (
    AutoTokenizer, 
    AutoModelForCausalLM, 
    AutoConfig,
    BitsAndBytesConfig,
    pipeline
)
from peft import LoraConfig, get_peft_model, TaskType
import json
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class PyTorchModelManager:
    """
    Manages PyTorch models for Ashley AI with support for:
    - Model loading with quantization
    - Efficient inference
    - Fine-tuning preparation
    - Memory optimization
    """
    
    def __init__(self, config_path: str = "pytorch_models.json"):
        import os
        self.repo_regular = os.getenv("HF_REPO_REGULAR")
        self.repo_nsfw = os.getenv("HF_REPO_NSFW")
        self.repo_gguf_regular = os.getenv("HF_REPO_GGUF_REGULAR")
        self.repo_gguf_nsfw = os.getenv("HF_REPO_GGUF_NSFW")
        self.config_path = config_path
        self.config = {"models": {}}  # Initialize config as a dict
        self.models: Dict[str, Dict] = {}
        self.current_model = None
        self.current_tokenizer = None
        self.device = self._get_optimal_device()
        self.load_config()
    
    def _get_optimal_device(self) -> str:
        """Determine the best device for inference"""
        if torch.cuda.is_available():
            gpu_memory = torch.cuda.get_device_properties(0).total_memory / 1024**3
            logger.info(f"CUDA available - GPU memory: {gpu_memory:.1f}GB")
            return "cuda"
        elif hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
            logger.info("MPS (Apple Silicon) available")
            return "mps"
        else:
            logger.info("Using CPU")
            return "cpu"
    
    def load_config(self):
        # Add requested NSFW/uncensored models
        self.config["models"]["codellama-13b-python-hf"] = {
            "model_name": "meta-llama/CodeLlama-13b-Python-hf",
            "description": "CodeLlama 13B Python HF (no permission required)"
        }
        self.config["models"]["codellama-7b-python-hf"] = {
            "model_name": "meta-llama/CodeLlama-7b-Python-hf",
            "description": "CodeLlama 7B Python HF (no permission required)"
        }
        self.config["models"]["deepseek-r1"] = {
            "model_name": "deepseek-ai/DeepSeek-R1",
            "description": "DeepSeek R1 (no permission required)"
        }
        self.config["models"]["qwen2.5-7b-instruct"] = {
            "model_name": "Qwen/Qwen2.5-7B-Instruct",
            "description": "Qwen 2.5 7B Instruct (no permission required)"
        }
        self.config["models"]["deepseek-math-7b-instruct"] = {
            "model_name": "deepseek-ai/deepseek-math-7b-instruct",
            "description": "DeepSeek Math 7B Instruct (no permission required)"
        }
        self.config["models"]["deepseek-coder-v2-instruct"] = {
            "model_name": "deepseek-ai/DeepSeek-Coder-V2-Instruct",
            "description": "DeepSeek Coder V2 Instruct (no permission required)"
        }
        self.config["models"]["chronos-hermes-13b-gptq"] = {
            "model_name": "TheBloke/Chronos-Hermes-13B-GPTQ",
            "description": "Chronos Hermes 13B GPTQ (no permission required)"
        }
        self.config["models"]["undiplatypus2-13b-gptq"] = {
            "model_name": "TheBloke/UndiPlatypus2-13B-GPTQ",
            "description": "UndiPlatypus2 13B GPTQ (no permission required)"
        }
        self.config["models"]["openorca-platypus2-13b-gptq"] = {
            "model_name": "TheBloke/OpenOrca-Platypus2-13B-GPTQ",
            "description": "OpenOrca Platypus2 13B GPTQ (no permission required)"
        }
        self.config["models"]["undiopenhermes"] = {
            "model_name": "Undi95/UndiOpenHermes-2.5-Mistral-7B",
            "description": "UndiOpenHermes 2.5 Mistral 7B (NSFW)"
        }
        self.config["models"]["platypus2-13b-gptq"] = {
            "model_name": "TheBloke/OpenOrca-Platypus2-13B-GPTQ",
            "description": "OpenOrca Platypus2 13B GPTQ (NSFW)"
        }
        self.config["models"]["openhermes-2.5-mistral-7b-gptq"] = {
            "model_name": "TheBloke/OpenHermes-2.5-Mistral-7B-GPTQ",
            "description": "OpenHermes 2.5 Mistral 7B GPTQ (no permission required)"
        }
        self.config["models"]["openhermes-2.5-mistral-7b-gptq"] = {
            "model_name": "TheBloke/OpenHermes-2.5-Mistral-7B-GPTQ",
            "description": "OpenHermes 2.5 Mistral 7B GPTQ (NSFW)"
        }
        self.config["models"]["nous-hermes-2-mistral-7b-gptq"] = {
            "model_name": "TheBloke/Nous-Hermes-2-Mistral-7B-GPTQ",
            "description": "Nous Hermes 2 Mistral 7B GPTQ (NSFW)"
        }
        self.config["models"]["chronos-hermes-13b-gptq"] = {
            "model_name": "TheBloke/Chronos-Hermes-13B-GPTQ",
            "description": "Chronos Hermes 13B GPTQ (NSFW)"
        }
        self.config["models"]["undiplatypus2-13b-gptq"] = {
            "model_name": "TheBloke/UndiPlatypus2-13B-GPTQ",
            "description": "UndiPlatypus2 13B GPTQ (NSFW)"
        }
        # Add DeepSeek Coder model
        self.config["models"]["deepseek-coder"] = {
            "model_name": "deepseek-ai/deepseek-coder-6.7B-base",
            "description": "DeepSeek Coder 6.7B base model"
        }
        # Example NSFW model (UndiOpenHermes)
        self.config["models"]["nsfw-example"] = {
            "model_name": "Undi95/UndiOpenHermes-2.5-Mistral-7B",
            "description": "NSFW uncensored OpenHermes model"
        }
        self.config["models"]["openai"] = {
            "model_name": "openai/gpt-3.5-turbo",
            "max_length": 4096,
            "quantization": "api",
            "description": "OpenAI GPT-3.5 Turbo (API-based, cloud inference)"
        }
        """Load model configurations"""
        default_config = {
            "models": {
                "qwen-2.5-7b": {
                    "model_name": "Qwen/Qwen2.5-7B-Instruct",
                    "max_length": 32768,
                    "quantization": "8bit",
                    "description": "Qwen 2.5 7B - Long context support"
                },
                "code-llama-13b": {
                    "model_name": "codellama/CodeLlama-13b-Instruct-hf",
                    "max_length": 16384,
                    "quantization": "8bit", 
                    "description": "Code Llama 13B - Specialized for coding"
                }
            },
            "default_model": "llama-3.1-8b",
            "inference_config": {
                "max_new_tokens": 1024,
                "temperature": 0.7,
                "top_p": 0.9,
                "do_sample": True,
                "pad_token_id": None
            }
        }
        
        try:
            import os
            # Load config from file if present
            if os.path.exists(self.config_path):
                with open(self.config_path, 'r') as f:
                    self.config = json.load(f)
            else:
                self.config = default_config
                self.save_config()
            # Dynamically add models from .env
            if self.repo_regular:
                self.config["models"]["regular"] = {
                    "model_name": self.repo_regular,
                    "description": "Regular PyTorch models from .env"
                }
            if self.repo_nsfw:
                self.config["models"]["nsfw"] = {
                    "model_name": self.repo_nsfw,
                    "description": "NSFW PyTorch models from .env"
                }
            if self.repo_gguf_regular:
                self.config["models"]["gguf_regular"] = {
                    "model_name": self.repo_gguf_regular,
                    "description": "Regular GGUF models from .env"
                }
            if self.repo_gguf_nsfw:
                self.config["models"]["gguf_nsfw"] = {
                    "model_name": self.repo_gguf_nsfw,
                    "description": "NSFW GGUF models from .env"
                }
        except Exception as e:
            logger.error(f"Error loading config: {e}")
            self.config = default_config
    
    def save_config(self):
        """Save current configuration"""
        try:
            with open(self.config_path, 'w') as f:
                json.dump(self.config, f, indent=2)
        except Exception as e:
            logger.error(f"Error saving config: {e}")
    
    def get_quantization_config(self, quantization: str) -> Optional[BitsAndBytesConfig]:
        """Get quantization configuration"""
        if quantization == "4bit":
            return BitsAndBytesConfig(
                load_in_4bit=True,
                bnb_4bit_compute_dtype=torch.float16,
                bnb_4bit_use_double_quant=True,
                bnb_4bit_quant_type="nf4"
            )
        elif quantization == "8bit":
            return BitsAndBytesConfig(
                load_in_8bit=True,
                llm_int8_enable_fp32_cpu_offload=True
            )
        return None
    
    def load_model(self, model_id: str, force_reload: bool = False) -> bool:
        """
        Load a PyTorch model with optimizations
        
        Args:
            model_id: Model identifier from config
            force_reload: Force reload even if already loaded
            
        Returns:
            bool: Success status
        """
        if not force_reload and self.current_model and model_id in self.models:
            if self.models[model_id].get("loaded", False):
                logger.info(f"Model {model_id} already loaded")
                return True
        
        if model_id not in self.config["models"]:
            logger.error(f"Model {model_id} not found in config")
            return False
        
        model_config = self.config["models"][model_id]
        model_name = model_config["model_name"]

        # Special handling for OpenAI API-based model
        if model_id == "openai":
            logger.info("Configuring OpenAI API-based model (no local loading)")
            self.models[model_id] = {
                "model": None,
                "tokenizer": None,
                "config": model_config,
                "loaded": True,
                "load_time": datetime.now().isoformat(),
                "api": True
            }
            self.current_model = None
            self.current_tokenizer = None
            return True

        try:
            logger.info(f"Loading model: {model_name}")

            # Load tokenizer
            tokenizer = AutoTokenizer.from_pretrained(model_name)
            if tokenizer.pad_token is None:
                tokenizer.pad_token = tokenizer.eos_token

            # Prepare quantization
            quantization_config = self.get_quantization_config(
                model_config.get("quantization", "none")
            )

            # Load model with optimizations
            model_kwargs = {
                "torch_dtype": torch.float16,
                "device_map": "auto" if self.device == "cuda" else None,
                "trust_remote_code": True,
            }

            if quantization_config:
                model_kwargs["quantization_config"] = quantization_config

            model = AutoModelForCausalLM.from_pretrained(
                model_name,
                **model_kwargs
            )

            # Move to device if not using device_map
            if self.device != "cuda":
                model = model.to(self.device)

            # Store loaded model
            self.models[model_id] = {
                "model": model,
                "tokenizer": tokenizer,
                "config": model_config,
                "loaded": True,
                "load_time": datetime.now().isoformat()
            }

            self.current_model = model
            self.current_tokenizer = tokenizer

            logger.info(f"Successfully loaded {model_id}")
            return True

        except Exception as e:
            logger.error(f"Error loading model {model_id}: {e}")
            return False
    
    def generate_response(
        self, 
        prompt: str, 
        max_new_tokens: int = None,
        temperature: float = None,
        top_p: float = None,
        **kwargs
    ) -> str:
        """
        Generate response using current model
        
        Args:
            prompt: Input text
            max_new_tokens: Maximum tokens to generate
            temperature: Sampling temperature
            top_p: Top-p sampling
            **kwargs: Additional generation parameters
            
        Returns:
            str: Generated response
        """
        if not self.current_model or not self.current_tokenizer:
            raise ValueError("No model loaded. Call load_model() first.")
        
        # Get generation config
        gen_config = self.config["inference_config"].copy()
        if max_new_tokens:
            gen_config["max_new_tokens"] = max_new_tokens
        if temperature:
            gen_config["temperature"] = temperature
        if top_p:
            gen_config["top_p"] = top_p
        gen_config.update(kwargs)
        
        try:
            # Tokenize input
            inputs = self.current_tokenizer(
                prompt, 
                return_tensors="pt",
                truncation=True,
                max_length=2048
            ).to(self.device)
            
            # Generate
            with torch.no_grad():
                outputs = self.current_model.generate(
                    **inputs,
                    **gen_config,
                    pad_token_id=self.current_tokenizer.eos_token_id
                )
            
            # Decode response
            response = self.current_tokenizer.decode(
                outputs[0][inputs['input_ids'].shape[1]:], 
                skip_special_tokens=True
            )
            
            return response.strip()
            
        except Exception as e:
            logger.error(f"Error generating response: {e}")
            return f"Error generating response: {str(e)}"
    
    def prepare_for_finetuning(
        self, 
        model_id: str,
        task_type: str = "CAUSAL_LM",
        lora_config: Dict = None
    ) -> bool:
        """
        Prepare model for fine-tuning with LoRA
        
        Args:
            model_id: Model to prepare
            task_type: Type of task (CAUSAL_LM, etc.)
            lora_config: LoRA configuration
            
        Returns:
            bool: Success status
        """
        if model_id not in self.models or not self.models[model_id]["loaded"]:
            logger.error(f"Model {model_id} not loaded")
            return False
        
        try:
            # Default LoRA config
            if lora_config is None:
                lora_config = {
                    "r": 16,
                    "lora_alpha": 32,
                    "target_modules": ["q_proj", "k_proj", "v_proj", "o_proj"],
                    "lora_dropout": 0.1,
                    "bias": "none",
                    "task_type": TaskType.CAUSAL_LM
                }
            
            # Create LoRA config
            peft_config = LoraConfig(**lora_config)
            
            # Get PEFT model
            model = self.models[model_id]["model"]
            peft_model = get_peft_model(model, peft_config)
            
            # Update stored model
            self.models[model_id]["peft_model"] = peft_model
            self.models[model_id]["peft_config"] = peft_config
            self.models[model_id]["finetuning_ready"] = True
            
            logger.info(f"Model {model_id} prepared for fine-tuning")
            return True
            
        except Exception as e:
            logger.error(f"Error preparing model for fine-tuning: {e}")
            return False
    
    def get_model_info(self) -> Dict:
        """Get information about loaded models"""
        info = {
            "current_device": self.device,
            "available_models": list(self.config["models"].keys()),
            "loaded_models": {},
            "memory_info": {}
        }
        
        # Get loaded model info
        for model_id, model_data in self.models.items():
            if model_data.get("loaded", False):
                info["loaded_models"][model_id] = {
                    "config": model_data["config"],
                    "load_time": model_data.get("load_time"),
                    "finetuning_ready": model_data.get("finetuning_ready", False)
                }
        
        # Get memory info
        if torch.cuda.is_available():
            info["memory_info"]["cuda"] = {
                "allocated": f"{torch.cuda.memory_allocated() / 1024**3:.2f}GB",
                "cached": f"{torch.cuda.memory_reserved() / 1024**3:.2f}GB",
                "total": f"{torch.cuda.get_device_properties(0).total_memory / 1024**3:.2f}GB"
            }
        
        return info
    
    def unload_model(self, model_id: str = None):
        """Unload model to free memory"""
        if model_id is None:
            # Unload current model
            self.current_model = None
            self.current_tokenizer = None
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            logger.info("Unloaded current model")
        elif model_id in self.models:
            # Unload specific model
            del self.models[model_id]
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            logger.info(f"Unloaded model {model_id}")
    
    def list_available_models(self) -> List[Dict]:
        """List all available models from config"""
        models_list = []
        for model_id, config in self.config["models"].items():
            is_loaded = model_id in self.models and self.models[model_id].get("loaded", False)
            # For OpenAI API model, treat as available even if not loaded as PyTorch
            if model_id == "openai":
                models_list.append({
                    "id": model_id,
                    "name": config["model_name"],
                    "description": config.get("description", ""),
                    "max_length": config.get("max_length", 4096),
                    "quantization": config.get("quantization", "api"),
                    "loaded": is_loaded or True
                })
            else:
                models_list.append({
                    "id": model_id,
                    "name": config["model_name"],
                    "description": config.get("description", ""),
                    "max_length": config.get("max_length", 2048),
                    "quantization": config.get("quantization", "none"),
                    "loaded": is_loaded
                })
        return models_list

# Global instance
pytorch_manager = PyTorchModelManager()

def get_pytorch_manager() -> PyTorchModelManager:
    """Get the global PyTorch model manager instance"""
    return pytorch_manager