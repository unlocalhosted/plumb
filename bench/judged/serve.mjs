#!/usr/bin/env node
// The judging server (bench/judged/README.md). It stands in front of a running app and adds one address, /__judge/:
// a page that shows the app's screens one at a time in a frame, with a layer on top where a person marks what looks
// wrong. Everything else is passed straight to the app, so the frame and the judging page share one origin and the
// page can read the screen it is judging (its elements, their boxes, their styles, the line each was written on).
//
//   node bench/judged/serve.mjs bench/judged/sets/first        (PORT=4420 by default; start it with dev-server)
//
// Nothing the app sends is changed. What a judge says is kept in the set's folder:
//   judgements/<screen>.<judge>.json   the looks and the marks, saved as they are made
//   screens/<screen>.json              the screen as plain data, taken when the judge says the screen is done
import http from 'node:http';
import net from 'node:net';
import { execFile } from 'node:child_process';
import { mkdir, readdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const setDir = resolve(process.argv[2] ?? join(here, 'sets/first'));
const port = Number(process.env.PORT ?? 4420);
const set = JSON.parse(await readFile(join(setDir, 'set.json'), 'utf8'));
const app = new URL(set.app);
const NAME = /^[a-z0-9][a-z0-9-]{0,60}$/;
const known = new Set(set.screens.map((s) => s.id));
for (const id of known) if (!NAME.test(id)) throw new Error(`set.json: "${id}" is not a screen id (lowercase letters, digits, dashes)`);

const FILES = {
  '/__judge/': [join(here, 'judge.html'), 'text/html; charset=utf-8'],
  '/__judge/judge.js': [join(here, 'judge.js'), 'text/javascript; charset=utf-8'],
  '/__judge/snapshot.js': [join(here, 'snapshot.js'), 'text/javascript; charset=utf-8'],
  '/__judge/soft.js': [join(here, '../../overlay/src/soft.js'), 'text/javascript; charset=utf-8'],
  '/__judge/tokens.css': [join(here, '../../overlay/src/tokens.css'), 'text/css; charset=utf-8'],
};

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
const appDir = set.appDir ? resolve(here, '../..', set.appDir) : null; // from this repository's root
const git = (args) => new Promise((done) => execFile('git', ['-C', appDir, ...args], (err, out) => done(err ? null : out.trim())));
// which code drew the screen: the app's commit, and whether files had changed since it
async function code() {
  if (!appDir) return null;
  const commit = await git(['rev-parse', 'HEAD']);
  if (!commit) return null;
  const changed = await git(['status', '--porcelain']);
  return { commit, changedFiles: changed ? changed.split('\n').length : 0 };
}

async function judging(req, res, url) {
  const judge = url.searchParams.get('judge') ?? 'owner';
  if (!NAME.test(judge)) return json(res, 400, { error: 'judge: lowercase letters, digits, dashes' });
  if (req.method === 'GET' && FILES[url.pathname]) {
    const [file, type] = FILES[url.pathname];
    res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' });
    return res.end(await readFile(file));
  }
  if (req.method === 'GET' && url.pathname === '/__judge/set') {
    const judgements = {};
    const names = await readdir(join(setDir, 'judgements')).catch(() => []);
    for (const name of names) {
      const [id, who, ext] = name.split('.');
      if (ext === 'json' && who === judge && known.has(id)) judgements[id] = JSON.parse(await readFile(join(setDir, 'judgements', name), 'utf8'));
    }
    return json(res, 200, { set, judge, judgements });
  }
  const saving = /^\/__judge\/(judgement|screen)\/([^/]+)$/.exec(url.pathname);
  if (req.method === 'POST' && saving && known.has(saving[2])) {
    const value = await body(req);
    if (saving[1] === 'judgement') await keep(join(setDir, 'judgements'), `${saving[2]}.${judge}.json`, value);
    else await keep(join(setDir, 'screens'), `${saving[2]}.json`, { ...value, code: await code() });
    return json(res, 200, { ok: true });
  }
  return json(res, 404, { error: 'not a judging address' });
}

function pass(req, res) {
  const up = http.request({ hostname: app.hostname, port: app.port, path: req.url, method: req.method, headers: { ...req.headers, host: app.host } },
    (answer) => { res.writeHead(answer.statusCode ?? 502, answer.headers); answer.pipe(res); });
  up.on('error', (e) => { if (!res.headersSent) res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' }); res.end(`The app at ${set.app} did not answer (${e.code ?? e.message}). Start it, then reload.`); });
  req.pipe(up);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://judge');
  if (url.pathname === '/__judge') { res.writeHead(302, { location: '/__judge/' }); return res.end(); }
  if (url.pathname.startsWith('/__judge/')) return judging(req, res, url).catch((e) => json(res, 500, { error: String(e?.message ?? e) }));
  pass(req, res);
});

// the app's live-update socket (and any other) goes through untouched, addressed as the app expects
server.on('upgrade', (req, socket, head) => {
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

server.listen(port, '127.0.0.1', () => {
  console.log(`Judging "${set.name}" (${set.screens.length} screens of ${set.app}) at http://localhost:${port}/__judge/`);
});
