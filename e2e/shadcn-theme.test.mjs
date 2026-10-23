import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { ResolverFactory } from 'oxc-resolver';

const root = fileURLToPath(new URL('../', import.meta.url));
const fixture = join(root, 'fixtures/shadcn-theme');
function run(directory, args = []) {
  const result = spawnSync(process.execPath, [join(root, 'dist/cli.js'), '--root', directory, '--json', ...args], { encoding: 'utf8', timeout: 15000 });
  assert.ifError(result.error); assert.equal(result.stderr, '');
  assert.ok([0, 1].includes(result.status), result.stdout);
  return JSON.parse(result.stdout);
}
async function copy(t) {
  const directory = await mkdtemp(join(root, 'fixtures/.shadcn-theme-e2e-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await cp(fixture, directory, { recursive: true, filter: path => !path.includes('node_modules') });
  return directory;
}
function assertNoCircularFixes(report, css) {
  const edges = new Map();
  for (const [, name, value] of css.matchAll(/(--[\w-]+)\s*:\s*([^;}]+)/g)) {
    const refs = edges.get(name) ?? new Set();
    for (const [, ref] of value.matchAll(/var\(\s*(--[\w-]+)/g)) refs.add(ref);
    edges.set(name, refs);
  }
  for (const decision of report.decisions) {
    const refs = edges.get(decision.name) ?? new Set();
    for (const [, ref] of decision.value.matchAll(/var\(\s*(--[\w-]+)/g)) refs.add(ref);
    edges.set(decision.name, refs);
  }
  function reaches(name, target, seen = new Set()) {
    if (name === target) return true;
    if (seen.has(name)) return false;
    seen.add(name);
    return [...edges.get(name) ?? []].some(ref => reaches(ref, target, seen));
  }
  for (const finding of report.findings) {
    const declared = finding.declaration.prop;
    if (!declared.startsWith('--')) continue;
    const suggestions = [finding.fix, finding.action ?? '', ...finding.decisions.map(d => d.use?.css ?? ''), ...(finding.edits ?? []).map(e => e.text)];
    for (const suggestion of suggestions) for (const [, name] of suggestion.matchAll(/var\(\s*(--[\w-]+)/g)) {
      assert.ok(!reaches(name, declared), `${declared}: circular fix ${suggestion}`);
    }
  }
}

test('shadcn theme sources are definitions; utility coverage and deliberate drift survive', async () => {
  const report = run(fixture), css = await readFile(join(fixture, 'src/styles.css'), 'utf8');
  const backing = new Set(['--background', '--foreground', '--card', '--card-foreground', '--popover', '--popover-foreground', '--primary', '--primary-foreground', '--secondary', '--secondary-foreground', '--muted', '--muted-foreground', '--accent', '--accent-foreground', '--border', '--input', '--ring', '--destructive', '--success', '--warning', '--faint', '--grid', '--tint-1', '--tint-2', '--tint-3', '--tint-4', '--radius', '--source-alias', '--source-ink', '--scope-ink', '--source-time']);
  const lines = new Set(css.split('\n').flatMap((line, index) => [...backing].some(name => line.includes(`${name}:`)) ? [index + 1] : []));
  assert.ok(!report.findings.some(f => f.sites.some(s => s.file === join(fixture, 'src/styles.css') && lines.has(s.line))), 'no finding on backing definition lines');
  assertNoCircularFixes(report, css);
  for (const text of ['bg-primary', 'text-muted-foreground', '@apply bg-primary text-muted-foreground;']) {
    assert.ok(!report.findings.some(f => f.family === 'color' && f.sites.some(s => s.text === text)), text);
  }
  assert.ok(report.coverage.color.fromDecisions >= 4);
  assert.equal(report.coverage.color.findings, 2, 'only raw JSX and orphan recipe colour fail');
  assert.ok(report.findings.some(f => f.rule === 'provenance/color' && f.sites.some(s => s.text === "color: '#ff0000'")));
  assert.ok(report.findings.some(f => f.rule === 'provenance/color' && f.variable?.name === '--orphan-ink'));
  assert.ok(report.findings.some(f => f.rule === 'provenance/arbitrary' && f.family === 'spacing' && f.sites.some(s => s.text === 'p-[13px]')));
  assert.ok(report.findings.some(f => f.rule === 'provenance/motion' && f.sites.some(s => s.text === 'transition: opacity 333ms')));
  assert.equal(report.decisions.find(d => d.name === '--color-primary').resolved, '#2c50e8');
  assert.ok(report.decisions.find(d => d.name === '--color-primary').resolvedModes.dark);
  assert.equal(report.decisions.find(d => d.name === '--color-source').resolved, '#2468ac');
  assert.equal(report.decisions.find(d => d.name === '--color-source').resolvedModes.dark, '#abcdef');
  for (const name of ['--color-scoped', '--duration-source']) {
    const decision = report.decisions.find(d => d.name === name);
    assert.ok(decision, name); assert.equal(decision.resolved, undefined, name);
  }
});

test('direct backing uses across scopes count as decisions; transitive mentions do not claim uses', async t => {
  const directory = await copy(t);
  const css = await readFile(join(directory, 'src/styles.css'), 'utf8');
  await writeFile(join(directory, 'src/styles.css'), css + `
    :root { --static-ink: #223344; --static-time: 180ms; }
    @theme inline { --color-static: var(--static-ink); --duration-static: var(--static-time); }
    .backing-uses {
      color: var(--scope-ink);
      border-color: var(--source-alias);
      background-color: var(--source-ink);
      transition-duration: var(--source-time);
    }
    .static-backing-uses { color: var(--static-ink); transition: opacity var(--static-time); }
  `);
  const before = run(fixture), report = run(directory);
  const backingFindings = report.findings.filter(f => ['.backing-uses', '.static-backing-uses'].includes(f.declaration.owner.name));
  assert.equal(backingFindings.length, 1, 'only the transitive backing use lacks a direct decision alias');
  assert.equal(backingFindings[0].declaration.prop, 'background-color');
  assert.equal(backingFindings[0].declaration.value, 'var(--source-ink)');
  assert.equal(report.coverage.color.fromDecisions, before.coverage.color.fromDecisions + 3);
  assert.equal(report.coverage.motion.fromDecisions, before.coverage.motion.fromDecisions + 2);
  assert.equal(report.coverage.color.findings, before.coverage.color.findings + 1);
  const sourceNames = ['--scope-ink', '--source-alias', '--source-ink', '--source-time', '--static-ink', '--static-time'];
  assert.ok(!report.findings.some(f => f.sites.some(s => sourceNames.some(name => s.text.startsWith(`${name}:`)))));
  assertNoCircularFixes(report, css);
});

test('transition utilities use inline and plain project defaults without motion findings', async t => {
  const directory = await copy(t);
  const css = await readFile(join(directory, 'src/styles.css'), 'utf8');
  await writeFile(join(directory, 'src/styles.css'), css.replaceAll('@theme inline', '@theme') + `
    .literal-match { transition-duration: 140ms; }
  `);
  for (const report of [run(fixture), run(directory)]) {
    for (const text of ['transition-all', 'transition-opacity']) {
      assert.ok(!report.findings.some(f => f.family === 'motion' && f.sites.some(s => s.text === text)), text);
    }
    for (const name of ['--default-transition-duration', '--default-transition-timing-function']) {
      const decision = report.decisions.find(d => d.name === name);
      assert.equal(decision?.origin, 'project', name);
      assert.ok(decision.why, name);
    }
    assert.ok(report.coverage.motion.fromDecisions >= 4, 'both longhands of both utilities count as decisions');
  }
  assert.ok(run(directory, ['--verbose']).findings.some(f => f.rule === 'provenance/motion/by-value' && f.declaration.owner.name === '.literal-match'));
});

test('framework animation mentions cannot claim project transition defaults', async t => {
  // Resolve real installed stylesheets. Never fabricate a package in node_modules.
  let imports;
  const resolver = new ResolverFactory({ extensions: ['.css'], mainFields: ['style'], conditionNames: ['style'] });
  for (const base of [root, join(root, 'site')]) {
    const paths = ['tw-animate-css', 'shadcn/tailwind.css'].map(id => resolver.sync(base, id).path);
    if (paths.every(Boolean)) { imports = paths; break; }
  }
  if (!imports) { t.skip('real tw-animate-css and shadcn stylesheets are not installed'); return; }
  const directory = await copy(t);
  const css = await readFile(join(directory, 'src/styles.css'), 'utf8');
  await writeFile(join(directory, 'src/styles.css'), imports.map(file => `@import ${JSON.stringify(file)};`).join('\n') + '\n' + css);
  const before = run(fixture), report = run(directory);
  const animation = report.decisions.find(d => d.name === '--animate-accordion-down');
  assert.equal(animation?.origin, 'framework');
  assert.ok(animation.value.includes('var(--tw-duration'), 'real animation has nested duration reference');
  for (const text of ['transition-all', 'transition-opacity']) {
    assert.ok(!report.findings.some(f => f.family === 'motion' && f.sites.some(s => s.text === text)), text);
  }
  assert.equal(report.coverage.motion.fromDecisions, before.coverage.motion.fromDecisions);
  assert.ok(report.findings.some(f => f.rule === 'provenance/motion' && f.sites.some(s => s.text === 'transition: opacity 333ms')));
  await writeFile(join(directory, 'src/styles.css'), await readFile(join(directory, 'src/styles.css'), 'utf8') + `
    .animation-mention { transition-duration: var(--tw-duration, 333ms); }
  `);
  const literal = run(directory).findings.find(f => f.declaration.owner.name === '.animation-mention');
  assert.equal(literal?.rule, 'provenance/motion', 'mentioning --tw-duration in a framework animation does not own an unrelated use');
});

test('fix generator rejects self-reference and transitive cycles outside theme definitions', async t => {
  const directory = await copy(t);
  await writeFile(join(directory, 'src/styles.css'), `@import "tailwindcss";
    :root {
      --recipe-direct: #ff0000;
      --recipe-indirect: #0000ff;
      --bridge-one: var(--bridge-two);
      --bridge-two: var(--recipe-indirect);
    }
    .recipes { color: var(--recipe-direct); border-color: var(--recipe-indirect); }
  `);
  await writeFile(join(directory, 'src/App.jsx'), `import './styles.css';`);
  await writeFile(join(directory, 'src/Motion.jsx'), '');
  await writeFile(join(directory, 'plumber.config.ts'), `export default { decisions: { color: {
    from: () => [
      { family: 'color', name: '--color-direct', value: 'var(--recipe-direct)', refs: ['var(--color-direct)'], origin: 'project', tier: 'primitive', why: 'direct', source: { file: 'src/styles.css', line: 3 } },
      { family: 'color', name: '--color-indirect', value: 'var(--bridge-one)', refs: ['var(--color-indirect)'], origin: 'project', tier: 'primitive', why: 'indirect', source: { file: 'src/styles.css', line: 4 } }
    ]
  } } };`);
  const report = run(directory, ['--verbose']), css = await readFile(join(directory, 'src/styles.css'), 'utf8');
  for (const name of ['--recipe-direct', '--recipe-indirect']) {
    const finding = report.findings.find(f => f.variable?.name === name);
    assert.ok(finding, name); assert.equal(finding.rule, 'provenance/color/by-value');
    assert.deepEqual(finding.decisions, []); assert.deepEqual(finding.edits, []);
    assert.ok(!finding.fix.includes('var('), finding.fix);
  }
  assertNoCircularFixes(report, css);
});

test('project type keys without intent aliases pass and count as decisions, including framework font wiring', async t => {
  const directory = await copy(t);
  const app = join(directory, 'src/App.jsx');
  await writeFile(app, (await readFile(app, 'utf8')).replace('text-xs text-sm', 'text-xs text-base text-sm'));
  const css = join(directory, 'src/styles.css');
  await writeFile(css, (await readFile(css, 'utf8')) + '\n@theme inline { --font-serif: var(--font-mono); --font-body: var(--font-mono); --default-font-family: var(--font-mono); }\n');
  for (const report of [run(fixture), run(directory)]) {
    for (const text of ['text-xs', 'text-sm', 'text-base', 'text-lg', 'text-2xl', 'text-5xl', 'font-mono', 'font-serif', 'font-medium']) {
      assert.ok(!report.findings.some(f => f.rule.startsWith('provenance/type/') && f.sites.some(s => s.text === text)), text);
    }
    assert.equal(report.coverage.type.findings, 0);
    assert.equal(report.coverage.type.fromDecisions, report.coverage.type.total, 'all compiled type declarations use decisions');
    assert.ok(report.coverage.type.total >= 19, 'font faces, weight, sizes and companion properties are judged');
    assert.ok(report.findings.some(f => f.rule === 'provenance/color'));
    assert.ok(report.findings.some(f => f.rule === 'provenance/arbitrary' && f.family === 'spacing'));
    assert.ok(report.findings.some(f => f.rule === 'provenance/motion' && f.sites.some(s => s.text === 'transition: opacity 333ms')), 'deliberate motion drift survives');
  }
});

test('inferred callers restrict only a primitive with an intent alias and name its utility, including warm changes', async t => {
  const directory = await copy(t), file = join(directory, 'src/styles.css');
  const css = await readFile(file, 'utf8');
  const before = run(directory);
  await writeFile(file, css + '\n@theme inline { --text-caption: var(--text-xs); }\n');
  const report = run(directory);
  const tier = report.findings.find(f => f.rule === 'provenance/type/tier' && f.sites.some(s => s.text === 'text-xs'));
  assert.ok(tier);
  assert.ok(tier.decisions.some(d => d.name === '--text-caption' && d.use.class === 'text-caption'));
  assert.match(tier.fix, /--text-caption/);
  for (const text of ['text-sm', 'text-lg', 'text-2xl', 'text-5xl', 'font-mono', 'font-serif', 'font-medium']) {
    assert.ok(!report.findings.some(f => f.rule.startsWith('provenance/type/') && f.sites.some(s => s.text === text)), text);
  }
  assert.equal(report.coverage.type.findings, 1, 'only text-xs font-size needs an intent alias');
  assert.equal(report.coverage.type.fromDecisions, before.coverage.type.fromDecisions - 1);
  await writeFile(file, css);
  assert.equal(run(directory).coverage.type.findings, 0, 'removing alias restores inferred primitive callers');
});

test('explicit semantic callers stay strict; generated docs describe inferred and explicit caller policies', async t => {
  const directory = await copy(t), file = join(directory, 'src/styles.css');
  await writeFile(file, (await readFile(file, 'utf8')) + '\n@theme inline { --text-caption: var(--text-xs); }\n');
  function docs() {
    const result = spawnSync(process.execPath, [join(root, 'dist/cli.js'), 'agent-docs', '--root', directory], { encoding: 'utf8', timeout: 15000 });
    assert.ifError(result.error); assert.equal(result.status, 0, result.stderr);
    return readFile(join(directory, 'PLUMBER.md'), 'utf8');
  }
  run(directory);
  const records = run(directory, ['decisions', '--family', 'type']);
  assert.equal(records.find(d => d.name === '--font-heading').tier, 'semantic', 'wiring keeps its recorded tier');
  assert.equal(records.find(d => d.name === '--font-serif').tier, 'primitive');
  const inferred = await docs();
  assert.match(inferred, /Caller tiers: primitive, semantic; primitives with semantic aliases require those aliases/);
  assert.match(inferred, /--text-xs: use --text-caption/);
  assert.doesNotMatch(inferred, /--font-serif: use/);
  await writeFile(join(directory, 'plumber.config.ts'), "export default { decisions: { type: { callers: ['semantic'] } } };\n");
  const report = run(directory);
  for (const text of ['text-xs', 'text-sm', 'text-lg', 'text-2xl', 'text-5xl', 'font-mono', 'font-serif', 'font-medium']) {
    assert.ok(report.findings.some(f => f.rule === 'provenance/type/tier' && f.sites.some(s => s.text === text)), text);
  }
  const explicit = await docs();
  assert.match(explicit, /## type\n\nIdentity: value\. Caller tiers: semantic\./);
  assert.doesNotMatch(explicit, /--text-xs: use --text-caption/);
});

test('root motion values are project decisions; definitions pass while literal durations and delays fail', async t => {
  const directory = await copy(t);
  await writeFile(join(directory, 'src/Motion.jsx'), `export function Motion() {
    return <div style={{ transition: 'opacity var(--dur-move) var(--ease-out) 400ms' }} />;
  }`);
  for (const [base, report] of [[fixture, run(fixture)], [directory, run(directory)]]) {
    const css = await readFile(join(base, 'src/styles.css'), 'utf8');
    const lines = new Set(css.split('\n').flatMap((line, index) => /--(?:dur-[\w-]+|stagger)\s*:/.test(line) ? [index + 1] : []));
    assert.ok(!report.findings.some(f => f.family === 'motion' && f.rule.startsWith('provenance/') && f.sites.some(s => s.file === join(base, 'src/styles.css') && lines.has(s.line))), 'motion definitions are not uses');
    const decision = report.decisions.find(d => d.name === '--dur-explode');
    assert.ok(decision); assert.equal(decision.family, 'motion'); assert.equal(decision.origin, 'project');
    assert.equal(decision.tier, 'primitive');
    assert.equal(decision.value, '620ms');
    assert.equal(decision.why, 'a figure comes apart or back together');
    assert.equal(decision.resolved, undefined, 'reduced-motion override is unresolved');
    assert.equal(report.decisions.find(d => d.name === '--dur-quick').resolved, '140ms');
    assert.ok(!report.decisions.some(d => d.name === '--source-time'), 'theme backing identity stays unchanged');
    assert.ok(report.findings.some(f => f.rule === 'provenance/motion' && f.sites.some(s => s.text === 'transition: opacity 333ms')));
    assert.equal(report.coverage.color.findings, 2); assert.equal(report.coverage.type.findings, 0);
  }
  const report = run(directory);
  const delay = report.findings.find(f => f.rule === 'provenance/motion' && f.sites.some(s => s.text.includes('400ms')));
  assert.ok(delay); assert.match(delay.title, /400ms/);
  assert.ok(!report.findings.some(f => f.family === 'motion' && /240ms|620ms/.test(f.title)), 'references pass even when unresolved');
});

test('motion inference shares theme scopes across entry imports and keeps source and value boundaries', async t => {
  const directory = await copy(t), cssFile = join(directory, 'src/styles.css');
  const scopes = [':root', '.dark', '.custom-theme', '[data-theme="night"]', ':root[data-theme="night"]', 'html.dark',
    '@media (prefers-color-scheme: dark) { :root', '@supports (display: grid) { .supported-theme', '@layer tokens { :root'];
  const names = scopes.map((_, i) => `--scope-motion-${i}`);
  await writeFile(join(directory, 'src/motion-tokens.css'), scopes.map((scope, i) =>
    `${scope} { ${names[i]}: ${210 + i}ms; /* scoped motion ${i} */ }${scope.startsWith('@') ? ' }' : ''}`).join('\n') + `
    :root {
      /* why: choose the curve deliberately tier: semantic */
      --curve-picked: cubic-bezier(.2, .8, .2, 1); /* lower priority reason */
      --curve-linear: linear(0, .4 30%, 1); /* progress follows the drawn path */
      --curve-steps: steps(4, end);
      --curve-keyword: step-start;
      --motion-no-why: .25s;
      --motion-list: 321ms, 654ms;
      --motion-recipe: opacity 370ms ease;
      --orphan-colour: #ff0000;
    }
    .imported-motion-uses {
      transition-duration: ${names.map(name => `var(${name})`).join(', ')};
      transition-timing-function: var(--curve-picked), var(--curve-linear), var(--curve-steps), var(--curve-keyword);
      animation-duration: var(--motion-no-why);
    }
    .recipes-still-judged { transition: var(--motion-recipe); color: var(--orphan-colour); }
    @media (prefers-reduced-motion: reduce) { :root { --scope-motion-0: 0ms; } }
  `);
  await writeFile(cssFile, '@import "./motion-tokens.css";\n' + await readFile(cssFile, 'utf8'));
  await writeFile(join(directory, 'src/unrelated.css'), ':root { --outside-motion: 456ms; }\n.outside-use { transition-duration: var(--outside-motion); }');
  const report = run(directory);
  for (const [i, name] of names.entries()) {
    const decision = report.decisions.find(d => d.name === name);
    assert.ok(decision, name); assert.equal(decision.origin, 'project'); assert.equal(decision.family, 'motion');
    assert.equal(decision.why, `scoped motion ${i}`);
    assert.equal(decision.resolved, i === 0 || i === 6 || i === 7 ? undefined : `${210 + i}ms`);
  }
  assert.equal(report.decisions.find(d => d.name === '--curve-picked').why, 'choose the curve deliberately');
  assert.equal(report.decisions.find(d => d.name === '--curve-picked').tier, 'semantic');
  for (const name of ['--curve-linear', '--curve-steps', '--curve-keyword', '--motion-no-why']) {
    assert.ok(report.decisions.some(d => d.name === name && d.family === 'motion'), name);
  }
  assert.equal(report.decisions.find(d => d.name === '--motion-no-why').why, '');
  for (const name of ['--outside-motion', '--motion-list', '--motion-recipe', '--orphan-colour']) {
    assert.ok(!report.decisions.some(d => d.name === name), name);
  }
  assert.ok(!report.findings.some(f => f.family === 'motion' && f.sites.some(s => /var\(--(?:scope-motion|curve-|motion-no-why)/.test(s.text))), 'scoped and imported references pass');
  assert.ok(report.findings.some(f => f.family === 'motion' && f.variable?.name === '--motion-recipe'));
  assert.ok(report.findings.some(f => f.family === 'motion' && f.variable?.name === '--outside-motion'));
  assert.ok(report.findings.some(f => f.rule === 'provenance/color' && f.variable?.name === '--orphan-colour'));
});

test('configured motion sources and caller tiers still control inferred root values', async t => {
  const directory = await copy(t), config = join(directory, 'plumber.config.ts');
  await writeFile(config, "export default { decisions: { motion: { from: 'theme:*' } } };\n");
  const excluded = run(directory);
  assert.ok(!excluded.decisions.some(d => d.name === '--dur-explode'));
  assert.ok(excluded.findings.some(f => f.family === 'motion' && f.variable?.name === '--dur-explode'));
  await writeFile(config, "export default { decisions: { motion: { from: 'css:src/styles.css#--dur-*', callers: ['semantic'] } } };\n");
  const strict = run(directory);
  assert.ok(strict.decisions.some(d => d.name === '--dur-explode' && d.family === 'motion'));
  assert.ok(strict.findings.some(f => f.rule === 'provenance/motion/tier' && f.sites.some(s => s.text.includes('var(--dur-explode)'))));
});

test("a component's own timing variable is not a motion decision; a theme override of a root value is", async t => {
  const directory = await copy(t);
  const css = join(directory, 'src/styles.css');
  await writeFile(css, (await readFile(css, 'utf8')) + `
.card { --card-speed: 333ms; transition-duration: var(--card-speed); }
:root { --page-speed: 180ms; }
.dark { --page-speed: 240ms; }
`);
  const report = run(directory);
  assert.ok(!report.decisions.some(d => d.name === '--card-speed'), 'a class-local variable is not a decision');
  assert.ok(report.findings.some(f => f.rule === 'provenance/motion' && f.sites.some(s => s.text === '--card-speed: 333ms')), 'its literal is judged');
  const page = report.decisions.find(d => d.name === '--page-speed');
  assert.ok(page); assert.equal(page.family, 'motion'); assert.equal(page.origin, 'project');
});
