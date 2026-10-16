import { basename } from 'node:path';
import type { Decision, Finding, Site } from './report.js';
import { count, familyNames, scales, sourceEdit } from './messages.js';
import { oneLine, paint, shorten, table, terminalWidth, visibleWidth, wrap } from './cli-table.js';
import { useFor } from './rules/provenance.js';

export interface FindingLine { subject: string; findings: Finding[]; sites: Site[] }
const identity = (site: Site) => `${site.file}:${site.line}:${site.column}`;
function subject(finding: Finding, site: Site): string {
  if (finding.rule === 'existence/dead-var') return finding.title.match(/^`([^`]+)`/)?.[1] ?? finding.declaration.value;
  if (finding.rule.startsWith('config/')) return `${familyNames[finding.family] ?? finding.family} setup`;
  if (finding.rule.startsWith('dead/')) return `${familyNames[finding.family] ?? finding.family} tokens`;
  if (finding.rule === 'provenance/opaque-inline') return 'runtime styles';
  return oneLine(site.text || finding.declaration.value);
}
/** Human-only projection. Original findings, occurrence identities and machine reports stay intact. */
export function findingLines(findings: Finding[]): FindingLine[] {
  const groups = new Map<string, FindingLine>();
  const seen = new Map<string, Set<string>>();
  for (const finding of findings) for (const site of finding.sites) {
    const text = subject(finding, site);
    const ruleFamily = finding.rule.startsWith('provenance/') ? 'provenance' : finding.rule;
    const key = JSON.stringify([ruleFamily, finding.family, text]);
    let group = groups.get(key);
    if (!group) { group = { subject: text, findings: [], sites: [] }; groups.set(key, group); seen.set(key, new Set()); }
    if (!group.findings.includes(finding)) group.findings.push(finding);
    if (!seen.get(key)!.has(identity(site))) { group.sites.push(site); seen.get(key)!.add(identity(site)); }
  }
  return [...groups.values()];
}

function phrase(group: FindingLine): string {
  const first = group.findings[0]!;
  if (first.rule === 'existence/dead-var') {
    const fallback = first.title.match(/always uses `(.+)`/)?.[1];
    return fallback ? `never defined; falls back to ${fallback}` : 'never defined; browser drops it';
  }
  if (first.rule === 'existence/dead-class') return 'no CSS; browser applies nothing';
  if (first.rule === 'existence/dynamic-class') return 'runtime class; no CSS generated';
  if (first.rule === 'provenance/opaque-inline') return 'computed at runtime; cannot check';
  if (first.rule.startsWith('config/')) return first.rule === 'config/no-tokens' ? 'setup gap; no tokens configured' : oneLine(first.title);
  if (first.rule.startsWith('dead/')) return 'never used in your source';
  if (first.rule.startsWith('provenance/')) {
    const reasons = new Set(group.findings.map(finding => finding.rule.endsWith('/by-value') ? 'matches a token; uses a copy' :
      finding.family === 'color' ? 'raw colour' : finding.rule.endsWith('/tier') ? `raw ${familyNames[finding.family] ?? finding.family}; use a named token` :
      `off your ${scales[finding.family] ?? finding.family}`));
    const siteIds = new Set(group.sites.map(identity));
    const properties = new Set(group.findings.flatMap(finding => (finding.occurrences ?? [finding.declaration]).filter(d => siteIds.has(identity(d.site))).map(d => d.prop)));
    const type = first.family === 'type' && properties.has('font-size') && properties.has('line-height') ? ' (size and line-height)' : '';
    return [...reasons].join('; ') + type;
  }
  return oneLine(first.title).replace(/`[^`]+`\s*/, '').replace(/\.$/, '');
}

/** Basenames unless ambiguous, then the shortest distinguishing path suffix. */
function siteNames(groups: FindingLine[], path: (file: string) => string): Map<string, string> {
  const files = [...new Set(groups.flatMap(group => group.sites.map(site => site.file)))];
  const parts = new Map(files.map(file => [file, path(file).replaceAll('\\', '/').split('/')]));
  const counts = new Map<string, number>();
  for (const segments of parts.values()) for (let size = 1; size <= segments.length; size++) {
    const tail = segments.slice(-size).join('/'); counts.set(tail, (counts.get(tail) ?? 0) + 1);
  }
  return new Map(files.map(file => {
    const segments = parts.get(file)!;
    let size = 1;
    while (size < segments.length && counts.get(segments.slice(-size).join('/')) !== 1) size++;
    return [file, segments.slice(-size).join('/') || basename(file)];
  }));
}

function choices(group: FindingLine): Decision[] {
  const result = new Map<string, Decision>();
  const siteIds = new Set(group.sites.map(identity));
  for (const finding of group.findings) {
    // Inventory tokens are not fixes. Copy-by-value groups carry per-site edits.
    const relevant = new Set((finding.edits ?? []).filter(edit => siteIds.has(identity(edit.site))).map(edit => edit.token));
    for (const decision of finding.choices?.length ? finding.choices : finding.rule.endsWith('/by-value') ? finding.decisions.filter(d => relevant.has(d.name)) : []) {
      if (finding.rule.endsWith('/by-value') && relevant.size && !relevant.has(decision.name)) continue;
      const key = `${decision.name}:${decision.use?.class ?? decision.use?.css ?? ''}`;
      result.set(key, decision);
    }
  }
  return [...result.values()];
}

function suggestion(group: FindingLine, width: number): string {
  const tokens = choices(group);
  if (tokens.length) {
    const siteIds = new Set(group.sites.map(identity));
    const declarations = group.findings.flatMap(finding => finding.occurrences ?? [finding.declaration]).filter(d => siteIds.has(identity(d.site)));
    const classSite = declarations.some(d => ['class', 'arbitrary', 'apply'].includes(d.origin));
    const entries = tokens.map(decision => {
      const declaration = declarations.find(d => d.prop === decision.use?.css.split(':')[0]) ?? declarations[0];
      const use = declaration ? useFor(decision, declaration.prop, new Set(decision.use?.class ? [decision.name] : [])) : decision.use;
      const authoredEdit = group.findings.flatMap(f => f.edits ?? []).find(edit => edit.token === decision.name && siteIds.has(identity(edit.site)))?.text;
      const replacement = (authoredEdit ?? (declaration && use ? sourceEdit(declaration, use) : '')).match(/ with `([^`]+)`/)?.[1];
      const name = classSite && replacement ? replacement : classSite && use?.class ? use.class : decision.name.startsWith('--') ? `var(${decision.name})` : use?.css ?? decision.name;
      const why = oneLine(decision.why).replace(/\.$/, '');
      const value = decision.resolved ?? decision.value;
      return { name, value, why: why.length <= 28 ? why : '' };
    });
    // Keep names and amounts before optional reasons. Avoid losing the second alternative to prose.
    const text = (withWhy: boolean) => entries.map(entry => `${entry.name} (${entry.value}${withWhy && entry.why ? `, ${entry.why}` : ''})`).join(' · ');
    const compact = shorten(text(visibleWidth(text(true)) <= width), width);
    return compact.split(/( \([^)]*\))/).map((part, i) => i % 2 ? paint(part, 'dim') : part).join('');
  }
  const actions = [...new Set(group.findings.map(finding => finding.action ?? finding.fix).filter(Boolean))];
  const action = actions.join(' · ').replaceAll('`', '').replace(/\.$/, '');
  return action ? paint(shorten(action, width), 'dim') : '';
}

export function renderFindingLines(groups: FindingLine[], path: (file: string) => string, showRules = false): string {
  const width = terminalWidth(), names = siteNames(groups, path);
  const rows = table(groups.map(group => {
    const first = group.findings[0]!, broken = first.rule.startsWith('existence/');
    const location = group.sites.length === 1 ? `${path(group.sites[0]!.file)}:${group.sites[0]!.line}` : `${count(group.sites.length, 'site')} in ${count(new Set(group.sites.map(site => site.file)).size, 'file')}`;
    return [{ text: broken ? '✗' : first.severity === 'info' ? '·' : '!', ink: broken ? 'red' as const : 'amber' as const }, group.subject,
      { text: phrase(group) + (showRules ? ` [${[...new Set(group.findings.map(f => f.rule))].join(', ')}]` : ''), ink: broken ? 'red' as const : first.severity === 'info' ? 'dim' as const : 'amber' as const },
      { text: location, path: group.sites.length === 1, ink: 'dim' as const }];
  }), [{ width: 1 }, { weight: 22 }, { weight: 49 }, { weight: 29 }]);
  return groups.map((group, i) => {
    const lines = [rows[i]!], fix = suggestion(group, width - 7);
    if (fix) lines.push(`     ${paint('→', 'dim')} ${fix}`);
    if (group.sites.length > 1) {
      const shown: string[] = [];
      for (const site of group.sites.slice(0, 4)) {
        const at = `${names.get(site.file)}:${site.line}`;
        const remaining = group.sites.length - shown.length - 1;
        if (visibleWidth('     ' + [...shown, at, ...(remaining ? [`+${remaining.toLocaleString('en-US')}`] : [])].join(' · ')) > width) break;
        shown.push(at);
      }
      const remaining = group.sites.length - shown.length;
      lines.push(paint('     ' + [...shown, ...(remaining ? [`+${remaining.toLocaleString('en-US')}`] : [])].join(' · '), 'dim'));
    }
    return lines.join('\n');
  }).join('\n\n');
}

export function findingContext(findings: Finding[], path: (file: string) => string, showRules = false, accept = true): string {
  const reasons = new Map<string, Set<string>>();
  for (const finding of findings) if (finding.because) {
    const why = reasons.get(finding.rule) ?? new Set<string>(); why.add(finding.because); reasons.set(finding.rule, why);
  }
  const lines = reasons.size ? ['Why', ...[...reasons].map(([rule, why]) => wrap(`  ${showRules ? rule + ': ' : ''}${[...why].join(' ')}`))] : [];
  const actionable = findings.filter(finding => finding.accept && finding.severity !== 'info');
  const first = actionable.find(finding => finding.sites.some(site => (!site.ledger || site.ledger.status === 'new') && site.inScope !== false)) ?? actionable[0];
  if (accept && first) {
    const site = first.sites.find(site => (!site.ledger || site.ledger.status === 'new') && site.inScope !== false) ?? first.sites[0]!;
    const command = `plumber accept --rule ${first.rule} --site ${JSON.stringify(`${path(site.file)}:${site.line}`)} --why "…"`;
    // Shell continuations keep the example copyable at narrow terminal widths.
    const parts = command.match(/(?:"[^"]*"|\S)+/g) ?? [];
    let line = 'Intended?  ';
    const commandLines: string[] = [];
    for (const part of parts) {
      if (visibleWidth(line + part) > terminalWidth() - 2) { commandLines.push(line.trimEnd() + ' \\'); line = '  '; }
      let rest = part;
      while (visibleWidth(line + rest) > terminalWidth() - 2) {
        // A long quoted path can continue inside its quotes with backslash-newline.
        let chunk = '';
        for (const char of rest) {
          if (visibleWidth(line + chunk + char) > terminalWidth() - 2) break;
          chunk += char;
        }
        commandLines.push(line + chunk + '\\'); rest = rest.slice(chunk.length); line = '';
      }
      line += rest + ' ';
    }
    commandLines.push(line.trimEnd());
    lines.push('', ...commandLines);
  }
  return lines.join('\n');
}
