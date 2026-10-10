import { readFile } from 'node:fs/promises';

export const overlayModules = ['client.js', 'src/api.js', 'src/locate.js', 'src/sourcemap.js', 'src/sourcemap-worker.js'];

/** Plain ES modules, served identically by every development host. */
export async function overlayClient(module = 'client.js'): Promise<string> {
  if (!overlayModules.includes(module)) throw new Error('Unknown overlay module.');
  if (module !== 'client.js') return readFile(new URL('../../overlay/' + module, import.meta.url), 'utf8');
  try { return await readFile(new URL('../../overlay/dist/client.js', import.meta.url), 'utf8'); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  return readFile(new URL('../../overlay/client.js', import.meta.url), 'utf8');
}
