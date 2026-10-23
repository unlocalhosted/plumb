import type { NextConfig } from 'next';
import { resolve } from 'node:path';

/** Discover overlay routes and externalize their Node implementation only in development. */
export function withPlumb(nextConfig: NextConfig = {}): NextConfig {
  if (process.env.NODE_ENV !== 'development') return nextConfig;
  // The overlay asks Next to trace browser frames the way Next's own overlay does, by their file in this directory.
  process.env.PLUMBER_NEXT_DIST_DIR = resolve(nextConfig.distDir ?? '.next', 'dev');
  process.env.PLUMBER_NEXT_SERVER_MODULE = new URL('./next-dev.js', import.meta.url).href;
  return { ...nextConfig,
    pageExtensions: [...new Set([...(nextConfig.pageExtensions ?? ['tsx', 'ts', 'jsx', 'js']), 'plumb.ts', 'plumb.tsx'])],
    serverExternalPackages: [...new Set([...(nextConfig.serverExternalPackages ?? []), '@unlocalhosted/react-plumber'])],
  };
}
