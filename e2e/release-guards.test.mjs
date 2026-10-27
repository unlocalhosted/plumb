// Release audit (docs/briefs/release-audit.md): the token write takes one CSS value and nothing that could change the
// stylesheet's shape. Real CLI build, real dev server with the plugin, real Chromium, the overlay's own request.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { chromium } from 'playwright';
import { built, fixture } from './helpers/craft-headless.mjs';

const launch = () => chromium.launch({ executablePath: process.env.PLUMBER_CHROMIUM || process.env.PLUMB_CHROMIUM || undefined });

const APP = `export function App() {
  return <main className="p-s4"><span className="text-[11px] uppercase">Status</span></main>;
}
`;

test('a token value that could end the declaration, open a comment or leave a string open is refused, and the theme is untouched', { timeout: 300000 }, async (t) => {
  if (!await built()) return t.skip('Run npm run build first.');
  const { root, url } = await fixture(t, APP);
  const browser = await launch();
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.goto(url);
  await page.waitForFunction(() => window.__plumb?.overlay);
  await page.evaluate(() => window.__plumb.ready());
  const spec = await page.evaluate(async () => { const { request } = await import('/__plumb/src/api.js'); return request('spec', {}); });
  assert.equal(spec.tokens.file, 'src/styles.css');
  const before = await readFile(join(root, spec.tokens.file), 'utf8');
  const post = (body) => page.evaluate(async (b) => { const { post } = await import('/__plumb/src/api.js'); return post('token', b).then((r) => r, (e) => ({ error: e.message, status: e.status })); }, body);
  const bad = ['0.06em */', '0.06em /* x', '1 "', "1 '", 'a\\', '0.06em; --x: 1', '1 }', '<x>'];
  for (const value of bad) {
    const refused = await post({ file: spec.tokens.file, hash: spec.tokens.hash, name: '--tracking-audit', value });
    assert.equal(refused.status, 400, `${JSON.stringify(value)} is refused as a usage error: ${JSON.stringify(refused)}`);
    assert.match(refused.error, /one CSS value/);
  }
  assert.equal(await readFile(join(root, spec.tokens.file), 'utf8'), before, 'nothing was written');
  // a value with balanced quotes is one CSS value and goes in
  const ok = await post({ file: spec.tokens.file, hash: spec.tokens.hash, name: '--font-audit', value: '"Inter", sans-serif', why: 'the audit' });
  assert.equal(ok.error, undefined, JSON.stringify(ok));
  assert.deepEqual([ok.written, ok.applied], [true, ['token:--font-audit']]);
  const after = await readFile(join(root, spec.tokens.file), 'utf8');
  assert.match(after, /\/\* why: the audit \*\/\n  --font-audit: "Inter", sans-serif;\n/);
  assert.equal(after.split('{').length, before.split('{').length, 'the same blocks as before');
});
