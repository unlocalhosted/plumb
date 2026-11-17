#!/usr/bin/env node
// Median and spread per app, build and moment, from compare.sh's results folder; also written as summary.json.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
const dir = process.argv[2];
const runs = readdirSync(dir).filter(f => /\.(base|head)\.\d+\.json$/.test(f)).map(f => ({ f, app: f.split('.')[0], build: f.split('.')[1], ...JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')) }));
const median = xs => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[(s.length - 1) >> 1] : null; };
const out = {};
for (const run of runs) {
  const at = ((out[run.app] ??= {})[run.build] ??= { runs: 0, errors: [], moments: {} });
  at.runs++; if (run.error) at.errors.push(run.error.split('\n')[0]);
  for (const [moment, m] of Object.entries(run.moments ?? {})) { const row = (at.moments[moment] ??= { ms: [], rss: [] }); if (typeof m.ms === 'number') row.ms.push(m.ms); if (typeof m.rss === 'number') row.rss.push(m.rss); }
}
const lines = [];
for (const [app, builds] of Object.entries(out)) {
  lines.push(`\n${app}`);
  const moments = [...new Set(Object.values(builds).flatMap(b => Object.keys(b.moments)))];
  for (const moment of moments) {
    const cell = b => { const m = builds[b]?.moments[moment]; if (!m) return '-'.padStart(30); const ms = m.ms, rss = m.rss;
      return `${String(median(ms)).padStart(7)} ms [${Math.min(...ms)}-${Math.max(...ms)}] ${String(median(rss)).padStart(5)} MB`.padStart(30); };
    lines.push(`  ${moment.padEnd(10)} base ${cell('base')}   head ${cell('head')}`);
  }
  for (const [b, v] of Object.entries(builds)) if (v.errors.length) lines.push(`  ${b} errors: ${v.errors.join(' | ')}`);
}
writeFileSync(`${dir}/summary.json`, JSON.stringify(Object.fromEntries(Object.entries(out).map(([app, builds]) => [app, Object.fromEntries(Object.entries(builds).map(([b, v]) => [b, { runs: v.runs, errors: v.errors, moments: Object.fromEntries(Object.entries(v.moments).map(([k, m]) => [k, { medianMs: median(m.ms), ms: m.ms, medianRss: median(m.rss), rss: m.rss }])) }]))])), null, 1));
console.log(lines.join('\n'));
