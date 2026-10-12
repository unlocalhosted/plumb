import type { Plugin } from 'vite';
import { resolve } from 'node:path';
import { Session } from '../session/index.js';
import type { SessionOptions } from '../session/index.js';
import { createHandler } from '../session/server.js';
import { sourceStamping } from './source-stamping.js';

interface Entry { session: Promise<Session>; owners: Set<symbol>; restarting: number }
const key = Symbol.for('@unlocalhosted/plumb/vite/sessions');
const globals = globalThis as typeof globalThis & { [key]?: Map<string, Entry> };
const registry = globals[key] ??= new Map<string, Entry>();
async function dispose(id: string, entry: Entry): Promise<void> {
  if (entry.owners.size || entry.restarting) return;
  if (registry.get(id) === entry) registry.delete(id);
  // A failed startup has no Session to close; its diagnostic is served by the handler.
  const session = await entry.session.catch(() => undefined);
  await session?.close();
}

/** Mount Plumb on Vite's dev server; process ownership survives server restarts. */
export function plumb(options: SessionOptions = {}): Plugin {
  let restarts = 0;
  let release: (() => Promise<void>) | undefined;
  return {
    ...sourceStamping(options),
    resolveId(id) {
      if (id === '/__plumb/src/sourcemap.js') return { id, external: true };
    },
    configureServer(server) {
      const root = options.root === undefined ? server.config.root : resolve(server.config.root, options.root);
      const effective = { ...options, root };
      if (options.config !== undefined) effective.config = resolve(root, options.config);
      const id = JSON.stringify(Object.entries(effective).filter(([, value]) => value !== undefined).sort(([a], [b]) => a.localeCompare(b)));
      let entry = registry.get(id);
      if (!entry) {
        entry = { session: Session.create(effective), owners: new Set(), restarting: 0 };
        registry.set(id, entry);
        const starting = entry;
        // Existing handlers keep the diagnostic; a later restart can retry.
        void starting.session.catch(() => { if (registry.get(id) === starting) registry.delete(id); });
      }
      const owned = entry, owner = Symbol(); owned.owners.add(owner);
      const relinquish = async () => { owned.owners.delete(owner); await dispose(id, owned); };
      void release?.();
      release = relinquish;
      // Vite 6/7 close before configuring the replacement; Vite 8 configures it first.
      // Track the public restart boundary so both orders retain the warm process entry.
      const restart = server.restart;
      server.restart = async (...args) => {
        const stack = server.middlewares.stack;
        owned.restarting++; restarts++;
        try { await restart.apply(server, args); }
        finally {
          owned.restarting--; restarts--;
          if (server.middlewares.stack !== stack) await relinquish();
          else await dispose(id, owned); // Failed restart leaves the old server usable.
        }
      };
      server.httpServer?.once('close', () => { if (!owned.restarting) void relinquish(); });
      server.middlewares.use(createHandler(owned.session, { client: true, servedRoot: server.config.root }));
    },
    transformIndexHtml: { order: 'pre', handler() {
      return [{ tag: 'script', attrs: { type: 'module', src: '/__plumb/client.js' }, injectTo: 'head' },
        { tag: 'script', attrs: { type: 'module' }, children: `import { invalidateSourceMaps } from '/__plumb/src/sourcemap.js';
if (import.meta.hot) import.meta.hot.on('vite:afterUpdate', invalidateSourceMaps);`, injectTo: 'head' }];
    } },
    async closeBundle() { if (!restarts) { await release?.(); release = undefined; } },
  };
}

export default plumb;
