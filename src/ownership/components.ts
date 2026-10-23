import { existsSync, readFileSync } from 'node:fs';
import { profileProgress } from '../profile.js';
import { basename, dirname, join, resolve, sep } from 'node:path';
import { parseSync, rawTransferSupported, visitorKeys } from 'oxc-parser';
import type { Node, Program } from 'oxc-parser';
import { ResolverFactory } from 'oxc-resolver';
import { componentCache, componentFiles, fileHash } from './cache.js';
import type { PlumbConfig } from '../config.js';
import type { Declaration, Site } from '../report.js';
import { lineStarts, nodeName, references, sourceSite, unwrap } from '../collect/source.js';
import type { SourceText, SourceProgram } from '../collect/source.js';
import { unreadable } from '../diagnostics.js';
import type { Finding } from '../report.js';
import { UsageError } from '../errors.js';
import { classHelperRegistry } from '../collect/class-helpers.js';
import { readClassRecipes } from '../collect/class-recipes.js';
import type { ClassRecipe } from '../collect/class-recipes.js';

export interface ComponentIdentity {
  name: string;
  source: { file: string; line: number };
  variants: Record<string, string[]>;
  roots: { elements: string[]; classes: string[] };
  recipes?: ClassRecipe[];
}
interface Binding { node: Node }
interface Import { file: string; name: string }
interface Module extends SourceText {
  ast: Program;
  diagnostic?: Finding;
  bindings: Map<string, Binding>;
  types: Map<string, Node>;
  imports: Map<string, Import>;
  exports: Map<string, Import | string>;
  stars: string[];
}
/** Parsed imports shared by one Session; changing a file removes its entry. */
export interface ComponentMemory {
  modules: Map<string, Module>;
  identities?: Map<string, ComponentIdentity | null>;
  rootRanges?: Map<ComponentIdentity, RootRange[]>;
  fingerprintClasses?: Map<ComponentIdentity, string[]>;
}
export interface ComponentMount { component: ComponentIdentity; classes: string[]; ancestors: { element: string; classes: string[] }[] }
interface Usage { start: number; end: number; component: ComponentIdentity; site: Site; classes: string[] }
export interface ElementIdentity { start: number; end: number; tag: string; site: Site; styling: { start: number; end: number }[]; component?: ComponentIdentity }
export interface RootRange { file: string; start: number; end: number }
export interface ComponentGraph {
  diagnostics: Finding[];
  root: string;
  components: ComponentIdentity[];
  caller(declaration: Declaration): ComponentIdentity | undefined;
  used: ComponentIdentity[];
  usages: Map<string, Usage[]>;
  mounts: ComponentMount[];
  elements: ElementIdentity[];
  element(site: Site): ElementIdentity | undefined;
  rootRanges: Map<ComponentIdentity, RootRange[]>;
  fingerprintClasses: Map<ComponentIdentity, string[]>;
  sourceTokens: Map<string, { classes: Set<string>; variables: Set<string> }>;
}
const parserOptions = { preserveParens: false, experimentalRawTransfer: rawTransferSupported() };
const typeEdges = new Set(['typeAnnotation', 'typeParameters', 'typeArguments', 'returnType', 'superTypeArguments', 'implements']);
function children(node: Node, types = false): Node[] {
  const result: Node[] = [], record = node as unknown as Record<string, unknown>;
  for (const key of visitorKeys[node.type] ?? []) {
    if (!types && typeEdges.has(key)) continue;
    const value = record[key];
    if (Array.isArray(value)) { for (const item of value) if (item) result.push(item as Node); }
    else if (value) result.push(value as Node);
  }
  return result;
}
function walk(node: Node, visit: (node: Node) => void, types = false): void {
  visit(node); for (const child of children(node, types)) walk(child, visit, types);
}
const inDirectory = (file: string, directory: string) => file === directory || file.startsWith(directory + sep);
const isFunction = (node: Node) => ['ArrowFunctionExpression', 'FunctionExpression', 'FunctionDeclaration'].includes(node.type);
const memberName = (node: Node): string => node.type === 'MemberExpression' && !node.computed ? `${memberName(node.object)}.${nodeName(node.property)}` : nodeName(node);
const resolverOptions = { tsconfig: 'auto' as const, extensions: ['.tsx', '.ts', '.jsx', '.js', '.mts', '.mjs', '.cts', '.cjs'],
  extensionAlias: { '.js': ['.ts', '.tsx', '.js'], '.mjs': ['.mts', '.mjs'], '.cjs': ['.cts', '.cjs'] },
  conditionNames: ['import', 'browser', 'default'], mainFields: ['browser', 'module', 'main'] };

/** Read before collection so a warm graph does not retain unneeded source ASTs. */
export function cachedComponents(root: string, files: string[], config: PlumbConfig, includeUnused = false): ComponentGraph | undefined {
  const resolver = new ResolverFactory(resolverOptions);
  const contexts = new ResolverFactory({ tsconfig: 'auto', resolveToContext: true });
  return componentCache(root, files, config, includeUnused).read((file, specifier) => resolver.resolveFileSync(file, specifier).path,
    (file, specifier) => contexts.resolveFileSync(file, specifier).path);
}

export function discoverComponents(root: string, files: string[], config: PlumbConfig, overrides: ReadonlyMap<string, string> = new Map(), includeUnused = false, programs: ReadonlyMap<string, SourceProgram> = new Map(), readOnly = false, memory?: ComponentMemory): ComponentGraph {
  const diagnostics: Finding[] = [];
  const rootRanges = new Map<ComponentIdentity, RootRange[]>();
  const fingerprintClasses = new Map<ComponentIdentity, string[]>();
  const resolver = new ResolverFactory(resolverOptions);
  // Resolve shadcn aliases to directories even when callers use relative imports.
  const contextResolver = new ResolverFactory({ tsconfig: 'auto', resolveToContext: true });
  const cache = !readOnly && !overrides.size ? componentCache(root, files, config, includeUnused) : undefined;
  const cached = cache?.read((file, specifier) => resolver.resolveFileSync(file, specifier).path,
    (file, specifier) => contextResolver.resolveFileSync(file, specifier).path);
  if (cached) return cached;
  const watchedFiles = new Map<string, string | null>(), watchedDirectories = new Map<string, string[]>();
  const contexts = new Map<string, string | undefined>();
  function exists(file: string): boolean {
    if (cache) watchedFiles.set(file, fileHash(file)); return existsSync(file);
  }
  const modules = new Map<string, Module>(), selected = new Set<string>(), identities = new Map<string, ComponentIdentity | null>();
  const directories: string[] = [], prefixes: string[] = [], packages: string[] = [];
  const configured = config.components?.from;
  if (configured !== undefined) {
    for (const item of Array.isArray(configured) ? configured : [configured]) {
      if (item.startsWith('package:')) packages.push(item.slice(8));
      else if (item.startsWith('directory:')) directories.push(resolve(root, item.slice(10)));
      else if (item.startsWith('import:')) prefixes.push(item.slice(7));
      else if (exists(resolve(root, item))) directories.push(resolve(root, item));
      else prefixes.push(item);
    }
  } else {
    const shadcn = join(root, 'components.json');
    if (exists(shadcn)) {
      try {
        const value = JSON.parse(readFileSync(shadcn, 'utf8')) as { aliases?: { ui?: string; components?: string } };
        const alias = value.aliases?.ui ?? value.aliases?.components;
        if (alias) {
          if (exists(resolve(root, alias))) directories.push(resolve(root, alias));
          else {
            prefixes.push(alias.replace(/\/$/, ''));
            for (const file of files.filter(file => /\.[jt]sx?$/.test(file))) {
              const path = contextResolver.resolveFileSync(file, alias).path;
              contexts.set(`${file}\0${alias}`, path);
              if (path && !directories.includes(path)) directories.push(path);
            }
          }
        } else directories.push(join(root, 'src/components/ui'));
      } catch (error) { throw new UsageError(`Read components.json: ${String(error)}`); }
    } else directories.push(join(root, exists(join(root, 'src/components/ui')) ? 'src/components/ui' : 'src/components'));
  }
  const discoveryDirectories = [...directories];
  const resolutions = new Map<string, string | undefined>();
  function selectedFile(file: string): boolean { return selected.has(file) || directories.some(directory => inDirectory(file, directory)); }
  function target(file: string, specifier: string): string | undefined {
    const key = `${file}\0${specifier}`;
    if (!resolutions.has(key)) resolutions.set(key, resolver.resolveFileSync(file, specifier).path);
    const path = resolutions.get(key);
    if (!path || !/\.[cm]?[jt]sx?$/.test(path)) return;
    const chosen = prefixes.some(prefix => specifier === prefix || specifier.startsWith(prefix.endsWith('/') ? prefix : prefix + '/'));
    if (chosen) selected.add(path);
    if (packages.some(name => specifier === name || specifier.startsWith(name + '/'))) {
      // Resolve with the consumer's paths first: monorepos often publish compiled
      // JS but point local consumers at TS source. Otherwise keep actual exports.
      let directory = dirname(path);
      while (directory !== dirname(directory)) {
        const manifest = join(directory, 'package.json');
        if (exists(manifest)) {
          try {
            const name = (JSON.parse(readFileSync(manifest, 'utf8')) as { name?: string }).name;
            if (name && packages.includes(name)) { if (!directories.includes(directory)) directories.push(directory); break; }
          } catch { /* Resolution already succeeded; a non-package ancestor is harmless. */ }
        }
        directory = dirname(directory);
      }
      selected.add(path);
    }
    return path;
  }
  function module(file: string): Module {
    const cached = modules.get(file); if (cached) return cached;
    const warm = overrides.has(file) ? undefined : memory?.modules.get(file);
    if (warm) { modules.set(file, warm); if (warm.diagnostic) diagnostics.push(warm.diagnostic); return warm; }
    const shared = programs.get(file);
    let text = '', ast: Program | undefined, diagnostic: Finding | undefined;
    try {
      text = overrides.get(file) ?? shared?.text ?? readFileSync(file, 'utf8');
      if (cache) watchedFiles.set(file, fileHash(file));
      ast = shared?.text === text ? shared.ast : undefined;
      if (!ast) {
        const parsed = parseSync(file, text, parserOptions);
        if (parsed.errors.length) throw new Error(parsed.errors[0]?.message);
        ast = parsed.program;
      }
    } catch (error) {
      diagnostic = unreadable(file, file, error); diagnostics.push(diagnostic);
      ast = parseSync(file, '', parserOptions).program;
    }
    const value: Module = { file, text, lineStarts: shared?.text === text ? shared.lineStarts : lineStarts(text), ast, ...(diagnostic ? { diagnostic } : {}), bindings: new Map(), types: new Map(), imports: new Map(), exports: new Map(), stars: [] };
    modules.set(file, value);
    for (const statement of value.ast.body) {
      if (statement.type === 'ImportDeclaration') {
        if (statement.importKind === 'type') continue;
        // Resolve lazily below; imports unrelated to identity need no AST.
        for (const item of statement.specifiers) {
          if (item.type === 'ImportSpecifier' && item.importKind === 'type') continue;
          value.imports.set(item.local.name, { file: statement.source.value, name: item.type === 'ImportNamespaceSpecifier' ? '*' : item.type === 'ImportSpecifier' ? nodeName(item.imported) : 'default' });
        }
      }
      const declaration = statement.type === 'ExportNamedDeclaration' ? statement.declaration : statement.type === 'ExportDefaultDeclaration' ? statement.declaration : statement;
      if (declaration?.type === 'VariableDeclaration') {
        for (const item of declaration.declarations) if (item.id.type === 'Identifier' && item.init) {
          value.bindings.set(item.id.name, { node: item.init });
          if (statement.type === 'ExportNamedDeclaration') value.exports.set(item.id.name, item.id.name);
        }
      } else if (declaration?.type === 'FunctionDeclaration' && declaration.id) {
        value.bindings.set(declaration.id.name, { node: declaration });
        if (statement.type === 'ExportNamedDeclaration') value.exports.set(declaration.id.name, declaration.id.name);
      } else if (declaration?.type === 'TSTypeAliasDeclaration' || declaration?.type === 'TSInterfaceDeclaration') value.types.set(declaration.id.name, declaration);
      if (statement.type === 'ExportNamedDeclaration' && statement.exportKind !== 'type') {
        for (const item of statement.specifiers) if (item.exportKind !== 'type') value.exports.set(nodeName(item.exported), statement.source ? { file: statement.source.value, name: nodeName(item.local) } : nodeName(item.local));
      }
      if (statement.type === 'ExportAllDeclaration' && statement.exportKind !== 'type') {
        if (statement.exported) value.exports.set(nodeName(statement.exported), { file: statement.source.value, name: '*' });
        else value.stars.push(statement.source.value);
      }
      if (statement.type === 'ExportDefaultDeclaration') {
        if (declaration?.type === 'Identifier') value.exports.set('default', declaration.name);
        else if (declaration) {
          const name = declaration.type === 'FunctionDeclaration' && declaration.id ? declaration.id.name : 'default';
          value.bindings.set(name, { node: declaration }); value.exports.set('default', name);
        }
      }
    }
    if (!overrides.has(file)) memory?.modules.set(file, value);
    return value;
  }
  function exported(file: string, name: string, seen: Set<string>): ComponentIdentity | undefined {
    const key = `export:${file}:${name}`; if (seen.has(key)) return;
    seen = new Set([...seen, key]);
    const value = module(file), [base, ...parts] = name.split('.'), edge = value.exports.get(base!);
    if (typeof edge === 'string') return local(value, [edge, ...parts].join('.'), seen);
    if (edge) {
      const path = target(file, edge.file); if (path) {
        if (selectedFile(file)) selected.add(path);
        return exported(path, [edge.name === '*' ? '' : edge.name, ...parts].filter(Boolean).join('.'), seen);
      }
    }
    for (const star of value.stars) {
      const path = target(file, star); if (!path) continue;
      if (selectedFile(file)) selected.add(path);
      const found = exported(path, name, seen); if (found) return found;
    }
  }
  function functionNode(node: Node, value: Module, seen = new Set<string>()): Node | undefined {
    node = unwrap(node);
    if (isFunction(node)) return node;
    if (node.type === 'Identifier' && !seen.has(node.name)) {
      const binding = value.bindings.get(node.name);
      if (binding) return functionNode(binding.node, value, new Set([...seen, node.name]));
    }
    if (node.type === 'CallExpression' && /(?:^|\.)(?:forwardRef|memo)$/.test(memberName(node.callee))) {
      for (const arg of node.arguments) { const found = functionNode(arg, value, seen); if (found) return found; }
    }
  }
  function values(value: Module, node: Node, seen = new Set<string>()): string[] {
    node = unwrap(node);
    if (node.type === 'Literal' && typeof node.value === 'string') return [node.value];
    if (node.type === 'TSTypeAliasDeclaration') return values(value, node.typeAnnotation, seen);
    if (node.type === 'TSLiteralType') return values(value, node.literal, seen);
    if (node.type === 'TSUnionType') return [...new Set(node.types.flatMap(type => values(value, type, seen)))];
    if (node.type === 'TSTypeReference' && node.typeName.type === 'Identifier') {
      const name = node.typeName.name; if (seen.has(name)) return [];
      const type = value.types.get(name); if (type) return values(value, type, new Set([...seen, name]));
      // Imported string unions (including aliases) are source decisions too.
      for (const statement of value.ast.body) if (statement.type === 'ImportDeclaration') for (const specifier of statement.specifiers) {
        if (specifier.local.name !== name || specifier.type === 'ImportNamespaceSpecifier') continue;
        const path = target(value.file, statement.source.value); if (!path) continue;
        const other = module(path), id = specifier.type === 'ImportSpecifier' ? nodeName(specifier.imported) : 'default';
        const type = other.types.get(id); if (type) return values(other, type, new Set([...seen, name]));
      }
    }
    return [];
  }
  function implementation(value: Module, name: string, seen = new Set<string>()): { value: Module; node: Node } | undefined {
    const key = `${value.file}:${name}`; if (seen.has(key) || seen.size > 32) return;
    seen = new Set([...seen, key]);
    const edge = value.exports.get(name) ?? name;
    if (typeof edge !== 'string') {
      const path = target(value.file, edge.file); if (path) return implementation(module(path), edge.name, seen);
      return;
    }
    const imported = value.imports.get(edge);
    if (imported) { const path = target(value.file, imported.file); if (path) return implementation(module(path), imported.name, seen); return; }
    const binding = value.bindings.get(edge);
    if (binding) {
      const node = unwrap(binding.node);
      return node.type === 'Identifier' ? implementation(value, node.name, seen) : { value, node };
    }
    for (const star of value.stars) { const path = target(value.file, star); if (path) { const found = implementation(module(path), name, seen); if (found) return found; } }
  }
  function metadata(value: Module, name: string, node: Node): ComponentIdentity {
    const variants: Record<string, string[]> = {}, elements = new Set<string>(), classes = new Set<string>();
    // Props attached to this component only; unrelated components' axes do not leak.
    const propNames = new Set<string>();
    walk(node, item => { if (item.type === 'TSTypeReference' && item.typeName.type === 'Identifier') propNames.add(item.typeName.name); }, true);
    propNames.add(`${name.split('.')[0]}Props`);
    const declarationFile = value.file.replace(/\.[cm]?jsx?$/, '.d.ts');
    const propSource = !value.types.size && declarationFile !== value.file && exists(declarationFile) ? module(declarationFile) : value;
    for (const propName of propNames) {
      const type = propSource.types.get(propName); if (!type) continue;
      walk(type, item => {
        if (item.type !== 'TSPropertySignature' || !item.typeAnnotation) return;
        const axis = nodeName(item.key), choices = values(propSource, item.typeAnnotation.typeAnnotation);
        if (axis === 'as') for (const choice of choices) elements.add(choice);
        else if (choices.length && !['children', 'className', 'class'].includes(axis)) variants[axis] = choices;
      }, true);
    }
    const bindings = new Map([...value.bindings].map(([id, binding]) => [id, binding.node]));
    walk(node, item => { if (item.type === 'VariableDeclarator' && item.id.type === 'Identifier' && item.init) bindings.set(item.id.name, item.init); });
    const visited = new Set<string>();
    function dependency(item: Node, collectClasses = true): void {
      item = unwrap(item);
      if (item.type === 'Identifier' && bindings.has(item.name) && !visited.has(item.name)) { visited.add(item.name); dependency(bindings.get(item.name)!, collectClasses); return; }
      const helper = item.type === 'CallExpression' ? memberName(item.callee) : '';
      const importedHelper = value.imports.get(helper)?.name ?? helper;
      if (item.type === 'CallExpression' && /(?:^|\.)(?:cva|tv)$/.test(importedHelper)) {
        for (const arg of item.arguments) walk(arg, part => {
          if (part.type !== 'Property' || nodeName(part.key) !== 'variants' || part.value.type !== 'ObjectExpression') return;
          for (const axis of part.value.properties) if (axis.type === 'Property' && axis.value.type === 'ObjectExpression') variants[nodeName(axis.key)] = axis.value.properties.flatMap(choice => choice.type === 'Property' ? [nodeName(choice.key)] : []);
        });
      }
      if (collectClasses && item.type === 'Literal' && typeof item.value === 'string') for (const token of item.value.split(/\s+/)) if (/^[\w-]+$/.test(token)) classes.add(token);
      if (collectClasses && item.type === 'TemplateLiteral') for (const quasi of item.quasis) for (const token of (quasi.value.cooked ?? '').split(/\s+/)) if (/^[\w-]+$/.test(token)) classes.add(token);
      for (const child of children(item)) dependency(child, collectClasses);
    }
    const rootOpenings: Node[] = [];
    function rootJsx(item: Node): void {
      item = unwrap(item);
      if (item.type === 'JSXElement') { rootOpenings.push(item.openingElement); return; }
      if (item.type === 'JSXFragment') { for (const child of item.children) rootJsx(child); return; }
      if (item.type === 'ConditionalExpression') { rootJsx(item.consequent); rootJsx(item.alternate); return; }
      if (item.type === 'LogicalExpression') { rootJsx(item.right); return; }
      if (item.type === 'JSXExpressionContainer') rootJsx(item.expression);
    }
    // Compiled React/Base UI roots retain their literal host tag too.
    walk(node, part => {
      if (part.type !== 'CallExpression') return;
      const helper = memberName(part.callee), imported = value.imports.get(helper)?.name ?? helper;
      if (!/(?:^|\.)(?:useRenderElement|jsx|jsxs|createElement)$/.test(imported)) return;
      const first = part.arguments[0]; if (first?.type === 'Literal' && typeof first.value === 'string') elements.add(first.value);
    });
    const fn = functionNode(node, value);
    function returns(item: Node): void {
      if (isFunction(item) && item !== fn) return;
      if (item.type === 'ReturnStatement' && item.argument) { rootJsx(item.argument); return; }
      if (item === fn && (item.type === 'ArrowFunctionExpression') && item.body.type !== 'BlockStatement') { rootJsx(item.body); return; }
      for (const child of children(item)) returns(child);
    }
    if (fn) returns(fn);
    for (const item of rootOpenings) {
      if (item.type !== 'JSXOpeningElement') continue;
      const tag = nodeName(item.name);
      if (/^[a-z]/.test(tag)) elements.add(tag);
      else {
        const host = bindings.get(tag);
        if (host && ['Literal', 'ConditionalExpression'].includes(host.type)) walk(host, part => {
          if (part.type === 'Literal' && typeof part.value === 'string' && /^[a-z][a-z0-9-]*$/.test(part.value)) elements.add(part.value);
        });
        const found = implementation(value, tag);
        if (found) walk(found.node, part => {
          if (part.type === 'JSXOpeningElement' && /^[a-z]/.test(nodeName(part.name))) elements.add(nodeName(part.name));
          if (part.type === 'CallExpression') {
            const helper = memberName(part.callee), imported = found.value.imports.get(helper)?.name ?? helper;
            if (/(?:^|\.)(?:useRenderElement|jsx|jsxs|createElement)$/.test(imported)) {
              const first = part.arguments[0]; if (first?.type === 'Literal' && typeof first.value === 'string') elements.add(first.value);
            }
          }
        });
      }
      for (const attr of item.attributes) if (attr.type === 'JSXAttribute' && ['className', 'class'].includes(nodeName(attr.name)) && attr.value) dependency(attr.value);
    }
    // Inspect variant dependencies without mistaking child/label strings for root classes.
    visited.clear();
    dependency(node, false);
    const at = sourceSite(value, node.start, name);
    const identity: ComponentIdentity = { name, source: { file: value.file, line: at.line }, variants, roots: { elements: [...elements].sort(), classes: [...classes].sort() } };
    rootRanges.set(identity, rootOpenings.flatMap(item => item.type === 'JSXOpeningElement' ? item.attributes.flatMap(attr =>
      attr.type === 'JSXAttribute' && ['className', 'class', 'style'].includes(nodeName(attr.name)) ? [{ file: value.file, start: attr.start, end: attr.end }] : []) : []));
    const fingerprint = new Set<string>(), recipes: ClassRecipe[] = [];
    const helpers = classHelperRegistry(config.classHelpers);
    for (const opening of rootOpenings) if (opening.type === 'JSXOpeningElement') for (const attr of opening.attributes) {
      if (attr.type !== 'JSXAttribute' || !['className', 'class'].includes(nodeName(attr.name)) || !attr.value) continue;
      const read = readClassRecipes(attr.value, helpers, id => bindings.get(id), id => value.imports.get(id)?.name ?? id);
      const defaults = read.filter(recipe => recipe.default);
      for (const recipe of defaults.length ? defaults : read) for (const token of recipe.classes) fingerprint.add(token);
      recipes.push(...read.filter(recipe => Object.keys(recipe.variants).length));
    }
    if (recipes.length) identity.recipes = recipes;
    fingerprintClasses.set(identity, [...fingerprint].sort());
    return identity;
  }
  function local(value: Module, name: string, seen: Set<string>): ComponentIdentity | undefined {
    const key = `${value.file}:${name}`;
    if (seen.has(key)) return;
    const cached = identities.has(key) ? identities.get(key) : memory?.identities?.get(key);
    if (cached !== undefined) {
      identities.set(key, cached);
      if (cached) {
        const ranges = memory?.rootRanges?.get(cached), classes = memory?.fingerprintClasses?.get(cached);
        if (ranges) rootRanges.set(cached, ranges);
        if (classes) fingerprintClasses.set(cached, classes);
      }
      return cached ?? undefined;
    }
    seen = new Set([...seen, key]);
    const [base, ...parts] = name.split('.'), edge = value.imports.get(base!);
    if (edge) {
      const path = target(value.file, edge.file); if (!path) return;
      const found = exported(path, [edge.name === '*' ? '' : edge.name, ...parts].filter(Boolean).join('.'), seen);
      // Positive aliases are stable within this graph. Do not cache misses:
      // cycles and newly selected re-exports can change their interpretation.
      if (found) identities.set(key, found);
      return found;
    }
    const binding = value.bindings.get(base!); if (!binding) return;
    let node = unwrap(binding.node), publicName = [...value.exports].find(([exported, local]) => exported !== 'default' && local === base)?.[0] ?? base!;
    if (publicName === 'default') publicName = basename(value.file).replace(/\.[cm]?[jt]sx?$/, '').replace(/(?:^|-)([a-z])/g, (_, letter: string) => letter.toUpperCase());
    if (node.type === 'Identifier') return local(value, [node.name, ...parts].join('.'), seen);
    // Compound components: object namespaces and Object.assign(Root, { Root, Screen }).
    if (node.type === 'ObjectExpression' || node.type === 'CallExpression' && memberName(node.callee) === 'Object.assign') {
      const object = node.type === 'ObjectExpression' ? node : node.arguments.find(arg => arg.type === 'ObjectExpression');
      const part = parts.shift();
      const property = object?.type === 'ObjectExpression' && object.properties.find(item => item.type === 'Property' && nodeName(item.key) === part);
      const child = property && property.type === 'Property' ? property.value : !part && node.type === 'CallExpression' ? node.arguments[0] : undefined;
      if (!child) return;
      if (child.type === 'Identifier') {
        const childBinding = value.bindings.get(child.name);
        if (childBinding) node = unwrap(childBinding.node); else return local(value, child.name, seen);
      } else node = unwrap(child);
      publicName += part ? `.${part}` : '';
    } else if (parts.length) return;
    const body = functionNode(node, value);
    let hasReact = false;
    if (body) walk(body, item => {
      const call = item.type === 'CallExpression' ? memberName(item.callee) : '';
      if (item.type === 'JSXElement' || item.type === 'CallExpression' && /(?:^|\.)(?:jsx|jsxs|createElement)$/.test(value.imports.get(call)?.name ?? call)) hasReact = true;
    });
    if (!hasReact) { identities.set(key, null); return; }
    if (selectedFile(value.file)) {
      const identity = metadata(value, publicName, node); identities.set(key, identity); return identity;
    }
    // A local forwarding wrapper retains the design-system identity. Only a
    // parameter's className/class or a props spread qualifies; a literal does not.
    const parameters = new Set<string>(), classParameters = new Set<string>();
    if (body && (body.type === 'FunctionDeclaration' || body.type === 'FunctionExpression' || body.type === 'ArrowFunctionExpression')) for (const param of body.params) {
      const pattern = param.type === 'AssignmentPattern' ? param.left : param;
      if (pattern.type === 'Identifier') parameters.add(pattern.name);
      if (pattern.type === 'ObjectPattern') for (const prop of pattern.properties) {
        if (prop.type === 'RestElement' && prop.argument.type === 'Identifier') parameters.add(prop.argument.name);
        else if (prop.type === 'Property' && ['className', 'class'].includes(nodeName(prop.key))) {
          const id = prop.value.type === 'AssignmentPattern' ? prop.value.left : prop.value;
          if (id.type === 'Identifier') classParameters.add(id.name);
        }
      }
    }
    let found: ComponentIdentity | undefined;
    if (body) walk(body, item => {
      if (item.type !== 'JSXOpeningElement') return;
      let forwarding = false;
      for (const attr of item.attributes) {
        if (attr.type === 'JSXSpreadAttribute' && attr.argument.type === 'Identifier' && parameters.has(attr.argument.name)) forwarding = true;
        if (attr.type === 'JSXAttribute' && ['className', 'class'].includes(nodeName(attr.name)) && attr.value) walk(attr.value, part => {
          if (part.type === 'Identifier' && classParameters.has(part.name)) forwarding = true;
          if (part.type === 'MemberExpression' && part.object.type === 'Identifier' && parameters.has(part.object.name) && ['className', 'class'].includes(nodeName(part.property))) forwarding = true;
        });
      }
      if (forwarding) found ??= local(value, nodeName(item.name), seen);
    });
    identities.set(key, found ?? null); return found;
  }
  const usages = new Map<string, Usage[]>(), used = new Map<string, ComponentIdentity>(), mounts: ComponentMount[] = [];
  const elements: ElementIdentity[] = [], elementsByFile = new Map<string, ElementIdentity[]>();
  const elementLocations = new Map<string, Map<number, ElementIdentity | undefined>>();
  const callerLocations = new Map<string, Map<number, ComponentIdentity | undefined>>();
  const sourceFiles = files.filter(file => /\.[jt]sx?$/.test(file));
  for (const [index, file] of sourceFiles.entries()) {
    if (index % 32 === 0) profileProgress('phase:components', { current: index, total: sourceFiles.length });
    const value = module(file), ranges: Usage[] = [];
    function scan(node: Node, inherited?: ComponentIdentity, shadowed = new Set<string>(), ancestors: ComponentMount['ancestors'] = []): void {
      // Block/function bindings shadow imports; don't infer ownership from a name.
      let shadows = shadowed;
      if (isFunction(node)) {
        shadows = new Set(shadowed);
        if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression') for (const param of node.params) walk(param, part => { if (part.type === 'Identifier') shadows.add(part.name); });
      }
      if (node.type === 'BlockStatement') {
        shadows = new Set(shadows);
        for (const item of node.body) if (item.type === 'VariableDeclaration') for (const binding of item.declarations) if (binding.id.type === 'Identifier') shadows.add(binding.id.name);
      }
      if (node.type === 'JSXElement') {
        const opening = node.openingElement, tag = nodeName(opening.name);
        let component = inherited ?? (!shadows.has(tag.split('.')[0]!) ? local(value, tag, new Set()) : undefined);
        const render = opening.attributes.find(attr => attr.type === 'JSXAttribute' && nodeName(attr.name) === 'render');
        // A design-system render target lends its identity to the primitive host.
        if (!component && render?.type === 'JSXAttribute' && render.value?.type === 'JSXExpressionContainer' && render.value.expression.type === 'JSXElement') component = local(value, nodeName(render.value.expression.openingElement.name), new Set());
        const element: ElementIdentity = { start: opening.start, end: opening.end, tag, site: sourceSite(value, opening.start, `<${tag}>`),
          styling: opening.attributes.flatMap(attr => attr.type === 'JSXAttribute' && ['className', 'class', 'style'].includes(nodeName(attr.name)) ? [{ start: attr.start, end: attr.end }] : []),
          ...(component ? { component } : {}) };
        elements.push(element);
        const fileElements = elementsByFile.get(file) ?? [];
        fileElements.push(element); elementsByFile.set(file, fileElements);
        const classes: string[] = [];
        for (const attr of opening.attributes) if (attr.type === 'JSXAttribute' && ['className', 'class'].includes(nodeName(attr.name)) && attr.value?.type === 'Literal' && typeof attr.value.value === 'string') classes.push(...attr.value.value.split(/\s+/));
        if (component) {
          used.set(`${component.source.file}:${component.name}`, component);
          mounts.push({ component, classes, ancestors });
          for (const attr of opening.attributes) if (attr.type === 'JSXAttribute' && ['className', 'class', 'style'].includes(nodeName(attr.name))) ranges.push({ start: attr.start, end: attr.end, component, site: sourceSite(value, opening.start, `<${tag}>`), classes });
        }
        for (const attr of opening.attributes) if (attr.type === 'JSXAttribute' && attr.value) scan(attr.value, nodeName(attr.name) === 'render' ? component : undefined, shadows, ancestors);
        for (const child of node.children) scan(child, undefined, shadows, [...ancestors, { element: tag, classes }]);
        return;
      }
      for (const child of children(node)) scan(child, inherited, shadows, ancestors);
    }
    if (value.text.includes('<')) scan(value.ast);
    usages.set(file, ranges);
  }
  profileProgress('phase:components', { current: sourceFiles.length, total: sourceFiles.length });
  // Imitation needs identities even when every caller hand-builds the component.
  // Local UI directories also supply static recipes, even without a resolved
  // caller import (e.g. a Vite-only alias). Keep other unused identities opt-in.
  const knownIdentities = new Set(identities.values());
  const fingerprints = Object.keys(config.imitation ?? {});
  if ((includeUnused || fingerprints.length) && files[0]) for (const specifier of [...packages, ...prefixes]) { const path = target(files[0], specifier); if (path) module(path); }
  for (const directory of discoveryDirectories) {
    const discovered = componentFiles(directory); watchedDirectories.set(directory, discovered);
    for (const file of discovered) module(file);
  }
  if (includeUnused || discoveryDirectories.length) {
    for (const value of modules.values()) if (selectedFile(value.file)) {
      for (const name of value.exports.keys()) if (name !== '*') exported(value.file, name, new Set());
      for (const star of value.stars) { const path = target(value.file, star); if (path) { selected.add(path); module(path); } }
    }
  } else if (fingerprints.length) {
    for (const value of modules.values()) if (selectedFile(value.file)) for (const name of fingerprints) exported(value.file, name, new Set());
  }
  const components = [...new Map([...identities.values()].flatMap(value => value && (includeUnused || fingerprints.length || knownIdentities.has(value) || value.recipes?.length) ? [[`${value.source.file}:${value.name}`, value] as const] : [])).values()];
  const retained = new Set(components);
  for (const identity of rootRanges.keys()) if (!retained.has(identity)) rootRanges.delete(identity);
  for (const identity of fingerprintClasses.keys()) if (!retained.has(identity)) fingerprintClasses.delete(identity);
  const sourceTokens = new Map<string, { classes: Set<string>; variables: Set<string> }>();
  if (includeUnused) for (const file of new Set(components.map(component => component.source.file))) {
    const inventory = { classes: new Set<string>(), variables: new Set<string>() };
    walk(module(file).ast, item => {
      const texts = item.type === 'Literal' && typeof item.value === 'string' ? [item.value] : item.type === 'TemplateLiteral' ? item.quasis.map(quasi => quasi.value.cooked ?? '') : [];
      for (const text of texts) {
        for (const token of text.split(/\s+/)) if (token) inventory.classes.add(token);
        for (const name of references(text)) inventory.variables.add(name);
      }
    });
    sourceTokens.set(file, inventory);
  }
  const sourceLines = new Map([...modules].map(([file, value]) => [file, value.lineStarts]));
  const graph: ComponentGraph = { diagnostics, root, components, used: [...used.values()], usages, mounts, elements, rootRanges, fingerprintClasses, sourceTokens,
    element(site) {
      const lines = sourceLines.get(site.file); if (!lines) return;
      const offset = lines[site.line - 1]! + site.column - 1;
      const locations = elementLocations.get(site.file) ?? new Map<number, ElementIdentity | undefined>();
      elementLocations.set(site.file, locations);
      if (locations.has(offset)) return locations.get(offset);
      // Nested JSX in render/style expressions belongs to the smallest opening.
      const found = elementsByFile.get(site.file)?.filter(item => item.styling.some(range => offset >= range.start && offset < range.end)).sort((a, b) => (a.end - a.start) - (b.end - b.start))[0];
      locations.set(offset, found); return found;
    },
    caller(declaration) {
      const file = declaration.site.file, lines = sourceLines.get(file); if (!lines) return;
      const offset = lines[declaration.site.line - 1]! + declaration.site.column - 1;
      const locations = callerLocations.get(file) ?? new Map<number, ComponentIdentity | undefined>();
      callerLocations.set(file, locations);
      if (locations.has(offset)) return locations.get(offset);
      const usage = usages.get(file)?.find(item => offset >= item.start && offset < item.end);
      const component = usage?.component.source.file === file ? undefined : usage?.component;
      locations.set(offset, component);
      if (usage) return component;
      // Literal constants retain definition and usage sites. The usage range is
      // authoritative: definitions outside an attribute are not callers.
      return;
    },
  };
  if (!diagnostics.length) cache?.write(graph, new Map([...modules].map(([file, value]) => [file, value.lineStarts])), watchedFiles, watchedDirectories, resolutions, contexts);
  if (memory && !overrides.size) {
    memory.identities ??= new Map(); memory.rootRanges ??= new Map(); memory.fingerprintClasses ??= new Map();
    for (const [key, identity] of identities) memory.identities.set(key, identity);
    for (const [identity, ranges] of rootRanges) memory.rootRanges.set(identity, ranges);
    for (const [identity, classes] of fingerprintClasses) memory.fingerprintClasses.set(identity, classes);
  }
  modules.clear();
  return graph;
}
