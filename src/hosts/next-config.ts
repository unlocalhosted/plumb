import type { NextConfig } from 'next';
import { fileURLToPath } from 'node:url';
import { writeNextHost } from './next-host.js';
import { resolve } from 'node:path';
import { nextConfigName } from '../project-facts/project/host-config.js';

type Rules = Record<string, unknown>;
const STAMP_GLOB = '*.{jsx,tsx}';
// which file a message names is a fact about the project: project-facts is the one place that looks for it
const configName = () => nextConfigName();

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
/** The mark on a config withPlumb returned: a second call (a plugin chain wrapping it again) gets it back unchanged. */
const wired = Symbol.for('@unlocalhosted/plumb/withPlumb');
export function withPlumb(nextConfig: NextConfig = {}): NextConfig {
  if (process.env.NODE_ENV !== 'development') return nextConfig;
  if ((nextConfig as NextConfig & { [wired]?: true })[wired]) return nextConfig;
  // The overlay asks Next to trace browser frames the way Next's own overlay does, by their file in this directory.
  const distDir = resolve(nextConfig.distDir ?? '.next', 'dev'), serverModule = new URL('./next-dev.js', import.meta.url).href;
  process.env.PLUMBER_NEXT_DIST_DIR = distDir;
  process.env.PLUMBER_NEXT_SERVER_MODULE = serverModule;
  // the process that serves may not be this one (Next 15.5 + webpack, a config that is a function): the file carries them too
  writeNextHost({ distDir, serverModule });
  // Stamping is what withPlumb does; there is no public switch. The owner-stack regression tests run Next without
  // stamps on purpose, through this internal one: the host then tells the overlay stamps are off by choice.
  const config: NextConfig = { ...nextConfig, ...(process.env.PLUMB_INTERNAL_UNSTAMPED === '1' ? {} : stamping(nextConfig)),
    pageExtensions: [...new Set([...(nextConfig.pageExtensions ?? ['tsx', 'ts', 'jsx', 'js']), 'plumb.ts', 'plumb.tsx'])],
    serverExternalPackages: [...new Set([...(nextConfig.serverExternalPackages ?? []), '@unlocalhosted/react-plumber'])],
  };
  // not enumerable: Next's own reading and serialising of the config never see it
  Object.defineProperty(config, wired, { value: true, enumerable: false });
  return config;
}
