// Numbers for the nextapps corpus. Per app and bundler there are two runs of the same pages:
//   stamped  withPlumb(config, { stamp: true }). Its stamps (read from the DOM) are the ground truth, and it is also
//            the "stamped (proposed)" column: what locate answers once stamping is the default.
//   plain    withPlumb(config, { stamp: false }), today's behaviour. Judged against the stamped run's stamps.
// Elements are matched across the two runs by route + DOM path + tag; the rest are counted as unmatched, never guessed.
import { writeFile } from 'node:fs/promises';
import { distribution, pct } from './lib.mjs';
import { judge, truthOf } from './measure.mjs';
import { summarize } from './report.mjs';
import { nextApps } from './nextapps.mjs';

const SEVERITY = { 'wrong-file-other': 0, 'wrong-file-ancestor': 1, 'file-only': 2, 'line-only': 3, refused: 4, 'usage-miss': 5, 'usage-refused': 6 };
const KINDS = ['server', 'client', 'unknown'];
const rowKey = (r) => `${r.screen}|${r.key}`;

export function buildNextReport(rows, meta) {
  const out = {};
  const worst = [];
  for (const [app, def] of Object.entries(nextApps)) {
    const appRows = rows.filter((r) => r.corpus === app);
    if (!appRows.length && !meta.nextapps?.[app]) continue;
    out[app] = {};
    for (const bundler of ['turbopack', 'webpack']) {
      const S = appRows.filter((r) => r.host === `${bundler}-stamped`);
      const P = appRows.filter((r) => r.host === `${bundler}-plain`);
      if (!S.length && !P.length) continue;
      const stampedBy = new Map(S.map((r) => [rowKey(r), r]));
      const plainBy = new Map(P.map((r) => [rowKey(r), r]));
      const truthBy = new Map();
      for (const r of S) { const t = truthOf(r); if (t) truthBy.set(rowKey(r), t); }
      for (const r of S) { r.verdict = judge(r, truthOf(r)); r.split = r.kind; r.matched = plainBy.has(rowKey(r)) && plainBy.get(rowKey(r)).tag === r.tag; }
      for (const r of P) {
        const mate = stampedBy.get(rowKey(r));
        r.matched = !!mate && mate.tag === r.tag;
        r.split = r.matched ? mate.kind : 'unmatched';
        const t = r.matched ? truthBy.get(rowKey(r)) : null;
        r.verdict = r.matched ? judge(r, t) : 'unmatched';
        r.truth = t ? { file: t.file, line: t.line, column: t.column, kind: t.kind } : null;
        r.serverKind = r.split;
      }
      const group = (list) => ({
        all: summarize(list), ...Object.fromEntries(KINDS.map((k) => [k, summarize(list.filter((r) => r.split === k))])),
      });
      const withStampShare = (g) => { for (const s of Object.values(g)) s.stampPct = pct(s.via?.stamp ?? 0, s.elements); return g; };
      const plain = withStampShare(group(P.filter((r) => r.matched)));
      const stamped = withStampShare(group(S));
      out[app][bundler] = {
        plain, stamped, stampedMode: S[0]?.mode ?? null,
        plainAllRows: summarize(P),
        matching: {
          stampedElements: S.length, plainElements: P.length,
          matched: P.filter((r) => r.matched).length, plainUnmatched: P.filter((r) => !r.matched).length, stampedUnmatched: S.filter((r) => !r.matched).length,
          plainJudged: plain.all.judged,
          stampedWithDomStamp: S.filter((r) => r.domStamp).length,
          stampedWithDomStampByKind: Object.fromEntries(KINDS.map((k) => [k, { elements: S.filter((r) => r.kind === k).length, withDomStamp: S.filter((r) => r.kind === k && r.domStamp).length }])),
        },
        perRoute: Object.fromEntries([...new Set(S.concat(P).map((r) => r.screen))].map((route) => [route, { stamped: summarize(S.filter((r) => r.screen === route)).elements, plain: summarize(P.filter((r) => r.screen === route)).elements }])),
      };
      const w = P.filter((r) => r.verdict in SEVERITY).sort((a, b) => SEVERITY[a.verdict] - SEVERITY[b.verdict] || (a.screen < b.screen ? -1 : 1)).slice(0, 15);
      worst.push(...w.map((r) => ({ app, bundler, route: r.screen, key: r.key, tag: r.tag, kind: r.split, verdict: r.verdict, expected: r.truth, got: r.found ? { file: r.file, line: r.line, column: r.column, via: r.via } : null, reason: r.reason ?? null, step: r.step ?? null })));
    }
  }
  const slim = rows.map(({ chain, ownerFiles, detail, ...r }) => r);
  return { meta, summary: out, worst, rows: slim };
}

const f = (v, u = '') => (v === null || v === undefined ? '–' : v + u);
const loc = (l) => (l ? `${l.file}:${l.line}:${l.column}` : '–');
const t3 = (d) => `${f(d.p50)} / ${f(d.p95)}`;
const cell = (s) => (s.elements ? `${s.elements}: found ${f(s.foundPct)} %, exact ${f(s.exactPct)} %, wrong-file ${f(s.wrongFilePct)} %` : '0');

export function nextMarkdown(report) {
  const { meta, summary, worst } = report;
  const o = [];
  const p = (...l) => o.push(...l);
  p('# Locate on real Next apps', '',
    `Measured ${meta.date} on ${meta.commit} with \`node bench/locate/run.mjs ${meta.args}\`. ${meta.versions}. Raw rows: \`${meta.jsonName}\`.`, '',
    '## How it was measured', '',
    '- Three real open-source Next apps, cloned shallow at pinned commits into `bench/locate/.corpus` (not committed), installed with pnpm (`--ignore-scripts` unless noted below). Each app is copied into a scratch folder and run with `next dev` on port 0.',
    '- Each app runs on its own bundler and the other one. On each bundler there are two runs of the same routes: **stamped** = `withPlumb(config, { stamp: true })` (the new loader writes `data-plumb-source` on every JSX opening of the app\'s own `.jsx`/`.tsx`), and **plain** = `withPlumb(config, { stamp: false })`, which is what a user gets today (owner-stack reconstruction).',
    '- **Ground truth** is the stamp the stamped run writes on the element (`data-plumb-source`, read in the page). It says which JSX opening made the element. Plain-run elements are matched to stamped-run elements by route + DOM path from `<body>` + tag. Elements with no counterpart are counted as **unmatched** and left out of the plain numbers; elements whose stamp is a forwarded component usage are judged apart, and elements with no stamp (a library drew them) are in found % and timing but not in exact %.',
    '- **stamped (proposed)** is the stamped run\'s own locate answers: what users would get if stamping were the default. Its exact % is against its own stamps, so it shows only whether locate reads them.',
    `- Sample: every element under \`<body>\` outside the overlay when a page has at most ${meta.cap}; otherwise those whose DOM-path key hashes to 0 modulo ceil(N/${meta.cap}). Each is located with the overlay's own \`window.__plumb.locate(el, { explain: true })\`. Cold = first locate of the element in a fresh page; warm = second pass; first call = the first locate of each page.`,
    '- **Server vs client**: from the stamped run, by the element\'s React owner: an owner that is a fiber is a client component; an owner that is not a fiber (React\'s server component debug info) is a server component; no owner is `unknown`. Plain-run elements take the kind of their matched stamped element.', '');
  p('## Edits to the apps (copies only; the clones are untouched)', '');
  for (const [k, a] of Object.entries(meta.nextapps ?? {})) p(`**${a.name}** @ ${a.sha}, Next ${a.next}, own bundler ${a.ownBundler}. ${a.note}`, '', ...a.edits.map((e) => `- ${e}`), '');
  p('## Results', '', 'Plain = today. Stamped = proposed default. Cells: elements matched and judged, found %, exact %, wrong-file %. Timings are ms, p50 / p95.', '');
  p('| app | bundler | run | elements | found % | exact % | line-only % | wrong-file % (ancestor / other) | refused % | first call | warm | answered via stamp % |', '|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const [app, bs] of Object.entries(summary)) for (const [b, r] of Object.entries(bs)) {
    for (const [mode, label] of [['plain', 'plain (today)'], ['stamped', r.stampedMode === 'host' ? 'stamped, DOM tags only (truth; full stamping did not render)' : 'stamped (proposed)']]) {
      const s = r[mode].all;
      if (!s.elements) { p(`| ${app} | ${b} | ${label} | NOT RUN | | | | | | | | |`); continue; }
      p(`| ${app} | ${b} | ${label} | ${s.elements} | ${f(s.foundPct)} | ${f(s.exactPct)} | ${f(s.lineOnlyPct)} | ${f(s.wrongFilePct)} (${f(s.wrongAncestorPct)} / ${f(s.wrongOtherPct)}) | ${f(s.refusedPct)} | ${t3(s.firstCall)} | ${t3(s.warm)} | ${f(s.stampPct)} |`);
    }
  }
  p('', '### Full stamping (every JSX opening, components included): did the app render?', '');
  for (const [app, a] of Object.entries(meta.nextapps ?? {})) for (const r of a.runs.filter((x) => x.mode === 'full')) {
    const ok = r.routes.filter((x) => !x.failed).length, bad = r.routes.filter((x) => x.failed);
    p(`- **${a.name} ${r.host.split('-')[0]}**: ${ok} of ${r.routes.length} routes rendered${r.failed ? '; run failed: ' + r.failed : ''}${bad.length ? '. Failures: ' + bad.map((x) => `\`${x.route}\` ${x.failed.replace(/\n/g, ' ').slice(0, 200)}`).join('; ') : ''}`);
  }
  p('', '### Server vs client components', '', 'Per kind of component that drew the element: elements, found %, exact %, wrong-file %, and the share answered via `stamp`.', '');
  p('| app | bundler | run | server | client | unknown |', '|---|---|---|---|---|---|');
  for (const [app, bs] of Object.entries(summary)) for (const [b, r] of Object.entries(bs)) for (const mode of ['plain', 'stamped']) {
    const c = (k) => { const s = r[mode][k]; return s.elements ? `${s.elements}: found ${f(s.foundPct)} %, exact ${f(s.exactPct)} %, wrong ${f(s.wrongFilePct)} %, via stamp ${f(s.stampPct)} %` : '–'; };
    p(`| ${app} | ${b} | ${mode} | ${c('server')} | ${c('client')} | ${c('unknown')} |`);
  }
  p('', '### Do server-component stamps reach the DOM and does the overlay read them?', '');
  p('| app | bundler | server elements | with a stamp in the DOM | client elements | with a stamp in the DOM |', '|---|---|---|---|---|---|');
  for (const [app, bs] of Object.entries(summary)) for (const [b, r] of Object.entries(bs)) { const k = r.matching.stampedWithDomStampByKind; p(`| ${app} | ${b} | ${k.server.elements} | ${k.server.withDomStamp} | ${k.client.elements} | ${k.client.withDomStamp} |`); }
  p('', 'The overlay reads them when locate answers `stamp`: see "via stamp %" per kind in the table above.', '');
  p('### Matching between the two runs', '', '| app | bundler | stamped elements | plain elements | matched | plain unmatched | stamped unmatched | plain judged |', '|---|---|---|---|---|---|---|---|');
  for (const [app, bs] of Object.entries(summary)) for (const [b, r] of Object.entries(bs)) { const m = r.matching; p(`| ${app} | ${b} | ${m.stampedElements} | ${m.plainElements} | ${m.matched} | ${m.plainUnmatched} | ${m.stampedUnmatched} | ${m.plainJudged} |`); }
  p('', '### Refusals by reason / step', '');
  for (const [app, bs] of Object.entries(summary)) for (const [b, r] of Object.entries(bs)) for (const mode of ['plain', 'stamped']) {
    const rf = Object.entries(r[mode].all.refusals ?? {}).sort((a, c) => c[1] - a[1]);
    p(`**${app} ${b} ${mode}**: ${rf.length ? rf.map(([k, v]) => `${k} ×${v}`).join('; ') : 'none'}. Answered by ${Object.entries(r[mode].all.via ?? {}).map(([k, v]) => `${k} ${v}`).join(', ') || '–'}.`, '');
  }
  p('### Per route (elements sampled, stamped / plain)', '');
  for (const [app, bs] of Object.entries(summary)) for (const [b, r] of Object.entries(bs)) p(`**${app} ${b}**: ${Object.entries(r.perRoute).map(([route, v]) => `\`${route}\` ${v.stamped} / ${v.plain}`).join('; ')}`, '');
  p('', '## The 15 worst misses per app and bundler (plain run)', '', 'Wrong answers first (wrong file, then wrong line, then wrong column), then refusals.', '');
  for (const [app, bs] of Object.entries(summary)) for (const b of Object.keys(bs)) {
    const list = worst.filter((w) => w.app === app && w.bundler === b);
    p(`### ${app} ${b}`, '');
    if (!list.length) { p('None among matched elements.', ''); continue; }
    p('| # | route | kind | element (DOM path) | expected | got | via | verdict / reason |', '|---|---|---|---|---|---|---|---|');
    list.forEach((w, i) => p(`| ${i + 1} | \`${w.route}\` | ${w.kind} | \`${w.tag}\` \`${w.key.length > 60 ? '…' + w.key.slice(-60) : w.key}\` | ${loc(w.expected)} | ${w.got ? loc(w.got) : '–'} | ${w.got?.via ?? '–'} | ${w.verdict}${w.reason ? ` · ${w.reason}${w.step ? ' / ' + w.step : ''}` : ''} |`));
    p('');
  }
  p('## What did not run', '');
  const notRun = Object.values(meta.nextapps ?? {}).flatMap((a) => a.notRun.map((n) => `- **${a.name}** ${n.what}: ${String(n.why).replace(/\n/g, ' ')}`));
  p(...(notRun.length ? notRun : ['Everything selected ran.']), '');
  if (meta.screenFailures?.length) p('### Routes that did not render or measure', '', '| run | route | why |', '|---|---|---|', ...meta.screenFailures.map((x) => `| ${x.host} | ${x.screen} | ${String(x.why).replace(/\|/g, '\\|').replace(/\n/g, ' ').slice(0, 300)} |`), '');
  if (meta.seen) p('## Seen while measuring', '', meta.seen, '');
  return o.join('\n');
}

export async function writeNextReport(report, prefix) {
  await writeFile(prefix + '.json', JSON.stringify(report));
  await writeFile(prefix + '.md', nextMarkdown(report));
}
