import { readFileSync } from 'node:fs';
import { parseSync, rawTransferSupported, visitorKeys } from 'oxc-parser';
import type { Node } from 'oxc-parser';
import { ResolverFactory } from 'oxc-resolver';
import { embedded } from './inline.js';
import { lineStarts, nodeName, sourceSite, unwrap } from './source.js';
import type { SourceProgram } from './source.js';
import type { Site } from '../report.js';
import { argumentMode, classHelperRegistry, configKeyMode } from './class-helpers.js';
import type { ClassHelper, ClassHelperInput } from './class-helpers.js';

export type ClassTraceLimit = 'operations' | 'depth' | 'function-depth' | 'import-hops';

interface Binding { node?: Node; source: Module; import?: { specifier: string; name: string }; }
interface Scope { parent?: Scope; bindings: Map<string, Binding> }
interface Module extends SourceProgram { scopes: WeakMap<Node, Scope>; exports: Map<string, Binding>; stars: string[]; elements: Node[]; imports: string[]; literals: { start: number; end: number }[] }
interface Ref { node: Node; source: Module; args: Map<Binding, Ref> }
export const classSiteKey = (site: Site) => `${site.file}\0${site.line}:${site.column}\0${site.text}`;
const parserOptions = { preserveParens: false, experimentalRawTransfer: rawTransferSupported() };
const functions = new Set(['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression']);
const ignored = new Set(['typeAnnotation', 'typeParameters', 'typeArguments', 'returnType', 'superTypeArguments', 'implements']);
function children(node: Node): Node[] {
  const record = node as unknown as Record<string, unknown>;
  return (visitorKeys[node.type] ?? []).filter(key => !ignored.has(key)).flatMap(key => {
    const value = record[key]; return (Array.isArray(value) ? value.filter(item => item != null) : value ? [value] : []) as Node[];
  });
}

/** Authored complete tokens only. No JS execution, string synthesis or runtime guesses. */
export class ComputedClasses {
  private modules = new Map<string, Module>();
  private resolver = new ResolverFactory({ tsconfig: 'auto', extensions: ['.tsx', '.ts', '.jsx', '.js', '.mts', '.mjs', '.cts', '.cjs'], extensionAlias: { '.js': ['.ts', '.tsx', '.js'] }, conditionNames: ['import', 'node', 'default'] });
  readonly dependencies = new Set<string>();
  readonly resolutions = new Map<string, string | undefined>();
  private steps = 0;
  private importDepths = new Map<string, number>();
  private limits = new Set<ClassTraceLimit>();
  get limited(): boolean { return this.limits.size > 0; }
  private helpers: ReadonlyMap<string, ClassHelper>;
  constructor(private read: (file: string) => string = file => readFileSync(file, 'utf8'), helpers: ClassHelperInput[] = [], private programs?: ReadonlyMap<string, SourceProgram>) { this.helpers = classHelperRegistry(helpers); }
  configure(helpers: ClassHelperInput[] = []): void { this.helpers = classHelperRegistry(helpers); }
  invalidate(): void { this.modules.clear(); this.resolutions.clear(); this.resolver.clearCache(); }
  private tick(depth = 0): boolean {
    if (++this.steps > 20000) { this.limits.add('operations'); return false; }
    if (depth > 16) { this.limits.add('depth'); return false; }
    return true;
  }
  private module(file: string): Module | undefined {
    // Parsing and lexical indexing are revision work, not trace operations.
    // Always cache a complete module, irrespective of previous trace limits.
    this.dependencies.add(file);
    const text = this.read(file), old = this.modules.get(file);
    if (old?.text === text) return old;
    const previous = this.programs?.get(file);
    const parsed = previous?.text === text ? undefined : parseSync(file, text, parserOptions);
    if (parsed?.errors.length) return;
    const source: Module = { file, text, ast: parsed?.program ?? previous!.ast, lineStarts: lineStarts(text), scopes: new WeakMap(), exports: new Map(), stars: [], elements: [], imports: [], literals: [] };
    const root: Scope = { bindings: new Map() };
    const declare = (node: Node, scope: Scope): void => {
      const statement = node.type === 'ExportNamedDeclaration' ? node.declaration : node;
      if (statement?.type === 'VariableDeclaration') for (const item of statement.declarations) {
        if (item.id.type === 'Identifier') scope.bindings.set(item.id.name, { source, ...(statement.kind === 'const' && item.init ? { node: item.init } : {}) });
      }
      if (statement?.type === 'FunctionDeclaration' && statement.id) scope.bindings.set(statement.id.name, { source, node: statement });
    };
    const walk = (node: Node, parent: Scope): void => {
      let scope = parent;
      if (node.type === 'Program' || node.type === 'BlockStatement') {
        scope = node.type === 'Program' ? root : { parent, bindings: new Map() };
        for (const statement of node.body) declare(statement, scope);
      } else if (functions.has(node.type)) {
        scope = { parent, bindings: new Map() };
        const params = (node as Node & { params: Node[]; body: Node }).params;
        const block = (param: Node | null | undefined): void => {
          if (!param) return;
          if (param.type === 'Identifier') scope.bindings.set(param.name, { source });
          else if (param.type === 'AssignmentPattern') block(param.left);
          else for (const child of children(param)) block(child);
        };
        for (const param of params) block(param);
      }
      source.scopes.set(node, scope);
      if (node.type === 'Literal' && typeof node.value === 'string') source.literals.push({ start: node.start + 1, end: node.end - 1 });
      if (node.type === 'TemplateElement') source.literals.push({ start: node.start + 1, end: node.start + 1 + node.value.raw.length });
      if (node.type === 'Property' && !node.computed && node.key.type === 'Identifier') source.literals.push({ start: node.key.start, end: node.key.end });
      if (node.type === 'ImportDeclaration') {
        if (node.importKind === 'type') return;
        source.imports.push(node.source.value);
        for (const item of node.specifiers) if (item.type !== 'ImportSpecifier' || item.importKind !== 'type') root.bindings.set(item.local.name, { source, import: { specifier: node.source.value, name: item.type === 'ImportSpecifier' ? nodeName(item.imported) : item.type === 'ImportNamespaceSpecifier' ? '*' : 'default' } });
        return;
      }
      if (node.type === 'JSXOpeningElement') source.elements.push(node);
      for (const child of children(node)) walk(child, scope);
    };
    walk(source.ast, root);
    for (const statement of source.ast.body) {
      if ((statement.type === 'ExportNamedDeclaration' || statement.type === 'ExportAllDeclaration') && statement.source && statement.exportKind !== 'type') source.imports.push(statement.source.value);
      if (statement.type === 'ExportAllDeclaration' && statement.exportKind !== 'type') source.stars.push(statement.source.value);
      if (statement.type === 'ExportNamedDeclaration') {
        if (statement.declaration?.type === 'VariableDeclaration') for (const item of statement.declaration.declarations) {
          if (item.id.type === 'Identifier') source.exports.set(item.id.name, root.bindings.get(item.id.name)!);
        }
        if (statement.declaration?.type === 'FunctionDeclaration' && statement.declaration.id) source.exports.set(statement.declaration.id.name, root.bindings.get(statement.declaration.id.name)!);
        for (const item of statement.specifiers) source.exports.set(nodeName(item.exported), statement.source ? { source, import: { specifier: statement.source.value, name: nodeName(item.local) } } : root.bindings.get(nodeName(item.local))!);
      }
      if (statement.type === 'ExportDefaultDeclaration') source.exports.set('default', { source, node: statement.declaration });
    }
    if (this.modules.size >= 128) this.modules.delete(this.modules.keys().next().value!);
    this.modules.set(file, source);
    return source;
  }
  private imported(source: Module, specifier: string, depth: number): Module | undefined {
    const hops = (this.importDepths.get(source.file) ?? 0) + 1;
    if (hops > 6) { this.limits.add('import-hops'); return; }
    if (!this.tick(depth)) return;
    const key = `${source.file}\0${specifier}`;
    if (!this.resolutions.has(key)) this.resolutions.set(key, this.resolver.resolveFileSync(source.file, specifier).path);
    const file = this.resolutions.get(key);
    // Installed runtime code is not authored project evidence.
    if (!file || /(?:^|\/)node_modules\//.test(file) || !/\.[cm]?[jt]sx?$/.test(file)) return;
    this.importDepths.set(file, Math.min(this.importDepths.get(file) ?? hops, hops));
    try { return this.module(file); } catch { return; }
  }
  private binding(ref: Ref, name: string): Binding | undefined {
    let scope = ref.source.scopes.get(ref.node);
    while (scope) { if (scope.bindings.has(name)) return scope.bindings.get(name); scope = scope.parent; }
    return;
  }
  private exported(source: Module, name: string, depth: number, seen = new Set<string>()): Binding | undefined {
    if (!this.tick(depth) || seen.has(source.file)) return;
    seen.add(source.file);
    const own = source.exports.get(name); if (own) return own;
    if (name === 'default') return;
    for (const specifier of source.stars) {
      const imported = this.imported(source, specifier, depth);
      if (imported) { const binding = this.exported(imported, name, depth + 1, seen); if (binding) return binding; }
    }
    return;
  }
  private resolve(ref: Ref, depth: number): Ref | undefined {
    if (!ref.node || !this.tick(depth)) return;
    const node = unwrap(ref.node);
    if (node.type === 'Identifier') {
      const binding = this.binding({ ...ref, node }, node.name);
      if (!binding) return;
      const argument = ref.args.get(binding);
      if (argument) return this.resolve(argument, depth + 1);
      if (binding.import) {
        const imported = this.imported(binding.source, binding.import.specifier, depth);
        const exported = imported && this.exported(imported, binding.import.name, depth);
        if (exported?.node) return this.resolve({ node: exported.node, source: exported.source, args: ref.args }, depth + 1);
        if (exported?.import) return this.resolveExport(exported, ref.args, depth + 1);
        return;
      }
      return binding.node ? this.resolve({ ...ref, node: binding.node, source: binding.source }, depth + 1) : undefined;
    }
    if (node.type === 'MemberExpression') {
      const key = node.computed ? this.scalar({ ...ref, node: node.property }, depth + 1) : nodeName(node.property);
      if (node.object.type === 'Identifier') {
        const binding = this.binding({ ...ref, node: node.object }, node.object.name);
        if (binding?.import?.name === '*' && typeof key === 'string') {
          const imported = this.imported(binding.source, binding.import.specifier, depth);
          const exported = imported && this.exported(imported, key, depth);
          return exported ? this.resolveExport(exported, ref.args, depth + 1) : undefined;
        }
      }
      const object = this.resolve({ ...ref, node: node.object }, depth + 1);
      if (object?.node.type === 'ObjectExpression') {
        const properties = object.node.properties.filter(p => p.type === 'Property' && !p.computed && (key === undefined || nodeName(p.key) === String(key)));
        if (properties.length === 1 && properties[0]?.type === 'Property') return this.resolve({ ...object, node: properties[0].value }, depth + 1);
        return { ...object, node: { ...object.node, properties } };
      }
      return;
    }
    return { ...ref, node };
  }
  private resolveExport(binding: Binding, args: Map<Binding, Ref>, depth: number): Ref | undefined {
    if (!this.tick(depth)) return;
    if (binding.node) return this.resolve({ node: binding.node, source: binding.source, args }, depth + 1);
    if (binding.import) {
      const imported = this.imported(binding.source, binding.import.specifier, depth);
      const next = imported && this.exported(imported, binding.import.name, depth);
      if (next) return this.resolveExport(next, args, depth + 1);
    }
    return;
  }
  private scalar(ref: Ref, depth: number): string | number | boolean | null | undefined {
    const value = this.resolve(ref, depth);
    if (value?.node.type === 'Literal') return typeof value.node.value === 'object' ? null : value.node.value as string | number | boolean;
    if (value?.node.type === 'BinaryExpression' && ['===', '!=='].includes(value.node.operator)) {
      const left = this.scalar({ ...value, node: value.node.left }, depth + 1), right = this.scalar({ ...value, node: value.node.right }, depth + 1);
      if (left !== undefined && right !== undefined) return value.node.operator === '===' ? left === right : left !== right;
    }
    return;
  }
  private evaluate(ref: Ref, sites: Map<string, Site>, depth = 0, mode: 'classes' | 'values' | 'config' = 'classes', shape?: ClassHelper): void {
    const value = this.resolve(ref, depth); if (!value) return;
    const { node, source } = value;
    if (unwrap(ref.node).type === 'MemberExpression' && node.type === 'ObjectExpression') mode = 'values';
    const recur = (child: Node | null | undefined, nextMode = mode, nextShape = shape) => { if (child) this.evaluate({ ...value, node: child }, sites, depth + 1, nextMode, nextShape); };
    const emit = (text: string, offset: number, offsets?: number[]) => {
      for (const match of text.matchAll(/\S+/g)) {
        const site = sourceSite(source, offsets?.[match.index] ?? offset + match.index, match[0]); sites.set(classSiteKey(site), site);
      }
    };
    switch (node.type) {
      case 'JSXExpressionContainer': recur(node.expression); break;
      case 'Literal': if (typeof node.value === 'string') emit(node.value, node.start + 1, embedded(node, source)?.offsets); break;
      case 'TemplateLiteral':
        if (!node.expressions.length) { const literal = embedded(node, source); if (literal) emit(literal.css, node.start + 1, literal.offsets); break; }
        for (const [i, quasi] of node.quasis.entries()) {
          const raw = quasi.value.raw;
          for (const match of raw.matchAll(/\S+/g)) {
            const left = match.index > 0 || i === 0, right = match.index + match[0].length < raw.length || i === node.quasis.length - 1;
            if (left && right && !match[0].includes('\\')) emit(match[0], quasi.start + 1 + match.index);
          }
          const expression = node.expressions[i];
          if (expression && (raw === '' && i === 0 || /\s$/.test(raw)) && (node.quasis[i + 1]?.value.raw === '' && i + 1 === node.quasis.length - 1 || /^\s/.test(node.quasis[i + 1]?.value.raw ?? ''))) recur(expression);
        }
        break;
      case 'ConditionalExpression': {
        const test = this.scalar({ ...value, node: node.test }, depth + 1);
        if (test === undefined || test) recur(node.consequent);
        if (test === undefined || !test) recur(node.alternate); break;
      }
      case 'LogicalExpression':
        if (node.operator !== '&&') recur(node.left);
        if (this.scalar({ ...value, node: node.left }, depth + 1) !== false || node.operator !== '&&') recur(node.right); break;
      case 'ArrayExpression': for (const child of node.elements) if (child) recur(child); break;
      case 'ObjectExpression':
        for (const property of node.properties) if (property.type === 'Property' && !property.computed) {
          const key = nodeName(property.key);
          if (mode === 'config') {
            const nextMode = configKeyMode(shape, key);
            if (nextMode) recur(property.value, nextMode);
          } else if (mode === 'values') recur(property.value);
          else if (this.scalar({ ...value, node: property.value }, depth + 1) !== false) emit(key, property.key.start + (property.key.type === 'Literal' ? 1 : 0));
        }
        break;
      case 'CallExpression': {
        const helper = nodeName(node.callee);
        const binding = node.callee.type === 'Identifier' ? this.binding({ ...value, node: node.callee }, helper) : undefined;
        const importedName = binding?.import?.name ?? helper;
        const shape = this.helpers.get(importedName);
        if (shape) {
          for (const [i, child] of node.arguments.entries()) recur(child, argumentMode(shape, i), shape);
          break;
        }
        if (node.callee.type === 'MemberExpression' && nodeName(node.callee.property) === 'join' && node.arguments[0]?.type === 'Literal' && node.arguments[0].value === ' ') { recur(node.callee.object); break; }
        if (node.callee.type === 'MemberExpression' && nodeName(node.callee.property) === 'filter' && node.arguments[0]?.type === 'Identifier' && node.arguments[0].name === 'Boolean') { recur(node.callee.object); break; }
        const target = this.resolve({ ...value, node: node.callee }, depth + 1);
        if (!target) break;
        if (target.node.type === 'CallExpression') { this.evaluate(target, sites, depth + 1); break; }
        if (functions.has(target.node.type) && depth < 10) {
          const fn = target.node as Node & { params: Node[]; body: Node };
          const args = new Map(target.args);
          for (const [i, param] of fn.params.entries()) {
            if (!param) continue;
            const id = param.type === 'AssignmentPattern' ? param.left : param;
            if (id.type !== 'Identifier') continue;
            const binding = target.source.scopes.get(fn)?.bindings.get(id.name), argument = node.arguments[i];
            if (binding && argument) args.set(binding, { ...value, node: argument });
            else if (binding && param.type === 'AssignmentPattern') args.set(binding, { ...target, node: param.right });
          }
          this.returns({ ...target, args }, sites, depth + 1);
        } else if (functions.has(target.node.type)) this.limits.add('function-depth');
        break;
      }
      case 'ArrowFunctionExpression': case 'FunctionExpression': case 'FunctionDeclaration': this.returns(value, sites, depth + 1); break;
      // Binary strings, arbitrary runtime calls and mutations are deliberately opaque.
    }
  }
  private returns(ref: Ref, sites: Map<string, Site>, depth: number): void {
    const fn = ref.node as Node & { params: Node[]; body: Node };
    if (!fn.body) return;
    if (fn.body.type !== 'BlockStatement') { this.evaluate({ ...ref, node: fn.body }, sites, depth); return; }
    const walk = (node: Node): void => {
      if (!this.tick(depth) || functions.has(node.type)) return;
      if (node.type === 'ReturnStatement') { if (node.argument) this.evaluate({ ...ref, node: node.argument }, sites, depth); return; }
      if (node.type === 'IfStatement') {
        const test = this.scalar({ ...ref, node: node.test }, depth + 1);
        if (test === undefined || test) walk(node.consequent);
        if ((test === undefined || !test) && node.alternate) walk(node.alternate); return;
      }
      for (const child of children(node)) walk(child);
    };
    walk(fn.body);
  }
  trace(file: string, start?: number): { sites: Site[]; imports: string[]; limited: boolean; limits: ClassTraceLimit[] } {
    // Complete the bounded evaluation; elapsed time must never alter evidence.
    this.steps = 0; this.limits.clear();
    this.importDepths = new Map([[file, 0]]);
    const source = this.module(file), sites = new Map<string, Site>();
    if (source) for (const element of source.elements) {
      if (element.type !== 'JSXOpeningElement' || start !== undefined && element.start !== start) continue;
      for (const attr of element.attributes) if (attr.type === 'JSXAttribute' && ['className', 'class'].includes(nodeName(attr.name)) && attr.value) this.evaluate({ node: attr.value, source, args: new Map() }, sites);
    }
    const imports: string[] = [], seen = new Set([file]);
    const visit = (module: Module, depth: number): void => {
      for (const specifier of module.imports) {
        const next = this.imported(module, specifier, depth);
        if (!next || seen.has(next.file)) continue;
        seen.add(next.file); imports.push(next.file); visit(next, depth + 1);
      }
    };
    if (source && start !== undefined) visit(source, 1);
    return { sites: [...sites.values()], imports, limited: this.limited, limits: [...this.limits].sort() };
  }
  /** Distinguish literal spelling from collector usage aliases with equal text. */
  authored(site: Site): boolean {
    const source = this.modules.get(site.file) ?? this.module(site.file);
    if (!source) return false;
    const offset = (source.lineStarts[site.line - 1] ?? -Infinity) + site.column - 1;
    return source.literals.some(range => range.start <= offset && offset + site.text.length <= range.end);
  }
}
