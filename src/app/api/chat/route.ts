import { NextRequest, NextResponse } from 'next/server';

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://127.0.0.1:8001';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Proxy to Python microservice
    const response = await fetch(`${PYTHON_SERVICE_URL}/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      throw new Error(`Python service error: ${response.status}`);
    }
    
    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Get available models from Python service
    const response = await fetch(`${PYTHON_SERVICE_URL}/chat/models`);
    
    if (!response.ok) {
      throw new Error(`Python service error: ${response.status}`);
    }
    
    const models = await response.json();
    return NextResponse.json(models);
    
  } catch (error) {
    console.error('Models API error:', error);
    return NextResponse.json(
      { error: 'Failed to get models' },
      { status: 500 }
    );
  }
}