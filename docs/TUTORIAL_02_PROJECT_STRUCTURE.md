# Ashley AI Chatbot Tutorial - Part 2: Project Structure and Dependencies

## Overview

In this part, we'll establish the complete project structure and install all necessary dependencies for both the frontend and backend components of Ashley AI.

## Project Structure Setup

### Step 1: Create Directory Structure

Create the complete directory structure for your project:

```bash
# Ensure you're in your project root
cd ashley-ai-chatbot

# Create main directories
mkdir -p src/app
mkdir -p src/components
mkdir -p src/lib
mkdir -p python-service/app
mkdir -p python-service/core
mkdir -p python-service/tools
mkdir -p python-service/storage
mkdir -p python-service/sessions
mkdir -p docs
mkdir -p public

# Create subdirectories for components
mkdir -p src/components/ui
mkdir -p src/components/chat
mkdir -p src/components/auth

# Create subdirectories for Python service
mkdir -p python-service/app
mkdir -p python-service/core
mkdir -p python-service/tools
mkdir -p python-service/storage/data
mkdir -p python-service/personas
```

### Step 2: Initialize Next.js Project

Set up the Next.js frontend:

```bash
# Initialize package.json
npm init -y

# Install Next.js and core dependencies
npm install next@latest react@latest react-dom@latest

# Install TypeScript and related packages
npm install -D typescript @types/react @types/react-dom @types/node

# Install Tailwind CSS for styling
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Install additional UI dependencies
npm install lucide-react
npm install @next/font

# Install utility libraries
npm install clsx tailwind-merge
npm install uuid @types/uuid
```

### Step 3: Configure Package.json Scripts

Update your `package.json` with the following scripts:

```json
{
  "name": "ashley-ai-chatbot",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "concurrently \"npm run dev:next\" \"npm run dev:python\"",
    "dev:next": "next dev --turbopack",
    "dev:python": "cd python-service && source ../chatbot_env/bin/activate && python main.py",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "next": "^15.5.4",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "lucide-react": "^0.400.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.4.0",
    "uuid": "^10.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0",
    "@types/node": "^20.0.0",
    "@types/uuid": "^10.0.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "concurrently": "^8.2.0"
  }
}
```

Install the `concurrently` package to run both services simultaneously:

```bash
npm install -D concurrently
```

### Step 4: Python Dependencies Setup

Create `requirements.txt` for Python dependencies:

```txt
# Web Framework
fastapi==0.104.1
uvicorn[standard]==0.24.0

# AI and ML
openai==1.3.0
langchain==0.0.350
langchain-openai==0.0.2

# Data Processing
pydantic==2.5.0
python-multipart==0.0.6
python-dotenv==1.0.0

# Utilities
aiofiles==23.2.1
httpx==0.25.2
tenacity==8.2.3

# Development
pytest==7.4.3
pytest-asyncio==0.21.1
```

Install Python dependencies:

```bash
# Ensure virtual environment is activated
source chatbot_env/bin/activate

# Install dependencies
pip install -r requirements.txt
```

## Configuration Files

### Step 1: TypeScript Configuration

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/app/*": ["./src/app/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### Step 2: Next.js Configuration

Create `next.config.ts`:

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  },
}

export default nextConfig
```

### Step 3: Tailwind CSS Configuration

Update `tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)'],
        mono: ['var(--font-geist-mono)'],
      },
    },
  },
  plugins: [],
}
```

### Step 4: PostCSS Configuration

Update `postcss.config.mjs`:

```javascript
/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}

export default config
```

## Essential Files Creation

### Step 1: Create Next.js Environment File

Create `next-env.d.ts`:

```typescript
/// <reference types="next" />
/// <reference types="next/image-types/global" />

// NOTE: This file should not be edited
// see https://nextjs.org/docs/basic-features/typescript for more information.
```

### Step 2: Create Python Service Structure

Create the main Python service file `python-service/main.py`:

```python
"""
Ashley AI Python Microservice
Main FastAPI application entry point
"""
import os
import sys
import logging
from pathlib import Path

# Add the current directory to Python path
sys.path.append(str(Path(__file__).parent))

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from typing import AsyncGenerator

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan management"""
    logger.info("Starting Ashley AI Python Microservice")
    logger.info("Ashley AI Python Microservice startup complete")
    yield
    logger.info("Shutting down Ashley AI Python Microservice")

def create_app() -> FastAPI:
    """Create and configure the FastAPI application"""
    app = FastAPI(
        title="Ashley AI Python Microservice",
        description="AI-powered chatbot backend service",
        version="1.0.0",
        lifespan=lifespan,
    )
    
    # CORS configuration
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE"],
        allow_headers=["*"],
    )
    
    # Health check endpoint
    @app.get("/health")
    async def health_check():
        return {"status": "healthy", "service": "ashley-ai-python-microservice"}
    
    return app

# Create the FastAPI app
app = create_app()

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8001,
        reload=True,
        log_level="info"
    )
```

### Step 3: Create Basic Python Configuration

Create `python-service/app/__init__.py`:

```python
"""
Ashley AI Application Package
"""
__version__ = "1.0.0"
```

Create `python-service/app/config.py`:

```python
"""
Configuration settings for Ashley AI
"""
import os
from typing import Optional
from pydantic import BaseSettings

class Settings(BaseSettings):
    """Application settings"""
    
    # OpenAI Configuration
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    openai_model: str = os.getenv("OPENAI_MODEL", "gpt-4")
    
    # Application Configuration
    app_name: str = os.getenv("NEXT_PUBLIC_APP_NAME", "Ashley AI")
    debug: bool = os.getenv("DEBUG", "false").lower() == "true"
    
    # Service Configuration
    service_host: str = os.getenv("PYTHON_SERVICE_HOST", "127.0.0.1")
    service_port: int = int(os.getenv("PYTHON_SERVICE_PORT", "8001"))
    
    class Config:
        env_file = ".env"
        case_sensitive = False

# Global settings instance
settings = Settings()
```

## Project Validation

### Step 1: Verify Directory Structure

Your project structure should now look like this:

```
ashley-ai-chatbot/
├── .env
├── .gitignore
├── package.json
├── requirements.txt
├── tsconfig.json
├── next.config.ts
├── tailwind.config.js
├── postcss.config.mjs
├── next-env.d.ts
├── chatbot_env/          # Virtual environment
├── src/
│   ├── app/
│   ├── components/
│   │   ├── ui/
│   │   ├── chat/
│   │   └── auth/
│   └── lib/
├── python-service/
│   ├── main.py
│   ├── app/
│   │   ├── __init__.py
│   │   └── config.py
│   ├── core/
│   ├── tools/
│   ├── storage/
│   │   └── data/
│   ├── sessions/
│   └── personas/
├── docs/
└── public/
```

### Step 2: Test Dependencies Installation

Verify that all dependencies are properly installed:

```bash
# Test Node.js dependencies
npm list --depth=0

# Test Python dependencies (ensure virtual environment is activated)
source chatbot_env/bin/activate
pip list
```

### Step 3: Test Basic Services

Test that the basic services can start:

```bash
# Test Python service
cd python-service
source ../chatbot_env/bin/activate
python main.py
```

You should see output indicating the FastAPI server is running on port 8001.

In another terminal, test the health endpoint:

```bash
curl http://localhost:8001/health
```

You should receive a JSON response: `{"status":"healthy","service":"ashley-ai-python-microservice"}`

## Environment Variables Configuration

Update your `.env` file with all necessary variables:

```env
# OpenAI Configuration
OPENAI_API_KEY=your_actual_api_key_here
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

# Security (for future use)
JWT_SECRET=your_jwt_secret_here
SESSION_SECRET=your_session_secret_here
```

## Next Steps

Congratulations! You've successfully set up the project structure and installed all dependencies. Your development environment is now ready for the core development work.

In the next part of this tutorial, we'll:
- Build the complete Python backend with AI orchestration
- Implement chat functionality and session management
- Create the OpenAI integration
- Set up content moderation and safety features

Continue to **TUTORIAL_03_PYTHON_BACKEND.md** to proceed with backend development.

## Troubleshooting

### Common Issues and Solutions

**Node.js Dependency Issues**:
- Clear npm cache: `npm cache clean --force`
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`

**Python Virtual Environment Issues**:
- Recreate environment: `rm -rf chatbot_env && python3 -m venv chatbot_env`
- Ensure activation: `source chatbot_env/bin/activate`

**Port Conflicts**:
- Check for running processes: `lsof -i :3000` and `lsof -i :8001`
- Kill conflicting processes or use different ports

**TypeScript Configuration Issues**:
- Ensure all TypeScript packages are installed
- Check that paths in `tsconfig.json` match your directory structure