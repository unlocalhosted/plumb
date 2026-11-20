// How plumber judges a button: every form of an atom (or one) at each state of its gesture (rest, pointed at, mid-gesture, done),
// plumber's full engine run on the live page at each one, and its notes drawn on the element each is about.
//   node generator/data/judge-show.mjs all [atom]   (the product's playground on 4399) → web/public/research/atom-judging.html
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const here = fileURLToPath(new URL('./', import.meta.url));
const [which = 'beui/slide-action-button', atom = 'buy'] = process.argv.slice(2);
// the product's playground: used if it is already running, else started here and stopped at the end
import { execFileSync } from 'node:child_process';
const DEV = `${process.env.HOME}/.claude/bin/dev-server`, PG = `${here}../playground/${atom === 'start' ? 'algorecall' : 'craftingattention'}`;
const up = async () => { try { return (await fetch('http://localhost:4399/')).ok; } catch { return false; } };
const started = !(await up());
if (started) {
  const root = atom === 'start' ? '/Users/vijaysingh/unlocalhosted/algorecall' : '/Users/vijaysingh/unlocalhosted/craftingattention/app';
  execFileSync(DEV, [PG, `${root}/node_modules/.bin/vite`, '--config', 'vite.config.mjs', '--port', '4399', '--strictPort'], { stdio: 'ignore' });
  for (let i = 0; i < 40 && !(await up()); i++) await new Promise((r) => setTimeout(r, 750));
}
const stop = () => { if (started) try { execFileSync(DEV, ['--stop', PG], { stdio: 'ignore' }); } catch {} };
const engine = (await readFile(`${here}../reads/craft.iife.js`, 'utf8')).replaceAll('{}.url', '"http://plumb.invalid/overlay/src/craft.js"');
// plumber at this moment: each note with the box of the element it is on, relative to the stage
const JUDGE = (form) => {
  const stage = document.querySelector(`[data-form="${form}"] .atom-stage`), S = stage.getBoundingClientRect();
  const els = [stage, ...stage.querySelectorAll('*')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
  const craft = new PlumbCraft.Craft({ now: true, theme: new PlumbCraft.Theme({ decisions: () => [] }) });
  return craft.enrich(els.map((el, i) => ({ id: i, el, marks: [], dims: {}, file: 'atom', line: 1, column: 1 })))
    .flatMap((i) => { const r = i.el.getBoundingClientRect(); return i.marks.filter((m) => !/^experience\/font|sibling-match/.test(m.rule)).map((m) => ({ rule: m.rule, says: m.title ?? m.what, why: m.because ?? '', box: [r.x - S.x, r.y - S.y, r.width, r.height] })); });
};
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 1100 }, deviceScaleFactor: 2 });
await p.goto(`http://localhost:4399/atoms.html?atom=${atom}`, { waitUntil: 'networkidle' }); await p.waitForTimeout(2500);
const title = await p.evaluate(() => document.querySelector('h1')?.textContent.replace(/, in every form.*/, '') ?? '');
const forms = which === 'all' ? await p.evaluate(() => [...document.querySelectorAll('[data-form]')].map((e) => e.dataset.form)) : [which];
await p.close();
const judged = [];
for (const form of forms) {
  const p = await b.newPage({ viewport: { width: 1280, height: 1100 }, deviceScaleFactor: 2 });
  await p.goto(`http://localhost:4399/atoms.html?atom=${atom}`, { waitUntil: 'networkidle' }); await p.waitForTimeout(2500);
  await p.addScriptTag({ content: engine });
  const stage = p.locator(`[data-form="${form}"] .atom-stage`); await stage.scrollIntoViewIfNeeded(); await p.waitForTimeout(300);
  const name = await p.evaluate((form) => document.querySelector(`[data-form="${form}"] h3`).textContent, form);
  const why = await p.evaluate((form) => document.querySelector(`[data-form="${form}"] p`)?.textContent ?? '', form);
  const gesture = await p.evaluate((form) => document.querySelector(`[data-form="${form}"]`).dataset.gesture, form);
  const t = await p.evaluate((form) => { const s = document.querySelector(`[data-form="${form}"] .atom-stage`); const e = s.querySelector('button,[role=button]') ?? s.firstElementChild; const r = e.getBoundingClientRect(), W = s.firstElementChild.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: W.width }; }, form);
  const states = [];
  const snap = async (state) => states.push({ state, img: (await stage.screenshot()).toString('base64'), notes: await p.evaluate(JUDGE, form) });
  await p.mouse.move(t.x, t.y - 200); await p.waitForTimeout(300); await snap('At rest');
  await p.mouse.move(t.x, t.y, { steps: 5 }); await p.waitForTimeout(400); await snap('Pointed at');
  await p.mouse.down();
  if (gesture === 'slide') for (let i = 1; i <= 12; i++) { await p.mouse.move(t.x + (t.w * 0.45 * i) / 12, t.y); await p.waitForTimeout(25); } else await p.waitForTimeout(gesture === 'hold' ? 550 : 140);
  await p.waitForTimeout(120); await snap(gesture === 'slide' || gesture === 'hold' ? 'Held halfway' : 'Pressed');
  if (gesture === 'slide') for (let i = 1; i <= 8; i++) { await p.mouse.move(t.x + t.w * 0.45 + (t.w * 0.55 * i) / 8, t.y); await p.waitForTimeout(25); }
  else if (gesture === 'hold') await p.waitForTimeout(1300);
  await p.mouse.up();
  if (gesture === 'confirm') { await p.waitForTimeout(500); await snap('Asking'); await p.locator(`[data-form="${form}"] button`, { hasText: /^(Yes|Pay)$/ }).evaluate((x) => x.click()).catch(() => {}); }
  await p.waitForTimeout(gesture === 'answer' ? 1300 : 600); await snap('Done');
  judged.push({ form, name, why, states });
  await p.close();
  console.log(`judged ${name}`);
}
await b.close();
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
const esc2 = (x) => String(x ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
let k = 0;
const stateCard = (s) => `<figure><figcaption>${s.state}</figcaption><div class="frame"><img alt="" src="data:image/png;base64,${s.img}">${s.notes.map((n) => `<i class="mark${n.rule.includes('words-on') ? ' hot' : ''}" data-box="${n.box.join(',')}"><b>${(n.k = ++k)}</b></i>`).join('')}</div>
  ${s.notes.length ? `<ol>${s.notes.map((n) => `<li value="${n.k}" class="${n.rule.includes('words-on') ? 'hot' : ''}">${esc2(n.says)}<small>${esc2(n.why)}</small></li>`).join('')}</ol>` : '<p class="ok">Nothing found.</p>'}</figure>`;
const formCard = (f) => { const total = f.states.reduce((n, s) => n + s.notes.length, 0);
  return `<section><header><h2>${esc2(f.name)}</h2><span class="${total ? 'flag' : 'clean'}">${total ? `${total} note${total === 1 ? '' : 's'}` : 'clean in every state'}</span></header><p class="why">${esc2(f.why)}</p><div class="row">${f.states.map(stateCard).join('')}</div></section>`; };
const page = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Plumber Judges the Buy Button</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Libre+Franklin:wght@400;600;700&family=Source+Serif+4:opsz,wght@8..60,400;8..60,700&display=swap">
<style>
:root { --paper: #fff; --ink: #121212; --gray: #5f5f5f; --rule: #e2e2e2; --faint: #f5f4f1; --mark: #2a6fb0; --hot: #d4622a; --ok: #2f8a57;
  --serif: "Source Serif 4", Georgia, serif; --sans: "Libre Franklin", "Helvetica Neue", Arial, sans-serif; }
@media (prefers-color-scheme: dark) { :root { --paper: #121212; --ink: #ececec; --gray: #a3a3a3; --rule: #333; --faint: #1c1c1c; --mark: #6aa6de; --hot: #ee8a5c; --ok: #6cc08d; color-scheme: dark; } }
* { box-sizing: border-box; } body { margin: 0; background: var(--paper); color: var(--ink); font-family: var(--serif); padding: 0 max(16px, env(safe-area-inset-left)) 64px; }
main { max-width: 1180px; margin: 0 auto; }
.kicker { font: 700 12px/1 var(--sans); letter-spacing: .08em; text-transform: uppercase; color: var(--gray); margin: 48px 0 12px; }
h1 { font: 700 clamp(30px, 5vw, 44px)/1.1 var(--serif); margin: 0; max-width: 820px; text-wrap: balance; }
.dek { font: 400 19px/1.5 var(--serif); color: var(--gray); max-width: 760px; margin: 14px 0 26px; }
.legend { font: 400 13.5px/1.5 var(--sans); color: var(--gray); border-top: 1px solid var(--rule); padding-top: 12px; margin-bottom: 30px; }
.legend b { display: inline-block; width: 16px; height: 16px; border-radius: 8px; color: #fff; font: 700 10px/16px var(--sans); text-align: center; vertical-align: -3px; margin: 0 4px 0 0; }
section { border-top: 2px solid var(--ink); padding: 14px 0 28px; }
header { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; }
h2 { font: 700 22px/1.2 var(--serif); margin: 0; }
header span { font: 600 12px/1 var(--sans); padding: 4px 9px; border-radius: 99px; }
.flag { background: color-mix(in oklab, var(--hot) 15%, transparent); color: var(--hot); } .clean { background: color-mix(in oklab, var(--ok) 15%, transparent); color: var(--ok); }
.why { font: 400 15px/1.5 var(--serif); color: var(--gray); margin: 6px 0 14px; max-width: 760px; }
.row { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; }
figure { margin: 0; min-width: 0; } figcaption { font: 700 11.5px/1 var(--sans); letter-spacing: .06em; text-transform: uppercase; color: var(--gray); margin-bottom: 8px; }
.frame { position: relative; background: var(--faint); border-radius: 6px; overflow: hidden; } .frame img { display: block; width: 100%; height: auto; }
.mark { position: absolute; border: 1.5px solid var(--mark); border-radius: 4px; } .mark b { position: absolute; top: -1px; left: -1px; min-width: 16px; height: 16px; border-radius: 8px; background: var(--mark); color: #fff; font: 700 10px/16px var(--sans); text-align: center; font-style: normal; }
.mark.hot { border-color: var(--hot); } .mark.hot b { background: var(--hot); }
ol { margin: 10px 0 0; padding-left: 20px; font: 400 13.5px/1.45 var(--sans); } li { margin-bottom: 6px; } li small { display: block; color: var(--gray); font-size: 12px; } li.hot { color: var(--hot); font-weight: 600; } li.hot small { font-weight: 400; }
.ok { font: 600 13px var(--sans); color: var(--ok); margin: 10px 0 0; }
.method { border-top: 1px solid var(--rule); margin-top: 36px; padding-top: 6px; font: 400 15px/1.55 var(--serif); max-width: 760px; } .method h2 { font: 700 17px/1.3 var(--sans); margin: 14px 0 8px; }
</style></head><body><main>
<p class="kicker">React Plumber · the generator</p>
<h1>How plumber judges every form of ${esc2(title.replace(/^[^:]+:\s*/, ''))}</h1>
<p class="dek">Each form of the button is used the way a person would use it: left alone, pointed at, pressed or held halfway, then finished. At each moment plumber’s whole engine runs on the live page and judges what is drawn right then, moving parts included.</p>
<p class="legend"><b style="background:var(--mark)">1</b>a plumber note, on the element it is about &nbsp; <b style="background:var(--hot)">2</b>the rule that words follow their ground: a fill or layer passing under words takes their contrast with it</p>
${judged.map(formCard).join('')}
<div class="method"><h2>How this is made</h2><p>The forms are library buttons (Arc, beUI) redrawn in the product’s own look. A script drives each through its gesture in a browser and runs plumber’s engine in its “now” mode, which judges moving elements as they are drawn at that moment instead of waiting for them to settle. The notes are plumber’s own, in its own words. Built by <code>generator/data/judge-show.mjs all</code>.</p></div>
</main>
<script>
// marks sit on the element each note is about, scaled with the screenshot
function place() { for (const f of document.querySelectorAll('.frame')) { const img = f.querySelector('img'); const k = img.clientWidth / (img.naturalWidth / 2 || 1);
  for (const m of f.querySelectorAll('.mark')) { const [x, y, w, h] = m.dataset.box.split(',').map(Number); Object.assign(m.style, { left: x * k + 'px', top: y * k + 'px', width: w * k + 'px', height: h * k + 'px' }); } } }
addEventListener('load', place); addEventListener('resize', place);
</script></body></html>`;
const { mkdir, writeFile } = await import('node:fs/promises');
const out = `${here}../../web/public/research/${atom === 'buy' ? 'atom-judging' : `atom-judging-${atom}`}.html`;
await mkdir(`${here}../../web/public/research`, { recursive: true });
await writeFile(out, page);
console.log(out.replace(/.*\/web\//, 'web/'));
stop();
