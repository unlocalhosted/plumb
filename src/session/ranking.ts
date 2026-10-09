import type { CandidateCss } from '../lower/css.js';

function split(token: string): { variants: string; base: string } {
  let depth = 0, last = -1;
  for (let i = 0; i < token.length; i++) {
    if (token[i] === '\\') { i++; continue; }
    if (token[i] === '[' || token[i] === '(') depth++;
    else if (token[i] === ']' || token[i] === ')') depth--;
    else if (token[i] === ':' && depth === 0) last = i;
  }
  return { variants: token.slice(0, last + 1), base: token.slice(last + 1) };
}
const prefix = (name: string) => name.slice(0, name.lastIndexOf('-') + 1);
function close(a: string, b: string): boolean {
  const cutoff = Math.floor(Math.max(a.length, b.length) * .34);
  if (Math.abs(a.length - b.length) > cutoff) return false;
  let row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) next[j] = Math.min(next[j - 1]! + 1, row[j]! + 1, row[j - 1]! + Number(a[i - 1] !== b[j - 1]));
    row = next;
  }
  return row[b.length]! <= cutoff;
}
/** Invalidate only rankings a changed hint could enter. The existing rule
 * still computes the ranking, including tie breaking and variant handling. */
export class RankingState {
  private hints = new Map<string, string | undefined>();
  private rankings = new Map<string, string[]>();
  update(candidates: Map<string, CandidateCss>, theme: { token: string; prefix: string }[]) {
    const next = new Map<string, string | undefined>(theme.map(h => [h.token, h.prefix]));
    for (const [token, result] of candidates) if (result.css?.trim() && !next.has(token)) next.set(token, undefined);
    const changed = [...new Set([...next.keys(), ...this.hints.keys()])].filter(token => next.has(token) !== this.hints.has(token) || next.get(token) !== this.hints.get(token));
    for (const token of this.rankings.keys()) {
      const input = split(token);
      if (changed.some(hint => {
        const parts = split(hint); if (parts.variants && parts.variants !== input.variants) return false;
        const p = next.get(hint) ?? this.hints.get(hint);
        return (p !== undefined ? !!p && input.base.startsWith(p) : !!prefix(parts.base) && prefix(input.base) === prefix(parts.base)) || close(input.base, parts.base);
      })) this.rankings.delete(token);
    }
    if (this.rankings.size > 4096) this.rankings.clear();
    this.hints = next;
    return { rankings: this.rankings, save: async () => {} };
  }
}
