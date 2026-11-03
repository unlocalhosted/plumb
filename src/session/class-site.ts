import { parseSync, visitorKeys } from 'oxc-parser';
import type { Node } from 'oxc-parser';
import { UsageError } from '../errors.js';
import { lineStarts } from '../collect/source.js';
import { ADD_UNDER_CONDITION, branchOf, classSources, elementSources } from './props.js';
import type { Branch, ClassRef, ClassString, Trail } from './props.js';
import { isComponentJSX as isComponentTag, jsxLocation } from './source-location.js';

/**
 * Where each class an element wears is written (docs/research/engine-review.md item 1): the one resolver both cards and the
 * recipe plan ask. Pure over source texts: the caller reads the files, this answers with plain data.
 *
 * A class is written in a plain string: the element's own className (a literal, a template's fixed part, a ternary's
 * branch, a cn() argument), a variable declared in the same file that the className reads, or, when the className reads
 * one of its component's props, the usage up the component chain that passes that prop. A string under a condition
 * carries the condition (`branch`), so a writer changes the class in the case it is written for and never adds into one.
 */

/** A source file as the caller names it (`file`, echoed back) and as the parser needs it (`path`, for the extension). */
export interface SourceText { file: string; path: string; text: string }
export interface Located extends SourceText { line: number; column: number }
export interface ClassSiteInput {
  element: Located;
  /** the usages above the element, nearest first: each one where a component the element sits in is used */
  chain: Located[];
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
  /** the element whose attribute reads it: a writer sends this line and column, with `at` = the string's line and column */
  element: ElementRef;
  string: StringRef;
  branch?: Branch;
}
export interface ClassEntry { class: string; sites: ClassSite[]; refused?: string }
/** Where a class that is written nowhere yet goes: the narrowest string that always applies. No `string`: the element has
 * no className, and one is written on it. */
export interface AddSite { file: string; kind: ClassSite['kind']; prop: string; variable?: string; element: ElementRef; string?: StringRef }
export interface ClassSiteAnswer {
  element: ElementRef;
  classes: ClassEntry[];
  add: AddSite | null;
  addRefused?: string;
  /** set when none of the classes is written in a plain string */
  refused?: string;
}

const BUILT = 'built in code, so it can\'t be changed here';
const maxDepth = 8;

interface Parsed extends SourceText { program: Node; starts: number[] }
interface Holder { src: Parsed; kind: 'own' | 'usage'; prop: string; element: ElementRef; level: number; next: number; variable?: string }
interface Found { string: ClassString; holder: Holder }
type Binding = { kind: 'variable'; init: Node } | { kind: 'prop'; prop: string | null; component: Component } | undefined;
interface Component { name: string | undefined; isDefault: boolean }

export function classSites(input: ClassSiteInput): ClassSiteAnswer {
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
  /** props the classes come in through that the chain did not reach */
  const unfollowed: string[] = [];

  const take = (sources: { strings: ClassString[]; refs: ClassRef[] }, holder: Holder, depth: number): void => {
    for (const string of sources.strings) found.push({ string, holder });
    for (const ref of sources.refs) follow(ref, holder, depth);
  };
  const follow = (ref: ClassRef, holder: Holder, depth: number): void => {
    if (depth > maxDepth) return;
    const binding = bindingOf(holder.src.program, ref.start, ref.name);
    if (binding?.kind === 'variable') {
      take(classSources(binding.init, holder.src.text, ref.trail), { ...holder, variable: ref.name }, depth + 1);
      return;
    }
    if (binding?.kind !== 'prop') return;
    const prop = binding.prop ?? ref.property;
    if (!prop) return;
    for (let i = holder.next; i < input.chain.length; i++) {
      const link = input.chain[i]!, at = locate(link);
      if (!usesComponent(at.src.program, at.ref.tag, binding.component)) continue;
      const attribute = elementSources(at.src.path, at.src.text, at.location.start).attributes.get(prop);
      if (!attribute) return; // the usage does not pass it: nothing of it is written there
      const outer = ref.trail;
      take({ strings: attribute.strings.map(s => under(outer, s)), refs: attribute.refs.map(r => ({ ...r, trail: [...outer, ...r.trail] })) },
        { src: at.src, kind: 'usage', prop, element: at.ref, level: i + 1, next: i + 1 }, depth + 1);
      return;
    }
    unfollowed.push(prop);
  };

  const sources = elementSources(own.src.path, own.src.text, own.location.start);
  const ownProp = sources.attributes.has('className') || !sources.attributes.has('class') ? 'className' : 'class';
  const ownAttribute = sources.attributes.get(ownProp);
  if (ownAttribute) take(ownAttribute, { src: own.src, kind: 'own', prop: ownProp, element: own.ref, level: 0, next: 0 }, 0);
  // no className of its own: one spread in from the component's props (`{ to, ...props }` → `{...props}`) is the className
  // its usage passes; only a prop is followed, never a spread object written here (its keys are props, not classes)
  else for (const ref of sources.spreads) if (bindingOf(own.src.program, ref.start, ref.name)?.kind === 'prop') follow(ref, { src: own.src, kind: 'own', prop: ownProp, element: own.ref, level: 0, next: 0 }, 0);

  // one entry per string: a variable read twice is one place
  const strings = [...new Map(found.map(f => [`${f.holder.src.path}:${f.string.start}`, f])).values()];
  const tokens = strings.flatMap(f => [...f.holder.src.text.slice(f.string.start, f.string.end).matchAll(/\S+/g)].map(m => ({ token: m[0], offset: f.string.start + m.index, f })));
  const wanted = [...new Set(input.classes ?? tokens.map(t => t.token))];
  const why = unfollowed.length ? ` (it comes in through ${[...new Set(unfollowed)].map(p => '`' + p + '`').join(', ')})` : '';
  const classes = wanted.map((name): ClassEntry => {
    const sites = tokens.filter(t => t.token === name).map(({ offset, f }): ClassSite => {
      const where = position(f.holder.src, offset);
      return {
        class: name, file: f.holder.src.file, line: where.line, column: where.column,
        kind: f.holder.variable ? 'variable' : f.holder.kind, prop: f.holder.prop, ...(f.holder.variable ? { variable: f.holder.variable } : {}),
        element: f.holder.element, string: stringRef(f), ...(f.string.branch ? { branch: f.string.branch } : {}),
      };
    });
    return sites.length ? { class: name, sites } : { class: name, sites, refused: `${name} is ${BUILT}${why}.` };
  });

  const answer: ClassSiteAnswer = { element: own.ref, classes, add: null };
  if (wanted.length && classes.every(c => !c.sites.length)) answer.refused = `Its classes are ${BUILT}${why}.`;
  // the narrowest string that always applies: the furthest usage up the chain that writes one, else the element's own
  const always = strings.filter(f => !f.string.branch).sort((a, b) => b.holder.level - a.holder.level)[0];
  if (always) {
    const h = always.holder;
    answer.add = { file: h.src.file, kind: h.variable ? 'variable' : h.kind, prop: h.prop, ...(h.variable ? { variable: h.variable } : {}), element: h.element, string: stringRef(always) };
  } else if (strings.length) answer.addRefused = ADD_UNDER_CONDITION;
  else if (!ownAttribute && !sources.spread && !isComponentTag(sources.tag)) answer.add = { file: own.ref.file, kind: 'own', prop: 'className', element: own.ref };
  else answer.addRefused = sources.spread && !ownAttribute ? 'This element spreads props, which may carry className; add the class by hand.'
    : isComponentTag(sources.tag) && !ownAttribute ? `<${sources.tag}> is a component; add the class inside it, by hand.` : `Its classes are ${BUILT}${why}.`;
  return answer;
}

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
/** Whether a binding pattern binds a name: `null` for the whole value (`props`, `...rest`), else the key it is read from. */
function binds(pattern: Node, name: string): { key: string | null } | undefined {
  const target = pattern.type === 'AssignmentPattern' ? pattern.left : pattern;
  if (target.type === 'Identifier') return target.name === name ? { key: null } : undefined;
  if (target.type !== 'ObjectPattern') return undefined;
  for (const property of target.properties) {
    if (property.type === 'RestElement') { if (property.argument.type === 'Identifier' && property.argument.name === name) return { key: null }; continue; }
    if (property.type !== 'Property' || property.computed) continue;
    const value = property.value.type === 'AssignmentPattern' ? property.value.left : property.value;
    const key = keyName(property.key);
    if (key !== undefined && value.type === 'Identifier' && value.name === name) return { key };
  }
  return undefined;
}
/** What a name read at an offset is bound to: a variable with a value written here, or a prop of the component it sits in.
 * Anything else (a loop variable, a parameter of a callback, an import) is not followed. */
function bindingOf(program: Node, offset: number, name: string, depth = 0): Binding {
  if (depth > maxDepth) return undefined;
  const path = ancestorsAt(program, offset);
  for (let i = path.length - 1; i >= 0; i--) {
    const node = path[i]!;
    if (isFunction(node)) {
      const list = (node as unknown as { params: Node[] }).params;
      const at = list.findIndex(param => binds(param, name));
      if (at < 0) continue;
      const component = at === 0 ? componentOf(path.slice(0, i + 1)) : undefined;
      return component ? { kind: 'prop', prop: binds(list[0]!, name)!.key, component } : undefined;
    }
    const body = node.type === 'Program' || node.type === 'BlockStatement' ? node.body as Node[] : undefined;
    for (const statement of body ?? []) {
      const declaration = statement.type === 'VariableDeclaration' ? statement : statement.type === 'ExportNamedDeclaration' && statement.declaration?.type === 'VariableDeclaration' ? statement.declaration : undefined;
      for (const d of declaration?.declarations ?? []) {
        if (!d.init) continue;
        if (d.id.type === 'Identifier') { if (d.id.name === name) return { kind: 'variable', init: d.init }; continue; }
        // const { className } = props: the prop the whole props object carries
        const bound = binds(d.id, name), source = unwrapped(d.init);
        if (!bound) continue;
        if (bound.key === null || source.type !== 'Identifier') return undefined;
        const outer = bindingOf(program, source.start, source.name, depth + 1);
        return outer?.kind === 'prop' && outer.prop === null ? { ...outer, prop: bound.key } : undefined;
      }
    }
  }
  return undefined;
}
const unwrapped = (node: Node): Node => node.type === 'ParenthesizedExpression' || node.type === 'TSAsExpression' || node.type === 'TSSatisfiesExpression' || node.type === 'TSNonNullExpression' ? unwrapped(node.expression) : node;
/** The component a function is (its path ends at the function): `function Panel`, `const Panel = () =>`, memo/forwardRef
 * around one, or the file's default export. A function that is none of these is not a component. */
function componentOf(path: Node[]): Component | undefined {
  const fn = path.at(-1)!, program = path[0]!;
  let name = (fn.type === 'FunctionDeclaration' || fn.type === 'FunctionExpression') && fn.id ? fn.id.name : undefined, isDefault = false;
  for (let i = path.length - 2; i >= 0; i--) {
    const parent = path[i]!;
    if (parent.type === 'CallExpression' || parent.type === 'ParenthesizedExpression' || parent.type === 'TSAsExpression' || parent.type === 'TSSatisfiesExpression') continue;
    if (parent.type === 'VariableDeclarator' && parent.id.type === 'Identifier') name ??= parent.id.name;
    if (parent.type === 'ExportDefaultDeclaration') isDefault = true;
    break;
  }
  if (name && !isDefault) isDefault = (program.type === 'Program' ? program.body as Node[] : []).some(s => s.type === 'ExportDefaultDeclaration' && s.declaration.type === 'Identifier' && s.declaration.name === name);
  if (!isDefault && !(name && /^[A-Z]/.test(name))) return undefined;
  return { name, isDefault };
}
/** Whether a usage's tag names the component: by name (`Panel`, `UI.Panel`), or through its import (`{ Panel as Box }`, a default import). */
function usesComponent(program: Node, tag: string, component: Component): boolean {
  if (component.name && tag.split('.').at(-1) === component.name) return true;
  for (const statement of program.type === 'Program' ? program.body as Node[] : []) {
    if (statement.type !== 'ImportDeclaration') continue;
    for (const s of statement.specifiers ?? []) {
      if (s.local.name !== tag) continue;
      if (s.type === 'ImportDefaultSpecifier') return component.isDefault;
      if (s.type === 'ImportSpecifier') return keyName(s.imported as Node) === component.name || (keyName(s.imported as Node) === 'default' && component.isDefault);
    }
  }
  return false;
}
