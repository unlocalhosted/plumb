import { performance } from 'node:perf_hooks';
import { profileDuration } from '../profile.js';
import { createHash } from 'node:crypto';
import { matchesGlob } from 'node:path';
import { makeFinding, familyReasons, familyNames, scales, noFit, choiceText, sourceEdit } from '../messages.js';
import type { PlumbConfig } from '../config.js';
import type { Declaration, Decision, Finding, FamilyCoverage } from '../report.js';
import type { DecisionRecord } from '../decisions/index.js';
import { pixels, resolveValue } from '../decisions/resolve.js';
import type { Variable } from '../decisions/resolve.js';
import { references } from '../collect/source.js';
import { attribution, indexDefinitions } from './attribution.js';

import { isJudged, judgedFamilies, oklab, colorDistance, colorNeutral, typeDeclarations } from './families.js';
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
export function useFor(decision: Decision, prop: string, theme: ReadonlySet<string>): { class?: string; css: string } {
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
// One immutable variable context per emitted scope, shared across families.
// Cache complete resolutions only; recursive cycle/depth guards stay intact.
function resolutionContext(declarations: Declaration[], record: DecisionRecord) {
  const locals = new Map<string, Map<string, Variable>>();
  const contexts = new WeakMap<Declaration, string>();
  const context = (declaration: Declaration) => {
    let key = contexts.get(declaration);
    if (key === undefined) {
      key = JSON.stringify([declaration.site.file, declaration.owner, declaration.when]);
      contexts.set(declaration, key);
    }
    return key;
  };
  for (const declaration of declarations) if (declaration.prop.startsWith('--tw-')) {
    const key = context(declaration), values = locals.get(key) ?? new Map();
    values.set(declaration.prop, { value: declaration.value, dynamic: !!declaration.opaque }); locals.set(key, values);
  }
  const scopes = new Map<string, ReadonlyMap<string, Variable>>();
  const resolved = new WeakMap<ReadonlyMap<string, Variable>, Map<string, string | undefined>>();
  return {
    variablesFor(declaration: Declaration): ReadonlyMap<string, Variable> {
      const key = context(declaration), local = locals.get(key);
      if (!local) return record.variables;
      if (!scopes.has(key)) scopes.set(key, new Map([...record.variables, ...local]));
      return scopes.get(key)!;
    },
    resolve(value: string, variables: ReadonlyMap<string, Variable>): string | undefined {
      let values = resolved.get(variables);
      if (!values) { values = new Map(); resolved.set(variables, values); }
      if (!values.has(value)) values.set(value, resolveValue(value, variables));
      return values.get(value);
    },
  };
}

export function familyProvenance(family: JudgedFamily, declarations: Declaration[], record: DecisionRecord, config: PlumbConfig,
  sourceFiles: ReadonlySet<string> = new Set(declarations.map(d => d.site.file)), definitions = indexDefinitions(declarations, record), resolution = resolutionContext(declarations, record)): {
  findings: Finding[]; entries: ProvenanceEntry[]; coverage: Pick<FamilyCoverage, 'fromDecisions' | 'total' | 'findings'>;
} {
  const decisions = record.decisions.filter(decision => decision.family === family);
  const source = config.decisions?.[family];
  const origins = source?.origins ?? ['project'];
  const callers = source?.callers ?? (decisions.some(decision => decision.tier === 'semantic') ? ['semantic'] : ['primitive', 'semantic']);
  const identityFor = (prop: string) => source?.identity ?? (family === 'spacing' || family === 'radius' || family === 'type' && prop !== 'font-family' ? 'value' : 'reference');
  const refIndex = new Map(decisions.flatMap(decision => decision.refs.map(ref => [ref, decision] as const)));
  for (const [name, variable] of record.frameworkVariables) {
    if (refIndex.has(`var(${name})`)) continue;
    const resolved = resolution.resolve(variable.value, record.variables);
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
  const suggestible = (d: Decision) => source?.suggest === undefined || source.suggest.some(pattern => matchesGlob(d.name, pattern));
  const project = decisions.filter(decision => origins.includes(decision.origin) && decision.resolved !== undefined && suggestible(decision))
    .sort((a,b) => Number(a.tier === 'semantic') - Number(b.tier === 'semantic') || Number(a.origin !== 'project') - Number(b.origin !== 'project') || a.name.localeCompare(b.name));
  function distinctAmounts(pool: Decision[], prop: string): Decision[] {
    const result: Decision[] = [];
    for (const decision of pool) {
      const index = result.findIndex(other => equal(decision.resolved!, other.resolved!, prop));
      if (index < 0) result.push(decision);
      else if (!useFor(result[index]!, prop, record.theme).class && useFor(decision, prop, record.theme).class) result[index] = decision;
    }
    return result;
  }
  const matches = new Map<string, Decision | undefined>();
  function matching(value: string, prop: string): Decision | undefined {
    const key = JSON.stringify([value, prop]);
    if (!matches.has(key)) matches.set(key, distinctAmounts(project.filter(decision => equal(value, decision.resolved!, prop)), prop)[0]);
    return matches.get(key);
  }
  const nearestColors = new Map<string, Decision[]>();
  const colorLabs = new Map(family === 'color' ? project.map(d => [d, oklab(d.resolved!)] as const) : []);
  const choicePools = new Map<string, Decision[]>();
  const choiceLadders = new Map<string, Decision[]>();
  function closest(value: string, prop: string): Decision[] {
    if (!choicePools.has(prop)) choicePools.set(prop, distinctAmounts(project.filter(d => callers.includes(d.tier)), prop));
    const pool = choicePools.get(prop)!;
    if (family === 'color') {
      const lab = oklab(value);
      const key = JSON.stringify([value, prop]);
      if (!nearestColors.has(key)) nearestColors.set(key, lab ? pool.filter(d => colorLabs.get(d) && colorDistance(lab, colorLabs.get(d)!) <= .15).sort((a, b) => colorDistance(lab, colorLabs.get(a)!) - colorDistance(lab, colorLabs.get(b)!) || a.name.localeCompare(b.name)).slice(0, 2) : []);
      return nearestColors.get(key)!;
    }
    const n = comparable(value, prop);
    if (typeof n !== 'number') return [];
    const close = (d: Decision) => {
      const amount = comparable(d.resolved!, prop);
      return typeof amount === 'number' && Math.abs(amount - (family === 'spacing' ? Math.abs(n) : n)) <= Math.max(family === 'motion' ? 10 : family === 'z' ? 1 : 4, Math.abs(n) * .5);
    };
    if (family === 'spacing') {
      if (!choiceLadders.has(prop)) choiceLadders.set(prop, pool.filter(d => pixels(d.resolved!) !== undefined).sort((a, b) => pixels(a.resolved!)! - pixels(b.resolved!)!));
      const nearestLadder = choiceLadders.get(prop)!;
      const below = nearestLadder.findLast(d => pixels(d.resolved!)! < Math.abs(n));
      const above = nearestLadder.find(d => pixels(d.resolved!)! > Math.abs(n));
      return [below, above].filter((d): d is Decision => !!d && close(d));
    }
    return pool.filter(close).sort((a, b) => Math.abs(Number(comparable(a.resolved!, prop)) - n) - Math.abs(Number(comparable(b.resolved!, prop)) - n)).slice(0, 2);
  }
  const entries: ProvenanceEntry[] = [];
  const coverage = { fromDecisions: 0, total: 0, findings: 0 };
  const judgedDeclarations = family === 'type' ? declarations.flatMap(d => typeDeclarations(d, decisionRefs)) : declarations;
  const variablesFor = resolution.variablesFor;
  const owners = attribution(family, definitions, sourceFiles, new Set(decisions.flatMap(d => d.refs)));
  const consumers = judgedDeclarations.filter(d => isJudged(d, family)).flatMap(declaration => {
    const item = owners.consume(declaration, variablesFor(declaration), declaration.decisionRefs?.filter(name => refIndex.has(`var(${name})`)) ?? []);
    return item ? [item] : [];
  });
  for (const { declaration, parts, definition, uses } of [...consumers, ...owners.definitions]) {
    if (!isJudged(declaration, family)) continue;
    coverage.total++;
    const variables = variablesFor(declaration);
    const resolved = declaration.opaque ? undefined : resolution.resolve(declaration.value, variables);
    if (resolved !== undefined) declaration.resolved = resolved;
    let rule = '', title = '', because = familyReasons[family]!, judgedValue = '', severity: Finding['severity'] = 'error', nearest: Decision[] = [];
    if (declaration.opaque) {
      rule = 'provenance/opaque-inline'; severity = 'info'; title = `This ${declaration.prop} is computed at runtime, so it can't be checked`; because = 'Plumb reads source, not running values.';
    } else {
      for (const part of parts) {
        const refs = references(part).map(name => refIndex.get(`var(${name})`)).filter((decision): decision is Decision => decision !== undefined);
        if (refs.length && (family !== 'elevation' || /^var\(--[\w-]+\)$/.test(part))) {
          const wrongOrigin = refs.find(decision => !origins.includes(decision.origin));
          const wrongTier = refs.find(decision => !callers.includes(decision.tier));
          if (wrongOrigin) { rule = `provenance/${family}/framework`; title = `\`${declaration.site.text}\` uses Tailwind's default ${frameworkThing(family, declaration.prop)} (\`${wrongOrigin.name}\`), not your theme`; because = `Your theme defines its own ${scales[family]}; Tailwind's defaults sit outside it.`; nearest = wrongOrigin.resolved === undefined ? [] : closest(wrongOrigin.resolved, declaration.prop); break; }
          if (wrongTier) {
            rule = `provenance/${family}/tier`; title = `\`${wrongTier.name}\` is a raw ${familyNames[family]} token; use a named one`; because = "A named token says what a value is for, so it changes with the design; a raw one doesn't.";
            nearest = decisions.filter(decision => origins.includes(decision.origin) && callers.includes(decision.tier) && suggestible(decision) && (references(decision.value).some(name => wrongTier.refs.includes(`var(${name})`)) || decision.resolved !== undefined && wrongTier.resolved !== undefined && equal(decision.resolved, wrongTier.resolved, declaration.prop))); break;
          }
          continue;
        }
        const value = resolution.resolve(part, variables);
        // Tailwind's ring inset/reset variables may resolve to an empty fallback.
        // They supply shadow grammar, not an authored colour.
        if (value === '') continue;
        if (family !== 'spacing' && /^(?:inherit|initial|unset|revert|revert-layer)$/i.test(part)) continue;
        if (family === 'color' && colorNeutral.test(part)) continue;
        if (family === 'elevation' && (part === 'none' || (declaration.origin === 'class' || declaration.origin === 'arbitrary') && /^0(?:px)? 0(?:px)? (?:transparent|#0000|rgba\(0, ?0, ?0, ?0\))$/.test(part))) continue;
        if (family === 'z' && /^(?:auto|0|1|-1)$/.test(part)) continue;
        if (family === 'motion' && /^(?:transition|animation)(?:-(?:duration|delay))?$/.test(declaration.prop)) {
          const time = /^([-+]?(?:\d*\.)?\d+)(ms|s)$/.exec(value ?? part);
          if (time && Number(time[1]) * (time[2] === 's' ? 1000 : 1) <= 1 && Number(time[1]) >= 0) continue;
        }
        if (family === 'type' && /^(?:normal|inherit|initial|unset)$/.test(part)) continue;
        if (family === 'spacing' && value !== undefined && /^(?:auto|inherit|initial|unset|revert|revert-layer|normal|[-+]?(?:\d*\.)?\d+%)$/.test(value)) continue;
        const length = value === undefined ? undefined : pixels(value);
        if ((family === 'spacing' || family === 'radius') && length === 0) continue;
        const frameworkTime = family === 'motion' && (declaration.origin === 'class' || declaration.origin === 'arbitrary') && value !== undefined ? decisions.find(d => d.origin === 'framework' && d.resolved !== undefined && equal(value, d.resolved, declaration.prop)) : undefined;
        if (frameworkTime && !origins.includes('framework')) { rule = 'provenance/motion/framework'; title = `\`${declaration.site.text}\` uses Tailwind's default timing (\`${frameworkTime.name}\`), not your theme`; because = `Your theme defines its own ${scales[family]}; Tailwind's defaults sit outside it.`; nearest = closest(value!, declaration.prop); break; }
        const match = value === undefined ? undefined : matching(value, declaration.prop);
        if (match) {
          if (!callers.includes(match.tier)) { rule = `provenance/${family}/tier`; title = `\`${match.name}\` is a raw ${familyNames[family]} token; use a named one`; because = "A named token says what a value is for, so it changes with the design; a raw one doesn't."; nearest = project.filter(decision => callers.includes(decision.tier) && equal(decision.resolved!, match.resolved!, declaration.prop)); break; }
          if (identityFor(declaration.prop) === 'reference') { rule = `provenance/${family}/by-value`; severity = 'warn'; title = `${value} matches \`${match.name}\` but doesn't use it`; because = 'If the token changes, this copy stays behind.'; nearest = [match]; break; }
          continue;
        }
        rule = `provenance/${family}`; judgedValue = value ?? part; title = family === 'color' ? `\`${judgedValue}\` is a raw colour, not one of your colour tokens` : `${declaration.prop} ${judgedValue} ${['spacing', 'radius', 'type'].includes(family) ? "isn't on your" : "isn't one of your"} ${scales[family]}`;
        nearest = closest(judgedValue, declaration.prop);
        break;
      }
      if (rule && declaration.origin === 'arbitrary' && !rule.endsWith('/framework') && !rule.endsWith('/tier') && !rule.endsWith('/by-value')) {
        rule = 'provenance/arbitrary'; title = `\`${declaration.site.text}\` hardcodes ${judgedValue || resolved || declaration.value}`; because = familyReasons[family]!;
      }
    }
    if (!rule) { coverage.fromDecisions++; continue; }
    coverage.findings++;
    // Group syntaxes by their static authored amount, while retaining all sites
    // and the original compiler value. Decision/variable changes still rerun judgement.
    const amount = judgedValue || resolved || declaration.value.replace(/\s+/g, ' ').trim();
    const key = createHash('sha256').update(JSON.stringify([rule, family, amount, ...(rule === `provenance/${family}` && !['spacing', 'color'].includes(family) ? [declaration.prop] : []), ...(rule === 'provenance/opaque-inline' ? [declaration.site.file] : []), ...(definition ? [definition.prop, definition.site.file, definition.site.line, definition.site.column] : [])])).digest('hex');
    const fixProp = definition?.prop ?? declaration.prop;
    const alternatives = distinctAmounts(nearest.filter(d => origins.includes(d.origin) && callers.includes(d.tier) && suggestible(d)), fixProp);
    const message = (rule === 'provenance/opaque-inline' ? { action: `Pass the number through a CSS variable and set ${declaration.prop} from a class or stylesheet.` } : alternatives.length ? { choices: alternatives.map(decision => ({ ...decision, use: useFor(decision, fixProp, record.theme) })) } : { action: family === 'elevation' && !project.some(d => d.tier === 'semantic')
          ? 'No tokens fit: your theme has no named shadow tokens. Pick one with the design owner, or add one to the theme.' : noFit(amount) });
    entries.push({ declaration, definition, uses, resolved, amount, key, fixProp, alternatives, rule, title, because, severity, message });
  }
  return { findings: findingsForFamily(family, entries, record), entries, coverage };
}

export interface ProvenanceEntry {
  declaration: Declaration;
  definition: Declaration | undefined;
  uses: Set<string>;
  resolved: string | undefined;
  amount: string;
  key: string;
  fixProp: string;
  alternatives: Decision[];
  rule: string;
  title: string;
  because: string;
  severity: Finding['severity'];
  message: { action: string } | { choices: Decision[] };
}

/** Same grouping and messages for cold checks and cached incremental judgements. */
export function findingsForFamily(family: JudgedFamily, entries: ProvenanceEntry[], record: DecisionRecord): Finding[] {
  const decisions = record.decisions.filter(d => d.family === family);
  const grouped = new Map<string, Finding>(), locations = new Map<string, Set<string>>();
  const fixProperties = new Map<string, Set<string>>();
  for (const { declaration, definition, uses, resolved, amount, key, fixProp, alternatives, rule, title, because, severity, message } of entries) {
    let finding = grouped.get(key);
    if (!finding) {
      finding = makeFinding({ key, rule, family, severity, sites: [], occurrences: [], declaration: definition ? { ...definition, ...(resolved === undefined ? {} : { resolved }) } : declaration,
        decisions: alternatives.map(decision => ({ ...decision, use: useFor(decision, fixProp, record.theme) })), title, because, edits: [],
        ...(definition ? { variable: { name: definition.prop, useCount: uses.size } } : {}),
        ...message });
      if (rule.endsWith('/by-value') && alternatives[0]) {
        const use = useFor(alternatives[0], fixProp, record.theme);
        finding.action = `Use ${use.class ? `\`${use.class}\` or ` : ''}\`var(${alternatives[0].name})\`.`;
        finding.fix = finding.action;
      }
      grouped.set(key, finding); locations.set(key, new Set()); fixProperties.set(key, new Set());
    }
    finding.occurrences!.push(definition ? finding.declaration : declaration);
    for (const decision of alternatives) {
      const edited = definition ? finding.declaration : declaration;
      const text = sourceEdit(edited, useFor(decision, fixProp, record.theme));
      if (!finding.edits!.some(edit => edit.token === decision.name && edit.site.file === edited.site.file && edit.site.line === edited.site.line && edit.site.column === edited.site.column && edit.text === text)) finding.edits!.push({ site: edited.site, text, token: decision.name });
    }
    const properties = fixProperties.get(key)!;
    if (!properties.has(fixProp)) {
      if (properties.size && alternatives.length && rule !== 'provenance/opaque-inline') finding.fix += '; ' + choiceText(alternatives.map(decision => ({ ...decision, use: useFor(decision, fixProp, record.theme) })));
      properties.add(fixProp);
    }
    if (rule === 'provenance/spacing' && properties.size > 1 && pixels(amount) !== undefined) finding.title = `${amount} isn't on your spacing scale`;
    const location = JSON.stringify([declaration.site.file, declaration.site.line, declaration.site.column, declaration.site.text]);
    if (!locations.get(key)!.has(location)) { finding.sites.push(declaration.site); locations.get(key)!.add(location); }
  }
  const findings = [...grouped.values()];
  if (!decisions.some(d => d.origin !== 'framework')) {
    const unchecked = findings.filter(f => f.rule !== 'provenance/opaque-inline');
    if (unchecked.length) {
      const occurrences = unchecked.flatMap(f => f.occurrences ?? [f.declaration]);
      const sites = [...new Map(unchecked.flatMap(f => f.sites).map(s => [JSON.stringify([s.file, s.line, s.column, s.text]), s])).values()];
      return [makeFinding({ key: `config/no-tokens:${family}`, rule: 'config/no-tokens', family, severity: 'warn', sites, occurrences,
        declaration: occurrences[0]!, decisions: [], title: `Your theme has no ${familyNames[family]} tokens, so ${sites.length} ${familyNames[family]} values can't be checked`,
        because: 'Plumb judges values against the tokens your theme declares.',
        action: `Add ${familyNames[family]} tokens to your theme, or point \`decisions.${family}.from\` in plumb.config.ts at where they live.` }), ...findings.filter(f => f.rule === 'provenance/opaque-inline')];
    }
  }
  return findings;
}

export function spacingProvenance(declarations: Declaration[], record: DecisionRecord, config: PlumbConfig) {
  return familyProvenance('spacing', declarations, record, config);
}
export function provenance(declarations: Declaration[], record: DecisionRecord, config: PlumbConfig, sourceFiles?: ReadonlySet<string>, verbose = false) {
  const findings: Finding[] = [];
  const definitions = indexDefinitions(declarations, record);
  const resolution = resolutionContext(declarations, record);
  const coverage = {} as Record<JudgedFamily, Pick<FamilyCoverage, 'fromDecisions' | 'total' | 'findings'>>;
  for (const family of judgedFamilies) {
    const start = performance.now();
    const result = familyProvenance(family, declarations, record, config, sourceFiles, definitions, resolution);
    profileDuration(`rule:provenance/${family}`, performance.now() - start);
    findings.push(...(verbose || config.decisions?.[family]?.byValue === 'each' ? result.findings : groupByValue(family, result.findings))); coverage[family] = result.coverage;
  }
  return { findings: presentProvenance(findings), coverage };
}

/** Shared final presentation for cold and incremental rule results. */
export function presentProvenance(findings: Finding[]): Finding[] {
  const opaque = new Map<string, Finding>();
  const grouped = findings.filter(f => {
    if (f.rule !== 'provenance/opaque-inline') return true;
    const file = f.sites[0]!.file, previous = opaque.get(file);
    if (!previous) { f.key = createHash('sha256').update(`opaque:${file}`).digest('hex'); opaque.set(file, f); }
    else {
      previous.occurrences!.push(...f.occurrences ?? []);
      for (const site of f.sites) if (!previous.sites.some(s => s.file === site.file && s.line === site.line && s.column === site.column && s.text === site.text)) previous.sites.push(site);
    }
    return false;
  });
  return [...grouped, ...opaque.values()];
}

/** Group presentation only: authored occurrences and ledger identities stay intact. */
export function groupByValue(family: string, findings: Finding[]): Finding[] {
  const copies = findings.filter(f => f.rule === `provenance/${family}/by-value`);
  if (!copies.length) return findings;
  const sites = [...new Map(copies.flatMap(f => f.sites).map(site => [JSON.stringify([site.file, site.line, site.column, site.text]), site])).values()];
  const edits = copies.flatMap(f => f.edits ?? []);
  const decisions = [...new Map(copies.flatMap(f => f.decisions).map(d => [d.name, d])).values()];
  const action = 'Use the matching token at each site (--verbose lists individual values):\n' + edits.map(edit =>
    `  ${edit.site.file}:${edit.site.line}:${edit.site.column}  ${edit.site.text}  ${edit.token}  ${edit.text}`).join('\n');
  const grouped = makeFinding({ key: `by-value:${family}`, rule: copies[0]!.rule, family, declaration: copies[0]!.declaration,
    because: copies[0]!.because, severity: 'warn', sites,
    occurrences: copies.flatMap(f => f.occurrences ?? [f.declaration]), decisions, choices: [], edits,
    title: `${sites.length} ${({ color: 'colour', elevation: 'shadow', z: 'z-index' } as Record<string, string>)[family] ?? family} ${sites.length === 1 ? 'value matches a token but doesn\'t' : 'values match tokens but don\'t'} use ${sites.length === 1 ? 'it' : 'them'}`, action });
  return [...findings.filter(f => !copies.includes(f)), grouped];
}

function frameworkThing(family: string, prop: string): string {
  return family === 'color' ? 'palette' : family === 'type' ? prop === 'font-weight' ? 'weight' : prop === 'font-family' ? 'font' : 'type scale' : family === 'elevation' ? 'shadow' : family === 'motion' ? 'timing' : family === 'z' ? 'z-index' : family;
}
