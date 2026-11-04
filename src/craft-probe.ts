// Probes (docs/briefs/craft-hard-rules.md, layer 5): the page a moment after a gesture. Each family of gestures runs
// in a page of its own, so no probe colours a later reading, and every one is safe by construction:
//   · a button inside a form, a submit button, a link and a disabled control are never pressed (the page lists its own
//     candidates: overlay/src/craft-headless.js `candidates`)
//   · a press is let go away from the control, so no click follows it
//   · a navigation of the page is aborted, a request that is not a GET is aborted (it never reaches the server), a
//     dialog is dismissed and a new window is closed
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ask, desktop, open, settle, sleep, RECORDER } from './craft-page.js';
import type { Browser, Page } from './craft-page.js';

export interface ProbeRecord { gesture: string; k: string; rec: Record<string, unknown> }
export interface ProbeOptions { budget: number; drag: boolean; scope?: string; record?: string }

interface Session { page: Page; state: { armed: boolean; hold: number; fetches: number } }
interface Frame { cx: number; cy: number; x: number; y: number; w: number; h: number }
interface Anim { t: number; at: string; kind: string; name: string; duration: number; delay: number; iterations: number; props: string[] }
interface Sampled { frames: { t: number; v: Record<string, string> | null }[]; events: { type: string; t: number; at: string }[] }

/** A page of its own with the recorder in, the safety nets up, and the overlay present. */
async function session<T>(browser: Browser, url: string, timeout: number, work: (s: Session) => Promise<T>, scale = 1): Promise<T> {
  // a recorded gesture is drawn at 2×: its frames are shown zoomed in, and must stay sharp there
  const context = await browser.newContext({ viewport: desktop, reducedMotion: 'no-preference', deviceScaleFactor: scale });
  try {
    const page = await context.newPage();
    context.on('page', popup => { popup.close().catch(() => {}); });
    page.on('dialog', dialog => { dialog.dismiss().catch(() => {}); });
    await page.addInitScript({ path: RECORDER });
    const state = { armed: false, hold: 0, fetches: 0 };
    await page.route('**/*', async route => {
      const request = route.request();
      if (state.armed && request.isNavigationRequest() && request.frame() === page.mainFrame()) return route.abort().catch(() => {});
      if (['fetch', 'xhr'].includes(request.resourceType()) && !request.url().includes('/__plumb/')) {
        state.fetches++;
        if (!['GET', 'HEAD'].includes(request.method())) return route.abort().catch(() => {});
        if (state.hold) await sleep(state.hold);
      }
      await route.continue().catch(() => {});
    });
    await open(page, url, timeout, false);
    await settle(page);
    state.armed = true;
    return await work({ page, state });
  } finally { await context.close(); }
}

const frame = (page: Page, key: string) => ask<Frame | null>(page, { op: 'frame', key });
const now = (page: Page) => ask<number>(page, { op: 'now' });
const MOTION = new Set(['opacity', 'transform', 'translate', 'scale', 'rotate', 'clipPath', 'filter', 'visibility', 'height', 'width', 'maxHeight', 'top', 'left']);
/** How long the animations that move something take to finish: the longest delay plus duration. */
const finish = (list: Anim[]) => list.filter(a => Number.isFinite(a.iterations) && a.props.some(p => MOTION.has(p))).reduce<{ ms: number; at: string }>((most, a) => (a.delay + a.duration > most.ms ? { ms: a.delay + a.duration, at: a.at } : most), { ms: 0, at: '' });
const keyframed = (a: Anim) => a.kind === 'animation' && Number.isFinite(a.iterations) && a.props.some(p => MOTION.has(p));
const scaleOf = (transform: string | undefined) => { const m = /^matrix\(([^,]+),/.exec(transform ?? ''); return m ? Number(m[1]) : 1; };

// ── press (31): something changes within 100ms of the press ──
const PRESS = ['transform', 'scale', 'translate', 'rotate', 'backgroundColor', 'opacity', 'boxShadow', 'color', 'filter'];
async function press({ page }: Session, keys: string[]): Promise<ProbeRecord[]> {
  const out: ProbeRecord[] = [];
  /** One press: when did something first change, in ms after the press; null when nothing did in the 350ms it was held. */
  const once = async (k: string, f: Frame): Promise<number | null | undefined> => {
    const id = await ask<number>(page, { op: 'sample', key: k, props: PRESS, ms: 1400 });
    await page.mouse.move(f.cx, f.cy);
    await sleep(450); // hover's own transitions have finished
    await page.mouse.down();
    await sleep(350);
    const away = await now(page);
    await page.mouse.move(2, 2); // let go elsewhere: no click follows
    await page.mouse.up();
    const { frames, events } = await ask<Sampled>(page, { op: 'taken', id });
    const down = events.filter(e => e.type === 'pointerdown').at(-1)?.t;
    const rest = [...frames].reverse().find(item => down !== undefined && item.t < down && item.v);
    if (down === undefined || !rest?.v) return undefined;
    const changed = frames.find(item => item.v && item.t >= down && item.t < away && PRESS.some(p => item.v![p] !== rest.v![p]));
    return changed ? changed.t - down : null;
  };
  for (const k of keys) {
    const f = await frame(page, k);
    if (!f) continue;
    let best = await once(k, f);
    // a busy machine delays frames, and a late frame reads as a late answer: look again before calling it slow
    for (let again = 0; again < 2 && best !== undefined && (best === null || best > 100); again++) {
      const next = await once(k, f);
      if (next !== undefined && next !== null && (best === null || next < best)) best = next;
    }
    if (best !== undefined) out.push({ gesture: 'press', k, rec: { first: best } });
  }
  return out;
}

// ── toggle (68, 64): open it, close it, and close it again halfway through opening ──
async function toggle({ page }: Session, keys: string[]): Promise<ProbeRecord[]> {
  const out: ProbeRecord[] = [];
  const closed = async (k: string) => { const s = await ask<{ expanded: boolean; open: boolean }>(page, { op: 'state', key: k }); return !s.expanded && !s.open; };
  const close = async (k: string, f: Frame) => {
    await page.keyboard.press('Escape');
    await sleep(900);
    if (!await closed(k)) { await page.mouse.click(f.cx, f.cy); await sleep(900); }
  };
  for (const k of keys) {
    const f = await frame(page, k);
    if (!f) continue;
    const t0 = await now(page);
    await page.mouse.click(f.cx, f.cy);
    await sleep(900);
    const enters = await ask<Anim[]>(page, { op: 'since', t0, except: k });
    const enter = finish(enters);
    const t1 = await now(page);
    await close(k, f);
    const exit = finish(await ask<Anim[]>(page, { op: 'since', t0: t1, except: k }));
    if (!await closed(k)) { await page.keyboard.press('Escape'); continue; } // would not close: leave it alone
    let jump: { opacity: number; scale: number } | null = null, restart = false;
    if (enter.ms >= 80 && enter.at) {
      const id = await ask<number>(page, { op: 'sample', key: enter.at, props: ['opacity', 'transform'], ms: enter.ms * 2.5 + 900 });
      await page.mouse.click(f.cx, f.cy);
      await sleep(enter.ms * 0.4);
      await page.keyboard.press('Escape');
      const { frames, events } = await ask<Sampled>(page, { op: 'taken', id });
      const key = events.filter(e => e.type === 'keydown').at(-1)?.t ?? 0;
      let opacity = 0, scale = 0;
      const live = frames.filter(item => item.v && item.t >= key - 20);
      for (let i = 1; i < live.length; i++) {
        opacity = Math.max(opacity, Math.abs(Number(live[i]!.v!.opacity) - Number(live[i - 1]!.v!.opacity)));
        scale = Math.max(scale, Math.abs(scaleOf(live[i]!.v!.transform) - scaleOf(live[i - 1]!.v!.transform)));
      }
      jump = { opacity, scale };
      // keyframes are not reversible: an exit that is an animation, started while the entrance is an animation too, begins at its own first frame
      const after = await ask<Anim[]>(page, { op: 'since', t0: key - 5, except: k });
      restart = enters.some(keyframed) && after.some(keyframed);
      await sleep(400);
      await close(k, f);
    }
    const rec = { trigger: k, surface: enter.at || null, enter: enter.ms, exit: exit.ms, jump, restart };
    out.push({ gesture: 'toggle', k, rec });
    if (enter.at && enter.at !== k) out.push({ gesture: 'toggle', k: enter.at, rec });
  }
  return out;
}

// ── menus (61): the press alone opens it ──
async function menuDown({ page }: Session, keys: string[]): Promise<ProbeRecord[]> {
  const out: ProbeRecord[] = [];
  for (const k of keys) {
    const f = await frame(page, k);
    if (!f) continue;
    // a menu already open (left by the last one, or open at rest) would be closed by the press and read as no open
    for (let tries = 0; tries < 2 && (await ask<{ menus: number }>(page, { op: 'state', key: k })).menus; tries++) { await page.keyboard.press('Escape'); await sleep(300); }
    if ((await ask<{ menus: number }>(page, { op: 'state', key: k })).menus) continue;
    await page.mouse.move(f.cx, f.cy);
    await sleep(60);
    await page.mouse.down();
    await sleep(200);
    const s = await ask<{ expanded: boolean; menus: number; open: boolean }>(page, { op: 'state', key: k });
    await page.mouse.move(2, 2);
    await page.mouse.up();
    await sleep(100);
    await page.keyboard.press('Escape');
    await sleep(400);
    out.push({ gesture: 'menu-down', k, rec: { down: s.expanded || s.open || s.menus > 0 } });
  }
  return out;
}

// ── submenus (59): the pointer crosses the next item on its way to the submenu ──
type Box = { x: number; y: number; w: number; h: number; label?: string };
/** What a recorded submenu probe leaves behind (--record-probe): frames of the page and the probe's own clock, in CSS px from the scope's top-left. */
interface Recording { dir: string; scope?: string; browser: Browser }

/** Frames of the page while a gesture runs: the scoped element captured in device pixels (a 2× page gives 2× frames,
 * sharp when the stage zooms in) after each move the probe makes, each stamped with the wall clock its samples use. A
 * screencast would keep the gesture's own pace, but headless it only sends frames at 1×. */
async function snapshots(page: Page, box: Box) {
  const cdp = await page.context().newCDPSession(page);
  const shots: { at: number; data: string }[] = [];
  // headless, the clip's scale is the only way to device pixels: the page's own ratio
  const dpr = await page.evaluate(() => devicePixelRatio).catch(() => 1);
  const snap = async () => {
    const at = Date.now();
    const r = await cdp.send('Page.captureScreenshot', { format: 'png', clip: { x: box.x, y: box.y, width: box.w, height: box.h, scale: dpr } }) as { data: string };
    shots.push({ at, data: r.data });
  };
  return { shots, snap, dpr, stop: async () => { await cdp.detach().catch(() => {}); } };
}

async function submenu({ page }: Session, keys: string[], recording?: Recording): Promise<ProbeRecord[]> {
  const out: ProbeRecord[] = [];
  let recorded = false;
  type Sub = { key: string; label: string; cx: number; cy: number; h: number; menu: Box; siblings: Box[] };
  for (const k of keys) {
    const f = await frame(page, k);
    if (!f) continue;
    // a menu left open by the last one would be read as this one's
    for (let tries = 0; tries < 2 && (await ask<{ menus: number }>(page, { op: 'state', key: k })).menus; tries++) { await page.keyboard.press('Escape'); await sleep(300); }
    if ((await ask<{ menus: number }>(page, { op: 'state', key: k })).menus) continue;
    await page.mouse.click(f.cx, f.cy);
    await sleep(500);
    const sub = await ask<Sub | null>(page, { op: 'subtrigger' });
    if (sub) {
      // the recording starts before the first move, so the frames hold the menu at rest first
      const view = page.viewportSize() ?? desktop;
      const scoped = recording?.scope ? await page.evaluate((sel) => { const r = document.querySelector(sel)?.getBoundingClientRect(); return r ? { x: r.x, y: r.y, w: r.width, h: r.height } : null; }, recording.scope) : null;
      const cast = recording && !recorded ? await snapshots(page, scoped ?? { x: 0, y: 0, w: view.width, h: view.height }).catch(() => null) : null;
      await cast?.snap().catch(() => {});
      const samples: { t: number; x: number; y: number; step: number; open: boolean }[] = [];
      let t0 = 0, inner: Box | null = null, opened: { subtrigger: Box; submenu: Box; siblings: Box[] } | null = null;
      const move = async (x: number, y: number, step: number) => {
        const at = Date.now();
        if (!samples.length) t0 = at;
        await page.mouse.move(x, y);
        return { at, x, y, step };
      };
      const mark = (m: { at: number; x: number; y: number; step: number }, open: boolean) => samples.push({ t: m.at - t0, x: m.x, y: m.y, step: m.step, open });
      const hover = await move(sub.cx, sub.cy, 0);
      for (let waited = 0; !inner && waited < 1000; waited += 100) { await sleep(100); inner = await ask(page, { op: 'submenu', key: sub.key }); }
      mark(hover, !!inner);
      await cast?.snap().catch(() => {});
      if (inner && cast) {
        const item = await ask<Frame | null>(page, { op: 'rect', key: sub.key });
        opened = { subtrigger: item ? { x: item.x, y: item.y, w: item.w, h: item.h, label: sub.label } : { x: sub.cx, y: sub.cy - sub.h / 2, w: 0, h: sub.h, label: sub.label }, submenu: inner, siblings: sub.siblings };
      }
      let record: ProbeRecord | null = null;
      if (inner) {
        // from the item's middle to the submenu's far corner, over the items between; a path over no item is no test
        const inside = (px: number, py: number, r: Box) => px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
        const aim = (toY: number) => Array.from({ length: 11 }, (_, i) => ({ x: sub.cx + ((inner!.x + (inner!.x > sub.cx ? inner!.w : 0) - sub.cx) * i) / 10, y: sub.cy + ((toY - sub.cy) * i) / 10 }));
        let path = aim(inner.y + inner.h - 4);
        let crossed = sub.siblings.filter(r => path.some(p => inside(p.x, p.y, r))).length;
        if (!crossed) { path = aim(sub.cy + sub.h * 3); crossed = sub.siblings.filter(r => path.some(p => inside(p.x, p.y, r))).length; }
        if (crossed) {
          let step = -1;
          for (let i = 1; i < path.length; i++) {
            const m = await move(path[i]!.x, path[i]!.y, i);
            await sleep(25);
            const open = !!await ask(page, { op: 'submenu', key: sub.key });
            if (step < 0 && !open) step = i;
            mark(m, open);
            await cast?.snap().catch(() => {});
          }
          record = { gesture: 'submenu', k, rec: { lost: step >= 0, step, crossed } };
          out.push(record);
        }
      }
      if (cast && recording) {
        for (let i = 0; i < 3; i++) { await sleep(100); await cast.snap().catch(() => {}); } // what the page does after the last move
        await cast.stop();
        if (record && opened && samples.length) {
          recorded = true;
          const box: Box = scoped ?? { x: 0, y: 0, w: view.width, h: view.height };
          const rel = (r: Box): Box => ({ x: r.x - box.x, y: r.y - box.y, w: r.w, h: r.h, ...(r.label !== undefined ? { label: r.label } : {}) });
          // the menu at rest (taken before the first move), then the page after each move; already cropped to the scope
          const kept = cast.shots;
          const images = kept.map(s => s.data);
          await mkdir(recording.dir, { recursive: true });
          const frames = await Promise.all(images.map(async (data, i) => {
            const file = `frame-${String(i).padStart(3, '0')}.png`;
            await writeFile(join(recording.dir, file), Buffer.from(data, 'base64'));
            // the first frame is the page at rest (a screencast sends one on start), so it is not later than the first move
            return { t: i === 0 ? Math.min(0, Math.round(kept[i]!.at - t0)) : Math.round(kept[i]!.at - t0), file };
          }));
          // the ratio the frames were taken at (read again after the capture session detaches, Chromium reports 1)
          const dpr = cast.dpr;
          const pointer = samples.map(s => ({ t: s.t, x: Math.round((s.x - box.x) * 100) / 100, y: Math.round((s.y - box.y) * 100) / 100, step: s.step, open: s.open }));
          const rec = record.rec as { lost: boolean; step: number; crossed: number };
          await writeFile(join(recording.dir, 'probe.json'), JSON.stringify({
            gesture: 'submenu', trigger: k, lost: rec.lost, step: rec.step, crossed: rec.crossed, box: { w: box.w, h: box.h }, dpr,
            samples: pointer, subtrigger: rel(opened.subtrigger), submenu: rel(opened.submenu), siblings: opened.siblings.map(rel), frames,
          }, null, 2));
        }
      } else if (cast) await cast.stop();
    }
    await page.keyboard.press('Escape');
    await sleep(200);
    await page.keyboard.press('Escape');
    await sleep(400);
  }
  return out;
}

// ── tooltips (60): the wait for the first, for the next, and after a short absence ──
// a skipped wait is judged only when the pointer was away for less than the 300ms a provider keeps it off, timed on the
// page's clock from leaving the trigger to coming back (a slow machine stretches the probe's own moves; that's no reading)
const PROBE_WINDOW = 280;
async function tooltips({ page }: Session, keys: string[]): Promise<ProbeRecord[]> {
  const out: ProbeRecord[] = [];
  const first: { k: string; f: Frame; t1: number }[] = [];
  const shown = () => ask<number>(page, { op: 'tips' });
  // away in a run of small moves, as a hand does (a tooltip you can move onto only closes once the pointer has gone clear of it)
  const leave = async () => { await page.mouse.move(2, 2, { steps: 12 }); };
  const quiet = async () => {
    await leave();
    for (let waited = 0; waited < 1500 && await shown(); waited += 50) await sleep(50);
    if (await shown()) { await page.keyboard.press('Escape'); await sleep(200); }
    await sleep(700); // a wait that was skipped has been served again
  };
  let misses = 0;
  for (const k of keys) {
    if (misses >= 6) break;
    const f = await frame(page, k);
    if (!f) continue;
    await quiet();
    const wait = ask<{ ms: number } | null>(page, { op: 'tip', ms: 2000, other: false, at: k });
    await page.mouse.move(f.cx, f.cy, { steps: 4 });
    const got = await wait;
    if (!got) { misses++; continue; }
    first.push({ k, f, t1: got.ms });
  }
  await quiet();
  const lead = first[0], next = first[1];
  let t2: number | null = null, t3: number | null = null;
  if (lead) {
    // away for 100ms and back
    const wait = ask<{ ms: number } | null>(page, { op: 'tip', ms: 2000, other: false, at: lead.k });
    await page.mouse.move(lead.f.cx, lead.f.cy, { steps: 4 });
    await wait;
    await leave();
    const left = Date.now();
    for (let waited = 0; waited < 1500 && await shown(); waited += 25) await sleep(25);
    if (!await shown()) {
      await sleep(Math.max(0, 100 - (Date.now() - left)));
      const judged = (got: { ms: number; away: number | null } | null) => (got && got.away !== null && got.away < PROBE_WINDOW ? got.ms : null);
      const back = ask<{ ms: number; away: number | null } | null>(page, { op: 'tip', ms: 2000, other: true, at: lead.k, from: lead.k });
      await page.mouse.move(lead.f.cx, lead.f.cy, { steps: 4 });
      t3 = judged(await back);
      // straight from the first to the next
      if (next) {
        const across = ask<{ ms: number; away: number | null } | null>(page, { op: 'tip', ms: 2000, other: true, at: next.k, from: lead.k });
        await page.mouse.move(next.f.cx, next.f.cy, { steps: 12 });
        t2 = judged(await across);
      }
    }
  }
  for (const item of first) out.push({ gesture: 'tooltip', k: item.k, rec: { t1: item.t1, t2: item === lead ? t2 : null, t3: item === lead ? t3 : null } });
  return out;
}

// ── drag (65, opt-in): past its end, it gives or it stops dead ──
async function drag({ page }: Session, keys: string[]): Promise<ProbeRecord[]> {
  const out: ProbeRecord[] = [];
  const where = async (k: string) => (await ask<Frame | null>(page, { op: 'rect', key: k }))!;
  for (const k of keys) {
    if (!await frame(page, k)) continue; // scrolled into view once; the drag itself must not scroll
    for (const axis of ['x', 'y'] as const) {
      const f = await where(k);
      if (!f) break;
      const to = (d: number) => axis === 'x' ? [f.cx + d, f.cy] as const : [f.cx, f.cy + d] as const;
      await page.mouse.move(f.cx, f.cy);
      await page.mouse.down();
      const moved: number[] = [];
      for (const d of [40, 80, 120]) {
        await page.mouse.move(...to(d), { steps: 8 });
        await sleep(120);
        const now = await where(k);
        moved.push(axis === 'x' ? now.cx - f.cx : now.cy - f.cy);
      }
      await page.mouse.up();
      await sleep(500);
      if (Math.abs(moved[0]!) < 3) continue; // it doesn't follow on this axis
      const kind = moved[2]! - moved[0]! < 3 ? 'dead' : moved[2]! - moved[0]! >= 70 ? 'free' : 'elastic';
      out.push({ gesture: 'drag', k, rec: { kind, moved: moved.map(Math.round), past: Math.round(moved[2]! - moved[0]!) } });
      break;
    }
  }
  return out;
}

// ── keys (62): what a shortcut opens appears at once ──
async function keys({ page }: Session): Promise<ProbeRecord[]> {
  for (const combo of ['Meta+k', 'Control+k', '/', '?', 'Meta+/']) {
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur?.());
    const before = await ask<string[]>(page, { op: 'surfaces' });
    const t0 = await now(page);
    await page.keyboard.press(combo);
    await sleep(900);
    const fresh = (await ask<string[]>(page, { op: 'surfaces' })).filter(k => !before.includes(k));
    if (fresh[0]) {
      const surface = fresh[0];
      const anims = (await ask<Anim[]>(page, { op: 'since', t0 })).filter(a => a.at.startsWith(surface) || surface.startsWith(a.at));
      const site = await ask(page, { op: 'where', key: surface });
      const anchor = await ask<string>(page, { op: 'anchor' });
      await page.keyboard.press('Escape');
      return [{ gesture: 'keys', k: anchor, rec: { combo: combo.replace('Meta', '⌘').replace('Control', 'Ctrl').replace('+', ''), enter: finish(anims).ms, site } }];
    }
    await page.keyboard.press('Escape');
    await sleep(150);
  }
  return [];
}

// ── spinners (66): a press that starts a request shows its spinner after a beat, not at once ──
async function spinners({ page, state }: Session, keysIn: string[], url: string, timeout: number): Promise<ProbeRecord[]> {
  const out: ProbeRecord[] = [];
  for (const k of keysIn) {
    const f = await frame(page, k);
    if (!f) continue;
    const before = state.fetches;
    state.hold = 2000; // the reply is held: the spinner has time to show
    await page.mouse.click(f.cx, f.cy);
    await sleep(400);
    if (state.fetches === before) { state.hold = 0; continue; }
    const events = await ask<Sampled['events']>(page, { op: 'events' });
    const down = events.filter(e => e.type === 'pointerdown').at(-1)?.t;
    const shown = (await ask<number[]>(page, { op: 'spinning' })).filter(t => down !== undefined && t >= down);
    if (down !== undefined && shown.length) out.push({ gesture: 'spinner-press', k, rec: { delay: Math.min(...shown) - down } });
    // the page now waits on a held reply: start again from a fresh load
    state.armed = false; state.hold = 0;
    await page.reload({ waitUntil: 'load', timeout });
    await open(page, url, timeout, false);
    await settle(page);
    state.armed = true;
  }
  return out;
}

/** Try each gesture on what the page offers, a family at a time, and return what each did. A family that fails says nothing. */
export async function takeProbes(browser: Browser, url: string, timeout: number, options: ProbeOptions): Promise<ProbeRecord[]> {
  const quiet = (what: string) => (error: unknown) => { if (process.env.PLUMBER_DEBUG) process.stderr.write(`craft: probe ${what}: ${(error as Error).message}\n`); return [] as ProbeRecord[]; };
  const found = await session(browser, url, timeout, ({ page }) => ask<{ presses: string[]; toggles: string[]; menus: string[]; tooltips: string[]; drags: string[] }>(page, { op: 'candidates', ...(options.scope ? { scope: options.scope } : {}) }))
    .catch((error: unknown) => { quiet('candidates')(error); return null; });
  if (process.env.PLUMBER_DEBUG) process.stderr.write(`craft: probe candidates ${JSON.stringify(found)}\n`);
  if (!found) return [];
  const cap = (list: string[]) => list.slice(0, options.budget);
  const families: [string, string[] | null, (s: Session, keys: string[]) => Promise<ProbeRecord[]>][] = [
    ['press', cap(found.presses), press],
    ['toggle', cap(found.toggles), toggle],
    ['menu-down', cap(found.menus), menuDown],
    ['submenu', cap(found.menus).slice(0, 4), (s, k) => submenu(s, k, options.record ? { dir: options.record, browser, ...(options.scope ? { scope: options.scope } : {}) } : undefined)],
    ['tooltip', cap(found.tooltips), tooltips],
    ['drag', options.drag ? cap(found.drags) : [], drag],
    ['keys', [], keys],
    ['spinner-press', cap(found.presses).slice(0, 12), (s, k) => spinners(s, k, url, timeout)],
  ];
  const out: ProbeRecord[] = [];
  for (const [name, list, run] of families) {
    if (name !== 'keys' && !list?.length) continue;
    out.push(...await session(browser, url, timeout, s => run(s, list ?? []), name === 'submenu' && options.record ? 2 : 1).catch(quiet(name)));
  }
  return out;
}
