#!/usr/bin/env node
import { freezeApp, freezeTool, fingerprint, ignoredInputs } from './frozen.mjs';
import { hasExactEdit, writeGate, writeInteraction, restoreWrite } from './write.mjs';
// Run: PLUMB_CHROMIUM=/path/to/chromium node bench/apps/verify.mjs [app ...]
// Requires an existing React Plumber build. Reads git inputs; never writes original app repositories.
// The owner's output restriction overrides the brief's bench/apps/verify.<app>.json paths:
// all reports live in docs/verification/. Each app server runs in its own process/cwd.
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import { fork } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join, posix, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';
import { setTimeout as delay } from 'node:timers/promises';

const here = fileURLToPath(import.meta.url);
const repo = resolve(dirname(here), '../..');
const workspace = dirname(repo);
const output = join(repo, 'docs/verification');
const grabFile = join(workspace, 'algorecall/node_modules/react-grab/dist/index.global.js');
const timeout = 60_000;
const overrides = JSON.parse((process.env.PLUMBER_VERIFY_APP_ROOTS ?? process.env.PLUMB_VERIFY_APP_ROOTS) ?? '{}');
for (const root of Object.values(overrides)) check(resolve(root).startsWith(repo + sep), 'Proof roots must be inside React Plumber');
const apps = [
  { name: 'metalui', app: join(workspace, 'metalui/apps/docs'), root: join(workspace, 'metalui'),
    config: join(repo, 'bench/metalui/overlay.plumber.config.ts'), pages: ['/components/button', '/foundations/motion', '/'] },
  { name: 'kamui', app: join(workspace, 'kamui/web/apps/kamui'), pages: ['/'] },
  { name: 'craftingattention', app: join(workspace, 'craftingattention/app'), pages: ['/'] },
  { name: 'algorecall', app: join(workspace, 'algorecall'), config: join(repo, 'bench/apps/algorecall.plumber.config.ts'), pages: ['/'], depsInProject: true },
].map(app => ({ ...app, root: app.root ?? app.app, ignoredInputs: ignoredInputs[app.name] })).map(app => {
  const original = app.root;
  return overrides[app.name] ? { ...app, root: resolve(overrides[app.name], '.'), app: resolve(overrides[app.name], relative(original, app.app)) } : app;
});

function message(error) {
  const detail = error?.stack || error?.message || (error?.name ? error.name + ' (no message)' : String(error));
  return error?.code && !detail.includes(error.code) ? `${error.code}: ${detail}` : detail;
}
function check(condition, text) { if (!condition) throw new Error(text); }
function bounded(promise, label, ms = timeout) {
  let timer;
  return Promise.race([promise, new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms} ms`)), ms);
  })]).finally(() => clearTimeout(timer));
}
function distribution(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  const at = p => sorted.length ? Number(sorted[Math.max(0, Math.ceil(sorted.length * p) - 1)].toFixed(2)) : null;
  return { count: sorted.length, p50: at(.5), p95: at(.95), max: at(1) };
}
function normalizePath(value) {
  let path = String(value ?? '').replaceAll('\\', '/');
  if (/^(https?|file):/.test(path)) {
    try { path = new URL(path).pathname; } catch { /* Retain the diagnostic path. */ }
  }
  try { path = decodeURIComponent(path); } catch { /* Malformed paths cannot match. */ }
  return path.replace(/^\/@fs\//, '/').split(/[?#]/)[0].replace(/\/+$/, '').replace(/^\.\//, '');
}
function sameFile(a, b) {
  const left = normalizePath(a), right = normalizePath(b);
  return !!left && !!right && (left === right || left.endsWith('/' + right) || right.endsWith('/' + left));
}
function sameComponent(a, b) { return !!a && !!b && a === b; }
function oracleFileMatches(file, oracle) {
  const path = value => posix.normalize(normalizePath(value)).replace(/^\/+/, '');
  const left = path(file), right = path(oracle);
  return !!left && !!right && left !== '.' && right !== '.'
    && (left === right || left.endsWith('/' + right) || right.endsWith('/' + left));
}
function oracleLibrary(file, scratch) {
  const path = normalizePath(file);
  if (/(^|\/)(node_modules|dist)(\/|$)/.test(path) || /(^|\/)\.vite\/deps(\/|$)/.test(path)) return true;
  // macOS may spell the same scratch directory /tmp or /private/tmp.
  const canonical = value => normalizePath(value).replace(/^\/private\/tmp(?=\/|$)/, '/tmp');
  const root = canonical(repo), source = canonical(path);
  return /\/@fs\//.test(String(file)) && !source.includes('/source/') && !source.includes('/linked/') && (source === root || source.startsWith(root + '/'));
}
function chainOf(location) { return location?.chain?.length ? location.chain : location ? [location] : []; }
async function get(origin, route, params = {}) {
  const url = new URL(route, origin);
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  const start = performance.now();
  const response = await fetch(url, { signal: AbortSignal.timeout(timeout), cache: 'no-store' });
  const text = await response.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: response.status, ok: response.ok, ms: performance.now() - start, body, retryAfter: response.headers.get('retry-after') };
}

let retryEvidence = [];
async function readCheck(origin, route, params) {
  let result = await get(origin, route, params);
  if (result.status !== 503 || result.body?.status !== 'busy') return result;
  const evidence = { route, params, attempts: [result], health: [] };
  retryEvidence.push(evidence);
  for (let attempt = 0; attempt < 2 && result.status === 503 && result.body?.status === 'busy'; attempt++) {
    const health = await get(origin, '/__plumb/health'); evidence.health.push(health);
    if (!health.ok || health.body?.status !== 'ready' || health.ms >= 100) break;
    await delay(Math.min(5000, Math.max(1000, Number(result.retryAfter ?? 1) * 1000)));
    result = await get(origin, route, params); evidence.attempts.push(result);
  }
  evidence.recovered = result.ok;
  return result;
}

async function flattenPlugins(options) {
  const result = [];
  for (const option of options ?? []) {
    const plugin = await option;
    if (Array.isArray(plugin)) result.push(...await flattenPlugins(plugin));
    else if (plugin) result.push(plugin);
  }
  return result;
}

// Shared by the programmatic host and the generated CLI config. Keep the app's
// already-loaded plugin instances: require.resolve() uses CommonJS export conditions.
async function freshRouteTree(app, scratch, require) {
  const tree = join(app.app, 'src/routeTree.gen.ts');
  if (app.trackedRouteTree) return null;
  const generatorPath = createRequire(require.resolve('@tanstack/router-plugin/vite')).resolve('@tanstack/router-generator');
  const { Generator, getConfig } = await import(pathToFileURL(generatorPath).href);
  const out = join(scratch, 'routeTree.gen.ts');
  const config = getConfig({ target: 'react', routesDirectory: join(app.app, 'src/routes'), generatedRouteTree: out }, app.app);
  await new Generator({ config, root: app.app }).run();
  return { tree, out };
}

export async function withVerification(own, app, scratch, configFile) {
  const require = createRequire(join(app.app, 'package.json'));
  const vite = await import(pathToFileURL(require.resolve('vite')).href);
  const adaptations = [];
  let generator = false;
  own = { ...own, plugins: (await flattenPlugins(own.plugins)).filter(plugin => {
    if (plugin.name !== 'tanstack:router-generator') return true;
    generator = true;
    return false;
  }) };
  if ('test' in own) {
    delete own.test;
    adaptations.push('Removed Vitest-only test configuration from the dev host so React Plumber applies; application plugins are retained.');
  }
  if (own.server?.hmr === false && (process.env.PLUMBER_VERIFY_BASELINE ?? process.env.PLUMB_VERIFY_BASELINE) !== '1') {
    own.server = { ...own.server, hmr: true };
    adaptations.push('Enabled Vite HMR only in the frozen verification host: the app disables it, so source writes otherwise require a manual reload.');
  }
  // TanStack's generator would rewrite the app's route tree. A tracked tree is the app's source: serve it as is. An
  // untracked one is a build output that goes stale as routes change (Kamui), so generate a current one in scratch with
  // the app's own generator and point the app's import there; the app's file is never written.
  const routeTree = generator ? await freshRouteTree(app, scratch, require) : null;
  if (generator) adaptations.push(routeTree
    ? 'TanStack route tree generated into scratch (the app\'s is untracked and stale); route transforms retained.'
    : 'Disabled TanStack route generation; uses the tracked route tree, retains route transforms.');
  if (routeTree) own.plugins.unshift({ name: 'verification:route-tree', enforce: 'pre', async resolveId(source, importer, options) {
    if (!importer || !/routeTree\.gen/.test(source)) return null;
    // The ignored tree is absent from a fresh copy, so handle its relative import before Vite checks existence.
    if (source.startsWith('.') && resolve(dirname(importer.split('?')[0]), source).replace(/\.tsx?$/, '') === routeTree.tree.replace(/\.tsx?$/, '')) return routeTree.out;
    const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
    return resolved?.id.split('?')[0] === routeTree.tree ? routeTree.out : null;
  } });
  if (app.depsInProject) adaptations.push('Vite dependency cache inside the project (node_modules/.vite-plumb-verify): a cache outside breaks its CommonJS interop.');
  const grab = (process.env.PLUMBER_VERIFY_BASELINE ?? process.env.PLUMB_VERIFY_BASELINE) === '1' ? '' : await fsp.readFile(app.toolRoot ? join(app.toolRoot, 'react-grab.js') : grabFile, 'utf8');
  const { Session } = await import(pathToFileURL(join(app.toolRoot ?? repo, 'dist/session/index.js')).href);
  let release;
  const gate = new Promise(resolveGate => { release = resolveGate; });
  const original = Session.create;
  let intercepted = 0;
  Session.create = function (...args) {
    intercepted++;
    return Promise.all([original.apply(this, args), gate]).then(([session]) => session);
  };
  const { plumb } = await import(pathToFileURL(join(app.toolRoot ?? repo, 'dist/hosts/vite.js')).href);
  const baseline = (process.env.PLUMBER_VERIFY_BASELINE ?? process.env.PLUMB_VERIFY_BASELINE) === '1';
  const oracle = { name: 'verification:react-grab', transformIndexHtml: { order: 'pre', handler: () => [
    { tag: 'script', attrs: { 'data-verification-react-grab': '' }, children: grab.replaceAll('</script', '<\\/script'), injectTo: 'head-prepend' },
  ] } };
  let server, closing = false;
  async function close() {
    if (closing) return;
    closing = true; release(); Session.create = original;
    try { await server?.close(); } finally { process.exit(0); }
  }
  process.on('message', event => { if (event.type === 'release') release(); if (event.type === 'close') void close(); });
  process.on('disconnect', () => void close());
  process.on('SIGTERM', () => void close());
  process.on('SIGINT', () => void close());
  const bridge = { name: 'verification:host', enforce: 'post', configureServer(host) {
    server = host;
    check(server.httpServer, 'Vite did not expose an HTTP server');
    server.httpServer.once('listening', () => {
      const address = server.httpServer.address();
      if (!address || typeof address !== 'object' || !intercepted && !baseline) {
        process.send?.({ type: 'error', error: 'Vite port or React Plumber startup gate missing' });
        return;
      }
      process.send?.({ type: 'listening', origin: `http://127.0.0.1:${address.port}`, configFile, adaptations });
    });
  } };
  if (!baseline) {
    own.plugins.unshift(plumb({ root: app.root, ...(app.config ? { config: app.config } : {}) }));
    adaptations.push('React Plumber source stamping runs before application React transforms.');
  }
  adaptations.push("Vite serves installed dependency directories read-only through the copy's symlinks.");
  return vite.mergeConfig(own, {
    configFile: false, root: own.root ?? app.app, cacheDir: depsCache(app, scratch), logLevel: 'warn',
    plugins: baseline ? [bridge] : [oracle, bridge],
    server: { host: '127.0.0.1', port: 0, strictPort: false, open: false,
      fs: { allow: [vite.searchForWorkspaceRoot(app.app), scratch, ...(app.dependencyRoots ?? []), ...(own.server?.fs?.allow ?? [])] } },
  });
}

// Each run gets a fresh Vite dependency cache. It lives in the scratch directory unless the app needs it inside the
// project: there, a cache outside serves pre-bundled CommonJS without the import interop (AlgoRecall's React Compiler
// runtime then has no export \`c\`, with or without React Plumber). Inside, it sits in node_modules under its own name, so the
// app's own .vite cache is untouched; it is removed after. Kamui (pnpm) renders only with it outside.
const depsCache = (app, scratch) => app.depsInProject ? join(app.app, 'node_modules/.vite-plumb-verify') : join(scratch, 'vite');
function appConfigFile(app) {
  return ['vite.config.js', 'vite.config.mjs', 'vite.config.ts', 'vite.config.cjs', 'vite.config.mts', 'vite.config.cts']
    .map(file => join(app.app, file)).find(fs.existsSync);
}
async function serve(app, scratch) {
  process.chdir(app.app);
  process.env.PLUMB_CACHE_DIR = join(scratch, 'plumb');
  process.env.WRANGLER_LOG_PATH = join(scratch, 'wrangler.log');
  process.env.WRANGLER_SEND_METRICS = 'false';
  const require = createRequire(join(app.app, 'package.json'));
  const vite = await import(pathToFileURL(require.resolve('vite')).href);
  const configFile = appConfigFile(app);
  const env = { command: 'serve', mode: 'development', isSsrBuild: false, isPreview: false };
  const own = (await vite.loadConfigFromFile(env, configFile, app.app))?.config;
  check(own || !configFile, `Could not load ${configFile}`);
  const server = await vite.createServer(await withVerification(own ?? {}, app, scratch, configFile));
  await server.listen();
}

async function startServer(app, scratch, { baseline = false } = {}) {
  const start = performance.now();
  let logs = '';
  async function launch(file, args) {
    const child = fork(file, args, {
      cwd: app.app, execArgv: ['--import', join(repo, 'bench/apps/readonly.mjs')], env: { ...process.env, PLUMB_VERIFY_APP: JSON.stringify(app), PLUMB_VERIFY_SCRATCH: scratch, TMPDIR: scratch, XDG_CACHE_HOME: join(scratch, 'xdg-cache'), XDG_CONFIG_HOME: join(scratch, 'xdg-config'), PLUMB_CACHE_DIR: join(scratch, 'plumb'), ...(baseline ? { PLUMB_VERIFY_BASELINE: '1' } : {}),
        WRANGLER_LOG_PATH: join(scratch, 'wrangler.log'), WRANGLER_SEND_METRICS: 'false' },
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    });
    for (const stream of [child.stdout, child.stderr]) stream.on('data', data => { logs = (logs + data).slice(-16_000); });
    const exited = new Promise(resolveExit => child.once('exit', (code, signal) => resolveExit({ code, signal })));
    const ready = new Promise((resolveReady, reject) => {
      child.on('error', reject);
      child.on('message', event => {
        if (event.type === 'listening') resolveReady(event);
        if (event.type === 'error') reject(new Error(event.error));
      });
      child.once('exit', (code, signal) => reject(new Error(`App server exited (${code ?? signal}): ${logs}`)));
    });
    const stop = async () => {
      if (child.exitCode !== null || child.signalCode !== null) return;
      if (child.connected) child.send({ type: 'close' }); else child.kill('SIGTERM');
      await Promise.race([exited, delay(5_000)]);
      if (child.exitCode === null && child.signalCode === null) { child.kill('SIGKILL'); await exited; }
    };
    try { return { ...await bounded(ready, 'Vite startup'), child, start, stop, logs: () => logs }; }
    catch (error) { await stop(); throw error; }
  }
  try { return await launch(here, ['--serve', JSON.stringify(app), scratch]); }
  catch (error) {
    if (!/ERR_PACKAGE_PATH_NOT_EXPORTED|ERR_MODULE_NOT_FOUND|Cannot find (?:module|package)|failed to load config|Failed to resolve/i.test(message(error))) throw error;
    const configFile = appConfigFile(app), generated = join(app.app, 'node_modules/.vite-temp/verification.vite.config.mjs');
    // Vite bundles this import with the app's normal ESM export conditions, from cwd=app.
    await fsp.mkdir(dirname(generated), { recursive: true });
    await fsp.writeFile(generated, [
      configFile ? `import own from ${JSON.stringify(configFile)};` : 'const own = {};',
      `const harness = ${JSON.stringify(pathToFileURL(here).href)};`,
      'const { withVerification } = await import(harness);',
      `export default async env => withVerification(await (typeof own === 'function' ? own(env) : own), ${JSON.stringify(app)}, ${JSON.stringify(scratch)}, ${JSON.stringify(configFile ?? null)});`,
    ].join('\n'));
    const require = createRequire(join(app.app, 'package.json'));
    const cli = resolve(dirname(require.resolve('vite')), '../../bin/vite.js');
    const host = await launch(cli, ['--config', generated]);
    host.adaptations.push(`Used app Vite CLI after harness config/plugin loading failed: ${message(error)}`);
    return host;
  }
}

async function selectElements(page, extra = 0) {
  return bounded(page.evaluate(async extra => {
    await document.fonts.ready;
    await new Promise(resolveFrame => requestAnimationFrame(() => requestAnimationFrame(resolveFrame)));
    const elements = [...document.body.querySelectorAll('*')].filter(element => {
      if (element.closest('plumb-overlay, [data-react-grab], [data-react-grab-ignore], [data-react-grab-root]')) return false;
      if (['SCRIPT', 'STYLE', 'LINK', 'META', 'NOSCRIPT', 'TEMPLATE'].includes(element.tagName)) return false;
      const rect = element.getBoundingClientRect(), css = getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && css.visibility !== 'hidden' && css.display !== 'none' && css.opacity !== '0'
        && (extra || (rect.bottom > 0 && rect.right > 0 && rect.top < innerHeight && rect.left < innerWidth));
    });
    if (!extra) {
      const sample = elements.length <= 150 ? elements : Array.from({ length: 150 }, (_, i) => elements[Math.floor(i * elements.length / 150)]);
      window.__plumbVerification = { elements: sample };
      return sample.map((_, i) => i);
    }
    const state = window.__plumbVerification, existing = new Set(state.elements);
    const remaining = elements.filter(element => !existing.has(element));
    const more = remaining.length <= extra ? remaining : Array.from({ length: extra }, (_, i) => remaining[Math.floor(i * remaining.length / extra)]);
    const start = state.elements.length;
    state.elements.push(...more);
    return more.map((_, i) => start + i);
  }, extra), 'Visible element selection');
}

async function waitForIdle(page) {
  return page.evaluate(() => new Promise(resolveIdle => {
    const start = performance.now();
    let lastMutation = start, frames = 0, frame, timer, finished = false;
    const finish = idle => {
      if (finished) return;
      finished = true; observer.disconnect(); cancelAnimationFrame(frame); clearTimeout(timer);
      resolveIdle({ idle, ms: performance.now() - start });
    };
    const observer = new MutationObserver(() => { lastMutation = performance.now(); frames = 0; });
    observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true });
    const tick = () => {
      frames = performance.now() - lastMutation >= 500 ? frames + 1 : 0;
      if (frames >= 2) finish(true);
      else frame = requestAnimationFrame(tick);
    };
    timer = setTimeout(() => finish(false), 10_000);
    frame = requestAnimationFrame(tick);
  }));
}

// Sampling is serial: per element a locate, react-grab's lookup and a read. The budget scales with the sample (2 s an
// element, at least 240 s for a full one) so a slower app is measured, not cut off; locate speed has its own limit.
const samplingBudget = count => Math.max(240_000, 2_000 * (count ?? 150) + 60_000);
async function sample(page, fresh = false, ids = null, mode = 'full') {
  // Keep node references. A replaced node or changed rendered subtree invalidates the paired reads.
  return bounded(page.evaluate(async ({ fresh, ids, mode }) => {
    const limit = (promise, name) => {
      let timer;
      return Promise.race([promise, new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(name + ' timed out')), 30_000);
      })]).finally(() => clearTimeout(timer));
    };
    const rows = [], elements = window.__plumbVerification.elements;
    for (const i of ids ?? elements.map((_, i) => i)) {
      const element = elements[i];
      if (!element?.isConnected) { rows.push({ i, status: 'detached' }); continue; }
      let changed = false;
      const relevant = mutations => mutations.some(mutation => element.contains(mutation.target)
        || [...mutation.removedNodes].some(node => node === element || node.contains?.(element)));
      const observer = new MutationObserver(mutations => { changed ||= relevant(mutations); });
      observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true });
      const detached = () => !element.isConnected || changed || relevant(observer.takeRecords());
      try {
        const start = performance.now();
        const located = await limit(window.__plumb.locate(element, { explain: true }), 'locate');
        const locateMs = performance.now() - start;
        if (detached()) { rows.push({ i, status: 'detached' }); continue; }
        const oracle = mode === 'full' ? await limit(window.__REACT_GRAB__.getSource(element), 'react-grab.getSource') : null;
        if (detached()) { rows.push({ i, status: 'detached' }); continue; }
        const location = located?.file ? located : null;
        const readAt = performance.now();
        const reading = location && mode !== 'locate' ? await limit(window.__plumb.overlay.read(element, fresh), 'overlay.read') : null;
        const readMs = location && mode !== 'locate' ? performance.now() - readAt : null;
        if (detached()) { rows.push({ i, status: 'detached' }); continue; }
        rows.push({ i, tag: element.localName, classes: element.getAttribute('class') ?? '',
          location, refusal: location ? null : located, oracle, reading, locateMs, readMs });
      } catch (error) {
        rows.push(detached() ? { i, status: 'detached' } : { i, error: String(error.message ?? error) });
      } finally { observer.disconnect(); }
    }
    return rows;
  }, { fresh, ids, mode }), 'Element sampling', samplingBudget(ids?.length ?? null));
}

async function verifyLocation(origin, location) {
  const response = await readCheck(origin, '/__plumb/resolve', {
    source: location.file, line: location.line, column: location.column,
  });
  return { ...response, verified: response.ok && sameFile(response.body?.file, location.file)
    && response.body.line === location.line && response.body.column === location.column };
}

async function inspectRows(app, origin, rows, exactness, failures, scratch) {
  const counts = { sampled: rows.length, detached: 0, 'oracle-library': 0, bothMatched: 0, plumbOnly: 0, grabOnly: 0, neither: 0, disagreements: 0,
    reading: { placed: 0, ready: 0, computed: 0, withMarks: 0, writable: 0 },
    classes: { levels: 0, attributed: 0, unattributed: 0, ambiguous: 0 } };
  const misses = [], disagreements = [], verifications = [], computed = [];
  const verified = new Map(), sites = new Map(), classesByInput = new Map();
  // Frozen files and config cannot change: identical validation queries have identical answers.
  // Sampling, fresh readings, source-map invalidation and the 300-read burst remain uncached.
  async function cached(cache, route, params) {
    const key = JSON.stringify(params);
    if (cache.has(key)) return cache.get(key);
    const response = await readCheck(origin, route, params);
    if (response.ok) cache.set(key, response);
    return response;
  }
  for (const row of rows) {
    if (row.status === 'detached') { counts.detached++; continue; }
    if (row.error) { failures.push(`sample ${row.i}: ${row.error}`); continue; }
    const chain = chainOf(row.location);
    const checks = [];
    for (const link of chain) {
      const key = JSON.stringify([link.file, link.line, link.column]);
      if (!verified.has(key)) verified.set(key, await verifyLocation(origin, link));
      const result = verified.get(key); checks.push(result);
      if (!result.verified) failures.push(`sample ${row.i}: location failed server verification: ${key}`);
    }
    if (row.location) {
      counts.reading.placed++;
      if (row.reading?.status === 'ready') counts.reading.ready++;
      else failures.push(`sample ${row.i}: placed element reading ${row.reading?.status ?? 'missing'}`);
      if (row.reading?.traced || (!row.reading?.declared && !row.reading?.marks?.length)) counts.reading.computed++;
      if (row.reading?.marks?.length) counts.reading.withMarks++;
      if (row.reading?.marks?.some(mark => mark.choices.some(choice => choice.edit))) counts.reading.writable++;
      if (exactness.length < 20) {
        const location = row.location, file = resolve(app.root, location.file);
        const result = { sample: row.i, ...location, diskFile: file, ok: false };
        try {
          const text = await fsp.readFile(file, 'utf8');
          const line = text.split(/\r?\n/)[location.line - 1];
          result.excerpt = line?.slice(Math.max(0, location.column - 12), location.column + 60);
          result.ok = Number.isInteger(location.line) && Number.isInteger(location.column) && location.column > 0
            && /^<(?:[\w$]|>)/.test(line?.slice(location.column - 1) ?? '');
        } catch (error) { result.error = String(error.message ?? error); }
        exactness.push(result);
        if (!result.ok) failures.push(`Wrong JSX line/column: ${location.file}:${location.line}:${location.column}`);
      }
      // Inspect every computed-here chain level, not only the default reading.
      for (let level = 0; level < chain.length; level++) {
        const link = chain[level];
        const site = await cached(sites, '/__plumb/site', { file: link.file, line: link.line, column: link.column });
        if (!site.ok) { failures.push(`sample ${row.i} level ${level}: site returned ${site.status}`); continue; }
        if (site.body.declarations?.length) continue;
        const classes = await cached(classesByInput, '/__plumb/classes', { file: link.file, line: link.line, column: link.column, classes: row.classes });
        if (!classes.ok) { failures.push(`sample ${row.i} level ${level}: classes returned ${classes.status}`); continue; }
        const attributed = classes.body.classes?.filter(entry => !entry.ambiguous && entry.sites?.length).length ?? 0;
        const ambiguous = classes.body.classes?.filter(entry => entry.ambiguous).length ?? 0;
        const unattributed = classes.body.unattributed?.length ?? 0;
        counts.classes.levels++; counts.classes.attributed += attributed;
        counts.classes.ambiguous += ambiguous; counts.classes.unattributed += unattributed;
        computed.push({ sample: row.i, level, ...link, attributed, ambiguous, unattributed, result: classes.body });
      }
    }
    if (row.oracle?.filePath && oracleLibrary(row.oracle.filePath, scratch)) {
      counts['oracle-library']++;
    } else if (row.location && row.oracle?.filePath) {
      let level = -1;
      for (let i = 0; i < chain.length; i++) {
        const link = chain[i];
        if (oracleFileMatches(link.file, row.oracle.filePath)
          && sameComponent(link.component, row.oracle.componentName)) {
          level = i; break;
        }
      }
      // react-grab names the component the JSX is written in; React Plumber names the element at that line (the component used,
      // or none for host JSX). Agreement is the same file in React Plumber's chain; React Plumber's lines are proven by the exactness
      // check. A naming difference is recorded, not failed.
      const fileLevel = chain.findIndex(link => oracleFileMatches(link.file, row.oracle.filePath));
      if (level >= 0) counts.bothMatched++;
      else if (fileLevel >= 0) { counts.bothMatched++; counts.namedDifferently = (counts.namedDifferently ?? 0) + 1; }
      else {
        let reason = null, oracleCheck = null;
        if (fileLevel < 0) {
          oracleCheck = await readCheck(origin, '/__plumb/resolve', { source: row.oracle.filePath });
          if (checks.every(result => result.verified) && oracleCheck.ok && oracleCheck.body.library && !oracleCheck.body.file) {
            reason = 'Server verified React Plumber chain and refused oracle file as library/untracked source.';
          }
        }
        // react-grab ranks the component that renders an element passed as children (Well, Surface) above the line
        // that writes it. When React Plumber's innermost link opens the element's own tag on disk, React Plumber is the precise one.
        const inner = row.location?.chain?.[0] ?? row.location;
        if (!reason && inner && row.tag) {
          try {
            const text = await fsp.readFile(resolve(app.root, inner.file), 'utf8');
            const line = text.split(/\r?\n/)[inner.line - 1] ?? '';
            if (line.slice(inner.column - 1).startsWith('<' + row.tag)) reason = `React Plumber's location opens <${row.tag}> on disk; react-grab names the rendering component.`;
          } catch {}
        }
        // A react-grab answer that is not JSX on disk (a hook line, a data object: a module whose map is off) cannot be
        // the element's site; React Plumber's server-verified chain stands. Recorded with what the server found there.
        if (!reason && checks.every(result => result.verified) && row.oracle.lineNumber) {
          const at = await readCheck(origin, '/__plumb/resolve', { source: row.oracle.filePath, line: row.oracle.lineNumber, column: row.oracle.columnNumber ?? 1 });
          oracleCheck = at;
          if (at.ok && at.body.refused === 'not-jsx') { counts.oracleNotJsx = (counts.oracleNotJsx ?? 0) + 1; continue; }
        }
        if (reason) { counts['oracle-library']++; continue; }
        counts.disagreements++;
        failures.push(`sample ${row.i}: unexplained react-grab disagreement`);
        disagreements.push({ sample: row.i, plumb: row.location, oracle: row.oracle, fileLevel, reason, oracleCheck });
      }
    } else if (row.location) counts.plumbOnly++;
    else if (row.oracle?.filePath) {
      counts.grabOnly++;
      if (misses.length < 20) misses.push({ sample: row.i, tag: row.tag, classes: row.classes, refusal: row.refusal, oracle: row.oracle });
    } else counts.neither++;
  }
  for (const [key, result] of verified) verifications.push({ key, ...result });
  return { counts, grabOnly: misses, disagreements, serverChecks: verifications, computedLevels: computed };
}

async function measureReads(origin, rows, page) {
  const latency = [], readings = rows.filter(row => row.location);
  for (const row of readings) {
    const params = { file: row.location.file, line: row.location.line, column: row.location.column };
    const start = performance.now();
    const [site, edits] = await Promise.all([get(origin, '/__plumb/site', params), get(origin, '/__plumb/edits', params)]);
    check(site.ok && edits.ok, `site+edits returned ${site.status}/${edits.status}`);
    latency.push(performance.now() - start);
  }
  check(readings.length > 0, 'No placed elements: cannot exercise read performance');
  // Node HTTP requests avoid Chromium's six-connection queue starving the health probe.
  const child = fork(join(repo, 'bench/apps/probe.mjs'), [], { cwd: repo,
    execArgv: [], env: { ...process.env }, stdio: ['ignore', 'ignore', 'ignore', 'ipc'] });
  const pending = new Map(); let id = 0;
  child.on('message', event => { if (event.result) { pending.get(event.id)?.(event.result); pending.delete(event.id); } });
  const ready = new Promise((resolveReady, reject) => {
    child.on('message', event => { if (event.type === 'ready') resolveReady(); });
    child.on('error', reject); child.once('exit', () => reject(new Error('Health probe exited before readiness')));
  });
  const probe = route => bounded(new Promise(resolveProbe => { const key = ++id; pending.set(key, resolveProbe); child.send({ id: key, origin, route }); }), 'Independent network probe');
  try {
    await bounded(ready, 'Health probe startup');
    const warmup = await Promise.all([probe('/__plumb/health'), probe('/')]);
    check(warmup.every(response => response.ok), 'Probe connection warmup failed');
    let settled = 0;
    const started = performance.now();
    const requests = Array.from({ length: 300 }, (_, i) => {
      const { location } = readings[i % readings.length];
      return { i, route: i % 2 ? '/__plumb/edits' : '/__plumb/site',
        params: { file: location.file, line: location.line, column: location.column } };
    });
    const burst = Promise.allSettled(requests.map(request => get(origin, request.route, request.params)
      .finally(() => { settled++; })));
    const health = [], serving = [];
    // Probe immediately after dispatch, then twice more; retain observed overlap rather than assuming it.
    for (let i = 0; i < 3; i++) {
      const outstanding = 300 - settled;
      const [healthProbe, page] = await Promise.all([probe('/__plumb/health'), probe('/')]);
      health.push({ ...healthProbe, outstanding });
      serving.push({ status: page.status, ok: page.ok, ms: page.ms, outstanding,
        ...(!page.ok ? { body: page.body, error: page.error } : {}) });
      if (i < 2 && settled < 300) await delay(5);
    }
    const results = await burst, burstMs = performance.now() - started;
    const errors = results.flatMap((result, i) => result.status === 'rejected'
      ? [{ ...requests[i], status: null, body: null, error: message(result.reason) }]
      : !result.value.ok ? [{ ...requests[i], ...result.value }] : []);
    const healthy = health.some(probe => probe.outstanding > 0)
      && health.every(probe => probe.ok && probe.body.status === 'ready' && probe.ms < 100);
    // Retry each busy read once, sequentially, after the original burst drains. Preserve both answers.
    for (const error of errors) {
      error.busy = error.status === 503 && (error.body?.status === 'busy' || error.body === 'busy');
      if (error.busy) {
        try { error.retry = await get(origin, error.route, error.params); }
        catch (cause) { error.retry = { ok: false, status: null, body: null, error: message(cause) }; }
      }
      error.acceptable = error.busy && healthy && error.retry.ok;
    }
    return { siteEditsMs: distribution(latency), burst: { reads: 300, ms: burstMs, probeLane: 'independent Node process', warmup,
      retryMs: performance.now() - started - burstMs, errors,
      busyRecovered: errors.filter(error => error.busy && error.retry.ok).length,
      busyRetriesSucceeded: errors.filter(error => error.busy).every(error => error.retry.ok),
      failed: errors.filter(error => !error.acceptable).length,
      health, page: serving, overlapped: health.some(probe => probe.outstanding > 0) } };
  } finally {
    if (child.connected) child.disconnect();
    await new Promise(resolveExit => {
      if (child.exitCode !== null || child.signalCode !== null) resolveExit();
      else child.once('exit', resolveExit);
    });
  }
}

async function interaction(page, rows, { preview = true, chain: testChain = true } = {}) {
  const connected = await page.evaluate(ids => ids.filter(i => window.__plumbVerification.elements[i]?.isConnected), rows.map(row => row.i));
  const live = new Set(connected);
  rows = rows.filter(row => live.has(row.i));
  const result = {};
  if (preview) result.preview = { status: 'untested' };
  if (testChain) result.chain = { status: 'untested' };
  const overlay = page.locator('plumb-overlay');
  const dialog = overlay.getByRole('dialog');
  const pin = async i => {
    await page.evaluate(async i => {
      const element = window.__plumbVerification.elements[i];
      if (!element?.isConnected) throw new Error('Interaction element detached');
      const rect = element.getBoundingClientRect();
      if (rect.bottom <= 0 || rect.top >= innerHeight) {
        element.scrollIntoView({ block: 'center', behavior: 'instant' });
        await new Promise(resolveFrame => requestAnimationFrame(() => requestAnimationFrame(resolveFrame)));
      }
      if (!element.isConnected) throw new Error('Interaction element detached');
      await window.__plumb.overlay.pin(element);
      if (!element.isConnected) throw new Error('Interaction element detached');
    }, i);
    await dialog.waitFor({ timeout: 10_000 });
  };
  const candidates = (preview ? rows : []).filter(row => row.status !== 'detached' && row.reading?.status === 'ready'
    && row.reading.marks?.some(mark => mark.choices?.length));
  for (const row of candidates) {
    try {
      await pin(row.i);
      const props = [...new Set(row.reading.marks.flatMap(mark => mark.props))];
      const style = () => page.evaluate(({ i, props }) => {
        const element = window.__plumbVerification.elements[i], css = getComputedStyle(element);
        return { attribute: element.getAttribute('style'), values: props.map(prop => css.getPropertyValue(prop)) };
      }, { i: row.i, props });
      const before = await style();
      let changed = null;
      for (let mark = 0; mark < row.reading.marks.length && !changed; mark++) {
        for (let choice = 0; choice < row.reading.marks[mark].choices.length && !changed; choice++) {
          const marker = dialog.locator(`.pin[data-i="${mark}"]`);
          await marker.click();
          await page.waitForFunction(() => {
            const reading = document.querySelector('plumb-overlay')?.shadowRoot?.querySelector('.read');
            return reading && !reading.classList.contains('swapping');
          });
          const pick = dialog.locator(`.read .opt[data-pick="${choice}"]`);
          await pick.waitFor({ state: 'visible', timeout: 5_000 });
          await pick.click();
          const after = await bounded((async () => {
            // Wait for host transitions to settle, then compare the affected computed properties.
            await page.waitForTimeout(250);
            return style();
          })(), 'Preview style');
          if (JSON.stringify(after.values) !== JSON.stringify(before.values)) changed = { mark, choice, after };
          else await dialog.getByRole('button', { name: 'Undo', exact: true }).click();
        }
      }
      if (!changed) { await page.evaluate(() => window.__plumb.overlay.close()); continue; }
      await dialog.getByRole('button', { name: 'Before', exact: true }).click();
      await page.waitForTimeout(250);
      const restored = await style();
      check(JSON.stringify(restored.values) === JSON.stringify(before.values), 'Before did not restore computed style');
      await dialog.getByRole('button', { name: 'Before', exact: true }).click();
      await page.waitForTimeout(250);
      check(JSON.stringify((await style()).values) !== JSON.stringify(before.values), 'After did not restore preview');
      await dialog.getByRole('button', { name: 'Undo', exact: true }).click();
      await page.waitForTimeout(250);
      const undone = await style();
      check(undone.attribute === before.attribute, before.attribute === null ? 'Undo left a style attribute' : 'Undo changed original inline style');
      check(JSON.stringify(undone.values) === JSON.stringify(before.values), 'Undo did not restore computed style');
      result.preview = { status: 'passed', sample: row.i, props, before, changed, restored, undone };
      break;
    } catch (error) {
      const connected = await page.evaluate(i => !!window.__plumbVerification.elements[i]?.isConnected, row.i);
      if (!connected || /detached/i.test(message(error))) {
        result.preview = { status: 'info', note: 'interaction: choice element detached before preview', detached: row.i };
        continue;
      }
      result.preview = { status: 'failed', sample: row.i, error: message(error) }; break;
    }
    finally { await page.evaluate(() => window.__plumb.overlay.close()); }
  }
  // A choice that resolves to the value already shown (duration-150 → quick, both 150ms) renames the value; the page
  // cannot change. Only a choice with a different value must change what is drawn.
  const same = (mark, choice) => choice.value === mark.value || (choice.n !== undefined && choice.n === mark.n);
  const differing = candidates.filter(row => row.reading.marks.some(mark => mark.choices?.some(choice => !same(mark, choice))));
  if (result.preview?.status === 'untested') result.preview = differing.length
    ? { status: 'failed', error: 'No marked element had a visibly changing choice.' }
    : candidates.length ? { status: 'info', note: 'interaction: every choice resolves to the value already shown' }
      : { status: 'info', note: 'interaction: no element with choices on these pages' };
  if (!testChain) return result;
  const chainRows = rows.filter(row => row.status !== 'detached' && chainOf(row.location).length > 1);
  if (!chainRows.length) result.chain = { status: 'info', note: 'interaction: no multi-level element on these pages' };
  for (const chainRow of chainRows) {
    result.chain = { status: 'untested' }; delete result.undo;
    try {
      await pin(chainRow.i);
      const chain = chainOf(chainRow.location);
      const current = dialog.locator('.chain .link[aria-current="true"]');
      const index = Number(await current.getAttribute('data-step'));
      const direction = chain[index + 1] ? 1 : -1;
      const file = dialog.locator('.top .file');
      const original = await file.getAttribute('title');
      await page.keyboard.press(direction === 1 ? 'Alt+ArrowUp' : 'Alt+ArrowDown');
      await page.waitForFunction(({ index, expected }) => {
        const root = document.querySelector('plumb-overlay')?.shadowRoot;
        return root?.querySelector(`.chain .link[data-step="${index}"]`)?.getAttribute('aria-current') === 'true'
          && root.querySelector('.top .file')?.title.startsWith(expected + ' ·');
      }, { index: index + direction, expected: `${chain[index + direction].file}:${chain[index + direction].line}:${chain[index + direction].column}` }, { timeout: 10_000 });
      const stepped = await file.getAttribute('title');
      if (!sameFile(chain[index].file, chain[index + direction].file)) check(stepped !== original, 'Chain header file did not change');
      await page.keyboard.press(direction === 1 ? 'Alt+ArrowDown' : 'Alt+ArrowUp');
      await page.waitForFunction(({ title, index }) => {
        const root = document.querySelector('plumb-overlay')?.shadowRoot;
        return root?.querySelector('.top .file')?.title === title
          && root.querySelector(`.chain .link[data-step="${index}"]`)?.getAttribute('aria-current') === 'true';
      }, { title: original, index }, { timeout: 10_000 });
      result.chain = { status: 'passed', sample: chainRow.i, index, original, stepped, returned: await file.getAttribute('title') };
      const before = await page.evaluate(i => window.__plumbVerification.elements[i].getAttribute('style'), chainRow.i);
      // With no preview the Undo strip is hidden. Dispatch its existing handler to
      // exercise no-op Undo without exposing controls or inventing a token choice.
      await dialog.locator('.undo').evaluate(button => button.click());
      await page.evaluate(() => new Promise(resolveFrame => requestAnimationFrame(() => requestAnimationFrame(resolveFrame))));
      const undone = await page.evaluate(i => window.__plumbVerification.elements[i].getAttribute('style'), chainRow.i);
      check(undone === before, 'No-preview Undo changed inline style');
      check(await file.getAttribute('title') === original, 'Undo changed chain header');
      result.undo = { status: 'passed', mode: 'no-preview', sample: chainRow.i, before, undone };
    } catch (error) {
      const name = result.chain.status === 'passed' ? 'undo' : 'chain';
      const connected = await page.evaluate(i => !!window.__plumbVerification.elements[i]?.isConnected, chainRow.i);
      result[name] = !connected || /detached/i.test(message(error))
        ? { status: 'info', note: 'interaction: multi-level element detached', detached: chainRow.i }
        : { status: 'failed', error: message(error) };
    } finally { await page.evaluate(() => window.__plumb.overlay.close()); }
    if (result.chain.status === 'failed' || result.undo?.status === 'failed'
      || (result.chain.status === 'passed' && result.undo?.status === 'passed')) break;
  }
  return result;
}

function stable(row) {
  // Timing varies; the complete semantic result, refusal, source chain and reading must not.
  const { locateMs, readMs, ...value } = row;
  return JSON.stringify(value);
}

// The app's own page errors, with neither React Plumber nor react-grab loaded (AlgoRecall's server render does not match its
// client). Only an error the app does not throw alone is charged to React Plumber.
const errorKey = text => String(text).split('\n')[0].replace(/https?:\/\/[^\s)]+/g, '<url>').replace(/\?v=[0-9a-f]+/g, '');
async function appOwnErrors(browser, app, scratch) {
  const host = await startServer(app, scratch, { baseline: true });
  const context = await browser.newContext({ serviceWorkers: 'block' }), errors = new Set();
  try {
    for (const path of app.pages) {
      const page = await context.newPage();
      page.on('pageerror', error => errors.add(errorKey(message(error))));
      await page.goto(new URL(path, host.origin).href, { waitUntil: 'load', timeout }).catch(() => {});
      await delay(8_000);
      await page.close();
    }
  } finally { await context.close().catch(() => {}); await host.stop(); }
  return errors;
}

async function verifyApp(browser, app, scratch) {
  const report = { app: app.name, appDirectory: app.app, plumbRoot: app.root, config: app.config ?? null,
    startedAt: new Date().toISOString(), startup: {}, pages: [], failures: [], exactness: [] };
  retryEvidence = report.readRetries = [];
  let host, context, written;
  try {
    report.appOwnErrors = [...await appOwnErrors(browser, app, scratch)];
    host = await startServer(app, scratch);
    report.serverConfig = host.configFile; report.adaptations = host.adaptations;
    report.origin = host.origin;
    const response = await get(host.origin, app.pages[0]);
    report.startup.pageMs = performance.now() - host.start;
    report.startup.pageStatus = response.status;
    check(response.ok, `Initial Vite page returned ${response.status}`);
    const html = response.body;
    check(typeof html === 'string' && html.includes('data-verification-react-grab') && html.includes('/__plumb/client.js'),
      'Initial HTML must load both react-grab and React Plumber');
    const held = await get(host.origin, '/__plumb/health');
    report.startup.heldHealth = held;
    report.startup.independent = held.ok && held.body.status === 'starting';
    check(report.startup.independent, 'Startup waits on React Plumber or readiness gate failed');
    host.child.send({ type: 'release' });
    report.startup.gateReleasedMs = performance.now() - host.start;
    context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });
    const gate = writeGate(host.origin, report.failures);
    await context.route('**/__plumb/**', route => gate.route(route));
    let extraBudget = 400;
    report.notes = [];
    report.interaction = {};
    for (const path of app.pages) {
      const page = await context.newPage(); page.setDefaultTimeout(10_000);
      const record = { path, pageErrors: [], plumbConsoleErrors: [], consoleErrors: [], failures: [] };
      report.pages.push(record);
      page.on('pageerror', error => record.pageErrors.push(message(error)));
      page.on('console', event => {
        if (event.type() !== 'error') return;
        const error = { text: event.text(), location: event.location() }; record.consoleErrors.push(error);
        if (/plumb/i.test(error.text) || /\/__plumb\//.test(error.location.url ?? '')) record.plumbConsoleErrors.push(error);
      });
      try {
        const navigation = await page.goto(new URL(path, host.origin).href, { waitUntil: 'domcontentloaded', timeout });
        check(navigation?.ok(), `${path} returned ${navigation?.status()}`);
        await page.waitForFunction(() => window.__plumb?.overlay && window.__REACT_GRAB__?.getSource, null, { timeout });
        const health = await bounded(page.evaluate(() => window.__plumb.ready()), 'window.__plumb.ready()', 120_000);
        check(health.status === 'ready', `React Plumber readiness: ${health.status}`);
        if (report.startup.readyMs === undefined) {
          report.startup.readyMs = performance.now() - host.start;
          report.startup.readyAfterReleaseMs = report.startup.readyMs - report.startup.gateReleasedMs;
          console.log(app.name + ': ready in ' + Math.round(report.startup.readyMs) + ' ms');
        }
        const rendered = () => page.waitForFunction(() => [...document.body.querySelectorAll('*')].some(element => {
          if (element.closest('plumb-overlay, [data-react-grab], [data-react-grab-ignore], [data-react-grab-root]')) return false;
          const rect = element.getBoundingClientRect(), css = getComputedStyle(element);
          return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight
            && css.display !== 'none' && css.visibility !== 'hidden' && css.opacity !== '0'
            && Object.keys(element).some(key => key.startsWith('__reactFiber' + '$'));
        }), null, { timeout: 30_000 });
        // A fresh dependency cache can serve a half-optimised module on the first load: a dependency found late (the
        // React Compiler's runtime) is re-bundled after the page imported the old one. Vite reloads the page itself,
        // unless the app turns HMR off (AlgoRecall). Do what Vite would: reload until the app renders, keeping the
        // errors of those first loads out of the page's record.
        for (let attempt = 0; ; attempt++) {
          try { await rendered(); break; }
          catch (error) {
            if (attempt === 3) throw error;
            record.firstLoadErrors = [...(record.firstLoadErrors ?? []), ...record.pageErrors.splice(0)];
            await delay(2000 * (attempt + 1));
            await page.reload({ waitUntil: 'domcontentloaded', timeout });
            await page.waitForFunction(() => window.__plumb?.overlay, null, { timeout });
          }
        }
        await selectElements(page);
        let first = await sample(page), second = await sample(page, true);
        check(first.length > 0, 'No visible React elements sampled');
        const samplingCounts = () => ({ sampled: first.length,
          detached: first.filter((row, i) => row.status === 'detached' || second[i]?.status === 'detached').length,
          firstDetached: first.filter(row => row.status === 'detached').length,
          secondDetached: second.filter(row => row.status === 'detached').length });
        record.sampling = { attempts: [samplingCounts()], resampled: false };
        if (record.sampling.attempts[0].detached / first.length > .3) {
          record.sampling.idle = await waitForIdle(page);
          record.sampling.resampled = true;
          await selectElements(page);
          first = await sample(page); second = await sample(page, true);
          record.sampling.attempts.push(samplingCounts());
        }
        record.first = first; record.second = second;
        const inspection = await inspectRows(app, host.origin, first, report.exactness, record.failures, scratch);
        Object.assign(record, inspection);
        const comparable = first.filter((row, i) => row.status !== 'detached' && second[i]?.status !== 'detached');
        const differences = comparable.flatMap(row => stable(row) === stable(second.find(other => other.i === row.i)) ? [] : [row.i]);
        record.reliability = { repeatedIdentical: differences.length === 0, compared: comparable.length,
          ignoredDetached: first.length - comparable.length, differences };
        if (differences.length) record.failures.push(`Repeated sampling differs at ${differences.join(', ')}`);
        const ids = comparable.filter(row => !row.error).slice(0, 10).map(row => row.i);
        await page.evaluate(async () => (await import('/__plumb/src/sourcemap.js')).invalidateSourceMaps());
        const after = await sample(page, false, ids, 'locate');
        record.reliability.invalidation = after;
        record.reliability.invalidationDetached = after.filter(row => row.status === 'detached').length;
        record.reliability.invalidationIdentical = after.filter(row => row.status !== 'detached').every(row => {
          const before = first.find(before => before.i === row.i);
          return !row.error && JSON.stringify(row.location ?? row.refusal) === JSON.stringify(before.location ?? before.refusal);
        });
        if (!record.reliability.invalidationIdentical) record.failures.push('Source-map invalidation changed locations');
        // Equality alone must never make a failed server check acceptable.
        for (const row of after) for (const link of chainOf(row.location)) {
          const verified = await verifyLocation(host.origin, link);
          if (!verified.verified) record.failures.push(`Invalidated location failed server check: ${link.file}:${link.line}`);
        }
        record.performance = { locateMs: distribution([...first, ...second].map(row => row.locateMs)),
          overlayReadMs: distribution([...first, ...second].map(row => row.readMs)), ...await measureReads(host.origin, first, page) };
        // Pointing at an element must answer within a second for most elements.
        if (record.performance.locateMs.p95 >= 1000) record.failures.push(`Locate p95 ${Math.round(record.performance.locateMs.p95)} ms >= 1000 ms`);
        const burst = record.performance.burst;
        if (!burst.overlapped) record.failures.push('Health probe did not overlap read burst');
        if (burst.health.some(probe => !probe.ok || probe.body.status !== 'ready' || probe.ms >= 100)) record.failures.push('Health under burst failed or took >= 100 ms');
        if (burst.page.some(probe => !probe.ok)) record.failures.push('Vite stopped serving during burst');
        if (burst.failed) record.failures.push(`${burst.failed} burst reads failed; request/status/body/retry evidence in performance.burst.errors`);
        const needsPreview = !['passed', 'failed'].includes(report.interaction.preview?.status);
        const needsChain = !['passed', 'failed'].includes(report.interaction.chain?.status);
        const needsWrite = !['passed', 'failed'].includes(report.interaction.write?.status);
        let interactionRows = first;
        const hasChoices = rows => rows.some(row => row.reading?.marks?.some(mark => mark.choices?.length));
        if (extraBudget && ((needsPreview && !hasChoices(first)) || (needsChain && !first.some(row => chainOf(row.location).length > 1))
          || (needsWrite && !hasExactEdit(first)))) {
          const ids = await selectElements(page, extraBudget);
          extraBudget -= ids.length;
          const extra = await sample(page, false, ids, 'reading');
          record.interactionSearch = { additional: ids.length, remainingBudget: extraBudget, detached: extra.filter(row => row.status === 'detached').length,
            errors: extra.filter(row => row.error) };
          for (const row of extra.filter(row => row.error)) record.failures.push(`interaction search sample ${row.i}: ${row.error}`);
          interactionRows = [...first, ...extra];
        }
        if (needsPreview || needsChain) {
          record.interaction = await interaction(page, interactionRows, { preview: needsPreview, chain: needsChain });
          for (const [name, result] of Object.entries(record.interaction)) {
            report.interaction[name] = { page: path, ...result };
            if (result.status === 'failed') record.failures.push(`${name} interaction: ${result.error}`);
          }
        }
        if (needsWrite) {
          const result = await writeInteraction(page, interactionRows, app, scratch, gate, write => { written = write; });
          (record.interaction ??= {}).write = result;
          report.interaction.write = { page: path, ...result };
          if (result.status === 'failed') record.failures.push(`write interaction: ${result.error}`);
        }
      } catch (error) { record.failures.push(message(error)); }
      finally {
        await page.close();
        record.appErrors = record.pageErrors.filter(error => report.appOwnErrors?.includes(errorKey(error)));
        record.pageErrors = record.pageErrors.filter(error => !report.appOwnErrors?.includes(errorKey(error)));
        const recovered = new Set((record.interaction?.write?.busyReads ?? []).filter(read => read.recovered).map(read => read.url));
        record.recoveredBusyConsoleErrors = record.plumbConsoleErrors.filter(error => recovered.has(error.location.url)
          && /status of 503/.test(error.text));
        record.plumbConsoleErrors = record.plumbConsoleErrors.filter(error => !record.recoveredBusyConsoleErrors.includes(error));
        if (record.pageErrors.length) record.failures.push(`${record.pageErrors.length} page errors`);
        if (record.plumbConsoleErrors.length) record.failures.push(`${record.plumbConsoleErrors.length} React Plumber console errors`);
        report.failures.push(...record.failures.map(failure => `${path}: ${failure}`));
        console.log(app.name + ' ' + path + ': ' + (record.counts?.sampled ?? 0) + ' samples; ' + record.failures.length + ' failures');
      }
    }
    if (report.interaction.preview?.status === 'info') report.notes.push(report.interaction.preview.note);
    if (report.interaction.chain?.status === 'info') report.notes.push(report.interaction.chain.note);
    if (report.interaction.write?.status === 'info') report.notes.push(report.interaction.write.note);
    if (!report.exactness.length) report.failures.push('Exactness untested: no placed elements');
  } catch (error) { report.failures.push(message(error)); }
  finally {
    if (context) await context.close().catch(error => report.failures.push(`Browser cleanup: ${message(error)}`));
    if (host) { report.serverLog = host.logs(); await host.stop(); }
    if (written) {
      try { await restoreWrite(written); }
      catch (error) { report.failures.push(`Write integrity: ${message(error)}`); }
    }
  }
  report.finishedAt = new Date().toISOString();
  report.status = report.failures.length ? 'failed' : 'passed';
  return report;
}

function summary(report) {
  const counts = report.pages.map(page => page.counts).filter(Boolean);
  const total = key => counts.reduce((sum, count) => sum + (count[key] ?? 0), 0);
  const locates = report.pages.flatMap(page => [...(page.first ?? []), ...(page.second ?? [])]).map(row => row.locateMs);
  const health = report.pages.flatMap(page => page.performance?.burst.health ?? []).map(probe => probe.ms);
  return { app: report.app, status: report.status, pageMs: report.startup.pageMs?.toFixed(0) ?? '-',
    readyMs: report.startup.readyMs?.toFixed(0) ?? '-', sampled: total('sampled'), matched: total('bothMatched'),
    detached: total('detached'), oracleLibrary: total('oracle-library'), plumbOnly: total('plumbOnly'), grabOnly: total('grabOnly'), disagreements: total('disagreements'),
    exact: `${report.exactness.filter(result => result.ok).length}/${report.exactness.length}`,
    locateP95: distribution(locates).p95 ?? '-', healthMax: distribution(health).max ?? '-',
    write: report.interaction?.write?.status ?? 'untested', failures: report.failures.length };
}
async function writeReports(reports, fatal = null) {
  await fsp.mkdir(output, { recursive: true });
  for (const report of reports) await fsp.writeFile(join(output, `verify.${report.app}.json`), JSON.stringify(report, null, 2) + '\n');
  const lines = ['# React Plumber overlay end-to-end verification', '', `Run: ${new Date().toISOString()}`, '',
    'Command: `PLUMB_CHROMIUM=/path/to/chromium node bench/apps/verify.mjs [app ...]`', '',
    'Reports use docs/verification/. App servers run sequentially against frozen git-visible working-tree copies, including uncommitted edits and explicit ignored runtime inputs. Git reads original HEAD and file lists; originals remain read-only.', '',
    'Startup is measured from child launch to the first successful HTML response. React Plumber initialization is held until that response and a starting health response are observed. Ready time includes the gate and browser loading; it is not an ungated startup benchmark.', '',
    'Up to 150 visible React elements per page are sampled twice using the same DOM references and fresh overlay readings on the second pass. Detached or re-rendered samples are excluded; a page with >30% of its sampled nodes detached across the two passes is resampled once after up to 10 seconds waiting for 500 ms without DOM mutations and two quiet frames. Dependency oracle answers are counted as oracle-library. Exactness checks cover up to 20 placed elements per app.', '',
    'Busy responses in server checks and bursts retain request, status, body, and retry evidence. Only 503 busy answers recovered on retry with health <100 ms throughout are accepted. Interaction search covers every sampled page and up to 400 extra rendered elements per app; no choices is informational. Chain stepping and no-preview Undo are tested independently. Unexplained disagreements, failed server checks, unstable results, errors, failed interactions, and health >=100 ms fail the run.', '',
    'Write permits one exact overlay apply request per app. Source bytes, automatic dev reload/HMR, current overlay reading without preview, CLI findings before/after and original working-tree hashes are checked. The proven edit is restored after the server stops, then the existing whole-copy integrity guard runs.', '',
    'Write-phase browser 503 responses retain their bodies, same-URL read-only retries and health in interaction.write.busyReads. They are accepted only after the overlay returns current and both health responses are ready below 100 ms. Their console messages remain in recoveredBusyConsoleErrors; all other React Plumber console errors still fail.', '',
    '| App | Result | Page ms | Ready ms | Sample | Detached | Oracle library | Match | React Plumber only | Grab only | Disagree | JSX exact | Locate p95 ms | Health max ms | Write |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: | --- |'];
  for (const report of reports) {
    const row = summary(report);
    lines.push(`| ${row.app} | ${row.status} | ${row.pageMs} | ${row.readyMs} | ${row.sampled} | ${row.detached} | ${row.oracleLibrary} | ${row.matched} | ${row.plumbOnly} | ${row.grabOnly} | ${row.disagreements} | ${row.exact} | ${row.locateP95} | ${row.healthMax} | ${row.write} |`);
  }
  if (fatal) lines.push('', '## Harness failure', '', '```text', fatal, '```');
  for (const report of reports) {
    lines.push('', `## ${report.app}`, '', `[Full evidence](verify.${report.app}.json)`, '');
    if (report.snapshot) lines.push('Snapshot: ' + report.snapshot.original + '; HEAD ' + report.snapshot.head + '; ' + report.snapshot.fileCount + ' files; ' + report.snapshot.method + '; ' + report.snapshot.ms + ' ms; unchanged ' + report.snapshot.unchanged + '; removed ' + report.snapshot.removed + '.', '');
    for (const adaptation of report.adaptations ?? []) lines.push(`- ${adaptation}`);
    for (const note of report.notes ?? []) lines.push(`- INFO: ${note}`);
    for (const failure of report.failures) lines.push(`- FAIL: ${failure.replaceAll('\n', '\n  ')}`);
    const write = report.interaction?.write;
    if (write) {
      lines.push('', '### Write', '', write.file
        ? `${write.status}: ${write.file}:${write.line}:${write.column}; \`${write.from}\` → \`${write.to}\`; Write to current reading ${write.writeToCurrentMs ?? 'unmeasured'} ms; source exact ${write.source?.exact ?? false}; CLI site ${write.checkBefore?.sites.length ?? '?'} before / ${write.checkAfter?.sites.length ?? '?'} after; originals unchanged ${report.snapshot?.originalUnchanged ?? false}.`
        : `${write.status}: ${write.note ?? write.error}`);
    }
    for (const page of report.pages) if (page.counts) {
      const { reading, classes } = page.counts;
      lines.push('', `### ${page.path}`, '',
        `Reading: ${reading.ready}/${reading.placed} ready; ${reading.computed} computed; ${reading.withMarks} with marks; ${reading.writable} with writable edits.`, '',
        `Computed levels: ${classes.levels}; ${classes.attributed} attributed, ${classes.unattributed} unattributed, ${classes.ambiguous} ambiguous classes.`, '',
        `Parity: ${page.counts['oracle-library']} oracle-library; ${page.counts.detached} detached; ${page.counts.disagreements} disagreements. Missing oracle placements (up to 20) and full answers are in JSON.`, '',
        `Reliability: repeat ${page.reliability?.repeatedIdentical ? 'identical' : 'failed/unmeasured'}; source-map invalidation ${page.reliability?.invalidationIdentical ? 'identical' : 'failed/unmeasured'}.`);
    }
  }
  await fsp.writeFile(join(output, 'overlay-e2e.md'), lines.join('\n') + '\n');
}

async function main() {
  const selected = process.argv.slice(2);
  if (selected.includes('--help')) {
    console.log('PLUMB_CHROMIUM=/path/to/chromium node bench/apps/verify.mjs [metalui kamui craftingattention algorecall]\nUses existing dist build; frozen inputs on by default; writes only docs/verification/ and React Plumber-local temporary caches.');
    return;
  }
  check(selected.every(name => apps.some(app => app.name === name)), `Unknown app: ${selected.filter(name => !apps.some(app => app.name === name)).join(', ')}`);
  const targets = selected.length ? apps.filter(app => selected.includes(app.name)) : apps;
  const reports = [];
  let browser, scratch, tool, fatal;
  try {
    const { chromium } = await import('playwright');
    // Launch before starting any app. Failure produces a nonzero report, never a successful skip.
    await fsp.mkdir(join(repo, 'fixtures/.verify-frozen'), { recursive: true });
    scratch = await fsp.mkdtemp(join(repo, 'fixtures/.verify-frozen/plumb-verify-'));
    const toolSource = resolve((process.env.PLUMBER_VERIFY_TOOL_ROOT ?? process.env.PLUMB_VERIFY_TOOL_ROOT) ?? repo);
    check(toolSource === repo || toolSource.startsWith(repo + sep), 'Tool snapshot source must be inside React Plumber');
    tool = await freezeTool(toolSource, join(scratch, 'tool'), grabFile);
    process.env.TMPDIR = scratch;
    browser = await chromium.launch({ executablePath: (process.env.PLUMBER_CHROMIUM ?? process.env.PLUMB_CHROMIUM) });
    for (const app of targets) {
      const directory = join(scratch, app.name); await fsp.mkdir(directory, { recursive: true });
      const frozen = await freezeApp({ ...app, toolRoot: tool.directory }, directory);
      console.log(app.name + ': frozen ' + frozen.snapshot.fileCount + ' files in ' + frozen.snapshot.ms + ' ms');
      // The proof process waits for this marker before changing its scratch original.
      if (process.send) process.send({ type: 'snapshot', app: app.name, snapshot: frozen.snapshot });
      const report = await verifyApp(browser, frozen.app, directory); reports.push(report);
      report.snapshot = frozen.snapshot; report.tool = tool; report.runId = scratch.slice(scratch.lastIndexOf(sep) + 1);
      report.adaptations = [...frozen.adaptations, ...(report.adaptations ?? [])];
      if (!await frozen.finish()) { report.failures.push('The frozen app working tree changed during verification'); report.status = 'failed'; }
      if (!frozen.snapshot.originalUnchanged) { report.failures.push('An original app working tree changed during verification'); report.status = 'failed'; }
      if (frozen.snapshot.ms >= 30_000) { report.failures.push('Snapshot exceeded 30 seconds'); report.status = 'failed'; }
      for (const input of frozen.snapshot.repositories) if (input.originalMoved) {
        (report.notes ??= []).push('The original moved on during the run; the result is for ' + input.head + ' (' + input.original + '; now ' + input.headAfter + ').');
      }
      // No cache cleanup can traverse dependency symlinks into an original.
      await fsp.rm(directory, { recursive: true, force: true });
      report.snapshot.removed = true;
      console.log(app.name + ': ' + report.status + '; frozen inputs unchanged ' + frozen.snapshot.unchanged);
      await writeReports(reports);
    }
  } catch (error) { fatal = message(error); }
  finally {
    if (browser) await browser.close().catch(error => { fatal ??= message(error); });
    if (tool) {
      tool.unchanged = tool.sha256 === await fingerprint([tool.directory]);
      if (!tool.unchanged) fatal ??= 'Frozen React Plumber runtime changed during verification';
    }
    if (scratch) await fsp.rm(scratch, { recursive: true, force: true }).catch(error => { fatal ??= message(error); });
  }
  if (tool) tool.removed = !fs.existsSync(tool.directory);
  await writeReports(reports, fatal);
  console.table(reports.map(summary));
  if (fatal) console.error(fatal);
  if (fatal || reports.length !== targets.length || reports.some(report => report.status !== 'passed')) process.exitCode = 1;
}

if (process.argv[2] === '--serve') {
  const app = JSON.parse(process.argv[3]);
  try { check(app, 'Unknown server app'); await serve(app, process.argv[4]); }
  catch (error) {
    if (process.connected) process.send({ type: 'error', error: message(error) });
    console.error(message(error)); process.exit(1);
  }
} else if (process.argv[1] && resolve(process.argv[1]) === here) {
  await main().catch(error => { console.error(message(error)); process.exitCode = 1; });
}
