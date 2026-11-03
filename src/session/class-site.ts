import { parseSync, visitorKeys } from 'oxc-parser';
import type { Node } from 'oxc-parser';
import { UsageError } from '../errors.js';
import { lineStarts } from '../collect/source.js';
import { ADD_UNDER_CONDITION, NOT_ITS_STRING, branchOf, classSources, classSourcesAt, elementSources } from './props.js';
import type { Branch, ClassRef, ClassString, Trail } from './props.js';
import { isComponentJSX as isComponentTag, jsxLocation } from './source-location.js';

/**
 * Where each class an element wears is written (docs/research/engine-review.md item 1): the one resolver the cards, the
 * recipe plan (src/recipes/plan.ts) and every pinned writer ask (`pinnedString`: a write names a string by position, and
 * is taken only when the string is one this resolver reaches). Pure over source texts: the caller reads the files, this
 * answers with plain data.
 *
 * A class is written in a plain string: the element's own className (a literal, a template's fixed part, a ternary's
 * branch, a cn() argument), a variable declared in the same file that the className reads, or, when the className reads
 * one of its component's props, the usage up the component chain that passes that prop. A string under a condition
 * carries the condition (`branch`), so a writer changes the class in the case it is written for and never adds into one.
 */

/** A source file as the caller names it (`file`, echoed back) and as the parser needs it (`path`, for the extension). */
export interface SourceText { file: string; path: string; text: string }
export interface Located extends SourceText { line: number; column: number }
/** The project's modules, as the engine resolves them (src/session/modules.ts): a specifier written in the file at `from`
 * (a path in the caller's scheme) to the project source file it names, read; null for a package or anything that resolves
 * to no source file of the project. The resolver asks it and stays pure over the texts it is handed. */
export type ModuleFacts = (from: string, specifier: string) => SourceText | null;
export interface ClassSiteInput {
  element: Located;
  /** the usages above the element, nearest first: each one where a component the element sits in is used */
  chain: Located[];
  /** how a usage's import reaches the component's file: relative paths, index files, aliases, re-exports */
  modules: ModuleFacts;
  /** the classes asked about; every class of the strings found when absent */
  classes?: string[];
}
export interface ElementRef { file: string; line: number; column: number; tag: string }
export interface StringRef { start: number; end: number; text: string; line: number; column: number }
export interface ClassSite {
  class: string;
  /** where the class itself is written */
  file: string; line: number; column: number;
  /** own: in the element's className; variable: in a variable that an attribute reads; usage: in a prop at a usage up the chain */
  kind: 'own' | 'variable' | 'usage';
  /** the attribute that carries it: className on the element, the prop at a usage */
  prop: string;
  variable?: string;
  /** for a variable: how many places in its file read it (more than one: a change there changes them all) */
  readers?: number;
  /** the element whose attribute reads it: a writer sends this line and column, with `at` = the string's line and column */
  element: ElementRef;
  string: StringRef;
  branch?: Branch;
}
export interface ClassEntry { class: string; sites: ClassSite[]; refused?: string }
/** Where a class that is written nowhere yet goes: the narrowest string that always applies and that no other element
 * reads. No `string`: the element has no className, and one is written on it. `shared`: the element's classes also come
 * in from a usage that was not found, so this string is the component's own, and an add there changes every copy. */
export interface AddSite { file: string; kind: ClassSite['kind']; prop: string; variable?: string; readers?: number; element: ElementRef; string?: StringRef; shared?: true }
export interface ClassSiteAnswer {
  element: ElementRef;
  classes: ClassEntry[];
  add: AddSite | null;
  addRefused?: string;
  /** set when none of the classes is written in a plain string */
  refused?: string;
}

const BUILT = 'built in code, so it can\'t be changed here';
/** Why a class is not added into a variable other elements read. */
const sharedVariable = (name: string, readers: number) => `The classes that always apply here are written in \`${name}\`, which ${readers} places read, so a class added there would change all of them. Add it on the element, or by hand.`;

interface Parsed extends SourceText { program: Node; starts: number[] }
interface Holder { src: Parsed; kind: 'own' | 'usage'; prop: string; element: ElementRef; level: number; next: number; variable?: string; readers?: number }
interface Found { string: ClassString; holder: Holder }
type Binding = { kind: 'variable'; init: Node } | { kind: 'prop'; prop: string | null; /** a rest pattern: the props its siblings took out of it */ except?: string[]; component: Component } | undefined;
/** A component: every name it answers to (the declarator first, then the function's own: `const Panel = memo(function Inner…)`), and the file it is in. */
interface Component { names: string[]; isDefault: boolean; file?: string }
interface Resolved {
  own: { src: Parsed; location: { start: number; tag: string }; ref: ElementRef };
  sources: ReturnType<typeof elementSources>; ownAttribute: unknown;
  /** every string found, one per place */
  strings: Found[];
  /** props the classes come in through that the chain did not reach */
  unfollowed: string[];
}

/** Every string an element's classes are written in, by following its className through variables and up the chain. */
function resolve(input: ClassSiteInput, usageProps = false): Resolved {
  const parsed = new Map<string, Parsed>();
  const open = (source: SourceText): Parsed => {
    const kept = parsed.get(source.path);
    if (kept) return kept;
    const result = parseSync(source.path, source.text);
    if (result.errors.length) throw new UsageError(`${source.file} does not parse; fix it first.`);
    const value = { ...source, program: result.program as unknown as Node, starts: lineStarts(source.text) };
    parsed.set(source.path, value);
    return value;
  };
  const locate = (link: Located) => {
    const src = open(link), location = jsxLocation(link.path, link.text, link.line, link.column, undefined, 'any');
    if (!location) throw new UsageError(`${link.file}:${link.line}:${link.column} is not a JSX element.`);
    return { src, location, ref: { file: link.file, line: location.line, column: location.column, tag: location.tag } };
  };

  const own = locate(input.element);
  const found: Found[] = [];
  const unfollowed: string[] = [];
  // each name read is followed once: a variable that reads itself (`const a = cn(a)`) ends here, not in a loop
  const seen = new Set<string>();

  const take = (sources: { strings: ClassString[]; refs: ClassRef[] }, holder: Holder): void => {
    for (const string of sources.strings) found.push({ string, holder });
    for (const ref of sources.refs) follow(ref, holder);
  };
  const follow = (ref: ClassRef, holder: Holder): void => {
    const key = `${holder.src.path}:${ref.start}:${ref.path.join('.')}`;
    if (seen.has(key)) return;
    seen.add(key);
    const binding = bindingOf(holder.src.program, ref.start, ref.name);
    if (binding?.kind === 'variable') {
      take(classSourcesAt(binding.init, ref.path, holder.src.text, ref.trail), { ...holder, variable: ref.name, readers: readers(holder.src.program, ref.name, binding.init) });
      return;
    }
    if (binding?.kind !== 'prop') return;
    // `className` (destructured) reads the prop itself; `props.className`, `styles.root` read a path into it
    const prop = binding.prop ?? ref.path[0], rest = binding.prop === null ? ref.path.slice(1) : ref.path;
    if (!prop) return;
    // a rest pattern its siblings took this prop out of (`{ className, ...rest }`): the rest does not carry it
    if (binding.except?.includes(prop)) return;
    const component = { ...binding.component, file: holder.src.path };
    for (let i = holder.next; i < input.chain.length; i++) {
      const link = input.chain[i]!, at = locate(link);
      if (!usesComponent(at.src, at.ref.tag, component, { modules: input.modules, open })) continue;
      const usage = elementSources(at.src.path, at.src.text, at.location.start);
      const next: Holder = { src: at.src, kind: 'usage', prop, element: at.ref, level: i + 1, next: i + 1 };
      const attribute = usage.attributes.get(prop);
      if (attribute) {
        const outer = ref.trail, value = rest.length ? classSourcesAt(attribute.value, rest, at.src.text) : attribute;
        take({ strings: value.strings.map(s => under(outer, s)), refs: value.refs.map(r => ({ ...r, trail: [...outer, ...r.trail] })) }, next);
        return;
      }
      // not passed by name: a usage that spreads its own props on (`<Panel {...props} />`) passes whatever it was given
      for (const spread of usage.spreads) follow({ ...spread, path: [prop, ...rest], trail: ref.trail }, next);
      return; // the usage does not pass it: nothing of it is written there
    }
    unfollowed.push(prop);
  };

  const sources = elementSources(own.src.path, own.src.text, own.location.start);
  const ownProp = sources.attributes.has('className') || !sources.attributes.has('class') ? 'className' : 'class';
  const ownAttribute = sources.attributes.get(ownProp);
  const holder: Holder = { src: own.src, kind: 'own', prop: ownProp, element: own.ref, level: 0, next: 0 };
  if (ownAttribute) take(ownAttribute, holder);
  // no className of its own: one spread in from the component's props (`{ to, ...props }` → `{...props}`) is the className
  // its usage passes; only a prop is followed, never a spread object written here (its keys are props, not classes)
  else for (const ref of sources.spreads) if (bindingOf(own.src.program, ref.start, ref.name)?.kind === 'prop') follow({ ...ref, path: [ownProp] }, holder);
  // a pinned write sent without the element it was read through (no `of`): a component usage's own class props
  // (`gapClass`, `subtitleClassName`) are its strings too, by their name; any other prop (`href`) is not
  if (usageProps && isComponentTag(sources.tag)) {
    for (const [name, attribute] of sources.attributes) if (name !== ownProp && /(?:^c|C)lass(?:Name)?$/.test(name)) take(attribute, { ...holder, kind: 'usage', prop: name });
  }

  // one entry per string: a variable read twice is one place
  const strings = [...new Map(found.map(f => [`${f.holder.src.path}:${f.string.start}`, f])).values()];
  return { own, sources, ownAttribute, strings, unfollowed };
}

export function classSites(input: ClassSiteInput): ClassSiteAnswer {
  const { own, sources, ownAttribute, strings, unfollowed } = resolve(input);
  const tokens = strings.flatMap(f => [...f.holder.src.text.slice(f.string.start, f.string.end).matchAll(/\S+/g)].map(m => ({ token: m[0], offset: f.string.start + m.index, f })));
  const wanted = [...new Set(input.classes ?? tokens.map(t => t.token))];
  const why = unfollowed.length ? ` (it comes in through ${[...new Set(unfollowed)].map(p => '`' + p + '`').join(', ')})` : '';
  const classes = wanted.map((name): ClassEntry => {
    const sites = tokens.filter(t => t.token === name).map(({ offset, f }): ClassSite => {
      const where = position(f.holder.src, offset);
      return {
        class: name, file: f.holder.src.file, line: where.line, column: where.column,
        kind: f.holder.variable ? 'variable' : f.holder.kind, prop: f.holder.prop, ...variableOf(f.holder),
        element: f.holder.element, string: stringRef(f), ...(f.string.branch ? { branch: f.string.branch } : {}),
      };
    });
    return sites.length ? { class: name, sites } : { class: name, sites, refused: `${name} is ${BUILT}${why}.` };
  });

  const answer: ClassSiteAnswer = { element: own.ref, classes, add: null };
  if (wanted.length && classes.every(c => !c.sites.length)) answer.refused = `Its classes are ${BUILT}${why}.`;
  // the narrowest string that always applies: the furthest usage up the chain that writes one, else the element's own;
  // never a variable other places read (a class added there lands on all of them)
  const always = strings.filter(f => !f.string.branch).sort((a, b) => b.holder.level - a.holder.level);
  const pick = always.find(f => !shared(f.holder));
  if (pick) {
    const h = pick.holder;
    answer.add = { file: h.src.file, kind: h.variable ? 'variable' : h.kind, prop: h.prop, ...variableOf(h), element: h.element, string: stringRef(pick),
      ...(h.level === 0 && unfollowed.length ? { shared: true as const } : {}) };
  } else if (always.length) answer.addRefused = sharedVariable(always[0]!.holder.variable!, always[0]!.holder.readers!);
  else if (strings.length) answer.addRefused = ADD_UNDER_CONDITION;
  else if (!ownAttribute && !sources.spread && !isComponentTag(sources.tag)) answer.add = { file: own.ref.file, kind: 'own', prop: 'className', element: own.ref };
  else answer.addRefused = sources.spread && !ownAttribute ? 'This element spreads props, which may carry className; add the class by hand.'
    : isComponentTag(sources.tag) && !ownAttribute ? `<${sources.tag}> is a component; add the class inside it, by hand.` : `Its classes are ${BUILT}${why}.`;
  return answer;
}

/**
 * The string a pinned write names (`at`, as an offset in the holder's file), checked against the strings the element
 * reaches: the holder is the element the write is sent with (its own className, a variable it reads, or a usage up the
 * chain when `input` is the element the classes were asked about), and the string must be one of the strings found for
 * that holder. An add (nothing taken out) must go into a string that always applies and that no other place reads. The
 * reader (classSites) and every writer go through `resolve`, so the two cannot disagree.
 */
export function pinnedString(input: ClassSiteInput, holder: { path: string; line: number; column: number }, offset: number, write: PinWrite): ClassString {
  const { strings } = resolve(input, input.chain.length === 0);
  const hit = strings.find(f => f.holder.src.path === holder.path && f.holder.element.line === holder.line && f.holder.element.column === holder.column && f.string.start <= offset && offset <= f.string.end);
  if (!hit) throw new UsageError(NOT_ITS_STRING);
  if (write === 'add' && hit.string.branch) throw new UsageError(ADD_UNDER_CONDITION);
  if (write !== 'change' && shared(hit.holder)) throw new UsageError(sharedVariable(hit.holder.variable!, hit.holder.readers!));
  return hit.string;
}
/**
 * What a write into a string does, by what it takes out and puts in: `change` takes a class out (it changes what is
 * written there, wherever that is read); `add` takes nothing out (a new class, which goes only where a class always
 * applies and no other element reads); `beside` keeps every class it names and adds one next to them (`px-2.5` →
 * `px-2.5 pl-3`): an add, so never into a variable other elements read, but it stays with the class it sits beside,
 * under that class's condition.
 */
export type PinWrite = 'change' | 'add' | 'beside';
export function pinWrite(from: string[], to: string[]): PinWrite {
  if (!from.length) return 'add';
  return from.every(c => to.includes(c)) && to.some(c => !from.includes(c)) ? 'beside' : 'change';
}

const shared = (h: Holder) => !!h.variable && (h.readers ?? 1) > 1;
const variableOf = (h: Holder) => h.variable ? { variable: h.variable, readers: h.readers ?? 1 } : {};

function stringRef(f: Found): StringRef {
  const where = position(f.holder.src, f.string.start);
  return { start: f.string.start, end: f.string.end, text: f.holder.src.text.slice(f.string.start, f.string.end), line: where.line, column: where.column };
}
function position(src: Parsed, offset: number): { line: number; column: number } {
  let low = 0, high = src.starts.length;
  while (low + 1 < high) { const middle = (low + high) >>> 1; if (src.starts[middle]! <= offset) low = middle; else high = middle; }
  return { line: low + 1, column: offset - src.starts[low]! + 1 };
}
/** A string found at a usage sits under the conditions of the hole that passes it on, outermost first. */
function under(outer: Trail, string: ClassString): ClassString {
  if (!outer.length) return string;
  const inner: Trail = string.branch ? [...(string.branch.within ?? []), { condition: string.branch.condition, which: string.branch.which }] : [];
  return { ...string, branch: branchOf([...outer, ...inner])! };
}

// ---------------------------------------------------------------- scope: what a name in a className reads
const children = (node: Node): Node[] => {
  const record = node as unknown as Record<string, unknown>, out: Node[] = [];
  for (const key of visitorKeys[node.type] ?? []) {
    const value = record[key];
    for (const child of Array.isArray(value) ? value : [value]) if (child && typeof child === 'object' && typeof (child as Node).type === 'string') out.push(child as Node);
  }
  return out;
};
/** The nodes that contain an offset, outermost first. */
function ancestorsAt(program: Node, offset: number): Node[] {
  const path: Node[] = [];
  let node: Node | undefined = program;
  while (node) { path.push(node); node = children(node).find(child => child.start <= offset && offset < child.end); }
  return path;
}
const isFunction = (node: Node) => node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression';
const keyName = (key: Node): string | undefined => key.type === 'Identifier' ? key.name : key.type === 'Literal' && typeof key.value === 'string' ? key.value : undefined;
/** Whether a binding pattern binds a name: `null` for the whole value (`props`, `...rest`), else the key it is read from.
 * A rest pattern also says which keys its siblings took out of it (`{ className, ...rest }`: rest has no className). */
function binds(pattern: Node, name: string): { key: string | null; except?: string[] } | undefined {
  const target = pattern.type === 'AssignmentPattern' ? pattern.left : pattern;
  if (target.type === 'Identifier') return target.name === name ? { key: null } : undefined;
  if (target.type !== 'ObjectPattern') return undefined;
  for (const property of target.properties) {
    if (property.type === 'RestElement') {
      if (property.argument.type !== 'Identifier' || property.argument.name !== name) continue;
      const except = target.properties.flatMap(p => p.type === 'Property' && !p.computed ? [keyName(p.key)].filter((k): k is string => k !== undefined) : []);
      return { key: null, ...(except.length ? { except } : {}) };
    }
    if (property.type !== 'Property' || property.computed) continue;
    const value = property.value.type === 'AssignmentPattern' ? property.value.left : property.value;
    const key = keyName(property.key);
    if (key !== undefined && value.type === 'Identifier' && value.name === name) return { key };
  }
  return undefined;
}
/** What a name read at an offset is bound to: a variable with a value written here, or a prop of the component it sits in.
 * Anything else (a loop variable, a parameter of a callback, an import) is not followed. `seen`: the names already asked
 * about on the way (`const { a } = b; const { b } = a` ends, it does not loop). */
function bindingOf(program: Node, offset: number, name: string, seen = new Set<string>()): Binding {
  if (seen.has(`${offset}:${name}`)) return undefined;
  seen.add(`${offset}:${name}`);
  const path = ancestorsAt(program, offset);
  for (let i = path.length - 1; i >= 0; i--) {
    const node = path[i]!;
    if (isFunction(node)) {
      const list = (node as unknown as { params: Node[] }).params;
      const at = list.findIndex(param => binds(param, name));
      if (at < 0) continue;
      const component = at === 0 ? componentOf(path.slice(0, i + 1)) : undefined;
      const bound = binds(list[0]!, name)!;
      return component ? { kind: 'prop', prop: bound.key, ...(bound.except ? { except: bound.except } : {}), component } : undefined;
    }
    const body = node.type === 'Program' || node.type === 'BlockStatement' ? node.body as Node[] : undefined;
    for (const statement of body ?? []) {
      const declaration = statement.type === 'VariableDeclaration' ? statement : statement.type === 'ExportNamedDeclaration' && statement.declaration?.type === 'VariableDeclaration' ? statement.declaration : undefined;
      for (const d of declaration?.declarations ?? []) {
        if (!d.init) continue;
        if (d.id.type === 'Identifier') { if (d.id.name === name) return { kind: 'variable', init: d.init }; continue; }
        // const { className } = props: the prop the whole props object carries; const { className, ...rest } = props: the rest without it
        const bound = binds(d.id, name), source = unwrapped(d.init);
        if (!bound) continue;
        if (source.type !== 'Identifier') return undefined;
        const outer = bindingOf(program, source.start, source.name, seen);
        if (outer?.kind !== 'prop' || outer.prop !== null) return undefined;
        if (bound.key === null) return { ...outer, except: [...outer.except ?? [], ...bound.except ?? []] };
        // a key its rest's siblings took out (`{ className: c, ...rest }` then `const { className } = rest`): never in it
        return outer.except?.includes(bound.key) ? undefined : { kind: 'prop', prop: bound.key, component: outer.component };
      }
    }
  }
  return undefined;
}
/** How many places in the file read a variable: every name that resolves to the same declaration (the class lists of
 * other elements, a cn() call elsewhere). */
function readers(program: Node, name: string, init: Node): number {
  let count = 0;
  const visited = new Set<Node>();
  const walk = (node: Node, parent: Node | undefined): void => {
    if (visited.has(node)) return; // a shorthand property's key and value may be one node
    visited.add(node);
    if (node.type === 'Identifier' && node.name === name && isReference(node, parent)) {
      const bound = bindingOf(program, node.start, name);
      if (bound?.kind === 'variable' && bound.init === init) count++;
    }
    for (const child of children(node)) walk(child, node);
  };
  walk(program, undefined);
  return Math.max(1, count);
}
/** A name read as a value, not declared, nor a key or a member's property. */
function isReference(node: Node, parent: Node | undefined): boolean {
  if (!parent) return true;
  if (parent.type === 'VariableDeclarator' && parent.id === node) return false;
  if ((parent.type === 'MemberExpression') && parent.property === node && !parent.computed) return false;
  // a shorthand property (`{ look }`) reads the name once, through its value: its key is not a second read
  if ((parent.type === 'Property' || parent.type === 'MethodDefinition' || parent.type === 'PropertyDefinition') && parent.key === node && !parent.computed && !(parent.type === 'Property' && parent.shorthand && parent.value === node)) return false;
  if (parent.type.startsWith('Import') || parent.type.startsWith('Export')) return false;
  if (isFunction(parent) || parent.type === 'ClassDeclaration' || parent.type === 'LabeledStatement') return false;
  return true;
}
const unwrapped = (node: Node): Node => node.type === 'ParenthesizedExpression' || node.type === 'TSAsExpression' || node.type === 'TSSatisfiesExpression' || node.type === 'TSNonNullExpression' ? unwrapped(node.expression) : node;
/** The component a function is (its path ends at the function): `function Panel`, `const Panel = () =>`, memo/forwardRef
 * around one, or the file's default export. It answers to every name it has: the declarator's first
 * (`const Panel = memo(function Inner…)` is used as `<Panel>`), then the function's own. A function that is none of these
 * is not a component. */
function componentOf(path: Node[]): Component | undefined {
  const fn = path.at(-1)!, program = path[0]!;
  const names: string[] = [], inner = (fn.type === 'FunctionDeclaration' || fn.type === 'FunctionExpression') && fn.id ? fn.id.name : undefined;
  let isDefault = false;
  for (let i = path.length - 2; i >= 0; i--) {
    const parent = path[i]!;
    if (parent.type === 'CallExpression' || parent.type === 'ParenthesizedExpression' || parent.type === 'TSAsExpression' || parent.type === 'TSSatisfiesExpression') continue;
    if (parent.type === 'VariableDeclarator' && parent.id.type === 'Identifier') names.push(parent.id.name);
    if (parent.type === 'ExportDefaultDeclaration') isDefault = true;
    break;
  }
  if (inner && !names.includes(inner)) names.push(inner);
  // `export default Card`, `export default memo(Card)`, `memo(forwardRef(Card))`, `export { Card as default }`
  if (!isDefault) isDefault = (program.type === 'Program' ? program.body as Node[] : []).some(s => s.type === 'ExportDefaultDeclaration' ? names.includes(wrappedName(s.declaration as Node) ?? '')
    : s.type === 'ExportNamedDeclaration' && !s.source && (s.specifiers ?? []).some(x => keyName(x.exported as Node) === 'default' && names.includes(keyName(x.local as Node) ?? '')));
  if (!isDefault && !names.some(name => /^[A-Z]/.test(name))) return undefined;
  return { names, isDefault };
}
/** The name a default export is written with, through the calls around it: `Card`, `memo(Card)`, `memo(forwardRef(Card))`. */
function wrappedName(node: Node): string | undefined {
  const n = unwrapped(node);
  if (n.type === 'Identifier') return n.name;
  return n.type === 'CallExpression' && n.arguments.length ? wrappedName(n.arguments[0] as Node) : undefined;
}
const statements = (src: Parsed): Node[] => src.program.type === 'Program' ? src.program.body as Node[] : [];
interface Modules { modules: ModuleFacts; open: (source: SourceText) => Parsed }
interface Reached { path: string; local: string }

/** Whether a usage's tag names the component. A tag imported in the usage's file is followed through its import (the
 * engine's module facts: relative paths, index files, the project's aliases) and every re-export on the way to the file
 * that declares it; it is the component when that file is the component's and the name it lands on is one the component
 * answers to (a default export: when the component is the file's default). A tag not imported names a component of its
 * own file only: a same-named component in another file is not it, nor is one imported from a package. */
function usesComponent(usage: Parsed, tag: string, component: Component, m: Modules): boolean {
  const [head, ...rest] = tag.split('.');
  for (const statement of statements(usage)) {
    if (statement.type !== 'ImportDeclaration') continue;
    for (const s of statement.specifiers ?? []) {
      if (s.local.name !== head) continue;
      // `UI.Card` from a namespace import is the module's export `Card`; `Card.Header` on an imported Card is a member of it
      const namespace = s.type === 'ImportNamespaceSpecifier';
      const name = namespace ? rest[0] : s.type === 'ImportDefaultSpecifier' ? 'default' : keyName(s.imported as Node);
      const members = namespace ? rest.slice(1) : rest;
      if (name === undefined) return false;
      const reached = exported(usage, String(statement.source.value), name, m, new Set());
      if (!reached || !component.file || reached.path !== component.file) return false;
      if (members.length) return component.names.includes(members.at(-1)!);
      return reached.local === 'default' ? component.isDefault : component.names.includes(reached.local);
    }
  }
  return usage.path === component.file && component.names.includes(rest.at(-1) ?? head!);
}
/** The file and local name an export of the module `specifier` (written in `from`) lands on, through `export … from`,
 * `export *` and a name imported and exported again. Undefined when the module is not the project's or does not export it. */
function exported(from: Parsed, specifier: string, name: string, m: Modules, seen: Set<string>): Reached | undefined {
  const source = m.modules(from.path, specifier);
  return source ? exportOf(m.open(source), name, m, seen) : undefined;
}
function exportOf(file: Parsed, name: string, m: Modules, seen: Set<string>): Reached | undefined {
  const key = `${file.path}\n${name}`;
  if (seen.has(key) || seen.size > 64) return undefined;
  seen.add(key);
  const stars: string[] = [];
  for (const st of statements(file)) {
    if (st.type === 'ExportNamedDeclaration') {
      if (st.exportKind === 'type') continue;
      for (const sp of st.specifiers ?? []) {
        if (keyName(sp.exported as Node) !== name) continue;
        const local = keyName(sp.local as Node);
        if (local === undefined) return undefined;
        return st.source ? exported(file, String(st.source.value), local, m, seen) : localOf(file, local, m, seen);
      }
      if (st.declaration && declares(st.declaration as Node, name)) return { path: file.path, local: name };
    }
    if (st.type === 'ExportDefaultDeclaration' && name === 'default') {
      const d = unwrapped(st.declaration as Node);
      return d.type === 'Identifier' ? localOf(file, d.name, m, seen) : { path: file.path, local: 'default' };
    }
    if (st.type === 'ExportAllDeclaration' && !st.exported && name !== 'default') stars.push(String(st.source.value));
  }
  for (const star of stars) { const hit = exported(file, star, name, m, seen); if (hit) return hit; }
  return undefined;
}
/** A name a file exports by its local name: imported there from another module (followed), else declared there. */
function localOf(file: Parsed, local: string, m: Modules, seen: Set<string>): Reached | undefined {
  for (const st of statements(file)) {
    if (st.type !== 'ImportDeclaration') continue;
    for (const s of st.specifiers ?? []) {
      if (s.local.name !== local) continue;
      if (s.type === 'ImportNamespaceSpecifier') return undefined;
      const imported = s.type === 'ImportDefaultSpecifier' ? 'default' : keyName(s.imported as Node);
      return imported === undefined ? undefined : exported(file, String(st.source.value), imported, m, seen);
    }
  }
  return { path: file.path, local };
}
const declares = (declaration: Node, name: string): boolean =>
  (declaration.type === 'FunctionDeclaration' || declaration.type === 'ClassDeclaration') ? declaration.id?.name === name
    : declaration.type === 'VariableDeclaration' && declaration.declarations.some(d => d.id.type === 'Identifier' && d.id.name === name);
