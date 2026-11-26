// Proof that a docs demo is true to its own check (docs/briefs/new-check.md §5): each example on the "What Plumber
// checks" page is drawn broken and drawn fixed, and the real page check is run over both. A demo holds when its check
// speaks on the broken scene and is quiet on the fixed one.
//
//   node scripts/proof/demo-check.mjs [--only craft/] [--ids craft/a,craft/b] [--chunk 24] [--limit 48] [--json]
//
// The scenes are drawn many to a page, each in its own box, so two things are told apart in the result: a check that
// did not speak, and a check that reads the whole page's habits (it cannot be judged in a grid of unrelated scenes).
// Scenes are drawn without their guides (rings, pills), which are plumber's own marks and not part of the example.
import { execFile } from 'node:child_process';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { repo, servePage } from './serve.mjs';

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const value = (name) => { const i = args.indexOf(`--${name}`); return i < 0 ? null : args[i + 1]; };

// the demos, and which checks read the whole page (asked of node, where a scene cannot be drawn but its name can be read)
const { RULES } = await import(join(repo, 'overlay/src/craft-rules.js'));
const { PACK_RULES } = await import(join(repo, 'overlay/src/packs.js'));
const rules = new Map([...RULES, ...PACK_RULES].map((r) => [r.id, r]));
const demos = {};
for (const f of ['craft', 'slop', 'words', 'states', 'access']) Object.assign(demos, Object.values(await import(join(repo, `overlay/src/checks/${f}.js`)))[0]);
let ids = Object.keys(demos);
if (value('only')) ids = ids.filter((id) => id.startsWith(value('only')));
if (value('ids')) ids = value('ids').split(',');
if (value('limit')) ids = ids.slice(0, Number(value('limit')));
const chunk = Number(value('chunk') ?? 24), pages = Math.ceil(ids.length / chunk);

const page = `// made by scripts/proof/demo-check.mjs: the docs' example scenes, many to a page, broken (?p=0) or fixed (?p=1)
import { useEffect, useRef } from 'react';
import { CHECK_SPECS, CHECK_CSS } from '/@fs${repo}overlay/src/check-motion.js';
import tokens from '/@fs${repo}overlay/src/tokens.css?inline';
const IDS = ${JSON.stringify(ids)};
const q = new URLSearchParams(location.search), c = Number(q.get('c') ?? 0), p = Number(q.get('p') ?? 0);
const shown = IDS.slice(c * ${chunk}, c * ${chunk} + ${chunk});
function Scene({ id }) {
  const ref = useRef(null);
  useEffect(() => {
    const stage = ref.current; stage.innerHTML = '';
    try { const spec = CHECK_SPECS[id](stage); spec.at?.(p); for (const g of spec.guides ?? []) g.el.remove(); stage.dataset.built = 'yes'; }
    catch (error) { stage.dataset.built = String(error?.message ?? error); }
  }, [id]);
  return <section data-demo={id} style={{ position: 'relative', height: 220, width: 460, margin: '0 0 40px' }}><div ref={ref} className="stage" style={{ position: 'absolute', inset: 0 }} /></section>;
}
export function App() {
  return <main style={{ padding: 40 }}><style>{tokens + CHECK_CSS}</style>{shown.map((id) => <Scene key={id} id={id} />)}</main>;
}
`;

const served = await servePage({ text: page });
let report;
try {
  const routes = []; for (let c = 0; c < pages; c++) for (const p of [0, 1]) routes.push(`/?c=${c}&p=${p}`);
  const r = await promisify(execFile)('node', [join(repo, 'dist/cli.js'), 'craft', '--url', served.url, '--routes', ...routes, '--json', '--no-probe', '--no-pairs', '--timeout', '90000', '--root', served.root],
    { cwd: repo, timeout: 60 * 60000, maxBuffer: 5e8 }).catch((e) => e);
  if (!String(r.stdout ?? '').trim().startsWith('{')) throw new Error(`The page check gave no report: ${String(r.stderr ?? r.message).slice(-800)}`);
  report = JSON.parse(r.stdout);
} finally { await served.close(); }

// which scene a finding is in: the scenes are the <section>s of <main>, in order
const sceneOf = (route, f) => { const m = /(?:^|>)section:(\d+)/.exec(f.path ?? ''); const c = Number(new URL(route, 'http://x').searchParams.get('c')); return m ? ids[c * chunk + Number(m[1]) - 1] : null; };
const seen = { 0: new Map(), 1: new Map() }, lost = { 0: 0, 1: 0 };
for (const pg of report.routes) {
  const p = Number(new URL(pg.route, 'http://x').searchParams.get('p'));
  for (const f of pg.findings) { const id = sceneOf(pg.route, f); if (!id) { lost[p]++; continue; } seen[p].set(id, [...(seen[p].get(id) ?? []), f.rule]); }
}
const wholePage = (id) => (rules.get(id)?.reads ?? []).includes('census');
const rows = ids.map((id) => {
  const broken = seen[0].get(id) ?? [], fixed = seen[1].get(id) ?? [];
  const speaks = broken.includes(id), quiet = !fixed.includes(id);
  return { id, speaks, quiet, kind: !rules.has(id) ? 'no such check' : wholePage(id) ? 'reads the whole page' : rules.get(id).pairs || /probe|other|source|meaning/.test((rules.get(id).reads ?? []).join()) ? 'needs a gesture, a second look or a model' : 'still page',
    othersWhenFixed: [...new Set(fixed.filter((r) => r !== id))] };
});
const holds = rows.filter((r) => r.speaks && r.quiet), silent = rows.filter((r) => !r.speaks), stuck = rows.filter((r) => r.speaks && !r.quiet);
const result = { demos: ids.length, pages: report.routes.map((p) => ({ route: p.route, read: p.read, findings: p.findings.length })), holds: holds.length, silent, stuck, unplaced: lost, rows };

if (flag('json')) console.log(JSON.stringify(result, null, 2));
else {
  console.log(`${ids.length} demos, ${pages} pages of ${chunk}, each drawn broken and fixed.`);
  console.log(`\n${holds.length} hold: the check speaks on the broken scene and is quiet on the fixed one.`);
  const by = (list) => { const m = new Map(); for (const r of list) m.set(r.kind, [...(m.get(r.kind) ?? []), r.id]); return [...m]; };
  console.log(`\n${silent.length} where the check did not speak on its own broken scene:`);
  for (const [kind, list] of by(silent)) console.log(`  ${kind} (${list.length}): ${list.join(' ')}`);
  console.log(`\n${stuck.length} where the check still speaks on the fixed scene:${stuck.length ? `\n  ${stuck.map((r) => r.id).join(' ')}` : ''}`);
  const noisy = rows.filter((r) => r.othersWhenFixed.length);
  console.log(`\n${noisy.length} fixed scenes where some other check speaks (the example is not clean everywhere else).`);
  if (lost[0] || lost[1]) console.log(`\n${lost[0] + lost[1]} findings could not be placed in a scene (no place given by the check).`);
}
process.exitCode = silent.filter((r) => r.kind === 'still page').length || stuck.length ? 1 : 0;
