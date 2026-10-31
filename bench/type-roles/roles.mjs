// Role inference over the places (analyze.mjs output): the proposed roles, each place's role and the cost of moving it.
//   node bench/type-roles/roles.mjs bench/type-roles/measurements.places.json
import { readFileSync, writeFileSync } from 'node:fs';
const places = JSON.parse(readFileSync(process.argv[2], 'utf8'));
// the proposed system (chosen from the members' own values, see docs/research/type-roles.md)
// VARIANT=A: eight roles (15px body merges into body-large); VARIANT=B (default): nine, body-medium kept for the 15px list body
const variant = process.env.VARIANT ?? 'B';
export const ROLES = {
  'display-large': { size: 44, lh: 1.05, ls: -0.025, weight: 500, note: 'clamp(2rem, 3.6vw, 3rem): 44px at 1280' },
  'headline-small': { size: 24, lh: 1.5, ls: -0.02, weight: 500 },
  'title-large': { size: 19, lh: 1.5, ls: -0.01, weight: 400 },
  'title-medium': { size: 17, lh: 1.5, ls: -0.01, weight: 600 },
  'body-large': { size: 16, lh: 1.6, ls: 0, weight: 400 },
  ...(variant === 'B' ? { 'body-medium': { size: 15, lh: 1.4, ls: 0, weight: 400 } } : {}),
  'body-small': { size: 14, lh: 1.5, ls: 0, weight: 400 },
  'label-medium': { size: 12, lh: 1.5, ls: 0.08, weight: 400 },
  'label-small': { size: 11, lh: 1.5, ls: 0.08, weight: 400 },
};
const outside = (p) => {
  if (['text', 'tspan'].includes(p.tag)) return 'drawing text (SVG)';
  if (!/^Geist/.test(p.family)) return `brand imitation (${p.family})`;
  if (/calc\(var\(--z\)/.test(p.cls)) return 'runtime-scaled drawing text (var(--z))';
  if (p.size >= 60) return 'poster size';
  if (/^src\/(specimen|motion\/harness|motion\/examples|demos|craft-rules)\//.test(p.file ?? '')) return 'specimen / demo content';
  return null;
};
const assign = (p) => {
  const caps = p.transform === 'uppercase';
  if (p.size >= 36) return 'display-large';
  if (p.size >= 22) return 'headline-small';
  if (p.size >= 18.5 || (p.size >= 17 && p.weight < 500)) return 'title-large';
  if (p.size >= 17) return 'title-medium';
  if (p.size >= 15.5) return 'body-large';
  if (p.size >= 14.5) return variant === 'B' ? 'body-medium' : 'body-large';
  if (p.size >= 13 && !caps) return 'body-small';
  if (caps ? p.size >= 11.5 : p.size >= 11.5) return 'label-medium';
  return 'label-small';
};
const typeClass = /^(?:[a-z-]+:)?(text-\[|text-(?:2xs|xs|sm|md|base|lg|xl|\dxl)$|leading-|tracking-|font-(?:thin|light|normal|medium|semibold|bold|black|\[)|uppercase$|normal-case$)/;
const rows = [], byRole = new Map(), low = [];
for (const p of places) {
  const why = outside(p);
  if (why) { rows.push({ ...p, role: null, outside: why }); continue; }
  const role = assign(p), r = ROLES[role];
  const dSize = +(r.size - p.size).toFixed(2), dLh = p.lh === null ? null : +((r.lh - p.lh) * r.size).toFixed(1), dLs = +((r.ls - p.ls) * r.size).toFixed(2), dWeight = r.weight - p.weight;
  const removed = p.cls.split(/\s+/).filter((c) => typeClass.test(c)).length;
  const confidence = Math.abs(dSize) > 2 || Math.abs(dWeight) >= 200 || (dLh !== null && Math.abs(dLh) > 3) ? 'low' : 'ok';
  const row = { ...p, role, dSize, dLh, dLs, dWeight, removed, confidence };
  rows.push(row); if (confidence === 'low') low.push(row);
  const b = byRole.get(role) ?? { role, places: 0, elements: 0, files: new Set(), sizes: new Map(), lhs: new Map(), lss: new Map(), weights: new Map(), contexts: new Map(), examples: [] };
  b.places++; b.elements += p.elements; b.files.add(p.file); for (const [m, k] of [[b.sizes, p.size], [b.lhs, p.lh], [b.lss, p.ls], [b.weights, p.weight], [b.contexts, `${p.tag} in ${p.landmark}`]]) m.set(k, (m.get(k) ?? 0) + 1);
  if (b.examples.length < 4) b.examples.push(`${p.stamp} <${p.tag}> “${p.texts[0]?.slice(0, 36)}”`);
  byRole.set(role, b);
}
const fmt = (m, n = 5) => [...m].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `${k}×${v}`).join(' ');
const inSystem = rows.filter((r) => r.role);
console.log(`places ${places.length}: in the system ${inSystem.length}, outside ${rows.length - inSystem.length}`);
for (const b of [...byRole.values()].sort((a, c) => ROLES[c.role].size - ROLES[a.role].size)) console.log(`\n${b.role}  ${JSON.stringify(ROLES[b.role])}\n  places ${b.places} · elements ${b.elements} · files ${b.files.size}\n  sizes ${fmt(b.sizes)} | line-heights ${fmt(b.lhs)} | letter-spacing(em) ${fmt(b.lss)} | weights ${fmt(b.weights)}\n  contexts ${fmt(b.contexts, 6)}\n  ${b.examples.join('\n  ')}`);
const hist = (key, steps) => { const out = {}; for (const r of inSystem) { const v = Math.abs(r[key] ?? 0); const bucket = steps.find((s) => v <= s) ?? `>${steps.at(-1)}`; out[bucket] = (out[bucket] ?? 0) + 1; } return out; };
console.log('\nmovement (places): size', JSON.stringify(hist('dSize', [0, 1, 2])), 'line-height(px)', JSON.stringify(hist('dLh', [0, 1, 2])), 'letter-spacing(px)', JSON.stringify(hist('dLs', [0, 0.5, 1])), 'weight', JSON.stringify(hist('dWeight', [0, 100])));
console.log(`distinct font sizes: before ${new Set(places.map((p) => p.size)).size} (in-system places: ${new Set(inSystem.map((p) => p.size)).size}) → after ${new Set(inSystem.map((r) => ROLES[r.role].size)).size} roles + outside ${new Set(rows.filter((r) => !r.role).map((r) => r.size)).size}`);
console.log(`type classes removed: ${inSystem.reduce((n, r) => n + r.removed, 0)} over ${inSystem.length} places (mean ${(inSystem.reduce((n, r) => n + r.removed, 0) / inSystem.length).toFixed(2)}), replaced by one role class each (+ uppercase where kept)`);
console.log(`\nlow confidence (${low.length}):`); for (const r of low.slice(0, 40)) console.log(`  ${r.stamp} <${r.tag}> ${r.size}px/${r.lh}/${r.ls}em/${r.weight} → ${r.role} (Δ ${r.dSize}px, lh ${r.dLh}px, w ${r.dWeight}) “${r.texts[0]?.slice(0, 30)}”`);
const out = new Map(); for (const r of rows.filter((r) => !r.role)) out.set(r.outside, (out.get(r.outside) ?? 0) + 1);
console.log('\noutside the system:', [...out].map(([k, v]) => `${k} ×${v}`).join(' · '));
writeFileSync(process.argv[2].replace('.places.json', '.roles.json'), JSON.stringify(rows));
