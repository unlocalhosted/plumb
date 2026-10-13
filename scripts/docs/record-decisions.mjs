// Run from repo root: node scripts/docs/record-decisions.mjs (uses existing dist/).
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../../dist/config.js';
import { discoverProject, projectSourceFiles } from '../../dist/project.js';
import { collectStylesheets } from '../../dist/collect/stylesheets.js';
import { references } from '../../dist/collect/source.js';
import { lowerTailwind } from '../../dist/lower/tailwind.js';
import { readDecisions } from '../../dist/decisions/index.js';
import { pixels } from '../../dist/decisions/resolve.js';
import { recordingJSON, recordingPaths } from './recording.mjs';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const root = resolve(repo, 'site');
const portable = recordingPaths({ repo, root });
const { value: config } = await loadConfig(root);
const project = await discoverProject(root, config);
const sources = await projectSourceFiles(root, config);
const graph = await collectStylesheets(project.tailwind.entry, sources, []);
const memory = {};
const theme = await lowerTailwind(root, project.tailwind.entry, project.tailwind.version, [], false, true, false, memory);
const record = await readDecisions(root, config, graph, theme.theme);
if (!memory.system) throw new Error('The project Tailwind compiler did not load.');

// Base utilities listed by the project's compiler. Variants, modifiers and the
// unbounded arbitrary-value syntax are deliberately outside this finite list.
const classes = memory.system.getClassList().map(([name]) => name);
const diagnostics = [...project.diagnostics, ...graph.diagnostics, ...theme.diagnostics];
if (diagnostics.length) throw new Error(JSON.stringify(diagnostics, null, 2));
const keys = new Map(record.decisions.map(token => [token.name, new Set()]));
const compact = value => value.replace(/\s+/g, '');
const numeric = record.decisions.filter(token => token.family === 'spacing' && token.refs.includes(token.value));
const numericNames = new Set(numeric.map(token => token.name));
const spacingRoots = new Set(), zeros = [];
// Observe the real compiler's successful theme lookups before inline themes
// erase their names. This is a version-sensitive compiler hook, not a guess
// based on matching equal values. Fail if the installed compiler changes it.
const values = memory.system.theme.values;
if (!(values instanceof Map)) throw new Error('Tailwind theme lookup hook changed; update this recorder.');
const get = values.get;
let lookedUp;
values.get = function (key) {
  const value = get.call(this, key);
  if (value !== undefined) lookedUp?.add(key);
  return value;
};
try {
  for (const name of classes) {
    lookedUp = new Set();
    const css = memory.system.candidatesToCss([name])[0];
    if (!css) continue;
    const refs = new Set([...lookedUp, ...references(css)]);
    for (const ref of refs) keys.get(ref)?.add(name);
    for (const candidate of memory.system.parseCandidate(name)) {
      if (candidate.value?.kind !== 'named' || !/^[\d.]+$/.test(candidate.value.value)) continue;
      if (candidate.value.value === '0') zeros.push({ name, root: candidate.root });
      if (!refs.has('--spacing')) continue;
      spacingRoots.add(candidate.root);
      const token = `--spacing-${candidate.value.value}`;
      if (numericNames.has(token)) keys.get(token).add(name);
    }
    for (const token of numeric) {
      if (compact(css).includes(compact(token.value))) keys.get(token.name).add(name);
    }
  }
} finally {
  values.get = get;
}
// Zero is emitted as 0px without a variable read. Include only compiling zero
// utilities whose root was independently proved to consume numeric spacing.
if (numericNames.has('--spacing-0')) for (const zero of zeros) {
  if (spacingRoots.has(zero.root)) keys.get('--spacing-0').add(zero.name);
}

const families = Object.fromEntries(['spacing', 'color', 'radius', 'type', 'motion', 'elevation', 'z', 'size', 'opacity'].map(family => [family, []]));
for (const token of record.decisions) {
  const px = token.resolved === undefined ? undefined : pixels(token.resolved);
  families[token.family].push({
    name: token.name,
    classKeys: [...keys.get(token.name)].sort(),
    value: token.value,
    resolved: px === undefined ? token.resolved ?? null : `${Number(px.toFixed(8))}px`,
    reason: token.why || null,
    groupReason: token.groupWhy ?? null,
    origin: token.origin,
    tier: token.tier,
    refs: token.refs,
    source: { file: relative(root, token.source.file).replaceAll('\\', '/'), line: token.source.line },
  });
}
const output = resolve(root, 'src/docs/recordings/decisions.json');
await mkdir(dirname(output), { recursive: true });
await writeFile(output, recordingJSON({
  root: 'site/',
  tailwindVersion: project.tailwind.version,
  resolver: 'dist/decisions/index.js:readDecisions',
  classKeysScope: 'Compiler-listed base utilities with successful theme lookups or emitted decision references/spacing recipes, including zero utilities on proved spacing roots; excludes variants, modifiers and arbitrary-value syntax. Empty means no listed utility directly consumes this token.',
  resolvedScope: 'Static resolver values; scalar lengths converted to px (rem = 16px). Null means unresolved, including theme-dependent values.',
  families,
}, portable));
console.log(`Recorded ${record.decisions.length} decisions: ${relative(repo, output)}`);
