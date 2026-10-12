import type { NextConfig } from 'next';

/** Discover overlay routes and externalize their Node implementation only in development. */
export function withPlumb(nextConfig: NextConfig = {}): NextConfig {
  if (process.env.NODE_ENV !== 'development') return nextConfig;
  // The overlay asks Next to trace browser frames the way Next's own overlay does, by their file in this directory.
  process.env.PLUMB_NEXT_DIST_DIR = nextConfig.distDir ?? '.next';
  return { ...nextConfig,
    pageExtensions: [...new Set([...(nextConfig.pageExtensions ?? ['tsx', 'ts', 'jsx', 'js']), 'plumb.ts', 'plumb.tsx'])],
    serverExternalPackages: [...new Set([...(nextConfig.serverExternalPackages ?? []), '@unlocalhosted/plumb'])],
  };
}
