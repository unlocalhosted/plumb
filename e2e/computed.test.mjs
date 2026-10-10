import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer as httpServer } from 'node:http';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { Session, check, explain, createHandler, createWebHandler } from '../dist/index.js';
import { plumb } from '../dist/hosts/vite.js';

const repo = fileURLToPath(new URL('../', import.meta.url));
async function fixture(t) {
  const root = await mkdtemp(join(repo, 'fixtures/.computed-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'fixtures/computed'), root, { recursive: true });
  return root;
}
async function session(t, root) { const api = await Session.create({ root, watch: false }); t.after(() => api.close()); return api; }
function location(source, id) {
  const start = source.indexOf(`<div id="${id}"`);
  assert.ok(start >= 0);
  const lines = source.slice(0, start).split('\n'); return { line: lines.length, column: lines.at(-1).length + 1 };
}
const chosen = result => result.edits.find(edit => edit.token === '--spacing-s2');
const entry = (result, token) => { const item = result.classes.find(item => item.token === token); assert.ok(item, `${token}: ${JSON.stringify(result)}`); return item; };

test('real sparse destructuring, arrays, null helper arguments and empty returns survive check and classes', async t => {
  const root = await fixture(t);
  const checked = spawnSync(process.execPath, [join(repo, 'dist/cli.js'), 'check', '--root', root, '--json'], { encoding: 'utf8' });
  assert.ok([0, 1].includes(checked.status), checked.stderr);
  assert.equal(checked.stderr, ''); assert.ok(JSON.parse(checked.stdout).coverage);
  const api = await session(t, root), source = await readFile(join(root, 'src/Nullable.tsx'), 'utf8');
  for (const [id, tokens] of [['nullable', ['inline-flex', 'px-[10px]', 'gap-[10px]']], ['nullable-helper', ['py-[10px]']], ['nullable-recipe', ['m-[10px]', 'p-[10px]']], ['nullable-return', []]]) {
    const at = location(source, id), result = await api.classes('src/Nullable.tsx', at.line, at.column, tokens.join(' '));
    assert.equal(result.limited, false); assert.deepEqual(result.unattributed, []);
    for (const token of tokens) assert.equal(entry(result, token).ambiguous, false);
    if (id === 'nullable') await onlyLiteral(api, root, entry(result, 'px-[10px]').sites[0], 'px-[10px]');
  }
});

test('shared helper shapes cover config, mixed, legacy and imported aliases without attributing metadata', async t => {
  const root = await fixture(t), api = await session(t, root), source = await readFile(join(root, 'src/HelperShapes.tsx'), 'utf8');
  const collected = await explain('src/HelperShapes.tsx', { root });
  assert.ok(collected.sites.some(site => site.token === 'px-[10px]'));
  assert.ok(collected.sites.every(site => !site.token.startsWith('metadata-')), 'collector excludes config metadata');
  for (const [id, tokens] of [
    ['custom-config', ['px-[10px]', 'gap-[10px]', 'm-[10px]']],
    ['custom-mixed', ['inline-flex', 'py-[10px]']], ['custom-legacy', ['p-[10px]', 'mt-[10px]']],
    ['alias-cva', ['flex', 'mb-[10px]']], ['alias-tv', ['grid', 'mx-[10px]']],
  ]) {
    const at = location(source, id), result = await api.classes('src/HelperShapes.tsx', at.line, at.column, tokens.join(' ') + ' metadata-ignored metadata-default');
    assert.equal(result.limited, false); assert.deepEqual(result.unattributed, ['metadata-ignored', 'metadata-default']);
    for (const token of tokens) {
      const item = entry(result, token); assert.equal(item.ambiguous, false);
      assert.ok(item.sites.every(site => site.declarations.length && site.file === join(root, 'src/HelperShapes.tsx')));
    }
    const token = tokens.find(token => token.includes('[10px]'));
    await onlyLiteral(api, root, entry(result, token).sites[0], token);
  }
});

test('unexpected startup failures preserve worker frames in Session, CLI and health diagnostic', async t => {
  const root = await fixture(t);
  await writeFile(join(root, 'plumb.config.ts'), `export default { source: ['src/Nullable.tsx'], decisions: { spacing: { from: () => { throw new TypeError('startup-stack-sentinel'); } } } };`);
  const pending = Session.create({ root, watch: false });
  const handler = createWebHandler(pending, { token: 'stack-test' });
  await assert.rejects(pending, error => {
    assert.match(error.stack, /TypeError: startup-stack-sentinel/);
    assert.match(error.stack, /plumb\.config\.ts/); assert.match(error.stack, /session\/worker\.js/); return true;
  });
  const response = await handler(new Request('http://localhost/__plumb/health', { headers: { 'x-plumb-token': 'stack-test' } }));
  const health = await response.json(); assert.equal(health.status, 'failed');
  assert.match(health.diagnostic, /TypeError: startup-stack-sentinel\n\s+at/);
  assert.match(health.diagnostic, /session\/worker\.js/);
  const cli = spawnSync(process.execPath, [join(repo, 'dist/cli.js'), 'serve', '--stdio', '--root', root], { encoding: 'utf8', timeout: 10000 });
  assert.ifError(cli.error); assert.equal(cli.status, 2); assert.equal(cli.stdout, '');
  assert.match(cli.stderr, /TypeError: startup-stack-sentinel\n\s+at/); assert.match(cli.stderr, /session\/worker\.js/);
});

test('AlgoRecall malformed arbitrary selector leaves a diagnostic while valid classes remain judgeable', async t => {
  const root = await fixture(t), report = await check({ root });
  const invalid = '[&_.bg-error/5]:hidden';
  assert.ok(report.notes.some(note => note.includes(`Could not lower ${invalid}: Unexpected token`)));
  const collected = await explain('src/InvalidSelector.tsx', { root });
  const site = collected.sites.find(site => site.token === invalid);
  assert.ok(site); assert.deepEqual(site.declarations, []); assert.ok(site.notes.some(note => note.includes('Could not lower')));
  assert.ok(collected.sites.some(site => site.token === 'p-[10px]' && site.declarations.length));
  const api = await session(t, root), source = await readFile(join(root, 'src/InvalidSelector.tsx'), 'utf8'), at = location(source, 'invalid-selector');
  const result = await api.classes('src/InvalidSelector.tsx', at.line, at.column, `${invalid} p-[10px]`);
  assert.deepEqual(result.unattributed, []);
  for (const site of entry(result, invalid).sites) { assert.deepEqual(site.declarations, []); assert.deepEqual(site.edits, []); }
  await onlyLiteral(api, root, entry(result, 'p-[10px]').sites[0], 'p-[10px]');
});
async function onlyLiteral(api, root, site, token) {
  const before = await readFile(site.file, 'utf8'), edit = chosen(site);
  assert.ok(edit, `missing edit: ${token}: ${JSON.stringify(site)}`);
  assert.equal(edit.from, token); assert.equal(before.slice(edit.start, edit.end), token);
  const ordinary = await api.edits(site.file, site.line, site.column);
  assert.ok(ordinary.edits.some(candidate => candidate.id === edit.id), 'same edit model and id');
  const other = join(root, 'src/main.tsx'), otherBefore = await readFile(other, 'utf8');
  await api.apply({ file: site.file, hash: site.hash, edits: [{ id: edit.id }] });
  assert.equal(await readFile(site.file, 'utf8'), before.slice(0, edit.start) + edit.to + before.slice(edit.end));
  assert.equal(await readFile(other, 'utf8'), otherBefore);
}

test('MetalUI button own template follows helper, shared templates, maps, callback and nested conditionals', async t => {
  const root = await fixture(t), api = await session(t, root);
  const source = await readFile(join(root, 'src/Button.tsx'), 'utf8');
  const start = source.indexOf('<button id="computed-button"'), lines = source.slice(0, start).split('\n');
  const line = lines.length, column = lines.at(-1).length + 1;
  const tokens = ['mu-button', 'inline-flex', 'focus-visible:outline-2', 'gap-button-gap', 'h-button-height', 'px-[10px]', 'recipe-button', 'data-holding:recipe-button-destructive-pressed'];
  const result = await api.classes('src/Button.tsx', line, column, tokens.join(' '));
  assert.deepEqual(result.unattributed, []); assert.equal(result.limited, false);
  for (const token of tokens) for (const site of entry(result, token).sites) {
    assert.equal(site.file, join(root, 'src/Button.tsx'));
    const offset = source.split('\n').slice(0, site.line - 1).reduce((n, row) => n + row.length + 1, 0) + site.column - 1;
    assert.equal(source.slice(offset, offset + token.length), token);
    assert.ok(site.declarations.length || site.findings.length, 'compiled declarations or dead-class finding');
  }
  assert.equal(entry(result, 'mu-button').sites[0].line, source.slice(0, source.indexOf('mu-button mu-icon-trigger')).split('\n').length);
  // The copied recipe carries one deliberate fixture drift, preserving the real helper shape.
  await onlyLiteral(api, root, entry(result, 'px-[10px]').sites[0], 'px-[10px]');
});

for (const [id, tokens, editable] of [
  ['cva', ['inline-flex', 'py-[10px]', 'gap-[10px]', 'p-[10px]'], 'py-[10px]'],
  ['tv', ['flex', 'px-[10px]', 'm-[10px]'], 'px-[10px]'],
  ['cn', ['p-[10px]', 'py-[10px]', 'm-[10px]', 'px-[10px]'], 'p-[10px]'],
  ['imported', ['px-[10px]', 'gap-[10px]', 'm-[10px]'], 'px-[10px]'],
  ['callback', ['px-[10px]', 'gap-[10px]', 'm-[10px]', 'p-[10px]'], 'p-[10px]'],
]) test(`${id} maps each rendered token to its feeding literal; Node apply changes only selected literal`, async t => {
  const root = await fixture(t), api = await session(t, root), source = await readFile(join(root, 'src/App.tsx'), 'utf8');
  const at = location(source, id), result = await api.classes('src/App.tsx', at.line, at.column, tokens.join(' '));
  assert.deepEqual(result.unattributed, []); assert.equal(result.limited, false);
  for (const token of tokens) {
    const item = entry(result, token); assert.equal(item.ambiguous, false, `${id} ${token} has one feeding site`);
    const site = item.sites[0]; assert.ok(site.declarations.length); if (token.includes('[10px]')) assert.ok(site.findings.length);
    if (id === 'imported') assert.equal(site.file, join(root, 'src/helpers.ts'));
  }
  await onlyLiteral(api, root, entry(result, editable).sites[0], editable);
  const tokenized = editable.replace('[10px]', 's2'), updated = await api.classes('src/App.tsx', at.line, at.column, tokenized);
  assert.equal(updated.unattributed.length, 0); assert.ok(updated.revision > result.revision);
});

test('ambiguous candidates all survive; dynamic concatenation never gets attributed; fallback stays within module graph', async t => {
  const root = await fixture(t), api = await session(t, root), source = await readFile(join(root, 'src/App.tsx'), 'utf8');
  let at = location(source, 'ambiguous');
  const ambiguous = entry(await api.classes('src/App.tsx', at.line, at.column, 'gap-[10px] gap-[10px]'), 'gap-[10px]');
  assert.equal(ambiguous.ambiguous, true); assert.equal(ambiguous.sites.length, 2);
  assert.ok(ambiguous.sites.every(site => chosen(site)));
  at = location(source, 'runtime');
  const result = await api.classes('src/App.tsx', at.line, at.column, 'is-ready external-only');
  assert.deepEqual(result.classes, []); assert.deepEqual(result.unattributed, ['is-ready', 'external-only']);
  await writeFile(join(root, 'src/Unrelated.tsx'), '<div className="external-only" />');
  assert.deepEqual((await api.classes('src/App.tsx', at.line, at.column, 'external-only')).unattributed, ['external-only']);
  const fallback = await api.classes('src/App.tsx', at.line, at.column, 'py-[10px] px-[10px]');
  assert.ok(entry(fallback, 'py-[10px]').ambiguous, 'all same-file fallback candidates returned');
  assert.ok(entry(fallback, 'px-[10px]').sites.every(site => site.file === join(root, 'src/App.tsx')), 'same-file wins over imported fallback');
});

test('warm lookups stay cached, imported helper changes reconcile without watchers, stale edits refused', async t => {
  const root = await fixture(t), api = await session(t, root), source = await readFile(join(root, 'src/App.tsx'), 'utf8'), at = location(source, 'imported');
  let first;
  for (let i = 0; i < 4; i++) { first = await api.classes('src/App.tsx', at.line, at.column, 'px-[10px]'); if (!first.limited) break; }
  assert.equal(first.limited, false);
  const before = await api.health(), start = performance.now();
  for (let i = 0; i < 12; i++) assert.deepEqual(await api.classes('src/App.tsx', at.line, at.column, 'px-[10px]'), first);
  assert.ok(performance.now() - start < 2000, 'warm reads bounded');
  const after = await api.health(); assert.deepEqual(after.work, before.work, 'no reanalysis on warm reads');
  const site = entry(first, 'px-[10px]').sites[0], helper = await readFile(site.file, 'utf8');
  await writeFile(site.file, helper.replace('px-[10px]', 'px-[13px]'));
  const second = await api.classes('src/App.tsx', at.line, at.column, 'px-[13px]');
  assert.equal(second.unattributed.length, 0); assert.ok(second.revision > first.revision);
  await assert.rejects(api.apply({ file: site.file, hash: site.hash, edits: [{ id: chosen(site).id }] }), /file changed/);
});

test('classes HTTP and Fetch routes validate parameters, auth, CORS and methods', async t => {
  const root = await fixture(t), api = await session(t, root), source = await readFile(join(root, 'src/App.tsx'), 'utf8'), at = location(source, 'imported');
  const origin = 'http://localhost:4311', token = 'computed-test-token';
  const server = httpServer(createHandler(api, { token, origin }));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  const url = `http://127.0.0.1:${server.address().port}/__plumb/classes`;
  const query = new URLSearchParams({ file: 'src/App.tsx', ...Object.fromEntries(Object.entries(at).map(([k,v]) => [k,String(v)])), classes: 'px-[10px]' });
  const headers = { 'x-plumb-token': token, origin };
  const response = await fetch(`${url}?${query}`, { headers }); assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), await api.classes('src/App.tsx', at.line, at.column, 'px-[10px]'));
  assert.equal((await fetch(`${url}?${query}`)).status, 401);
  assert.equal((await fetch(`${url}?${query}`, { headers: { ...headers, origin: 'http://evil.example' } })).status, 403);
  assert.equal((await fetch(`${url}?${query}`, { method: 'POST', headers })).status, 405);
  const preflight = await fetch(url, { method: 'OPTIONS', headers: { origin, 'access-control-request-method': 'GET', 'access-control-request-headers': 'x-plumb-token' } });
  assert.equal(preflight.status, 204);
  for (const changes of [{ line: '0' }, { column: 'bad' }, { column: '' }, { file: '../outside.tsx' }, { file: 'src/App.tsx', line: '1', column: '1' }, { classes: 'x'.repeat(65537) }]) {
    const handler = createWebHandler(api, { token });
    const params = new URLSearchParams({ ...Object.fromEntries(query), ...changes });
    assert.equal((await handler(new Request(`http://localhost/__plumb/classes?${params}`, { headers: { 'x-plumb-token': token } }))).status, 400, JSON.stringify(changes));
  }
  assert.throws(() => api.classes('src/App.tsx', 1, 0, ''), /positive integers/);
  assert.throws(() => api.classes('src/App.tsx', at.line, at.column, []), /classes must be a string/);
});

test('real Chromium rendered classes resolve through GET classes; Node apply updates only helper literal and browser CSS', { timeout: 90000 }, async t => {
  let browser;
  try { browser = await chromium.launch({ headless: true, executablePath: process.env.PLUMB_CHROMIUM || undefined }); }
  catch (error) { if (!/Executable doesn't exist/.test(error.message)) throw error; t.skip('Playwright Chromium missing'); return; }
  t.after(() => browser.close());
  const root = await fixture(t);
  const server = await createServer({ root, cacheDir: join(root, '.cache/vite'), configFile: false, plugins: [tailwindcss(), plumb({ watch: false })], oxc: { jsx: { runtime: 'automatic', development: true } }, logLevel: 'silent', server: { host: '127.0.0.1', port: 0, watch: { usePolling: true, interval: 50 } } });
  t.after(() => server.close()); await server.listen();
  const page = await browser.newPage(), errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/`);
  await page.waitForFunction(() => window.__plumb?.overlay); await page.evaluate(() => window.__plumb.ready());
  const result = await page.evaluate(async () => {
    const element = document.getElementById('imported'), at = await window.__plumb.locate(element);
    if (!at) throw new Error('computed element did not locate');
    const params = new URLSearchParams({ file: at.file, line: String(at.line), column: String(at.column), classes: element.className });
    const response = await fetch('/__plumb/classes?' + params); if (!response.ok) throw new Error(await response.text()); return response.json();
  });
  assert.deepEqual(result.unattributed, []);
  assert.equal(await page.locator('#imported').evaluate(el => getComputedStyle(el).paddingLeft), '10px');
  const site = entry(result, 'px-[10px]').sites[0];
  const api = await session(t, root); await onlyLiteral(api, root, site, 'px-[10px]');
  await page.waitForFunction(() => document.getElementById('imported')?.classList.contains('px-s2') && getComputedStyle(document.getElementById('imported')).paddingLeft === '8px');
  assert.deepEqual(errors, []);
});

test('imported helper outside source glob remains authored and editable, with transitive invalidation', async t => {
  const root = await fixture(t);
  await writeFile(join(root, 'plumb.config.ts'), 'export default { css: "src/styles.css", source: ["src/App.tsx", "src/styles.css"], decisions: { spacing: { callers: ["primitive", "semantic"] } } };');
  const api = await session(t, root), source = await readFile(join(root, 'src/App.tsx'), 'utf8'), at = location(source, 'imported');
  const result = await api.classes('src/App.tsx', at.line, at.column, 'px-[10px]');
  assert.equal(result.unattributed.length, 0);
  await onlyLiteral(api, root, entry(result, 'px-[10px]').sites[0], 'px-[10px]');
  assert.deepEqual((await api.classes('src/App.tsx', at.line, at.column, 'px-s2')).unattributed, []);
});

test('lexical scopes, imported namespaces, constant map keys and conditional joins preserve exact literals', async t => {
  const root = await fixture(t);
  const code = `import * as helper from './helpers';
const flex = 'flex';
const styles = { first: 'gap-[10px]', second: 'gap-[10px]' };
export function Scoped({ active }) {
  const flex = 'inline-flex';
  const own = [flex, helper.importedClasses(active), styles.first, active && 'p-[10px]'].filter(Boolean).join(' ');
  return <div id="scope" className={own}/>;
}`;
  await writeFile(join(root, 'src/App.tsx'), code);
  const api = await session(t, root), at = location(code, 'scope');
  const result = await api.classes('src/App.tsx', at.line, at.column, 'inline-flex gap-[10px] px-[10px] p-[10px]');
  assert.deepEqual(result.unattributed, []);
  const gaps = entry(result, 'gap-[10px]'); assert.equal(gaps.ambiguous, true); assert.equal(gaps.sites.length, 2, 'only chosen key plus imported helper, excluding identical second key');
  assert.equal(entry(result, 'inline-flex').sites.length, 1, 'usage identifier never becomes authored site');
  await onlyLiteral(api, root, entry(result, 'p-[10px]').sites[0], 'p-[10px]');
});

test('recursive helpers and deep import chains stop with explicit limits, without guessed fallback', async t => {
  const root = await fixture(t);
  await writeFile(join(root, 'src/App.tsx'), `function recursive() { return recursive(); }
export function App() { return <div id="recursive" className={recursive()}/>; }
export function Other() { return <div className="p-[10px]"/>; }
`);
  const api = await session(t, root), source = await readFile(join(root, 'src/App.tsx'), 'utf8'), at = location(source, 'recursive');
  const start = performance.now(), result = await api.classes('src/App.tsx', at.line, at.column, 'p-[10px]');
  assert.equal(result.limited, true); assert.deepEqual(result.unattributed, ['p-[10px]']);
  assert.ok(performance.now() - start < 1000);
  await api.close();
  for (let i = 0; i < 9; i++) await writeFile(join(root, `src/depth${i}.ts`), i === 8 ? "export function deep() { return 'p-[10px]'; }" : `export { deep } from './depth${i + 1}';`);
  await writeFile(join(root, 'src/App.tsx'), `import { deep } from './depth0'; export function App() { return <div id="deep" className={deep()}/>; }`);
  const deepApi = await session(t, root), deepSource = await readFile(join(root, 'src/App.tsx'), 'utf8'), deepAt = location(deepSource, 'deep');
  const deepResult = await deepApi.classes('src/App.tsx', deepAt.line, deepAt.column, 'p-[10px]');
  assert.equal(deepResult.limited, true); assert.deepEqual(deepResult.unattributed, ['p-[10px]']);
});

test('export-star barrels and helper defaults preserve literal attribution and apply', async t => {
  const root = await fixture(t);
  await writeFile(join(root, 'src/barrel.ts'), "export * from './helpers';");
  const original = await readFile(join(root, 'src/App.tsx'), 'utf8');
  const source = original.replace('dimensions, cls', 'importedClasses as dimensions, cls');
  await writeFile(join(root, 'src/App.tsx'), source);
  const api = await session(t, root), at = location(source, 'imported');
  const result = await api.classes('src/App.tsx', at.line, at.column, 'px-[10px] gap-[10px] m-[10px]');
  assert.deepEqual(result.unattributed, []);
  assert.ok(result.classes.every(item => item.sites.every(site => site.file === join(root, 'src/helpers.ts'))));
  await onlyLiteral(api, root, entry(result, 'px-[10px]').sites[0], 'px-[10px]');
  await api.close();
  const defaults = `function dimensions(size = 'small') { return size === 'small' ? 'p-[10px]' : 'p-[10px]'; }
export function App() { return <div id="defaults" className={dimensions()}/>; }`;
  await writeFile(join(root, 'src/App.tsx'), defaults);
  const defaultsApi = await session(t, root), defaultAt = location(defaults, 'defaults');
  const selected = entry(await defaultsApi.classes('src/App.tsx', defaultAt.line, defaultAt.column, 'p-[10px]'), 'p-[10px]');
  assert.equal(selected.ambiguous, false); assert.equal(selected.sites.length, 1);
  await onlyLiteral(defaultsApi, root, selected.sites[0], 'p-[10px]');
});
