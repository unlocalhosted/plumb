// How each form of an atom does as an interaction, judged against published standards (standards.mjs): every form is
// used for real in a browser, four ways, and what is measured decides each standard.
//   1 the whole gesture, recorded frame by frame: when it first answers, how long it moves after you let go, and what
//     plumber finds every tenth of a second (words losing their ground, contrast)
//   2 started and abandoned (let go early, slid away, Escape): does it take it back
//   3 the keyboard alone: can it be done without a pointer
//   4 the whole gesture again with reduced motion asked for: does its motion calm down
//   node generator/data/interaction-judge.mjs [atom]   (the product's playground on 4399, started if needed)
//     → generator/playground/atoms/verdicts/<product>-<atom>.json
import { chromium } from 'playwright';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { STANDARDS, MOMENTS } from './standards.mjs';
const here = fileURLToPath(new URL('./', import.meta.url));
const [atom = 'buy', mode = 'light'] = process.argv.slice(2);
const product = { start: 'algorecall', copy: 'plumber' }[atom] ?? 'craftingattention';
const moment = MOMENTS[`${product}/${atom}`];
const DEV = `${process.env.HOME}/.claude/bin/dev-server`, PG = `${here}../playground/${product}`;
const PORT = { algorecall: 4398, plumber: 4397 }[product] ?? 4399; // each product's playground on its own port (as generator/style/read.mjs)
const up = async () => { try { return (await fetch(`http://localhost:${PORT}/atoms.html`)).ok; } catch { return false; } };
const started = !(await up());
if (started) {
  const root = { algorecall: '/Users/vijaysingh/unlocalhosted/algorecall', plumber: '/Users/vijaysingh/unlocalhosted/crafting-ui' }[product] ?? '/Users/vijaysingh/unlocalhosted/craftingattention/app';
  execFileSync(DEV, [PG, `${root}/node_modules/.bin/vite`, '--config', 'vite.config.mjs', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
  for (let i = 0; i < 40 && !(await up()); i++) await new Promise((r) => setTimeout(r, 750));
}
const engine = (await readFile(`${here}../reads/craft.iife.js`, 'utf8')).replaceAll('{}.url', '"http://plumb.invalid/overlay/src/craft.js"');
const URL_ = `http://localhost:${PORT}/atoms.html?atom=${atom}${mode === 'dark' ? '&mode=dark' : ''}`;

// ── in the page: a recorder on one form's stage ─────────────────────────────────────────────────────────────────
const RECORD = ({ form, done }) => {
  const stage = document.querySelector(`[data-form="${form}"] .atom-stage`);
  const S = () => stage.getBoundingClientRect();
  const craft = new PlumbCraft.Craft({ now: true, theme: new PlumbCraft.Theme({ decisions: () => [] }) });
  // where things are and how they look, apart: motion is what moves, look is what recolours
  const sig = () => { let motion = '', look = ''; const s = S();
    // the page's own gesture view (gesture.js) paints into the stage after you let go: it is the tool, not the button
    for (const el of stage.querySelectorAll('*')) { if (el.closest('.scrub-paint, .scrub, .still-paint')) continue; const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
      motion += `${Math.round(r.x - s.x)},${Math.round(r.y - s.y)},${Math.round(r.width)},${Math.round(r.height)},${cs.transform},${cs.translate},${cs.scale},${cs.clipPath}|`;
      look += `${cs.backgroundColor},${cs.color},${(+cs.opacity).toFixed(2)},${cs.visibility}|`; }
    return { motion, look }; };
  const judge = () => { const s = S();
    const els = [stage, ...stage.querySelectorAll('*')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !e.closest('.scrub-paint, .scrub, .still-paint'); });
    return craft.enrich(els.map((el, i) => ({ id: i, el, marks: [], dims: {}, file: 'atom', line: 1, column: 1 })))
      .flatMap((i) => i.marks.filter((m) => /words-on-layers|contrast/.test(m.rule)).map((m) => ({ rule: m.rule, says: m.title ?? m.what ?? '', share: m.craft?.evidence?.share ?? null }))); };
  const rec = window.__rec = { t0: performance.now(), base: sig(), prev: null, down: null, up: null, firstChange: null, motionAfterUp: [], progressAfterUp: [], doneAt: null, verdicts: [], clicks: 0, stop: false };
  rec.prev = rec.base; rec.sawDone = false;
  stage.addEventListener('click', () => rec.clicks++, true);
  addEventListener('pointerdown', () => { rec.down = performance.now() - rec.t0; rec.base = sig(); rec.prev = rec.base; }, true);
  addEventListener('pointerup', () => { rec.up = performance.now() - rec.t0; }, true);
  let lastJudge = -1e9;
  const tick = () => { if (rec.stop) return;
    const t = performance.now() - rec.t0, now = sig();
    // the done words count only once they can be seen: some forms keep them on the page, faded out, from the start
    if (!rec.sawDone) { const w = document.createTreeWalker(stage, NodeFilter.SHOW_TEXT);
      for (let n; (n = w.nextNode());) { if (!done.some((x) => x && n.textContent.includes(x))) continue;
        let o = 1; for (let e = n.parentElement; e && e !== stage.parentElement; e = e.parentElement) { const cs = getComputedStyle(e); o *= +cs.opacity; if (cs.visibility === 'hidden' || cs.display === 'none') o = 0; }
        if (o > 0.6 && n.parentElement.getBoundingClientRect().width > 0) { rec.sawDone = true; break; } } }
    if (rec.down != null && rec.firstChange == null && (now.motion !== rec.base.motion || now.look !== rec.base.look)) rec.firstChange = t - rec.down;
    if (rec.sawDone && rec.doneAt == null) rec.doneAt = t;
    // motion that goes on while the button says it is waiting (its done words on screen, half a second on) is a progress
    // indicator, not the control's own transition: Material and Apple let it run as long as the wait
    if (rec.up != null && now.motion !== rec.prev.motion) (rec.doneAt != null && t > rec.doneAt + 500 ? rec.progressAfterUp : rec.motionAfterUp).push(t - rec.up);
    rec.prev = now;
    if (rec.down != null && t - lastJudge >= 100) { lastJudge = t; rec.verdicts.push({ t: t - rec.down, phase: rec.up == null ? (t - rec.down < 150 ? 'as it is pressed' : 'mid-gesture') : t - rec.up < 500 ? 'just after letting go' : 'once it is done', findings: judge() }); }
    requestAnimationFrame(tick); };
  // plumber at rest, before anything is touched
  rec.rest = judge();
  requestAnimationFrame(tick);
};
const STATE = (form) => { const s = document.querySelector(`[data-form="${form}"] .atom-stage`); return { text: s.innerText.replace(/\s+/g, ' ').trim(), clicks: window.__rec?.clicks ?? 0, sawDone: window.__rec?.sawDone ?? false, buttons: [...s.querySelectorAll('button')].map((x) => x.innerText.trim()) }; };

const b = await chromium.launch();
const open = async (opts = {}) => {
  const p = await b.newPage({ viewport: { width: 1280, height: 1100 }, ...opts });
  await p.addInitScript(() => { window.__judging = true; });
  await p.goto(URL_, { waitUntil: 'load', timeout: 60000 }); await p.waitForSelector('[data-form="native/sheen"] button, [data-form] .atom-stage > *', { timeout: 30000 }); await p.waitForTimeout(2200);
  await p.addScriptTag({ content: engine });
  return p;
};
const where = async (p, form) => { await p.locator(`[data-form="${form}"] .atom-stage`).scrollIntoViewIfNeeded(); await p.waitForTimeout(250);
  return p.evaluate((form) => { const s = document.querySelector(`[data-form="${form}"] .atom-stage`); const e = s.querySelector('button,[role=button],[role=slider],a') ?? s.firstElementChild;
    const r = e.getBoundingClientRect(), W = s.firstElementChild.getBoundingClientRect();
    // the part you press: what is under the press point, up to its control
    const hit = document.elementFromPoint(r.x + Math.min(r.width / 2, 24), r.y + r.height / 2); const c = hit?.closest('button,[role=button],[role=slider],a') ?? hit; const h = c.getBoundingClientRect();
    return { x: r.x + Math.min(r.width / 2, r.height / 2 + 4), cx: r.x + r.width / 2, y: r.y + r.height / 2, w: W.width, left: W.x, target: [Math.round(h.width), Math.round(h.height)] }; }, form); };
// the whole gesture, as a person would do it
async function gesture(p, form, kind, t) {
  const x0 = kind === 'slide' ? t.x : t.cx;
  await p.mouse.move(x0, t.y - 160); await p.waitForTimeout(200);
  await p.mouse.move(x0, t.y, { steps: 5 }); await p.waitForTimeout(350);
  await p.mouse.down();
  if (kind === 'slide') for (let i = 1; i <= 24; i++) { await p.mouse.move(x0 + ((t.left + t.w - 8 - x0) * i) / 24, t.y); await p.waitForTimeout(22); }
  else await p.waitForTimeout(kind === 'hold' ? 1700 : 90);
  await p.mouse.up();
  if (kind === 'confirm') { await p.waitForTimeout(500); await p.locator(`[data-form="${form}"] button`, { hasText: /^Yes$/ }).click().catch(() => {}); }
  await p.waitForTimeout(1600);
}
const committed = (before, after, kind, atomDef) => {
  if (/^(press|answer|lean)$/.test(kind)) return after.clicks > before.clicks;
  return after.sawDone;
};

const forms = await (async () => { const p = await open(); const f = await p.evaluate(() => [...document.querySelectorAll('[data-form]')].map((e) => ({ id: e.dataset.form, kind: e.dataset.gesture, name: e.querySelector('h3').textContent })));
  // the colours a deliberate form's progress is drawn in: the stronger fill over the action fill
  const colours = await p.evaluate(() => { const s = document.querySelector('[data-form="house"] .atom-stage'), cs = getComputedStyle(s);
    const c = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    const rgb = (v) => { c.clearRect(0, 0, 1, 1); c.fillStyle = '#000'; c.fillStyle = v; c.fillRect(0, 0, 1, 1); return [...c.getImageData(0, 0, 1, 1).data].slice(0, 3); };
    return { fill: rgb(cs.getPropertyValue('--atom-fill').trim()), deep: rgb(cs.getPropertyValue('--atom-deep').trim()) }; });
  await p.close(); return f.map((x) => ({ ...x, colours })); })();
const atomDef = (await import(`${here}../products/${product}.mjs`)).default?.atoms?.find((a) => a.id === atom) ?? (await import(`${here}../products/${product}.mjs`)).product?.atoms?.find((a) => a.id === atom) ?? { doneLabel: 'One moment', readyLabel: 'Done' };

const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return Math.round(((x + 0.05) / (y + 0.05)) * 100) / 100; };

const out = [];
async function measure(f) {
  const kind = f.kind === 'press' && f.id === 'house' ? 'press' : f.kind;
  const m = { form: f.id, name: f.name, kind };
  // 1 the whole gesture
  let p = await open(); let t = await where(p, f.id);
  await p.evaluate(RECORD, { form: f.id, done: [atomDef.doneLabel, atomDef.readyLabel] }); let before = await p.evaluate(STATE, f.id);
  await gesture(p, f.id, kind, t);
  let after = await p.evaluate(STATE, f.id);
  const rec = await p.evaluate(() => { window.__rec.stop = true; const r = window.__rec; return { firstChange: r.firstChange, motionAfterUp: r.motionAfterUp, progressAfterUp: r.progressAfterUp, verdicts: r.verdicts, rest: r.rest }; });
  m.target = t.target; m.firstMs = rec.firstChange == null ? null : Math.round(rec.firstChange);
  m.motionMs = rec.motionAfterUp.length ? Math.round(Math.max(...rec.motionAfterUp)) : 0;
  m.progressMs = rec.progressAfterUp.length ? Math.round(Math.max(...rec.progressAfterUp)) : 0;
  m.commits = committed(before, after, kind, atomDef);
  // the worst moment for the words: words losing their ground outrank plain contrast, then how much of the words
  // a fault that lasts under 150 ms (one reading in a tenth of a second, as a label swaps) is gone before anyone could
  // read the words anyway: only a run of readings that holds that long counts. At rest the button stays, so it counts.
  const lasting = rec.verdicts.map((v, i, a) => {
    if (!v.findings.length) return v;
    let s = i; while (s > 0 && a[s - 1].findings.length) s--;
    let e = i; while (e < a.length - 1 && a[e + 1].findings.length) e++;
    const until = e < a.length - 1 ? a[e + 1].t : a[e].t + 100;
    return until - a[s].t >= 150 ? v : { ...v, findings: [] };
  });
  const all = [{ t: 0, phase: 'at rest', findings: rec.rest }, ...lasting];
  const bad = all.flatMap((v) => v.findings.map((x) => ({ ...x, t: v.t, phase: v.phase })));
  bad.sort((a, b) => (/words-on/.test(b.rule) - /words-on/.test(a.rule)) || ((b.share ?? 0) - (a.share ?? 0)));
  m.words = bad[0] ? { when: bad[0].phase.charAt(0).toUpperCase() + bad[0].phase.slice(1), says: bad[0].says, rule: bad[0].rule, at: Math.round(bad[0].t), moments: new Set(bad.map((x) => x.phase)).size } : null;
  await p.close();
  // 2 started, then abandoned
  if (kind !== 'answer' && kind !== 'lean' || true) {
    p = await open(); t = await where(p, f.id); await p.evaluate(RECORD, { form: f.id, done: [atomDef.doneLabel, atomDef.readyLabel] }); before = await p.evaluate(STATE, f.id);
    const x0 = kind === 'slide' ? t.x : t.cx;
    await p.mouse.move(x0, t.y, { steps: 4 }); await p.waitForTimeout(250); await p.mouse.down();
    if (kind === 'slide') { for (let i = 1; i <= 10; i++) { await p.mouse.move(x0 + (t.w * 0.4 * i) / 10, t.y); await p.waitForTimeout(22); } await p.mouse.up(); }
    else if (kind === 'hold') { await p.waitForTimeout(450); await p.mouse.up(); }
    else if (kind === 'confirm') { await p.mouse.up(); await p.waitForTimeout(500); await p.keyboard.press('Escape'); }
    else { await p.mouse.move(x0, t.y + 140, { steps: 6 }); await p.mouse.up(); } // slid off before letting go
    await p.waitForTimeout(1600); after = await p.evaluate(STATE, f.id);
    m.backsOut = !committed(before, after, kind, atomDef) && (kind !== 'confirm' || after.text === before.text || /cancel/i.test(after.text));
    if (kind === 'confirm' && !m.backsOut) { m.backsOut = after.buttons.some((x) => /not yet|cancel/i.test(x)); m.afterEscape = after.text; m.backsOutBy = 'its Not yet button'; }
    await p.close();
  }
  // 3 the keyboard alone
  p = await open(); await where(p, f.id); await p.evaluate(RECORD, { form: f.id, done: [atomDef.doneLabel, atomDef.readyLabel] }); before = await p.evaluate(STATE, f.id);
  const focused = await p.evaluate((form) => { const e = document.querySelector(`[data-form="${form}"] .atom-stage`).querySelector('button,[role=button],[role=slider],a,[tabindex]'); e?.focus(); return !!e && document.activeElement === e; }, f.id);
  if (focused) {
    if (kind === 'hold') { await p.keyboard.down('Enter'); await p.waitForTimeout(1800); await p.keyboard.up('Enter'); await p.waitForTimeout(300);
      if (!committed(before, await p.evaluate(STATE, f.id), kind, atomDef)) { await p.keyboard.down(' '); await p.waitForTimeout(1800); await p.keyboard.up(' '); } }
    else { await p.keyboard.press('Enter'); if (kind === 'confirm') { await p.waitForTimeout(500); await p.keyboard.press('Tab'); await p.keyboard.press('Enter'); } }
    await p.waitForTimeout(1400);
  }
  after = await p.evaluate(STATE, f.id);
  m.keyboard = focused && (committed(before, after, kind, atomDef) || (kind === 'confirm' && after.text !== before.text));
  m.focusable = focused;
  await p.close();
  // 4 reduced motion
  // twice, keeping the smaller: a page that hiccups under the recorder (a reload, a late font) can only add motion
  m.reducedMotionMs = Infinity;
  for (let k = 0; k < 2 && m.reducedMotionMs > 0; k++) {
    p = await open({ reducedMotion: 'reduce' }); t = await where(p, f.id); await p.evaluate(RECORD, { form: f.id, done: [atomDef.doneLabel, atomDef.readyLabel] });
    await gesture(p, f.id, kind, t);
    m.reducedMotionMs = Math.min(m.reducedMotionMs, await p.evaluate(() => { window.__rec.stop = true; const a = [...window.__rec.motionAfterUp, ...window.__rec.progressAfterUp]; return a.length ? Math.round(Math.max(...a)) : 0; }));
    await p.close();
  }
  if (kind === 'slide' || kind === 'hold') m.progressRatio = ratio(f.colours.fill, f.colours.deep);
  return m;
}
for (const f of forms) {
  // a page that reloads under the recorder (the dev server's doing, not the form's) gets one more go
  let m; try { m = await measure(f); } catch (e) { console.log(`${f.name}: again (${e.message.split('\n')[0]})`); m = await measure(f); }
  out.push(m);
  console.log(`${f.name}: answers ${m.firstMs} ms · moves ${m.motionMs} ms + progress ${m.progressMs} ms (reduced ${m.reducedMotionMs}) · commits ${m.commits} · backs out ${m.backsOut} · keyboard ${m.keyboard} · target ${m.target.join('×')}${m.words ? ` · words: ${m.words.when}, ${m.words.says}` : ''}`);
}
await b.close();
if (started) try { execFileSync(DEV, ['--stop', PG], { stdio: 'ignore' }); } catch {}

// a fault the shipped button already has, in the same words at rest, is the product's, not the form's: every form wears
// the shipped skin, so it would count against all of them alike. The shipped card keeps it; the forms note it.
const shippedWords = out.find((x) => x.form === 'house')?.words;
// the same for size: a form drawn at the shipped button's own height, when that height is under the bar, keeps the
// product's size, which is the product's decision (React Plumber's Copy is 32px tall on a desktop page)
const shippedTarget = out.find((x) => x.form === 'house')?.target;
for (const m of out) if (m.form !== 'house' && shippedTarget && Math.min(...shippedTarget) < 44 && Math.abs(m.target[1] - shippedTarget[1]) <= 1 && m.target[0] >= 44) m.sizeFromProduct = `${shippedTarget[1]}px tall, as shipped`;
for (const m of out) if (m.form !== 'house' && shippedWords && m.words?.says === shippedWords.says && m.words.when === shippedWords.when) { m.inherited = m.words; m.words = null; }

// ── the verdicts ────────────────────────────────────────────────────────────────────────────────────────────────
const EFFORT = { press: 'press', answer: 'press', lean: 'press', confirm: 'confirm', hold: 'deliberate', slide: 'deliberate' };
const fitFor = (m) => {
  const e = EFFORT[m.kind];
  if (moment.stakes === 'low' || moment.confirmedLater) {
    if (e === 'press') return { ok: true, fit: `One press is right here: ${moment.confirmedLater ?? 'nothing is lost if it was a slip'}.` };
    return { ok: false, misfit: `It asks for ${e === 'confirm' ? 'a second press' : 'a deliberate gesture'} before ${moment.confirmedLater ? 'a step that asks again' : 'something easy to undo'}: ${moment.confirmedLater}, so the customer is made to commit twice.`,
      fixFit: 'Let one press open the next step; keep the ceremony for where the commitment really happens.' };
  }
  if (e === 'press') return { ok: false, misfit: 'One press commits something that can’t be undone; a slip costs the customer.', fixFit: 'Show what is about to happen and ask once, where they pressed.' };
  return { ok: true, fit: 'The deliberate step matches what is at stake.' };
};
const check = (s, m) => {
  if (s.appliesTo && !s.appliesTo.includes({ slide: 'threshold', hold: 'held-time', confirm: 'confirm' }[m.kind])) return null;
  switch (s.id) {
    case 'answers-at-once': return m.firstMs == null ? { ok: false, m: { firstMs: '1000+' } } : { ok: m.firstMs <= 100, m: { firstMs: m.firstMs } };
    case 'words-stay-readable': return { ok: !m.words, m: m.words ?? {} };
    case 'progress-shows': return { ok: m.progressRatio >= 3, m: { ratio: m.progressRatio } };
    case 'can-back-out': return { ok: !!m.backsOut, m: {} };
    case 'no-drag-needed': return { ok: !!m.keyboard, m: {} };
    case 'big-enough': return { ok: Math.min(...m.target) >= 44 || !!m.sizeFromProduct, m: { size: `${m.target[0]}×${m.target[1]} px`, ...(m.sizeFromProduct ? { fromProduct: m.sizeFromProduct } : {}) } };
    case 'motion-purposeful': { const all = Math.max(m.motionMs, m.progressMs ?? 0); const reduced = all < 150 || m.reducedMotionMs <= all * 0.4; // 500 ms is Material's upper bound; one frame (16 ms) is the recorder's own reading error
      return { ok: reduced && m.motionMs <= 516, m: { reduced, longestMs: m.motionMs } }; }
    case 'friction-fits-stakes': { const f = fitFor(m); return { ok: f.ok, m: f }; }
  }
};
const say = (v, m) => (typeof v === 'function' ? v(m) : v);
const verdicts = out.map((m) => {
  const results = STANDARDS.map((s) => { const r = check(s, m); if (!r) return null;
    return { id: s.id, name: s.name, severity: s.severity, ok: r.ok, says: r.ok ? say(s.holds, r.m) : say(s.fails, r.m), fix: r.ok ? null : say(s.fix, r.m), principle: s.principle, sources: s.sources, checked: s.checked }; }).filter(Boolean);
  const breaks = results.filter((r) => !r.ok && r.severity === 'breaks'), weakens = results.filter((r) => !r.ok && r.severity === 'weakens');
  const verdict = breaks.length ? 'breaks' : weakens.length ? 'needs-work' : 'works';
  return { ...m, verdict, results, score: breaks.length * 10 + weakens.length };
});
// which to choose: nothing that breaks for anyone, then the fewest weaknesses, then the effort that fits the moment
const ranked = [...verdicts].sort((a, b) => a.score - b.score);
const pick = ranked[0], runner = ranked.find((v) => v !== pick && v.form !== 'house');
const choose = { form: pick.form, name: pick.name,
  why: `For ${moment.name}, ${pick.name.toLowerCase()} ${pick.verdict === 'works' ? 'meets every standard it is held to' : `breaks nothing and has the fewest things to fix (${pick.results.filter((r) => !r.ok).length})`}.${pick.results.find((r) => r.id === 'friction-fits-stakes')?.ok ? ` ${pick.results.find((r) => r.id === 'friction-fits-stakes').says}` : ''}`,
  // the best of the new forms, for when the product wants more than what it ships
  instead: runner ? { form: runner.form, name: runner.name, why: runner.results.filter((r) => !r.ok).length ? `It has ${runner.results.filter((r) => !r.ok).length} thing${runner.results.filter((r) => !r.ok).length > 1 ? 's' : ''} to fix: ${runner.results.filter((r) => !r.ok).map((r) => r.name.charAt(0).toLowerCase() + r.name.slice(1)).join('; ')}.` : 'It meets every standard too.' } : null };
await mkdir(`${here}../playground/atoms/verdicts`, { recursive: true });
await writeFile(`${here}../playground/atoms/verdicts/${product}-${atom}${mode === 'dark' ? '-dark' : ''}.json`, JSON.stringify({ moment, choose, forms: verdicts, judged: new Date().toISOString().slice(0, 10) }, null, 1));
console.log(`\nchoose ${pick.name}: ${choose.why}`);
for (const v of verdicts) console.log(`  ${v.verdict.padEnd(10)} ${v.name}: ${v.results.filter((r) => !r.ok).map((r) => r.name).join('; ') || 'all standards met'}`);
