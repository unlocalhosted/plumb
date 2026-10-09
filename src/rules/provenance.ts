import { createHash } from 'node:crypto';
import type { PlumbConfig } from '../config.js';
import type { Declaration, Decision, Finding, FamilyCoverage } from '../report.js';
import type { DecisionRecord } from '../decisions/index.js';
import { components, pixels, resolveValue } from '../decisions/resolve.js';
import type { Variable } from '../decisions/resolve.js';
import { references } from '../collect/source.js';

export function isSpacing(prop: string): boolean {
  return /^(?:(?:padding|margin|inset|scroll-padding|scroll-margin)(?:-(?:top|right|bottom|left|block|inline)(?:-(?:start|end))?)?|gap|row-gap|column-gap|top|right|bottom|left)$/.test(prop);
}
export function isJudgedSpacing(declaration: Declaration): boolean {
  return isSpacing(declaration.prop) && declaration.origin !== 'keyframes' && declaration.sourceOrigin !== 'framework' &&
    (!(declaration.origin === 'class' || declaration.origin === 'arbitrary') || declaration.authoredValue === true);
}
function utilityPrefix(prop: string): string | undefined {
  const suffixes: Record<string, string> = { '': '', top: 't', right: 'r', bottom: 'b', left: 'l', inline: 'x', block: 'y', 'inline-start': 's', 'inline-end': 'e' };
  for (const [family, utility] of [['scroll-padding', 'scroll-p'], ['scroll-margin', 'scroll-m'], ['padding', 'p'], ['margin', 'm']] as const) {
    if (prop === family || prop.startsWith(`${family}-`)) {
      const suffix = suffixes[prop.slice(family.length).replace(/^-/, '')];
      return suffix === undefined ? undefined : `${utility}${suffix}`;
    }
  }
  return ({ gap: 'gap', 'row-gap': 'gap-y', 'column-gap': 'gap-x', inset: 'inset', 'inset-inline': 'inset-x', 'inset-block': 'inset-y', 'inset-inline-start': 'start', 'inset-inline-end': 'end', top: 'top', right: 'right', bottom: 'bottom', left: 'left' } as Record<string, string>)[prop];
}
function useFor(decision: Decision, prop: string, theme: ReadonlySet<string>): { class?: string; css: string } {
  const prefix = utilityPrefix(prop);
  const utility = prefix && theme.has(decision.name) && decision.name.startsWith('--spacing-') ? `${prefix}-${decision.name.slice(10)}` : undefined;
  const ref = decision.refs.find(ref => ref.startsWith('var('));
  const css = ref ? `${prop}: ${ref}` : `token ${decision.refs[0] ?? decision.name}`;
  return utility ? { class: utility, css } : { css };
}
function suggestion(decision: Decision, prop: string, theme: ReadonlySet<string>): string {
  const use = useFor(decision, prop, theme);
  return `${decision.name} (${decision.resolved ?? decision.value})${decision.why ? ` "${decision.why}"` : ''}: ${use.class ? `${use.class} or ` : ''}${use.css}`;
}

export function spacingProvenance(declarations: Declaration[], record: DecisionRecord, config: PlumbConfig): {
  findings: Finding[]; coverage: Pick<FamilyCoverage, 'fromDecisions' | 'total' | 'findings'>;
} {
  const decisions = record.decisions.filter(decision => decision.family === 'spacing');
  const source = config.decisions?.spacing;
  const origins = source?.origins ?? ['project'];
  const callers = source?.callers ?? (decisions.some(decision => decision.tier === 'semantic') ? ['semantic'] : ['primitive', 'semantic']);
  const identity = source?.identity ?? 'value';
  const refIndex = new Map(decisions.flatMap(decision => decision.refs.map(ref => [ref, decision] as const)));
  const ladder = decisions.filter(decision => decision.origin === 'project' && decision.resolved !== undefined && pixels(decision.resolved) !== undefined)
    .sort((a, b) => pixels(a.resolved!)! - pixels(b.resolved!)! || Number(a.tier === 'semantic') - Number(b.tier === 'semantic') || a.name.localeCompare(b.name));
  const fixProperties = new Map<string, Set<string>>();
  const nearestLadder = ladder.filter(decision => callers.includes(decision.tier));
  function representative(decision: Decision): Decision {
    return nearestLadder.filter(other => pixels(other.resolved!) === pixels(decision.resolved!))
      .sort((a, b) => Number(record.theme.has(b.name)) - Number(record.theme.has(a.name)) || Number(!!b.why) - Number(!!a.why) || a.name.localeCompare(b.name))[0] ?? decision;
  }
  const grouped = new Map<string, Finding>(), locations = new Map<string, Set<string>>();
  const coverage = { fromDecisions: 0, total: 0, findings: 0 };
  // Resolve local compiler infrastructure only within the same emitted context.
  const locals = new Map<string, Map<string, Variable>>();
  const context = (declaration: Declaration) => JSON.stringify([declaration.site.file, declaration.owner, declaration.when]);
  for (const declaration of declarations) if (declaration.prop.startsWith('--tw-')) {
    const key = context(declaration), values = locals.get(key) ?? new Map();
    values.set(declaration.prop, { value: declaration.value, dynamic: !!declaration.opaque }); locals.set(key, values);
  }
  for (const declaration of declarations) {
    if (!isJudgedSpacing(declaration)) continue;
    coverage.total++;
    const variables = locals.has(context(declaration)) ? new Map([...record.variables, ...locals.get(context(declaration))!]) : record.variables;
    const resolved = declaration.opaque ? undefined : resolveValue(declaration.value, variables);
    if (resolved !== undefined) declaration.resolved = resolved;
    let rule = '', why = '', severity: Finding['severity'] = 'error', nearest: Decision[] = [];
    if (declaration.opaque) {
      rule = 'provenance/opaque-inline'; severity = 'warn'; why = 'Runtime spacing cannot be checked against decisions.';
    } else {
      const parts = components(declaration.value.replace(/\s*!important$/, ''));
      for (const part of parts) {
        const refs = references(part).map(name => refIndex.get(`var(${name})`)).filter((decision): decision is Decision => decision !== undefined);
        if (refs.length) {
          const wrongOrigin = refs.find(decision => !origins.includes(decision.origin));
          const wrongTier = refs.find(decision => !callers.includes(decision.tier));
          if (wrongOrigin) { rule = 'provenance/spacing/framework'; why = `${wrongOrigin.name} has ${wrongOrigin.origin} origin; allowed origins: ${origins.join(', ')}.`; nearest = [wrongOrigin]; break; }
          if (wrongTier) {
            rule = 'provenance/spacing/tier'; why = `${wrongTier.name} is ${wrongTier.tier}; callers may use ${callers.join(', ')}.`;
            nearest = decisions.filter(decision => callers.includes(decision.tier) && references(decision.value).some(name => wrongTier.refs.includes(`var(${name})`))); break;
          }
          continue;
        }
        const value = resolveValue(part, variables);
        if (value !== undefined && /^(?:auto|inherit|initial|unset|revert|revert-layer|normal|[-+]?(?:\d*\.)?\d+%)$/.test(value)) continue;
        const length = value === undefined ? undefined : pixels(value);
        if (length === 0) continue;
        const match = length === undefined ? undefined : ladder.find(decision => Math.abs(pixels(decision.resolved!)! - Math.abs(length)) < 1e-6);
        if (match) {
          if (!callers.includes(match.tier)) { rule = 'provenance/spacing/tier'; why = `${match.name} is ${match.tier}; callers may use ${callers.join(', ')}.`; nearest = decisions.filter(decision => callers.includes(decision.tier)); break; }
          if (identity === 'reference') { rule = 'provenance/spacing/by-value'; severity = 'warn'; why = `${value} equals ${match.name}, but spacing requires a reference.`; nearest = [match]; break; }
          continue;
        }
        rule = 'provenance/spacing'; why = `${value ?? part} is not a spacing decision.`;
        if (length !== undefined) {
          const below = nearestLadder.findLast(decision => pixels(decision.resolved!)! < Math.abs(length));
          const above = nearestLadder.find(decision => pixels(decision.resolved!)! > Math.abs(length));
          nearest = [below, above].filter((decision): decision is Decision => decision !== undefined).map(representative);
        }
        break;
      }
      if (rule && declaration.origin === 'arbitrary' && !rule.endsWith('/framework') && !rule.endsWith('/tier')) rule = 'provenance/arbitrary';
    }
    if (!rule) { coverage.fromDecisions++; continue; }
    coverage.findings++;
    // Group syntaxes by their static authored amount, while retaining all sites
    // and the original compiler value. Decision/variable changes still rerun judgement.
    const amount = resolved ?? declaration.value.replace(/\s+/g, ' ').trim();
    const key = createHash('sha256').update(JSON.stringify([rule, 'spacing', amount])).digest('hex');
    let finding = grouped.get(key);
    if (!finding) {
      finding = { key, rule, family: 'spacing', severity, sites: [], declaration, decisions: nearest.map(decision => ({ ...decision, use: useFor(decision, declaration.prop, record.theme) })), why,
        fix: rule === 'provenance/opaque-inline' ? 'Pass the measured number through a custom property and style from CSS.' : nearest.length ? nearest.map(decision => suggestion(decision, declaration.prop, record.theme)).join('; ') : 'NEEDS-DECISION: no comparable spacing decisions; choose or request a named decision.' };
      grouped.set(key, finding); locations.set(key, new Set()); fixProperties.set(key, new Set());
    }
    const properties = fixProperties.get(key)!;
    if (!properties.has(declaration.prop)) {
      if (properties.size && nearest.length && rule !== 'provenance/opaque-inline') finding.fix += '; ' + nearest.map(decision => suggestion(decision, declaration.prop, record.theme)).join('; ');
      properties.add(declaration.prop);
    }
    const location = JSON.stringify([declaration.site.file, declaration.site.line, declaration.site.column, declaration.site.text]);
    if (!locations.get(key)!.has(location)) { finding.sites.push(declaration.site); locations.get(key)!.add(location); }
  }
  return { findings: [...grouped.values()], coverage };
}
