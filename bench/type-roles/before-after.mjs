// The text styles plumber proposes for crafting-ui's measured text, by two builds of src/rules/type-roles.ts.
//   node bench/type-roles/before-after.mjs <old dist>/rules/type-roles.js <new dist>/rules/type-roles.js
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const rows = JSON.parse(readFileSync(new URL('./measurements.roles.json', import.meta.url), 'utf8'))
  .filter((r) => r.role || r.outside === 'poster size'); // the system's places, and what was left out for being large
const sentence = (t) => /\S\s+\S.*[.!?…]["'”’)]*\s*$/s.test((t ?? '').trim());
const members = rows.map((r) => { const [, file, line, column] = /^(.*):(\d+):(\d+)$/.exec(r.stamp);
  return { site: { file, line: +line, column: +column }, stamp: r.stamp, tag: r.tag, classes: [], current: { size: r.size, lineHeight: r.lh, letterSpacing: r.ls, weight: r.weight, transform: r.transform === 'uppercase' ? 'uppercase' : 'none' }, list: r.landmark === 'li', sentence: sentence(r.texts?.[0]), control: r.tag === 'button' || r.tag === 'summary' || r.tag === 'label' || r.landmark === 'button' || r.landmark === 'label', number: /^[\s$€£¥₹+\-−–.,:%()\d]*\d[\s$€£¥₹+\-−–.,:%()\d]*[a-z]{0,2}$/i.test((r.texts?.[0] ?? '').trim()), elements: r.elements, text: r.texts?.[0] ?? '' }; });
const textOf = new Map(members.map((m) => [m.stamp, m.text]));
const run = async (path) => (await import(pathToFileURL(path))).proposeTypeRoles(members);
const [before, after] = [await run(process.argv[2]), await run(process.argv[3])];
const line = (r) => `${r.name.padEnd(15)} ${String(r.bundle.size).padStart(5)}px  lh ${String(r.bundle.lineHeight).padEnd(5)} ${r.weightName.padEnd(8)} ${String(r.places).padStart(3)} places  other weights ${r.weights.reduce((n, w) => n + w.places, 0)}  | ${r.contexts.slice(0, 4).map((c) => `${c.tag}×${c.places}`).join(' ')}`;
for (const [name, p] of [['BEFORE', before], ['AFTER', after]]) {
  console.log(`\n${name}: ${p.roles.length} styles, ${p.cost.places} places, left out ${p.outside.length}, low confidence ${p.low.length}, merged ${p.merged.length}`);
  for (const r of p.roles) console.log('  ' + line(r));
}
const roleOf = (p) => new Map(p.roles.flatMap((r) => r.members.map((m) => [m.stamp, r])));
const a = roleOf(before), b = roleOf(after);
const moved = members.filter((m) => a.get(m.stamp)?.name !== b.get(m.stamp)?.name);
console.log(`\nplaces whose style changed: ${moved.length} of ${members.length}`);
const pairs = new Map(); for (const m of moved) { const k = `${a.get(m.stamp)?.name ?? 'left out'} → ${b.get(m.stamp)?.name ?? 'left out'}`; pairs.set(k, [...(pairs.get(k) ?? []), m]); }
for (const [k, ms] of [...pairs].sort((x, y) => y[1].length - x[1].length)) console.log(`  ${String(ms.length).padStart(3)}  ${k}   e.g. <${ms[0].tag}> ${ms[0].current.size}px “${ms[0].text.slice(0, 42)}”`);
// a second class beside the role (another weight) is the style not fitting the place
const extra = (p) => p.roles.reduce((n, r) => n + r.members.filter((m) => m.weight).length, 0);
console.log(`\nplaces that need a weight class beside their style: before ${extra(before)}, after ${extra(after)}`);
