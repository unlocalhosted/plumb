import assert from 'node:assert/strict';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { relative, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { isJudgedSpacing, isSpacing } from '../../dist/rules/provenance.js';

const report = JSON.parse(await readFile(new URL('./layer3.warm.json', import.meta.url), 'utf8'));
const base = join(report.root, 'apps/docs/src');
const ladder = new Set([0, 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80]);
const location = site => JSON.stringify([site.file, site.line, site.column, site.text]);
const spacing = report.declarations.filter(isJudgedSpacing);
assert.equal(spacing.length, report.coverage.spacing.total, 'reconcile only judged spacing coverage');
const findingSites = new Map();
for (const finding of report.findings.filter(f => f.family === 'spacing')) {
  for (const site of finding.sites) {
    const key = location(site), values = findingSites.get(key) ?? [];
    values.push(finding); findingSites.set(key, values);
  }
}
function findingFor(d) {
  return (findingSites.get(location(d.site)) ?? []).find(f =>
    (f.declaration.resolved ?? f.declaration.value.replace(/\s+/g, ' ').trim()) === (d.resolved ?? d.value.replace(/\s+/g, ' ').trim()));
}
const hits = [];
// Includes side-specific/logical prefixes and position edges to cover the old
// value list too. The narrower padding/margin/gap/inset subset is reported separately.
const regex = /\b(?:p[trblxyse]?|m[trblxyse]?|gap(?:-[xy])?|inset(?:-[xy])?|top|right|bottom|left|start|end)-(\d+)(?![\w.-])/g;
for (const file of (await readdir(base, { recursive: true })).filter(file => file.endsWith('.tsx')).sort()) {
  const absolute = join(base, file), text = await readFile(absolute, 'utf8');
  for (const match of text.matchAll(regex)) {
    const prefix = text.slice(0, match.index), line = prefix.split('\n').length, column = match.index - prefix.lastIndexOf('\n');
    const declarations = spacing.filter(d => d.origin === 'class' && d.site.file === absolute && d.site.line === line && d.site.column <= column && column < d.site.column + d.site.text.length);
    const findings = [...new Set(declarations.map(findingFor).filter(Boolean))];
    const onLadder = ladder.has(Number(match[1]));
    let reason;
    if (findings.length) reason = 'finding: compiled spacing is outside shared ladder';
    else if (declarations.length) reason = declarations.every(d => /^[-+\d.]+%$/.test(d.resolved ?? '')) ? 'pass: percentage positioning; grep matched the numerator of a fraction utility' : 'pass: resolved amount equals shared project ladder (identity=value; negative amounts included)';
    else {
      assert.ok(match[0].startsWith('start-') && /(?:row|col)-$/.test(text.slice(Math.max(0, match.index - 4), match.index)) || file === 'pages/components/Skeleton.tsx' && line === 76, `${file}:${line} unexplained uncollected hit`);
      reason = match[0].startsWith('start-') ? 'pass: grep matched row-start/col-start grid placement; not a spacing property' : 'pass: Skeleton usage documentation string; no emitted class site';
    }
    assert.ok(!onLadder || findings.length === 0, `${file}:${line} on-ladder finding`);
    assert.ok(onLadder || !declarations.length || findings.length || declarations.every(d => /^[-+\d.]+%$/.test(d.resolved ?? '')), `${file}:${line} missing off-ladder finding`);
    hits.push({ file: relative(report.root, absolute), line, column, token: match[0], amount: Number(match[1]), onLadder, reason,
      findings: findings.map(f => f.key), declarations: declarations.map(d => ({ prop: d.prop, value: d.value, resolved: d.resolved })),
      context: text.split('\n')[line - 1].trim() });
  }
}
const numericSites = new Set(hits.filter(hit => hit.declarations.length).flatMap(hit => spacing.filter(d => d.origin === 'class' && relative(report.root, d.site.file) === hit.file && d.site.line === hit.line && d.site.column <= hit.column && hit.column < d.site.column + d.site.text.length).map(d => location(d.site))));
const additional = [];
for (const declaration of spacing) {
  const finding = findingFor(declaration);
  if (!finding || numericSites.has(location(declaration.site))) continue;
  additional.push({ category: declaration.origin === 'inline' ? declaration.opaque ? 'opaque inline' : 'literal/static inline' : declaration.origin === 'arbitrary' ? 'arbitrary class' : declaration.origin === 'apply' ? '@apply' : declaration.origin === 'stylesheet' ? 'stylesheet' : /(?:^|:)-?(?:p[trblxyse]?|m[trblxyse]?|gap(?:-[xy])?|inset(?:-[xy])?|top|right|bottom|left|start|end)-\d+!?$/.test(declaration.site.text) ? 'numeric constant/branch usage' : 'other named class',
    rule: finding.rule, key: finding.key, prop: declaration.prop, value: declaration.value, resolved: declaration.resolved,
    file: relative(report.root, declaration.site.file), line: declaration.site.line, column: declaration.site.column, text: declaration.site.text });
}
const categories = {};
for (const item of additional) {
  const group = categories[item.category] ?? { declarations: 0, sites: new Set(), findings: new Set(), examples: [] };
  group.declarations++; group.sites.add(JSON.stringify([item.file, item.line, item.column, item.text])); group.findings.add(item.key);
  if (group.examples.length < 3 && !group.examples.some(example => example.file === item.file && example.line === item.line && example.value === item.value)) group.examples.push(item);
  categories[item.category] = group;
}
for (const [category, group] of Object.entries(categories)) categories[category] = { ...group, sites: group.sites.size, findings: group.findings.size };
const summary = {
  head: execFileSync('git', ['-C', report.root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  coverage: report.coverage.spacing,
  inline: report.coverage.inline,
  excludedStaticClassSpacing: report.declarations.filter(d => d.origin === 'class' && !d.authoredValue && isSpacing(d.prop)).length,
  grep: { total: hits.length, onLadder: hits.filter(h => h.onLadder).length, offLadder: hits.filter(h => !h.onLadder).length, offLadderFiles: new Set(hits.filter(h => !h.onLadder).map(h => h.file)).size,
    findings: hits.filter(h => h.findings.length).length, emittedPasses: hits.filter(h => h.declarations.length && !h.findings.length).length, sourceTextPasses: hits.filter(h => !h.declarations.length).length },
  narrower: { total: hits.filter(h => !/^(?:top|right|bottom|left|start|end)-/.test(h.token)).length, onLadder: hits.filter(h => h.onLadder && !/^(?:top|right|bottom|left|start|end)-/.test(h.token)).length,
    offLadder: hits.filter(h => !h.onLadder && !/^(?:top|right|bottom|left|start|end)-/.test(h.token)).length,
    findings: hits.filter(h => h.findings.length && !/^(?:top|right|bottom|left|start|end)-/.test(h.token)).length,
    sourceTextPasses: hits.filter(h => !h.declarations.length && !/^(?:top|right|bottom|left|start|end)-/.test(h.token)).length },
  categories,
};
const failing = spacing.filter(findingFor);
assert.equal(failing.length, report.coverage.spacing.findings, 'every failing context has a finding');
assert.equal(additional.length + failing.filter(d => numericSites.has(location(d.site))).length, failing.length, 'numeric and additional contexts reconcile');
assert.ok(!report.findings.some(f => f.family === 'spacing' && !isJudgedSpacing(f.declaration)), 'excluded declarations have no spacing findings');
await writeFile(new URL('./layer3.reconciliation.json', import.meta.url), JSON.stringify({ summary, hits, additional }, null, 2) + '\n');
const sourcePasses = hits.filter(hit => !hit.declarations.length);
await writeFile(new URL('./layer3.reconciliation.md', import.meta.url), '# Layer 3 spacing reconciliation\n\nEvery textual hit and every additional failing declaration is in [JSON](layer3.reconciliation.json). Numeric source-text passes are listed below for review; emitted on-ladder uses pass by value, emitted off-ladder lengths have finding keys, and percentage positioning passes (including a fraction whose numerator looks off-ladder to grep). Excluded static utility uses and fully opaque inline declarations do not count as spacing coverage or findings. Judged/failing context counts are asserted against report coverage.\n\n' +
  sourcePasses.map(hit => `- ${hit.file}:${hit.line}:${hit.column} \`${hit.token}\`: ${hit.reason}.`).join('\n') + '\n');
console.log(JSON.stringify(summary, null, 2));
