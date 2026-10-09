import { presetImitation, presetComponentMatches } from '../presets/index.js';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { relative } from 'node:path';
import type { PlumbConfig } from '../config.js';
import { collectClasses } from '../collect/classes.js';
import type { ClassSite } from '../collect/classes.js';
import { lineStarts, references } from '../collect/source.js';
import { lowerTailwind } from '../lower/tailwind.js';
import type { ComponentGraph, ComponentIdentity, ElementIdentity } from '../ownership/components.js';
import type { Declaration, Finding, Report } from '../report.js';

export interface ImitationSuggestion {
  component: ComponentIdentity;
  fingerprint: string[];
  rawElements: number;
  notes?: string[];
}
interface Evidence { element: ElementIdentity; classes: Set<string>; declarations: Declaration[] }
type Fingerprint = NonNullable<PlumbConfig['imitation']>[string];

// Class globs are anchored to the complete candidate, never a substring.
function glob(pattern: string): RegExp {
  return new RegExp(`^${pattern.split(/([*?])/).map(part => part === '*' ? '.*' : part === '?' ? '.' : part.replace(/[\\^$+.()|{}[\]]/g, '\\$&')).join('')}$`);
}
function classRule(declaration: Declaration, tag: string, classes: Set<string>): boolean {
  if (!['stylesheet', 'apply'].includes(declaration.origin)) return false;
  return declaration.when.filter(condition => condition.kind === 'selector').some(({ text }) => {
    // Direct, positive class selectors only. No invented cascade or ancestry.
    if (/[\s>+~#]|:[\w-]+\(|\[/.test(text)) return false;
    const clean = text.replace(/:{1,2}[\w-]+/g, '');
    const selector = /^(?:([a-z][\w-]*))?((?:\.[\w-]+)+)$/.exec(clean);
    return !!selector && (!selector[1] || selector[1] === tag) && selector[2]!.slice(1).split('.').every(name => classes.has(name));
  });
}
function stylesheetIndex(declarations: Declaration[]): Map<string, Declaration[]> {
  const index = new Map<string, Declaration[]>();
  for (const declaration of declarations) if (['stylesheet', 'apply'].includes(declaration.origin)) {
    for (const { text } of declaration.when.filter(condition => condition.kind === 'selector')) {
      if (/[\s>+~#]|:[\w-]+\(|\[/.test(text)) continue;
      const token = /\.([\w-]+)/.exec(text)?.[1]; if (!token) continue;
      const entries = index.get(token) ?? []; entries.push(declaration); index.set(token, entries);
    }
  }
  return index;
}
function evidence(graph: ComponentGraph, classes: ClassSite[], declarations: Declaration[]): Evidence[] {
  const items = new Map(graph.elements.map(element => [element, { element, classes: new Set<string>(), declarations: [] as Declaration[] }]));
  for (const site of classes) if (!site.opaque) {
    const element = graph.element(site); if (element) items.get(element)!.classes.add(site.token);
  }
  for (const declaration of declarations) {
    const element = graph.element(declaration.site); if (element) items.get(element)!.declarations.push(declaration);
  }
  const stylesheet = stylesheetIndex(declarations);
  for (const item of items.values()) for (const declaration of new Set([...item.classes].flatMap(token => stylesheet.get(token) ?? []))) {
    if (classRule(declaration, item.element.tag, item.classes)) item.declarations.push(declaration);
  }
  return [...items.values()];
}
function raw(item: Evidence, component: ComponentIdentity | undefined, entry: Fingerprint): boolean {
  return /^[a-z][\w-]*$/.test(item.element.tag) && !item.element.component &&
    item.element.site.file !== component?.source.file && (!entry.elements || entry.elements.includes(item.element.tag));
}
function variableMatch(declaration: Declaration, part: string): boolean {
  if (declaration.opaque) return false;
  const exact = /^var\((--[\w-]+)\)$/.exec(part)?.[1];
  return exact ? references(declaration.value).includes(exact) || references(declaration.authoredCss ?? '').includes(exact) :
    declaration.value.includes(part) || !!declaration.authoredCss?.includes(part);
}
function matched(item: Evidence, fingerprint: string[]): string[] {
  return fingerprint.filter(part => part.startsWith('var(--')
    ? item.declarations.some(d => variableMatch(d, part))
    : [...item.classes].some(name => glob(part).test(name)));
}
function representative(item: Evidence, matches: string[]): Declaration {
  const declaration = item.declarations.find(d => matches.some(part => part.startsWith('var(--') && variableMatch(d, part)));
  const classes = [...item.classes].filter(name => matches.some(part => !part.startsWith('var(--') && glob(part).test(name))).sort().join(' ');
  // Keep an element-level location, but retain actual matched evidence in the
  // authored key so changing a wildcard class cannot inherit old ledger debt.
  const site = { ...item.element.site, text: [item.element.site.text, classes, declaration ? `${declaration.prop}: ${declaration.value}` : ''].filter(Boolean).join(' ') };
  return declaration ? { ...declaration, site, owner: { kind: 'element', name: item.element.tag } } : {
    prop: 'class', value: classes,
    refs: [], when: [], site, owner: { kind: 'element', name: item.element.tag }, origin: 'class',
  };
}
export function judgeImitation(graph: ComponentGraph, classes: ClassSite[], declarations: Declaration[], config: PlumbConfig): Finding[] {
  if (!config.imitation) return [];
  const items = evidence(graph, classes, declarations), groups = new Map<string, Finding>();
  for (const { name, entry, directories } of presetImitation(config)) {
    const identities = graph.components.filter(component => presetComponentMatches(directories, component) && (component.name === name || component.name.startsWith(name + '.')));
    const component = identities.find(component => component.name === name) ?? identities[0];
    for (const item of items) {
      if (!raw(item, component, entry) || identities.some(identity => identity.source.file === item.element.site.file)) continue;
      const matches = matched(item, entry.fingerprint).sort(); if (!matches.length) continue;
      const key = `imitation:${name}:${createHash('sha256').update(JSON.stringify([component ? relative(graph.root, component.source.file) : '', matches])).digest('hex').slice(0, 16)}`;
      const declaration = representative(item, matches), previous = groups.get(key);
      if (previous) { previous.sites.push(declaration.site); previous.occurrences!.push(declaration); continue; }
      const owns = matches.map(part => part.startsWith('var(--') ? `declarations using ${part}` : `class ${part}`).join(', ');
      groups.set(key, { key, rule: `imitation/${name}`, family: 'imitation', severity: 'error', sites: [declaration.site],
        declaration, occurrences: [declaration], decisions: [], ...(component ? { component } : {}),
        why: `Raw elements carry ${name}'s fingerprint: ${matches.join(', ')}.`,
        fix: `use <${name}>; it already owns ${owns}.` });
    }
  }
  return [...groups.values()].sort((a, b) => a.rule.localeCompare(b.rule) || a.key.localeCompare(b.key));
}

export async function suggestImitation(graph: ComponentGraph, classes: ClassSite[], report: Report, config: PlumbConfig): Promise<ImitationSuggestion[]> {
  const files = [...new Set(graph.components.map(component => component.source.file))];
  const collected = await collectClasses(files, config.classHelpers);
  const candidates = [...new Set([...collected.sites.filter(site => !site.opaque).map(site => site.token),
    ...[...graph.sourceTokens.values()].flatMap(inventory => [...inventory.classes]), ...[...graph.fingerprintClasses.values()].flat()])]
    .filter(token => /^[\w!@\[-]/.test(token) && !token.includes('${')).sort();
  const lowered = await lowerTailwind(report.root, report.tailwind.entry, report.tailwind.version, candidates, false, false, true);
  const incomplete = new Set([...lowered.candidates].filter(([, candidate]) => candidate.notes.some(note => note.startsWith('Could not lower '))).map(([token]) => token));
  const texts = new Map(await Promise.all(files.map(async file => [file, await readFile(file, 'utf8')] as const)));
  const starts = new Map([...texts].map(([file, text]) => [file, lineStarts(text)]));
  const css = stylesheetIndex(report.declarations);
  const sourceClasses = new Map(files.map(file => [file, new Set([...graph.sourceTokens.get(file)?.classes ?? [], ...collected.sites.filter(s => s.file === file && !s.opaque).map(s => s.token)])]));
  const sourceVars = new Map(files.map(file => [file, new Set([...graph.sourceTokens.get(file)?.variables ?? [], ...references(texts.get(file)!)])]));
  function declarationVars(d: Pick<Declaration, 'prop' | 'value'>): string[] {
    return [...references(d.value), ...(d.prop.startsWith('--') ? [d.prop] : [])].filter(name => !name.startsWith('--tw-'));
  }
  function declarationsFor(token: string): Pick<Declaration, 'prop' | 'value'>[] {
    return [...lowered.candidates.get(token)?.declarations ?? [], ...(css.get(token) ?? []).filter(d => classRule(d, '', new Set([token])))];
  }
  for (const [file, tokens] of sourceClasses) for (const token of tokens) for (const d of declarationsFor(token)) for (const name of declarationVars(d)) sourceVars.get(file)!.add(name);
  // Even unsupported compiler CSS can prove another component references a
  // variable. Inventory it conservatively; never invent root declarations.
  for (const [file, tokens] of sourceClasses) for (const token of tokens) if (incomplete.has(token)) {
    const text = lowered.candidates.get(token)?.css ?? '';
    for (const name of [...references(text), ...[...text.matchAll(/[;{]\s*(--[\w-]+)\s*:/g)].map(match => match[1]!)]) sourceVars.get(file)!.add(name);
  }
  for (const d of collected.styles.declarations) for (const name of declarationVars(d)) sourceVars.get(d.site.file)?.add(name);
  const items = evidence(graph, classes, report.declarations);
  return graph.components.map(component => {
    const ranges = graph.rootRanges.get(component) ?? [];
    const isRoot = (site: Declaration['site']) => {
      const offset = starts.get(site.file)?.[site.line - 1];
      return offset !== undefined && ranges.some(range => range.file === site.file && offset + site.column - 1 >= range.start && offset + site.column - 1 < range.end);
    };
    const rootClasses = new Set([...graph.fingerprintClasses.get(component) ?? [], ...collected.sites.filter(site => !site.opaque && isRoot(site)).map(site => site.token)]);
    const rootVars = new Set<string>();
    for (const token of rootClasses) for (const d of declarationsFor(token)) for (const name of declarationVars(d)) rootVars.add(name);
    for (const d of collected.styles.declarations.filter(d => isRoot(d.site))) for (const name of declarationVars(d)) rootVars.add(name);
    const others = graph.components.filter(other => other !== component);
    const fingerprint = [...[...rootClasses].filter(token => !others.some(other => sourceClasses.get(other.source.file)?.has(token))),
      ...[...rootVars].filter(name => !others.some(other => sourceVars.get(other.source.file)?.has(name))).map(name => `var(${name})`)].sort();
    const unsupported = [...rootClasses].filter(token => incomplete.has(token));
    return { component, fingerprint, rawElements: items.filter(item => raw(item, component, { fingerprint }) && matched(item, fingerprint).length).length,
      ...(unsupported.length ? { notes: [`Custom-property proposals from ${unsupported.join(', ')} omitted: compiler CSS could not be lowered. Class proposals and conservative source-reference inventory remain available.`] } : {}) };
  }).sort((a, b) => a.component.name.localeCompare(b.component.name) || a.component.source.file.localeCompare(b.component.source.file));
}
