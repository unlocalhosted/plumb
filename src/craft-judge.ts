// The judge (docs/briefs/craft-hard-rules.md, layer 7): an eye for what a rule measured but would not stand behind.
// The rules marked `judge` hand over findings from the grey band (overlay/src/craft-run.js `greyPass`). Each is cropped
// from the page with a neighbour's worth of room, shown with the rule's own words and its evidence to a vision model, and
// the answer is kept in .plumber/judge/<sha256 of rule + evidence + crop>.json, to be committed with the project.
//
//   a kept yes   lifts the finding to the floor as a note (soft, `judged`): it is drawn, never counted, never fails a run
//   a kept no, or no answer at all   is silence
//   a model is only asked with --judge, and never when CI is set: determinism is the cache, honesty is the tier, cost is the opt-in
import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { UsageError } from './errors.js';
import { ask } from './craft-page.js';
import type { Page } from './craft-page.js';
import type { CraftRecord } from './craft-run.js';

export interface Grey extends CraftRecord { at: string }
interface Answer { verdict: 'yes' | 'no'; sentence: string; rule: string; evidence: unknown; model: string }
const DIR = '.plumber/judge';

/** Whether the project keeps any answers: the only reason to look for grey findings without being asked. */
export async function hasAnswers(root: string): Promise<boolean> {
  try { return (await readdir(join(root, DIR))).some(name => name.endsWith('.json')); } catch { return false; }
}

async function consult(png: Buffer, grey: Grey): Promise<Answer> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new UsageError('--judge asks a vision model, which needs a key.\n  → export ANTHROPIC_API_KEY=… and run it again, or run without --judge to use only the answers already kept');
  const model = process.env.PLUMBER_JUDGE_MODEL || 'claude-sonnet-5-5';
  const prompt = [
    `A design linter measured something on this element and was not sure: "${grey.title}" ${grey.because}`,
    `What it measured: ${JSON.stringify(grey.evidence)}`,
    'Look at the image. Would a careful designer see this as a real flaw here? Answer with JSON only, like {"verdict":"yes","sentence":"…"} or {"verdict":"no","sentence":"…"}. The sentence says what you see, in plain words, in 90 characters or fewer.',
  ].join('\n');
  const response = await fetch(process.env.PLUMBER_JUDGE_URL || 'https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model, max_tokens: 300, messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: 'image/png', data: png.toString('base64') } }, { type: 'text', text: prompt }] }] }),
  });
  if (!response.ok) throw new UsageError(`The judge’s model answered ${response.status}. Nothing was kept.\n  → check the key and PLUMBER_JUDGE_MODEL, then run it again`);
  const body = await response.json() as { content?: { type: string; text?: string }[] };
  const said = body.content?.find(part => part.type === 'text')?.text ?? '';
  const json = /\{[\s\S]*\}/.exec(said)?.[0];
  let parsed: { verdict?: string; sentence?: string } = {};
  try { parsed = json ? JSON.parse(json) : {}; } catch { /* an answer that isn't JSON is no answer */ }
  if (parsed.verdict !== 'yes' && parsed.verdict !== 'no') throw new UsageError('The judge’s model did not answer yes or no. Nothing was kept.');
  return { verdict: parsed.verdict, sentence: String(parsed.sentence ?? '').slice(0, 90), rule: grey.rule, evidence: grey.evidence, model };
}

/** The grey findings the eye says yes to, as findings. `asking` is whether a model may be asked about the ones with no kept answer. */
export async function judge(page: Page, grey: Grey[], options: { root: string; asking: boolean }): Promise<CraftRecord[]> {
  const lifted: CraftRecord[] = [];
  if (!grey.length) return lifted;
  const cdp = await page.context().newCDPSession(page);
  const size = page.viewportSize() ?? { width: 1280, height: 800 };
  for (const { at, ...finding } of grey) {
    const frame = await ask<{ x: number; y: number; w: number; h: number } | null>(page, { op: 'frame', key: at });
    if (!frame) continue;
    // the element, and room around it for what it sits beside
    const pad = 24, x = Math.max(0, frame.x - pad), y = Math.max(0, frame.y - pad);
    const clip = { x, y, width: Math.max(48, Math.min(frame.w + pad * 2, size.width - x)), height: Math.max(48, Math.min(frame.h + pad * 2, size.height - y)), scale: 2 };
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png', clip });
    const png = Buffer.from(shot.data, 'base64');
    const hash = createHash('sha256').update(JSON.stringify([finding.rule, finding.evidence])).update(png).digest('hex');
    const file = join(options.root, DIR, `${hash}.json`);
    let answer: Answer | null = null;
    try { answer = JSON.parse(await readFile(file, 'utf8')) as Answer; } catch { /* none kept */ }
    if (!answer && options.asking) {
      answer = await consult(png, { ...finding, at } as Grey);
      await mkdir(join(options.root, DIR), { recursive: true });
      await writeFile(file, `${JSON.stringify(answer, null, 2)}\n`);
    }
    if (answer?.verdict !== 'yes') continue;
    lifted.push({ ...finding, confidence: 0.8, ...(answer.sentence ? { because: answer.sentence } : {}), soft: true, judged: true } as CraftRecord);
  }
  return lifted;
}
