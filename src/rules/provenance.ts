import { createHash } from 'node:crypto';
import type { PlumbConfig } from '../config.js';
import type { Declaration, Decision, Finding, FamilyCoverage } from '../report.js';
import type { DecisionRecord } from '../decisions/index.js';
import { pixels, resolveValue } from '../decisions/resolve.js';
import type { Variable } from '../decisions/resolve.js';
import { references } from '../collect/source.js';

import { isJudged, judgedFamilies, partsFor, oklab, colorDistance, colorNeutral, typeDeclarations } from './families.js';
import type { JudgedFamily } from './families.js';
export { isSpacing } from './families.js';
export function isJudgedSpacing(declaration: Declaration): boolean { return isJudged(declaration, 'spacing'); }
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
  const spacingPrefix = utilityPrefix(prop);
  const prefix = decision.family === 'spacing' ? spacingPrefix : decision.family === 'color' ?
    prop.startsWith('background') ? 'bg' : prop === 'color' || prop.startsWith('text-decoration') ? (prop === 'color' ? 'text' : 'decoration') : prop.startsWith('border') ? 'border' : prop === 'outline' || prop === 'outline-color' ? 'outline' : ({ fill: 'fill', stroke: 'stroke', 'caret-color': 'caret', 'accent-color': 'accent' } as Record<string, string>)[prop] :
    decision.family === 'radius' ? ({ 'border-top-left-radius': 'rounded-tl', 'border-top-right-radius': 'rounded-tr', 'border-bottom-left-radius': 'rounded-bl', 'border-bottom-right-radius': 'rounded-br' } as Record<string, string>)[prop] ?? 'rounded' :
    decision.family === 'type' ? ({ 'font-size': 'text', 'line-height': 'leading', 'font-family': 'font', 'font-weight': 'font', 'letter-spacing': 'tracking' } as Record<string, string>)[prop] :
    decision.family === 'motion' ? /timing-function/.test(prop) || decision.name.startsWith('--ease-') ? 'ease' : /delay/.test(prop) ? 'delay' : 'duration' : decision.family === 'elevation' ? 'shadow' : decision.family === 'z' ? 'z' : undefined;
  const namespace = decision.family === 'spacing' ? '--spacing-' : decision.family === 'color' ? '--color-' : decision.family === 'radius' ? '--radius-' : decision.family === 'type' ? prop === 'font-size' ? '--text-' : prop === 'line-height' ? '--leading-' : prop === 'letter-spacing' ? '--tracking-' : prop === 'font-weight' ? '--font-weight-' : '--font-' : decision.family === 'motion' ? /timing-function/.test(prop) || decision.name.startsWith('--ease-') ? '--ease-' : '--duration-' : decision.family === 'elevation' ? '--shadow-' : decision.name.startsWith('--z-index-') ? '--z-index-' : '--z-';
  const utility = prefix && theme.has(decision.name) && decision.name.startsWith(namespace) ? `${prefix}-${decision.name.slice(namespace.length)}` : undefined;
  const ref = decision.refs.find(ref => ref.startsWith('var('));
  const css = ref ? `${prop}: ${ref}` : `token ${decision.refs[0] ?? decision.name}`;
  return utility ? { class: utility, css } : { css };
}
function suggestion(decision: Decision, prop: string, theme: ReadonlySet<string>): string {
  const use = useFor(decision, prop, theme);
  return `${decision.name} (${decision.resolved ?? decision.value})${decision.why ? ` "${decision.why}"` : ''}: ${use.class ? `${use.class} or ` : ''}${use.css}`;
}

function familyProvenance(family: JudgedFamily, declarations: Declaration[], record: DecisionRecord, config: PlumbConfig): {
  findings: Finding[]; coverage: Pick<FamilyCoverage, 'fromDecisions' | 'total' | 'findings'>;
} {
  const decisions = record.decisions.filter(decision => decision.family === family);
  const source = config.decisions?.[family];
  const origins = source?.origins ?? ['project'];
  const callers = source?.callers ?? (decisions.some(decision => decision.tier === 'semantic') ? ['semantic'] : ['primitive', 'semantic']);
  const identityFor = (prop: string) => source?.identity ?? (family === 'spacing' || family === 'radius' || family === 'type' && prop !== 'font-family' ? 'value' : 'reference');
  const refIndex = new Map(decisions.flatMap(decision => decision.refs.map(ref => [ref, decision] as const)));
  for (const [name, variable] of record.frameworkVariables) {
    if (refIndex.has(`var(${name})`)) continue;
    const resolved = resolveValue(variable.value, record.variables);
    refIndex.set(`var(${name})`, { family, name, value: variable.value, ...(resolved === undefined ? {} : { resolved }), refs: [`var(${name})`], origin: 'framework', tier: variable.tier ?? 'primitive', why: variable.why, source: variable.source });
  }
  const decisionRefs = new Set(refIndex.keys());
  const comparable = (value: string, prop: string): string | number | undefined => {
    if (family === 'spacing') return pixels(value);
    if (family === 'radius' || family === 'type' && ['font-size', 'letter-spacing', 'line-height'].includes(prop)) { const length = pixels(value); if (length !== undefined) return length; }
    if (family === 'motion') { const time = /^([-+]?(?:\d*\.)?\d+)(ms|s)$/.exec(value); if (time) return Number(time[1]) * (time[2] === 's' ? 1000 : 1); }
    return value.toLowerCase().replace(/\s+/g, ' ').replace(/\s*([,()])\s*/g, '$1').trim();
  };
  const equal = (a: string, b: string, prop: string): boolean => {
    if (family === 'color') { const x = oklab(a), y = oklab(b); return !!x && !!y && colorDistance(x, y) < 1e-5 && Math.abs(x[3]-y[3]) < 1e-5; }
    const x = comparable(a, prop), y = comparable(b, prop);
    return x !== undefined && y !== undefined && (typeof x === 'number' && typeof y === 'number' ? Math.abs((family === 'spacing' ? Math.abs(x) : x)-y) < 1e-6 : x === y);
  };
  const project = decisions.filter(decision => origins.includes(decision.origin) && decision.resolved !== undefined)
    .sort((a,b) => Number(a.tier === 'semantic') - Number(b.tier === 'semantic') || Number(a.origin !== 'project') - Number(b.origin !== 'project') || a.name.localeCompare(b.name));
  const ladder = project.filter(decision => pixels(decision.resolved!) !== undefined)
    .sort((a, b) => pixels(a.resolved!)! - pixels(b.resolved!)! || Number(a.tier === 'semantic') - Number(b.tier === 'semantic') || a.name.localeCompare(b.name));
  const matches = new Map<string, Decision | undefined>();
  function matching(value: string, prop: string): Decision | undefined {
    const key = JSON.stringify([value, prop]);
    if (!matches.has(key)) matches.set(key, project.find(decision => equal(value, decision.resolved!, prop)));
    return matches.get(key);
  }
  const nearestColors = new Map<string, Decision[]>();
  const colorLabs = new Map(family === 'color' ? project.map(d => [d, oklab(d.resolved!)] as const) : []);
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
  const judgedDeclarations = family === 'type' ? declarations.flatMap(d => typeDeclarations(d, decisionRefs)) : declarations;
  for (const declaration of judgedDeclarations) {
    if (!isJudged(declaration, family)) continue;
    coverage.total++;
    const variables = locals.has(context(declaration)) ? new Map([...record.variables, ...locals.get(context(declaration))!]) : record.variables;
    const resolved = declaration.opaque ? undefined : resolveValue(declaration.value, variables);
    if (resolved !== undefined) declaration.resolved = resolved;
    let rule = '', why = '', severity: Finding['severity'] = 'error', nearest: Decision[] = [];
    if (declaration.opaque) {
      rule = 'provenance/opaque-inline'; severity = 'warn'; why = `Runtime ${family} cannot be checked against decisions.`;
    } else {
      const authored = family === 'spacing' ? declaration.value : declaration.authoredCss ?? declaration.value;
      const selectedRefs = declaration.decisionRefs?.filter(name => refIndex.has(`var(${name})`)) ?? [];
      const parts = selectedRefs.length ? selectedRefs.map(name => `var(${name})`) : partsFor(family, declaration.prop, authored.replace(/\s*!important$/, ''), variables, decisionRefs);
      for (const part of parts) {
        const refs = references(part).map(name => refIndex.get(`var(${name})`)).filter((decision): decision is Decision => decision !== undefined);
        if (refs.length && (family !== 'elevation' || /^var\(--[\w-]+\)$/.test(part))) {
          const wrongOrigin = refs.find(decision => !origins.includes(decision.origin));
          const wrongTier = refs.find(decision => !callers.includes(decision.tier));
          if (wrongOrigin) { rule = `provenance/${family}/framework`; why = `${wrongOrigin.name} has ${wrongOrigin.origin} origin; allowed origins: ${origins.join(', ')}.`; nearest = [wrongOrigin, ...project.filter(d => wrongOrigin.resolved !== undefined && equal(d.resolved!, wrongOrigin.resolved, declaration.prop))]; break; }
          if (wrongTier) {
            rule = `provenance/${family}/tier`; why = `${wrongTier.name} is ${wrongTier.tier}; callers may use ${callers.join(', ')}.`;
            nearest = decisions.filter(decision => origins.includes(decision.origin) && callers.includes(decision.tier) && (references(decision.value).some(name => wrongTier.refs.includes(`var(${name})`)) || decision.resolved !== undefined && wrongTier.resolved !== undefined && equal(decision.resolved, wrongTier.resolved, declaration.prop))); break;
          }
          continue;
        }
        const value = resolveValue(part, variables);
        if (family !== 'spacing' && /^(?:inherit|initial|unset|revert|revert-layer)$/i.test(part)) continue;
        if (family === 'color' && colorNeutral.test(part)) continue;
        if (family === 'elevation' && (part === 'none' || (declaration.origin === 'class' || declaration.origin === 'arbitrary') && /^0(?:px)? 0(?:px)? (?:transparent|#0000|rgba\(0, ?0, ?0, ?0\))$/.test(part))) continue;
        if (family === 'z' && /^(?:auto|0|1|-1)$/.test(part)) continue;
        if (family === 'motion' && /^(?:0s|0ms)$/.test(value ?? part)) continue;
        if (family === 'type' && /^(?:normal|inherit|initial|unset)$/.test(part)) continue;
        if (family === 'spacing' && value !== undefined && /^(?:auto|inherit|initial|unset|revert|revert-layer|normal|[-+]?(?:\d*\.)?\d+%)$/.test(value)) continue;
        const length = value === undefined ? undefined : pixels(value);
        if ((family === 'spacing' || family === 'radius') && length === 0) continue;
        const frameworkTime = family === 'motion' && (declaration.origin === 'class' || declaration.origin === 'arbitrary') && value !== undefined ? decisions.find(d => d.origin === 'framework' && d.resolved !== undefined && equal(value, d.resolved, declaration.prop)) : undefined;
        if (frameworkTime && !origins.includes('framework')) { rule = 'provenance/motion/framework'; why = `${value} uses framework timing ${frameworkTime.name}.`; nearest = [frameworkTime, ...project.filter(d => equal(value!, d.resolved!, declaration.prop))]; break; }
        const match = value === undefined ? undefined : matching(value, declaration.prop);
        if (match) {
          if (!callers.includes(match.tier)) { rule = `provenance/${family}/tier`; why = `${match.name} is ${match.tier}; callers may use ${callers.join(', ')}.`; nearest = project.filter(decision => callers.includes(decision.tier) && equal(decision.resolved!, match.resolved!, declaration.prop)); break; }
          if (identityFor(declaration.prop) === 'reference') { rule = `provenance/${family}/by-value`; severity = 'warn'; why = `${value} equals ${match.name}, but ${family} requires a reference.`; nearest = [match]; break; }
          continue;
        }
        rule = `provenance/${family}`; why = `${value ?? part} is not a ${family} decision.`;
        if (family === 'spacing' && length !== undefined) {
          const below = nearestLadder.findLast(decision => pixels(decision.resolved!)! < Math.abs(length));
          const above = nearestLadder.find(decision => pixels(decision.resolved!)! > Math.abs(length));
          nearest = [below, above].filter((decision): decision is Decision => decision !== undefined).map(representative);
        }
        if (family !== 'spacing') {
          const allowed = project.filter(d => callers.includes(d.tier));
          const pool = allowed.length ? allowed : project;
          if (family === 'color') {
            const lab = oklab(value ?? part);
            const key = value ?? part;
            if (!nearestColors.has(key)) nearestColors.set(key, lab ? pool.filter(d => colorLabs.get(d)).sort((a, b) => colorDistance(lab, colorLabs.get(a)!) - colorDistance(lab, colorLabs.get(b)!) || a.name.localeCompare(b.name)).slice(0, 2) : []);
            nearest = nearestColors.get(key)!;
          } else {
            const n = comparable(value ?? part, declaration.prop);
            nearest = typeof n === 'number' ? pool.filter(d => typeof comparable(d.resolved!, declaration.prop) === 'number').sort((a,b) => Math.abs(Number(comparable(a.resolved!, declaration.prop))-n) - Math.abs(Number(comparable(b.resolved!, declaration.prop))-n)).slice(0,2) : [];
          }
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
    const key = createHash('sha256').update(JSON.stringify([rule, family, amount])).digest('hex');
    const alternatives = nearest.filter(d => origins.includes(d.origin) && callers.includes(d.tier));
    let finding = grouped.get(key);
    if (!finding) {
      finding = { key, rule, family, severity, sites: [], declaration, occurrences: [], decisions: nearest.map(decision => ({ ...decision, use: useFor(decision, declaration.prop, record.theme) })), why,
        fix: rule === 'provenance/opaque-inline' ? 'Pass the measured number through a custom property and style from CSS.' : alternatives.length ? alternatives.map(decision => suggestion(decision, declaration.prop, record.theme)).join('; ') : `NEEDS-DECISION: no comparable ${family} decisions; choose or request a named decision.` };
      grouped.set(key, finding); locations.set(key, new Set()); fixProperties.set(key, new Set());
    }
    finding.occurrences!.push(declaration);
    const properties = fixProperties.get(key)!;
    if (!properties.has(declaration.prop)) {
      if (properties.size && alternatives.length && rule !== 'provenance/opaque-inline') finding.fix += '; ' + alternatives.map(decision => suggestion(decision, declaration.prop, record.theme)).join('; ');
      properties.add(declaration.prop);
    }
    const location = JSON.stringify([declaration.site.file, declaration.site.line, declaration.site.column, declaration.site.text]);
    if (!locations.get(key)!.has(location)) { finding.sites.push(declaration.site); locations.get(key)!.add(location); }
  }
  return { findings: [...grouped.values()], coverage };
}

export function spacingProvenance(declarations: Declaration[], record: DecisionRecord, config: PlumbConfig) {
  return familyProvenance('spacing', declarations, record, config);
}
export function provenance(declarations: Declaration[], record: DecisionRecord, config: PlumbConfig) {
  const findings: Finding[] = [];
  const coverage = {} as Record<JudgedFamily, Pick<FamilyCoverage, 'fromDecisions' | 'total' | 'findings'>>;
  for (const family of judgedFamilies) {
    const result = familyProvenance(family, declarations, record, config);
    findings.push(...result.findings); coverage[family] = result.coverage;
  }
  return { findings, coverage };
}
