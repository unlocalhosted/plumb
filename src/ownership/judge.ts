import { componentConfigs } from '../presets/index.js';
import { profileProgress } from '../profile.js';
import { createHash } from 'node:crypto';
import { makeFinding } from '../messages.js';
import { relative } from 'node:path';
import type { PlumbConfig } from '../config.js';
import type { Declaration, Finding } from '../report.js';
import { familiesFor, isSpacing } from '../rules/families.js';
import { components as cssParts } from '../decisions/resolve.js';
import type { ComponentGraph, ComponentIdentity, ComponentMount } from './components.js';
import type { ClassRecipe } from '../collect/class-recipes.js';
import type { Condition } from '../report.js';

/** The lowered declarations of one class, as the Tailwind compiler produced them; the judge compares properties, not class names. */
export type LoweredProps = (token: string) => { prop: string; when: Condition[] }[];
const physical = (prop: string) => prop.replace(/-inline-start$/, '-left').replace(/-inline-end$/, '-right').replace(/-block-start$/, '-top').replace(/-block-end$/, '-bottom');
const attribute = /(?<!\\)\[\s*(data-[\w-]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\]\s]+))?)\s*\]/g;
/** The conditions two classes must share to conflict: variants (hover:, md:, data-[state=open]:), never the class's own selector. */
function whenKey(when: Condition[]): string {
  const parts = when.flatMap(condition => condition.kind === 'selector' ? [...condition.text.matchAll(attribute)].map(match => `[${match[1]!.replace(/\s+/g, '')}]`) : ['media', 'pseudo', 'supports', 'container'].includes(condition.kind) ? [`${condition.kind}:${condition.text}`] : []);
  return [...new Set(parts)].sort().join('\0');
}
/** The recipe the call site selects: each axis as the caller's literal prop, else the component's default for it. */
function selectedRecipe(component: ComponentIdentity, selection: Record<string, string>, base: string[] | undefined): ClassRecipe | undefined {
  const recipes = component.recipes ?? [];
  // No variants: the component's own root classes are its one recipe (`cn("… w-72 …", className)`).
  if (!recipes.length) return base?.length ? { classes: base, variants: {}, signature: {}, default: true } : undefined;
  const defaults = recipes.find(recipe => recipe.default)?.variants ?? {};
  const wanted = { ...defaults, ...Object.fromEntries(Object.keys(defaults).flatMap(axis => axis in selection ? [[axis, selection[axis]!]] : [])) };
  return recipes.find(recipe => Object.entries(wanted).every(([axis, choice]) => recipe.variants[axis] === choice)) ?? recipes.find(recipe => recipe.default);
}
/** The recipe class whose lowered property the caller's declaration overrides, under the same variants, or undefined. */
function variantConflict(declaration: Declaration, recipe: ClassRecipe, propsOf: LoweredProps): { token: string; axis: string | null } | undefined {
  const key = whenKey(declaration.when), prop = physical(declaration.prop);
  for (const token of recipe.classes) {
    for (const lowered of propsOf(token)) {
      const expanded = properties({ ...declaration, prop: lowered.prop, value: '0', when: lowered.when }).map(item => physical(item.prop));
      if (!expanded.includes(prop) || whenKey(lowered.when) !== key) continue;
      const axis = Object.entries(recipe.signature).find(([, classes]) => classes.includes(token))?.[0] ?? null;
      return { token, axis };
    }
  }
  return undefined;
}

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
function ownsVariants(component: ComponentIdentity, config: PlumbConfig): boolean {
  let result = false;
  for (const layer of componentConfigs(config, component)) {
    if (layer.components?.own) result = layer.components.own.includes('variants');
    for (const contract of [layer.components?.contracts?.[component.name.split('.')[0]!], layer.components?.contracts?.[component.name]]) if (contract?.own) result = contract.own.includes('variants');
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

export function judgeOwnership(declarations: Declaration[], graph: ComponentGraph, config: PlumbConfig, propsOf: LoweredProps = () => []): { findings: Finding[]; coverage: OwnershipCoverage } {
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
  const locations = new Map<string, Set<string>>();
  const siteKey = (s: Declaration['site']) => JSON.stringify([s.file, s.line, s.column, s.text]);
  const coverage: OwnershipCoverage = { callerDeclarations: 0, findings: 0, heuristicFindings: 0, byFamily: {} };
  function finding(declaration: Declaration, component: ComponentIdentity, family: string, heuristic: boolean, conflict?: { token: string; axis: string | null; selection: Record<string, string>; recipe: ClassRecipe }): void {
    const key = `ownership:${component.name}:${createHash('sha256').update(JSON.stringify([relative(graph.root, component.source.file), declaration.prop, declaration.value, heuristic])).digest('hex').slice(0, 16)}`;
    const previous = groups.get(key);
    if (previous) {
      const seen = locations.get(key)!;
      const location = siteKey(declaration.site);
      if (!seen.has(location)) { seen.add(location); previous.sites.push(declaration.site); }
      return;
    }
    locations.set(key, new Set([siteKey(declaration.site)]));
    const variants = Object.entries(component.variants).map(([axis, values]) => `${axis} = ${values.join(' | ')}`).join('; ');
    const source = `${relative(graph.root, component.source.file)}:${component.source.line}`;
    const stylesheet = ['stylesheet', 'apply'].includes(declaration.origin);
    const subject = stylesheet ? declaration.owner.name : ['class', 'arbitrary'].includes(declaration.origin) ? declaration.site.text : declaration.prop;
    if (conflict) {
      // The variant's value is the decision; cn() (tailwind-merge) lets the call site's class win over it.
      const chosen = conflict.axis ? `${conflict.axis} = ${conflict.recipe.variants[conflict.axis] ?? 'default'}` : 'base';
      groups.set(key, makeFinding({ key, rule: `ownership/${component.name}`, family, severity: 'error', sites: [declaration.site], declaration, decisions: [], component,
        title: `\`${subject}\` overrides ${component.name}'s \`${conflict.token}\` (${chosen})`,
        because: `${component.name}'s ${chosen} sets ${declaration.prop} with \`${conflict.token}\`; cn() merges classes with tailwind-merge, so this call site's class wins and the variant no longer decides.`,
        action: `${variants ? `Use a variant: ${variants}.` : `${component.name} has no variant for this. Ask for one, or wrap it in an element you style.`} Defined in ${source}.` }));
      return;
    }
    groups.set(key, makeFinding({ key, rule: `ownership/${component.name}`, family, severity: heuristic ? 'warn' : 'error', sites: [declaration.site],
      declaration, decisions: [], component,
      title: `\`${subject}\` ${stylesheet ? 'sets' : 'changes'} ${component.name}'s ${declaration.prop}${heuristic ? ' (may apply)' : ''}`,
      because: `${component.name} controls its ${{ paint: 'colour', type: 'type', radius: 'corners', elevation: 'shadow', padding: 'padding' }[family] ?? family}; outside overrides break when its design changes.`,
      action: `${variants ? `Use a variant: ${variants}.` : `${component.name} has no variant for this. Ask for one, or wrap it in an element you style.`} Defined in ${source}.` }));
  }
  for (const [index, original] of declarations.entries()) {
    if (index % 256 === 0) profileProgress('rule:ownership', { current: index, total: declarations.length });
    if (original.origin === 'keyframes' || original.sourceOrigin === 'framework') continue;
    const component = graph.caller(original);
    if (component) {
      // A component that owns 'variants' owns every property its selected recipe sets: a conflicting call-site class is drift.
      const byVariants = ownsVariants(component, config) ? selectedRecipe(component, graph.selection(original) ?? {}, graph.fingerprintClasses.get(component)) : undefined;
      for (const declaration of properties(original)) {
        const family = ownershipFamily(declaration.prop), fails = owned(declaration.prop, family, component, config);
        const counts = coverage.byFamily[family] ??= { total: 0, allowed: 0, findings: 0 };
        coverage.callerDeclarations++; counts.total++;
        if (fails) { coverage.findings++; counts.findings++; finding(declaration, component, family, false); continue; }
        const conflict = byVariants && !declaration.opaque ? variantConflict(declaration, byVariants, propsOf) : undefined;
        if (conflict) { coverage.findings++; counts.findings++; finding(declaration, component, family, false, { ...conflict, selection: graph.selection(original) ?? {}, recipe: byVariants! }); }
        else counts.allowed++;
      }
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
  profileProgress('rule:ownership', { current: declarations.length, total: declarations.length });
  return { findings: [...groups.values()].sort((a, b) => a.rule.localeCompare(b.rule) || a.key.localeCompare(b.key)), coverage };
}
