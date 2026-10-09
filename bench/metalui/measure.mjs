import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { resolve } from 'node:path';
const label = process.argv[2] ?? 'review';
const cache = resolve(`bench/metalui/.cache/${label}-${Date.now()}`);
const runs = {};
let coldReport;
for (const temperature of ['cold', 'warm']) {
  const start = performance.now();
  const result = spawnSync(process.execPath, ['dist/cli.js', '--root', '/Users/vijaysingh/unlocalhosted/metalui', '--config', resolve('bench/metalui/plumb.config.ts'), '--json'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: { ...process.env, PLUMB_CACHE_DIR: cache } });
  if (result.error || result.stderr || result.status !== 1) throw new Error(result.stderr || String(result.error ?? result.status));
  const wallMs = performance.now() - start;
  const report = JSON.parse(result.stdout);
  if (label === 'layer2') {
    const baseline = JSON.parse(readFileSync('bench/metalui/layer1.json', 'utf8'));
    const findings = value => value.findings.map(finding => [finding.key, finding.sites]).sort((a, b) => a[0].localeCompare(b[0]));
    assert.deepEqual(findings(report), findings(baseline), 'Layer 2 must retain exactly Layer 1 finding keys and sites');
    assert.equal(report.coverage.existence.dead, 65);
    assert.equal(report.findings.filter(finding => finding.rule === 'existence/dead-class').length, 39);
    assert.ok(!report.findings.some(finding => ['mu-icon-trigger', 'mu-life'].includes(finding.declaration.value)));
    if (temperature === 'warm') assert.ok(report.timing.totalMs < 1200, 'warm report total must remain under 1.2 s');
  }
  if (label === 'layer4') {
    for (const family of ['spacing','color','radius','type','motion','elevation','z']) {
      const c = report.coverage[family]; assert.equal(c.total, c.fromDecisions + c.findings);
    }
    if (temperature === 'cold') coldReport = report;
    else {
      for (const field of ['findings','decisions','coverage','declarations']) assert.deepEqual(report[field], coldReport[field]);
      assert.ok(report.timing.totalMs < 1300, 'warm report must remain under 1.3 s');
    }
  }
  if (label === 'layer3') {
    assert.equal(report.coverage.spacing.total, report.coverage.spacing.fromDecisions + report.coverage.spacing.findings);
    assert.equal(report.decisions.filter(decision => decision.family === 'spacing').length, 17);
    assert.ok(report.findings.some(finding => finding.rule === 'provenance/spacing'));
    assert.ok(!report.findings.some(finding => finding.family === 'spacing' && finding.sites.some(site => site.text === 'sr-only')));
    assert.ok(!report.findings.some(finding => finding.family === 'spacing' && finding.declaration.prop === '*'));
    assert.equal(report.coverage.inline.fullyOpaque, report.declarations.filter(d => d.origin === 'inline' && d.prop === '*' && d.opaque).length);
    if (temperature === 'cold') coldReport = report;
    else {
      for (const field of ['findings', 'decisions', 'coverage', 'declarations']) assert.deepEqual(report[field], coldReport[field], `warm ${field} must match cold`);
    }
    if (temperature === 'warm') assert.ok(report.timing.totalMs < 1200, 'warm report total must remain under 1.2 s');
  }
  writeFileSync(`bench/metalui/${label}.${temperature}.json`, result.stdout);
  runs[temperature] = { wallMs, exitCode: result.status, timing: report.timing, moduleGraph: report.moduleGraph };
}
writeFileSync(`bench/metalui/${label}.run.json`, JSON.stringify(runs, null, 2) + '\n');
console.log(JSON.stringify(runs));
