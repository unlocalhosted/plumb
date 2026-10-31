// From measurements.json: places (deduped by source stamp), their type bundles, and the bundle table to infer roles from.
//   node bench/type-roles/analyze.mjs bench/type-roles/measurements.json [roles.json]
import { readFileSync, writeFileSync } from 'node:fs';
const data = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const places = new Map();
for (const e of data.elements) {
  const key = e.stamp ?? `${e.route}|${e.tag}|${e.cls}`;
  let p = places.get(key);
  if (!p) places.set(key, (p = { stamp: e.stamp, file: e.stamp?.replace(/:\d+:\d+$/, ''), tag: e.tag, role: e.role, cls: e.cls, elements: 0, routes: new Set(), shapes: new Map(), landmarks: new Map(), cards: new Map(), texts: [], sizes: new Map(), bundles: new Map(), sample: e }));
  p.elements++; p.routes.add(e.route);
  p.shapes.set(e.shape, (p.shapes.get(e.shape) ?? 0) + 1);
  for (const l of e.landmarks.slice(0, 3)) p.landmarks.set(l, (p.landmarks.get(l) ?? 0) + 1);
  if (e.card) p.cards.set(e.card, (p.cards.get(e.card) ?? 0) + 1);
  if (p.texts.length < 3 && !p.texts.includes(e.text)) p.texts.push(e.text);
  p.sizes.set(e.size, (p.sizes.get(e.size) ?? 0) + 1);
  const b = `${e.size}|${e.lhRatio ?? 'n'}|${e.lsEm}|${e.weight}|${e.transform}`;
  p.bundles.set(b, (p.bundles.get(b) ?? 0) + 1);
}
const top = (m) => [...m].sort((a, b) => b[1] - a[1])[0]?.[0];
const rows = [...places.values()].map((p) => {
  const bundle = top(p.bundles), [size, lh, ls, weight, transform] = bundle.split('|');
  return { ...p, routes: [...p.routes], bundle, size: +size, lh: lh === 'n' ? null : +lh, ls: +ls, weight: +weight, transform, shape: top(p.shapes), landmark: top(p.landmarks) ?? '-', card: top(p.cards) ?? '-', family: p.sample.family, color: p.sample.color, parentRatio: p.sample.parentRatio, siblingRatio: p.sample.siblingRatio, lines: p.sample.lines };
});
// drawing text scaled at runtime (calc(var(--z) * N)): sizes vary per element of one place
const scaled = rows.filter((p) => p.sizes.size > 1 && [...p.sizes.keys()].some((s) => !Number.isInteger(s * 2)));
console.log(`places ${rows.length} (elements ${data.elements.length}) · routes ${data.routes.filter((r) => r.elements).length} · places whose size varies between elements ${scaled.length}`);
const sizes = new Map(); for (const p of rows) sizes.set(p.size, (sizes.get(p.size) ?? 0) + 1);
console.log('font sizes (px → places):', [...sizes].sort((a, b) => a[0] - b[0]).map(([s, n]) => `${s}:${n}`).join('  '));
const families = new Map(); for (const p of rows) families.set(p.family, (families.get(p.family) ?? 0) + 1);
console.log('families:', [...families].sort((a, b) => b[1] - a[1]).map(([f, n]) => `${f}:${n}`).join('  '));
// the bundle table
const bundles = new Map();
for (const p of rows) { const b = bundles.get(p.bundle) ?? { bundle: p.bundle, places: 0, elements: 0, files: new Set(), tags: new Map(), shapes: new Map(), landmarks: new Map(), cards: new Map(), examples: [], cls: new Map() }; b.places++; b.elements += p.elements; b.files.add(p.file); b.tags.set(p.tag, (b.tags.get(p.tag) ?? 0) + 1); b.shapes.set(p.shape, (b.shapes.get(p.shape) ?? 0) + 1); b.landmarks.set(p.landmark, (b.landmarks.get(p.landmark) ?? 0) + 1); b.cards.set(p.card, (b.cards.get(p.card) ?? 0) + 1); if (b.examples.length < 3) b.examples.push(`${p.stamp} <${p.tag}> “${p.texts[0]?.slice(0, 40)}”`); for (const c of p.cls.split(/\s+/)) if (/^(text-|leading-|tracking-|font-|uppercase|measure|type-|display|headline|title|body|label|caps)/.test(c)) b.cls.set(c, (b.cls.get(c) ?? 0) + 1); bundles.set(p.bundle, b); }
const fmt = (m, n = 3) => [...m].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `${k}:${v}`).join(' ');
console.log(`\nbundles (size|lh|lsEm|weight|transform): ${bundles.size}`);
for (const b of [...bundles.values()].sort((a, b) => b.places - a.places).slice(0, 60)) console.log(`${b.bundle.padEnd(34)} places ${String(b.places).padStart(3)} el ${String(b.elements).padStart(4)} files ${String(b.files.size).padStart(2)} | tags ${fmt(b.tags)} | shape ${fmt(b.shapes, 2)} | in ${fmt(b.landmarks, 2)} | ${fmt(b.cards, 1)} | classes ${fmt(b.cls, 4)}\n    ${b.examples.join('\n    ')}`);
writeFileSync(process.argv[2].replace(/\.json$/, '.places.json'), JSON.stringify(rows.map(({ shapes, landmarks, cards, sizes, bundles, sample, ...r }) => r)));
