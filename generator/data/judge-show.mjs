// How plumber judges a button: one form of an atom at each state of its gesture (rest, pointed at, mid-gesture, done),
// plumber's full engine run on the live page at each one, and its notes drawn on the element each is about.
//   node generator/data/judge-show.mjs <form id> [atom]   (the product's playground on 4399) → shots/judge-show-<form>.png
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const here = fileURLToPath(new URL('./', import.meta.url));
const [form = 'beui/slide-action-button', atom = 'buy'] = process.argv.slice(2);
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
await p.addScriptTag({ content: engine });
const stage = p.locator(`[data-form="${form}"] .atom-stage`); await stage.scrollIntoViewIfNeeded(); await p.waitForTimeout(300);
const name = await p.evaluate((form) => document.querySelector(`[data-form="${form}"] h3`).textContent, form);
const gesture = await p.evaluate((form) => document.querySelector(`[data-form="${form}"]`).dataset.gesture, form);
const t = await p.evaluate((form) => { const s = document.querySelector(`[data-form="${form}"] .atom-stage`); const e = s.querySelector('button,[role=button]'); const r = e.getBoundingClientRect(), W = s.firstElementChild.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: W.width }; }, form);
const states = [];
const snap = async (state) => states.push({ state, img: (await stage.screenshot()).toString('base64'), notes: await p.evaluate(JUDGE, form) });
await p.mouse.move(t.x, t.y - 200); await p.waitForTimeout(300); await snap('At rest');
await p.mouse.move(t.x, t.y, { steps: 5 }); await p.waitForTimeout(400); await snap('Pointed at');
await p.mouse.down();
if (gesture === 'slide') for (let i = 1; i <= 12; i++) { await p.mouse.move(t.x + (t.w * 0.45 * i) / 12, t.y); await p.waitForTimeout(25); } else await p.waitForTimeout(550);
await p.waitForTimeout(120); await snap('Mid-gesture (held halfway)');
if (gesture === 'slide') for (let i = 1; i <= 8; i++) { await p.mouse.move(t.x + t.w * 0.45 + (t.w * 0.55 * i) / 8, t.y); await p.waitForTimeout(25); }
else await p.waitForTimeout(1300);
await p.mouse.up(); await p.waitForTimeout(500); await snap('Done');
await b.close();
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
let k = 0;
const card = (s) => `<section><h2>${s.state}</h2><div class="frame"><img src="data:image/png;base64,${s.img}">${s.notes.map((n) => `<i class="mark ${n.rule.includes('words-on') ? 'hot' : ''}" style="left:${n.box[0]}px;top:${n.box[1]}px;width:${n.box[2]}px;height:${n.box[3]}px"><b>${(n.k = ++k)}</b></i>`).join('')}</div>
  <ol start="${s.notes[0]?.k ?? 1}">${s.notes.map((n) => `<li class="${n.rule.includes('words-on') ? 'hot' : ''}"><span>${esc(n.says)}</span><small>${esc(n.rule)}${n.why ? ` · ${esc(n.why)}` : ''}</small></li>`).join('') || '<p class="ok">Plumber finds nothing here.</p>'}</ol></section>`;
const html = `<style>body{margin:0;padding:28px;background:#f4f2ee;font:14px/1.45 -apple-system,system-ui;color:#1d1b17;width:1060px}h1{font-size:20px;margin:0 0 4px}h1+p{color:#555;margin:0 0 20px}
section{background:#fff;border-radius:12px;padding:16px 18px;margin-bottom:14px;display:grid;grid-template-columns:420px 1fr;gap:18px;align-items:start}h2{grid-column:1/-1;font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:#888;margin:0}
.frame{position:relative;width:420px;background:#faf9f7;border-radius:8px;overflow:hidden}.frame img{display:block;width:420px}
.mark{position:absolute;border:1.5px solid #2d6fb0;border-radius:4px;transform:scale(${420 / 1})}.mark b{position:absolute;top:-9px;left:-9px;width:18px;height:18px;border-radius:9px;background:#2d6fb0;color:#fff;font:700 11px/18px system-ui;text-align:center;font-style:normal}
.mark.hot{border-color:#d4622a}.mark.hot b{background:#d4622a}
ol{margin:0;padding-left:20px}li{margin:0 0 8px}li span{display:block}li small{color:#888}li.hot span{color:#b8461b;font-weight:600}.ok{color:#2f8a57;margin:0}</style>
<h1>How plumber judges “${esc(name)}”</h1><p>Plumber’s whole engine, run on the live page at each moment of the gesture, judging what is drawn right then. Each number marks the element a note is about; orange is the new rule, words follow their ground.</p>${states.map(card).join('')}`;
const b2 = await chromium.launch(); const sp = await b2.newPage({ viewport: { width: 1120, height: 900 } });
await sp.setContent(html);
// marks: scale the stage's CSS pixels to the 420px frame
await sp.evaluate(() => { for (const f of document.querySelectorAll('.frame')) { const img = f.querySelector('img'); const k = img.clientWidth / (img.naturalWidth / 2); for (const m of f.querySelectorAll('.mark')) { for (const p of ['left', 'top', 'width', 'height']) m.style[p] = parseFloat(m.style[p]) * k + 'px'; m.style.transform = 'none'; } } });
await sp.waitForTimeout(200);
const out = `${here}../shots/judge-show-${form.replace(/\W+/g, '-')}.png`;
await sp.screenshot({ path: out, fullPage: true }); await b2.close();
console.log(out.replace(`${here}../`, 'generator/'));
