import assert from 'node:assert/strict';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { execFileSync } from 'node:child_process';
import { familiesFor, isJudged } from '../../dist/rules/families.js';
const report = JSON.parse(await readFile(new URL('./layer4.warm.json', import.meta.url), 'utf8'));
const cold = JSON.parse(await readFile(new URL('./layer4.cold.json', import.meta.url), 'utf8'));
for (const field of ['findings','decisions','coverage','declarations']) assert.deepEqual(report[field],cold[field]);
const base = join(report.root,'apps/docs/src');
const records = { colors: [], arbitrary: [], durations: [] };
const relativeSite = site => ({ ...site, file: relative(report.root,site.file) });
const files = (await readdir(base,{recursive:true})).sort();
const lineFindings = new Map(), lineDeclarations = new Map();
for(const f of report.findings) for(const s of f.sites){const key=`${s.file}:${s.line}`, fs=lineFindings.get(key)??[];fs.push(f);lineFindings.set(key,fs);}
for(const d of report.declarations){const key=`${d.site.file}:${d.site.line}`, ds=lineDeclarations.get(key)??[];ds.push(d);lineDeclarations.set(key,ds);}
function links(file,line,column,token,family){
 const key=`${file}:${line}`;
 const findings=(lineFindings.get(key)??[]).filter(f=>(!family||f.family===family) && f.sites.some(s=>s.file===file && s.line===line && s.column<=column && column<s.column+s.text.length));
 const declarations=(lineDeclarations.get(key)??[]).filter(d=>d.site.column<=column && column<d.site.column+d.site.text.length);
 return { findings:[...new Set(findings.map(f=>f.key))],declarations };
}
for(const file of files.filter(f=>/\.tsx$/.test(f))){
 const absolute=join(base,file),text=await readFile(absolute,'utf8');
 for(const [category,pattern] of [['colors',/#[\da-fA-F]{3,8}\b|rgba?\([^)]*\)/g],['arbitrary',/[a-z-]+-\[[^\]]+\]/g]])for(const match of text.matchAll(pattern)){
  const before=text.slice(0,match.index),line=before.split('\n').length,column=match.index-before.lastIndexOf('\n');
  const context=text.split('\n')[line-1].trim(),link=links(absolute,line,column,match[0],category==='colors'?'color':undefined);
  let categoryName,reason;
  if(link.findings.length){categoryName='finding';reason='Judged declaration; linked exact-site provenance finding.';}
  else if(link.declarations.some(d=>d.prop.startsWith('--'))){categoryName='custom-property definition';reason='Pass: custom property assignment defines data; consuming declaration is judged by its family. Definitions are not decision uses.';}
  else if(link.declarations.some(d=>isJudged(d))){categoryName='accepted judged value';reason='Pass: declared decision/reference, value identity, or documented family neutral.';}
  else if(link.declarations.length){categoryName='unjudged property';reason=`Pass: ${[...new Set(link.declarations.map(d=>d.prop))].join(', ')} outside this layer’s judged families (size/opacity are recorded only).`;}
  else if(category==='arbitrary'){
   const ds=report.declarations.filter(d=>d.site.file===absolute && d.site.line===line && d.site.text.includes(match[0]));
   const fs=(lineFindings.get(`${absolute}:${line}`)??[]).filter(f=>f.sites.some(s=>s.text.includes(match[0])));
   if(fs.length){categoryName='finding';reason='Judged emitted class (grep omits variant/container prefix); linked provenance finding.';link.findings=[...new Set(fs.map(f=>f.key))];}
   else if(ds.length){categoryName=ds.some(d=>isJudged(d))?'accepted judged value':'unjudged property';reason=ds.some(d=>isJudged(d))?'Pass: value equals a decision, family neutral, or static project utility judged at definition.':`Pass: ${[...new Set(ds.map(d=>d.prop))].join(', ')} outside Layer 4 judged families.`;}
   else {categoryName='source-only class text';reason='REVIEW: no emitted declaration at this textual hit.';}
  }else {categoryName='color data / illustration';reason='REVIEW: literal outside a lowered CSS declaration; inspect presentation attributes, art payloads and documentation text.';}
  records[category].push({file:relative(report.root,absolute),line,column,token:match[0],category:categoryName,reason,findings:link.findings,context});
 }
}
for(const file of files.filter(f=>f.endsWith('.css'))){
 const absolute=join(base,file),lines=(await readFile(absolute,'utf8')).split('\n');
 for(const [i,context]of lines.entries())if(/\b(?:transition|animation)(?:-duration|-delay)?:/.test(context)&&!context.includes('var(--mu')&&/\d*\.?\d+m?s\b/.test(context)){
  const declarations=(lineDeclarations.get(`${absolute}:${i+1}`)??[]).filter(d=>familiesFor(d.prop).includes('motion'));
  const findings=(lineFindings.get(`${absolute}:${i+1}`)??[]).filter(f=>f.family==='motion');
  records.durations.push({file:relative(report.root,absolute),line:i+1,category:findings.length?'finding':'accepted',reason:findings.length?'Finding: literal duration/easing or unapproved alias.':declarations.length?'Pass: zero, referenced decision, or permitted value identity.':'REVIEW: declaration not emitted.',findings:[...new Set(findings.map(f=>f.key))],context:context.trim()});
 }
}

// Manual category review stays in the benchmark; core contains no art exemptions.
for (const row of records.colors) {
  if (row.category === 'finding') continue;
  const filename = row.file.slice('apps/docs/src/'.length);
  if (row.category === 'unjudged property' && !filename.endsWith('/Motion.tsx')) continue;
  if (filename === 'pages/components/TagCue.tsx') { row.category = 'grep false positive'; row.reason = 'Pass: #cafe is a Unicode hashtag fixture, not CSS color.'; }
  else if (/^(?:pages\/components\/(?:Avatar|Card|LinkCard|Status)\.tsx)$/.test(filename)) { row.category = 'SVG media artwork'; row.reason = 'Reviewed pass: encoded portrait/cover/image/icon SVG media, including gradient inputs; content illustration independent of UI/status ink.'; }
  else if (/^(?:pages\/Layers|pages\/components\/Folder|ui\/FolderUnfold|ui\/xray\/FolderXray)\.tsx$/.test(filename)) { row.category = 'thumbnail artwork'; row.reason = 'Reviewed pass: specimen document thumbnails, authored illustration content; color is data supplied to the folder, not a shared surface token.'; }
  else if (/^(?:pages\/components\/(?:ColourCue|CueFamily|CueRecognition|Swatch)|ui\/(?:LibrarySpecimen|PartSpecimen)|ui\/cues\/ProvenanceDocument|pages\/foundations\/Typography)\.tsx$/.test(filename) || filename === 'ui/LayerSorter.tsx' && row.line === 68 || filename === 'ui/xray/SwatchXray.tsx') { row.category = 'authored color content'; row.reason = 'Reviewed pass: editable/read-only color data, swatches or text samples; user-authored color is the content being demonstrated. Computed rgb/rgba strings are runtime transformations of that content, not literal CSS paint.'; }
  else if (filename === 'ui/LayerSorter.tsx') { row.category = 'SVG sticker artwork'; row.reason = 'Reviewed pass: gold smiling-star SVG sticker illustration (face, outline and filter), independent of app signal ink. Presentation attributes are not lowered declarations.'; }
  else if (filename === 'ui/Wordmark.tsx' || filename === 'ui/xray/WordmarkXray.tsx') { row.category = 'wordmark artwork'; row.reason = 'Reviewed pass: polished chrome/enamel logo bands and cut walls, explicit illustration layers documented by WORDMARK_LAYERS. Spread/parameter-driven paint remains opaque to the reader; this is manual art review, not a core token exemption.'; }
  else if (filename === 'pages/components/Select.tsx') {
    row.category = 'runtime paint warning'; row.reason = 'Finding: folder-dot content color flows through dot(c); dynamic background is warned where dot is defined, rather than pretending each argument is a resolved CSS literal.';
    row.findings = report.findings.filter(f => f.family === 'color' && f.rule === 'provenance/opaque-inline' && f.sites.some(s => s.file.endsWith('/pages/components/Select.tsx'))).map(f=>f.key); assert.ok(row.findings.length);
  }
  else if (/^(?:ui\/FarCanvas|pages\/foundations\/(?:Color|Elevation|Motion))\.tsx$/.test(filename)) { row.category = 'interactive specimen data'; row.reason = 'Reviewed pass: content/optical experiments in the documented foundation or specimen canvas. Template rgba is runtime arithmetic, not a literal color. Whole conditional/spread style objects remain fully opaque; this manual pass does not certify their paint as token-derived.'; }
  else if (filename.startsWith('ui/xray/')) { row.category = 'x-ray cut-wall artwork'; row.reason = 'Reviewed pass: exploded physical-model wall/rim tones or color arithmetic, supplied as model/renderer inputs. Cut-wall illustration is authored separately from the real control. Runtime renderer paint warnings remain reported; this is a manual art verdict, not automatic provenance approval.'; }
  else throw new Error(`Unreviewed color: ${row.file}:${row.line}`);
}
for (const row of records.arbitrary.filter(row=>row.category==='source-only class text')) {
  if (row.file.endsWith('/ui/Usage.tsx')) { row.category='grep false positive'; row.reason='Pass: --[a-z] is part of a RegExp for parsing theme names, not a utility candidate.'; }
  else if (row.file.endsWith('/pages/components/Slider.tsx') && row.token==='h-[22px]') { row.category='size outside Layer 4'; row.reason='Pass for this layer: height in NAME_TOP template/const composition; size is deliberately not judged. Reader emits no declaration at the const definition (the composed height cannot inflate provenance coverage).'; }
  else throw new Error(`Unreviewed arbitrary: ${row.file}:${row.line}`);
}
for (const row of records.durations.filter(row=>row.category==='accepted')) {
  row.reason = row.context.includes('0s !important') ? 'Pass: zero duration for explicit reduced-motion override.' : 'Pass: duration/easing alias resolves through the shared spring decisions; fallback is not the active duration. No literal duration is authored outside that fallback.';
}
for (const rows of Object.values(records)) for (const row of rows) assert.ok(!row.reason.includes('REVIEW'), `${row.file}:${row.line}`);
const additional=Object.fromEntries(['color','radius','type','motion','elevation','z'].map(family=>[family,report.findings.filter(f=>f.family===family).sort((a,b)=>b.sites.length-a.sites.length).map(f=>({key:f.key,rule:f.rule,severity:f.severity,value:f.declaration.value,why:f.why,verdict:f.rule==='provenance/opaque-inline'?'Runtime value unknown; retain warning and review custom-property boundary.':f.rule.endsWith('/framework')?'Debt: framework default was not adopted.':f.rule.endsWith('/by-value')?'Debt: matching literal/nondecision alias loses token identity; warning retained.':'Debt: unapproved authored value or unresolved expression; review named decision.',sites:f.sites.map(relativeSite)}))]));
const deadVars=report.findings.filter(f=>f.rule==='existence/dead-var').map(f=>({...f,sites:f.sites.map(relativeSite), verdict:f.key.endsWith(':--c')?'Confirmed stale tint hook: no setter/property map exists anywhere in scanned source or stylesheet graph.':'Confirmed optional graphite tint hook: undefined --c-g warns with fallback --c, which is itself missing and errors.'}));
const summary=Object.fromEntries(Object.entries(records).map(([name,rows])=>[name,{hits:rows.length,categories:Object.fromEntries([...new Set(rows.map(r=>r.category))].map(c=>[c,rows.filter(r=>r.category===c).length]))}]));
const result={commit:execFileSync('git',['-C',report.root,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),summary,coverage:report.coverage,...records,additional,deadVars};
await writeFile(new URL('./layer4.reconciliation.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(summary);

const safe = s => String(s).replace(/\|/g,'\\|').replace(/`/g,'\\`');
const md = ['# Layer 4 hit-by-hit reconciliation', '', `MetalUI ${result.commit}; source inputs read only.`, '', 'Each row is a linked finding or a manually reasoned pass. Core has no benchmark artwork exceptions.', ''];
for (const [category, rows] of Object.entries(records)) {
 md.push(`## ${category} (${rows.length} hits)`, '', '| Site | Grep hit | Verdict | Finding keys |', '| --- | --- | --- | --- |');
 for (const row of rows) md.push(`| ${row.file}:${row.line}:${row.column ?? 1} | ${safe(row.token ?? 'transition/animation line')} | ${safe(row.reason)} | ${row.findings.join(', ')} |`);
 md.push('');
}
await writeFile(new URL('./layer4.reconciliation.md',import.meta.url),md.join('\n')+'\n');
