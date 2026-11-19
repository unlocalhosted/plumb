// The meaning test (overlay/src/pack-tells.js): a finding whose truth depends on what words mean is kept only when a
// sentence-embedding model agrees. The model is a service the project points at with PLUMBER_MEANING_URL (an
// all-MiniLM-L6-v2 endpoint taking {texts:[{id,text}]} at /embed, answering {results:[{id,vector}]}, unit vectors).
// With none set, or when it cannot be reached, these findings are left out: plumber never guesses at meaning.
import { MEANING_CUTS, MEANING_RULES, STOCK_LINES, hasSpecific } from '../overlay/src/pack-tells.js';
import type { CraftRecord } from './craft-run.js';

type Pair = { heading: string; line: string };
const dot = (a: number[], b: number[]): number => a.reduce((s, x, i) => s + x * (b[i] ?? 0), 0);

async function embed(url: string, texts: string[]): Promise<number[][]> {
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += 32) {
    const response = await fetch(new URL('/embed', url), { method: 'POST', headers: { 'content-type': 'application/json' }, signal: AbortSignal.timeout(20000),
      body: JSON.stringify({ texts: texts.slice(i, i + 32).map((text, k) => ({ id: String(i + k), text })) }) });
    const body = await response.json() as { results?: { vector: number[] }[]; error?: string };
    if (!body.results) throw new Error(body.error ?? `the meaning service answered ${response.status}`);
    out.push(...body.results.map((r) => r.vector));
  }
  return out;
}

/** The records with the meaning findings the model does not confirm left out. */
export async function judgeMeaning(records: CraftRecord[], url = process.env.PLUMBER_MEANING_URL): Promise<CraftRecord[]> {
  const asked = records.filter((r) => MEANING_RULES.has(r.rule) && (r.evidence as { meaning?: Pair }).meaning);
  if (!asked.length) return records;
  const drop = new Set<CraftRecord>(asked.filter((r) => hasSpecific((r.evidence as { meaning: Pair }).meaning.line)));
  const open = asked.filter((r) => !drop.has(r));
  if (!url) { for (const r of open) drop.add(r); return records.filter((r) => !drop.has(r)); }
  try {
    const pairs = open.map((r) => (r.evidence as { meaning: Pair }).meaning);
    const v = await embed(url, [...STOCK_LINES, ...pairs.flatMap((p) => [p.heading, p.line])]);
    const stock = v.slice(0, STOCK_LINES.length), rest = v.slice(STOCK_LINES.length);
    open.forEach((r, i) => {
      const heading = rest[2 * i]!, line = rest[2 * i + 1]!, close = dot(heading, line), stocky = Math.max(...stock.map((s) => dot(s, line)));
      const said = close >= MEANING_CUTS.echo || (close >= MEANING_CUTS.near && stocky >= MEANING_CUTS.stock);
      if (process.env.PLUMBER_DEBUG) process.stderr.write(`meaning: ${said ? 'said' : 'kept'} ${close.toFixed(2)} ${stocky.toFixed(2)} ${pairs[i]!.heading} | ${pairs[i]!.line}\n`);
      if (said) r.evidence = { ...r.evidence, similarity: Math.round(close * 100) / 100, stock: Math.round(stocky * 100) / 100 };
      else drop.add(r);
    });
  } catch (error) {
    process.stderr.write(`plumber: the meaning service at ${url} could not be asked (${(error as Error).message}); subtitle checks were skipped.\n`);
    for (const r of open) drop.add(r);
  }
  return records.filter((r) => !drop.has(r));
}
