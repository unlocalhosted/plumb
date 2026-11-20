// The atom quality bar. Every form of an atom is driven through its states (rest, pointed at, mid-gesture, done) by
// the gesture its kind takes, and each frame is measured on what is actually drawn (its pixels), against four things a
// designer asks of any form of an action:
//   says      it still says what it does: there are words, they are drawn, and they read at 4.5:1 against what is
//             under them (WCAG 1.4.3, normal text)
//   progress  mid-gesture, the part done stands apart from the part to go at 3:1 (WCAG 1.4.11, states of a control)
//   inside    nothing it draws leaks past its own shape, its lip included
//   fits      in every state it stays inside the width the original takes: a swapped atom has the original's place,
//             and a form that grows past it pushes or covers its neighbours
//   weight    at rest it carries at least half the action colour the original does: a commit action is the one
//             strongest thing where it sits, and a form that drains its colour gives that up
// A form that fails any check in any frame is dropped, with the frame and the reason.
//   node generator/atoms-judge.mjs craftingattention buy      (the product's playground must be running on 4399)
import { chromium } from 'playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const here = fileURLToPath(new URL('./', import.meta.url));
const id = process.argv[2] ?? 'craftingattention', atomId = process.argv[3] ?? '';
const URL_ = `http://localhost:4399/atoms.html?atom=${atomId}`;
const RANK = { fits: 'It doesn’t fit where the original sat', says: 'It stops saying what it does', progress: 'You can’t see your progress', inside: 'Something leaks out of its shape', weight: 'It loses the original’s weight' };

// what the page can tell about a frame: the form's box, its words (box and ink), and how far anything paints past it
const READ = (form) => {
  const stage = document.querySelector(`[data-form="${form}"] .atom-stage`);
  // the form's own shape: past any wrapper that only holds it (no fill, no edge, no shadow of its own)
  let root = stage.firstElementChild;
  const shown = (e) => [...e.children].filter((c) => { const r = c.getBoundingClientRect(); return r.width > 2 && r.height > 2; });
  const bare = (e) => { const cs = getComputedStyle(e); return shown(e).length === 1 && cs.backgroundColor === 'rgba(0, 0, 0, 0)' && cs.boxShadow === 'none' && cs.borderTopWidth === '0px'; };
  while (bare(root)) root = shown(root)[0];
  const S = stage.getBoundingClientRect(), R = root.getBoundingClientRect();
  const visible = (e) => { for (let n = e; n && n !== stage; n = n.parentElement) { const cs = getComputedStyle(n); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.3) return false; } const r = e.getBoundingClientRect(); return r.width > 2 && r.height > 2; };
  const clipped = (e) => { const cs = getComputedStyle(e); return cs.position === 'absolute' && cs.overflow === 'hidden' && e.getBoundingClientRect().width <= 2; };
  // what of an element is seen: its box, cut by every box above it that clips (overflow, or a clip-path inset)
  const and = (a, b) => b ? { l: Math.max(a.l, b.l), r: Math.min(a.r, b.r), t: Math.max(a.t, b.t), b: Math.min(a.b, b.b) } : a;
  const seen = (e) => { const r0 = e.getBoundingClientRect(); let box = { l: r0.left, r: r0.right, t: r0.top, b: r0.bottom };
    for (let n = e; n && n !== stage; n = n.parentElement) { const cs = getComputedStyle(n), c = n.getBoundingClientRect();
      if (n !== e && cs.overflow !== 'visible') box = and(box, { l: c.left, r: c.right, t: c.top, b: c.bottom });
      const m = /^inset\(([^)]*)\)/.exec(cs.clipPath); if (m) { const v = m[1].replace(/round.*/, '').trim().split(/\s+/); const [T, R, B, L] = [v[0], v[1] ?? v[0], v[2] ?? v[0], v[3] ?? v[1] ?? v[0]];
        const px = (x, size) => (x.endsWith('%') ? parseFloat(x) / 100 * size : parseFloat(x) || 0);
        box = and(box, { t: c.top + px(T, c.height), r: c.right - px(R, c.width), b: c.bottom - px(B, c.height), l: c.left + px(L, c.width) }); } }
    return box.r - box.l > 1 && box.b - box.t > 1 ? box : null; };
  const opaque = (e) => { const m = getComputedStyle(e).backgroundColor.match(/[\d.]+/g); return m && (m.length < 4 || +m[3] > 0.5) && !/^rgba\(0, 0, 0, 0\)$/.test(getComputedStyle(e).backgroundColor); };
  const words = [...root.querySelectorAll('*')].concat(root).filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && visible(e) && !clipped(e))
    // the words' own box (their text, not the element that holds them with an icon and padding), cut to what is seen
    // of it: inside whatever clips it, and without the part a later fill covers (Arc draws its words twice, dark on
    // the button and light inside the fill, cut at the fill's edge: each copy is measured where it shows)
    .map((e) => { const rg = document.createRange(); const t = [...e.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim()); rg.selectNodeContents(t); const r = rg.getBoundingClientRect();
      let box = and({ l: r.left, r: r.right, t: r.top, b: r.bottom }, seen(e));
      for (const c of root.querySelectorAll('*')) {
        if (c.contains(e) || e.contains(c) || !(e.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING) || !opaque(c) || !visible(c)) continue;
        const v = seen(c); if (!v || v.t > box.t + 1 || v.b < box.b - 1 || v.r <= box.l || v.l >= box.r) continue;
        const left = { ...box, r: Math.min(box.r, v.l) }, right = { ...box, l: Math.max(box.l, v.r) };
        box = left.r - left.l >= right.r - right.l ? left : right;
      }
      return { t: e.textContent.trim(), ink: getComputedStyle(e).color, x: box.l - S.x, y: box.t - S.y, w: box.r - box.l, h: box.b - box.t }; })
    .filter((w) => w.w > 2 && w.h > 2);
  // painted extent: a box plus its outer shadows, cut by any box between it and the form that clips
  const shadow = (cs) => { let b = { l: 0, r: 0, t: 0, b: 0 }; for (const m of (cs.boxShadow === 'none' ? '' : cs.boxShadow).matchAll(/(-?[\d.]+)px (-?[\d.]+)px ([\d.]+)px (-?[\d.]+)px(?! inset)/g)) { const [x, y, bl, sp] = m.slice(1).map(Number); b = { l: Math.max(b.l, -x + bl + sp), r: Math.max(b.r, x + bl + sp), t: Math.max(b.t, -y + bl + sp), b: Math.max(b.b, y + bl + sp) }; } return b; };
  const ext = (e) => { const r = e.getBoundingClientRect(), s = shadow(getComputedStyle(e)); let box = { l: r.left - s.l, r: r.right + s.r, t: r.top - s.t, b: r.bottom + s.b };
    for (let n = e.parentElement; n && n !== root.parentElement; n = n.parentElement) { const cs = getComputedStyle(n); if (cs.overflow !== 'visible' || cs.clipPath !== 'none') { const c = n.getBoundingClientRect(); box = { l: Math.max(box.l, c.left), r: Math.min(box.r, c.right), t: Math.max(box.t, c.top), b: Math.min(box.b, c.bottom) }; } } return box; };
  const own = ext(root); let leak = 0, by = null;
  for (const e of root.querySelectorAll('*')) { if (!visible(e)) continue; const x = ext(e); const over = Math.max(x.r - own.r, own.l - x.l, x.b - own.b, own.t - x.t); if (over > leak + 0.5) { leak = over; by = e.tagName.toLowerCase() + (e.getAttribute('aria-label') ? ` “${e.getAttribute('aria-label')}”` : ''); } }
  const fill = getComputedStyle(stage).getPropertyValue('--atom-fill').trim();
  return { box: { x: R.x - S.x, y: R.y - S.y, w: R.width, h: R.height }, words, leak: Math.round(leak * 10) / 10, by, fill, button: (() => { const b = (root.matches('button,[role=button]') ? root : root.querySelector('button,[role=button]')) ?? root; const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, l: r.left, w: r.width }; })() };
};

// what the pixels say: run in a blank page on the frame's screenshot (deviceScaleFactor 2, so boxes are doubled)
const PIXELS = async ({ png, read }) => {
  const img = new Image(); img.src = `data:image/png;base64,${png}`; await img.decode();
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  const data = g.getImageData(0, 0, c.width, c.height).data, at = (x, y) => { const i = (Math.round(y) * c.width + Math.round(x)) * 4; return [data[i], data[i + 1], data[i + 2]]; };
  // a CSS colour as the screen draws it (oklch, color-mix and all): painted on a pixel and read back
  const one = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  const css = (s) => { one.clearRect(0, 0, 1, 1); one.fillStyle = '#000'; one.fillStyle = s; one.fillRect(0, 0, 1, 1); return [...one.getImageData(0, 0, 1, 1).data.slice(0, 3)]; };
  const lum = ([r, gg, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(gg) + 0.0722 * f(b); };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const d = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  const k = 2;
  // the colour under a box: the commonest colour in it, rounded so anti-aliasing doesn't split it
  const ground = (x, y, w, h) => { const n = new Map(); for (let j = y * k; j < (y + h) * k; j += 2) for (let i = x * k; i < (x + w) * k; i += 2) { const p = at(i, j), key = p.map((v) => v >> 3).join(); n.set(key, [(n.get(key)?.[0] ?? 0) + 1, p]); } return [...n.values()].sort((a, b) => b[0] - a[0])[0]?.[1] ?? [255, 255, 255]; };
  const words = read.words.map((w) => { const ink = css(w.ink), bg = ground(w.x, w.y, w.w, w.h); let inky = 0, all = 0;
    for (let j = w.y * k; j < (w.y + w.h) * k; j += 1) for (let i = w.x * k; i < (w.x + w.w) * k; i += 1) { const p = at(i, j); all++; if (d(p, ink) < d(p, bg) && d(p, bg) > 40) inky++; }
    return { t: w.t, drawn: inky / Math.max(1, all), contrast: Math.round(ratio(ink, bg) * 100) / 100 }; });
  // progress: the done end against the to-go end, on a line below the words
  const b = read.box, yy = (b.y + b.h * 0.86) * k, a1 = at((b.x + b.w * 0.08) * k, yy), a2 = at((b.x + b.w * 0.92) * k, yy);
  // weight: how much of the form is the action colour
  const fill = css(read.fill); let share = 0, n = 0; for (let j = b.y * k; j < (b.y + b.h) * k; j += 2) for (let i = b.x * k; i < (b.x + b.w) * k; i += 2) { n++; if (d(at(i, j), fill) < 38) share++; }
  return { words, progress: Math.round(ratio(a1, a2) * 100) / 100, fillArea: share / n * b.w * b.h };
};

// the gesture a kind of form takes, to bring it to each state; `mid` and `done` are what a person does
const STATES = {
  press: { mid: null, done: async (p, b) => { await p.mouse.click(b.x, b.y); await p.waitForTimeout(300); } },
  lean: { mid: async (p, b) => { await p.mouse.move(b.l + b.w * 0.8, b.y - 30, { steps: 6 }); await p.waitForTimeout(400); }, done: async (p, b) => { await p.mouse.click(b.x, b.y); await p.waitForTimeout(300); } },
  answer: { mid: async (p, b) => { await p.mouse.click(b.x, b.y); await p.waitForTimeout(350); }, done: async (p) => { await p.waitForTimeout(1200); } },
  confirm: { mid: async (p, b) => { await p.mouse.click(b.x, b.y); await p.waitForTimeout(650); }, done: async (p, b, form) => { await p.locator(`[data-form="${form}"] button`, { hasText: /^(Yes|Pay)$/ }).evaluate((b) => b.click()); await p.waitForTimeout(1300); } },
  hold: { mid: async (p, b) => { await p.mouse.move(b.x, b.y); await p.mouse.down(); await p.waitForTimeout(550); }, done: async (p) => { await p.waitForTimeout(900); }, progress: true },
  slide: { mid: async (p, b, form, box) => { await p.mouse.move(b.x, b.y); await p.mouse.down(); await p.mouse.move(b.x + box.w * 0.5, b.y, { steps: 12 }); await p.waitForTimeout(200); },
    done: async (p, b, form, box) => { await p.mouse.move(b.x + box.w, b.y, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(350); }, progress: true },
};

await mkdir(`${here}shots/judge`, { recursive: true });
const browser = await chromium.launch();
const helper = await browser.newPage();
const page0 = await browser.newPage(); await page0.goto(URL_, { waitUntil: "networkidle" }); await page0.waitForSelector("[data-form=\"beui/slide-action-button\"], [data-form]:nth-child(2)", { timeout: 15000 }).catch(() => {});
const title = await page0.$eval('h1', (h) => h.textContent.replace(/, in every form.*/, ''));
const forms = await page0.$$eval('[data-form]', (l) => l.map((e) => ({ form: e.dataset.form, gesture: e.dataset.gesture, name: e.querySelector('h3').textContent })));
await page0.close();
// drive one form through its states, with a patch of CSS on it (a remedy being tried), and keep its frames
const drive = async (f, patch = [], tag = '') => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1100 }, deviceScaleFactor: 2 });
  await page.goto(URL_, { waitUntil: 'networkidle' }); await page.waitForTimeout(1800);
  const sel = `[data-form="${f.form}"] [data-atom]`;
  if (patch.length) await page.addStyleTag({ content: patch.map((m) => m.css(sel)).join('\n') });
  const stage = page.locator(`[data-form="${f.form}"] .atom-stage`); await stage.scrollIntoViewIfNeeded(); await page.waitForTimeout(300);
  const G = STATES[f.gesture], frames = [];
  const frame = async (state) => { const read = await page.evaluate(READ, f.form); const buf = await stage.screenshot(); const path = `${here}shots/judge/${id}-${atomId}-${f.form.replace(/\W+/g, '-')}${tag}-${state}.png`; await writeFile(path, buf); const px = await helper.evaluate(PIXELS, { png: buf.toString('base64'), read }); frames.push({ state, read, px, path }); return read; };
  const r0 = await frame('rest');
  await page.mouse.move(r0.button.x, r0.button.y); await page.waitForTimeout(350); await frame('pointed at');
  if (G.mid) { await G.mid(page, r0.button, f.form, r0.box); await frame('mid-gesture'); }
  await G.done(page, r0.button, f.form, r0.box); await frame('done');
  await page.mouse.up().catch(() => {});
  await page.close();
  return { ...f, frames, progressKind: !!G.progress };
};

// the verdict on one run of a form, against the original
let house = null;
const judge = (r) => {
  r.fails = [];
  for (const fr of r.frames) {
    const said = fr.px.words.filter((w) => w.drawn > 0.04);
    if (!said.length) r.fails.push({ check: 'says', state: fr.state, why: `At ${fr.state} it shows no words: nothing tells you what is happening.` });
    else { const worst = said.reduce((a, b) => (a.contrast < b.contrast ? a : b)); if (worst.contrast < 4.5) r.fails.push({ check: 'says', state: fr.state, why: `At ${fr.state}, “${worst.t}” reads at ${worst.contrast}:1 against what is under it (it needs 4.5:1).` }); }
    const hidden = fr.px.words.filter((w) => w.drawn <= 0.04 && fr.read.words.find((x) => x.t === w.t));
    if (said.length && hidden.length && fr.state !== 'rest') r.fails.push({ check: 'says', state: fr.state, why: `At ${fr.state}, “${hidden[0].t}” is there but not drawn: something covers it.` });
    if (r !== house && fr.read.box.w > house.frames[0].read.box.w * 1.06 + 2) r.fails.push({ check: 'fits', state: fr.state, why: `At ${fr.state} it is ${Math.round(fr.read.box.w)}px wide where the original takes ${Math.round(house.frames[0].read.box.w)}px.` });
    if (fr.read.leak > 1) r.fails.push({ check: 'inside', state: fr.state, why: `At ${fr.state}, ${fr.read.by ?? 'a part'} paints ${fr.read.leak}px past the form’s own shape.` });
    if (fr.state === 'mid-gesture' && r.progressKind && fr.px.progress < 3) r.fails.push({ check: 'progress', state: fr.state, why: `Half way through, the done part and the part to go differ at ${fr.px.progress}:1 (it needs 3:1), so the progress barely shows.` });
  }
  const area = r.frames[0].px.fillArea / house.frames[0].px.fillArea;
  if (area < 0.5) r.fails.push({ check: 'weight', state: 'rest', why: `At rest it carries ${Math.round(area * 100)}% of the original’s action colour, so it is no longer the heaviest thing on the card.` });
  // a failure the original has too, no worse than the original's (the same check, a ratio as low or lower) is the
  // original's: it is reported once, on the original, and doesn't drop a form that only inherits it
  const ratioOf = (x) => parseFloat(x.why.match(/([\d.]+):1/)?.[1] ?? 'NaN');
  if (r !== house) r.inherited = r.fails.filter((x) => house.fails.some((h) => h.check === x.check && ratioOf(x) >= ratioOf(h) - 0.01));
  if (r !== house) r.fails = r.fails.filter((x) => !r.inherited.includes(x));
  // every failing frame stays known (the sheet marks them); the list says each check once, at its first frame
  r.frameFails = r.fails;
  const seen = new Set(); r.fails = r.fails.filter((x) => !seen.has(x.check) && seen.add(x.check));
  return r;
};

// The remedies a designer reaches for, by the check that failed. Each is a patch on the one form, in the skin's own
// colours, and says what it changes the way it would be said to a client. A remedy is kept only if the form then
// fails fewer checks and fails nothing new.
const at = (...states) => (s) => states.includes(s);
const REMEDIES = {
  says: [
    { id: 'hover-deepens', when: at('pointed at'), says: 'Pointed at, it deepens a step instead of fading, so its words keep their contrast.',
      css: (sel) => `${sel} :is(button,[role=button]):hover:not(:disabled) { background-color: color-mix(in oklab, var(--atom-fill) 80%, var(--atom-deep)) !important; }` },
    { id: 'hover-holds', when: at('pointed at'), says: 'Pointed at, it keeps its colour and answers with its lift alone, so its words never fade.',
      css: (sel) => `${sel} :is(button,[role=button]):hover { background-color: var(--atom-fill) !important; }` },
    { id: 'busy-stays-solid', when: at('mid-gesture', 'done'), says: 'While it works it stays solid instead of washing out, so what it is doing reads.',
      css: (sel) => `${sel} :is(button,[role=button]):disabled, ${sel} [aria-busy="true"], ${sel} [data-state="loading"] { opacity: 1 !important; }` },
    { id: 'words-stay', when: at('mid-gesture'), says: 'Its words stay in view while you act, instead of fading out under your finger.',
      css: (sel) => `${sel} [class*="place-items-center"] { opacity: 1 !important; }` },
  ],
  progress: [
    { id: 'deeper-trail', says: 'The part already done is drawn a clear step deeper, so your progress shows at a glance.',
      css: (sel) => `${sel} { --atom-deep: color-mix(in oklab, var(--atom-fill) 55%, black) !important; }` },
    { id: 'deepest-trail', says: 'The part already done is drawn much deeper, so your progress shows at a glance.',
      css: (sel) => `${sel} { --atom-deep: color-mix(in oklab, var(--atom-fill) 35%, black) !important; }` },
  ],
  weight: [
    { id: 'full-width', says: 'It takes the original’s full width, so the action keeps its weight on the card.',
      css: (sel) => `${sel} > *, ${sel} > * > * { width: 100% !important; min-width: 100% !important; justify-content: center !important; }` },
  ],
};

const results = [];
house = await drive(forms.find((f) => f.form === 'house')); judge(house);
results.push(house);
for (const f of forms.filter((x) => x.form !== 'house')) {
  let r = judge(await drive(f));
  r.first = r.fails; r.patch = [];
  // try the remedies for each failing check, keeping what helps, until nothing more helps
  for (let round = 0, better = true; r.fails.length && better && round < 4; round++) {
    better = false;
    for (const fail of r.fails) {
      for (const m of (REMEDIES[fail.check] ?? []).filter((m) => (!m.when || m.when(fail.state)) && !r.patch.includes(m))) {
        const t = judge(await drive(f, [...r.patch, m], `-fix${r.patch.length + 1}-${m.id}`));
        const newChecks = t.fails.filter((x) => !r.fails.some((y) => y.check === x.check));
        console.log(`  try ${m.id.padEnd(16)} on ${f.name}: ${r.frameFails.length} → ${t.frameFails.length} failing frames${newChecks.length ? `, new: ${newChecks.map((x) => x.check).join(' ')}` : ''}`);
        if (t.frameFails.length < r.frameFails.length && !newChecks.length) { t.first = r.first; t.patch = [...r.patch, m]; r = t; better = true; break; }
      }
      if (better) break;
    }
  }
  r.verdict = !r.fails.length ? (r.patch.length ? 'fixed' : 'passes') : 'dropped';
  results.push(r);
}
house.verdict = house.fails.length ? 'the original fails too' : 'the original';
await browser.close();
for (const r of results) console.log(`${r.verdict.padEnd(10)} ${r.name}${r.patch?.length ? `\n           fixed by: ${r.patch.map((m) => m.says).join(' ')}` : ''}${r.fails.map((x) => `\n           · ${RANK[x.check]}: ${x.why}`).join('')}`);
await writeFile(`${here}generated/atoms-${id}-${atomId}.json`, JSON.stringify(results.map((r) => ({ form: r.form, name: r.name, verdict: r.verdict, fails: r.fails, firstFails: r.first ?? [], fixedBy: (r.patch ?? []).map((m) => ({ id: m.id, says: m.says })), frames: r.frames.map(({ state, px, read }) => ({ state, words: px.words, progress: px.progress, leak: read.leak })) })), null, 1));

// the sheet: every frame of every form, the failing frames marked
const img = async (p) => `data:image/png;base64,${(await readFile(p)).toString('base64')}`;
const failed = (r, st) => (r.frameFails ?? r.fails).some((x) => x.state === st);
const row = async (r) => `<section class="${r.verdict === 'dropped' ? 'drop' : r.form === 'house' && r.fails.length ? 'orig' : 'ok'}"><header><b>${r.name}</b> <i>${r.verdict}</i> <code>${r.form === 'house' ? 'shipped' : r.form}</code></header><div class="frames">${(await Promise.all(r.frames.map(async (fr) => `<figure class="${failed(r, fr.state) ? 'bad' : ''}"><img src="${await img(fr.path)}"><figcaption>${fr.state}</figcaption></figure>`))).join('')}</div>${r.patch?.length ? `<p class="fix"><b>Fixed.</b> It first failed: ${r.first.map((x) => RANK[x.check].toLowerCase()).join('; ')}. ${r.patch.map((m) => m.says).join(' ')}</p>` : ''}${r.fails.length ? `<ul>${r.fails.map((x) => `<li><b>${RANK[x.check]}.</b> ${x.why}</li>`).join('')}</ul>` : '<p>Passes all five in every state.</p>'}</section>`;
const html = `<style>body{margin:0;padding:28px;background:#f4f2ee;font:14px/1.45 -apple-system,system-ui;color:#1d1b17}h1{font-size:20px;margin:0 0 4px}h1+p{margin:0 0 18px;color:#555;max-width:900px}section{background:#fff;border-radius:12px;padding:14px;margin-bottom:14px}header{margin-bottom:8px}header i{font-style:normal;margin-left:6px;color:#1a9460}.orig header i{color:#b7791f}.drop header i{color:#bf3a1e}.fix{color:#2d5f9a!important}code{font:11px ui-monospace,monospace;color:#999;margin-left:6px}.frames{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}figure{margin:0;background:#f6f4fb;border-radius:8px;padding:6px;border:2px solid transparent}figure.bad{border-color:#e0573a}img{width:100%}figcaption{font-size:12px;color:#888;text-align:center}ul{margin:10px 0 0;padding-left:18px;color:#333}p{margin:10px 0 0;color:#1a9460}</style><h1>${title}, judged in every state</h1><p>Each form is driven through its gesture and measured on its pixels: it still says what it does (4.5:1), its progress shows (3:1), nothing leaks out of its shape, it fits where the original sat, and at rest it keeps at least half the original’s weight. Red frames are where it fails. A form that failed is tried with the remedies a designer would reach for, and kept if they fix it without breaking anything else.</p>${(await Promise.all(results.map(row))).join('')}`;
const b2 = await chromium.launch(); const sp = await b2.newPage({ viewport: { width: 1400, height: 900 } });
await sp.setContent(html); await sp.waitForTimeout(300); await sp.screenshot({ path: `${here}shots/judge-${id}-${atomId}.png`, fullPage: true }); await b2.close();
console.log(`sheet: generator/shots/judge-${id}-${atomId}.png`);
