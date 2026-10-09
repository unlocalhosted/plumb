import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
const root = fileURLToPath(new URL('../', import.meta.url));
async function fixture(t) {
  const directory = await mkdtemp(join(root, 'fixtures/.messages-e2e-'));
  await cp(join(root, 'fixtures/messages'), directory, { recursive: true });
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}
function cli(directory, args = [], status) {
  const result = spawnSync(process.execPath, [join(root, 'dist/cli.js'), '--root', directory, ...args, '--json'], { encoding: 'utf8', timeout: 10000 });
  assert.ifError(result.error); assert.equal(result.stderr, '');
  if (status !== undefined) assert.equal(result.status, status, result.stdout);
  else assert.ok([0, 1].includes(result.status), result.stdout);
  return JSON.parse(result.stdout);
}
const checks = report => report.findings.filter(f => !f.rule.startsWith('dead/'));
const at = (report, text) => checks(report).filter(f => f.sites.some(s => s.text.includes(text)));

test('ring width never becomes an empty colour and static framework keywords are not authored values', async t => {
  const dir = await fixture(t);
  await writeFile(join(dir, 'src/keywords.css'), '@reference "./styles.css"; .keywords { @apply rounded-full rounded-none p-px sr-only; }');
  const cold = cli(dir), warm = cli(dir);
  assert.ok(!checks(cold).some(f => f.sites.some(s => s.file.endsWith('/keywords.css'))));
  assert.ok(cold.declarations.some(d => d.site.text === 'rounded-full' && d.value === 'calc(infinity * 1px)'));
  assert.ok(!at(cold, 'ring-1').some(f => f.family === 'color'));
  for (const token of ['rounded-full', 'rounded-none', 'p-px', 'sr-only']) {
    assert.equal(at(cold, token).length, 0, token);
    assert.ok(cold.declarations.filter(d => d.site.text === token).every(d => d.authoredValue === false));
  }
  assert.ok(cold.findings.every(f => f.title && !f.title.includes('``')));
  assert.deepEqual(cold.findings, warm.findings);
});

test('durations and delays up to 1ms pass in CSS, utility and inline reduced-motion overrides', async t => {
  const dir = await fixture(t);
  await writeFile(join(dir, 'src/App.tsx'), `import './styles.css'; <div className="duration-[.01ms] delay-[1ms] duration-[2ms]" style={{ animationDuration: '.001s', transitionDelay: '.01ms' }} />;`);
  await writeFile(join(dir, 'src/motion.css'), `@media (prefers-reduced-motion: reduce) { .still { transition-duration: .01ms; animation-delay: 1ms; transition: opacity .01ms linear .01ms; } } .slow { transition-duration: 2ms; }`);
  const r = cli(dir);
  for (const text of ['duration-[.01ms]', 'delay-[1ms]', "animationDuration:", "transitionDelay:", 'animation-delay: 1ms', 'transition-duration: .01ms']) assert.equal(at(r, text).filter(f => f.family === 'motion').length, 0, text);
  assert.ok(at(r, 'duration-[2ms]').some(f => f.family === 'motion'));
  assert.ok(at(r, 'transition-duration: 2ms').some(f => f.family === 'motion'));
});

test('zero project tokens reports one config warning per family, while runtime values stay info', async t => {
  const dir = await fixture(t);
  await writeFile(join(dir, 'src/styles.css'), '@import "tailwindcss"; @theme { --*: initial; --spacing: 1px; } .one { padding: 9px; color: #abcdef; } .two { gap: 13px; color: #123456; }');
  await writeFile(join(dir, 'src/App.tsx'), `import './styles.css'; export const App = ({n}) => <div style={{ padding: n }} />;`);
  const r = cli(dir, [], 0), gaps = r.findings.filter(f => f.rule === 'config/no-tokens');
  assert.deepEqual(gaps.map(f => f.family).sort(), ['color', 'spacing']);
  assert.ok(gaps.every(f => f.severity === 'warn' && f.sites.length === 2 && f.action.includes(`decisions.${f.family}.from`)));
  assert.equal(gaps.find(f => f.family === 'spacing').title, "Your theme has no spacing tokens, so 2 spacing values can't be checked");
  assert.ok(!r.findings.some(f => /^provenance\/(spacing|color)(\/|$)/.test(f.rule)));
  assert.equal(r.findings.find(f => f.rule === 'provenance/opaque-inline').severity, 'info');
});

test('token reasons preserve group descriptions and show only a relevant sentence of at most 100 characters', async t => {
  const dir = await fixture(t);
  const group = 'Recipe controls corner geometry, paint, and padding.';
  await writeFile(join(dir, 'plumb.config.ts'), `export default { decisions: { spacing: { from: () => [${[4,8,12,16].map(n => `{family:'spacing',name:'space-${n}',value:'${n}px',refs:['{space-${n}}'],origin:'project',tier:'primitive',why:${JSON.stringify(group)},source:{file:'tokens.json',line:1}}`).join(',')}, {family:'spacing',name:'space-related',value:'24px',refs:['{space-related}'],origin:'project',tier:'primitive',why:'Unrelated sentence. Related content uses 24px. Another sentence.',source:{file:'tokens.json',line:1}}, {family:'spacing',name:'space-wide',value:'32px',refs:['{space-wide}'],origin:'project',tier:'primitive',why:'32px ${'wide '.repeat(30)}.',source:{file:'tokens.json',line:1}}] } } };`);
  const r = cli(dir);
  for (const d of r.decisions.filter(d => d.name.startsWith('space-') && /^space-\d/.test(d.name))) { assert.equal(d.why, ''); assert.equal(d.groupWhy, group); }
  assert.equal(r.decisions.find(d => d.name === 'space-related').why, 'Related content uses 24px.');
  assert.equal(r.decisions.find(d => d.name === 'space-wide').why.length, 100);
});

test('suggest globs limit choices and equal-value matching across every judged family; references remain valid', async t => {
  const dir = await fixture(t);
  const families = ['spacing','color','radius','type','motion','elevation','z'];
  const namespace = { spacing:'spacing',color:'color',radius:'radius',type:'text',motion:'duration',elevation:'shadow',z:'z' };
  const values = { spacing:'13px',color:'#123456',radius:'13px',type:'17px',motion:'123ms',elevation:'0 1px 2px #123456',z:'51' };
  const props = {spacing:'padding',color:'color',radius:'border-radius',type:'font-size',motion:'transition-duration',elevation:'box-shadow',z:'z-index'};
  await writeFile(join(dir,'src/styles.css'), `@import "tailwindcss"; @theme { --*: initial; ${families.map(f=>`--${namespace[f]}-recipe: ${values[f]};`).join(' ')} } .copy { ${families.map(f=>`${props[f]}: ${values[f]};`).join(' ')} } .ref { ${families.map(f=>`${props[f]}: var(--${namespace[f]}-recipe);`).join(' ')} }`);
  await writeFile(join(dir,'src/App.tsx'), "import './styles.css';");
  await writeFile(join(dir,'plumb.config.ts'), `export default ${JSON.stringify({ decisions: Object.fromEntries(families.map(f=>[f,{identity:'reference',suggest:['*-global'],callers:['primitive','semantic']}])) })}`);
  const r=cli(dir);
  for(const f of families) {
    const finding=checks(r).find(d=>d.rule===`provenance/${f}`);
    assert.ok(finding,f); assert.equal(finding.decisions.length,0); assert.ok(finding.action.startsWith('No token is close to'));
    assert.ok(!at(r, `${props[f]}: var(`).some(d=>d.family===f),f);
  }
  await writeFile(join(dir,'plumb.config.ts'), 'export default { decisions: { color: { suggest: [42] } } };');
  const invalid=spawnSync(process.execPath,[join(root,'dist/cli.js'),'--root',dir,'--json'],{encoding:'utf8'});
  assert.equal(invalid.status,2); assert.match(invalid.stderr,/decisions.color.suggest/);
});

test('all messages use relative paths including ownership definitions, and accept commands work', async t => {
  const dir=await fixture(t);
  await writeFile(join(dir,'src/Control.tsx'), 'export const Control = ({className}) => <button className={className} />;');
  await writeFile(join(dir,'plumb.config.ts'), "export default { components: { from: 'src/Control.tsx' } };");
  await writeFile(join(dir,'src/App.tsx'), "import './styles.css'; import { Control } from './Control'; <Control className='bg-brand'/>; <div className='missing-class'/>;");
  const r=cli(dir);
  assert.ok(r.findings.find(f=>f.rule==='ownership/Control').action.includes('Defined in src/Control.tsx:1.'));
  for(const f of r.findings) for(const field of ['title','because','action','fix','accept']) assert.ok(!f[field]?.includes(dir),field);
  const missing=r.findings.find(f=>f.rule==='existence/dead-class');
  assert.equal(missing.title,'`missing-class` does nothing: no CSS is generated for it');
  assert.equal(missing.why,missing.because); assert.equal(missing.fix,missing.action);
  assert.equal(missing.accept,'plumb accept --rule existence/dead-class --site src/App.tsx:1 --why "…"');
  cli(dir,['accept','--rule',missing.rule,'--site','src/App.tsx:1','--why','intentional fixture'],0);
  assert.ok(cli(dir).findings.find(f=>f.rule===missing.rule).sites.every(s=>s.ledger.status==='exception'));
});

test('short and distant names never receive dead-class or dead-variable suggestions', async t => {
  const dir=await fixture(t);
  await writeFile(join(dir,'src/styles.css'), '@import "tailwindcss"; @theme { --color-brand: red; } @utility abc { color: red; } @utility close-name { color: red; } :root { --abc: red; --close-name: red; } .uses { color: var(--abx); background-color: var(--close-nam); border-color: var(--zzzzzzzzzz); }');
  await writeFile(join(dir,'src/App.tsx'), "import './styles.css'; <div className='abx abc close-nam close-name zzzzzzzzzz'/>;");
  const r=cli(dir);
  for(const f of checks(r).filter(f=>f.rule.startsWith('existence/'))) {
    const close=f.title.includes('close-nam');
    assert.equal(f.action.startsWith('Did you mean'),close,f.title);
  }
});

test('opaque inline values group once per file, across properties and families, retaining all sites', async t => {
  const dir=await fixture(t);
  const source=name=>`import './styles.css'; export const ${name}=({n})=><><div style={{padding:n,color:n,borderRadius:n}}/><div style={{gap:n,transitionDuration:n}}/></>;`;
  await writeFile(join(dir,'src/App.tsx'),source('App'));
  await writeFile(join(dir,'src/Other.tsx'),source('Other'));
  const opaque=cli(dir).findings.filter(f=>f.rule==='provenance/opaque-inline');
  assert.equal(opaque.length,2); assert.ok(opaque.every(f=>f.severity==='info'&&f.sites.length===5));
  assert.ok(opaque.every(f=>f.title==="This padding is computed at runtime, so it can't be checked"));
  assert.ok(opaque.every(f=>f.because==='Plumb reads source, not running values.'));
});
