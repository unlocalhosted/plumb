// The craft spec (docs/briefs/craft-spec.md), layer 1: one standard as data, tuned by the project's config, printed with
// where every value came from, and handed to the page that judges against it. Real CLI binary, real config files, a
// real Vite dev server with the plugin and real Chromium for the overlay's copy.
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
const built = () => readFile(cli).then(() => true, () => false);

async function fixture(t, { config, app } = {}) {
  const root = await mkdtemp(join(repo, 'fixtures/.spec-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'overlay/demo/src'), join(root, 'src'), { recursive: true });
  await cp(join(repo, 'overlay/demo/index.html'), join(root, 'index.html'));
  await writeFile(join(root, 'package.json'), '{"type":"module","dependencies":{"react":"*","vite":"*"}}');
  if (config) await writeFile(join(root, 'plumber.config.mjs'), config);
  if (app) await writeFile(join(root, 'src/App.jsx'), app);
  return root;
}
const plumber = (args, root) => run('node', [cli, ...args, '--root', root], { cwd: repo, env: { ...process.env, PLUMBER_CACHE_DIR: join(root, '.cache') }, timeout: 120000 })
  .then((r) => ({ code: 0, ...r }), (e) => ({ code: e.code, stdout: e.stdout, stderr: e.stderr }));
async function serve(t, root) {
  const server = await createServer({ root, cacheDir: join(root, '.vite-cache'), configFile: false, plugins: [tailwindcss(), plumb({ watch: false })],
    oxc: { jsx: { runtime: 'automatic', development: true } }, logLevel: 'silent', server: { host: '127.0.0.1', port: 0 } });
  t.after(() => server.close());
  await server.listen();
  return `http://127.0.0.1:${server.httpServer.address().port}/`;
}
const ruleOf = (spec, id) => spec.principles.flatMap((p) => p.rules).find((r) => r.id === id);

const TUNED = `export default {
  craft: {
    preset: 'strict',
    values: { legibility: { measure: { max: 70, want: { max: 70 } } }, access: { 'hit-target': { min: 40 } } },
    rules: { 'craft/hairline': false, 'craft/continuous-corners': { tier: 'advisory' }, 'habits/real-quotes': { severity: 'info' } },
    tokens: { create: false, name: '{family}-{job}' },
  },
};
`;

test('plumber spec: without a config it is the standard; every value says so', { timeout: 60000 }, async (t) => {
  if (!await built()) return t.skip('Run npm run build first.');
  const root = await fixture(t);
  const text = await plumber(['spec'], root);
  assert.equal(text.code, 0, text.stderr);
  assert.match(text.stdout, /^React Plumber craft spec: preset balanced, the standard\n/);
  assert.match(text.stdout, /access · tier 0 access/);
  assert.match(text.stdout, /craft\/hit-target\s+on · tier access/);
  assert.match(text.stdout, /\n\s+min\s+24\s+standard\n/);
  assert.match(text.stdout, /tokens · create yes \(standard\) · name \{family\}-\{job\} \(standard\)\n  file src\/styles\.css · @theme/);
  const json = await plumber(['spec', '--json'], root);
  const spec = JSON.parse(json.stdout);
  assert.equal(spec.preset, 'balanced');
  assert.deepEqual(spec.principles.map((p) => p.id), ['access', 'legibility', 'theme', 'rhythm', 'shape', 'depth', 'colour', 'hierarchy', 'alignment', 'motion', 'taste']);
  const measure = ruleOf(spec, 'craft/measure');
  assert.deepEqual([measure.enabled, measure.tierName, measure.values.max, measure.values.want, measure.from], [true, 'legibility', 90, { min: 45, max: 75, target: 65 }, {}]);
  const quotes = ruleOf(spec, 'habits/real-quotes');
  assert.deepEqual([quotes.habit, quotes.severity, quotes.tierName], [true, 'warn', 'legibility']);
  assert.deepEqual(spec.tokens, { create: true, name: '{family}-{job}', file: 'src/styles.css', shape: 'theme', hash: spec.tokens.hash, new: false, importedFrom: null });
  assert.match(spec.tokens.hash, /^[a-f0-9]+$/);
});

test('plumber spec: a project config tunes values, presets sit under them, rules go off or change tier, and each line names its source', { timeout: 60000 }, async (t) => {
  if (!await built()) return t.skip('Run npm run build first.');
  const root = await fixture(t, { config: TUNED });
  const text = await plumber(['spec'], root);
  assert.equal(text.code, 0, text.stderr);
  assert.match(text.stdout, /^React Plumber craft spec: preset strict, \d+ rules tuned \(plumber\.config\.mjs\)\n/);
  assert.match(text.stdout, /craft\/measure[^\n]*\n[^\n]*chars\s+240\s+standard\n[^\n]*max\s+70\s+plumber\.config\.mjs\n[^\n]*want\.min\s+45\s+standard\n[^\n]*want\.max\s+70\s+plumber\.config\.mjs/);
  assert.match(text.stdout, /craft\/hit-target[^\n]*\n[^\n]*min\s+40\s+plumber\.config\.mjs/);
  assert.match(text.stdout, /craft\/contrast[^\n]*\n[^\n]*small\s+75\s+preset strict/);
  assert.match(text.stdout, /craft\/hairline\s+off · tier craft\s+on\/off: plumber\.config\.mjs/);
  assert.match(text.stdout, /craft\/continuous-corners\s+on · tier advisory\s+tier: plumber\.config\.mjs/);
  assert.match(text.stdout, /craft\/overshoot\s+on · tier craft\s+tier: preset strict/);
  assert.match(text.stdout, /habits\/real-quotes\s+on · info\s+severity: plumber\.config\.mjs/);
  assert.match(text.stdout, /tokens · create no \(plumber\.config\.mjs\)/);
  // one rule
  const one = await plumber(['spec', '--rule', 'craft/measure'], root);
  assert.equal(one.code, 0, one.stderr);
  assert.match(one.stdout, /craft\/measure/);
  assert.doesNotMatch(one.stdout, /craft\/contrast|tokens ·/);
  const json = JSON.parse((await plumber(['spec', '--json', '--rule', 'measure'], root)).stdout);
  assert.deepEqual(json.principles.map((p) => [p.id, p.rules.map((r) => r.id)]), [['legibility', ['craft/measure']]]);
  assert.deepEqual(json.principles[0].rules[0].from, { max: 'config', 'want.max': 'config' });
  const unknown = await plumber(['spec', '--rule', 'craft/measurr'], root);
  assert.equal(unknown.code, 2);
  assert.match(unknown.stderr, /Unknown craft rule craft\/measurr/);
});

test('plumber spec: a wrong config says what to set, where, and what it could have meant', { timeout: 60000 }, async (t) => {
  if (!await built()) return t.skip('Run npm run build first.');
  const cases = [
    [`export default { craft: { values: { legibility: { measure: { max: '70' } } } } };`, /Set craft\.values\.legibility\.measure\.max to a number\./],
    [`export default { craft: { values: { legibilty: {} } } };`, /Remove unknown key "craft\.values\.legibilty"; principles: access, legibility.*Did you mean legibility\?/],
    [`export default { craft: { values: { access: { measure: { max: 70 } } } } };`, /Move craft\.values\.access\.measure to craft\.values\.legibility\.measure\./],
    [`export default { craft: { rules: { 'craft/measurr': false } } };`, /Unknown rule "craft\/measurr" in craft\.rules\. Did you mean craft\/measure\?/],
    [`export default { craft: { rules: { 'craft/measure': { tier: 'high' } } } };`, /Set craft\.rules\["craft\/measure"\]\.tier to one of access, legibility, theme, craft, advisory\./],
    [`export default { craft: { preset: 'loose' } };`, /Set craft\.preset to one of balanced, strict, relaxed\./],
    [`export default { craft: { tokens: { create: 'no' } } };`, /Set craft\.tokens\.create to a boolean\./],
  ];
  for (const [config, expected] of cases) {
    const root = await fixture(t, { config });
    const result = await plumber(['spec'], root);
    assert.equal(result.code, 2, `${config}\n${result.stdout}`);
    assert.match(result.stderr, expected, config);
  }
});

test('the page judges against the project’s spec: the overlay asks the server, and plumber craft --json says which standard it used', { timeout: 240000 }, async (t) => {
  if (!await built()) return t.skip('Run npm run build first.');
  const root = await fixture(t, { config: TUNED, app: `export function App() { return <main className="p-s4 text-body text-ink">Plain</main>; }\n` });
  const url = await serve(t, root);
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true, executablePath: (process.env.PLUMBER_CHROMIUM ?? process.env.PLUMB_CHROMIUM) || undefined });
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.goto(url);
  await page.waitForFunction(() => window.__plumb?.overlay);
  await page.evaluate(() => window.__plumb.ready());
  // the route the overlay rides on
  const served = await page.evaluate(async () => { const { request } = await import('/__plumb/src/api.js'); return request('spec', {}); });
  assert.equal(served.preset, 'strict');
  assert.equal(ruleOf(served, 'craft/measure').values.max, 70);
  assert.equal(ruleOf(served, 'craft/hairline').enabled, false);
  assert.equal(served.tokens.file, 'src/styles.css');
  // and the headless run reports the spec it judged with
  const result = await run('node', [cli, 'craft', '--url', url, '--json', '--root', root, '--no-pairs', '--no-probe'], { cwd: repo, env: process.env, timeout: 180000 }).then((r) => r, (e) => e);
  const report = JSON.parse(result.stdout);
  assert.equal(report.spec?.preset, 'strict', result.stderr);
  assert.equal(ruleOf(report.spec, 'craft/hit-target').values.min, 40);
  assert.ok(!('spec' in report.routes[0]));
});
