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

// ── From traces to numbers ───────────────────────────────────────────────────────────────────────────────────────
// For each element and property, the runs of change: when a change starts (after which mark), how long until it
// stops, how far it went, and how far past its end it travelled before settling (overshoot, as a share of the travel).
// Colours as OKLab distance (ΔE ×100: about 2 is just visible, 10 plainly different). The words' faintest opacity.
function measure(rec) {
  const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const lab = ([r, g, b]) => { const [R, G, B] = [r, g, b].map(lin); const l = Math.cbrt(0.4122 * R + 0.5363 * G + 0.0514 * B), m = Math.cbrt(0.2119 * R + 0.6807 * G + 0.1074 * B), s = Math.cbrt(0.0883 * R + 0.2817 * G + 0.6299 * B); return [0.2105 * l + 0.7936 * m - 0.0041 * s, 1.978 * l - 2.4286 * m + 0.4506 * s, 0.0259 * l + 0.7828 * m - 0.8087 * s]; };
  const dE = (a, b) => { const [x, y] = [lab(a), lab(b)]; return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]) * 100; };
  const after = (t) => [...rec.marks].reverse().find((m) => m.t <= t) ?? { name: 'start', t: 0 };
  const series = new Map();
  for (const fr of rec.frames) for (const e of fr.els) { if (!series.has(e.id)) series.set(e.id, []); series.get(e.id).push({ t: fr.t, ...e }); }
  const motions = [], colours = [];
  const PROPS = { x: 1, y: 1, w: 1, h: 1, sc: 0.01, o: 0.02 };
  for (const [eid, s] of series) {
    for (const [prop, eps] of Object.entries(PROPS)) {
      let i = 1;
      while (i < s.length) {
        if (Math.abs(s[i][prop] - s[i - 1][prop]) <= eps * 0.2) { i++; continue; }
        // a run: from the frame before the first change to the last frame that still changes (gaps under 120ms join)
        const a = i - 1; let z = i, last = i;
        while (z < s.length && s[z].t - s[last].t < 120) { if (Math.abs(s[z][prop] - s[z - 1][prop]) > eps * 0.2) last = z; z++; }
        const from = s[a][prop], to = s[last][prop], travel = to - from;
        if (Math.abs(travel) >= eps) {
          const run = s.slice(a, last + 1).map((q) => q[prop]);
          const beyond = Math.max(0, ...run.map((q) => (travel > 0 ? q - to : to - q)));
          const m = after(s[a].t);
          // overshoot is only read on a real move: on a few pixels it is noise (a 3px wobble is not a 158% overshoot)
          const real = prop === 'o' || prop === 'sc' ? Math.abs(travel) >= 0.1 : Math.abs(travel) >= 8;
          motions.push({ el: rec.labels[eid], prop, after: m.name, startMs: s[a].t - m.t, durationMs: s[last].t - s[a].t, from: +from.toFixed(2), to: +to.toFixed(2), overshootPct: real ? +(beyond / Math.abs(travel) * 100).toFixed(1) : null });
        }
        i = last + 1;
      }
    }
    for (const prop of ['bg', 'fg']) {
      const vis = s.filter((q) => q[prop][3] > 0); if (vis.length < 2) continue;
      for (let i = 1; i < vis.length; i++) {
        if (dE(vis[i][prop], vis[i - 1][prop]) < 0.5) continue;
        let last = i; while (last + 1 < vis.length && dE(vis[last + 1][prop], vis[last][prop]) >= 0.5) last++;
        const d = dE(vis[i - 1][prop], vis[last][prop]), m = after(vis[i - 1].t);
        if (d >= 2) colours.push({ el: rec.labels[eid], prop: prop === 'bg' ? 'fill' : 'words', after: m.name, startMs: vis[i - 1].t - m.t, durationMs: vis[last].t - vis[i - 1].t, from: `rgb(${vis[i - 1][prop].slice(0, 3)})`, to: `rgb(${vis[last][prop].slice(0, 3)})`, deltaE: +d.toFixed(1) });
        i = last;
      }
    }
  }
  // the words: the faintest any of them got while the form was in use
  const words = [...series].filter(([eid]) => /“/.test(rec.labels[eid]) && !/decor/.test(rec.labels[eid]));
  const faintest = words.length ? Math.min(...words.flatMap(([, s]) => s.map((q) => q.o))) : null;
  const settle = motions.length ? Math.max(...motions.map((m) => m.durationMs)) : 0;
  // grouped: one row per moment and property, however many elements moved together (a cascade of letters is one row)
  const NAMES = { x: 'moves across', y: 'moves up or down', w: 'changes width', h: 'changes height', sc: 'scales', o: 'fades' };
  const groups = new Map();
  for (const m of motions) { const k = `${m.after}|${m.prop}`; const g = groups.get(k) ?? { after: m.after, does: NAMES[m.prop], elements: 0, firstMs: Infinity, lastMs: 0, longestMs: 0, biggest: 0, overshootPct: null }; g.elements++; g.firstMs = Math.min(g.firstMs, m.startMs); g.lastMs = Math.max(g.lastMs, m.startMs + m.durationMs); g.longestMs = Math.max(g.longestMs, m.durationMs); g.biggest = Math.max(g.biggest, +Math.abs(m.to - m.from).toFixed(2)); if (m.overshootPct != null) g.overshootPct = Math.max(g.overshootPct ?? 0, m.overshootPct); groups.set(k, g); }
  const real = motions.filter((m) => m.overshootPct != null);
  return { marks: rec.marks, movements: [...groups.values()], motions: motions.sort((a, b) => a.after.localeCompare(b.after) || a.startMs - b.startMs), colours, faintestWords: faintest, longestMovementMs: settle,
    maxOvershootPct: real.length ? Math.max(...real.map((m) => m.overshootPct)) : 0 };
}
