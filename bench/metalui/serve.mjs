import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, symlinkSync, readdirSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';
import { setTimeout as delay } from 'node:timers/promises';
import { serve } from '../../dist/session/server.js';
const repo = resolve('.'), live = '/Users/vijaysingh/unlocalhosted/metalui';
const cache = process.env.PLUMB_CACHE_DIR ?? resolve('bench/metalui/.cache/2-serve');
process.env.PLUMB_CACHE_DIR = cache;
const snapshot = resolve(cache, 'input'), configs = resolve(cache, 'config');
const command = (bin, args, extra = {}) => {
  const result = spawnSync(bin, args, { encoding: 'utf8', maxBuffer: 128 * 1024 * 1024, ...extra });
  assert.ifError(result.error); assert.equal(result.status, 0, result.stderr || result.stdout?.slice?.(0, 200)); return result.stdout;
};
mkdirSync(cache, { recursive: true });
const commitFile = resolve(cache, 'commit.txt');
const commit = existsSync(commitFile) ? readFileSync(commitFile, 'utf8').trim() : command('git', ['-C', live, 'rev-parse', 'HEAD']).trim();
if (!existsSync(resolve(snapshot, 'package.json'))) {
  mkdirSync(snapshot, { recursive: true });
  const archive = command('git', ['-C', live, 'archive', commit, 'package.json', 'apps/docs/src', 'apps/docs/tsconfig.json', 'apps/docs/package.json', 'packages/metalui/src', 'packages/metalui/package.json', 'tokens'], { encoding: null });
  command('tar', ['-xf', '-', '-C', snapshot], { input: archive });
  writeFileSync(commitFile, commit + '\n');
}
// Borrow installed third-party dependencies. The workspace library resolves to
// the archived copy through both package exports and tsconfig paths.
const modules = resolve(snapshot, 'node_modules'); mkdirSync(modules, { recursive: true });
for (const entry of readdirSync(resolve(live, 'node_modules'), { withFileTypes: true })) {
  if (entry.name === '.cache') continue;
  const target = resolve(modules, entry.name);
  if (entry.name.startsWith('@')) {
    mkdirSync(target, { recursive: true });
    for (const item of readdirSync(resolve(live, 'node_modules', entry.name))) {
      const link = resolve(target, item); if (!existsSync(link)) symlinkSync(entry.name === '@unlocalhosted' && item === 'metalui' ? resolve(snapshot, 'packages/metalui') : resolve(live, 'node_modules', entry.name, item), link);
    }
  } else if (!existsSync(target)) symlinkSync(resolve(live, 'node_modules', entry.name), target);
}
mkdirSync(configs, { recursive: true });
for (const name of ['plumb.config.ts', 'families.ts', 'ownership.config.ts', 'imitation.config.ts', 'layer5-habits.ts']) {
  const text = readFileSync(resolve('bench/metalui', name), 'utf8').replaceAll("'../../dist/", `'${repo}/dist/`)
    .replace("new URL('../../../metalui/', import.meta.url)", `new URL(${JSON.stringify(pathToFileURL(snapshot + '/').href)})`)
    .replace("new URL('../../../metalui/tokens/tokens.json', import.meta.url)", `new URL(${JSON.stringify(pathToFileURL(resolve(snapshot, 'tokens/tokens.json')).href)})`);
  writeFileSync(resolve(configs, name), text);
}
const config = resolve(configs, 'serve.config.ts');
writeFileSync(config, "import config from './imitation.config.ts';\nimport { habits } from './layer5-habits.ts';\nexport default { ...config, habits };\n");
const semantic = report => {
  const value = structuredClone(report); delete value.timing;
  for (const key of ['cacheHits', 'cacheMisses', 'parseMs', 'totalMs']) delete value.moduleGraph[key]; return value;
};
const cold = () => {
  const result = spawnSync(process.execPath, [resolve('dist/cli.js'), 'check', '--root', snapshot, '--config', config, '--json'], { encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 });
  assert.ifError(result.error); assert.ok([0, 1].includes(result.status), result.stderr); return JSON.parse(result.stdout);
};
function parity(actual, expected) {
  const a = semantic(actual), b = semantic(expected);
  for (const field of Object.keys(b)) {
    try { assert.deepEqual(a[field], b[field]); }
    catch { writeFileSync(resolve(cache, 'session.report.json'), JSON.stringify(actual)); writeFileSync(resolve(cache, 'cold.report.json'), JSON.stringify(expected)); throw new Error(`Incremental parity differs at ${field}. Reports saved in ${cache}.`); }
  }
}
const daemon = await serve({ root: snapshot, config, port: 0 });
let restore;
try {
  const request = async (path, body) => {
    const response = await fetch(`http://127.0.0.1:${daemon.info.port}${path}`, { headers: { 'x-plumb-token': daemon.info.token }, ...(body ? { method: 'POST', body: JSON.stringify(body) } : {}) });
    const value = await response.json(); assert.equal(response.status, 200, JSON.stringify(value).slice(0, 200)); return value;
  };
  console.log('daemon ready');
  parity(await request('/report'), cold()); console.log('cold parity passed');
  const file = 'apps/docs/src/pages/components/Fan.tsx', path = resolve(snapshot, file), original = readFileSync(path, 'utf8');
  restore = () => writeFile(path, original);
  // Add a distinct source-only probe to the copy. Every later iteration edits
  // exactly one class on this same element, without changing module structure.
  const probe = '\nexport const PlumbServeProbe = () => <div className="gap-[137px]" />;\n';
  const line = original.split('\n').length + 1;
  await writeFile(path, original + probe); await request(`/site?file=${encodeURIComponent(file)}&line=${line}`);
  parity(await request('/report'), cold()); console.log('edited parity passed');
  for (let i = 0; i < 5; i++) {
    await writeFile(path, original + probe.replace('137px', `${138 + i}px`));
    await request(`/site?file=${encodeURIComponent(file)}&line=${line}`);
  }
  const latencies = [], trials = process.argv.includes('--calibrate') ? 5 : 20;
  for (let i = 0; i < trials; i++) {
    const amount = 151 + i;
    const start = performance.now(); await writeFile(path, original + probe.replace('137px', `${amount}px`));
    const result = await request(`/site?file=${encodeURIComponent(file)}&line=${line}`); const ms = performance.now() - start;
    assert.ok(result.findings.some(f => f.sites.some(s => s.text.includes(`${amount}px`))), 'site returns edited class'); latencies.push(ms);
  }
  const tries = [];
  const siteProfile = process.env.PLUMB_PROFILE === '1' ? (await request('/health')).profile : undefined;
  await request('/try', { code: '<div className="gap-[137px]" />', lang: 'tsx', as: file });
  for (let i = 0; i < trials; i++) {
    const start = performance.now(); const result = await request('/try', { code: '<div className="gap-[137px]" />', lang: 'tsx', as: file });
    assert.ok(result.findings.some(f => f.rule === 'provenance/arbitrary')); tries.push(performance.now() - start);
  }
  const summarize = ns => ({ min: Math.min(...ns), median: [...ns].sort((a, b) => a - b)[Math.floor(ns.length / 2)], p95: [...ns].sort((a, b) => a - b)[Math.ceil(ns.length * .95) - 1], max: Math.max(...ns), samples: ns });
  const receipt = { commit, snapshot, cache, node: process.version, editedFile: file, line, warmupEdits: 5, siteMs: summarize(latencies), tryMs: summarize(tries),
    stats: { files: daemon.session.stats?.files, judged: daemon.session.stats?.judged }, ...(siteProfile ? { siteProfile } : {}) };
  console.log(JSON.stringify({ siteMs: receipt.siteMs, tryMs: receipt.tryMs }));
  if (!process.argv.includes('--calibrate')) {
    const samples = [], start = performance.now();
    const initial = await request('/health'); samples.push({ elapsedMs: 0, rss: initial.rss, caches: initial.caches });
    for (let i = 0; i < 600; i++) {
      await delay(Math.max(0, start + (i + 1) * 1000 - performance.now()));
      await writeFile(path, original + probe.replace('137px', `${138 + i % 2}px`));
      await request(`/site?file=${encodeURIComponent(file)}&line=${line}`);
      if ((i + 1) % 30 === 0) { const health = await request('/health'); const sample = { elapsedMs: performance.now() - start, rss: health.rss, caches: health.caches }; samples.push(sample); console.log(JSON.stringify({ soak: i + 1, ...sample })); }
    }
    receipt.soak = { durationMs: performance.now() - start, edits: 600, samples };
    parity(await request('/report'), cold());
  }
  await writeFile(path, original);
  writeFileSync(resolve(process.argv.includes('--calibrate') ? 'bench/metalui/2-serve.calibration.json' : 'bench/metalui/2-serve.run.json'), JSON.stringify(receipt, null, 2) + '\n');
  if (!process.argv.includes('--calibrate')) { assert.ok(receipt.siteMs.max < 100, 'all edited site queries under 100 ms'); assert.ok(receipt.tryMs.max < 100, 'all try queries under 100 ms'); }
} finally { await daemon.close(); await restore?.(); }
