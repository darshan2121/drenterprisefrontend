import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Production optimizations
  output: 'export', // Enable static export for out folder
  poweredByHeader: false, // Remove X-Powered-By header for security
  compress: true, // Enable gzip compression
  generateEtags: true, // Generate ETags for caching
  
  // Image optimization
  images: {
    unoptimized: true, // Keep unoptimized for static export compatibility
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.drenterprise.it',
        port: '',
        pathname: '/static/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '5678',
        pathname: '/static/**',
      },
      {
        protocol: 'http',
        hostname: '192.168.0.69',
        port: '9002',
        pathname: '/static/**',
      },
      {
        protocol: 'http',
        hostname: '192.168.1.6',
        port: '9002',
        pathname: '/static/**',
      },
    ],
  },
 
  // Build optimizations
  typescript: {
    // Allow production builds to complete even with type errors
    ignoreBuildErrors: true,
  },
  
  // Performance optimizations
  experimental: {
    optimizePackageImports: [
      'lucide-react', 
      '@radix-ui/react-icons',
      'date-fns',
      'react-redux',
      '@reduxjs/toolkit'
    ], // Optimize large packages with tree-shaking
  },
  
  // Mobile optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  // Bundle optimization - Using Turbopack in Next.js 16
  // Webpack config removed as Turbopack is default in Next.js 16
  // Turbopack handles optimization automatically
};

export default nextConfig;
