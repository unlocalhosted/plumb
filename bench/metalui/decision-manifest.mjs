import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { readCssVariables } from '../../dist/decisions/css.js';
import { familyFor } from '../../dist/decisions/index.js';
const report=JSON.parse(await readFile(new URL('./layer4.warm.json',import.meta.url),'utf8'));
const files=new Map();
for(const path of ['packages/metalui/src/components/theme.css','packages/metalui/src/components/tokens.css','apps/docs/src/styles.css']) {
 const file=join(report.root,path);files.set(file,{file,css:await readFile(file,'utf8'),imports:[],sourceOrigin:'project',reached:[]});
}
const reasons={
 spacing:'Shared foundations.space ladder and three layout relationship gaps only; recipe geometry excluded.',
 color:'Project generated paint theme or scalar/gradient paint token from approved token source; UI ink, surfaces, signals and recipe paint are explicit decisions.',
 radius:'Project radius theme, its root alias, or foundations.radius; value identity on the approved flat radius vocabulary.',
 type:'Complete control/editorial type role, its tracking, or project font family/weight theme; individual size/leading values are not synthesized from role objects.',
 motion:'Project curve/duration theme or CSS timing output of springs, gestures, waiting or recipes; physical spring parameters and travel are excluded.',
 elevation:'Project shadow theme or whole authored shadow stack; individual blur/offset/spread geometry and gradients are excluded.',
 z:'Named integer stacking plane from a project theme or z/z-index token; generic numbers are not adopted.',
 size:'Record only; size judgement deferred.',opacity:'Record only; opacity judgement deferred.',
};
const chosen=report.decisions.filter(d=>d.origin==='project').map(d=>({...d,choice:reasons[d.family],reasonStatus:d.why?'Source reason retained (own or inherited).':'Source has no recorded reason; none invented.'}));
const refs=new Set(chosen.flatMap(d=>[d.name,...d.refs.flatMap(ref=>[...ref.matchAll(/var\((--[\w-]+)/g)].map(m=>m[1]))]));
const raw=readCssVariables({files,roots:[...files.keys()],notes:[]});
const excluded=new Map();
for(const item of raw){
 if(refs.has(item.name))continue;
 const family=familyFor(item.name);
 let reason;
 if(item.name==='--spacing') reason='Resolution unit, never a spacing decision.';
 else if(family==='spacing')reason='Recipe-specific dimensional key outside the shared spacing ladder/relationship gaps; not a second layout ladder.';
 else if(family==='size'||family==='opacity')reason='Family recorded only; no provenance judgement in Layer 4.';
 else if(/stretch/.test(item.name))reason='Font stretch is outside the five judged type properties; preserve in tokens without adding a type decision.';
 else if(/(?:stiffness|damping|zeta|travel|mass|lift|offset|blur|spread|scale|x$|y$)/.test(item.name))reason='Physical/rendering parameter, layout geometry or a constituent of a recipe; not a whole decision in a judged family.';
 else if(!item.root&&!item.theme)reason='Selector-scoped runtime/state assignment; existence proof, not a shared decision source.';
 else reason='No project theme decision or whole scalar/gradient paint, radius, complete type role, timing, shadow stack or named integer z plane. Kept for resolution/existence only.';
 excluded.set(item.name,{name:item.name,value:item.value,source:item.source,reason});
}
const result={chosen,excluded:[...excluded.values()].sort((a,b)=>a.name.localeCompare(b.name))};
await writeFile(new URL('./layer4.decisions.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log({chosen:chosen.length,excluded:result.excluded.length});
