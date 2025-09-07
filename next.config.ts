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
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'], // Optimize large packages
  },
};

export default nextConfig;
