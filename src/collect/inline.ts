import { visitorKeys } from 'oxc-parser';
import type { Node, Program } from 'oxc-parser';
import type { Declaration, Site } from '../report.js';
import { nodeName, references, sourceSite, unwrap } from './source.js';
import type { SourceText } from './source.js';

// React's actual list, including its explicitly enumerated vendor spellings.
// facebook/react packages/react-dom-bindings/src/shared/isUnitlessNumber.js (MIT).
const unitless = new Set(('animationIterationCount aspectRatio borderImageOutset borderImageSlice borderImageWidth boxFlex boxFlexGroup boxOrdinalGroup columnCount columns flex flexGrow flexPositive flexShrink flexNegative flexOrder gridArea gridRow gridRowEnd gridRowSpan gridRowStart gridColumn gridColumnEnd gridColumnSpan gridColumnStart fontWeight lineClamp lineHeight opacity order orphans scale tabSize widows zIndex zoom fillOpacity floodOpacity stopOpacity strokeDasharray strokeDashoffset strokeMiterlimit strokeOpacity strokeWidth MozAnimationIterationCount MozBoxFlex MozBoxFlexGroup MozLineClamp msAnimationIterationCount msFlex msZoom msFlexGrow msFlexNegative msFlexOrder msFlexPositive msFlexShrink msGridColumn msGridColumnSpan msGridRow msGridRowSpan WebkitAnimationIterationCount WebkitBoxFlex WebKitBoxFlexGroup WebkitBoxOrdinalGroup WebkitColumnCount WebkitColumns WebkitFlex WebkitFlexGrow WebkitFlexPositive WebkitFlexShrink WebkitLineClamp').split(' '));
const typeOnly = new Set(['typeAnnotation', 'typeParameters', 'typeArguments', 'returnType', 'superTypeArguments', 'implements']);

export interface EmbeddedStylesheet { source: SourceText; css: string; offsets: number[]; site: Site }
export interface InlineSite { site: Site; literal: boolean; oneHop: boolean; declarations: Declaration[] }
export interface InlineBinding { source: SourceText; node: Node }
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
function embedded(node: Node, source: SourceText): { css: string; offsets: number[] } | null {
  node = unwrap(node);
  const cooked = literal(node);
  if (typeof cooked !== 'string') return null;
  const raw = source.text.slice(node.start + 1, node.end - 1);
  const offsets: number[] = [];
  for (let index = 0; index < raw.length; index++) {
    const offset = node.start + 1 + index;
    if (node.type === 'TemplateLiteral' && raw[index] === '\r' && raw[index + 1] === '\n') { offsets.push(offset); index++; continue; }
    if (raw[index] !== '\\') { offsets.push(offset); continue; }
    const next = raw[++index];
    if (next === '\n') continue;
    if (next === '\r') { if (raw[index + 1] === '\n') index++; continue; }
    if (next === 'x') index += 2;
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

export function collectInline(ast: Program, source: SourceText, resolveImport?: (id: string, name: string) => InlineBinding | null): SourceStyles {
  const result: SourceStyles = { declarations: [], sites: [], stylesheets: [], imports: [], definedVariables: [] };
  type Scope = Map<string, InlineBinding | (() => InlineBinding | null) | null>;
  const imports: Scope = new Map();
  for (const statement of ast.body) {
    if (statement.type !== 'ImportDeclaration' || statement.importKind === 'type') continue;
    for (const specifier of statement.specifiers) {
      if (specifier.type === 'ImportNamespaceSpecifier') continue;
      imports.set(specifier.local.name, () => resolveImport?.(statement.source.value, specifier.type === 'ImportSpecifier' ? nodeName(specifier.imported) : 'default') ?? null);
    }
  }
  function object(node: Node, scopes: Scope[]): InlineBinding & { oneHop: boolean } {
    node = unwrap(node);
    if (node.type !== 'Identifier') return { node, source, oneHop: false };
    for (const scope of scopes.toReversed()) {
      if (!scope.has(node.name)) continue;
      const value = scope.get(node.name);
      const binding = typeof value === 'function' ? value() : value;
      if (typeof value === 'function') scope.set(node.name, binding ?? null);
      return { node: unwrap(binding?.node ?? node), source: binding?.source ?? source, oneHop: true };
    }
    return { node, source, oneHop: false };
  }
  function styles(node: Node, scopes: Scope[], owner: Declaration['owner'], attribute: Site): void {
    const resolved = object(node, scopes);
    const declarations: Declaration[] = [];
    function emit(value: Node, key: string, opaque?: Declaration['opaque']): void {
      const staticValue = opaque ? null : literal(value.type === 'Property' ? value.value : value);
      const prop = key ? propertyName(key) : '*';
      const custom = prop.startsWith('--');
      const output = staticValue === null ? 'dynamic-value' : typeof staticValue === 'number' && staticValue !== 0 && !custom && !unitless.has(key) ? `${staticValue}px` : String(staticValue).trim();
      declarations.push({ prop, value: output, refs: references(output), when: [],
        site: resolved.oneHop ? { ...attribute, text: resolved.source.text.slice(value.start, value.end) } : sourceSite(source, value.start, source.text.slice(value.start, value.end)),
        owner, origin: custom ? 'custom-property' : 'inline', sourceOrigin: 'project',
        ...(staticValue === null ? { opaque: opaque ?? 'dynamic-value' } : {}) });
    }
    if (resolved.node.type === 'ObjectExpression') {
      for (const property of resolved.node.properties) {
        if (property.type === 'SpreadElement') emit(property, '', 'spread');
        else {
          const key = property.computed ? literal(property.key) : nodeName(property.key);
          if (key === null || key === '') emit(property, '', 'spread');
          else emit(property, String(key));
        }
      }
    } else emit(node, '', 'spread');
    result.declarations.push(...declarations);
    result.sites.push({ site: attribute, oneHop: resolved.oneHop, literal: declarations.some(item => !item.opaque), declarations });
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
    if (node.type === 'Program' || node.type === 'BlockStatement') {
      const scope: Scope = new Map();
      for (const statement of node.body) {
        const declaration = statement.type === 'ExportNamedDeclaration' ? statement.declaration : statement;
        if (declaration?.type !== 'VariableDeclaration') continue;
        for (const item of declaration.declarations) if (item.id.type === 'Identifier') scope.set(item.id.name, declaration.kind === 'const' && item.init ? { source, node: item.init } : null);
      }
      next = [...scopes, scope];
    }
    if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression') {
      const scope: Scope = new Map();
      function shadow(value: Node): void {
        if (value.type === 'Identifier') scope.set(value.name, null);
        else if (value.type === 'AssignmentPattern') shadow(value.left);
        else if (value.type === 'RestElement') shadow(value.argument);
        else if (value.type === 'ObjectPattern') for (const item of value.properties) shadow(item.type === 'RestElement' ? item.argument : item.value);
        else if (value.type === 'ArrayPattern') for (const item of value.elements) if (item) shadow(item);
      }
      for (const param of node.params) shadow(param);
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
  walk(ast, [imports]);
  return result;
}
