import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { cp, mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));
const cli = join(root, 'dist/cli.js');
function run(directory, args = [], status = 0, env = {}) {
  const result = spawnSync(process.execPath, [cli, '--root', directory, ...args], { encoding: 'utf8', timeout: 20000, env: { ...process.env, ...env } });
  assert.ifError(result.error); assert.equal(result.status, status, result.stderr || result.stdout); return result;
}
async function fixture(t) {
  const directory = await mkdtemp(join(root, 'fixtures/.surfaces-e2e-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await cp(join(root, 'fixtures/surfaces'), directory, { recursive: true });
  return directory;
}
function git(directory, ...args) {
  const result = spawnSync('git', ['-C', directory, ...args], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr); return result.stdout.trim();
}
async function history(directory) {
  git(directory, 'init', '-q'); git(directory, 'config', 'user.name', 'Surface Fixture'); git(directory, 'config', 'user.email', 'surface@example.test');
  await writeFile(join(directory, '.gitignore'), '.plumb-cache/\nnode_modules/\n');
  git(directory, 'add', '.'); git(directory, 'commit', '-qm', 'fixture baseline');
}
const report = (directory, args = [], status = 0) => JSON.parse(run(directory, [...args, '--json'], status).stdout);

test('SARIF 2.1.0 has required fields, rule help and per-site baseline/fingerprints', async t => {
  const directory = await fixture(t);
  run(directory, ['baseline']);
  await writeFile(join(directory, 'src/App.tsx'), 'export function App() { return <><div className="gap-10" /><div className="gap-10" /></>; }\n');
  const data = report(directory, [], 1);
  const sarif = JSON.parse(run(directory, ['--sarif'], 1).stdout);
  assert.equal(sarif.version, '2.1.0'); assert.match(sarif.$schema, /sarif-2\.1\.0/); assert.equal(sarif.runs.length, 1);
  const { tool, results, columnKind } = sarif.runs[0];
  assert.equal(tool.driver.name, 'plumb'); assert.equal(typeof tool.driver.version, 'string'); assert.equal(columnKind, 'utf16CodeUnits');
  assert.equal(results.length, data.findings.reduce((n, f) => n + f.sites.length, 0));
  const drift = results.filter(r => r.ruleId === 'provenance/spacing');
  const dead = results.filter(r => r.ruleId === 'dead/spacing');
  assert.equal(results.length, drift.length + dead.length);
  assert.deepEqual(drift.map(r => r.baselineState).sort(), ['new', 'unchanged']);
  assert.equal(dead.length, 1);
  assert.equal(dead[0].level, 'note'); assert.equal(dead[0].baselineState, 'unchanged');
  assert.equal(dead[0].locations[0].physicalLocation.artifactLocation.uri, 'src/styles.css');
  assert.ok(dead[0].properties.ledgerKey.startsWith('dead/spacing:'));
  for (const result of drift) {
    const rule = tool.driver.rules[result.ruleIndex]; assert.equal(result.ruleId, rule.id);
    assert.ok(rule.shortDescription.text); assert.ok(rule.fullDescription.text); assert.ok(rule.help.text.includes('related parts'));
    assert.ok(result.message.text); assert.ok(['error', 'warning', 'note'].includes(result.level));
    const location = result.locations[0].physicalLocation;
    assert.equal(location.artifactLocation.uri, 'src/App.tsx');
    assert.ok(Number.isInteger(location.region.startLine) && location.region.startLine > 0);
    assert.ok(Number.isInteger(location.region.startColumn) && location.region.startColumn > 0);
    assert.match(result.partialFingerprints['plumb/ledgerKey/v1'], /^[a-f0-9]{64}$/);
    assert.ok(result.properties.ledgerKey.startsWith('provenance/spacing:'));
  }
  assert.equal(results[0].partialFingerprints['plumb/ledgerKey/v1'], results[1].partialFingerprints['plumb/ledgerKey/v1']);
});

test('GitHub annotates only new scoped sites, writes summary sections and compares base coverage', async t => {
  const directory = await fixture(t);
  run(directory, ['baseline']); await history(directory);
  await writeFile(join(directory, 'src/App.tsx'), 'export function App() { return <><div className="gap-10" /><div className="gap-10" /></>; }\n');
  const summary = join(directory, 'summary.md'); await writeFile(summary, 'Existing step summary.\n');
  const result = run(directory, ['--base', 'HEAD', '--format', 'github'], 1, { GITHUB_STEP_SUMMARY: summary });
  const commands = result.stdout.split('\n').filter(line => line.startsWith('::'));
  assert.equal(commands.length, 1); assert.match(commands[0], /^::error file=src\/App.tsx,line=1,col=\d+,title=gap 10px isn't on your spacing scale::/);
  const markdown = await readFile(summary, 'utf8');
  assert.match(markdown, /^Existing step summary\./); assert.match(markdown, /1 new, 0 fixed, 2 debt/); assert.match(markdown, /spacing: 0\/2 \(0%\); \+0 pp vs base/);
  assert.match(markdown, /color: no decisions/); assert.match(markdown, /0 growth lines/);
  // Newly untracked files are included, while unchanged old findings stay out of commands.
  git(directory, 'restore', 'src/App.tsx'); await writeFile(join(directory, 'src/New.tsx'), 'export const New = () => <div className="gap-10" />;');
  const changed = run(directory, ['--changed', '--format', 'github'], 1);
  assert.match(changed.stdout, /::error file=src\/New.tsx/); assert.doesNotMatch(changed.stdout, /::error file=src\/App.tsx/);
});

test('GitHub annotation properties and messages escape authored filenames and reasons', async t => {
  const directory = await fixture(t);
  await writeFile(join(directory, 'src/App.tsx'), 'export const App = () => <div />;');
  const css = join(directory, 'src/styles.css');
  await writeFile(css, (await readFile(css, 'utf8')).replace('related parts', 'tight 50% labels\n::error file=spoof::bad'));
  await writeFile(join(directory, 'src/odd,%:name.tsx'), 'export const Odd = () => <div className="gap-10" />;');
  const output = run(directory, ['--format', 'github'], 1).stdout;
  const commands = output.split('\n').filter(line => line.startsWith('::'));
  assert.equal(commands.length, 2);
  const errors = commands.filter(line => line.startsWith('::error'));
  assert.equal(errors.length, 1); assert.match(errors[0], /file=src\/odd%2C%25%3Aname.tsx/);
  assert.match(errors[0], /50%25/); assert.doesNotMatch(output, /\n::error file=spoof/);
  assert.equal(commands.filter(line => line.startsWith('::notice') && line.includes('spacing tokens are never used in')).length, 1);
});

test('summary fixed count and positive coverage delta come from actual base declarations', async t => {
  const directory = await fixture(t); run(directory, ['baseline']); await history(directory);
  await writeFile(join(directory, 'src/App.tsx'), 'export function App() { return <div className="gap-step-small" />; }');
  const result = run(directory, ['--base', 'HEAD', '--format', 'github']);
  assert.match(result.stdout, /0 new, 2 fixed, 0 debt/); assert.match(result.stdout, /spacing: 1\/1 \(100%\); \+100 pp vs base/);
});

test('scripted agent applies exact new gap-10 edit, reaches 0 new and preserves ledger', async t => {
  const directory = await fixture(t);
  const file = join(directory, 'src/App.tsx'); await writeFile(file, 'export function App() { return <div />; }\n');
  run(directory, ['baseline']); await history(directory);
  const ledgerFile = join(directory, '.plumb/ledger.jsonl'); const ledgerBefore = await readFile(ledgerFile, 'utf8');
  await writeFile(file, 'export function App() { return <div className="gap-10" />; }\n');
  const output = run(directory, ['--changed', '--agent'], 1).stdout;
  assert.match(output, /1 new/); assert.match(output, /Sites: src\/App.tsx:1:/); assert.match(output, /Compiles to: gap: 10px/);
  assert.match(output, /- 8px: use gap-step-small or gap: var\(--spacing-step-small\); why: related parts/);
  assert.match(output, /NEEDS-DECISION/); assert.match(output, /Do not edit plumb.config.ts/); assert.match(output, /Never add a token/);
  const edit = output.match(/Edit: replace `([^`]+)` with `([^`]+)` at src\/App.tsx:1:(\d+)\./);
  assert.ok(edit, output);
  const source = await readFile(file, 'utf8');
  const offset = Number(edit[3]) - 1; assert.equal(source.slice(offset, offset + edit[1].length), edit[1]);
  await writeFile(file, source.slice(0, offset) + edit[2] + source.slice(offset + edit[1].length));
  assert.match(run(directory, ['--changed', '--agent', '--strict-ledger']).stdout, /^0 new/);
  assert.equal(await readFile(ledgerFile, 'utf8'), ledgerBefore);
});

test('agent excludes debt, preserves variants, and does not choose among multiple decisions', async t => {
  const directory = await fixture(t); run(directory, ['baseline']);
  const file = join(directory, 'src/App.tsx');
  await writeFile(file, 'export function App() { return <><div className="gap-10" /><div className="hover:gap-10!" /></>; }');
  let output = run(directory, ['--agent'], 1).stdout;
  assert.match(output, /replace `hover:gap-10!` with `hover:gap-step-small!`/);
  assert.doesNotMatch(output, /replace `gap-10`/);
  const css = join(directory, 'src/styles.css'); await writeFile(css, (await readFile(css, 'utf8')).replace('--spacing: 1px;', '--spacing: 1px;\n /* why: separate groups */ --spacing-step-large: 12px;'));
  output = run(directory, ['--agent'], 1).stdout;
  // Two close decisions: both edits are offered as options and Plumb does not pick one.
  assert.match(output, /Choose a token using its reason/);
  assert.match(output, /replace `hover:gap-10!` with `hover:gap-step-small!`  \(8px\)/);
  assert.match(output, /replace `hover:gap-10!` with `hover:gap-step-large!`  \(12px\)/);
  assert.doesNotMatch(output, /Edit: replace `hover:gap-10!`/);
});

test('agent never announces 0 new while strict config or unaccepted decisions fail', async t => {
  const directory = await fixture(t); run(directory, ['baseline']); await history(directory);
  const config = join(directory, 'plumb.config.ts');
  await writeFile(config, (await readFile(config, 'utf8')).replace("css: 'src/styles.css',", "css: 'src/styles.css',\n markers: ['branch-only'],"));
  const output = run(directory, ['--changed', '--agent', '--strict-ledger'], 1).stdout;
  assert.doesNotMatch(output, /^0 new/); assert.match(output, /New exceptions and tokens/); assert.match(output, /NEEDS-DECISION/);
  git(directory, 'restore', 'plumb.config.ts');
  const css = join(directory, 'src/styles.css');
  await writeFile(css, (await readFile(css, 'utf8')).replace('--spacing: 1px;', '--spacing: 1px; --spacing-step-large: 12px;'));
  const decisionOutput = run(directory, ['--changed', '--agent'], 1).stdout;
  assert.doesNotMatch(decisionOutput, /^0 new/); assert.match(decisionOutput, /decisions\/unaccepted/);
  assert.doesNotMatch(decisionOutput, /Edit: Run plumb accept-decisions/);
});

test('agent-docs derives whys from decisions, enabled habits and shared loop; absent ownership works', async t => {
  const directory = await fixture(t);
  const printed = run(directory, ['agent-docs']).stdout;
  assert.match(printed, /Add this block to AGENTS.md or CLAUDE.md/);
  const file = join(directory, 'PLUMB.md'); const before = await readFile(file, 'utf8');
  assert.match(before, /--spacing-step-small: 8px/); assert.match(before, /Why: related parts/);
  assert.match(before, /Identity: value/); assert.match(before, /No component ownership data/);
  assert.match(before, /team-spacing\. Why: Keep related parts together/); assert.match(before, /stop when it prints "0 new"/);
  const css = join(directory, 'src/styles.css'); await writeFile(css, (await readFile(css, 'utf8')).replace('related parts', 'tight labels'));
  run(directory, ['agent-docs']); const after = await readFile(file, 'utf8');
  assert.equal(after, before.replace('related parts', 'tight labels'));
});

test('install --hooks merges settings, preserves existing hooks and stays idempotent', async t => {
  const directory = await fixture(t);
  await mkdir(join(directory, '.claude')); await mkdir(join(directory, '.cursor'));
  const original = { permissions: { allow: ['Read'] }, env: { TEAM: 'kept' }, hooks: { Stop: [{ hooks: [{ type: 'command', command: 'echo done' }] }], PostToolUse: [{ matcher: 'Write', hooks: [{ type: 'command', command: 'format' }] }] } };
  const cursor = { version: 1, team: 'kept', hooks: { beforeShellExecution: [{ command: 'audit' }], afterFileEdit: [{ command: 'format' }] } };
  const claudeFile = join(directory, '.claude/settings.json'), cursorFile = join(directory, '.cursor/hooks.json');
  await writeFile(claudeFile, JSON.stringify(original)); await writeFile(cursorFile, JSON.stringify(cursor));
  const result = run(directory, ['install', '--hooks']); assert.match(result.stdout, /--- .*settings.json/); assert.match(result.stdout, /\+.*Edit\|Write\|MultiEdit/);
  const merged = JSON.parse(await readFile(claudeFile, 'utf8')), mergedCursor = JSON.parse(await readFile(cursorFile, 'utf8'));
  assert.deepEqual(merged.permissions, original.permissions); assert.deepEqual(merged.env, original.env); assert.deepEqual(merged.hooks.Stop, original.hooks.Stop);
  assert.deepEqual(merged.hooks.PostToolUse[0], original.hooks.PostToolUse[0]);
  assert.equal(merged.hooks.PostToolUse[1].hooks[0].command, 'plumb check --changed --agent --strict-ledger');
  assert.deepEqual(mergedCursor.hooks.beforeShellExecution, cursor.hooks.beforeShellExecution); assert.equal(mergedCursor.team, 'kept'); assert.equal(mergedCursor.hooks.afterFileEdit.length, 2);
  const before = await readFile(claudeFile, 'utf8'); assert.match(run(directory, ['install', '--hooks']).stdout, /unchanged/); assert.equal(await readFile(claudeFile, 'utf8'), before);
  await writeFile(cursorFile, '{bad'); assert.match(run(directory, ['install', '--hooks'], 2).stderr, /Invalid JSON/); assert.equal(await readFile(claudeFile, 'utf8'), before);
});

test('surfaces reject conflicting formats and invalid hook/scope flags', async t => {
  const directory = await fixture(t);
  for (const args of [['--agent', '--json'], ['--format', 'nope'], ['--base', 'HEAD', '--changed'], ['install'], ['check', '--hooks']]) run(directory, args, 2);
});

test('approval script checks recorded GitHub API review states and author exemption', async t => {
  const directory = await fixture(t);
  const original = JSON.parse(await readFile(join(root, 'fixtures/github-api/reviews.json'), 'utf8'));
  const cases = [
    [original, true],
    [{ ...original, reviews: [] }, false],
    [{ ...original, growth: 0, reviews: [] }, true],
    [{ ...original, approvers: '', reviews: [] }, false],
    [{ ...original, pullRequest: { ...original.pullRequest, user: { login: 'OWNER' } }, reviews: [] }, true],
    ...['CHANGES_REQUESTED', 'DISMISSED'].map(state => [{ ...original, reviews: [...original.reviews, { id: 103, user: { login: 'designer' }, state, submitted_at: '2026-10-08T12:02:00Z' }] }, false]),
    [{ ...original, reviews: [...original.reviews, { id: 104, user: { login: 'stranger' }, state: 'APPROVED', submitted_at: '2026-10-08T12:02:00Z' }] }, true],
  ];
  for (const [data, ok] of cases) {
    const file = join(directory, 'api.json'); await writeFile(file, JSON.stringify(data));
    const result = spawnSync(process.execPath, [join(root, 'scripts/action/approval.mjs'), file], { encoding: 'utf8' });
    assert.equal(result.status, ok ? 0 : 1, result.stderr); const output = JSON.parse(result.stdout); assert.equal(output.ok, ok);
    if (!ok) assert.match(output.message, /Ledger grew.*Approval required/);
  }
});

function subprocess(file, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [file], { env: { ...process.env, ...env } }); let stdout = '', stderr = '';
    child.stdout.on('data', chunk => stdout += chunk); child.stderr.on('data', chunk => stderr += chunk); child.on('error', reject);
    child.on('close', status => resolve({ status, stdout, stderr }));
  });
}
test('Action runs real CLI against fixture PR, creates then updates sticky comment and gates ledger approval', async t => {
  const directory = await fixture(t); run(directory, ['baseline']); await history(directory);
  run(directory, ['accept', '--rule', 'provenance/spacing', '--site', 'src/App.tsx:2', '--why', 'reviewed specimen']);
  const recorded = JSON.parse(await readFile(join(root, 'fixtures/github-api/reviews.json'), 'utf8'));
  let reviews = [], comments = [{ id: 9, user: { login: 'attacker' }, body: '<!-- plumb-summary -->\nspoof' }];
  const requests = [];
  const server = createServer(async (req, res) => {
    let body = ''; for await (const chunk of req) body += chunk;
    requests.push({ method: req.method, url: req.url, body }); res.setHeader('Content-Type', 'application/json');
    if (req.method === 'GET') {
      res.end(JSON.stringify(req.url.includes('/reviews?') ? reviews : req.url.includes('/comments?') ? comments : recorded.pullRequest));
    } else {
      const content = JSON.parse(body); const comment = { id: 10, user: { login: 'github-actions[bot]' }, body: content.body };
      comments = [...comments.filter(c => c.id !== 10), comment]; res.end(JSON.stringify(comment));
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); t.after(() => new Promise(resolve => server.close(resolve)));
  const eventFile = join(directory, 'event.json'); await writeFile(eventFile, JSON.stringify({ repository: { full_name: 'fixture/project' }, pull_request: { ...recorded.pullRequest, base: { sha: git(directory, 'rev-parse', 'HEAD') } } }));
  const env = { PLUMB_WORKING_DIRECTORY: directory, GITHUB_EVENT_PATH: eventFile, GITHUB_TOKEN: 'fixture-token', GITHUB_API_URL: `http://127.0.0.1:${server.address().port}`, PLUMB_LEDGER_APPROVERS: 'designer', GITHUB_STEP_SUMMARY: join(directory, 'step.md') };
  let result = await subprocess(join(root, 'scripts/action/run.mjs'), env);
  assert.equal(result.status, 1, result.stderr); assert.match(result.stderr, /Approval required from @designer/);
  assert.ok(requests.some(r => r.method === 'POST' && r.url.endsWith('/issues/42/comments')));
  assert.match(comments.find(c => c.id === 10).body, /1 growth lines/); assert.match(await readFile(env.GITHUB_STEP_SUMMARY, 'utf8'), /vs base/);
  reviews = recorded.reviews;
  result = await subprocess(join(root, 'scripts/action/run.mjs'), env);
  assert.equal(result.status, 0, result.stderr); assert.ok(requests.some(r => r.method === 'PATCH' && r.url.endsWith('/issues/comments/10')));
  assert.equal(requests.filter(r => r.method === 'POST').length, 1); assert.match(comments.find(c => c.id === 10).body, /Ledger growth approved/);
});
