import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const repo = fileURLToPath(new URL('../', import.meta.url));
const run = root => {
  const result = spawnSync(process.execPath, [join(repo, 'dist/cli.js'), 'check', '--root', root, '--json'], { encoding: 'utf8', timeout: 15_000 });
  assert.ifError(result.error);
  assert.equal(result.stderr, '');
  assert.equal(result.status, 0, result.stdout);
  return JSON.parse(result.stdout);
};

test('numeric utilities and compiled spacing expressions keep only used configured ladder steps alive', async t => {
  const root = await mkdtemp(join(repo, 'fixtures/.dead-spacing-ladder-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'fixtures/tailwind-min'), root, { recursive: true, filter: p => !p.includes('.plumb-cache') });
  await rm(join(root, 'plumber.config.ts'));
  await writeFile(join(root, 'plumber.config.mjs'), `export default {
    decisions: { spacing: { callers: ['primitive', 'semantic'], from: () =>
      [0, 0.5, 2, 3, 4, 6, 8, 10].map(step => ({
        family: 'spacing', name: '--spacing-' + step, value: 'calc(var(--spacing) * ' + step + ')',
        refs: ['calc(var(--spacing) * ' + step + ')'], origin: 'project', tier: 'primitive',
        why: 'configured spacing ladder',
        source: { file: 'src/styles.css', line: 1 },
      })) }, color: { callers: ['primitive', 'semantic'] } },
  };`);
  await writeFile(join(root, 'src/styles.css'), '@import "tailwindcss"; .compiled { gap: calc(var(--spacing) * 8); } .literal { padding: 40px; margin: 0px; }');
  const source = 'import "./styles.css"; <div className="hover:gap-0 gap-0.5 gap-3 px-4 p-6 compiled literal" />;';
  await writeFile(join(root, 'src/App.tsx'), source);
  await writeFile(join(root, 'src/Button.tsx'), '');
  await writeFile(join(root, 'src/Card.tsx'), '');

  for (let i = 0; i < 2; i++) {
    const report = run(root);
    const dead = report.findings.filter(f => f.rule === 'dead/spacing').flatMap(f => f.decisions.map(d => d.name));
    for (const step of [0, 0.5, 3, 4, 6, 8]) assert.ok(!dead.includes('--spacing-' + step), `used step ${step} reported dead`);
    assert.deepEqual(dead, ['--spacing-10', '--spacing-2']);
    assert.deepEqual(report.deadDecisions.spacing, { total: 8, used: 6, exported: 0, dead: 2 });
  }
  await writeFile(join(root, 'src/App.tsx'), source.replace('hover:gap-0 ', ''));
  const report = run(root);
  assert.deepEqual(report.findings.filter(f => f.rule === 'dead/spacing').flatMap(f => f.decisions.map(d => d.name)), ['--spacing-0', '--spacing-10', '--spacing-2']);
  assert.deepEqual(report.deadDecisions.spacing, { total: 8, used: 5, exported: 0, dead: 3 });
});
