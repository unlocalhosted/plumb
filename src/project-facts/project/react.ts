import { createRequire } from 'node:module';
import { join } from 'node:path';
import type { Detector } from '../detector.js';
import { lineOf } from '../detector.js';
import { claim } from '../facts.js';

export interface React { installed: boolean; declared: string | null }

/** One `require.resolve('react')` from the root (observed), else the dependency range (declared), else nothing. */
export const reactResolve: Detector = {
  id: 'react.resolve', reads: ['package.json'],
  detect(ctx) {
    const declared = ctx.dependencies().react ?? ctx.dependencies().next ?? null;
    let installed = false;
    try { createRequire(join(ctx.root, 'package.json')).resolve('react'); installed = true; }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'MODULE_NOT_FOUND') return { react: [claim<React>({ installed: false, declared }, 'declared', [ctx.evidence('package.json', 1, `react: ${(error as Error).message}`)], this.id)] }; }
    if (installed) return { react: [claim<React>({ installed: true, declared }, 'observed', [ctx.evidence('package.json', 1, 'React resolves')], this.id)] };
    if (declared !== null) return { react: [claim<React>({ installed: false, declared }, 'declared', [ctx.evidence('package.json', lineOf(ctx.read('package.json') as string, /"react"\s*:|"next"\s*:/), `react: ${declared}, not installed`)], this.id)] };
    return {};
  },
};
