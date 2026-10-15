import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { cp, mkdtemp, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build, createServer } from 'vite';
import { plumb } from '@unlocalhosted/react-plumber/vite';

const repo = fileURLToPath(new URL('../', import.meta.url)), cli = join(repo, 'dist/cli.js');
const source = 'export const App = () => <div className="py-[10px] gap-[13px]" />;\n';
const selection = result => ({ file: result.file, hash: result.hash, edits: [{ id: result.edits[0].id }] });
async function project(t, dependencies = {}) {
  const root = await mkdtemp(join(repo, 'fixtures/.hosts-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'fixtures/spacing'), root, { recursive: true, filter: path => !path.split('/').includes('.plumb-cache') });
  await writeFile(join(root, 'src/App.tsx'), source);
  await writeFile(join(root, 'package.json'), JSON.stringify({ type: 'module', devDependencies: dependencies }));
  return root;
}
function run(root, args) {
  const result = spawnSync(process.execPath, [cli, ...args, '--root', root], { encoding: 'utf8', timeout: 30000 });
  assert.ifError(result.error); assert.equal(result.status, 0, result.stderr); assert.equal(result.stderr, '');
  return result.stdout;
}
async function snapshot(root) {
  const files = await readdir(root, { recursive: true, withFileTypes: true });
  return Promise.all(files.filter(file => file.isFile()).map(async file => {
    const path = join(file.parentPath, file.name); return [path, await readFile(path, 'utf8')];
  })).then(files => files.sort(([a], [b]) => a.localeCompare(b)));
}
async function connection(t, root) {
  const child = spawn(process.execPath, [cli, 'serve', '--overlay', '--origin', 'http://localhost:5555', '--port', '0', '--root', root], { stdio: ['ignore', 'pipe', 'pipe'] });
  let errors = ''; child.stderr.on('data', chunk => errors += chunk); child.stdout.resume();
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) { child.kill('SIGTERM'); await once(child, 'exit'); }
    assert.equal(errors, '');
  });
  for (let i = 0; i < 300; i++) {
    assert.equal(child.exitCode, null, errors);
    try {
      const info = JSON.parse(await readFile(join(root, '.plumber/serve.json'), 'utf8'));
      return { info, url: `http://127.0.0.1:${info.port}` };
    } catch {}
    await delay(20);
  }
  assert.fail(errors || 'overlay daemon did not start');
}

async function ready(url, headers = {}) {
  for (let i = 0; i < 1500; i++) {
    const response = await fetch(url + '/__plumb/health', { headers });
    const health = await response.json();
    if (health.status !== 'starting') { assert.equal(health.status, 'ready', JSON.stringify(health)); return health; }
    await delay(20);
  }
  assert.fail('Session did not become ready');
}

// Execute the served module against the real API, with only the script DOM supplied by the host.
async function connectClient(url, token, origin) {
  const response = await fetch(url, { headers: origin ? { Origin: origin } : {} });
  assert.equal(response.status, 200); assert.match(response.headers.get('Content-Type'), /javascript/);
  const client = await response.text();
  if (token) assert.ok(!client.includes(token), 'public module must not contain the process token');
  const script = { src: url, dataset: token ? { plumbToken: token } : {} };
  let connected;
  // Browser module loading and locate/site are exercised by locate.test.mjs.
  const execute = new Function('document', 'fetch', 'console', `const window = {}, locate = () => null, mountOverlay = () => null, base = new URL('./', ${JSON.stringify(url)}).href, token = document.querySelectorAll()[0]?.dataset.plumbToken;
    const request = async method => (await fetch(base + method, { headers: token ? { 'x-plumb-token': token } : {} })).json();
    return (async () => {${client.replace(/^import .*;\n/gm, '').replaceAll('import.meta.url', JSON.stringify(url))}})();`);
  await execute({ querySelectorAll: () => [script] }, async (url, init) => {
    const response = await fetch(url, { ...init, headers: { ...init.headers, ...(origin ? { Origin: origin } : {}) } });
    assert.equal(response.status, 200); return response;
  }, { debug: (message, health) => { assert.equal(message, '[plumb] overlay connected'); connected = health; } });
  assert.equal(connected.status, 'ready');
  return connected;
}

test('Vite injects and serves the client, shares edits/apply and excludes React Plumber from builds', async t => {
  const root = await project(t, { vite: '^8.3.4' });
  const plumbRoot = await project(t);
  await writeFile(join(root, 'index.html'), '<html><head></head><body><script type="module" src="/src/entry.js"></script></body></html>');
  await writeFile(join(root, 'src/entry.js'), 'document.body.dataset.ready = "yes";\n');
  const server = await createServer({ root, cacheDir: join(root, '.vite-cache'), configFile: false, plugins: [plumb({ root: plumbRoot, watch: false })], logLevel: 'silent', server: { host: '127.0.0.1', port: 0 } });
  t.after(() => server.close()); await server.listen();
  const url = `http://127.0.0.1:${server.httpServer.address().port}`;
  assert.match(await (await fetch(url)).text(), /<script type="module" src="\/__plumb\/client\.js"><\/script>/);
  await ready(url);
  const health = await connectClient(url + '/__plumb/client.js'); assert.equal(health.root, plumbRoot);
  assert.equal(health.pid, process.pid, 'adapter must stay in the host process');
  const site = await fetch(url + '/__plumb/site?file=src/App.tsx&line=1');
  assert.equal(site.status, 200); assert.ok((await site.json()).findings.length);
  const editsResponse = await fetch(url + '/__plumb/edits?file=src/App.tsx&line=1');
  assert.equal(editsResponse.status, 200); const edits = await editsResponse.json(); assert.ok(edits.edits.length);
  assert.equal(edits.file, join(plumbRoot, 'src/App.tsx'));
  const before = await readFile(edits.file, 'utf8');
  for (const path of ['health', 'client.js', 'edits?file=src/App.tsx&line=1']) {
    assert.equal((await fetch(url + '/__plumb/' + path, { headers: { Origin: 'https://foreign.example' } })).status, 403);
  }
  for (const headers of [{}, { Origin: 'https://foreign.example' }, { Origin: url, 'Sec-Fetch-Site': 'cross-site' }]) {
    assert.equal((await fetch(url + '/__plumb/apply', { method: 'POST', headers, body: JSON.stringify(selection(edits)) })).status, 403);
  }
  assert.equal(await readFile(edits.file, 'utf8'), before);
  const applied = await fetch(url + '/__plumb/apply', { method: 'POST', headers: { Origin: url, 'Content-Type': 'application/json' }, body: JSON.stringify(selection(edits)) });
  assert.equal(applied.status, 200); assert.ok((await applied.json()).revision > edits.revision);
  assert.equal(await readFile(edits.file, 'utf8'), before.slice(0, edits.edits[0].start) + edits.edits[0].to + before.slice(edits.edits[0].end));
  assert.equal((await fetch(url + '/__plumb/health', { method: 'POST', headers: { Origin: url } })).status, 405);
  await server.close();
  await build({ root, configFile: false, plugins: [plumb({ root: join(root, 'does-not-exist') })], logLevel: 'silent' });
  for (const [, contents] of await snapshot(join(root, 'dist'))) assert.ok(!contents.includes('__plumb'), 'production assets must omit the overlay');
  await assert.rejects(readFile(join(root, '.plumber/serve.json')), { code: 'ENOENT' });
});

test('Vite defaults to its root and resolves explicit relative roots and configs for separate Sessions', async t => {
  const root = await project(t), plumbRoot = await project(t);
  await rename(join(plumbRoot, 'plumber.config.ts'), join(plumbRoot, 'custom.config.ts'));
  const servers = [];
  let revision;
  t.after(() => Promise.all(servers.map(server => server.close())));
  for (const [options, expectedRoot] of [
    [{ watch: false }, root],
    [{ root: relative(root, plumbRoot), config: 'custom.config.ts', watch: false }, plumbRoot],
    [{ root: plumbRoot, config: join(plumbRoot, 'custom.config.ts'), watch: false }, plumbRoot],
  ]) {
    const server = await createServer({ root, cacheDir: join(root, '.vite-cache'), configFile: false, plugins: [plumb(options)], logLevel: 'silent', server: { host: '127.0.0.1', port: 0 } });
    servers.push(server); await server.listen();
    const url = `http://127.0.0.1:${server.httpServer.address().port}`;
    const health = await ready(url); assert.equal(health.root, expectedRoot);
    assert.equal(health.status, 'ready');
    if (revision !== undefined) assert.equal(health.revision, revision, 'equivalent resolved options share a Session');
    const edits = await (await fetch(url + '/__plumb/edits?file=src/App.tsx&line=1')).json();
    assert.equal(edits.file, join(expectedRoot, 'src/App.tsx')); assert.ok(edits.edits.length);
    if (options.root && revision === undefined) {
      const applied = await fetch(url + '/__plumb/apply', { method: 'POST', headers: { Origin: url, 'Content-Type': 'application/json' }, body: JSON.stringify(selection(edits)) });
      assert.equal(applied.status, 200); revision = (await applied.json()).revision; assert.ok(revision > health.revision);
    }
  }
});

test('Next App Router shares a process token/session across hot reloads and disables everything in production', async t => {
  const root = await project(t, { next: '^16.0.0' });
  const script = join(root, 'next-host.mjs'), adapter = pathToFileURL(join(repo, 'dist/hosts/next.js')).href;
  await writeFile(script, `
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createPlumbRoute, PlumbOverlay, runtime } from ${JSON.stringify(adapter)};
async function main() {
  const root = process.argv[2], url = 'http://localhost:3000/__plumb/';
  const key = Symbol.for('@unlocalhosted/plumb/next');
  process.env.NODE_ENV = 'production';
  const disabled = createPlumbRoute({ root });
  assert.equal((await disabled.GET(new Request(url + 'health'))).status, 404);
  assert.equal((await disabled.POST(new Request(url + 'apply', { method: 'POST', body: '{}' }))).status, 404);
  assert.equal((await disabled.GET(new Request(url + 'client.js'))).status, 404);
  assert.equal(renderToStaticMarkup(createElement(PlumbOverlay)), '');
  assert.equal(globalThis[key], undefined, 'production must not initialize overlay state');
  process.env.NODE_ENV = 'development';
  assert.equal(runtime, 'nodejs');
  const html = renderToStaticMarkup(createElement(PlumbOverlay));
  assert.match(html, /type="module"/); assert.match(html, /src="\\/__plumb\\/client.js"/);
  const token = /data-plumb-token="([a-f0-9]{64})"/.exec(html)[1];
  const route = createPlumbRoute({ root, watch: false });
  const headers = { 'x-plumb-token': token };
  const send = (path, init = {}) => route[init.method === 'POST' ? 'POST' : 'GET'](new Request(url + path, { ...init, headers: { ...headers, ...init.headers } }));
  for (const path of ['health', 'edits?file=src/App.tsx&line=1']) {
    for (const token of [undefined, 'wrong']) {
      assert.equal((await route.GET(new Request(url + path, { headers: token ? { 'x-plumb-token': token } : {} }))).status, 401);
    }
  }
  for (const token of [undefined, 'wrong']) {
    assert.equal((await route.POST(new Request(url + 'apply', { method: 'POST', body: '{}', headers: token ? { 'x-plumb-token': token } : {} }))).status, 401);
  }
  let health;
  do { health = await (await send('health')).json(); if (health.status === 'starting') await new Promise(resolve => setTimeout(resolve, 20)); } while (health.status === 'starting');
  assert.equal(health.status, 'ready'); assert.equal(health.root, root);
  const client = await route.GET(new Request(url + 'client.js')); assert.equal(client.status, 200);
  assert.ok(!(await client.text()).includes(token));
  // The API module reads the token from the server-rendered script tag; no served module embeds it.
  const api = await route.GET(new Request(url + 'src/api.js')); assert.equal(api.status, 200);
  const module = await api.text(); assert.ok(!module.includes(token)); assert.match(module, /x-plumb-token/);
  const site = await send('site?file=src/App.tsx&line=1'); assert.equal(site.status, 200); assert.ok((await site.json()).findings.length);
  assert.equal((await send('apply')).status, 405);
  assert.equal((await send('apply', { method: 'POST', body: 'bad' })).status, 400);
  const edits = await (await send('edits?file=src/App.tsx&line=1')).json(); assert.ok(edits.edits.length);
  const before = await readFile(edits.file, 'utf8');
  const body = JSON.stringify({ file: edits.file, hash: edits.hash, edits: [{ id: edits.edits[0].id }] });
  const applied = await send('apply', { method: 'POST', body }); assert.equal(applied.status, 200);
  const revision = (await applied.json()).revision; assert.ok(revision > edits.revision);
  assert.equal(await readFile(edits.file, 'utf8'), before.slice(0, edits.edits[0].start) + edits.edits[0].to + before.slice(edits.edits[0].end));
  const retained = globalThis[key].handler;
  const reloaded = await import(${JSON.stringify(adapter + '?hot-reload')});
  assert.equal(renderToStaticMarkup(createElement(reloaded.PlumbOverlay)), html);
  const again = reloaded.createPlumbRoute({ root: root + '/ignored', watch: false });
  const next = await again.GET(new Request(url + 'health', { headers })); assert.equal(next.status, 200);
  assert.equal((await next.json()).revision, revision); assert.equal(globalThis[key].handler, retained);
  process.env.NODE_ENV = 'production';
  for (const path of ['health', 'client.js']) assert.equal((await send(path)).status, 404);
  assert.equal((await send('apply', { method: 'POST', body })).status, 404);
  assert.equal(renderToStaticMarkup(createElement(PlumbOverlay)), '');
}
main().then(() => process.exit(0), error => { console.error(error); process.exit(1); });
`);
  const result = spawnSync(process.execPath, [script, root], { encoding: 'utf8', timeout: 30000 });
  assert.ifError(result.error); assert.equal(result.status, 0, result.stderr);
});

test('serve --overlay permits exactly its configured CORS origin, including real preflight and apply', async t => {
  const root = await project(t), { info, url } = await connection(t, root);
  const origin = 'http://localhost:5555', headers = { Origin: origin, 'x-plumb-token': info.token };
  assert.equal(info.origin, origin); assert.equal(info.overlay, true);
  const health = await connectClient(url + '/__plumb/client.js', info.token, origin); assert.equal(health.root, root);
  for (const path of ['/__plumb/health', '/health', '/__plumb/client.js']) {
    const allowed = await fetch(url + path, { headers }); assert.equal(allowed.status, 200);
    assert.equal(allowed.headers.get('Access-Control-Allow-Origin'), origin); assert.equal(allowed.headers.get('Vary'), 'Origin');
    for (const Origin of ['http://localhost:5556', 'https://localhost:5555', 'https://foreign.example', 'null']) {
      const refused = await fetch(url + path, { headers: { ...headers, Origin } });
      assert.equal(refused.status, 403); assert.equal(refused.headers.get('Access-Control-Allow-Origin'), null);
    }
  }
  assert.equal((await fetch(url + '/__plumb/health', { headers: { Origin: origin } })).status, 401);
  assert.equal((await fetch(url + '/__plumb/health', { headers: { ...headers, 'x-plumb-token': 'wrong' } })).status, 401);
  const before = await readFile(join(root, 'src/App.tsx'), 'utf8');
  const edits = await (await fetch(url + '/__plumb/edits?file=src/App.tsx&line=1', { headers })).json(); assert.ok(edits.edits.length);
  const preflightHeaders = { Origin: origin, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type, x-plumb-token' };
  const preflight = await fetch(url + '/__plumb/apply', { method: 'OPTIONS', headers: preflightHeaders });
  assert.equal(preflight.status, 204); assert.equal(await preflight.text(), '');
  assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), origin);
  assert.equal(preflight.headers.get('Access-Control-Allow-Methods'), 'POST'); assert.match(preflight.headers.get('Access-Control-Allow-Headers'), /x-plumb-token/);
  assert.equal((await fetch(url + '/__plumb/health', { method: 'OPTIONS', headers: { ...preflightHeaders, 'Access-Control-Request-Method': 'GET' } })).status, 204);
  assert.equal((await fetch(url + '/__plumb/apply', { method: 'OPTIONS', headers: { ...preflightHeaders, Origin: 'https://foreign.example' } })).status, 403);
  assert.equal((await fetch(url + '/__plumb/apply', { method: 'OPTIONS', headers: { ...preflightHeaders, 'Access-Control-Request-Headers': 'authorization' } })).status, 403);
  assert.equal((await fetch(url + '/__plumb/apply', { method: 'OPTIONS', headers: { ...preflightHeaders, 'Access-Control-Request-Method': 'DELETE' } })).status, 405);
  assert.equal((await fetch(url + '/__plumb/apply', { method: 'POST', headers: { ...headers, Origin: 'https://foreign.example' }, body: JSON.stringify(selection(edits)) })).status, 403);
  assert.equal(await readFile(edits.file, 'utf8'), before);
  const applied = await fetch(url + '/__plumb/apply', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(selection(edits)) });
  assert.equal(applied.status, 200); assert.ok((await applied.json()).revision > edits.revision);
  assert.equal(await readFile(edits.file, 'utf8'), before.slice(0, edits.edits[0].start) + edits.edits[0].to + before.slice(edits.edits[0].end));
  const originalFiles = await snapshot(root), output = run(root, ['install', '--overlay']);
  assert.match(output, new RegExp(`src="http://127.0.0.1:${info.port}/__plumb/client.js"`)); assert.ok(output.includes(`data-plumb-token="${info.token}"`));
  assert.deepEqual(await snapshot(root), originalFiles, 'install must never edit files');
});

test('install --overlay detects hosts from package.json and prints wiring without writes', async t => {
  for (const [dependencies, expected] of [
    [{ vite: '^8.3.4' }, [/import \{ plumb \} from '@unlocalhosted\/react-plumber\/vite'/, /plumb\(\)/]],
    [{ next: '^16.0.0', vite: '^8.3.4' }, [/app\/%5F_plumb\/\[\.\.\.path\]\/route\.plumb\.ts/, /withPlumb\(nextConfig\)/, /@unlocalhosted\/react-plumber\/next\/config/, /export const runtime = 'nodejs'/, /export const \{ GET, POST \} = createPlumbRoute\(\)/, /<PlumbOverlay \/>/]],
    [{}, [/<script type="module" src="http:\/\/127.0.0.1:7331\/__plumb\/client.js" data-plumb-token="TOKEN_FROM_SERVE_JSON"><\/script>/, /serve --overlay --port 7331 --origin/]],
  ]) {
    const root = await project(t, dependencies), before = await snapshot(root);
    const output = run(root, ['install', '--overlay']);
    for (const pattern of expected) assert.match(output, pattern);
    assert.equal(run(root, ['install', '--overlay', '--list']), output);
    assert.deepEqual(await snapshot(root), before);
  }
  const root = await project(t); await rm(join(root, 'package.json'));
  const before = await snapshot(root);
  const missing = spawnSync(process.execPath, [cli, 'install', '--overlay', '--root', root], { encoding: 'utf8', timeout: 10000 });
  assert.ifError(missing.error); assert.equal(missing.status, 2);
  assert.match(missing.stderr, /This is a workspace with \d+ apps\. Pick one:/);
  assert.equal(missing.stdout, ''); assert.deepEqual(await snapshot(root), before);
});

test('overlay CLI rejects incompatible flags and malformed origins before creating a server', async t => {
  const root = await project(t), before = await snapshot(root);
  for (const args of [
    ['serve', '--overlay'], ['serve', '--origin', 'http://localhost:5555'], ['serve', '--overlay', '--stdio'],
    ['install', '--overlay', '--ci'], ['install', '--overlay', '--hooks'], ['install', '--overlay', '--agent', 'codex'],
    ['check', '--overlay'], ['install', '--origin', 'http://localhost:5555'],
    ['check', '--served-root', 'apps/web'], ['serve', '--served-root', 'apps/web'],
    ['serve', '--stdio', '--served-root', 'apps/web'], ['serve', '--overlay', '--origin', 'http://localhost:5555', '--served-root', ''],
    ...['null', 'file:///tmp', 'https://user:pass@example.com', 'http://localhost:5555/path', 'http://localhost:5555?x=1', 'http://localhost:5555#x'].map(origin => ['serve', '--overlay', '--origin', origin]),
  ]) {
    const result = spawnSync(process.execPath, [cli, ...args, '--root', root], { encoding: 'utf8', timeout: 10000 });
    assert.ifError(result.error); assert.equal(result.status, 2, JSON.stringify(args)); assert.ok(result.stderr.length);
  }
  assert.deepEqual(await snapshot(root), before);
});

async function nextProcess(t, root, args) {
  const env = { ...process.env, NEXT_TELEMETRY_DISABLED: '1', WATCHPACK_POLLING: 'true' }; delete env.NODE_ENV;
  const child = spawn(process.execPath, [join(repo, 'node_modules/next/dist/bin/next'), ...args], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = ''; child.stdout.on('data', chunk => output += chunk); child.stderr.on('data', chunk => output += chunk);
  const done = once(child, 'exit');
  t.after(async () => { if (child.exitCode === null && child.signalCode === null) { child.kill('SIGTERM'); await done; } });
  return { child, done, output: () => output };
}

test('overlay review 2–4: installed Next wiring serves dev and excludes Session from production and static export', { timeout: 180000 }, async t => {
  const root = await project(t, { next: '^16.4.0', react: '^19.3.0', 'react-dom': '^19.3.0' });
  const { mkdir } = await import('node:fs/promises');
  const installed = join(root, 'node_modules/@unlocalhosted/react-plumber');
  await mkdir(installed, { recursive: true });
  for (const name of ['dist', 'overlay', 'package.json', 'THIRD_PARTY_NOTICES']) await cp(join(repo, name), join(installed, name), { recursive: true });
  const routeDir = join(root, 'app/%5F_plumb/[...path]'); await mkdir(routeDir, { recursive: true });
  await writeFile(join(routeDir, 'route.plumb.ts'), `import { createPlumbRoute } from '@unlocalhosted/react-plumber/next';\nexport const runtime = 'nodejs';\nexport const { GET, POST } = createPlumbRoute({ watch: false });\n`);
  await writeFile(join(root, 'app/layout.jsx'), `import { PlumbOverlay } from '@unlocalhosted/react-plumber/next';\nexport default function Layout({ children }) { return <html><body>{children}<PlumbOverlay /></body></html>; }\n`);
  await writeFile(join(root, 'app/page.jsx'), `export default function Page() { return <main>Host page</main>; }\n`);
  await writeFile(join(root, 'next.config.mjs'), `import assert from 'node:assert/strict';\nimport { withPlumb } from '@unlocalhosted/react-plumber/next/config';\nconst original = { pageExtensions: ['jsx', 'js'], serverExternalPackages: ['lightningcss'], ...((process.env.PLUMBER_EXPORT ?? process.env.PLUMB_EXPORT) ? { output: 'export' } : {}) };\nconst config = withPlumb(original);\nassert.deepEqual(original.pageExtensions, ['jsx', 'js']);\nassert.deepEqual(original.serverExternalPackages, ['lightningcss']);\nif (process.env.NODE_ENV === 'development') {\n  assert.deepEqual(config.pageExtensions, ['jsx', 'js', 'plumb.ts', 'plumb.tsx']);\n  assert.deepEqual(config.serverExternalPackages, ['lightningcss', '@unlocalhosted/react-plumber']);\n  assert.deepEqual(withPlumb(config), config);\n} else assert.equal(config, original);\nexport default config;\n`);
  const dev = await nextProcess(t, root, ['dev', '--webpack', '--hostname', '127.0.0.1', '--port', '0']);
  let url;
  for (let i = 0; i < 600; i++) {
    assert.equal(dev.child.exitCode, null, dev.output());
    const match = /http:\/\/127\.0\.0\.1:(\d+)/.exec(dev.output());
    if (match && /Ready in/.test(dev.output())) { url = match[0]; break; }
    await delay(50);
  }
  assert.ok(url, dev.output());
  const page = await fetch(url, { signal: AbortSignal.timeout(45000) }); assert.equal(page.status, 200, dev.output());
  const html = await page.text(); assert.ok(html.includes('Host page'));
  assert.match(html, /src="\/__plumb\/client.js"/);
  const token = /data-plumb-token="([a-f0-9]{64})"/.exec(html)?.[1]; assert.ok(token);
  assert.equal((await fetch(url + '/__plumb/health')).status, 401);
  assert.equal((await ready(url, { 'x-plumb-token': token })).root, root);
  assert.equal((await connectClient(url + '/__plumb/client.js', token)).root, root);
  const headers = { 'x-plumb-token': token, Origin: url, 'Content-Type': 'application/json' };
  const edits = await (await fetch(url + '/__plumb/edits?file=src/App.tsx&line=1', { headers })).json();
  assert.ok(edits.edits.length);
  const applied = await fetch(url + '/__plumb/apply', { method: 'POST', headers, body: JSON.stringify(selection(edits)) });
  assert.equal(applied.status, 200); assert.ok((await applied.json()).revision > edits.revision);
  dev.child.kill('SIGTERM'); await dev.done;
  for (const exporting of [false, true]) {
    await rm(join(root, '.next'), { recursive: true, force: true });
    if (exporting) {
      // Set output on the consumer config, leaving the installed adapter unchanged.
      await writeFile(join(root, 'next.config.mjs'), (await readFile(join(root, 'next.config.mjs'), 'utf8')).replace('(process.env.PLUMBER_EXPORT ?? process.env.PLUMB_EXPORT)', 'true'));
    }
    const build = await nextProcess(t, root, ['build', '--webpack']);
    const [status] = await build.done; assert.equal(status, 0, build.output());
    const manifest = JSON.parse(await readFile(join(root, '.next/server/app-paths-manifest.json'), 'utf8'));
    assert.ok(Object.keys(manifest).every(path => !path.includes('plumb')), 'overlay route must never be discovered');
    for (const dir of ['.next/server', '.next/static', ...(exporting ? ['out'] : [])]) {
      for (const [file, content] of await snapshot(join(root, dir))) {
        assert.ok(!content.includes('data-plumb-token') && !content.includes('/__plumb/'), file);
        assert.ok(!/react-plumber[/\\](?:dist[/\\])?session|react-plumber[/\\]dist[/\\]hosts[/\\]next-dev|Analysis worker exited|Owns one warm analysis worker/.test(content), file);
        if (file.endsWith('.nft.json')) assert.ok(!JSON.parse(content).files.some(path => /@unlocalhosted[/\\]react-plumber/.test(path)), `React Plumber deployment trace: ${file}`);
      }
    }
  }
});

test('overlay review 7: Vite restarts reuse root/options Sessions and final close disposes them', async t => {
  const { Session } = await import('../dist/session/index.js');
  const original = Session.create, created = [];
  Session.create = async options => { const session = await original.call(Session, options); created.push(session); return session; };
  t.after(() => { Session.create = original; });
  for (const middlewareMode of [false, true]) {
    const root = await project(t);
    const server = await createServer({ root, cacheDir: join(root, '.vite-cache'), configFile: false, plugins: [plumb({ watch: false })], logLevel: 'silent', server: { middlewareMode, host: '127.0.0.1', port: 0 } });
    t.after(() => server.close()); if (!middlewareMode) await server.listen();
    await globalThis[Symbol.for('@unlocalhosted/plumb/vite/sessions')].values().next().value.session;
    const session = created.at(-1), count = created.length, worker = session.worker;
    const edits = await session.edits('src/App.tsx', 1); await session.apply(selection(edits));
    const revision = (await session.health()).revision;
    for (let i = 0; i < 2; i++) {
      await server.restart();
      assert.equal(created.length, count); assert.equal(session.worker, worker);
      assert.equal((await session.health()).revision, revision);
      if (!middlewareMode) {
        const url = `http://127.0.0.1:${server.httpServer.address().port}`;
        assert.equal((await (await fetch(url + '/__plumb/health')).json()).revision, revision);
      }
    }
    // Separate plugin instances share process ownership; options have separate entries.
    const shared = await createServer({ root, cacheDir: join(root, '.vite-cache'), configFile: false, plugins: [plumb({ root: '.', watch: false })], logLevel: 'silent', server: { middlewareMode: true } });
    const different = await createServer({ root, cacheDir: join(root, '.vite-cache'), configFile: false, plugins: [plumb({ watch: false, verbose: true })], logLevel: 'silent', server: { middlewareMode: true } });
    t.after(() => shared.close()); t.after(() => different.close());
    await Promise.all([...globalThis[Symbol.for('@unlocalhosted/plumb/vite/sessions')].values()].map(entry => entry.session));
    assert.equal(created.length, count + 1);
    const other = created.at(-1);
    await different.close(); await assert.rejects(other.health(), /closed/);
    await server.close(); assert.equal((await session.health()).revision, revision);
    await shared.close(); await assert.rejects(session.health(), /closed/);
  }
  const registry = globalThis[Symbol.for('@unlocalhosted/plumb/vite/sessions')];
  assert.equal(registry.size, 0, 'final shutdown leaves no process Session entries');
});

// Hold config loading until the host has proved it can serve requests.
async function holdStartup(root, fail = false) {
  const config = await readFile(join(root, 'plumber.config.ts'), 'utf8');
  await writeFile(join(root, 'plumber.config.ts'), `import { access } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
const gate = new URL('./startup.release', import.meta.url);
while (true) { try { await access(gate); break; } catch { await delay(20); } }
${fail ? 'throw new Error("startup fixture failed");' : config}
`);
}

test('Vite listens during startup, shares pending ownership across restarts and serves startup failures', { timeout: 30000 }, async t => {
  for (const fail of [false, true]) {
    const root = await project(t); await holdStartup(root, fail);
    await writeFile(join(root, 'index.html'), '<html><body>Host starts immediately</body></html>');
    const server = await createServer({ root, cacheDir: join(root, '.vite-cache'), configFile: false, plugins: [plumb({ watch: false })], logLevel: 'silent', server: { host: '127.0.0.1', port: 0 } });
    t.after(() => server.close()); await server.listen();
    let url = `http://127.0.0.1:${server.httpServer.address().port}`;
    assert.match(await (await fetch(url, { signal: AbortSignal.timeout(2000) })).text(), /Host starts immediately/);
    for (const path of ['site', 'report', 'decisions', 'why', 'resolve', 'edits', 'try', 'apply', 'unknown']) {
      const write = ['try', 'apply'].includes(path);
      const response = await fetch(url + '/__plumb/' + path, { method: write ? 'POST' : 'GET', headers: { Origin: url }, body: write ? '{}' : undefined });
      assert.equal(response.status, 503, path); assert.equal(response.headers.get('Retry-After'), '1');
      assert.deepEqual(await response.json(), { status: 'starting' });
    }
    assert.deepEqual(await (await fetch(url + '/__plumb/health')).json(), { status: 'starting' });
    assert.equal((await fetch(url + '/__plumb/client.js')).status, 200);
    assert.equal((await fetch(url + '/__plumb/src/api.js')).status, 200);
    assert.equal((await fetch(url + '/__plumb/site', { headers: { Origin: 'https://foreign.example' } })).status, 403);
    const registry = globalThis[Symbol.for('@unlocalhosted/plumb/vite/sessions')], pending = [...registry.values()][0].session;
    await server.restart(); url = `http://127.0.0.1:${server.httpServer.address().port}`;
    assert.equal([...registry.values()][0].session, pending);
    assert.deepEqual(await (await fetch(url + '/__plumb/health')).json(), { status: 'starting' });
    await writeFile(join(root, 'startup.release'), '');
    if (fail) {
      await assert.rejects(pending, /startup fixture failed/);
      const response = await fetch(url + '/__plumb/site'); assert.equal(response.status, 503);
      const state = await response.json(); assert.equal(state.status, 'failed'); assert.match(state.diagnostic, /startup fixture failed/);
      assert.deepEqual(await (await fetch(url + '/__plumb/health')).json(), state);
      assert.equal((await fetch(url)).status, 200);
      await writeFile(join(root, 'plumber.config.ts'), await readFile(join(repo, 'fixtures/spacing/plumber.config.ts'), 'utf8'));
      await server.restart(); url = `http://127.0.0.1:${server.httpServer.address().port}`;
      await ready(url);
      assert.equal((await fetch(url + '/__plumb/site?file=src/App.tsx&line=1')).status, 200);
    } else {
      await ready(url);
      assert.equal((await fetch(url + '/__plumb/site?file=src/App.tsx&line=1')).status, 200);
    }
    await server.close(); assert.equal(registry.size, 0);
  }
});

test('Next responds during startup and retains ready or failed Session across hot reloads', { timeout: 30000 }, async t => {
  for (const fail of [false, true]) {
    const root = await project(t); await holdStartup(root, fail);
    const script = join(root, 'startup-next.mjs'), adapter = pathToFileURL(join(repo, 'dist/hosts/next.js')).href;
    await writeFile(script, `
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { createPlumbRoute, PlumbOverlay } from ${JSON.stringify(adapter)};
const root = process.argv[2], headers = { 'x-plumb-token': PlumbOverlay().props['data-plumb-token'] };
const route = createPlumbRoute({root, watch:false});
const send = path => route.GET(new Request('http://localhost:3000/__plumb/' + path, {headers}));
assert.equal((await send('client.js')).status,200);
const starting = await send('site'); assert.equal(starting.status,503); assert.equal(starting.headers.get('Retry-After'),'1');
assert.deepEqual(await starting.json(), {status:'starting'});
assert.deepEqual(await (await send('health')).json(), {status:'starting'});
assert.equal((await route.GET(new Request('http://localhost:3000/__plumb/site'))).status,401);
const key = Symbol.for('@unlocalhosted/plumb/next'), pending = globalThis[key].handler;
const reloaded = await import(${JSON.stringify(adapter + '?startup-reload')});
const again = reloaded.createPlumbRoute({root:root+'/ignored'});
assert.deepEqual(await (await again.GET(new Request('http://localhost:3000/__plumb/health',{headers}))).json(), {status:'starting'});
assert.equal(globalThis[key].handler,pending);
await writeFile(root+'/startup.release','');
let state;
for(let i=0;i<1000;i++) {state=await (await send('health')).json();if(state.status!=='starting')break;await delay(20);}
assert.equal(state.status, ${JSON.stringify(fail ? 'failed' : 'ready')});
${fail ? "assert.match(state.diagnostic, /startup fixture failed/); assert.equal((await send('site')).status,503);" : "assert.equal((await send('site?file=src/App.tsx&line=1')).status,200);"}
process.exit(0);
`);
    // Keep the child isolated: Next owns its Session for the process lifetime.
    const result = spawnSync(process.execPath, [script, root], { encoding: 'utf8', timeout: 30000 });
    assert.ifError(result.error); assert.equal(result.status, 0, result.stderr);
  }
});
