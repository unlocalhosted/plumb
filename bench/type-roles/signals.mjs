import { readFileSync } from 'node:fs';
const rows = JSON.parse(readFileSync(process.argv[2], 'utf8')).filter((r) => r.role);
// today's engine (src/rules/type-roles.ts roleFor): size and capitals only
const roleFor = (p) => { const caps = p.transform === 'uppercase', s = p.size;
  if (caps && s <= 13.5) return s < 11.5 ? 'label-small' : 'label-medium';
  if (s >= 36) return 'display-large'; if (s >= 22) return 'headline-small'; if (s >= 18.5) return 'title-large'; if (s >= 17) return 'title-medium'; if (s >= 14.5) return 'body-large'; return 'body-small'; };
const tally = (list, key) => { const m = new Map(); for (const r of list) { const k = key(r); m.set(k, (m.get(k) ?? 0) + 1); } return [...m].sort((a, b) => b[1] - a[1]); };
const show = (t, n = 8) => t.slice(0, n).map(([k, v]) => `${k}×${v}`).join('  ');
const by = new Map(); for (const r of rows) { const k = roleFor(r); by.set(k, [...(by.get(k) ?? []), r]); }
console.log('in-system places', rows.length);
for (const [role, list] of by) {
  console.log(`\n${role}  ${list.length} places`);
  console.log('  tag      ', show(tally(list, (r) => r.tag)));
  console.log('  inside   ', show(tally(list, (r) => r.landmark)));
  console.log('  words    ', show(tally(list, (r) => r.shape)));
  console.log('  lines    ', show(tally(list, (r) => (r.lines >= 3 ? '3+' : String(r.lines)))));
}
// what an HTML tag says the job is, against what size says
const heading = (r) => /^h[1-6]$/.test(r.tag), para = (r) => r.tag === 'p', control = (r) => ['button', 'label', 'a', 'summary', 'th', 'dt', 'kbd', 'figcaption'].includes(r.tag) || r.landmark === 'button';
const named = (k) => (/^(display|headline|title)/.test(k) ? 'heading-kind' : /^body/.test(k) ? 'body-kind' : 'label-kind');
const H = rows.filter(heading), P = rows.filter(para), C = rows.filter(control);
console.log('\nheadings (h1–h6):', H.length, '→ named', show(tally(H, (r) => named(roleFor(r)))));
console.log('paragraphs (p):', P.length, '→ named', show(tally(P, (r) => named(roleFor(r)))));
console.log('controls and labels by tag (button, label, a, summary, th, dt, kbd, figcaption, or inside a button):', C.length, '→ named', show(tally(C, (r) => named(roleFor(r)))));
const sent = rows.filter((r) => r.shape === 'sentence'); console.log('sentences:', sent.length, '→ named', show(tally(sent, (r) => named(roleFor(r)))));
const multi = rows.filter((r) => r.lines >= 3); console.log('3+ lines:', multi.length, '→ named', show(tally(multi, (r) => named(roleFor(r)))));
console.log('\nexamples: paragraphs named a heading kind');
for (const r of P.filter((r) => named(roleFor(r)) === 'heading-kind').slice(0, 5)) console.log(`  ${r.size}px <${r.tag}> in ${r.landmark}, ${r.lines} lines: “${(r.texts[0] ?? '').slice(0, 60)}”`);
console.log('examples: headings named a body or label kind');
for (const r of H.filter((r) => named(roleFor(r)) !== 'heading-kind').slice(0, 6)) console.log(`  ${r.size}px <${r.tag}> in ${r.landmark} ${r.transform}: “${(r.texts[0] ?? '').slice(0, 50)}”`);
console.log('examples: same size, different jobs (17–17.5px)');
for (const r of rows.filter((r) => r.size >= 17 && r.size < 18).slice(0, 40).filter((r, i, a) => a.findIndex((x) => x.tag + x.landmark === r.tag + r.landmark) === i).slice(0, 7)) console.log(`  ${r.size}px/${r.weight} <${r.tag}> in ${r.landmark}, ${r.shape}, ${r.lines} lines: “${(r.texts[0] ?? '').slice(0, 44)}”`);
