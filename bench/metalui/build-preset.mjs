// Regenerate the portable snapshot from the existing read-only benchmark mapping.
import { writeFile, cp } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import config from './all.config.ts';
const directory = resolve(dirname(fileURLToPath(import.meta.url)), 'preset');
const metalui = resolve(directory, '../../../../metalui');
const sources = [
  ['tokens/tokens.json', 'tokens.json'],
  ['packages/metalui/src/components/theme.css', 'theme.css'],
  ['packages/metalui/src/components/tokens.css', 'tokens.css'],
  ['apps/docs/src/styles.css', 'docs.css'],
];
for (const [source, destination] of sources) await cp(resolve(metalui, source), resolve(directory, 'sources', destination));
const records = (await Promise.all(Object.values(config.decisions).map(source => source.from()))).flat().map(record => {
  const input = relative(metalui, record.source.file);
  const copy = sources.find(([source]) => source === input);
  return { ...record, exported: true, source: { file: `plumb/sources/${copy?.[1] ?? 'tokens.json'}`, line: record.source.line } };
});
await writeFile(resolve(directory, 'decisions.json'), JSON.stringify(records, null, 2) + '\n');
await writeFile(resolve(directory, 'metadata.json'), JSON.stringify({
  decisions: Object.fromEntries(Object.entries(config.decisions).map(([family, { from, ...policy }]) => [family, { ...policy, exported: true }])),
  components: config.components, imitation: config.imitation, habits: config.habits, markers: config.markers,
}, null, 2) + '\n');
console.log(`${records.length} published tokens`);
