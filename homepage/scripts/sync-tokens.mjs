// The homepage's primitives are the overlay's own (overlay/src/tokens.css), the one source. The overlay scopes them to
// its shadow root (:host); this writes the same file for a document (:root), so the page and the product never differ.
import { readFile, writeFile } from 'node:fs/promises';

const from = new URL('../../overlay/src/tokens.css', import.meta.url);
const to = new URL('../src/tokens.css', import.meta.url);
const css = (await readFile(from, 'utf8'))
  .replaceAll(':host(:not([data-scheme="light"]))', ':root:not([data-scheme="light"])')
  .replaceAll(':host([data-scheme="dark"])', ':root[data-scheme="dark"]')
  .replaceAll(':host', ':root');
// .pl-light: the light values again, as a scope. A part of the page that always shows light (the homepage's painted
// frames, light in both schemes) wears it; every token, derived ones included, is declared again there so nothing it
// holds inherits a dark value; and the text colour is set again, since it inherits already resolved from the page.
const light = css.match(/^:root \{\n([\s\S]*?)\n\}/m)[1];
await writeFile(to, `/* Generated from overlay/src/tokens.css by scripts/sync-tokens.mjs. Do not edit: change the overlay's tokens. */\n\n${css}\n.pl-light {\n${light}\n  color: var(--pl-ink);\n}\n`);
