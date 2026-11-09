import type { Plugin } from 'vite';
import { mkdir, writeFile } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve } from 'node:path';
import MagicString from 'magic-string';
import { parseSync, visitorKeys } from 'oxc-parser';
import type { Node } from 'oxc-parser';
import { lineStarts, nodeName, sourceSite } from '../collect/source.js';
import { loadConfig } from '../config.js';
import { projectSourceFiles } from '../project.js';
import type { SessionOptions } from '../session/index.js';
import { stampedSource } from '../source-identity.js';
import { STAMP_ATTRIBUTE, formatStamp, stampHash, stampSource } from '../stamp.js';
import { cacheDirectory } from '../paths.js';

/**
 * The JSX index: every opening the build saw, component tags included, and every createElement/jsx call, with the
 * props written there. Built in the same walk as the stamps. A runtime frame is accepted as a usage site only when it
 * lands exactly on a row of the same hash (docs/briefs/stamping-everywhere.md, "Patterns we hold to").
 */
/** `name` is where the tag name starts: a compiler maps an element's creation to `<` (oxc, Babel) or to the name (SWC). */
export interface IndexRow { line: number; column: number; name?: { line: number; column: number }; tag: string; kind: 'dom' | 'component' | 'call'; props: string[] }
export interface SourceIndex { hash: string; rows: IndexRow[] }
const creators = new Set(['createElement', 'jsx', 'jsxs', 'jsxDEV', 'h']);

/**
 * The one thing stamping injects: a `data-plumb-source` attribute on the opening of a lowercase DOM tag (html, svg, a
 * custom element). A `data-*` attribute on a DOM tag is always valid and React passes it to the element, so it cannot
 * change what a page renders. Nothing else is touched: a component tag gets no prop (a component may reject props,
 * Headless UI's Menu renders a Fragment and throws), a fragment gets nothing, an opening the author already stamped
 * keeps the author's value. Inserts only; authored bytes and their positions remain in the map.
 */
export function stampJSX(code: string, file: string, path: string) {
  const parsed = parseSync(file, code);
  if (parsed.errors.length) return null; // Let the host report its normal parser diagnostic.
  const text = new MagicString(code), starts = lineStarts(code);
  const hash = stampHash(code), source = stampSource(path);
  const rows = walkJSX(parsed.program, file, code, starts, (node, at, domTag) => {
    const authored = node.attributes.some(attribute => attribute.type === 'JSXAttribute' && nodeName(attribute.name) === STAMP_ATTRIBUTE);
    if (domTag && !authored) text.appendLeft(node.end - (node.selfClosing ? 2 : 1), ` ${STAMP_ATTRIBUTE}="${formatStamp({ source, line: at.line, column: at.column, hash })}"`);
  });
  const index: SourceIndex = { hash, rows };
  return text.hasChanged() ? { code: text.toString(), map: text.generateMap({ source: file, includeContent: true, hires: true }), index } : { code: null, map: null, index };
}

/** The index alone, for a file the server reads from disk: the same walk, one parse. Null when the file does not parse. */
export function indexJSX(code: string, file: string): SourceIndex | null {
  const parsed = parseSync(file, code);
  if (parsed.errors.length) return null;
  return { hash: stampHash(code), rows: walkJSX(parsed.program, file, code, lineStarts(code), () => {}) };
}

type Opening = Node & { type: 'JSXOpeningElement'; attributes: Node[]; selfClosing: boolean; end: number; start: number; name: Node };
function walkJSX(program: Node, file: string, code: string, starts: number[], onOpening: (node: Opening, at: { line: number; column: number }, domTag: boolean) => void): IndexRow[] {
  const rows: IndexRow[] = [];
  const site = (start: number) => { const at = sourceSite({ file, text: code, lineStarts: starts }, start, ''); return { line: at.line, column: at.column }; };
  function walk(node: Node): void {
    if (node.type === 'JSXOpeningElement') {
      const opening = node as Opening, tag = nodeName(opening.name);
      const domTag = opening.name.type === 'JSXIdentifier' && /^[a-z]/.test(tag);
      const at = site(opening.start);
      onOpening(opening, at, domTag);
      // A fragment opens no element; everything else is a row, with the props written at it (a spread as `...`).
      if (tag && tag !== 'Fragment' && !tag.endsWith('.Fragment')) {
        rows.push({ ...at, name: site((opening.name as Node & { start: number }).start), tag, kind: domTag ? 'dom' : 'component', props: opening.attributes.map(attribute => attribute.type === 'JSXAttribute' ? nodeName((attribute as Node & { name: Node }).name) : '...') });
      }
    } else if (node.type === 'CallExpression') {
      const call = node as unknown as { start: number; callee: { type: string; start: number; name?: string; property?: Node & { start: number } }; arguments: { type: string; value?: unknown }[] };
      const callee = call.callee;
      const name = callee.type === 'Identifier' ? callee.name : callee.type === 'MemberExpression' && callee.property ? nodeName(callee.property) : undefined;
      if (name && creators.has(name) && call.arguments.length) {
        const [first, second] = call.arguments;
        const tag = first!.type === 'Literal' ? String(first!.value) : nodeName(first as unknown as Node) || '?';
        const props = second?.type === 'ObjectExpression' ? (second as unknown as { properties: { type: string; key?: Node }[] }).properties.map(property => property.type === 'Property' && property.key ? nodeName(property.key) : '...') : [];
        // where a runtime frame points for a call: the name being called (`createElement` in `React.createElement(`)
        rows.push({ ...site(callee.type === 'MemberExpression' && callee.property ? callee.property.start : callee.start), tag, kind: 'call', props });
      }
    }
    const record = node as unknown as Record<string, unknown>;
    for (const key of visitorKeys[node.type] ?? []) {
      const value = record[key];
      for (const child of Array.isArray(value) ? value : [value]) if (child && typeof child === 'object') walk(child as Node);
    }
  }
  walk(program);
  return rows;
}

/** The index a host built, kept by hash in the project's cache so the server reads it instead of parsing again. */
export const indexPath = (root: string, hash: string) => join(cacheDirectory(root), 'index', `${hash}.json`);
export async function storeIndex(root: string, path: string, index: SourceIndex): Promise<void> {
  const file = indexPath(root, index.hash);
  try { await mkdir(join(cacheDirectory(root), 'index'), { recursive: true }); await writeFile(file, JSON.stringify({ path, ...index })); } catch { /* a read-only checkout: the server parses the file itself */ }
}

/** A dev pre-transform, independent of analysis, receipts or module generations. */
export function sourceStamping(options: SessionOptions, production = false): Plugin {
  let root: string;
  let config: ReturnType<typeof loadConfig> | undefined;
  return {
    name: 'plumb',
    enforce: 'pre',
    apply(userConfig, environment) {
      return (environment.command === 'serve' || production) && !process.env.VITEST && !(userConfig as { test?: unknown }).test;
    },
    configResolved(resolved) {
      root = options.root === undefined ? resolved.root : resolve(resolved.root, options.root);
      config = undefined;
      const before = resolved.plugins.slice(0, resolved.plugins.findIndex(plugin => plugin.name === 'plumb'));
      const react = before.find(plugin => /^vite:react[-:]|^vite:preact|babel/i.test(plugin.name));
      // A JSX transform ahead of this one would compile the JSX before a stamp can be placed, and every element on the
      // page would then be a guess. That is not a mode: the dev server stops here and says which line to move.
      if (react) {
        const file = resolved.configFile ? relative(resolved.root, resolved.configFile) : 'vite.config.ts';
        throw new Error(`[plumb] React Plumber must run before ${react.name}. In ${file}, move plumb() before the plugin that compiles JSX (react()) in plugins, so it reads your JSX first.`);
      }
    },
    async transform(code, id) {
      if (id.includes('\0') || id.startsWith('virtual:')) return null;
      const file = id.replace(/[?#].*$/, '');
      if (!isAbsolute(file) || !/\.[cm]?[jt]sx?$/.test(file) || !code.includes('<')) return null;
      // Yours by the rule (inside the repository, neither installed nor generated), or by the config's `source`.
      const loaded = await (config ??= loadConfig(root, options.config));
      const identity = await stampedSource(root, file, loaded.value, async () => (await projectSourceFiles(root, loaded.value, [file])).includes(file));
      const stamped = identity && stampJSX(code, file, identity.path);
      if (!stamped) return null;
      void storeIndex(root, identity.path, stamped.index);
      return stamped.code === null ? null : { code: stamped.code, map: stamped.map };
    },
  };
}
