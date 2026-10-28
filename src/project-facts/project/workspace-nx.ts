import type { Detector } from '../detector.js';
import { unreadable } from '../detector.js';
import { claim } from '../facts.js';
import type { Workspace } from './workspace-manifest.js';

/** nx.json declares a workspace; its apps are the Nx layout folders (`apps/*`, `libs/*` by default). Registered after the package managers' declarations. */
export const workspaceNx: Detector = {
  id: 'workspace.nx', reads: ['nx.json'],
  detect(ctx) {
    const text = ctx.read('nx.json');
    if (text === undefined) return {};
    if (text instanceof Error) return { workspace: [unreadable(ctx, 'nx.json', text, this.id)] };
    let parsed: { workspaceLayout?: { appsDir?: unknown; libsDir?: unknown } };
    try { parsed = JSON.parse(text) as typeof parsed; } catch (error) { return { workspace: [unreadable(ctx, 'nx.json', error, this.id)] }; }
    const layout = parsed.workspaceLayout ?? {};
    const dirs = [typeof layout.appsDir === 'string' ? layout.appsDir : 'apps', typeof layout.libsDir === 'string' ? layout.libsDir : 'libs'];
    const patterns = [...new Set(dirs.map(dir => `${dir.replace(/\/$/, '')}/*`))];
    return { workspace: [claim<Workspace>({ tool: 'nx', patterns }, 'declared', [ctx.evidence('nx.json', 1, `nx.json: ${patterns.join(', ')}`)], this.id)] };
  },
};
