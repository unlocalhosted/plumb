import type { Context, Detector } from '../detector.js';
import { claim } from '../facts.js';

export interface Host { id: string; configFile: string | null }
export const hostConfigNames = {
  vite: ['ts', 'mts', 'js', 'mjs'].map(extension => `vite.config.${extension}`),
  next: ['ts', 'mts', 'js', 'mjs', 'cjs'].map(extension => `next.config.${extension}`),
} as const;

/** The dev host's config file (declared). Both families present: vite first by registry order, next kept as a conflict. */
export const hostConfig: Detector = {
  id: 'host.config', reads: [...hostConfigNames.vite, ...hostConfigNames.next],
  detect(ctx) {
    const claims = [];
    for (const [id, names] of Object.entries(hostConfigNames)) {
      const file = names.find(name => ctx.exists(name));
      if (file) claims.push(claim<Host>({ id, configFile: file }, 'declared', [ctx.evidence(file, 1, file)], this.id));
    }
    return claims.length ? { host: claims } : {};
  },
};

/** Bundler configs that may name the app's entry (for CSS entry discovery): the only place that looks for them. */
export function bundlerConfigFiles(ctx: Context): string[] {
  const files: string[] = [];
  for (const name of ['vite', 'rollup', 'webpack']) for (const extension of ['ts', 'mts', 'mjs', 'js', 'cjs']) {
    const file = `${name}.config.${extension}`;
    if (ctx.exists(file)) files.push(file);
  }
  return files;
}
