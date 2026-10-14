// Records docs/media/blueprint.gif: the overlay demo, blueprint mode entered, a break pointed at, the view held as
// designed, a cause pointed at, and the mode left. Real Vite, real React, real Chromium; frames are screenshots
// taken through every pause, and the system ffmpeg stitches them into a GIF. Run after `npm run build`:  PLUMBER_CHROMIUM=... node scripts/record-blueprint.mjs
import { cp, mkdtemp, rm, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { plumb } from '@unlocalhosted/react-plumber/vite';

const repo = fileURLToPath(new URL('../', import.meta.url));
const root = await mkdtemp(join(repo, 'fixtures/.record-'));
const frames = join(root, 'frames');
await mkdir(frames);
try {
  await cp(join(repo, 'overlay/demo/src'), join(root, 'src'), { recursive: true });
  await cp(join(repo, 'overlay/demo/index.html'), join(root, 'index.html'));
  const server = await createServer({ root, cacheDir: join(root, '.vite-cache'), configFile: false, plugins: [tailwindcss(), plumb({ watch: false })],
    oxc: { jsx: { runtime: 'automatic', development: true } }, logLevel: 'silent', server: { host: '127.0.0.1', port: 0 } });
  await server.listen();
  const url = `http://127.0.0.1:${server.httpServer.address().port}/`;
  const browser = await chromium.launch({ headless: true, executablePath: process.env.PLUMBER_CHROMIUM || undefined });
  const context = await browser.newContext({ viewport: { width: 1100, height: 640 }, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
  const page = await context.newPage();
  await page.goto(url);
  await page.waitForFunction(() => window.__plumb?.overlay);
  await page.evaluate(() => window.__plumb.ready());
  // a pause is a run of frames, about 12 a second
  let n = 0;
  const FRAME = 1000 / 12;
  const wait = async (ms) => { const t0 = Date.now(); for (let k = 0; k * FRAME < ms; k++) { await page.screenshot({ path: join(frames, `${String(n++).padStart(4, '0')}.png`), type: 'png' }); const due = t0 + (k + 1) * FRAME; if (Date.now() < due) await page.waitForTimeout(due - Date.now()); } };
  await wait(1400);
  await page.keyboard.press('Alt+B');
  await wait(300);
  await page.waitForFunction(() => /off in view/.test(document.querySelector('plumb-overlay').shadowRoot.querySelector('.dock .say')?.innerText ?? ''), null, { timeout: 20000 });
  await wait(1600);
  // point at the gap's break: its note
  const hit = await page.evaluate(() => { const h = [...document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.bp .hit')].find((r) => r.getAttribute('aria-label').includes('gap-[10px]')); const b = h.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; });
  await page.mouse.move(hit.x, hit.y, { steps: 12 });
  await wait(1800);
  await page.mouse.move(700, 400, { steps: 10 });
  await wait(500);
  // hold D: as designed
  await page.keyboard.down('d');
  await wait(1600);
  await page.keyboard.up('d');
  await wait(900);
  // point at the first cause
  const cause = await page.evaluate(() => { const c = document.querySelector('plumb-overlay').shadowRoot.querySelector('.bp .sheet .cause[data-k="0"] .what'); const b = c.getBoundingClientRect(); return { x: b.left + 30, y: b.top + b.height / 2 }; });
  await page.mouse.move(cause.x, cause.y, { steps: 14 });
  await wait(1600);
  await page.mouse.move(700, 400, { steps: 10 });
  await wait(500);
  await page.keyboard.press('Alt+B');
  await wait(1400);
  await context.close();
  await browser.close();
  await server.close();
  const out = join(repo, 'docs/media/blueprint.gif');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '12', '-i', join(frames, '%04d.png'), '-vf', 'scale=960:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer:bayer_scale=4', '-loop', '0', out]);
  console.log('wrote', out);
} finally {
  await rm(root, { recursive: true, force: true });
}
