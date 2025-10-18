"""
Enhanced Chat Engine for Ashley AI
Integrates PyTorch models with internet access and persona management
"""

import asyncio
import logging
import os
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urlparse

from app.persona_registry import (
    PERSONA_REGISTRY,
    resolve_allowed_model_ids,
)
from app.personas import load_persona_bundle
from core.pytorch_manager import get_pytorch_manager
from tools.internet_access import get_internet_manager

logger = logging.getLogger(__name__)

class EnhancedChatEngine:
    """
    Advanced chat engine that combines:
    - PyTorch model inference
    - Internet access and search
    - Persona-aware responses
    - Context management
    - Fallback mechanisms
    """
    
    def __init__(self):
        self.pytorch_manager = get_pytorch_manager()
        self.internet_manager = get_internet_manager()
        self.current_persona = "ashley-girlfriend"
        self.context_history: List[Dict] = []
        self.max_context_length = 4000

        # Initialize with default model (disabled for faster startup - models load on-demand)
        # self._load_default_model()
    
    def _load_default_model(self):
        """Load default PyTorch model"""
        try:
            # Get default model from config
            default_model = self.pytorch_manager.config.get("default_model", None)
            if default_model:
                logger.info(f"Loading default model: {default_model}")
                self.pytorch_manager.load_model(default_model)
            else:
                logger.warning("No default model configured")
        except Exception as e:
            logger.error(f"Error loading default model: {e}")
    
    def _detect_internet_need(self, message: str) -> bool:
        """Detect if message requires internet search"""
        internet_keywords = [
            'current', 'latest', 'recent', 'today', 'now', 'news',
            'weather', 'stock', 'price', 'search for', 'look up',
            'find information', 'what happened', 'breaking',
            'update', 'happening', 'trending', 'status of'
        ]
        
        message_lower = message.lower()
        return any(keyword in message_lower for keyword in internet_keywords)

    def _build_context_pairs(self, history: Optional[List[Dict[str, str]]]) -> List[Dict[str, str]]:
        """Convert message history into paired user/assistant exchanges."""
        if not history:
            return []
        pairs: List[Dict[str, str]] = []
        last_user: Optional[str] = None
        for entry in history:
            role = entry.get("role")
            content = entry.get("content", "")
            if role == "user":
                last_user = content
            elif role == "assistant" and last_user is not None:
                pairs.append({"user": last_user, "assistant": content})
                last_user = None
        return pairs

    def _resolve_model_selection(
        self,
        persona_meta,
        requested_model: Optional[str],
    ) -> (Optional[str], List[str]):
        """Determine which model to use for this request and return allowed model ids."""
        models_catalog = self.pytorch_manager.list_available_models()
        allowed_models = resolve_allowed_model_ids(persona_meta, models_catalog)

        selected = requested_model or persona_meta.default_model
        if selected and selected != "auto":
            if selected in allowed_models:
                return selected, allowed_models
            logger.warning(
                "Requested model %s not allowed for persona %s; falling back to auto.",
                selected,
                persona_meta.id,
            )

        # Choose first non-auto allowed model
        for candidate in allowed_models:
            if candidate != "auto":
                return candidate, allowed_models

        # Fallback to global default
        return self.pytorch_manager.config.get("default_model"), allowed_models
    
    def _enhance_prompt_with_persona(self, message: str, persona_name: str) -> str:
        """Enhance prompt with persona context"""
        try:
            persona_bundle = load_persona_bundle([persona_name])
            if persona_bundle:
                persona_context = f"You are {persona_name}. {persona_bundle}\n\n"
                return persona_context + message
        except Exception as e:
            logger.error(f"Error loading persona {persona_name}: {e}")
        
        return message
    
    def _create_enhanced_prompt(
        self,
        user_message: str,
        persona_id: str,
        persona_label: str,
        internet_results: Optional[Dict] = None,
        context: Optional[List[Dict]] = None,
    ) -> str:
        """Create comprehensive prompt with all available context"""
        
        # Start with persona context
        prompt_parts = []
        
        # Add persona information
        try:
            persona_bundle = load_persona_bundle([persona_id])
            if persona_bundle:
                prompt_parts.append(f"PERSONA CONTEXT:\n{persona_bundle}\n")
        except Exception as e:
            logger.error(f"Error loading persona: {e}")
        
        # Add current time information
        time_info = self.internet_manager.get_current_time_info()
        prompt_parts.append(f"CURRENT TIME: {time_info['current_time']} ({time_info['day_of_week']})\n")
        
        # Add internet search results if available
        if internet_results:
            search_formatted = self.internet_manager.format_search_results_for_prompt(internet_results)
            prompt_parts.append(f"INTERNET SEARCH RESULTS:\n{search_formatted}\n")
        
        # Add conversation context
        if context:
            prompt_parts.append("CONVERSATION CONTEXT:\n")
            for ctx in context[-3:]:  # Last 3 exchanges
                prompt_parts.append(f"User: {ctx.get('user', '')}\n")
                prompt_parts.append(f"Assistant: {ctx.get('assistant', '')}\n")
            prompt_parts.append("\n")
        
        # Add current user message
        prompt_parts.append(f"CURRENT USER MESSAGE:\n{user_message}\n")
        
        # Add instruction
        instruction = f"""
Please respond as {persona_label} based on the context provided above. 
If internet search results are provided, use them to give current and accurate information.
Be helpful, engaging, and maintain the personality characteristics of {persona_label}.
"""
        prompt_parts.append(instruction)
        
        return "\n".join(prompt_parts)
    
    async def generate_response(
        self,
        message: str,
        persona_name: Optional[str] = None,
        use_internet: Optional[bool] = None,
        model_id: Optional[str] = None,
        history: Optional[List[Dict[str, str]]] = None,
        **generation_kwargs,
    ) -> Dict[str, Any]:
        """
        Generate response with full feature integration
        
        Args:
            message: User input message
            persona_name: Persona to use (defaults to current)
            use_internet: Force internet usage (auto-detect if None)
            model_id: Specific model to use
            history: Optional chat history for additional context
            **generation_kwargs: Additional generation parameters
            
        Returns:
            Dict containing response and metadata
        """
        start_time = datetime.now()

        # Resolve persona metadata
        persona_meta = None
        if persona_name:
            persona_meta = PERSONA_REGISTRY.get(persona_name)
            if not persona_meta:
                lowered = persona_name.lower()
                persona_meta = next(
                    (meta for meta in PERSONA_REGISTRY.values() if meta.label.lower() == lowered),
                    None,
                )
        if not persona_meta:
            persona_meta = PERSONA_REGISTRY.get(self.current_persona)
        if not persona_meta:
            persona_meta = next(iter(PERSONA_REGISTRY.values()))

        persona_id = persona_meta.id
        persona_label = persona_meta.label
        self.current_persona = persona_id

        # Build conversation context pairs
        context_pairs = self._build_context_pairs(history[:-1] if history else [])

        if use_internet is None:
            use_internet = self._detect_internet_need(message)

        selected_model_id, allowed_models = await asyncio.to_thread(
            self._resolve_model_selection,
            persona_meta,
            model_id,
        )

        response_data = {
            "response": "",
            "persona_used": persona_id,
            "persona_label": persona_label,
            "internet_used": use_internet,
            "model_used": selected_model_id or "",
            "allowed_models": allowed_models,
            "sources": [],
            "generation_time": 0,
            "error": None,
        }

        try:
            # Load target model (if any)
            if selected_model_id:
                loaded = await asyncio.to_thread(self.pytorch_manager.load_model, selected_model_id)
                if not loaded:
                    response_data["error"] = f"Failed to load model {selected_model_id}"
                    response_data["model_used"] = selected_model_id
                    response_data["response"] = self._generate_fallback_response(message, persona_meta)
                    return response_data

            # Get internet information if needed
            internet_results = None
            if use_internet:
                try:
                    internet_results = await asyncio.to_thread(
                        self.internet_manager.comprehensive_search,
                        message,
                    )
                    response_data["sources"] = self._extract_sources(internet_results)
                except Exception as e:
                    logger.warning(f"Internet search failed: {e}")
                    # Continue without internet
            
            # Create enhanced prompt
            enhanced_prompt = self._create_enhanced_prompt(
                message,
                persona_id,
                persona_label,
                internet_results,
                context_pairs
            )
            
            # Generate response using PyTorch or OpenAI API model
            if self.pytorch_manager.current_model:
                try:
                    response_text = await asyncio.to_thread(
                        self.pytorch_manager.generate_response,
                        enhanced_prompt,
                        **generation_kwargs,
                    )
                    response_data["response"] = response_text
                    response_data["model_used"] = selected_model_id or "pytorch"
                except Exception as e:
                    logger.error(f"PyTorch generation failed: {e}")
                    response_data["response"] = self._generate_fallback_response(message, persona_meta)
                    response_data["model_used"] = "fallback"
                    response_data["error"] = f"PyTorch error: {str(e)}"
            elif self.pytorch_manager.models.get("openai", {}).get("loaded", False):
                # Use OpenAI API for response
                try:
                    import openai
                    openai.api_key = os.getenv('OPENAI_API_KEY')
                    completion = await asyncio.to_thread(
                        openai.ChatCompletion.create,
                        model=self.pytorch_manager.models['openai']['config']['model_name'],
                        messages=[{"role": "user", "content": enhanced_prompt}],
                        max_tokens=generation_kwargs.get('max_new_tokens', 1024),
                        temperature=generation_kwargs.get('temperature', 0.7),
                        top_p=generation_kwargs.get('top_p', 0.9),
                    )
                    response_text = completion.choices[0].message['content']
                    response_data["response"] = response_text
                    response_data["model_used"] = selected_model_id or "openai"
                except Exception as e:
                    logger.error(f"OpenAI API generation failed: {e}")
                    response_data["response"] = self._generate_fallback_response(message, persona_meta)
                    response_data["model_used"] = "fallback"
                    response_data["error"] = f"OpenAI API error: {str(e)}"
            else:
                response_data["response"] = self._generate_fallback_response(message, persona_meta)
                response_data["model_used"] = "fallback"
                response_data["error"] = "No model loaded"

            # Update context history
            self._update_context_history(context_pairs, message, response_data["response"])

        except Exception as e:
            logger.exception("Error in generate_response")
            response_data["response"] = (
                "I apologize, but I encountered an error processing your request. Please try again."
            )
            response_data["error"] = str(e)
        
        # Calculate generation time
        response_data["generation_time"] = (datetime.now() - start_time).total_seconds()
        return response_data
    
    def _generate_fallback_response(self, message: str, persona_meta) -> str:
        """Generate fallback response when PyTorch is unavailable"""
        try:
            # Try to use persona context for a more personalized fallback
            persona_bundle = load_persona_bundle([persona_meta.id])
            if persona_bundle and persona_meta.id == "ashley-girlfriend":
                return (
                    f"Hi there! I'm {persona_meta.label}, and I'd love to help you with '{message}'. "
                    "I'm experiencing a technical hiccup, so please try again in a moment."
                )
            elif persona_bundle:
                return (
                    f"Hello! As {persona_meta.label}, I want to assist you with '{message}', "
                    "but I'm currently having some technical difficulties. Please try again shortly."
                )
            else:
                return f"I understand you're asking about '{message}'. I'm currently experiencing technical issues but I'm here to help as soon as possible. Please try again in a moment."
                
        except Exception:
            return "I'm currently experiencing technical difficulties. Please try again in a moment."

    def _update_context_history(self, pairs: List[Dict[str, str]], user_message: str, assistant_response: str):
        """Update conversation context history"""
        context_entry = {
            "user": user_message,
            "assistant": assistant_response,
            "timestamp": datetime.now().isoformat(),
        }
        history = pairs + [context_entry]
        self.context_history = history[-10:]
    
    def set_persona(self, persona_name: str) -> bool:
        """Set the current persona"""
        try:
            # Verify persona exists
            persona_bundle = load_persona_bundle([persona_name])
            if persona_bundle:
                self.current_persona = persona_name
                logger.info(f"Persona set to: {persona_name}")
                return True
            else:
                logger.error(f"Persona {persona_name} not found")
                return False
        except Exception as e:
            logger.error(f"Error setting persona: {e}")
            return False
    
    def switch_model(self, model_id: str) -> bool:
        """Switch to a different PyTorch model"""
        try:
            return self.pytorch_manager.load_model(model_id)
        except Exception as e:
            logger.error(f"Error switching model: {e}")
            return False
    
    def get_system_status(self) -> Dict[str, Any]:
        """Get comprehensive system status"""
        try:
            pytorch_info = self.pytorch_manager.get_model_info()
            internet_status = self.internet_manager.get_usage_status()
            
            return {
                'pytorch_models': pytorch_info,
                'internet_access': internet_status,
                'current_persona': self.current_persona,
                'context_length': len(self.context_history),
                'system_time': datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"Error getting system status: {e}")
            return {'error': str(e)}
    
    def clear_context(self):
        """Clear conversation context history"""
        self.context_history = []
        logger.info("Context history cleared")
    
    async def search_internet(self, query: str) -> Dict[str, Any]:
        """Manually trigger internet search"""
        try:
            return await asyncio.to_thread(self.internet_manager.comprehensive_search, query)
        except Exception as e:
            logger.error(f"Manual internet search failed: {e}")
            return {'error': str(e)}
    
    @staticmethod
    def _extract_sources(search_results: Optional[Dict[str, Any]]) -> List[str]:
        """Extract and deduplicate valid HTTP(S) URLs from search results."""
        if not search_results:
            return []

        sources: List[str] = []
        seen = set()

        for _, entries in (search_results.get("results") or {}).items():
            for entry in entries or []:
                url = entry.get("url")
                if not isinstance(url, str):
                    continue
                parsed = urlparse(url)
                if parsed.scheme not in ("http", "https") or not parsed.netloc:
                    continue
                if url not in seen:
                    seen.add(url)
                    sources.append(url)

        for source in search_results.get("sources_used", []):
            if isinstance(source, str) and source not in seen:
                seen.add(source)
                sources.append(source)

        return sources
    
    def get_available_models(self) -> List[Dict]:
        """Get list of available PyTorch models"""
        try:
            return self.pytorch_manager.list_available_models()
        except Exception as e:
            logger.error(f"Error getting available models: {e}")
            return []
    
    def prepare_model_for_training(self, model_id: str) -> bool:
        """Prepare a model for fine-tuning"""
        try:
            return self.pytorch_manager.prepare_for_finetuning(model_id)
        except Exception as e:
            logger.error(f"Error preparing model for training: {e}")
            return False

# Global instance
enhanced_chat_engine = EnhancedChatEngine()

def get_enhanced_chat_engine() -> EnhancedChatEngine:
    """Get the global enhanced chat engine instance"""
    return enhanced_chat_engine
