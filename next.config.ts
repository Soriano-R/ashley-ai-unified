import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // API route configuration
  async rewrites() {
    return [
      {
        source: '/api/python/:path*',
        destination: 'http://127.0.0.1:8001/:path*', // Python service
      },
    ];
  },
  
  // Environment variables
  env: {
    PYTHON_SERVICE_URL: process.env.PYTHON_SERVICE_URL || 'http://127.0.0.1:8001',
  },
};

export default nextConfig;
