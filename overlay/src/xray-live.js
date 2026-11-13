/* ─────────────────────────────────────────────────────────
 * X-RAY, LIVE · React Plumber overlay
 *
 * What the X-ray does under the hand, written once: the design site's X-ray page and Plumber's own X-ray (Alt+B) both
 * mount this, each with an adapter that says what its page is (the design page: a demo app with made-up names and a
 * pretend server; Plumber: your app, its stamps, its theme, its server).
 *
 *   point     the element under the pointer is shown: drawn on (xray.js) and said in a card beside it, never on it
 *   a part    the padding side, margin band, ruler, corner, gap or words under the pointer lights with one pill
 *   ⇧         while held, a press-and-drag on the part changes it, snapping to your scale, and two fingers too
 *   the row   the card's token picker row holds the part: two fingers left and right choose where (scope), how (sides,
 *             or fill / fit / fixed) and the value; up and down change the one lit
 *   numbers   every number in the card can be dragged, scrolled or clicked for the list
 *   changes   collect, kept by place in the code and which copy (a re-render can't lose them); Sync (or ↵) writes
 *             them, with a line per change saying where and how, Undo and Retry; Esc puts them back
 *   ↵         with nothing to sync, a note for your agent; ⌘↵ copies it with the file and line
 *
 *   const xr = mountXray({ container, events, root, partAt, name, key, all, component, tokenOf, scale, write, undo })
 *   xr.destroy()
 *
 * The adapter:
 *   container        a positioned element the X-ray draws in (the card, the drawing, the list)
 *   events           where pointer events are heard (the stage; or window)
 *   root             where a burst goes (a shadow root or the document)
 *   partAt(e)        the page's element under the pointer, or null (never the X-ray's own)
 *   name(el)         [its name, its file:line or null]
 *   key(el)          the place in the code it is drawn from; all(key): every element drawn from there, in order
 *   component(el)    { name, file, uses } when a shared component draws it (scope 'everywhere'), else null;
 *                    everywhere(el): the elements on this page that component draws
 *   tokenOf(f, px)   the token name for a px value of a family (spacing, radius, size, type), or null
 *   scale(f)         [[px, name], …] your steps for a family
 *   write(groups)    → [{ id, state: 'ok' | 'moved' | 'failed', cls, where, why }] for each change written
 *   scopeInfo(el, p) → { scopes, mates, where }: where the part's classes are written and every element that line
 *                    draws (asked once per element; optional)
 *   undo(result)     puts one written change back in your code
 *   watch            the element whose re-renders are watched (default: container); isPage(node): one of the page's
 * ───────────────────────────────────────────────────────── */
import { xray, zonesOf, zoneAt, placeCard, contextOf } from './xray.js';
import { sizing } from './boxmodel.js';
import { picker } from './picker.js';
import { burst } from './burst.js';

export const XRAY_LIVE_CSS = `
  .xr-card[hidden] { display: block; opacity: 0; pointer-events: none; }
  /* the card takes the pointer only once the pointer is over it: until then a click there lands on the page below it */
  .xr-card:not([data-reach]) { pointer-events: none; }
  .xr-card { opacity: 1; transition: transform 420ms var(--pl-spring), opacity 200ms var(--pl-ease-out); z-index: 6; }
  .xr-many { display: inline-flex; align-items: center; height: 18px; padding: 0 6px; margin-left: 4px; border-radius: 99px; vertical-align: 2px; background: var(--pl-sky-soft); color: var(--pl-sky-ink); font: 600 10.5px/1 var(--pl-sans); letter-spacing: 0; }
  .xr-many[data-scope="all"] { background: var(--pl-pink-soft); color: var(--pl-pink-ink); } .xr-many[data-scope="one"] { background: var(--pl-bg-inset); color: var(--pl-text-secondary); }
  /* the value in hand, beside the pointer: its number and its token, while you drag or scroll */
  .xr-live { position: absolute; z-index: 8; pointer-events: none; display: inline-flex; align-items: center; gap: 6px; height: 26px; padding: 0 6px 0 10px; border-radius: 99px; white-space: nowrap;
    background: var(--pl-text-primary); color: var(--pl-bg-surface); font: 600 12px/1 var(--pl-mono); font-variant-numeric: tabular-nums; box-shadow: 0 6px 16px -6px rgb(0 0 0 / .4); }
  .xr-live[hidden] { display: none; }
  .xr-live .x { font: 600 11px/1 var(--pl-sans); opacity: .7; padding-right: 4px; }
  .xr-live b { font-family: var(--pl-sans); } .xr-live i { font: 700 10.5px/1 var(--pl-sans); font-style: normal; padding: 4px 7px; border-radius: 99px; background: var(--pl-on); color: #fff; }
  .xr-live i.off { background: var(--pl-off); }
  /* a list, from a click on a number: your sizes in order */
  .xr-list { position: absolute; z-index: 9; display: grid; padding: 4px; min-width: 120px; max-height: 240px; overflow: auto; border-radius: 12px; background: var(--pl-bg-surface); box-shadow: var(--pl-shadow-card); animation: pl-pop 200ms var(--pl-spring-pop) both; }
  .xr-list button { display: flex; justify-content: space-between; gap: 12px; padding: 6px 8px; border: 0; border-radius: 8px; background: none; font: 600 12px/1 var(--pl-sans); color: var(--pl-text-primary); cursor: pointer; }
  .xr-list button span { font: 500 11.5px/1 var(--pl-mono); color: var(--pl-text-secondary); }
  .xr-list button:hover, .xr-list button[aria-selected="true"] { background: var(--pl-sky-soft); }
  .xr-list button.hard { color: var(--pl-coral-ink); }
  /* the value in hand, as the token picker row at the top of the card: where, how and the value, side by side */
  .xr-hand { margin: -2px -2px 10px; min-height: 34px; }
  .xr-hand:empty::before { content: 'Point at a part or a number'; display: flex; align-items: center; height: 34px; padding: 0 10px; border-radius: 11px; background: var(--pl-bg-inset); font: 500 12px/1 var(--pl-sans); color: var(--pl-text-secondary); }
  .xr-hand .row { position: relative; width: 100%; box-sizing: border-box; box-shadow: 0 0 0 1px var(--pl-border-default); }
  .xr-hand .row .ok, .xr-hand .list { display: none; }
  .xr-hand .row .val { flex: 1; min-width: 0; }
  .xr-hand .row .drum { min-width: 0; overflow: hidden; } .xr-hand .row .drum .slot span { overflow: hidden; text-overflow: ellipsis; }
  .xr-hand .side { display: inline-flex; align-items: center; gap: 4px; height: 26px; padding: 0 7px; border-radius: 8px; font: 600 11.5px/1 var(--pl-sans); color: var(--pl-ink-2); white-space: nowrap; transition: background-color 200ms var(--pl-ease-out), color 200ms var(--pl-ease-out); }
  /* the thumb behind the place in force: lilac over where and how, sky over the value; it follows the fingers, then snaps */
  .xr-hand .row > :not(.thumb) { position: relative; z-index: 1; }
  .xr-hand .thumb { position: absolute; left: 0; top: 3px; bottom: 3px; z-index: 0; border-radius: 8px; pointer-events: none;
    background: var(--pl-sky-soft); box-shadow: inset 0 0 0 1.5px color-mix(in oklab, var(--pl-sky) 50%, transparent);
    transition: transform 420ms var(--pl-spring), width 420ms var(--pl-spring), background-color 220ms var(--pl-ease-out); }
  .xr-hand .thumb:is([data-on="mode"], [data-on="scope"]) { background: var(--pl-lilac-soft); box-shadow: inset 0 0 0 1.5px color-mix(in oklab, var(--pl-lilac) 50%, transparent); }
  .xr-hand .thumb[data-pulled] { transition: transform 60ms linear, width 60ms linear; }
  .xr-hand .row[data-seg="mode"] [data-s="mode"], .xr-hand .row[data-seg="scope"] [data-s="scope"] { color: var(--pl-lilac-ink); }
  .xr-hand [data-s="scope"] { max-width: 92px; overflow: hidden; text-overflow: ellipsis; }
  .xr-hand .say { display: flex; gap: 10px; margin: 6px 4px 0; font: 600 10.5px/1 var(--pl-sans); color: #8a8a94; }
  .xr-hand .say span[data-on] { color: var(--pl-text-primary); }
  .xr-hand .say .how { margin-left: auto; font-weight: 500; }
  /* the changes, collected at the foot of the card: how many, Sync, and the way back */
  .xr-pend { display: flex; align-items: center; gap: 4px; white-space: nowrap; margin: 10px -2px -2px; padding: 8px 8px 8px 12px; border-radius: 12px; background: var(--pl-pink-soft); color: var(--pl-pink-ink); font: 600 12px/1 var(--pl-sans); animation: pl-pop 260ms var(--pl-spring-pop) both; }
  .xr-pend .sp { flex: 1; }
  .xr-pend button { display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 9px; white-space: nowrap; border: 0; border-radius: 9px; font: 700 12px/1 var(--pl-sans); cursor: pointer; }
  .xr-pend .sync { background: var(--pl-pink); color: #fff; box-shadow: 0 2px 0 color-mix(in oklab, var(--pl-pink) 60%, #000); }
  .xr-pend .sync[disabled] { opacity: .6; cursor: progress; }
  .xr-pend .back { background: none; color: var(--pl-pink-ink); }
  .xr-pend kbd { font: 600 10.5px/1 var(--pl-sans); opacity: .8; }
  /* what Sync did, one line per change */
  .xr-res { margin: 10px -2px 0; padding: 8px; border-radius: 12px; background: var(--pl-bg-inset); box-shadow: var(--pl-shadow-well); animation: pl-pop 260ms var(--pl-spring-pop) both; }
  .xr-res .rh { display: flex; align-items: center; justify-content: space-between; padding: 0 2px 6px 4px; font: 700 12px/1 var(--pl-sans); }
  .xr-res .rx { width: 22px; height: 22px; border: 0; border-radius: 7px; background: none; color: var(--pl-text-secondary); cursor: pointer; font-size: 15px; line-height: 1; }
  .xr-res .rr { display: grid; grid-template-columns: 20px 1fr auto; gap: 8px; align-items: start; padding: 7px 6px; border-radius: 9px; background: var(--pl-bg-surface); font: 500 12px/16px var(--pl-sans); }
  .xr-res .rr + .rr { margin-top: 4px; }
  .xr-res .rr > i { display: grid; place-items: center; width: 20px; height: 20px; border-radius: 99px; font: 800 11px/1 var(--pl-sans); font-style: normal; color: #fff; background: var(--pl-on); }
  .xr-res .rr[data-state="moved"] > i { background: color-mix(in oklab, var(--pl-butter) 80%, var(--pl-butter-ink)); }
  .xr-res .rr[data-state="failed"] > i { background: var(--pl-off); }
  .xr-res .rr[data-state="undone"] > i { background: var(--pl-icon-tick, #aaa); }
  .xr-res .rr b { font: 600 12px/16px var(--pl-mono); }
  .xr-res .rr span { display: block; margin-top: 2px; color: var(--pl-text-secondary); font: 500 11px/15px var(--pl-mono); word-break: break-word; }
  .xr-res .rr[data-state="failed"] span { font-family: var(--pl-sans); color: var(--pl-coral-ink); }
  .xr-res .rr button { height: 24px; padding: 0 9px; border: 0; border-radius: 8px; background: var(--pl-bg-inset); font: 600 11.5px/1 var(--pl-sans); color: var(--pl-text-primary); cursor: pointer; box-shadow: inset 0 -1px 0 var(--pl-border-default); }
  /* a note for your agent: a well to write in, the place it's about above it */
  .xr-note { position: absolute; z-index: 7; width: 300px; box-sizing: border-box; padding: 12px; border-radius: 18px; background: var(--pl-bg-surface); box-shadow: var(--pl-shadow-card); animation: pl-pop 280ms var(--pl-spring-pop) both; transform-origin: 0 0; }
  .xr-note .nh { display: flex; align-items: center; gap: 8px; font: 700 13px/18px var(--pl-sans); }
  .xr-note .nh .toy { width: 22px; height: 22px; } .xr-note .nh .toy svg { width: 100%; height: 100%; display: block; overflow: visible; }
  .xr-note code { display: block; margin: 2px 0 8px 30px; font: 500 11px/14px var(--pl-mono); color: var(--pl-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .xr-note textarea { display: block; width: 100%; box-sizing: border-box; min-height: 84px; resize: none; padding: 10px 12px; border: 0; border-radius: 12px; outline: none; background: var(--pl-bg-inset); box-shadow: var(--pl-shadow-well); color: var(--pl-text-primary); font: 400 13.5px/20px var(--pl-sans); }
  .xr-note textarea:focus { box-shadow: var(--pl-shadow-well), 0 0 0 2px color-mix(in oklab, var(--pl-lilac) 45%, transparent); }
  .xr-note .nf { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; font: 500 11.5px/1 var(--pl-sans); color: var(--pl-text-secondary); }
  .xr-note kbd { display: inline-grid; place-items: center; min-width: 18px; height: 18px; padding: 0 4px; margin-right: 3px; border-radius: 6px; font: 600 11px/1 var(--pl-sans); color: var(--pl-text-primary); background: var(--pl-bg-inset); box-shadow: inset 0 -1px 0 var(--pl-border-default), 0 0 0 1px var(--pl-border-default); }
  .xr-note[data-done] textarea { opacity: .5; }
  .xr-note .done { display: none; align-items: center; gap: 6px; color: var(--pl-mint-ink); font-weight: 700; }
  .xr-note[data-done] .done { display: inline-flex; } .xr-note[data-done] .keys { display: none; }
  .xr-note .done i { display: grid; place-items: center; width: 18px; height: 18px; border-radius: 99px; background: var(--pl-mint); color: #fff; font-style: normal; font-size: 11px; }
`;

const PAIR = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' }, LINKS = ['one', 'pair', 'all'], SIZINGS = ['fixed', 'fill', 'fit'];
const TOYS = { padding: 'padding', margin: 'margin', width: 'width', height: 'height', 'border-radius': 'corner', gap: 'gap', 'font-size': 'type' };
const PREFIX = { 'padding-top': 'pt', 'padding-right': 'pr', 'padding-bottom': 'pb', 'padding-left': 'pl', 'margin-top': 'mt', 'margin-right': 'mr', 'margin-bottom': 'mb', 'margin-left': 'ml', gap: 'gap', width: 'w', height: 'h', 'border-radius': 'rounded', 'font-size': 'text', flex: 'flex' };
const ICON = { ok: '✓', moved: '↪', failed: '!', undone: '↺' };
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
export const familyOf = (prop) => (prop === 'width' || prop === 'height' ? 'size' : prop === 'border-radius' ? 'radius' : prop === 'font-size' ? 'type' : 'spacing');

export function mountXray(o) {
  const C = o.container, E = o.events ?? C, watch = o.watch ?? C;
  C.insertAdjacentHTML('beforeend', '<div class="xr"></div><div class="xr-card" hidden><div class="xr-hand"></div><div class="xr-body"></div></div><div class="xr-live" hidden></div>');
  const layer = C.querySelector(':scope > .xr'), card = C.querySelector(':scope > .xr-card'), body = card.querySelector('.xr-body'), hand = card.querySelector('.xr-hand'), live = C.querySelector(':scope > .xr-live');
  const off = []; // every listener added, taken off by destroy()
  const on = (target, type, fn, opts) => { target.addEventListener(type, fn, opts); off.push(() => target.removeEventListener(type, fn, opts)); };
  const box = () => C.getBoundingClientRect();
  const ourUI = (e) => e.composedPath().some((n) => n === card || n.classList?.contains('xr-list') || n.classList?.contains('xr-note'));
  let lastCard = '', shown = null, shownKey = null, pinned = null, noting = null, held = null, cardAt = { x: 0, y: 0 }, lastOn = null, waiting = 0;

  // ── where a change reaches, and the changes ───────────────
  // a part's places on the page: every element its line of code draws (the rows of a list, the cards of a grid)
  // where a part's classes are written, and every element that line draws (the adapter's scopeInfo, asked once per
  // element when a part comes into hand): { scopes, mates, where }. Until it answers, the copies its stamp shares
  const infos = new WeakMap();
  const peers = (el) => { const i = infos.get(el); if (i) return i.mates; const k = o.key(el); const all = k ? [...o.all(k)] : []; return all.includes(el) ? all : [el]; };
  // the changes not yet synced, by place in the code and which copy ('key#n' → { prop → { before, value, scope } }),
  // never by element: a re-render replaces elements, and the change must find the new one
  const changes = new Map();
  const placeKey = (el) => `${o.key(el) ?? '?'}#${Math.max(0, peers(el).indexOf(el))}`;
  const elOf = (k) => { const i = k.lastIndexOf('#'); const all = o.all(k.slice(0, i)); return all?.[+k.slice(i + 1)] ?? null; };
  // which sides move together, kept until changed: 'one', 'pair' or 'all'
  let link = 'one';
  const linkedOf = (prop) => {
    const sided = prop.match(/^(padding|margin)-(top|right|bottom|left)$/); if (!sided) return [prop];
    return link === 'all' ? ['top', 'right', 'bottom', 'left'].map((k) => `${sided[1]}-${k}`) : link === 'pair' ? [prop, `${sided[1]}-${PAIR[sided[2]]}`] : [prop];
  };
  const count = () => new Set([...changes].flatMap(([k, m]) => [...m.keys()].map((q) => `${k.slice(0, k.lastIndexOf('#'))}|${q}`))).size;
  const reach = () => changes.size;
  const unseen = () => [...changes.keys()].filter((k) => !elOf(k)).length;
  // the scope: 'one' just this; 'page' every place here its line draws; 'all' the component, everywhere it's used
  let scope = 'one';
  const scopesOf = (el) => infos.get(el)?.scopes ?? [...(peers(el).length > 1 ? ['one', 'page'] : ['one']), ...(o.component(el) ? ['all'] : [])];
  const targets = (el) => {
    if (scope === 'all' && o.component(el)) return o.everywhere?.(el) ?? [el];
    return scope === 'page' ? peers(el) : [el];
  };
  const tail = (w) => (w ? String(w).split('/').pop() : '');
  const scopeSaid = (el) => scope === 'all' ? `all ${o.component(el)?.uses ?? ''}`.trim() : scope === 'page' ? `×${peers(el).length}` : 'this';
  const read = (el, prop) => { const cs = getComputedStyle(el); return prop === 'width' ? el.getBoundingClientRect().width : prop === 'height' ? el.getBoundingClientRect().height : prop === 'gap' ? parseFloat(cs.columnGap) || parseFloat(cs.rowGap) || 0 : parseFloat(cs.getPropertyValue(prop)) || 0; };
  const set = (el, prop, v) => {
    for (const t of targets(el)) {
      const k = placeKey(t), val = typeof v === 'number' ? `${v}px` : v;
      if (!changes.has(k)) changes.set(k, new Map());
      const m = changes.get(k);
      if (!m.has(prop)) m.set(prop, { before: t.style.getPropertyValue(prop) });
      Object.assign(m.get(prop), { value: val, scope });
      t.style.setProperty(prop, val);
    }
  };
  const optionsFor = (family, n) => {
    const S = (o.scale(family) ?? []).map(([v, name]) => ({ name, v }));
    if (n && !S.some((x) => Math.abs(x.v - n) <= 0.5) && !(family === 'radius' && n > 500)) S.push({ name: `${Math.round(n * 10) / 10}px`, v: n, hard: true });
    if (family === 'spacing' && !S.some((x) => x.v === 0)) S.unshift({ name: '0', v: 0 });
    return S.sort((a, b) => a.v - b.v);
  };
  const nearest = (S, v) => S.reduce((b, x) => (Math.abs(x.v - v) < Math.abs(b.v - v) ? x : b), S[0]);
  const say = (x, px, py) => { const s = box(); live.hidden = false; const n = shown ? targets(shown).length : 1; live.innerHTML = `<b>${x.v}</b>${x.hard ? '<i class="off">off scale</i>' : `<i>${esc(x.name)}</i>`}${n > 1 ? `<span class="x">×${n}</span>` : ''}`; live.style.left = `${px - s.left + 16}px`; live.style.top = `${py - s.top + 14}px`; };

  // ── the drawing and the card ───────────────────────────────
  let zone = null, justDragged = false, warm = 0, pending;
  const draw = (el) => {
    if (!el) { layer.innerHTML = ''; card.hidden = true; shown = null; zone = null; return; }
    const s = box(), [name, source] = o.name(el);
    const zs = zonesOf(el), inProp = held?.prop ?? zone?.prop;
    const lit = inProp ? zs.filter((q) => q.prop !== inProp && linkedOf(inProp).includes(q.prop)) : [];
    const z = (zone && zs.find((q) => q.prop === zone.prop)) || zone;
    const x = xray(el, { tokenOf: o.tokenOf, origin: { left: s.left, top: s.top }, room: { left: 12, top: 12, right: s.width - 12, bottom: s.height - 96 }, name, source, zone: z, lit });
    const same = el === shown;
    if (!same) hold(null);
    layer.toggleAttribute('data-still', same);
    layer.innerHTML = x.page;
    // the other places the change will reach, outlined
    const others = targets(el).filter((t) => t !== el);
    if (others.length) layer.insertAdjacentHTML('beforeend', `<svg class="xr-on xr-peers" aria-hidden="true">${others.slice(0, 200).map((t) => { const r = t.getBoundingClientRect(), rad = Math.min(parseFloat(getComputedStyle(t).borderTopLeftRadius) || 0, r.height / 2); return `<rect x="${r.left - s.left - 2}" y="${r.top - s.top - 2}" width="${r.width + 4}" height="${r.height + 4}" rx="${rad + 2}" fill="color-mix(in oklab, var(--pl-sky) 7%, transparent)" stroke="var(--pl-sky)" stroke-width="1.5" stroke-dasharray="4 3"/>`; }).join('')}</svg>`);
    card.toggleAttribute('data-still', same);
    const foot = pendHtml();
    if (!same || x.card + foot !== lastCard) { body.innerHTML = x.card + foot; lastCard = x.card + foot; }
    const head = body.querySelector('.xr-head b');
    head?.querySelector('.xr-many')?.remove();
    const info = infos.get(el);
    if (head && (scopesOf(el).length > 1 || peers(el).length > 1)) head.insertAdjacentHTML('beforeend', ` <span class="xr-many" data-scope="${scope}"${info?.where ? ` title="Written at ${esc(info.where)}"` : ''}>${scope === 'all' ? `everywhere · ${o.component(el)?.uses ?? '?'} uses` : scope === 'page' ? `×${peers(el).length}${info?.where ? ` · ${esc(tail(info.where))}` : ' here'}` : 'just this one'}</span>`);
    for (const ch of card.querySelectorAll('[data-prop]')) {
      ch.toggleAttribute('data-changed', !!changes.get(placeKey(el))?.has(ch.dataset.prop));
      ch.toggleAttribute('data-held', !!held?.chip && held.prop === ch.dataset.prop);
    }
    const first = card.hidden;
    if (first) card.setAttribute('data-fresh', '');
    // beside the element, never on it, the way a tooltip finds its place
    const R = el.getBoundingClientRect(), cs = getComputedStyle(el), mg = (q) => parseFloat(cs.getPropertyValue(`margin-${q}`)) || 0;
    const around = { left: R.left - s.left - mg('left') - 6, top: R.top - s.top - mg('top') - 24, right: R.right - s.left + mg('right') + 28, bottom: R.bottom - s.top + mg('bottom') + 6 };
    body.style.maxHeight = '';
    const ctx = contextOf(el, o.contextStop ?? watch), Cr = ctx?.getBoundingClientRect();
    const context = Cr && { left: Cr.left - s.left, top: Cr.top - s.top, right: Cr.right - s.left, bottom: Cr.bottom - s.top };
    const room = o.room?.(s) ?? { left: 12, top: 12, right: s.width - 12, bottom: s.height - 12 };
    const at = placeCard(around, { w: card.offsetWidth || 292, h: card.offsetHeight || 420 }, room, 16, context);
    card.style.transform = `translate(${at.x}px, ${at.y}px)`; cardAt = at;
    card.dataset.side = at.side;
    if (!card.querySelector('.beak')) card.insertAdjacentHTML('afterbegin', '<i class="beak" aria-hidden="true"></i>');
    const beak = card.querySelector('.beak'), mid = { x: (R.left + R.right) / 2 - s.left, y: (R.top + R.bottom) / 2 - s.top };
    const cw = card.offsetWidth, chh = at.maxH ?? card.offsetHeight;
    if (at.side === 'left' || at.side === 'right') { beak.style.top = `${Math.max(14, Math.min(chh - 26, mid.y - at.y - 6))}px`; beak.style.left = ''; }
    else { beak.style.left = `${Math.max(14, Math.min(cw - 26, mid.x - at.x - 6))}px`; beak.style.top = ''; }
    card.toggleAttribute('data-short', !!at.maxH);
    body.style.maxHeight = at.maxH ? `${at.maxH - hand.offsetHeight - 30}px` : '';
    card.hidden = !!noting;
    if (first) requestAnimationFrame(() => card.removeAttribute('data-fresh'));
    shown = el; shownKey = o.key(el) ? placeKey(el) : null;
    cursor();
  };

  // ── ⇧ is the hand: only while it is held do a drag and two fingers change the part pointed at ──
  let shiftDown = false;
  const AXIS = (z) => (!z ? '' : z.side ? (z.side === 'top' || z.side === 'bottom' ? 'ns-resize' : 'ew-resize') : z.prop === 'width' ? 'ew-resize' : z.prop === 'height' ? 'ns-resize' : z.family === 'radius' ? 'nwse-resize' : z.family === 'type' ? 'ns-resize' : z.col ? 'ns-resize' : 'ew-resize');
  function cursor() { (o.cursorOn ?? C).style.cursor = shiftDown && zone && shown ? AXIS(zone) : ''; }
  on(window, 'keydown', (e) => { if (e.key === 'Shift' && !shiftDown) { shiftDown = true; cursor(); } });
  on(window, 'keyup', (e) => { if (e.key === 'Shift') { shiftDown = false; cursor(); } });
  on(window, 'blur', () => { shiftDown = false; cursor(); });

  // ── pointing, and reaching the card ────────────────────────
  const inTri = (p, a, b, c) => { const d = (u, v, w) => (u.x - w.x) * (v.y - w.y) - (v.x - w.x) * (u.y - w.y); const d1 = d(p, a, b), d2 = d(p, b, c), d3 = d(p, c, a); return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0)); };
  const headingToCard = (pt) => {
    if (!lastOn || card.hidden) return false;
    const c = card.getBoundingClientRect(), near = c.left > lastOn.x ? c.left : c.right;
    return inTri(pt, lastOn, { x: near, y: c.top - 24 }, { x: near, y: c.bottom + 24 });
  };
  const track = (e) => {
    // the card wakes to the pointer when the pointer is over it (with a little margin to reach its edge)
    if (!card.hidden) { const c = card.getBoundingClientRect(), on = e.clientX >= c.left - 4 && e.clientX <= c.right + 4 && e.clientY >= c.top - 4 && e.clientY <= c.bottom + 4; card.toggleAttribute('data-reach', on); if (on) { clearTimeout(waiting); return; } }
    if (o.paused?.()) { if (shown && !changes.size) draw(null); return; }
    if (held || noting) return;
    const pt = { x: e.clientX, y: e.clientY };
    if (ourUI(e)) { clearTimeout(waiting); return; }
    const under = o.partAt(e);
    const outside = shown && !pinned && (!under || under.contains(shown)) ? zoneAt(zonesOf(shown).filter((q) => q.outside), pt.x, pt.y) : null;
    const el = pinned ?? (outside ? shown : under);
    if (el && el === shown) {
      lastOn = pt; clearTimeout(waiting);
      const z = zoneAt(zonesOf(el), pt.x, pt.y);
      if (z?.prop === zone?.prop) { clearTimeout(warm); pending = undefined; return; }
      if (z?.prop === pending) return;
      // a warm-up outside the element, where the margin bands and rulers sit side by side; inside, at once
      const take = () => { pending = undefined; zone = z; if (z) hold(el, z.prop); draw(el); };
      clearTimeout(warm); pending = z?.prop ?? null;
      if (z?.outside || zone?.outside) warm = setTimeout(take, 200); else take();
      return;
    }
    if (shown && !pinned && headingToCard(pt)) {
      clearTimeout(waiting);
      waiting = setTimeout(() => { if (card.matches(':hover')) return; lastOn = el ? pt : null; zone = el ? zoneAt(zonesOf(el), pt.x, pt.y) : null; draw(el); if (el && zone) hold(el, zone.prop); }, 450);
      return;
    }
    clearTimeout(waiting);
    lastOn = el ? pt : null;
    zone = el ? zoneAt(zonesOf(el), pt.x, pt.y) : null;
    draw(el);
    if (el && zone) hold(el, zone.prop);
  };
  on(E, 'pointermove', track);
  if (E !== window) on(E, 'pointerleave', () => { if (!pinned && !held && !noting && !count()) draw(null); });
  if (o.clicks !== false) on(E, 'click', (e) => {
    if (justDragged) { justDragged = false; e.preventDefault?.(); e.stopPropagation?.(); return; }
    if (noting || ourUI(e)) return;
    const el = o.partAt(e);
    if (o.swallowClicks) { e.preventDefault(); e.stopPropagation(); }
    pinned = pinned || !el ? null : el;
    if (!pinned) { lastOn = null; draw(el); }
  }, true);

  // ── drag: the value follows the hand and snaps to the nearest of your sizes ──
  const drag = (e, el, prop, sign, gain, chip) => {
    e.preventDefault(); e.stopPropagation();
    const fam = familyOf(prop), start = read(el, prop), S = optionsFor(fam, start), linked = linkedOf(prop);
    hold(el, prop);
    const x0 = e.clientX, y0 = e.clientY, at = e.target;
    let moved = false, cur = nearest(S, start);
    held = { prop, chip };
    const move = (m) => {
      if (!moved && Math.abs(m.clientX - x0) + Math.abs(m.clientY - y0) < 3) return;
      moved = true; justDragged = true;
      const want = Math.max(0, start + sign(m.clientX - x0, m.clientY - y0) * gain), n = nearest(S, want);
      if (n !== cur) { cur = n; for (const q of linked) set(el, q, n.v); draw(el); }
      say(cur, m.clientX, m.clientY);
    };
    const up = () => {
      removeEventListener('pointermove', move, true); removeEventListener('pointerup', up, true);
      held = null; live.hidden = true; resync();
      // only the click that ends this drag is swallowed (it comes right after the release), never the next one
      setTimeout(() => { justDragged = false; }, 0);
      if (!moved && chip) openList(el, prop, at); else draw(el);
    };
    addEventListener('pointermove', move, true); addEventListener('pointerup', up, true);
  };
  const signOf = (z) => {
    const IN = { top: [0, 1], bottom: [0, -1], left: [1, 0], right: [-1, 0] };
    if (z.side) { const [ux, uy] = IN[z.side], k = z.box === 'margin' ? -1 : 1; return (dx, dy) => k * (dx * ux + dy * uy); }
    if (z.prop === 'width') return (dx) => dx;
    if (z.prop === 'height') return (dx, dy) => dy;
    if (z.family === 'radius') return (dx, dy) => (dx + dy) / 2;
    if (z.family === 'type') return (dx, dy) => -dy / 2;
    return z.col ? (dx, dy) => dy : (dx) => dx;
  };
  on(E, 'pointerdown', (e) => {
    if (!shown || !zone || noting || e.button !== 0 || !e.shiftKey || ourUI(e) || o.paused?.()) return;
    const z = zoneAt(zonesOf(shown), e.clientX, e.clientY) ?? zone, el = shown, x0 = e.clientX, y0 = e.clientY;
    e.preventDefault(); e.stopPropagation();
    const first = (m) => {
      if (Math.abs(m.clientX - x0) + Math.abs(m.clientY - y0) < 2) return;
      removeEventListener('pointermove', first, true); removeEventListener('pointerup', cancel, true);
      drag(e, el, z.prop, signOf(z), 1, false);
    };
    const cancel = () => { removeEventListener('pointermove', first, true); removeEventListener('pointerup', cancel, true); };
    addEventListener('pointermove', first, true); addEventListener('pointerup', cancel, true);
  }, true);
  on(card, 'pointerdown', (e) => {
    if (e.target.closest('.xr-hand')) return;
    const ch = e.target.closest('[data-prop]'); if (!ch || !shown) return;
    drag(e, shown, ch.dataset.prop, (dx) => dx, familyOf(ch.dataset.prop) === 'size' ? 2 : 0.5, true);
  });

  // ── the value in hand: the token picker row at the top of the card ──
  let inHand = null;
  const sidesSaid = (prop) => { const m = prop.match(/^(padding|margin)-(\w+)$/); if (!m) return null; return link === 'all' ? `all ${m[1]}` : link === 'pair' ? `${m[2]} + ${PAIR[m[2]]}` : m[2]; };
  const sizingOf = (el, prop) => { const t = sizing(el, getComputedStyle(el), prop === 'width' ? 'w' : 'h'); return /^Fill/.test(t) ? 'fill' : /^Hug/.test(t) ? 'fit' : 'fixed'; };
  function hold(el, prop) {
    if (inHand && inHand.el === el && inHand.prop === prop) return;
    hand.innerHTML = ''; inHand = null;
    if (!el || !prop) return;
    const sided = sidesSaid(prop) !== null, sized = prop === 'width' || prop === 'height', now = read(el, prop), S = optionsFor(familyOf(prop), now);
    if (!S.length) return;
    const known = infos.get(el);
    scope = known ? (known.scopes.includes('page') ? 'page' : known.scopes[0]) : peers(el).length > 1 ? 'page' : 'one';
    const scopes = scopesOf(el);
    // ask once where this part is written and what else that line draws; the row is made again with the answer
    if (!known && o.scopeInfo) Promise.resolve(o.scopeInfo(el, prop)).then((info) => {
      if (!info || !el.isConnected) return;
      infos.set(el, info);
      if (inHand?.el === el) { const p = inHand.prop; hand.innerHTML = ''; inHand = null; hold(el, p); }
      if (shown === el) { lastCard = ''; draw(el); }
    }, () => {});
    const p = picker(C, {
      name: prop.replace('-', ' '), toy: TOYS[prop.split('-')[0]] ?? TOYS[prop] ?? 'size', options: S, into: hand, keys: 'row', start: S.indexOf(nearest(S, now)),
      mark: () => '', format: (x) => `${x.v}px`,
      apply: (x) => { const qs = linkedOf(prop); if (qs.every((q) => Math.abs(read(el, q) - x.v) < 0.5)) return; for (const q of qs) set(el, q, x.v); if (inHand?.sized) { inHand.sizing = 'fixed'; showSeg(); } draw(el); },
    });
    const segs = [...(scopes.length > 1 ? ['scope'] : []), ...(sided || sized ? ['mode'] : []), 'value'];
    const label = (prop === 'border-radius' ? 'corner' : prop === 'font-size' ? 'text size' : prop);
    p.row.querySelector('.scrub').insertAdjacentHTML('afterend', (segs.includes('scope') ? '<span class="side" data-s="scope"></span>' : '') + `<span class="side" data-s="mode">${label}</span>`);
    hand.insertAdjacentHTML('beforeend', `<div class="say">${segs.includes('scope') ? '<span data-s="scope">where</span>' : ''}${segs.includes('mode') ? `<span data-s="mode">${sided ? 'sides' : 'sizing'}</span>` : ''}<span data-s="value">value</span><span class="how">← → choose · ↕ change</span></div>`);
    p.row.insertAdjacentHTML('afterbegin', '<i class="thumb" aria-hidden="true"></i>');
    inHand = { el, prop, p, S, sided, sized, sizing: sized ? sizingOf(el, prop) : null, scopes, segs, seg: 'value', tx: 0, ty: 0, axis: null, idle: 0 };
    showSeg();
    requestAnimationFrame(() => thumbAt(0, 0, true));
  }
  const showSeg = () => {
    const h = inHand; if (!h) return;
    h.p.row.dataset.seg = h.seg;
    for (const sp of hand.querySelectorAll('.say [data-s]')) sp.toggleAttribute('data-on', sp.dataset.s === h.seg);
    const sc = h.p.row.querySelector('[data-s="scope"]'); if (sc) sc.textContent = scopeSaid(h.el);
    const md = h.p.row.querySelector('[data-s="mode"]');
    if (h.sided) md.textContent = sidesSaid(h.prop); else if (h.sized) md.textContent = h.sizing;
    if (shown && !held) draw(shown);
  };
  const thumbAt = (pull = 0, dir = 0, still = false) => {
    const h = inHand; if (!h) return;
    const row = h.p.row, t = row.querySelector('.thumb'), r = row.getBoundingClientRect();
    const box1 = (s) => { const el = s === 'value' ? row.querySelector('.val') : row.querySelector(`[data-s="${s}"]`), b = el.getBoundingClientRect(); return { x: b.left - r.left - 3, w: b.width + 6 }; };
    const i = h.segs.indexOf(h.seg), next = h.segs[i + dir];
    const from = box1(h.seg), to = next ? box1(next) : from;
    const k = next ? Math.min(1, Math.max(0, pull)) : 0, lean = next ? 0 : dir * Math.min(6, pull * 18);
    t.style.transition = still ? 'none' : '';
    t.style.transform = `translateX(${(from.x + (to.x - from.x) * k + lean).toFixed(1)}px)`; t.style.width = `${(from.w + (to.w - from.w) * k).toFixed(1)}px`;
    t.dataset.on = h.seg; t.toggleAttribute('data-pulled', pull !== 0);
  };
  function resync() { if (!inHand) return; const i = inHand.S.indexOf(nearest(inHand.S, read(inHand.el, inHand.prop))); if (i !== inHand.p.at()) inHand.p.set(i); }
  // a new scope: the places it takes in get the value; the places it lets go of go back to how they were
  const rescope = (h, next) => {
    const v = h.el.style.getPropertyValue(h.prop) || null, before = new Set(targets(h.el));
    scope = next;
    const after = new Set(targets(h.el)), qs = linkedOf(h.prop);
    for (const t of before) if (!after.has(t) && t !== h.el) for (const q of qs) { const k = placeKey(t), m = changes.get(k); if (m?.has(q)) { const was = m.get(q).before; if (was) t.style.setProperty(q, was); else t.style.removeProperty(q); m.delete(q); if (!m.size) changes.delete(k); } }
    if (v) for (const q of qs) set(h.el, q, h.el.style.getPropertyValue(q) || v);
  };
  // a size's way of sizing: fill its container, fit its content, or a fixed number
  const resize = (h, how) => {
    h.sizing = how;
    const parent = h.el.parentElement, ps = parent && getComputedStyle(parent), main = ps && /flex/.test(ps.display) && (/column/.test(ps.flexDirection) ? h.prop === 'height' : h.prop === 'width');
    if (how === 'fill') { if (main) set(h.el, 'flex', '1 1 0%'); else set(h.el, h.prop, '100%'); }
    else if (how === 'fit') { if (main) set(h.el, 'flex', '0 0 auto'); set(h.el, h.prop, 'fit-content'); }
    else set(h.el, h.prop, Math.round(read(h.el, h.prop)));
  };
  // two fingers: with ⇧ over the element, or on the card's row; left and right choose, up and down change
  on(E, 'wheel', (e) => {
    if (!inHand || !shown || inHand.el !== shown || o.paused?.()) return;
    const onRow = e.composedPath().includes(hand);
    if (!onRow && !(e.shiftKey && (zone || e.composedPath().includes(shown)))) return;
    e.preventDefault(); e.stopPropagation();
    const h = inHand, dx = -(e.deltaMode ? e.deltaX * 16 : e.deltaX), dy = -(e.deltaMode ? e.deltaY * 16 : e.deltaY);
    clearTimeout(h.idle);
    h.idle = setTimeout(() => { h.axis = null; h.ax = h.ay = 0; h.ty = 0; h.switched = false; if (h.tx) { h.tx = 0; thumbAt(0); } }, 200);
    if (!h.axis) { h.ax = (h.ax ?? 0) + dx; h.ay = (h.ay ?? 0) + dy; if (Math.abs(h.ax) + Math.abs(h.ay) < 6) return; h.axis = Math.abs(h.ax) > Math.abs(h.ay) ? 'x' : 'y'; }
    if (h.axis === 'x') {
      if (h.segs.length < 2 || h.switched) return;
      h.tx += dx;
      const dir = Math.sign(h.tx), i = h.segs.indexOf(h.seg), next = h.segs[i + dir];
      if (next && Math.abs(h.tx) >= 44) {
        h.seg = next; h.tx = 0; h.switched = true; showSeg(); thumbAt(0);
        const row = h.p.row;
        row.querySelector('.thumb').animate?.([{ scale: '1.12 0.86' }, { scale: '0.96 1.05', offset: 0.45 }, { scale: '1.01 0.99', offset: 0.75 }, { scale: '1 1' }], { duration: 420, easing: 'ease-out' });
        (h.seg === 'value' ? row.querySelector('.drum') : row.querySelector(`[data-s="${h.seg}"]`))?.animate?.([{ scale: 0.9 }, { scale: 1.06, offset: 0.5 }, { scale: 1 }], { duration: 320, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' });
      } else thumbAt(next ? 0.36 * (1 - Math.exp(-Math.abs(h.tx) / 22)) : Math.min(1, Math.abs(h.tx) / 60), dir);
      return;
    }
    if (h.axis !== 'y') return;
    h.ty += dy;
    while (Math.abs(h.ty) >= 30) {
      const up = h.ty > 0, step = up ? 1 : -1; h.ty -= Math.sign(h.ty) * 30;
      const bump = (sel) => h.p.row.querySelector(sel)?.animate?.([{ transform: `translateY(${up ? 5 : -5}px)`, opacity: 0.4 }, { transform: 'none', opacity: 1 }], { duration: 220, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
      if (h.seg === 'scope') {
        const j = Math.max(0, Math.min(h.scopes.length - 1, h.scopes.indexOf(scope) + step));
        if (h.scopes[j] !== scope) { rescope(h, h.scopes[j]); draw(h.el); showSeg(); bump('[data-s="scope"]'); }
      } else if (h.seg === 'mode' && h.sided) {
        const i = LINKS.indexOf(link), j = Math.max(0, Math.min(2, i + step));
        if (j !== i) { link = LINKS[j]; const v = read(h.el, h.prop); for (const q of linkedOf(h.prop)) if (Math.abs(read(h.el, q) - v) >= 0.5) set(h.el, q, v); draw(h.el); showSeg(); bump('[data-s="mode"]'); }
      } else if (h.seg === 'mode' && h.sized) {
        const j = Math.max(0, Math.min(2, SIZINGS.indexOf(h.sizing) + step));
        if (SIZINGS[j] !== h.sizing) { resize(h, SIZINGS[j]); draw(h.el); showSeg(); resync(); bump('[data-s="mode"]'); }
      } else h.p.set(h.p.at() + step);
    }
  }, { passive: false, capture: true });
  // a click on a number: the list of your sizes
  function openList(el, prop, at) {
    C.querySelector(':scope > .xr-list')?.remove();
    const now = read(el, prop), S = optionsFor(familyOf(prop), now), here = nearest(S, now), s = box(), b = at.getBoundingClientRect();
    const list = document.createElement('div'); list.className = 'xr-list';
    list.innerHTML = S.map((x, i) => `<button type="button" data-i="${i}" class="${x.hard ? 'hard' : ''}" aria-selected="${x === here}">${esc(x.name)}<span>${x.v}</span></button>`).join('');
    list.style.left = `${b.left - s.left}px`; list.style.top = `${b.bottom - s.top + 6}px`;
    C.append(list);
    list.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
    list.addEventListener('click', (e) => { const x = S[Number(e.target.closest('[data-i]')?.dataset.i)]; if (!x) return; for (const q of linkedOf(prop)) set(el, q, x.v); list.remove(); draw(el); resync(); });
    const away = (e) => { if (!e.composedPath().includes(list)) { list.remove(); removeEventListener('pointerdown', away, true); } };
    addEventListener('pointerdown', away, true);
  }

  // ── a re-render: the changes find the new elements by place and show on them again ──
  const reapply = () => {
    for (const [k, m] of changes) { const el = elOf(k); if (el) for (const [prop, { value }] of m) if (el.style.getPropertyValue(prop) !== value) el.style.setProperty(prop, value); }
    // redrawn only when the element shown was replaced (a live page changes itself all the time; the rest is the same)
    if (shown && !shown.isConnected) { const again = shownKey && elOf(shownKey); if (pinned === shown) pinned = again; shown = null; if (inHand) { inHand = null; hand.innerHTML = ''; } draw(again ?? null); }
  };
  let queued = 0;
  const isPage = o.isPage ?? (() => true);
  const mo = new MutationObserver((list) => { if (changes.size || (shown && !shown.isConnected)) if (list.some((r) => r.type === 'childList' && !C.contains(r.target) && isPage(r))) { clearTimeout(queued); queued = setTimeout(reapply, 0); } });
  mo.observe(watch, { childList: true, subtree: true });
  off.push(() => mo.disconnect());

  // ── Sync, and what came of it, one line per change ─────────
  let results = null, syncing = false;
  const classOf = (prop, value) => {
    if (prop === 'flex') return value === '1 1 0%' ? 'flex-1' : 'flex-none';
    if (value === '100%') return `${PREFIX[prop]}-full`;
    if (value === 'fit-content') return `${PREFIX[prop]}-fit`;
    const n = parseFloat(value), t = o.tokenOf(familyOf(prop), n);
    return t ? `${PREFIX[prop]}-${t}` : `${PREFIX[prop]}-[${value}]`;
  };
  function pendHtml() {
    const n = count(), res = results ? resultsHtml() : '';
    if (!n) return res;
    const at = reach(), gone = unseen();
    return res + `<div class="xr-pend"><span>${n} change${n > 1 ? 's' : ''}${at > n ? ` · ${at} places` : ''}${gone ? ` · ${gone} not on screen` : ''}</span><span class="sp"></span><button type="button" class="back" title="Esc">Put back</button><button type="button" class="sync"${syncing ? ' disabled' : ''}>${syncing ? 'Syncing…' : 'Sync <kbd>↵</kbd>'}</button></div>`;
  }
  function resultsHtml() {
    const ok = results.filter((r) => r.state === 'ok' || r.state === 'moved').length;
    return `<div class="xr-res"><div class="rh"><b>${ok === results.length ? `Synced ${ok} change${ok > 1 ? 's' : ''}` : `${ok} of ${results.length} synced`}</b><button type="button" class="rx" aria-label="Close">×</button></div>
      ${results.map((r) => `<div class="rr" data-state="${r.state}"><i>${ICON[r.state]}</i><div><b>${esc(r.cls)}</b> on ${esc(r.name)}${r.keys.length > 1 ? ` ×${r.keys.length}` : ''}<span>${esc(r.state === 'failed' ? r.why : r.state === 'undone' ? 'Put back in your code' : `${r.state === 'moved' ? `${r.why} ` : ''}${r.where ?? ''}`)}</span></div>${r.state === 'failed' ? `<button type="button" data-retry="${esc(r.id)}">Retry</button>` : r.state === 'undone' ? '' : `<button type="button" data-undo="${esc(r.id)}">Undo</button>`}</div>`).join('')}</div>`;
  }
  const refresh = () => { lastCard = ''; if (shown) draw(shown); };
  const sync = (only = null) => {
    if (!count() || syncing) return !!count();
    // one change: one property of one part, at one scope, however many places it reaches
    const groups = new Map();
    for (const [k, m] of changes) for (const [prop, c] of m) {
      const part = k.slice(0, k.lastIndexOf('#')), id = `${part}|${prop}|${c.scope}`;
      if (only && !only.includes(id)) continue;
      if (!groups.has(id)) { const el = elOf(k); groups.set(id, { id, part, name: el ? o.name(el)[0] : part, prop, value: c.value, scope: c.scope, cls: classOf(prop, c.value), keys: [], befores: [], els: [] }); }
      const g = groups.get(id); g.keys.push(k); g.befores.push(c.before); const el = elOf(k); if (el) g.els.push(el);
    }
    syncing = true; refresh();
    Promise.resolve(o.write([...groups.values()])).catch((error) => [...groups.values()].map((g) => ({ id: g.id, state: 'failed', why: error?.message ?? String(error) }))).then((said) => {
      syncing = false;
      const out = [...groups.values()].map((g) => ({ ...g, ...(said.find((r) => r.id === g.id) ?? { state: 'failed', why: 'No answer for this change.' }) }));
      // the written ones leave the pending list (their inline preview goes: the page now draws them from your code);
      // the failed ones stay pending
      for (const r of out) if (r.state !== 'failed') for (const k of r.keys) { const m = changes.get(k); m?.delete(r.prop); if (m && !m.size) changes.delete(k); if (o.dropPreviewOnWrite) { const el = elOf(k); el?.style.removeProperty(r.prop); } }
      results = [...(results ?? []).filter((r) => !out.some((x) => x.id === r.id)), ...out];
      refresh();
      const firstOk = out.find((r) => r.state !== 'failed'), panel = card.querySelector('.xr-res');
      if (firstOk && panel) { const b = panel.getBoundingClientRect(); burst(o.root, b.left + 24, b.top + 18, { pieces: 18 }); }
    });
    return true;
  };
  const undo = (id) => {
    const r = results?.find((x) => x.id === id); if (!r) return;
    Promise.resolve(o.undo(r)).then(() => { r.state = 'undone'; refresh(); }, (error) => { r.state = 'failed'; r.why = `Couldn't put it back: ${error?.message ?? error}`; refresh(); });
  };
  const putBack = () => {
    if (!count()) return false;
    for (const [k, m] of changes) { const el = elOf(k); if (el) for (const [prop, { before }] of m) { if (before) el.style.setProperty(prop, before); else el.style.removeProperty(prop); } }
    changes.clear(); refresh();
    return true;
  };
  on(card, 'click', (e) => {
    const t = e.target;
    if (t.closest('.sync')) sync(); else if (t.closest('.back')) putBack();
    else if (t.closest('[data-undo]')) undo(t.closest('[data-undo]').dataset.undo);
    else if (t.closest('[data-retry]')) sync([t.closest('[data-retry]').dataset.retry]);
    else if (t.closest('.rx')) { results = null; refresh(); }
  });

  // ── ↵: a note for your agent ───────────────────────────────
  const startNote = () => {
    const el = shown; if (!el) return;
    pinned = el;
    const [name, source] = o.name(el);
    const note = document.createElement('div');
    note.className = 'xr-note';
    note.innerHTML = `<div class="nh"><i class="toy">${card.querySelector('.xr-head .toy')?.innerHTML ?? ''}</i>Note for your agent</div><code>${esc(name)}${source ? ` · ${esc(source)}` : ''}</code>
      <textarea placeholder="What should change here?" aria-label="Note for your agent about ${esc(name)}"></textarea>
      <div class="nf"><span class="keys"><kbd>⌘</kbd><kbd>↵</kbd>copy for your agent</span><span class="done"><i>✓</i>Copied with its place</span><span><kbd>Esc</kbd></span></div>`;
    note.style.left = `${cardAt.x}px`; note.style.top = `${cardAt.y}px`;
    C.append(note); card.hidden = true;
    const ta = note.querySelector('textarea');
    const close = () => { note.remove(); noting = null; draw(el); };
    noting = { close };
    draw(el);
    ta.addEventListener('keydown', async (e) => {
      e.stopPropagation();
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        const said = ta.value.trim(); if (!said) return;
        const text = `${said}\n\nWhere: <${name}> at ${source ?? 'an element with no source line yet'}`;
        try { await navigator.clipboard.writeText(text); } catch { ta.select(); document.execCommand?.('copy'); }
        note.setAttribute('data-done', '');
        const b = note.getBoundingClientRect(); burst(o.root, b.left + 40, b.bottom - 16, { pieces: 16 });
        setTimeout(close, 1400);
      }
    });
    requestAnimationFrame(() => ta.focus({ preventScroll: true }));
  };
  // while the X-ray is on, its keys come first, even inside the page's own fields; only its own note and list keep theirs
  // (inside blueprint the host routes them: blueprint's own keys stay blueprint's)
  if (o.keys !== false) on(window, 'keydown', (e) => {
    if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.composedPath().some((n) => n.classList?.contains('xr-note') || n.classList?.contains('xr-list')) || noting) return;
    if (e.key === 'Enter' && shown) { e.preventDefault(); e.stopPropagation(); if (!sync()) startNote(); }
    else if (e.key === 'Escape' && (count() || pinned || C.querySelector(':scope > .xr-list'))) { e.preventDefault(); e.stopPropagation(); C.querySelector(':scope > .xr-list')?.remove(); if (!putBack() && pinned) { pinned = null; draw(null); } }
  }, true);
  // a scroll or a resize moves what's shown: drawn again once a frame at most
  let frame = 0;
  const follow = () => { if (frame || !shown) return; frame = requestAnimationFrame(() => { frame = 0; if (shown?.isConnected) draw(shown); }); };
  on(window, 'resize', follow);
  on(window, 'scroll', follow, true);

  return {
    get pending() { return count(); },
    // an element chosen elsewhere (blueprint's list, or a click blueprint took): shown and held
    hold(el) { if (!el?.isConnected || o.paused?.()) return; pinned = el; lastOn = null; const r = el.getBoundingClientRect(); zone = null; draw(el); void r; },
    release() { pinned = null; },
    // results from before a reload (a write the dev server reloaded the page for), said again
    showResults(list) { results = list.map((r) => ({ keys: [], els: [], befores: [], ...r })); lastCard = ''; card.hidden = false; if (shown) draw(shown); else { body.innerHTML = resultsHtml(); lastCard = ''; const s = box(); card.style.transform = `translate(${Math.max(12, s.width - (card.offsetWidth || 292) - 24)}px, 24px)`; } },
    get shown() { return shown; },
    putBack, sync,
    destroy() { putBack(); for (const f of off) f(); clearTimeout(waiting); clearTimeout(warm); clearTimeout(queued); layer.remove(); card.remove(); live.remove(); C.querySelector(':scope > .xr-list')?.remove(); C.querySelector(':scope > .xr-note')?.remove(); },
  };
}
