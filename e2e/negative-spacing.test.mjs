import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
const root = fileURLToPath(new URL('../', import.meta.url));
function run() {
  const result = spawnSync(process.execPath, [join(root, 'dist/cli.js'), 'check', '--root', join(root, 'fixtures/negative-spacing'), '--all', '--json'], { encoding: 'utf8', timeout: 15000 });
  assert.ifError(result.error); assert.equal(result.stderr, ''); assert.equal(result.status, 1, result.stdout.slice(0, 1000));
  return JSON.parse(result.stdout);
}
test('negative spacing utility steps share the positive ladder across margins, sibling space, insets and scroll margins', () => {
  const report = run();
  const prefixes = ['m', 'mx', 'my', 'ms', 'me', 'mbs', 'mbe', 'mt', 'mr', 'mb', 'ml', 'space-x', 'space-y', 'inset', 'inset-x', 'inset-y', 'inset-s', 'inset-e', 'inset-bs', 'inset-be', 'start', 'end', 'top', 'right', 'bottom', 'left', 'scroll-m', 'scroll-mx', 'scroll-my', 'scroll-ms', 'scroll-me', 'scroll-mbs', 'scroll-mbe', 'scroll-mt', 'scroll-mr', 'scroll-mb', 'scroll-ml'];
  for (const prefix of prefixes) for (const sign of ['-', '']) {
    const token = `${sign}${prefix}-1.5`;
    assert.ok(report.declarations.some(d => d.site.text === token), `${token} compiles`);
    assert.ok(!report.findings.some(f => f.sites.some(s => s.text === token)), token);
    const values = report.declarations.filter(d => d.site.text === token && !d.prop.startsWith('--')).map(d => d.resolved);
    assert.ok(values.every(value => value === '0px' || value === `${sign}6px`), `${token}: ${values}`);
  }
  for (const token of ['-m-[7px]', '-space-x-[7px]', '-space-y-[7px]', '-inset-[7px]', '-top-[7px]']) {
    assert.ok(report.findings.some(f => f.family === 'spacing' && f.sites.some(s => s.text === token)), `${token} stays off scale`);
  }
  // Translate is compiled but is not currently part of the spacing judge.
  for (const token of ['translate-1.5', '-translate-1.5', 'translate-x-1.5', '-translate-x-1.5', 'translate-y-1.5', '-translate-y-1.5', 'translate-z-1.5', '-translate-z-1.5']) {
    assert.ok(report.declarations.some(d => d.site.text === token && d.prop === 'translate'));
    assert.ok(!report.findings.some(f => f.family === 'spacing' && f.sites.some(s => s.text === token)));
  }
  assert.deepEqual(run().findings, report.findings, 'warm result agrees');
});
