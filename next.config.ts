import type {NextConfig} from 'next';
import path from 'path';
import fs from 'fs';

// Scan src/views to create case-insensitive and explicit aliases for Vercel/Linux builds
const viewsDir = path.resolve(process.cwd(), 'src/views');
const viewAliases: Record<string, string> = {};

if (fs.existsSync(viewsDir)) {
  const files = fs.readdirSync(viewsDir);
  for (const file of files) {
    if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      const baseName = file.replace(/\.(tsx|ts)$/, '');
      const fullPath = path.join(viewsDir, file);
      if (baseName !== 'index') {
        // Support relative imports from src/App.tsx
        viewAliases[`./views/${baseName}`] = fullPath;
        viewAliases[`./views/${baseName.toLowerCase()}`] = fullPath;
        // Support alias imports
        viewAliases[`@/src/views/${baseName}`] = fullPath;
        viewAliases[`@/src/views/${baseName.toLowerCase()}`] = fullPath;
        viewAliases[`@/views/${baseName}`] = fullPath;
        viewAliases[`@/views/${baseName.toLowerCase()}`] = fullPath;
      }
    }
  }
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // Allow access to remote image placeholder.
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
  // On Vercel, omit standalone so Vercel native serverless routing works flawlessly
  output: process.env.VERCEL ? undefined : 'standalone',
  transpilePackages: ['motion'],
  webpack: (config, {dev}) => {
    // Merge view aliases to ensure case-insensitive and explicit resolution on Vercel
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      ...viewAliases,
    };

    // Ensure common extensions are resolved
    if (config.resolve.extensions) {
      config.resolve.extensions = Array.from(
        new Set(['.tsx', '.ts', '.jsx', '.js', ...config.resolve.extensions])
      );
    }

    // HMR is disabled in AI Studio via DISABLE_HMR env var.
    // Do not modify—file watching is disabled to prevent flickering during agent edits.
    if (dev && process.env.DISABLE_HMR === 'true') {
      config.watchOptions = {
        ignored: /.*/,
      };
    }
    return config;
  },
};

export default nextConfig;
