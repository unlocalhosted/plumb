// The overlay's tokens, for the site itself. The overlay scopes them to its own host (:host); the site puts the same
// file on its root, so every colour, face and spring on a page of the site is the product's, read at request time.
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const file = async () => {
  for (const at of ['../overlay/src/tokens.css', 'overlay/src/tokens.css']) {
    try { return await readFile(path.resolve(process.cwd(), at), 'utf8'); } catch {}
  }
  throw new Error('overlay/src/tokens.css was not found from ' + process.cwd());
};
/** The token file as the overlay ships it. */
export const tokenFile = file;
/** The same file, on the page's root instead of the overlay's host. */
export async function rootTokens() {
  return (await file())
    .replaceAll(':host(:not([data-scheme="light"]))', ':root:not([data-scheme="light"])')
    .replaceAll(':host([data-scheme="dark"])', ':root[data-scheme="dark"]')
    .replaceAll(':host', ':root');
}
