/**
 * CSS RULES · the declarations of a plain stylesheet, each with its rule's selector and its exact place, so a value
 * can be changed where the rule writes it.
 *
 * Pure over text. A tolerant scan, not a full parser: comments, strings and parentheses are skipped, rules nest
 * (`@media`, `@supports`, CSS nesting), and a declaration is `prop: value` ended by `;` or the block's `}`. What it
 * cannot read is left out, never guessed; the write that uses it checks the stylesheet still parses as before.
 */

export interface RuleDeclaration {
  /** the rule's selector list as written, whitespace collapsed */
  selector: string;
  prop: string;
  value: string;
  /** the value's range in the text (no surrounding space, `!important` kept) */
  start: number; end: number;
  /** inside an at-rule (`@media`, `@supports`, …): it applies only under a condition */
  conditional: boolean;
}

const squash = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').trim();
/** The selectors of a list, each with its whitespace collapsed: `.a, .b > .c` → [`.a`, `.b > .c`]. */
export function selectorsOf(list: string): string[] {
  const out: string[] = []; let depth = 0, from = 0;
  for (let i = 0; i < list.length; i++) {
    const c = list[i];
    if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth--;
    else if (c === ',' && depth === 0) { out.push(squash(list.slice(from, i))); from = i + 1; }
  }
  out.push(squash(list.slice(from)));
  return out.filter(Boolean);
}

export function declarations(text: string): RuleDeclaration[] {
  const out: RuleDeclaration[] = [];
  const stack: { prelude: string }[] = [];
  let seg = 0, paren = 0;
  const top = () => stack[stack.length - 1];
  const close = (i: number) => {
    const owner = top();
    if (!owner || owner.prelude.startsWith('@')) return;
    const raw = text.slice(seg, i), colon = raw.indexOf(':');
    if (colon < 0) return;
    const prop = raw.slice(0, colon).replace(/\/\*[\s\S]*?\*\//g, '').trim().toLowerCase();
    if (!/^-{0,2}[a-z][a-z0-9-]*$/.test(prop)) return;
    let start = seg + colon + 1, end = i;
    while (start < end && /\s/.test(text[start]!)) start++;
    while (end > start && /\s/.test(text[end - 1]!)) end--;
    if (end <= start) return;
    out.push({ selector: squash(owner.prelude), prop, value: text.slice(start, end), start, end, conditional: stack.slice(0, -1).some(s => s.prelude.startsWith('@')) });
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (c === '/' && text[i + 1] === '*') { const e = text.indexOf('*/', i + 2); i = e < 0 ? text.length : e + 1; continue; }
    if (c === '"' || c === "'") { let j = i + 1; while (j < text.length && text[j] !== c) { if (text[j] === '\\') j++; j++; } i = j; continue; }
    if (c === '(') { paren++; continue; }
    if (c === ')') { if (paren) paren--; continue; }
    if (paren) continue;
    if (c === '{') { stack.push({ prelude: text.slice(seg, i).trim() }); seg = i + 1; }
    else if (c === ';') { close(i); seg = i + 1; }
    else if (c === '}') { close(i); stack.pop(); seg = i + 1; }
  }
  return out;
}

/**
 * The declaration that sets `prop` for `selector` with no condition: the last one in the file, as the cascade takes it.
 * A rule whose list holds the selector among others (`.a, .b { … }`) counts: changing it changes both, and the answer
 * says so with its `selector`.
 */
export function findDeclaration(text: string, selector: string, prop: string): RuleDeclaration | null {
  const want = squash(selector), name = prop.trim().toLowerCase();
  const hits = declarations(text).filter(d => d.prop === name && !d.conditional && selectorsOf(d.selector).includes(want));
  return hits[hits.length - 1] ?? null;
}

/** The last declaration of the unconditional rule for `selector`, where a new declaration goes; null when there is none. */
export function lastDeclaration(text: string, selector: string): RuleDeclaration | null {
  const want = squash(selector);
  const hits = declarations(text).filter(d => !d.conditional && selectorsOf(d.selector).includes(want));
  return hits[hits.length - 1] ?? null;
}

/** A value that may stand in a declaration: no way out of it (`;`, braces, a comment), nothing fetched, not empty. */
export function plainValue(value: string): boolean {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 200 && !/[;{}<>]|\/\*|\*\/|url\(|@import|expression\(/i.test(value);
}
