// Records React Plumber's real overlay editing a small app, for the homepage.
//   node homepage/recording/record.mjs
// Writes homepage/public/media/live-editing.webm, live-editing.mp4 (when ffmpeg exists) and live-editing-poster.png.
// The overlay writes to source, so the run works on a scratch copy of ./app and deletes it at the end.
// Needs Playwright (the repo's own, or any resolvable one) and a Chromium: PLUMBER_CHROMIUM names one, else Playwright's.
import { spawn, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../..');
const OUT = join(REPO, 'homepage/public/media');
const PORT = Number(process.env.RECORDING_PORT ?? 4361);
const DEBUG = process.env.RECORDING_DEBUG; // a directory: save a screenshot at each step
// The scratch copy lives under the repo so Node finds the repo's react, vite and tailwind from it.
const SCRATCH = join(HERE, `.scratch-${process.pid}`);
// The page is 960x600 CSS px; the screencast is captured at its real 2x pixels (1920x1200).
const VIEW = { w: 960, h: 600 };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const require = createRequire(join(REPO, 'package.json'));
const { chromium } = require('playwright');

let server, browser;
const cleanup = async () => {
  try { await browser?.close(); } catch {}
  if (server?.pid) { try { process.kill(-server.pid, 'SIGTERM'); } catch {} await wait(300); try { process.kill(-server.pid, 'SIGKILL'); } catch {} }
  rmSync(SCRATCH, { recursive: true, force: true });
};
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, async () => { await cleanup(); process.exit(130); });

async function main() {
  mkdirSync(OUT, { recursive: true });
  cpSync(join(HERE, 'app'), SCRATCH, { recursive: true });
  const source = () => readFileSync(join(SCRATCH, 'src/App.jsx'), 'utf8');

  // dist/ is rebuilt by `npm run build` (it is emptied first), so wait for the plugin to be there.
  const PLUMB = join(REPO, 'dist/hosts/vite.js');
  for (let i = 0; !existsSync(PLUMB); i++) {
    if (i > 300) throw new Error('dist/hosts/vite.js is missing: run `npm run build` in the repo root');
    await wait(1000);
  }

  // The copy's own dev server, in its own process group so the whole tree stops with it.
  server = spawn(join(REPO, 'node_modules/.bin/vite'), ['--config', 'vite.config.mjs'], {
    cwd: SCRATCH, detached: true, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, RECORDING_PLUMB_DIST: PLUMB, RECORDING_PORT: String(PORT) },
  });
  let log = '';
  server.stdout.on('data', (d) => (log += d)); server.stderr.on('data', (d) => (log += d));
  const url = `http://127.0.0.1:${PORT}/`;
  for (let i = 0; ; i++) {
    if (i > 150) throw new Error(`dev server did not start:\n${log}`);
    try { if ((await fetch(url)).ok) break; } catch {}
    await wait(200);
  }

  browser = await chromium.launch({
    headless: true,
    ...(process.env.PLUMBER_CHROMIUM ? { executablePath: process.env.PLUMBER_CHROMIUM } : {}),
  });
  const FRAMES = join(SCRATCH, 'frames');
  mkdirSync(FRAMES, { recursive: true });
  const ctx = await browser.newContext({
    viewport: { width: VIEW.w, height: VIEW.h }, deviceScaleFactor: 2,
    colorScheme: 'dark',
  });
  // A cursor to watch: a headless screencast draws none. It sits above the page, takes no pointer events and follows mousemove.
  await ctx.addInitScript(() => {
    addEventListener('DOMContentLoaded', () => {
      const c = document.createElement('div');
      c.id = '__rec-cursor';
      c.setAttribute('aria-hidden', 'true');
      c.style.cssText = 'position:fixed;left:0;top:0;width:22px;height:22px;pointer-events:none;z-index:2147483647;transform:translate(-100px,-100px);filter:drop-shadow(0 1px 2px rgba(0,0,0,.55))';
      c.innerHTML = '<svg width="22" height="22" viewBox="0 0 22 22"><path d="M3 2l13 7.2-5.6 1.7L8.1 17z" fill="#fff" stroke="#111" stroke-width="1.4" stroke-linejoin="round"/></svg>';
      document.documentElement.appendChild(c);
      addEventListener('mousemove', (e) => { c.style.transform = `translate(${e.clientX}px,${e.clientY}px)`; }, true);
    });
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  const t0 = Date.now();
  // A true 2x capture. Chromium's screencast stops at CSS-pixel size (960x600), so frames are taken with
  // Page.captureScreenshot at device pixels (1920x1200) in a loop beside the gestures. Each frame keeps the time it was
  // taken; the video is assembled from those durations at a steady 30 fps.
  const cdp = await ctx.newCDPSession(page);
  const frames = [];
  let capturing = true;
  const shotErrors = [];
  const t1 = Date.now();
  const shot = async (name) => { if (process.env.RECORDING_TRACE) console.log(((Date.now() - t0) / 1000).toFixed(1), name, frames.length, 'frames'); if (DEBUG) { mkdirSync(DEBUG, { recursive: true }); await page.screenshot({ path: join(DEBUG, `${name}.png`) }); } };

  // Human pacing: an eased path to a point, then a beat.
  let at = { x: 900, y: 120 };
  const glide = async (x, y, ms = 650) => {
    const from = at, steps = Math.max(12, Math.round(ms / 16));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps, e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      await page.mouse.move(from.x + (x - from.x) * e, from.y + (y - from.y) * e);
      await wait(ms / steps);
    }
    at = { x, y };
  };
  const centre = async (sel) => { const b = await page.locator(sel).first().boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2, b }; };
  const type = (text) => page.keyboard.type(text, { delay: 85 });

  await page.goto(url, { waitUntil: 'load' });
  const capture = (async () => {
    while (capturing) {
      const a = Date.now();
      const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true, clip: { x: 0, y: 0, width: VIEW.w, height: VIEW.h, scale: 2 } }).catch((e) => { shotErrors.push(String(e).slice(0, 120)); return {}; });
      if (!data) { await wait(30); continue; }
      const n = frames.length;
      frames.push({ at: (a + Date.now()) / 2000, file: join(FRAMES, `${String(n).padStart(5, '0')}.png`) });
      writeFileSync(frames[n].file, Buffer.from(data, 'base64'));
    }
  })();
  await page.waitForSelector('plumb-overlay', { state: 'attached', timeout: 20000 });
  await page.mouse.move(at.x, at.y);
  // The overlay reads the project first ("Checking your project…"); the clip starts once that has settled.
  await page.waitForFunction(() => !/Checking your project/.test(document.querySelector('plumb-overlay')?.shadowRoot?.textContent ?? ''), null, { timeout: 15000 }).catch(() => {});
  await wait(1200);
  const tStart = Date.now();
  await shot('0-start');

  // 1. Double-click the heading, select its words, type, Enter.
  const h = await centre('h2');
  await glide(h.x - 20, h.y, 700);
  await wait(350);
  await page.mouse.dblclick(h.x - 20, h.y);
  await page.waitForFunction(() => document.querySelector('h2')?.isContentEditable, null, { timeout: 8000 });
  await wait(400);
  await shot('1-editing');
  await page.keyboard.press('Meta+a');
  await wait(350);
  await type('Your team');
  await wait(500);
  await shot('2-typed');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => /Your team/.test(document.querySelector('h2')?.textContent ?? ''));
  for (let i = 0; i < 60 && !source().includes('Your team'); i++) await wait(100);
  if (!source().includes('>Your team<')) throw new Error('the heading was not written to source');
  await wait(1100);
  await shot('3-written');

  // 2. Blueprint.
  await glide(900, 560, 600);
  await wait(200);
  await page.keyboard.down('Alt'); await page.keyboard.press('KeyB'); await page.keyboard.up('Alt');
  await wait(1300);
  await shot('4-blueprint');

  console.log('source after:\n', source().split('\n').filter((l) => /Your team|gap-/.test(l)).join('\n'));
  await wait(400); await shot('4b-blueprint');
  const key = async (k, ms, name) => { await page.keyboard.press(k); await wait(ms); if (name) await shot(name); };
  await key('Enter', 1100, '5-cause');
  await key('ArrowUp', 700, '6-up1');
  await key('ArrowUp', 700, '7-up2');
  await key('ArrowDown', 700, '8-down1');
  await key('ArrowDown', 700, '9-down2');
  await key('Enter', 1000, '10-taken');
  await key('KeyA', 300, '11-applying');
  for (let i = 0; i < 100 && !source().includes('gap-related items') && !/flex items-center gap-related/.test(source()); i++) await wait(100);
  await wait(1500); await shot('12-applied');
  const written = source().split('\n').find((l) => l.includes('<li ')) ?? '';
  if (!/gap-related/.test(written) || /gap-\[10px\]/.test(written)) throw new Error(`Apply did not write the row's gap:\n${written}`);

  // Leave blueprint: the page, fixed, holds for a beat. That frame is the poster.
  await page.keyboard.press('Escape');
  await wait(1100);
  await shot('13-left');
  await page.screenshot({ path: join(OUT, 'live-editing-poster.png') });
  await wait(500);
  const tEnd = Date.now();

  console.log('source after:\n' + source().split('\n').filter((l) => /Your team|<li /.test(l)).join('\n'));
  console.log('page errors:', errors);

  // Stop the screencast, keep the frames from tStart to tEnd, and encode them at a steady 30 fps.
  capturing = false;
  await Promise.race([capture, wait(8000)]); // a stalled screenshot must not hang the run
  const a = tStart / 1000, b = tEnd / 1000;
  let first = frames.findLastIndex((f) => f.at <= a);
  if (!frames.length) throw new Error(`no frames captured: ${shotErrors[0]}`);
  const kept = frames.slice(Math.max(first, 0)).filter((f) => f.at < b);
  const lines = kept.map((f, k) => {
    const from = Math.max(f.at, a), to = k + 1 < kept.length ? kept[k + 1].at : b;
    return `file '${f.file}'\nduration ${Math.max(to - from, 0.001).toFixed(4)}`;
  });
  lines.push(`file '${kept.at(-1).file}'`); // the concat demuxer needs the last file repeated
  const list = join(SCRATCH, 'frames.txt');
  writeFileSync(list, lines.join('\n'));
  const len = (b - a).toFixed(2);
  const webm = join(OUT, 'live-editing.webm'), mp4 = join(OUT, 'live-editing.mp4');
  const ff = (args) => spawnSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-vf', 'fps=30,format=yuv420p', '-an', ...args], { stdio: 'inherit' });
  ff(['-c:v', 'libvpx-vp9', '-crf', '28', '-b:v', '0', '-row-mt', '1', webm]);
  if (spawnSync('ffmpeg', ['-version']).status === 0) ff(['-c:v', 'libx264', '-crf', '17', '-preset', 'slow', '-movflags', '+faststart', mp4]);
  if (shotErrors.length) console.log('screenshot errors:', shotErrors.length, shotErrors[0]);
  console.log(`${kept.length} frames, ${(kept.length / (b - a)).toFixed(1)} captured/s`);
  console.log(`clip ${len}s -> ${webm}`);
  await cleanup();
}

main().catch(async (e) => { console.error(e); await cleanup(); process.exit(1); });
