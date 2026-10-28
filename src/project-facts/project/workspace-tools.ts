import type { Detector } from '../detector.js';
import { unreadable } from '../detector.js';
import { claim } from '../facts.js';
import type { Workspace } from './workspace-manifest.js';

/** A JSON workspace file: `file#key` lists the package patterns. Lerna (`lerna.json#packages`), Deno (`deno.json#workspace`). */
function jsonWorkspace(id: string, tool: string, file: string, key: string): Detector {
  return {
    id, reads: [file],
    detect(ctx) {
      const text = ctx.read(file);
      if (text === undefined) return {};
      if (text instanceof Error) return { workspace: [unreadable(ctx, file, text, id)] };
      let parsed: Record<string, unknown>;
      try { parsed = JSON.parse(text) as Record<string, unknown>; } catch (error) { return { workspace: [unreadable(ctx, file, error, id)] }; }
      const value = parsed[key];
      if (!Array.isArray(value)) return { workspace: [claim<Workspace>(null, 'declared', [ctx.evidence(file, 1, `${file}: no ${key} list`)], id)] };
      const patterns = value.filter((item): item is string => typeof item === 'string').map(item => item.replace(/^\.\//, '').replace(/\/$/, ''));
      return { workspace: [claim<Workspace>({ tool, patterns }, 'declared', [ctx.evidence(file, 1, `${key}: ${patterns.join(', ') || '(empty)'}`)], id)] };
    },
  };
}
export const workspaceLerna = jsonWorkspace('workspace.lerna', 'lerna', 'lerna.json', 'packages');
export const workspaceDeno = jsonWorkspace('workspace.deno', 'deno', 'deno.json', 'workspace');

/** turbo.json never declares packages (Turborepo reads the package manager's workspaces): evidence only, no claim. */
export const workspaceTurbo: Detector = {
  id: 'workspace.turbo', reads: ['turbo.json'],
  detect(ctx) {
    return ctx.read('turbo.json') === undefined ? {} : { workspace: [claim<Workspace>(null, 'inferred', [ctx.evidence('turbo.json', 1, 'turbo.json: packages come from the package manager')], this.id)] };
  },
};
