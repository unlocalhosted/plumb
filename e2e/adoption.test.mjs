import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));
const cli = join(root, 'dist/cli.js');
const defaults = ['hover-gate', 'focus-outline', 'transition-named', 'no-ease-in'];
function run(directory, args = [], status = 0, executable = cli) {
  const result = spawnSync(process.execPath, [executable, ...args], { cwd: directory, encoding: 'utf8', timeout: 20_000,
    // Git never looks above the temporary directory the fixtures live in, so install --ci writes the workflow into the fixture even when the
    // temporary directory sits inside another repository (React Plumber's own, under a TMPDIR set to fixtures/).
    env: { ...process.env, PLUMB_CACHE_DIR: join(directory, '.cache'), GIT_CEILING_DIRECTORIES: tmpdir() } });
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
const entries = async directory => (await readFile(join(directory, '.plumber/ledger.jsonl'), 'utf8')).split('\n').filter(Boolean).map(JSON.parse);
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
  await file(directory, '.github/CODEOWNERS', '* @general\n/.plumber/ @designer @org/design\n/.plumber/ledger.jsonl @ledger-owner\n');
  const first = run(directory).stdout;
  assert.match(first, /gap|spacing/);
  assert.match(first, /\nNext: run plumber init/);
  const look = JSON.parse(run(directory, ['--json']).stdout);
  assert.ok(look.findings.some(finding => finding.severity === 'error'));
  assert.ok(!look.findings.some(finding => finding.rule.startsWith('habits/')));
  const initialized = run(directory, ['init']).stdout;
  assert.match(initialized, /Baseline: \d+ debt entries/);
  assert.match(initialized, /Accepted \d+ tokens as inferred/);
  const text = await readFile(join(directory, 'plumber.config.ts'), 'utf8');
  assert.match(text, /Components: 2 found from directory:src\/components\/ui/);
  assert.match(text, /Unused: src\/components\/ui\/Button.tsx/);
  const configured = await import(`file://${join(directory, 'plumber.config.ts')}`);
  assert.deepEqual(configured.default.habits, defaults);
  const readme = await readFile(join(root, 'README.md'), 'utf8');
  const listedDefaults = /^Init enables the (.+?) habits/m.exec(readme)?.[1];
  assert.ok(listedDefaults, 'README lists init defaults');
  assert.deepEqual([...listedDefaults.matchAll(/`([^`]+)`/g)].map(match => match[1]), configured.default.habits, 'README defaults match what real plumber init writes');
  assert.ok(Object.values(configured.default.decisions).every(source => source.inferred === true));
  for (const id of ['viewport-dynamic', 'overscroll-contain', 'logical-inline', 'safe-area-fallback', 'overflow-clip']) {
    assert.match(text, new RegExp(`// "${id}", // \\d+ breaks`));
  }
  for (const id of defaults) assert.match(text, new RegExp(`"${id}", // [1-9]\\d* breaks`));
  const ledger = await entries(directory);
  assert.ok(ledger.filter(entry => entry.kind === 'decision').every(entry => entry.inferred));
  assert.ok(defaults.every(id => ledger.some(entry => entry.rule === `habits/${id}`)));
  assert.ok(!ledger.some(entry => entry.rule === 'habits/logical-inline'));
  const beforeInstall = await readFile(join(directory, '.plumber/ledger.jsonl'), 'utf8');
  const installed = run(directory, ['install', '--ci']).stdout;
  assert.match(installed, /Agents: Claude Code, Cursor, Codex/);
  assert.match(installed, /Wrote .claude\/skills\/plumber\/SKILL.md/);
  assert.match(installed, /Wrote .github\/workflows\/plumb.yml/);
  assert.ok((await readFile(join(directory, 'AGENTS.md'), 'utf8')).startsWith('# Team\nKeep this.\n'));
  assert.ok((await readFile(join(directory, 'CLAUDE.md'), 'utf8')).startsWith('# Claude\nKeep this too.'));
  assert.match(await readFile(join(directory, 'AGENTS.md'), 'utf8'), /npx plumber check --changed --agent/);
  const claude = JSON.parse(await readFile(join(directory, '.claude/settings.json'), 'utf8'));
  const cursor = JSON.parse(await readFile(join(directory, '.cursor/hooks.json'), 'utf8'));
  assert.deepEqual(claude.permissions, { allow: ['Read'] });
  assert.equal(cursor.hooks.afterFileEdit[0].command, 'format');
  assert.match(claude.hooks.PostToolUse[0].hooks[0].command, /plumber check --changed --agent --strict-ledger/);
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
  assert.equal(await readFile(join(directory, '.plumber/ledger.jsonl'), 'utf8'), beforeInstall);
  const targets = ['AGENTS.md', 'CLAUDE.md', '.claude/skills/plumber/SKILL.md', '.cursor/rules/plumber.mdc', '.claude/settings.json', '.cursor/hooks.json', '.github/workflows/plumb.yml'];
  const contents = await Promise.all(targets.map(path => readFile(join(directory, path), 'utf8')));
  assert.match(run(directory, ['install', '--ci']).stdout, /Kept .claude\/skills\/plumber\/SKILL.md/);
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
  await rm(join(directory, '.plumber'), { recursive: true });
  await file(directory, 'plumber.config.mjs', 'export default {};\n');
  run(directory, ['check'], 1);
});

test('init refuses overwrite, force prints diff and records baseline under replacement policy', async t => {
  const directory = await fixture(t);
  await file(directory, 'plumber.config.mjs', 'export default { habits: ["logical-inline"] };\n');
  const original = await readFile(join(directory, 'plumber.config.mjs'), 'utf8');
  assert.match(run(directory, ['init'], 2).stderr, /Config already exists.*--force/);
  assert.equal(await readFile(join(directory, 'plumber.config.mjs'), 'utf8'), original);
  const forced = run(directory, ['init', '--force']).stdout;
  assert.match(forced, /--- plumber.config.mjs\n\+\+\+ plumber.config.mjs/);
  assert.ok(forced.indexOf('---') < forced.indexOf('Wrote plumber.config.mjs'));
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
  const config = await readFile(join(directory, 'plumber.config.ts'), 'utf8');
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
  await file(directory, 'PLUMBER.md', '# Owned documentation\n');
  await file(directory, '.github/workflows/plumb.yml', '# Owned workflow\n');
  run(directory, ['install', '--ci']);
  assert.equal(await readFile(join(directory, 'PLUMBER.md'), 'utf8'), '# Owned documentation\n');
  assert.equal(await readFile(join(directory, '.github/workflows/plumb.yml'), 'utf8'), '# Owned workflow\n');
  await assert.rejects(readFile(join(directory, '.claude/settings.json')), { code: 'ENOENT' });
  await assert.rejects(readFile(join(directory, '.cursor/hooks.json')), { code: 'ENOENT' });
  assert.match(await readFile(join(directory, 'AGENTS.md'), 'utf8'), /plumb:start/);
});

test('nested install puts workflow at git root, scopes approval to ledger owners, preserves parent docs', async t => {
  const directory = await fixture(t);
  git(directory, 'init', '-q');
  await file(directory, '.github/CODEOWNERS', '* @everyone\n.plumber/ @docs-owner\n/other/ @other\n');
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
  assert.match(output, /fix  Config: no config. Run plumber init/);
  assert.match(output, /fix  Ledger: no .plumber\/ledger.jsonl. Run plumber init/);
  run(directory, ['init']);
  await file(directory, '.plumber/ledger.jsonl', '{broken\n');
  await file(directory, 'plumber.config.ts', 'export default { unknown: true };\n');
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
  assert.match(output, /fix  Ledger:.*plumber accept-decisions/);
  const ledger = await entries(directory);
  ledger.push({ key: 'handwritten', kind: 'exception' });
  await file(directory, '.plumber/ledger.jsonl', ledger.map(JSON.stringify).join('\n') + '\n');
  output = run(directory, ['doctor'], 1).stdout;
  assert.match(output, /plumber accept <key> --why/);
});

test('doctor reports unsupported Tailwind, missing CSS entry and unusable cache separately', async t => {
  const directory = await fixture(t);
  await file(directory, 'src/styles.css', '@import "tailwindcss";\n');
  await file(directory, 'node_modules/tailwindcss/package.json', '{"name":"tailwindcss","version":"3.4.0"}\n');
  let output = run(directory, ['doctor'], 1).stdout;
  assert.match(output, /fix  Tailwind: 3.4.0. Use Tailwind 4/);
  await file(directory, 'plumber.config.ts', 'export default { css: "missing.css" };\n');
  await rm(join(directory, '.cache'), { recursive: true, force: true });
  await file(directory, '.cache', 'not a directory');
  output = run(directory, ['doctor'], 1).stdout;
  assert.match(output, /fix  CSS entry:.*missing.css/);
  assert.match(output, /fix  Cache:.*PLUMBER_CACHE_DIR/);
  assert.equal(output.trim().split('\n').length, 6);
});

for (const version of [null, '3.4.19']) {
  test(`CLI gives doctor's Tailwind fix for ${version ?? 'missing installation'} without internal errors`, async t => {
    const directory = await fixture(t);
    await file(directory, 'src/styles.css', '@import "tailwindcss";\n');
    if (version) await file(directory, 'node_modules/tailwindcss/package.json', JSON.stringify({ name: 'tailwindcss', version }));
    const doctor = run(directory, ['doctor'], 1).stdout;
    const fix = /fix  Tailwind: [^.]+(?:\.[\d]+)*\. (Use Tailwind 4[^\n]+)/.exec(doctor)?.[1];
    assert.equal(fix, 'Use Tailwind 4 in the project containing the CSS entry.');
    for (const args of [[], ['check'], ['check', '--json']]) {
      const result = run(directory, args, 2);
      assert.equal(result.stdout, '');
      assert.equal(result.stderr, `plumber: ${version ? `Tailwind ${version} is not supported.` : 'Tailwind is not installed.'} ${fix}\n`);
      assert.doesNotMatch(result.stderr, /Require stack|Cannot find module|Layer 1|Load project Tailwind|\n\s+at /);
    }
  });
}

test('overlay install explains missing React while plain CSS checks and install exit codes stay unchanged', async t => {
  const directory = await fixture(t);
  const original = await readFile(join(directory, 'src/styles.css'), 'utf8');
  const notice = 'React is not installed. Add React to this development project to read and write source with the overlay. Plain CSS checks work without React.';
  const advisory = run(directory, ['install', '--overlay']);
  assert.ok(advisory.stdout.startsWith(notice + '\n\n'));
  assert.equal(advisory.stderr, '');
  assert.equal(await readFile(join(directory, 'src/styles.css'), 'utf8'), original);
  run(directory, ['check']);
  const unsupportedWrite = run(directory, ['install', '--overlay', '--write'], 2);
  assert.ok(unsupportedWrite.stderr.includes(notice));
  assert.doesNotMatch(unsupportedWrite.stderr, /Require stack|\n\s+at /);
  await file(directory, 'package.json', '{"dependencies":{"vite":"*"}}');
  await file(directory, 'vite.config.mjs', 'export default {};\n');
  const write = run(directory, ['install', '--overlay', '--write']);
  assert.ok(write.stdout.startsWith(notice + '\n\n'));
  assert.match(write.stdout, /Wrote vite.config.mjs/);
  assert.equal(write.stderr, '');
});

test('packaged CLI never uses its enclosing consumer repository HEAD as a React Plumber action pin', async t => {
  // Simulate package files inside someone else's Git tree, with existing
  // dependencies linked for reads. No package installation or download.
  const packageRoot = await mkdtemp(join(root, 'fixtures/.adoption-package-'));
  t.after(() => rm(packageRoot, { recursive: true, force: true }));
  await cp(join(root, 'dist'), join(packageRoot, 'dist'), { recursive: true });
  await cp(join(root, 'package.json'), join(packageRoot, 'package.json'));
  await cp(join(root, 'skills'), join(packageRoot, 'skills'), { recursive: true });
  await cp(join(root, 'action.yml'), join(packageRoot, 'action.yml'));
  await symlink(join(root, 'node_modules'), join(packageRoot, 'node_modules'));
  const directory = await fixture(t);
  await file(directory, 'skills/plumber/SKILL.md', 'Consumer decoy skill.');
  run(directory, ['install', '--ci', '--agent', 'claude'], 0, join(packageRoot, 'dist/cli.js'));
  assert.equal(await readFile(join(directory, '.claude/skills/plumber/SKILL.md'), 'utf8'),
    await readFile(join(packageRoot, 'skills/plumber/SKILL.md'), 'utf8'));
  const workflow = await readFile(join(directory, '.github/workflows/plumb.yml'), 'utf8');
  assert.match(workflow, /uses: unlocalhosted\/plumb@v0\.1\.0/);
  assert.doesNotMatch(workflow, /@main/);
});

const skill = await readFile(join(root, 'skills/plumber/SKILL.md'), 'utf8');
const skillBody = skill.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
const instructionTargets = ['.claude/skills/plumber/SKILL.md', 'AGENTS.md', '.cursor/rules/plumber.mdc', '.github/copilot-instructions.md', 'GEMINI.md', '.windsurf/rules/plumber.md'];
const allTargets = [...instructionTargets, '.claude/settings.json', '.cursor/hooks.json'];
const snapshot = async (directory, targets = allTargets) => Promise.all(targets.map(path => readFile(join(directory, path), 'utf8')));
const stripFrontmatter = text => text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
const fenced = text => text.split('<!-- plumb:start -->\n')[1].split('<!-- plumb:end -->')[0];

test('all six agent markers install exact packaged instructions, replace only blocks, and reinstall without writes', async t => {
  const directory = await fixture(t);
  const prefix = '# Team\r\nPreserve prefix.\r\n';
  const suffix = '\r\nPreserve suffix without final newline.';
  for (const name of ['AGENTS.md', '.github/copilot-instructions.md', 'GEMINI.md']) {
    await file(directory, name, prefix + '<!-- plumb:start -->\nold instructions\n<!-- plumb:end -->' + suffix);
  }
  await file(directory, '.claude/settings.json', '{"permissions":{"allow":["Read"]}}\n');
  await file(directory, '.cursor/hooks.json', '{"version":1,"hooks":{"afterFileEdit":[{"command":"format"}]}}\n');
  await mkdir(join(directory, '.windsurf'));
  // A decoy in cwd must never become the installed source.
  await file(directory, 'skills/plumber/SKILL.md', 'Consumer skill: do not copy.\n');
  const before = await snapshot(directory, ['AGENTS.md', '.github/copilot-instructions.md', 'GEMINI.md', '.claude/settings.json', '.cursor/hooks.json']);
  const preview = run(directory, ['install', '--list']).stdout;
  assert.match(preview, /Agents: Claude Code, Cursor, Codex, Copilot, Gemini CLI, Windsurf/);
  for (const path of allTargets) assert.ok(preview.includes(`Would write ${path}.`), preview);
  assert.deepEqual(await snapshot(directory, ['AGENTS.md', '.github/copilot-instructions.md', 'GEMINI.md', '.claude/settings.json', '.cursor/hooks.json']), before);
  for (const path of [instructionTargets[0], instructionTargets[2], instructionTargets[5], '.cache', 'PLUMBER.md']) {
    await assert.rejects(readFile(join(directory, path)), { code: 'ENOENT' });
  }
  const output = run(directory, ['install']).stdout;
  for (const path of instructionTargets) assert.ok(output.includes(`Wrote ${path}.`));
  const contents = await snapshot(directory);
  assert.equal(contents[0], skill);
  for (const i of [1, 3, 4]) {
    assert.equal(fenced(contents[i]), skillBody);
    assert.equal(contents[i], prefix + '<!-- plumb:start -->\n' + skillBody + '<!-- plumb:end -->' + suffix);
  }
  assert.equal(stripFrontmatter(contents[2]), skillBody);
  assert.match(contents[2], /^---\ndescription: .+\nglobs: \*\*\/\*\.tsx,\*\*\/\*\.jsx,\*\*\/\*\.ts,\*\*\/\*\.js,\*\*\/\*\.css\nalwaysApply: false\n---\n/);
  assert.equal(contents[5], '---\ntrigger: always_on\n---\n' + skillBody);
  assert.deepEqual(JSON.parse(contents[6]).permissions, { allow: ['Read'] });
  assert.equal(JSON.parse(contents[7]).hooks.afterFileEdit[0].command, 'format');
  const again = run(directory, ['install']).stdout;
  assert.doesNotMatch(again, /Wrote |\+\+\+/);
  assert.deepEqual(await snapshot(directory), contents);
  // Dedicated React Plumber files update when stale; unrelated rules survive.
  await file(directory, '.cursor/rules/team.mdc', 'Team rule stays.');
  await file(directory, '.cursor/rules/plumber.mdc', 'Stale React Plumber rule.');
  assert.match(run(directory, ['install']).stdout, /Wrote .cursor\/rules\/plumber.mdc/);
  assert.equal(await readFile(join(directory, '.cursor/rules/plumber.mdc'), 'utf8'), contents[2]);
  assert.equal(await readFile(join(directory, '.cursor/rules/team.mdc'), 'utf8'), 'Team rule stays.');
});

test('forcing each agent without detection installs only its own format and supported hook', async t => {
  for (const [agent, target] of [['claude', instructionTargets[0]], ['codex', instructionTargets[1]], ['generic', instructionTargets[1]], ['cursor', instructionTargets[2]], ['copilot', instructionTargets[3]], ['gemini', instructionTargets[4]], ['windsurf', instructionTargets[5]]]) {
    const directory = await fixture(t);
    const preview = run(directory, ['--root', directory, 'install', '--list', '--agent', agent]).stdout;
    assert.match(preview, /Agents: none detected/);
    assert.ok(preview.includes(`Would write ${target}.`));
    const output = run(directory, ['install', '--agent', agent]).stdout;
    assert.ok(output.includes(`Wrote ${target}.`));
    const installed = await readFile(join(directory, target), 'utf8');
    assert.equal(agent === 'claude' ? stripFrontmatter(installed) : ['cursor', 'windsurf'].includes(agent) ? stripFrontmatter(installed) : fenced(installed), skillBody);
    const expected = [target, ...agent === 'claude' ? ['.claude/settings.json'] : agent === 'cursor' ? ['.cursor/hooks.json'] : []];
    for (const path of [...allTargets, 'PLUMBER.md', 'CLAUDE.md'].filter(path => !expected.includes(path))) {
      await assert.rejects(readFile(join(directory, path)), { code: 'ENOENT' });
    }
    const bytes = await snapshot(directory, expected);
    assert.doesNotMatch(run(directory, ['install', '--agent', agent]).stdout, /Wrote |\+\+\+/);
    assert.deepEqual(await snapshot(directory, expected), bytes);
  }
});

test('repeatable forced agents augment detection; invalid targets and missing names fail before writes', async t => {
  const directory = await fixture(t);
  await mkdir(join(directory, '.gemini'));
  for (const args of [['install', '--agent', 'unknown'], ['install', '--agent'], ['install', '--agent=']]) run(directory, args, 2);
  for (const path of allTargets) await assert.rejects(readFile(join(directory, path)), { code: 'ENOENT' });
  const output = run(directory, ['install', '--agent', 'claude', '--agent=cursor', '--agent', 'cursor']).stdout;
  for (const path of [instructionTargets[0], instructionTargets[2], instructionTargets[4]]) assert.ok(output.includes(`Wrote ${path}.`));
  await assert.rejects(readFile(join(directory, 'AGENTS.md')), { code: 'ENOENT' });
});

test('no detected agents creates only AGENTS.md and reinstallation preserves bytes', async t => {
  const directory = await fixture(t);
  const preview = run(directory, ['install', '--list']).stdout;
  assert.match(preview, /Agents: none detected/);
  assert.equal(preview.match(/Would write .+/g)?.join('\n'), 'Would write AGENTS.md.');
  run(directory, ['install']);
  const agents = await readFile(join(directory, 'AGENTS.md'), 'utf8');
  assert.equal(fenced(agents), skillBody);
  assert.doesNotMatch(run(directory, ['install']).stdout, /Wrote /);
  assert.equal(await readFile(join(directory, 'AGENTS.md'), 'utf8'), agents);
  for (const path of [...allTargets, 'PLUMBER.md', 'CLAUDE.md', '.cache'].filter(path => path !== 'AGENTS.md')) await assert.rejects(readFile(join(directory, path)), { code: 'ENOENT' });
});

test('malformed marked instructions and hook settings cause no partial install', async t => {
  for (const malformed of ['<!-- plumb:start -->\nOnly start.', '<!-- plumb:end -->', '<!-- plumb:end -->\n<!-- plumb:start -->', '<!-- plumb:start --><!-- plumb:end --><!-- plumb:start --><!-- plumb:end -->']) {
    const directory = await fixture(t);
    await file(directory, 'AGENTS.md', malformed);
    await mkdir(join(directory, '.claude'));
    assert.match(run(directory, ['install'], 2).stderr, /Invalid React Plumber markers/);
    assert.equal(await readFile(join(directory, 'AGENTS.md'), 'utf8'), malformed);
    await assert.rejects(readFile(join(directory, instructionTargets[0])), { code: 'ENOENT' });
    await assert.rejects(readFile(join(directory, '.claude/settings.json')), { code: 'ENOENT' });
  }
  const directory = await fixture(t);
  await file(directory, '.cursor/hooks.json', '{broken');
  run(directory, ['install', '--agent', 'claude'], 2);
  await assert.rejects(readFile(join(directory, instructionTargets[0])), { code: 'ENOENT' });
  await assert.rejects(readFile(join(directory, '.claude/settings.json')), { code: 'ENOENT' });
});
