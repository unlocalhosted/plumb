import type { Plugin } from 'vite';
import { isAbsolute, resolve } from 'node:path';
import MagicString from 'magic-string';
import { parseSync, visitorKeys } from 'oxc-parser';
import type { Node } from 'oxc-parser';
import { sourceHash } from '../collect/cache.js';
import { lineStarts, nodeName, sourceSite } from '../collect/source.js';
import { loadConfig } from '../config.js';
import { projectSourceFiles } from '../project.js';
import type { SessionOptions } from '../session/index.js';
import { stampedSource } from '../source-identity.js';

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
  const hash = sourceHash(code).slice(0, 12);
  const encoded = path.split('/').map(encodeURIComponent).join('/');
  function walk(node: Node): void {
    if (node.type === 'JSXOpeningElement') {
      const domTag = node.name.type === 'JSXIdentifier' && /^[a-z]/.test(nodeName(node.name));
      const authored = node.attributes.some(attribute => attribute.type === 'JSXAttribute' && nodeName(attribute.name) === 'data-plumb-source');
      if (domTag && !authored) {
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
      const file = id.replace(/[?#].*$/, '');
      if (!isAbsolute(file) || !/\.[cm]?[jt]sx?$/.test(file) || !code.includes('<')) return null;
      // Yours by the rule (inside the repository, neither installed nor generated), or by the config's `source`.
      const loaded = await (config ??= loadConfig(root, options.config));
      const identity = await stampedSource(root, file, loaded.value, async () => (await projectSourceFiles(root, loaded.value, [file])).includes(file));
      return identity && stampJSX(code, file, identity.path);
    },
  };
}
