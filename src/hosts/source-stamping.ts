import type { Plugin } from 'vite';
import { realpath } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';
import MagicString from 'magic-string';
import { parseSync, visitorKeys } from 'oxc-parser';
import type { Node } from 'oxc-parser';
import { sourceHash } from '../collect/cache.js';
import { lineStarts, nodeName, sourceSite } from '../collect/source.js';
import { loadConfig } from '../config.js';
import { projectSourceFiles } from '../project.js';
import type { SessionOptions } from '../session/index.js';
import { containsPath, sourceBoundary } from '../source-boundary.js';

/** Inserts only props; authored bytes and their positions remain in the map. */
export function stampJSX(code: string, file: string, path: string) {
  const parsed = parseSync(file, code);
  if (parsed.errors.length) return null; // Let the host report its normal parser diagnostic.
  const text = new MagicString(code), starts = lineStarts(code);
  const hash = sourceHash(code).slice(0, 12);
  const encoded = path.split('/').map(encodeURIComponent).join('/');
  function walk(node: Node): void {
    if (node.type === 'JSXOpeningElement') {
      const tag = nodeName(node.name);
      const authored = node.attributes.some(attribute => attribute.type === 'JSXAttribute' && nodeName(attribute.name) === 'data-plumb-source');
      if (tag !== 'Fragment' && !tag.endsWith('.Fragment') && !authored) {
        const at = sourceSite({ file, text: code, lineStarts: starts }, node.start, '');
        text.appendLeft(node.end - (node.selfClosing ? 2 : 1), ` data-plumb-source="${encoded}:${at.line}:${at.column}#${hash}"`);
      }
    }
    const record = node as unknown as Record<string, unknown>;
    for (const key of visitorKeys[node.type] ?? []) {
      const value = record[key];
      for (const child of Array.isArray(value) ? value : [value]) if (child && typeof child === 'object') walk(child as Node);
    }
  }
  walk(parsed.program);
  return text.hasChanged() ? { code: text.toString(), map: text.generateMap({ source: file, includeContent: true, hires: true }) } : null;
}

/** A dev pre-transform, independent of analysis, receipts or module generations. */
export function sourceStamping(options: SessionOptions, production = false): Plugin {
  let root: string;
  let config: ReturnType<typeof loadConfig> | undefined;
  let disabled = false;
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
      const react = before.find(plugin => /^vite:react[-:]/.test(plugin.name));
      // React's transform would see the JSX first, so stamps could not be placed. The dev server keeps running: the
      // overlay falls back to the owner chain, and the warning says how to get exact stamps.
      disabled = Boolean(react);
      if (react) resolved.logger.warn(`[plumb] Source stamping is off: plumb() runs after ${react.name}. Put plumb() before react() in plugins for exact locations.`);
    },
    async transform(code, id) {
      if (disabled || id.includes('\0') || id.startsWith('virtual:')) return null;
      const file = id.replace(/[?#].*$/, ''), path = relative(root, file).replaceAll('\\', '/');
      if (!isAbsolute(file) || !/\.[cm]?[jt]sx?$/.test(file) || !path || !containsPath(sourceBoundary(root), file) ||
        /(?:^|\/)(?:node_modules|\.git|dist|build|\.next|\.cache|\.plumb-cache|\.plumber\/cache|\.plumb\/cache)(?:\/|$)/.test(path) || !code.includes('<')) return null;
      // The same source selectors as analysis, without a project crawl. Real
      // paths exclude linked packages even when an alias lives under src/.
      if (await realpath(file) !== resolve(await realpath(root), path)) return null;
      const loaded = await (config ??= loadConfig(root, options.config));
      if (!(await projectSourceFiles(root, loaded.value, [file])).includes(file)) return null;
      return stampJSX(code, file, path);
    },
  };
}
