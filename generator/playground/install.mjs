// Installs a library part into the playground from its registry item (the files the shadcn CLI would write), with
// the parts it depends on, imports made relative so they never meet the product's `@` alias, and a line in
// vendor/SOURCES.md saying where it came from and under what terms.
//   import { installPart } from './install.mjs';  await installPart(part)   // a catalogue entry
//   node generator/playground/install.mjs arc/stepper beui/number-ticker
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LIBRARIES } from '../library/catalogue.mjs';

const here = fileURLToPath(new URL('./', import.meta.url));
const place = (lib, target) => join(here, 'vendor', lib, target.replace(/^@components\/arc\//, '').replace(/^@components\/motion\//, 'components/').replace(/^@components\//, 'components/').replace(/^@lib\//, 'lib/').replace(/^registry\/components\//, '').replace(/^registry\//, ''));
const done = new Set();

export async function installPart({ lib, name, item }) {
  const L = LIBRARIES.find((l) => l.lib === lib);
  const url = item ?? L.item(name);
  if (done.has(url)) return; done.add(url);
  const r = await (await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' } })).json();
  for (const dep of r.registryDependencies ?? []) if (/^https?:/.test(dep)) await installPart({ lib, name: dep.split('/').pop().replace('.json', ''), item: dep });
  const files = [];
  for (const f of r.files ?? []) {
    const to = place(lib, f.target || f.path);
    const src = (f.content ?? '').replace(/from "@\/lib\/([^"]+)"/g, (_, m) => `from "${relative(dirname(to), join(here, 'vendor', lib, 'lib', m)).replace(/^(?!\.)/, './')}"`);
    await mkdir(dirname(to), { recursive: true }); await writeFile(to, src); files.push(relative(here, to));
  }
  const log = join(here, 'vendor', 'SOURCES.md');
  let s = ''; try { s = await readFile(log, 'utf8'); } catch { s = '# Library parts in the playground\n\nInstalled from their registries by install.mjs, imports made relative.\n'; }
  if (!s.includes(url)) await writeFile(log, `${s}\n- ${url} (${L.terms})\n${files.map((f) => `  - ${f}`).join('\n')}\n`);
  return files;
}

if (import.meta.url === `file://${process.argv[1]}`) for (const a of process.argv.slice(2)) { const [lib, name] = a.split('/'); console.log(a, (await installPart({ lib, name }))?.join(' ')); }
