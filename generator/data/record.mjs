// The recorder: each form of an atom, used the way a person uses it (pointed at, then its gesture, then left to
// finish), with every element of the form sampled on every frame: where it is and how big, its scale, its opacity, its
// fill and word colours as the screen draws them, and its clip. From those traces it works out what the code only
// claims: how long each movement really takes, how far past its end it travels, how colours change, and how faint the
// words get.
//   node generator/data/record.mjs craftingattention buy   (the product's playground running on 4399)
//   → generator/data/motion-<product>-<atom>.json (the measured numbers), generator/data/traces/ (raw, local)
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { measure } from './measure.mjs';
const here = fileURLToPath(new URL('./', import.meta.url));
const [id = 'craftingattention', atom = 'buy'] = process.argv.slice(2);
const URL_ = `http://localhost:4399/atoms.html?atom=${atom}`;

// In the page: start sampling a form on every animation frame, and mark the moments of the gesture
const START = (form) => {
  const stage = document.querySelector(`[data-form="${form}"] .atom-stage`), S = stage.getBoundingClientRect();
  const g = Object.assign(document.createElement('canvas'), { width: 1, height: 1 }).getContext('2d', { willReadFrequently: true });
  const cache = new Map();
  const rgba = (v) => { if (cache.has(v)) return cache.get(v); g.clearRect(0, 0, 1, 1); g.fillStyle = 'rgba(0,0,0,0)'; g.fillStyle = v; g.fillRect(0, 0, 1, 1); const d = [...g.getImageData(0, 0, 1, 1).data]; cache.set(v, d); return d; };
  const ids = new WeakMap(); let next = 0;
  const label = (e) => { const t = [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(' ').trim(); return `${e.tagName.toLowerCase()}${t ? ` “${t.slice(0, 28)}”` : ''}${e.getAttribute('aria-hidden') ? ' (decor)' : ''}`; };
  const rec = { t0: performance.now(), frames: [], marks: [], labels: {}, on: true };
  const sample = () => {
    const t = Math.round(performance.now() - rec.t0), els = [];
    for (const e of [stage, ...stage.querySelectorAll('*')]) {
      const r = e.getBoundingClientRect(); if (r.width < 1 || r.height < 1) continue;
      if (!ids.has(e)) { ids.set(e, next); rec.labels[next] = label(e); next++; }
      const cs = getComputedStyle(e), m = cs.transform === 'none' ? null : new DOMMatrixReadOnly(cs.transform);
      els.push({ id: ids.get(e), x: +(r.x - S.x).toFixed(1), y: +(r.y - S.y).toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1),
        o: +cs.opacity, sc: m ? +Math.hypot(m.a, m.b).toFixed(3) : 1, bg: rgba(cs.backgroundColor), fg: rgba(cs.color), clip: cs.clipPath === 'none' ? null : cs.clipPath });
    }
    rec.frames.push({ t, els });
    if (rec.on) requestAnimationFrame(sample);
  };
  window.__rec = rec; requestAnimationFrame(sample);
};
const MARK = (name) => window.__rec.marks.push({ name, t: Math.round(performance.now() - window.__rec.t0) });
const STOP = () => { window.__rec.on = false; return window.__rec; };

// The gesture each kind of form takes (as the judge drives it), with the moments marked
const GESTURE = {
  press: async (p, b) => { await p.mouse.down(); await p.waitForTimeout(90); await p.mouse.up(); },
  lean: async (p, b) => { await p.mouse.move(b.x + b.w * 0.3, b.y - 40, { steps: 10 }); await p.waitForTimeout(600); await p.mouse.move(b.x, b.y, { steps: 6 }); await p.mouse.down(); await p.waitForTimeout(90); await p.mouse.up(); },
  answer: async (p) => { await p.mouse.down(); await p.waitForTimeout(90); await p.mouse.up(); await p.waitForTimeout(1500); },
  confirm: async (p, b, form) => { await p.mouse.down(); await p.mouse.up(); await p.waitForTimeout(700); await p.evaluate(MARK, 'confirm'); await p.locator(`[data-form="${form}"] button`, { hasText: /^(Yes|Pay)$/ }).evaluate((x) => x.click()); await p.waitForTimeout(1300); },
  hold: async (p) => { await p.mouse.down(); await p.waitForTimeout(1900); await p.evaluate(MARK, 'release'); await p.mouse.up(); },
  slide: async (p, b, form, box) => { await p.mouse.down(); for (let i = 1; i <= 24; i++) { await p.mouse.move(b.x + (box.width * 0.85 * i) / 24, b.y); await p.waitForTimeout(25); } await p.evaluate(MARK, 'release'); await p.mouse.up(); },
};

const browser = await chromium.launch();
const p0 = await browser.newPage(); await p0.goto(URL_, { waitUntil: 'networkidle' }); await p0.waitForTimeout(2500);
const forms = await p0.$$eval('[data-form]', (l) => l.map((e) => ({ form: e.dataset.form, gesture: e.dataset.gesture, name: e.querySelector('h3').textContent })));
await p0.close();
await mkdir(`${here}traces`, { recursive: true });
const out = [];
for (const f of forms) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1100 } });
  await page.goto(URL_, { waitUntil: 'networkidle' }); await page.waitForTimeout(2200);
  const stage = page.locator(`[data-form="${f.form}"] .atom-stage`); await stage.scrollIntoViewIfNeeded(); await page.waitForTimeout(300);
  const box = await stage.boundingBox();
  const b = await page.evaluate((form) => { const s = document.querySelector(`[data-form="${form}"] .atom-stage`); const el = s.querySelector('button,[role=button]') ?? s.firstElementChild; const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width }; }, f.form);
  await page.mouse.move(b.x, b.y - 120);
  await page.evaluate(START, f.form); await page.waitForTimeout(200);
  await page.evaluate(MARK, 'point'); await page.mouse.move(b.x, b.y, { steps: 5 }); await page.waitForTimeout(500);
  await page.evaluate(MARK, 'gesture'); await (GESTURE[f.gesture] ?? GESTURE.press)(page, b, f.form, box);
  await page.evaluate(MARK, 'let go'); await page.waitForTimeout(1600);
  const rec = await page.evaluate(STOP);
  await writeFile(`${here}traces/${id}-${atom}-${f.form.replace(/\W+/g, '-')}.json`, JSON.stringify(rec));
  out.push({ ...f, ...measure(rec) });
  console.log(`${f.name.padEnd(30)} ${rec.frames.length} frames · ${out.at(-1).movements.length} movements (${out.at(-1).motions.length} element moves) · ${out.at(-1).colours.length} colour changes`);
  await page.close();
}
await browser.close();
await writeFile(`${here}motion-${id}-${atom}.json`, JSON.stringify({ product: id, atom, recorded: '2026-11-20', forms: out }, null, 1));
console.log(`data/motion-${id}-${atom}.json`);

