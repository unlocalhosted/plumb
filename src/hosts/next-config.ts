import type { NextConfig } from 'next';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

/** Discover overlay routes and externalize their Node implementation only in development. */
export interface PlumbNextOptions {
  /** Stamp data-plumb-source on every DOM-tag JSX opening of your own .jsx/.tsx, as the Vite host does. Default false. */
  stamp?: boolean;
}

type Rules = Record<string, unknown>;
const STAMP_GLOB = '*.{jsx,tsx}';

function stamping(nextConfig: NextConfig): Partial<NextConfig> {
  const loader = fileURLToPath(new URL('./next-stamp-loader.js', import.meta.url));
  const root = process.cwd();
  const previousWebpack = nextConfig.webpack;
  const turbopack = (nextConfig.turbopack ?? {}) as { rules?: Rules };
  const ours = { condition: { not: 'foreign' }, loaders: [{ loader, options: { root } }] };
  const existing = turbopack.rules?.[STAMP_GLOB];
  return {
    webpack(config, context) {
      const out = previousWebpack ? previousWebpack(config, context) : config;
      out.module ??= {}; out.module.rules ??= [];
      out.module.rules.unshift({ test: /\.[jt]sx$/, exclude: /node_modules/, enforce: 'pre', use: [{ loader, options: { root } }] });
      return out;
    },
    turbopack: { ...turbopack, rules: { ...turbopack.rules, [STAMP_GLOB]: existing === undefined ? ours : Array.isArray(existing) ? [...existing, ours] : [existing, ours] } } as NonNullable<NextConfig['turbopack']>,
  };
}

export function withPlumb(nextConfig: NextConfig = {}, options: PlumbNextOptions = {}): NextConfig {
  if (process.env.NODE_ENV !== 'development') return nextConfig;
  // The overlay asks Next to trace browser frames the way Next's own overlay does, by their file in this directory.
  process.env.PLUMBER_NEXT_DIST_DIR = resolve(nextConfig.distDir ?? '.next', 'dev');
  process.env.PLUMBER_NEXT_SERVER_MODULE = new URL('./next-dev.js', import.meta.url).href;
  return { ...nextConfig, ...(options.stamp ? stamping(nextConfig) : {}),
    pageExtensions: [...new Set([...(nextConfig.pageExtensions ?? ['tsx', 'ts', 'jsx', 'js']), 'plumb.ts', 'plumb.tsx'])],
    serverExternalPackages: [...new Set([...(nextConfig.serverExternalPackages ?? []), '@unlocalhosted/react-plumber'])],
  };
}
