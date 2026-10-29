import type { Plugin } from 'vite';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
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

/** Mount React Plumber on Vite's dev server; process ownership survives server restarts. */
export interface PlumbViteOptions extends SessionOptions {
  /** Stamp JSX with its source position in dev (default true). Turn it off for an app that hydrates HTML prerendered
   * outside the dev server: that HTML carries no stamps, so React reports a mismatch and renders the page again. */
  stamp?: boolean;
  /** Explicit static demo opt-in: stamp production JSX and mount the real overlay after this replay module.
   * The module must install its transport synchronously. Paths are relative to the Vite root.
   * Ordinary production builds still contain no React Plumber client or stamps. */
  demo?: { replay: string; guard?: boolean };
}

export function plumb({ stamp = true, demo, ...options }: PlumbViteOptions = {}): Plugin {
  let restarts = 0;
  let release: (() => Promise<void>) | undefined;
  let root: string, production = false;
  const entry = '\0plumb:demo';
  const client = fileURLToPath(new URL('../../overlay/client.js', import.meta.url));
  const stamping = sourceStamping(options, Boolean(demo));
  return {
    ...(stamp ? stamping : { name: 'plumb', ...(demo ? {} : { apply: 'serve' as const }) }),
    configResolved(config) {
      root = config.root; production = config.command === 'build';
      if (stamp && typeof stamping.configResolved === 'function') stamping.configResolved.call(this, config);
    },
    resolveId(id) {
      if (demo && id === 'virtual:plumb-demo') return entry;
      if (demo && production && id === '../vendor/bippy/source.js') return createRequire(import.meta.url).resolve('bippy/source');
      if (id === '/__plumb/src/sourcemap.js') return { id, external: true };
    },
    load(id) {
      if (demo && id === entry) return `import ${JSON.stringify(resolve(root, demo.replay))};\n${production ? `await import(${JSON.stringify(client)});` : `const client = '/__plumb/client.js';\nawait import(/* @vite-ignore */ client);`}`;
    },
    async transform(code, id) {
      if (production && id === fileURLToPath(new URL('../../overlay/src/api.js', import.meta.url))) {
        return code.replace("new URL('../', import.meta.url).href", "new URL('/__plumb/', location.href).href");
      }
      if (stamp && typeof stamping.transform === 'function') return stamping.transform.call(this, code, id);
      return null;
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
      server.middlewares.use(createHandler(owned.session, {
        client: true, servedRoot: server.config.root,
        readinessProject: { root, rootOverride: options.root !== undefined, ...(options.config === undefined ? {} : { config: options.config }) },
        readiness: {
          host: 'vite', development: !server.config.isProduction, plugin: true,
          fastRefresh: server.config.plugins.some(plugin => /^vite:react(?:-|:|$)/.test(plugin.name)),
          hmr: server.config.server.hmr !== false, watching: server.config.server.watch !== null,
          polling: server.config.server.watch !== null && server.config.server.watch?.usePolling === true,
        },
      }));
    },
    transformIndexHtml: { order: 'pre', handler() {
      if (demo && (production || demo.guard)) return [{ tag: 'script', attrs: { type: 'module' }, children: `import 'virtual:plumb-demo';`, injectTo: 'head' }];
      // Both tags carry vite-ignore: the plugin's middleware serves /__plumb/*, so Vite must not try to load them as
      // modules of its own (its pre-transform would log "Failed to load url" on every page load). An ignored inline
      // script has no import.meta.hot, so the listener takes its hot context from Vite's client directly.
      return [{ tag: 'script', attrs: { type: 'module', src: '/__plumb/client.js', 'vite-ignore': true }, injectTo: 'head' },
        { tag: 'script', attrs: { type: 'module', 'vite-ignore': true }, children: `import { createHotContext } from '/@vite/client';
import { invalidateSourceMaps } from '/__plumb/src/sourcemap.js';
createHotContext('/__plumb/client.js').on('vite:afterUpdate', invalidateSourceMaps);`, injectTo: 'head' }];
    } },
    async closeBundle() { if (!restarts) { await release?.(); release = undefined; } },
  };
}

export default plumb;
