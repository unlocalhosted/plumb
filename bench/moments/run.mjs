#!/usr/bin/env node
// The moments a person feels, timed through the same requests the overlay sends, on a real app's dev server.
//
//   node bench/moments/run.mjs --app <app root> --page <page.json> --edit <file in the app> --port 5190 --out <file.json>
//
// The app's `@unlocalhosted/react-plumber` link decides which plumber build runs; compare builds by pointing it at
// each in turn (bench/moments/compare.sh). Moments:
//   start      launch the dev server until plumber's health says ready
//   page       the page's stamped elements posted to `page` at once, as the overlay's blueprint reader does (widget.js)
//   pageLater  the same, after a quiet period (a build that lets go of the whole-app report has done so by then)
//   edit       a comment appended to a file of the page, until plumber answers that file's `edits` with the new hash
// After each moment the server's resident memory is read. The edited file is restored before the server stops.
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';

const { values } = parseArgs({ options: {
  app: { type: 'string' }, page: { type: 'string' }, edit: { type: 'string' }, port: { type: 'string', default: '5190' },
  out: { type: 'string' }, quiet: { type: 'string', default: '75000' }, label: { type: 'string', default: '' },
} });
if (!values.app || !values.page || !values.edit || !values.out) throw new Error('Give --app, --page, --edit and --out.');
const app = resolve(values.app), port = Number(values.port), origin = `http://localhost:${port}`;
const page = JSON.parse(readFileSync(values.page, 'utf8'));   // capture.mjs: { items: [{ stamp, tag, classes? }], files }
const editFile = resolve(app, values.edit);
const now = () => performance.now();
const wait = ms => new Promise(done => setTimeout(done, ms));
const sha = text => createHash('sha256').update(text).digest('hex');

const server = spawn('./node_modules/.bin/vite', ['--port', String(port), '--strictPort'], { cwd: app, detached: true, stdio: 'ignore', env: { ...process.env } });
const stop = () => { try { process.kill(-server.pid, 'SIGTERM'); } catch {} };
const rss = () => { try { return Math.round(Number(/VmRSS:\s+(\d+)/.exec(readFileSync(`/proc/${server.pid}/status`, 'utf8'))?.[1] ?? 0) / 1024); } catch { return null; } };
// the vite binary is a shell wrapper on some installs: the node process that holds the memory is its child
const rssTree = () => {
  try {
    const pids = [server.pid], seen = new Set();
    for (let i = 0; i < pids.length; i++) { const pid = pids[i]; if (seen.has(pid)) continue; seen.add(pid);
      for (const line of readFileSync(`/proc/${pid}/task/${pid}/children`, 'utf8').trim().split(/\s+/).filter(Boolean)) pids.push(Number(line)); }
    return pids.reduce((sum, pid) => { try { return sum + Number(/VmRSS:\s+(\d+)/.exec(readFileSync(`/proc/${pid}/status`, 'utf8'))?.[1] ?? 0); } catch { return sum; } }, 0) >> 10;
  } catch { return rss(); }
};
const get = async (path) => { const r = await fetch(`${origin}/__plumb/${path}`, { headers: { Origin: origin }, cache: 'no-store' }); return { status: r.status, body: await r.json().catch(() => null) }; };
const health = async () => { try { return (await get('health')).body; } catch { return null; } };

async function pageRead() {
  // the same de-duplication the reader does before it posts
  const unique = new Map(); for (const e of page.items) { const key = `${e.stamp}\0${e.tag}\0${e.classes ?? ''}`; if (!unique.has(key)) unique.set(key, e); }
  const start = now();
  const r = await fetch(`${origin}/__plumb/page`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin }, body: JSON.stringify({ items: [...unique.values()] }) });
  const body = await r.json().catch(() => null);
  const entries = Object.values(body?.entries ?? body?.items ?? {});
  return { ms: Math.round(now() - start), status: r.status, asked: unique.size, entries: Array.isArray(body?.entries) ? body.entries.length : entries.length, keys: body ? Object.keys(body).slice(0, 6) : null };
}

const result = { label: values.label, app, at: new Date().toISOString(), elements: page.items.length, moments: {} };
const original = readFileSync(editFile, 'utf8');
try {
  const t0 = now(); let h;
  for (;;) { h = await health(); if (h?.status === 'ready' || h?.status === 'failed') break; if (now() - t0 > 300_000) break; await wait(200); }
  result.moments.start = { ms: Math.round(now() - t0), status: h?.status ?? 'no answer', rss: rssTree() };
  if (h?.status !== 'ready') throw new Error(`plumber did not start: ${JSON.stringify(h)?.slice(0, 300)}`);
  result.moments.page = { ...await pageRead(), rss: rssTree() };

  // edit: append a comment, wait until the file's edits answer with the new hash
  const edited = original + `\n// moments bench ${Date.now()}\n`;
  const line = Math.max(1, Number(/:(\d+):\d+#/.exec(page.items.map(e => e.stamp).find(s => resolve(app, s.split(':')[0]) === editFile) ?? '')?.[1] ?? 1));
  const before = (await health())?.revision;
  const e0 = now(); writeFileSync(editFile, edited); let fresh = false, tries = 0;
  while (now() - e0 < 120_000) {
    tries++;
    const r = await get(`edits?file=${encodeURIComponent(editFile)}&line=${line}`).catch(() => null);
    if (r?.body?.hash === sha(edited)) { fresh = true; break; }
    await wait(50);
  }
  result.moments.edit = { ms: Math.round(now() - e0), fresh, tries, revisionBefore: before, revisionAfter: (await health())?.revision, rss: rssTree() };
  writeFileSync(editFile, original);
  for (const t = now(); now() - t < 60_000;) { const r = await get(`edits?file=${encodeURIComponent(editFile)}&line=${line}`).catch(() => null); if (r?.body?.hash === sha(original)) break; await wait(100); }

  await wait(Number(values.quiet));
  result.moments.pageLater = { ...await pageRead(), rss: rssTree() };
} catch (error) { result.error = String(error?.stack ?? error).slice(0, 2000); }
finally {
  if (readFileSync(editFile, 'utf8') !== original) writeFileSync(editFile, original);
  stop(); await wait(1500);
  writeFileSync(values.out, JSON.stringify(result, null, 1));
  process.exit(0);
}
