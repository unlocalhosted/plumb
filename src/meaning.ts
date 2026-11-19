// The meaning test (overlay/src/pack-tells.js): whether the line under a heading says what the heading already says.
// The page finds the pair and asks the dev server (POST /__plumb/meaning); the server asks a model, and the key or the
// address stays on the server:
//  - Jev (typesafe.ai SystemOne), when PLUMBER_JEV_KEY is set: every pair is one yes/no question in a single call,
//    answered with a probability. It reads the words, so it is asked first.
//  - a sentence-embedding service at PLUMBER_MEANING_URL (all-MiniLM-L6-v2 taking {texts:[{id,text}]} at /embed,
//    answering {results:[{id,vector}]}, unit vectors), judged by closeness to the heading and to stock copy.
// With neither, or when the one asked cannot be reached, the answer is `off` and the page says nothing: plumber never
// guesses at meaning.
import { STOCK_LINES, hasSpecific, meaningSaid } from '../overlay/src/pack-tells.js';

type Pair = { heading: string; line: string };
// `model` names what judged: 'jev' (typesafe.ai) or 'minilm' (the embedding service)
export type MeaningAnswer = { off: true; why: string } | { off: false; model: 'jev' | 'minilm'; said: boolean[]; similarity: number[]; stock: number[] };
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

const JEV_URL = 'https://api.typesafe.ai/v1/systemone';
// what counts as said: a probability at or over this that the line only restates its heading. Set on the 24
// calibration pairs (bench/tells/meaning-pairs.mjs): lines that add a fact scored 0.07 at most, lines that repeat the
// heading 0.29 at least. The 24 held-out pairs: 0.17 at most and 0.37 at least, so 24 of 24 there too.
export const JEV_CUT = 0.25;
async function askJev(key: string, pairs: Pair[], url = process.env.PLUMBER_JEV_URL ?? JEV_URL): Promise<number[]> {
  const out: number[] = [];
  for (let at = 0; at < pairs.length; at += 64) {
    const part = pairs.slice(at, at + 64), state: Record<string, string> = {}, questions: Record<string, unknown> = {};
    part.forEach((p, i) => {
      state[`heading_${i}`] = p.heading; state[`line_${i}`] = p.line;
      questions[`echo_${i}`] = { type: 'noul',
        instructions: `On a page of an app, \`line_${i}\` is the line right under the heading \`heading_${i}\`. Does it only say again what the heading already tells the reader, in other words or as generic product copy, adding nothing they would act on?`,
        criteria: { true: 'It restates the heading or is generic copy that could sit under any such heading', false: 'It tells the reader something the heading does not: a fact, a limit, a consequence, a choice or a name' } };
    });
    for (let attempt = 1; ; attempt++) {
      const response = await fetch(url, { method: 'POST', signal: AbortSignal.timeout(30000),
        headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
        body: JSON.stringify({ model: 'jev-latest', state, questions }) });
      if ([429, 529].includes(response.status) && attempt < 4) { await response.body?.cancel(); await new Promise((r) => setTimeout(r, 400 * attempt)); continue; }
      const body = await response.json().catch(() => ({})) as { answers?: Record<string, { noul?: number }>; error?: unknown };
      if (!response.ok || !body.answers) throw new Error(`Jev answered ${response.status}`);
      part.forEach((_, i) => out.push(Number(body.answers![`echo_${i}`]?.noul ?? 0)));
      break;
    }
  }
  return out;
}

/** For each pair, whether its line says what its heading says. A line with a specific in it adds a fact and is never said. */
export async function judgePairs(pairs: Pair[], url = process.env.PLUMBER_MEANING_URL, jevKey = process.env.PLUMBER_JEV_KEY): Promise<MeaningAnswer> {
  if (jevKey) {
    try {
      const open = pairs.flatMap((p, i) => hasSpecific(p.line) ? [] : [i]);
      const p = await askJev(jevKey, open.map((i) => pairs[i]!));
      const said = pairs.map(() => false), similarity = pairs.map(() => 0);
      open.forEach((i, k) => {
        similarity[i] = round(p[k]!); said[i] = p[k]! >= JEV_CUT;
        if (process.env.PLUMBER_DEBUG) process.stderr.write(`meaning (jev): ${said[i] ? 'said' : 'kept'} ${similarity[i]} ${pairs[i]!.heading} | ${pairs[i]!.line}\n`);
      });
      warned = '';
      return { off: false, model: 'jev', said, similarity, stock: pairs.map(() => 0) };
    } catch (error) {
      const why = (error as Error).message;
      if (warned !== why) process.stderr.write(`plumber: Jev could not be asked (${why}); subtitle checks are off.\n`);
      warned = why;
      return { off: true, why };
    }
  }
  if (!url) return { off: true, why: 'neither PLUMBER_JEV_KEY nor PLUMBER_MEANING_URL is set' };
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
    return { off: false, model: 'minilm', said, similarity, stock: stocky };
  } catch (error) {
    const why = (error as Error).message;
    // said once per failure, not once per question
    if (warned !== why) process.stderr.write(`plumber: the meaning service at ${url} could not be asked (${why}); subtitle checks are off.\n`);
    warned = why;
    return { off: true, why };
  }
}
