import assert from 'node:assert/strict';
import { cp, mkdtemp, rm, writeFile, readFile, mkdir, stat, utimes } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { check } from '../dist/index.js';
import { Session } from '../dist/session/index.js';

const repo = resolve('.');
const stable = ({ timing, moduleGraph, ...report }) => {
  const { cacheHits, cacheMisses, parseMs, totalMs, ...graph } = moduleGraph;
  return { ...report, moduleGraph: graph };
};
test('validated check cache preserves CLI/API evidence and invalidates source, membership, theme and ledger', async t => {
  const root = await mkdtemp(join(repo, 'fixtures/.checked-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'fixtures/spacing'), root, { recursive: true });
  const config = join(root, 'plumber.config.ts');
  await writeFile(config, "export default { css: 'src/styles.css' };\n");
  const options = { root, config };
  const cold = await check(options), warm = await check(options);
  assert.deepEqual(stable(warm), stable(cold));
  assert.ok(Object.values(warm.timing.phases).every(ms => ms === 0), 'complete-result cache hit');
  const cli = () => {
    const result = spawnSync(process.execPath, ['dist/cli.js', 'check', '--root', root, '--config', config, '--json'], { cwd: repo, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
    assert.equal(result.stderr, ''); assert.ok([0, 1].includes(result.status));
    return JSON.parse(result.stdout);
  };
  assert.deepEqual(stable(cli()), stable(cold));
  const source = join(root, 'src/App.tsx'), text = await readFile(source, 'utf8');
  await writeFile(source, text + '\nexport const Added = () => <div className="gap-[47px]" />;\n');
  const edited = await check(options);
  assert.ok(edited.declarations.some(d => d.site.text === 'gap-[47px]'));
  assert.notDeepEqual(stable(edited), stable(cold));
  const editedWarm = await check(options);
  assert.deepEqual(stable(editedWarm), stable(edited));
  assert.ok(Object.values(editedWarm.timing.phases).every(ms => ms === 0), 'cache repopulates after source edits');
  await writeFile(join(root, 'src/New.tsx'), 'export const New = () => <div className="p-[39px]" />;');
  const added = await check(options);
  assert.ok(added.declarations.some(d => d.site.text === 'p-[39px]'));
  await rm(join(root, 'src/New.tsx'));
  assert.ok(!(await check(options)).declarations.some(d => d.site.text === 'p-[39px]'));
  const css = join(root, 'src/styles.css');
  await writeFile(css, (await readFile(css, 'utf8')).replace('--spacing-s2: 8px', '--spacing-s2: 9px'));
  assert.notDeepEqual(stable(await check(options)), stable(added));
  await mkdir(join(root, '.plumber'), { recursive: true });
  await writeFile(join(root, '.plumber/ledger.jsonl'), '');
  assert.equal((await check(options)).ledger.exists, true);
});

test('executable CSS configs bypass complete-result caching', async t => {
  const root = await mkdtemp(join(repo, 'fixtures/.checked-executable-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'fixtures/spacing'), root, { recursive: true });
  const config = join(root, 'plumber.config.ts');
  await writeFile(config, "const css = 'src/styles.css'; export default { css };\n");
  await check({ root, config });
  const warm = await check({ root, config });
  assert.ok(warm.timing.phases.provenance > 0);
});

test('literal CSS configs with autoloaded executable presets bypass complete-result caching', async t => {
  const root = await mkdtemp(join(repo, 'fixtures/.checked-preset-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'fixtures/spacing'), root, { recursive: true });
  const config = join(root, 'plumber.config.ts');
  await writeFile(config, "export default { css: 'src/styles.css' };\n");
  await writeFile(join(root, 'package.json'), JSON.stringify({ type: 'module', dependencies: { 'checked-kit': '1.0.0' } }));
  const directory = join(root, 'node_modules/checked-kit');
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, 'package.json'), JSON.stringify({ name: 'checked-kit', type: 'module', plumb: './preset.mjs' }));
  await writeFile(join(directory, 'preset.mjs'), `let calls = 0; export default { decisions: () => [{ family: 'spacing', name: '--spacing-kit', value: (++calls) + 'px', source: { file: 'preset.mjs', line: 1 } }] };`);
  const options = { root, config }, cold = await check(options), warm = await check(options);
  assert.equal(cold.decisions.find(d => d.name === '--spacing-kit').value, '1px');
  assert.equal(warm.decisions.find(d => d.name === '--spacing-kit').value, '2px');
  assert.ok(warm.timing.phases.provenance > 0);
});

test('root-local shadcn presets reuse checked evidence and invalidate component contracts', async t => {
  const root = await mkdtemp(join(repo, 'fixtures/.checked-shadcn-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'fixtures/spacing'), root, { recursive: true });
  const config = join(root, 'plumber.config.ts');
  await writeFile(config, "export default { css: 'src/styles.css' };\n");
  await writeFile(join(root, 'components.json'), JSON.stringify({ aliases: { ui: 'src/ui' } }));
  await mkdir(join(root, 'src/ui'));
  const component = join(root, 'src/ui/button.tsx');
  const text = 'import * as React from "react"; export function Button({className}) { return <button className={className}/>; }';
  await writeFile(component, text);
  const options = { root, config }, cold = await check(options), warm = await check(options);
  assert.ok(cold.presets.find(p => p.name === 'shadcn').components.contracts.includes('Button'));
  assert.deepEqual(stable(warm), stable(cold));
  assert.ok(Object.values(warm.timing.phases).every(ms => ms === 0));
  await writeFile(component, text.replace('function Button', 'function Action'));
  const changed = await check(options);
  const contracts = changed.presets.find(p => p.name === 'shadcn').components.contracts;
  assert.ok(contracts.includes('Action')); assert.ok(!contracts.includes('Button'));
});

test('check cache invalidates Tailwind package metadata', async t => {
  const root = await mkdtemp(join(repo, 'fixtures/.checked-package-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'fixtures/spacing'), root, { recursive: true });
  await mkdir(join(root, 'node_modules'), { recursive: true });
  const packageDirectory = join(root, 'node_modules/tailwindcss');
  await cp(join(repo, 'node_modules/tailwindcss'), packageDirectory, { recursive: true, dereference: true });
  const config = join(root, 'plumber.config.ts');
  await writeFile(config, "export default { css: 'src/styles.css' };\n");
  const options = { root, config }, cold = await check(options);
  assert.deepEqual(stable(await check(options)), stable(cold));
  const file = join(packageDirectory, 'package.json');
  const metadata = JSON.parse(await readFile(file, 'utf8'));
  await writeFile(file, JSON.stringify({ ...metadata, version: '4.99.0' }));
  assert.equal((await check(options)).tailwind.version, '4.99.0');
});

test('check cache revalidates imported helper bytes even when size and mtime are unchanged', async t => {
  const parent = await mkdtemp(join(repo, 'fixtures/.checked-import-'));
  t.after(() => rm(parent, { recursive: true, force: true }));
  const root = join(parent, 'app');
  await cp(join(repo, 'fixtures/spacing'), root, { recursive: true });
  const config = join(root, 'plumber.config.ts');
  await writeFile(config, "export default { css: 'src/styles.css' };\n");
  const helper = join(parent, 'helper.ts');
  await writeFile(helper, 'export const styles = "gap-[31px]";');
  await writeFile(join(root, 'src/Import.tsx'), 'import {styles} from "../../helper"; export const Imported = () => <div className={styles} />;');
  const options = { root, config }, cold = await check(options), warm = await check(options);
  assert.deepEqual(stable(warm), stable(cold));
  assert.ok(Object.values(warm.timing.phases).every(ms => ms === 0));
  const previous = await stat(helper);
  await writeFile(helper, 'export const styles = "gap-[37px]";');
  await utimes(helper, previous.atime, previous.mtime);
  const changed = await check(options);
  assert.ok(changed.declarations.some(d => d.site.text === 'gap-[37px]'));
  assert.ok(!changed.declarations.some(d => d.site.text === 'gap-[31px]'));
});

test('check cache revalidates import resolution and removed external helpers', async t => {
  const parent = await mkdtemp(join(repo, 'fixtures/.checked-resolution-'));
  t.after(() => rm(parent, { recursive: true, force: true }));
  const root = join(parent, 'app');
  await cp(join(repo, 'fixtures/spacing'), root, { recursive: true });
  const config = join(root, 'plumber.config.ts');
  await writeFile(config, "export default { css: 'src/styles.css' };\n");
  await mkdir(join(parent, 'helper'));
  await writeFile(join(parent, 'helper/index.ts'), 'export const styles = "gap-[31px]";');
  await writeFile(join(root, 'src/Import.tsx'), 'import {styles} from "../../helper"; export const Imported = () => <div className={styles} />;');
  const options = { root, config }, cold = await check(options);
  assert.deepEqual(stable(await check(options)), stable(cold));
  await writeFile(join(parent, 'helper.ts'), 'export const styles = "gap-[37px]";');
  const resolved = await check(options);
  assert.ok(resolved.declarations.some(d => d.site.text === 'gap-[37px]'));
  assert.ok(!resolved.declarations.some(d => d.site.text === 'gap-[31px]'));
  await rm(join(parent, 'helper.ts'));
  const removed = await check(options);
  assert.ok(removed.declarations.some(d => d.site.text === 'gap-[31px]'));
  assert.ok(!removed.declarations.some(d => d.site.text === 'gap-[37px]'));
});

test('Session ledger views preserve raw evidence across ordinary and strict reports', async t => {
  const root = await mkdtemp(join(repo, 'fixtures/.checked-views-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'fixtures/spacing'), root, { recursive: true });
  const baseline = spawnSync(process.execPath, ['dist/cli.js', 'baseline', '--root', root], { cwd: repo, encoding: 'utf8' });
  assert.equal(baseline.status, 0, baseline.stderr);
  const expected = await check({ root, ledger: false });
  const session = await Session.create({ root, watch: false });
  t.after(() => session.close());
  assert.deepEqual(stable(await session.report({ ledger: false })), stable(expected));
  assert.ok((await session.report()).ledger.debt > 0);
  await session.report({ strictLedger: true });
  assert.deepEqual(stable(await session.report({ ledger: false })), stable(expected));
});

test('init-written data config reuses the whole report and invalidates selected token files', async t => {
  const root = await mkdtemp(join(repo, 'fixtures/.checked-init-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'fixtures/spacing'), root, { recursive: true });
  const init = spawnSync(process.execPath, ['dist/cli.js', 'init', '--force', '--root', root], { cwd: repo, encoding: 'utf8' });
  assert.equal(init.status, 0, init.stderr);
  const cold = await check({ root }), warm = await check({ root });
  assert.deepEqual(stable(warm), stable(cold));
  assert.ok(Object.values(warm.timing.phases).every(ms => ms === 0), 'init config hits whole-report cache without an explicit config argument');
  const config = join(root, 'tokens.config.mjs');
  await writeFile(config, `// data with comments, nested arrays and booleans\nexport default { css: \`src/styles.css\`, source: ['src/**'], decisions: { spacing: { from: 'dtcg:tokens.json', exported: false } }, habits: [], markers: ['https://example.test/*data*/'] };`);
  await writeFile(join(root, 'tokens.json'), JSON.stringify({ small: { $type: 'dimension', $value: '7px' } }));
  const tokens = await check({ root, config });
  assert.ok(Object.values((await check({ root, config })).timing.phases).every(ms => ms === 0));
  await writeFile(join(root, 'tokens.json'), JSON.stringify({ small: { $type: 'dimension', $value: '9px' } }));
  const changed = await check({ root, config });
  assert.notDeepEqual(stable(changed), stable(tokens));
  await writeFile(join(root, 'src/Only.jsx'), 'export default () => <div className="gap-[55px]" />;');
  await writeFile(config, (await readFile(config, 'utf8')).replace("source: ['src/**']", "source: ['src/Only.jsx']"));
  const selected = await check({ root, config });
  assert.equal(selected.classes.unique, 1, 'data config edits are read afresh after cache invalidation');
  assert.ok(Object.values((await check({ root, config })).timing.phases).every(ms => ms === 0));
  const dependencyTokens = join(root, 'node_modules/data-tokens/theme.data');
  await mkdir(join(root, 'node_modules/data-tokens'), { recursive: true });
  await writeFile(dependencyTokens, JSON.stringify({ small: { $type: 'dimension', $value: '6px' } }));
  await writeFile(config, (await readFile(config, 'utf8')).replace('dtcg:tokens.json', 'dtcg:node_modules/data-tokens/theme.data'));
  assert.equal((await check({ root, config })).decisions.find(item => item.name === 'small').value, '6px');
  assert.ok(Object.values((await check({ root, config })).timing.phases).every(ms => ms === 0));
  await writeFile(dependencyTokens, JSON.stringify({ small: { $type: 'dimension', $value: '8px' } }));
  assert.equal((await check({ root, config })).decisions.find(item => item.name === 'small').value, '8px', 'dependency token inputs invalidate even without a source extension');
});
