"""
Enhanced Chat Engine for Ashley AI
Integrates PyTorch models with internet access and persona management
"""

import os
import logging
from typing import Dict, List, Optional, Union, Any
from datetime import datetime
import json

# Local imports
from core.pytorch_manager import get_pytorch_manager
from tools.internet_access import get_internet_manager
from core.persona_loader import load_persona_bundle

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
        self.current_persona = "Ashley"
        self.context_history: List[Dict] = []
        self.max_context_length = 4000
        
        # Initialize with default model
        self._load_default_model()
    
    def _load_default_model(self):
        """Load default PyTorch model"""
        try:
            available_models = self.pytorch_manager.list_available_models()
            if available_models:
                default_model = available_models[0]['id']
                logger.info(f"Loading default model: {default_model}")
                self.pytorch_manager.load_model(default_model)
            else:
                logger.warning("No PyTorch models configured")
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
        persona_name: str,
        internet_results: Optional[Dict] = None,
        context: Optional[List[Dict]] = None
    ) -> str:
        """Create comprehensive prompt with all available context"""
        
        # Start with persona context
        prompt_parts = []
        
        # Add persona information
        try:
            persona_bundle = load_persona_bundle([persona_name])
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
Please respond as {persona_name} based on the context provided above. 
If internet search results are provided, use them to give current and accurate information.
Be helpful, engaging, and maintain the personality characteristics of {persona_name}.
"""
        prompt_parts.append(instruction)
        
        return "\n".join(prompt_parts)
    
    def generate_response(
        self,
        message: str,
        persona_name: Optional[str] = None,
        use_internet: Optional[bool] = None,
        model_id: Optional[str] = None,
        **generation_kwargs
    ) -> Dict[str, Any]:
        """
        Generate response with full feature integration
        
        Args:
            message: User input message
            persona_name: Persona to use (defaults to current)
            use_internet: Force internet usage (auto-detect if None)
            model_id: Specific model to use
            **generation_kwargs: Additional generation parameters
            
        Returns:
            Dict containing response and metadata
        """
        start_time = datetime.now()
        
        # Set defaults
        if persona_name is None:
            persona_name = self.current_persona
        
        if use_internet is None:
            use_internet = self._detect_internet_need(message)
        
        response_data = {
            'response': '',
            'persona_used': persona_name,
            'internet_used': use_internet,
            'model_used': '',
            'sources': [],
            'generation_time': 0,
            'error': None
        }
        
        try:
            # Load specific model if requested
            if model_id and not self.pytorch_manager.current_model:
                if not self.pytorch_manager.load_model(model_id):
                    response_data['error'] = f"Failed to load model {model_id}"
                    return response_data
            
            # Get internet information if needed
            internet_results = None
            if use_internet:
                try:
                    internet_results = self.internet_manager.comprehensive_search(message)
                    response_data['sources'] = internet_results.get('sources_used', [])
                except Exception as e:
                    logger.warning(f"Internet search failed: {e}")
                    # Continue without internet
            
            # Create enhanced prompt
            enhanced_prompt = self._create_enhanced_prompt(
                message, 
                persona_name,
                internet_results,
                self.context_history
            )
            
            # Generate response using PyTorch model
            if self.pytorch_manager.current_model:
                try:
                    response_text = self.pytorch_manager.generate_response(
                        enhanced_prompt,
                        **generation_kwargs
                    )
                    response_data['response'] = response_text
                    response_data['model_used'] = 'pytorch'
                    
                except Exception as e:
                    logger.error(f"PyTorch generation failed: {e}")
                    # Fallback to simple response
                    response_data['response'] = self._generate_fallback_response(message, persona_name)
                    response_data['model_used'] = 'fallback'
                    response_data['error'] = f"PyTorch error: {str(e)}"
            else:
                # No PyTorch model available
                response_data['response'] = self._generate_fallback_response(message, persona_name)
                response_data['model_used'] = 'fallback'
                response_data['error'] = "No PyTorch model loaded"
            
            # Update context history
            self._update_context_history(message, response_data['response'])
            
        except Exception as e:
            logger.error(f"Error in generate_response: {e}")
            response_data['response'] = "I apologize, but I encountered an error processing your request. Please try again."
            response_data['error'] = str(e)
        
        # Calculate generation time
        response_data['generation_time'] = (datetime.now() - start_time).total_seconds()
        
        return response_data
    
    def _generate_fallback_response(self, message: str, persona_name: str) -> str:
        """Generate fallback response when PyTorch is unavailable"""
        try:
            # Try to use persona context for a more personalized fallback
            persona_bundle = load_persona_bundle([persona_name])
            if persona_bundle and persona_name.lower() == 'ashley':
                return f"Hi there! I'm Ashley, and I'd love to help you with '{message}'. However, I'm currently experiencing some technical issues with my advanced AI capabilities. Could you please try again in a moment?"
            elif persona_bundle:
                return f"Hello! As {persona_name}, I want to assist you with '{message}', but I'm currently having some technical difficulties. Please try again shortly."
            else:
                return f"I understand you're asking about '{message}'. I'm currently experiencing technical issues but I'm here to help as soon as possible. Please try again in a moment."
                
        except Exception:
            return "I'm currently experiencing technical difficulties. Please try again in a moment."
    
    def _update_context_history(self, user_message: str, assistant_response: str):
        """Update conversation context history"""
        context_entry = {
            'user': user_message,
            'assistant': assistant_response,
            'timestamp': datetime.now().isoformat()
        }
        
        self.context_history.append(context_entry)
        
        # Trim context if too long
        while len(self.context_history) > 10:  # Keep last 10 exchanges
            self.context_history.pop(0)
    
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
    
    def search_internet(self, query: str) -> Dict[str, Any]:
        """Manually trigger internet search"""
        try:
            return self.internet_manager.comprehensive_search(query)
        except Exception as e:
            logger.error(f"Manual internet search failed: {e}")
            return {'error': str(e)}
    
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