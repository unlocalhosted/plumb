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
function text(directory, args = [], status) {
  const result = spawnSync(process.execPath, [join(root, 'dist/cli.js'), '--root', directory, ...args], { encoding: 'utf8', timeout: 10000 });
  assert.ifError(result.error);
  assert.equal(result.stderr, '');
  if (status !== undefined) assert.equal(result.status, status, result.stdout);
  else assert.ok([0, 1].includes(result.status), result.stdout);
  return result.stdout;
}
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
  await writeFile(join(dir, 'plumber.config.ts'), `export default { decisions: { spacing: { from: () => [${[4,8,12,16].map(n => `{family:'spacing',name:'space-${n}',value:'${n}px',refs:['{space-${n}}'],origin:'project',tier:'primitive',why:${JSON.stringify(group)},source:{file:'tokens.json',line:1}}`).join(',')}, {family:'spacing',name:'space-related',value:'24px',refs:['{space-related}'],origin:'project',tier:'primitive',why:'Unrelated sentence. Related content uses 24px. Another sentence.',source:{file:'tokens.json',line:1}}, {family:'spacing',name:'space-wide',value:'32px',refs:['{space-wide}'],origin:'project',tier:'primitive',why:'32px ${'wide '.repeat(30)}.',source:{file:'tokens.json',line:1}}] } } };`);
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
  await writeFile(join(dir,'plumber.config.ts'), `export default ${JSON.stringify({ decisions: Object.fromEntries(families.map(f=>[f,{identity:'reference',suggest:['*-global'],callers:['primitive','semantic']}])) })}`);
  const r=cli(dir);
  for(const f of families) {
    const finding=checks(r).find(d=>d.rule===`provenance/${f}`);
    assert.ok(finding,f); assert.equal(finding.decisions.length,0);
    assert.ok(finding.action.startsWith(f === 'elevation' ? 'No tokens fit:' : 'No token is close to'));
    assert.ok(!at(r, `${props[f]}: var(`).some(d=>d.family===f),f);
  }
  await writeFile(join(dir,'plumber.config.ts'), 'export default { decisions: { color: { suggest: [42] } } };');
  const invalid=spawnSync(process.execPath,[join(root,'dist/cli.js'),'--root',dir,'--json'],{encoding:'utf8'});
  assert.equal(invalid.status,2); assert.match(invalid.stderr,/decisions.color.suggest/);
});

test('all messages use relative paths including ownership definitions, and accept commands work', async t => {
  const dir=await fixture(t);
  await writeFile(join(dir,'src/Control.tsx'), 'export const Control = ({className}) => <button className={className} />;');
  await writeFile(join(dir,'plumber.config.ts'), "export default { components: { from: 'src/Control.tsx' } };");
  await writeFile(join(dir,'src/App.tsx'), "import './styles.css'; import { Control } from './Control'; <Control className='bg-brand'/>; <div className='missing-class'/>;");
  const r=cli(dir);
  assert.ok(r.findings.find(f=>f.rule==='ownership/Control').action.includes('Defined in src/Control.tsx:1.'));
  for(const f of r.findings) for(const field of ['title','because','action','fix','accept']) assert.ok(!f[field]?.includes(dir),field);
  const missing=r.findings.find(f=>f.rule==='existence/dead-class');
  assert.equal(missing.title,'`missing-class` does nothing: no CSS is generated for it');
  assert.equal(missing.why,missing.because); assert.equal(missing.fix,missing.action);
  assert.equal(missing.accept,'plumber accept --rule existence/dead-class --site src/App.tsx:1 --why "…"');
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
  assert.ok(opaque.every(f=>f.because==='React Plumber reads source, not running values.'));
});

test('off-token titles name the CSS property and distinguish scales from token sets', async t => {
  const dir = await fixture(t);
  await writeFile(join(dir, 'src/App.tsx'), "import './styles.css'; <div style={{ fontWeight: 500, zIndex: 2 }} />;");
  await writeFile(join(dir, 'src/values.css'), `.values {
    padding: 14px; gap: 10px; margin: 10px; border-radius: 13px;
    font-size: 15px; line-height: 15px; font-weight: 500; letter-spacing: .01em;
    transition: opacity .15s linear; transition-duration: .15s;
    box-shadow: 0 1px 3px #000; z-index: 2; color: #abcdef;
  }`);
  const r = cli(dir);
  const titles = new Set(r.findings.map(f => f.title));
  for (const title of [
    "padding 14px isn't on your spacing scale", "10px isn't on your spacing scale",
    "border-radius 13px isn't on your radius scale", "font-size 15px isn't on your type scale",
    "line-height 15px isn't on your type scale", "font-weight 500 isn't on your type scale",
    "letter-spacing .01em isn't on your type scale", "transition .15s isn't one of your motion tokens",
    "transition-duration .15s isn't one of your motion tokens",
    "box-shadow 0 1px 3px #000 isn't one of your shadow tokens",
    "z-index 2 isn't one of your z-index layers", "`#abcdef` is a raw colour, not one of your colour tokens",
  ]) assert.ok(titles.has(title), title);
  assert.equal(r.findings.find(f => f.title === "font-weight 500 isn't on your type scale").sites.length, 2);
  assert.equal(r.findings.find(f => f.title === "10px isn't on your spacing scale").sites.length, 2);
});

test('dynamic-class examples keep only the static prefix and provide complete literal classes', async t => {
  const dir = await fixture(t);
  await writeFile(join(dir, 'src/App.tsx'), "import './styles.css'; export const App = ({ f, tint }) => <div className={`mu-frost-${f} hover:mu-tint-${tint}-end mu-${f}-${tint} ${f}`} />;");
  const dynamic = cli(dir).findings.filter(f => f.rule === 'existence/dynamic-class');
  assert.ok(dynamic.length >= 3);
  for (const f of dynamic) {
    assert.equal(f.title, `\`${f.declaration.value}\` is assembled at runtime, so Tailwind never generates it`);
    assert.ok(!f.action.includes('${'), f.action);
    assert.ok(!f.fix.includes('${'), f.fix);
  }
  const frost = dynamic.find(f => f.declaration.value === 'mu-frost-${f}');
  assert.equal(frost.action, "Map each value to a complete class, e.g. { a: 'mu-frost-a', b: 'mu-frost-b' }.");
  assert.equal(dynamic.find(f => f.declaration.value === 'hover:mu-tint-${tint}-end').action,
    "Map each value to a complete class, e.g. { a: 'hover:mu-tint-a', b: 'hover:mu-tint-b' }.");
  assert.equal(dynamic.find(f => f.declaration.value === 'mu-${f}-${tint}').action,
    "Map each value to a complete class, e.g. { a: 'mu-a', b: 'mu-b' }.");
});

test('ownership titles use stylesheet selectors, including @apply and heuristic descendants', async t => {
  const dir = await fixture(t);
  await writeFile(join(dir, 'src/Button.tsx'), 'export const Button = ({className}) => <button className={className} />;');
  await writeFile(join(dir, 'plumber.config.ts'), "export default { components: { from: 'src/Button.tsx' } };");
  await writeFile(join(dir, 'src/App.tsx'), "import './styles.css'; import { Button } from './Button'; <div className='container'><Button className='landing-cta applied bg-brand' style={{letterSpacing: '.04em'}} /></div>;");
  await writeFile(join(dir, 'src/overrides.css'), '@reference "./styles.css"; .landing-cta { letter-spacing: .03em; } .applied { @apply tracking-wide; } .container button { font-weight: 550; }');
  const titles = cli(dir).findings.filter(f => f.rule === 'ownership/Button').map(f => f.title);
  for (const title of [
    "`.landing-cta` sets Button's letter-spacing", "`.applied` sets Button's letter-spacing",
    "`.container button` sets Button's font-weight (may apply)",
    "`bg-brand` changes Button's background-color", "`letter-spacing` changes Button's letter-spacing",
  ]) assert.ok(titles.includes(title), title);
});

test('choices deduplicate resolved amounts before limiting suggestions and prefer usable utilities', async t => {
  const dir = await fixture(t);
  const tokens = [
    ['spacing', 'spacing', 'padding', '8px', '12px', '10px', 'small', 'large'],
    ['radius', 'radius', 'border-radius', '12px', '16px', '14px', 'control', 'panel'],
    ['type', 'text', 'font-size', '16px', '20px', '18px', 'body', 'title'],
    ['motion', 'duration', 'transition-duration', '120ms', '160ms', '140ms', 'quick', 'slow'],
    ['color', 'color', 'color', '#123456', '#123466', '#123460', 'brand', 'accent'],
    ['elevation', 'shadow', 'box-shadow', '0 2px 4px #123456', '0 4px 8px #123456', '0 2px 4px #123456', 'float', 'high'],
    ['z', 'z', 'z-index', '50', '60', '50', 'dialog', 'toast'],
  ];
  await writeFile(join(dir, 'plumber.config.ts'), `export default ${JSON.stringify({ decisions: Object.fromEntries(tokens.map(([family]) => [family, { from: 'css:src/styles.css', callers: ['primitive', 'semantic'], identity: 'reference' }])) })};`);
  await writeFile(join(dir, 'src/App.tsx'), "import './styles.css';");
  await writeFile(join(dir, 'src/styles.css'), `@import "tailwindcss"; @theme { --*: initial;
    ${tokens.map(([, ns,, lower, upper,, low, high]) => `--${ns}-${low}: ${lower}; --${ns}-${high}: ${upper};`).join('\n')}
  } :root {
    ${tokens.map(([, ns,, lower, upper]) => `--${ns}-a-bare: ${lower}; --${ns}-b-alias: var(--${ns}-a-bare); --${ns}-c-bare: ${upper};`).join('\n')}
  } .off { ${tokens.map(([,, prop,,, amount]) => `${prop}: ${amount};`).join(' ')} }
  .copy { ${tokens.map(([,, prop, lower]) => `${prop}: ${lower};`).join(' ')} }`);
  const r = cli(dir, ['--verbose']);
  for (const [family, ns, prop, lower, upper,, low, high] of tokens) {
    const copy = at(r, `${prop}: ${lower}`).find(f => f.rule === `provenance/${family}/by-value`);
    assert.ok(copy, family);
    assert.equal(copy.choices.length, 1, family);
    assert.equal(copy.choices[0].name, `--${ns}-${low}`, family);
    assert.ok(copy.choices[0].use.class, family);
    if (['elevation', 'z'].includes(family)) continue;
    const off = r.findings.find(f => f.rule === `provenance/${family}`);
    assert.ok(off, family);
    assert.deepEqual(new Set(off.choices.map(d => d.name)), new Set([`--${ns}-${low}`, `--${ns}-${high}`]), family);
    assert.deepEqual(new Set(off.choices.map(d => d.resolved)), new Set([lower, upper]), family);
    assert.ok(off.choices.every(d => d.use.class), family);
    assert.ok(off.edits.every(edit => off.choices.some(d => d.name === edit.token)), family);
  }
});

test('dead-token titles say in your source across every family without exposing source globs', async t => {
  const dir = await fixture(t);
  await writeFile(join(dir, 'src/styles.css'), (await readFile(join(dir, 'src/styles.css'), 'utf8')) + '\n@theme { --size-unused: 44px; --opacity-unused: .5; }');
  const dead = cli(dir).findings.filter(f => f.rule.startsWith('dead/'));
  assert.deepEqual(dead.map(f => f.family).sort(), ['color', 'elevation', 'motion', 'opacity', 'radius', 'size', 'spacing', 'type', 'z']);
  const names = { color: 'colour', elevation: 'shadow', z: 'z-index' };
  for (const f of dead) assert.equal(f.title, `${f.decisions.length} ${names[f.family] ?? f.family} ${f.decisions.length === 1 ? 'token is' : 'tokens are'} never used in your source`);
});

test('count messages use zero, singular and plural grammar in actual CLI checks and ledger commands', async t => {
  for (const n of [0, 1, 2]) {
    const dir = await fixture(t);
    await writeFile(join(dir, 'src/styles.css'), `@import "tailwindcss"; @theme { --*: initial; --spacing: 1px;
      ${Array.from({ length: n }, (_, i) => `--spacing-unused-${i}: ${8 + i}px;`).join('\n')}
    } ${Array.from({ length: n }, (_, i) => `.colour-${i} { color: #abcdef; }`).join('\n')}`);
    await writeFile(join(dir, 'src/App.tsx'), `import './styles.css'; export const App = ({n}) => <>${Array.from({ length: n }, (_, i) => `<div className="missing-${i}" style={{ padding: n, opacity: .5 }} />`).join('')}</>;`);
    const report = cli(dir), output = text(dir, ['--all']);
    const gaps = report.findings.filter(f => f.rule === 'config/no-tokens');
    if (n) {
      assert.equal(gaps.find(f => f.family === 'color').title, `Your theme has no colour tokens, so ${n} colour ${n === 1 ? 'value' : 'values'} can't be checked`);
      assert.match(output, new RegExp(`unused\\s+${n} spacing ${n === 1 ? 'token is' : 'tokens are'} never used`));
      assert.match(output, new RegExp(`runtime\\s+${n} ${n === 1 ? 'style' : 'styles'} in 1 file ${n === 1 ? 'is' : 'are'} computed`));
      assert.match(output, new RegExp(`classes\\s+${n} ${n === 1 ? 'class' : 'classes'} read, ${n} ${n === 1 ? 'does' : 'do'} nothing`));
    } else {
      assert.equal(gaps.length, 0);
      assert.match(output, /0 classes read, 0 do nothing/);
    }
    assert.match(output, new RegExp(`${n} of ${n} style ${n === 1 ? 'attribute has' : 'attributes have'} literal values`));
    assert.match(text(dir, ['accept-decisions'], 0), new RegExp(`Accepted ${n} current ${n === 1 ? 'decision' : 'decisions'}\\.`));
    const baseline = text(dir, ['baseline', '--force'], 0);
    assert.doesNotMatch(baseline, /\b1 (?:debt entries|sites)\b/);
    if (n) {
      assert.match(text(dir, ['accept', '--rule', 'existence/dead-class', '--site', 'src/App.tsx:1', '--why', 'Reviewed missing class'], 0), new RegExp(`Accepted ${n} exception ${n === 1 ? 'entry' : 'entries'}:`));
      const github = text(dir, ['check', '--format', 'github']);
      assert.ok(github.includes(`${n} ${n === 1 ? 'exception.' : 'exceptions.'}`), github);
    }
    assert.doesNotMatch(text(dir, ['ledger']), /\b1 entries\b/);
    assert.doesNotMatch(text(dir, ['doctor']), /\b1 (?:entries|issues|bytes)\b/);
    await writeFile(join(dir, 'export.tokens.json'), JSON.stringify({ spacing: { $type: 'dimension', ...Object.fromEntries(Array.from({ length: n }, (_, i) => [`unused-${i}`, { $value: '24px' }])) } }));
    assert.match(text(dir, ['parity', 'export.tokens.json']), new RegExp(`${n} token ${n === 1 ? 'difference' : 'differences'}\\. ${n} ${n === 1 ? 'token' : 'tokens'} compared\\.`));
  }
});

test('suggestion policies retain exact names and glob semantics across cold, warm and changed config checks', async t => {
  const dir = await fixture(t);
  await writeFile(join(dir, 'src/App.tsx'), "import './styles.css';");
  await writeFile(join(dir, 'src/styles.css'), '@import "tailwindcss"; @theme { --*: initial; --spacing-small: 8px; --spacing-large: 12px; } .off { gap: 10px; padding: 10px; margin: 10px; }');
  for (const [suggest, expected] of [
    [['--spacing-small'], ['--spacing-small']],
    [['--spacing-*'], ['--spacing-small', '--spacing-large']],
    [['--spacing-@(small|large)'], ['--spacing-small', '--spacing-large']],
    [['--spacing-large', '--spacing-missing'], ['--spacing-large']],
    [[], []],
  ]) {
    await writeFile(join(dir, 'plumber.config.ts'), `export default ${JSON.stringify({ decisions: { spacing: { suggest, callers: ['primitive', 'semantic'] } } })};`);
    const cold = cli(dir), warm = cli(dir);
    assert.deepEqual(cold.findings, warm.findings);
    const findings = cold.findings.filter(f => f.rule === 'provenance/spacing');
    assert.ok(findings.length, JSON.stringify(suggest));
    assert.equal(findings.flatMap(f => f.sites).length, 3);
    for (const finding of findings) assert.deepEqual((finding.choices ?? []).map(d => d.name), expected);
  }
});

test('a motion token with no utility of its own is offered in class form, variants kept', async t => {
  const dir = await fixture(t);
  // Like crafting-ui: motion tokens in :root, outside any Tailwind namespace.
  await writeFile(join(dir, 'src/styles.css'), (await readFile(join(dir, 'src/styles.css'), 'utf8')) + '\n:root { --dur-calm: 150ms; }\n');
  await writeFile(join(dir, 'src/Dur.tsx'), `export const Dur = () => <><b className="duration-150" /><i className="hover:duration-150" /></>;`);
  const shown = text(dir, ['--file', 'src/Dur.tsx']);
  assert.match(shown, /→ duration-\(--dur-calm\) \(150ms\)/);
  assert.match(shown, /→ hover:duration-\(--dur-calm\) \(150ms\)/);
  assert.doesNotMatch(shown, /var\(--dur-calm\)/);
});
