#!/bin/bash

# Development setup script for Ashley AI Unified
# Ensures proper use of existing chatbot_env virtual environment

echo "🔧 Ashley AI Unified - Development Setup"
echo "========================================"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the ashley-ai-unified directory"
    exit 1
fi

# Check if chatbot_env exists
if [ ! -d "../chatbot_env" ]; then
    echo "❌ Virtual environment not found: ../chatbot_env"
    echo "   Please create it first:"
    echo "   cd /Users/soriano/Projects"
    echo "   python -m venv chatbot_env"
    echo "   source chatbot_env/bin/activate"
    echo "   pip install -r ashley-ai-backend/requirements.txt"
    exit 1
fi

echo "✅ Found existing virtual environment: ../chatbot_env"

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Node.js dependencies installed"
else
    echo "❌ Failed to install Node.js dependencies"
    exit 1
fi

# Activate Python environment and install any missing packages
echo "🐍 Setting up Python environment..."
source ../chatbot_env/bin/activate

if [ $? -eq 0 ]; then
    echo "✅ Activated chatbot_env virtual environment"
else
    echo "❌ Failed to activate virtual environment"
    exit 1
fi

# Install Python dependencies (if any are missing)
echo "📦 Installing Python dependencies..."
pip install -r requirements.txt

if [ $? -eq 0 ]; then
    echo "✅ Python dependencies verified/installed"
else
    echo "❌ Failed to install Python dependencies"
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "✅ Created .env file from .env.example"
        echo "⚠️  Please edit .env file and add your API keys"
    else
        echo "⚠️  No .env.example found, please create .env manually"
    fi
fi

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "To start development:"
echo "1. npm run dev          # Starts both Next.js and Python service"
echo ""
echo "To run services separately:"
echo "2a. npm run dev:next    # Next.js frontend only"
echo "2b. npm run dev:python  # Python microservice only"
echo ""
echo "URLs:"
echo "- Frontend: http://localhost:3000"
echo "- Python API: http://127.0.0.1:8001"
echo "- API Docs: http://127.0.0.1:8001/docs"
echo ""
echo "Virtual environment: ../chatbot_env/bin/activate"