import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import type { Detector } from '../detector.js';
import { claim } from '../facts.js';
import type { PackageManager } from './pm-manifest.js';

export const lockfiles = [['package-lock.json', 'npm'], ['npm-shrinkwrap.json', 'npm'], ['pnpm-lock.yaml', 'pnpm'], ['yarn.lock', 'yarn'], ['bun.lock', 'bun'], ['bun.lockb', 'bun'], ['deno.lock', 'deno']] as const;

/** The nearest lockfile walking up to the home folder (inferred): a lockfile is written by the manager that ran. */
export const pmLockfile: Detector = {
  id: 'pm.lockfile', reads: lockfiles.map(([file]) => file),
  detect(ctx) {
    for (let folder = ctx.root;; folder = dirname(folder)) {
      for (const [file, manager] of lockfiles) {
        if (ctx.exists(join(folder, file))) return { packageManager: [claim<PackageManager>(manager, 'inferred', [ctx.evidence(join(folder, file), 1, file)], this.id)] };
      }
      if (folder === homedir() || dirname(folder) === folder) return {};
    }
  },
};
