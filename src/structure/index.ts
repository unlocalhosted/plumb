// The structure index (docs/briefs/craft-hard-rules.md, layer 6): for each JSX element of a source file, which
// component it is, what library that component comes from, the literal props it is given and the handlers it has.
// Pure over the file's text; the session caches it by hash.
import { parseSync, visitorKeys } from 'oxc-parser';
import type { Node } from 'oxc-parser';
import { libraryOf } from './library.js';
import type { Role } from './library.js';

export type PropValue = string | number | boolean | null;
export interface StructureEntry {
  /** The offset of the element's `<`. */
  start: number; line: number; column: number;
  /** As written: Tooltip.Provider, button, TooltipProvider. */
  component: string;
  /** Where the component is imported from, or null for a tag or a component defined here. */
  source: string | null;
  library: string | null; role: Role | null;
  /** Literal props by name: a string, a number, a boolean; null for one that is computed. */
  props: Record<string, PropValue>;
  /** The on* props the element has. */
  handlers: string[];
  /** Index of the element this one is inside, in the same file. */
  parent: number | null;
  /** Where each literal prop's value is written, for an edit. */
  spans: Record<string, { start: number; end: number }>;
}

interface Import { source: string; imported: string }

export function indexSource(file: string, text: string): StructureEntry[] {
  const parsed = parseSync(file, text);
  if (parsed.errors.length) return [];
  const starts = [0];
  for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) starts.push(i + 1);
  const lineOf = (offset: number) => { let lo = 0, hi = starts.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid]! <= offset) lo = mid; else hi = mid - 1; } return lo; };
  const imports = new Map<string, Import>();
  const out: StructureEntry[] = [];
  const nameOf = (node: Node): string[] | null => {
    if (node.type === 'JSXIdentifier') return [node.name];
    if (node.type === 'JSXMemberExpression') { const object = nameOf(node.object); return object ? [...object, node.property.name] : null; }
    return null;
  };
  const walk = (node: Node, parent: number | null): void => {
    let mine = parent;
    if (node.type === 'ImportDeclaration') {
      const source = String(node.source.value);
      for (const s of node.specifiers) {
        if (s.type === 'ImportSpecifier') imports.set(s.local.name, { source, imported: s.imported.type === 'Identifier' ? s.imported.name : String(s.imported.value) });
        else if (s.type === 'ImportNamespaceSpecifier') imports.set(s.local.name, { source, imported: '*' });
        else imports.set(s.local.name, { source, imported: 'default' });
      }
    }
    // an element's children are the JSXElement's, beside its opening tag, so the element is entered here
    let opening: Extract<Node, { type: 'JSXOpeningElement' }> | null = null;
    if (node.type === 'JSXElement') opening = node.openingElement;
    if (opening) {
      const node = opening;
      const parts = nameOf(node.name);
      if (parts) {
        const root = imports.get(parts[0]!);
        let name = parts[0]!, member: string | null = parts.length > 1 ? parts.slice(1).join('.') : null;
        if (root?.imported === '*') { name = parts[1] ?? root.imported; member = parts.length > 2 ? parts.slice(2).join('.') : null; }
        else if (root && root.imported !== 'default') name = root.imported;
        const found = root ? libraryOf(root.source, name, member) : null;
        const props: Record<string, PropValue> = {}, spans: Record<string, { start: number; end: number }> = {}, handlers: string[] = [];
        for (const a of node.attributes) {
          if (a.type !== 'JSXAttribute' || a.name.type !== 'JSXIdentifier') continue;
          const key = a.name.name;
          if (/^on[A-Z]/.test(key)) handlers.push(key);
          const value = a.value;
          if (!value) { props[key] = true; continue; }
          const literal = value.type === 'JSXExpressionContainer' && value.expression.type !== 'JSXEmptyExpression' ? value.expression : value;
          if (literal.type === 'Literal' && (typeof literal.value === 'string' || typeof literal.value === 'number' || typeof literal.value === 'boolean')) { props[key] = literal.value; spans[key] = { start: literal.start, end: literal.end }; }
          else props[key] = null;
        }
        const line = lineOf(node.start);
        out.push({ start: node.start, line: line + 1, column: node.start - starts[line]! + 1, component: parts.join('.'), source: root?.source ?? null, library: found?.library ?? null, role: found?.role ?? null, props, handlers, parent, spans });
        mine = out.length - 1;
      }
    }
    if (opening) {
      // the opening tag's attributes can hold elements too (a prop that renders); they are inside this element's tag, not inside it
      walk(opening, parent);
      for (const child of (node as Extract<Node, { type: 'JSXElement' }>).children) walk(child, mine);
      return;
    }
    const record = node as unknown as Record<string, unknown>;
    for (const key of visitorKeys[node.type] ?? []) {
      const value = record[key];
      for (const child of Array.isArray(value) ? value : [value]) if (child && typeof child === 'object') walk(child as Node, mine);
    }
  };
  walk(parsed.program, null);
  return out;
}

/** The nearest element above `index` with this role, in the same file. */
export function ancestorWith(entries: StructureEntry[], index: number, role: Role): StructureEntry | null {
  for (let at = entries[index]?.parent ?? null; at !== null; at = entries[at]!.parent) if (entries[at]!.role === role) return entries[at]!;
  return null;
}
