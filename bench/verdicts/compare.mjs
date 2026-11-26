#!/usr/bin/env node
// Compare a run of plumber's page check with an app's ledger of judged findings.
//
//   node bench/verdicts/compare.mjs <app> <run.json …> [--queue <file>] [--json]
//
// <app> is a ledger here (calcom → calcom.json). Each run file is the output of `plumber craft --json`.
// A place is a page, a check, a file and a line. For every place the ledger has judged, the run either still says
// it or no longer does:
//   right, still said   kept         right, gone   LOST (plumber stopped seeing something real)
//   wrong, still said   still wrong  wrong, gone   fixed
//   unsure              counted apart, never scored
// A place the run says that the ledger has never judged is new: listed, and written to the queue for the next round.
// A page read much less deeply than when it was judged is named first: its "gone" may be the run, not the engine.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); if (i < 0) return null; const v = args[i + 1]; args.splice(i, 2); return v; };
const asJson = args.includes('--json'); if (asJson) args.splice(args.indexOf('--json'), 1);
const queuePath = flag('--queue'), mergePath = flag('--merge'), byWho = flag('--by');
const [app, ...runs] = args;
if (!app || (!runs.length && !mergePath)) { console.error('usage: node bench/verdicts/compare.mjs <app> <run.json …> [--queue <file>] [--json]\n       node bench/verdicts/compare.mjs <app> --merge <judged queue> --by "<who>"'); process.exit(2); }

const here = dirname(fileURLToPath(import.meta.url));
const ledgerPath = join(here, `${app}.json`);
const ledger = JSON.parse(readFileSync(ledgerPath, 'utf8'));
const key = (route, x) => [route, x.rule, x.file, x.line].join('|');

// --merge: a queue whose entries have been given a verdict (right, wrong or unsure) and a why joins the ledger;
// entries still without a verdict stay out. A place already judged keeps its first verdict unless the new one says why.
if (mergePath) {
  const by = byWho;
  if (!by) { console.error('--merge needs --by "<who judged them>"'); process.exit(2); }
  const day = new Date().toISOString().slice(0, 10), have = new Map(ledger.verdicts.map((v) => [key(v.route, v), v]));
  let added = 0, changed = 0;
  for (const q of JSON.parse(readFileSync(mergePath, 'utf8'))) {
    if (!['right', 'wrong', 'unsure'].includes(q.verdict) || !q.why) continue;
    const entry = { route: q.route, rule: q.rule, file: q.file, line: q.line, said: q.said, verdict: q.verdict, why: q.why, judged: day, by };
    const old = have.get(key(q.route, q));
    if (old) { if (old.verdict !== q.verdict) { Object.assign(old, entry); changed++; } } else { ledger.verdicts.push(entry); have.set(key(q.route, q), entry); added++; }
  }
  ledger.verdicts.sort((a, b) => a.route.localeCompare(b.route) || a.rule.localeCompare(b.rule) || String(a.file).localeCompare(String(b.file)) || a.line - b.line);
  writeFileSync(ledgerPath, JSON.stringify(ledger, null, 1) + '\n');
  console.log(`${app}: ${added} added, ${changed} changed; ${ledger.verdicts.length} judged places now`);
  process.exit(0);
}

// the run: every place it says, and how deep each page was read
const said = new Map(), read = {};
for (const file of runs) {
  const report = JSON.parse(readFileSync(file, 'utf8'));
  for (const page of report.routes ?? []) {
    read[page.route] = page.read;
    if (page.settled === false) (read.unsettled ??= []).push(page.route);
    for (const x of page.findings) said.set(key(page.route, x), { route: page.route, rule: x.rule, file: x.file, line: x.line, said: x.title });
  }
}
const unsettled = read.unsettled ?? []; delete read.unsettled;
const ran = new Set(Object.keys(read));

// only the pages this run read are compared: a ledger of 18 pages and a run of 3 compare on those 3
const judged = ledger.verdicts.filter((v) => ran.has(v.route));
const known = new Set(judged.map((v) => key(v.route, v)));
const out = { kept: [], lost: [], stillWrong: [], fixed: [], unsure: [], new: [] };
for (const v of judged) {
  const now = said.has(key(v.route, v));
  if (v.verdict === 'right') (now ? out.kept : out.lost).push(v);
  else if (v.verdict === 'wrong') (now ? out.stillWrong : out.fixed).push(v);
  else out.unsure.push(v);
}
for (const [k, x] of said) if (!known.has(k)) out.new.push(x);

// pages read shallower than when they were judged (more than a tenth fewer elements)
const shallow = Object.entries(read).filter(([route, n]) => ledger.read?.[route] && n < ledger.read[route] * 0.9)
  .map(([route, n]) => ({ route, now: n, judged: ledger.read[route] }));

// the score, per check and per law: of the judged places this run still says, how many are right
const scored = [...out.kept, ...out.stillWrong];
const perCheck = {};
for (const v of scored) { const c = (perCheck[v.rule] ??= { right: 0, wrong: 0 }); c[v.verdict]++; }
const share = (r, w) => (r + w ? `${Math.round((100 * r) / (r + w))}%` : '–');

if (queuePath) writeFileSync(queuePath, JSON.stringify(out.new.map((x) => ({ ...x, verdict: null, why: '' })), null, 1) + '\n');

if (asJson) { console.log(JSON.stringify({ app, pages: [...ran], shallow, counts: Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.length])), perCheck, ...out }, null, 1)); process.exit(out.lost.length ? 1 : 0); }

const line = (v) => `    ${v.route}  ${v.rule}  ${v.file}:${v.line}  ${v.said ? `"${String(v.said).slice(0, 70)}"` : ''}${v.why ? `  (${v.why})` : ''}`;
console.log(`${app}: ${ran.size} page(s) compared with ${judged.length} judged places`);
for (const r of unsettled) console.log(`  ! ${r} was still loading when it was read. Run it again before trusting what is gone there.`);
for (const s of shallow) console.log(`  ! ${s.route} was read ${s.now} elements deep; it was judged at ${s.judged}. What is gone there may be the run.`);
console.log(`  right and still said  ${out.kept.length}`);
console.log(`  right and gone        ${out.lost.length}${out.lost.length ? '   <- plumber stopped seeing these' : ''}`);
out.lost.forEach((v) => console.log(line(v)));
console.log(`  wrong and still said  ${out.stillWrong.length}`);
out.stillWrong.forEach((v) => console.log(line(v)));
console.log(`  wrong and gone        ${out.fixed.length}`);
console.log(`  unsure                ${out.unsure.length}`);
console.log(`  not judged yet        ${out.new.length}${queuePath ? `   (written to ${queuePath})` : ''}`);
const right = scored.filter((v) => v.verdict === 'right').length;
console.log(`  of the judged places still said, right: ${right} of ${scored.length} (${share(right, scored.length - right)})`);
process.exit(out.lost.length ? 1 : 0);
