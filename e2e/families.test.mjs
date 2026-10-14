import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
const root = fileURLToPath(new URL('../', import.meta.url));
const run = directory => {
  const r = spawnSync(process.execPath, [join(root, 'dist/cli.js'), '--root', directory, '--json'], { encoding: 'utf8', timeout: 10000 });
  assert.ifError(r.error); assert.equal(r.stderr, ''); assert.ok([0,1].includes(r.status), r.stdout); return JSON.parse(r.stdout);
};
async function project(t, css, source, config = {}) {
  const dir = await mkdtemp(join(root, 'fixtures/.layer4-e2e-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await cp(join(root, 'fixtures/tailwind-min'), dir, { recursive: true });
  await writeFile(join(dir, 'src/styles.css'), css);
  await writeFile(join(dir, 'src/App.tsx'), `import './styles.css'; ${source}`);
  await writeFile(join(dir, 'src/Button.tsx'), ''); await writeFile(join(dir, 'src/Card.tsx'), '');
  await writeFile(join(dir, 'plumber.config.ts'), `export default ${JSON.stringify(config)}`);
  return dir;
}
const theme = `@import "tailwindcss"; @theme {
 --color-brand: #2563eb; --color-text-muted: var(--color-brand); --color-hot: #ff0000;
 --radius-control: 12px; --text-body: 16px; --leading-body: 24px; --tracking-body: .02em;
 --font-ui: "Example", sans-serif; --font-weight-body: 500;
 --duration-quick: 160ms; --ease-snap: cubic-bezier(.2,0,.2,1);
 --shadow-float: 0 2px 4px var(--color-brand); --z-dialog: 50;
 --size-control: 44px; --opacity-dim: .5;
}`;
const allTiers = { decisions: { color: { callers: ['primitive','semantic'] } } };
function finding(report, text, rule) { return report.findings.find(f => (!rule || f.rule === rule) && f.sites.some(s => s.text === text || s.text.includes(text))); }

test('all families share provenance across compiled utilities, CSS and inline styles', async t => {
 const dir = await project(t, theme + `
 .literals { color: #ff0010; background-color: #2563eb; box-shadow: 0 1px 3px #000; z-index: 51; transition: opacity 150ms ease-in 0s; }
 .accepted { color: color-mix(in oklab, var(--color-brand) 50%, transparent); background-color: light-dark(var(--color-brand), var(--color-hot)); border-color: rgb(from var(--color-brand) r g b / .5); border-radius: 12px; font-size: 1rem; line-height: 24px; font-weight: 500; letter-spacing: .02em; font-family: var(--font-ui); transition-duration: 0ms; box-shadow: var(--shadow-float); }
 @utility type-role { font-size: var(--text-body); font-family: var(--font-ui); }
 @utility type-broken { font-size: 17px; }
 @utility type-compound { font: 500 16px / 24px var(--font-ui); }
 `, `<div className="bg-red-500 rounded-lg bg-brand text-text-muted duration-150 ease-snap z-50 z-1 rounded-control text-body font-ui shadow-float type-role type-broken type-compound" />;`, allTiers);
 const report = run(dir);
 for (const [text,rule] of [['bg-red-500','provenance/color/framework'], ['rounded-lg','provenance/radius/framework'], ['duration-150','provenance/motion/framework'], ['z-index: 51','provenance/z'], ['z-50','provenance/z/by-value'], ['background-color: #2563eb','provenance/color/by-value'], ['color: #ff0010','provenance/color'], ['box-shadow: 0 1px 3px #000','provenance/elevation']]) assert.ok(finding(report,text,rule), text);
 for (const text of ['bg-brand','text-text-muted','ease-snap','z-1','rounded-control','text-body','font-ui','shadow-float','type-role','type-broken','type-compound']) assert.ok(!finding(report,text),text);
 assert.ok(finding(report,'font-size: 17px','provenance/type'));
 assert.equal(finding(report,'color: #ff0010','provenance/color').decisions[0].name,'--color-hot');
 for (const f of report.findings.filter(f => f.declaration.owner.name === '.accepted')) assert.fail(f.why);
 assert.ok(!report.findings.some(f => f.sites.some(s => /color-mix|light-dark|rgb\(from/.test(s.text))));
 for (const family of ['spacing','color','radius','type','motion','elevation','z']) { const c=report.coverage[family]; assert.equal(c.total,c.fromDecisions+c.findings); }
 assert.ok(report.decisions.some(d=>d.family==='size')); assert.ok(report.decisions.some(d=>d.family==='opacity'));
 assert.ok(report.findings.filter(f=>f.family==='color' && !f.rule.startsWith('dead/')).flatMap(f=>f.decisions).every(d=>d.use?.css));
 assert.deepEqual(run(dir).findings,report.findings);
});

test('tier defaults flip per family, framework origin wins, value and reference identity remain distinct', async t => {
 const dir=await project(t,theme,`<div className="bg-brand text-text-muted bg-red-500 rounded-lg" style={{ color: '#2563eb' }} />;`);
 const r=run(dir); const tier=finding(r,'bg-brand','provenance/color/tier'); assert.ok(tier); assert.ok(tier.decisions.some(d=>d.name==='--color-text-muted' && d.use.class==='bg-text-muted'));
 assert.ok(finding(r,'bg-red-500','provenance/color/framework')); assert.ok(finding(r,'rounded-lg','provenance/radius/framework'));
 assert.ok(!finding(r,'text-text-muted')); assert.ok(finding(r,"color: '#2563eb'",'provenance/color/tier'));
 await writeFile(join(dir,'plumber.config.ts'), `export default { decisions: { color: { callers: ['primitive','semantic'], identity: 'value' }, motion: { identity: 'value' } } }`);
 await writeFile(join(dir,'src/styles.css'),theme+' .value { color: rgb(37 99 235); transition-duration: .16s; transition-timing-function: cubic-bezier(.2,0,.2,1); }');
 assert.ok(!run(dir).findings.filter(f=>!f.rule.startsWith('dead/')).some(f=>f.sites.some(s=>/rgb\(37|\.16s|cubic-bezier/.test(s.text))));
});

test('dead vars group names, rank close names, warn on fallback and accept every registry source', async t => {
 const dir=await project(t,theme+`
 @property --registered { syntax: "<length>"; inherits: false; initial-value: 4px; }
 .scope { --scoped: 12px; } .uses { color: var(--colr-brand); padding: var(--missing, 4px); margin: var(--missing, 4px); gap: var(--registered); border-radius: var(--scoped); color: var(--js-color); color: var(--inline-color); color: var(--package-color); color: var(--x); color: var(--map-color); color: var(--assigned-color); }
 `, `<div style={{'--inline-color': '#fff', '--x': 1}} />; node.style.setProperty('--js-color', '#fff'); const paint = { '--map-color': '#fff' }; const overrides = {}; overrides['--assigned-color'] = '#fff'; <div style={{ ...paint, ...overrides }} />;`);
 await mkdir(join(dir,'node_modules/palette'),{recursive:true});
 await writeFile(join(dir,'node_modules/palette/package.json'),' {"style":"./theme.css"}');
 await writeFile(join(dir,'node_modules/palette/theme.css'),'.package { --package-color: #fff; }');
 await writeFile(join(dir,'src/package.css'),'@import "palette";');
 const r=run(dir), dead=r.findings.filter(f=>f.rule==='existence/dead-var');
 assert.deepEqual(dead.map(f=>f.declaration.refs[0]),['--colr-brand','--missing']);
 assert.match(dead[0].fix,/--color-brand/); assert.equal(dead[0].severity,'error'); assert.equal(dead[1].severity,'warn'); assert.equal(dead[1].sites.length,2);
 assert.ok(finding(r,'padding: var(--missing, 4px)','provenance/spacing')); assert.equal(r.coverage.existence.deadVars,3);
 await writeFile(join(dir,'src/extra.ts'),'node.style.setProperty("--missing", 4);');
 assert.ok(!run(dir).findings.some(f=>f.rule==='existence/dead-var' && f.declaration.refs.includes('--missing')));
});

test('composite colors check every color argument, gradients, shorthands and arbitrary family labels', async t => {
 const dir=await project(t,theme+`
 .colors { background: linear-gradient(90deg, var(--color-brand) 0%, #fff 100%); border: 1px solid red; outline: 2px solid var(--color-brand); text-shadow: 0 1px var(--color-brand); color: color-mix(in oklab, var(--color-brand) 50%, red); accent-color: hsl(from red h s l / .5); }
 `, `<div className="bg-[#abc] rounded-[13px] duration-[123ms] shadow-[0_1px_2px_red] z-[51] text-[17px]" style={{ accentColor: "hsl(from red h s l / .5)" }} />;`,allTiers);
 const r=run(dir);
 for(const text of ['background: linear-gradient','border: 1px solid red','color: color-mix','accentColor:']) assert.ok(finding(r,text,'provenance/color') || finding(r,text,'provenance/color/by-value'),text);
 for(const text of ['outline: 2px','text-shadow: 0']) assert.ok(!finding(r,text),text);
 for(const family of ['color','radius','motion','elevation','z','type']) assert.ok(r.findings.some(f=>f.rule==='provenance/arbitrary' && f.family===family),family);
});

test('each family restricts primitives even when semantic names sort first, and bracket failures retain family', async t => {
 const dir=await project(t,`@import "tailwindcss"; @theme {
 --spacing-z-base: 12px; --spacing-a-intent: var(--spacing-z-base);
 --color-z-base: #123456; --color-a-intent: var(--color-z-base);
 --radius-z-base: 12px; --radius-a-intent: var(--radius-z-base);
 --text-z-base: 16px; --text-a-intent: var(--text-z-base);
 --duration-z-base: 120ms; --duration-a-intent: var(--duration-z-base);
 --shadow-z-base: 0 2px 3px #123456; --shadow-a-intent: var(--shadow-z-base);
 --z-z-base: 50; --z-a-intent: var(--z-z-base);
 } .uses { padding: 12px; color: #123456; border-radius: 12px; font-size: 16px; transition-duration: 120ms; box-shadow: var(--shadow-z-base); z-index: var(--z-z-base); }
 .intents { padding: var(--spacing-a-intent); color: var(--color-a-intent); border-radius: var(--radius-a-intent); font-size: var(--text-a-intent); transition-duration: var(--duration-a-intent); box-shadow: var(--shadow-a-intent); z-index: var(--z-a-intent); }`,
 `<div className="duration-z-base" />;`,{ decisions:{color:{identity:'value'},motion:{identity:'value'}} });
 const r=run(dir);
 for(const family of ['spacing','color','radius','type','motion','elevation','z']) {
  const f=r.findings.find(f=>f.rule===`provenance/${family}/tier`); assert.ok(f,family);
  assert.ok(f.decisions.some(d=>d.name.includes('a-intent')&&d.use?.css),family);
 }
 assert.ok(!r.findings.some(f=>f.declaration.owner.name==='.intents'));
});

test('tailwind-min Layer 4 acceptance examples name framework tokens, by-value decisions and neutral z', async t => {
 const dir=await project(t,`@import "tailwindcss"; @theme { --color-brand: #2563eb; --color-text-muted: var(--color-brand); --ease-snap: cubic-bezier(.2,0,.2,1); --radius-control: 12px; --z-dialog: 60; --shadow-float: 0 1px 2px var(--color-brand); }
 .drift { color: #ff0000; background-color: #2563eb; box-shadow: 0 2px 4px #123; }
 .mix { color: color-mix(in oklab, var(--color-brand) 50%, transparent); }`,
 `<div className="bg-red-500 rounded-lg bg-brand text-text-muted duration-150 ease-snap z-50 z-1" />;`,allTiers);
 const r=run(dir);
 for(const [text,rule] of [['bg-red-500','provenance/color/framework'],['rounded-lg','provenance/radius/framework'],['duration-150','provenance/motion/framework'],['z-50','provenance/z'],['color: #ff0000','provenance/color'],['background-color: #2563eb','provenance/color/by-value'],['box-shadow: 0 2px 4px','provenance/elevation']]) assert.ok(finding(r,text,rule),text);
 for(const text of ['bg-brand','text-text-muted','ease-snap','z-1','color: color-mix']) assert.ok(!finding(r,text),text);
 assert.ok(finding(r,'background-color: #2563eb','provenance/color/by-value').decisions.some(d=>d.name==='--color-brand'));
});

test('effective theme resets remove variable existence and framework identity, while fallback remains judged', async t => {
 const dir=await project(t,`@import "tailwindcss"; @theme { --color-*: initial; --color-brand: #2563eb; }
 .reset { color: var(--color-red-500, #ff0000); }`, '<div className="bg-brand" />;');
 const r=run(dir);
 assert.equal(r.findings.find(f=>f.rule==='existence/dead-var').severity,'warn');
 assert.ok(finding(r,'color: var(--color-red-500','provenance/color'));
 assert.ok(!r.findings.some(f=>f.rule==='provenance/color/framework'));
 assert.ok(!r.decisions.some(d=>d.name==='--color-red-500'));
});
