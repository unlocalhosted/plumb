import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { CssImport } from './modules.js';

// A stylesheet a script reads instead of importing: `readFile('../overlay/src/tokens.css')`, a token file put on the
// page from a server component, a file fetched into a shadow root. The path is a string in the code, so it is found
// the same way a reader would find it: a quoted path ending in .css, tried from the module's folder and then from
// the project's root (scripts that read files usually resolve from the working directory). Only paths that name a
// real file are kept; nothing is run.
const QUOTED = /(['"`])((?:\.{1,2}\/|\/)?[\w@.+-]+(?:\/[\w@.+-]+)*\.css)\1/g;

export function namedStylesheets(root: string, files: readonly string[]): CssImport[] {
  const found = new Map<string, CssImport>();
  for (const file of files) {
    if (!/\.(?:[jt]sx?|[mc][jt]s)$/.test(file) || /\.d\.[cm]?ts$/.test(file)) continue;
    let text: string;
    try { text = readFileSync(file, 'utf8'); } catch { continue; }
    if (!text.includes('.css')) continue;
    for (const match of text.matchAll(QUOTED)) {
      const specifier = match[2]!;
      for (const base of [dirname(file), root]) {
        const path = resolve(base, specifier);
        if (!existsSync(path)) continue;
        if (!found.has(path)) found.set(path, { file, specifier, resolved: path });
        break;
      }
    }
  }
  return [...found.values()];
}
