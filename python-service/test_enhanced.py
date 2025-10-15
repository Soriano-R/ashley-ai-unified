#!/usr/bin/env python3
"""
Test script for Ashley AI Enhanced Features
Verifies PyTorch and Internet access functionality
"""

import sys
import asyncio
import logging
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_pytorch_manager():
    """Test PyTorch model manager functionality"""
    print("\n🔥 Testing PyTorch Manager...")
    
    try:
        from core.pytorch_manager import PyTorchModelManager
        
        manager = PyTorchModelManager()
        
        # Test model discovery
        models = manager.list_available_models()
        print(f"✅ Found {len(models)} available models")
        
        # Test model loading (if any models are available)
        if models:
            model_id = models[0]["id"]
            print(f"🔄 Testing model load: {model_id}")
            success = manager.load_model(model_id)
            if success:
                print("✅ Model loaded successfully")
                
                # Test generation
                response = manager.generate_response("Hello, how are you?")
                print(f"✅ Generated response: {response[:100]}...")
            else:
                print("⚠️ Model load failed (this is normal if no models are cached)")
        else:
            print("ℹ️ No models found (normal on first run)")
            
    except ImportError as e:
        print(f"❌ PyTorch dependencies not available: {e}")
    except Exception as e:
        print(f"❌ PyTorch test failed: {e}")

def test_internet_access():
    """Test internet access functionality"""
    print("\n🌐 Testing Internet Access...")
    
    try:
        from tools.internet_access import InternetAccessManager
        
        manager = InternetAccessManager()
        
        # Test search functionality
        query = "latest AI developments 2024"
        print(f"🔍 Searching for: {query}")
        
        results = manager.comprehensive_search(query)
        
        if results and results.get('total_results', 0) > 0:
            print(f"✅ Found {results['total_results']} search results")
            sources = results.get('sources_used', [])
            print(f"✅ Sources used: {', '.join(sources)}")
        else:
            print("⚠️ No search results (check internet connection or API keys)")
            
    except ImportError as e:
        print(f"❌ Internet access dependencies not available: {e}")
    except Exception as e:
        print(f"❌ Internet access test failed: {e}")

async def test_enhanced_chat():
    """Test enhanced chat engine"""
    print("\n💬 Testing Enhanced Chat Engine...")
    
    try:
        from core.enhanced_chat_engine import EnhancedChatEngine
        
        engine = EnhancedChatEngine()
        
        # Test basic chat
        response = await engine.generate_response(
            message="Hello! Tell me about yourself.",
            persona_name="ashley-girlfriend",
        )

        if isinstance(response, dict):
            preview = response.get("response", "")
        else:
            preview = str(response)

        print(f"✅ Enhanced chat response: {preview[:100]}...")
        
    except ImportError as e:
        print(f"❌ Enhanced chat dependencies not available: {e}")
    except Exception as e:
        print(f"❌ Enhanced chat test failed: {e}")

async def test_api_routes():
    """Test API route imports"""
    print("\n🛠️ Testing API Routes...")
    
    try:
        from api.routes.enhanced import router
        print("✅ Enhanced API routes imported successfully")
        print(f"✅ Router has {len(router.routes)} endpoints")
        
    except ImportError as e:
        print(f"❌ API routes not available: {e}")
    except Exception as e:
        print(f"❌ API routes test failed: {e}")

async def main():
    """Run all tests"""
    print("🚀 Ashley AI Enhanced Features Test Suite")
    print("=" * 50)
    
    await test_pytorch_manager()
    test_internet_access()
    await test_enhanced_chat()
    await test_api_routes()
    
    print("\n" + "=" * 50)
    print("🎉 Test suite completed!")
    print("\nNext steps:")
    print("1. Copy ashley-ai-backend files to this directory")
    print("2. Install dependencies: pip install -r requirements.txt")
    print("3. Start the service: python main.py")
    print("4. Visit http://127.0.0.1:8001/docs for API documentation")

if __name__ == "__main__":
    asyncio.run(main())
