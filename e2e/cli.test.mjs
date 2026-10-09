import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const cli = join(root, 'dist/cli.js');
const metadata = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const schema = JSON.parse(await readFile(join(root, 'schema/report.schema.json'), 'utf8'));
const fixture = name => join(root, 'fixtures', name);
const stylesheetPackage = {
  'node_modules/tailwindcss/package.json': '{"name":"tailwindcss","type":"module","version":"4.1.99","style":"index.css","exports":{".":{"style":"./index.css","default":"./index.js"},"./theme":"./theme.css","./package.json":"./package.json"}}',
  'node_modules/tailwindcss/index.js': 'export async function __unstable__loadDesignSystem() { return { candidatesToCss: values => values.map(() => null), theme: { entries: () => [] } }; }',
  'node_modules/tailwindcss/index.css': ':root { --test: 1px; }',
  'node_modules/tailwindcss/theme.css': ':root { --test: 1px; }',
};

function run(args = [], cwd = root) {
  const result = spawnSync(process.execPath, [cli, ...args], { cwd, encoding: 'utf8', timeout: 10_000 });
  assert.ifError(result.error);
  assert.equal(result.signal, null, result.stderr);
  return result;
}

function json(result) {
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  return JSON.parse(result.stdout);
}

function usage(result, pattern) {
  assert.equal(result.status, 2);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, pattern);
  assert.equal(result.stderr.trim().split('\n').length, 1, 'usage error must be one line');
}

// Validate emitted reports using the keywords used by our schema, without
// adding a validator dependency. This is not a general JSON Schema engine.
function matchesSchema(value, node = schema, path = '$') {
  if (node.$ref) {
    assert.match(node.$ref, /^#\/\$defs\//);
    return matchesSchema(value, schema.$defs[node.$ref.slice('#/$defs/'.length)], path);
  }
  if ('const' in node) assert.deepEqual(value, node.const, path);
  if (node.enum) assert.ok(node.enum.includes(value), path);
  const type = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
  if (node.type) {
    const types = Array.isArray(node.type) ? node.type : [node.type];
    assert.ok(types.includes(type) || (types.includes('integer') && Number.isInteger(value)), `${path}: ${type}`);
  }
  if (typeof value === 'number') {
    assert.ok(Number.isFinite(value), path);
    if (node.minimum !== undefined) assert.ok(value >= node.minimum, path);
  }
  if (type === 'array' && node.items) {
    value.forEach((item, index) => matchesSchema(item, node.items, `${path}[${index}]`));
  }
  if (type === 'object') {
    for (const key of node.required ?? []) assert.ok(Object.hasOwn(value, key), `${path}.${key} required`);
    for (const [key, item] of Object.entries(value)) {
      if (node.properties?.[key]) matchesSchema(item, node.properties[key], `${path}.${key}`);
      else if (Object.keys(node.patternProperties ?? {}).some(pattern => new RegExp(pattern).test(key))) {
        for (const [pattern, child] of Object.entries(node.patternProperties)) if (new RegExp(pattern).test(key)) matchesSchema(item, child, `${path}.${key}`);
      } else if (node.additionalProperties === false) assert.fail(`${path}.${key}: unexpected property`);
      else if (typeof node.additionalProperties === 'object') matchesSchema(item, node.additionalProperties, `${path}.${key}`);
    }
  }
}

async function project(t, files) {
  const directory = await mkdtemp(join(tmpdir(), 'plumb-e2e-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  for (const [path, content] of Object.entries(files)) {
    const absolute = join(directory, path);
    await mkdir(dirname(absolute), { recursive: true });
    await writeFile(absolute, content);
  }
  return directory;
}

test('tailwind-min emits the schema with no failing findings', () => {
  const report = json(run(['--root', fixture('tailwind-min'), '--json']));
  matchesSchema(report);
  assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
  assert.equal(report.schemaVersion, 1);
  assert.deepEqual(report.tool, { name: 'plumb', version: metadata.version });
  assert.equal(report.root, fixture('tailwind-min'));
  assert.deepEqual(report.config, { path: join(fixture('tailwind-min'), 'plumb.config.ts'), inferred: false });
  assert.ok(report.tailwind.entry.endsWith('src/styles.css'));
  assert.deepEqual(report.files, { tsx: 3, jsx: 0, css: 1, other: 0 });
  assert.deepEqual(report.findings.filter(f => !f.rule.startsWith('dead/')), []);
  assert.deepEqual(report.coverage.existence, { total: 10, dead: 0, deadVars: 0 });
  assert.ok(report.coverage.declarations.class > 0);
  assert.ok(report.coverage.stylesheets.entry === 1);
  assert.ok(report.timing.totalMs >= report.timing.phases.discover);
});

test('tailwind-min detects the version resolved from the entry directory', t => {
  const require = createRequire(join(fixture('tailwind-min'), 'src/package.json'));
  let path;
  try {
    path = require.resolve('tailwindcss/package.json');
  } catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND') throw error;
    t.skip('tailwindcss is not installed yet; install the declared devDependency to enable the version assertion');
    return;
  }
  assert.equal(json(run(['--json', '--root', fixture('tailwind-min')])).tailwind.version, require(path).version);
});

test('plain-css is valid without a Tailwind entry', () => {
  const report = json(run(['check', '--json', '--root', fixture('plain-css')]));
  matchesSchema(report);
  assert.deepEqual(report.tailwind, { entry: null, version: null });
  assert.deepEqual(report.files, { tsx: 2, jsx: 0, css: 1, other: 0 });
  assert.deepEqual(report.findings.filter(f => !f.rule.startsWith('dead/')), []);
});

test('ambiguous entries name both files and the config fix', () => {
  const result = run(['--json', '--root', fixture('two-entries')]);
  usage(result, /set css in plumb\.config\.ts/);
  assert.match(result.stderr, /src\/first\.css/);
  assert.match(result.stderr, /src\/second\.css/);
});

test('unknown config key names the key and all allowed keys', () => {
  const result = run(['--json', '--root', fixture('bad-config')]);
  usage(result, /unknown key "config\.surprise"/);
  assert.match(result.stderr, /allowed keys: css, source, decisions, components, habits, imitation/);
});

test('--version prints the package version without discovering a project', () => {
  const result = run(['--version', '--root', fixture('bad-config')]);
  assert.equal(result.status, 0);
  assert.equal(result.stdout, `${metadata.version}\n`);
  assert.equal(result.stderr, '');
});

test('text mode prints header, counts, timing and layer status', () => {
  const result = run(['--root', fixture('tailwind-min')]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.ok(result.stdout.startsWith(`plumb ${metadata.version}  ${fixture('tailwind-min')}  tailwind `));
  assert.match(result.stdout, /theme .*src\/styles\.css/);
  assert.match(result.stdout, /files 3 tsx, 0 jsx, 1 css, 0 other\s+\d+\.\dms/);
  assert.match(result.stdout, /no findings/);
});

test('default cwd, relative root and both commands use the same harness', () => {
  const direct = json(run(['--json'], fixture('plain-css')));
  const explicit = json(run(['check', '--json', '--root', 'fixtures/plain-css']));
  const { timing: ignoredA, moduleGraph: graphA, ...a } = direct;
  const { timing: ignoredB, moduleGraph: graphB, ...b } = explicit;
  assert.deepEqual(a, b);
  assert.deepEqual([graphA.modules, graphA.followed, graphA.cssFiles], [graphB.modules, graphB.followed, graphB.cssFiles]);
});

test('--help describes supported commands, flags and exits', () => {
  const result = run(['--help', '--root', fixture('bad-config')]);
  assert.equal(result.status, 0);
  assert.equal(result.stderr, '');
  for (const text of ['plumb [check]', '--json', '--verbose', '--root', '--config', '--version', '--help', 'Exit codes:']) {
    assert.ok(result.stdout.includes(text), text);
  }
});

test('invalid CLI usage gives one actionable error', async t => {
  for (const args of [['wat'], ['check', 'check'], ['--unknown'], ['--root'], ['--config'], ['--root', ''], ['--config', '']]) {
    await t.test(args.join(' ') || 'empty', () => usage(run(args), /help|Provide/));
  }
  usage(run(['--root', '/plumb-this-directory-does-not-exist']), /Set --root to an existing project directory/);
  usage(run(['--root', 'package.json']), /Set --root/);
  usage(run(['--config', 'missing.ts']), /Fix or create config/);
});

test('all supported config extensions load, with deterministic precedence', async t => {
  for (const extension of ['ts', 'mts', 'mjs', 'js']) {
    await t.test(extension, async t => {
      const directory = await project(t, {
        'package.json': '{"type":"module"}',
        [`plumb.config.${extension}`]: `export default ${extension === 'ts' || extension === 'mts' ? '({ source: [] } satisfies { source: string[] })' : '{ source: [] }'};`,
      });
      const report = json(run(['--root', directory, '--json']));
      assert.deepEqual(report.config, { path: join(directory, `plumb.config.${extension}`), inferred: false });
      assert.deepEqual(report.files, { tsx: 0, jsx: 0, css: 0, other: 0 });
    });
  }
  const directory = await project(t, {
    'plumb.config.ts': 'export default {};',
    'plumb.config.mjs': 'export default { wrong: true };',
  });
  assert.equal(json(run(['--root', directory, '--json'])).config.path, join(directory, 'plumb.config.ts'));
});

test('explicit config resolves ambiguity, overrides source and loads defineConfig', async t => {
  const index = pathToFileURL(join(root, 'dist/index.js')).href;
  const directory = await project(t, {
    ...stylesheetPackage,
    'src/first.css': '@import "tailwindcss";',
    'src/second.css': '@import "tailwindcss/theme";',
    'src/ignored.tsx': 'export const Ignored = () => null;',
    'custom/View.jsx': 'export const View = () => null;',
    'custom/types.ts': 'export type Value = string;',
    'custom/styles.css': ':root { --space: 4px; }',
    'settings/check.ts': `import { defineConfig } from ${JSON.stringify(index)};
      export default defineConfig({
        css: 'src/second.css', source: ['custom/**/*.{jsx,ts,css}', 'custom/**/*.css'],
        decisions: {
          spacing: { from: 'theme:--spacing-*', identity: 'value', callers: ['primitive', 'semantic'] },
          color: { from: ['theme:--color-*'], identity: 'reference', origins: ['project'], exported: true },
          z: { from: 'theme:--z-*' },
          motion: { from: () => [] }
        },
        components: { from: 'src/components', own: ['paint'], contracts: { Panel: { allow: ['padding'], own: ['radius'] } } },
        habits: ['hover-gate', { id: 'text-height', when: { prop: 'height', ownerElements: ['p'] }, message: 'Let text set its height.' }],
        imitation: { Input: { elements: ['input'], fingerprint: ['field'] } }
      });`,
  });
  for (const config of ['settings/check.ts', join(directory, 'settings/check.ts')]) {
    const report = json(run(['--root', directory, '--config', config, '--json']));
    matchesSchema(report);
    assert.deepEqual(report.config, { path: join(directory, 'settings/check.ts'), inferred: false });
    assert.equal(report.tailwind.entry, join(directory, 'src/second.css'));
    assert.deepEqual(report.files, { tsx: 0, jsx: 1, css: 1, other: 1 });
    assert.deepEqual(report.findings, []);
  }
});

test('malformed config shapes, import errors and invalid CSS paths fail clearly', async t => {
  const cases = [
    ['null', /config to an object/],
    ['[]', /config to an object/],
    ['{ css: 42 }', /css to a non-empty string/],
    ['{ source: "src/**" }', /source to an array/],
    ['{ decisions: { madeup: { from: "theme:*" } } }', /decisions\.madeup/],
    ['{ decisions: { spacing: { from: 42 } } }', /spacing\.from/],
    ['{ decisions: { color: { from: "theme:*", identity: "raw" } } }', /color\.identity/],
    ['{ decisions: { color: { from: "theme:*", callers: ["anything"] } } }', /color\.callers/],
    ['{ components: { from: "src/components", contracts: { Panel: { allow: "padding" } } } }', /Panel\.allow/],
    ['{ habits: [false] }', /habits to an object/],
    ['{ habits: [{ id: "x", when: { prop: () => true }, message: "x" }] }', /without callbacks/],
    ['{ imitation: { Input: { elements: ["input"], fingerprint: 42 } } }', /Input\.fingerprint/],
    ['{ css: "missing.css" }', /Set css to a readable \.css file/],
    ['{ css: "src" }', /Set css to a readable \.css file/],
  ];
  for (const [value, pattern] of cases) {
    await t.test(value, async t => {
      const directory = await project(t, { 'plumb.config.ts': `export default ${value};`, 'src/App.tsx': '' });
      usage(run(['--root', directory, '--json']), pattern);
    });
  }
  for (const contents of ['export const config = {};', 'export default {', 'throw new Error("broken\\nconfig");']) {
    const directory = await project(t, { 'plumb.config.ts': contents });
    usage(run(['--root', directory]), /Fix.*config/);
  }
});

test('discovery accepts single quotes and subpaths, ignores comments and build directories, counts app sources', async t => {
  const files = {
    ...stylesheetPackage,
    'src/theme.css': '/* @import "tailwindcss"; */\n:root { --color: blue; }',
    'app/page.tsx': 'export const Page = () => null;',
    'app/widget.jsx': 'export const Widget = () => null;',
    'src/utils.ts': 'export const x = 1;',
    'src/utils.js': 'export const y = 2;',
    'src/image.svg': '<svg />',
    '.theme/entry.css': "@import 'tailwindcss/theme';",
  };
  for (const ignored of ['node_modules', 'dist', 'build', '.next', '.git']) {
    files[`src/${ignored}/hidden.css`] = '@import "tailwindcss";';
    files[`${ignored}/hidden.css`] = '@import "tailwindcss";';
  }
  const directory = await project(t, files);
  const report = json(run(['--root', directory, '--json']));
  assert.equal(report.tailwind.entry, join(directory, '.theme/entry.css'));
  assert.deepEqual(report.files, { tsx: 1, jsx: 1, css: 1, other: 2 });
});

test('version resolution uses the installation nearest the CSS entry', async t => {
  const directory = await project(t, {
    ...stylesheetPackage,
    'src/styles.css': '@import "tailwindcss";',
  });
  assert.equal(json(run(['--root', directory, '--json'])).tailwind.version, '4.1.99');
});
