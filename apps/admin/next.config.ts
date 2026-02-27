import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@widget-creator/core', '@widget-creator/shared'],
  webpack: (config) => {
    // Allow .js extension imports to resolve .ts files (ESM TypeScript pattern)
    if (config.resolve) {
      config.resolve.extensionAlias = {
        '.js': ['.ts', '.tsx', '.js', '.jsx'],
        '.jsx': ['.tsx', '.jsx'],
        '.mjs': ['.mts', '.mjs'],
        '.cjs': ['.cts', '.cjs'],
      };
    }
    return config;
  },
};

export default nextConfig;
