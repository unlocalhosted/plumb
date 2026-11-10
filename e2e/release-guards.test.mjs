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

// R6 of docs/briefs/project-detection-design.md: consumers read facts; only src/project-facts/ reads the disk to
// decide root, workspace, package manager, host, styling or libraries. A presence check on one of these names
// outside that folder is the pattern that produced the pnpm-workspace.yaml bug.
test('no file-presence decision about project identity lives outside src/project-facts/', async () => {
  const { readdir } = await import('node:fs/promises');
  const src = new URL('../src/', import.meta.url);
  const names = /pnpm-workspace|workspaces|package-lock|pnpm-lock|yarn\.lock|bun\.lockb?|deno\.lock|vite\.config|next\.config|rollup\.config|webpack\.config|tailwindcss|components\.json|\.gitmodules|'\.git'|"\.git"/;
  const offenders = [];
  for (const entry of await readdir(src, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.ts') || entry.parentPath.includes('/project-facts')) continue;
    const file = join(entry.parentPath, entry.name), text = await readFile(file, 'utf8');
    text.split('\n').forEach((line, index) => {
      if (/\bexistsSync\s*\(|\baccessSync\s*\(|\bstatSync\s*\(/.test(line) && names.test(line)) offenders.push(`${file.slice(file.indexOf('/src/') + 1)}:${index + 1}: ${line.trim()}`);
      // Loading the Tailwind compiler from an entry's folder is not a version probe; the two probes are.
      if (/\.resolve\(\s*['"](?:tailwindcss\/package\.json|react)['"]\s*\)/.test(line)) offenders.push(`${file.slice(file.indexOf('/src/') + 1)}:${index + 1}: ${line.trim()}`);
    });
  }
  assert.deepEqual(offenders, [], 'route these through projectFacts / the detectors in src/project-facts/');
});

// docs/briefs/engine-architecture-review.md, step 1: a stamp is built, taken apart and turned into a file in
// src/stamp.ts only. When its path changed meaning and the census still read it the old way, every kept reading was
// dropped in silence; the attribute's name or the stamp's shape written out anywhere else is how that happens again.
test('no stamp is built or taken apart outside src/stamp.ts', async () => {
  const { readdir } = await import('node:fs/promises');
  const src = new URL('../src/', import.meta.url);
  const offenders = [];
  for (const entry of await readdir(src, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.ts') || entry.name === 'stamp.ts') continue;
    const file = join(entry.parentPath, entry.name), text = await readFile(file, 'utf8');
    text.split('\n').forEach((line, index) => {
      const code = line.replace(/^\s*(?:\/\/|\*|\/\*).*$/, '');
      if (/['"`[ ]data-plumb-source|:\\d\+:\\d\+|#\(\[a-f0-9\]/.test(code)) offenders.push(`${file.slice(file.indexOf('/src/') + 1)}:${index + 1}: ${line.trim().slice(0, 120)}`);
    });
  }
  assert.deepEqual(offenders, [], 'use STAMP_ATTRIBUTE, parseStamp, formatStamp and stampedFile from src/stamp.ts');
});

// The same on the page: overlay/src/stamp.js is the overlay's only reader of the attribute and the shape. Before it,
// 19 files held 57 copies, three of them comparing a stamp's file with the server's in three different ways.
test('no stamp is read or taken apart in the overlay outside overlay/src/stamp.js', async () => {
  const { readdir } = await import('node:fs/promises');
  const src = new URL('../overlay/src/', import.meta.url);
  const offenders = [];
  for (const name of await readdir(src)) {
    if (!name.endsWith('.js') || name === 'stamp.js') continue;
    const text = await readFile(new URL(name, src), 'utf8');
    text.split('\n').forEach((line, index) => {
      const code = line.replace(/^\s*(?:\/\/|\*|\/\*).*$/, '').replace(/\/\/ .*$/, '');
      if (/data-plumb-source|:\\d\+:\\d\+#|\(\\d\+\):\(\\d\+\)#/.test(code)) offenders.push(`overlay/src/${name}:${index + 1}: ${line.trim().slice(0, 120)}`);
    });
  }
  assert.deepEqual(offenders, [], 'use stampOf, placeOf, parseStamp, sameStamp, atPlace and stampNames from overlay/src/stamp.js');
});
