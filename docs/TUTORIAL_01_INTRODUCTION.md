# Ashley AI Chatbot Tutorial - Part 1: Introduction and Setup

## Table of Contents
This tutorial is divided into the following parts:
1. **Introduction and Setup** (This file)
2. Project Structure and Dependencies 
3. Python Backend Development
4. Frontend Development with Next.js
5. Integration and Testing
6. GitHub Setup and Deployment
7. Configuration and Customization

## Introduction

Welcome to the comprehensive Ashley AI Chatbot tutorial. This guide will walk you through creating a fully functional AI chatbot application from scratch. By the end of this tutorial, you'll have a professional-grade chatbot with a beautiful user interface, AI-powered conversations, and enterprise-level features.

## What You'll Build

Ashley AI is a modern chatbot application that combines:
- **Next.js 15** frontend with React 19 and TypeScript
- **Python FastAPI** backend with AI orchestration
- **OpenAI Integration** for intelligent conversations
- **Beautiful Dark Theme UI** with Tailwind CSS
- **Session Management** and conversation history
- **Multiple AI Personas** for different use cases
- **Content Moderation** and safety features
- **Admin Panel** for configuration and monitoring

## Prerequisites

Before starting this tutorial, ensure you have:

### Required Software
- **Node.js** (version 18 or higher)
- **Python** (version 3.9 or higher)
- **Git** for version control
- **Visual Studio Code** (recommended editor)
- **Terminal/Command Line** access

### Required Accounts
- **OpenAI Account** with API access
- **GitHub Account** for code repository

### Knowledge Requirements
- Basic understanding of JavaScript/TypeScript
- Basic understanding of Python
- Familiarity with command line operations
- Basic knowledge of web development concepts

## System Requirements

### Hardware
- **RAM**: Minimum 8GB (16GB recommended)
- **Storage**: At least 2GB free space
- **CPU**: Modern multi-core processor

### Operating Systems
This tutorial works on:
- **macOS** (10.15 or later)
- **Windows** (10 or later)
- **Linux** (Ubuntu 18.04+ or equivalent)

## Initial Setup

### Step 1: Verify Prerequisites

First, verify that you have the required software installed:

#### Check Node.js
```bash
node --version
npm --version
```
You should see versions 18.0.0 or higher for Node.js.

#### Check Python
```bash
python3 --version
pip3 --version
```
You should see version 3.9.0 or higher for Python.

#### Check Git
```bash
git --version
```

### Step 2: Create Project Directory

Create a dedicated directory for your Ashley AI project:

```bash
# Navigate to your preferred development directory
cd ~/Projects  # or wherever you keep your projects

# Create the project directory
mkdir ashley-ai-chatbot
cd ashley-ai-chatbot
```

### Step 3: Set Up Git Repository

Initialize a Git repository for version control:

```bash
# Initialize Git repository
git init

# Create a .gitignore file
touch .gitignore
```

Add the following content to `.gitignore`:

```gitignore
# Dependencies
node_modules/
__pycache__/
*.pyc
*.pyo
*.pyd
.Python
env/
venv/
.venv/
pip-log.txt
pip-delete-this-directory.txt
.coverage
.pytest_cache/
htmlcov/

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Next.js
.next/
out/
build/
dist/

# IDEs
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# AI Models (these can be large)
*.gguf
models/

# Session data
sessions/
storage/data/

# Temporary files
tmp/
temp/
```

### Step 4: Obtain OpenAI API Key

1. Visit [OpenAI's website](https://platform.openai.com/)
2. Sign up or log in to your account
3. Navigate to API Keys section
4. Create a new API key
5. **Important**: Save this key securely - you'll need it later

### Step 5: Plan Your Project Structure

Your final project will have this structure:
```
ashley-ai-chatbot/
├── src/                    # Next.js frontend
│   ├── app/
│   ├── components/
│   └── lib/
├── python-service/         # Python backend
│   ├── app/
│   ├── core/
│   ├── tools/
│   └── main.py
├── docs/                   # Documentation
├── package.json
├── requirements.txt
└── README.md
```

## Environment Setup

### Step 1: Create Python Virtual Environment

A virtual environment isolates your Python dependencies:

```bash
# Create virtual environment
python3 -m venv chatbot_env

# Activate the environment
# On macOS/Linux:
source chatbot_env/bin/activate

# On Windows:
# chatbot_env\Scripts\activate

# Verify activation (you should see (chatbot_env) in your prompt)
which python
```

### Step 2: Create Environment Variables File

Create a `.env` file for your configuration:

```bash
touch .env
```

Add the following template to `.env`:

```env
# OpenAI Configuration
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-4

# Application Configuration
NEXT_PUBLIC_APP_NAME=Ashley AI
NEXT_PUBLIC_API_URL=http://localhost:8001

# Python Service Configuration
PYTHON_SERVICE_PORT=8001
PYTHON_SERVICE_HOST=127.0.0.1

# Development Settings
NODE_ENV=development
DEBUG=true
```

**Important**: Replace `your_api_key_here` with your actual OpenAI API key.

## Next Steps

You've successfully completed the initial setup! Your development environment is now ready for building the Ashley AI chatbot.

In the next part of this tutorial, we'll:
- Set up the detailed project structure
- Install all required dependencies
- Configure the development environment
- Prepare the foundation for both frontend and backend development

Continue to **TUTORIAL_02_PROJECT_STRUCTURE.md** to proceed with the next phase of development.

## Troubleshooting Common Setup Issues

### Node.js Installation Issues
If Node.js is not installed or outdated:
- Visit [nodejs.org](https://nodejs.org/) and download the LTS version
- Use a version manager like `nvm` for easier management

### Python Installation Issues
If Python is not available or outdated:
- Visit [python.org](https://www.python.org/) for installation instructions
- On macOS, consider using Homebrew: `brew install python3`
- On Windows, ensure Python is added to your PATH

### Virtual Environment Issues
If virtual environment creation fails:
- Ensure you have the `venv` module: `python3 -m pip install virtualenv`
- Try using `virtualenv` instead: `virtualenv chatbot_env`

### Permission Issues
If you encounter permission errors:
- On macOS/Linux, avoid using `sudo` with pip
- Ensure you have write permissions to your project directory
- Consider using a different project location if needed

## Support and Resources

If you encounter issues during setup:
1. Double-check each step carefully
2. Ensure all prerequisites are properly installed
3. Verify your OpenAI API key is valid and has credits
4. Check that your virtual environment is activated

The tutorial is designed to be followed sequentially, so complete each step before moving to the next part.