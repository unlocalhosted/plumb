import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import { cp, link, mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { createServer, request as httpRequest } from 'node:http';
import { join } from 'node:path';
import { test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { createHandler, formatAgent, Session } from '../dist/index.js';
import { Session as EngineSession } from '../dist/session/engine.js';
import { UsageError } from '../dist/errors.js';

const repo = fileURLToPath(new URL('../', import.meta.url)), cli = join(repo, 'dist/cli.js');
const hash = text => createHash('sha256').update(text).digest('hex');
const stale = 'The file changed since the overlay read it. Read it again.';
const protectedPaths = ['.plumb/ledger.jsonl', 'plumb.config.ts', 'src/styles.css'];
async function project(t, code = 'export const App = () => <div className="py-[10px] gap-[13px]" />;\n') {
  const root = await mkdtemp(join(repo, 'fixtures/.edits-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'fixtures/spacing'), root, { recursive: true, filter: path => !path.split('/').includes('.plumb-cache') });
  await writeFile(join(root, 'src/App.tsx'), code);
  await mkdir(join(root, '.plumb'), { recursive: true });
  await writeFile(join(root, '.plumb/ledger.jsonl'), '');
  return root;
}
function run(root, args, input) {
  const result = spawnSync(process.execPath, [cli, ...args, '--root', root], { input, encoding: 'utf8', timeout: 30000, maxBuffer: 32 * 1024 * 1024 });
  assert.ifError(result.error); assert.ok([0, 1].includes(result.status), result.stderr); assert.equal(result.stderr, ''); return result.stdout;
}
const cold = root => JSON.parse(run(root, ['check', '--json']));
const snapshot = root => Promise.all(protectedPaths.map(path => readFile(join(root, path))));
const selection = (result, edits = [result.edits[0]]) => ({ file: result.file, hash: result.hash, edits: edits.map(edit => ({ id: edit.id })) });
async function transport(t, root, mode) {
  if (mode === 'Session' || mode === 'Engine') {
    const session = await (mode === 'Engine' ? EngineSession : Session).create({ root, watch: false }); t.after(() => session.close()); return session;
  }
  const child = spawn(process.execPath, [cli, 'serve', '--port', '0', '--root', root], { stdio: ['ignore', 'pipe', 'pipe'] });
  let errors = ''; child.stderr.on('data', chunk => errors += chunk); child.stdout.resume();
  t.after(async () => { if (child.exitCode === null && child.signalCode === null) { child.kill('SIGTERM'); await once(child, 'exit'); } assert.equal(errors, ''); });
  let info;
  for (let i = 0; i < 300; i++) {
    try { info = JSON.parse(await readFile(join(root, '.plumb/serve.json'), 'utf8')); break; } catch {}
    assert.equal(child.exitCode, null, errors); await delay(20);
  }
  assert.ok(info, errors || 'daemon did not start');
  const url = `http://127.0.0.1:${info.port}`;
  const request = async (path, init = {}) => {
    const response = await fetch(url + path, { ...init, headers: { 'x-plumb-token': info.token, ...init.headers } });
    const body = await response.json();
    if (!response.ok) { assert.equal(response.status, 400, JSON.stringify(body)); throw new Error(body.error); }
    return body;
  };
  const query = (file, line, column) => new URLSearchParams({ file, line: String(line), ...(column === undefined ? {} : { column: String(column) }) });
  return { url, info, request,
    edits: (file, line, column) => request(`/__plumb/edits?${query(file, line, column)}`),
    site: (file, line, column) => request(`/__plumb/site?${query(file, line, column)}`),
    apply: options => request('/__plumb/apply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(options) }),
  };
}

for (const mode of ['Session', 'HTTP']) {
  test(`${mode} exact edits preserve UTF-16 offsets, variants and protected files; warm results agree with cold CLI`, async t => {
    const code = '// UTF-16 😀\r\nexport const App = () => <div title="😀" className="hover:-m-[10px]! py-[10px] gap-[999px]" style={{ padding: 10 }} />;\r\n';
    const root = await project(t, code), api = await transport(t, root, mode), file = join(root, 'src/App.tsx');
    const protectedBefore = await snapshot(root), before = await api.site(file, 2), result = await api.edits('src/App.tsx', 2);
    assert.equal(result.file, file); assert.equal(result.hash, hash(code)); assert.equal(result.revision, 0);
    assert.ok(result.edits.length > 0);
    assert.deepEqual(await api.edits(file, 2), result, 'ids remain stable for unchanged sites and choices');
    assert.equal(new Set(result.edits.map(edit => edit.id)).size, result.edits.length, 'one edit per site and choice');
    for (const edit of result.edits) {
      assert.deepEqual(Object.keys(edit).sort(), ['id', 'findingKey', 'rule', 'family', 'file', 'line', 'column', 'start', 'end', 'from', 'to', 'token'].sort());
      assert.equal(code.slice(edit.start, edit.end), edit.from);
      assert.equal(edit.start, code.indexOf('\n') + edit.column);
      assert.equal(edit.id, hash(JSON.stringify([edit.file, edit.start, edit.end, edit.from, edit.to])));
      assert.ok(before.findings.some(finding => finding.key === edit.findingKey && finding.rule === edit.rule));
    }
    const chosen = result.edits.filter(edit => edit.token === '--spacing-s2');
    assert.deepEqual(chosen.map(edit => edit.from).sort(), ['hover:-m-[10px]!', 'padding: 10', 'py-[10px]'].sort());
    assert.equal(chosen.find(edit => edit.from.startsWith('hover:')).to, 'hover:-m-s2!');
    const noFit = before.findings.find(finding => finding.sites.some(site => site.text === 'gap-[999px]'));
    assert.ok(noFit); assert.equal(result.edits.filter(edit => edit.from === 'gap-[999px]').length, 0);
    assert.match(formatAgent(cold(root)), /NEEDS-DECISION/);
    assert.deepEqual((await api.edits(file, 2, chosen[0].column)).edits, result.edits.filter(edit => edit.column === chosen[0].column));
    let expected = code;
    for (const edit of chosen.toSorted((a, b) => b.start - a.start)) expected = expected.slice(0, edit.start) + edit.to + expected.slice(edit.end);
    const applied = await api.apply(selection(result, chosen.toReversed()));
    assert.deepEqual(applied.applied, chosen.toReversed().map(edit => edit.id));
    assert.ok(applied.revision > result.revision); assert.equal(applied.hash, hash(expected)); assert.equal(applied.file, file);
    assert.ok(applied.remaining.some(f => f.sites.some(s => s.text === 'gap-[999px]')), 'finding 6: untouched NEEDS-DECISION remains'); assert.equal(await readFile(file, 'utf8'), expected);
    const after = await api.site(file, 2), report = cold(root);
    assert.ok(after.findings.length < before.findings.length);
    const matches = site => site.file === file && site.line === 2;
    assert.deepEqual(after.findings, report.findings.filter(f => f.sites.some(matches)).map(f => ({ ...f, sites: f.sites.filter(matches), ...(f.occurrences ? { occurrences: f.occurrences.filter(d => matches(d.site)) } : {}) })));
    assert.deepEqual(await snapshot(root), protectedBefore);
    assert.equal((await api.edits(file, 2)).hash, applied.hash);
  });

  test(`${mode} rejects stale hashes, unknown ids, overlapping choices and duplicate ids without writes`, async t => {
    const root = await project(t), api = await transport(t, root, mode), file = join(root, 'src/App.tsx');
    const original = await readFile(file, 'utf8'), protectedBefore = await snapshot(root), initial = await api.edits(file, 1);
    await writeFile(file, original + '// changed\n');
    await assert.rejects(api.apply(selection(initial)), error => error.message === stale && (mode !== 'Session' || error instanceof UsageError));
    assert.equal(await readFile(file, 'utf8'), original + '// changed\n');
    await writeFile(file, original); const current = await api.edits(file, 1);
    await assert.rejects(api.apply({ ...selection(current), edits: [{ id: current.edits[0].id }, { id: 'unknown' }] }), /Unknown edit id/);
    const choices = current.edits.filter(edit => edit.start === current.edits[0].start); assert.ok(choices.length >= 2);
    await assert.rejects(api.apply(selection(current, choices)), /overlap/);
    await assert.rejects(api.apply(selection(current, [choices[0], choices[0]])), /overlap/);
    assert.equal(await readFile(file, 'utf8'), original); assert.deepEqual(await snapshot(root), protectedBefore);
    const concurrent = await Promise.allSettled([api.apply(selection(current)), api.apply(selection(current))]);
    assert.equal(concurrent.filter(result => result.status === 'fulfilled').length, 1);
    assert.equal(concurrent.find(result => result.status === 'rejected').reason.message, stale);
  });

  test(`${mode} refuses config, ledger, theme, untracked source, traversal, symlink and hard-link targets`, async t => {
    const root = await project(t), outside = await project(t), api = await transport(t, root, mode);
    const before = await snapshot(root), result = await api.edits('src/App.tsx', 1);
    await writeFile(join(root, 'untracked.tsx'), 'export const Probe = () => <div className="gap-[10px]" />;');
    await symlink(join(outside, 'src/App.tsx'), join(root, 'src/Outside.tsx'));
    await symlink(join(root, 'src/styles.css'), join(root, 'src/ThemeAlias.tsx'));
    await link(join(outside, 'src/App.tsx'), join(root, 'src/HardLink.tsx'));
    const outsideBefore = await readFile(join(outside, 'src/App.tsx'));
    for (const path of [...protectedPaths, 'untracked.tsx', 'src/Outside.tsx', 'src/ThemeAlias.tsx']) {
      const bytes = await readFile(join(root, path), 'utf8');
      await assert.rejects(api.apply({ file: path, hash: hash(bytes), edits: [{ id: result.edits[0].id }] }), /config|\.plumb|theme|tracked|symbolic|Unknown edit|hard links/);
      assert.equal(await readFile(join(root, path), 'utf8'), bytes);
    }
    const hardLink = await api.edits('src/HardLink.tsx', 1);
    await assert.rejects(api.apply(selection(hardLink)), /hard links/);
    await assert.rejects(api.apply({ ...selection(result), file: '../outside.tsx' }), /inside the project root/);
    await assert.rejects(api.apply({ ...selection(result), file: join(outside, 'src/App.tsx') }), /inside the project root/);
    assert.deepEqual(await snapshot(root), before); assert.deepEqual(await readFile(join(outside, 'src/App.tsx')), outsideBefore);
  });
}

test('Session applies tracked stylesheet edits while excluding imported and unselected theme definitions', async t => {
  const root = await project(t);
  await writeFile(join(root, 'src/local.css'), '.local { gap: 10px; padding: 13px; }\n');
  await writeFile(join(root, 'src/theme.css'), '@theme { --spacing-unused: 22px; } .theme { gap: 10px; }\n');
  await writeFile(join(root, 'plumb.config.ts'), "export default { decisions: { spacing: { from: 'theme:--spacing-s*' } } };\n");
  const session = await transport(t, root, 'Session'), file = join(root, 'src/local.css');
  const result = await session.edits(file, 1), choice = result.edits.find(edit => edit.from === '10px');
  assert.ok(choice); const applied = await session.apply(selection(result, [choice]));
  assert.equal(await readFile(file, 'utf8'), `.local { gap: ${choice.to}; padding: 13px; }\n`);
  assert.ok(applied.remaining.some(f => f.sites.some(s => s.text === 'padding: 13px')));
  assert.deepEqual((await session.site(file, 1)).findings, cold(root).findings.filter(f => f.sites.some(site => site.file === file && site.line === 1)));
  const theme = join(root, 'src/theme.css'), before = await readFile(theme, 'utf8');
  await assert.rejects(session.apply({ file: theme, hash: hash(before), edits: [{ id: choice.id }] }), /defines the theme/);
  assert.equal(await readFile(theme, 'utf8'), before);
});

test('HTTP validates edits/apply methods, authentication, JSON and the 1 MiB body limit', async t => {
  const root = await project(t), api = await transport(t, root, 'HTTP'), before = await readFile(join(root, 'src/App.tsx'));
  for (const path of ['/edits?file=src/App.tsx&line=1', '/apply', '/__plumb/edits?file=src/App.tsx&line=1', '/__plumb/apply']) {
    assert.equal((await fetch(api.url + path)).status, 401);
  }
  const headers = { 'x-plumb-token': api.info.token, 'Content-Type': 'application/json' };
  const wrongMethod = await fetch(api.url + '/__plumb/apply', { headers }); assert.equal(wrongMethod.status, 405); assert.equal(wrongMethod.headers.get('Allow'), 'POST');
  assert.equal((await fetch(api.url + '/__plumb/edits', { headers, method: 'POST', body: '{}' })).status, 405);
  for (const body of ['bad', 'null', '{}', JSON.stringify({ file: 'src/App.tsx', hash: 'x', edits: [{}] }), ' '.repeat(1024 * 1024 + 1)]) {
    const response = await fetch(api.url + '/__plumb/apply', { headers, method: 'POST', body });
    assert.equal(response.status, 400); if (body.length > 1024 * 1024) assert.match((await response.json()).error, /1 MiB/);
  }
  assert.equal((await fetch(api.url + '/__plumb/edits?file=src/App.tsx&line=0', { headers })).status, 400);
  assert.equal((await fetch(api.url + '/__plumb/edits?file=src/App.tsx&line=1&column=no', { headers })).status, 400);
  assert.equal(await readFile(join(root, 'src/App.tsx'), 'utf8'), before.toString());
  assert.deepEqual(await api.request('/edits?file=src/App.tsx&line=1'), await api.edits('src/App.tsx', 1));
});

test('token-less handler enforces Origin and loopback, mounts a prefix, and passes other routes to next', async t => {
  const root = await project(t), session = await transport(t, root, 'Session');
  const handler = createHandler(session), custom = createHandler(session, { prefix: '/tools/plumb/' });
  const server = createServer((request, response) => handler(request, response, () => custom(request, response, () => { response.writeHead(202); response.end('host app'); })));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => { server.closeAllConnections(); return new Promise(resolve => server.close(resolve)); });
  const url = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetch(url + '/__plumb/health')).status, 200);
  assert.equal((await fetch(url + '/__plumb/health', { headers: { Origin: url } })).status, 200);
  assert.equal((await fetch(url + '/tools/plumb/health')).status, 200);
  assert.equal((await fetch(url + '/host')).status, 202);
  for (const origin of ['https://foreign.example', 'null', 'http://127.0.0.1:1']) {
    assert.equal((await fetch(url + '/__plumb/health', { headers: { Origin: origin } })).status, 403);
    assert.equal((await fetch(url + '/__plumb/apply', { method: 'POST', headers: { Origin: origin }, body: '{}' })).status, 403);
  }
  const edits = await (await fetch(url + '/__plumb/edits?file=src/App.tsx&line=1', { headers: { Origin: url } })).json();
  const applied = await fetch(url + '/__plumb/apply', { method: 'POST', headers: { Origin: url }, body: JSON.stringify(selection(edits)) });
  assert.equal(applied.status, 200); assert.ok((await applied.json()).revision > edits.revision);
  // A real request arriving over the machine's non-loopback interface must also be refused.
  const { networkInterfaces } = await import('node:os');
  const external = Object.values(networkInterfaces()).flat().find(address => address?.family === 'IPv4' && !address.internal);
  if (external) {
    const remote = createServer(createHandler(session)); await new Promise(resolve => remote.listen(0, '0.0.0.0', resolve));
    t.after(() => { remote.closeAllConnections(); return new Promise(resolve => remote.close(resolve)); });
    assert.equal((await fetch(`http://${external.address}:${remote.address().port}/__plumb/health`)).status, 403);
  }
});

test('stdio exposes edits and apply through the real JSON-RPC session', async t => {
  const root = await project(t), session = await transport(t, root, 'Session'), edits = await session.edits('src/App.tsx', 1);
  const before = await snapshot(root), source = await readFile(join(root, 'src/App.tsx'), 'utf8');
  const input = [
    { jsonrpc: '2.0', id: 'edits', method: 'plumb.edits', params: { file: 'src/App.tsx', line: 1 } },
    { jsonrpc: '2.0', id: 'apply', method: 'plumb.apply', params: selection(edits) },
    { jsonrpc: '2.0', id: 'stale', method: 'apply', params: selection(edits) },
    { jsonrpc: '2.0', id: 'site', method: 'site', params: { file: 'src/App.tsx', line: 1 } },
  ].map(value => JSON.stringify(value)).join('\n') + '\n';
  const replies = run(root, ['serve', '--stdio'], input).trim().split('\n').map(line => JSON.parse(line));
  assert.deepEqual(replies[0].result.edits, edits.edits); assert.deepEqual(replies[1].result.applied, [edits.edits[0].id]);
  assert.equal(replies[2].error.code, -32602); assert.equal(replies[2].error.message, stale);
  assert.ok(!replies[3].result.findings.some(f => f.sites.some(site => site.text === edits.edits[0].from)));
  assert.equal(await readFile(join(root, 'src/App.tsx'), 'utf8'), source.slice(0, edits.edits[0].start) + edits.edits[0].to + source.slice(edits.edits[0].end));
  assert.deepEqual(await snapshot(root), before);
});

async function rawRequest(url, init = {}) {
  return new Promise((resolve, reject) => {
    const request = httpRequest(url, { method: init.method ?? 'GET', headers: init.headers }, response => {
      const chunks = []; response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve(new Response(Buffer.concat(chunks), { status: response.statusCode, headers: response.headers })));
    });
    request.on('error', reject); request.end(init.body);
  });
}

// Review regressions use real Sessions; races injected only at filesystem boundaries.
test('finding 1: token-less writes require trusted Host, exact Origin and same-origin metadata', async t => {
  const root = await project(t), session = await transport(t, root, 'Session');
  const server = createServer(createHandler(session, { allowedHosts: ['trusted.example:8080'] }));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => { server.closeAllConnections(); return new Promise(resolve => server.close(resolve)); });
  const url = `http://127.0.0.1:${server.address().port}`, result = await session.edits('src/App.tsx', 1);
  const before = await readFile(result.file, 'utf8');
  for (const headers of [
    { Host: 'evil.example:8080', Origin: 'http://evil.example:8080' },
    { Origin: url.replace('http:', 'https:') },
    {},
    { Origin: url, 'Sec-Fetch-Site': 'cross-site' },
    { Origin: url, 'Sec-Fetch-Site': 'same-site' },
  ]) {
    assert.equal((await rawRequest(url + '/__plumb/apply', { method: 'POST', headers, body: JSON.stringify(selection(result)) })).status, 403);
  }
  assert.equal((await rawRequest(url + '/__plumb/health', { headers: { Host: 'evil.example:8080' } })).status, 403);
  assert.equal((await rawRequest(url + '/__plumb/edits?file=src/App.tsx&line=1', { headers: { Host: 'evil.example:8080', Origin: 'http://evil.example:8080' } })).status, 403);
  assert.equal((await rawRequest(url + '/__plumb/apply', { method: 'OPTIONS', headers: { Origin: 'https://foreign.example' } })).headers.get('Access-Control-Allow-Origin'), null);
  for (const host of [`localhost:${server.address().port}`, `[::1]:${server.address().port}`, 'trusted.example:8080']) {
    assert.equal((await rawRequest(url + '/__plumb/health', { headers: { Host: host, Origin: `http://${host}` } })).status, 200);
  }
  assert.equal(await readFile(result.file, 'utf8'), before);
});

async function injectOpen(t, run, probe) {
  const { default: fs } = await import('node:fs');
  const { syncBuiltinESMExports } = await import('node:module');
  const original = fs.promises.open;
  fs.promises.open = async (...args) => probe(original, args);
  syncBuiltinESMExports();
  try { await run(); } finally { fs.promises.open = original; syncBuiltinESMExports(); }
}

test('finding 2: parent symlink swap cannot write another project', async t => {
  const root = await project(t), outside = await project(t), session = await transport(t, root, 'Engine');
  const result = await session.edits('src/App.tsx', 1), outsideFile = join(outside, 'src/App.tsx'), before = await readFile(outsideFile, 'utf8');
  const { rename } = await import('node:fs/promises'); let injected = false;
  await injectOpen(t, () => assert.rejects(session.apply(selection(result)), /changed|symbolic|identity/), async (open, args) => {
    if (!injected && args[0] === result.file) {
      injected = true; await rename(join(root, 'src'), join(root, 'previous-src')); await symlink(join(outside, 'src'), join(root, 'src'));
    }
    return open(...args);
  });
  assert.ok(injected); assert.equal(await readFile(outsideFile, 'utf8'), before);
});

for (const race of ['atomic-save', 'concurrent-save']) test(`finding 3: ${race} cannot return success for discarded edits`, async t => {
  const root = await project(t), session = await transport(t, root, 'Engine'), result = await session.edits('src/App.tsx', 1);
  const original = await readFile(result.file, 'utf8'), concurrent = original + '// concurrent editor\n';
  const { rename } = await import('node:fs/promises'); let injected = false;
  await injectOpen(t, () => assert.rejects(session.apply(selection(result)), /changed/), async (open, args) => {
    const handle = await open(...args);
    if (!injected && args[0] === result.file) {
      injected = true;
      if (race === 'atomic-save') { await rename(result.file, join(root, 'src/Previous.tsx')); await writeFile(result.file, original); }
      else {
        const truncate = handle.truncate.bind(handle);
        handle.truncate = async (...values) => { await truncate(...values); await writeFile(result.file, concurrent); };
      }
    }
    return handle;
  });
  assert.ok(injected); assert.equal(await readFile(result.file, 'utf8'), race === 'atomic-save' ? original : concurrent);
  const fresh = await session.edits(result.file, 1);
  assert.equal(fresh.hash, hash(await readFile(result.file, 'utf8'))); assert.ok(fresh.edits.some(edit => edit.from === 'py-[10px]'));
});

test('finding 4: decoded escapes retain authored occurrence offsets', async t => {
  const code = String.raw`export const App = () => <div className={"\u0020\u0020py-[10px] py-[10px]"} />;`;
  const root = await project(t, code), session = await transport(t, root, 'Session');
  const first = code.indexOf('py-[10px]'), second = code.lastIndexOf('py-[10px]');
  const result = await session.edits('src/App.tsx', 1, second + 1);
  assert.ok(result.edits.length); assert.ok(result.edits.every(edit => edit.start === second));
  await session.apply(selection(result));
  assert.equal(await readFile(result.file, 'utf8'), code.slice(0, second) + result.edits[0].to + code.slice(second + result.edits[0].from.length));
  assert.equal((await session.edits(result.file, 1, first + 1)).edits[0].start, first);
});

test('finding 5: CSS edits preserve authored importance and declaration spelling', async t => {
  const root = await project(t), file = join(root, 'src/local.css');
  const original = '.local { gap : 10px /* priority */ !important; padding: 13px; }\n';
  await writeFile(file, original);
  const session = await transport(t, root, 'Session'), result = await session.edits(file, 1);
  const choice = result.edits.find(edit => edit.token === '--spacing-s2'); assert.ok(choice);
  await session.apply(selection(result, [choice]));
  assert.equal(await readFile(file, 'utf8'), original.replace('10px', 'var(--spacing-s2)'));
});

for (const extension of ['jsx', 'js', 'ts', 'css']) test(`finding 7: ${extension} apply refreshes paths without inventory or worker restart`, async t => {
  const root = await project(t), file = join(root, `src/Other.${extension}`);
  const source = extension === 'css' ? '.local { gap: 10px; }' : extension === 'jsx' ? 'export const Other = () => <div className="py-[10px]" />;' : 'export const Other = cn("py-[10px]");';
  await writeFile(file, source);
  const session = await transport(t, root, 'Engine'), result = await session.edits(file, 1), worker = session.worker;
  let inventories = 0; const inventory = session.inventory.bind(session);
  session.inventory = async () => { inventories++; return inventory(); };
  await session.apply(selection(result));
  assert.equal(inventories, 0); assert.equal(session.worker, worker);
  assert.equal((await session.edits(file, 1)).hash, hash(await readFile(file, 'utf8')));
  assert.deepEqual((await session.site(file, 1)).findings, cold(root).findings.filter(f => f.sites.some(site => site.file === file && site.line === 1)));
});

test('finding 8: warm edits stat retained files without inventory or cloning retained maps', async t => {
  const root = await project(t), session = await transport(t, root, 'Engine');
  let inventories = 0, enumerations = 0;
  session.inventory = async () => { inventories++; throw new Error('unexpected inventory'); };
  for (const map of [session.hashes, session.stamps]) {
    map[Symbol.iterator] = () => { enumerations++; throw new Error('unexpected map copy'); };
  }
  const result = await session.edits('src/App.tsx', 1);
  assert.ok(result.edits.length); assert.equal(inventories, 0); assert.equal(enumerations, 0);
});

test('finding 9: Web adapter shares route validation and dispatch with Node middleware', async t => {
  const { createWebHandler } = await import('../dist/index.js');
  assert.equal(typeof createWebHandler, 'function');
  const root = await project(t), session = await transport(t, root, 'Session');
  const token = 'integration-token', web = createWebHandler(session, { token });
  const url = 'http://localhost/__plumb/', headers = { 'x-plumb-token': token };
  const send = (route, init = {}) => web(new Request(url + route, { ...init, headers: { ...headers, ...init.headers } }));
  assert.equal((await web(new Request(url + 'health'))).status, 401);
  assert.equal((await send('apply')).status, 405);
  assert.equal((await send('apply', { method: 'POST', body: 'bad' })).status, 400);
  assert.equal((await send('apply', { method: 'POST', body: ' '.repeat(1024 * 1024 + 1) })).status, 400);
  const response = await send('edits?file=src/App.tsx&line=1'), edits = await response.json();
  assert.deepEqual(edits, await session.edits('src/App.tsx', 1));
  const applied = await send('apply', { method: 'POST', body: JSON.stringify(selection(edits)) });
  assert.equal(applied.status, 200); assert.equal((await applied.json()).hash, hash(await readFile(edits.file, 'utf8')));
  assert.equal((await createWebHandler(session)(new Request(url + 'health'))).status, 403, 'Web Request supplies no peer; never invent loopback');
  const local = createWebHandler(session, { peerAddress: '127.0.0.1' });
  assert.equal((await local(new Request(url + 'health', { headers: { Origin: 'http://localhost' } }))).status, 200);
  assert.equal((await local(new Request(url + 'apply', { method: 'POST', body: '{}' }))).status, 403);
  assert.equal((await local(new Request(url + 'apply', { method: 'POST', headers: { Origin: 'https://localhost' }, body: '{}' }))).status, 403);
  assert.equal((await send('../host')).status, 404);
});

test('overlay review 1: configured sibling sources cannot be edited through native traversal paths', async t => {
  // Runs with backslash traversal on Windows and slash traversal on POSIX.
  const root = await project(t), sibling = await project(t), file = join(sibling, 'src/App.tsx');
  const { relative, sep } = await import('node:path');
  const outside = relative(root, file);
  assert.ok(outside.startsWith('..' + sep));
  await writeFile(join(root, 'plumb.config.ts'), `export default { source: ['src/**/*.tsx', ${JSON.stringify(relative(root, join(sibling, 'src')).replaceAll('\\', '/') + '/**/*.tsx')}] };`);
  const session = await transport(t, root, 'Engine');
  const offered = await session.request('edits', { file, line: 1 });
  assert.ok(offered.edits.length, 'configured sibling is analyzed and has legitimate edit ids');
  const before = await readFile(file, 'utf8');
  for (const target of [outside, file, '..', root]) {
    await assert.rejects(session.apply({ ...selection(offered), file: target }), /inside the project root/);
  }
  // Guard is repeated at the write boundary, independent of public path parsing.
  await assert.rejects(session.editableFile(file), /inside the project root/);
  assert.equal(await readFile(file, 'utf8'), before);
});

test('overlay review 5: warm apply visits changed slices/consumers and updates local views without full materialization', async t => {
  const root = await project(t);
  await Promise.all(Array.from({ length: 160 }, (_, i) => writeFile(join(root, `src/Unrelated${i}.tsx`), `export const Unrelated${i} = () => <div className="gap-[19px]" />;`)));
  const file = join(root, 'src/A.tsx'), consumer = join(root, 'src/B.tsx');
  await writeFile(file, 'export const sizes = { a: "gap-[10px]" }; export const A = () => <div className={sizes.a} />;');
  await writeFile(consumer, 'import { sizes } from "./A"; export const B = () => <div className={sizes.a} />;');
  const css = join(root, 'src/local.css'); await writeFile(css, '.local { gap: 10px; padding: 13px; }\n');
  const styled = join(root, 'src/Styled.tsx');
  await writeFile(styled, 'export const Styled = () => <><style>{`.local { gap: 10px; }`}</style><div className="local gap-[19px]" /></>;');
  const session = await transport(t, root, 'Engine');
  const initial = (await session.health()).work;
  let refresh;
  const request = session.request.bind(session);
  session.request = async (method, params) => { const result = await request(method, params); if (method === 'refresh') refresh = result; return result; };
  const edit = await session.edits(file, 1); assert.ok(edit.edits.length);
  await session.apply(selection(edit));
  assert.deepEqual(new Set(refresh.visited), new Set([file, consumer]));
  assert.equal(refresh.queryDependencies.length, 2); assert.equal(refresh.dependencies, undefined);
  assert.ok((await session.edits(consumer, 1)).edits.every(edit => edit.from !== 'gap-[10px]'));
  const styleEdit = await session.edits(css, 1); assert.ok(styleEdit.edits.length);
  const remaining = await session.apply(selection(styleEdit)); assert.ok(remaining.remaining.length);
  assert.deepEqual(refresh.visited, []); assert.equal(refresh.queryDependencies.length, 1);
  const embedded = await session.edits(styled, 1);
  const embeddedChoice = embedded.edits.find(edit => edit.from === '10px'); assert.ok(embeddedChoice);
  await session.apply(selection(embedded, [embeddedChoice]));
  assert.deepEqual(refresh.visited, [styled]);
  assert.equal(refresh.queryDependencies.length, 1);
  const after = (await session.health()).work;
  assert.equal(after.fullReports, initial.fullReports); assert.equal(after.fullIndexes, initial.fullIndexes);
  assert.ok(after.localAnalyses > initial.localAnalyses);
  assert.equal((await session.edits(css, 1)).hash, hash(await readFile(css, 'utf8')));
  assert.deepEqual((await session.site(css, 1)).findings, cold(root).findings.filter(f => f.sites.some(s => s.file === css && s.line === 1)));
  const full = await session.report();
  assert.deepEqual(full.findings, cold(root).findings);
  assert.ok((await session.health()).work.fullReports > after.fullReports, 'explicit report materializes whole-project aggregates');
});
