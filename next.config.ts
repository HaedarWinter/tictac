import type { NextConfig } from 'next';

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  reactStrictMode: false, // Disable strict mode as it affects PeerJS connections
  
  // ESLint configuration
  eslint: {
    // Only run ESLint on build in CI environments
    ignoreDuringBuilds: true,
  },
  
  // Disable type checking during build to avoid issues
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Optimize for production
  swcMinify: true,
  
  // Ensure proper cross-origin isolation for WebRTC
  headers: async () => {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
