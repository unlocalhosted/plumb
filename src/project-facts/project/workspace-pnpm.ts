import type { Detector } from '../detector.js';
import { lineOf } from '../detector.js';
import { claim, unknownClaim } from '../facts.js';
import type { Workspace } from './workspace-manifest.js';

/** pnpm-workspace.yaml declares a workspace only with `packages:`; without it the file is settings for one project. */
export const pnpmDeclaresPackages = (yaml: string) => /^packages:/m.test(yaml);
/** The `packages:` entries, block or inline. */
export function pnpmPatterns(yaml: string): string[] {
  const patterns: string[] = [];
  const block = /^packages:\s*\n((?:[ \t]+[^\n]*\n?)*)/m.exec(yaml)?.[1] ?? '';
  patterns.push(...[...block.matchAll(/^\s*-\s*['"]?([^'"\s#]+)['"]?\s*(?:#.*)?$/gm)].map(match => match[1]!));
  const inline = /^packages:\s*\[([^\]]*)\]/m.exec(yaml)?.[1];
  if (inline) patterns.push(...inline.split(',').map(item => item.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean));
  return patterns;
}

/** `pnpm-workspace.yaml#packages` only (R1): a settings-only file is evidence of a single project, not a claim of a workspace. */
export const workspacePnpm: Detector = {
  id: 'workspace.pnpm', reads: ['pnpm-workspace.yaml'],
  detect(ctx) {
    const yaml = ctx.read('pnpm-workspace.yaml');
    if (yaml === undefined) return {};
    if (yaml instanceof Error) return { workspace: [unknownClaim([ctx.evidence('pnpm-workspace.yaml', 1, `could not read: ${yaml.message}`)], this.id)] };
    if (!pnpmDeclaresPackages(yaml)) return { workspace: [claim<Workspace>(null, 'declared', [ctx.evidence('pnpm-workspace.yaml', 1, 'settings only, no packages: key')], this.id)] };
    const patterns = pnpmPatterns(yaml);
    return { workspace: [claim<Workspace>({ tool: 'pnpm', patterns }, 'declared', [ctx.evidence('pnpm-workspace.yaml', lineOf(yaml, /^packages:/m), `packages: ${patterns.join(', ') || '(empty)'}`)], this.id)] };
  },
};
