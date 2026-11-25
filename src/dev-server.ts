import { execFileSync } from 'node:child_process';
import { readlinkSync } from 'node:fs';
import { resolve, sep } from 'node:path';

/**
 * The project's running dev server, found without being told: a process listening on a local port whose working
 * folder is this project (or inside it), answering with a web page. An agent asked to check the page shouldn't need
 * to know the address, and a person who started `npm run dev` in another terminal shouldn't have to copy it.
 * macOS and Linux (lsof); elsewhere, and when nothing matches, the caller asks for --url.
 */
export interface DevServer { url: string; pid: number; command: string }

function listening(): { pid: number; port: number }[] {
  let out: string;
  try { out = execFileSync('lsof', ['-nP', '-iTCP', '-sTCP:LISTEN', '-Fpn'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000 }); }
  catch (error) { out = String((error as { stdout?: unknown }).stdout ?? ''); }
  const found: { pid: number; port: number }[] = [];
  let pid = 0;
  for (const line of out.split('\n')) {
    if (line.startsWith('p')) pid = Number(line.slice(1));
    else if (line.startsWith('n')) {
      const port = Number(/:(\d+)$/.exec(line)?.[1]);
      // only local addresses: a server open to the network is still reached on localhost
      if (pid && port && /^n(\*|127\.0\.0\.1|\[::1\]|\[::\]|localhost|0\.0\.0\.0)?:/.test(line) && !found.some(f => f.pid === pid && f.port === port)) found.push({ pid, port });
    }
  }
  return found;
}

function cwdOf(pid: number): string | undefined {
  try { return readlinkSync(`/proc/${pid}/cwd`); } catch { /* not Linux */ }
  try { return /^n(.+)$/m.exec(execFileSync('lsof', ['-a', '-p', String(pid), '-d', 'cwd', '-Fn'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 3000 }))?.[1]; }
  catch { return undefined; }
}
function commandOf(pid: number): string {
  try { return execFileSync('ps', ['-o', 'command=', '-p', String(pid)], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 3000 }).trim(); } catch { return ''; }
}

async function servesPage(port: number): Promise<string | undefined> {
  for (const host of ['localhost', '127.0.0.1']) {
    try {
      const response = await fetch(`http://${host}:${port}/`, { signal: AbortSignal.timeout(3000), redirect: 'follow' });
      if ((response.headers.get('content-type') ?? '').includes('text/html')) return `http://${host}:${port}/`;
    } catch { /* try the next host */ }
  }
  return undefined;
}

export async function findDevServer(root: string): Promise<DevServer[]> {
  if (process.platform === 'win32') return [];
  const here = resolve(root), inside = (dir: string) => dir === here || dir.startsWith(here + sep);
  const cwds = new Map<number, string | undefined>();
  const candidates = listening().filter(({ pid }) => {
    if (!cwds.has(pid)) cwds.set(pid, cwdOf(pid));
    const cwd = cwds.get(pid);
    return cwd !== undefined && inside(cwd);
  });
  const servers: DevServer[] = [];
  // a dev server often holds a second port (its hot-reload socket): only one that answers with a page counts
  for (const { pid, port } of candidates.sort((a, b) => a.port - b.port)) {
    const url = await servesPage(port);
    if (url) servers.push({ url, pid, command: commandOf(pid) });
  }
  return servers;
}
