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
  eslint: {
    // Allow production builds to complete even with ESLint errors
    ignoreDuringBuilds: true,
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
  swcMinify: true, // Use SWC for faster minification
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  // Bundle optimization
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Optimize for mobile - split chunks more aggressively
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Vendor chunk for large libraries
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
              priority: 20,
            },
            // Separate chunk for UI components
            ui: {
              name: 'ui',
              chunks: 'all',
              test: /[\\/]components[\\/]ui[\\/]/,
              priority: 10,
            },
            // Common chunk
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 5,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }
    return config;
  },
};

export default nextConfig;
