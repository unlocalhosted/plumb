#!/usr/bin/env node
// The film's draft pass: one cheap run of /film/N for the story and camera reviews, before the final render.
//
//   node overlay/showcase/scripts/film-draft.mjs <N> [--origin http://localhost:4313] [--out docs/films/<N>-draft]
//
// It plays the film once at the stage's own size (1600 × 900, 1×) and writes, into the out folder:
//   beats.md     every beat as it started, with its timecode (from the film itself, window.__filmBeat)
//   NN-*.png     a full-size keyframe of every beat, taken once the beat has settled (its marks drawn, its move done)
//   sheet.png    the whole film at one frame a second, 8 across, for pace and rhythm (frame i is second i)
//   draft.webm   the recording itself, never published: the final render is the film page at 1920 × 1080
//
// The reviews read beats.md and the keyframes first and the sheet second; nobody has to watch the draft.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';
import { checkPage, refuse } from './film-script-check.mjs';

const args = process.argv.slice(2), n = Number(args[0]);
if (!n) { console.error('usage: film-draft.mjs <N> [--origin URL] [--out DIR]'); process.exit(2); }
const opt = (name, fallback) => { const i = args.indexOf(name); return i > 0 ? args[i + 1] : fallback; };
const origin = opt('--origin', 'http://localhost:4313'), query = opt('--query', '');
const clip = args.includes('--clip'); // a social clip (/clip/N): 4:5, and it ends on its last frame // --query '?panel=paper': a variant to compare
const out = resolve(opt('--out', `docs/films/${String(n).padStart(2, '0')}-${clip ? 'clip' : 'draft'}`));
const [VW, VH] = clip ? [1080, 1350] : [1600, 900], TAIL = clip ? 100 : 2500;
const SETTLE = 900;      // ms after a beat starts before its keyframe: its marks drawn, its camera move mostly done
const LIMIT = 60000;     // a film never runs longer than this

rmSync(out, { recursive: true, force: true }); mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: 1, recordVideo: { dir: out, size: { width: VW, height: VH } } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

const beats = [], shots = [];
let t0 = null, done;
const finished = new Promise((ok) => { done = ok; });
await page.exposeFunction('__filmBeat', (name, t) => {
  t0 ??= t;
  const at = (t - t0) / 1000, i = beats.length;
  beats.push({ name, at });
  const file = `${String(i).padStart(2, '0')}-${name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 48)}.png`;
  shots.push(new Promise((ok) => setTimeout(() => page.screenshot({ path: join(out, file) }).then(() => ok(file), () => ok(null)), SETTLE)));
  if (name === 'frame: line') setTimeout(done, TAIL + SETTLE); // the closing line is the last beat; hold a moment past it
});
await page.goto(`${origin}/${clip ? 'clip' : 'film'}/${n}${query}`);
const problems = await checkPage(page);
if (problems.length) { await ctx.close(); await browser.close(); rmSync(out, { recursive: true, force: true }); refuse(n, problems); }
await Promise.race([finished, new Promise((ok) => setTimeout(ok, LIMIT))]);
const files = await Promise.all(shots);
await ctx.close(); await browser.close();

const video = readdirSync(out).find((f) => f.endsWith('.webm'));
if (video) renameSync(join(out, video), join(out, 'draft.webm'));
const length = beats.length ? beats.at(-1).at + TAIL / 1000 : 0;
const rows = beats.map((b, i) => {
  const next = beats[i + 1]?.at ?? length;
  return `| ${b.at.toFixed(1)} s | ${(next - b.at).toFixed(1)} s | ${b.name} | ${files[i] ? `[keyframe](${files[i]})` : ''} |`;
});
writeFileSync(join(out, 'beats.md'), `# Film № ${n}, draft beats\n\nOne run at ${VW} × ${VH}. Timecodes from the film's own beats (±0.1 s); each keyframe ${SETTLE} ms into its beat.\nLength about ${length.toFixed(1)} s.${errors.length ? `\n\nErrors while it ran:\n${errors.map((e) => `- ${e}`).join('\n')}` : ''}\n\n| at | lasts | beat | |\n|---|---|---|---|\n${rows.join('\n')}\n`);
if (video) execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', join(out, 'draft.webm'), '-vf', 'fps=1,scale=400:-1,tile=8x5', '-frames:v', '1', join(out, 'sheet.png')]);
console.log(JSON.stringify({ out, beats: beats.length, length: +length.toFixed(1), errors }, null, 1));
