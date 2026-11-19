// The meaning test (overlay/src/pack-tells.js): whether the line under a heading says what the heading already says.
// The page finds the pair and asks the dev server (POST /__plumb/meaning); the server asks a sentence-embedding model
// the project points at with PLUMBER_MEANING_URL (an all-MiniLM-L6-v2 endpoint taking {texts:[{id,text}]} at /embed,
// answering {results:[{id,vector}]}, unit vectors). With none set, or when it cannot be reached, the answer is
// `off` and the page says nothing: plumber never guesses at meaning.
import { STOCK_LINES, hasSpecific, meaningSaid } from '../overlay/src/pack-tells.js';

type Pair = { heading: string; line: string };
export type MeaningAnswer = { off: true; why: string } | { off: false; said: boolean[]; similarity: number[]; stock: number[] };
const dot = (a: number[], b: number[]): number => a.reduce((s, x, i) => s + x * (b[i] ?? 0), 0);
const round = (x: number): number => Math.round(x * 100) / 100;

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

// the stock lines' vectors, asked once per service
let stockFor: { url: string; vectors: Promise<number[][]> } | null = null;
let warned = '';

/** For each pair, whether its line says what its heading says. A line with a specific in it adds a fact and is never said. */
export async function judgePairs(pairs: Pair[], url = process.env.PLUMBER_MEANING_URL): Promise<MeaningAnswer> {
  if (!url) return { off: true, why: 'PLUMBER_MEANING_URL is not set' };
  try {
    if (stockFor?.url !== url) stockFor = { url, vectors: embed(url, STOCK_LINES) };
    const stock = await stockFor.vectors.catch((error) => { stockFor = null; throw error; });
    const open = pairs.flatMap((p, i) => hasSpecific(p.line) ? [] : [i]);
    const v = await embed(url, open.flatMap((i) => [pairs[i]!.heading, pairs[i]!.line]));
    const said = pairs.map(() => false), similarity = pairs.map(() => 0), stocky = pairs.map(() => 0);
    open.forEach((i, k) => {
      const line = v[2 * k + 1]!;
      similarity[i] = round(dot(v[2 * k]!, line)); stocky[i] = round(Math.max(...stock.map((s) => dot(s, line))));
      said[i] = meaningSaid(similarity[i]!, stocky[i]!);
      if (process.env.PLUMBER_DEBUG) process.stderr.write(`meaning: ${said[i] ? 'said' : 'kept'} ${similarity[i]} ${stocky[i]} ${pairs[i]!.heading} | ${pairs[i]!.line}\n`);
    });
    warned = '';
    return { off: false, said, similarity, stock: stocky };
  } catch (error) {
    const why = (error as Error).message;
    // said once per failure, not once per question
    if (warned !== why) process.stderr.write(`plumber: the meaning service at ${url} could not be asked (${why}); subtitle checks are off.\n`);
    warned = why;
    return { off: true, why };
  }
}
