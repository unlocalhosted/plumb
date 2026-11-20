// Plumber judging one form of an atom at each state of its gesture: the full craft engine on the live page, at rest,
// pointed at, mid-gesture and done. Prints the findings per state.
//   node generator/data/judge-probe.mjs <form id> [atom]   (the product's playground running on 4399)
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const here = fileURLToPath(new URL('./', import.meta.url));
const [form = 'beui/slide-action-button', atom = 'buy'] = process.argv.slice(2);
const engine = (await readFile(`${here}../reads/craft.iife.js`, 'utf8')).replaceAll('{}.url', '"http://plumb.invalid/overlay/src/craft.js"');
const JUDGE = (form) => {
  const stage = document.querySelector(`[data-form="${form}"] .atom-stage`);
  const els = [stage, ...stage.querySelectorAll('*')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
  const craft = new PlumbCraft.Craft({ now: true, theme: new PlumbCraft.Theme({ decisions: () => [] }) });
  return craft.enrich(els.map((el, i) => ({ id: i, el, marks: [], dims: {}, file: 'atom', line: 1, column: 1 })))
    .flatMap((i) => i.marks.filter((m) => m.family === 'craft').map((m) => ({ rule: m.rule, what: m.title ?? m.what, on: (i.el.textContent || i.el.tagName).trim().slice(0, 30) })));
};
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 1100 }, deviceScaleFactor: 2 });
await p.goto(`http://localhost:4399/atoms.html?atom=${atom}`, { waitUntil: 'networkidle' }); await p.waitForTimeout(2500);
await p.addScriptTag({ content: engine });
const stage = p.locator(`[data-form="${form}"] .atom-stage`); await stage.scrollIntoViewIfNeeded(); await p.waitForTimeout(300);
const t = await p.evaluate((form) => { const s = document.querySelector(`[data-form="${form}"] .atom-stage`); const e = s.querySelector('button,[role=button]'); const r = e.getBoundingClientRect(), S = s.firstElementChild.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: S.width }; }, form);
const show = (state, f) => console.log(`${state}:\n${f.length ? f.map((x) => `   ${x.rule} — ${x.what}  [on “${x.on}”]`).join('\n') : '   nothing'}`);
show('rest', await p.evaluate(JUDGE, form));
const gesture = await p.evaluate((form) => document.querySelector(`[data-form="${form}"]`).dataset.gesture, form);
await p.mouse.move(t.x, t.y); await p.mouse.down();
if (gesture === 'slide') { for (let i = 1; i <= 12; i++) { await p.mouse.move(t.x + (t.w * 0.45 * i) / 12, t.y); await p.waitForTimeout(25); } }
else await p.waitForTimeout(gesture === 'hold' ? 550 : 120);
await p.waitForTimeout(150); await stage.screenshot({ path: `${here}../shots/judge-probe-mid.png` });
show('mid-gesture (held halfway)', await p.evaluate(JUDGE, form));
await p.mouse.up(); await b.close();
