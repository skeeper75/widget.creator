import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@widget-creator/core', '@widget-creator/shared'],
};

export default nextConfig;
