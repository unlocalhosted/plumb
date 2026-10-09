import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));
const cli = join(root, 'dist/cli.js');
function run(directory, args = [], status = 0) {
  const result = spawnSync(process.execPath, [cli, '--root', directory, ...args], { encoding: 'utf8', timeout: 20000,
    env: { ...process.env, PLUMB_CACHE_DIR: join(directory, '.plumb-cache') } });
  assert.ifError(result.error); assert.equal(result.status, status, result.stderr || result.stdout); return result;
}
async function fixture(t, name = 'review') {
  const directory = await mkdtemp(join(root, 'fixtures/.review-e2e-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await cp(join(root, 'fixtures', name), directory, { recursive: true }); return directory;
}
function git(directory, ...args) {
  const result = spawnSync('git', ['-C', directory, ...args], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr); return result.stdout.trim();
}
async function history(directory) {
  git(directory, 'init', '-q'); git(directory, 'config', 'user.name', 'Review Fixture'); git(directory, 'config', 'user.email', 'review@example.test');
  await writeFile(join(directory, '.gitignore'), '.plumb-cache/\nplumb/\n');
  git(directory, 'add', '.'); git(directory, 'commit', '-qm', 'fixture baseline'); return git(directory, 'rev-parse', 'HEAD');
}

test('fixture PR annotates new drift, touched debt and exception reasons on changed lines only', async t => {
  const directory = await fixture(t);
  run(directory, ['baseline']);
  run(directory, ['accept', '--rule', 'provenance/spacing', '--site', 'src/App.tsx:5', '--why', 'Specimen keeps 50% contrast.\n::error file=spoof::bad']);
  await history(directory);
  const file = join(directory, 'src/App.tsx'), source = await readFile(file, 'utf8');
  const check = JSON.parse(run(directory, ['--json']).stdout);
  const debt = check.findings.flatMap(f => f.sites).find(s => s.line === 4).ledger.key;
  await writeFile(file, source.replace('<div style={{ gap: 10 }}', '<div id="debt" style={{ gap: 10 }}')
    .replace('<div style={{ padding: 13 }}', '<div id="exception" style={{ padding: 13 }}')
    .replace('  </>;', '    <div style={{ gap: 17 }} />\n  </>;'));
  const output = run(directory, ['--base', 'HEAD', '--format', 'github'], 1).stdout;
  const annotations = output.split('\n').filter(line => line.startsWith('::'));
  assert.equal(annotations.length, 3, output);
  assert.equal(annotations.filter(line => line.startsWith('::error')).length, 1);
  assert.match(annotations.find(line => line.includes('Debt touched')), /::notice .*line=4,.*existing debt/);
  assert.ok(annotations.find(line => line.includes('Debt touched')).includes(debt));
  assert.match(annotations.find(line => line.includes('Exception touched')), /Reason: Specimen keeps 50%25 contrast\.%0A::error file=spoof::bad/);
  const current = JSON.parse(run(directory, ['--base', 'HEAD', '--json'], 1).stdout);
  const escapeData = text => text.replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A');
  for (const annotation of annotations) {
    const line = Number(annotation.match(/,line=(\d+),/)[1]);
    const finding = current.findings.find(f => f.sites.some(s => s.file.endsWith('/App.tsx') && s.line === line));
    const title = escapeData(finding.title).replaceAll(':', '%3A').replaceAll(',', '%2C');
    assert.ok(annotation.includes(`,title=${title}::${escapeData([finding.because, finding.action ?? finding.fix].filter(Boolean).join(' '))}`), annotation);
    assert.doesNotMatch(annotation, /,title=(Debt|Exception) touched:/);
  }
  assert.doesNotMatch(output, /\n::error file=spoof/);
  assert.doesNotMatch(annotations.join('\n'), /line=6,/);
  for (const kind of ['New', 'Debt touched', 'Exception touched']) assert.ok(output.includes(`${kind}: 1.`), output);
  const changed = run(directory, ['--changed', '--format', 'github'], 1).stdout;
  assert.equal(changed.split('\n').filter(line => line.startsWith('::')).length, 3);
  // Whole-file scope still retains every finding in JSON; line filtering is a review surface.
  const scoped = JSON.parse(run(directory, ['--base', 'HEAD', '--json'], 1).stdout);
  assert.ok(scoped.findings.flatMap(f => f.sites).some(s => s.line === 6 && s.ledger.status === 'debt'));
  git(directory, 'add', 'src/App.tsx');
  assert.equal(run(directory, ['--changed', '--format', 'github'], 1).stdout.split('\n').filter(line => line.startsWith('::')).length, 3);
});

test('report records two commits, coverage delta and authored-key fixed counts; since reads saved history', async t => {
  const directory = await fixture(t); run(directory, ['baseline']); const first = await history(directory);
  const initial = JSON.parse(run(directory, ['report', '--json']).stdout);
  assert.equal(initial.commit, first); assert.equal(initial.dirty, false); assert.ok(Date.parse(initial.date));
  assert.equal(initial.coverage.spacing.percent, 25); assert.equal(initial.ledger.debt, 3);
  assert.deepEqual(initial.findings['provenance/spacing'], { groups: 3, sites: 3 });
  const file = join(directory, 'src/App.tsx');
  await writeFile(file, (await readFile(file, 'utf8')).replace('gap: 10', "gap: 'var(--spacing-small)'"));
  git(directory, 'add', '.'); git(directory, 'commit', '-qm', 'fixture fixes one spacing value');
  const second = git(directory, 'rev-parse', 'HEAD');
  const markdown = run(directory, ['report', '--markdown']).stdout;
  assert.match(markdown, /spacing delta \(pp\)/); assert.match(markdown, /50% \| \+25 \| 0 \| 1 \| 2 \| 0/);
  assert.ok(markdown.includes(first.slice(0, 12))); assert.ok(markdown.includes(second.slice(0, 12)));
  const reportFile = join(directory, 'plumb/report.json'), trendFile = join(directory, 'plumb/trend.json');
  const snapshot = JSON.parse(await readFile(reportFile, 'utf8')), trend = JSON.parse(await readFile(trendFile, 'utf8'));
  assert.equal(snapshot.commit, second); assert.equal(snapshot.dirty, false); assert.equal(trend.length, 2);
  assert.deepEqual(snapshot, trend[1]); assert.deepEqual(snapshot.changes, { new: 0, fixed: 1, debt: 2, exceptions: 0 });
  const before = await readFile(trendFile, 'utf8');
  await writeFile(join(directory, 'plumb.config.ts'), 'invalid config syntax');
  assert.deepEqual(JSON.parse(run(directory, ['report', '--since', first.slice(0, 8), '--json']).stdout), trend);
  git(directory, 'tag', 'v-fixture', first);
  assert.match(run(directory, ['report', '--since', 'v-fixture', '--markdown']).stdout, /\+25/);
  assert.equal(await readFile(trendFile, 'utf8'), before); assert.equal(JSON.parse(await readFile(reportFile, 'utf8')).commit, second);
  assert.equal(git(directory, 'rev-parse', 'HEAD'), second);
  assert.match(run(directory, ['report', '--since', 'deadbeef'], 2).stderr, /recorded/);
});

test('report preserves malformed history and marks uncommitted measurements', async t => {
  const directory = await fixture(t); run(directory, ['baseline']); await history(directory);
  await writeFile(join(directory, 'src/Added.tsx'), 'export const Added = () => <div style={{ gap: 19 }} />;');
  const data = JSON.parse(run(directory, ['report', '--json']).stdout);
  assert.equal(data.dirty, true); assert.equal(data.changes.new, 1);
  const reportFile = join(directory, 'plumb/report.json'), trendFile = join(directory, 'plumb/trend.json');
  const before = await readFile(reportFile, 'utf8');
  for (const broken of ['{bad', '[{}]']) {
    await writeFile(trendFile, broken);
    assert.match(run(directory, ['report'], 2).stderr, /invalid/);
    assert.equal(await readFile(trendFile, 'utf8'), broken); assert.equal(await readFile(reportFile, 'utf8'), before);
  }
});

test('DTCG parity lists one missing token, one extra and one resolved colour mismatch', async t => {
  const directory = await fixture(t, 'parity');
  const output = run(directory, ['parity', 'export.tokens.json']).stdout;
  assert.match(output, /`spacing.missing` is missing from your theme/); assert.match(output, /`--spacing-extra` is missing from the export/);
  assert.match(output, /`color.brand` differs from `--color-brand`/);
  const data = JSON.parse(run(directory, ['parity', 'export.tokens.json', '--format', 'dtcg', '--strict', '--json'], 1).stdout);
  assert.equal(data.findings.length, 3); assert.equal(data.compared, 4);
  assert.deepEqual(data.findings.map(f => f.rule).sort(), ['parity/extra', 'parity/mismatch', 'parity/missing']);
  const mismatch = data.findings.find(f => f.rule === 'parity/mismatch');
  assert.equal(mismatch.exportedValue, 'color(srgb 0 0 1 / 1)'); assert.equal(mismatch.themeValue, '#ff0000'); assert.ok(mismatch.distance > data.tolerance.oklab);
  for (const f of data.findings) {
    assert.ok(f.title.length < 80); assert.equal(f.why, f.because); assert.equal(f.fix, f.action);
    assert.equal(f.accept, ''); assert.ok(!f.sites[0].file.startsWith('/'));
    assert.ok(output.includes(`${f.title}\n  ${f.because}\n  ${f.action}\n`));
  }
  assert.equal(mismatch.because, 'Code and designs using the export render this token differently.');
  // A semantic CSS alias and an OKLab object within tolerance both passed.
  assert.ok(!data.findings.some(f => f.token === 'color.text' || f.token === 'color.muted'));
});

test('parity resolves DTCG aliases, compares units and alpha, and cannot excuse differences with ledger', async t => {
  const directory = await fixture(t, 'parity');
  const file = join(directory, 'export.tokens.json'); const data = JSON.parse(await readFile(file, 'utf8'));
  delete data.spacing.missing; data.spacing.extra = { $value: '1rem' }; data.spacing.small.$value = '0.5rem';
  data.color.brand.$value = '#f00'; data.color.text.$value = '{color.brand}';
  await writeFile(file, JSON.stringify(data));
  run(directory, ['baseline']);
  assert.equal(JSON.parse(run(directory, ['parity', 'export.tokens.json', '--strict', '--json']).stdout).findings.length, 0);
  data.color.brand.$value = '#ff000080'; await writeFile(file, JSON.stringify(data));
  const mismatch = JSON.parse(run(directory, ['parity', 'export.tokens.json', '--strict', '--json'], 1).stdout);
  assert.equal(mismatch.findings.length, 2); assert.ok(mismatch.findings.every(f => f.rule === 'parity/mismatch'));
  data.color.brand.$value = '{color.text}'; await writeFile(file, JSON.stringify(data));
  const cycle = JSON.parse(run(directory, ['parity', 'export.tokens.json', '--strict', '--json'], 1).stdout);
  assert.equal(cycle.findings.length, 2); assert.ok(cycle.findings.every(f => f.rule === 'parity/unresolved'));
  assert.ok(cycle.findings.every(f => f.accept === '' && f.why === f.because && f.fix === f.action));
});

test('parity rejects unsupported exports, wrong formats and invalid command flags', async t => {
  const directory = await fixture(t, 'parity');
  for (const args of [['parity'], ['parity', 'missing.json'], ['parity', 'export.tokens.json', '--format', 'github'],
    ['parity', 'export.tokens.json', '--markdown'], ['check', '--strict'], ['check', '--since', 'HEAD'], ['report', '--markdown', '--json'], ['report', '--since', '']]) run(directory, args, 2);
  for (const content of ['{bad', '[]', '{"invalid":{"$type":"boolean","$value":true}}', '{"invalid":{"$value":12}}', '{"group":{"$extends":"{base}"}}']) {
    await writeFile(join(directory, 'bad.json'), content); run(directory, ['parity', 'bad.json'], 2);
  }
  await cp(join(directory, 'export.tokens.json'), join(directory, 'export[1].json'));
  assert.equal(JSON.parse(run(directory, ['parity', 'export[1].json', '--json']).stdout).findings.length, 3);
});

test('parity compares unselected theme inventory, DTCG HSL/HWB, radius, duration and number values', async t => {
  const directory = await fixture(t, 'parity');
  const css = join(directory, 'src/tokens.css');
  await writeFile(css, (await readFile(css, 'utf8')).replace(':root', '@import "tailwindcss";\n@theme').replace('\n}', '\n --radius-review: 8px;\n --duration-review: 1000ms;\n --z-review: 2;\n}'));
  await writeFile(join(directory, 'plumb.config.ts'), 'export default { css: "src/tokens.css", decisions: { spacing: { from: "theme:--spacing-small" }, color: { from: "theme:--color-*" } } };');
  const file = join(directory, 'export.tokens.json'), data = JSON.parse(await readFile(file, 'utf8'));
  delete data.spacing.missing; data.spacing.extra = { $value: '1rem' };
  data.color.brand.$value = { colorSpace: 'hsl', components: [0, 100, 50] };
  data.color.text.$value = { colorSpace: 'hwb', components: [0, 0, 0] };
  data.radius = { review: { $type: 'dimension', $value: { value: 0.5, unit: 'rem' } } };
  data.duration = { review: { $type: 'duration', $value: { value: 1, unit: 's' } } };
  data.z = { review: { $type: 'number', $value: 2 } };
  await writeFile(file, JSON.stringify(data));
  const output = JSON.parse(run(directory, ['parity', 'export.tokens.json', '--strict', '--json']).stdout);
  assert.equal(output.findings.length, 0); assert.equal(output.compared, 8);
});

test('parity refuses ambiguous theme references and flattened export names', async t => {
  const directory = await fixture(t, 'parity');
  const file = join(directory, 'export.tokens.json');
  await writeFile(join(directory, 'plumb.config.ts'), `export default { decisions: { color: { from: () => ['first', 'second'].map(name => ({ family: 'color', name, value: '#f00', refs: ['var(--color-brand)'], origin: 'project', tier: 'primitive', why: '', source: { file: 'src/tokens.css', line: 1 } })) } } };`);
  assert.match(run(directory, ['parity', 'export.tokens.json', '--strict'], 2).stderr, /matches several theme tokens/);
  await writeFile(join(directory, 'plumb.config.ts'), 'export default {};');
  await writeFile(join(directory, 'src/tokens.css'), ':root { --color-a-b: red; }');
  await writeFile(file, JSON.stringify({ color: { $type: 'color', a: { b: { $value: '#f00' } }, 'a-b': { $value: '#f00' } } }));
  assert.match(run(directory, ['parity', 'export.tokens.json'], 2).stderr, /Several exported tokens map/);
});
