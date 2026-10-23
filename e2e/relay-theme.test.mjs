import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));
function run(directory, command = 'check') {
  const result = spawnSync(process.execPath, [join(root, 'dist/cli.js'), command, '--root', directory, '--json', ...(command === 'check' ? ['--all'] : [])], { encoding: 'utf8', timeout: 15000 });
  assert.ifError(result.error);
  assert.equal(result.stderr, '');
  assert.ok([0, 1].includes(result.status), result.stdout);
  return JSON.parse(result.stdout);
}

test('Relay inline theme resolves root aliases, length arithmetic and light/dark colours across families', async t => {
  const directory = await mkdtemp(join(root, 'fixtures/.relay-theme-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await cp(join(root, 'fixtures/relay-theme'), directory, { recursive: true, filter: path => !path.includes('node_modules') && !path.includes('.plumber') });
  const file = join(directory, 'src/styles.css');
  await writeFile(file, await readFile(file, 'utf8') + `
:root { --relay-space: 4px; --relay-type: 18px; --relay-time: 150ms; --relay-shadow: 0 1px 2px #12805c; --relay-z: 7; --relay-opacity: .7; --relay-size: 24px; }
@theme inline {
  --spacing-relay: calc(var(--relay-space) * 3);
  --text-relay: var(--relay-type);
  --duration-relay: var(--relay-time);
  --shadow-relay: var(--relay-shadow);
  --z-relay: var(--relay-z);
  --opacity-relay: var(--relay-opacity);
  --size-relay: var(--relay-size);
}
`);
  const report = run(directory), decisions = run(directory, 'decisions');
  for (const [name, expected] of Object.entries({
    '--radius-sm': '4px', '--radius-md': '6px', '--radius-lg': '8px', '--radius-xl': '12px',
    '--color-primary': '#12805c', '--spacing-relay': '12px', '--text-relay': '18px', '--duration-relay': '150ms',
    '--shadow-relay': '0 1px 2px #12805c', '--z-relay': '7', '--opacity-relay': '.7', '--size-relay': '24px',
  })) assert.equal(decisions.find(d => d.name === name)?.resolved, expected, name);
  assert.equal(decisions.find(d => d.name === '--color-primary').resolvedModes.dark, '#2fbf8d');
  const radius = report.findings.find(f => f.family === 'radius' && f.sites.some(s => s.text === 'rounded-[12px]'));
  assert.ok(radius);
  assert.ok(radius.decisions.some(d => d.name === '--radius-xl' && d.use.class === 'rounded-xl'));
  assert.match(radius.fix, /rounded-xl/);
  assert.ok(!report.findings.some(f => f.family === 'radius' && f.sites.some(s => s.text === 'rounded-xl')));
  const color = report.findings.find(f => f.family === 'color' && f.sites.some(s => s.text === 'bg-[#12805c]'));
  assert.ok(color?.decisions.some(d => d.name === '--color-primary'));
  assert.ok(!report.findings.some(f => f.family === 'color' && f.sites.some(s => s.text === 'bg-primary')));
  // Warm edits also exercise rem/px arithmetic, missing values, cycles and
  // conditional sources without pretending to compute the cascade.
  await writeFile(file, (await readFile(file, 'utf8')).replace('--radius: 8px', '--radius: .5rem') + `
:root { --cycle-a: var(--cycle-b); --cycle-b: var(--cycle-a); --conditional: 8px; }
@media (width > 800px) { :root { --conditional: 12px; } }
@theme inline { --radius-cycle: var(--cycle-a); --radius-missing: var(--absent); --radius-conditional: var(--conditional); }
`);
  const edited = run(directory, 'decisions');
  assert.equal(edited.find(d => d.name === '--radius-xl').resolved, '12px');
  for (const name of ['--radius-cycle', '--radius-missing', '--radius-conditional']) assert.equal(edited.find(d => d.name === name).resolved, undefined, name);
});
