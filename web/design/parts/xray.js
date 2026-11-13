// The design site's page for the X-ray (prototype, 2026-11-13): point at any part of someone's card and see what it's
// made of, drawn on it and said beside it. Built from the overlay's own module (overlay/src/xray.js), with someone's
// theme scale so each value is judged: mint on the scale, coral off it.
import { LANGUAGE_CSS } from '../../../overlay/src/language.js';
import { TOY_DEFS } from '../../../overlay/src/toys.js';
import { XRAY_CSS, xray, zonesOf, zoneAt } from '../../../overlay/src/xray.js';
import { PICKER_CSS, picker } from '../../../overlay/src/picker.js';
import { burst } from '../../../overlay/src/burst.js';

// someone's theme (Tailwind's): spacing, radius and type steps in px
const SCALE = {
  spacing: [[2, '0.5'], [4, '1'], [6, '1.5'], [8, '2'], [10, '2.5'], [12, '3'], [14, '3.5'], [16, '4'], [20, '5'], [24, '6'], [28, '7'], [32, '8'], [40, '10'], [48, '12']],
  radius: [[2, 'xs'], [4, 'sm'], [6, 'md'], [8, 'lg'], [12, 'xl'], [16, '2xl'], [24, '3xl'], [9999, 'full']],
  // widths and heights: the spacing scale to 96, then Tailwind's larger steps and its container widths
  size: [[32, '8'], [36, '9'], [40, '10'], [48, '12'], [64, '16'], [80, '20'], [96, '24'], [128, '32'], [160, '40'], [192, '48'], [224, '56'], [256, '64'], [288, '72'], [320, '80'], [384, '96'], [448, 'md'], [512, 'lg'], [576, 'xl'], [672, '2xl']],
  type: [[12, 'xs'], [14, 'sm'], [16, 'base'], [18, 'lg'], [20, 'xl'], [24, '2xl']],
};
const tokenOf = (family, n) => SCALE[family]?.find(([v]) => Math.abs(v - n) <= 0.5 || (v === 9999 && n > 500))?.[1] ?? null;

// each part of the card: the name its code gives it, and the line it's written on
const NAMES = {
  card: ['TeamCard', 'app/settings/TeamCard.tsx:14'], head: ['CardHeader', 'app/settings/TeamCard.tsx:16'], title: ['h3', 'app/settings/TeamCard.tsx:18'],
  badge: ['Badge', 'components/ui/badge.tsx:9'], lede: ['p', 'app/settings/TeamCard.tsx:21'], list: ['ul', 'app/settings/TeamCard.tsx:24'],
  member: ['MemberRow', 'app/settings/MemberRow.tsx:7'], avatar: ['Avatar', 'components/ui/avatar.tsx:12'], who: ['div', 'app/settings/MemberRow.tsx:10'],
  role: ['Select', 'components/ui/select.tsx:31'], foot: ['div', 'app/settings/TeamCard.tsx:40'], invite: ['Button', 'components/ui/button.tsx:22'], cancel: ['Button', 'components/ui/button.tsx:22'],
};

export function mount(host, root, css) {
  const people = [['MA', 'Mara Ellis', 'mara@shoreline.co', 'Owner', '#ffd3cd'], ['JK', 'Jun Kato', 'jun@shoreline.co', 'Editor', '#c5e6fd'], ['SR', 'Sami Reyes', 'sami@shoreline.co', 'Viewer', '#e3dcff']];
  root.innerHTML = `<style>${css}${LANGUAGE_CSS}${XRAY_CSS}${PICKER_CSS}
    :host { display: block; font-family: var(--pl-sans); color: var(--pl-text-primary); }
    h2 { margin: 44px 0 6px; font: 600 20px/28px var(--pl-sans); letter-spacing: -0.01em; }
    h2 + p, .prose p { margin: 0 0 10px; font: 400 14px/22px var(--pl-sans); color: var(--pl-text-secondary); max-width: 680px; }
    .prose b { color: var(--pl-text-primary); font-weight: 600; }
    .stage { position: relative; margin-top: 14px; min-height: 620px; border-radius: 22px; background: #f4f4f6; overflow: hidden; display: grid; align-items: center; padding: 72px 360px 72px 72px; }
    .stage .hint kbd { font: 600 11px/1 var(--pl-sans); padding: 2px 5px; border-radius: 5px; background: #fff; box-shadow: 0 0 0 1px #d8d8de; }
    .stage .hint { position: absolute; left: 0; right: 0; bottom: 18px; margin: 0; text-align: center; font: 500 12.5px/1 var(--pl-sans); color: #6b6b75; }
    .stage[data-pinned] .hint b { color: var(--pl-pink); }
    .xr-card[hidden] { display: block; opacity: 0; }
    .xr-card { opacity: 1; transition: transform 420ms var(--pl-spring), opacity 200ms var(--pl-ease-out); }

    /* someone's card, in someone's styles: some on their scale, some written by hand */
    .app { justify-self: center; width: 420px; box-sizing: border-box; padding: 22px; border-radius: 14px; background: #fff; color: #101828; box-shadow: 0 1px 2px rgb(16 24 40 / .06), 0 12px 32px -16px rgb(16 24 40 / .28);
      font: 400 14px/20px ui-sans-serif, system-ui, sans-serif; display: grid; gap: 18px; cursor: default; }
    .app .head { display: flex; align-items: center; gap: 10px; }
    .app h3 { margin: 0; font: 650 17px/24px ui-sans-serif, system-ui, sans-serif; letter-spacing: -0.01em; }
    .app .badge { padding: 2px 8px; border-radius: 9999px; background: #ecfdf3; color: #067647; font: 600 12px/18px ui-sans-serif, system-ui, sans-serif; }
    .app .lede { margin: -12px 0 0; color: #475467; }
    .app ul { margin: 0; padding: 0; list-style: none; display: grid; gap: 12px; }
    .app li { display: flex; align-items: center; gap: 12px; }
    .app .av { width: 36px; height: 36px; border-radius: 9999px; display: grid; place-items: center; font: 600 13px/1 ui-sans-serif, system-ui, sans-serif; color: #344054; }
    .app .who { display: grid; flex: 1; min-width: 0; } .app .who b { font-weight: 600; } .app .who span { font-size: 13px; color: #667085; }
    .app .role { padding: 6px 10px; border-radius: 8px; box-shadow: inset 0 0 0 1px #d0d5dd; font: 500 13px/18px ui-sans-serif, system-ui, sans-serif; color: #344054; }
    .app .foot { display: flex; justify-content: flex-end; gap: 8px; padding-top: 4px; }
    .app button { padding: 9px 15px; border: 0; border-radius: 7px; font: 600 14px/20px ui-sans-serif, system-ui, sans-serif; cursor: default; }
    .app .invite { background: #2563eb; color: #fff; } .app .cancel { background: #fff; color: #344054; box-shadow: inset 0 0 0 1px #d0d5dd; }
    /* a part in hand is its own handle: drag it, as on the token pickers */
    .xr-grab { position: absolute; z-index: 3; touch-action: none; border-radius: 3px; }
    .xr-grab[data-axis="y"] { cursor: ns-resize; } .xr-grab[data-axis="x"] { cursor: ew-resize; } .xr-grab[data-axis="d"] { cursor: nwse-resize; }
    .stage[data-picking] .xr-card { opacity: 0; pointer-events: none; }
    .stage .row { z-index: 6; }
    .row .side { display: inline-flex; align-items: center; gap: 4px; height: 26px; padding: 0 6px; border-radius: 8px; font: 600 11.5px/1 var(--pl-sans); color: var(--pl-ink-2); white-space: nowrap; transition: background-color 200ms var(--pl-ease-out), color 200ms var(--pl-ease-out); }
    .row .side .ud { display: none; width: 6px; height: 10px; background: currentColor; clip-path: polygon(50% 0, 100% 35%, 0 35%, 0 65%, 100% 65%, 50% 100%); }
    /* the lit part of the row: where two fingers act */
    .row[data-seg="mode"] .side { background: var(--pl-lilac-soft); color: var(--pl-lilac-ink); } .row[data-seg="mode"] .side .ud { display: block; }
    .row[data-seg="value"] .val { box-shadow: 0 0 0 2px color-mix(in oklab, var(--pl-sky) 45%, transparent); border-radius: 8px; }
    .row[data-seg="apply"] .ok { background: var(--pl-mint); color: #fff; }
    .xr-legend { position: absolute; z-index: 6; display: flex; gap: 10px; font: 600 10.5px/1 var(--pl-sans); color: #8a8a94; pointer-events: none; }
    .xr-legend span { transition: color 200ms var(--pl-ease-out); } .xr-legend span[data-on] { color: var(--pl-text-primary); }
    /* the pull that syncs: a pill beside the row that fills as you keep going right */
    .xr-sync { position: absolute; z-index: 6; display: flex; align-items: center; height: 34px; padding: 0 14px; border-radius: 11px; overflow: hidden; isolation: isolate;
      background: var(--pl-bg-surface); box-shadow: var(--pl-shadow-card); font: 600 12px/1 var(--pl-sans); color: var(--pl-text-primary); white-space: nowrap;
      animation: pl-pop 260ms var(--pl-spring-pop) both; }
    .xr-sync[hidden] { display: none; }
    .xr-sync .k { position: absolute; inset: 0; z-index: -1; transform-origin: left; transform: scaleX(var(--k, 0)); background: linear-gradient(90deg, var(--pl-mint-soft), color-mix(in oklab, var(--pl-mint) 55%, var(--pl-mint-soft))); transition: transform 120ms linear; }
    .xr-sync b { color: var(--pl-mint-ink); }
    .xr-sync[data-full] { color: var(--pl-mint-ink); }
    /* a note for your agent: a well to write in, the place it's about above it */
    .xr-note { position: absolute; z-index: 7; width: 300px; box-sizing: border-box; padding: 12px; border-radius: 18px; background: var(--pl-bg-surface); box-shadow: var(--pl-shadow-card);
      animation: pl-pop 280ms var(--pl-spring-pop) both; transform-origin: 0 0; }
    .xr-note .nh { display: flex; align-items: center; gap: 8px; font: 700 13px/18px var(--pl-sans); }
    .xr-note .nh .toy { width: 22px; height: 22px; } .xr-note .nh .toy svg { width: 100%; height: 100%; display: block; overflow: visible; }
    .xr-note code { display: block; margin: 2px 0 8px 30px; font: 500 11px/14px var(--pl-mono); color: var(--pl-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .xr-note textarea { display: block; width: 100%; box-sizing: border-box; min-height: 84px; resize: none; padding: 10px 12px; border: 0; border-radius: 12px; outline: none;
      background: var(--pl-bg-inset); box-shadow: var(--pl-shadow-well); color: var(--pl-text-primary); font: 400 13.5px/20px var(--pl-sans); }
    .xr-note textarea:focus { box-shadow: var(--pl-shadow-well), 0 0 0 2px color-mix(in oklab, var(--pl-lilac) 45%, transparent); }
    .xr-note .nf { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; font: 500 11.5px/1 var(--pl-sans); color: var(--pl-text-secondary); }
    .xr-note kbd { display: inline-grid; place-items: center; min-width: 18px; height: 18px; padding: 0 4px; margin-right: 3px; border-radius: 6px; font: 600 11px/1 var(--pl-sans); color: var(--pl-text-primary); background: var(--pl-bg-inset); box-shadow: inset 0 -1px 0 var(--pl-border-default), 0 0 0 1px var(--pl-border-default); }
    .xr-note[data-done] textarea { opacity: .5; }
    .xr-note .done { display: none; align-items: center; gap: 6px; color: var(--pl-mint-ink); font-weight: 700; }
    .xr-note[data-done] .done { display: inline-flex; } .xr-note[data-done] .keys { display: none; }
    .xr-note .done i { display: grid; place-items: center; width: 18px; height: 18px; border-radius: 99px; background: var(--pl-mint); color: #fff; font-style: normal; font-size: 11px; }
    @media (max-width: 900px) { .stage { padding: 56px 20px 340px; } }
  </style>
  ${TOY_DEFS}
  <h2>The idea</h2>
  <div class="prose">
    <p>Point at anything on your page and see what it's made of. <b>On the element</b>, its space in the patterns: padding hatched, margin dotted, gaps striped, corners traced, its size on rulers. Mint where a value is on your scale, coral where it's written by hand. <b>Beside it</b>, a card says the same in numbers: which part it is and where it's written, its box drawn small, then corner, gap, type, colour and contrast, each value with its token.</p>
    <p>It follows the pointer; a click holds it. Point at one part of it, a padding side, a gap, a corner, its words, and <b>⇧ turns that part into its token picker</b>: drag the part itself or the row, arrows step, ↵ writes, Esc puts it back. At any moment <b>↵ opens a note for your agent</b> about what you're pointing at; ⌘↵ copies it with the file and line.</p>
  </div>
  <h2>Point at the card</h2>
  <div class="stage" tabindex="0">
    <div class="app" data-x="card">
      <div class="head" data-x="head"><h3 data-x="title">Your team</h3><span class="badge" data-x="badge">3 seats left</span></div>
      <p class="lede" data-x="lede">People here can edit the workspace and its billing.</p>
      <ul data-x="list">${people.map(([i, n, e, r, c]) => `<li data-x="member"><span class="av" data-x="avatar" style="background:${c}">${i}</span><span class="who" data-x="who"><b>${n}</b><span>${e}</span></span><span class="role" data-x="role">${r}</span></li>`).join('')}</ul>
      <div class="foot" data-x="foot"><button class="cancel" data-x="cancel">Cancel</button><button class="invite" data-x="invite">Invite people</button></div>
    </div>
    <div class="xr"></div>
    <div class="xr-card" hidden></div>
    <p class="hint">Point at anything · click to hold it · over a part, <kbd>⇧</kbd> changes it · <kbd>↵</kbd> a note for your agent</p>
  </div>`;

  const stage = root.querySelector('.stage'), layer = stage.querySelector('.xr'), card = stage.querySelector('.xr-card');
  let shown = null, pinned = null, zone = null, picking = null, noting = null, cardAt = { x: 0, y: 0 }, mouse = { x: 0, y: 0 };
  const box = () => stage.getBoundingClientRect();
  const nameOf = (el) => NAMES[el.dataset.x] ?? [el.localName, null];
  const draw = (el, z = zone, lit = []) => {
    if (!el) { layer.innerHTML = ''; card.hidden = true; shown = null; zone = null; return; }
    const s = box(), [name, source] = nameOf(el);
    const x = xray(el, { tokenOf, origin: { left: s.left, top: s.top }, room: { left: 12, top: 12, right: s.width - 12, bottom: s.height - 40 }, name, source, zone: picking ? null : z, lit });
    layer.innerHTML = x.page;
    if (el !== shown || !picking) card.innerHTML = x.card;
    const first = card.hidden;
    if (first) card.setAttribute('data-fresh', '');
    card.style.transform = `translate(${x.at.x}px, ${x.at.y}px)`; cardAt = x.at;
    card.hidden = false;
    if (first) requestAnimationFrame(() => card.removeAttribute('data-fresh'));
    shown = el;
  };
  const busy = () => picking || noting;
  const track = (e) => {
    mouse = { x: e.clientX, y: e.clientY };
    if (busy()) return;
    // on the shown element's outside parts (its margin, its rulers) it stays the one shown
    const outside = shown && !pinned ? zonesOf(shown).filter((q) => q.outside) : [];
    // …unless the pointer is on another element (a neighbour inside that band): then it's that one
    const under = e.target.closest?.('[data-x]');
    const onOut = shown && !pinned && (!under || under.contains(shown)) ? zoneAt(outside, e.clientX, e.clientY) : null;
    const el = pinned ?? (onOut ? shown : e.target.closest?.('[data-x]'));
    const z = el ? zoneAt(zonesOf(el), e.clientX, e.clientY) : null;
    if (el !== shown || z?.prop !== zone?.prop || z?.side !== zone?.side) { zone = z; draw(el, z); }
  };
  stage.addEventListener('pointermove', track);
  stage.addEventListener('pointerleave', () => { if (!pinned && !busy()) draw(null); });
  stage.addEventListener('click', (e) => {
    if (busy() || e.target.closest('.row, .list, .xr-note, .xr-grab')) return;
    const el = e.target.closest?.('[data-x]');
    pinned = pinned || !el ? null : el;
    stage.toggleAttribute('data-pinned', !!pinned);
    track(e);
  });

  // ── ⇧ over a part: it becomes that property's token picker, on the same row the token pickers page uses ──
  const optionsFor = (family, n) => {
    const S = SCALE[family].map(([v, name]) => ({ name, v }));
    if (!S.some((o) => Math.abs(o.v - n) <= 0.5) && !(family === 'radius' && n > 500)) S.push({ name: `${Math.round(n * 10) / 10}px`, v: n, hard: true });
    return S.sort((a, b) => a.v - b.v);
  };
  // dragging the part: inward makes padding bigger; a gap and a corner grow down and right; words grow up
  const PER = { top: (dx, dy) => dy, bottom: (dx, dy) => -dy, left: (dx) => dx, right: (dx) => -dx };
  const PAIR = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' }, ALL = ['top', 'right', 'bottom', 'left'];
  const startPick = () => {
    const el = shown, z = zone; if (!el || !z) return;
    pinned = el; stage.setAttribute('data-pinned', ''); stage.setAttribute('data-picking', '');
    const S = optionsFor(z.family, z.n), here = S.findIndex((o) => Math.abs(o.v - z.n) <= 0.5 || (o.v === 9999 && z.n > 500));
    // padding moves one side, its pair, or all four; every other part is one property
    const MODES = z.side ? [[z.side], [z.side, PAIR[z.side]], ALL] : [null];
    const BOX = z.box ?? 'padding';
    const SAID = z.side ? [z.side, `${z.side} + ${PAIR[z.side]}`, 'all sides'] : [z.said.toLowerCase()];
    let mode = 0;
    const props = () => (MODES[mode] ? MODES[mode].map((k) => `${BOX}-${k}`) : [z.prop]);
    const before = Object.fromEntries((z.side ? ALL.map((k) => `${BOX}-${k}`) : [z.prop]).map((q) => [q, el.style.getPropertyValue(q)]));
    const lit = () => zonesOf(el).filter((q) => props().includes(q.prop));
    const s = box(), grab = document.createElement('i');
    grab.className = 'xr-grab';
    grab.dataset.axis = z.side ? (z.side === 'top' || z.side === 'bottom' ? 'y' : 'x') : z.prop === 'width' ? 'x' : z.prop === 'height' ? 'y' : z.family === 'radius' ? 'd' : z.col ? 'y' : z.family === 'type' ? 'y' : 'x';
    grab.style.cssText = `left:${z.x - s.left}px;top:${z.y - s.top}px;width:${z.w}px;height:${z.h}px`;
    stage.append(grab);
    const perPx = z.side ? (dx, dy) => (BOX === 'margin' ? -1 : 1) * PER[z.side](dx, dy) / 12 : z.prop === 'width' ? (dx) => dx / 16 : z.prop === 'height' ? (dx, dy) => dy / 16 : z.family === 'type' ? (dx, dy) => -dy / 16 : z.col ? (dx, dy) => dy / 12 : (dx, dy) => (dx + dy) / 14;
    let cur = S[here < 0 ? 0 : here];
    const paint = () => {
      for (const q of props()) el.style.setProperty(q, cur.v === 9999 ? '9999px' : `${cur.v}px`);
      const nz = zonesOf(el).find((q) => q.prop === z.prop) ?? z, b2 = box();
      grab.style.cssText = `left:${nz.x - b2.left}px;top:${nz.y - b2.top}px;width:${nz.w}px;height:${nz.h}px`;
      requestAnimationFrame(() => draw(el, null, lit()));
    };
    const p = picker(stage, {
      name: z.said, toy: z.toy, options: S, keys: 'row', start: here < 0 ? undefined : here,
      mark: () => '',
      format: (o) => (o.v === 9999 ? '∞' : `${o.v}px`),
      apply: (o) => { cur = o; paint(); },
      place: (row, list) => { row.style.left = `${cardAt.x}px`; row.style.top = `${cardAt.y}px`; list.style.left = row.style.left; list.style.top = `${cardAt.y + 40}px`; },
      handles: [{ el: grab, perPx }],
    });
    const row = p.row;
    row.querySelector('.scrub').insertAdjacentHTML('afterend', `<span class="side" data-modes="${MODES.length}"><b>${SAID[0]}</b><i class="ud" aria-hidden="true"></i></span>`);
    // under the row: what two fingers do here, and the pull that syncs
    stage.insertAdjacentHTML('beforeend', `<div class="xr-legend"><span data-s="mode">← ${z.side ? 'sides' : ''}</span><span data-s="value">↕ value</span><span data-s="apply">→ sync</span></div>
      <div class="xr-sync" hidden><i class="k"></i><span class="say">Keep going <b>→</b> to sync</span></div>`);
    const legend = stage.querySelector('.xr-legend'), sync = stage.querySelector('.xr-sync');
    if (!z.side) legend.querySelector('[data-s="mode"]').remove();
    const lay = () => { const r = row.getBoundingClientRect(), b2 = box(); legend.style.left = `${r.left - b2.left + 6}px`; legend.style.top = `${r.bottom - b2.top + 8}px`; sync.style.left = `${r.right - b2.left + 10}px`; sync.style.top = `${r.top - b2.top}px`; };
    requestAnimationFrame(lay);

    // ── two fingers: left and right move between the sides, the value and apply; up and down act on the one lit ──
    const SEGS = z.side ? ['mode', 'value', 'apply'] : ['value', 'apply'];
    let seg = 'value', tx = 0, ty = 0, charge = 0, idle = 0, synced = false;
    const show = () => {
      row.dataset.seg = seg; legend.dataset.seg = seg;
      for (const sp of legend.children) sp.toggleAttribute('data-on', sp.dataset.s === seg);
      sync.hidden = seg !== 'apply';
      sync.style.setProperty('--k', charge.toFixed(3));
      sync.toggleAttribute('data-full', charge >= 1);
      lay();
    };
    const setMode = (m) => {
      if (m === mode || m < 0 || m >= MODES.length) return;
      const dir = m > mode ? 6 : -6;
      mode = m; row.querySelector('.side b').textContent = SAID[mode];
      row.querySelector('.side').animate?.([{ transform: `translateY(${dir}px)`, opacity: 0.4 }, { transform: 'none', opacity: 1 }], { duration: 220, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
      paint();
    };
    const doSync = () => {
      if (synced) return;
      if (!p.ready()) { sync.querySelector('.say').innerHTML = cur.hard ? 'Pick one of your sizes first' : 'Nothing to sync'; sync.animate?.([{ translate: '0 0' }, { translate: '-5px 0' }, { translate: '4px 0' }, { translate: '0 0' }], { duration: 260 }); charge = 0; show(); return; }
      synced = true; p.write();
      sync.querySelector('.say').innerHTML = `<b>✓</b> Synced: ${SAID[mode]} ${cur.name}`;
      const b2 = sync.getBoundingClientRect(); burst(root, b2.left + 20, b2.top + b2.height / 2, { pieces: 18 });
      setTimeout(() => done(true), 1100);
    };
    const wheel = (e) => {
      if (!picking || synced) return;
      e.preventDefault();
      // the fingers' own direction: a trackpad with natural scrolling reports the page's travel, the opposite of the
      // hand, so both axes are turned round (fingers right = toward sync, fingers up = bigger)
      const dx = -(e.deltaMode ? e.deltaX * 16 : e.deltaX), dy = -(e.deltaMode ? e.deltaY * 16 : e.deltaY);
      clearTimeout(idle);
      if (Math.abs(dx) > Math.abs(dy)) {
        ty = 0;
        if (seg === 'apply' && (dx > 0 || charge > 0)) {
          // past apply, the pull charges the sync; back off and it drains; it never needs a second gesture
          charge = Math.max(0, Math.min(1, charge + dx / 260));
          if (charge >= 1) { show(); doSync(); return; }
          if (charge === 0 && dx < 0) tx += dx;
        } else tx += dx;
        const i = SEGS.indexOf(seg);
        if (tx > 70 && i < SEGS.length - 1) { seg = SEGS[i + 1]; tx = 0; charge = 0; sync.querySelector('.say').innerHTML = 'Keep going <b>→</b> to sync'; }
        else if (tx < -70 && i > 0) { seg = SEGS[i - 1]; tx = 0; charge = 0; }
      } else {
        tx = 0; ty += dy;
        while (Math.abs(ty) >= 34) {
          const up = ty > 0; ty -= Math.sign(ty) * 34;
          if (seg === 'mode') setMode(mode + (up ? 1 : -1));
          else if (seg === 'value') p.set(p.at() + (up ? 1 : -1));
        }
      }
      show();
      // let go of the pull: an uncharged sync springs back
      idle = setTimeout(() => { if (charge < 1 && charge > 0) { charge = 0; show(); } tx = 0; ty = 0; }, 700);
    };
    stage.addEventListener('wheel', wheel, { passive: false });

    const done = (keep) => {
      if (!keep) for (const [q, v] of Object.entries(before)) { if (v) el.style.setProperty(q, v); else el.style.removeProperty(q); }
      stage.removeEventListener('wheel', wheel);
      row.nextElementSibling?.remove(); row.remove(); grab.remove(); legend.remove(); sync.remove();
      picking = null; stage.removeAttribute('data-picking');
      draw(el, null);
    };
    picking = { done, p };
    show(); paint();
    const written = () => setTimeout(() => { if (row.classList.contains('written') && !synced) { synced = true; const b = row.getBoundingClientRect(); burst(root, b.right - 16, b.top + 17, { pieces: 14 }); setTimeout(() => done(true), 700); } });
    row.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); done(false); }
      else if (e.key === 'Enter') written();
    }, true);
    row.querySelector('.ok').addEventListener('click', written);
    requestAnimationFrame(() => row.querySelector('.val').focus({ preventScroll: true }));
  };

  // ── ↵ anywhere: a note for your agent about what you're pointing at; ⌘↵ copies it with the file and line ──
  const startNote = () => {
    const el = shown; if (!el) return;
    pinned = el; stage.setAttribute('data-pinned', '');
    const [name, source] = nameOf(el);
    const note = document.createElement('div');
    note.className = 'xr-note';
    note.innerHTML = `<div class="nh"><i class="toy">${card.querySelector('.xr-head .toy')?.innerHTML ?? ''}</i>Note for your agent</div><code>${name}${source ? ` · ${source}` : ''}</code>
      <textarea placeholder="What should change here?" aria-label="Note for your agent about ${name}"></textarea>
      <div class="nf"><span class="keys"><kbd>⌘</kbd><kbd>↵</kbd>copy for your agent</span><span class="done"><i>✓</i>Copied with its place</span><span><kbd>Esc</kbd></span></div>`;
    note.style.left = `${cardAt.x}px`; note.style.top = `${cardAt.y}px`;
    stage.append(note); card.hidden = true;
    const ta = note.querySelector('textarea');
    const close = () => { note.remove(); noting = null; draw(el, null); };
    noting = { close };
    zone = null; draw(el, null);
    ta.addEventListener('keydown', async (e) => {
      e.stopPropagation();
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        const said = ta.value.trim(); if (!said) return;
        const text = `${said}\n\nWhere: <${name}> at ${source ?? 'an element with no source line yet'}`;
        try { await navigator.clipboard.writeText(text); } catch { ta.select(); document.execCommand?.('copy'); }
        note.setAttribute('data-done', '');
        const b = note.getBoundingClientRect(); burst(root, b.left + 40, b.bottom - 16, { pieces: 16 });
        setTimeout(close, 1400);
      }
    });
    requestAnimationFrame(() => ta.focus({ preventScroll: true }));
  };

  const keys = (e) => {
    if (!root.host.isConnected) { removeEventListener('keydown', keys, true); return; }
    if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
    const typing = e.composedPath().some((n) => n.localName === 'textarea' || n.localName === 'input');
    if (typing || noting) return;
    if (e.key === 'Shift' && !picking && zone && shown) { e.preventDefault(); startPick(); }
    else if (e.key === 'Enter' && !picking && shown) { e.preventDefault(); startNote(); }
    else if (e.key === 'Escape' && pinned && !picking) { pinned = null; stage.removeAttribute('data-pinned'); draw(null); }
  };
  addEventListener('keydown', keys, true);
  addEventListener('resize', () => shown && draw(shown));
  void host;
}
