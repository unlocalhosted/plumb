// Serve the sloppy screens with the plumber plugin, run `plumber craft`, print what the tells pack said, by screen.
import { execFile } from 'node:child_process';
import { cp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { plumb } from '@unlocalhosted/react-plumber/vite';

const here = fileURLToPath(new URL('./', import.meta.url));
const repo = join(here, '../../');
// a throwaway app, deleted after the run. Never git-ignored: plumber finds an app's files through git, and an ignored
// folder is read as an app with no source (it read 0 elements)
const root = join(repo, 'fixtures/.tells-app');
await cp(join(repo, 'overlay/demo/src'), join(root, 'src'), { recursive: true });
await cp(join(repo, 'overlay/demo/index.html'), join(root, 'index.html'));
await cp(join(here, 'App.jsx'), join(root, 'src/App.jsx'));
const server = await createServer({ root, cacheDir: join(root, '.vite-cache'), configFile: false, plugins: [tailwindcss(), plumb({ watch: false })],
  oxc: { jsx: { runtime: 'automatic', development: true } }, logLevel: process.env.VLOG ? 'info' : 'silent', server: { host: '127.0.0.1', port: 0 } });
await server.listen();
const url = `http://127.0.0.1:${server.httpServer.address().port}/`;
try {
  const r = await promisify(execFile)('node', [join(repo, 'dist/cli.js'), 'craft', '--url', url, '--json', '--no-probe', '--no-pairs', '--root', root], { cwd: repo, timeout: 180000, maxBuffer: 1e8, env: { ...process.env } }).catch((e) => e);
  if (process.env.PLUMBER_DEBUG) console.log(String(r.stderr).slice(-3000));
  if (!r.stdout) { console.log(String(r.stderr).slice(-1500)); process.exitCode = 1; }
  const report = JSON.parse(r.stdout);
  await writeFile(join(here, 'report.json'), JSON.stringify(report, null, 2));
  const app = (await readFile(join(root, 'src/App.jsx'), 'utf8')).split('\n');
  const screenOf = (line) => { for (let i = line - 1; i >= 0; i--) { const m = app[i].match(/^function (\w+)/); if (m) return m[1]; } return '?'; };
  const tells = report.findings.filter((f) => f.rule.startsWith('tells/'));
  for (const f of tells) for (const s of f.sites) console.log(`${screenOf(s.line).padEnd(10)} ${f.rule.padEnd(28)} L${s.line}  ${app[s.line - 1].trim().slice(0, 90)}`);
  console.log(`\n${tells.reduce((n, f) => n + f.sites.length, 0)} tells; packs total findings ${report.findings.length}`);
} finally { await server.close(); await rm(root, { recursive: true, force: true }); }
