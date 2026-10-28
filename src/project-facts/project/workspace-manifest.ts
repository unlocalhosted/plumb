import type { Detector } from '../detector.js';
import { lineOf, unreadable } from '../detector.js';
import { claim } from '../facts.js';

export interface Workspace { tool: string; patterns: string[] }

/** `package.json#workspaces` (array or `{ packages }`): npm, yarn classic and berry, bun. */
export const workspaceManifest: Detector = {
  id: 'workspace.manifest', reads: ['package.json'],
  detect(ctx) {
    const manifest = ctx.manifest();
    if (manifest === undefined) return {};
    if (manifest instanceof Error) return { workspace: [unreadable(ctx, 'package.json', manifest, this.id)] };
    const workspaces = manifest.workspaces;
    if (workspaces === undefined) return {};
    const list = Array.isArray(workspaces) ? workspaces : workspaces && typeof workspaces === 'object' && 'packages' in workspaces && Array.isArray(workspaces.packages) ? workspaces.packages : [];
    const patterns = list.filter((item): item is string => typeof item === 'string');
    const line = lineOf(ctx.read('package.json') as string, /"workspaces"\s*:/);
    const tool = /^\s*(?:bun)\b/.test(String(manifest.packageManager ?? '')) ? 'bun' : /^\s*yarn\b/.test(String(manifest.packageManager ?? '')) ? 'yarn' : 'npm';
    return { workspace: [claim<Workspace>({ tool, patterns }, 'declared', [ctx.evidence('package.json', line, `workspaces: ${patterns.join(', ') || '(empty)'}`)], this.id)] };
  },
};
