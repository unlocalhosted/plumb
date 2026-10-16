import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { Worker } from 'node:worker_threads';
import { check } from '../dist/index.js';
import { serve } from '../dist/session/server.js';

const repo = resolve('.'), cli = join(repo, 'dist/cli.js');
async function project(t) {
  const root = await mkdtemp(join(repo, 'fixtures/.publication-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'fixtures/spacing'), root, { recursive: true });
  await mkdir(join(root, '.plumber'), { recursive: true });
  return root;
}
function run(root, ...args) {
  const result = spawnSync(process.execPath, [cli, ...args, '--root', root], { encoding: 'utf8', timeout: 30000 });
  assert.ifError(result.error);
  return result;
}

test('startup discovery stays complete under reads from a second process and refuses a second daemon', { timeout: 60000 }, async t => {
  const root = await project(t), path = join(root, '.plumber/serve.json');
  const reader = spawn(process.execPath, ['--input-type=module', '-e', `
    import { readFileSync } from 'node:fs';
    let reads = 0, missing = 0;
    process.on('message', () => { process.send({ reads, missing }); process.exit(0); });
    function poll() {
      for (let i = 0; i < 128; i++) {
        try {
          const info = JSON.parse(readFileSync(process.argv[1], 'utf8'));
          if (info.protocol !== 1 || !info.token || !info.port) throw new Error('incomplete discovery');
          reads++;
        } catch (error) { if (error.code === 'ENOENT') missing++; else throw error; }
      }
      setImmediate(poll);
    }
    process.send('ready'); poll();
  `, path], { stdio: ['ignore', 'ignore', 'pipe', 'ipc'] });
  let readerErrors = '';
  reader.stderr.on('data', chunk => readerErrors += chunk);
  t.after(() => { if (reader.exitCode === null) reader.kill(); });
  await once(reader, 'message');
  for (let attempt = 0; attempt < 6; attempt++) {
    const daemon = spawn(process.execPath, [cli, 'serve', '--root', root, '--port', '0'], { stdio: ['ignore', 'pipe', 'pipe'] });
    let errors = ''; daemon.stdout.resume(); daemon.stderr.on('data', chunk => errors += chunk);
    const stop = async () => {
      if (daemon.exitCode === null && daemon.signalCode === null) { const exited = once(daemon, 'exit'); daemon.kill(); await exited; }
    };
    t.after(stop);
    let info;
    for (let i = 0; i < 1000; i++) {
      assert.equal(reader.exitCode, null, readerErrors);
      assert.equal(daemon.exitCode, null, errors);
      try { info = JSON.parse(await readFile(path, 'utf8')); break; }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
      await delay(5);
    }
    assert.ok(info, 'daemon must publish discovery');
    const health = await fetch(`http://127.0.0.1:${info.port}/health`, { headers: { 'x-plumb-token': info.token } });
    assert.equal(health.status, 200);
    assert.equal((await stat(path)).mode & 0o777, 0o600);
    const second = run(root, 'serve', '--port', '0');
    assert.equal(second.status, 2, second.stderr);
    assert.match(second.stderr, /already running/);
    assert.deepEqual(JSON.parse(await readFile(path, 'utf8')), info, 'live discovery is never overwritten');
    await stop();
    await assert.rejects(readFile(path), { code: 'ENOENT' });
    assert.equal(errors, '');
  }
  assert.equal(reader.exitCode, null, readerErrors);
  const summary = once(reader, 'message'), exited = once(reader, 'exit');
  reader.send('stop');
  const [counts] = await summary;
  assert.ok(counts.reads > 100 && counts.missing > 100, JSON.stringify(counts));
  assert.deepEqual(await exited, [0, null], readerErrors);
  assert.equal(readerErrors, '');
});

test('partial and malformed discovery permit cold CLI reads and standalone overlay install advice', async t => {
  const root = await project(t);
  await writeFile(join(root, 'package.json'), '{"type":"module","dependencies":{"react":"19"}}');
  for (const text of ['', '{"port":', 'null', '[]', '{}']) {
    await writeFile(join(root, '.plumber/serve.json'), text);
    const checked = run(root, 'check', '--json');
    assert.ok([0, 1].includes(checked.status), checked.stderr);
    assert.equal(JSON.parse(checked.stdout).tool.name, 'react-plumber');
    const installed = run(root, 'install', '--overlay');
    assert.equal(installed.status, 0, installed.stderr);
    assert.match(installed.stdout, /TOKEN_FROM_SERVE_JSON/);
  }
});

test('simultaneous daemon startup publishes exactly one owner and cleans private files', async t => {
  const root = await project(t), path = join(root, '.plumber/serve.json');
  const starts = await Promise.allSettled([serve({ root, watch: false }), serve({ root, watch: false })]);
  const running = starts.filter(result => result.status === 'fulfilled').map(result => result.value);
  t.after(async () => { for (const daemon of running) await daemon.close(); });
  assert.equal(running.length, 1);
  const refused = starts.find(result => result.status === 'rejected');
  assert.equal(refused.reason.code, 'EEXIST', 'exclusive publication decides the simultaneous startup race');
  assert.deepEqual(JSON.parse(await readFile(path, 'utf8')), running[0].info);
  assert.equal((await readdir(join(root, '.plumber'))).some(name => name.endsWith('.tmp')), false);
});

test('concurrent cold checks publish reusable complete caches in one process', async t => {
  const root = await project(t);
  const config = join(root, 'plumber.config.ts');
  await writeFile(config, "export default { css: 'src/styles.css' };\n");
  const stable = ({ timing, moduleGraph: { cacheHits, cacheMisses, parseMs, totalMs, ...graph }, ...report }) => ({ ...report, moduleGraph: graph });
  const reports = await Promise.all(Array.from({ length: 4 }, () => check({ root, config })));
  for (const report of reports) assert.deepEqual(stable(report), stable(reports[0]));
  const warm = await check({ root, config });
  assert.deepEqual(stable(warm), stable(reports[0]));
  assert.ok(Object.values(warm.timing.phases).every(ms => ms === 0), 'published receipt enables a complete cache hit');
});

test('concurrent worker checks share complete ownership receipts', async t => {
  const root = await project(t);
  await cp(join(repo, 'fixtures/ownership'), root, { recursive: true });
  const workers = Array.from({ length: 4 }, () => new Worker(`
    const { parentPort, workerData } = require('node:worker_threads');
    (async () => {
      const { check } = await import(workerData.entry);
      parentPort.once('message', async () => parentPort.postMessage(await check({ root: workerData.root })));
      parentPort.postMessage('ready');
    })();
  `, { eval: true, workerData: { root, entry: new URL('../dist/index.js', import.meta.url).href } }));
  t.after(async () => { await Promise.all(workers.map(worker => worker.terminate())); });
  await Promise.all(workers.map(worker => once(worker, 'message')));
  const pending = workers.map(worker => once(worker, 'message'));
  for (const worker of workers) worker.postMessage('check');
  const reports = (await Promise.all(pending)).map(([report]) => report);
  const cold = JSON.parse(run(root, 'check', '--json').stdout);
  assert.ok(cold.findings.some(finding => finding.rule.startsWith('ownership/')));
  assert.ok(cold.coverage.ownership);
  for (const report of reports) {
    assert.deepEqual(report.findings, cold.findings);
    assert.deepEqual(report.coverage.ownership, cold.coverage.ownership);
  }
});
