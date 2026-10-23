import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { profileProgress } from '../profile.js';
import { unreadable } from '../diagnostics.js';
import type { Finding } from '../report.js';
import { parseSync, rawTransferSupported, visitorKeys } from 'oxc-parser';
import type { Node, Program } from 'oxc-parser';
import { ResolverFactory } from 'oxc-resolver';
import type { Condition, Declaration, Site } from '../report.js';
import { collectInline, moduleScope, embedded } from './inline.js';
import type { SourceStyles } from './inline.js';
import { constExport, namedAnchors, sourceSite } from './source.js';
import type { NamedAnchor } from './source.js';
import type { SourceProgram } from './source.js';
import { moduleImports } from './modules.js';
import type { ModuleImport } from './modules.js';
import { collectionCache, sourceHash } from './cache.js';
import { ComputedClasses, classSiteKey } from './computed.js';
import { argumentMode, classHelperRegistry, configKeyMode } from './class-helpers.js';
import type { ClassHelper, ClassHelperInput } from './class-helpers.js';

export interface ClassSite extends Site {
  token: string;
  /** Shared expression/element context for declaration companions. */
  context?: string;
  /** Library-managed composite focus or a script-only container. */
  managedFocus?: boolean;
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
const parserOptions = { preserveParens: false, experimentalRawTransfer: rawTransferSupported() };
const typeOnlyKeys = new Set(['typeAnnotation', 'typeParameters', 'typeArguments', 'returnType', 'superTypeArguments', 'implements']);

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
function literalMap(node: Node | null | undefined): boolean {
  if (!node) return false;
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

export interface CollectionMemory {
  programs: Map<string, SourceProgram>;
  imports: Map<string, ModuleImport[]>;
  specifiers: Map<string, string[]>;
  texts: Map<string, string>;
  resolver?: ResolverFactory;
}

export async function collectClasses(files: string[], classHelpers: ClassHelperInput[] = [], overrides: ReadonlyMap<string, string> = new Map(), onlyFile?: string, programs?: Map<string, SourceProgram>, cacheRoot?: string, memory?: CollectionMemory): Promise<{
  diagnostics: Finding[]; sites: ClassSite[]; opaque: number; parseMs: number; collectMs: number; inlineMs: number; styles: SourceStyles; modules: Map<string, ModuleImport[]>; computedDependencies?: string[]; computedClassFiles?: string[];
}> {
  const start = performance.now();
  profileProgress('phase:parse', { current: 0, files: files.length, total: files.length });
  let parseMs = 0;
  let opaque = 0;
  let inlineMs = 0;
  const styles: SourceStyles = { declarations: [], sites: [], stylesheets: [], imports: [], definedVariables: [] };
  const diagnostics: Finding[] = [];
  const sources = new Map<string, Source>();
  const shared = memory ?? { programs: new Map<string, SourceProgram>(), imports: new Map<string, ModuleImport[]>(), specifiers: new Map<string, string[]>(), texts: new Map<string, string>() };
  const readText = (file: string) => {
    if (overrides.has(file)) return overrides.get(file)!;
    let text = shared.texts.get(file);
    if (text === undefined) { text = readFileSync(file, 'utf8'); shared.texts.set(file, text); }
    return text;
  };
  const modules = new Map<string, ModuleImport[]>();
  const texts = new Map(await Promise.all(files.map(async file => {
    try { return [file, overrides.get(file) ?? shared.texts.get(file) ?? await readFile(file, 'utf8')] as const; }
    catch (error) { diagnostics.push(unreadable(file, file, error)); return [file, ''] as const; }
  })));
  for (const [file, text] of texts) shared.texts.set(file, text);
  const helpers = classHelperRegistry(classHelpers);
  const helperNames = [...helpers.keys()];
  const canContainClasses = (text: string) => text.includes('class') || text.includes('\\') || helperNames.some(helper => text.includes(helper));
  const resolver = shared.resolver ??= new ResolverFactory({ tsconfig: 'auto', extensions: ['.tsx', '.ts', '.jsx', '.js'], extensionAlias: { '.js': ['.ts', '.tsx', '.js'] }, conditionNames: ['import', 'node', 'default'] });
  const dependencies = new Map<string, string>(), resolutions = new Map<string, string | undefined>();
  const resolveImport = (file: string, specifier: string) => {
    const key = `${file}\0${specifier}`;
    if (!resolutions.has(key)) resolutions.set(key, resolver.resolveFileSync(file, specifier).path);
    return resolutions.get(key);
  };
  const cache = cacheRoot && !overrides.size && !onlyFile ? collectionCache(cacheRoot, classHelpers, texts) : undefined;
  // A cold component graph needs the shared programs; otherwise warm collection
  // restores only authored evidence, without allocating any ASTs.
  const cached = programs ? undefined : await cache?.read(resolveImport);
  if (cached) return { ...cached, modules: new Map(cached.modules), parseMs: 0, inlineMs: 0, collectMs: performance.now() - start };
  const sites = new Map<string, ClassSite>();
  let classContext: string | undefined;
  let managedFocus = false;

  function source(file: string, fullAst = false): Source {
    const cached = sources.get(file);
    if (cached && (!fullAst || cached.ast)) return cached;
    let text: string;
    try { text = readText(file); }
    catch (error) { diagnostics.push(unreadable(file, file, error)); text = ''; }
    dependencies.set(file, sourceHash(text));
    const parseStart = performance.now();
    let result: ReturnType<typeof parseSync>, ast: Program;
    try {
      const previous = shared.programs.get(file);
      if (previous?.text === text) ast = previous.ast;
      else {
        result = parseSync(file, text, parserOptions);
        if (result.errors.length) throw new Error(result.errors[0]?.message);
        ast = result.program;
        shared.imports.set(file, moduleImports(result.module, text));
        shared.specifiers.set(file, [...new Set([...result.module.staticImports.map(edge => edge.moduleRequest.value),
          ...result.module.staticExports.flatMap(edge => edge.entries.flatMap(entry => entry.moduleRequest ? [entry.moduleRequest.value] : []))])]);
      }
      if (texts.has(file)) modules.set(file, shared.imports.get(file) ?? []);
    } catch (error) {
      diagnostics.push(unreadable(file, file, error));
      ast = parseSync(file, '', parserOptions).program;
      if (texts.has(file)) modules.set(file, []);
    }
    parseMs += performance.now() - parseStart;
    const lineStarts = [0];
    for (let index = text.indexOf('\n'); index !== -1; index = text.indexOf('\n', index + 1)) lineStarts.push(index + 1);
    const value: Source = { file, text, ast, lineStarts, exports: null, anchors: namedAnchors(ast) };
    const program = { file, text, ast, lineStarts };
    if (!diagnostics.some(d => d.sites.some(s => s.file === file))) shared.programs.set(file, program);
    programs?.set(file, program);
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

  function emit(value: string, src: Source, offset: number, owner: Declaration['owner'], conditions: Condition[], usage?: Site, dynamic = false, offsets?: number[]): void {
    const context = JSON.stringify([owner, conditions, dynamic]);
    for (const match of value.matchAll(/\S+/g)) {
      const token = match[0];
      const locations = [site(src, offsets?.[match.index] ?? offset + match.index, token), ...(usage ? [{ ...usage, text: token }] : [])];
      for (const location of locations) {
        const entry: ClassSite = { ...location, token, owner, conditions, ...(classContext ? { context: classContext } : {}), ...(managedFocus ? { managedFocus: true } : {}), ...(dynamic ? { opaque: 'dynamic-class' as const } : {}) };
        const key = `${location.file}\0${location.line}:${location.column}\0${token}\0${context}`;
        // Shared literals cannot become exempt because their last use happens
        // to be a script-focused container.
        if (sites.has(key) && !sites.get(key)!.managedFocus) delete entry.managedFocus;
        sites.set(key, entry);
      }
    }
  }

  function evaluate(node: Node | null | undefined, src: Source, scopes: Scope[], owner: Declaration['owner'], conditions: Condition[] = [], usage?: Site, follow = true, mode: 'classes' | 'values' | 'config' = 'classes', shape?: ClassHelper): void {
    if (!node) return;
    node = unwrap(node);
    const text = (value: Node) => src.text.slice(value.start, value.end);
    const branch = (value: string) => [...conditions, { kind: 'branch' as const, text: value }];
    const recur = (value: Node | null | undefined, when = conditions, nextMode = mode, nextShape = shape) => evaluate(value, src, scopes, owner, when, usage, follow, nextMode, nextShape);
    switch (node.type) {
      case 'JSXExpressionContainer': recur(node.expression); return;
      case 'Literal':
        if (typeof node.value === 'string') {
          const decoded = embedded(node, src);
          emit(node.value, src, node.start + 1, owner, conditions, usage, false, decoded?.offsets);
        }
        return;
      case 'TemplateLiteral': {
        // Tokenize the whole template: a hole glued to text is one opaque class,
        // never a spurious dead finding for its static prefix or suffix.
        const raw = src.text.slice(node.start + 1, node.end - 1);
        // Oxc's TS template spans include delimiters; JS spans exclude them.
        const delimiters = node.quasis[0]!.start === node.start;
        const holes = node.expressions.map((expression, index) => ({
          start: node.quasis[index]!.end - node.start - (delimiters ? 3 : 1),
          end: node.quasis[index + 1]!.start - node.start - (delimiters ? 0 : 1),
          expression,
        }));
        let masked = raw;
        for (const hole of holes.toReversed()) {
          const boundary = (startsBoundary(hole.expression) || hole.start === 0 || /\s$/.test(raw.slice(0, hole.start))) && (hole.end === raw.length || /^\s/.test(raw.slice(hole.end)));
          masked = masked.slice(0, hole.start) + (boundary ? ' ' : '\u0000').repeat(hole.end - hole.start) + masked.slice(hole.end);
          const before = opaque;
          if (boundary) recur(hole.expression);
          opaque = Math.max(opaque, before + 1);
        }
        for (const match of masked.matchAll(/\S+/g)) {
          if (!match[0].includes('\u0000')) emit(match[0], src, node.start + 1 + match.index, owner, conditions, usage);
          else if (/[^\u0000]/.test(match[0])) {
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
            const nextMode = configKeyMode(shape, key);
            if (!nextMode) continue;
            if (!['variants', 'compoundVariants'].includes(key)) recur(property.value, conditions, nextMode);
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
          else if (!property.computed && key) emit(key, src, property.key.start + (property.key.type === 'Literal' ? 1 : 0), owner, branch(text(property.value)), usage, false, property.key.type === 'Literal' ? embedded(property.key, src)?.offsets : undefined);
          else opaque++;
        }
        return;
      case 'CallExpression': {
        if (node.callee.type === 'MemberExpression' && !node.callee.computed && name(node.callee.property) === 'join' && node.arguments.length === 1 && node.arguments[0]?.type === 'Literal' && node.arguments[0].value === ' ' && unwrap(node.callee.object).type === 'ArrayExpression') {
          recur(node.callee.object); return;
        }
        const helper = name(node.callee);
        const shape = helpers.get(helper);
        if (!shape) {
          opaque++;
          function nested(value: Node): void {
            if (value.type === 'CallExpression' && helpers.has(name(value.callee))) recur(value);
            else for (const child of children(value)) nested(child);
          }
          for (const child of children(node)) nested(child);
          return;
        }
        for (const [index, arg] of node.arguments.entries()) {
          recur(arg, conditions, argumentMode(shape, index, arg.type === 'ObjectExpression'), shape);
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

  for (const [index, file] of files.entries()) {
    if (index % 32 === 0) profileProgress('phase:parse', { current: index, files: files.length, total: files.length });
    const src = source(file, true);
    const ast = src.ast!;
    const inlineStart = performance.now();
    const inlineParseStart = parseMs;
    const inline = collectInline(ast, src, (id, name) => {
      const path = resolveImport(file, id);
      if (!path || !/\.[jt]sx?$/.test(path)) return null;
      const imported = source(path, true);
      const node = constExport(imported.ast!, name);
      const scopes = node ? [moduleScope(imported.ast!, imported, undefined)] : [];
      exports(imported);
      if (imported !== src) imported.ast = null;
      return node ? { source: imported, node, scopes } : null;
    });
    for (const key of ['declarations', 'sites', 'stylesheets', 'imports', 'definedVariables'] as const) (styles[key] as unknown[]).push(...inline[key]);
    inlineMs += performance.now() - inlineStart - (parseMs - inlineParseStart);
    const imports: Scope = new Map();
    const dialogContents = new Set<string>(), commandInputs = new Set<string>();
    for (const statement of ast.body) {
      if (statement.type !== 'ImportDeclaration') continue;
      // Resolve only imports read as class values. Component/helper imports
      // cannot contribute literal maps and need no AST deserialization.
      for (const specifier of statement.specifiers) {
        const key = specifier.type === 'ImportSpecifier' ? name(specifier.imported) : 'default';
        const namespace = specifier.type === 'ImportNamespaceSpecifier';
        if (statement.source.value === '@radix-ui/react-dialog') {
          if (namespace) dialogContents.add(`${specifier.local.name}.Content`);
          else if (key === 'Content' || key === 'DialogContent') dialogContents.add(specifier.local.name);
        }
        if (statement.source.value === 'cmdk') {
          if (key === 'Command') commandInputs.add(`${specifier.local.name}.Input`);
          else if (key === 'CommandInput') commandInputs.add(specifier.local.name);
        }
        imports.set(specifier.local.name, () => {
          const path = resolveImport(file, statement.source.value);
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
          function block(value: Node | null | undefined): void { if (!value) return; if (value.type === 'Identifier') scope.set(value.name, null); else for (const child of children(value)) block(child); }
          block(param);
        }
        next = [...next, scope];
      }
      if (node.type === 'VariableDeclarator' && node.id.type === 'Identifier' && node.init && (['ArrowFunctionExpression', 'FunctionExpression'].includes(unwrap(node.init).type) || (node.init.type === 'CallExpression' && node.init.arguments.some(arg => arg && ['ArrowFunctionExpression', 'FunctionExpression'].includes(arg.type))))) owner = { kind: 'component', name: node.id.name };
      if (node.type === 'JSXOpeningElement') {
        const element = name(node.name);
        owner = { kind: /^[A-Z]/.test(element) ? 'component' : 'element', name: element };
        const attribute = (key: string) => node.attributes.find(attr => attr.type === 'JSXAttribute' && name(attr.name) === key);
        const literal = (key: string): unknown => {
          const attr = attribute(key);
          if (attr?.type !== 'JSXAttribute') return undefined;
          if (!attr.value) return true;
          const value = attr.value.type === 'JSXExpressionContainer' ? unwrap(attr.value.expression) : attr.value;
          if (value.type === 'Literal') return value.value;
          if (value.type === 'UnaryExpression' && value.operator === '-' && value.argument.type === 'Literal' && typeof value.argument.value === 'number') return -value.argument.value;
          return undefined;
        };
        const tabIndex = literal('tabIndex');
        const scriptContainer = /^(div|span|section|article|main|aside|header|footer|nav|dialog)$/.test(element) &&
          !attribute('role') && !attribute('contentEditable') && (tabIndex === -1 || tabIndex === '-1');
        const importedFocus = !next.slice(1).some(scope => scope.has(element.split('.')[0]!));
        const dialogContainer = importedFocus && dialogContents.has(element) && (!attribute('tabIndex') || tabIndex === -1 || tabIndex === '-1');
        const commandInput = importedFocus && commandInputs.has(element) && literal('autoFocus') === true;
        for (const attr of node.attributes) if (attr.type === 'JSXAttribute' && attr.value) {
          if (['className', 'class'].includes(name(attr.name))) {
            classContext = `${file}:${node.start}`;
            managedFocus = scriptContainer || dialogContainer || commandInput;
            evaluate(attr.value, src, next, owner);
            classContext = undefined;
            managedFocus = false;
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
    if (!onlyFile || file === onlyFile) walk(ast, [imports], { kind: 'component', name: '<module>' });
    // Keep exported literal nodes for later imports; release unrelated ASTs
    // after this file's walk to avoid collecting garbage during later parses.
    exports(src);
    src.ast = null;
  }
  profileProgress('phase:parse', { current: files.length, files: files.length, total: files.length });
  profileProgress('phase:collect');
  profileProgress('phase:collect', { current: 0, files: files.length, total: files.length });
  // Computed expressions retain their authored literals, never synthetic usage
  // locations. The same evidence feeds ordinary edits and apply revalidation.
  const authored = new Set([...sites.values()].map(classSiteKey));
  const computedText = (file: string): string => {
    try { return readText(file); }
    catch (error) { diagnostics.push(unreadable(file, file, error)); return ''; }
  };
  const computed = new ComputedClasses(computedText, classHelpers, shared.programs);
  const computedClassFiles = new Set<string>();
  for (const [index, file] of files.entries()) {
    if (index % 32 === 0) profileProgress('phase:collect', { current: index, files: files.length, total: files.length });
    if (onlyFile && file !== onlyFile) continue;
    // Collection runs off the UI thread. Bound work by steps/depth, not wall
    // time: a descheduled worker must retain the same declaration evidence.
    for (const location of computed.trace(file).sites) {
      computedClassFiles.add(location.file);
      const key = classSiteKey(location);
      if (authored.has(key)) continue;
      authored.add(key);
      sites.set(key, { ...location, token: location.text, owner: { kind: 'component', name: '<computed>' }, conditions: [] });
    }
  }
  for (const file of computed.dependencies) dependencies.set(file, sourceHash(computedText(file)));
  for (const [key, path] of computed.resolutions) resolutions.set(key, path);
  profileProgress('phase:collect', { current: files.length, files: files.length, total: files.length });
  const result = { diagnostics, sites: [...sites.values()], opaque, styles, modules: [...modules], computedDependencies: [...computed.dependencies], computedClassFiles: [...computedClassFiles] };
  if (!diagnostics.length) await cache?.write(result, dependencies, resolutions);
  return { ...result, modules, parseMs, collectMs: performance.now() - start - parseMs - inlineMs, inlineMs };
}
