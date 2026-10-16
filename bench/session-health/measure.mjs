// Reproduce the CI burst against current product builds, without editing the checkout.
// node bench/session-health/measure.mjs --output /tmp/plumb-health --hogs 16 [--ref 687256b]
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execFileSync, spawn } from 'node:child_process';
import { Worker } from 'node:worker_threads';
import { parseArgs } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const { values } = parseArgs({ options: { output: { type: 'string' }, hogs: { type: 'string', default: '0' }, ref: { type: 'string' } } });
const root = fileURLToPath(new URL('../../', import.meta.url));
const count = Number(values.hogs);
if (!values.output || !Number.isSafeInteger(count) || count < 0 || count > 32) throw new Error('Supply --output directory and --hogs 0..32.');
if (typeof process.threadCpuUsage !== 'function') throw new Error('Use Node 24 for host-thread CPU measurements.');
const output = resolve(values.output);
await mkdir(output, { recursive: true });
const source = path => values.ref ? execFileSync('git', ['show', `${values.ref}:${path}`], { cwd: root, encoding: 'utf8' }) : readFile(resolve(root, path), 'utf8');
let test = await source('e2e/session-burst.test.mjs');
let host = await source('e2e/helpers/session-http-host.mjs');
// Resolve production code and fixtures back to this checkout; use a scratch host.
test = test.replaceAll("'../dist/", `'${root}dist/`).replaceAll("new URL('../fixtures/", `new URL('${root}fixtures/`)
  .replace("'./helpers/event-loop.mjs'", `'${root}e2e/helpers/event-loop.mjs'`)
  .replace("new URL('./helpers/session-http-host.mjs', import.meta.url)", `new URL(${JSON.stringify(pathToFileURL(resolve(output, 'host.mjs')).href)})`)
  .replace("stdio: ['ignore', 'ignore', 'pipe', 'ipc']", "stdio: ['ignore', 'inherit', 'pipe', 'ipc']");
host = host.replaceAll("'../../dist/", `'${root}dist/`).replace("'./event-loop.mjs'", `'${root}e2e/helpers/event-loop.mjs'`);
// Instrument only the workload. Keep baseline comparisons outside the profile.
const boundary = test.indexOf("test('HTTP:");
let first = test.slice(0, boundary);
first = first.replace('  const start = performance.now();', '  await globalThis.ciHealthStart();\n  const ciProbes = []; let ciFinished = false;\n  const start = performance.now();')
  .replace('  await delay(5);', '  burst.then(() => { ciFinished = true; }, () => { ciFinished = true; });\n  await delay(5);')
  .replace('for (let i = 0; i < 3; i++)', 'for (let i = 0; i < 3 || !ciFinished; i++)')
  .replace('    assert.ok(performance.now() - at < 50, `health blocked ${performance.now() - at}ms`);', '    ciProbes.push(performance.now() - at); if (!ciFinished) await delay(5);')
  .replace('    probes.push(performance.now() - at);', '    probes.push(performance.now() - at); ciProbes.push(performance.now() - at);')
  .replace(/(  (?:const results = await burst, elapsed = performance.now\(\) - start;|await burst;))/, "$1\n  await delay(2); globalThis.ciHealthStop('in-process', ciProbes);\n  assert.ok(ciProbes.every(ms => ms < 50), `health blocked ${Math.max(...ciProbes)}ms`);");
test = first + test.slice(boundary);
test = test.replace('  let settled = 0;', "  await command('ci-measure-start');\n  let settled = 0;")
  .replace('  await burst;\n  const loop', "  await burst;\n  await command('ci-measure-stop');\n  const loop");
// The older host has no loop-measurement command to anchor the stop insertion.
if (!test.includes("await command('ci-measure-stop')")) test = test.replace("  await burst;\n  if ((process.env.PLUMBER_BURST_PROFILE", "  await burst;\n  await command('ci-measure-stop');\n  if ((process.env.PLUMBER_BURST_PROFILE");
host = host.replace("    } else if (type === 'profile-start')", "    } else if (type === 'ci-measure-start') {\n      await globalThis.ciHealthStart();\n    } else if (type === 'ci-measure-stop') {\n      globalThis.ciHealthStop('HTTP host');\n    } else if (type === 'profile-start')");
await writeFile(resolve(output, 'burst.test.mjs'), test);
await writeFile(resolve(output, 'host.mjs'), host);
await writeFile(resolve(output, 'meter.mjs'), await readFile(new URL('./meter.mjs', import.meta.url)));
await writeFile(resolve(output, 'environment.json'), JSON.stringify({ node: process.version, platform: process.platform, arch: process.arch, hogs: count, ref: values.ref ?? 'working tree', workerPool: process.env.UV_THREADPOOL_SIZE ?? 'default' }, null, 2));
const workers = Array.from({ length: count }, () => new Worker('let x = 0; while (true) x = Math.sqrt(x + Math.random());', { eval: true }));
let child;
const terminate = () => {
  if (child?.pid) {
    try {
      if (process.platform === 'win32') child.kill();
      else process.kill(-child.pid, 'SIGTERM');
    } catch (error) { if (error.code !== 'ESRCH') throw error; }
  }
  for (const worker of workers) void worker.terminate();
};
process.on('SIGTERM', terminate); process.on('SIGINT', terminate);
const timeout = setTimeout(terminate, 90000);
try {
  child = spawn(process.execPath, [`--import=${resolve(output, 'meter.mjs')}`, '--cpu-prof', `--cpu-prof-dir=${output}`, '--test', '--test-name-pattern=1000-file|HTTP: health', resolve(output, 'burst.test.mjs')], { cwd: root, stdio: 'inherit', detached: process.platform !== 'win32' });
  process.exitCode = await new Promise((done, reject) => { child.on('error', reject); child.on('exit', code => done(code ?? 1)); });
} finally { clearTimeout(timeout); terminate(); }
