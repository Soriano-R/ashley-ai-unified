import { NextRequest, NextResponse } from 'next/server';

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://127.0.0.1:8001';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Proxy authentication to Python service
    const response = await fetch(`${PYTHON_SERVICE_URL}/auth/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
      credentials: 'include'
    });
    
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }
    
    const authData = await response.json();
    
    if (!authData?.token) {
      return NextResponse.json(
        { error: 'No token returned from auth service' },
        { status: 500 }
      )
    }
    // Set HTTP-only cookie for session management
    const responseObj = NextResponse.json(authData);
    responseObj.cookies.set('session', authData.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60, // 24 hours
    });
    
    return responseObj;
    
  } catch (error) {
    console.error('Auth API error:', error);
    return NextResponse.json(
      { error: 'Authentication service unavailable' },
      { status: 500 }
    );
  }
}