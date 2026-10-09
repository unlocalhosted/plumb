import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { cp, mkdtemp, mkdir, readFile, rm, writeFile, rename, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { once } from 'node:events';
import { test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { Session } from '../dist/session/index.js';

const repo = fileURLToPath(new URL('../', import.meta.url)), cli = join(repo, 'dist/cli.js');
function semantic(report) {
  const value = structuredClone(report); delete value.timing;
  for (const key of ['cacheHits', 'cacheMisses', 'parseMs', 'totalMs']) delete value.moduleGraph[key];
  return value;
}
async function project(t, fixture = 'spacing') {
  const root = await mkdtemp(join(repo, 'fixtures/.serve-')); await cp(join(repo, 'fixtures', fixture), root, { recursive: true });
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
  await writeFile(join(root, 'src/B.tsx'), 'export function B( {'); await assert.rejects(session.report(), /source|component/);
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
  for (let i = 0; i < 300 && !errors; i++) await delay(20);
  assert.match(errors, /Fix source|Read component/); assert.equal(child.exitCode, null);
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
