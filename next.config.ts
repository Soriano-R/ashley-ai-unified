/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable experimental features for React 19
  experimental: {
    reactCompiler: true,
  },
  
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
  
  // Disable x-powered-by header
  poweredByHeader: false,
  
  // Compress responses
  compress: true,
  
  // Image optimization
  images: {
    domains: ['localhost'],
  },
};

export default nextConfig;