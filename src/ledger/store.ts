import { statePath } from '../paths.js';
import { mkdir, readFile } from 'node:fs/promises';
import { atomicWrite } from '../atomic-write.js';
import { dirname, join } from 'node:path';
import { UsageError } from '../errors.js';
import type { LedgerEntry } from './types.js';

export const ledgerPath = (root: string) => statePath(root, 'ledger.jsonl');
export const entryCount = (entry: LedgerEntry) => entry.count ?? 1;
export function parseLedger(text: string, path: string): LedgerEntry[] {
  const keys = new Set<string>();
  return text.split(/\r?\n/).flatMap((line, index) => {
    if (!line.trim()) return [];
    let entry: LedgerEntry;
    try { entry = JSON.parse(line) as LedgerEntry; }
    catch { throw new UsageError(`Invalid ledger JSON at ${path}:${index + 1}.`); }
    if (!entry || typeof entry !== 'object' || Array.isArray(entry) || typeof entry.key !== 'string' || !entry.key ||
        !['debt', 'exception', 'decision', 'declined'].includes(entry.kind) || entry.count !== undefined && (!Number.isSafeInteger(entry.count) || entry.count < 1) ||
        ['resolved', 'why', 'by', 'on', 'rule', 'family', 'owner', 'prop', 'authored', 'path', 'anchor', 'value', 'origin', 'tier'].some(field => field in entry && typeof entry[field as keyof LedgerEntry] !== 'string') ||
        entry.inferred !== undefined && typeof entry.inferred !== 'boolean' ||
        entry.refs !== undefined && (!Array.isArray(entry.refs) || entry.refs.some(ref => typeof ref !== 'string'))) {
      throw new UsageError(`Invalid ledger entry at ${path}:${index + 1}; require key, kind and a positive count when present.`);
    }
    if (keys.has(entry.key)) throw new UsageError(`Duplicate ledger key at ${path}:${index + 1}: ${entry.key}.`);
    keys.add(entry.key);
    return [entry];
  });
}
export async function readLedger(root: string): Promise<{ exists: boolean; entries: LedgerEntry[] }> {
  const path = ledgerPath(root);
  // A ledger that only remembers what was declined has recorded no baseline yet.
  try { const entries = parseLedger(await readFile(path, 'utf8'), path); return { exists: !entries.length || entries.some(entry => entry.kind !== 'declined'), entries }; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { exists: false, entries: [] }; throw error; }
}
export async function writeLedger(root: string, entries: LedgerEntry[]): Promise<void> {
  const path = ledgerPath(root);
  const sorted = [...entries].sort((a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
  // Validate before replacing; never silently write duplicate keys.
  const text = sorted.map(entry => JSON.stringify(entry)).join('\n') + (sorted.length ? '\n' : '');
  parseLedger(text, path);
  await mkdir(dirname(path), { recursive: true });
  await atomicWrite(path, text);
}
