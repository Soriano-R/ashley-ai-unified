#!/bin/bash

# Test script to verify the unified setup works with chatbot_env
echo "🧪 Testing Ashley AI Unified Setup"
echo "=================================="

# Test 1: Check if virtual environment exists
echo "1. Checking virtual environment..."
if [ -d "../chatbot_env" ]; then
    echo "✅ Virtual environment found: ../chatbot_env"
else
    echo "❌ Virtual environment not found: ../chatbot_env"
    exit 1
fi

# Test 2: Activate virtual environment
echo "2. Activating virtual environment..."
source ../chatbot_env/bin/activate

if [ $? -eq 0 ]; then
    echo "✅ Virtual environment activated"
    echo "   Python path: $(which python)"
    echo "   Python version: $(python --version)"
else
    echo "❌ Failed to activate virtual environment"
    exit 1
fi

# Test 3: Check Python dependencies
echo "3. Checking Python dependencies..."
python -c "
import sys
required_packages = ['fastapi', 'uvicorn', 'openai', 'gradio']
missing = []

for package in required_packages:
    try:
        __import__(package)
        print(f'✅ {package} imported successfully')
    except ImportError:
        missing.append(package)
        print(f'❌ {package} not found')

if missing:
    print(f'Missing packages: {missing}')
    print('Run: pip install -r requirements.txt')
    sys.exit(1)
else:
    print('✅ All required Python packages found')
"

if [ $? -ne 0 ]; then
    echo "❌ Python dependency check failed"
    exit 1
fi

# Test 4: Check Node.js setup
echo "4. Checking Node.js setup..."
if [ -f "package.json" ]; then
    echo "✅ package.json found"
    if [ -d "node_modules" ]; then
        echo "✅ node_modules found"
    else
        echo "⚠️  node_modules not found, run: npm install"
    fi
else
    echo "❌ package.json not found"
    exit 1
fi

# Test 5: Check if FastAPI can start (dry run)
echo "5. Testing FastAPI startup..."
cd python-service
python -c "
try:
    from main import create_app
    app = create_app()
    print('✅ FastAPI app creation successful')
except Exception as e:
    print(f'❌ FastAPI app creation failed: {e}')
    exit(1)
"

if [ $? -eq 0 ]; then
    echo "✅ FastAPI startup test passed"
else
    echo "❌ FastAPI startup test failed"
    exit 1
fi

cd ..

echo ""
echo "🎉 All tests passed!"
echo ""
echo "Your unified Ashley AI setup is ready to use with chatbot_env!"
echo ""
echo "Start development with: npm run dev"