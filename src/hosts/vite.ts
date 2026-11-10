import type { ModuleNode, Plugin, ViteDevServer } from 'vite';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { Session } from '../session/index.js';
import type { SessionOptions } from '../session/index.js';
import { createHandler } from '../session/server.js';
import { sourceStamping } from './source-stamping.js';
import { sourceHash } from '../collect/cache.js';

interface Entry { session: Promise<Session>; owners: Set<symbol>; restarting: number }
/** Hot updates held while one apply-all transaction writes its files: what Vite saw, and whether any of it would reload the page. */
interface Held { files: Set<string>; modules: Map<string, ModuleNode>; full: boolean; timer: NodeJS.Timeout; /** the writes are done: the files still to be seen by the watcher before the one release */ ending?: { expected: Set<string>; timer: NodeJS.Timeout } }
type Transaction = { phase: 'start' } | { phase: 'progress' } | ({ phase: 'end' } & Record<string, unknown>);
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
  /** Explicit static demo opt-in: stamp production JSX and mount the real overlay after this replay module.
   * The module must install its transport synchronously. Paths are relative to the Vite root.
   * Ordinary production builds still contain no React Plumber client or stamps. */
  demo?: { replay: string; guard?: boolean };
}

export function plumb({ demo, ...options }: PlumbViteOptions = {}): Plugin {
  // Stamping is what the plugin does; there is no public switch. The static demo and the owner-stack regression tests
  // run without stamps on purpose, through this internal one: the host then tells the overlay stamps are off by choice.
  const { stamp = true } = options as { stamp?: boolean };
  let restarts = 0;
  let release: (() => Promise<void>) | undefined;
  let root: string, production = false;
  const entry = '\0plumb:demo';
  const client = fileURLToPath(new URL('../../overlay/client.js', import.meta.url));
  const stamping = sourceStamping(options, Boolean(demo));
  // One apply-all is one transaction against Vite's hot updates: every file it writes is held (handleHotUpdate /
  // hotUpdate return nothing for it), the page is told the whole result first (`plumb:applied` over the HMR socket,
  // so a reload cannot lose the confirmation), then one release follows: one update per held module, which the app's
  // Fast Refresh takes without a reload; a full reload only when the page's own HTML was written. Ordinary saves from an editor are never held. If the transaction
  // dies, whatever is held goes out after five seconds of silence (the engine reports progress at every item and
  // every write, so a long apply is never released, and reloaded, mid-write). Next.js has no such hook (webpack, Fast Refresh): there
  // apply-all writes back to back, and the page reloads as it would for any save.
  let held: Held | undefined, hotServer: ViteDevServer | undefined;
  // What the session wrote, by content: the hash of each file as the session left it, and whether the page has had
  // it (one report went out, or the transaction's release did). The watcher reports a write a poll later, sometimes
  // seconds later under load: its report of a file whose content is still what the session wrote carries nothing the
  // page does not have and goes nowhere, however late it comes. Different content is someone else's save (an editor)
  // and goes out as any save would. Content, not a time window, is what tells the two apart.
  const ours = new Map<string, { hash: Promise<string>; sent: boolean }>();
  const hashOf = (file: string) => readFile(file, 'utf8').then(sourceHash, () => '');
  // Whether a module's update stops at something that accepts it, as Vite decides it: the module accepts itself
  // (a component under Fast Refresh, a stylesheet), or every path up its importers reaches one that accepts it.
  // A path that runs out of importers is the page's entry: only a reload shows the change.
  const accepted = (module: ModuleNode, seen = new Set<ModuleNode>()): boolean => {
    if (seen.has(module)) return true;
    seen.add(module);
    if (module.isSelfAccepting) return true;
    if (!module.importers.size) return false;
    for (const importer of module.importers) if (!importer.acceptedHmrDeps.has(module) && !accepted(importer, seen)) return false;
    return true;
  };
  const releaseHeld = () => {
    const current = held; held = undefined;
    if (!current) return;
    clearTimeout(current.timer); clearTimeout(current.ending?.timer);
    if (!hotServer || !current.files.size) return;
    for (const file of current.files) ours.set(file, { hash: hashOf(file), sent: true });
    // One reload at most. A module that nothing accepts (an app without Fast Refresh, an entry file) would make Vite
    // reload the page for it; several such modules released one by one reloaded it several times over. When any
    // held module is like that, the one reload is sent here and no module is released on its own.
    if (current.full || [...current.modules.values()].some(module => !accepted(module))) hotServer.ws.send({ type: 'full-reload', path: '*' });
    else for (const module of current.modules.values()) {
      // hotUpdate (Vite 6+) holds an environment's module: it reloads through that environment (server.reloadModule
      // takes only the old mixed module and throws on it). Anything that still fails reloads the page instead
      const environment = (module as { environment?: string }).environment, server = hotServer;
      const own = environment ? (server as unknown as { environments?: Record<string, { reloadModule(m: unknown): Promise<void> }> }).environments?.[environment] : undefined;
      const reload = async () => { if (environment && !own) throw new Error('no such environment'); await (own ? own.reloadModule(module) : server.reloadModule(module)); };
      void reload().catch(() => server.ws.send({ type: 'full-reload', path: '*' }));
    }
  };
  const alive = () => { if (held && !held.ending) { clearTimeout(held.timer); held.timer = setTimeout(() => releaseHeld(), 5000); } };
  const onTransaction = (event: Transaction) => {
    if (event.phase === 'start') { releaseHeld(); held = { files: new Set(), modules: new Map(), full: false, timer: setTimeout(() => releaseHeld(), 5000) }; return; }
    if (event.phase === 'progress') { alive(); return; }
    const { phase: _phase, ...data } = event;
    // the page hears the whole result before anything reloads it
    hotServer?.ws.send({ type: 'custom', event: 'plumb:applied', data });
    if (!held) return;
    // the watcher reports the written files a moment after the writes: wait for each of them (two seconds at most),
    // so they are held into the one release instead of reloading the page one by one afterwards
    const expected = new Set(((data.undo as { file: string }[] | undefined) ?? []).map(entry => resolve(root, entry.file)));
    held.ending = { expected, timer: setTimeout(releaseHeld, 2000) };
    if ([...expected].every(file => held!.files.has(file))) releaseHeld();
  };
  // A file the session wrote is told to Vite at once, as the watcher would tell it a poll later: the page's update does
  // not wait on the watcher (a polling watcher under load reports seconds late, and misses a second write landing
  // within the same tick), and a reload in that window gets the new module, not a 304 of the old one. The first report
  // Vite makes of that content goes out; every later report of the same content (the watcher's own, whenever it
  // comes) goes nowhere. Under a transaction the word still reaches Vite: the module is held with the others and goes
  // out in the one release, and the watcher's later report of it is recognised the same way.
  const onWritten = (file: string) => {
    if (!hotServer || !file.startsWith(root + '/')) return;
    ours.set(file, { hash: hashOf(file), sent: false });
    hotServer.watcher.emit('change', file);
  };
  const hold = async (file: string, modules: readonly ModuleNode[], read: () => string | Promise<string>): Promise<[] | undefined> => {
    if (!file.startsWith(root + '/') || file.includes('/node_modules/')) return undefined;
    if (!held || !hotServer) {
      const entry = ours.get(file);
      if (!entry) return undefined;
      const now = sourceHash(await Promise.resolve(read()).catch(() => ''));
      if (await entry.hash !== now) { ours.delete(file); return undefined; } // another hand's save: out it goes
      if (!entry.sent) { entry.sent = true; return undefined; } // the session's word, reported once: out it goes
      return []; // the same content again: the watcher's echo
    }
    held.files.add(file); alive();
    for (const module of modules) held.modules.set(module.id ?? module.url, module);
    // What forces a reload: a page's own HTML, nothing else. A file no module reads has nothing on the page to
    // update (a component this page does not draw, the project's config) and must not cost the page its state:
    // React Plumber's own change log (.plumber/cache/changes.jsonl) is such a file, is written by every traced
    // apply, and used to reload the page every time. A stylesheet that sets the theme is a module like any other
    // (Vite and Tailwind update it in place, new utilities included).
    if (!modules.length && file.endsWith('.html')) held.full = true;
    if (held.ending && [...held.ending.expected].every(seen => held!.files.has(seen))) releaseHeld();
    return [];
  };
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
    handleHotUpdate(context) { return hold(context.file, context.modules, context.read); },
    hotUpdate(context) { return this.environment.name === 'client' ? hold(context.file, context.modules as unknown as ModuleNode[], context.read) : undefined; },
    configureServer(server) {
      hotServer = server;
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
      void owned.session.then(session => { session.on('transaction', onTransaction); session.on('written', onWritten); }).catch(() => {});
      const relinquish = async () => { owned.owners.delete(owner); releaseHeld();
        // never wait on a Session still starting: a restart mid-startup would hang until it is ready
        void owned.session.then(session => { session.off('transaction', onTransaction); session.off('written', onWritten); }).catch(() => {}); await dispose(id, owned); };
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
          host: 'vite', development: !server.config.isProduction, plugin: true, stamping: stamp,
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
const hot = createHotContext('/__plumb/client.js');
hot.on('vite:afterUpdate', invalidateSourceMaps);
hot.on('plumb:applied', (data) => dispatchEvent(new CustomEvent('plumb:applied', { detail: data })));`, injectTo: 'head' }];
    } },
    async closeBundle() { if (!restarts) { await release?.(); release = undefined; } },
  };
}

export default plumb;
