import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
import { build, createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { decode } from '@jridgewell/sourcemap-codec';
import { plumb } from '@unlocalhosted/react-plumber/vite';

const repo = fileURLToPath(new URL('../', import.meta.url));
const file = 'src/App.jsx';
const source = `import React, { Fragment } from 'react';
import { Button } from 'plumb-stamp-library';
const spread = { 'data-plumb-source': 'spread', title: 'spread' };
export default function App() {
  return <main>
    {/* Unicode before JSX: 😀 */}<button id="host" {...spread} className="gap-[13px]">Host</button>
    <Button id="usage" {...spread} className="gap-[17px]" />
    <aside id="authored" {...spread} data-plumb-source="author">Authored</aside>
    <><em id="shorthand">Shorthand</em></>
    <Fragment><em id="fragment">Fragment</em></Fragment>
    <React.Fragment><em id="member">Member</em></React.Fragment>
    {React.createElement('button', { id: 'dom-only' }, 'DOM only')}
  </main>;
}
`;
const hash = text => createHash('sha256').update(text).digest('hex');
function position(text, fragment) {
  const offset = text.indexOf(fragment); assert.ok(offset >= 0, fragment);
  return { line: text.slice(0, offset).split('\n').length, column: offset - text.lastIndexOf('\n', offset - 1) };
}
const stampAt = fragment => {
  const at = position(source, fragment);
  return `${file.split('/').map(encodeURIComponent).join('/')}:${at.line}:${at.column}#${hash(source).slice(0, 12)}`;
};
async function fixture(t) {
  const root = await mkdtemp(join(repo, 'fixtures/.stamp-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'fixtures/spacing'), root, { recursive: true, filter: path => !path.split('/').includes('.plumb-cache') });
  await rm(join(root, 'src/App.tsx'));
  await writeFile(join(root, file), source);
  await writeFile(join(root, 'package.json'), '{"type":"module"}');
  await writeFile(join(root, 'index.html'), '<html><head><link rel="icon" href="data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22/%3E"></head><body><div id="root"></div><script type="module" src="/src/entry.jsx"></script></body></html>');
  await writeFile(join(root, 'src/entry.jsx'), `import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
createRoot(document.getElementById('root')).render(<App />);
`);
  const library = join(root, 'node_modules/plumb-stamp-library');
  await mkdir(library, { recursive: true });
  await writeFile(join(library, 'package.json'), '{"name":"plumb-stamp-library","type":"module","exports":"./index.jsx"}');
  await writeFile(join(library, 'index.jsx'), `export function Button(props) { return <button {...props}>Library</button>; }`);
  await writeFile(join(root, 'outside.jsx'), 'export default () => <button id="outside" />;');
  await writeFile(join(root, 'src/excluded.jsx'), 'export default () => <button id="excluded" />;');
  await mkdir(join(root, 'src/names&part'));
  await writeFile(join(root, 'src/names&part/Encoded.jsx'), 'export default () => <button id="encoded" />;');
  await writeFile(join(root, 'src/delimiters:#?%.jsx'), 'export default () => <button id="delimiters" />;');
  await writeFile(join(root, 'plumber.config.ts'), `export default { source: ['src/**/*.{tsx,jsx,ts,js,css}', '!src/excluded.jsx'], decisions: { spacing: { callers: ['primitive', 'semantic'] } } };`);
  // Aliases under src must not turn files outside this project's root into
  // tracked sources. The target is still inside React Plumber, read-only.
  await symlink(join(repo, 'fixtures/spacing/src/App.tsx'), join(root, 'src/linked.tsx'));
  return root;
}
const settings = root => ({ root, configFile: false, cacheDir: join(root, '.vite-cache'), logLevel: 'silent',
  optimizeDeps: { noDiscovery: true, include: ['react', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'plumb-stamp-library'] },
  server: { watch: null, host: '127.0.0.1', port: 0, fs: { allow: [repo] } } });

test('Vite stamps prove exact host JSX, preserve usage and refuse stale evidence', { timeout: 90000 }, async t => {
  const root = await fixture(t), observed = new Map();
  const capture = { name: 'capture-authored-map', enforce: 'pre', transform(code, id) {
    if (id.endsWith(file)) observed.set(file, { code, map: this.getCombinedSourcemap() });
  } };
  const server = await createServer({ ...settings(root), plugins: [plumb({ watch: false }), capture, react()] });
  t.after(() => server.close()); await server.listen();
  const url = `http://127.0.0.1:${server.httpServer.address().port}`;
  const browser = await chromium.launch({ headless: true, executablePath: (process.env.PLUMBER_CHROMIUM ?? process.env.PLUMB_CHROMIUM) || undefined });
  t.after(() => browser.close());
  const page = await browser.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(url);
  try { await page.waitForSelector('#host'); } catch (error) { error.message += '\n' + errors.join('\n'); throw error; }
  await page.waitForFunction(() => window.__plumb?.ready);
  await page.evaluate(() => window.__plumb.ready());
  const resolve = async params => {
    const response = await fetch(url + '/__plumb/resolve?' + new URLSearchParams(params));
    assert.equal(response.status, 200, await response.clone().text());
    return response.json();
  };
  const proof = { source: file.split('/').map(encodeURIComponent).join('/'), ...position(source, '<button id="host"'), hash: hash(source).slice(0, 12), tag: 'button', stamp: '1' };

  await t.test('host stamp overrides spreads; fiber props prove location despite DOM tampering', async () => {
    assert.equal(await page.getAttribute('#host', 'data-plumb-source'), stampAt('<button id="host"'));
    const expected = { file, ...position(source, '<button id="host"') };
    // The stamp answers at once; the chain above it, for Alt+↑/↓, is asked for separately.
    const quick = await page.$eval('#host', element => window.__plumb.locate(element));
    assert.deepEqual({ file: quick.file, line: quick.line, column: quick.column }, expected);
    assert.equal(quick.via, 'stamp'); assert.equal(quick.partial, true); assert.equal(quick.component, 'App');
    const first = await page.$eval('#host', element => window.__plumb.locate(element, { chain: true }));
    assert.deepEqual({ file: first.file, line: first.line, column: first.column }, expected);
    assert.equal(first.via, 'stamp'); assert.equal(first.index, 0);
    const fallback = await page.$eval('#host', async element => {
      const fiber = element[Object.keys(element).find(key => key.startsWith('__reactFiber$'))];
      const props = fiber.memoizedProps; fiber.memoizedProps = { ...props, 'data-plumb-source': undefined };
      try { return await window.__plumb.locate(element); } finally { fiber.memoizedProps = props; }
    });
    assert.deepEqual(first.chain, fallback.chain, 'owner chain retained for navigation');
    await page.$eval('#host', element => element.setAttribute('data-plumb-source', 'forged'));
    assert.deepEqual(await page.$eval('#host', element => window.__plumb.locate(element, { chain: true })), first);
    assert.deepEqual(await resolve(proof), { ...expected, hash: hash(source) });
    const noMaps = await page.$eval('#host', async element => {
      const fiber = element[Object.keys(element).find(key => key.startsWith('__reactFiber$'))];
      const stack = fiber._debugStack, owner = fiber._debugOwner, props = fiber.memoizedProps;
      fiber.memoizedProps = { ...props };
      fiber._debugStack = null; fiber._debugOwner = null;
      try { return await window.__plumb.locate(element); }
      finally { fiber._debugStack = stack; fiber._debugOwner = owner; fiber.memoizedProps = props; }
    });
    assert.equal(noMaps.via, 'stamp'); assert.equal(noMaps.line, expected.line);
  });
  await t.test('library forwarded component stamp is usage; existing default and chain survive', async () => {
    assert.equal(await page.getAttribute('#usage', 'data-plumb-source'), stampAt('<Button id="usage"'));
    const located = await page.$eval('#usage', element => window.__plumb.locate(element));
    const without = await page.$eval('#usage', async element => {
      const fiber = element[Object.keys(element).find(key => key.startsWith('__reactFiber$'))];
      const props = fiber.memoizedProps;
      fiber.memoizedProps = { ...props, 'data-plumb-source': undefined };
      try { return await window.__plumb.locate(element); } finally { fiber.memoizedProps = props; }
    });
    assert.deepEqual({ ...located, chain: without.chain }, without, 'default selection unchanged');
    assert.deepEqual(located.chain.slice(0, without.chain.length).map(({ usage, ...link }) => link), without.chain, 'original navigation links retained');
    assert.ok(located.chain.some(link => link.usage && link.file === file && link.line === position(source, '<Button id="usage"').line));
    const resolved = await resolve({ ...proof, ...position(source, '<Button id="usage"') });
    assert.equal(resolved.usage, true); assert.equal(resolved.component, 'Button');
  });
  await t.test('author wins only its opening; fragments remain untouched; disk unchanged', async () => {
    const transformed = observed.get(file); assert.ok(transformed);
    assert.match(transformed.code, /<aside id="authored" \{\.\.\.spread\} data-plumb-source="author">/);
    for (const opening of ['<>', '<Fragment>', '<React.Fragment>']) assert.ok(transformed.code.includes(opening), opening);
    assert.equal(await page.getAttribute('#authored', 'data-plumb-source'), 'author');
    assert.equal((await page.$eval('#authored', element => window.__plumb.locate(element))).via, 'owner-stack');
    for (const id of ['shorthand', 'fragment', 'member']) assert.match(await page.getAttribute('#' + id, 'data-plumb-source'), /#[a-f0-9]{12}$/);
    assert.equal(await readFile(join(root, file), 'utf8'), source);
    assert.deepEqual(errors, [], 'no Fragment prop warnings or browser errors');
  });
  await t.test('every authored character retains its original source-map position', async () => {
    const map = observed.get(file).map;
    const positions = new Set(decode(map.mappings).flatMap(row => row.filter(segment => segment.length >= 4).map(segment => `${segment[2]}:${segment[3]}`)));
    for (const [line, text] of source.split('\n').entries()) for (let column = 0; column < text.length; column++) {
      assert.ok(positions.has(`${line}:${column}`), `authored ${line + 1}:${column + 1}`);
    }
    assert.ok(map.sourcesContent.includes(source));
  });
  await t.test('DOM-only attributes cannot prove JSX; exact start and tag are mandatory', async () => {
    const before = await page.$eval('#dom-only', element => window.__plumb.locate(element));
    await page.$eval('#dom-only', (element, stamp) => element.setAttribute('data-plumb-source', stamp), stampAt('<button id="host"'));
    assert.deepEqual(await page.$eval('#dom-only', element => window.__plumb.locate(element)), before);
    for (const params of [{ column: proof.column + 1 }, { tag: 'span' }, { hash: 'deadbeefdead' }, { hash: 'malformed' }, position(source, '</button>')]) {
      assert.deepEqual(await resolve({ ...proof, ...params }), { refused: 'source-mismatch' });
    }
  });
  await t.test('untracked files, dependencies, linked sources and virtual JSX receive no stamps', async () => {
    for (const id of ['/outside.jsx', '/src/excluded.jsx', '/src/linked.tsx', '/node_modules/plumb-stamp-library/index.jsx']) {
      const result = await server.transformRequest(id);
      assert.ok(result, id); assert.ok(!result.code.includes('data-plumb-source'), id);
    }
    const virtual = { name: 'virtual-jsx', resolveId(id) { if (id === 'virtual:stamp') return '\0virtual:stamp.jsx'; },
      load(id) { if (id === '\0virtual:stamp.jsx') return 'export default () => <button />;'; } };
    // Real Vite resolution/load/transform pipeline, not a direct transformer call.
    const virtualServer = await createServer({ ...settings(root), plugins: [plumb({ watch: false }), virtual] });
    try { assert.ok(!(await virtualServer.transformRequest('virtual:stamp')).code.includes('data-plumb-source')); }
    finally { await virtualServer.close(); }
  });
  await t.test('encoded paths preserve delimiters and resolve relative to the project root', async () => {
    const encodedFile = 'src/names&part/Encoded.jsx';
    const compiled = await server.transformRequest('/' + encodedFile);
    const stamp = /src\/names%26part\/Encoded\.jsx:(\d+):(\d+)#([a-f0-9]{12})/.exec(compiled.code);
    assert.ok(stamp, compiled.code);
    assert.equal((await resolve({ source: 'src/names%26part/Encoded.jsx', line: stamp[1], column: stamp[2], hash: stamp[3], tag: 'button', stamp: '1' })).file, encodedFile);
    const delimiterFile = 'src/delimiters:#?%.jsx', text = await readFile(join(root, delimiterFile), 'utf8');
    assert.equal((await resolve({ source: delimiterFile.split('/').map(encodeURIComponent).join('/'), ...position(text, '<button'), hash: hash(text).slice(0, 12), tag: 'button', stamp: '1' })).file, delimiterFile);
  });
  await t.test('stale hash after disk edit refuses retained stamp and unchanged owner fallback', async () => {
    await writeFile(join(root, file), source.replace('Host</button>', 'Edited</button>'));
    assert.deepEqual(await resolve(proof), { refused: 'source-mismatch' });
    const refused = await page.$eval('#host', element => window.__plumb.locate(element, { explain: true }));
    assert.equal(refused.location, null); assert.equal(refused.reason, 'source-mismatch');
  });
});

test('React first warns and serves no stamps; Vitest is skipped', { timeout: 30000 }, async t => {
  const root = await fixture(t);
  // React first: the dev server still starts, says how to get stamps, and serves none.
  const warnings = [];
  const logger = { info() {}, warn: message => warnings.push(message), warnOnce: message => warnings.push(message), error() {}, clearScreen() {}, hasErrorLogged: () => false, hasWarned: false };
  const late = await createServer({ ...settings(root), customLogger: logger, plugins: [react(), plumb({ watch: false })] });
  try {
    assert.match(warnings.join('\n'), /Source stamping is off: plumb\(\) runs after vite:react-babel/);
    assert.ok(!(await late.transformRequest('/src/entry.jsx')).code.includes('data-plumb-source'));
  } finally { await late.close(); }
  // stamp: false keeps the overlay and serves no stamps, for apps that hydrate HTML prerendered elsewhere.
  const off = await createServer({ ...settings(root), plugins: [plumb({ watch: false, stamp: false }), react()] });
  try { assert.ok(!(await off.transformRequest('/src/entry.jsx')).code.includes('data-plumb-source')); } finally { await off.close(); }
  const server = await createServer({ ...settings(root), test: {}, plugins: [react(), plumb({ watch: false })] });
  try {
    assert.ok(!server.config.plugins.some(plugin => plugin.name === 'plumb'));
    const result = await server.transformRequest('/src/entry.jsx');
    assert.ok(!result.code.includes('data-plumb-source'));
  } finally { await server.close(); }
});

test('Vite production build has no injected stamps or overlay', { timeout: 30000 }, async t => {
  const root = await fixture(t);
  // The author-owned prop remains in production; automatic stamps disappear.
  await writeFile(join(root, file), source.replace('data-plumb-source="author"', '').replace("'data-plumb-source': 'spread', ", ''));
  await build({ ...settings(root), plugins: [react(), plumb({ watch: false })], build: { outDir: join(root, 'dist') } });
  const html = await readFile(join(root, 'dist/index.html'), 'utf8');
  assert.ok(!html.includes('__plumb'));
  for (const asset of await readdir(join(root, 'dist/assets'))) {
    const code = await readFile(join(root, 'dist/assets', asset), 'utf8');
    assert.ok(!code.includes('data-plumb-source'), asset);
  }
});
