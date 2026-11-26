// Proof that a check leaves the others alone (docs/briefs/new-check.md §6a): the same pages are judged with the named
// checks on and with them off. The only difference allowed is those checks' own findings; every other finding that
// appears, goes or changes is printed. Errors a check throws are counted too (the engine hides them).
//
//   node scripts/proof/on-off.mjs --rules craft/scrollbar-gutter,craft/leading --url http://localhost:5173 [--routes / /settings] [--root <app dir>]
//   node scripts/proof/on-off.mjs --rules tells/em-dash --page bench/tells/App.jsx      a throwaway app drawn from one file
//   --full     also read the hover, width and gesture states (slower); off by default
//   --json     print the result as JSON
//
// Needs a built dist (npm run build). Exit code 1 when another check's findings differ or anything threw.
import { join, resolve } from 'node:path';
import { repo, servePage } from './serve.mjs';

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const value = (name) => { const i = args.indexOf(`--${name}`); return i < 0 ? null : args[i + 1]; };
const list = (name) => { const i = args.indexOf(`--${name}`); if (i < 0) return []; const out = []; for (let k = i + 1; k < args.length && !args[k].startsWith('--'); k++) out.push(...args[k].split(',')); return out.filter(Boolean); };

const rules = list('rules');
if (!rules.length || (!value('url') && !value('page'))) {
  console.error('Usage: node scripts/proof/on-off.mjs --rules <id,id> (--url <dev server> [--routes / /x] [--root <dir>] | --page <App.jsx>) [--full] [--json]');
  process.exit(2);
}

const { craftRun } = await import(join(repo, 'dist/craft-run.js'));

// where a finding is, and what it says. Two findings with the same place are the same finding; what it says is
// compared apart, so a changed suggestion is told from a finding that came or went.
const place = (page, f) => `${page.route} ${f.rule} ${f.file ? `${f.file.replace(/^.*\/(src|app|components)\//, '$1/')}:${f.line}:${f.column}` : f.path ?? f.tag} ${JSON.stringify(f.text ?? '').slice(0, 60)}`;
const says = (f) => JSON.stringify({ title: f.title, action: f.action, suggest: f.suggest ?? null, confidence: f.confidence, count: f.count, soft: f.soft ?? false, by: f.by ?? 'rule' });
const read = (pages) => { const m = new Map(); for (const p of pages) for (const f of p.findings) { const k = place(p, f); let n = 1, key = k; while (m.has(key)) key = `${k} #${++n}`; m.set(key, f); } return m; };
const batch = new Set(rules);

function compare(a, b) {
  const A = read(a), B = read(b), out = [];
  for (const [k, f] of A) {
    if (batch.has(f.rule)) continue;
    const g = B.get(k);
    if (!g) out.push({ kind: 'only-with', place: k, title: f.title });
    else if (says(f) !== says(g)) out.push({ kind: 'changed', place: k, with: JSON.parse(says(f)), without: JSON.parse(says(g)) });
  }
  for (const [k, f] of B) if (!batch.has(f.rule) && !A.has(k)) out.push({ kind: 'only-without', place: k, title: f.title });
  return out;
}

const served = value('page') ? await servePage(value('page')) : null;
const options = { url: served?.url ?? value('url'), routes: served ? ['/'] : (list('routes').length ? list('routes') : ['/']), root: served?.root ?? resolve(value('root') ?? process.cwd()),
  timeout: 60000, pairs: flag('full'), probe: flag('full') };
let result;
try {
  const on = await craftRun({ ...options, proof: { without: [] } });
  const off = await craftRun({ ...options, proof: { without: rules } });
  let differences = compare(on, off), noise = [];
  // a page can differ from itself between two runs (something still loading, an animation). A difference that also
  // shows between two runs with the checks on is the run's, not the checks'.
  if (differences.length) {
    const again = await craftRun({ ...options, proof: { without: [] } });
    const own = new Set(compare(on, again).map((d) => d.place));
    noise = differences.filter((d) => own.has(d.place));
    differences = differences.filter((d) => !own.has(d.place));
  }
  // a proof on nothing is no proof: a page that was not read (it failed to draw, or plumber found no source) stops here
  const empty = on.filter((p) => !p.read).map((p) => p.route);
  if (empty.length) throw new Error(`Nothing was read on ${empty.join(', ')}: the page did not draw, or plumber found no source for it. Nothing is proven.`);
  const own = Object.fromEntries(rules.map((r) => [r, on.flatMap((p) => p.findings).filter((f) => f.rule === r).length]));
  const leaked = off.flatMap((p) => p.findings).filter((f) => batch.has(f.rule)).length;
  const thrown = on.flatMap((p) => (p.thrown ?? []).map((t) => ({ ...t, route: p.route })));
  result = { rules, pages: on.map((p) => ({ route: p.route, read: p.read, complete: p.complete, findings: p.findings.length })), own, leaked, differences, noise, thrown };
} finally { await served?.close(); }

if (flag('json')) console.log(JSON.stringify(result, null, 2));
else {
  for (const p of result.pages) console.log(`${p.route}: ${p.read} elements read${p.complete ? '' : ' (not the whole page)'}, ${p.findings} findings with the checks on`);
  for (const [r, n] of Object.entries(result.own)) console.log(`  ${r}: ${n} of its own${n ? '' : '  ← it never spoke on these pages, so this run proves little about it'}`);
  if (result.leaked) console.log(`  ! ${result.leaked} findings of the named checks were still there with them off: the switch did not take`);
  console.log(result.differences.length ? `\n${result.differences.length} differences in OTHER checks:` : '\nNo other check changed.');
  for (const d of result.differences) console.log(d.kind === 'changed' ? `  changed       ${d.place}\n      with:    ${JSON.stringify(d.with)}\n      without: ${JSON.stringify(d.without)}` : `  ${d.kind.padEnd(13)} ${d.place}\n      ${d.title}`);
  if (result.noise.length) console.log(`\n${result.noise.length} differences also showed between two runs with the checks on (the page, not the checks):\n${result.noise.map((d) => `  ${d.place}`).join('\n')}`);
  const by = new Map(); for (const t of result.thrown) by.set(`${t.rule}: ${t.error}`, (by.get(`${t.rule}: ${t.error}`) ?? 0) + 1);
  console.log(by.size ? `\n${result.thrown.length} errors thrown by checks:\n${[...by].map(([k, n]) => `  ${n}×  ${k}`).join('\n')}` : '\nNo check threw.');
}
process.exitCode = result.differences.length || result.thrown.length || result.leaked ? 1 : 0;
