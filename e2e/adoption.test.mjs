import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));
const cli = join(root, 'dist/cli.js');
const defaults = ['hover-gate', 'focus-outline', 'viewport-dynamic', 'overscroll-contain'];
function run(directory, args = [], status = 0, executable = cli) {
  const result = spawnSync(process.execPath, [executable, ...args], { cwd: directory, encoding: 'utf8', timeout: 20_000,
    env: { ...process.env, PLUMB_CACHE_DIR: join(directory, '.cache') } });
  assert.ifError(result.error);
  assert.equal(result.status, status, result.stderr || result.stdout);
  return result;
}
async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'plumb-adoption-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await cp(join(root, 'fixtures/adoption'), directory, { recursive: true });
  return directory;
}
async function file(directory, path, text) {
  await mkdir(dirname(join(directory, path)), { recursive: true });
  await writeFile(join(directory, path), text);
}
const entries = async directory => (await readFile(join(directory, '.plumb/ledger.jsonl'), 'utf8')).split('\n').filter(Boolean).map(JSON.parse);
function git(directory, ...args) {
  const result = spawnSync('git', ['-C', directory, ...args], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

test('three-command transcript: first look, init baseline, detected agents and CI', async t => {
  const directory = await fixture(t);
  git(directory, 'init', '-q');
  await file(directory, 'AGENTS.md', '# Team\nKeep this.\n');
  await file(directory, 'CLAUDE.md', '# Claude\nKeep this too.');
  await file(directory, '.claude/settings.json', '{"permissions":{"allow":["Read"]}}\n');
  await file(directory, '.cursor/hooks.json', '{"version":1,"hooks":{"afterFileEdit":[{"command":"format"}]}}\n');
  await file(directory, '.github/CODEOWNERS', '* @general\n/.plumb/ @designer @org/design\n/.plumb/ledger.jsonl @ledger-owner\n');
  const first = run(directory).stdout;
  assert.match(first, /gap|spacing/);
  assert.match(first, /\nNext: run plumb init/);
  const look = JSON.parse(run(directory, ['--json']).stdout);
  assert.ok(look.findings.some(finding => finding.severity === 'error'));
  assert.ok(!look.findings.some(finding => finding.rule.startsWith('habits/')));
  const initialized = run(directory, ['init']).stdout;
  assert.match(initialized, /Baseline: \d+ debt entries/);
  assert.match(initialized, /Accepted \d+ tokens as inferred/);
  const text = await readFile(join(directory, 'plumb.config.ts'), 'utf8');
  assert.match(text, /Components: 2 found from directory:src\/components\/ui/);
  assert.match(text, /Unused: src\/components\/ui\/Button.tsx/);
  const configured = await import(`file://${join(directory, 'plumb.config.ts')}`);
  assert.deepEqual(configured.default.habits, defaults);
  assert.ok(Object.values(configured.default.decisions).every(source => source.inferred === true));
  for (const id of ['transition-named', 'no-ease-in', 'logical-inline', 'safe-area-fallback', 'overflow-clip']) {
    assert.match(text, new RegExp(`// "${id}", // \\d+ breaks`));
  }
  for (const id of defaults) assert.match(text, new RegExp(`"${id}", // [1-9]\\d* breaks`));
  const ledger = await entries(directory);
  assert.ok(ledger.filter(entry => entry.kind === 'decision').every(entry => entry.inferred));
  assert.ok(defaults.every(id => ledger.some(entry => entry.rule === `habits/${id}`)));
  assert.ok(!ledger.some(entry => entry.rule === 'habits/logical-inline'));
  const beforeInstall = await readFile(join(directory, '.plumb/ledger.jsonl'), 'utf8');
  const installed = run(directory, ['install', '--ci']).stdout;
  assert.match(installed, /Agents: Claude Code, Cursor, Codex/);
  assert.match(installed, /Wrote PLUMB.md/);
  assert.match(installed, /Wrote .github\/workflows\/plumb.yml/);
  assert.ok((await readFile(join(directory, 'AGENTS.md'), 'utf8')).startsWith('# Team\nKeep this.\n'));
  assert.ok((await readFile(join(directory, 'CLAUDE.md'), 'utf8')).startsWith('# Claude\nKeep this too.'));
  assert.match(await readFile(join(directory, 'AGENTS.md'), 'utf8'), /--strict-ledger/);
  const claude = JSON.parse(await readFile(join(directory, '.claude/settings.json'), 'utf8'));
  const cursor = JSON.parse(await readFile(join(directory, '.cursor/hooks.json'), 'utf8'));
  assert.deepEqual(claude.permissions, { allow: ['Read'] });
  assert.equal(cursor.hooks.afterFileEdit[0].command, 'format');
  assert.match(claude.hooks.PostToolUse[0].hooks[0].command, /plumb check --changed --agent --strict-ledger/);
  const workflow = await readFile(join(directory, '.github/workflows/plumb.yml'), 'utf8');
  assert.match(workflow, /uses: unlocalhosted\/plumb@[a-f\d]{40}/);
  assert.match(workflow, /base: \$\{\{ github.event.pull_request.base.sha \}\}/);
  assert.match(workflow, /ref: \$\{\{ github.event.pull_request.head.sha \}\}/);
  assert.match(workflow, /fetch-depth: 0/);
  assert.match(workflow, /ledger-approvers: "@ledger-owner"/);
  assert.doesNotMatch(workflow, /@general|@designer|pull_request_target/);
  const checked = JSON.parse(run(directory, ['check', '--json']).stdout);
  assert.equal(checked.ledger.new, 0);
  assert.ok(!checked.findings.some(finding => finding.severity === 'error'));
  assert.equal(await readFile(join(directory, '.plumb/ledger.jsonl'), 'utf8'), beforeInstall);
  const targets = ['AGENTS.md', 'CLAUDE.md', 'PLUMB.md', '.claude/settings.json', '.cursor/hooks.json', '.github/workflows/plumb.yml'];
  const contents = await Promise.all(targets.map(path => readFile(join(directory, path), 'utf8')));
  assert.match(run(directory, ['install', '--ci']).stdout, /Kept PLUMB.md/);
  assert.deepEqual(await Promise.all(targets.map(path => readFile(join(directory, path), 'utf8'))), contents);
  const healthy = run(directory, ['doctor']).stdout;
  assert.equal(healthy.trim().split('\n').length, 6);
  assert.ok(healthy.trim().split('\n').every(line => /^ok  /.test(line)));
  t.diagnostic('First run: exit 0; init: inferred config, four habits, baseline; install --ci: preserved agents, hooks, docs, pinned action; check: 0 new.');
});

test('no config remains advisory until a ledger exists; configured check still fails', async t => {
  const directory = await fixture(t);
  run(directory, ['check']);
  run(directory, ['baseline']);
  await file(directory, 'src/new.css', '.new { gap: 13px; }');
  const checked = JSON.parse(run(directory, ['check', '--json'], 1).stdout);
  assert.ok(checked.findings.some(finding => finding.severity === 'error'));
  await rm(join(directory, '.plumb'), { recursive: true });
  await file(directory, 'plumb.config.mjs', 'export default {};\n');
  run(directory, ['check'], 1);
});

test('init refuses overwrite, force prints diff and records baseline under replacement policy', async t => {
  const directory = await fixture(t);
  await file(directory, 'plumb.config.mjs', 'export default { habits: ["logical-inline"] };\n');
  const original = await readFile(join(directory, 'plumb.config.mjs'), 'utf8');
  assert.match(run(directory, ['init'], 2).stderr, /Config already exists.*--force/);
  assert.equal(await readFile(join(directory, 'plumb.config.mjs'), 'utf8'), original);
  const forced = run(directory, ['init', '--force']).stdout;
  assert.match(forced, /--- plumb.config.mjs\n\+\+\+ plumb.config.mjs/);
  assert.ok(forced.indexOf('---') < forced.indexOf('Wrote plumb.config.mjs'));
  run(directory, ['check']);
  assert.match(run(directory, ['init'], 2).stderr, /Config already exists/);
  run(directory, ['init', '--force']);
  run(directory, ['check']);
});

test('tokenless repeated values become inferred proposals without creating theme tokens', async t => {
  const directory = await fixture(t);
  const css = '.a { gap: 12px; }\n.b { padding: 12px; }\n.c { margin: 12px; }\n.d { gap: 15px; }\n';
  await file(directory, 'src/styles.css', css);
  run(directory, ['init']);
  const config = await readFile(join(directory, 'plumb.config.ts'), 'utf8');
  assert.match(config, /"origin": "inferred"/);
  assert.match(config, /"name": "inferred:spacing:12px"/);
  assert.doesNotMatch(config, /inferred:spacing:15px/);
  assert.equal(await readFile(join(directory, 'src/styles.css'), 'utf8'), css);
  run(directory, ['check']);
  const decision = (await entries(directory)).find(entry => entry.kind === 'decision' && entry.value === '12px');
  assert.equal(decision.origin, 'inferred');
  assert.equal(decision.inferred, true);
});

test('inferred CSS selectors keep unrelated root variables outside token families and track new tokens', async t => {
  const directory = await fixture(t);
  await file(directory, 'src/extra.css', ':root { --spacing-extra: 24px; --unrelated: 99px; }\n');
  run(directory, ['init']);
  let report = JSON.parse(run(directory, ['decisions', '--json']).stdout);
  assert.ok(report.some(decision => decision.name === '--spacing-extra'));
  assert.ok(!report.some(decision => decision.name === '--unrelated'));
  await file(directory, 'src/extra.css', ':root { --spacing-extra: 24px; --spacing-new: 32px; --unrelated: 99px; }\n');
  report = JSON.parse(run(directory, ['check', '--json'], 1).stdout);
  assert.ok(report.findings.some(finding => finding.rule === 'decisions/unaccepted' && finding.sites.some(site => site.text.includes('--spacing-new'))));
});

test('install without agents writes docs only; existing docs and workflow never clobbered', async t => {
  const directory = await fixture(t);
  await file(directory, 'PLUMB.md', '# Owned documentation\n');
  await file(directory, '.github/workflows/plumb.yml', '# Owned workflow\n');
  run(directory, ['install', '--ci']);
  assert.equal(await readFile(join(directory, 'PLUMB.md'), 'utf8'), '# Owned documentation\n');
  assert.equal(await readFile(join(directory, '.github/workflows/plumb.yml'), 'utf8'), '# Owned workflow\n');
  await assert.rejects(readFile(join(directory, '.claude/settings.json')), { code: 'ENOENT' });
  await assert.rejects(readFile(join(directory, '.cursor/hooks.json')), { code: 'ENOENT' });
  assert.match(await readFile(join(directory, 'AGENTS.md'), 'utf8'), /plumb:start/);
});

test('nested install puts workflow at git root, scopes approval to ledger owners, preserves parent docs', async t => {
  const directory = await fixture(t);
  git(directory, 'init', '-q');
  await file(directory, '.github/CODEOWNERS', '* @everyone\n.plumb/ @docs-owner\n/other/ @other\n');
  await file(directory, 'AGENTS.md', 'Parent instructions.\n');
  await file(directory, '.claude/settings.json', '{"permissions":{"allow":["Read"]}}');
  const nested = join(directory, 'apps/docs');
  await cp(join(root, 'fixtures/adoption'), nested, { recursive: true });
  run(nested, ['init']);
  assert.match(run(nested, ['install', '--ci']).stdout, /Agents: Claude Code, Codex/);
  const workflow = await readFile(join(directory, '.github/workflows/plumb.yml'), 'utf8');
  assert.match(workflow, /working-directory: "apps\/docs"/);
  assert.match(workflow, /ledger-approvers: "@docs-owner"/);
  assert.equal(await readFile(join(directory, 'AGENTS.md'), 'utf8'), 'Parent instructions.\n');
  const hooks = JSON.parse(await readFile(join(directory, '.claude/settings.json'), 'utf8'));
  assert.match(hooks.hooks.PostToolUse[0].hooks[0].command, /--root 'apps\/docs'/);
  run(nested, ['check']);
});

test('doctor reports missing setup and broken config/ledger in independent check lines', async t => {
  const directory = await fixture(t);
  let output = run(directory, ['doctor'], 1).stdout;
  assert.match(output, /fix  Config: no config. Run plumb init/);
  assert.match(output, /fix  Ledger: no .plumb\/ledger.jsonl. Run plumb init/);
  run(directory, ['init']);
  await file(directory, '.plumb/ledger.jsonl', '{broken\n');
  await file(directory, 'plumb.config.ts', 'export default { unknown: true };\n');
  output = run(directory, ['doctor'], 1).stdout;
  assert.equal(output.trim().split('\n').length, 6);
  assert.match(output, /fix  Config:.*unknown/);
  assert.match(output, /fix  Ledger:.*Invalid ledger JSON/);
  assert.match(output, /ok  Cache:.*\d+ bytes/);
});

test('doctor detects accepted token changes and exception reasons needing repair', async t => {
  const directory = await fixture(t);
  run(directory, ['init']);
  const css = await readFile(join(directory, 'src/styles.css'), 'utf8');
  await file(directory, 'src/styles.css', css.replace('8px', '9px'));
  let output = run(directory, ['doctor'], 1).stdout;
  assert.match(output, /fix  Ledger:.*plumb accept-decisions/);
  const ledger = await entries(directory);
  ledger.push({ key: 'handwritten', kind: 'exception' });
  await file(directory, '.plumb/ledger.jsonl', ledger.map(JSON.stringify).join('\n') + '\n');
  output = run(directory, ['doctor'], 1).stdout;
  assert.match(output, /plumb accept <key> --why/);
});

test('doctor reports unsupported Tailwind, missing CSS entry and unusable cache separately', async t => {
  const directory = await fixture(t);
  await file(directory, 'src/styles.css', '@import "tailwindcss";\n');
  await file(directory, 'node_modules/tailwindcss/package.json', '{"name":"tailwindcss","version":"3.4.0"}\n');
  let output = run(directory, ['doctor'], 1).stdout;
  assert.match(output, /fix  Tailwind: 3.4.0. Use Tailwind 4/);
  await file(directory, 'plumb.config.ts', 'export default { css: "missing.css" };\n');
  await rm(join(directory, '.cache'), { recursive: true, force: true });
  await file(directory, '.cache', 'not a directory');
  output = run(directory, ['doctor'], 1).stdout;
  assert.match(output, /fix  CSS entry:.*missing.css/);
  assert.match(output, /fix  Cache:.*PLUMB_CACHE_DIR/);
  assert.equal(output.trim().split('\n').length, 6);
});

test('packaged CLI never uses its enclosing consumer repository HEAD as a Plumb action pin', async t => {
  // Simulate package files inside someone else's Git tree, with existing
  // dependencies linked for reads. No package installation or download.
  const packageRoot = await mkdtemp(join(root, 'fixtures/.adoption-package-'));
  t.after(() => rm(packageRoot, { recursive: true, force: true }));
  await cp(join(root, 'dist'), join(packageRoot, 'dist'), { recursive: true });
  await cp(join(root, 'package.json'), join(packageRoot, 'package.json'));
  await cp(join(root, 'action.yml'), join(packageRoot, 'action.yml'));
  await symlink(join(root, 'node_modules'), join(packageRoot, 'node_modules'));
  const directory = await fixture(t);
  run(directory, ['install', '--ci'], 0, join(packageRoot, 'dist/cli.js'));
  const workflow = await readFile(join(directory, '.github/workflows/plumb.yml'), 'utf8');
  assert.match(workflow, /uses: unlocalhosted\/plumb@main/);
});
