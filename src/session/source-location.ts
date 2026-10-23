import { fileURLToPath } from 'node:url';
import { isAbsolute, sep } from 'node:path';
import { parseSync, visitorKeys } from 'oxc-parser';
import type { Node } from 'oxc-parser';
import { UsageError } from '../errors.js';
import { lineStarts, sourceSite } from '../collect/source.js';
import { sourcePath } from '../source-boundary.js';

/** Decode host spellings only. Membership and real-path checks belong to Session. */
export function sourcePaths(root: string, source: string, servedRoot?: string, stamped = false): string[] {
  // A stamp is an encoded project-relative path, not a bundler URL. Decode
  // once, preserving literal colons, query/hash delimiters and percent signs.
  if (stamped) {
    try { return [sourcePath(root, decodeURIComponent(source))]; }
    catch { throw new UsageError('Source must have valid URL encoding.'); }
  }
  let path = source;
  const fileURL = path.startsWith('file://');
  let browserPath = false;
  try { if (!fileURL) path = decodeURIComponent(path); } catch { throw new UsageError('Source must have valid URL encoding.'); }
  if (fileURL) {
    try { path = fileURLToPath(path); } catch { throw new UsageError('Source must be a local file URL.'); }
  } else if (/^webpack(?:-internal)?:\/\//.test(path)) {
    browserPath = true;
    path = path.replace(/^webpack(?:-internal)?:\/\/[^/]*\//, '').replace(/^\/?\([^/]*\)\//, '').replace(/^\.\//, '');
  } else if (/^https?:\/\//.test(path)) {
    browserPath = true;
    try { path = new URL(path).pathname; } catch { throw new UsageError('Source URL must be valid.'); }
  }
  browserPath ||= path.startsWith('[project]/');
  path = path.replace(/^\[project\]\//, '').replace(/ \[[^\]]+\](?: \([^)]*\))?$/, '');
  const absolute = fileURL || path.startsWith('/@fs/');
  if (path.startsWith('/@fs/')) path = path.slice(4);
  else if (!fileURL && (browserPath || /^\/(?:src|app)\//.test(path) || servedRoot !== undefined && path.startsWith('/') && !path.startsWith(root + sep))) path = path.replace(/^\//, '');
  path = path.replace(/[?#].*$/, '');
  const roots = absolute || isAbsolute(path) || servedRoot === undefined ? [root] : [servedRoot, root];
  return [...new Set(roots.map(base => sourcePath(base, path)))];
}

export interface JSXLocation { line: number; column: number; start: number; end: number; tag: string }
interface Anchor extends JSXLocation { nameEnd: number; closing?: { start: number; end: number } }
const snapshots = new Map<string, { text: string; starts: number[]; anchors: Anchor[]; calls: Call[]; program: Node | null }>();
/** One ownership table per source snapshot; retained independently in server and worker. */
function snapshot(file: string, text: string) {
  const old = snapshots.get(file);
  if (old?.text === text) return old;
  const starts = lineStarts(text), anchors: Anchor[] = [], calls: Call[] = [];
  const parsed = parseSync(file, text);
  function walk(node: Node): void {
    if (node.type === 'CallExpression') {
      const callee = node.callee as Node & { name?: string; property?: { name?: string } };
      calls.push({ start: node.start, end: node.end, name: callee.type === 'Identifier' ? callee.name : callee.property?.name });
    }
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
  const value = { text, starts, anchors, calls, program: parsed.errors.length ? null : parsed.program }; snapshots.set(file, value); return value;
}
function owner(anchors: Anchor[], offset: number): Anchor | undefined {
  // The last containing opening owns the text, including JSX nested in props.
  return anchors.findLast(a => a.start <= offset && offset < a.end);
}
interface Call { start: number; end: number; name: string | undefined }
/** What a position that is not JSX holds. A caller frame in an owner stack sits on a call that renders (items.map(...));
 * a position past the text, on a hook call, or on no call at all cannot have created an element, so its map is wrong. */
export type PositionKind = 'outside' | 'hook' | 'call' | 'other';
export function positionKind(file: string, text: string, line: number, column: number): PositionKind {
  const { starts, calls } = snapshot(file, text), start = starts[line - 1];
  if (start === undefined || start + column - 1 >= (starts[line] ?? text.length + 1)) return 'outside';
  const offset = start + column - 1;
  const call = calls.filter(c => c.start <= offset && offset < c.end).sort((a, b) => (a.end - a.start) - (b.end - b.start))[0];
  if (!call) return 'other';
  return call.name && /^use[A-Z0-9]/.test(call.name) ? 'hook' : 'call';
}
export const isComponentJSX = (tag: string): boolean => /^[A-Z_$]/.test(tag) || tag.includes('.');
/** 'any' accepts host/component opening names; true restricts to components. Neither borrows prop factories. */
export function jsxLocation(file: string, text: string, line: number, column: number, tag?: string, component: boolean | 'any' = false): JSXLocation | undefined {
  const { starts, anchors } = snapshot(file, text), start = starts[line - 1];
  if (start === undefined) return;
  const offset = start + column - 1;
  if (offset >= (starts[line] ?? text.length + 1)) return;
  const found = owner(anchors, offset) ?? (!component ? anchors.find(a => a.closing && a.closing.start <= offset && offset < a.closing.end) : undefined);
  if (!found || tag !== undefined && found.tag !== tag) return;
  if (component && (offset >= found.nameEnd || component === true && !isComponentJSX(found.tag))) return;
  return found;
}

/** A JSX usage proves an authored owner only when its lexical binding defines
 * a component here. Imported library components and shadowing parameters do
 * not prove where an element without React 18 source records was created. */
export function jsxAuthoredOwner(file: string, text: string, location: JSXLocation): boolean {
  if (!isComponentJSX(location.tag) || location.tag.includes('.')) return false;
  const { program } = snapshot(file, text);
  if (!program) return false;
  const path: Node[] = [];
  function find(node: Node): boolean {
    if (node.start > location.start || node.end <= location.start) return false;
    path.push(node);
    if (node.type === 'JSXOpeningElement' && node.start === location.start) return true;
    const record = node as unknown as Record<string, unknown>;
    for (const key of visitorKeys[node.type] ?? []) {
      const value = record[key];
      for (const child of Array.isArray(value) ? value : [value]) if (child && typeof child === 'object' && find(child as Node)) return true;
    }
    path.pop(); return false;
  }
  find(program);
  const name = location.tag;
  const binds = (node: Node): boolean => {
    if (node.type === 'Identifier') return node.name === name;
    if (node.type === 'AssignmentPattern') return binds(node.left);
    if (node.type === 'RestElement') return binds(node.argument);
    if (node.type === 'ObjectPattern') return node.properties.some(property => binds(property.type === 'RestElement' ? property.argument : property.value));
    if (node.type === 'ArrayPattern') return node.elements.some(element => element && binds(element));
    return false;
  };
  const defines = (node: Node | null | undefined): boolean => !!node &&
    (node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression' || node.type === 'ClassExpression' ||
      node.type === 'CallExpression' && node.arguments.some(argument => defines(argument)));
  for (const scope of path.reverse()) {
    if ((scope.type === 'FunctionDeclaration' || scope.type === 'FunctionExpression' || scope.type === 'ArrowFunctionExpression') && scope.params.some(binds)) return false;
    if (scope.type === 'CatchClause' && scope.param && binds(scope.param)) return false;
    if (scope.type !== 'Program' && scope.type !== 'BlockStatement') continue;
    for (const item of scope.body) {
      let statement: Node = item;
      if (statement.type === 'ExportNamedDeclaration' && statement.declaration) statement = statement.declaration;
      if (statement.type === 'ExportDefaultDeclaration') statement = statement.declaration;
      if ((statement.type === 'FunctionDeclaration' || statement.type === 'ClassDeclaration') && statement.id?.name === name) return true;
      if (statement.type === 'ImportDeclaration' && statement.specifiers.some(specifier => specifier.local.name === name)) return false;
      if (statement.type === 'VariableDeclaration') for (const declaration of statement.declarations) if (binds(declaration.id)) return defines(declaration.init);
    }
  }
  return false;
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
