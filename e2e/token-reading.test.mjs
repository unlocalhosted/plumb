// @tier cli
// How Plumber reads a project's tokens when they aren't named the Tailwind way, through `plumber check`, `plumber
// decisions` and `plumber init` on a plain-CSS React project. Each test is a failure seen on 2026-11-14
// (docs/journey.md, entry 34): tokens Plumber didn't see, a token file it skipped, a type scale it misread, and
// tokens a config pulled into the wrong kind.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { fixture, json, run } from './helpers/layouts.mjs';

const cli = fileURLToPath(new URL('../dist/cli.js', import.meta.url));
const app = (tokens, styles, extra = {}) => ({
  'package.json': { name: 'plain-css-app', private: true, dependencies: { react: '19.0.0' } },
  'src/tokens.css': tokens,
  'src/card.css': `@import "./tokens.css";\n${styles}`,
  'src/Card.jsx': "import './card.css';\nexport function Card() { return <section className=\"card\"><h3>Pro</h3></section>; }\n",
  'src/main.jsx': "import { Card } from './Card.jsx';\nexport default function App() { return <Card />; }\n",
  ...extra,
});
const sites = (report, rule) => report.findings.filter(f => f.rule === rule);
const decided = async (project, ...args) => json(await run(project, ['decisions', '--json', ...args]));

test('tokens named without a Tailwind prefix are a scale: an off-scale padding gets the nearest of them', async (t) => {
  // before: "Your theme has no spacing tokens" and nothing was checked
  const project = await fixture(t, app(':root { --space-1: 4px; --space-2: 8px; --space-4: 16px; --space-6: 24px; }\n',
    '.card { padding: 18px; gap: var(--space-2); margin-bottom: var(--space-6); }\n'));
  const report = json(await run(project, ['--json']));
  assert.equal(sites(report, 'config/no-tokens').length, 0, 'spacing has tokens');
  const padding = sites(report, 'provenance/spacing').find(f => f.sites.some(s => s.text.includes('18px')));
  assert.ok(padding, 'the 18px padding is flagged');
  assert.match(padding.fix, /var\(--space-4\)/);
  assert.match(padding.fix, /var\(--space-6\)/);
});

test('a token file a script reads by path is the theme: its tokens are defined, and values are judged against them', async (t) => {
  // before: every token was "never defined" and every value set aside as "no tokens" (the site's tokens arrive this way)
  const project = await fixture(t, {
    'package.json': { name: 'script-tokens', private: true, dependencies: { react: '19.0.0' } },
    'theme/tokens.css': ':root { --pad-sm: 8px; --pad-md: 16px; --pad-lg: 24px; }\n',
    'src/theme.js': "import { readFile } from 'node:fs/promises';\nexport const tokens = () => readFile('theme/tokens.css', 'utf8');\n",
    'src/page.css': '.page { padding: var(--pad-md); gap: 18px; margin: var(--pad-lg); }\n',
    'src/main.jsx': "import './page.css';\nimport { tokens } from './theme.js';\nexport default function App() { void tokens; return <main className=\"page\" />; }\n",
  });
  const report = json(await run(project, ['--json']));
  assert.equal(sites(report, 'existence/dead-var').length, 0, 'no token is "never defined"');
  assert.equal(sites(report, 'config/no-tokens').length, 0);
  assert.ok(sites(report, 'provenance/spacing').some(f => f.sites.some(s => s.text.includes('18px'))), 'the 18px gap is judged against --pad-*');
});

test(':host token blocks are read, and a :host(...) selector is not a crash', async (t) => {
  // before: "Skipped tokens.css: selector.flatMap is not a function"
  const project = await fixture(t, app(':host { --space-1: 4px; --space-2: 8px; --space-3: 12px; }\n:host([data-scheme="dark"]) { --ink: #ffffff; }\n:host(:not([data-scheme="light"])) { --ink: #000000; }\n',
    '.card { padding: 10px; gap: var(--space-2); margin: var(--space-3); }\n'));
  const report = json(await run(project, ['--json']));
  assert.equal(sites(report, 'config/unreadable').length, 0, sites(report, 'config/unreadable').map(f => f.because).join('; '));
  assert.ok(sites(report, 'provenance/spacing').some(f => f.sites.some(s => s.text.includes('10px'))));
});

test('a whole text style counts by its parts: its size is on the scale, and the fix sets the whole style', async (t) => {
  // before: "No token is close to 16px" beside a 16px style
  const project = await fixture(t, app(':root { --style-body: 400 16px/24px system-ui, sans-serif; --style-title: 600 24px/32px system-ui, sans-serif; }\n',
    '.card { font-size: 16px; }\n.card h3 { font-size: 23px; }\n'));
  const report = json(await run(project, ['--json']));
  const type = sites(report, 'provenance/type');
  assert.ok(!type.some(f => /No token is close/.test(f.fix ?? '') && f.sites.some(s => s.text.includes('16px'))), 'no "no token close to 16px"');
  const off = type.find(f => f.sites.some(s => s.text.includes('23px')));
  assert.ok(off, '23px is off the scale');
  assert.match(off.fix, /font: var\(--style-title\)/);
  assert.match(off.fix, /600 24px\/32px/, 'a style is shown by its weight, size and line height');
  assert.doesNotMatch(off.fix, /system-ui, sans-serif.*system-ui/, 'not its list of faces');
});

test('a colour named --text-primary is read as a colour, and says why', async (t) => {
  // before: the Tailwind prefix made it a type token
  const project = await fixture(t, app(':root { --ink: #1d1b17; --text-primary: #1d1b17; --text-sm: 13px; }\n',
    '.card { color: var(--text-primary); font-size: var(--text-sm); }\n'));
  const tokens = await decided(project);
  const primary = tokens.find(d => d.name === '--text-primary');
  assert.equal(primary.family, 'color');
  assert.match(primary.reading, /value is a colour, though its name begins --text-/);
  assert.equal(tokens.find(d => d.name === '--text-sm').family, 'type');
});

test('plumber decisions says how each token was read', async (t) => {
  const project = await fixture(t, app(':root { --space-1: 4px; --space-2: 8px; --radius-md: 12px; }\n', '.card { gap: var(--space-1); border-radius: var(--radius-md); }\n'));
  const text = (await run(project, ['decisions'])).stdout;
  assert.match(text, /read as spacing: its name says spacing/);
  assert.match(text, /read as radius: its name begins --radius-/);
});

test('a whole-file source gives a kind only the tokens read as that kind', async (t) => {
  // before: with `color: { from: ['css:src/tokens.css'] }`, --space-1 counted as a colour (and as type)
  const project = await fixture(t, app(':root { --space-1: 4px; --space-2: 8px; --ink: #1d1b17; --pink: #f24a9f; --text-primary: #1d1b17; --text-sm: 13px; }\n',
    '.card { gap: var(--space-1); color: var(--text-primary); font-size: var(--text-sm); }\n', {
      'plumber.config.mjs': "export default { decisions: { color: { from: ['css:src/tokens.css'] }, type: { from: ['css:src/tokens.css'] }, spacing: { from: ['css:src/tokens.css'] } } };\n",
    }));
  const tokens = await decided(project), of = family => tokens.filter(d => d.family === family).map(d => d.name).sort();
  assert.deepEqual(of('color'), ['--ink', '--pink', '--text-primary']);
  assert.deepEqual(of('spacing'), ['--space-1', '--space-2']);
  assert.deepEqual(of('type'), ['--text-sm']);
});

test('plumber init writes one line per scale, with how it was read beside it', async (t) => {
  const project = await fixture(t, app(':root { --space-1: 4px; --space-2: 8px; --space-3: 12px; --radius-sm: 6px; --radius-md: 12px; }\n',
    '.card { padding: var(--space-3); gap: var(--space-1); border-radius: var(--radius-md); }\n'));
  const done = spawnSync(process.execPath, [cli, 'init', '--yes'], { cwd: project.root, encoding: 'utf8', timeout: 60000, env: { ...process.env, NO_COLOR: '1', PLUMBER_CACHE_DIR: project.cache } });
  assert.equal(done.status, 0, done.stderr || done.stdout);
  const config = await readFile(join(project.root, 'plumber.config.ts'), 'utf8');
  assert.match(config, /"css:src\/tokens\.css#--space-\*" \/\/ 3 tokens; its name says spacing; used in /);
  assert.match(config, /"css:src\/tokens\.css#--radius-\*" \/\/ 2 tokens; its name begins --radius-/);
});
