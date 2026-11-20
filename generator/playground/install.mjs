// Installs library parts into the playground from their registries (the files the shadcn CLI would write), with
// their imports made relative so they never meet the product's own `@` alias. Kept beside the parts: where each came
// from and under what terms.   node generator/playground/install.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('./', import.meta.url));
const PARTS = [
  { lib: 'arc', url: 'https://uiarc.dev/r/arc-motion-tokens.json', terms: 'Arc open core, free and open source (uiarc.dev/pricing)' },
  { lib: 'arc', url: 'https://uiarc.dev/r/animated-counter.json', terms: 'Arc open core, free and open source' },
  { lib: 'arc', url: 'https://uiarc.dev/r/stepper.json', terms: 'Arc open core, free and open source' },
  { lib: 'beui', url: 'https://beui.dev/r/expanding-arrow-button.json', terms: 'beUI free components, "the source is yours" (beui.dev)' },
];
// where a registry target lands in vendor/<lib>/
const place = (lib, target) => join(here, 'vendor', lib, target.replace(/^@components\/arc\//, '').replace(/^@components\/motion\//, 'components/').replace(/^@lib\//, 'lib/'));
const log = [];
for (const p of PARTS) {
  const r = await (await fetch(p.url, { headers: { 'user-agent': 'Mozilla/5.0' } })).json();
  for (const f of r.files ?? []) {
    const to = place(p.lib, f.target || f.path);
    let src = f.content ?? '';
    // beUI writes "@/lib/x": point it at vendor/beui/lib/x, relative to this file
    src = src.replace(/from "@\/lib\/([^"]+)"/g, (_, m) => `from "${relative(dirname(to), join(here, 'vendor', p.lib, 'lib', m)).replace(/^(?!\.)/, './')}"`);
    await mkdir(dirname(to), { recursive: true });
    await writeFile(to, src);
    log.push(`${p.lib}/${relative(join(here, 'vendor', p.lib), to)}`);
  }
  console.log(`${r.name.padEnd(24)} ${p.terms}`);
}
await writeFile(join(here, 'vendor', 'SOURCES.md'), `# Library parts in the playground\n\nInstalled from their registries by install.mjs, imports made relative.\n\n${PARTS.map((p) => `- ${p.url} — ${p.terms}`).join('\n')}\n\nFiles:\n${log.map((l) => `- ${l}`).join('\n')}\n`);
