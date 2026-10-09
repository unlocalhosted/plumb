import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
const root = fileURLToPath(new URL('../', import.meta.url));
function run(directory) {
 const result = spawnSync(process.execPath, [join(root, 'dist/cli.js'), '--root', directory, '--json'], { encoding: 'utf8', timeout: 15000 });
 assert.ifError(result.error); assert.equal(result.stderr, ''); assert.ok([0,1].includes(result.status), result.stdout);
 return JSON.parse(result.stdout);
}
async function project(t, source, config, files = {}) {
 const dir = await mkdtemp(join(root, 'fixtures/.ownership-e2e-'));
 t.after(() => rm(dir, { recursive: true, force: true }));
 await cp(join(root, 'fixtures/ownership'), dir, { recursive: true });
 if (source !== undefined) { await writeFile(join(dir, 'src/App.tsx'), `import './styles.css';\n${source}`); await writeFile(join(dir,'src/wrappers.tsx'),''); }
 if (config !== undefined) await writeFile(join(dir, 'plumb.config.ts'), `export default ${JSON.stringify(config)}`);
 for (const [path, contents] of Object.entries(files)) { await mkdir(join(dir,path,'..'), { recursive: true }); await writeFile(join(dir,path),contents); }
 return dir;
}
const ownership = r => r.findings.filter(f => f.rule.startsWith('ownership/'));
const sites = r => ownership(r).flatMap(f => f.sites);

test('ownership follows barrels, renames, namespace imports, forwarding wrappers and render props', async t => {
 const dir = await project(t); const r = run(dir), findings = ownership(r);
 assert.ok(findings.length);
 assert.ok(findings.every(f => f.rule === 'ownership/Button'));
 for (const line of [8,9,10,11,12,13]) assert.ok(sites(r).some(s => s.file.endsWith('/App.tsx') && s.line === line), `caller line ${line}`);
 assert.ok(!sites(r).some(s => s.line === 7 && s.file.endsWith('/App.tsx')));
 assert.ok(!sites(r).some(s => s.line === 14 && s.file.endsWith('/App.tsx')));
 assert.ok(!sites(r).some(s => s.line === 15 && s.file.endsWith('/App.tsx')));
 assert.ok(!sites(r).some(s => s.file.includes('/components/ui/')));
 assert.ok(findings.some(f => f.declaration.opaque === 'dynamic-value' && f.declaration.prop === 'background-color'));
 const button = findings.find(f => f.declaration.prop === 'background-color');
 assert.deepEqual(button.component.variants.variant, ['default','destructive','outline']);
 assert.deepEqual(button.component.variants.size, ['default','sm','lg']);
 assert.ok(button.fix.includes('variant = default | destructive | outline')); assert.ok(button.component.source.file.endsWith('/button.tsx'));
 for (const family of ['margin','size']) assert.equal(r.coverage.ownership.byFamily[family].findings, 0);
 assert.deepEqual(run(dir).findings, r.findings);
});

test('contracts judge compiled properties, static recipes, arbitrary values, class and inline shorthands', async t => {
 const dir = await project(t, `import { Button, Surface } from './components/ui';
 <Button className="mixed mt-4 w-10 h-10 min-w-4 max-h-10 flex-1 self-center order-1 grid-area-auto absolute inset-0 hidden" />;
 <Button class="bg-brand" />;
 <Button className="[color:red]" />;
 <Button style={{ padding: '1px 2px 3px 4px', color: 'blue', display: 'none' }} />;
 <Surface className="p-4 bg-brand" />;`, { components: { contracts: { Button: { allow: ['padding-left','color'], deny: ['margin-top'] }, Surface: { allow: ['padding'] } } } });
 const r=run(dir), findings=ownership(r);
 assert.ok(findings.some(f=>f.declaration.prop==='background-color' && f.sites.some(s=>s.text==='mixed')));
 assert.ok(findings.some(f=>f.declaration.prop==='margin-top'));
 assert.ok(!findings.some(f=>['padding-left','color','display'].includes(f.declaration.prop)));
 for (const prop of ['padding-top','padding-right','padding-bottom']) assert.ok(findings.some(f=>f.declaration.prop===prop), prop);
 assert.ok(!findings.some(f=>f.rule==='ownership/Surface' && f.family==='padding'));
 assert.ok(findings.some(f=>f.sites.some(s=>s.text==='bg-brand')));
 assert.ok(!findings.some(f=>['size','layout','position'].includes(f.family)));
});

test('discovery honors directory, import prefix, shadcn aliases and exported React fallback', async t => {
 const source=`import { Button } from './design/button'; <Button className="bg-brand" />;`;
 for (const from of ['directory:src/design', './design', 'import:./design']) {
  const dir=await project(t, source, { components: { from } }, { 'src/design/button.tsx': `export const Button=({className})=><button className={className}/>;` });
  assert.ok(ownership(run(dir)).some(f=>f.rule==='ownership/Button'),from);
 }
 const dir=await project(t, `import { Button } from './kit/button'; <Button className="bg-brand" />;`, {}, { 'components.json': '{"aliases":{"ui":"./kit"}}', 'src/kit/button.tsx': `export function Button({className}) { return <button className={className}/>; }` });
 assert.equal(ownership(run(dir)).length,1);
 await rm(join(dir,'components.json'));
 await rm(join(dir,'src/components/ui'), {recursive:true});
 await writeFile(join(dir,'src/App.tsx'), `import { Local } from './components/local'; <Local className="bg-brand"/>;`);
 await writeFile(join(dir,'src/components/local.tsx'), `export const Local=({className})=><div className={className}/>;`);
 assert.equal(ownership(run(dir))[0].rule,'ownership/Local');
});

test('package discovery reads actual source unions, tv configs and compound namespace parts', async t => {
 const dir=await project(t, `import { Control as Alias, Panel } from 'kit'; import * as Kit from 'kit';
 <Alias className="bg-brand"/>; <Kit.Control className="bg-brand"/>;
 <Panel.Root className="p-4"/>; <Panel.Screen className="bg-brand"/>;`, { components: { from: 'package:kit', contracts: { 'Panel.Screen': { allow: ['paint'] } } } }, {
  'node_modules/kit/package.json': '{"name":"kit","exports":"./index.tsx"}',
  'node_modules/kit/index.tsx': `const tv = (a) => a; type Kind='quiet'|'loud';
 interface ControlProps { kind?: Kind; scale?: 'small'|'large' }
 const looks=tv({variants:{tone:{neutral:'',danger:''}}});
 export const Control=({className}:ControlProps)=><button className={looks({className})}/>;
 const Root=({className})=><div className={className}/>;
 const Screen=({className})=><div className={className}/>;
 export const Panel=Object.assign(Root,{Root,Screen});`,
 });
 const findings=ownership(run(dir));
 const control=findings.find(f=>f.rule==='ownership/Control');
 assert.deepEqual(control.component.variants,{kind:['quiet','loud'],scale:['small','large'],tone:['neutral','danger']});
 assert.equal(control.sites.length,2);
 assert.ok(findings.some(f=>f.rule==='ownership/Panel.Root'));
 assert.ok(!findings.some(f=>f.rule==='ownership/Panel.Screen'));
});

test('descendant stylesheet paint warns by root subject, own source and outside globs stay excluded', async t => {
 const dir=await project(t, `import { Button } from './components/ui'; <div className="page"><Button className="mt-4"/></div>;`, { source: ['src/**/*.{tsx,css}'], components: { from: 'src/components/ui' } }, {
  'src/paint.css': '.page button { background-color: red; margin-top: 4px; } .page button svg { color: red; }',
  'outside.tsx': `import {Button} from './src/components/ui'; <Button className="bg-brand"/>;`,
 });
 const findings=ownership(run(dir));
 assert.equal(findings.length,1); assert.equal(findings[0].severity,'warn');
 assert.ok(findings[0].title.endsWith('(may apply)')); assert.equal(findings[0].declaration.prop,'background-color');
 assert.ok(findings[0].sites.every(s=>s.file.endsWith('/src/paint.css')));
});

test('type-only imports, cyclic barrels and lexical shadows do not invent identities', async t => {
 const dir=await project(t, `import {Button} from './components/ui'; import type {Surface} from './components/ui';
 function Local(Button) { return <Button className="bg-brand"/>; }
 <Surface className="bg-brand"/>; <Button className="mt-4"/>;`, undefined, { 'src/components/ui/cycle.ts': `export * from './index';`, 'src/components/ui/index.ts': `export * from './cycle'; export { Button, Surface } from './button';` });
 assert.equal(ownership(run(dir)).length,0);
});


test('re-export namespaces/defaults, shadcn paths, nested wrappers and stylesheet caller classes share identity', async t => {
 const dir=await project(t, `import { Controls, Default } from './bridge'; import { Forward } from './forward';
 <div className="page"><Controls.Action className="custom"/><Default className="bg-brand"/><Forward className="bg-brand"/></div>;`, {}, {
  'tsconfig.json': '{"compilerOptions":{"baseUrl":".","paths":{"@/*":["src/*"]}}}',
  'components.json': '{"aliases":{"ui":"@/kit"}}',
  'src/kit/button.tsx': `import { cva as variants } from 'class-variance-authority';
   const looks=variants('base',{variants:{intent:{primary:'',danger:''}}});
   export function Button({className}) { return <button className={looks({className})}/>; } export default Button;`,
  'src/kit/index.ts': `export {Button as Action, default} from './button';`,
  'src/bridge.ts': `export * as Controls from './kit'; export {default as Default} from './kit';`,
  'src/forward.tsx': `import Button from './kit'; export const Forward=({className})=><Button className={className}/>;`,
  'src/custom.css': '.custom { background-color: red; margin-top: 4px; } .page button svg { color: red; } .unrelated button { color: red; }',
 });
 const r=run(dir), findings=ownership(r);
 assert.ok(findings.every(f=>f.rule==='ownership/Button' && f.severity==='error'));
 assert.ok(findings.some(f=>f.declaration.origin==='stylesheet' && f.declaration.prop==='background-color'));
 assert.ok(findings.some(f=>f.sites.some(s=>s.file.endsWith('App.tsx'))));
 assert.deepEqual(findings[0].component.variants.intent,['primary','danger']);
 assert.equal(r.coverage.ownership.byFamily.margin.findings,0);
});

test('render targets transfer ownership upward and keep unrelated child paint outside host', async t => {
 const dir=await project(t, `import {Button} from './components/ui'; const Primitive=props=><div {...props}/>;
 <Primitive className="bg-brand" render={<Button/>}/>;
 <Button render={<a className="bg-brand"><span className="text-brand"/></a>}/>;
 <Button className="bg-brand"/>;`, { components: { from: 'src/components/ui' } });
 const findings=ownership(run(dir));
 assert.equal(findings.length,1); assert.equal(findings[0].sites.length,3);
 assert.ok(findings[0].sites.every(s=>s.text==='bg-brand'));
});


test('published JS components keep source variants and declaration unions, memo factories remain components', async t => {
 const dir=await project(t, `import {Button, Memo} from 'published'; <Button className="bg-brand"/>; <Memo className="bg-brand"/>;`, {components:{from:'package:published'}}, {
  'node_modules/published/package.json': '{"name":"published","type":"module","exports":"./index.js"}',
  'node_modules/published/index.js': `import {jsx as _jsx} from 'react/jsx-runtime';
   const cva=(x,y)=>y; const looks=cva('',{variants:{tone:{quiet:'',loud:''}}});
   export function Button(props) { return _jsx('button',{className:looks(props)}); }
   const React={memo:x=>x}; const Inner=props=>_jsx('div',props); export const Memo=React.memo(Inner);`,
  'node_modules/published/index.d.ts': `export interface ButtonProps { size?: 'small'|'large' } export declare function Button(props:ButtonProps):unknown;`,
 });
 const findings=ownership(run(dir)), button=findings.find(f=>f.rule==='ownership/Button');
 assert.deepEqual(button.component.variants,{size:['small','large'],tone:['quiet','loud']});
 assert.ok(findings.some(f=>f.rule==='ownership/Memo'));
});


test('default-only named exports retain real component name and single-property contracts do not allow a family', async t => {
 const dir=await project(t, `import Button from './components/ui/default'; <Button className="bg-brand" style={{color:'red',backgroundPosition:'center',textAlign:'center'}}/>;`, {components:{contracts:{Button:{allow:['color']}}}}, {
  'src/components/ui/default.tsx': `export default function Button({className}) {return <button className={className}/>;}`,
 });
 const findings=ownership(run(dir));
 assert.equal(findings.length,1); assert.equal(findings[0].rule,'ownership/Button'); assert.equal(findings[0].declaration.prop,'background-color');
});

test('warm component discovery revalidates external source, barrels and tsconfig resolution', async t => {
 const dir = await project(t, `import { Button } from '@kit';
 <Button style={{ backgroundColor: 'red' }} />;`, {
  source: ['src/App.tsx', 'src/styles.css'], components: { from: 'directory:kit' },
 }, {
  'tsconfig.json': JSON.stringify({ compilerOptions: { baseUrl: '.', paths: { '@kit': ['kit/index.ts'] } } }),
  'kit/index.ts': "export { Button } from './Button';",
  'kit/Button.tsx': "type ButtonProps = { size: 'small' | 'large' }; export function Button(props: ButtonProps) { return <button className='kit-button' />; }",
  'kit/Alternate.tsx': "type ButtonProps = { size: 'wide' | 'narrow' }; export function Button(props: ButtonProps) { return <button className='kit-button' />; }",
  'kit/other.ts': "export { Button } from './Alternate';",
 });
 const cold = run(dir), warm = run(dir);
 assert.deepEqual(warm.findings, cold.findings);
 assert.deepEqual(warm.coverage, cold.coverage);
 assert.deepEqual(ownership(warm)[0].component.variants.size, ['small', 'large']);
 await writeFile(join(dir, 'kit/Button.tsx'), "type ButtonProps = { size: 'small' | 'huge' }; export function Button(props: ButtonProps) { return <button className='kit-button' />; }");
 assert.deepEqual(ownership(run(dir))[0].component.variants.size, ['small', 'huge']);
 await writeFile(join(dir, 'kit/index.ts'), "export { Button } from './Alternate';");
 assert.deepEqual(ownership(run(dir))[0].component.variants.size, ['wide', 'narrow']);
 await writeFile(join(dir, 'kit/index.ts'), "export { Button } from './Button';");
 const restored = run(dir);
 assert.ok(ownership(restored)[0].component.source.file.endsWith('/Button.tsx'));
 await writeFile(join(dir, 'tsconfig.json'), JSON.stringify({ compilerOptions: { baseUrl: '.', paths: { '@kit': ['kit/other.ts'] } } }));
 const remapped = run(dir);
 assert.ok(ownership(remapped)[0].component.source.file.endsWith('/Alternate.tsx'));
 assert.deepEqual(ownership(remapped)[0].component.variants.size, ['wide', 'narrow']);
 assert.deepEqual(run(dir).findings, remapped.findings);
});
