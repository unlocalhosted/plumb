import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { Session } from '../dist/session/index.js';

const repo = fileURLToPath(new URL('../', import.meta.url));
async function project(t) {
  const root = await mkdtemp(join(repo, 'fixtures/.robust-'));
  await cp(join(repo, 'fixtures/overlay-robust'), root, { recursive: true });
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}
async function put(root, file, text) {
  await mkdir(dirname(join(root, file)), { recursive: true });
  await writeFile(join(root, file), text);
}
function check(root, args = []) {
  const result = spawnSync(process.execPath, [join(repo, 'dist/cli.js'), '--root', root, '--json', ...args],
    { encoding: 'utf8', timeout: 30000, maxBuffer: 32 * 1024 * 1024 });
  assert.ifError(result.error); assert.equal(result.stderr, ''); assert.ok([0, 1].includes(result.status), result.stdout);
  return { report: JSON.parse(result.stdout), status: result.status };
}
const diagnostics = report => report.findings.filter(f => f.rule === 'config/unreadable');
function semantic(report) {
  const value = structuredClone(report); delete value.timing;
  for (const key of ['cacheHits', 'cacheMisses', 'parseMs', 'totalMs']) delete value.moduleGraph[key];
  return value;
}

test('zero-config follows the HTML module entry and dynamic imports to app Tailwind CSS', async t => {
  const root = await project(t), { report, status } = check(root);
  assert.equal(status, 0);
  assert.equal(report.tailwind.entry, join(root, 'src/index.css'));
  assert.ok(report.declarations.some(d => d.site.file.endsWith('/App.tsx') && d.value === '13px'));
  assert.ok(report.declarations.some(d => d.site.text === 'bg-app' && d.prop === 'background-color'));
  const skipped = diagnostics(report);
  assert.equal(skipped.length, 1);
  assert.equal(skipped[0].sites[0].text, '[&_.bg-error/5]:hidden');
  assert.equal(skipped[0].severity, 'info');
  assert.match(skipped[0].because, /Unexpected token/);
  assert.ok(!report.findings.some(f => f.rule === 'existence/dead-class' && f.declaration.value === '[&_.bg-error/5]:hidden'));
  assert.deepEqual(semantic(check(root).report), semantic(report), 'cold/warm caches retain the diagnostic');
  const text = spawnSync(process.execPath, [join(repo, 'dist/cli.js'), '--root', root, '--all'], { encoding: 'utf8' });
  assert.equal(text.status, 0); assert.match(text.stdout, /1 item skipped/); assert.doesNotMatch(text.stdout, /Unexpected token/);
  const verbose = spawnSync(process.execPath, [join(repo, 'dist/cli.js'), '--root', root, '--all', '--verbose'], { encoding: 'utf8' });
  assert.equal(verbose.status, 0); assert.match(verbose.stdout, /config\/unreadable/); assert.match(verbose.stdout, /Unexpected token/);
  await put(root, 'plumber.config.ts', "export default { css: 'src/index.css' };");
  const before = check(root).status;
  await put(root, 'src/App.tsx', 'export const App = () => <div className="gap-[13px] bg-app" />;');
  assert.equal(check(root).status, before, 'unreadable diagnostic does not change configured CLI exit status');
});

test('Session starts with a bad candidate, retains good readings, and recovers after source repair', async t => {
  const root = await project(t), session = await Session.create({ root }); t.after(() => session.close());
  assert.equal((await session.health()).status, 'ready');
  assert.deepEqual(semantic(await session.report()), semantic(check(root).report));
  await put(root, 'src/App.tsx', 'export const App = () => <div className="gap-[17px]" />;');
  const repaired = await session.report();
  assert.equal(diagnostics(repaired).length, 0);
  assert.ok(repaired.declarations.some(d => d.value === '17px'));
  assert.deepEqual(semantic(repaired), semantic(check(root).report));
});

test('unreadable sources, imported modules and CSS rules leave sibling evidence intact', async t => {
  const root = await project(t);
  await put(root, 'src/App.tsx', 'import "../lib/broken"; export const App = () => <div className="good gap-[13px]" />;');
  await put(root, 'src/Broken.tsx', 'export const Broken = <div');
  await put(root, 'lib/broken.ts', 'export const broken = {');
  await put(root, 'src/extra.css', '.good { margin: 17px; }\n.bad/5 { color: red; }\n.after { padding: 19px; }');
  const { report, status } = check(root);
  assert.equal(status, 0);
  assert.deepEqual(new Set(diagnostics(report).map(f => f.sites[0].file)),
    new Set(['src/Broken.tsx', 'lib/broken.ts', 'src/extra.css'].map(file => join(root, file))));
  assert.equal(diagnostics(report).length, 3, 'one diagnostic per unreadable file');
  assert.ok(report.declarations.some(d => d.value === '13px'));
  assert.ok(report.declarations.some(d => d.value === '17px' && d.site.line === 1));
  assert.ok(report.declarations.some(d => d.value === '19px' && d.site.line === 3));
  assert.ok(!report.findings.some(f => f.rule === 'existence/dead-class' && f.declaration.value === 'good'));
  assert.deepEqual(semantic(check(root).report), semantic(report));
  const session = await Session.create({ root }); t.after(() => session.close());
  assert.deepEqual(semantic(await session.report()), semantic(report));
  await put(root, 'src/extra.css', '.good { margin: 23px; }');
  await put(root, 'src/Broken.tsx', 'export const Broken = () => <div className="gap-[29px]" />;');
  await put(root, 'lib/broken.ts', 'export const broken = {};');
  const repaired = await session.report();
  assert.equal(diagnostics(repaired).length, 0);
  assert.deepEqual(semantic(repaired), semantic(check(root).report));
});

test('compiler exceptions isolate candidates and source-map CSS lowering remains available', async t => {
  const root = await project(t);
  await put(root, 'node_modules/tailwindcss/package.json', JSON.stringify({ name: 'tailwindcss', type: 'module', version: '4.99.0', exports: { '.': { style: './index.css', default: './index.js' }, './package.json': './package.json' }, style: 'index.css' }));
  await put(root, 'node_modules/tailwindcss/index.css', '');
  await put(root, 'node_modules/tailwindcss/index.js', `
    export async function __unstable__loadDesignSystem() {
      return {
        candidatesToCss(names) { if (names.includes('bad-compile')) throw new Error('candidate compiler rejected bad-compile'); return names.map(name => name === 'baad-parse' ? null : name.includes('--plumb-hover-probe') ? name.startsWith('pointer-hover:[--') ? '.bad/5 { color: red; }' : null : '.' + name + ' { padding: 31px; }'); },
        parseCandidate(name) { if (name === 'bad-parse') throw new Error('candidate parser rejected bad-parse'); return [name === 'needs-hints' ? { kind: 'functional', root: 'gap', value: { kind: 'named', value: 'one' } } : { kind: 'static', root: name }]; },
        compileAstNodes() { return []; },
        theme: { entries() { return [['--spacing-one', { options: 0, value: '13px' }]]; } },
        utilities: { keys(kind) { return kind === 'static' ? [] : ['gap']; }, getCompletions() { throw new Error('completion rejected gap'); } },
      };
    }
    export async function compile(css) {
      return { build(names) {
        if (names.includes('bad-util')) throw new Error('utility compiler rejected bad-util');
        return css.includes('@utility') ? '.base { margin: 41px; }' + (names.includes('good-util') ? '.good-util { padding: 43px; }' : '') : '';
      }, buildSourceMap() { return { mappings: [], sources: [] }; } };
    }
  `);
  await put(root, 'src/App.tsx', 'export const App = () => <div className="bad-compile bad-parse good baad-parse" />;');
  const { report, status } = check(root);
  assert.equal(status, 0);
  assert.equal(diagnostics(report).length, 2);
  assert.ok(report.declarations.some(d => d.site.text === 'good' && d.value === '31px'));
  assert.ok(!report.declarations.some(d => d.site.text.startsWith('bad-')));
  const dead = report.findings.find(f => f.rule === 'existence/dead-class' && f.declaration.value === 'baad-parse');
  assert.ok(dead); assert.ok(!dead.fix.includes('bad-parse'), 'unreadable candidates never become replacement suggestions');
  assert.deepEqual(semantic(check(root).report), semantic(report));
  await put(root, 'plumber.config.ts', "export default { habits: ['hover-gate'] };");
  await put(root, 'src/App.tsx', 'export const App = () => <div className="bad-compile bad-parse good needs-hints" />;');
  const probes = check(root).report;
  assert.equal(diagnostics(probes).length, 4);
  assert.deepEqual(semantic(check(root).report), semantic(probes), 'failed probes and completions remain visible through warm caches');
  const session = await Session.create({ root }); t.after(() => session.close());
  assert.deepEqual(semantic(await session.report()), semantic(probes));
  await put(root, 'plumber.config.ts', 'export default {};');
  await put(root, 'src/App.tsx', 'export const App = () => <div className="good" />;');
  await put(root, 'src/index.css', '@import "tailwindcss"; @utility bad-util { padding: 7px; } @utility good-util { padding: 9px; }');
  const utilities = check(root).report;
  assert.equal(diagnostics(utilities).length, 1);
  assert.match(diagnostics(utilities)[0].because, /utility compiler rejected bad-util/);
  assert.equal(utilities.declarations.filter(d => d.value === '41px' && d.site.file === join(root, 'src/index.css')).length, 1);
  assert.ok(utilities.declarations.some(d => d.value === '43px'));
  assert.deepEqual(semantic(await session.report()), semantic(utilities));
});

test('embedded stylesheet failures skip bad rules while preserving JSX and sibling CSS', async t => {
  const root = await project(t);
  await put(root, 'src/App.tsx', 'export const App = () => <><div className="gap-[13px]" /><style>{`.inline { padding: 37px; } .bad/5 { color: red; }`}</style></>;');
  const { report } = check(root);
  assert.equal(diagnostics(report).length, 1);
  assert.equal(diagnostics(report)[0].sites[0].file, join(root, 'src/App.tsx'));
  assert.ok(report.declarations.some(d => d.value === '37px'));
  assert.ok(report.declarations.some(d => d.value === '13px'));
  const session = await Session.create({ root }); t.after(() => session.close());
  assert.deepEqual(semantic(await session.report()), semantic(report));
  await put(root, 'src/App.tsx', 'export const App = () => <style>{`.inline { padding: 41px; }`}</style>;');
  assert.equal(diagnostics(await session.report()).length, 0);
  assert.deepEqual(semantic(await session.report()), semantic(check(root).report));
});

test('several reached entries choose the largest app graph and disclose the fallback', async t => {
  const root = await project(t);
  const html = await readFile(join(root, 'index.html'), 'utf8');
  await put(root, 'index.html', html.replace('<body>', '<head><link rel="stylesheet" href="/src/home.css"></head><body>'));
  const { report } = check(root);
  assert.equal(report.tailwind.entry, join(root, 'src/index.css'));
  assert.equal(report.findings.filter(f => f.rule === 'config/tailwind-entry').length, 1);
  const session = await Session.create({ root }); t.after(() => session.close());
  await put(root, 'index.html', '<script type="module" src="/src/landing.ts"></script>');
  await put(root, 'src/landing.ts', 'import "./home.css";');
  assert.equal((await session.report()).tailwind.entry, join(root, 'src/home.css'), 'HTML changes invalidate entry discovery');
});

test('static bundler inputs choose entries without executing config; graph ties require config', async t => {
  const root = await project(t); await rm(join(root, 'index.html'));
  await put(root, 'vite.config.ts', 'throw new Error("must not execute"); export default { build: { rollupOptions: { input: "src/main.tsx" } } };');
  assert.equal(check(root).report.tailwind.entry, join(root, 'src/index.css'));
  await put(root, 'src/landing.ts', 'import "./home.css";');
  await put(root, 'src/main.tsx', 'import "./index.css";');
  await put(root, 'vite.config.ts', 'export default { build: { rollupOptions: { input: ["src/main.tsx", "src/landing.ts"] } } };');
  const result = spawnSync(process.execPath, [join(repo, 'dist/cli.js'), '--root', root, '--json'], { encoding: 'utf8' });
  assert.equal(result.status, 2); assert.match(result.stderr, /set css in plumber.config.ts/);
});
