import { visitorKeys } from 'oxc-parser';
import type { Node, Program } from 'oxc-parser';
import type { Declaration, Site } from '../report.js';
import { nodeName, references, sourceSite, unwrap } from './source.js';
import type { SourceText } from './source.js';
import { domainOf, evaluate, format, propertyType, typeTable } from './evaluate.js';
import type { Binding, Scope, ScopeEntry, Sym } from './evaluate.js';
import type { Condition } from '../report.js';

// React's actual list, including its explicitly enumerated vendor spellings.
// facebook/react packages/react-dom-bindings/src/shared/isUnitlessNumber.js (MIT).
const unitless = new Set(('animationIterationCount aspectRatio borderImageOutset borderImageSlice borderImageWidth boxFlex boxFlexGroup boxOrdinalGroup columnCount columns flex flexGrow flexPositive flexShrink flexNegative flexOrder gridArea gridRow gridRowEnd gridRowSpan gridRowStart gridColumn gridColumnEnd gridColumnSpan gridColumnStart fontWeight lineClamp lineHeight opacity order orphans scale tabSize widows zIndex zoom fillOpacity floodOpacity stopOpacity strokeDasharray strokeDashoffset strokeMiterlimit strokeOpacity strokeWidth MozAnimationIterationCount MozBoxFlex MozBoxFlexGroup MozLineClamp msAnimationIterationCount msFlex msZoom msFlexGrow msFlexNegative msFlexOrder msFlexPositive msFlexShrink msGridColumn msGridColumnSpan msGridRow msGridRowSpan WebkitAnimationIterationCount WebkitBoxFlex WebKitBoxFlexGroup WebkitBoxOrdinalGroup WebkitColumnCount WebkitColumns WebkitFlex WebkitFlexGrow WebkitFlexPositive WebkitFlexShrink WebkitLineClamp').split(' '));
const typeOnly = new Set(['typeAnnotation', 'typeParameters', 'typeArguments', 'returnType', 'superTypeArguments', 'implements']);

export interface EmbeddedStylesheet { source: SourceText; css: string; offsets: number[]; site: Site }
export interface InlineSite { site: Site; literal: boolean; oneHop: boolean; declarations: Declaration[] }
export interface InlineBinding { source: SourceText; node: Node; scopes?: Scope[] }
export interface SourceStyles {
  declarations: Declaration[];
  sites: InlineSite[];
  stylesheets: EmbeddedStylesheet[];
  definedVariables: string[];
  imports: { file: string; specifier: string }[];
}

function literal(node: Node): string | number | null {
  node = unwrap(node);
  if (node.type === 'Literal' && (typeof node.value === 'string' || typeof node.value === 'number')) return node.value;
  if (node.type === 'TemplateLiteral' && !node.expressions.length) return node.quasis[0]!.value.cooked;
  if (node.type === 'UnaryExpression' && ['-', '+'].includes(node.operator)) {
    const value = literal(node.argument);
    if (typeof value === 'number') return node.operator === '-' ? -value : value;
  }
  return null;
}

function propertyName(key: string): string {
  if (key.startsWith('--')) return key;
  return key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`).replace(/^ms-/, '-ms-');
}

// Decode literals while retaining an offset for every cooked character. This
// keeps CSS locations in the JSX source even after escapes and line continuations.
export function embedded(node: Node, source: SourceText): { css: string; offsets: number[] } | null {
  node = unwrap(node);
  const cooked = literal(node);
  if (typeof cooked !== 'string') return null;
  const raw = source.text.slice(node.start + 1, node.end - 1);
  if (raw === cooked) return { css: cooked, offsets: Array.from({ length: raw.length }, (_, index) => node.start + 1 + index) };
  const offsets: number[] = [];
  for (let index = 0; index < raw.length; index++) {
    const offset = node.start + 1 + index;
    if (node.type === 'TemplateLiteral' && raw[index] === '\r' && raw[index + 1] === '\n') { offsets.push(offset); index++; continue; }
    if (raw[index] !== '\\') { offsets.push(offset); continue; }
    const next = raw[++index];
    if (next === '\n') continue;
    if (next === '\r') { if (raw[index + 1] === '\n') index++; continue; }
    if (next && /[0-7]/.test(next)) {
      let count = 1;
      while (count < (next <= '3' ? 3 : 2) && /[0-7]/.test(raw[index + 1] ?? '')) { index++; count++; }
    } else if (next === 'x') index += 2;
    else if (next === 'u') {
      if (raw[index + 1] === '{') {
        const end = raw.indexOf('}', index + 2);
        const point = parseInt(raw.slice(index + 2, end), 16);
        if (point > 0xffff) offsets.push(offset);
        index = end;
      } else index += 4;
    }
    offsets.push(offset);
  }
  return { css: cooked, offsets };
}

/** Module-level constants and imports of a program, for reading values across files. */
export function moduleScope(ast: Program, source: SourceText, resolveImport?: (id: string, name: string) => InlineBinding | null): Scope {
  const scope: Scope = new Map();
  for (const statement of ast.body) {
    if (statement.type === 'ImportDeclaration' && statement.importKind !== 'type') {
      for (const specifier of statement.specifiers) {
        if (specifier.type === 'ImportNamespaceSpecifier') continue;
        scope.set(specifier.local.name, () => {
          const binding = resolveImport?.(statement.source.value, specifier.type === 'ImportSpecifier' ? nodeName(specifier.imported) : 'default');
          return binding ? { source: binding.source, node: binding.node, scopes: binding.scopes ?? [] } : null;
        });
      }
    }
    const declaration = statement.type === 'ExportNamedDeclaration' ? statement.declaration : statement;
    if (declaration?.type !== 'VariableDeclaration') continue;
    for (const item of declaration.declarations) if (item.id.type === 'Identifier') scope.set(item.id.name, declaration.kind === 'const' && item.init ? { source, node: item.init, scopes: [scope] } : null);
  }
  return scope;
}

// Top-level CSS parts: whitespace, comma and slash outside parentheses and holes.
function parts(value: string): string[] {
  const out: string[] = []; let start = 0, depth = 0, hole = 0;
  for (let i = 0; i <= value.length; i++) {
    const c = value[i];
    if (c === '$' && value[i + 1] === '{') { hole++; i++; continue; }
    if (hole) { if (c === '}') hole--; continue; }
    if (c === '(') depth++; else if (c === ')') depth--;
    if (depth === 0 && (i === value.length || /[\s,\/]/.test(c!))) { if (i > start) out.push(value.slice(start, i)); start = i + 1; }
  }
  return out;
}

// Runtime holes are tolerable only beside a token they scale or offset, and
// never inside a variable's name.
function referenced(sym: Extract<Sym, { type: 'concat' }>): { text: string; by: string } | undefined {
  let text = ''; const holes: string[] = [];
  for (const part of sym.parts) {
    if (typeof part === 'string') { text += part; continue; }
    if (/var\(\s*--[\w-]*$/.test(text)) return undefined;
    const by = part.type === 'unknown' ? part.text : part.type === 'step' ? part.text : undefined;
    if (by === undefined) return undefined;
    holes.push(by); text += '${' + by + '}';
  }
  for (const part of parts(text)) if (part.includes('${') && !/var\(\s*--[\w-]+/.test(part)) return undefined;
  return { text, by: holes.join(', ') };
}

export function collectInline(ast: Program, source: SourceText, resolveImport?: (id: string, name: string) => InlineBinding | null): SourceStyles {
  const result: SourceStyles = { declarations: [], sites: [], stylesheets: [], imports: [], definedVariables: [] };
  const types = typeTable(ast);
  // `const Card: FC<Props> = ({ size }) => …` types its first parameter through the variable.
  const componentProps = new WeakMap<Node, Node>();
  interface Table { node: Node; source: SourceText; scopes: Scope[]; when: Condition[]; direct?: boolean }
  function tables(node: Node, scopes: Scope[], when: Condition[] = []): Table[] | undefined {
    const direct = unwrap(node);
    if (direct.type === 'ObjectExpression') return [{ node: direct, source, scopes, when, direct: true }];
    const sym = evaluate(direct, source, scopes);
    if (sym.type === 'object') return [{ node: sym.node, source: sym.source, scopes: sym.scopes, when }];
    if (sym.type === 'set' && sym.options.every(option => option.value.type === 'object')) {
      return sym.options.map(option => { const value = option.value as Extract<Sym, { type: 'object' }>; return { node: value.node, source: value.source, scopes: value.scopes, when: [...when, ...option.when.map(text => ({ kind: 'branch' as const, text }))] }; });
    }
    return undefined;
  }
  function styles(node: Node, scopes: Scope[], owner: Declaration['owner'], attribute: Site): void {
    const declarations: Declaration[] = [];
    // The site is the style attribute for values reached through a binding, and
    // the property itself when it is written in the attribute.
    const siteFor = (property: Node, table: Table) => table.direct ? sourceSite(source, property.start, source.text.slice(property.start, property.end)) : { ...attribute, text: table.source.text.slice(property.start, property.end) };
    function emit(property: Node, table: Table, key: string, sym: Sym | undefined, when: Condition[], opaque?: Declaration['opaque']): void {
      if (sym?.type === 'set') { for (const option of sym.options) emit(property, table, key, option.value, [...when, ...option.when.map(text => ({ kind: 'branch' as const, text }))]); return; }
      const prop = key ? propertyName(key) : '*';
      const custom = prop.startsWith('--');
      const px = (value: number) => `${format(value)}${value !== 0 && !custom && !unitless.has(key) ? 'px' : ''}`;
      let value = 'dynamic-value', dynamic: Declaration['dynamic'];
      if (sym && !opaque) switch (sym.type) {
        case 'number': value = px(sym.value); break;
        case 'string': value = sym.value.trim(); break;
        case 'step': value = `${format(sym.factor)}${sym.unit ?? (sym.factor === 0 || custom || unitless.has(key) ? '' : 'px')}`; dynamic = { kind: 'step', by: sym.by }; break;
        case 'concat': { const read = referenced(sym); if (read) { value = read.text; dynamic = { kind: 'reference', by: read.by }; } else opaque = 'dynamic-value'; break; }
        default: opaque = 'dynamic-value';
      } else opaque ??= 'dynamic-value';
      declarations.push({ prop, value, refs: references(value), when, site: siteFor(property, table), owner, origin: custom ? 'custom-property' : 'inline', sourceOrigin: 'project',
        ...(opaque ? { opaque } : {}), ...(dynamic ? { dynamic } : {}) });
    }
    function properties(table: Table, depth: number): void {
      for (const property of table.node.type === 'ObjectExpression' ? table.node.properties : []) {
        if (property.type === 'SpreadElement') {
          const spread = depth < 4 ? tables(property.argument, table.scopes, table.when) : undefined;
          // A spread of a readable object brings its properties along.
          if (spread) for (const item of spread) properties({ ...item, direct: false }, depth + 1);
          else emit(property, table, '', undefined, table.when, 'spread');
          continue;
        }
        const key = property.computed ? evaluate(property.key, table.source, table.scopes) : { type: 'string' as const, value: nodeName(property.key) };
        if ((key.type !== 'string' && key.type !== 'number') || key.value === '') { emit(property, table, '', undefined, table.when, 'spread'); continue; }
        emit(property, table, String(key.value), evaluate(property.value, table.source, table.scopes), table.when);
      }
    }
    const resolved = tables(node, scopes);
    if (resolved) for (const table of resolved) properties(table, 0);
    else emit(node, { node, source, scopes, when: [] }, '', undefined, [], 'spread');
    const direct = unwrap(node).type === 'ObjectExpression';
    result.declarations.push(...declarations);
    result.sites.push({ site: attribute, oneHop: !direct, literal: declarations.some(item => !item.opaque), declarations });
  }
  function walk(node: Node, scopes: Scope[]): void {
    // Custom-property maps can reach style through spreads, return values or
    // memoized models. Registry existence does not require value evaluation.
    if (node.type === 'Property') {
      const key = node.computed ? literal(node.key) : nodeName(node.key);
      if (typeof key === 'string' && key.startsWith('--')) result.definedVariables.push(key);
    }
    if (node.type === 'AssignmentExpression' && node.left.type === 'MemberExpression' && node.left.computed) {
      const key = literal(node.left.property);
      if (typeof key === 'string' && key.startsWith('--')) result.definedVariables.push(key);
    }
    if (node.type === 'CallExpression' && node.callee.type === 'MemberExpression' &&
        nodeName(node.callee.property) === 'setProperty' && node.callee.object.type === 'MemberExpression' && nodeName(node.callee.object.property) === 'style') {
      const name = node.arguments[0] && literal(node.arguments[0]);
      if (typeof name === 'string' && name.startsWith('--')) result.definedVariables.push(name);
    }
    if (node.type === 'ImportDeclaration') {
      if (!node.specifiers.length && node.importKind !== 'type') result.imports.push({ file: source.file, specifier: node.source.value });
      return;
    }
    let next = scopes;
    if (node.type === 'Program') next = [moduleScope(node, source, resolveImport)];
    else if (node.type === 'BlockStatement') {
      const scope: Scope = new Map();
      next = [...scopes, scope];
      for (const statement of node.body) {
        if (statement.type !== 'VariableDeclaration') continue;
        for (const item of statement.declarations) if (item.id.type === 'Identifier') scope.set(item.id.name, statement.kind === 'const' && item.init ? { source, node: item.init, scopes: next } : null);
      }
    }
    if (node.type === 'VariableDeclarator' && node.init && node.id.type === 'Identifier' && node.id.typeAnnotation) {
      const annotation = node.id.typeAnnotation.typeAnnotation;
      const init = unwrap(node.init);
      if (annotation.type === 'TSTypeReference' && /^(?:React\.)?(?:FC|FunctionComponent|VFC)$/.test(source.text.slice(annotation.typeName.start, annotation.typeName.end)) && annotation.typeArguments?.params[0] && ['ArrowFunctionExpression', 'FunctionExpression'].includes(init.type)) {
        componentProps.set(init, annotation.typeArguments.params[0]);
      }
    }
    if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression') {
      const scope: Scope = new Map();
      // A parameter typed with a literal union is a finite domain, not an unknown.
      function shadow(value: Node, type?: Node | null): void {
        if (value.type === 'Identifier') {
          const domain = domainOf(type ?? value.typeAnnotation, types);
          scope.set(value.name, domain ? { options: domain.map(item => ({ value: item, when: `${value.name} === ${JSON.stringify(item)}` })) } : null);
        }
        else if (value.type === 'AssignmentPattern') shadow(value.left, type);
        else if (value.type === 'RestElement') shadow(value.argument);
        else if (value.type === 'ObjectPattern') {
          const shape = type ?? value.typeAnnotation;
          for (const item of value.properties) shadow(item.type === 'RestElement' ? item.argument : item.value, item.type === 'RestElement' || item.computed ? null : propertyType(shape, nodeName(item.key), types));
        }
        else if (value.type === 'ArrayPattern') for (const item of value.elements) if (item) shadow(item);
      }
      node.params.forEach((param, index) => shadow(param, index === 0 ? componentProps.get(node) : undefined));
      next = [...next, scope];
    }
    if (node.type === 'JSXElement' && nodeName(node.openingElement.name) === 'style') {
      let css = '', offsets: number[] = [];
      let staticContent = true;
      for (const child of node.children) {
        if (child.type === 'JSXText') {
          css += child.value;
          offsets.push(...Array.from({ length: child.value.length }, (_, index) => child.start + index));
        } else if (child.type === 'JSXExpressionContainer') {
          const value = embedded(child.expression, source);
          if (!value) { staticContent = false; break; }
          css += value.css;
          offsets.push(...value.offsets);
        } else { staticContent = false; break; }
      }
      if (staticContent && css.trim()) result.stylesheets.push({ source, css, offsets, site: sourceSite(source, node.start, '<style>') });
    }
    if (node.type === 'JSXOpeningElement') {
      const name = nodeName(node.name);
      const owner: Declaration['owner'] = { kind: /^[A-Z]/.test(name) ? 'component' : 'element', name };
      for (const attr of node.attributes) if (attr.type === 'JSXAttribute' && nodeName(attr.name) === 'style' && attr.value?.type === 'JSXExpressionContainer') styles(attr.value.expression, next, owner, sourceSite(source, attr.start, source.text.slice(attr.start, attr.end)));
      // JSX-valued props (slots, render nodes, object payloads) can contain
      // elements with their own styles. Continue through attribute values.
    }
    if (node.type === 'JSXClosingElement') return;
    const record = node as unknown as Record<string, unknown>;
    for (const key of visitorKeys[node.type] ?? []) {
      if (typeOnly.has(key)) continue;
      const value = record[key];
      if (Array.isArray(value)) { for (const item of value) if (item) walk(item as Node, next); }
      else if (value) walk(value as Node, next);
    }
  }
  walk(ast, []);
  return result;
}
