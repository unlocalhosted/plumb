// Records docs/media/blueprint.gif, the README's hero, on Relay (examples/relay, an issue tracker built for demos):
// the board as it is, Alt+B counts what is off, pointing at "New issue" shows its X-ray card, Enter pages through the
// causes to the In review column's hard-coded corner, the arrows try your theme's corners on it, and Enter writes one.
// Real Vite, real React, real Chromium; frames are screenshots taken through every pause, and the system ffmpeg
// stitches them into a GIF. Relay is copied into a scratch folder first (its node_modules linked), so the write never
// touches examples/. Run after `npm run build` and `npm ci --prefix examples/relay` (on vm-agent, not the laptop):
//   PLUMBER_CHROMIUM=... node scripts/record-blueprint.mjs [out.gif]
import { cp, mkdtemp, rm, symlink } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const repo = fileURLToPath(new URL('../', import.meta.url));
const out = resolve(process.argv[2] ?? join(repo, 'docs/media/blueprint.gif'));
const app = join(repo, 'examples/relay');
const root = await mkdtemp(join(repo, 'fixtures/.record-'));
// the frames live outside the app: a folder filling with files inside it could make Vite reload the page mid-write
const frames = await mkdtemp(join(tmpdir(), 'plumb-frames-'));
let server, browser;
try {
  for (const part of ['src', 'index.html', 'components.json', 'plumber.config.ts', 'vite.config.mjs', 'package.json']) await cp(join(app, part), join(root, part), { recursive: true });
  await symlink(join(app, 'node_modules'), join(root, 'node_modules'));
  execFileSync('git', ['init', '-q'], { cwd: root });
  server = await createServer({ root, configFile: join(root, 'vite.config.mjs'), logLevel: process.env.RECORD_LOG ?? 'warn', server: { host: '127.0.0.1', port: 0, strictPort: false } });
  await server.listen();
  const url = `http://127.0.0.1:${server.httpServer.address().port}/`;
  browser = await chromium.launch({ headless: true, executablePath: process.env.PLUMBER_CHROMIUM || undefined });
  const context = await browser.newContext({ viewport: { width: 1180, height: 700 }, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
  // headless screenshots carry no pointer: draw one, only in this recording, so the viewer sees where the hand is.
  // Relay's "Planted drift" switch is ours, for checking the demo, not part of the product: it is hidden here.
  // a returning user has seen the first-visit setup note: mark it seen, as the overlay itself does once shown
  await context.addInitScript(() => { try { localStorage.setItem(`plumb-readiness-seen:${location.origin}`, '1'); } catch {} });
  await context.addInitScript(() => addEventListener('DOMContentLoaded', () => {
    const p = document.createElement('div');
    p.innerHTML = '<svg width="20" height="24" viewBox="0 0 20 24"><path d="M2 2 L2 19 L6.5 15 L9.5 22 L12.5 20.7 L9.6 14 L16 14 Z" fill="#111" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg>';
    Object.assign(p.style, { position: 'fixed', left: '0', top: '0', zIndex: '2147483647', pointerEvents: 'none', transform: 'translate(-100px,-100px)' });
    document.documentElement.append(p);
    addEventListener('mousemove', (e) => { p.style.transform = `translate(${e.clientX - 2}px,${e.clientY - 2}px)`; }, true);
    const hide = () => { for (const b of document.querySelectorAll('button')) if (/Planted drift/.test(b.textContent)) b.parentElement.style.display = 'none'; };
    new MutationObserver(hide).observe(document.body, { childList: true, subtree: true });
  }));
  const page = await context.newPage();
  await page.goto(url);
  await page.getByText('Backlog', { exact: true }).first().waitFor();
  // the board scrolled to start at Todo, so the In review column (the one the corner fix is about) is whole in view
  await page.evaluate(() => document.querySelector('section[aria-label="Todo"]')?.scrollIntoView({ inline: 'start', block: 'nearest' }));
  const shadow = (sel) => page.evaluate((s) => (document.querySelector('plumb-overlay')?.shadowRoot?.querySelector(s)?.innerText ?? '').replace(/\s+/g, ' '), sel);
  const said = (re, timeout = 30000) => page.waitForFunction((src) => new RegExp(src).test(document.querySelector('plumb-overlay')?.shadowRoot?.textContent ?? ''), re.source, { timeout });
  // a pause is a run of frames, about 12 a second
  let n = 0;
  const FRAME = 1000 / 12;
  const wait = async (ms) => { const t0 = Date.now(); for (let k = 0; k * FRAME < ms; k++) { await page.screenshot({ path: join(frames, `${String(n++).padStart(4, '0')}.png`), type: 'png' }); const due = t0 + (k + 1) * FRAME; if (Date.now() < due) await page.waitForTimeout(due - Date.now()); } };
  // between shots the hand rests just outside the window (off the trackpad): anywhere on the page, Plumber answers it
  const rest = { x: 1240, y: 740 };
  await page.mouse.move(rest.x, rest.y);
  await page.waitForTimeout(2500);
  // 1. the board as it is
  await wait(1500);
  // 2. Alt+B: the bar counts what is off
  await page.keyboard.press('Alt+B');
  await said(/All concerns\s*\d+/);
  await wait(1800);
  // 3. point at "New issue": its X-ray card, with the corner that is off your scale
  const button = await page.getByRole('button', { name: /New issue/ }).boundingBox();
  // along the top bar, then onto the button, so the card is the button's and not something the hand passed over
  await page.mouse.move(button.x - 260, button.y + button.height / 2, { steps: 14 });
  await page.mouse.move(button.x + button.width / 2, button.y + button.height / 2, { steps: 8 });
  await page.waitForTimeout(150);
  await page.mouse.move(button.x + button.width / 2 + 1, button.y + button.height / 2, { steps: 1 });
  await said(/Measurements/, 10000).catch(() => {});
  await wait(3200);
  await page.mouse.move(rest.x, rest.y, { steps: 12 });
  await wait(500);
  // 4. Enter: the causes one at a time, paged to the In review column's hard-coded corner
  await page.keyboard.press('Enter');
  await said(/1 of \d+/);
  await wait(1400);
  for (let k = 0; k < 24 && !/hard-coded border radius 10px/.test(await shadow('[aria-label="Fix"]')); k++) { await page.keyboard.press('ArrowRight'); await wait(320); }
  if (!/hard-coded border radius 10px/.test(await shadow('[aria-label="Fix"]'))) throw new Error('no 10px corner cause in the first 24');
  await wait(1800);
  // 5. the arrows try your theme's corners on the column, then Enter writes the one in hand (the first, the nearest)
  const choice = async () => (await shadow('[aria-label="Choose"]')).match(/Use [\w-]+/)?.[0];
  const right = await choice();
  await page.keyboard.press('ArrowDown'); await wait(1100);
  await page.keyboard.press('ArrowDown'); await wait(1100);
  for (let k = 0; k < 4 && (await choice()) !== right; k++) { await page.keyboard.press('ArrowUp'); await wait(1100); }
  if ((await choice()) !== right) throw new Error(`the arrows did not come back to "${right}"`);
  await wait(500);
  await page.keyboard.press('Enter');
  // the write is done when its line says so ("Changed rounded-[10px] to rounded-lg…"); the word Undo alone is in the
  // overlay before any write
  const before = n;
  for (let k = 0; k < 60 && !/Changed /.test(await shadow('[aria-label="Fix"]') + await shadow('[role="status"]')); k++) await wait(100);
  if (n - before >= 60 * 2) throw new Error('the write never said it was done');
  await wait(1600);
  // 6. back from the fix (the next cause can wait), the change still said with its Undo; then leave
  await page.keyboard.press('Escape');
  await wait(2200);
  await page.keyboard.press('Escape'); await wait(1300);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '12', '-i', join(frames, '%04d.png'), '-vf', 'scale=960:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=160[p];[s1][p]paletteuse=dither=bayer:bayer_scale=4', '-loop', '0', out]);
  console.log('wrote', out, `${n} frames`);
} finally {
  await browser?.close();
  await server?.close();
  await rm(root, { recursive: true, force: true });
  await rm(frames, { recursive: true, force: true });
}
