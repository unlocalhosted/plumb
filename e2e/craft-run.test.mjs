// Layer 5 of the craft engine: `plumber craft` against a running dev server, headless. The real CLI binary, a real Vite
// server with the plugin, real Chromium; findings come back as rule + source line, SARIF is written, a clean page exits 0.
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { createServer } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { plumb } from '@unlocalhosted/react-plumber/vite';

const repo = fileURLToPath(new URL('../', import.meta.url));
const cli = join(repo, 'dist/cli.js');
const run = promisify(execFile);

async function fixture(t, app, extra = {}) {
  const root = await mkdtemp(join(repo, 'fixtures/.craft5-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'overlay/demo/src'), join(root, 'src'), { recursive: true });
  await cp(join(repo, 'overlay/demo/index.html'), join(root, 'index.html'));
  await writeFile(join(root, 'src/App.jsx'), app);
  const server = await createServer({ root, cacheDir: join(root, '.vite-cache'), configFile: false, plugins: [tailwindcss(), plumb({ watch: false })],
    oxc: { jsx: { runtime: 'automatic', development: true } }, logLevel: 'silent', server: { host: '127.0.0.1', port: 0 } });
  t.after(() => server.close());
  await server.listen();
  return { root, url: `http://127.0.0.1:${server.httpServer.address().port}/` };
}
const plumber = (args) => run('node', [cli, 'craft', ...args], { cwd: repo, env: process.env, timeout: 180000 }).then((r) => ({ code: 0, ...r }), (e) => ({ code: e.code, stdout: e.stdout, stderr: e.stderr }));
const lineOf = (source, id) => source.slice(0, source.indexOf(`id="${id}"`)).split('\n').length;

const BROKEN = `export function App() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-s6 px-s4 pb-s6">
      <button id="pad" className="rounded-control bg-surface p-s2 text-body">Save</button>
      <span id="track" className="text-[11px] uppercase">Status</span>
      <div style={{ height: 1600 }} />
      <span id="faint" className="text-[12px] text-[#b8bcc2]">faint words, far below the fold</span>
    </main>
  );
}
`;
const CLEAN = `export function App() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-s6 px-s4 pb-s6">
      <button className="rounded-control bg-surface px-s4 py-s2 text-body">Save</button>
      <span className="text-[11px] uppercase tracking-wider">Status</span>
      <span className="text-body text-ink">clear words</span>
    </main>
  );
}
`;

test('plumber craft names each broken rule at its source line, writes SARIF, and exits 1', { timeout: 240000 }, async (t) => {
  if (!await readFile(cli).then(() => true, () => false)) return t.skip('Run npm run build first.');
  const { root, url } = await fixture(t, BROKEN);
  const sarifPath = join(root, 'craft.sarif');
  const result = await plumber(['--url', url, '--json', '--sarif', sarifPath, '--root', root]);
  assert.equal(result.code, 1, result.stderr);
  const report = JSON.parse(result.stdout);
  const at = (rule) => report.findings.filter((f) => f.rule === `craft/${rule}`).map((f) => f.sites[0]);
  for (const [rule, id] of [['button-padding', 'pad'], ['tracking', 'track'], ['contrast', 'faint']]) {
    const sites = at(rule);
    assert.ok(sites.some((s) => s.file.endsWith('src/App.jsx') && s.line === lineOf(BROKEN, id)), `${rule}: expected src/App.jsx:${lineOf(BROKEN, id)}, got ${JSON.stringify(sites)}`);
  }
  const sarif = JSON.parse(await readFile(sarifPath, 'utf8'));
  const results = sarif.runs[0].results;
  assert.equal(sarif.version, '2.1.0');
  assert.ok(results.some((r) => r.ruleId === 'craft/tracking' && r.locations[0].physicalLocation.region.startLine === lineOf(BROKEN, 'track')));
  assert.ok(results.every((r) => r.locations[0].physicalLocation.artifactLocation.uri.endsWith('src/App.jsx')));
  // the human report names the same lines
  const text = await plumber(['--url', url, '--root', root]);
  assert.equal(text.code, 1);
  assert.match(text.stdout, new RegExp(`src/App.jsx:${lineOf(BROKEN, 'pad')}:\\d+  craft/button-padding`));
});

test('plumber craft on a clean page prints no findings and exits 0', { timeout: 240000 }, async (t) => {
  if (!await readFile(cli).then(() => true, () => false)) return t.skip('Run npm run build first.');
  const { root, url } = await fixture(t, CLEAN);
  const result = await plumber(['--url', url, '--json', '--root', root, '--routes', '/']);
  assert.equal(result.code, 0, result.stdout + result.stderr);
  assert.deepEqual(JSON.parse(result.stdout).findings, []);
});

test('plumber craft says what to do when nothing is listening', { timeout: 60000 }, async () => {
  if (!await readFile(cli).then(() => true, () => false)) return;
  const result = await plumber(['--url', 'http://127.0.0.1:9/', '--timeout', '3000']);
  assert.equal(result.code, 2);
  assert.match(result.stderr, /dev server/);
});
