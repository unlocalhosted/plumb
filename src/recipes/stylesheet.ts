/**
 * A stylesheet read just far enough to edit it in its own shape: blocks with their headers, the declarations in each
 * with their offsets, and the indentation they use. Comments and strings are skipped, so a `;` or `}` inside one
 * never ends anything.
 */
export interface Decl { name: string; value: string; custom: boolean; start: number; end: number; line: number; indent: string; block: Block }
export interface Block { header: string; open: number; close: number; depth: number; parent: Block | null; decls: Decl[]; blocks: Block[] }

export function scanStylesheet(css: string): { blocks: Block[]; decls: Decl[]; root: Block } {
  const root: Block = { header: '', open: -1, close: css.length, depth: 0, parent: null, decls: [], blocks: [] };
  const all: Block[] = [], decls: Decl[] = [];
  let current = root, segment = 0, i = 0, line = 1;
  const lineAt = (offset: number) => { let n = 1; for (let k = 0; k < offset; k++) if (css.charCodeAt(k) === 10) n++; return n; };
  void line;
  const take = (end: number, terminated: boolean) => {
    const raw = css.slice(segment, end);
    const clean = raw.replace(/\/\*[\s\S]*?\*\//g, m => ' '.repeat(m.length));
    const m = /^\s*(--[\w-]+|[a-zA-Z-]+)\s*:\s*([\s\S]*?)\s*$/.exec(clean);
    if (m && current !== root && !/^@/.test(clean.trim())) {
      const start = segment + clean.search(/\S/);
      const value = raw.slice(raw.indexOf(':', clean.search(/\S/)) + 1).replace(/\/\*[\s\S]*?\*\//g, '').trim();
      const lineStart = css.lastIndexOf('\n', start - 1) + 1;
      const decl: Decl = { name: m[1]!, value, custom: m[1]!.startsWith('--'), start, end: terminated ? end + 1 : end, line: lineAt(start), indent: /^[ \t]*$/.test(css.slice(lineStart, start)) ? css.slice(lineStart, start) : '', block: current };
      current.decls.push(decl); decls.push(decl);
    }
  };
  while (i < css.length) {
    const ch = css[i]!;
    if (ch === '/' && css[i + 1] === '*') { const end = css.indexOf('*/', i + 2); i = end < 0 ? css.length : end + 2; continue; }
    if (ch === '"' || ch === "'") { i++; while (i < css.length && css[i] !== ch) i += css[i] === '\\' ? 2 : 1; i++; continue; }
    if (ch === '(') { let depth = 1; i++; while (i < css.length && depth) { if (css[i] === '(') depth++; else if (css[i] === ')') depth--; else if (css[i] === '"' || css[i] === "'") { const q = css[i]!; i++; while (i < css.length && css[i] !== q) i++; } i++; } continue; }
    if (ch === '{') {
      const header = css.slice(segment, i).replace(/\/\*[\s\S]*?\*\//g, '').trim().replace(/\s+/g, ' ');
      const block: Block = { header, open: i, close: css.length, depth: current.depth + 1, parent: current === root ? null : current, decls: [], blocks: [] };
      current.blocks.push(block); all.push(block); current = block; segment = i + 1;
    } else if (ch === ';') { take(i, true); segment = i + 1; }
    else if (ch === '}') { take(i, false); current.close = i; current = current.parent ?? root; segment = i + 1; }
    i++;
  }
  return { blocks: all, decls, root };
}

/** The indentation of the first declaration in a block, or one step in from the block's own header. */
export function blockIndent(css: string, block: Block): string {
  const first = block.decls[0];
  if (first?.indent) return first.indent;
  const headerStart = css.lastIndexOf('\n', block.open) + 1;
  const base = /^[ \t]*/.exec(css.slice(headerStart))![0];
  return base + (base.includes('\t') ? '\t' : '  ');
}
export const isTheme = (b: Block) => /^@theme\b/.test(b.header);
