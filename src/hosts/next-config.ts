import type { NextConfig } from 'next';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

type Rules = Record<string, unknown>;
const STAMP_GLOB = '*.{jsx,tsx}';
const configName = () => ['next.config.ts', 'next.config.mjs', 'next.config.js', 'next.config.mts', 'next.config.cjs'].find(name => existsSync(resolve(name))) ?? 'next.config';

/**
 * Stamping is what withPlumb does in development, on webpack and Turbopack, merged with the app's own rules: the
 * loader runs before Next's compiler on every DOM-tag JSX opening of your files. A config shape that would keep the
 * loader out is an error here, at config load, with the fix; what only shows at build time is reported there.
 */
function stamping(nextConfig: NextConfig): Partial<NextConfig> {
  const loader = fileURLToPath(new URL('./next-stamp-loader.js', import.meta.url));
  const root = process.cwd();
  const previousWebpack = nextConfig.webpack;
  if (previousWebpack !== undefined && typeof previousWebpack !== 'function') throw new Error(`[plumb] In ${configName()}, webpack must be a function (config, context) => config. React Plumber adds its source loader to the config that function returns; set webpack to a function, or remove it.`);
  const turbopack = (nextConfig.turbopack ?? {}) as { rules?: Rules };
  const ours = { condition: { not: 'foreign' }, loaders: [{ loader, options: { root } }] };
  const existing = turbopack.rules?.[STAMP_GLOB];
  if (existing !== undefined && typeof existing !== 'object') throw new Error(`[plumb] In ${configName()}, turbopack.rules["${STAMP_GLOB}"] must be a rule or an array of rules. React Plumber adds its source loader after yours; make that entry an object or array, or remove it.`);
  return {
    webpack(config, context) {
      const out = previousWebpack ? previousWebpack(config, context) : config;
      if (!out || typeof out !== 'object') throw new Error(`[plumb] In ${configName()}, webpack() must return the config it was given. React Plumber adds its source loader to that config; end the function with \`return config\`.`);
      out.module ??= {}; out.module.rules ??= [];
      if (!Array.isArray(out.module.rules)) throw new Error(`[plumb] In ${configName()}, webpack() must leave module.rules an array. React Plumber adds its source loader there.`);
      out.module.rules.unshift({ test: /\.[jt]sx$/, exclude: /node_modules/, enforce: 'pre', use: [{ loader, options: { root } }] });
      return out;
    },
    turbopack: { ...turbopack, rules: { ...turbopack.rules, [STAMP_GLOB]: existing === undefined ? ours : Array.isArray(existing) ? [...existing, ours] : [existing, ours] } } as NonNullable<NextConfig['turbopack']>,
  };
}

/** Discover overlay routes, externalize their Node implementation and stamp your JSX, only in development. */
export function withPlumb(nextConfig: NextConfig = {}): NextConfig {
  if (process.env.NODE_ENV !== 'development') return nextConfig;
  // The overlay asks Next to trace browser frames the way Next's own overlay does, by their file in this directory.
  process.env.PLUMBER_NEXT_DIST_DIR = resolve(nextConfig.distDir ?? '.next', 'dev');
  process.env.PLUMBER_NEXT_SERVER_MODULE = new URL('./next-dev.js', import.meta.url).href;
  // Stamping is what withPlumb does; there is no public switch. The owner-stack regression tests run Next without
  // stamps on purpose, through this internal one: the host then tells the overlay stamps are off by choice.
  return { ...nextConfig, ...(process.env.PLUMB_INTERNAL_UNSTAMPED === '1' ? {} : stamping(nextConfig)),
    pageExtensions: [...new Set([...(nextConfig.pageExtensions ?? ['tsx', 'ts', 'jsx', 'js']), 'plumb.ts', 'plumb.tsx'])],
    serverExternalPackages: [...new Set([...(nextConfig.serverExternalPackages ?? []), '@unlocalhosted/react-plumber'])],
  };
}
