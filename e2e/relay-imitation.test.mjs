import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
const root = fileURLToPath(new URL('../', import.meta.url));
function run(directory, args) {
  const result = spawnSync(process.execPath, [join(root, 'dist/cli.js'), ...args, '--root', directory, '--json'], { encoding: 'utf8', timeout: 15000 });
  assert.ifError(result.error); assert.equal(result.stderr, '');
  assert.ok([0, 1].includes(result.status), result.stdout);
  return JSON.parse(result.stdout);
}
test('Relay cn/cva roots expose separate recipes and detect default/destructive copies without unrelated buttons', async t => {
  const directory = await mkdtemp(join(root, 'fixtures/.relay-imitation-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await cp(join(root, 'fixtures/relay-imitation'), directory, { recursive: true, filter: path => !path.includes('.plumber') && !path.includes('node_modules') });
  const proposals = run(directory, ['imitation', '--suggest']);
  for (const name of ['Button', 'Badge', 'Card']) assert.ok(proposals.find(p => p.component.name === name)?.fingerprint.length, name);
  const button = proposals.find(p => p.component.name === 'Button');
  assert.equal(button.rawElements, 2);
  assert.ok(button.fingerprint.includes('bg-primary'));
  assert.ok(!button.fingerprint.includes('bg-destructive'));
  assert.ok(!button.fingerprint.some(c => ['default', 'sm', 'lg', 'icon'].includes(c)));
  assert.ok(button.recipes.some(r => r.variants.variant === 'destructive' && r.fingerprint.includes('bg-destructive') && !r.fingerprint.includes('bg-primary')));
  const check = () => run(directory, ['check', '--all']).findings.filter(f => f.rule === 'imitation/Button');
  const findings = check();
  assert.deepEqual(findings.flatMap(f => f.sites.map(s => s.line)).sort(), [5, 7]);
  assert.ok(findings.find(f => f.sites.some(s => s.line === 5)).fix.includes('variant="default"'));
  assert.ok(findings.find(f => f.sites.some(s => s.line === 7)).fix.includes('variant="destructive"'));
  assert.deepEqual(check(), findings, 'warm cache retains recipes');
  const app = join(directory, 'src/App.jsx');
  await writeFile(app, (await readFile(app, 'utf8')).replace("'./components/ui/button'", "'@/components/ui/button'"));
  assert.deepEqual(check().map(f => f.sites.map(s => s.line)), findings.map(f => f.sites.map(s => s.line)), 'directory recipes survive unresolved bundler-only aliases');
  // Both common cva signatures and import aliases use the shared helper contract.
  const file = join(directory, 'src/components/ui/button.jsx');
  const source = await readFile(file, 'utf8');
  await writeFile(file, source.replace("import { cva }", "import { cva as recipe }").replace('cva(\n  ', 'recipe({ base: ').replace("shrink-0',\n  {", "shrink-0'," ).replace('\n  },\n);', '\n});'));
  assert.deepEqual(check().map(f => f.sites.map(s => s.line)), findings.map(f => f.sites.map(s => s.line)));
  await writeFile(join(directory, 'src/components/ui/Custom.jsx'), `
const paint = () => { throw new Error('never execute project helpers'); };
export const Custom = () => <section className={paint('custom-root p-3', runtimeClasses())} />;
export const Unknown = () => <section className={runtimeClasses('not-a-class-recipe')} />;
`);
  const config = join(directory, 'plumber.config.ts');
  await writeFile(config, (await readFile(config, 'utf8')).replace("css: 'src/styles.css',", "css: 'src/styles.css', classHelpers: ['paint'],"));
  const custom = run(directory, ['imitation', '--suggest']);
  assert.ok(custom.find(p => p.component.name === 'Custom').fingerprint.includes('custom-root'));
  assert.deepEqual(custom.find(p => p.component.name === 'Unknown').fingerprint, []);
});
