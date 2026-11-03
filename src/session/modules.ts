import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ResolverFactory } from 'oxc-resolver';
import { parseSync } from 'oxc-parser';
import type { Node } from 'oxc-parser';
import { hostConfigNames } from '../project-facts/project/host-config.js';
import type { ModuleFacts } from './class-site.js';

/**
 * The project's own modules, as class-site asks for them (docs/research/engine-review-2.md, N1–N3): a specifier written in
 * a file, resolved the way the project's bundler resolves it (relative paths, index files, the tsconfig `paths` of the
 * file's tsconfig and its references, the vite config's `resolve.alias`), to a source file inside the root, read. A
 * package (anything under node_modules), a file outside the root, or a specifier nothing resolves is null: it is never
 * one of the project's components.
 *
 * Paths come in and go out in the caller's scheme: absolute (the engine's class-site and pinned writes), or relative to the
 * root with forward slashes (the recipe plan's).
 */
export function projectModules(root: string, read: (absolute: string) => string | undefined, scheme: 'absolute' | 'relative' = 'absolute'): ModuleFacts {
  const resolver = new ResolverFactory({
    tsconfig: 'auto', alias: viteAliases(root), symlinks: false,
    extensions: ['.tsx', '.ts', '.jsx', '.js', '.mts', '.mjs', '.cts', '.cjs'],
    extensionAlias: { '.js': ['.ts', '.tsx', '.js'], '.mjs': ['.mts', '.mjs'], '.cjs': ['.cts', '.cjs'] },
    conditionNames: ['import', 'browser', 'default'], mainFields: ['browser', 'module', 'main'],
  });
  const rel = (absolute: string) => relative(root, absolute).replaceAll('\\', '/');
  const answers = new Map<string, ReturnType<ModuleFacts>>();
  return (from, specifier) => {
    const key = `${from}\n${specifier}`;
    if (answers.has(key)) return answers.get(key)!;
    let answer: ReturnType<ModuleFacts> = null;
    try {
      const absoluteFrom = scheme === 'relative' ? resolve(root, from) : from;
      const target = resolver.resolveFileSync(absoluteFrom, specifier).path;
      const inside = target ? rel(target) : '';
      if (target && inside && !inside.startsWith('../') && !isAbsolute(inside) && !/(?:^|\/)node_modules\//.test(inside) && /\.[cm]?[jt]sx?$/.test(target)) {
        const text = read(target);
        if (text !== undefined) answer = { file: inside, path: scheme === 'relative' ? inside : target, text };
      }
    } catch { answer = null; }
    answers.set(key, answer);
    return answer;
  };
}

/** The vite config's `resolve.alias`, read as written (an object of find → replacement, or a list of { find, replacement }
 * with a string find): a replacement that is a string, `path.resolve(__dirname, …)`/`join(…)`, or
 * `fileURLToPath(new URL('./src', import.meta.url))`. Anything computed otherwise is left out (its imports resolve to
 * nothing, so they are never taken for a component's usage). */
function viteAliases(root: string): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const name of hostConfigNames.vite) {
    const file = join(root, name);
    if (!existsSync(file)) continue;
    let program: Node;
    try { const parsed = parseSync(file, readFileSync(file, 'utf8')); if (parsed.errors.length) return out; program = parsed.program as unknown as Node; }
    catch { return out; }
    const strings = (node: Node | null | undefined): string | undefined => !node ? undefined
      : node.type === 'Literal' && typeof node.value === 'string' ? node.value
      : node.type === 'TemplateLiteral' && !node.expressions.length ? node.quasis.map(q => q.value.cooked ?? '').join('') : undefined;
    const isRoot = (node: Node) => node.type === 'Identifier' && node.name === '__dirname'
      || node.type === 'MemberExpression' && !node.computed && node.property.type === 'Identifier' && node.property.name === 'dirname' && node.object.type === 'MetaProperty';
    const isMetaUrl = (node: Node) => node.type === 'MemberExpression' && !node.computed && node.property.type === 'Identifier' && node.property.name === 'url' && node.object.type === 'MetaProperty';
    const url = (node: Node): string | undefined => {
      if (node.type === 'NewExpression' && node.callee.type === 'Identifier' && node.callee.name === 'URL' && node.arguments.length === 2 && isMetaUrl(node.arguments[1] as Node)) {
        const path = strings(node.arguments[0] as Node);
        return path === undefined ? undefined : resolve(root, path);
      }
      const text = strings(node);
      return text?.startsWith('file:') ? fileURLToPath(text) : undefined;
    };
    const value = (node: Node): string | undefined => {
      const text = strings(node);
      // vite reads '/src' as the project root's src
      if (text !== undefined) return text.startsWith('/') && !existsSync(text) ? join(root, text) : resolve(root, text);
      if (node.type === 'CallExpression') {
        const callee = node.callee.type === 'Identifier' ? node.callee.name : node.callee.type === 'MemberExpression' && node.callee.property.type === 'Identifier' ? node.callee.property.name : '';
        if (callee === 'fileURLToPath' && node.arguments.length === 1) return url(node.arguments[0] as Node);
        if (callee === 'resolve' || callee === 'join') {
          const parts: string[] = [];
          for (const argument of node.arguments as Node[]) {
            if (isRoot(argument)) { parts.push(root); continue; }
            const part = strings(argument);
            if (part === undefined) return undefined;
            parts.push(part);
          }
          return resolve(root, ...parts);
        }
      }
      if (node.type === 'MemberExpression' && !node.computed && node.property.type === 'Identifier' && node.property.name === 'pathname') return url(node.object);
      return undefined;
    };
    const visit = (node: unknown): void => {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) { for (const child of node) visit(child); return; }
      const n = node as Node;
      if (n.type === 'Property' && !n.computed && (n.key.type === 'Identifier' ? n.key.name : strings(n.key)) === 'alias') {
        const v = n.value;
        if (v.type === 'ObjectExpression') for (const p of v.properties) {
          if (p.type !== 'Property' || p.computed) continue;
          const find = p.key.type === 'Identifier' ? p.key.name : strings(p.key), to = value(p.value);
          if (find !== undefined && to !== undefined) out[find] = [to];
        }
        if (v.type === 'ArrayExpression') for (const e of v.elements) {
          if (e?.type !== 'ObjectExpression') continue;
          const field = (name: string) => e.properties.find(p => p.type === 'Property' && !p.computed && (p.key.type === 'Identifier' ? p.key.name : strings(p.key)) === name) as Node & { value: Node } | undefined;
          const find = strings(field('find')?.value), to = field('replacement') ? value(field('replacement')!.value) : undefined;
          if (find !== undefined && to !== undefined) out[find] = [to];
        }
        return;
      }
      for (const [key, child] of Object.entries(n)) if (key !== 'parent' && child && typeof child === 'object') visit(child);
    };
    visit(program);
    return out;
  }
  return out;
}
