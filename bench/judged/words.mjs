// The meant side of "what is loud" (docs/briefs/shape-engine.md, section 17): which words on a screen matter most.
// A page cannot say that about itself, so a model reads them. Runs in the bench server only: the key never reaches
// the page.
//
//   matters(pieces)  pieces: [{ id, text }], the blocks of text on the first screen in reading order
//                  → { roles: { [id]: 'main' | 'supports' | 'minor' }, why, model, cached, cost }
//                    'main'      the one piece that tells a first-time visitor the most about what this page is for
//                    'supports'  says something of substance about it
//                    'minor'     a label, a menu item, a date, a credit: words that carry no message of their own
//                  → { error } when no key is set, the model declines, or the call fails
//
// The model is given the words and their order and nothing about how they are drawn: no sizes, weights or colours.
// The seen side and the meant side have to be read apart, or the comparison between them means nothing.
//
// Every answer is kept on disk by the hash of what was asked (`.words/`, not in git), so a page is paid for once.
// Each paid call is appended to `.words/spend.jsonl` with its tokens and its cost.
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const MODEL = 'claude-opus-5-5';
const PRICE = { in: 4, out: 20 }; // dollars per million tokens, Claude Opus 5.5 (read from the price list 2026-11-03)
const ASKED = 2;                  // raise when the question below changes, so old answers are not reused
// A ceiling on what this may ever spend, in dollars. At the ceiling it stops asking and says so. A page costs about
// two cents. Raise it on purpose with PLUMBER_WORDS_BUDGET.
const CEILING = Number(process.env.PLUMBER_WORDS_BUDGET ?? 2);
const MOST = 60, LONGEST = 400;   // blocks per screen, letters per block: a bound on the size of any one question
const kept = join(dirname(fileURLToPath(import.meta.url)), '.words');

const Answer = z.object({
  roles: z.array(z.object({ id: z.number(), role: z.enum(['main', 'supports', 'minor']) })),
  why: z.string(),
});

const SYSTEM = `You are reading the words on the first screen of a web page, the way a first-time visitor would, to say which of them carry the page's message.

You get each block of text with a number, in reading order. You are told nothing about how the page looks, and you should not guess at it: judge only what the words say.

Give every block one role:
- "main": the single block that tells a visitor the most about what this page is for. On a personal site that is usually the sentence saying what the person does or makes, not their name. A name, a logo's words or a greeting says who or hello, and tells a stranger nothing yet. Exactly one block is "main".
- "supports": a block that says something of substance about the page's subject.
- "minor": a label, a menu item, a date, a count, a credit, a button's word, or any block that carries no message of its own.

Then say in one plain sentence why the block you chose is the main one. Write it for a designer, with no reference to block numbers.`;

// the name an answer is kept under: the model, the question and every word asked about
export function keyOf(pieces) {
  const asked = pieces.map((p) => `[${p.id}] ${p.text}`).join('\n');
  // Numbers are left out of the name. A clock or a counter on the page changes every second, and a screen whose
  // only change is a number would otherwise be paid for again on every look.
  return { asked, file: join(kept, `${createHash('sha256').update(`${MODEL}\n${ASKED}\n${asked.replace(/\d+/g, '0')}`).digest('hex').slice(0, 32)}.json`) };
}

export async function matters(given, { only } = {}) {
  if (!Array.isArray(given) || !given.length) return { error: 'nothing-to-read' };
  const pieces = given.slice(0, MOST).map((p) => ({ id: Number(p.id), text: String(p.text ?? '').replace(/\s+/g, ' ').trim().slice(0, LONGEST) })).filter((p) => p.text && Number.isFinite(p.id));
  const { asked, file } = keyOf(pieces), key = file.slice(-37, -5);
  if (existsSync(file)) return { ...JSON.parse(readFileSync(file, 'utf8')), cached: true };
  // asked only for what is already paid for
  if (only === 'kept') return { error: 'not-read' };
  if (spent().dollars >= CEILING) return { error: 'ceiling' };
  let client;
  try { client = new Anthropic(); } catch { return { error: 'no-key' }; }
  let response;
  try {
    response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      // a declined request is retried on the model Anthropic recommends, inside the same call
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      thinking: { type: 'adaptive' },
      output_config: { effort: 'medium', format: zodOutputFormat(Answer) },
      system: SYSTEM,
      messages: [{ role: 'user', content: `The blocks of text on the first screen, in reading order:\n\n${asked}` }],
    });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) return { error: 'no-key' };
    if (error instanceof Anthropic.RateLimitError) return { error: 'busy' };
    if (error instanceof Anthropic.APIError) return { error: `api ${error.status}` };
    // no credential at all surfaces before any request is sent
    return { error: /api.?key|auth|credential/i.test(String(error?.message)) ? 'no-key' : 'failed' };
  }
  const cost = (response.usage.input_tokens * PRICE.in + response.usage.output_tokens * PRICE.out) / 1e6;
  mkdirSync(kept, { recursive: true });
  appendFileSync(join(kept, 'spend.jsonl'), `${JSON.stringify({ at: new Date().toISOString(), model: response.model, key, in: response.usage.input_tokens, out: response.usage.output_tokens, dollars: Math.round(cost * 1e5) / 1e5, stop: response.stop_reason })}\n`);
  if (response.stop_reason === 'refusal') return { error: 'declined' };
  if (response.stop_reason === 'max_tokens') return { error: 'cut-short' };
  const text = response.content.find((b) => b.type === 'text')?.text;
  let parsed; try { parsed = Answer.parse(JSON.parse(text)); } catch { return { error: 'unreadable' }; }
  const ids = new Set(pieces.map((p) => p.id)), roles = {};
  for (const r of parsed.roles) if (ids.has(r.id)) roles[r.id] = r.role;
  // exactly one main, or the answer is not one we can compare with
  if (Object.values(roles).filter((r) => r === 'main').length !== 1) return { error: 'unreadable' };
  const answer = { roles, why: parsed.why, model: response.model, cost: Math.round(cost * 1e5) / 1e5 };
  writeFileSync(file, JSON.stringify(answer));
  return { ...answer, cached: false };
}

// what has been spent so far, for the bench to show
export function spent() {
  const file = join(kept, 'spend.jsonl');
  if (!existsSync(file)) return { calls: 0, dollars: 0 };
  const rows = readFileSync(file, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
  return { calls: rows.length, dollars: Math.round(rows.reduce((s, r) => s + r.dollars, 0) * 1e4) / 1e4 };
}
