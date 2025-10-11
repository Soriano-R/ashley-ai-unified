#!/bin/bash

# Migration script to copy code from separate repositories to unified structure
# Run this from the ashley-ai-unified directory

echo "🚀 Ashley AI Migration Script"
echo "=============================="

# Define source paths
FRONTEND_SOURCE="../ashley-ai-frontend"
BACKEND_SOURCE="../ashley-ai-backend"

# Check if source directories exist
if [ ! -d "$FRONTEND_SOURCE" ]; then
    echo "❌ Frontend source not found: $FRONTEND_SOURCE"
    exit 1
fi

if [ ! -d "$BACKEND_SOURCE" ]; then
    echo "❌ Backend source not found: $BACKEND_SOURCE"
    exit 1
fi

echo "📂 Source directories found"

# 1. Copy React components from frontend
echo "📋 Copying React components..."
if [ -d "$FRONTEND_SOURCE/src/components" ]; then
    cp -r "$FRONTEND_SOURCE/src/components" ./src/
    echo "✅ Components copied"
else
    echo "⚠️  No components directory found in frontend"
fi

# 2. Copy types from frontend
echo "📋 Copying TypeScript types..."
if [ -d "$FRONTEND_SOURCE/src/types" ]; then
    cp -r "$FRONTEND_SOURCE/src/types" ./src/
    echo "✅ Types copied"
else
    echo "⚠️  No types directory found in frontend"
fi

# 3. Copy utils from frontend
echo "📋 Copying utilities..."
if [ -d "$FRONTEND_SOURCE/src/utils" ]; then
    mkdir -p ./src/lib
    cp -r "$FRONTEND_SOURCE/src/utils"/* ./src/lib/
    echo "✅ Utils copied to src/lib"
else
    echo "⚠️  No utils directory found in frontend"
fi

# 4. Copy Python backend logic
echo "📋 Copying Python AI logic..."

# Core AI modules
for dir in "app" "tools" "storage" "personas"; do
    if [ -d "$BACKEND_SOURCE/$dir" ]; then
        cp -r "$BACKEND_SOURCE/$dir" ./python-service/
        echo "✅ $dir copied"
    else
        echo "⚠️  $dir not found in backend"
    fi
done

# 5. Copy configuration files
echo "📋 Copying configuration..."

# Python requirements
if [ -f "$BACKEND_SOURCE/requirements.txt" ]; then
    cp "$BACKEND_SOURCE/requirements.txt" ./requirements.txt
    echo "✅ requirements.txt updated"
fi

# Environment example
if [ -f "$BACKEND_SOURCE/.env.example" ]; then
    cp "$BACKEND_SOURCE/.env.example" ./.env.example
    echo "✅ .env.example copied"
fi

# Python config
if [ -f "$BACKEND_SOURCE/pyrightconfig.json" ]; then
    cp "$BACKEND_SOURCE/pyrightconfig.json" ./python-service/
    echo "✅ Python config copied"
fi

# 6. Copy assets
echo "📋 Copying assets..."
if [ -d "$BACKEND_SOURCE/assets" ]; then
    cp -r "$BACKEND_SOURCE/assets" ./python-service/
    echo "✅ Assets copied"
fi

# 7. Create updated gitignore
echo "📋 Creating .gitignore..."
cat > .gitignore << EOF
# Dependencies
node_modules/
python-service/__pycache__/
*.pyc
chatbot_env/

# Next.js
.next/
out/

# Environment variables
.env
.env.local
.env.production.local

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Logs
logs/
*.log

# Runtime
*.pid
*.seed
*.lock

# Coverage
coverage/
.nyc_output/

# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg

# Storage
storage/data/
sessions/
EOF

echo "✅ .gitignore created"

echo ""
echo "🎉 Migration completed!"
echo ""
echo "Next steps:"
echo "1. cd ashley-ai-unified"
echo "2. npm install"
echo "3. source ../chatbot_env/bin/activate  # Use existing virtual environment"
echo "4. pip install -r requirements.txt    # Install any missing Python packages"
echo "5. npm run dev                        # Starts both Next.js and Python service"
echo ""
echo "The unified app will run at:"
echo "- Frontend: http://localhost:3000"
echo "- Python API: http://127.0.0.1:8001 (internal)"
echo ""
echo "Note: Using existing chatbot_env virtual environment from ../chatbot_env/"