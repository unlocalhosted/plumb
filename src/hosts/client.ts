import { readFile } from 'node:fs/promises';

/** Later overlay layers build dist/client.js; until then use the packaged wiring stub. */
export async function overlayClient(): Promise<string> {
  try { return await readFile(new URL('../../overlay/dist/client.js', import.meta.url), 'utf8'); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  return readFile(new URL('../../overlay/client.js', import.meta.url), 'utf8');
}
