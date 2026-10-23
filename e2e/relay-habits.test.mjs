import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));
async function fixture(t) {
  const dir = await mkdtemp(join(root, 'fixtures/.relay-habits-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await cp(join(root, 'fixtures/relay-habits'), dir, { recursive: true });
  return dir;
}
function check(dir, args = ['--json']) {
  const result = spawnSync(process.execPath, [join(root, 'dist/cli.js'), 'check', '--root', dir, '--rule', 'habits', ...args], { encoding: 'utf8', timeout: 15000 });
  assert.ifError(result.error);
  assert.equal(result.stderr, '');
  assert.ok([0, 1].includes(result.status), result.stdout);
  return args.includes('--json') ? JSON.parse(result.stdout) : result.stdout;
}

test('Relay hover utilities use compiled media gates; legacy and genuinely ungated CSS still fail cold and warm', async t => {
  const dir = await fixture(t);
  for (let run = 0; run < 2; run++) {
    const report = check(dir);
    const findings = report.findings.filter(f => f.rule === 'habits/hover-gate');
    assert.ok(findings.every(f => f.sites.every(s => s.file.endsWith('styles.css'))), 'Tailwind v4 hover/group-hover utilities already require hover capability');
    assert.deepEqual(findings.map(f => f.declaration.owner.name).sort(), ['.alternative:hover', '.disjunction:hover', '.legacy:hover', '.negated-hover:hover', '.pointer-only:hover']);
    if (run) assert.equal(report.timing.cacheMisses, 0);
  }
});
