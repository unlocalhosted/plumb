import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { appendFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { reportFixture } from './report-fixture.mjs';

const repo = fileURLToPath(new URL('../', import.meta.url));
const cli = join(repo, 'dist/cli.js');
function run(root, args = [], options = {}) {
  const env = { ...process.env, CI: '1', COLUMNS: '100', ...options.env };
  const result = spawnSync(process.execPath, [...(options.replay ? ['--import', join(repo, 'e2e/fixtures/report-before/replay.mjs')] : []), cli, '--root', root, ...args],
    { cwd: repo, encoding: 'utf8', timeout: 15000, env });
  assert.ifError(result.error);
  assert.ok([0, 1].includes(result.status), result.stderr);
  assert.equal(result.stderr, '');
  return result;
}
const titles = output => [...output.matchAll(/^  [!✗·]  (.*?) {2,}/gm)].map(match => match[1]).sort();
const expectSubset = (root, args, findings) => {
  const result = run(root, args);
  const labelsForFamily = {color:'colour',elevation:'shadow',z:'z-index'};
  const subjects = new Map();
  for (const f of findings) {
    const family = labelsForFamily[f.family] ?? f.family;
    const values = f.rule.startsWith('config/') ? [family + ' setup'] : f.rule.startsWith('dead/') ? [family + ' tokens'] : f.rule === 'provenance/opaque-inline' ? ['runtime styles'] : f.rule === 'existence/dead-var' ? [f.title.match(/^`([^`]+)`/)[1]] : f.sites.map(s => s.text.replace(/\s+/g, ' ').trim());
    for (const value of values) subjects.set(f.rule.split('/')[0] + ':' + f.family + ':' + value, value);
  }
  const labels = titles(result.stdout);
  assert.equal(labels.length, subjects.size, args.join(' '));
  for (const label of labels) assert.ok([...subjects.values()].some(subject => subject === label || label.endsWith('…') && subject.startsWith(label.slice(0, -1))), label);
  return result.stdout;
};
const wrappedLines = output => output.trimEnd().split('\n').reduce((n, line) => n + Math.max(1, Math.ceil([...line].length / 100)), 0);

test('large first-run summary fits one screen and every detail command selects its exact subset', async t => {
  const root = await reportFixture(t);
  const report = JSON.parse(run(root, ['--json']).stdout);
  const result = run(root);
  assert.equal(result.status, 1, 'configured first run retains failing exit status');
  const output = result.stdout;
  assert.ok(wrappedLines(output) <= 40, `${wrappedLines(output)} wrapped lines\n${output}`);
  assert.match(output, /^React Plumber  .* · Tailwind 4\.3 · theme src\/styles.css · 34 files · \d+\.\ds\n/);
  assert.ok(output.indexOf('On your tokens') < output.indexOf('Fix first'));
  assert.ok(output.indexOf('✗') < output.indexOf('!'));
  assert.ok(output.indexOf('!') < output.indexOf('component override'));
  assert.ok(output.indexOf('component override') < output.indexOf('values off your tokens'));
  assert.match(output, /This is your first run[\s\S]*plumber baseline[\s\S]*Alt\+B in dev/);
  assert.doesNotMatch(output, /Why\n|Intended\?|\x1b|[█░]/);
  const coverage = [...output.matchAll(/^  (spacing|color|radius|type|motion|elevation|z)\s+(\d+)%/gm)].map(match => Number(match[2]));
  assert.equal(coverage.length, 7);
  assert.deepEqual(coverage, [...coverage].sort((a, b) => a - b));
  const subsets = {
    '--broken': report.findings.filter(f => f.rule.startsWith('existence/')),
    '--rule config': report.findings.filter(f => f.rule.startsWith('config/')),
    '--rule ownership': report.findings.filter(f => f.rule.startsWith('ownership/')),
    '--rule provenance': report.findings.filter(f => f.rule.startsWith('provenance/') && f.rule !== 'provenance/opaque-inline'),
  };
  const commands = [...output.matchAll(/plumber check (--[^\n]+)/g)].map(match => match[1]);
  assert.equal(commands.length, 4);
  for (const command of commands) {
    assert.ok(subsets[command], command);
    const detail = expectSubset(root, command.split(' '), subsets[command]);
    if (command === '--rule config') for (const hint of Object.values(report.configHints)) assert.ok(detail.replace(/\s+/g, ' ').includes(hint));
  }
  const color = report.findings.filter(f => f.family === 'color');
  expectSubset(root, ['--family', 'color'], color);
  expectSubset(root, ['--family', 'color', '--file', 'src/pages/Page0.tsx'], color.filter(f => f.sites.some(s => s.file.endsWith('/Page0.tsx'))));
  const files = expectSubset(root, ['--file', 'src/pages/**'], report.findings.filter(f => f.sites.some(s => s.file.includes('/pages/'))));
  assert.doesNotMatch(files, /src\/styles.css:\d/);
  const all = run(root, ['--all']).stdout;
  assert.match(output, new RegExp(`--all \\(every finding, ${all.trimEnd().split('\n').length} lines\\)`));
  const detail = run(root, ['--file', 'src/**']).stdout;
  const blocks = detail.split('\n\nWhy\n');
  assert.equal(blocks.length, 2);
  assert.equal((detail.match(/Intended\?/g) ?? []).length, 1);
  assert.doesNotMatch(blocks[0], /intended\?|Your theme defines its own/);
  const whyRules = [...blocks[1].matchAll(/^  ([^:]+):/gm)].map(match => match[1]);
  assert.equal(new Set(whyRules).size, whyRules.length);
  assert.ok(detail.indexOf('browser applies nothing') < detail.indexOf('setup gap'));
  assert.ok(detail.indexOf('setup gap') < detail.indexOf('off your'));
  assert.match(run(root, ['--verbose']).stdout, /files 33 tsx, 0 jsx, 1 css, 0 other/);
  const noColor = run(root, [], { env: { NO_COLOR: '1' } }).stdout;
  assert.doesNotMatch(noColor, /\x1b|[█░]/);
  const pty = noColor => {
    const env = { ...process.env, CI: '1' };
    delete env.NO_COLOR;
    if (noColor) env.NO_COLOR = '1';
    const result = spawnSync('python3', [join(repo, 'e2e/helpers/cli-pty.py')], { encoding: 'utf8', timeout: 15000,
      input: JSON.stringify({ command: [process.execPath, cli, '--root', root], cwd: repo, env, columns: 100, stdoutTTY: true }) });
    assert.ifError(result.error); assert.equal(result.status, 0, result.stderr);
    return JSON.parse(result.stdout).stdout;
  };
  assert.match(pty(false), /[█░]/);
  assert.doesNotMatch(pty(true), /\x1b|[█░]/);
});

test('ledger default shows only new sites, caps groups, and keeps debt available through combined filters', async t => {
  const root = await reportFixture(t);
  run(root, ['baseline']);
  const clean = run(root).stdout;
  assert.match(clean, /0 new findings\nno findings/);
  assert.doesNotMatch(clean, /first run|Intended\?/);
  await appendFile(join(root, 'src/pages/Page0.tsx'), '\nexport const Added = () => <div className="p-[13px]" />;\n');
  await appendFile(join(root, 'src/pages/Page0.tsx'), '\nexport const Runtime = ({n}) => <div style={{left:n}} />;\n');
  await appendFile(join(root, 'src/pages/Page0.tsx'), Array.from({ length: 26 }, (_, i) => `\nexport const Extra${i} = () => <div style={{fontSize:${201 + i}}} />;`).join(''));
  const report = JSON.parse(run(root, ['--json']).stdout);
  const output = run(root).stdout;
  assert.equal(titles(output).length, 20);
  assert.match(output, /\+7 more: plumber check --new/);
  assert.match(output, /Known debt: \d+ findings, unchanged \(plumber check --debt\)/);
  assert.doesNotMatch(output, /src\/pages\/Page1.tsx:/);
  assert.doesNotMatch(output, /computed at runtime|never used in your source|provenance\/opaque-inline/);
  assert.match(run(root, ['--rule', 'provenance/opaque-inline']).stdout, /computed at runtime/);
  assert.equal((output.match(/Intended\?/g) ?? []).length, 1);
  assert.match(output, /--site "src\/pages\/Page0.tsx:\d+"/);
  const fresh = report.findings.filter(f => !f.rule.startsWith('dead/') && f.rule !== 'provenance/opaque-inline' && f.sites.some(s => s.ledger?.status === 'new' && s.inScope !== false));
  const debt = report.findings.filter(f => f.sites.some(s => s.ledger?.status === 'debt'));
  expectSubset(root, ['--new'], fresh);
  expectSubset(root, ['--debt'], debt);
  const mixed = run(root, ['--family', 'spacing', '--file', 'src/pages/Page0.tsx', '--new']).stdout;
  assert.equal(titles(mixed).length, 1);
  assert.match(mixed, /src\/pages\/Page0.tsx:\d+/);
  assert.match(mixed, /p-\[13px\]/);
  assert.doesNotMatch(mixed, /padding:13/);
  const old = run(root, ['--family', 'spacing', '--file', 'src/pages/Page0.tsx', '--debt']).stdout;
  assert.equal(titles(old).length, 3);
  assert.match(old, /runtime styles/, 'explicit debt details retain runtime information');
  const both = run(root, ['--new', '--debt']).stdout;
  assert.match(both, /no findings/);
});

test('frozen analyzer report changes human drawing and preserves every machine output byte', async () => {
  const root = join(repo, 'fixtures/ledger');
  const snapshot = join(repo, 'e2e/fixtures/report-before');
  const all = run(root, ['--all'], { replay: true }).stdout;
  assert.notEqual(all, await readFile(join(snapshot, 'all.txt'), 'utf8'));
  assert.match(all, /gap-10\s+off your spacing scale\s+3 sites in 1 file/);
  assert.equal((all.match(/Intended\?/g) ?? []).length, 1);
  const expected = JSON.parse(await readFile(join(snapshot, 'sha256.json'), 'utf8'));
  for (const [format, args] of Object.entries({ json: ['--json'], agent: ['--agent'], sarif: ['--sarif'], github: ['--format', 'github'] })) {
    const output = run(root, args, { replay: true }).stdout;
    assert.equal(createHash('sha256').update(output).digest('hex'), expected[format], format);
    // Detail flags are human-only; they must never alter machine output or exit status.
    const filtered = run(root, [...args, '--broken', '--family', 'color', '--new'], { replay: true });
    assert.equal(filtered.stdout, output, format);
    assert.equal(filtered.status, run(root, args, { replay: true }).status);
  }
});
