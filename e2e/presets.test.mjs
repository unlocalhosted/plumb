import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
const root = fileURLToPath(new URL('../', import.meta.url));
async function link(target, path) { await mkdir(join(path, '..'), { recursive: true }); await symlink(target, path); }
async function fixture(t, name = 'ds-consumer') {
  const base = await mkdtemp(join(root, 'fixtures/.presets-'));
  t.after(() => rm(base, { recursive: true, force: true }));
  const project = join(base, 'consumer'), pkg = join(base, 'ds-package');
  await cp(join(root, 'fixtures', name), project, { recursive: true });
  await cp(join(root, 'fixtures/ds-package'), pkg, { recursive: true });
  await link(pkg, join(project, 'node_modules/@fixtures/design-system'));
  await link(root, join(pkg, 'node_modules/@unlocalhosted/plumb'));
  await link(join(root, 'node_modules/tailwindcss'), join(project, 'node_modules/tailwindcss'));
  return { project, pkg, base };
}
function cli(project, args = []) {
  const result = spawnSync(process.execPath, [join(root, 'dist/cli.js'), '--root', project, '--json', ...args], {
    encoding: 'utf8', timeout: 30000, env: { ...process.env, PLUMB_CACHE_DIR: join(project, '.cache') },
  });
  assert.ifError(result.error);
  return result;
}
function report(project, args = []) {
  const result = cli(project, args);
  assert.equal(result.stderr, ''); assert.ok([0, 1].includes(result.status), result.stdout);
  return JSON.parse(result.stdout);
}
const ownership = report => report.findings.filter(finding => finding.rule.startsWith('ownership/'));
const dead = report => report.findings.filter(finding => finding.rule.startsWith('dead/'));

test('dependency preset loads without config, resolves Button contracts and variants, publishes tokens and lists contributions', async t => {
  const { project } = await fixture(t);
  const result = report(project);
  assert.equal(result.config.path, null);
  const button = ownership(result).find(finding => finding.declaration.prop === 'background-color');
  assert.ok(button); assert.equal(button.rule, 'ownership/Button');
  assert.deepEqual(button.component.variants, { tone: ['calm', 'danger'], size: ['compact', 'roomy'] });
  assert.ok(button.component.source.file.endsWith('/ds-package/src/button.tsx'));
  assert.ok(ownership(result).some(finding => finding.declaration.prop === 'margin-top'));
  assert.ok(!ownership(result).some(finding => finding.family === 'padding'));
  assert.ok(result.findings.some(finding => finding.rule === 'imitation/Textarea'));
  assert.equal(dead(result).length, 0);
  assert.equal(result.decisions.filter(token => token.exported).length, 3);
  const listed = report(project, ['presets']);
  assert.equal(listed.length, 1); assert.equal(listed[0].decisions, 3);
  assert.deepEqual(listed[0].imitation, ['Textarea']); assert.deepEqual(listed[0].habits, ['hover-gate']);
  assert.deepEqual(report(project).findings, result.findings);
});

test('disabling dependency preset removes ownership, fingerprints and imported tokens', async t => {
  const { project } = await fixture(t);
  await writeFile(join(project, 'plumb.config.mjs'), "export default { presets: { '@fixtures/design-system': false } };");
  const result = report(project);
  assert.equal(result.presets.length, 0); assert.equal(ownership(result).length, 0);
  assert.ok(!result.findings.some(finding => finding.rule.startsWith('imitation/')));
  assert.ok(!result.decisions.some(token => token.exported));
});

test('shadcn aliases provide default layout-only ownership with real cva axes', async t => {
  const { project } = await fixture(t, 'shadcn-preset');
  const result = report(project), findings = ownership(result);
  assert.equal(result.presets[0].name, 'shadcn'); assert.equal(findings.length, 1);
  assert.equal(findings[0].declaration.prop, 'background-color');
  assert.deepEqual(findings[0].component.variants, { variant: ['default', 'destructive', 'ghost'], size: ['default', 'sm'] });
  assert.ok(findings[0].component.source.file.endsWith('/src/design/button.tsx'));
});

test('project policies and contracts override presets, project tokens win same-name conflicts', async t => {
  const { project } = await fixture(t);
  await writeFile(join(project, 'plumb.config.mjs'), `export default {
    decisions: { spacing: { identity: 'reference', from: () => [{family:'spacing',name:'--spacing-ds-gap',value:'20px',origin:'project',tier:'primitive',refs:['var(--spacing-ds-gap)'],why:'Local gap',source:{file:'local.tokens.json',line:1}}] } },
    components: { contracts: { Button: { allow: ['paint','margin'], deny: ['padding'] } } }, habits: []
  };`);
  const result = report(project);
  assert.equal(result.decisions.find(token => token.name === '--spacing-ds-gap').value, '20px');
  assert.ok(!ownership(result).some(finding => ['paint', 'margin'].includes(finding.family)));
  assert.ok(ownership(result).some(finding => finding.family === 'padding'));
  await writeFile(join(project, 'plumb.config.mjs'), `export default {components:{contracts:{Button:{allow:['margin']}}}};`);
  assert.ok(!ownership(report(project)).some(finding => finding.family === 'margin'));
});

test('contracts and fingerprints resolve against package identity, same-name packages stay separate', async t => {
  const { project, base } = await fixture(t);
  const other = join(base, 'other'); await mkdir(other);
  await writeFile(join(other, 'package.json'), '{"name":"other","type":"module","plumb":"./plumb.mjs","exports":"./index.tsx"}');
  await writeFile(join(other, 'index.tsx'), 'export function Button(props) { return <button {...props}/>; } export function Textarea(props) {return <textarea {...props}/>;}');
  await writeFile(join(other, 'plumb.mjs'), `export default { name:'other', components:{contracts:{Button:{allow:['paint']}}}, imitation:{Textarea:{elements:['textarea'],fingerprint:['other-field']}} };`);
  await link(other, join(project, 'node_modules/other'));
  const metadata = JSON.parse(await readFile(join(project, 'package.json'), 'utf8')); metadata.peerDependencies = { other: '*' };
  await writeFile(join(project, 'package.json'), JSON.stringify(metadata));
  await writeFile(join(project, 'src/App.tsx'), `import './styles.css'; import {Button as One} from '@fixtures/design-system'; import {Button as Two} from 'other';
    <One className="bg-red-500"/>; <Two className="bg-red-500"/>; <textarea className="ds-field"/>; <textarea className="other-field"/>;`);
  const result = report(project);
  assert.equal(ownership(result).length, 1);
  assert.ok(ownership(result)[0].component.source.file.includes('/ds-package/'));
  const copies = result.findings.filter(finding => finding.rule === 'imitation/Textarea');
  assert.equal(copies.length, 2); assert.equal(new Set(copies.map(finding => finding.component.source.file)).size, 2);
});

test('explicit preset modules merge after autoload, array disables work and malformed modules fail clearly', async t => {
  const { project } = await fixture(t);
  await writeFile(join(project, 'extra.mjs'), `export default {name:'extra',decisions:[{family:'spacing',name:'--spacing-ds-gap',value:'18px',source:{file:'tokens.json',line:1}}]};`);
  await writeFile(join(project, 'plumb.config.mjs'), `export default { presets: ['./extra.mjs'] };`);
  assert.equal(report(project).decisions.find(token => token.name === '--spacing-ds-gap').value, '18px');
  await writeFile(join(project, 'plumb.config.mjs'), `export default { presets: [{ '@fixtures/design-system': false }, './extra.mjs'] };`);
  assert.equal(report(project, ['presets']).length, 1);
  await writeFile(join(project, 'extra.mjs'), `export default {name:'bad',habits:['missing-habit']};`);
  const result = cli(project, ['presets']); assert.equal(result.status, 2); assert.ok(result.stderr.includes('Load preset extra.mjs'));
});

test('package fields and dedicated plumb exports autoload from devDependencies', async t => {
  const { project, pkg } = await fixture(t);
  const metadata = JSON.parse(await readFile(join(pkg, 'package.json'), 'utf8'));
  for (const kind of ['field', 'subpath']) {
    metadata.exports = { '.': './src/index.ts', './theme.css': './src/theme.css' };
    if (kind === 'field') metadata.plumb = './plumb.mjs';
    else { delete metadata.plumb; metadata.exports['./plumb'] = { import: './plumb.mjs' }; }
    await writeFile(join(pkg, 'package.json'), JSON.stringify(metadata));
    await writeFile(join(project, 'package.json'), '{"type":"module","devDependencies":{"@fixtures/design-system":"file:../ds-package"}}');
    assert.equal(report(project, ['presets'])[0].decisions, 3);
  }
});

test('MetalUI fixture imports actual component sources, inherits converted preset and has no dead-token findings', async t => {
  const { project, base } = await fixture(t, 'metalui-consumer');
  const pkg = join(base, 'metalui-package');
  await cp(join(root, 'fixtures/metalui-package'), pkg, { recursive: true });
  await cp(join(root, 'bench/metalui/preset'), join(pkg, 'plumb'), { recursive: true });
  await link(root, join(pkg, 'node_modules/@unlocalhosted/plumb'));
  await link(pkg, join(project, 'node_modules/@unlocalhosted/metalui'));
  const result = report(project);
  assert.equal(result.config.path, null); assert.equal(result.presets[0].name, '@unlocalhosted/metalui');
  assert.ok(result.decisions.length > 1000); assert.ok(result.decisions.every(token => token.exported));
  assert.equal(dead(result).length, 0);
  const button = ownership(result).find(finding => finding.rule === 'ownership/Button');
  assert.ok(button); assert.ok(button.component.variants.cap.includes('primary'));
  assert.deepEqual(button.component.variants.size, ['default','compact']);
  assert.ok(!ownership(result).some(finding => finding.rule === 'ownership/Surface' && finding.family === 'padding'));
});

test('library self-preset publishes tokens and inline preset config supports callbacks', async t => {
  const { project, pkg } = await fixture(t);
  const library = report(pkg);
  assert.equal(dead(library).length, 0); assert.equal(library.presets[0].exported, 3);
  await writeFile(join(project, 'plumb.config.mjs'), `export default { presets: [{name:'inline',decisions:()=>[{family:'spacing',name:'--spacing-extra',value:'28px',source:{file:'tokens.json',line:1}}]}] };`);
  assert.equal(report(project).decisions.find(token => token.name === '--spacing-extra').exported, true);
});

test('shadcn can be disabled and project CSS overrides inherited values without publishing unrelated local tokens', async t => {
  const { project } = await fixture(t, 'shadcn-preset');
  await writeFile(join(project, 'plumb.config.mjs'), "export default {presets:{shadcn:false}};");
  assert.equal(ownership(report(project)).length, 0);
  const consumer = (await fixture(t)).project;
  await writeFile(join(consumer, 'src/styles.css'), `@import "tailwindcss"; @import "@fixtures/design-system/theme.css";
    @theme { --spacing-ds-gap: 24px; --color-local-unused: #112233; }`);
  const result = report(consumer);
  assert.equal(result.decisions.find(token => token.name === '--spacing-ds-gap').value, '24px');
  assert.ok(dead(result).some(finding => finding.decisions.some(token => token.name === '--color-local-unused')));
  assert.ok(!dead(result).some(finding => finding.decisions.some(token => token.name.startsWith('--color-ds-'))));
});
