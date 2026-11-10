// What withPlumb hands the route and the overlay component: where Next's dev dist is (the overlay traces browser
// frames through it) and the installed package's real server module. The two run in the process Next serves with,
// which on Next 15.5 + webpack is not the process that loaded next.config when the config is a function, so process
// env alone does not carry them. They go into a file in the project's cache as well, read where env has nothing.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { cacheDirectory, ignoreCache } from '../paths.js';

export interface NextHost { distDir: string; serverModule: string }
const file = () => join(cacheDirectory(process.cwd()), 'next-host.json');

export function writeNextHost(host: NextHost): void {
  try { ignoreCache(process.cwd()); mkdirSync(cacheDirectory(process.cwd()), { recursive: true }); writeFileSync(file(), JSON.stringify(host)); }
  catch { /* a read-only checkout: env alone, as before */ }
}
let read: Partial<NextHost> | undefined;
function fromFile(): Partial<NextHost> {
  if (read) return read;
  try { read = existsSync(file()) ? JSON.parse(readFileSync(file(), 'utf8')) as Partial<NextHost> : {}; } catch { read = {}; }
  return read;
}
/** The value the environment carries, else the one withPlumb wrote. */
export function nextHost(name: keyof NextHost): string | undefined {
  const env = name === 'distDir' ? process.env.PLUMBER_NEXT_DIST_DIR ?? process.env.PLUMB_NEXT_DIST_DIR : process.env.PLUMBER_NEXT_SERVER_MODULE ?? process.env.PLUMB_NEXT_SERVER_MODULE;
  return env ?? fromFile()[name];
}
