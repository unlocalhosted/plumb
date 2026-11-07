/**
 * LEDGER STORE · the ledger file as several processes and several builds share it (docs/invariants/api-contract.md §3).
 *
 * Read: every line is checked; one that is not JSON, not an entry, of a kind this build does not know, a duplicate key
 * (the first is kept) or a newer `v` is skipped and counted, never thrown on. Write: under the file's lock, from a read
 * made under that lock; the skipped lines are written back verbatim, first, so a newer build's entries and a merge
 * conflict's markers survive this build and reach a person. A writer that read the ledger earlier passes the hash it
 * read, and a ledger changed since is refused, never overwritten.
 */
import { statePath } from '../paths.js';
import { createHash } from 'node:crypto';
import { mkdir, readFile } from 'node:fs/promises';
import { atomicWrite } from '../atomic-write.js';
import { dirname } from 'node:path';
import { UsageError } from '../errors.js';
import { lock } from '../write/lock.js';
import type { LedgerEntry } from './types.js';

export const ledgerPath = (root: string) => statePath(root, 'ledger.jsonl');
export const entryCount = (entry: LedgerEntry) => entry.count ?? 1;
/** The entry shape version written on every line; a line of a newer version is skipped and kept. */
export const LEDGER_VERSION = 1;
const kinds = ['debt', 'exception', 'decision', 'declined'];
const strings = ['resolved', 'why', 'by', 'on', 'rule', 'family', 'owner', 'prop', 'authored', 'path', 'anchor', 'value', 'origin', 'tier'];

/** The ledger as read: its entries, the lines skipped (with why, for the report) and kept verbatim, and the hash of the text read. */
export interface Ledger { exists: boolean; entries: LedgerEntry[]; skipped: number; kept: string[]; notes: string[]; hash: string }

/** Why a parsed line is not an entry this build can act on, or undefined when it is. */
function problem(entry: unknown): string | undefined {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return 'not a ledger entry';
  const e = entry as Record<string, unknown>;
  if (e.v !== undefined && (!Number.isSafeInteger(e.v) || (e.v as number) < 1)) return 'not a ledger entry';
  if (typeof e.v === 'number' && e.v > LEDGER_VERSION) return `written by a newer React Plumber (v${e.v})`;
  if (typeof e.key !== 'string' || !e.key) return 'no key';
  if (typeof e.kind !== 'string' || !kinds.includes(e.kind)) return `a kind this build does not know (${String(e.kind)})`;
  if (e.count !== undefined && (!Number.isSafeInteger(e.count) || (e.count as number) < 1)) return 'count is not a positive integer';
  if (strings.some(field => field in e && typeof e[field] !== 'string')) return 'a field that is not text';
  if (e.inferred !== undefined && typeof e.inferred !== 'boolean') return 'inferred is not true or false';
  if (e.refs !== undefined && (!Array.isArray(e.refs) || e.refs.some(ref => typeof ref !== 'string'))) return 'refs is not a list of text';
  return undefined;
}
/** Every line, checked: entries, and the lines skipped with their reasons. Never throws on a line. */
export function readLedgerText(text: string, path: string): Pick<Ledger, 'entries' | 'skipped' | 'kept' | 'notes'> {
  const keys = new Set<string>(), entries: LedgerEntry[] = [], kept: string[] = [], notes: string[] = [];
  text.split(/\r?\n/).forEach((line, index) => {
    if (!line.trim()) return;
    const skip = (why: string) => { kept.push(line); notes.push(`${path}:${index + 1} skipped: ${why}.`); };
    let parsed: unknown;
    try { parsed = JSON.parse(line); } catch { skip('not JSON'); return; }
    const why = problem(parsed);
    if (why) { skip(why); return; }
    const entry = parsed as LedgerEntry;
    if (keys.has(entry.key)) { skip(`duplicate key ${entry.key}`); return; }
    keys.add(entry.key); entries.push(entry);
  });
  return { entries, skipped: kept.length, kept, notes };
}
/** Strict: the text this build is about to write must be entries only, no duplicates. */
export function parseLedger(text: string, path: string): LedgerEntry[] {
  const keys = new Set<string>();
  return text.split(/\r?\n/).flatMap((line, index) => {
    if (!line.trim()) return [];
    let entry: unknown;
    try { entry = JSON.parse(line); }
    catch { throw new UsageError(`Invalid ledger JSON at ${path}:${index + 1}.`); }
    const why = problem(entry);
    if (why) throw new UsageError(`Invalid ledger entry at ${path}:${index + 1}; require key, kind and a positive count when present.`);
    if (keys.has((entry as LedgerEntry).key)) throw new UsageError(`Duplicate ledger key at ${path}:${index + 1}: ${(entry as LedgerEntry).key}.`);
    keys.add((entry as LedgerEntry).key);
    return [entry as LedgerEntry];
  });
}
const hashOf = (text: string) => createHash('sha256').update(text).digest('hex');
async function readRaw(path: string): Promise<Ledger> {
  let text: string | undefined;
  try { text = await readFile(path, 'utf8'); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  if (text === undefined) return { exists: false, entries: [], skipped: 0, kept: [], notes: [], hash: hashOf('') };
  const read = readLedgerText(text, path);
  // A ledger that only remembers what was declined has recorded no baseline yet.
  return { exists: !read.entries.length || read.entries.some(entry => entry.kind !== 'declined'), ...read, hash: hashOf(text) };
}
export async function readLedger(root: string): Promise<Ledger> { return readRaw(ledgerPath(root)); }

/** The file's text: the kept lines first, then the entries sorted by key, each stamped with this build's version. */
function ledgerText(kept: string[], entries: LedgerEntry[], path: string): string {
  const sorted = [...entries].sort((a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0).map(({ v: _v, ...entry }) => ({ v: LEDGER_VERSION, ...entry }));
  const text = sorted.map(entry => JSON.stringify(entry)).join('\n') + (sorted.length ? '\n' : '');
  // Validate before replacing; never silently write duplicate keys.
  parseLedger(text, path);
  return kept.map(line => line + '\n').join('') + text;
}
async function publish(path: string, kept: string[], entries: LedgerEntry[]): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await atomicWrite(path, ledgerText(kept, entries, path));
}
/** Replace the entries, under the lock. A writer that read the ledger earlier passes the `hash` it read: a ledger that
 * changed since is refused (`stale-file`), never overwritten. The lines the read skipped are kept verbatim. */
export async function writeLedger(root: string, entries: LedgerEntry[], options: { expect?: string } = {}): Promise<void> {
  const path = ledgerPath(root);
  await lock(path, async () => {
    const current = await readRaw(path);
    if (options.expect !== undefined && current.hash !== options.expect) throw new UsageError('The ledger changed while this ran. Read it again and retry.', 'stale-file');
    await publish(path, current.kept, entries);
  });
}
/** One read-modify-write under the lock: what `change` returns replaces the entries it was given, and nothing another
 * process wrote in between is lost. */
export async function updateLedger(root: string, change: (ledger: Ledger) => Promise<LedgerEntry[]> | LedgerEntry[]): Promise<LedgerEntry[]> {
  const path = ledgerPath(root);
  return lock(path, async () => {
    const current = await readRaw(path);
    const entries = await change(current);
    await publish(path, current.kept, entries);
    return entries;
  });
}
