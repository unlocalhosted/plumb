import { fileURLToPath } from 'node:url';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { parseSync, visitorKeys } from 'oxc-parser';
import type { Node } from 'oxc-parser';
import { UsageError } from '../errors.js';
import { lineStarts, sourceSite } from '../collect/source.js';

/** Decode host spellings only. Membership and real-path checks belong to Session. */
export function sourcePath(root: string, source: string): string {
  let path = source;
  const fileURL = path.startsWith('file://');
  try { if (!fileURL) path = decodeURIComponent(path); } catch { throw new UsageError('Source must have valid URL encoding.'); }
  if (fileURL) {
    try { path = fileURLToPath(path); } catch { throw new UsageError('Source must be a local file URL.'); }
  } else if (/^webpack(?:-internal)?:\/\//.test(path)) {
    path = path.replace(/^webpack(?:-internal)?:\/\/[^/]*\//, '').replace(/^\([^/]*\)\//, '').replace(/^\.\//, '');
  } else if (/^https?:\/\//.test(path)) {
    try { path = new URL(path).pathname; } catch { throw new UsageError('Source URL must be valid.'); }
    path = path.replace(/^\/(?:src|app)\//, match => match.slice(1));
  }
  path = path.replace(/^\[project\]\//, '').replace(/ \[[^\]]+\](?: \([^)]*\))?$/, '');
  if (path.startsWith('/@fs/')) path = path.slice(4);
  else if (!fileURL && /^\/(?:src|app)\//.test(path)) path = path.slice(1);
  path = path.replace(/[?#].*$/, '');
  const file = resolve(root, path), inside = relative(root, file);
  if (!inside || inside === '..' || inside.startsWith('..' + sep) || isAbsolute(inside) || inside.split(sep).includes('node_modules'))
    throw new UsageError('Source must be inside the project root, outside node_modules.');
  return file;
}

export interface JSXLocation { line: number; column: number; start: number; end: number; tag: string }
interface Anchor extends JSXLocation { nameEnd: number; closing?: { start: number; end: number } }
const snapshots = new Map<string, { text: string; starts: number[]; anchors: Anchor[] }>();
/** One ownership table per source snapshot; retained independently in server and worker. */
function snapshot(file: string, text: string) {
  const old = snapshots.get(file);
  if (old?.text === text) return old;
  const starts = lineStarts(text), anchors: Anchor[] = [];
  const parsed = parseSync(file, text);
  function walk(node: Node): void {
    if (node.type === 'JSXElement') {
      const opening = node.openingElement;
      const site = sourceSite({ file, text, lineStarts: starts }, opening.start, '');
      anchors.push({ line: site.line, column: site.column, start: opening.start, end: opening.end,
        tag: text.slice(opening.name.start, opening.name.end), nameEnd: opening.name.end,
        ...(node.closingElement ? { closing: { start: node.closingElement.start, end: node.closingElement.end } } : {}) });
    }
    const record = node as unknown as Record<string, unknown>;
    for (const key of visitorKeys[node.type] ?? []) {
      const value = record[key];
      if (Array.isArray(value)) { for (const child of value) if (child) walk(child as Node); }
      else if (value && typeof value === 'object') walk(value as Node);
    }
  }
  if (!parsed.errors.length) walk(parsed.program);
  anchors.sort((a, b) => a.start - b.start);
  if (snapshots.size >= 64) snapshots.delete(snapshots.keys().next().value!);
  const value = { text, starts, anchors }; snapshots.set(file, value); return value;
}
function owner(anchors: Anchor[], offset: number): Anchor | undefined {
  // The last containing opening owns the text, including JSX nested in props.
  return anchors.findLast(a => a.start <= offset && offset < a.end);
}
/** Correct within evidenced JSX; owners must point at its component name, not a prop factory. */
export function jsxLocation(file: string, text: string, line: number, column: number, tag?: string, component = false): JSXLocation | undefined {
  const { starts, anchors } = snapshot(file, text), start = starts[line - 1];
  if (start === undefined) return;
  const offset = start + column - 1;
  if (offset >= (starts[line] ?? text.length + 1)) return;
  const found = owner(anchors, offset) ?? anchors.find(a => a.closing && a.closing.start <= offset && offset < a.closing.end);
  if (!found || tag !== undefined && found.tag !== tag) return;
  if (component && (offset >= found.nameEnd || !/^[A-Z_$]/.test(found.tag) && !found.tag.includes('.'))) return;
  return found;
}

/** Same ownership selector for opening-tag site/edits; token/line queries remain exact. */
export function jsxSiteMatcher(file: string, text: string, line: number, column?: number): (site: { file: string; line: number; column: number }) => boolean {
  const { starts, anchors } = snapshot(file, text);
  const exact = column === undefined ? undefined : anchors.find(a => a.line === line && a.column === column);
  return site => {
    if (site.file !== file) return false;
    if (!exact) return site.line === line && (column === undefined || site.column === column);
    const offset = (starts[site.line - 1] ?? -Infinity) + site.column - 1;
    return owner(anchors, offset) === exact;
  };
}
