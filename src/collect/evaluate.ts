import type { Node } from 'oxc-parser';
import { nodeName, unwrap } from './source.js';
import type { SourceText } from './source.js';

// A style value is read as a symbol, not a string. What source cannot decide is
// kept as an unknown with the authored text, so later judgement can still prove
// the parts that matter: a token next to the unknown, or the step it multiplies.
export type Sym =
  | { type: 'number'; value: number }
  | { type: 'string'; value: string }
  | { type: 'unknown'; text: string }
  /** constant × a runtime number: the constant is the decision, the multiplier is not. */
  | { type: 'step'; factor: number; by: string; text: string; unit?: string }
  /** template text around runtime holes. */
  | { type: 'concat'; parts: (string | Sym)[] }
  /** finitely many values, each under a branch condition. */
  | { type: 'set'; options: { value: Sym; when: string[] }[] }
  | { type: 'object'; node: Node; source: SourceText; scopes: Scope[] };

export interface Binding { source: SourceText; node: Node; scopes: Scope[] }
export interface Domain { options: { value: string | number; when: string }[] }
export type ScopeEntry = Binding | (() => Binding | null) | Domain | null;
export type Scope = Map<string, ScopeEntry>;

const unknown = (text: string): Sym => ({ type: 'unknown', text });
export const format = (value: number): string => String(Number(value.toPrecision(12)));
const limit = 24;

function distribute(sym: Sym, map: (value: Sym) => Sym): Sym {
  if (sym.type !== 'set') return map(sym);
  const options: { value: Sym; when: string[] }[] = [];
  for (const option of sym.options) {
    const mapped = map(option.value);
    if (mapped.type === 'set') for (const inner of mapped.options) options.push({ value: inner.value, when: [...option.when, ...inner.when] });
    else options.push({ value: mapped, when: option.when });
    if (options.length > limit) return unknown('…');
  }
  return { type: 'set', options };
}

function concat(parts: (string | Sym)[]): Sym {
  const merged: (string | Sym)[] = [];
  for (const part of parts) {
    const text = typeof part === 'string' ? part : part.type === 'string' ? part.value : part.type === 'number' ? format(part.value) : undefined;
    if (text === undefined) { if ((part as Sym).type === 'object') return unknown('…'); merged.push(part); continue; }
    if (text === '') continue;
    if (typeof merged.at(-1) === 'string') merged[merged.length - 1] += text; else merged.push(text);
  }
  if (merged.length === 0) return { type: 'string', value: '' };
  if (merged.length === 1 && typeof merged[0] === 'string') return { type: 'string', value: merged[0] };
  // A stepped number with only a unit after it keeps the step: `${k * 80}ms`.
  const holes = merged.filter((part): part is Sym => typeof part !== 'string');
  if (holes.length === 1 && holes[0]!.type === 'step' && typeof merged[0] !== 'string' && merged.length <= 2) {
    const unit = (merged[1] as string | undefined) ?? '';
    if (/^(?:px|r?em|ms|s|%|vh|vw|vmin|vmax|ch|ex|deg|turn|fr)?$/.test(unit)) return { ...holes[0]!, ...(unit ? { unit } : {}) };
  }
  return { type: 'concat', parts: merged };
}

function arithmetic(operator: string, left: Sym, right: Sym, text: string): Sym {
  const num = (sym: Sym) => sym.type === 'number' ? sym.value : undefined;
  const a = num(left), b = num(right);
  if (a !== undefined && b !== undefined) {
    const value = operator === '+' ? a + b : operator === '-' ? a - b : operator === '*' ? a * b : operator === '/' ? a / b : operator === '%' ? a % b : operator === '**' ? a ** b : NaN;
    return Number.isFinite(value) ? { type: 'number', value } : unknown(text);
  }
  if (operator === '+' && (left.type === 'string' || right.type === 'string' || left.type === 'concat' || right.type === 'concat')) {
    return concat([...(left.type === 'concat' ? left.parts : [left]), ...(right.type === 'concat' ? right.parts : [right])]);
  }
  const scale = (sym: Sym, factor: number, by: string): Sym => sym.type === 'unknown' ? { type: 'step', factor, by, text } : sym.type === 'step' ? { ...sym, factor: sym.factor * factor, text } : unknown(text);
  if (operator === '*' && a !== undefined && (right.type === 'unknown' || right.type === 'step')) return scale(right, a, right.type === 'unknown' ? right.text : right.by);
  if (operator === '*' && b !== undefined && (left.type === 'unknown' || left.type === 'step')) return scale(left, b, left.type === 'unknown' ? left.text : left.by);
  if (operator === '/' && b !== undefined && b !== 0 && (left.type === 'unknown' || left.type === 'step')) return scale(left, 1 / b, left.type === 'unknown' ? left.text : left.by);
  return unknown(text);
}

function lookup(name: string, scopes: Scope[]): { entry: ScopeEntry; scopes: Scope[] } | undefined {
  for (let index = scopes.length - 1; index >= 0; index--) {
    const scope = scopes[index]!;
    if (!scope.has(name)) continue;
    let entry: ScopeEntry = scope.get(name)!;
    if (typeof entry === 'function') { entry = entry(); scope.set(name, entry); }
    return { entry, scopes: scopes.slice(0, index + 1) };
  }
  return undefined;
}

function member(object: Sym, key: Sym, keyText: string, text: string, depth: number): Sym {
  if (object.type !== 'object') return unknown(text);
  const node = object.node;
  const entries: { key: string; value: Node }[] = [];
  if (node.type === 'ObjectExpression') {
    for (const property of node.properties) {
      if (property.type !== 'Property') return unknown(text);
      const name = property.computed ? evaluate(property.key, object.source, object.scopes, depth + 1) : { type: 'string' as const, value: nodeName(property.key) };
      if (name.type !== 'string' && name.type !== 'number') return unknown(text);
      entries.push({ key: String(name.type === 'number' ? format(name.value) : name.value), value: property.value });
    }
  } else if (node.type === 'ArrayExpression') {
    for (const [index, element] of node.elements.entries()) {
      if (!element || element.type === 'SpreadElement') return unknown(text);
      entries.push({ key: String(index), value: element });
    }
  } else return unknown(text);
  const read = (entry: { key: string; value: Node }) => evaluate(entry.value, object.source, object.scopes, depth + 1);
  if (key.type === 'string' || key.type === 'number') {
    const name = key.type === 'number' ? format(key.value) : key.value;
    const entry = entries.findLast(item => item.key === name);
    return entry ? read(entry) : unknown(text);
  }
  if (key.type === 'set') return distribute(key, option => member(object, option, keyText, text, depth));
  if (key.type !== 'unknown' || entries.length === 0 || entries.length > limit) return unknown(text);
  // A table read by a runtime key reaches one of its rows; every row is judged.
  return { type: 'set', options: entries.map(entry => ({ value: read(entry), when: [`${keyText} === ${JSON.stringify(/^\d+$/.test(entry.key) ? Number(entry.key) : entry.key)}`] })) };
}

export function evaluate(input: Node, source: SourceText, scopes: Scope[], depth = 0): Sym {
  const node = unwrap(input);
  const text = source.text.slice(node.start, node.end);
  if (depth > 12) return unknown(text);
  switch (node.type) {
    case 'Literal':
      if (typeof node.value === 'string') return { type: 'string', value: node.value };
      if (typeof node.value === 'number') return { type: 'number', value: node.value };
      return unknown(text);
    case 'TemplateLiteral': {
      const parts: (string | Sym)[] = [];
      node.quasis.forEach((quasi, index) => {
        parts.push(quasi.value.cooked ?? quasi.value.raw);
        const expression = node.expressions[index];
        if (expression) parts.push(evaluate(expression, source, scopes, depth + 1));
      });
      // Every finite hole is expanded, so `${size}-${tone}` reads as each pair.
      const expand = (items: (string | Sym)[]): Sym => {
        const set = items.find((part): part is Sym => typeof part !== 'string' && part.type === 'set');
        return set ? distribute(set, chosen => expand(items.map(part => part === set ? chosen : part))) : concat(items);
      };
      return expand(parts);
    }
    case 'Identifier': {
      const found = lookup(node.name, scopes);
      if (!found || found.entry === null) return unknown(text);
      if ('options' in found.entry) {
        const domain = found.entry;
        return { type: 'set', options: domain.options.map(option => ({ value: typeof option.value === 'number' ? { type: 'number', value: option.value } : { type: 'string', value: option.value }, when: [option.when] })) };
      }
      if (typeof found.entry === 'function') return unknown(text);
      const binding = found.entry;
      const value = evaluate(binding.node, binding.source, binding.scopes, depth + 1);
      return value.type === 'unknown' ? unknown(text) : value;
    }
    case 'ObjectExpression': case 'ArrayExpression':
      return { type: 'object', node, source, scopes };
    case 'MemberExpression': {
      const object = evaluate(node.object, source, scopes, depth + 1);
      const keyText = source.text.slice(node.property.start, node.property.end);
      const key = node.computed ? evaluate(node.property, source, scopes, depth + 1) : { type: 'string' as const, value: nodeName(node.property) };
      return distribute(object, chosen => member(chosen, key, keyText, text, depth));
    }
    case 'UnaryExpression': {
      if (!['-', '+'].includes(node.operator)) return unknown(text);
      return distribute(evaluate(node.argument, source, scopes, depth + 1), value => {
        if (value.type === 'number') return { type: 'number', value: node.operator === '-' ? -value.value : value.value };
        if (value.type === 'step') return { ...value, factor: node.operator === '-' ? -value.factor : value.factor, text };
        if (value.type === 'unknown' && node.operator === '-') return { type: 'step', factor: -1, by: value.text, text };
        return unknown(text);
      });
    }
    case 'BinaryExpression': {
      const left = evaluate(node.left as Node, source, scopes, depth + 1);
      const right = evaluate(node.right, source, scopes, depth + 1);
      return distribute(left, a => distribute(right, b => arithmetic(node.operator, a, b, text)));
    }
    case 'ConditionalExpression': {
      const test = source.text.slice(node.test.start, node.test.end);
      return branches([[node.consequent, test], [node.alternate, `!(${test})`]], source, scopes, depth);
    }
    case 'LogicalExpression': {
      const left = source.text.slice(node.left.start, node.left.end);
      if (node.operator === '&&') return branches([[node.right, left]], source, scopes, depth);
      return branches([[node.left, left], [node.right, node.operator === '??' ? `${left} == null` : `!(${left})`]], source, scopes, depth);
    }
    case 'CallExpression': {
      const callee = unwrap(node.callee);
      if (callee.type === 'MemberExpression' && nodeName(callee.object) === 'Math' && !callee.computed) {
        const method = nodeName(callee.property) as keyof Math;
        const fn = Math[method];
        if (typeof fn === 'function' && node.arguments.every(argument => argument.type !== 'SpreadElement')) {
          const values = node.arguments.map(argument => evaluate(argument as Node, source, scopes, depth + 1));
          if (values.every(value => value.type === 'number')) {
            const result = (fn as (...numbers: number[]) => number)(...values.map(value => (value as { value: number }).value));
            if (Number.isFinite(result)) return { type: 'number', value: result };
          }
        }
      }
      return unknown(text);
    }
    default: return unknown(text);
  }
}

function branches(arms: [Node, string][], source: SourceText, scopes: Scope[], depth: number): Sym {
  const options: { value: Sym; when: string[] }[] = [];
  for (const [arm, when] of arms) {
    const value = evaluate(arm, source, scopes, depth + 1);
    if (value.type === 'set') for (const option of value.options) options.push({ value: option.value, when: [when, ...option.when] });
    else options.push({ value, when: [when] });
  }
  return options.length > limit ? { type: 'unknown', text: source.text.slice(arms[0]![0].start, arms.at(-1)![0].end) } : { type: 'set', options };
}

// TypeScript literal unions on props are finite domains: `size: 'sm' | 'md'`.
export type TypeTable = Map<string, Node>;

export function typeTable(program: Node): TypeTable {
  const table: TypeTable = new Map();
  if (program.type !== 'Program') return table;
  for (const statement of program.body) {
    const declaration = statement.type === 'ExportNamedDeclaration' ? statement.declaration : statement;
    if (declaration?.type === 'TSTypeAliasDeclaration') table.set(declaration.id.name, declaration.typeAnnotation);
    if (declaration?.type === 'TSInterfaceDeclaration' && !declaration.extends.length) table.set(declaration.id.name, declaration.body);
  }
  return table;
}

export function domainOf(type: Node | null | undefined, types: TypeTable, depth = 0): (string | number)[] | undefined {
  if (!type || depth > 8) return undefined;
  switch (type.type) {
    case 'TSTypeAnnotation': return domainOf(type.typeAnnotation, types, depth + 1);
    case 'TSParenthesizedType': return domainOf(type.typeAnnotation, types, depth + 1);
    case 'TSLiteralType': {
      const literal = type.literal as Node;
      if (literal.type === 'Literal' && (typeof literal.value === 'string' || typeof literal.value === 'number')) return [literal.value];
      if (literal.type === 'UnaryExpression' && literal.operator === '-' && literal.argument.type === 'Literal' && typeof literal.argument.value === 'number') return [-literal.argument.value];
      if (literal.type === 'TemplateLiteral' && !literal.expressions.length) return [literal.quasis[0]!.value.cooked ?? ''];
      return undefined;
    }
    case 'TSUnionType': {
      const values: (string | number)[] = [];
      for (const item of type.types) {
        const inner = domainOf(item, types, depth + 1);
        if (!inner) return undefined;
        values.push(...inner);
      }
      return values.length && values.length <= limit ? [...new Set(values)] : undefined;
    }
    case 'TSTypeReference': {
      if (type.typeName.type !== 'Identifier' || type.typeArguments) return undefined;
      return domainOf(types.get(type.typeName.name), types, depth + 1);
    }
    default: return undefined;
  }
}

/** The declared type of one property of an object type, by key. */
export function propertyType(type: Node | null | undefined, key: string, types: TypeTable, depth = 0): Node | undefined {
  if (!type || depth > 8) return undefined;
  if (type.type === 'TSTypeAnnotation') return propertyType(type.typeAnnotation, key, types, depth + 1);
  if (type.type === 'TSTypeReference' && type.typeName.type === 'Identifier' && !type.typeArguments) return propertyType(types.get(type.typeName.name), key, types, depth + 1);
  const members = type.type === 'TSTypeLiteral' ? type.members : type.type === 'TSInterfaceBody' ? type.body : undefined;
  if (!members) return undefined;
  for (const item of members) if (item.type === 'TSPropertySignature' && !item.computed && nodeName(item.key) === key) return item.typeAnnotation ?? undefined;
  return undefined;
}
