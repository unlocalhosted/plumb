// The homepage's primitives are the overlay's own (overlay/src/tokens.css), the one source. The overlay scopes them to
// its shadow root (:host); this writes the same file for a document (:root), so the page and the product never differ.
import { readFile, writeFile } from 'node:fs/promises';

const from = new URL('../../overlay/src/tokens.css', import.meta.url);
const to = new URL('../src/tokens.css', import.meta.url);
const css = (await readFile(from, 'utf8'))
  .replaceAll(':host(:not([data-scheme="light"]))', ':root:not([data-scheme="light"])')
  .replaceAll(':host([data-scheme="dark"])', ':root[data-scheme="dark"]')
  .replaceAll(':host', ':root');
await writeFile(to, `/* Generated from overlay/src/tokens.css by scripts/sync-tokens.mjs. Do not edit: change the overlay's tokens. */\n\n${css}`);
