#!/usr/bin/env node
// Build first. Target sources stay read-only. AlgoRecall artifacts use
// /private/tmp; MetalUI uses the existing gate's isolated archive cache.
// node bench/apps/large.mjs [--profile] [--compare=/private/tmp/previous-run]
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const root = process.env.ALGORECALL_ROOT ?? resolve(repo, '../algorecall');
const config = join(repo, 'bench/apps/algorecall.plumb.config.ts');
const output = mkdtempSync('/private/tmp/plumb-large-');
const profile = process.argv.includes('--profile');
const compare = process.argv.find(arg => arg.startsWith('--compare='))?.slice(10);
const rounded = ms => Math.round(ms * 100) / 100;

// Separate processes avoid retained API state affecting a CLI measurement.
function cli(name, target, configFile, cache, cpuProfile = false) {
  const reportFile = join(output, `${name}.json`);
  const script = join(output, `${name}.mjs`);
  writeFileSync(script, `import {openSync,closeSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
const descriptor=openSync(${JSON.stringify(reportFile)},'w');
const start=performance.now();
const child=spawnSync(process.execPath,${JSON.stringify([
    ...(cpuProfile ? ['--cpu-prof', `--cpu-prof-dir=${output}`, `--cpu-prof-name=${name}.cpuprofile`] : []),
    join(repo, 'dist/cli.js'), 'check', '--root', target, '--config', configFile, '--json',
  ])},{env:{...process.env,PLUMB_CACHE_DIR:${JSON.stringify(cache)}},stdio:['ignore',descriptor,'pipe']});
const wallMs=performance.now()-start;closeSync(descriptor);
if(child.error || ![0,1].includes(child.status) || child.stderr.length) throw child.error??new Error(child.stderr.toString()||'CLI failed');
console.log(JSON.stringify({wallMs,status:child.status}));
`);
  const child = spawnSync(process.execPath, [script], { encoding: 'utf8', maxBuffer: 1024 * 1024 });
  assert.ifError(child.error); assert.equal(child.status, 0, child.stderr);
  return JSON.parse(child.stdout);
}

const fingerprintScript = join(output, 'fingerprint.mjs');
writeFileSync(fingerprintScript, `import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
const {timing,moduleGraph,...report}=JSON.parse(readFileSync(process.argv[2],'utf8'));
const {cacheHits,cacheMisses,parseMs,totalMs,...graph}=moduleGraph;
console.log(createHash('sha256').update(JSON.stringify({...report,moduleGraph:graph})).digest('hex'));
`);
const fingerprints = new Map();
function fingerprint(file) {
  if (!fingerprints.has(file)) {
    const run = spawnSync(process.execPath, [fingerprintScript, file], { encoding: 'utf8', maxBuffer: 1024 * 1024 });
    assert.ifError(run.error); assert.equal(run.status, 0, run.stderr);
    fingerprints.set(file, run.stdout.trim());
  }
  return fingerprints.get(file);
}
function equal(left, right, label) {
  // Each report gets its own process; expanded evidence cannot accumulate
  // between parity checks or distort the following cold Session measurement.
  assert.equal(fingerprint(left), fingerprint(right), label);
}

const cold = cli('cli-cold', root, config, join(output, 'cli-cache'), profile);
const warm = cli('cli-warm', root, config, join(output, 'cli-cache'), profile);
equal(join(output, 'cli-cold.json'), join(output, 'cli-warm.json'), 'AlgoRecall cold/warm parity');
if (compare) equal(join(output, 'cli-warm.json'), join(compare, 'cli-warm.json'), 'AlgoRecall before/after parity');
console.log(JSON.stringify({ output, cliColdMs: rounded(cold.wallMs), cliWarmMs: rounded(warm.wallMs) }));

const sessionScript = join(output, 'session.mjs');
writeFileSync(sessionScript, `import {Session} from ${JSON.stringify(pathToFileURL(join(repo, 'dist/session/index.js')).href)};
import {performance} from 'node:perf_hooks';
import {writeFileSync} from 'node:fs';
import {BroadcastChannel} from 'node:worker_threads';
const start=performance.now();
const session=await Session.create({root:${JSON.stringify(root)},config:${JSON.stringify(config)},watch:false,readQueueMs:60000});
const coldMs=performance.now()-start;
if(process.env.PLUMB_LARGE_PROFILE){
  const channel=new BroadcastChannel('plumb-large-profile');
  await new Promise((resolve,reject)=>{let saved=0;const timer=setTimeout(()=>reject(new Error('Worker profile timeout')),10000);channel.onmessage=({data})=>{if(data.saved && ++saved===2){clearTimeout(timer);resolve();}};channel.postMessage('stop');});channel.close();
}
const at=performance.now();const report=await session.report();const reportMs=performance.now()-at;
writeFileSync(${JSON.stringify(join(output, 'session-report.json'))},JSON.stringify(report));
await session.close();console.log(JSON.stringify({coldMs,reportMs}));
`);
const sessionRun = spawnSync(process.execPath, [...(profile ? ['--import', pathToFileURL(join(repo, 'bench/apps/large-profile.mjs')).href] : []), sessionScript], {
  env: { ...process.env, PLUMB_CACHE_DIR: join(output, 'session-cache'), ...(profile ? { PLUMB_LARGE_PROFILE: output } : {}) }, encoding: 'utf8', maxBuffer: 1024 * 1024,
});
assert.ifError(sessionRun.error); assert.equal(sessionRun.status, 0, sessionRun.stderr);
const session = JSON.parse(sessionRun.stdout);
if (compare) equal(join(output, 'session-report.json'), join(compare, 'session-report.json'), 'Session before/after parity');

// Existing MetalUI archive/fixture gate owns a pinned snapshot and full rules.
// Setup is necessary on a fresh checkout; target sources remain read-only.
const metalReceiptFile = join(repo, 'bench/metalui/final-before.json');
const previousMetalReceipt = existsSync(metalReceiptFile) ? readFileSync(metalReceiptFile) : undefined;
let metal;
try {
  for (const mode of ['setup', 'before']) {
    const started = Date.now();
    const run = spawnSync(process.execPath, [join(repo, 'bench/metalui/final-pass.mjs'), mode], { cwd: repo, encoding: 'utf8', maxBuffer: 1024 * 1024 });
    writeFileSync(join(output, `metalui-${mode}.log`), run.stdout + run.stderr);
    assert.ifError(run.error);
    // The gate writes its receipt before asserting timing limits. Retain those
    // failing timings too, but never accept a stale receipt after a crash.
    if (mode === 'before' && run.status !== 0) assert.ok(existsSync(metalReceiptFile) && statSync(metalReceiptFile).mtimeMs >= started, run.stderr);
    else assert.equal(run.status, 0, run.stderr || run.stdout);
  }
  metal = JSON.parse(readFileSync(metalReceiptFile, 'utf8'));
  writeFileSync(join(output, 'metalui-receipt.json'), JSON.stringify(metal, null, 2) + '\n');
  writeFileSync(join(output, 'metalui-report.json'), readFileSync(join(repo, 'bench/metalui/.cache/final-check/before.report.json')));
} finally {
  if (previousMetalReceipt) writeFileSync(metalReceiptFile, previousMetalReceipt);
  else if (existsSync(metalReceiptFile)) unlinkSync(metalReceiptFile);
}
const metalWarmMs = Math.max(...metal.runs.map(run => run.wallMs), metal.warm.textWallMs, metal.warm.jsonWallMs);
if (compare) equal(join(output, 'metalui-report.json'), join(compare, 'metalui-report.json'), 'MetalUI before/after parity');
const result = { output, cliColdMs: rounded(cold.wallMs), cliWarmMs: rounded(warm.wallMs), sessionColdMs: rounded(session.coldMs), metaluiWarmMs: rounded(metalWarmMs), sessionReportMs: rounded(session.reportMs),
  fingerprints: Object.fromEntries(['cli-cold', 'cli-warm', 'session-report', 'metalui-report'].map(name => [name, fingerprint(join(output, `${name}.json`))])),
  limits: { cliWarmMs: 3000, sessionColdMs: rounded(cold.wallMs), metaluiWarmMs: 2000 } };
writeFileSync(join(output, 'result.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));
assert.ok(warm.wallMs <= 3000, `AlgoRecall warm CLI ${rounded(warm.wallMs)} ms > 3000 ms`);
assert.ok(session.coldMs <= cold.wallMs, `Session cold ${rounded(session.coldMs)} ms > CLI cold ${rounded(cold.wallMs)} ms`);
assert.ok(metalWarmMs <= 2000, `MetalUI warm ${rounded(metalWarmMs)} ms > 2000 ms`);
