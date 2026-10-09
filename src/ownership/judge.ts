import { componentConfigs } from '../presets/index.js';
import { createHash } from 'node:crypto';
import { makeFinding } from '../messages.js';
import { relative } from 'node:path';
import type { PlumbConfig } from '../config.js';
import type { Declaration, Finding } from '../report.js';
import { familiesFor, isSpacing } from '../rules/families.js';
import { components as cssParts } from '../decisions/resolve.js';
import type { ComponentGraph, ComponentIdentity, ComponentMount } from './components.js';

export interface OwnershipCoverage {
  callerDeclarations: number;
  findings: number;
  heuristicFindings: number;
  byFamily: Record<string, { total: number; allowed: number; findings: number }>;
}
const defaults = ['paint', 'type', 'radius', 'elevation', 'padding'];
export function ownershipFamily(prop: string): string {
  if (/^padding(?:-|$)/.test(prop)) return 'padding';
  if (prop === 'box-shadow') return 'elevation';
  if (/^border(?:-(?:top|bottom)-(?:left|right)|-(?:start|end)-(?:start|end))?-radius$/.test(prop)) return 'radius';
  if (/^(?:font|font-size|font-weight|font-family|line-height|letter-spacing)$/.test(prop)) return 'type';
  if (/^(?:color|background(?:-color|-image)?|border(?:-(?:top|right|bottom|left|block|inline)(?:-(?:start|end))?)?(?:-color)?|outline(?:-color)?|text-decoration(?:-color)?|fill|stroke|caret-color|accent-color|column-rule(?:-color)?|text-shadow)$/.test(prop)) return 'paint';
  if (/^margin(?:-|$)/.test(prop)) return 'margin';
  if (/^(?:(?:min-|max-)?(?:width|height|inline-size|block-size)|aspect-ratio)$/.test(prop)) return 'size';
  if (/^(?:flex(?:-.+)?|grid(?:-.+)?|gap|row-gap|column-gap|order|align-.+|justify-.+|place-.+)$/.test(prop)) return 'layout';
  if (/^(?:position|inset(?:-.+)?|top|right|bottom|left|z-index)$/.test(prop)) return 'position';
  if (prop.startsWith('--')) return 'custom-property';
  return 'other';
}
function owned(prop: string, family: string, component: ComponentIdentity, config: PlumbConfig): boolean {
  const matches = (item: string) => item === prop || item === family || item === 'spacing' && isSpacing(prop) || item !== 'color' && familiesFor(prop).some(value => value === item);
  let result = defaults.some(matches);
  for (const layer of componentConfigs(config, component)) {
    if (layer.components?.own) result = layer.components.own.some(matches);
    const base = layer.components?.contracts?.[component.name.split('.')[0]!];
    const specific = layer.components?.contracts?.[component.name];
    for (const contract of new Set([base, specific].filter(value => value !== undefined))) {
      if (contract.own) result = contract.own.some(matches);
      if (contract.allow?.some(matches)) result = false;
      if (contract.deny?.some(matches)) result = true;
    }
  }
  return result;
}
function properties(declaration: Declaration): Declaration[] {
  const match = /^(padding)(?:-(inline|block))?$/.exec(declaration.prop);
  if (!match || declaration.opaque) return [declaration];
  const important = /\s*!important\s*$/.test(declaration.value) ? ' !important' : '';
  const parts = cssParts(declaration.value.replace(/\s*!important\s*$/, ''));
  if (!parts.length || parts.length > (match[2] ? 2 : 4)) return [declaration];
  const sides = match[2] ? [`${match[2]}-start`, `${match[2]}-end`] : ['top', 'right', 'bottom', 'left'];
  const values = match[2] ? [parts[0]!, parts[1] ?? parts[0]!] : [parts[0]!, parts[1] ?? parts[0]!, parts[2] ?? parts[0]!, parts[3] ?? parts[1] ?? parts[0]!];
  return sides.map((side, index) => ({ ...declaration, prop: `padding-${side}`, value: values[index]! + important }));
}
interface SelectorSubject { tag?: string; classes: string[] }
interface SelectorMatcher { root?: SelectorSubject; test(mount: ComponentMount): 'caller' | 'heuristic' | undefined }
function selectorMatcher(selector: string): SelectorMatcher {
  // Functional pseudos, IDs and sibling combinators are deliberately unknown.
  // Never turn :not/:is/:has into an unconditional match by stripping their body.
  if (/:[\w-]+\(|[#+~]/.test(selector)) return { test: () => undefined };
  const clean = selector.replace(/\[[^\]]*\]/g, '').replace(/:{1,2}[\w-]+/g, '').trim();
  const tokens = clean.split(/\s*(>)\s*|\s+/).filter(Boolean);
  const subjects = tokens.map(token => {
    if (token === '>') return token;
    const tag = /^[a-z][\w-]*/.exec(token)?.[0];
    return { ...(tag ? { tag } : {}), classes: [...token.matchAll(/\.([\w-]+)/g)].map(item => item[1]!) };
  });
  const root = subjects.pop();
  if (!root || typeof root === 'string') return { test: () => undefined };
  function match(subject: SelectorSubject, elements: string[], classes: string[]): boolean {
    return !!(subject.tag || subject.classes.length) && (!subject.tag || elements.includes(subject.tag)) && subject.classes.every(name => classes.includes(name));
  }
  return { root, test: mount => {
    if (!match(root, mount.component.roots.elements, [...mount.component.roots.classes, ...mount.classes])) return;
    // A class explicitly supplied by this caller is exact evidence for a simple
    // selector. Root hooks alone and descendant selectors remain heuristics.
    if (!subjects.length) return root.classes.length && root.classes.every(name => mount.classes.includes(name)) ? 'caller' : undefined;
    let index = mount.ancestors.length - 1;
    for (let part = subjects.length - 1; part >= 0; part--) {
      const direct = subjects[part] === '>'; if (direct) part--;
      const subject = subjects[part]; if (!subject || typeof subject === 'string') return;
      let found = false;
      while (index >= 0) {
        const ancestor = mount.ancestors[index--]!;
        if (match(subject, [ancestor.element], ancestor.classes)) { found = true; break; }
        if (direct) break;
      }
      if (!found) return;
    }
    return 'heuristic';
  } };
}

export function judgeOwnership(declarations: Declaration[], graph: ComponentGraph, config: PlumbConfig): { findings: Finding[]; coverage: OwnershipCoverage } {
  const groups = new Map<string, Finding>();
  const selectorOwners = new Map<string, { identity: ComponentIdentity; heuristic: boolean }[]>();
  const tags = new Map<string, ComponentMount[]>(), classes = new Map<string, ComponentMount[]>();
  for (const mount of graph.mounts) {
    for (const [index, names] of [[tags, mount.component.roots.elements], [classes, [...mount.component.roots.classes, ...mount.classes]]] as const) {
      for (const name of new Set(names)) {
        const group = index.get(name) ?? []; group.push(mount); index.set(name, group);
      }
    }
  }
  const coverage: OwnershipCoverage = { callerDeclarations: 0, findings: 0, heuristicFindings: 0, byFamily: {} };
  function finding(declaration: Declaration, component: ComponentIdentity, family: string, heuristic: boolean): void {
    const key = `ownership:${component.name}:${createHash('sha256').update(JSON.stringify([relative(graph.root, component.source.file), declaration.prop, declaration.value, heuristic])).digest('hex').slice(0, 16)}`;
    const previous = groups.get(key);
    if (previous) {
      if (!previous.sites.some(site => site.file === declaration.site.file && site.line === declaration.site.line && site.column === declaration.site.column && site.text === declaration.site.text)) previous.sites.push(declaration.site);
      return;
    }
    const variants = Object.entries(component.variants).map(([axis, values]) => `${axis} = ${values.join(' | ')}`).join('; ');
    const source = `${relative(graph.root, component.source.file)}:${component.source.line}`;
    const stylesheet = ['stylesheet', 'apply'].includes(declaration.origin);
    const subject = stylesheet ? declaration.owner.name : ['class', 'arbitrary'].includes(declaration.origin) ? declaration.site.text : declaration.prop;
    groups.set(key, makeFinding({ key, rule: `ownership/${component.name}`, family, severity: heuristic ? 'warn' : 'error', sites: [declaration.site],
      declaration, decisions: [], component,
      title: `\`${subject}\` ${stylesheet ? 'sets' : 'changes'} ${component.name}'s ${declaration.prop}${heuristic ? ' (may apply)' : ''}`,
      because: `${component.name} controls its ${{ paint: 'colour', type: 'type', radius: 'corners', elevation: 'shadow', padding: 'padding' }[family] ?? family}; outside overrides break when its design changes.`,
      action: `${variants ? `Use a variant: ${variants}.` : `${component.name} has no variant for this. Ask for one, or wrap it in an element you style.`} Defined in ${source}.` }));
  }
  for (const original of declarations) {
    if (original.origin === 'keyframes' || original.sourceOrigin === 'framework') continue;
    const component = graph.caller(original);
    if (component) for (const declaration of properties(original)) {
      const family = ownershipFamily(declaration.prop), fails = owned(declaration.prop, family, component, config);
      const counts = coverage.byFamily[family] ??= { total: 0, allowed: 0, findings: 0 };
      coverage.callerDeclarations++; counts.total++;
      if (fails) { coverage.findings++; counts.findings++; finding(declaration, component, family, false); }
      else counts.allowed++;
    }
    if (!component && ['stylesheet', 'apply'].includes(original.origin)) {
      const selectors = original.when.filter(condition => condition.kind === 'selector').map(condition => condition.text);
      const selectorKey = JSON.stringify(selectors);
      let owners = selectorOwners.get(selectorKey);
      if (!owners) {
        const matches = new Map<ComponentIdentity, boolean>();
        for (const matcher of selectors.map(selectorMatcher)) {
          if (!matcher.root) continue;
          const buckets = matcher.root.classes.map(name => classes.get(name) ?? []);
          if (matcher.root.tag) buckets.push(tags.get(matcher.root.tag) ?? []);
          // Every root token must match, so the smallest index is sufficient.
          const candidates = buckets.sort((a, b) => a.length - b.length)[0] ?? [];
          for (const mount of candidates) {
            const result = matcher.test(mount);
            if (result) matches.set(mount.component, (matches.get(mount.component) ?? true) && result !== 'caller');
          }
        }
        owners = graph.used.flatMap(identity => matches.has(identity) ? [{ identity, heuristic: matches.get(identity)! }] : []);
        selectorOwners.set(selectorKey, owners);
      }
      for (const { identity, heuristic } of owners) {
        if (identity.source.file === original.site.file) continue;
        for (const declaration of properties(original)) {
          const family = ownershipFamily(declaration.prop);
          const fails = owned(declaration.prop, family, identity, config);
          if (heuristic) { if (fails) { coverage.heuristicFindings++; finding(declaration, identity, family, true); } }
          else {
            const counts = coverage.byFamily[family] ??= { total: 0, allowed: 0, findings: 0 };
            coverage.callerDeclarations++; counts.total++;
            if (fails) { coverage.findings++; counts.findings++; finding(declaration, identity, family, false); } else counts.allowed++;
          }
        }
      }
    }
  }
  return { findings: [...groups.values()].sort((a, b) => a.rule.localeCompare(b.rule) || a.key.localeCompare(b.key)), coverage };
}
