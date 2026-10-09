import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { resolve } from 'node:path';
const root = '/Users/vijaysingh/unlocalhosted/metalui';
const cache = resolve('bench/metalui/.cache/layer7');
// Only this layer's dedicated cache; never MetalUI or another layer's cache.
rmSync(cache, { recursive: true, force: true });
const commit = spawnSync('git',['-C',root,'rev-parse','HEAD'],{encoding:'utf8'}).stdout.trim();
const snapshot = resolve(cache,'input');
mkdirSync(snapshot,{recursive:true});
const archive = spawnSync('git',['-C',root,'archive',commit,'package.json','apps/docs/src','apps/docs/tsconfig.json','apps/docs/package.json','packages/metalui/src','packages/metalui/package.json','tokens','docs/COMPOSITION.md','docs/CSS_SYSTEM.md'],{maxBuffer:32*1024*1024});
assert.ifError(archive.error); assert.equal(archive.status,0,archive.stderr.toString());
const extracted = spawnSync('tar',['-xf','-','-C',snapshot],{input:archive.stdout});
assert.equal(extracted.status,0,extracted.stderr.toString());
symlinkSync(resolve(root,'node_modules'),resolve(snapshot,'node_modules'),'dir');
// The inherited Layer 4 preset reads these original files. Verify their bytes
// equal the pinned snapshot; all component and caller source uses the snapshot.
for (const file of ['tokens/tokens.json','packages/metalui/src/components/theme.css','packages/metalui/src/components/tokens.css','apps/docs/src/styles.css']) assert.deepEqual(readFileSync(resolve(root,file)),readFileSync(resolve(snapshot,file)),`preset input ${file} drifted`);
const measurements = {};
let cold;
for (const temperature of ['cold','warm']) {
 const start = performance.now();
 const result = spawnSync(process.execPath, ['dist/cli.js','--root',snapshot,'--config',resolve('bench/metalui/ownership.config.ts'),'--json'], {
  encoding: 'utf8', maxBuffer: 64*1024*1024, env: { ...process.env, PLUMB_CACHE_DIR: cache },
 });
 assert.ifError(result.error); assert.equal(result.stderr,''); assert.equal(result.status,1);
 const wallMs = performance.now()-start, report = JSON.parse(result.stdout);
 const findings = report.findings.filter(f=>f.rule.startsWith('ownership/'));
 for(const token of ['bg-s!','shadow-none!']) assert.ok(findings.some(f=>f.rule==='ownership/Button' && f.sites.some(s=>s.file.endsWith('/pages/components/Button.tsx') && s.text===token)),token);
 for(const family of ['margin','size','layout','position']) assert.equal(report.coverage.ownership.byFamily[family].findings,0,family);
 for(const counts of Object.values(report.coverage.ownership.byFamily)) assert.equal(counts.total,counts.allowed+counts.findings);
 if (temperature==='cold') cold=report;
 else for(const field of ['findings','declarations','coverage','decisions']) assert.deepEqual(report[field],cold[field],`warm ${field}`);
 measurements[temperature]={wallMs,timing:report.timing,moduleGraph:report.moduleGraph};
 if(temperature==='warm') {
  const dirty=spawnSync('git',['-C',root,'status','--short','--','apps/docs/src','packages/metalui/src','tokens','docs/COMPOSITION.md','docs/CSS_SYSTEM.md'],{encoding:'utf8'}).stdout.trim();
  const normalized = JSON.parse(JSON.stringify(findings).replaceAll(snapshot,root));
  const sourceFiles=[...new Set([...report.declarations.map(d=>d.site.file),...findings.map(f=>f.component.source.file)])].sort();
  const sha256=createHash('sha256'); for(const file of sourceFiles) sha256.update(file.replace(snapshot,root).slice(root.length)).update('\0').update(readFileSync(file)).update('\0');
  writeFileSync('bench/metalui/layer7.ownership.json',JSON.stringify({root,commit,snapshot:true,ignoredWorkingTreeChanges:dirty.split('\n').filter(Boolean),sourceSha256:sha256.digest('hex'),coverage:report.coverage.ownership,findings:normalized},null,2)+'\n');
 }
}
writeFileSync('bench/metalui/layer7.run.json',JSON.stringify(measurements,null,2)+'\n');
console.log(JSON.stringify(measurements));
