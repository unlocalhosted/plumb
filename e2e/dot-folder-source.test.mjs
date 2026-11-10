// With no `source` configured, your code is what the rule says it is (src/source-identity.ts), with two more parts of
// the default selection: a tool's config file (vite.config.ts, tailwind.config.js, plumber.config.ts…) is never your
// code, and a dot folder (.storybook/, .theme/) is yours only where the app's own import graph reaches it, the way a
// linked package is. Proved through the real boundary: the CLI's file counts, and on Vite the component imported from
// .storybook/ is stamped and its element resolves to that file.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { plumb } from '../dist/hosts/vite.js';

const repo = fileURLToPath(new URL('../', import.meta.url));
async function file(root, path, text) { await mkdir(dirname(join(root, path)), { recursive: true }); await writeFile(join(root, path), text); }
const DECO = `export function Deco() { return <aside id="deco" className="p-[13px]">Decorator</aside>; }\n`;
// the demo app, with a dot folder holding a component and a tool's config file beside the app's own
async function app(t, { imports }) {
  const root = await mkdtemp(join(repo, 'fixtures/.dot-source-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'overlay/demo/src'), join(root, 'src'), { recursive: true });
  await cp(join(repo, 'overlay/demo/index.html'), join(root, 'index.html'));
  await file(root, 'package.json', '{"name":"dot-source","private":true,"type":"module"}');
  await file(root, '.storybook/Deco.jsx', DECO);
  await file(root, '.storybook/preview.js', 'export const parameters = {};\n');
  await file(root, 'vite.config.ts', "export default { plugins: [] };\n");
  await file(root, 'tailwind.config.js', 'export default {};\n');
  await file(root, 'src/App.jsx', `${imports ? "import { Deco } from '../.storybook/Deco.jsx';\n" : ''}export function App() {
  return <main className="mx-auto flex max-w-3xl flex-col gap-s6 px-s4 py-s6">
    <section id="a" className="rounded-card bg-surface p-[18px] text-body">One</section>
    ${imports ? '<Deco />' : ''}
  </main>;
}
`);
  return root;
}
function check(root) {
  const result = spawnSync(process.execPath, [join(repo, 'dist/cli.js'), 'check', '--root', root, '--json'], { encoding: 'utf8', timeout: 120_000, maxBuffer: 64 * 1024 * 1024 });
  assert.ok([0, 1].includes(result.status), result.stderr + result.stdout);
  return JSON.parse(result.stdout);
}
const sources = (report) => report.findings.flatMap((f) => f.sites.map((s) => s.file.replace(report.root + '/', ''))).sort();

test('a dot folder is yours where the app imports it, and a tool config file never is', { timeout: 180000 }, async (t) => {
  const without = check(await app(t, { imports: false }));
  const withDeco = check(await app(t, { imports: true }));
  // the demo's src: App, Craft, Rules, Team, entry (jsx) + rules/*, styles.css; neither config file, nor .storybook/ unimported
  assert.equal(without.files.other, 0, JSON.stringify(without.files));
  assert.equal(withDeco.files.other, 0, JSON.stringify(withDeco.files));
  assert.equal(withDeco.files.jsx, without.files.jsx + 1, `${JSON.stringify(without.files)} → ${JSON.stringify(withDeco.files)}`);
  assert.equal(withDeco.files.css, without.files.css);
  assert.ok(!sources(without).some((f) => f.startsWith('.storybook/')), JSON.stringify(sources(without)));
  assert.ok(sources(withDeco).includes('.storybook/Deco.jsx'), JSON.stringify(sources(withDeco)));
  assert.ok(!sources(withDeco).includes('.storybook/preview.js'), 'the import graph reaches Deco, not preview');
});

test('on Vite the component imported from .storybook/ is stamped and its element resolves to that file', { timeout: 180000 }, async (t) => {
  let launched;
  try { launched = await chromium.launch({ headless: true, executablePath: (process.env.PLUMBER_CHROMIUM ?? process.env.PLUMB_CHROMIUM) || undefined }); }
  catch (error) { if (!/Executable doesn't exist/.test(error.message)) throw error; t.skip('Playwright Chromium missing'); return; }
  t.after(() => launched.close());
  const root = await app(t, { imports: true });
  const server = await createServer({ root, cacheDir: join(root, '.vite-cache'), configFile: false, plugins: [tailwindcss(), plumb({ watch: false })],
    optimizeDeps: { noDiscovery: true, include: ['react', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'react-dom', 'react-dom/client'] },
    oxc: { jsx: { runtime: 'automatic', development: true } }, logLevel: 'silent', server: { host: '127.0.0.1', port: 0 } });
  t.after(() => server.close());
  await server.listen();
  const page = await launched.newPage({ reducedMotion: 'reduce', viewport: { width: 1200, height: 900 } });
  const errors = []; page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/`);
  await page.waitForFunction(() => window.__plumb?.overlay); await page.evaluate(() => window.__plumb.ready());
  await page.waitForSelector('#deco');
  assert.match(await page.getAttribute('#deco', 'data-plumb-source'), /(?:^|\/)\.storybook\/Deco\.jsx:1:33#[a-f0-9]{12}$/);
  const site = await page.evaluate(() => window.__plumb.site(document.getElementById('deco')));
  assert.ok(site && !site.error, JSON.stringify(site));
  assert.ok(site.findings.some((f) => f.sites.some((s) => s.text === 'p-[13px]' && s.file.endsWith('/.storybook/Deco.jsx'))), JSON.stringify(site).slice(0, 400));
  assert.deepEqual(errors, []);
});
