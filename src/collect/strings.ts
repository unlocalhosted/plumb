/**
 * The strings the analysis keeps, one copy of each (docs/briefs/analysis-memory.md, "Where data-oriented design would
 * pay"). Names, tags, specifiers and values come out of the parser as pieces of the file's text, and in V8 a kept piece
 * keeps the whole text alive: on a 3,600-file app that pinned about 150 MB of source. Whatever is kept past one parse
 * goes through `intern`, which stores its own copy once and hands the same string to every later caller.
 *
 * The table lives as long as the process and only grows by distinct strings, which a codebase has few of (about
 * 100,000 on algorecall); a name that disappears from the code stays in it.
 */
const table = new Map<string, string>();

export function intern(text: string): string {
  let kept = table.get(text);
  if (kept === undefined) { kept = (' ' + text).slice(1); table.set(kept, kept); }
  return kept;
}

/** `intern` for every string in a structure of plain objects, arrays and map values, in place. */
export function internAll(value: unknown): void {
  const seen = new Set<object>();
  const visit = (item: unknown): void => {
    if (!item || typeof item !== 'object' || seen.has(item)) return;
    seen.add(item);
    if (Array.isArray(item)) { for (let i = 0; i < item.length; i++) { const v: unknown = item[i]; if (typeof v === 'string') item[i] = intern(v); else visit(v); } return; }
    if (item instanceof Map) { for (const [k, v] of item) { if (typeof v === 'string') item.set(k, intern(v)); else visit(v); } return; }
    if (item instanceof Set) return;
    const record = item as Record<string, unknown>;
    for (const key of Object.keys(record)) { const v = record[key]; if (typeof v === 'string') record[key] = intern(v); else visit(v); }
  };
  visit(value);
}
