// @ts-check
// oxc parse, positions, and AST helpers shared by extraction, graph and lint (spec section 7.1).

/** @typedef {{ type: string, start: number, end: number, [k: string]: any }} Node */

/** @param {string} file @param {string} text */
export async function parse(file, text) {
  const { parseSync } = await import('oxc-parser');
  const result = parseSync(file, text);
  return { program: /** @type {Node} */ (result.program), comments: result.comments, errors: result.errors, lines: lineTable(text) };
}

/** @param {string} text */
export function lineTable(text) {
  const starts = [0];
  for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) starts.push(i + 1);
  return starts;
}

/** 1-based line and column of a UTF-16 offset. @param {number[]} lines @param {number} offset */
export function position(lines, offset) {
  let lo = 0, hi = lines.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (lines[mid] <= offset) lo = mid; else hi = mid - 1;
  }
  return { line: lo + 1, column: offset - lines[lo] + 1 };
}

/** @param {number[]} lines @param {{ start: number, end: number }} node */
export function span(lines, node) {
  const a = position(lines, node.start), b = position(lines, node.end);
  return { line: a.line, column: a.column, endLine: b.line, endColumn: b.column };
}

const SKIP_KEYS = new Set(['start', 'end', 'range', 'loc', 'type', 'raw']);

/** Child nodes of a node, in source order of appearance in the object. @param {Node} node */
export function children(node) {
  /** @type {Node[]} */
  const out = [];
  for (const key in node) {
    if (SKIP_KEYS.has(key)) continue;
    const v = node[key];
    if (!v || typeof v !== 'object') continue;
    if (Array.isArray(v)) { for (const item of v) if (item && typeof item.type === 'string') out.push(item); }
    else if (typeof v.type === 'string') out.push(v);
  }
  return out;
}

/**
 * Depth-first walk. `visit` returns `false` to skip a subtree.
 * @param {Node} node @param {(node: Node, parents: Node[]) => void | false} visit @param {Node[]} [parents]
 */
export function walk(node, visit, parents = []) {
  if (visit(node, parents) === false) return;
  parents.push(node);
  for (const child of children(node)) walk(child, visit, parents);
  parents.pop();
}

/** Strips TS wrappers around an expression. @param {Node} node */
export function unwrap(node) {
  let n = node;
  for (;;) {
    if (!n) return n;
    if (n.type === 'TSAsExpression' || n.type === 'TSSatisfiesExpression' || n.type === 'TSNonNullExpression' || n.type === 'TSTypeAssertion') n = n.expression;
    else if (n.type === 'ParenthesizedExpression') n = n.expression;
    else if (n.type === 'ChainExpression') n = n.expression;
    else return n;
  }
}

/** @param {Node} node */
export function isFunction(node) {
  return node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression';
}

/** The property name of a non-computed member or class key: `#x` for private names. @param {Node} key @param {boolean} [computed] */
export function keyName(key, computed = false) {
  if (!key || computed) return null;
  if (key.type === 'PrivateIdentifier') return '#' + key.name;
  if (key.type === 'Identifier') return key.name;
  if (key.type === 'Literal' && typeof key.value === 'string') return key.value;
  return null;
}

/** `this.<name>` at depth one, or null. @param {Node} node */
export function thisMember(node) {
  const n = unwrap(node);
  if (!n || n.type !== 'MemberExpression' || n.computed) return null;
  if (unwrap(n.object)?.type !== 'ThisExpression') return null;
  return keyName(n.property);
}

/** @param {Node} node */
export function isStringLiteral(node) {
  return node?.type === 'Literal' && typeof node.value === 'string';
}

/** The class name of a top-level class statement, or null. @param {Node} stmt */
export function topLevelClass(stmt) {
  let s = stmt;
  if (s.type === 'ExportNamedDeclaration' || s.type === 'ExportDefaultDeclaration') s = s.declaration;
  if (!s) return null;
  if (s.type === 'ClassDeclaration' && s.id) return { name: s.id.name, node: s };
  if (s.type === 'VariableDeclaration') {
    for (const d of s.declarations) {
      const init = unwrap(d.init);
      if (init?.type === 'ClassExpression' && d.id?.type === 'Identifier') return { name: d.id.name, node: init };
    }
  }
  return null;
}
