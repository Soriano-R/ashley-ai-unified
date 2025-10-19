#!/bin/bash

# Go to project root
cd ~/Projects/ashley-ai-unified

# Start backend
echo "Starting backend (FastAPI)..."
cd python-service
PYTHONPATH=. uvicorn main:app --reload &
BACKEND_PID=$!

# Start frontend
echo "Starting frontend (Next.js)..."
cd ../src
npm run dev &
FRONTEND_PID=$!

# Wait for both
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
wait
