// One principle's screen, checked the way the showcase's own review does it (.claude/skills/craft-rule §6–7), with
// the showcase's dev server up:
//   node scripts/screen.mjs 9                 what plumber finds on /rule/9, scoped to the example
//   node scripts/screen.mjs 9 --record DIR    and the moment: plumber's fix, asked again, a video and a contact sheet
// Each screen should show exactly its own rule before the fix and nothing after it.
import { execFile } from 'node:child_process';
import { mkdir, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { chromium } from 'playwright';

const run = promisify(execFile);
const [n, flag, dir] = process.argv.slice(2);
const base = process.env.SHOWCASE ?? 'http://127.0.0.1:4312';
const browser = await chromium.launch();
// 1× by default: headless Chromium computes a 0.5px border as 1px even at 2×, so at 2× every hairline the screens
// already draw would read as a mistake. DPR=2 to see what a 2× rule finds; a hairline's fix is proved in a real browser.
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: Number(process.env.DPR ?? 1), ...(flag === '--record' ? { recordVideo: { dir, size: { width: 1280, height: 800 } } } : {}) });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`${base}/rule/${n}`);
await page.waitForFunction(() => { const l = document.querySelector('[aria-label="What plumber finds"]'); return l && !l.querySelector('[aria-label^="Asking"]') && l.innerText.length > 20; }, null, { timeout: 60000 }).catch(() => errors.push('plumber never answered'));
const found = await page.evaluate(async () => (await window.__plumb.craft({ scope: '[data-example]', timeout: 20000, hidden: true })).findings.map((f) => {
  const el = [...document.querySelectorAll('[data-plumb-source]')].find((e) => e.getAttribute('data-plumb-source').startsWith(`${f.file}:${f.line}:${f.column}#`));
  return `${f.rule.replace('craft/', '')} ×${f.count} | ${f.title} | ${f.suggest?.to ?? f.suggest?.text ?? f.action ?? ''} | <${el?.localName} class="${String(el?.className?.baseVal ?? el?.className ?? '').slice(0, 70)}">`;
})).catch((e) => [`(read failed: ${e.message})`]);
console.log(found.length ? found.join('\n') : '(nothing)');
if (flag === '--record') {
  await page.waitForTimeout(2500);
  await page.keyboard.press('f');
  await page.waitForFunction(() => /Asked again/.test(document.body.innerText), null, { timeout: 30000 }).catch(() => {});
  console.log(await page.evaluate(() => document.body.innerText.match(/Asked again[^\n]*/)?.[0] ?? '(never asked again)'));
  await page.waitForTimeout(1500);
}
if (errors.length) console.log('page errors:', errors.join(' | '));
await ctx.close(); await browser.close();
if (flag === '--record') {
  const video = join(dir, (await readdir(dir)).find((f) => f.endsWith('.webm')));
  const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', video]);
  const d = parseFloat(stdout);
  // the moment: from the click to the camera back at rest, two frames a second
  await run('ffmpeg', ['-v', 'error', '-y', '-ss', String(Math.max(0, d - 12)), '-t', '8', '-i', video, '-vf', 'fps=2,crop=992:800:288:0,scale=320:-1,tile=4x4', '-q:v', '4', join(dir, 'sheet.jpg')]);
  await run('ffmpeg', ['-v', 'error', '-y', '-ss', String(Math.max(0, d - 14)), '-i', video, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', join(dir, `rule-${n}.mp4`)]);
  console.log('sheet', join(dir, 'sheet.jpg'));
}
