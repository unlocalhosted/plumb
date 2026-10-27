import { UsageError } from '../errors.js';
import { author } from '../ledger/git.js';
import { readLedger, writeLedger } from '../ledger/store.js';
import { canonical, measures } from './harvest.js';
import type { Measure } from './harvest.js';

/**
 * A value the person says is not a token. It is written to the ledger as `declined`, so the proposal
 * never offers it again (docs/briefs/onboarding.md section 2.3, "Reviewable").
 */
export async function declineValues(root: string, inputs: string[]): Promise<string> {
  const ledger = await readLedger(root);
  const entries = new Map(ledger.entries.map(entry => [entry.key, entry]));
  const by = author(root), stamp = { on: new Date().toISOString().slice(0, 10), ...(by ? { by } : {}) };
  const lines: string[] = [];
  for (const input of inputs) {
    const at = input.indexOf('=');
    const measure = (at < 0 ? '' : input.slice(0, at)) as Measure, value = at < 0 ? '' : input.slice(at + 1).trim();
    if (!measures.includes(measure) || !value) throw new UsageError(`--decline ${input}: use a scale and a value, like spacing=13px.\n  Scales: ${measures.join(', ')}.\n  → plumber propose --decline spacing=13px`);
    const key = canonical(measure, value);
    if (key === undefined) throw new UsageError(`--decline ${input}: ${value} is not a ${measure} value.\n  → plumber propose --decline ${measure}=<value>`);
    const name = `declined:${measure}:${key}`;
    if (entries.has(name)) { lines.push(`${measure} ${value} was already declined.`); continue; }
    entries.set(name, { key: name, kind: 'declined', family: measure, value, ...stamp });
    lines.push(`Declined ${measure} ${value}. It won't be proposed again.`);
  }
  await writeLedger(root, [...entries.values()]);
  return lines.join('\n') + '\n';
}
