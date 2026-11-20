// Builds the live catalogue: the parts that work (results.jsonl: renders, drew a shape, alive, no error screen) into
// one static bundle, each part its own chunk, served by the plumber site under /research/button-ideas/live/.
//   node live-build.mjs   (on vm-agent, after a recording run)   → live/
import { readFile, writeFile } from 'node:fs/promises';
import { build } from 'vite';
import { fileURLToPath } from 'node:url';
const here = fileURLToPath(new URL('./', import.meta.url));
const ok = (await readFile(`${here}results.jsonl`, 'utf8')).split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((r) => r.renders && r.drewShape && r.alive && !r.errorScreen);
await writeFile(`${here}live-parts.generated.js`, `export const PARTS = {\n${ok.map((r) => `  '${r.key}': () => import('./parts/${r.key}/entry.jsx'),`).join('\n')}\n};\n`);
const base = (await import(`${here}vite.config.mjs`)).default;
await build({ ...base, configFile: false, base: './', logLevel: 'warn', build: { outDir: `${here}live`, emptyOutDir: true, rollupOptions: { input: `${here}live.html` }, chunkSizeWarningLimit: 4000 } });
console.log(`${ok.length} parts built into live/`);
