import type { NextConfig } from 'next';

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  reactStrictMode: false, // Disable strict mode as it affects PeerJS connections
  
  // Allow network IP access for testing
  allowedDevOrigins: ['http://192.168.0.100:3000'],
};

export default nextConfig;
