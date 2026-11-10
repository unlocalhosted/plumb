// The design site's page for fix-bar: what it draws inside its host. The site (web/design/Part.jsx) gives it the host,
// the overlay's token file as text, and the scheme; it draws with the overlay's own source.
import { LANGUAGE_CSS } from '../../../overlay/src/language.js';
import { BLOCK_ICONS } from '../../../overlay/src/boxmodel.js';
import { PRIMITIVES_CSS, stepper, radius, bind, place } from '../../../overlay/src/editor-primitives.js';
import { SHOW_CSS, chipsHtml, roll } from '../../../overlay/src/show.js';
import { SCALE_CSS, places } from '../../../overlay/src/scale-marks.js';
import { TOY_DEFS, toyOf } from '../../../overlay/src/toys.js';
import { BUTTON_CSS, button } from '../../../overlay/src/kit.js';

export function mount(host, root, css) {

  // Every piece here is the overlay's own: tokens, pills, tags and actions (language.js), the property icons
  // (boxmodel.js), the step controls (editor-primitives.js), the value chip that rolls (show.js), the place marks
  // (scale-marks.js). Nothing is drawn for this page alone except how they are put together.
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const radii = [['tag', 6], ['control', 8], ['card', 12]].map(([token, n]) => ({ token, n, label: `${n}`, value: `${n}px` }));
  const spacing = ['s1', 's2', 's3', 's4', 's6'].map((t, i) => ({ token: t, n: [4, 8, 12, 16, 24][i], label: `${[4, 8, 12, 16, 24][i]}`, value: `${[4, 8, 12, 16, 24][i]}px` }));
  const kbd = (k) => `<kbd>${k}</kbd>`;
  const chip = (icon, n) => chipsHtml([{ label: 'what it becomes', icon: toyOf(icon), from: n }]);

  // The bar: the property's icon and the class; what it is (coral) and what it becomes (the chip, its value rolling, and
  // the step's name); its places as marks, coral until they are written; where you are; what you can do.
  const bar = ({ icon, on, cls, from, to, name, nameHue = 'lilac', marks, at, act, extra = '' }) => `
    <div class="fb pl-card" role="toolbar" aria-label="The cause in hand">
      <span class="what"><i class="ic" data-tip="${icon}">${toyOf(icon)}</i><code>${cls}</code><span class="in">on a</span><i class="ic" data-tip="${on}">${toyOf(on)}</i></span>
      <span class="move"><span class="pl-pill" data-hue="coral">${from}</span><span class="to" aria-hidden="true">→</span>${chip(icon, to)}<span class="pl-tag name" data-hue="${nameHue}">${name}</span></span>
      ${marks ? `<span class="marks" title="${marks} places">${places(marks, 'off', 'rest')}</span>` : ''}
      ${extra}
      <span class="nav"><button type="button" aria-label="The cause before">‹</button><span>${at} of 60</span><button type="button" aria-label="The next cause">›</button></span>
      <span class="acts">${button(act, { cls: 'sm go', key: '↵' })}${button('Keep', { cls: 'sm quiet', key: 'K' })}${button('Skip', { cls: 'sm quiet', key: '→' })}</span>
    </div>`;
  const scene = (id, title, note, body) => `<section class="scene" id="${id}"><h2>${title}</h2><p class="note">${note}</p><div class="stage">${body}</div></section>`;
  const rowsOf = (lit) => ['Undo loses the last change after a reload', 'Spacing drag jumps when the row re-renders', 'History strip covers the toast'].map((t, i) =>
    `<div class="row"><span class="id">PLM-2${14 - i * 5}</span><span class="t">${t}</span><span class="chip${lit ? ' lit' : ''}">${['Bug', 'Bug', 'Feature'][i]}</span></div>`).join('');

  const s2 = { steps: spacing, current: null, drift: { n: 64, label: '64' } };
  const s3 = { steps: spacing, current: null, picked: 's2', drift: { n: 7, label: '7' } };


  // ── proposed: the bar says what is wrong, and the page is where you change it ──
  // The bar is one object with two jobs, never both at once:
  //   one place    a headline (what was done by hand, in your words) and a detail (what it is, what your theme has).
  //                The choice is made on the element, where the change happens. The right end: where you are, and
  //                the way into the other job.
  //   clean up     the whole page is the thing being changed, so the bar is the only place to say what is going on:
  //                the pass in hand as the headline, what it changes as the detail, the four passes along the right.
  //                Each pass is shown on the page first and written only when you press Apply.
  // Words: what you'd say to a person. No "steps", no "scale", no class names; "your theme" is the thing they own.
  const elementOn = `<div class="on" style="top: 78px; right: 30px;"><span class="ctl">${radius('Corner', { steps: radii, current: null, picked: 'tag', drift: { n: 5, label: '5' } })}</span>${button('Use 6px', { cls: 'sm', key: '↵' })}${button('Keep 5px', { cls: 'sm quiet', key: 'K' })}</div>`;
  const PASSES = [
    { toy: 'type', name: 'Text', doing: 'Text sizes', says: '9 sizes become 5 of your theme’s', n: 14 },
    { toy: 'gap', name: 'Spacing', doing: 'Spacing', says: 'Gaps and padding move to your theme’s spacing', n: 24 },
    { toy: 'fill', name: 'Colour', doing: 'Colour', says: '7 near-greys become your theme’s 3', n: 12 },
    { toy: 'icon', name: 'Icons', doing: 'Icon sizes', says: 'Icons line up with the text beside them', n: 10 },
  ];
  const strip = (at, done) => `<span class="passes" role="list" aria-label="The clean-up, in four passes">${PASSES.map((p, i) =>
    `<i role="listitem" class="ps ${i < done ? 'done' : i === at ? 'now' : 'soon'}" data-tip="${p.name}${i < done ? ': done' : ''}" aria-label="${p.name}${i < done ? ', done' : i === at ? ', now' : ''}">${toyOf(p.toy)}</i>`).join('')}</span>`;
  const one = `<i class="ic big">${toyOf('corner')}</i><span class="lines"><span class="say">16 tags have a corner typed by hand</span><span class="more">They’re <span class="pl-pill" data-hue="coral">5px</span>. Your theme’s corners are 6, 8 and 12px.</span></span>
    <span class="sep"></span><span class="nav"><button type="button" aria-label="The one before">‹</button><span>3 of 60</span><button type="button" aria-label="The next one">›</button></span>
    ${button('Clean up all', { cls: 'sm quiet', attrs: 'data-do="all"', icon: toyOf('icon') })}`;
  const cleaning = (at) => { const p = PASSES[at]; return `<i class="ic big pop">${toyOf(p.toy)}</i><span class="lines"><span class="say">${p.doing}, on ${p.n} places</span><span class="more">${p.says}. This is a preview.</span></span>
    <span class="sep"></span>${strip(at, at)}${button('Apply', { cls: 'sm', key: '↵', attrs: 'data-do="apply"' })}${button('Stop', { cls: 'sm quiet', key: 'Esc', attrs: 'data-do="stop"' })}`; };
  const cleaned = `<i class="ic big pop">${toyOf('checkbox')}</i><span class="lines"><span class="say">Cleaned up 60 places</span><span class="more">Text 14 · Spacing 24 · Colour 12 · Icons 10. All in your code now.</span></span>
    <span class="sep"></span>${strip(-1, 4)}${button('Undo all', { cls: 'sm quiet', attrs: 'data-do="undo"' })}`;
  const trials = `<h2 class="part">Proposed: the bar says what is wrong</h2><p class="lead">The bar has one job at a time. With one place in hand it says what was done by hand, in plain words, and the choice is made on the element. Press <b>Clean up all</b> and the same bar carries the whole-page clean-up: one pass at a time, shown on the page, written when you press Apply.</p>`
    + scene('pc', 'The bar, both jobs (live)', 'Press Clean up all, then Apply four times (or Enter). Stop goes back to the one place you were on.', `<div class="page">${rowsOf(true)}</div>${elementOn}<div class="ib two pl-card" role="status" aria-live="polite">${one}</div>`)
    + `<h2 class="part">Today</h2><p class="lead">The bar as it is now, for comparison.</p>`;

  root.innerHTML = `<style>${css}${LANGUAGE_CSS}${PRIMITIVES_CSS}${SHOW_CSS}${SCALE_CSS}${BUTTON_CSS}
    :host { display: block; font-family: var(--pl-sans); color: var(--pl-ink); }
    /* a trial for the dark scheme, in this comp only: the surfaces lifted from near-black (#1c1c1e) to a warm graphite,
       with a lighter edge and a softer shadow, so a dark bar on a light page is not a black slab */
    :host([data-scheme="dark"]) { --pl-paper: #2e2d2b; --pl-paper-2: #3a3936; --pl-rule: #4a4844; --pl-ink: #f4f3ef;
      --pl-shadow-card: 0 0 0 1px var(--pl-rule), 0 1px 1px rgb(0 0 0 / 0.18), 0 14px 32px -14px rgb(0 0 0 / 0.45); }
    .scene { margin: 0 0 28px; }
    .scene h2 { margin: 0 0 2px; font: 600 14px/20px var(--pl-sans); }
    .scene .note { margin: 0 0 10px; font: 400 13px/19px var(--pl-sans); color: var(--pl-ink-2); max-width: 760px; }
    .stage { position: relative; height: 330px; border-radius: 14px; overflow: hidden; background: #f3f4f6; box-shadow: inset 0 0 0 1px var(--pl-rule); outline: none; }
    .stage:focus-visible { box-shadow: inset 0 0 0 2px var(--pl-sky); }
    /* the page, as blueprint leaves it: quiet, with only the places of the cause lit */
    .page { position: absolute; inset: 22px 22px auto; border-radius: 12px; background: #fff; box-shadow: 0 1px 2px rgb(0 0 0 / .08); font: 14px/20px system-ui, sans-serif; color: #15181b; }
    .page .row { display: flex; align-items: center; gap: 12px; padding: 9px 16px; border-bottom: 1px solid #e6e8ec; }
    .page .row:last-child { border-bottom: 0; }
    .page .id { width: 62px; font-size: 12px; color: #5b6370; opacity: .45; }
    .page .t { flex: 1; opacity: .45; }
    .page .chip { padding: 3px 9px; border-radius: 5px; font-size: 12px; font-weight: 500; background: #fee4e2; color: #b42318; opacity: .45;
      transition: border-radius 520ms var(--pl-spring), outline-color 240ms var(--pl-ease-out); }
    .page .chip.lit { opacity: 1; outline: 1.5px solid var(--pl-coral); outline-offset: 2px; }
    .page .chip.lit.on-scale { outline-color: var(--pl-sky); }
    .page .chip.lit.written { outline-color: var(--pl-mint); }
    /* the control, on the element: the steps on a strip of paper that pops out of its element */
    .on { position: absolute; display: flex; align-items: center; gap: 8px; padding: 6px 8px 6px 10px; border-radius: 12px; background: var(--pl-paper); box-shadow: var(--pl-shadow-card);
      transform-origin: calc(100% - 30px) 0; transition: opacity 160ms var(--pl-ease-out), scale 200ms var(--pl-ease-out); }
    .on.pl-pop { transform-origin: calc(100% - 30px) 0; }
    .on[data-gone] { opacity: 0; scale: .9; pointer-events: none; }
    .on::before { content: ''; position: absolute; top: -5px; right: 26px; width: 10px; height: 10px; rotate: 45deg; background: var(--pl-paper); box-shadow: -1px -1px 0 0 var(--pl-rule); }
    .on.left::before { right: auto; left: 26px; }
    /* no element to sit on: the same strip, docked on the bar it belongs to, so the bar itself never grows */
    .on.docked { left: 50%; bottom: 76px; translate: -50% 0; }
    .on.docked::before { top: auto; bottom: -5px; right: auto; left: calc(50% - 5px); box-shadow: 1px 1px 0 0 var(--pl-rule); }
    .on .ic { display: grid; place-items: center; width: 18px; height: 18px; color: var(--pl-ink-2); }
    .on .ic svg { width: 18px; height: 18px; display: block; }
    .on .keys { font: 500 11px/1 var(--pl-mono); color: var(--pl-ink-3); padding-left: 2px; }
    .on .name { display: inline-flex; align-items: center; height: 26px; padding: 0 8px; border-radius: 8px; font: 500 12px/1 var(--pl-mono); color: var(--pl-ink-2); box-shadow: inset 0 0 0 1px var(--pl-rule); }
    .on .name b { font-weight: 600; color: var(--pl-ink); border-bottom: 1.5px solid var(--pl-sky); padding-bottom: 1px; margin-left: 1px; }
    /* the bar */
    .fb { position: absolute; left: 50%; bottom: 16px; translate: -50% 0; max-width: calc(100% - 24px); box-sizing: border-box; display: flex; align-items: center; gap: 11px; height: 50px; padding: 0 8px 0 13px; border-radius: 25px; white-space: nowrap; }
    .fb .what { display: inline-flex; align-items: center; gap: 8px; }
    /* the cause opens with its toys: the property, the class, and the kind of thing it is on; each says its name when pointed at */
    .fb .what .ic { position: relative; display: block; width: 26px; height: 26px; flex: none; transition: scale 300ms var(--pl-spring-pop), rotate 300ms var(--pl-spring-pop); }
    .fb .what .ic:hover { scale: 1.16; rotate: -6deg; }
    .fb .what .ic svg { width: 100%; height: 100%; display: block; overflow: visible; }
    .fb .what .in { font: 500 12px/1 var(--pl-sans); color: var(--pl-ink-2); }
    .fb .what .ic::after { content: attr(data-tip); position: absolute; left: 50%; bottom: calc(100% + 8px); translate: -50% 4px; padding: 4px 8px; border-radius: 8px; background: var(--pl-ink); color: var(--pl-paper);
      font: 600 11px/1.2 var(--pl-sans); text-transform: capitalize; white-space: nowrap; opacity: 0; pointer-events: none; transition: opacity 140ms var(--pl-ease-out), translate 220ms var(--pl-spring-pop); }
    .fb .what .ic:hover::after { opacity: 1; translate: -50% 0; }
    .fb code { font: 600 13px/1 var(--pl-mono); color: var(--pl-ink); }
    .fb .move { display: inline-flex; align-items: center; gap: 5px; }
    .fb .move .sh-chips { flex-wrap: nowrap; }
    .fb .move .sh-chip { color: var(--pl-ink); }
    .fb .to { color: var(--pl-ink-3); font-size: 12px; }
    .fb .name { height: 20px; padding: 0 7px; font-size: 11px; }
    .fb .name.swap { animation: pl-pop 260ms var(--pl-spring-pop) both; }
    .fb .marks { display: inline-flex; align-items: center; }
    /* the places, two rows of marks: a glance says how many, and how many are written */
    .fb .marks .sc-places { display: grid; grid-template-columns: repeat(8, 5px); gap: 3px; }
    .fb .marks .sc-places:has(> :only-child) { grid-template-columns: 5px; }
    .fb .nav { display: inline-flex; align-items: center; gap: 2px; font: 500 12px/1 var(--pl-mono); color: var(--pl-ink-2); }
    .fb .nav button { all: unset; display: grid; place-items: center; width: 22px; height: 22px; border-radius: 6px; cursor: pointer; color: var(--pl-ink-2); }
    .fb .nav button:hover { background: var(--pl-paper-2); }
    .fb .acts { display: inline-flex; gap: 6px; padding-top: 2px; }
    .fb[data-written] .go { --hue: var(--pl-mint); --base: color-mix(in oklab, var(--pl-mint) 72%, #000); }
    .fb .inbar { display: inline-flex; align-items: center; }
    /* ── the trial: a bar that only says what is wrong ── */
    h2.part { margin: 0 0 4px; } h2.part:not(:first-of-type) { margin-top: 44px; } p.lead { margin: 0 0 22px; }
    .ib { position: absolute; left: 50%; bottom: 16px; translate: -50% 0; max-width: calc(100% - 24px); box-sizing: border-box; display: flex; align-items: center; gap: 12px; height: 50px; padding: 0 10px 0 13px; border-radius: 25px; white-space: nowrap; }
    .ib .ic { display: block; width: 26px; height: 26px; flex: none; } .ib .ic svg { display: block; width: 100%; height: 100%; overflow: visible; }
    .ib .say { display: inline-flex; align-items: center; gap: 7px; font: 650 14.5px/1 var(--pl-sans); color: var(--pl-ink); }
    .ib .more { display: inline-flex; align-items: center; gap: 6px; font: 500 13px/1 var(--pl-sans); color: var(--pl-ink-2); }
    .ib .sep { width: 1px; height: 22px; margin: 0 2px; background: var(--pl-rule); }
    .ib .nav { display: inline-flex; align-items: center; gap: 2px; font: 500 12px/1 var(--pl-mono); color: var(--pl-ink-2); }
    .ib .nav button { all: unset; display: grid; place-items: center; width: 22px; height: 22px; border-radius: 6px; cursor: pointer; color: var(--pl-ink-2); }
    .ib .nav button:hover { background: var(--pl-paper-2); }
    .ib.two { height: 64px; border-radius: 22px; padding-left: 12px; }
    .ib .ic.big { width: 36px; height: 36px; }
    .ib .lines { display: flex; flex-direction: column; gap: 7px; }
    .ruler { position: relative; display: block; width: 132px; height: 36px; }
    .ruler .line { position: absolute; left: 4px; right: 4px; top: 17px; height: 2px; border-radius: 1px; background: var(--pl-rule); }
    .ruler .tick { position: absolute; top: 12px; width: 2.5px; height: 12px; margin-left: -1.25px; border-radius: 2px; background: var(--pl-sky); }
    .ruler small { position: absolute; top: 26px; translate: -50% 0; font: 500 9.5px/1 var(--pl-mono); color: var(--pl-ink-3); }
    .ruler .off { position: absolute; top: 13px; width: 10px; height: 10px; margin-left: -5px; border-radius: 3px; rotate: 45deg; background: var(--pl-coral); }
    .ruler b { position: absolute; top: 0; translate: -50% 0; font: 700 10.5px/1 var(--pl-mono); color: var(--pl-coral); }
    #pc .on { gap: 6px; padding-right: 8px; }
    .ib .passes { display: inline-flex; align-items: center; gap: 6px; padding: 0 4px; }
    .ib .ps { position: relative; display: block; width: 24px; height: 24px; transition: opacity 240ms var(--pl-ease-out), scale 320ms var(--pl-spring-pop), filter 240ms var(--pl-ease-out); }
    .ib .ps svg { display: block; width: 100%; height: 100%; overflow: visible; }
    .ib .ps.soon { opacity: .35; filter: grayscale(1); scale: .86; }
    .ib .ps.now { scale: 1.12; }
    .ib .ps.now::before { content: ''; position: absolute; inset: -5px; border-radius: 10px; box-shadow: 0 0 0 2px var(--pl-sky); }
    .ib .ps.done::after { content: ''; position: absolute; right: -4px; bottom: -4px; width: 11px; height: 11px; border-radius: 50%; background: var(--pl-mint) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath d='M3 6.2l2 2 4-4.4' fill='none' stroke='white' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center / 100% no-repeat; box-shadow: 0 0 0 2px var(--pl-paper); }
    .ib .more .pl-pill { margin: 0; }
    .ib .ic.pop { animation: pl-pop 320ms var(--pl-spring-pop) both; }
    .ib .tb { flex: none; }
    #pc .on { transition: opacity 200ms var(--pl-ease-out), scale 220ms var(--pl-ease-out); }
    #pc[data-mode="clean"] .on { opacity: 0; scale: .92; pointer-events: none; }
    #pc .page .chip { transition: border-radius 520ms var(--pl-spring), outline-color 240ms var(--pl-ease-out), padding 520ms var(--pl-spring), font-size 520ms var(--pl-spring), opacity 300ms; }
    #pc[data-mode="clean"] .page .t, #pc[data-mode="clean"] .page .id { opacity: 1; transition: opacity 300ms; }

    .again { position: absolute; left: 50%; translate: -50% 0; bottom: 78px; font: 500 12px/1 var(--pl-sans); color: var(--pl-ink-2); background: none; border: 0; cursor: pointer; text-decoration: underline; }
    .again[hidden] { display: none; }
    @keyframes click { 28% { translate: 0 2px; } 62% { translate: 0 -1px; } }
    .page .chip.click { animation: click 320ms var(--pl-ease-out); }
    @media (prefers-reduced-motion: reduce) { .page .chip { transition: none; } .page .chip.click { animation: none; } .fb .name.swap { animation: none; } }
  </style>${TOY_DEFS}
  ${trials}
  ${scene('one', '1 · A step your scale has (live)', 'The chip’s corner is 5px, between two of your steps. The steps pop out of the chip itself. Moving between them rounds every place on the page and rolls the value in the bar; the outline goes blue once it sits on a step. Enter writes it: the places click in one after another and their marks turn green.', '')}
  ${scene('two', '2 · A value your scale doesn’t have', '64px is past your largest step, so the fix is a new step. It is named where the steps are: the name is the only thing you type. Enter adds it to your theme.',
    `<div class="page">${rowsOf(false)}</div>
     <div class="on left" style="top: 150px; left: 40px;"><span class="ic" title="Position">${toyOf('position')}</span>${stepper('Spacing', s2)}<span class="name">--spacing-<b>gutter</b></span></div>`
    + bar({ icon: 'position', on: 'toast', cls: 'bottom-[64px]', from: '64', to: 64, name: 'new · gutter', nameHue: 'sky', marks: 1, at: 32, act: 'Add to theme' }))}
  ${scene('three', '3 · A place that isn’t on the page right now', 'The place is in a part the page shows only sometimes (a toast). There is no element to put the steps on, so the same strip docks on the bar, and one tag says why. The bar keeps its width.',
    `<div class="page">${rowsOf(false)}</div>
     <div class="on docked"><span class="ic" title="Padding">${toyOf('padding')}</span>${stepper('Spacing', s3)}<span class="keys">↑ ↓</span></div>`
    + bar({ icon: 'padding', on: 'toast', cls: 'px-[7px]', from: '7', to: 8, name: 's2', at: 41, act: 'Use px-s2',
      extra: `<span class="pl-tag" data-hue="butter" title="In a part this page shows only sometimes. Fixing it still changes your code.">Not showing now</span>` }))}`;

  // ── the live one ──
  const stage = root.querySelector('#one .stage');
  stage.tabIndex = 0;
  let s, written;
  const draw = () => {
    stage.querySelector('.on .ctl').innerHTML = radius('Corner', s);
    bind(stage.querySelector('.on'), { pick: (_, i) => pick(i), peek: (_, i) => show(radii[i].n), unpeek: () => show(now().n) });
    for (const group of stage.querySelectorAll('.on .ep[role="radiogroup"]')) place(group);
  };
  const now = () => radii.find((r) => r.token === s.picked);
  // the page and the bar say the same value: every place takes the corner, the chip rolls to it
  const show = (n) => {
    for (const el of stage.querySelectorAll('.chip.lit')) { el.style.borderRadius = `${n}px`; el.classList.toggle('on-scale', radii.some((r) => r.n === n)); }
    roll(stage.querySelector('.fb .sh-chip'), n);
  };
  const pick = (i) => {
    if (written) return;
    const to = radii[Math.max(0, Math.min(radii.length - 1, i))];
    if (to.token === s.picked) return;
    s.picked = to.token;
    draw(); show(to.n);
    const name = stage.querySelector('.fb .name'); name.textContent = to.token; name.classList.remove('swap'); void name.offsetWidth; name.classList.add('swap');
    stage.querySelector('.fb .go .lb').textContent = `Use rounded-${to.token}`;
  };
  const write = () => {
    if (written) return;
    written = true;
    const beat = still ? 0 : 1;
    stage.querySelector('.on').setAttribute('data-gone', '');
    // the places on the page click in, top to bottom; their marks in the bar turn from coral squares to mint discs
    [...stage.querySelectorAll('.chip.lit')].forEach((el, i) => setTimeout(() => { el.classList.add('click', 'written'); }, beat * (80 + i * 110)));
    [...stage.querySelectorAll('.fb .sc-place')].forEach((m, k) => setTimeout(() => { m.dataset.tone = 'on'; m.dataset.show = 'arrive'; }, beat * (80 + k * 38)));
    setTimeout(() => {
      const fb = stage.querySelector('.fb'); fb.setAttribute('data-written', '');
      fb.querySelector('.sh-chip').removeAttribute('data-on'); fb.querySelector('.sh-chip').setAttribute('data-done', '');
      fb.querySelector('.go .top').innerHTML = `<span class="lb">Written at 16 places</span>`;
      stage.querySelector('.again').hidden = false;
    }, beat * (80 + 16 * 38 + 120));
  };
  const reset = () => {
    written = false;
    s = { steps: radii, current: null, picked: 'tag', drift: { n: 5, label: '5' } };
    stage.innerHTML = `<div class="page">${rowsOf(true)}</div>
      <div class="on pl-pop" style="top: 78px; right: 30px;"><span class="ic" title="Corner">${toyOf('corner')}</span><span class="ctl"></span><span class="keys">↑ ↓</span></div>`
      + bar({ icon: 'corner', on: 'tag', cls: 'rounded-[5px]', from: '5', to: 5, name: 'tag', marks: 16, at: 3, act: 'Use rounded-tag' })
      + `<button type="button" class="again" hidden>Play it again</button>`;
    stage.querySelector('.fb .sh-chip').setAttribute('data-on', '');
    for (const el of stage.querySelectorAll('.chip.lit')) el.style.borderRadius = '5px';
    draw();
    stage.querySelector('.again').onclick = reset;
    stage.querySelector('.fb .go').onclick = write;
    // the fix it opens on is tried at once, as the product does: the page moves to the nearest step
    requestAnimationFrame(() => show(now().n));
  };
  stage.addEventListener('keydown', (e) => {
    const at = radii.findIndex((r) => r.token === s.picked);
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { e.preventDefault(); pick(at + 1); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { e.preventDefault(); pick(at - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); write(); }
  });
  reset();

  for (const id of ['two', 'three', 'pc']) bind(root.querySelector('#' + id), {});
  for (const group of root.querySelectorAll(':is(#two, #three, #pc) .ep[role="radiogroup"]')) place(group);

  // ── the proposed bar, live: one place, then the clean-up, pass by pass ──
  const pc = root.querySelector('#pc'), ib = pc.querySelector('.ib');
  // what each pass does to the page, shown before it is written (a stand-in for the real show)
  const LOOKS = [
    (p) => { for (const t of p.querySelectorAll('.t')) t.style.fontSize = '14.5px'; },
    (p) => { for (const r of p.querySelectorAll('.row')) r.style.padding = '12px 16px'; },
    (p) => { for (const c of p.querySelectorAll('.chip')) { c.style.background = '#fde7f1'; c.style.color = '#b0306f'; } },
    (p) => { for (const c of p.querySelectorAll('.chip')) { c.style.borderRadius = '6px'; c.style.padding = '3px 10px'; } },
  ];
  let at = -1;
  const page = () => pc.querySelector('.page');
  const render = () => {
    pc.dataset.mode = at < 0 ? 'one' : 'clean';
    ib.innerHTML = at < 0 ? one : at < PASSES.length ? cleaning(at) : cleaned;
    if (at >= 0 && at < PASSES.length) LOOKS[at](page());
  };
  const resetPage = () => { page().outerHTML = `<div class="page">${rowsOf(true)}</div>`; };
  ib.addEventListener('click', (e) => {
    const act = e.target.closest('[data-do]')?.dataset.do;
    if (act === 'all') { at = 0; render(); }
    else if (act === 'apply') { at += 1; render(); }
    else if (act === 'stop' || act === 'undo') { at = -1; resetPage(); render(); }
  });
  pc.querySelector('.stage').addEventListener('keydown', (e) => {
    if (at < 0 || at >= PASSES.length) return;
    if (e.key === 'Enter') { e.preventDefault(); at += 1; render(); }
    if (e.key === 'Escape') { e.preventDefault(); at = -1; resetPage(); render(); }
  });
  pc.querySelector('.stage').tabIndex = 0;
  for (const c of root.querySelectorAll('#two .sh-chip, #three .sh-chip')) c.setAttribute('data-on', '');
}
