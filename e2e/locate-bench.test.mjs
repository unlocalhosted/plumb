// The locate bench, end to end: two showcase screens on the stamped Vite host and on a generated Next app, through
// the real harness (bench/locate/run.mjs). The report must carry the fields the baseline is read from, and the stamped
// host must agree with its own ground truth on every judged element.
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { main } from '../bench/locate/run.mjs';
import { swapUsedMB } from '../bench/locate/lib.mjs';

const repo = fileURLToPath(new URL('../', import.meta.url));

test('locate bench: 2 screens on vite-stamped and next-turbopack, stamped host matches its own truth', { timeout: 600000 }, async (t) => {
  if (swapUsedMB() > 512 && !process.env.PLUMB_BENCH_FORCE) return t.skip('Swap is in use; set PLUMB_BENCH_FORCE=1 to run anyway.');
  const dir = await mkdtemp(join(tmpdir(), 'locate-bench-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const out = join(dir, 'report');
  await main(['--hosts', 'vite-stamped,next-turbopack', '--corpus', 'showcase', '--screens', '01,50', '--cap', '40', '--out', out, '--ignore-swap']);
  const report = JSON.parse(await readFile(out + '.json', 'utf8'));
  const markdown = await readFile(out + '.md', 'utf8');
  assert.match(markdown, /## The 10 worst misses/);
  assert.deepEqual(Object.keys(report.summary.showcase).sort(), ['next-turbopack', 'vite-stamped']);
  for (const host of ['vite-stamped', 'next-turbopack']) {
    const s = report.summary.showcase[host];
    for (const field of ['elements', 'found', 'foundPct', 'judged', 'exactPct', 'lineOnlyPct', 'fileOnlyPct', 'wrongFilePct', 'cold', 'warm', 'refusals', 'via']) assert.ok(field in s, `${host} has ${field}`);
    assert.ok(s.elements > 0 && s.cold.p95 !== null && s.warm.p95 !== null, host);
    assert.deepEqual(Object.keys(report.perScreen.showcase[host]).sort(), ['01', '50'], host + ' per screen');
  }
  const stamped = report.summary.showcase['vite-stamped'];
  assert.ok(stamped.judged > 0, 'the stamped host has judged elements');
  assert.equal(stamped.exactPct, 100, JSON.stringify(stamped.counts));
  for (const row of report.rows) {
    for (const field of ['host', 'screen', 'key', 'tag', 'coldMs', 'verdict']) assert.ok(field in row, field);
  }
  assert.ok(repo);
});
