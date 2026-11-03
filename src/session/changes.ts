/**
 * CHANGES · one record per atomic edit a write made, so any one change can be read back and undone on its own.
 *
 * A write is recorded as the file before and after (engine.ts record()); this module diffs the two at word level
 * (whitespace, quotes, braces and `=` split words, so each class in a className is its own word) and keeps each run
 * of changed words as a change: where it is, what it was, what it became, and the text on either side, so it can be
 * found again after later writes move it. An undo writes the inverse at the place the change is found now; a place
 * that no longer holds what the change wrote is refused, never guessed. The log is JSON lines under .plumber/cache.
 */
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { lineStarts } from '../collect/source.js';

export interface ChangeRecord {
  id: string; at: string;
  /** every change written by one call shares a group (a caller may name it, so several calls form one step) */
  group: string;
  /** the file-level write that made it (engine history), unique across sessions */
  write: string;
  file: string; line: number; column: number;
  from: string; to: string;
  /** the text just before and after the change as written, to find it again */
  prefix: string; suffix: string;
  label: string;
  /** whatever the caller passed with the write: layer, rule, law, element */
  meta?: unknown;
  /** the changes this one took back */
  undoes?: string[];
}
export type ChangeState = 'live' | 'undone' | 'changed';
export interface TraceEntry extends Omit<ChangeRecord, 'prefix' | 'suffix' | 'write'> { state: ChangeState; /** changed: later changes at the same place, when known */ by?: string[]; /** undone: the change that took it back */ undoneBy?: string }

const CONTEXT = 32;
const LIMIT = 2000;
const CELLS = 4_000_000;
const words = (text: string) => text.match(/\s+|[^\s"'`{}<>=]+|[\s\S]/g) ?? [];

/** The runs of changed words between two texts, with their offsets in each. A diff too large to align is one run. */
export function hunks(before: string, after: string): { start: number; end: number; at: number; from: string; to: string }[] {
  const a = words(before), b = words(after);
  let head = 0; while (head < a.length && head < b.length && a[head] === b[head]) head++;
  let tail = 0; while (tail < a.length - head && tail < b.length - head && a[a.length - 1 - tail] === b[b.length - 1 - tail]) tail++;
  const offsets = (list: string[]) => { const out = [0]; for (const w of list) out.push(out.at(-1)! + w.length); return out; };
  const oa = offsets(a), ob = offsets(b);
  const n = a.length - head - tail, m = b.length - head - tail;
  if (!n && !m) return [];
  const run = (i0: number, i1: number, j0: number, j1: number) => ({ start: oa[i0]!, end: oa[i1]!, at: ob[j0]!, from: before.slice(oa[i0]!, oa[i1]!), to: after.slice(ob[j0]!, ob[j1]!) });
  if ((n + 1) * (m + 1) > CELLS) return [run(head, head + n, head, head + m)];
  // longest common subsequence of the middle words, then walk it: each gap between matches is one change
  const w = m + 1, table = new Int32Array((n + 1) * w);
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
    table[i * w + j] = a[head + i] === b[head + j] ? table[(i + 1) * w + j + 1]! + 1 : Math.max(table[(i + 1) * w + j]!, table[i * w + j + 1]!);
  const out: ReturnType<typeof hunks> = [];
  let i = 0, j = 0, si = -1, sj = -1;
  const close = () => { if (si >= 0) { out.push(run(head + si, head + i, head + sj, head + j)); si = sj = -1; } };
  while (i < n || j < m) {
    if (i < n && j < m && a[head + i] === b[head + j]) { close(); i++; j++; continue; }
    if (si < 0) { si = i; sj = j; }
    if (j >= m || (i < n && table[(i + 1) * w + j]! >= table[i * w + j + 1]!)) i++; else j++;
  }
  close();
  return out;
}

/** An inserted block split into one hunk per line, so each line (a theme token) is a change of its own: a line that is
 * only a comment or blank goes with the line after it (a role's comment with its first token). Other hunks stay whole. */
export function byLine(list: ReturnType<typeof hunks>): ReturnType<typeof hunks> {
  return list.flatMap(h => {
    if (h.from || !h.to.includes('\n')) return [h];
    // the diff may put the block's newline first ("\n  --a: 1;\n  --b: 2;") or last ("  --a: 1;\n  --b: 2;\n")
    const leading = h.to.startsWith('\n');
    const pieces = leading ? h.to.split(/(?=\n)/) : h.to.split(/(?<=\n)/);
    const merged: string[] = [];
    let carry = '';
    for (const piece of pieces) {
      const content = piece.replace(/\/\*[\s\S]*?\*\//g, '').trim();
      if (!content) { carry += piece; continue; }
      merged.push(carry + piece); carry = '';
    }
    if (carry) { if (merged.length) merged[merged.length - 1] += carry; else merged.push(carry); }
    if (merged.length < 2) return [h];
    let offset = 0;
    return merged.map(to => { const piece = { start: h.start, end: h.end, at: h.at + offset, from: '', to }; offset += to.length; return piece; });
  });
}

/** Where a change is now: its offset in the text, or null when the place no longer holds what it wrote. Only the full
 * context on both sides may be found anywhere (lines above may have moved it); a narrower match counts only on the
 * change's own line, because `className="mt-2 font-re` is just as true of the next element down. Nearest to where it
 * was written wins. A place that can't be found this way is refused, never guessed. */
export function locate(text: string, change: Pick<ChangeRecord, 'line' | 'column' | 'to' | 'prefix' | 'suffix'>): number | null {
  const starts = lineStarts(text), expected = (starts[change.line - 1] ?? text.length) + change.column - 1;
  const lineOf = (offset: number) => { let lo = 0, hi = starts.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid]! <= offset) lo = mid; else hi = mid - 1; } return lo + 1; };
  const all = (needle: string, skip: number) => { const found: number[] = []; for (let k = text.indexOf(needle); k >= 0; k = text.indexOf(needle, k + 1)) found.push(k + skip); return found; };
  const nearest = (found: number[]) => found.length ? found.reduce((best, k) => Math.abs(k - expected) < Math.abs(best - expected) ? k : best) : null;
  const here = (found: number[]) => found.filter(k => lineOf(k) === change.line);
  for (const width of [CONTEXT, 16, 8]) {
    const p = change.prefix.slice(-width), s = change.suffix.slice(0, width), both = all(p + change.to + s, p.length);
    const found = nearest(width === CONTEXT ? both : here(both));
    if (found !== null) return found;
    if (!change.to) continue;
    const one = nearest(here([...(p ? all(p + change.to, p.length) : []), ...(s ? all(change.to + s, 0) : [])]));
    if (one !== null) return one;
  }
  return change.to ? nearest(here(all(change.to, 0))) : null;
}

/** The log: read once, appended per write, rewritten only to drop records or keep it under its limit. */
export class ChangeLog {
  private records: ChangeRecord[] | undefined;
  private next = 0;
  private groups = 0;
  constructor(private path: string) {}
  all(): ChangeRecord[] {
    if (this.records) return this.records;
    let lines: string[] = [];
    try { lines = readFileSync(this.path, 'utf8').split('\n').filter(Boolean); } catch { /* no log yet */ }
    this.records = lines.flatMap(line => { try { return [JSON.parse(line) as ChangeRecord]; } catch { return []; } });
    for (const r of this.records) { this.next = Math.max(this.next, Number(r.id.slice(1)) || 0); this.groups = Math.max(this.groups, Number(/^g(\d+)$/.exec(r.group)?.[1]) || 0); }
    return this.records;
  }
  group(): string { this.all(); return `g${++this.groups}`; }
  /** Record a write's changes: the diff of the file before and after it. */
  add(write: { write: string; file: string; group: string; meta?: unknown; undoing?: ChangeRecord[] }, before: string, after: string, label: (from: string, to: string) => string, split: (list: ReturnType<typeof hunks>) => ReturnType<typeof hunks> = list => list): ChangeRecord[] {
    const records = this.all(), at = new Date().toISOString(), starts = lineStarts(after);
    const made = split(hunks(before, after)).map(h => {
      let line = 1; while (line < starts.length && starts[line]! <= h.at) line++;
      const undoes = write.undoing?.filter(o => o.to === h.from && o.from === h.to).map(o => o.id);
      return {
        id: `c${++this.next}`, at, group: write.group, write: write.write, file: write.file, line, column: h.at - starts[line - 1]! + 1,
        from: h.from, to: h.to, prefix: after.slice(Math.max(0, h.at - CONTEXT), h.at), suffix: after.slice(h.at + h.to.length, h.at + h.to.length + CONTEXT),
        label: label(h.from, h.to), ...(write.meta === undefined ? {} : { meta: write.meta }),
        ...(write.undoing ? { undoes: undoes?.length ? undoes : write.undoing.map(o => o.id) } : {}),
      } satisfies ChangeRecord;
    });
    if (!made.length) return made;
    records.push(...made);
    mkdirSync(dirname(this.path), { recursive: true });
    if (records.length > LIMIT) { records.splice(0, records.length - LIMIT); this.save(); }
    else appendFileSync(this.path, made.map(r => JSON.stringify(r) + '\n').join(''));
    return made;
  }
  /** Forget the changes of writes that were taken back whole (a file-level undo, a rolled-back group). */
  drop(writes: Set<string>): void {
    const records = this.all(), kept = records.filter(r => !writes.has(r.write));
    if (kept.length === records.length) return;
    this.records = kept; this.save();
  }
  private save(): void { mkdirSync(dirname(this.path), { recursive: true }); writeFileSync(this.path, this.records!.map(r => JSON.stringify(r) + '\n').join('')); }

  /** Every change, newest first, with its state against the files as they are now. */
  trace(read: (file: string) => string | undefined): TraceEntry[] {
    const records = this.all(), states = new Map<string, TraceEntry>();
    for (let k = records.length - 1; k >= 0; k--) {
      const r = records[k]!;
      // a change is undone when a later undo of it still stands; that undo's state is already known (newer first)
      const undoneBy = records.slice(k + 1).find(u => u.undoes?.includes(r.id) && states.get(u.id)?.state !== 'undone');
      const { prefix: _p, suffix: _s, write: _w, ...shown } = r;
      if (undoneBy) { states.set(r.id, { ...shown, state: 'undone', undoneBy: undoneBy.id }); continue; }
      const text = read(r.file);
      if (text !== undefined && locate(text, r) !== null) { states.set(r.id, { ...shown, state: 'live' }); continue; }
      const by = records.slice(k + 1).filter(l => l.file === r.file && !l.undoes?.includes(r.id) && (Math.abs(l.line - r.line) <= 1 || (r.to && l.from.includes(r.to)))).map(l => l.id);
      states.set(r.id, { ...shown, state: 'changed', ...(by.length ? { by } : {}) });
    }
    return records.toReversed().map(r => states.get(r.id)!);
  }
}
