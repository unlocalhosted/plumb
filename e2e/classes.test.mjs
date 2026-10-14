import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));
const cli = join(root, 'dist/cli.js');
function run(directory, cache, args = []) {
  const result = spawnSync(process.execPath, [cli, '--root', directory, ...args], {
    encoding: 'utf8', timeout: 15_000, env: { ...process.env, PLUMB_CACHE_DIR: cache },
  });
  assert.ifError(result.error);
  assert.equal(result.signal, null, result.stderr);
  assert.equal(result.stderr, '');
  return result;
}
async function setup(t) {
  const directory = await mkdtemp(join(root, 'fixtures/.classes-e2e-'));
  const cache = await mkdtemp(join(tmpdir(), 'plumb-cache-e2e-'));
  t.after(() => Promise.all([rm(directory, { recursive: true, force: true }), rm(cache, { recursive: true, force: true })]));
  await cp(join(root, 'fixtures/classes'), directory, { recursive: true, filter: path => !path.includes('.plumb-cache') });
  return { directory, cache };
}

test('class lowering and existence: real CLI over literals, helpers, maps, branches, CSS and templates', async t => {
  const { directory, cache } = await setup(t);
  const cold = run(directory, cache, ['--json']);
  assert.equal(cold.status, 1, 'first run fails on errors');
  const report = JSON.parse(cold.stdout);
  const dead = new Map(report.findings.filter(f => f.rule === 'existence/dead-class').map(f => [f.declaration.value, f]));
  assert.deepEqual([...dead.keys()].sort(), ['bg-brnad', 'branch-off-dead', 'branch-on-dead', 'compound-dead', 'configured-dead', 'cva-dead', 'jsx-dead', 'logical-dead', 'map-dead', 'object-dead', 'outside-dead', 'slot-dead', 'wrapped-dead']);
  assert.match(dead.get('bg-brnad').fix, /^Did you mean `bg-brand`/, 'close match suggested');
  assert.doesNotMatch(dead.get('outside-dead').fix, /Did you mean/, 'no suggestion when nothing is close');
  assert.equal(dead.get('map-dead').sites.length, 2);
  assert.deepEqual(dead.get('map-dead').sites.map(s => [s.file.slice(directory.length + 1), s.line]), [['src/sizes.ts', 1], ['src/App.tsx', 15]]);
  assert.equal(dead.get('branch-on-dead').declaration.when[0].text, 'enabled');
  assert.equal(dead.get('branch-off-dead').declaration.when[0].text, '!(enabled)');
  assert.equal(dead.get('logical-dead').declaration.when[0].text, 'enabled');
  assert.equal(dead.get('object-dead').declaration.when[0].text, 'enabled');
  assert.equal(dead.get('outside-dead').declaration.owner.name, 'Outside');
  assert.equal(dead.get('cva-dead').declaration.when[0].text, 'size === "large"');
  assert.equal(dead.get('outside-dead').sites[0].column, 44);
  const dynamic = report.findings.filter(f => f.rule === 'existence/dynamic-class');
  assert.equal(dynamic.length, 1);
  assert.equal(dynamic[0].declaration.value, 'gap-${n}');
  assert.equal(dynamic[0].declaration.opaque, 'dynamic-class');
  assert.equal(report.classes.opaque, 6, 'four holes plus two unreadable expressions; no prefix/suffix findings');
  assert.equal(report.coverage.existence.dead, 14);
  assert.ok(report.timing.cacheMisses > 0);
  assert.equal(report.timing.cacheHits, 0);
  const warm = JSON.parse(run(directory, cache, ['--json']).stdout);
  assert.deepEqual(warm.findings, report.findings);
  assert.ok(warm.timing.cacheHits > 0);
  assert.equal(warm.timing.cacheMisses, 0);
  assert.equal(warm.timing.phases.compile, 0, 'fully warm run skips compilation');

  const explained = run(directory, cache, ['explain', 'src/App.tsx', '--json']);
  assert.equal(explained.status, 0);
  const sites = JSON.parse(explained.stdout).sites;
  const hover = sites.find(s => s.token === 'hover:bg-brand');
  assert.equal(hover.owner.name, 'button');
  assert.ok(hover.declarations.some(d => d.prop === 'background-color' && d.value === 'var(--color-brand)' && d.when.some(c => c.kind === 'pseudo' && c.text === ':hover') && d.when.some(c => c.kind === 'media' && c.text.includes('hover: hover'))));
  assert.ok(sites.some(s => s.token === 'px-4'), 'enumerates same-file map');
  assert.ok(sites.some(s => s.token === 'bg-brand' && s.line === 18), 'keeps template static parts');
  assert.ok(sites.find(s => s.token === 'supports-[display:grid]:grid').declarations[0].when.some(c => c.kind === 'supports'));
  assert.ok(sites.find(s => s.token === '@sm:flex').declarations[0].when.some(c => c.kind === 'container'));
  assert.ok(sites.find(s => s.token === '[&_button]:text-white').declarations[0].when.some(c => c.kind === 'selector' && c.text.endsWith(' button')));
  assert.ok(sites.find(s => s.token === 'rounded-full').declarations.some(d => d.value === 'calc(infinity * 1px)'));
  assert.deepEqual(sites.find(s => s.token === 'folded').declarations.map(d => [d.prop, d.value]), [['padding', '12px']]);
  assert.equal(sites.find(s => s.token === 'literal-content').declarations.find(d => d.prop === 'content').value, '"var(--tw-local) /* text */ {;}"');
  assert.ok(sites.find(s => s.token === 'animate-spin').declarations.every(d => d.prop !== 'transform'));
  assert.ok(sites.some(s => s.token === 'text-white' && s.conditions.some(c => c.text === 'active')));
  assert.ok(sites.find(s => s.token === 'shadow-sm').notes.length, 'unfoldable cross-rule variables noted');
  const explainText = run(directory, cache, ['explain', 'src/App.tsx']).stdout;
  assert.match(explainText, /pseudo: :hover/);
  assert.doesNotMatch(explainText, /note:/);
  assert.match(run(directory, cache, ['explain', 'src/App.tsx', '--verbose']).stdout, /note: .*Kept --tw-/);
  assert.ok(report.notes.some(note => note.includes('Kept --tw-')), 'JSON keeps internal notes');
  const text = run(directory, cache).stdout;
  assert.doesNotMatch(text, /note:/);
  assert.match(run(directory, cache, ['--verbose']).stdout, /note: .*Kept --tw-/);
  assert.match(text, /src\/sizes.ts:1:/);
  assert.ok(!text.includes(`${directory}/src/`), 'text site paths relative to root');
  assert.match(run(directory, cache, ['--verbose']).stdout, /cache \d+ hits, 0 misses/);

  await writeFile(join(directory, 'src/theme.css'), '@theme { --color-brand: #2563eb; --color-brnad: red; }');
  const changed = JSON.parse(run(directory, cache, ['--json']).stdout);
  assert.ok(changed.timing.cacheMisses > 0, 'import graph change invalidates candidate cache');
  assert.ok(!changed.findings.some(f => f.declaration.value === 'bg-brnad'));
});

test('configuration rejects malformed markers and classHelpers', async t => {
  const { directory, cache } = await setup(t);
  for (const config of ['{ markers: "js-*" }', '{ classHelpers: [42] }']) {
    await writeFile(join(directory, 'plumber.config.ts'), `export default ${config};`);
    const result = spawnSync(process.execPath, [cli, '--root', directory, '--json'], { encoding: 'utf8', env: { ...process.env, PLUMB_CACHE_DIR: cache } });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /markers to an array|classHelpers to a non-empty string/);
  }
});

test('resolves project Tailwind, fallback file loaders, Node wrapper and one batched compile', async t => {
  const { directory, cache } = await setup(t);
  for (const folder of ['node_modules/tailwindcss', 'src']) await mkdir(join(directory, folder), { recursive: true });
  await writeFile(join(directory, 'plumber.config.ts'), 'export default { css: "src/styles.css", source: ["src/Own.tsx"] };');
  await writeFile(join(directory, 'src/Own.tsx'), 'import { STYLES } from "tailwindcss"; <div className={cn("bg-brand", "bg-brand", STYLES)}/>');
  await writeFile(join(directory, 'src/styles.css'), '@import "./theme.css"; @config "./config.mjs";');
  await writeFile(join(directory, 'src/theme.css'), '@theme { --color-brand: red; }');
  await writeFile(join(directory, 'src/config.mjs'), 'export default { project: true };');
  await writeFile(join(directory, 'node_modules/tailwindcss/package.json'), JSON.stringify({ name: 'tailwindcss', version: '4.99.0', type: 'module', exports: { '.': './index.mjs', './package.json': './package.json' } }));
  await writeFile(join(directory, 'node_modules/tailwindcss/index.mjs'), `
    export const STYLES = 'own-class';
    import { appendFileSync } from 'node:fs';
    import { join } from 'node:path';
    export async function compile() { return { build() { return ''; }, buildSourceMap() { return { mappings: [], sources: [] }; } }; }
    export async function __unstable__loadDesignSystem(css, options) {
      const sheet = await options.loadStylesheet('./theme.css', options.base);
      const config = await options.loadModule('./config.mjs', options.base);
      if (!sheet.content.includes('--color-brand') || !config.module.project) throw new Error('file loaders missing');
      return {
        parseCandidate(name) { return [{ kind: 'static', root: name }]; },
        candidatesToCss(candidates) {
          appendFileSync(join(options.base, 'compiles.jsonl'), JSON.stringify(candidates) + '\\n');
          return candidates.map(c => '.' + c + ' { color: project-fallback; }');
        },
        getClassList() { return []; }
      };
    }
  `);
  const first = run(directory, cache, ['--json']);
  assert.equal(first.status, 0);
  assert.equal(JSON.parse(first.stdout).tailwind.version, '4.99.0');
  assert.deepEqual(JSON.parse((await readFile(join(directory, 'src/compiles.jsonl'), 'utf8')).trim()), ['bg-brand', 'own-class']);
  const explained = JSON.parse(run(directory, cache, ['explain', 'src/Own.tsx', '--json']).stdout);
  assert.ok(explained.sites.every(s => s.declarations[0].value === 'project-fallback'));
  assert.equal((await readFile(join(directory, 'src/compiles.jsonl'), 'utf8')).trim().split('\n').length, 1, 'warm run never recompiles');

  await mkdir(join(directory, 'node_modules/@tailwindcss/node'), { recursive: true });
  await writeFile(join(directory, 'node_modules/@tailwindcss/node/package.json'), JSON.stringify({ name: '@tailwindcss/node', type: 'module', exports: './index.mjs' }));
  await writeFile(join(directory, 'node_modules/@tailwindcss/node/index.mjs'), `
    export async function compile() { return { build() { return ''; }, buildSourceMap() { return { mappings: [], sources: [] }; } }; }
    export async function __unstable__loadDesignSystem(css, { base }) {
      return { parseCandidate(name) { return [{ kind: 'static', root: name }]; }, candidatesToCss(candidates) { return candidates.map(c => '.' + c + ' { color: project-node-wrapper; }'); } };
    }
  `);
  await writeFile(join(directory, 'src/styles.css'), '@import "./theme.css"; @config "./config.mjs";\n');
  const wrapped = JSON.parse(run(directory, cache, ['explain', 'src/Own.tsx', '--json']).stdout);
  assert.ok(wrapped.sites.every(s => s.declarations[0].value === 'project-node-wrapper'));
});


test('suggestions prefer theme keys, preserve variants and suppress distant identities', async t => {
  const { directory, cache } = await setup(t);
  await writeFile(join(directory, 'plumber.config.ts'), 'export default { css: "src/styles.css", source: ["src/Suggestions.tsx"] };');
  await writeFile(join(directory, 'src/Suggestions.tsx'), '<div className="text-ink-dim text-ink2 text-ink3 text-white recipe-status-led-live group-data-checked:recipe-status-led-live mu-palette-eng palette-eng block-ai-composer block-settings rounded-gone"/>');
  await writeFile(join(directory, 'src/theme.css'), `
    @theme { --color-ink2: red; --color-ink3: blue; --radius-never-collected: 2px; }
    @utility recipe-status-lamp { color: red; }
    @utility palette-eng { color: blue; }
  `);
  const cold = run(directory, cache, ['--json']);
  assert.equal(cold.status, 1);
  const findings = new Map(JSON.parse(cold.stdout).findings.map(finding => [finding.declaration.value, finding.fix]));
  assert.match(findings.get('text-ink-dim'), /text-ink[23]/);
  assert.match(findings.get('recipe-status-led-live'), /Did you mean `recipe-status-lamp/);
  assert.match(findings.get('group-data-checked:recipe-status-led-live'), /Did you mean `group-data-checked:recipe-status-lamp/);
  assert.match(findings.get('mu-palette-eng'), /Did you mean `palette-eng/);
  assert.match(findings.get('rounded-gone'), /rounded-never-collected/, 'same utility prefix qualifies despite distant spelling; own uncollected theme key wins');
  for (const token of ['block-ai-composer', 'block-settings']) assert.doesNotMatch(findings.get(token), /Did you mean/, 'no suggestion when nothing is close');
  assert.deepEqual(JSON.parse(run(directory, cache, ['--json']).stdout).findings, JSON.parse(cold.stdout).findings);
  const source = await readFile(join(directory, 'src/Suggestions.tsx'), 'utf8');
  await writeFile(join(directory, 'src/Suggestions.tsx'), source.replace(' text-white', ''));
  const subset = JSON.parse(run(directory, cache, ['--json']).stdout);
  assert.equal(subset.timing.cacheMisses, 0, 'candidate subset reuses compiled CSS');
  assert.equal(subset.timing.phases.compile, 0, 'refreshing hint roots never recompiles cached candidates');
  assert.match(subset.findings.find(f => f.declaration.value === 'mu-palette-eng').fix, /Did you mean `palette-eng/);

  await writeFile(join(directory, 'src/theme.css'), (await readFile(join(directory, 'src/theme.css'), 'utf8')) + '\n@utility recipe-status-lamp-live { color: green; }');
  const withLive = JSON.parse(run(directory, cache, ['--json']).stdout).findings;
  assert.match(withLive.find(f => f.declaration.value === 'recipe-status-led-live').fix, /recipe-status-lamp-live/);
});

test('collector shortcuts keep earlier-file exports and escaped helper calls', async t => {
  const { directory, cache } = await setup(t);
  await writeFile(join(directory, 'plumber.config.ts'), 'export default { css: "src/styles.css", source: ["src/A.tsx", "src/Z.tsx"] };');
  await writeFile(join(directory, 'src/A.tsx'), 'export const STYLES = { brand: "bg-brand" } as const;');
  await writeFile(join(directory, 'src/Z.tsx'), String.raw`import { STYLES } from './A';
    export function Later() { return <div className={STYLES.brand}/>; }
    export function Escaped() { return \u0063n('escaped-dead'); }
    export function Pure() { return 42; }`);
  const result = run(directory, cache, ['explain', 'src/Z.tsx', '--json']);
  assert.equal(result.status, 0);
  const sites = JSON.parse(result.stdout).sites;
  assert.ok(sites.some(site => site.token === 'bg-brand'), 'literal export survives releasing the earlier file AST');
  assert.ok(sites.some(site => site.token === 'escaped-dead' && site.owner.name === 'Escaped'), 'escaped helper spelling disables function pruning');
});

test('warm collection keeps inline companion identity and revalidates imported constants and paths', async t => {
  const { directory, cache } = await setup(t);
  await mkdir(join(directory, 'external'), { recursive: true });
  await writeFile(join(directory, 'external/one.ts'), 'export const paint = { outline: "none", color: "red" }; export const classes = "bg-brnad";');
  await writeFile(join(directory, 'external/two.ts'), 'export const paint = { outline: "none", color: "blue" }; export const classes = "bg-brand";');
  await writeFile(join(directory, 'tsconfig.json'), JSON.stringify({ compilerOptions: { baseUrl: '.', paths: { '@paint': ['external/one.ts'] } } }));
  await writeFile(join(directory, 'plumber.config.ts'), 'export default { css: "src/styles.css", source: ["src/App.tsx", "src/styles.css"], habits: ["overscroll-contain"] };');
  await writeFile(join(directory, 'src/App.tsx'), 'import { paint, classes } from "@paint"; export const App = () => <><div className={classes} style={paint} /><div style={{ overflowY: "auto", overscrollBehaviorY: "contain" }} /></>;');
  const report = () => JSON.parse(run(directory, cache, ['--json']).stdout);
  const cold = report(), warm = report();
  assert.deepEqual(warm.findings, cold.findings);
  assert.deepEqual(warm.coverage, cold.coverage);
  assert.equal(warm.timing.phases.parse, 0);
  assert.equal(warm.timing.phases.inline, 0);
  assert.ok(!warm.findings.some(f => f.rule === 'habits/overscroll-contain'), 'inline companions survive cache hydration');
  await writeFile(join(directory, 'external/one.ts'), 'export const paint = { outline: "none", color: "green" }; export const classes = "new-dead-class";');
  const edited = report();
  assert.ok(edited.findings.some(f => f.rule === 'existence/dead-class' && f.declaration.value === 'new-dead-class'));
  assert.ok(edited.declarations.some(d => d.origin === 'inline' && d.value === 'green'));
  assert.deepEqual(report().findings, edited.findings);
  await writeFile(join(directory, 'tsconfig.json'), JSON.stringify({ compilerOptions: { baseUrl: '.', paths: { '@paint': ['external/two.ts'] } } }));
  const remapped = report();
  assert.ok(!remapped.findings.some(f => f.rule === 'existence/dead-class'));
  assert.ok(remapped.declarations.some(d => d.origin === 'inline' && d.value === 'blue'));
  assert.deepEqual(report().findings, remapped.findings);
  // A normal text check must never serialize the complete report. Execute the
  // real CLI with a guard around JSON.stringify, allowing small cache payloads.
  const guarded = spawnSync(process.execPath, ['--input-type=module', '-e', `const stringify=JSON.stringify; JSON.stringify=function(value,...args) { if(value?.schemaVersion===1 && value?.findings && value?.coverage) throw new Error('full report serialization in text mode'); return stringify.call(JSON,value,...args); }; process.argv=['node','--root',${JSON.stringify(directory)}]; await import(${JSON.stringify(new URL('../dist/cli.js', import.meta.url).href)});`], { encoding: 'utf8', env: { ...process.env, PLUMB_CACHE_DIR: cache } });
  assert.ifError(guarded.error);
  assert.equal(guarded.stderr, '');
  assert.ok([0, 1].includes(guarded.status));
  assert.match(guarded.stdout, /files .*tsx/);
});
