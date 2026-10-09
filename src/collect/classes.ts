import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { parseSync, rawTransferSupported, visitorKeys } from 'oxc-parser';
import type { Node, Program } from 'oxc-parser';
import { ResolverFactory } from 'oxc-resolver';
import type { Condition, Declaration, Site } from '../report.js';
import { UsageError } from '../errors.js';
import { collectInline } from './inline.js';
import type { SourceStyles } from './inline.js';
import { constExport, namedAnchors, sourceSite } from './source.js';
import type { NamedAnchor } from './source.js';
import { moduleImports } from './modules.js';
import type { ModuleImport } from './modules.js';

export interface ClassSite extends Site {
  token: string;
  /** Shared expression/element context for declaration companions. */
  context?: string;
  owner: Declaration['owner'];
  conditions: Condition[];
  opaque?: 'dynamic-class';
}

interface Source {
  file: string;
  text: string;
  ast: Program | null;
  lineStarts: number[];
  exports: Map<string, Binding> | null;
  anchors: NamedAnchor[];
}
interface Binding { source: Source; node: Node; name: string }
type LazyBinding = () => Binding | null;
type Scope = Map<string, Binding | LazyBinding | null>;
// The installed oxc runtime supports this experimental option; its .d.ts omits it.
// Fall back to JSON transfer on platforms that cannot allocate raw-transfer buffers.
const parserOptions = { preserveParens: true, experimentalRawTransfer: rawTransferSupported() };
const typeOnlyKeys = new Set(['typeAnnotation', 'typeParameters', 'typeArguments', 'returnType', 'superTypeArguments', 'implements']);
const builtins = ['cn', 'clsx', 'cx', 'classNames', 'twMerge', 'twJoin', 'cva', 'tv'];

function children(node: Node): Node[] {
  const record = node as unknown as Record<string, unknown>;
  const result: Node[] = [];
  for (const key of visitorKeys[node.type] ?? []) {
    const value = record[key];
    if (Array.isArray(value)) {
      for (const item of value) if (item) result.push(item as Node);
    } else if (value) result.push(value as Node);
  }
  return result;
}
function unwrap(node: Node): Node {
  switch (node.type) {
    case 'TSAsExpression': case 'TSSatisfiesExpression': case 'TSNonNullExpression':
    case 'TSTypeAssertion': case 'ParenthesizedExpression': return unwrap(node.expression);
    default: return node;
  }
}
function literalMap(node: Node): boolean {
  node = unwrap(node);
  if (node.type === 'Literal') return typeof node.value === 'string';
  if (node.type === 'TemplateLiteral') return node.expressions.length === 0;
  if (node.type === 'ConditionalExpression') return literalMap(node.consequent) && literalMap(node.alternate);
  if (node.type === 'ArrayExpression') return node.elements.every(item => item === null || literalMap(item));
  if (node.type === 'ObjectExpression') return node.properties.every(item => item.type === 'Property' && !item.computed && literalMap(item.value));
  return false;
}
function startsBoundary(node: Node): boolean {
  node = unwrap(node);
  if (node.type === 'Literal' && typeof node.value === 'string') return node.value === '' || /^\s/.test(node.value);
  if (node.type === 'TemplateLiteral') return /^\s/.test(node.quasis[0]?.value.cooked ?? '');
  if (node.type === 'ConditionalExpression') return startsBoundary(node.consequent) && startsBoundary(node.alternate);
  return false;
}
function name(node: Node): string {
  if (node.type === 'Identifier' || node.type === 'JSXIdentifier') return node.name;
  if (node.type === 'Literal') return String(node.value);
  if (node.type === 'JSXMemberExpression') return `${name(node.object)}.${name(node.property)}`;
  return '';
}
function site(source: Source, offset: number, text: string): Site {
  return sourceSite(source, offset, text);
}

export async function collectClasses(files: string[], classHelpers: string[] = []): Promise<{
  sites: ClassSite[]; opaque: number; parseMs: number; collectMs: number; inlineMs: number; styles: SourceStyles; modules: Map<string, ModuleImport[]>;
}> {
  const start = performance.now();
  let parseMs = 0;
  let opaque = 0;
  let inlineMs = 0;
  const styles: SourceStyles = { declarations: [], sites: [], stylesheets: [], imports: [], definedVariables: [] };
  const sources = new Map<string, Source>();
  const modules = new Map<string, ModuleImport[]>();
  const texts = new Map(await Promise.all(files.map(async file => [file, await readFile(file, 'utf8')] as const)));
  const helpers = new Set([...builtins, ...classHelpers]);
  const helperNames = [...helpers];
  const canContainClasses = (text: string) => text.includes('class') || text.includes('\\') || helperNames.some(helper => text.includes(helper));
  const resolver = new ResolverFactory({ tsconfig: 'auto', extensions: ['.tsx', '.ts', '.jsx', '.js'], extensionAlias: { '.js': ['.ts', '.tsx', '.js'] }, conditionNames: ['import', 'node', 'default'] });
  const sites = new Map<string, ClassSite>();
  let classContext: string | undefined;

  function source(file: string, fullAst = false): Source {
    const cached = sources.get(file);
    if (cached && (!fullAst || cached.ast)) return cached;
    const text = texts.get(file) ?? readFileSync(file, 'utf8');
    const parseStart = performance.now();
    const result = parseSync(file, text, parserOptions);
    const ast = result.program;
    if (texts.has(file)) modules.set(file, moduleImports(result.module, text));
    parseMs += performance.now() - parseStart;
    if (result.errors.length) throw new UsageError(`Fix source ${file}: ${result.errors[0]?.message}`);
    const lineStarts = [0];
    for (let index = text.indexOf('\n'); index !== -1; index = text.indexOf('\n', index + 1)) lineStarts.push(index + 1);
    const value: Source = { file, text, ast, lineStarts, exports: null, anchors: namedAnchors(ast) };
    sources.set(file, value);
    return value;
  }

  function exports(value: Source): Map<string, Binding> {
    if (value.exports) return value.exports;
    value.exports = new Map();
    const constants = new Map<string, Binding>();
    for (const statement of value.ast!.body) {
      const declaration = statement.type === 'ExportNamedDeclaration' ? statement.declaration : statement;
      if (declaration?.type !== 'VariableDeclaration' || declaration.kind !== 'const') continue;
      for (const item of declaration.declarations) {
        if (item.id.type !== 'Identifier' || !item.init || !literalMap(item.init)) continue;
        const binding = { source: value, node: item.init, name: item.id.name };
        constants.set(item.id.name, binding);
        if (statement.type === 'ExportNamedDeclaration') value.exports.set(item.id.name, binding);
      }
    }
    for (const statement of value.ast!.body) {
      if (statement.type === 'ExportNamedDeclaration' && !statement.source) {
        for (const specifier of statement.specifiers) {
          const binding = constants.get(name(specifier.local));
          if (binding) value.exports.set(name(specifier.exported), binding);
        }
      }
      if (statement.type === 'ExportDefaultDeclaration' && statement.declaration.type === 'Identifier') {
        const binding = constants.get(statement.declaration.name);
        if (binding) value.exports.set('default', binding);
      }
    }
    return value.exports;
  }

  function emit(value: string, src: Source, offset: number, owner: Declaration['owner'], conditions: Condition[], usage?: Site, dynamic = false): void {
    const context = JSON.stringify([owner, conditions, dynamic]);
    for (const match of value.matchAll(/\S+/g)) {
      const token = match[0];
      const locations = [site(src, offset + match.index, token), ...(usage ? [{ ...usage, text: token }] : [])];
      for (const location of locations) {
        const entry: ClassSite = { ...location, token, owner, conditions, ...(classContext ? { context: classContext } : {}), ...(dynamic ? { opaque: 'dynamic-class' as const } : {}) };
        const key = `${location.file}\0${location.line}:${location.column}\0${token}\0${context}`;
        sites.set(key, entry);
      }
    }
  }

  function evaluate(node: Node, src: Source, scopes: Scope[], owner: Declaration['owner'], conditions: Condition[] = [], usage?: Site, follow = true, mode: 'classes' | 'values' | 'config' = 'classes'): void {
    node = unwrap(node);
    const text = (value: Node) => src.text.slice(value.start, value.end);
    const branch = (value: string) => [...conditions, { kind: 'branch' as const, text: value }];
    const recur = (value: Node, when = conditions, nextMode = mode) => evaluate(value, src, scopes, owner, when, usage, follow, nextMode);
    switch (node.type) {
      case 'JSXExpressionContainer': recur(node.expression); return;
      case 'Literal':
        if (typeof node.value === 'string') emit(node.value, src, node.start + 1, owner, conditions, usage);
        return;
      case 'TemplateLiteral': {
        opaque += node.expressions.length;
        // Tokenize the whole template: a hole glued to text is one opaque class,
        // never a spurious dead finding for its static prefix or suffix.
        const raw = src.text.slice(node.start + 1, node.end - 1);
        const holes = node.expressions.map((expression, index) => ({
          start: node.quasis[index]!.end - node.start - 3,
          end: node.quasis[index + 1]!.start - node.start,
          expression,
        }));
        function complete(value: Node): boolean {
          if (literalMap(value)) return true;
          if (value.type !== 'Identifier') return false;
          for (const scope of scopes.toReversed()) {
            if (!scope.has(value.name)) continue;
            const binding = scope.get(value.name);
            return !!binding && typeof binding !== 'function' && literalMap(binding.node);
          }
          return false;
        }
        let masked = raw;
        for (const hole of holes.toReversed()) {
          const boundary = (startsBoundary(hole.expression) || complete(hole.expression) && (hole.start === 0 || /\s$/.test(raw.slice(0, hole.start)))) && (hole.end === raw.length || /^\s/.test(raw.slice(hole.end)));
          masked = masked.slice(0, hole.start) + (boundary ? ' ' : '\u0000').repeat(hole.end - hole.start) + masked.slice(hole.end);
          if (boundary) recur(hole.expression);
        }
        for (const match of masked.matchAll(/\S+/g)) {
          if (!match[0].includes('\u0000')) emit(match[0], src, node.start + 1 + match.index, owner, conditions, usage);
          else if (/[^\u0000]+\u0000/.test(match[0])) {
            emit(raw.slice(match.index, match.index + match[0].length).replace(/\s+/g, ''), src, node.start + 1 + match.index, owner, conditions, usage, true);
          }
        }
        return;
      }
      case 'ConditionalExpression':
        recur(node.consequent, branch(text(node.test)));
        recur(node.alternate, branch(`!(${text(node.test)})`)); return;
      case 'LogicalExpression':
        if (node.operator !== '&&') recur(node.left, branch(text(node.left)));
        recur(node.right, branch(node.operator === '&&' ? text(node.left) : node.operator === '??' ? `${text(node.left)} == null` : `!(${text(node.left)})`)); return;
      case 'ArrayExpression':
        for (const item of node.elements) if (item) recur(item); return;
      case 'ObjectExpression':
        for (const property of node.properties) {
          if (property.type !== 'Property') { opaque++; continue; }
          const key = name(property.key);
          if (mode === 'config') {
            if (['base', 'slots'].includes(key)) recur(property.value, conditions, 'values');
            if (key === 'variants') {
              const variants = unwrap(property.value);
              if (variants.type !== 'ObjectExpression') recur(variants, conditions, 'values');
              else for (const axis of variants.properties) {
                if (axis.type !== 'Property') { opaque++; continue; }
                const options = unwrap(axis.value);
                if (options.type !== 'ObjectExpression') recur(options, conditions, 'values');
                else for (const option of options.properties) {
                  if (option.type !== 'Property') { opaque++; continue; }
                  recur(option.value, branch(`${name(axis.key)} === ${JSON.stringify(name(option.key))}`), 'values');
                }
              }
            }
            if (key === 'compoundVariants' && property.value.type === 'ArrayExpression') {
              for (const entry of property.value.elements) {
                if (entry?.type !== 'ObjectExpression') { opaque++; continue; }
                const predicates = entry.properties.filter(item => item.type === 'Property' && !['class', 'className'].includes(name(item.key))).map(item => text(item));
                for (const item of entry.properties) if (item.type === 'Property' && ['class', 'className'].includes(name(item.key))) recur(item.value, branch(predicates.join(', ')), 'values');
              }
            }
          } else if (mode === 'values') recur(property.value);
          else if (!property.computed && key) emit(key, src, property.key.start + (property.key.type === 'Literal' ? 1 : 0), owner, branch(text(property.value)), usage);
          else opaque++;
        }
        return;
      case 'CallExpression': {
        if (node.callee.type === 'MemberExpression' && !node.callee.computed && name(node.callee.property) === 'join' && node.arguments.length === 1 && node.arguments[0]?.type === 'Literal' && node.arguments[0].value === ' ' && unwrap(node.callee.object).type === 'ArrayExpression') {
          recur(node.callee.object); return;
        }
        const helper = name(node.callee);
        if (!helpers.has(helper)) {
          opaque++;
          function nested(value: Node): void {
            if (value.type === 'CallExpression' && helpers.has(name(value.callee))) recur(value);
            else for (const child of children(value)) nested(child);
          }
          for (const child of children(node)) nested(child);
          return;
        }
        for (const [index, arg] of node.arguments.entries()) {
          const config = helper === 'tv' || (helper === 'cva' && index > 0);
          recur(arg, conditions, config ? 'config' : 'classes');
        }
        return;
      }
      case 'Identifier': case 'MemberExpression': {
        if (!follow) { opaque++; return; }
        const identifier = node.type === 'Identifier' ? node : node.object;
        if (identifier.type !== 'Identifier') { opaque++; return; }
        let binding: Binding | null | undefined;
        for (let index = scopes.length - 1; index >= 0; index--) {
          const scope = scopes[index]!;
          if (!scope.has(identifier.name)) continue;
          const value = scope.get(identifier.name);
          binding = typeof value === 'function' ? value() : value;
          if (typeof value === 'function') scope.set(identifier.name, binding ?? null);
          break;
        }
        if (!binding) { opaque++; return; }
        let value = unwrap(binding.node);
        if (node.type === 'MemberExpression' && (!node.computed || node.property.type === 'Literal')) {
          const key = name(node.property);
          if (value.type === 'ObjectExpression') {
            const property = value.properties.find(item => item.type === 'Property' && name(item.key) === key);
            if (property?.type !== 'Property') { opaque++; return; }
            value = property.value;
          } else if (value.type === 'ArrayExpression') {
            const item = value.elements[Number(key)];
            if (!item) { opaque++; return; }
            value = item;
          }
        }
        evaluate(value, binding.source, [], owner, conditions, usage ?? site(src, node.start, text(node)), false, 'values'); return;
      }
      default: opaque++;
    }
  }

  for (const file of files) {
    const src = source(file, true);
    const ast = src.ast!;
    const inlineStart = performance.now();
    const inlineParseStart = parseMs;
    const inline = collectInline(ast, src, (id, name) => {
      const path = resolver.resolveFileSync(file, id).path;
      if (!path || !/\.[jt]sx?$/.test(path)) return null;
      const imported = source(path, true);
      const node = constExport(imported.ast!, name);
      exports(imported);
      if (imported !== src) imported.ast = null;
      return node ? { source: imported, node } : null;
    });
    for (const key of ['declarations', 'sites', 'stylesheets', 'imports', 'definedVariables'] as const) (styles[key] as unknown[]).push(...inline[key]);
    inlineMs += performance.now() - inlineStart - (parseMs - inlineParseStart);
    const imports: Scope = new Map();
    for (const statement of ast.body) {
      if (statement.type !== 'ImportDeclaration') continue;
      // Resolve only imports read as class values. Component/helper imports
      // cannot contribute literal maps and need no AST deserialization.
      for (const specifier of statement.specifiers) {
        const key = specifier.type === 'ImportSpecifier' ? name(specifier.imported) : 'default';
        imports.set(specifier.local.name, () => {
          const path = resolver.resolveFileSync(file, statement.source.value).path;
          if (!path || !/\.(?:[jt]sx?|[mc][jt]s)$/.test(path)) return null;
          return exports(source(path)).get(key) ?? null;
        });
      }
    }
    function walk(node: Node, scopes: Scope[], owner: Declaration['owner']): void {
      const type = node.type;
      const keys = visitorKeys[type];
      if (!keys?.length) return;
      if (type === 'ImportDeclaration' || type === 'ExportAllDeclaration' || type === 'JSXClosingElement') return;
      let next = scopes;
      if (node.type === 'Program' || node.type === 'BlockStatement') {
        const scope: Scope = new Map();
        for (const statement of node.body) {
          const declaration = statement.type === 'ExportNamedDeclaration' ? statement.declaration : statement;
          if (declaration?.type === 'VariableDeclaration') for (const item of declaration.declarations) {
            if (item.id.type === 'Identifier') scope.set(item.id.name, declaration.kind === 'const' && item.init && literalMap(item.init) ? { source: src, node: item.init, name: item.id.name } : null);
          }
        }
        next = [...scopes, scope];
      }
      if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression') {
        // A function with no class attribute/helper spelling cannot emit sites
        // or opaque class holes. Escaped identifiers disable this shortcut.
        if (!canContainClasses(src.text.slice(node.start, node.end))) return;
        if (node.id) owner = { kind: 'component', name: node.id.name };
        const scope: Scope = new Map();
        for (const param of node.params) {
          function block(value: Node): void { if (value.type === 'Identifier') scope.set(value.name, null); else for (const child of children(value)) block(child); }
          block(param);
        }
        next = [...next, scope];
      }
      if (node.type === 'VariableDeclarator' && node.id.type === 'Identifier' && node.init && (['ArrowFunctionExpression', 'FunctionExpression'].includes(unwrap(node.init).type) || (node.init.type === 'CallExpression' && node.init.arguments.some(arg => ['ArrowFunctionExpression', 'FunctionExpression'].includes(arg.type))))) owner = { kind: 'component', name: node.id.name };
      if (node.type === 'JSXOpeningElement') {
        const element = name(node.name);
        owner = { kind: /^[A-Z]/.test(element) ? 'component' : 'element', name: element };
        for (const attr of node.attributes) if (attr.type === 'JSXAttribute' && attr.value) {
          if (['className', 'class'].includes(name(attr.name))) {
            classContext = `${file}:${node.start}`;
            evaluate(attr.value, src, next, owner);
            classContext = undefined;
          }
          else if (attr.value.type === 'JSXExpressionContainer') walk(attr.value.expression, next, owner);
        }
        return;
      }
      if (node.type === 'CallExpression' && helpers.has(name(node.callee))) { classContext = `${file}:${node.start}`; evaluate(node, src, next, owner); classContext = undefined; return; }
      // Walk directly: avoid a temporary children array at every AST node.
      const record = node as unknown as Record<string, unknown>;
      for (const key of keys) {
        // Type annotations contain no runtime class expressions.
        if (typeOnlyKeys.has(key)) continue;
        const value = record[key];
        if (Array.isArray(value)) {
          for (const child of value) if (child) walk(child as Node, next, owner);
        } else if (value) walk(value as Node, next, owner);
      }
    }
    walk(ast, [imports], { kind: 'component', name: '<module>' });
    // Keep exported literal nodes for later imports; release unrelated ASTs
    // after this file's walk to avoid collecting garbage during later parses.
    exports(src);
    src.ast = null;
  }
  return { sites: [...sites.values()], opaque, parseMs, collectMs: performance.now() - start - parseMs - inlineMs, inlineMs, styles, modules };
}
