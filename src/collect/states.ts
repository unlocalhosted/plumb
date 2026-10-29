// A component library's states, named on declarations through its adapter (the `states` capability): the attribute
// selectors a compiled variant or stylesheet rule carries (`[data-checked]`), and the branches of a className or
// style function the library calls with its state (`(state) => state.checked ? … : …`).
import type { Node } from 'oxc-parser';
import type { Condition } from '../report.js';
import { libraryAdapters } from '../project-facts/libraries/index.js';
import type { LibraryAdapter } from '../project-facts/libraries/index.js';

const stateful = libraryAdapters.filter(adapter => adapter.capabilities.includes('states') && adapter.state);
/** The adapter whose states an element imported from `specifier` has, or undefined for a plain element. */
export const stateAdapterFor = (specifier: string | undefined): LibraryAdapter | undefined => specifier === undefined ? undefined : stateful.find(adapter => adapter.owns(specifier));

const attribute = /(?<!\\)\[\s*(data-[\w-]+)(?:\s*([~|^$*]?=)\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|[^\]\s]+))?\s*\]/g;
/** The states the selector conditions of `when` name, through `adapters`; each once. */
export function selectorStates(when: Condition[], adapters: readonly LibraryAdapter[]): Condition[] {
  const found: Condition[] = [];
  const add = (text: string) => { if (!when.some(item => item.kind === 'state' && item.text === text) && !found.some(item => item.text === text)) found.push({ kind: 'state', text }); };
  for (const condition of when) {
    if (condition.kind !== 'selector') continue;
    for (const match of condition.text.matchAll(attribute)) {
      const value = match[3] === undefined ? null : match[3].replace(/^(["'])([\s\S]*)\1$/, '$2');
      for (const adapter of adapters) { const state = adapter.state!(match[1]!, value); if (state) { add(state); break; } }
    }
  }
  return found;
}

const kebab = (text: string) => text.replace(/[A-Z]/g, char => `-${char.toLowerCase()}`);
/** How a function's first parameter names states: `state.checked`, or `checked` after destructuring. */
export interface StateParam { adapter: LibraryAdapter; keyOf(text: string): { key: string; value: string | null; negated: boolean } | null }
export function stateParam(fn: Node, adapter: LibraryAdapter): StateParam | null {
  if (fn.type !== 'ArrowFunctionExpression' && fn.type !== 'FunctionExpression') return null;
  const first = fn.params[0];
  if (!first) return null;
  const param = first.type === 'AssignmentPattern' ? first.left : first;
  const read = (text: string) => {
    let negated = false, inner = text.trim();
    for (;;) {
      const bare = /^\((.*)\)$/.exec(inner); if (bare) { inner = bare[1]!.trim(); continue; }
      const not = /^!(.*)$/.exec(inner); if (not) { negated = !negated; inner = not[1]!.trim(); continue; }
      break;
    }
    // `state.open === true`, `state.side !== 'top'`, `state.orientation === 'horizontal'`.
    const compared = /^(.+?)\s*([!=]==?)\s*(?:(true|false)|(["'])([^"']*)\4)$/.exec(inner);
    if (!compared) return { subject: inner, value: null, negated };
    const flipped = compared[2]!.startsWith('!') !== (compared[3] === 'false');
    return { subject: compared[1]!.trim(), value: compared[5] ?? null, negated: negated !== flipped };
  };
  if (param.type === 'Identifier') {
    const name = param.name;
    return { adapter, keyOf(text) {
      const { subject, value, negated } = read(text);
      const member = new RegExp(`^${name}(?:\\.(\\w+)|\\[(["'])([\\w-]+)\\2\\])$`).exec(subject);
      return member ? { key: member[1] ?? member[3]!, value, negated } : null;
    } };
  }
  if (param.type === 'ObjectPattern') {
    const keys = new Map<string, string>();
    for (const item of param.properties) if (item.type === 'Property' && !item.computed) {
      const local = item.value.type === 'AssignmentPattern' ? item.value.left : item.value;
      const key = item.key.type === 'Identifier' ? item.key.name : item.key.type === 'Literal' ? String(item.key.value) : null;
      if (local.type === 'Identifier' && key) keys.set(local.name, key);
    }
    return { adapter, keyOf(text) {
      const { subject, value, negated } = read(text);
      const key = keys.get(subject);
      return key ? { key, value, negated } : null;
    } };
  }
  return null;
}
/** The state condition a branch text names under `param`, or null when the branch is not about the library's state. */
export function branchState(param: StateParam | undefined, text: string): Condition | null {
  const read = param?.keyOf(text);
  if (!read) return null;
  const state = param!.adapter.state!(`data-${kebab(read.key)}`, read.value);
  return state ? { kind: 'state', text: read.negated ? `!${state}` : state } : null;
}
/** The expressions a function body can return: the expression body, or each `return` under the `if` tests above it. */
export function returns(fn: Node, source: string): { node: Node; when: string[] }[] {
  if (fn.type !== 'ArrowFunctionExpression' && fn.type !== 'FunctionExpression') return [];
  const body = fn.body as Node;
  if (body.type !== 'BlockStatement') return [{ node: body, when: [] }];
  const out: { node: Node; when: string[] }[] = [];
  const visit = (statements: Node[], when: string[]): void => {
    let guards = when;
    for (const statement of statements) {
      if (statement.type === 'ReturnStatement') { if (statement.argument) out.push({ node: statement.argument, when: guards }); return; }
      if (statement.type !== 'IfStatement') continue;
      const test = source.slice(statement.test.start, statement.test.end);
      const consequent = statement.consequent.type === 'BlockStatement' ? statement.consequent.body : [statement.consequent];
      visit(consequent, [...guards, test]);
      if (statement.alternate) visit(statement.alternate.type === 'BlockStatement' ? statement.alternate.body : [statement.alternate], [...guards, `!(${test})`]);
      // A guarded return leaves the rest of the body under the negated test.
      if (consequent.some(item => item.type === 'ReturnStatement')) guards = [...guards, `!(${test})`];
    }
  };
  visit(body.body, []);
  return out;
}

const structured = libraryAdapters.filter(adapter => adapter.capabilities.includes('structure') && adapter.structure?.focus);
/** The local element names, from one import, that are a library part managing its own focus: `Dialog.Content`, `DialogContent`. */
export function focusElementsOf(specifier: string, specifiers: { local: string; imported: string }[]): string[] {
  const adapter = structured.find(adapter => adapter.owns(specifier));
  if (!adapter) return [];
  const focus = adapter.structure!.focus!, out: string[] = [];
  for (const { local, imported } of specifiers) {
    const meaning = adapter.meaning(specifier, imported);
    if (imported === '*' || (imported !== 'default' && !meaning.part && meaning.component)) {
      // A namespace or root binding: the focused parts hang off it as members (`Dialog.Content`).
      const component = meaning.component ?? '';
      for (const part of ['Content', 'Popup']) if (focus.test(`${component || imported}.${part}`)) out.push(`${local}.${part}`);
    } else if (meaning.component && meaning.part && focus.test(`${meaning.component}.${meaning.part}`)) out.push(local);
  }
  return out;
}
