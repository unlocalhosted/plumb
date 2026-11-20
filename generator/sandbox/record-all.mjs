// Stage 3 of the button proof of concept (docs/briefs/button-poc.md): every installed part, rendered in the sandbox,
// checked that it drew something, used the way its driver says, and recorded frame by frame.
//   for each part:
//     renders   it loaded without an error and drew a shape (painted pixels on the stage, not only words)
//     gesture   hover and press; hold 2.5s; drag across; press and wait; or come near (from its extracted driver)
//     motion    the shared measure (data/measure.mjs): movements, overshoot, colour changes, how faint the words get
//     shots     the stage at rest and mid-gesture
//   node generator/sandbox/record-all.mjs [--port 4410] [--workers 4] [--only key,key]   → results.jsonl, shots/
import { chromium } from 'playwright';
import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { measure } from '../data/measure.mjs';
const here = fileURLToPath(new URL('./', import.meta.url));
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const PORT = arg('port', '4410'), WORKERS = +arg('workers', '4'), ONLY = arg('only', null)?.split(',');
const installed = JSON.parse(await readFile(`${here}installed.json`, 'utf8')).filter((x) => x.ok && (!ONLY || ONLY.includes(x.key)));
const D = Object.fromEntries(JSON.parse(await readFile(`${here}../data/buttons.json`, 'utf8')).map((r) => [r.id, r]));
const done = new Set(existsSync(`${here}results.jsonl`) ? (await readFile(`${here}results.jsonl`, 'utf8')).split('\n').filter(Boolean).map((l) => JSON.parse(l).key) : []);
const todo = installed.filter((x) => !done.has(x.key));
await mkdir(`${here}shots`, { recursive: true });
console.log(`${todo.length} to record (${done.size} already), ${WORKERS} at a time`);

// sampling every element of the stage on every frame (as data/record.mjs does for the atoms page)
const START = () => {
  const stage = document.querySelector('#stage'), S = stage.getBoundingClientRect();
  const g = Object.assign(document.createElement('canvas'), { width: 1, height: 1 }).getContext('2d', { willReadFrequently: true });
  const cache = new Map(), rgba = (v) => { if (cache.has(v)) return cache.get(v); g.clearRect(0, 0, 1, 1); g.fillStyle = 'rgba(0,0,0,0)'; g.fillStyle = v; g.fillRect(0, 0, 1, 1); const d = [...g.getImageData(0, 0, 1, 1).data]; cache.set(v, d); return d; };
  const ids = new WeakMap(); let next = 0;
  const label = (e) => { const t = [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(' ').trim(); return `${e.tagName.toLowerCase()}${t ? ` “${t.slice(0, 28)}”` : ''}${e.getAttribute('aria-hidden') ? ' (decor)' : ''}`; };
  const rec = { t0: performance.now(), frames: [], marks: [], labels: {}, on: true };
  const sample = () => { const t = Math.round(performance.now() - rec.t0), els = [];
    for (const e of [stage, ...stage.querySelectorAll('*')]) { const r = e.getBoundingClientRect(); if (r.width < 1 || r.height < 1) continue;
      if (!ids.has(e)) { ids.set(e, next); rec.labels[next] = label(e); next++; }
      const cs = getComputedStyle(e), m = cs.transform === 'none' ? null : new DOMMatrixReadOnly(cs.transform);
      els.push({ id: ids.get(e), x: +(r.x - S.x).toFixed(1), y: +(r.y - S.y).toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1), o: +cs.opacity, sc: m ? +Math.hypot(m.a, m.b).toFixed(3) : 1, bg: rgba(cs.backgroundColor), fg: rgba(cs.color), clip: cs.clipPath === 'none' ? null : cs.clipPath }); }
    if (rec.frames.length < 900) rec.frames.push({ t, els }); if (rec.on) requestAnimationFrame(sample); };
  window.__rec = rec; requestAnimationFrame(sample);
};
const MARK = (name) => window.__rec.marks.push({ name, t: Math.round(performance.now() - window.__rec.t0) });
const STOP = () => { window.__rec.on = false; const r = window.__rec; return { ...r, frames: r.frames.filter((_, i) => i % 2 === 0) }; };
// what the part draws: painted (non-background) pixels on the stage at rest, and the thing to use
const TARGET = () => {
  const stage = document.querySelector('#stage');
  const el = stage.querySelector('button, [role=button], [role=slider], a[href], [draggable=true], [tabindex="0"]') ?? stage.querySelector('[data-part] > *');
  const r = el?.getBoundingClientRect(); const S = stage.getBoundingClientRect();
  return r && r.width > 2 ? { x: r.x + r.width / 2, y: r.y + r.height / 2, l: r.left, w: r.width, h: r.height, tag: el.tagName.toLowerCase(), stageW: S.width } : null;
};

async function one(browser, x) {
  const r = D[x.id] ?? {}, out = { key: x.key, id: x.id, driver: r.driver, commitRule: r.commitRule };
  const page = await browser.newPage({ viewport: { width: 900, height: 600 }, deviceScaleFactor: 1 });
  const errors = []; page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 160)));
  try {
    await page.goto(`http://localhost:${PORT}/?part=${x.key}`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);
    const s = await page.evaluate(() => window.__sandbox ?? null);
    const rest = await page.locator('#stage').screenshot({ path: `${here}shots/${x.key}-rest.png` });
    const t = await page.evaluate(TARGET);
    // drew a shape: around the edge of the thing to use, a drawn button has a border or a fill; words alone don't
    if (t) {
      const pad = 3, clip = { x: Math.max(0, t.l - pad), y: Math.max(0, t.y - t.h / 2 - pad), width: t.w + pad * 2, height: t.h + pad * 2 };
      const shot = await page.screenshot({ clip });
      out.painted = await page.evaluate(async (b64) => { const img = new Image(); img.src = `data:image/png;base64,${b64}`; await img.decode(); const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0); const d = g.getImageData(0, 0, c.width, c.height).data, W = c.width, H = c.height; let n = 0, all = 0;
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const edge = x < 7 || x >= W - 7 || y < 7 || y >= H - 7; if (!edge) continue; all++; const k = (y * W + x) * 4; if (d[k] < 236 || d[k + 1] < 236 || d[k + 2] < 236) n++; } return +(n / all).toFixed(3); }, shot.toString('base64'));
    }
    out.renders = !!(s?.ok !== false && !errors.length && t);
    out.drewShape = (out.painted ?? 0) > 0.12;
    out.error = s?.error ?? errors[0] ?? (t ? null : 'nothing to use');
    if (!out.renders) return out;
    out.target = t.tag; out.size = [Math.round(t.w), Math.round(t.h)];
    await page.mouse.move(t.x, t.y - 150);
    await page.evaluate(START); await page.waitForTimeout(150);
    await page.evaluate(MARK, 'point'); await page.mouse.move(t.x, t.y, { steps: 5 }); await page.waitForTimeout(450);
    await page.evaluate(MARK, 'gesture');
    if (r.driver === 'position') { await page.mouse.move(t.l + 8, t.y); await page.mouse.down(); for (let i = 1; i <= 20; i++) { await page.mouse.move(t.l + 8 + (t.stageW * 0.75 * i) / 20, t.y); await page.waitForTimeout(25); } await page.locator('#stage').screenshot({ path: `${here}shots/${x.key}-mid.png` }); await page.evaluate(MARK, 'let go'); await page.mouse.up(); }
    else if (r.driver === 'time-held') { await page.mouse.down(); await page.waitForTimeout(700); await page.locator('#stage').screenshot({ path: `${here}shots/${x.key}-mid.png` }); await page.waitForTimeout(1800); await page.evaluate(MARK, 'let go'); await page.mouse.up(); }
    else if (r.driver === 'pointer-distance') { await page.mouse.move(t.x + t.w * 0.45, t.y - t.h, { steps: 8 }); await page.waitForTimeout(300); await page.locator('#stage').screenshot({ path: `${here}shots/${x.key}-mid.png` }); await page.evaluate(MARK, 'let go'); await page.mouse.click(t.x, t.y); }
    else { await page.mouse.down(); await page.waitForTimeout(90); await page.mouse.up(); await page.waitForTimeout(250); await page.locator('#stage').screenshot({ path: `${here}shots/${x.key}-mid.png` }); await page.evaluate(MARK, 'let go'); }
    await page.waitForTimeout(1500);
    const rec = await page.evaluate(STOP);
    const m = measure(rec);
    Object.assign(out, { frames: rec.frames.length, marks: m.marks, movements: m.movements, colours: m.colours.slice(0, 12), faintestWords: m.faintestWords, longestMovementMs: m.longestMovementMs, maxOvershootPct: m.maxOvershootPct, errorsDuringUse: errors.slice(0, 2) });
  } catch (e) { out.renders = false; out.error = String(e.message ?? e).slice(0, 160); }
  finally { await page.close().catch(() => {}); }
  return out;
}

const browser = await chromium.launch();
let i = 0, n = 0;
await Promise.all(Array.from({ length: WORKERS }, async () => {
  while (i < todo.length) { const x = todo[i++]; const res = await one(browser, x); await appendFile(`${here}results.jsonl`, JSON.stringify(res) + '\n');
    if (++n % 10 === 0) console.log(`${n}/${todo.length}`); }
}));
await browser.close();
console.log(`recorded ${n}`);
