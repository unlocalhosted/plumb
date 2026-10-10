import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { cp, mkdtemp, mkdir, readFile, rm, writeFile, rename, stat, symlink, utimes } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { once } from 'node:events';
import { test as nodeTest } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { Session } from '../dist/session/index.js';

const repo = fileURLToPath(new URL('../', import.meta.url)), cli = join(repo, 'dist/cli.js');
const forcedPolling = process.env.PLUMB_POLLING === '1';
const noWatch = process.env.PLUMB_WATCH === '0';
const test = (name, ...args) => nodeTest(`${name} [${noWatch ? 'no-watch' : forcedPolling ? 'polling' : 'native'}]`, ...args);
const createSession = Session.create.bind(Session);
Session.create = async options => {
  const session = await createSession(options);
  if (noWatch) { assert.equal(session.watchers.length, 0); assert.equal(session.timer, undefined); }
  return session;
};
function semantic(report) {
  const value = structuredClone(report); delete value.timing;
  for (const key of ['cacheHits', 'cacheMisses', 'parseMs', 'totalMs']) delete value.moduleGraph[key];
  return value;
}
async function project(t, fixture = 'spacing') {
  const root = await mkdtemp(join(repo, 'fixtures/.serve-')); await cp(join(repo, 'fixtures', fixture), root, { recursive: true, filter: path => !path.split('/').includes('.plumb-cache') });
  t.after(() => rm(root, { recursive: true, force: true })); return root;
}
function run(root, args = [], input) {
  const result = spawnSync(process.execPath, [cli, ...args, '--root', root], { input, encoding: 'utf8', timeout: 30000, maxBuffer: 32 * 1024 * 1024 });
  assert.ifError(result.error); assert.ok([0, 1].includes(result.status), result.stderr); return result;
}
const cold = root => JSON.parse(run(root, ['check', '--json']).stdout);
async function daemon(t, root) {
  const child = spawn(process.execPath, [cli, 'serve', '--port', '0', '--root', root], { stdio: ['ignore', 'pipe', 'pipe'] });
  let errors = ''; child.stderr.on('data', chunk => errors += chunk); child.stdout.resume();
  t.after(async () => { if (child.exitCode === null && child.signalCode === null) { child.kill('SIGTERM'); await once(child, 'exit'); } assert.equal(errors, ''); });
  let info;
  for (let i = 0; i < 300; i++) {
    try { info = JSON.parse(await readFile(join(root, '.plumb/serve.json'), 'utf8')); break; } catch {}
    assert.equal(child.exitCode, null, errors); await delay(20);
  }
  assert.ok(info, errors || 'daemon did not start');
  const request = async (path, init = {}) => {
    const response = await fetch(`http://127.0.0.1:${info.port}${path}`, { ...init, headers: { 'x-plumb-token': info.token, ...init.headers } });
    const body = await response.json(); assert.equal(response.status, 200, JSON.stringify(body)); return body;
  };
  return { child, info, request };
}

test('native watching cannot silently degrade to polling on macOS/Linux', { skip: noWatch || forcedPolling || !['darwin', 'linux'].includes(process.platform) }, async t => {
  const { watch } = await import('node:fs');
  const root = await project(t);
  // Probe the OS independently: a constrained runner must report native support
  // unavailable explicitly, rather than count polling parity as native coverage.
  let watcher, observed;
  try {
    const event = new Promise((resolveEvent, reject) => {
      watcher = watch(root, { recursive: true }, () => resolveEvent());
      watcher.once('error', reject);
    });
    observed = Promise.race([event, delay(1500).then(() => { throw new Error('native fs.watch delivered no creation event'); })]);
    await writeFile(join(root, 'src/NativeProbe.tsx'), '<div className="gap-[137px]" />;');
    await observed;
  } catch (error) {
    if (['EPERM', 'EACCES', 'EMFILE', 'ENOSYS', 'ERR_FEATURE_UNAVAILABLE_ON_PLATFORM'].includes(error.code)) {
      t.skip(`OS native recursive fs.watch unavailable: ${error.code}`); return;
    }
    throw error;
  } finally { watcher?.close(); }
  const session = await Session.create({ root, pollInterval: 60000 }); t.after(() => session.close());
  assert.equal(session.native, true, 'supported OS must use native watching');
  await writeFile(join(root, 'src/NativeAfterStart.tsx'), '<div className="gap-[139px]" />;');
  assert.deepEqual(semantic(await session.report()), semantic(cold(root)));
  assert.equal(session.native, true, 'native parity must not pass through polling fallback');
});

test('PLUMB_POLLING forces session and daemon polling', { skip: !forcedPolling }, async t => {
  const root = await project(t), session = await Session.create({ root, pollInterval: 60000 }); t.after(() => session.close());
  assert.equal(session.native, false);
  await writeFile(join(root, 'src/PollingProbe.tsx'), '<div className="gap-[137px]" />;');
  assert.deepEqual(semantic(await session.report()), semantic(cold(root)));
  const { request } = await daemon(t, root);
  await writeFile(join(root, 'src/DaemonPollingProbe.tsx'), '<div className="gap-[139px]" />;');
  assert.deepEqual(semantic(await request('/report')), semantic(cold(root)));
});

test('watch-disabled reads preserve cold parity without callbacks or polling', async t => {
  const root = await project(t, 'attribution');
  await mkdir(join(root, 'src/empty/nested'), { recursive: true });
  cold(root); // Create the cold CLI's cache directory before measuring listings.
  const session = await Session.create({ root, watch: false }); t.after(() => session.close());
  assert.equal(session.watchers.length, 0); assert.equal(session.timer, undefined);
  session.inventory = () => { throw new Error('reads must not glob inventory'); };
  const { default: filesystem } = await import('node:fs/promises');
  const { syncBuiltinESMExports } = await import('node:module');
  const original = filesystem.readdir, listings = [];
  filesystem.readdir = (path, ...args) => { listings.push(String(path)); return original(path, ...args); };
  syncBuiltinESMExports();
  t.after(() => { filesystem.readdir = original; syncBuiltinESMExports(); });
  const parity = async () => assert.deepEqual(semantic(await session.report()), semantic(cold(root)));
  await session.decisions(); await session.health(); await parity();
  assert.deepEqual(listings, [], 'settled reads never re-list unchanged directories');
  await writeFile(join(root, 'src/SessionProbe.tsx'), '<div className="gap-[137px]" style={{ gap: 137 }} />;');
  await parity();
  assert.deepEqual(listings.splice(0), [join(root, 'src')], 'creation only re-lists its changed parent');
  await writeFile(join(root, 'src/SessionProbe.tsx'), '<div className="gap-[139px]" style={{ gap: 139 }} />;');
  await parity();
  const file = join(root, 'src/SessionProbe.tsx'), before = await stat(file);
  await writeFile(file, '<div className="gap-[141px]" style={{ gap: 141 }} />;');
  await utimes(file, before.atime, before.mtime);
  assert.ok((await session.site('src/SessionProbe.tsx', 1)).declarations.some(d => d.value === '141px'), 'same-size write with restored mtime is detected');
  await parity();
  assert.deepEqual(listings, [], 'content edits stat files without listing directories');
  await writeFile(join(root, 'src/empty/nested/New.tsx'), '<div className="gap-[143px]" />;'); await parity();
  assert.deepEqual(listings.splice(0), [join(root, 'src/empty/nested')], 'pre-existing empty directories remain discoverable');
  await rm(join(root, 'src/empty'), { recursive: true }); await parity();
  await mkdir(join(root, 'src/empty/nested'), { recursive: true });
  await writeFile(join(root, 'src/empty/nested/Recreated.tsx'), '<div className="gap-[145px]" />;'); await parity();
  await mkdir(join(root, 'src/.hidden'));
  await writeFile(join(root, 'src/.hidden/Probe.tsx'), '<div style={{ gap: 147 }} />;'); await parity();
  await writeFile(join(root, 'src/.hidden/Probe.tsx'), '<div style={{ gap: 149 }} />;'); await parity();
  const external = await mkdtemp(join(repo, 'fixtures/.serve-tokens-'));
  t.after(() => rm(external, { recursive: true, force: true }));
  await writeFile(join(root, 'plumb.config.ts'), `export default { decisions: { spacing: { from: ${JSON.stringify(`dtcg:${external}/missing/**/{tokens,moved}.json`)} } } };`);
  await parity();
  const tokens = join(external, 'missing/deep/tokens.json');
  await mkdir(join(external, 'missing/deep'), { recursive: true });
  await writeFile(tokens, JSON.stringify({ step: { $type: 'dimension', $value: { value: 13, unit: 'px' } } })); await parity();
  await rename(tokens, join(external, 'missing/deep/moved.json')); await parity();
  await rm(join(external, 'missing'), { recursive: true }); await parity();
  const preset = join(external, 'preset.mjs');
  await writeFile(preset, 'export default { name: "external", decisions: { spacing: { from: "dtcg:preset-tokens/**/*.json" } } };');
  await writeFile(join(root, 'plumb.config.ts'), `export default { presets: [${JSON.stringify(preset)}] };`); await parity();
  await mkdir(join(external, 'preset-tokens/deep'), { recursive: true });
  const presetTokens = join(external, 'preset-tokens/deep/tokens.json');
  await writeFile(presetTokens, '{}'); await parity();
  await writeFile(presetTokens, JSON.stringify({ step: { $type: 'dimension', $value: { value: 17, unit: 'px' } } })); await parity();
  await writeFile(preset, 'export default { name: "renamed", decisions: { spacing: { from: "dtcg:preset-tokens/**/*.json" } } };');
  await parity(); assert.equal((await session.report()).presets[0].name, 'renamed');
});

test('serve incrementally matches cold CLI through TSX, CSS, theme, config and ledger edits', async t => {
  const root = await project(t), { request } = await daemon(t, root);
  const parity = async () => assert.deepEqual(semantic(await request('/report')), semantic(cold(root)));
  await parity();
  const app = join(root, 'src/App.tsx');
  await writeFile(app, 'export function App() { return <div className="gap-13 bg-red-500" style={{ padding: 10 }} />; }');
  const editedSite = await request('/site?file=src/App.tsx&line=1');
  assert.ok(editedSite.declarations.some(d => d.prop === 'gap' && d.resolved === '13px'));
  assert.ok(editedSite.findings.some(f => f.rule === 'provenance/spacing')); await parity();
  await writeFile(join(root, 'src/extra.css'), '.new { gap: 17px; color: #abcdef; }'); await parity();
  const theme = join(root, 'src/styles.css');
  await writeFile(theme, (await readFile(theme, 'utf8')) + '\n@theme { --spacing-s13: 13px; --color-new: #abcdef; }\n'); await parity();
  await writeFile(join(root, 'plumb.config.ts'), "export default { css: 'src/styles.css', decisions: { spacing: { identity: 'reference' } }, habits: ['logical-inline'] };\n"); await parity();
  run(root, ['baseline']); await parity();
  const report = await request('/report');
  assert.ok(report.ledger.debt > 0);
  const site = await request('/site?file=src/App.tsx&line=1'); assert.ok(site.findings.length > 0); assert.ok(site.declarations.some(d => d.prop === 'gap'));
  const why = await request('/why?file=src/App.tsx&line=1'); assert.ok(why.ledger.length > 0);
  assert.deepEqual(await request('/decisions'), report.decisions);
  await writeFile(app, 'export function App() { return <div className="gap-19" />; }'); await parity();
  await rename(app, join(root, 'src/Moved.tsx')); await parity();
  await rm(join(root, 'src/Moved.tsx')); await parity();
});

test('site queries retain stylesheet imitation context and refresh full reports after successive local reads', async t => {
  const root = await project(t, 'imitation'), session = await Session.create({ root }); t.after(() => session.close());
  const files = (await session.report()).declarations.map(d => d.site.file).filter(f => f.endsWith('.tsx'));
  const file = files[0], original = await readFile(file, 'utf8');
  for (const amount of [137, 138, 139]) {
    const code = original + `\nexport const QueryProbe = () => <div className="gap-[${amount}px]" />;\n`;
    await writeFile(file, code);
    const result = await session.site(file, original.split('\n').length + 1);
    assert.ok(result.findings.some(f => f.declaration.value === `${amount}px`));
  }
  assert.deepEqual(semantic(await session.report()), semantic(cold(root)));
});

test('Session polling fallback reparses only dependent TSX files and recovers from invalid source', async t => {
  const root = await project(t);
  await writeFile(join(root, 'src/A.tsx'), 'export const sizes = { a: "gap-13" };');
  await writeFile(join(root, 'src/B.tsx'), 'import { sizes } from "./A"; export function B() { return <div className={sizes.a} /> }');
  await writeFile(join(root, 'src/C.tsx'), 'export function C() { return <div className="gap-8" /> }');
  const session = await Session.create({ root, polling: true, pollInterval: 25 }); t.after(() => session.close());
  assert.deepEqual(semantic(await session.report()), semantic(cold(root)));
  await writeFile(join(root, 'src/A.tsx'), 'export const sizes = { a: "gap-17" };');
  await session.refresh();
  assert.deepEqual(new Set(session.stats.files), new Set([join(root, 'src/A.tsx'), join(root, 'src/B.tsx')]));
  assert.deepEqual(semantic(await session.report()), semantic(cold(root)));
  assert.ok(session.stats.judged.includes(join(root, 'src/B.tsx')));
  assert.ok(!session.stats.judged.includes(join(root, 'src/C.tsx')));
  await writeFile(join(root, 'src/B.tsx'), 'export function B( {');
  const incomplete = await session.report();
  assert.equal(incomplete.findings.filter(f => f.rule === 'config/unreadable').length, 1);
  assert.deepEqual(semantic(incomplete), semantic(cold(root)));
  await writeFile(join(root, 'src/B.tsx'), 'export function B() { return <div className="gap-21" /> }');
  assert.deepEqual(semantic(await session.report()), semantic(cold(root)));
});

test('TSX custom-property edits rejudge their consumers and retain cold attribution counts', async t => {
  const root = await project(t), a = join(root, 'src/A.tsx'), b = join(root, 'src/B.tsx'), c = join(root, 'src/C.tsx');
  await writeFile(a, 'export const A = () => <div style={{ "--local-size": "13px" }} />;');
  await writeFile(b, 'export const B = () => <div className="gap-(--local-size)" />;');
  await writeFile(c, 'export const C = () => <div className="gap-[19px]" />;');
  const session = await Session.create({ root }); t.after(() => session.close());
  assert.deepEqual(semantic(await session.report()), semantic(cold(root)));
  await writeFile(a, 'export const A = () => <div style={{ "--local-size": "17px" }} />;');
  assert.deepEqual(semantic(await session.report()), semantic(cold(root)));
  assert.ok(session.stats.judged.includes(a)); assert.ok(session.stats.judged.includes(b)); assert.ok(!session.stats.judged.includes(c));
});

test('external DTCG sources are tracked even before they contain matching tokens', async t => {
  const root = await project(t), external = await mkdtemp(join(repo, 'fixtures/.serve-tokens-'));
  t.after(() => rm(external, { recursive: true, force: true }));
  const tokens = join(external, 'tokens.json'); await writeFile(tokens, '{}');
  await writeFile(join(root, 'plumb.config.ts'), `export default { css: 'src/styles.css', decisions: { spacing: { from: ${JSON.stringify(`dtcg:${tokens}`)} } } };`);
  const session = await Session.create({ root }); t.after(() => session.close());
  assert.deepEqual(semantic(await session.report()), semantic(cold(root)));
  await writeFile(tokens, JSON.stringify({ step: { $type: 'dimension', $value: { value: 13, unit: 'px' } } }));
  assert.deepEqual(semantic(await session.report()), semantic(cold(root)));
});

test('HTTP requires token, binds loopback, validates requests and cleans discovery file', async t => {
  const root = await project(t), { child, info, request } = await daemon(t, root);
  const url = `http://127.0.0.1:${info.port}`;
  for (const path of ['/report', '/site?file=src/App.tsx&line=1', '/decisions', '/why?file=src/App.tsx&line=1', '/health', '/try']) {
    assert.equal((await fetch(url + path)).status, 401);
    assert.equal((await fetch(url + path, { headers: { 'x-plumb-token': 'f'.repeat(64) } })).status, 401);
  }
  assert.equal((await stat(join(root, '.plumb/serve.json'))).mode & 0o777, 0o600);
  assert.equal((await request('/health')).status, 'ready');
  await delay(350);
  assert.equal((await request('/health')).revision, 0, 'writing discovery does not invalidate the project');
  assert.equal((await fetch(url + '/try', { headers: { 'x-plumb-token': info.token } })).status, 405);
  for (const path of ['/site?file=../secret&line=1', '/site?file=src/App.tsx&line=0', '/site?file=src/App.tsx&line=1&column=no']) {
    assert.equal((await fetch(url + path, { headers: { 'x-plumb-token': info.token } })).status, 400);
  }
  assert.equal((await fetch(url + '/try', { method: 'POST', headers: { 'x-plumb-token': info.token }, body: 'bad' })).status, 400);
  child.kill('SIGTERM'); await once(child, 'exit');
  await assert.rejects(readFile(join(root, '.plumb/serve.json')), { code: 'ENOENT' });
});

test('warm try and CLI client match cold snippet checks and do not change project files', async t => {
  const root = await project(t);
  const snippets = [
    { code: '<div className="gap-13 bg-red-500" />', lang: 'tsx', as: 'src/App.tsx' },
    { code: '<div style={{ gap: 17, color: "#123456" }} />', lang: 'tsx', as: 'src/new.tsx' },
    { code: '.sample { gap: 19px; color: #abcdef; }', lang: 'css', as: 'src/new.css' },
  ];
  const expected = snippets.map(s => semantic(JSON.parse(run(root, ['try', '--json', '--lang', s.lang, '--as', s.as], s.code).stdout)));
  const clientOnly = '<div className="gap-[988px]" />';
  const clientExpected = semantic(JSON.parse(run(root, ['try', '--json', '--lang', 'tsx', '--as', 'src/App.tsx'], clientOnly).stdout));
  const original = await readFile(join(root, 'src/App.tsx'), 'utf8');
  const { request } = await daemon(t, root);
  for (let i = 0; i < snippets.length; i++) {
    const body = await request('/try', { method: 'POST', body: JSON.stringify(snippets[i]) });
    assert.deepEqual(semantic(body), expected[i]);
    assert.deepEqual(semantic(JSON.parse(run(root, ['try', '--json', '--lang', snippets[i].lang, '--as', snippets[i].as], snippets[i].code).stdout)), expected[i]);
  }
  const before = (await request('/health')).caches.candidates;
  assert.deepEqual(semantic(JSON.parse(run(root, ['try', '--json', '--lang', 'tsx', '--as', 'src/App.tsx'], clientOnly).stdout)), clientExpected);
  assert.ok((await request('/health')).caches.candidates > before, 'CLI try compiled its new candidate inside the daemon');
  assert.equal(await readFile(join(root, 'src/App.tsx'), 'utf8'), original);
  await assert.rejects(readFile(join(root, 'src/new.tsx')), { code: 'ENOENT' });
  assert.deepEqual(semantic(await request('/report')), semantic(cold(root)));
});

test('try overlays refresh imported class maps without changing base state and can repair invalid targets', async t => {
  const root = await project(t), file = join(root, 'src/A.tsx');
  const original = 'export const sizes = { a: "gap-[113px]" }; export const A = () => <div className={sizes.a} />;';
  await writeFile(file, original);
  await writeFile(join(root, 'src/B.tsx'), 'import { sizes } from "./A"; export const B = () => <div className={sizes.a} />;');
  const snippet = { code: 'export const sizes = { a: "gap-[117px]" }; export const A = () => <div className={sizes.a} />;', lang: 'tsx', as: 'src/A.tsx' };
  const expected = semantic(JSON.parse(run(root, ['try', '--json', '--as', snippet.as], snippet.code).stdout));
  assert.ok(expected.declarations.some(d => d.value === '117px'));
  const base = semantic(cold(root)), { request } = await daemon(t, root);
  const check = async () => assert.deepEqual(semantic(await request('/try', { method: 'POST', body: JSON.stringify(snippet) })), expected);
  await check();
  assert.deepEqual(semantic(await request('/report')), base);
  assert.equal(await readFile(file, 'utf8'), original);
  await writeFile(file, 'export const sizes = {');
  await check();
  assert.equal(await readFile(file, 'utf8'), 'export const sizes = {');
  await writeFile(file, original);
  assert.deepEqual(semantic(await request('/report')), base);
});

test('stdio JSON-RPC serves all methods, preserves ids and reports protocol errors', async t => {
  const root = await project(t);
  const input = [
    { jsonrpc: '2.0', id: 1, method: 'health' }, { jsonrpc: '2.0', id: 'r', method: 'plumb.report' },
    { jsonrpc: '2.0', id: 3, method: 'site', params: { file: 'src/App.tsx', line: 1 } },
    { jsonrpc: '2.0', id: 4, method: 'decisions' }, { jsonrpc: '2.0', id: 5, method: 'why', params: { file: 'src/App.tsx', line: 1 } },
    { jsonrpc: '2.0', id: 6, method: 'try', params: { code: '<div className="gap-13" />', lang: 'tsx' } },
    { jsonrpc: '2.0', method: 'health' }, { jsonrpc: '2.0', id: 7, method: 'unknown' }, {}, 'bad',
  ].map(v => typeof v === 'string' ? v : JSON.stringify(v)).join('\n') + '\n';
  const result = run(root, ['serve', '--stdio'], input);
  const replies = result.stdout.trim().split('\n').map(line => JSON.parse(line));
  assert.equal(replies.length, 9); assert.equal(replies[0].result.status, 'ready'); assert.equal(replies[1].id, 'r');
  assert.deepEqual(semantic(replies[1].result), semantic(cold(root)));
  assert.ok(replies[5].result.findings.length > 0);
  assert.deepEqual(replies.slice(-3).map(r => r.error.code), [-32601, -32600, -32700]);
  await assert.rejects(readFile(join(root, '.plumb/serve.json')), { code: 'ENOENT' });
});

test('stale client discovery falls back in process', async t => {
  const root = await project(t);
  const code = '<div className="gap-13" />';
  const expected = semantic(JSON.parse(run(root, ['try', '--json'], code).stdout));
  await mkdir(join(root, '.plumb'), { recursive: true });
  await writeFile(join(root, '.plumb/serve.json'), JSON.stringify({ root, config: null, port: 1, pid: 99999999, token: 'a'.repeat(64), protocol: 1 }));
  assert.deepEqual(semantic(JSON.parse(run(root, ['try', '--json'], code).stdout)), expected);
});

for (const remote of [false, true]) test(`check --watch ${remote ? 'daemon client' : 'local fallback'} emits updated reports`, async t => {
  const root = await project(t);
  if (remote) await daemon(t, root);
  const child = spawn(process.execPath, [cli, 'check', '--watch', '--json', '--root', root], { stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '', errors = ''; child.stdout.on('data', chunk => output += chunk); child.stderr.on('data', chunk => errors += chunk);
  t.after(async () => { if (child.exitCode === null && child.signalCode === null) { child.kill('SIGTERM'); await once(child, 'exit'); } });
  for (let i = 0; i < 300 && !output.includes('"schemaVersion"'); i++) await delay(20);
  assert.ok(output.includes('"schemaVersion"'), errors);
  const firstLength = output.length;
  await writeFile(join(root, 'src/App.tsx'), '<div className="gap-[123px]" />;');
  for (let i = 0; i < 300 && !output.slice(firstLength).includes('gap-[123px]'); i++) await delay(20);
  assert.ok(output.slice(firstLength).includes('gap-[123px]'), errors);
  assert.equal(errors, '');
  await writeFile(join(root, 'src/App.tsx'), 'export function App( {');
  for (let i = 0; i < 300 && !output.slice(firstLength).includes('config/unreadable'); i++) await delay(20);
  assert.ok(output.slice(firstLength).includes('config/unreadable')); assert.equal(errors, ''); assert.equal(child.exitCode, null);
  const recovery = output.length;
  await writeFile(join(root, 'src/App.tsx'), '<div className="gap-[124px]" />;');
  for (let i = 0; i < 300 && !output.slice(recovery).includes('gap-[124px]'); i++) await delay(20);
  assert.ok(output.slice(recovery).includes('gap-[124px]'), errors);
});

for (const fixture of ['attribution', 'ownership', 'imitation', 'habits']) test(`session preserves full cold ${fixture} rule semantics`, async t => {
  const root = await project(t, fixture), { request } = await daemon(t, root);
  assert.deepEqual(semantic(await request('/report')), semantic(cold(root)));
  // New class changes the same source pipeline while leaving shared definitions.
  await writeFile(join(root, 'src/SessionProbe.tsx'), 'export const SessionProbe = () => <div className="gap-[137px]" />;');
  assert.deepEqual(semantic(await request('/report')), semantic(cold(root)));
  await writeFile(join(root, 'src/SessionProbe.tsx'), 'export const SessionProbe = () => <div className="gap-[139px]" />;');
  assert.deepEqual(semantic(await request('/report')), semantic(cold(root)));
});

test('incremental messages and by-value groups match cold checks across files and verbose requests', async t => {
  const root = await project(t, 'messages');
  await writeFile(join(root, 'src/A.tsx'), 'export const A = () => <div style={{ color: "#123456", gap: 10, padding: 10, opacity: dynamic }} />;');
  await writeFile(join(root, 'src/B.tsx'), 'export const B = () => <div style={{ backgroundColor: "#123456", gap: 10, padding: dynamic }} />;');
  const session = await Session.create({ root }); t.after(() => session.close());
  const parity = async () => {
    const actual = await session.report();
    assert.deepEqual(semantic(actual), semantic(cold(root)));
    assert.ok(actual.findings.some(f => f.key === 'by-value:color' && f.sites.length >= 2));
    assert.ok(actual.findings.every(f => f.title && f.because && f.accept));
    assert.deepEqual(semantic(await session.report({ verbose: true })), semantic(JSON.parse(run(root, ['check', '--json', '--verbose']).stdout)));
    assert.deepEqual(semantic(await session.report()), semantic(cold(root)));
  };
  await parity();
  await writeFile(join(root, 'src/A.tsx'), 'export const A = () => <div style={{ color: "#123456", gap: 11, padding: 11, opacity: dynamic }} />;');
  await parity();
});

test('daemon try preserves verbose JSON and agent messages without changing grouped project reports', async t => {
  const root = await project(t, 'messages');
  const code = '<div style={{ color: "#123456", backgroundColor: "#123456", gap: 10 }} />;';
  const expected = [[], ['--verbose'], ['--agent']].map(flags => run(root, ['try', ...flags, ...(flags.includes('--agent') ? [] : ['--json'])], code).stdout);
  const base = semantic(cold(root)), { request } = await daemon(t, root);
  for (const [i, flags] of [[], ['--verbose'], ['--agent']].entries()) {
    const actual = run(root, ['try', ...flags, ...(flags.includes('--agent') ? [] : ['--json'])], code).stdout;
    if (flags.includes('--agent')) assert.equal(actual, expected[i]);
    else assert.deepEqual(semantic(JSON.parse(actual)), semantic(JSON.parse(expected[i])));
  }
  assert.deepEqual(semantic(await request('/report?verbose=true')), semantic(JSON.parse(run(root, ['check', '--json', '--verbose']).stdout)));
  assert.deepEqual(semantic(await request('/report')), base);
});

test('Session retains autoloaded presets and their rules after source and preset edits', async t => {
  const root = await project(t, 'shadcn-preset'), session = await Session.create({ root }); t.after(() => session.close());
  const first = await session.report();
  assert.equal(first.presets[0].name, 'shadcn');
  assert.deepEqual(semantic(first), semantic(cold(root)));
  await writeFile(join(root, 'src/Probe.tsx'), 'export const Probe = () => <button className="rounded-[7px] gap-[13px]" />;');
  assert.deepEqual(semantic(await session.report()), semantic(cold(root)));
  await writeFile(join(root, 'plumb.config.mjs'), 'export default { presets: { shadcn: false } };');
  const disabled = await session.report();
  assert.deepEqual(disabled.presets, []);
  assert.deepEqual(semantic(disabled), semantic(cold(root)));
});

test('startup inventory and reconciled directory listings agree on symlinks, ignored directories and dotfiles', async t => {
  const root = await project(t), outside = await project(t);
  const session = await Session.create({ root, watch: false }); t.after(() => session.close());
  const source = '<div style={{ gap: 137 }} />;';
  await mkdir(join(root, 'src/.hidden'), { recursive: true });
  await writeFile(join(root, 'src/.hidden/Probe.tsx'), source);
  await writeFile(join(root, 'src/.Probe.tsx'), source);
  await writeFile(join(root, 'src/.metadata.json'), '{}');
  await writeFile(join(root, 'src/untracked.txt'), source);
  for (const directory of ['node_modules', '.git', 'dist', 'build', '.next', '.cache', '.plumb-cache']) {
    await mkdir(join(root, 'src', directory, 'nested'), { recursive: true });
    await writeFile(join(root, 'src', directory, 'nested/Invalid.tsx'), 'not valid TSX {');
  }
  await mkdir(join(root, '.plumb'), { recursive: true });
  await writeFile(join(root, '.plumb/serve.json'), '{}');
  const aliases = ['src/ThemeAlias.tsx', 'src/Outside.tsx', 'src/Linked', 'src/Dangling.tsx'];
  await symlink(join(root, 'src/styles.css'), join(root, aliases[0]));
  await symlink(join(outside, 'src/App.tsx'), join(root, aliases[1]));
  await symlink(join(outside, 'src'), join(root, aliases[2]));
  await symlink(join(outside, 'missing.tsx'), join(root, aliases[3]));
  // Native callbacks can enqueue a filename before its parent is re-listed.
  for (const alias of aliases) session.events.add(join(root, alias));
  const inventory = session.inventory.bind(session);
  // Inventory also retains optional input locations that do not exist yet.
  const expected = (await Promise.all((await inventory()).map(async file => {
    try { await stat(file); return file; }
    catch (error) { assert.equal(error.code, 'ENOENT'); return undefined; }
  }))).filter(Boolean);
  assert.ok(expected.includes(join(root, 'src/.Probe.tsx')));
  assert.ok(expected.includes(join(root, 'src/.hidden/Probe.tsx')));
  assert.ok(expected.includes(join(root, 'src/.metadata.json')));
  for (const alias of aliases) assert.ok(!expected.includes(join(root, alias)));
  session.inventory = () => { throw new Error('directory reconciliation must not re-glob'); };
  const report = await session.report();
  assert.ok(report.declarations.some(d => d.site.file === join(root, 'src/.hidden/Probe.tsx')));
  assert.ok(report.declarations.some(d => d.site.file === join(root, 'src/.Probe.tsx')));
  assert.deepEqual([...session.hashes.keys()].sort(), expected, 're-listing retains exactly startup inventory membership');
  assert.equal((await session.health()).status, 'ready');
});

test('overlay review 6: reads and background reconciliation avoid full inventories', async t => {
  const root = await project(t);
  const session = await Session.create({ root, pollInterval: 25 }); t.after(() => session.close());
  let watcherErrors = 0; session.on('diagnostic', () => watcherErrors++);
  let inventories = 0; const inventory = session.inventory.bind(session);
  session.inventory = async () => { inventories++; return inventory(); };
  const idleStart = inventories;
  await session.decisions(); assert.equal(inventories, idleStart, 'decisions never inventory source files');
  await delay(100);
  assert.ok(inventories - idleStart <= watcherErrors, 'only actual watcher errors permit recovery inventories');
  const before = (await session.health()).revision;
  await writeFile(join(root, 'src/Watched.tsx'), 'export const Watched = () => <div className="gap-[77px]" />;');
  for (let i = 0; i < 100 && (await session.health()).revision === before; i++) await delay(20);
  assert.ok((await session.health()).revision > before);
  assert.ok((await session.site('src/Watched.tsx', 1)).declarations.some(d => d.value === '77px'));
  const decisions = await session.decisions();
  const css = join(root, 'src/styles.css'); await writeFile(css, (await readFile(css, 'utf8')).replace('--spacing-s2: 8px', '--spacing-s2: 9px'));
  assert.notEqual((await session.decisions()).find(d => d.name === '--spacing-s2').value, decisions.find(d => d.name === '--spacing-s2').value, 'shared decision inputs reconciled immediately');
});

test('overlay review 6: native hints stay bounded and watcher failure requests recovery inventory', { skip: noWatch }, async t => {
  // Inject native watcher events at the OS boundary; all scans/worker analysis use real files.
  const { default: fs } = await import('node:fs');
  const { EventEmitter } = await import('node:events');
  const { syncBuiltinESMExports } = await import('node:module');
  const root = await project(t), original = fs.watch;
  let notify; const watcher = new EventEmitter(); watcher.close = () => {};
  fs.watch = (path, options, callback) => { assert.equal(path, root); notify = callback; return watcher; };
  syncBuiltinESMExports();
  let session;
  try { session = await Session.create({ root, polling: false, pollInterval: 20 }); }
  finally { fs.watch = original; syncBuiltinESMExports(); }
  t.after(() => session.close());
  let inventories = 0; const inventory = session.inventory.bind(session);
  session.inventory = async () => { inventories++; return inventory(); };
  assert.equal(session.native, true);
  await delay(90); await session.decisions(); assert.equal(inventories, 0);
  const file = join(root, 'src/App.tsx');
  await writeFile(file, 'export const App = () => <div className="gap-[79px]" />;');
  notify('change', 'src/App.tsx');
  for (let i = 0; i < 100 && !(await session.health()).revision; i++) await delay(20);
  assert.ok((await session.site('src/App.tsx', 1)).declarations.some(d => d.value === '79px'));
  assert.equal(inventories, 0, 'queued known file is reconciled without source inventory');
  watcher.emit('error', new Error('watcher lost'));
  await writeFile(file, 'export const App = () => <div className="gap-[81px]" />;');
  for (let i = 0; i < 100 && !inventories; i++) await delay(20);
  assert.ok(inventories > 0); assert.equal(session.native, false);
  assert.ok((await session.site('src/App.tsx', 1)).declarations.some(d => d.value === '81px'));
});

test('reads reconcile directory changes, renames, deletions and external inputs with late or absent events', async t => {
  const { default: fs } = await import('node:fs');
  const { EventEmitter } = await import('node:events');
  const { syncBuiltinESMExports } = await import('node:module');
  const root = await project(t), original = fs.watch;
  let notify = () => {}; const watcher = new EventEmitter(); watcher.close = () => {};
  fs.watch = (_path, _options, callback) => { notify = callback; return watcher; };
  syncBuiltinESMExports();
  let session;
  try { session = await Session.create({ root, polling: false, pollInterval: 60000, ...(noWatch ? { watch: false } : {}) }); }
  finally { fs.watch = original; syncBuiltinESMExports(); }
  t.after(() => session.close());
  let inventories = 0; const inventory = session.inventory.bind(session);
  session.inventory = async () => { inventories++; return inventory(); };
  const parity = async () => assert.deepEqual(semantic(await session.report()), semantic(cold(root)));
  await parity(); assert.equal(inventories, 0);
  const directory = join(root, 'src/new'), file = join(directory, 'SessionProbe.tsx');
  await mkdir(directory);
  await writeFile(file, 'export const SessionProbe = () => <div className="gap-[137px]" />;');
  // The read starts before the OS callback; only its parent directory is reported.
  setTimeout(() => notify('rename', 'src/new'), 0);
  await parity(); assert.equal(inventories, 0, 'directory creation uses retained stats, never inventory');
  const moved = join(root, 'src/Moved.tsx');
  await rename(file, moved); notify('rename', 'src/new'); await parity();
  await rm(moved); notify('change', 'src'); await parity();
  await writeFile(join(root, 'src/Late.tsx'), '<div className="gap-[141px]" />;');
  // The creation callback can arrive only after the worker answers the read.
  session.worker.once('message', () => notify('rename', 'src/Late.tsx'));
  await parity();
  await writeFile(join(root, 'src/Unknown.tsx'), '<div className="gap-[139px]" />;');
  notify('change', 'src/Unknown.tsx'); await parity();
  await rm(join(root, 'plumb.config.ts'));
  await writeFile(join(root, 'plumb.config.mjs'), 'export default { habits: ["logical-inline"] };');
  notify('rename', null); await parity(); assert.equal(session.native, !noWatch);
  assert.equal((await session.report()).config.path, join(root, 'plumb.config.mjs'));
  // Autoload metadata is another newly matched shared input.
  await writeFile(join(root, 'components.json'), JSON.stringify({ aliases: { ui: 'src/components/ui' } }));
  notify('change', 'components.json'); await parity();
  assert.equal((await session.report()).presets[0].name, 'shadcn');
  // Token patterns outside the watched root start empty, gain empty files,
  // gain tokens, then lose/rename those matches, without a root inventory.
  const external = await mkdtemp(join(repo, 'fixtures/.serve-tokens-'));
  t.after(() => rm(external, { recursive: true, force: true }));
  await writeFile(join(root, 'plumb.config.mjs'), `export default { decisions: { spacing: { from: ${JSON.stringify(`dtcg:${external}/*.json`)} } } };`);
  notify('change', 'plumb.config.mjs'); await parity();
  const tokens = join(external, 'tokens.json');
  await writeFile(tokens, '{}'); await parity();
  await rm(tokens); await parity();
  await writeFile(tokens, JSON.stringify({ step: { $type: 'dimension', $value: { value: 13, unit: 'px' } } })); await parity();
  await rename(tokens, join(external, 'moved.json')); await parity();
  await rm(join(external, 'moved.json')); await parity();
  await mkdir(join(external, 'nested'));
  const nestedTokens = join(external, 'nested/tokens.json');
  await writeFile(nestedTokens, JSON.stringify({ step: { $type: 'dimension', $value: { value: 17, unit: 'px' } } })); await parity();
  await writeFile(join(root, 'plumb.config.mjs'), `export default { decisions: { spacing: { from: ${JSON.stringify(`dtcg:${external}/**/*.json`)} } } };`);
  await parity();
  await writeFile(nestedTokens, JSON.stringify({ step: { $type: 'dimension', $value: { value: 19, unit: 'px' } } })); await parity();
  const settled = inventories;
  await session.decisions(); await parity(); assert.equal(inventories, settled, 'settled reads stay bounded');
});
