// Shared by the headless craft tests (pairs, probes, structure, judge): a Vite dev server with the plugin on a fixture
// app copied from overlay/demo, and the real `plumber craft` binary run against it.
import { execFile } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { createServer } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { plumb } from '@unlocalhosted/react-plumber/vite';

export const repo = fileURLToPath(new URL('../../', import.meta.url));
export const cli = join(repo, 'dist/cli.js');
const run = promisify(execFile);

export const built = () => readFile(cli).then(() => true, () => false);

// `app` is src/App.jsx; `files` more files under src/; `api` answers /api/<name> with JSON from the dev server
export async function fixture(t, app, { files = {}, api = {}, styles = '', handlers, track = [] } = {}) {
  const root = await mkdtemp(join(repo, 'fixtures/.craft-hl-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'overlay/demo/src'), join(root, 'src'), { recursive: true });
  await cp(join(repo, 'overlay/demo/index.html'), join(root, 'index.html'));
  await writeFile(join(root, 'src/App.jsx'), app);
  if (styles) await writeFile(join(root, 'src/styles.css'), (await readFile(join(root, 'src/styles.css'), 'utf8')) + '\n' + styles);
  for (const [name, text] of Object.entries(files)) { await mkdir(dirname(join(root, 'src', name)), { recursive: true }); await writeFile(join(root, 'src', name), text); }
  const hits = {};
  const server = await createServer({
    root, cacheDir: join(root, '.vite-cache'), configFile: false, logLevel: 'silent', server: { host: '127.0.0.1', port: 0 },
    oxc: { jsx: { runtime: 'automatic', development: true } },
    plugins: [tailwindcss(), plumb({ watch: false }), {
      name: 'fixture-api',
      configureServer(s) {
        s.middlewares.use((req, res, next) => { const p = req.url.split('?')[0]; if (track.includes(p)) hits[p] = (hits[p] ?? 0) + 1; next(); });
        s.middlewares.use('/api', (req, res, next) => {
          const name = req.url.split('?')[0].replace(/^\//, '');
          hits[name] = (hits[name] ?? 0) + 1;
          if (handlers?.[name]) return handlers[name](req, res, hits);
          if (!(name in api)) return next();
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify(api[name]));
        });
        s.middlewares.use('/__hits', (req, res) => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(hits)); });
      },
    }],
  });
  t.after(() => server.close());
  await server.listen();
  return { root, hits, url: `http://127.0.0.1:${server.httpServer.address().port}/` };
}

export const plumber = (args, extra = {}) => run('node', [cli, 'craft', ...args], { cwd: repo, env: { ...process.env, ...extra }, timeout: 300000 })
  .then((r) => ({ code: 0, ...r }), (e) => ({ code: e.code, stdout: e.stdout, stderr: e.stderr }));

export const lineOf = (source, id) => source.slice(0, source.indexOf(`id="${id}"`)).split('\n').length;

// the findings of one rule, as `file:line` of the places they name
export const at = (report, rule) => report.findings.filter((f) => f.rule === rule).map((f) => ({ line: f.sites[0].line, file: f.sites[0].file, severity: f.severity, finding: f }));
export const hasLine = (report, rule, line) => at(report, rule).some((f) => f.file.endsWith('src/App.jsx') && f.line === line);
