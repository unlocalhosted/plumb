import type { Detector } from '../detector.js';
import { lineOf } from '../detector.js';
import { claim } from '../facts.js';

export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun' | 'deno';
const managers = new Set<string>(['npm', 'pnpm', 'yarn', 'bun', 'deno']);

/** `package.json#packageManager` (corepack): the one declared signal. */
export const pmManifest: Detector = {
  id: 'pm.manifest', reads: ['package.json'],
  detect(ctx) {
    const manifest = ctx.manifest();
    if (!manifest || manifest instanceof Error || typeof manifest.packageManager !== 'string') return {};
    const name = manifest.packageManager.split('@')[0]!.trim();
    if (!managers.has(name)) return {};
    return { packageManager: [claim<PackageManager>(name as PackageManager, 'declared', [ctx.evidence('package.json', lineOf(ctx.read('package.json') as string, /"packageManager"\s*:/), `packageManager: ${manifest.packageManager}`)], this.id)] };
  },
};
