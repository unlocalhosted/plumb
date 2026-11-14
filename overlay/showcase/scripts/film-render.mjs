#!/usr/bin/env node
// The film's final render: /film/N drawn frame by frame, so every frame is exact and the motion is smooth at any rate.
//
//   node overlay/showcase/scripts/film-render.mjs <N> <out.mp4> [--fps 60] [--size 1920x1080] [--origin http://localhost:4313]
//
// A recorder that films the page in real time drops and repeats frames (25 fps, re-timed); this one owns time instead.
// The page's clock (timers, animation frames, performance.now, Date) is Playwright's, paused; every CSS transition and
// animation is paused too and set by hand to where it would be. Each frame: advance the clock one frame, set every
// animation to the clock, take the picture. A beat that starts in a frame starts in that frame.
//
// Run it only after the story and camera reviews pass on the draft (film-draft.mjs); it takes a few minutes.
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const args = process.argv.slice(2), n = Number(args[0]), out = args[1];
if (!n || !out) { console.error('usage: film-render.mjs <N> <out.mp4> [--fps 60] [--size 1920x1080] [--origin URL]'); process.exit(2); }
const opt = (name, fallback) => { const i = args.indexOf(name); return i > 0 ? args[i + 1] : fallback; };
const fps = Number(opt('--fps', 60)), [w, h] = opt('--size', '1920x1080').split('x').map(Number), origin = opt('--origin', 'http://localhost:4313');
const step = 1000 / fps, TAIL = 2500, LIMIT = 90000; // hold past the closing line; never longer than this

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
const T0 = Date.now();
await page.clock.install({ time: T0 });
await page.clock.pauseAt(T0 + 10); // an installed clock still runs in real time: paused, only the frames below move it
await page.goto(`${origin}/film/${n}`);

// the film's own time, counted here frame by frame (the page's performance.now keeps running in real time while frames
// are taken, so it can't be the clock); every animation is held to it: tagged when first seen, paused, and set
let v = 0;
const sync = () => page.evaluate((now) => {
  for (const a of document.getAnimations()) {
    if (a.__born === undefined) { a.__born = now; a.pause(); }
    a.currentTime = now - a.__born;
  }
  const beats = window.__filmBeats ?? [];
  return { started: beats.length > 0, ended: beats.some((b) => b.name === 'frame: line') };
}, v);
const tick = async () => { await page.clock.runFor(step); v += step; return sync(); };

// until the film's first beat (fonts loading, the opening measured), time runs but nothing is filmed
let state = await sync(), waited = 0;
while (!state.started && waited < 20000) { state = await tick(); await page.waitForTimeout(5); waited += step; }
if (!state.started) { console.error('the film never started'); await browser.close(); process.exit(1); }
const start = v; let endAt = null;

const ff = spawn('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', '16',
  '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
let frames = 0;
for (;;) {
  ff.stdin.write(await page.screenshot({ type: 'png' })); frames++;
  if (state.ended) endAt ??= v;
  if (endAt !== null && v >= endAt + TAIL) break;
  if (v - start > LIMIT) { errors.push('stopped at the time limit'); break; }
  state = await tick();
}
ff.stdin.end(); await new Promise((ok) => ff.on('close', ok));
await browser.close();
console.log(JSON.stringify({ out, frames, seconds: +(frames / fps).toFixed(2), fps, size: `${w}x${h}`, errors }));
