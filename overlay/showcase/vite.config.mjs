// Quarry, the craft showcase (docs/craft/showcase.md): its own project, so React Plumber judges it by its own theme.
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import { plumb } from '../../dist/hosts/vite.js';

// Quarry's backend, as far as the showcase needs one: the activity feed and a refresh, each a short wait away
const api = {
  name: 'quarry-api',
  configureServer(server) {
    server.middlewares.use('/api', (req, res) => {
      const body = req.url.startsWith('/activity')
        ? [{ id: 1, what: 'Halden & Co. opened INV-2041', when: '2 min ago' }, { id: 2, what: 'Northfield Dental paid INV-2040', when: '1 h ago' }, { id: 3, what: 'Reminder sent for INV-2039', when: 'Yesterday' }]
        : { ok: true };
      setTimeout(() => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(body)); }, 120);
    });
  },
};

// The probe stage's backend (docs/craft/probe-stage-brief.md, layer 2): GET /__showcase/probe/:n?side=broken|fixed runs the
// real `plumber craft --record-probe` on /rule/:n, scoped to the example, and answers its findings, probe record and frames.
// Cached on disk by the examples' source, so an edit re-probes; one run at a time.
const repo = resolve(import.meta.dirname, '../..');
const cacheDir = join(import.meta.dirname, '.probe-cache');
const ORIGIN = 'http://127.0.0.1:4312';
let queue = Promise.resolve();
const sourceHash = () => createHash('sha1').update(readFileSync(join(import.meta.dirname, 'src/principles/examples.jsx'))).digest('hex').slice(0, 12);

function runCli(n, side, dir) {
  return new Promise((done, fail) => {
    const args = ['dist/cli.js', 'craft', '--url', ORIGIN, '--routes', `/rule/${n}?side=${side}`, '--scope', '[data-example]', '--json', '--record-probe', dir];
    execFile('node', args, { cwd: repo, timeout: 240000, maxBuffer: 64 * 1024 * 1024 }, (error, stdout, stderr) => {
      // exit 1 means it found something; that is an answer, not a failure
      if (error && error.code !== 1) return fail(new Error(stderr || error.message));
      try { done(JSON.parse(stdout)); } catch { fail(new Error(stderr || `plumber craft printed no JSON: ${stdout.slice(0, 500)}`)); }
    });
  });
}

async function probe(n, side) {
  const key = `${n}-${side}-${sourceHash()}`;
  const dir = join(cacheDir, key);
  const answer = join(dir, 'answer.json');
  if (!existsSync(answer)) {
    if (!existsSync(join(repo, 'dist/cli.js'))) throw new Error('plumber is not built: run npm run build in the repo root.');
    const tmp = `${dir}.run`;
    await rm(tmp, { recursive: true, force: true });
    await mkdir(tmp, { recursive: true });
    const report = await runCli(n, side, tmp);
    const probeJson = JSON.parse(await readFile(join(tmp, 'probe.json'), 'utf8').catch(() => { throw new Error(`plumber recorded no probe for /rule/${n}?side=${side} (no menu with a submenu in [data-example]).`); }));
    await writeFile(join(tmp, 'answer.json'), JSON.stringify({ n: Number(n), side, findings: report.findings ?? [], probe: probeJson }));
    await rm(dir, { recursive: true, force: true });
    await rename(tmp, dir);
  }
  const base = JSON.parse(await readFile(answer, 'utf8'));
  return { ...base, frames: base.probe.frames.map((f) => ({ t: f.t, url: `/__showcase/probe-frames/${key}/${f.file}` })) };
}

const probeRoutes = {
  name: 'showcase-probe',
  configureServer(server) {
    server.middlewares.use('/__showcase/probe-frames', async (req, res, next) => {
      const m = /^\/([\w-]+)\/(frame-\d+\.png)$/.exec(req.url.split('?')[0]);
      if (!m) return next();
      try { res.setHeader('content-type', 'image/png'); res.setHeader('cache-control', 'public, max-age=31536000, immutable'); res.end(await readFile(join(cacheDir, m[1], m[2]))); }
      catch { res.statusCode = 404; res.removeHeader('content-type'); res.end('no such frame'); }
    });
    server.middlewares.use('/__showcase/probe', (req, res, next) => {
      const url = new URL(req.url, ORIGIN);
      const m = /^\/(\d+)$/.exec(url.pathname);
      const side = url.searchParams.get('side') ?? 'broken';
      if (!m || !['broken', 'fixed'].includes(side)) return next();
      const run = queue.then(() => probe(m[1], side));
      queue = run.then(() => {}, () => {});
      run.then(
        (body) => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(body)); },
        (error) => { res.statusCode = 500; res.setHeader('content-type', 'text/plain'); res.end(String(error.message ?? error)); },
      );
    });
  },
};

export default {
  root: import.meta.dirname,
  plugins: [tailwindcss(), plumb(), api, probeRoutes],
  oxc: { jsx: { runtime: 'automatic', development: true } },
  server: { host: '127.0.0.1', port: 4312, strictPort: true },
};
