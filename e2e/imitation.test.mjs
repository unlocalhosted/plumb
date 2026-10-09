import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
const root = fileURLToPath(new URL('../', import.meta.url));
async function project(t) {
  const dir = await mkdtemp(join(root, 'fixtures/.imitation-e2e-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await cp(join(root, 'fixtures/imitation'), dir, { recursive: true });
  return dir;
}
function run(dir, args = [], status = 1) {
  const result = spawnSync(process.execPath, [join(root, 'dist/cli.js'), ...args, '--root', dir, '--json'], { encoding: 'utf8', timeout: 20000 });
  assert.ifError(result.error); assert.equal(result.stderr, ''); assert.equal(result.status, status, result.stdout);
  return JSON.parse(result.stdout);
}
const imitation = report => report.findings.filter(f => f.rule.startsWith('imitation/'));
test('imitation catches raw classes, globs and lowered inline/stylesheet vars, excluding identities and own source', async t => {
  const dir = await project(t), report = run(dir), findings = imitation(report);
  const lines = rule => findings.filter(f => f.rule === rule).flatMap(f => f.sites.map(s => s.line)).sort((a,b)=>a-b);
  assert.deepEqual(lines('imitation/Textarea'), [6,9,13,14]);
  assert.deepEqual(lines('imitation/Field'), [10]);
  assert.ok(findings.every(f => f.severity === 'error' && f.sites.every(s => s.file.endsWith('/App.tsx'))));
  assert.ok(findings.some(f => f.fix.includes('use <Textarea>; it already owns class kit-well')));
  assert.ok(findings.some(f => f.fix.includes('var(--kit-well-')));
  assert.ok(findings.some(f => f.fix.includes('kit-field-*')));
  assert.deepEqual(imitation(run(dir)), findings);
});
test('tag filters, OR matching, source globs and own-source exclusion survive unused imports', async t => {
  const dir = await project(t);
  await writeFile(join(dir,'plumb.config.ts'), `export default {css:'src/styles.css',source:['src/App.tsx','src/styles.css'],imitation:{Textarea:{elements:['textarea'],fingerprint:['kit-well','absent']}}}`);
  await writeFile(join(dir,'outside.tsx'), '<textarea className="kit-well"/>');
  // A component can exist without ever being mounted/imported by callers.
  await writeFile(join(dir,'src/App.tsx'), '<textarea className="kit-well"/>; <input className="kit-well"/>;');
  const findings = imitation(run(dir));
  assert.equal(findings.length,1); assert.equal(findings[0].sites.length,1);
  assert.ok(findings[0].component.source.file.endsWith('/textarea.tsx'));
});
test('render identities are exempt; raw children, compiled declarations and exact var fallbacks stay visible', async t => {
  const dir = await project(t);
  await writeFile(join(dir,'src/App.tsx'), `import {Textarea} from './components/ui/textarea';
    <Textarea render={<textarea className="kit-well"/>}/>;
    <Textarea><textarea className="kit-well"/></Textarea>;
    <div title={String('kit-well')} />;
    <div style={{background:'var(--kit-well-fill, red)'}}/>;
    <div className="bg-[var(--kit-well-fill)]"/>;`);
  await writeFile(join(dir,'src/styles.css'), `@import 'tailwindcss'; :root {--kit-well-fill:white;}`);
  await writeFile(join(dir,'plumb.config.ts'), `export default {css:'src/styles.css',components:{own:[]},imitation:{Textarea:{fingerprint:['kit-well','var(--kit-well-fill)']}}}`);
  const findings=imitation(run(dir));
  assert.deepEqual(findings.flatMap(f=>f.sites.map(s=>s.line)).sort((a,b)=>a-b),[3,5,6]);
  assert.ok(findings.some(f=>f.declaration.origin==='inline'));
});
test('suggestions are exclusive root fingerprints, count raw elements once, and never enable themselves', async t => {
  const dir = await project(t);
  await writeFile(join(dir,'plumb.config.ts'), `export default {css:'src/styles.css',source:['src/**/*.{tsx,css}'],components:{own:[]}}`);
  const before = await readFile(join(dir,'plumb.config.ts'),'utf8');
  const proposals = run(dir,['imitation','--suggest'],0);
  const textarea = proposals.find(p => p.component.name==='Textarea');
  assert.deepEqual(textarea.fingerprint,['kit-well','var(--kit-well-fill)']);
  assert.equal(textarea.rawElements,4);
  const panel = proposals.find(p=>p.component.name==='Panel');
  assert.deepEqual(panel.fingerprint,['kit-panel']); assert.equal(panel.rawElements,0);
  assert.ok(proposals.every(p=>!p.fingerprint.includes('shared') && !p.fingerprint.includes('kit-child')));
  assert.equal(imitation(run(dir)).length,0);
  assert.equal(await readFile(join(dir,'plumb.config.ts'),'utf8'),before);
});
test('imitation validates config and suggestion command boundaries', async t => {
  const dir=await project(t);
  for (const entry of [{fingerprint:[]},{fingerprint:['x'],elements:['Textarea']},{fingerprint:['x'],elements:'textarea'},{fingerprint:['x'],extra:true}]) {
    await writeFile(join(dir,'plumb.config.ts'),`export default ${JSON.stringify({imitation:{Textarea:entry}})}`);
    const result=spawnSync(process.execPath,[join(root,'dist/cli.js'),'--root',dir,'--json'],{encoding:'utf8'});
    assert.equal(result.status,2); assert.match(result.stderr,/imitation\.Textarea/);
  }
  for(const args of [['--suggest'],['imitation'],['imitation','--suggest','--base','HEAD']]) {
    const result=spawnSync(process.execPath,[join(root,'dist/cli.js'),...args,'--root',dir],{encoding:'utf8'});
    assert.equal(result.status,2);
  }
});
test('ledger records one element per imitation and changes to wildcard evidence become new debt', async t => {
  const dir=await project(t);
  await writeFile(join(dir,'plumb.config.ts'), `export default {css:'src/styles.css',components:{own:[]},imitation:{Textarea:{fingerprint:['kit-well*']}}}`);
  await writeFile(join(dir,'src/App.tsx'), '<textarea className="kit-well"/>;');
  run(dir,['baseline'],0);
  assert.equal(imitation(run(dir,[],0))[0].sites[0].ledger.status,'debt');
  await writeFile(join(dir,'src/App.tsx'), '<textarea className="kit-well-next"/>;');
  const findings=imitation(run(dir));
  assert.equal(findings.length,1); assert.equal(findings[0].sites.length,1);
  assert.equal(findings[0].sites[0].ledger.status,'new');
});
