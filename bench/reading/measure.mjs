import { createServer } from 'node:http';
import { spawnSync } from 'node:child_process';
import { openSync, closeSync, readFileSync, unlinkSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const { Session } = await import(process.env.READING_BASELINE ? './before-dist/session/index.js' : '../../dist/session/index.js');
const { createHandler } = await import(process.env.READING_BASELINE ? './before-dist/session/server.js' : '../../dist/session/server.js');

const label = process.argv[2] ?? 'before';
const root = '/Users/vijaysingh/unlocalhosted/algorecall';
process.env.PLUMB_CACHE_DIR = resolve('bench/reading/.cache/algorecall');
process.env.PLUMB_PROFILE = '1';
const reportPath = resolve(`bench/reading/${label}.report.tmp`);
const output = openSync(reportPath, 'w');
const check = spawnSync(process.execPath, [process.env.READING_BASELINE ? 'bench/reading/before-dist/cli.js' : 'dist/cli.js', '--root', root, '--config', resolve('bench/apps/algorecall.plumb.config.ts'), '--json'], { encoding: 'utf8', stdio: ['ignore', output, 'pipe'], env: process.env });
if (check.error || ![0, 1].includes(check.status)) throw new Error(check.stderr || String(check.error));
closeSync(output);
let report = JSON.parse(readFileSync(reportPath, 'utf8'));
unlinkSync(reportPath);
const spacing = report.findings.filter(f => f.family === 'spacing');
const counts = { grouped: spacing.length, sites: new Set(spacing.flatMap(f => f.sites.map(s => `${s.file}:${s.line}:${s.column}:${s.text}`))).size, coverage: report.coverage.spacing };
await writeFile(`bench/reading/${label}.counts.json`, JSON.stringify(counts, null, 2) + '\n');
report = null;
const session = await Session.create({ root, config: resolve('bench/apps/algorecall.plumb.config.ts'), watch: false, readQueueMs: 60000 });
const server = createServer(createHandler(session, { token: 'reading-benchmark' }));
await new Promise(r => server.listen(0, '127.0.0.1', r));
const file = 'src/pages/problems/ProblemList.tsx', line = 237;
const source = await readFile(resolve(root, file), 'utf8');
// Pin the JSX button owning the gap-3 declaration, as the overlay does.
const offset = source.lastIndexOf('<Link', source.indexOf('className="group relative flex min-h-12'));
const atLine = source.slice(0, offset).split('\n').length;
const column = offset - source.lastIndexOf('\n', offset);
const query = async (method, params = {}) => {
  const start = performance.now();
  const response = await fetch(`http://127.0.0.1:${server.address().port}/__plumb/${method}?${new URLSearchParams(params)}`, { headers: { 'x-plumb-token': 'reading-benchmark' } });
  const body = await response.json();
  if (!response.ok) throw new Error(JSON.stringify(body));
  return { ms: performance.now() - start, body };
};
const samples = [];
try {
  for (let i = 0; i < 11; i++) {
    const start = performance.now();
    const [site, edits] = await Promise.all(['site', 'edits'].map(method => query(method, { file, line: atLine, column })));
    samples.push({ ms: performance.now() - start, siteMs: site.ms, editsMs: edits.ms, declarations: site.body.declarations.length, findings: site.body.findings.length, edits: edits.body.edits.length });
    console.log(JSON.stringify({ label, sample: i, ...samples.at(-1) }));
    if (i === 0) await writeFile(`bench/reading/${label}.bodies.json`, JSON.stringify({ site: site.body, edits: edits.body }));
  }
  const classes = await query('classes', { file, line: atLine, column, classes: 'gap-3 px-3 py-2' });
  const health = (await query('health')).body;
  const result = { counts, target: { file, line: atLine, column }, cold: samples[0], warm: samples.slice(1), classesMs: classes.ms, health };
  await writeFile(`bench/reading/${label}.http.json`, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ label, counts, target: result.target, coldMs: result.cold.ms, warmMs: result.warm.map(s => s.ms), classesMs: classes.ms, work: health.work, profile: health.profile?.filter(([name]) => name.includes('read:') || name.includes('site-analysis') || name.includes('ledger')) }));
} finally {
  await new Promise(r => server.close(r));
  await session.close();
}
