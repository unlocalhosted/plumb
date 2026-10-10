import type { NextConfig } from 'next';

/** Discover overlay routes and externalize their Node implementation only in development. */
export function withPlumb(nextConfig: NextConfig = {}): NextConfig {
  if (process.env.NODE_ENV !== 'development') return nextConfig;
  return { ...nextConfig,
    pageExtensions: [...new Set([...(nextConfig.pageExtensions ?? ['tsx', 'ts', 'jsx', 'js']), 'plumb.ts', 'plumb.tsx'])],
    serverExternalPackages: [...new Set([...(nextConfig.serverExternalPackages ?? []), '@unlocalhosted/plumb'])],
  };
}
