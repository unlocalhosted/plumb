import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { availableParallelism } from 'node:os';
import { performance } from 'node:perf_hooks';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { loadConfig } from '../../dist/config.js';
import { sourceFiles } from '../../dist/project.js';
import { collectClasses } from '../../dist/collect/classes.js';
if (!isMainThread) {
  parentPort.postMessage(await collectClasses(workerData.files, workerData.helpers));
} else {
  const config = await loadConfig('/Users/vijaysingh/unlocalhosted/metalui', resolve('bench/metalui/plumber.config.ts'));
  const files = await sourceFiles('/Users/vijaysingh/unlocalhosted/metalui', config.value);
  const size = Number(process.argv[2] ?? availableParallelism());
  const start = performance.now();
  const workers = [];
  try {
    const results = await Promise.all(Array.from({ length: size }, (_, index) => new Promise((accept, reject) => {
      const worker = new Worker(new URL(import.meta.url), { workerData: { files: files.slice(Math.floor(index * files.length / size), Math.floor((index + 1) * files.length / size)), helpers: config.value.classHelpers } });
      workers.push(worker);
      worker.once('message', accept);
      worker.once('error', reject);
      worker.once('exit', code => { if (code !== 0) reject(new Error(`Worker exit ${code}`)); });
    })));
    const sites = new Map();
    for (const result of results) for (const entry of result.sites) {
      const { token, opaque, ...location } = entry;
      const { owner, conditions, ...site } = location;
      sites.set(JSON.stringify([site, owner, conditions, !!opaque]), entry);
    }
    const opaque = results.reduce((sum, result) => sum + result.opaque, 0);
    console.log(JSON.stringify({ size, elapsedMs: performance.now() - start, workerParseMs: results.map(r => r.parseMs), workerCollectMs: results.map(r => r.collectMs), hash: createHash('sha256').update(JSON.stringify([[...sites.values()], opaque])).digest('hex'), sites: sites.size, opaque }));
  } finally { await Promise.all(workers.map(worker => worker.terminate())); }
}
