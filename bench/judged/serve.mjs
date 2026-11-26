#!/usr/bin/env node
// The judging server (bench/judged/README.md). It stands in front of an app and adds one address, /__judge/:
// a page that shows the app's screens one at a time in a frame, with a layer on top where a person marks what looks
// wrong. Everything else is passed to the app, so the frame and the judging page share one origin and the page can
// read the screen it is judging (its elements, their boxes, their styles, the line each was written on).
//
//   node bench/judged/serve.mjs bench/judged/sets          every set, each at its own address:
//                                                          http://<set>.localhost:4420/__judge/  (the list is at
//                                                          http://localhost:4420/__judge/)
//   node bench/judged/serve.mjs bench/judged/sets/calcom   that one set, at http://localhost:4420/__judge/
//
// A set at its own address keeps its own cookies and storage, so two sets open in two tabs do not disturb each other.
// The app may be a local dev server or a public site. From a public site two response headers are dropped, the ones
// that forbid framing and that list allowed origins: the page is now served from this origin, so they no longer
// describe it. Nothing else the app sends is changed. What a judge says is kept in the set's folder:
//   judgements/<screen>.<judge>.json   the looks and the marks, saved as they are made
//   screens/<screen>.<judge>.json      the screen as plain data, taken when the judge says the screen is done
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(process.argv[2] ?? join(here, 'sets'));
const one = existsSync(join(root, 'set.json')); // one set, or a folder of sets
const port = Number(process.env.PORT ?? 4420);
const NAME = /^[a-z0-9][a-z0-9-]{0,60}$/;

const FILES = {
  '/__judge/': [join(here, 'judge.html'), 'text/html; charset=utf-8'],
  '/__judge/judge.js': [join(here, 'judge.js'), 'text/javascript; charset=utf-8'],
  '/__judge/snapshot.js': [join(here, 'snapshot.js'), 'text/javascript; charset=utf-8'],
  '/__judge/review.js': [join(here, 'review.js'), 'text/javascript; charset=utf-8'],
  '/__judge/soft.js': [join(here, '../../overlay/src/soft.js'), 'text/javascript; charset=utf-8'],
  '/__judge/tokens.css': [join(here, '../../overlay/src/tokens.css'), 'text/css; charset=utf-8'],
};

// which set a request is for: the one set, or the one named before ".localhost" in the address
const named = (req) => (one ? '' : /^([a-z0-9-]+)\.localhost(:\d+)?$/.exec(req.headers.host ?? '')?.[1] ?? null);
const cache = new Map();
const moved = new Map(); // a site that sends us to its other address (with or without "www.") is asked there from then on
async function open(name) {
  const kept = cache.get(name);
  if (kept && Date.now() - kept.at < 3000) return kept;
  const dir = one ? root : join(root, name);
  const set = JSON.parse(await readFile(join(dir, 'set.json'), 'utf8'));
  for (const s of set.screens) if (!NAME.test(s.id)) throw new Error(`${name}: "${s.id}" is not a screen id (lowercase letters, digits, dashes)`);
  const entry = { at: Date.now(), name, dir, set, app: new URL(moved.get(name) ?? set.app), known: new Set(set.screens.map((s) => s.id)) };
  cache.set(name, entry);
  return entry;
}
const names = async () => (one ? [] : (await readdir(root, { withFileTypes: true })).filter((e) => e.isDirectory() && NAME.test(e.name) && existsSync(join(root, e.name, 'set.json'))).map((e) => e.name).sort());

const json = (res, status, body) => { res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify(body)); };
const body = (req, limit = 64 << 20) => new Promise((done, fail) => {
  const parts = []; let size = 0;
  req.on('data', (c) => { size += c.length; if (size > limit) { fail(new Error('too large')); req.destroy(); } else parts.push(c); });
  req.on('end', () => { try { done(JSON.parse(Buffer.concat(parts).toString('utf8'))); } catch (e) { fail(e); } });
  req.on('error', fail);
});
// written beside the file and moved over it, so a save that is cut short never leaves half a judgement
async function keep(dir, name, value) {
  await mkdir(dir, { recursive: true });
  const file = join(dir, name), temp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temp, `${JSON.stringify(value, null, 1)}\n`);
  await rename(temp, file);
}
// A judgement's file is <screen>.<judge>.json and nothing else: a save that was cut short leaves a file with a longer
// name beside it, which is never read. A file that cannot be read as a judgement is passed over, and said in the log,
// so one bad file never takes the whole set's page down.
const KEPT = /^([a-z0-9-]+)\.([a-z0-9-]+)\.json$/;
async function kept(file) {
  try { return JSON.parse(await readFile(file, 'utf8')); }
  catch (e) { console.error(`not read: ${file} (${e.message})`); return null; }
}
// which code drew the screen: the app's commit and whether files had changed since it. An app that runs elsewhere
// says its commit in set.json.
async function code(set) {
  if (!set.appDir) return set.code ?? null;
  const dir = resolve(here, '../..', set.appDir); // from this repository's root
  const git = (args) => new Promise((done) => execFile('git', ['-C', dir, ...args], (err, out) => done(err ? null : out.trim())));
  const commit = await git(['rev-parse', 'HEAD']);
  if (!commit) return null;
  const changed = await git(['status', '--porcelain']);
  return { commit, changedFiles: changed ? changed.split('\n').length : 0 };
}
// who has judged in a set, and how many marks each left
async function judges(dir) {
  const out = {};
  for (const name of await readdir(join(dir, 'judgements')).catch(() => [])) {
    const who = KEPT.exec(name)?.[2];
    if (!who) continue;
    const j = await kept(join(dir, 'judgements', name));
    if (!j) continue;
    out[who] ??= { screens: 0, marks: 0 };
    out[who].screens += j.done ? 1 : 0; out[who].marks += j.marks?.length ?? 0;
  }
  return out;
}

async function judging(req, res, url, name) {
  if (req.method === 'GET' && FILES[url.pathname]) {
    const [file, type] = FILES[url.pathname];
    res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' });
    return res.end(await readFile(file));
  }
  if (name === null) { // the list of sets
    if (req.method === 'GET' && url.pathname === '/__judge/set') {
      const sets = [];
      for (const n of await names()) { const s = await open(n); sets.push({ name: n, title: s.set.title ?? n, app: s.set.app, screens: s.set.screens.length, judges: await judges(s.dir) }); }
      return json(res, 200, { index: true, port, sets });
    }
    return json(res, 404, { error: 'pick a set: http://<set>.localhost/__judge/' });
  }
  const { dir, set, known } = await open(name);
  const judge = url.searchParams.get('judge') ?? 'owner';
  if (!NAME.test(judge)) return json(res, 400, { error: 'judge: lowercase letters, digits, dashes' });
  if (req.method === 'GET' && url.pathname === '/__judge/set') {
    const judgements = {};
    for (const file of await readdir(join(dir, 'judgements')).catch(() => [])) {
      const [, id, who] = KEPT.exec(file) ?? [];
      const j = who === judge && known.has(id) ? await kept(join(dir, 'judgements', file)) : null;
      if (j) judgements[id] = j;
    }
    const all = await names(), at = all.indexOf(name);
    return json(res, 200, { set, judge, judgements, port, list: !one, before: all[at - 1] ?? null, after: all[at + 1] ?? null });
  }
  const saving = /^\/__judge\/(judgement|screen)\/([^/]+)$/.exec(url.pathname);
  if (req.method === 'POST' && saving && known.has(saving[2])) {
    const value = await body(req);
    if (saving[1] === 'judgement') await keep(join(dir, 'judgements'), `${saving[2]}.${judge}.json`, value);
    // kept per judge: the screen is what that judge was looking at, and one judge's run never replaces another's
    else await keep(join(dir, 'screens'), `${saving[2]}.${judge}.json`, { ...value, code: await code(set) });
    return json(res, 200, { ok: true });
  }
  return json(res, 404, { error: 'not a judging address' });
}

// the same site with or without "www." is one site: a redirect between the two stays here
const sameSite = (a, b) => a.replace(/^www\./, '') === b.replace(/^www\./, '');
function pass(req, res, { name, set, app }) {
  const secure = app.protocol === 'https:';
  const headers = { ...req.headers, host: app.host };
  // a public site is asked as a visitor to that site would ask it
  if (secure) { delete headers.origin; headers.referer = `${app.origin}/`; }
  const up = (secure ? https : http).request({ hostname: app.hostname, port: app.port || (secure ? 443 : 80), path: req.url, method: req.method, headers, servername: secure ? app.hostname : undefined }, (answer) => {
    const out = { ...answer.headers };
    // a redirect to the app's own full address would take the frame off this origin: keep it here
    if (typeof out.location === 'string') {
      try {
        const to = new URL(out.location, app);
        if (sameSite(to.host, app.host)) {
          if (to.host !== app.host) { moved.set(name, to.origin); cache.delete(name); }
          out.location = to.pathname + to.search + to.hash;
        }
      } catch { /* left as sent */ }
    }
    // these describe the site's own origin, which this is not: one forbids framing, one lists allowed origins
    delete out['x-frame-options']; delete out['content-security-policy']; delete out['content-security-policy-report-only'];
    res.writeHead(answer.statusCode ?? 502, out); answer.pipe(res);
  });
  up.on('error', (e) => { if (!res.headersSent) res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' }); res.end(`${set.app} did not answer (${e.code ?? e.message}). If it is a local app, start it, then reload.`); });
  req.pipe(up);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://judge');
  const name = named(req);
  try {
    if (url.pathname === '/__judge' || (name === null && url.pathname === '/')) { res.writeHead(302, { location: '/__judge/' }); return res.end(); }
    if (url.pathname.startsWith('/__judge/')) return await judging(req, res, url, name);
    if (name === null) return json(res, 404, { error: 'pick a set at /__judge/' });
    pass(req, res, await open(name));
  } catch (e) { json(res, e?.code === 'ENOENT' ? 404 : 500, { error: String(e?.message ?? e) }); }
});

// a local app's live-update socket goes through untouched, addressed as the app expects
server.on('upgrade', async (req, socket, head) => {
  const name = named(req);
  const entry = name === null ? null : await open(name).catch(() => null);
  if (!entry || entry.app.protocol !== 'http:') return socket.destroy();
  const { app } = entry;
  const up = net.connect({ host: app.hostname, port: Number(app.port) }, () => {
    const lines = [`${req.method} ${req.url} HTTP/1.1`];
    for (let i = 0; i < req.rawHeaders.length; i += 2) {
      const key = req.rawHeaders[i];
      lines.push(`${key}: ${/^host$/i.test(key) ? app.host : /^origin$/i.test(key) ? app.origin : req.rawHeaders[i + 1]}`);
    }
    up.write(`${lines.join('\r\n')}\r\n\r\n`);
    if (head.length) up.write(head);
    socket.pipe(up); up.pipe(socket);
  });
  up.on('error', () => socket.destroy());
  socket.on('error', () => up.destroy());
});

server.listen(port, '127.0.0.1', async () => {
  console.log(one ? `Judging one set at http://localhost:${port}/__judge/` : `Judging ${(await names()).length} sets. The list is at http://localhost:${port}/__judge/`);
});
