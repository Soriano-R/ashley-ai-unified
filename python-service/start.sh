#!/bin/bash

# Ashley AI Enhanced Startup Script
# This script sets up and starts the enhanced Ashley AI microservice

echo "🚀 Ashley AI Enhanced Startup"
echo "=============================="

# Check if we're in the right directory
if [ ! -f "main.py" ]; then
    echo "❌ Error: main.py not found. Please run from python-service directory."
    exit 1
fi

# Check if virtual environment exists
if [ ! -d "../ashley-ai-backend/chatbot_env" ]; then
    echo "❌ Error: Virtual environment not found at ../ashley-ai-backend/chatbot_env"
    echo "Please ensure the ashley-ai-backend project is in the parent directory"
    exit 1
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source ../ashley-ai-backend/chatbot_env/bin/activate

# Check if enhanced dependencies are installed
echo "📦 Checking dependencies..."
python -c "import torch, transformers, beautifulsoup4" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "⚠️ Enhanced dependencies not found. Installing..."
    pip install -r requirements.txt
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
    echo "✅ Dependencies installed successfully"
else
    echo "✅ Enhanced dependencies found"
fi

# Copy backend files if they don't exist
if [ ! -d "app" ]; then
    echo "📁 Copying backend files..."
    cp -r ../ashley-ai-backend/app .
    cp -r ../ashley-ai-backend/core .
    cp -r ../ashley-ai-backend/tools .
    cp -r ../ashley-ai-backend/storage .
    cp -r ../ashley-ai-backend/personas .
    cp -r ../ashley-ai-backend/knowledge .
    echo "✅ Backend files copied"
fi

# Run tests
echo "🧪 Running enhanced features test..."
python test_enhanced.py

# Start the microservice
echo ""
echo "🌟 Starting Ashley AI Enhanced Microservice..."
echo "📍 Service will be available at: http://127.0.0.1:8001"
echo "📚 API Documentation: http://127.0.0.1:8001/docs"
echo "🛑 Press Ctrl+C to stop"
echo ""

python main.py