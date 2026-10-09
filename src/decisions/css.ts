import type { StylesheetGraph } from '../collect/stylesheets.js';
import { lineStarts, sourceSite } from '../collect/source.js';
import { cssImports } from '../collect/stylesheets.js';
import type { Origin, Tier } from '../report.js';

export interface CssVariable {
  name: string;
  value: string;
  theme: boolean;
  root: boolean;
  dynamic: boolean;
  origin: Origin;
  why: string;
  tier?: Tier;
  source: { file: string; line: number };
}

// Read declaration/source metadata before compilation drops comments and unused
// theme keys. Quotes, comments and balanced functions delimit CSS statements.
export function readCssVariables(graph: StylesheetGraph): CssVariable[] {
  const result: CssVariable[] = [], active = new Set<string>(), visited = new Set<string>();
  function visit(file: string): void {
    if (active.has(file) || visited.has(file)) return;
    const found = graph.files.get(file);
    if (!found) return;
    const sheet = found;
    active.add(file);
    const css = sheet.css, imports = cssImports(css);
    const source = { file, text: css, lineStarts: lineStarts(css) };
    function walk(start: number, theme: boolean, root: boolean, dynamic: boolean): number {
      let index = start;
      while (index < css.length) {
        let comment = '';
        while (index < css.length) {
          if (/\s/.test(css[index]!)) { index++; continue; }
          if (css.startsWith('/*', index)) { const end = css.indexOf('*/', index + 2); if (end < 0) return css.length; comment = css.slice(index + 2, end).trim(); index = end + 2; continue; }
          break;
        }
        if (css[index] === '}') return index + 1;
        const offset = index; let depth = 0, quote = '';
        while (index < css.length) {
          const char = css[index]!;
          if (char === '\\') { index += 2; continue; }
          if (quote) { if (char === quote) quote = ''; index++; continue; }
          if (char === '"' || char === "'") { quote = char; index++; continue; }
          if (css.startsWith('/*', index)) { const end = css.indexOf('*/', index + 2); index = end < 0 ? css.length : end + 2; continue; }
          if (char === '(' || char === '[') depth++;
          if (char === ')' || char === ']') depth--;
          if (!depth && '{};'.includes(char)) break;
          index++;
        }
        const text = css.slice(offset, index).trim(), delimiter = css[index];
        if (delimiter === '{') {
          const isTheme = /^@theme\b/.test(text);
          const isRoot = !text.startsWith('@') && /(?:^|,)\s*(?::root|html)\s*(?:,|$)/.test(text);
          index = walk(index + 1, theme || isTheme, isRoot || (root && text === '&'), dynamic || /^@(media|container|supports)\b/.test(text));
          continue;
        }
        if (/^@(import|reference)\b/.test(text)) {
          // Graph edge order matches authored local imports, including equal tails.
          const position = imports.findIndex(item => item.start === offset);
          if (position >= 0) {
            const local = imports.slice(0, position + 1).filter(item => !/^(?:[a-z]+:|\/\/|#)/i.test(item.id)).length - 1;
            const target = sheet.imports[local]?.file;
            if (target) visit(target);
          }
        }
        const match = /^(--[\w*-]+)\s*:\s*([\s\S]+)$/.exec(text);
        if (match) {
          const tier = /\btier:\s*(primitive|semantic)\b/.exec(comment)?.[1] as Tier | undefined;
          result.push({ name: match[1]!, value: match[2]!.replace(/\s*!important$/, '').trim(), theme, root, dynamic,
            origin: sheet.sourceOrigin, why: comment.startsWith('why:') ? comment.slice(4).replace(/\s*tier:\s*(primitive|semantic)\b/, '').trim() : '',
            ...(tier ? { tier } : {}), source: { file, line: sourceSite(source, offset, '').line } });
        }
        if (delimiter === '}') return index + 1;
        index++;
      }
      return index;
    }
    walk(0, false, false, false);
    active.delete(file); visited.add(file);
  }
  for (const file of graph.roots) visit(file);
  for (const file of graph.files.keys()) visit(file);
  return result;
}
