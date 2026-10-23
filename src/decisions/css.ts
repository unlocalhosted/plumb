import type { StylesheetGraph } from '../collect/stylesheets.js';
import { lineStarts, sourceSite } from '../collect/source.js';
import { cssImports } from '../collect/stylesheets.js';
import type { Origin, Site, Tier } from '../report.js';

export interface CssVariable {
  name: string;
  value: string;
  theme: boolean;
  inline?: boolean;
  dark?: boolean;
  root: boolean;
  themeScope: boolean;
  /** Declared in a block that also styles something: a component's variable, not a theme token. */
  styled?: boolean;
  dynamic: boolean;
  origin: Origin;
  why: string;
  trailingWhy: string;
  tier?: Tier;
  source: { file: string; line: number };
  site: Site;
}

// Theme selectors share one scope model. Conditional/layer wrappers retain it;
// a nested selector must itself be a theme selector or refer to its parent.
function themeScopeFor(selector: string, parent: boolean): boolean {
  if (selector.startsWith('@')) return /^@(media|supports|container|layer)\b/.test(selector) && parent;
  return parent && selector.includes('&') || /(?:^|[\s,>+~])(?::root\b|html\b|\.[\w-]+|\[\s*data-theme\b)/.test(selector);
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
    function walk(start: number, theme: boolean, root: boolean, dynamic: boolean, themeScope: boolean, inline = false, dark = false): number {
      let index = start;
      // Variables declared directly in this block, and whether the block also styles anything.
      const own: CssVariable[] = []; let styles = false;
      const close = (at: number) => { if (styles) for (const item of own) item.styled = true; return at; };
      while (index < css.length) {
        let comment = '';
        while (index < css.length) {
          if (/\s/.test(css[index]!)) { index++; continue; }
          if (css.startsWith('/*', index)) { const end = css.indexOf('*/', index + 2); if (end < 0) return css.length; comment = css.slice(index + 2, end).trim(); index = end + 2; continue; }
          break;
        }
        if (css[index] === '}') return close(index + 1);
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
          index = walk(index + 1, theme || isTheme, isRoot || (root && text === '&'), dynamic || /^@(media|container|supports)\b/.test(text), themeScopeFor(text, themeScope),
            inline || isTheme && /\binline\b/.test(text), /^\.dark$/.test(text) || dark && (text === '&' || text.startsWith('@')));
          continue;
        }
        if (/^@(import|reference)\b/.test(text)) {
          // Failed imports have no graph edge; match the authored specifier.
          const position = imports.findIndex(item => item.start === offset);
          if (position >= 0) {
            const target = sheet.imports.find(item => item.specifier === imports[position]!.id)?.file;
            if (target) visit(target);
          }
        }
        const match = /^(--[\w*-]+)\s*:\s*([\s\S]+)$/.exec(text);
        if (match) {
          const tier = /\btier:\s*(primitive|semantic)\b/.exec(comment)?.[1] as Tier | undefined;
          const trailingWhy = delimiter === ';' ? /^[\t ]*\/\*([^\r\n]*?)\*\//.exec(css.slice(index + 1))?.[1]?.trim() ?? '' : '';
          result.push({ name: match[1]!, value: match[2]!.replace(/\s*!important$/, '').trim(), theme, inline, dark, root, dynamic, themeScope, trailingWhy,
            origin: sheet.sourceOrigin, why: comment.startsWith('why:') ? comment.slice(4).replace(/\s*tier:\s*(primitive|semantic)\b/, '').trim() : '',
            ...(tier ? { tier } : {}), source: { file, line: sourceSite(source, offset, '').line }, site: sourceSite(source, offset, text) });
          own.push(result.at(-1)!);
        } else if (/^[a-z][\w-]*\s*:/i.test(text)) styles = true;
        if (delimiter === '}') return close(index + 1);
        index++;
      }
      return close(index);
    }
    walk(0, false, false, false, false);
    active.delete(file); visited.add(file);
  }
  for (const file of graph.roots) visit(file);
  for (const file of graph.files.keys()) visit(file);
  return result;
}
