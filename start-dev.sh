#!/bin/bash

# Start Ashley AI Unified Development Environment
echo "🚀 Starting Ashley AI Unified Development Environment"
echo "======================================================"

# Ensure we're in the correct directory
cd "$(dirname "$0")"
echo "Working directory: $(pwd)"

# Start both services
echo "Starting Next.js frontend (port 3000/3003) and Python backend (port 8001)..."
npm run dev