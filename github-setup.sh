#!/bin/bash

# Ashley AI Unified - GitHub Setup Script
echo "🚀 Ashley AI Unified - GitHub Setup"
echo "=================================="

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "python-service" ]; then
    echo "❌ Error: Please run this script from the ashley-ai-unified directory"
    exit 1
fi

echo "📋 Ready to push to GitHub!"
echo ""
echo "Next steps:"
echo "1. Create a new repository on GitHub named 'ashley-ai-unified'"
echo "2. Copy the commands below and run them:"
echo ""
echo "   git remote add origin https://github.com/YOUR_USERNAME/ashley-ai-unified.git"
echo "   git push -u origin main"
echo ""
echo "3. Update the repository URLs in the migration notices:"
echo "   - Edit MIGRATION-NOTICE.md files in both old repositories"
echo "   - Replace 'Soriano-R' with your GitHub username"
echo ""
echo "4. Archive the old repositories on GitHub:"
echo "   - Go to Settings > General > Archive this repository"
echo "   - Do this for both ashley-ai-frontend and ashley-ai-backend"
echo ""
echo "✅ Your unified Ashley AI application is ready!"
echo "   - Frontend: http://localhost:3003"
echo "   - Backend: http://localhost:8001"
echo "   - Start with: npm run dev"