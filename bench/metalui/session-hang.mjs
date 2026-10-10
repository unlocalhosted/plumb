// Profile/replay the overlay burst without editing MetalUI. Start Vite with --inspect=127.0.0.1:0.
// node bench/metalui/session-hang.mjs http://127.0.0.1:4327 ws://127.0.0.1:INSPECTOR/ID /tmp/burst.cpuprofile
import assert from 'node:assert/strict';
import { writeFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const origin = process.argv[2] ?? 'http://127.0.0.1:4327';
const inspector = process.argv[3], profilePath = process.argv[4];
const root = '/Users/vijaysingh/unlocalhosted/metalui';
const file = 'packages/metalui/src/components/button/button.tsx';
const source = await readFile(resolve(root, file), 'utf8');
const offset = source.indexOf('<BaseButton\n');
assert.ok(offset >= 0);
const before = source.slice(0, offset), line = before.split('\n').length, column = offset - before.lastIndexOf('\n');
const params = new URLSearchParams({ file, line: String(line), column: String(column) });
const paths = [`site?${params}`, `resolve?${new URLSearchParams({ source: file, line: String(line), column: String(column), component: '1' })}`, `edits?${params}`];
async function request(path) {
  const start = performance.now();
  try {
    const response = await fetch(`${origin}/__plumb/${path}`, { signal: AbortSignal.timeout(20000) });
    return { status: response.status, body: await response.json(), ms: performance.now() - start };
  } catch (error) { return { error: error.message, ms: performance.now() - start }; }
}
let socket, id = 0; const pending = new Map();
const call = method => new Promise(resolveValue => { pending.set(++id, resolveValue); socket.send(JSON.stringify({ id, method })); });
if (inspector) {
  assert.ok(profilePath, 'Provide profile output path.');
  socket = new WebSocket(inspector); await new Promise(r => socket.onopen = r);
  socket.onmessage = event => { const value = JSON.parse(event.data); if (value.id) { pending.get(value.id)?.(value.result); pending.delete(value.id); } };
}
try {
  let ready = false;
  for (let i = 0; i < 120; i++) { if ((await request('health')).body?.status === 'ready') { ready = true; break; } await delay(500); }
  assert.ok(ready, 'Session did not become ready.');
  const sequential = [];
  for (const path of paths) { const result = await request(path); assert.equal(result.status, 200, JSON.stringify(result)); sequential.push(result.body); }
  if (socket) { await call('Profiler.enable'); await call('Profiler.start'); }
  const start = performance.now();
  const burst = Promise.all(Array.from({ length: 300 }, (_, i) => request(paths[i % paths.length])));
  await delay(10); const health = await request('health');
  const results = await burst;
  if (socket) { const { profile } = await call('Profiler.stop'); await writeFile(profilePath, JSON.stringify(profile)); }
  const times = results.map(result => result.ms).sort((a, b) => a - b);
  const receipt = { origin, file, line, column, wallMs: performance.now() - start, healthMs: health.ms,
    completed: results.filter(result => result.status === 200).length, busy: results.filter(result => result.status === 503).length,
    errors: results.filter(result => result.error).length, p50: times[150], p95: times[285], max: times.at(-1),
    parity: results.every((result, i) => result.status !== 200 || JSON.stringify(result.body) === JSON.stringify(sequential[i % paths.length])) };
  console.log(JSON.stringify(receipt, null, 2));
  assert.equal(receipt.parity, true); assert.equal(receipt.completed + receipt.busy, 300);
} finally { socket?.close(); }
