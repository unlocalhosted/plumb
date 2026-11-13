// Turns raw rows into the numbers: per host, per screen, refusals, worst misses; and writes the .json and .md.
import { existsSync, readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { distribution, here, pct } from './lib.mjs';
import { inChain, judge, truthOf } from './measure.mjs';

const HOST_ORDER = ['vite-stamped', 'vite-unstamped', 'next-webpack', 'next-turbopack', 'plumber-serve'];
const SEVERITY = { 'wrong-file-other': 0, 'wrong-file-ancestor': 1, 'file-only': 2, 'line-only': 3, refused: 4, 'usage-miss': 5, 'usage-refused': 6 };

// Adds `truth`, `verdict`, `inChain` to every row. Truth: the vite-stamped row with the same corpus, screen and key.
export function finalize(rows) {
  const truths = new Map();
  for (const row of rows) if (row.host === 'vite-stamped') { const t = truthOf(row); if (t) truths.set(`${row.corpus}|${row.screen}|${row.key}`, t); }
  for (const row of rows) {
    const truth = truths.get(`${row.corpus}|${row.screen}|${row.key}`) ?? null;
    row.verdict = judge(row, truth);
    row.truth = truth ? { file: truth.file, line: truth.line, column: truth.column, kind: truth.kind } : null;
    row.inChain = inChain(row, truth);
    if (row.host !== 'vite-stamped') delete row.ownerFiles;
  }
  return rows;
}

const JUDGED = new Set(['exact', 'line-only', 'file-only', 'wrong-file-ancestor', 'wrong-file-other', 'refused']);
export function summarize(rows) {
  const live = rows.filter((r) => r.connected !== false);
  const found = live.filter((r) => r.found);
  const judged = live.filter((r) => JUDGED.has(r.verdict));
  const count = (v) => judged.filter((r) => r.verdict === v).length;
  const refusals = {};
  for (const r of live.filter((x) => !x.found)) { const k = `${r.reason}${r.step ? ' / ' + r.step : ''}`; refusals[k] = (refusals[k] ?? 0) + 1; }
  const via = {};
  for (const r of found) via[r.via] = (via[r.via] ?? 0) + 1;
  const firstCalls = [];
  const seen = new Set();
  for (const r of live) if (!seen.has(r.screen)) { seen.add(r.screen); firstCalls.push(r.coldMs); }
  const wrong = count('wrong-file-ancestor') + count('wrong-file-other');
  return {
    elements: live.length, found: found.length, foundPct: pct(found.length, live.length),
    judged: judged.length, unjudged: live.length - judged.length - live.filter((r) => r.verdict?.startsWith('usage-')).length,
    usageJudged: live.filter((r) => r.verdict?.startsWith('usage-')).length, usageMatch: live.filter((r) => r.verdict === 'usage-match').length,
    exactPct: pct(count('exact'), judged.length), lineOnlyPct: pct(count('line-only'), judged.length), fileOnlyPct: pct(count('file-only'), judged.length),
    wrongFilePct: pct(wrong, judged.length), wrongAncestorPct: pct(count('wrong-file-ancestor'), judged.length), wrongOtherPct: pct(count('wrong-file-other'), judged.length),
    refusedPct: pct(count('refused'), judged.length), foundWithinJudgedPct: pct(judged.length - count('refused'), judged.length),
    counts: { exact: count('exact'), lineOnly: count('line-only'), fileOnly: count('file-only'), wrongAncestor: count('wrong-file-ancestor'), wrongOther: count('wrong-file-other'), refused: count('refused') },
    cold: distribution(live.map((r) => r.coldMs)), warm: distribution(live.map((r) => r.warmMs)), firstCall: distribution(firstCalls),
    refusals, via,
  };
}

export function buildReport(rows, meta) {
  finalize(rows);
  const groups = {};
  for (const row of rows) {
    const g = (groups[row.corpus] ??= {});
    (g[row.host] ??= []).push(row);
  }
  const summary = {};
  const perScreen = {};
  for (const [corpus, hosts] of Object.entries(groups)) {
    summary[corpus] = {}; perScreen[corpus] = {};
    for (const [host, hostRows] of Object.entries(hosts)) {
      summary[corpus][host] = summarize(hostRows);
      const screens = {};
      for (const r of hostRows) (screens[r.screen] ??= []).push(r);
      perScreen[corpus][host] = Object.fromEntries(Object.entries(screens).map(([s, rs]) => [s, summarize(rs)]));
    }
  }
  const worst = rows.filter((r) => r.host !== 'vite-stamped' && r.verdict in SEVERITY)
    .sort((a, b) => SEVERITY[a.verdict] - SEVERITY[b.verdict] || (a.host < b.host ? -1 : 1) || (a.screen < b.screen ? -1 : 1))
    .slice(0, 10);
  return { meta, summary, perScreen, worst: worst.map((r) => ({ corpus: r.corpus, host: r.host, screen: r.screen, key: r.key, tag: r.tag, verdict: r.verdict, expected: r.truth, got: r.found ? { file: r.file, line: r.line, column: r.column, via: r.via, chain: r.chain } : null, reason: r.reason ?? null, step: r.step ?? null })), rows };
}

const f = (v, unit = '') => (v === null || v === undefined ? '–' : v + unit);
const hostsIn = (obj) => HOST_ORDER.filter((h) => obj[h]);
const loc = (l) => (l ? `${l.file}:${l.line}:${l.column}` : '–');

export function markdown(report) {
  const { meta, summary, perScreen, worst } = report;
  const out = [];
  const p = (...lines) => out.push(...lines);
  p('# Locate baseline', '',
    `How well the overlay finds an element's source, per host. Measured ${meta.date} on ${meta.commit} with \`node bench/locate/run.mjs\`${meta.args ? ' ' + meta.args : ''}. Raw rows: \`${meta.jsonName}\`.`, '',
    '## How it was measured', '',
    '- Each sampled element is located with the overlay\'s own `window.__plumb.locate(element, { explain: true })` (the call `e2e/locate.test.mjs`, `e2e/owner-locate.test.mjs` and `e2e/stamp.test.mjs` make), one after another in a fresh page per screen.',
    '- **Cold** is each element\'s first locate in that fresh page (source maps and resolve answers not yet fetched, so early elements pay for the maps later ones reuse). **Warm** is a second pass over the same elements straight after. **First call** is the very first locate of each page.',
    `- **Sample:** every host element under the screen's root when it has at most ${meta.cap}; otherwise the elements whose DOM-path key hashes to 0 modulo ceil(N/${meta.cap}) (FNV-1a), so every host samples the same elements. Real apps: every element under \`<body>\` outside the overlay, same rule, page \`/\`.`,
    '- **Ground truth:** the stamp the overlay reads on the stamped Vite host (`data-plumb-source` on the host fiber: file, line, column of the JSX opening that made the element). Other hosts are matched to it by screen + DOM path (`tag:index/…` from the screen root), and the tag must agree. It is read from the stamp itself, not from locate\'s answer; locate\'s answer there only says whether the stamp is the element\'s own JSX (`host`) or a component\'s usage forwarded onto it (`usage`).',
    '- **Verdicts** (over judged elements, which sum to 100 %): exact = file+line+column; line-only = same file and line, other column; file-only = same file, other line; wrong-file = another file, split into *ancestor/shared* (a file that holds the JSX of an element above it or of a component that owns it) and *other*; refused = no location.',
    `- Screens source: ${meta.showcase ? `${meta.showcase.origin}, ${meta.showcase.screens} screens + kit.jsx, content hash ${meta.showcase.sha256}` : 'not run'}. Run with ${meta.versions}.`, '');

  const showcase = summary.showcase;
  if (showcase) {
    p('## Showcase screens', '', `${meta.showcase.screens} screen files (plus the shared \`kit.jsx\`, not a screen) in \`overlay/showcase/src/principles/screens\`; each rendered alone on its host with default props.`, '');
    p('| host | elements | found % | judged | exact % | line-only % | file-only % | wrong-file % (ancestor / other) | refused % | cold p50 / p95 / max ms | warm p50 / p95 / max ms |', '|---|---|---|---|---|---|---|---|---|---|---|');
    for (const h of hostsIn(showcase)) {
      const s = showcase[h];
      p(`| ${h} | ${s.elements} | ${f(s.foundPct)} | ${s.judged} | ${f(s.exactPct)} | ${f(s.lineOnlyPct)} | ${f(s.fileOnlyPct)} | ${f(s.wrongFilePct)} (${f(s.wrongAncestorPct)} / ${f(s.wrongOtherPct)}) | ${f(s.refusedPct)} | ${f(s.cold.p50)} / ${f(s.cold.p95)} / ${f(s.cold.max)} | ${f(s.warm.p50)} / ${f(s.warm.p95)} / ${f(s.warm.max)} |`);
    }
    p('', 'First locate of each page (ms), and what answered:', '', '| host | first call p50 / p95 / max | answered by |', '|---|---|---|');
    for (const h of hostsIn(showcase)) p(`| ${h} | ${f(showcase[h].firstCall.p50)} / ${f(showcase[h].firstCall.p95)} / ${f(showcase[h].firstCall.max)} | ${Object.entries(showcase[h].via).map(([k, v]) => `${k} ${v}`).join(', ') || '–'} |`);
    p('', 'Elements whose stamp is a component usage (a library drew the host; the right answer is the usage site) are judged apart: ' + hostsIn(showcase).map((h) => `${h} ${showcase[h].usageMatch}/${showcase[h].usageJudged}`).join(', ') + ' matched.', '');
    p('### Refusals by reason / step', '');
    for (const h of hostsIn(showcase)) {
      const r = Object.entries(showcase[h].refusals).sort((a, b) => b[1] - a[1]);
      p(`**${h}**: ${r.length ? r.map(([k, v]) => `${k} ×${v}`).join('; ') : 'none'}`, '');
    }
    p('### Per screen', '', 'found % / exact % / wrong-file % / cold p95 ms, per host (judged elements only for the last two percentages).', '');
    const hosts = hostsIn(perScreen.showcase);
    p(`| screen | elements | ${hosts.join(' | ')} |`, `|---|---|${hosts.map(() => '---').join('|')}|`);
    const ids = Object.keys(perScreen.showcase[hosts[0]]).sort();
    for (const id of ids) {
      const cells = hosts.map((h) => { const s = perScreen.showcase[h][id]; return s ? `${f(s.foundPct)} / ${f(s.exactPct)} / ${f(s.wrongFilePct)} / ${f(s.cold.p95)}` : 'NOT RUN'; });
      const name = meta.screenNames?.[id] ?? '';
      p(`| ${id} ${name} | ${perScreen.showcase[hosts[0]][id].elements} | ${cells.join(' | ')} |`);
    }
    p('');
  }
  const apps = Object.keys(summary).filter((c) => c !== 'showcase');
  if (apps.length) {
    p('## Real apps (Vite only, read only)', '', 'Each app is frozen into a scratch copy (git-visible files including uncommitted edits) and served from there; the originals were fingerprinted before and after' + (meta.apps ? ': ' + Object.entries(meta.apps).map(([k, v]) => `${k} ${v.originalUnchanged === undefined ? 'unchecked' : v.originalUnchanged ? 'unchanged' : 'CHANGED'}`).join(', ') : '') + '. Page `/`; the unstamped host is judged against the stamped host\'s stamps, matched by DOM path, so elements that differ between the two loads (async data, animation) are unjudged.', '');
    p('| app | host | elements | found % | judged | exact % | line-only % | file-only % | wrong-file % | refused % | cold p50 / p95 / max ms | warm p50 / p95 / max ms |', '|---|---|---|---|---|---|---|---|---|---|---|---|');
    for (const app of apps) for (const h of hostsIn(summary[app])) {
      const s = summary[app][h];
      p(`| ${app} | ${h} | ${s.elements} | ${f(s.foundPct)} | ${s.judged} | ${f(s.exactPct)} | ${f(s.lineOnlyPct)} | ${f(s.fileOnlyPct)} | ${f(s.wrongFilePct)} | ${f(s.refusedPct)} | ${f(s.cold.p50)} / ${f(s.cold.p95)} / ${f(s.cold.max)} | ${f(s.warm.p50)} / ${f(s.warm.p95)} / ${f(s.warm.max)} |`);
    }
    p('');
    for (const app of apps) for (const h of hostsIn(summary[app])) {
      const s = summary[app][h];
      const r = Object.entries(s.refusals).sort((a, b) => b[1] - a[1]);
      p(`**${app} ${h}** answered by ${Object.entries(s.via).map(([k, v]) => `${k} ${v}`).join(', ') || '–'}; refusals: ${r.length ? r.map(([k, v]) => `${k} ×${v}`).join('; ') : 'none'}`, '');
    }
  }
  p('## The 10 worst misses', '', 'Wrong answers first (wrong file, then wrong line, then wrong column), then refusals; across the hosts that have a ground truth to differ from.', '');
  if (!worst.length) p('None: every judged element on every non-truth host was exact.', '');
  else {
    p('| # | host | screen | element (DOM path) | expected | got | via | reason / step |', '|---|---|---|---|---|---|---|---|');
    worst.forEach((w, i) => p(`| ${i + 1} | ${w.host} | ${w.corpus === 'showcase' ? w.screen : w.corpus} | \`${w.tag}\` \`${w.key.length > 70 ? '…' + w.key.slice(-70) : w.key}\` | ${loc(w.expected)} | ${w.got ? loc(w.got) : '–'} | ${w.got?.via ?? '–'} | ${w.verdict}${w.reason ? ` · ${w.reason}${w.step ? ' / ' + w.step : ''}` : ''} |`));
    p('');
  }
  p('## What the ground truth cannot judge', '',
    '- Elements with no stamp of their own (a library drew them: icon paths, primitives\' inner nodes). The stamp-less host answers with the nearest owner\'s usage site or the owner stack, and nothing says what the right answer is. They count in found % and timing, not in exact %.',
    '- Elements whose stamp is a forwarded component usage: judged apart (usage-match), since the stamp is the usage, not a JSX opening.',
    '- Elements the stamp could not confirm on the stamped host (locate did not answer `stamp` there), and elements whose tag differs at the same DOM path between hosts.',
    '- Elements outside the screen root (portals into `document.body`, menus open only after a click): not sampled.',
    '- A stamp proves which JSX opening created the element, not which one a person would call the cause (for a component the right place can be its definition or its usage); this bench measures only the first.',
    '- The Next hosts import images as objects, not URLs, so a screen\'s `<img src>` is `[object Object]` there; the DOM is the same, the pictures are not.',
    '- `broken.css` is not loaded on any host (it needs the showcase\'s font files); `theme.css` is.', '');
  if (meta.notCovered?.length) p('## Not covered', '', ...meta.notCovered.map((n) => `- ${n}`), '');
  if (meta.screenFailures?.length) p('## Screens that did not render or measure', '', '| host | screen | why |', '|---|---|---|', ...meta.screenFailures.map((x) => `| ${x.host} | ${x.screen} | ${String(x.why).replace(/\|/g, '\\|').replace(/\n/g, ' ')} |`), '');
  else if (showcase) p('## Screens that did not render or measure', '', 'None on the hosts that ran.', '');
  const seen = join(here, 'seen-while-measuring.md');
  p('## Seen while measuring', '', existsSync(seen) ? readFileSync(seen, 'utf8').trim() : '_Nothing recorded._', '');
  return out.join('\n');
}

export async function writeReport(report, prefix) {
  await writeFile(prefix + '.json', JSON.stringify({ meta: report.meta, summary: report.summary, perScreen: report.perScreen, worst: report.worst, rows: report.rows }));
  await writeFile(prefix + '.md', markdown(report));
}
