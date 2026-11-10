// The design site's page for buttons: what it draws inside its host. The site (web/design/Part.jsx) gives it the host,
// the overlay's token file as text, and the scheme; it draws with the overlay's own source.
import { LANGUAGE_CSS } from '../../../overlay/src/language.js';
import { TOY_DEFS, toyOf } from '../../../overlay/src/toys.js';
import { BUTTON_CSS, button as b } from '../../../overlay/src/kit.js';

export function mount(host, root, css) {


  // toys used on buttons (from the icon sheet): on a solid button they are cut out in white; on a quiet one, in colour
  const svg = (body) => `<svg viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;
  const CHECK = (c) => svg(`<path d="M5.500 12.600l4.200 4.200 8.800-10" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`);
  const UNDO = (c) => svg(`<path d="M9.500 6 5 10.500 9.500 15" fill="none" stroke="${c}" stroke-width="2.600" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.500 10.500h8a5.500 5.500 0 0 1 0 11H11" fill="none" stroke="${c}" stroke-width="2.600" stroke-linecap="round"/>`);
  const SPARK = (c) => svg(`<path d="M12 1.800 14.500 9.500 22.200 12l-7.700 2.500L12 22.200l-2.500-7.700L1.800 12l7.700-2.500z" fill="${c}"/>`);
  const CLOSE = (c) => svg(`<path d="M6.500 6.500l11 11M17.500 6.500l-11 11" fill="none" stroke="${c}" stroke-width="2.800" stroke-linecap="round"/>`);
  const DOTS = `<span class="tb-dots" aria-hidden="true"><i></i><i></i><i></i></span>`;
  const kbd = (k) => `<kbd>${k}</kbd>`;
  const cell = (name, html, note = '') => `<div class="cell"><div class="stage">${html}</div><b>${name}</b>${note ? `<small>${note}</small>` : ''}</div>`;
  const set = (title, why, body) => `<section class="set"><h2>${title}</h2>${why ? `<p>${why}</p>` : ''}<div class="cells">${body}</div></section>`;

  root.innerHTML = `<style>${css}${LANGUAGE_CSS}
    /* the night strengths, side by side on the dark page, whatever the site's scheme */
    .night { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; padding: 14px; border-radius: 22px; background: #1f1e1d; }
    .nopt { display: grid; gap: 8px; align-content: start; padding: 16px 14px; border-radius: 16px; background: #2e2d2b; color: #f4f3ef; }
    .nopt .nbtns { display: grid; justify-items: start; gap: 12px; margin-bottom: 6px; }
    .nopt b { font: var(--pl-round-w, 700) 14px/1.2 var(--pl-round); }
    .nopt small { font: 400 12px/1.4 var(--pl-sans); color: #a8a6a0; }
    @media (max-width: 760px) { .night { grid-template-columns: 1fr 1fr; } }
    :host { display: block; font-family: var(--pl-sans); color: var(--pl-ink); }
    :host([data-scheme="dark"]) { --pl-paper: #2a2930; --pl-paper-2: #35343c; --pl-rule: #45444d; --pl-ink: #f4f3ef; }

    ${BUTTON_CSS}
    /* ── the page ── */
    .set { margin: 0 0 14px; padding: 16px 16px 18px; border-radius: 18px; background: var(--pl-paper); box-shadow: 0 0 0 1px var(--pl-rule); }
    .set h2 { margin: 0; font: 600 15px/20px var(--pl-sans); }
    .set p { margin: 3px 0 0; font: 400 13px/19px var(--pl-sans); color: var(--pl-ink-2); max-width: 760px; }
    .cells { display: grid; grid-template-columns: repeat(auto-fill, minmax(176px, 1fr)); gap: 10px; margin-top: 14px; }
    .cell { padding: 12px; border-radius: 14px; background: var(--pl-paper-2); display: flex; flex-direction: column; gap: 3px; }
    .cell .stage { display: flex; align-items: center; justify-content: center; gap: 8px; flex-wrap: wrap; min-height: 64px; padding: 6px 0 10px; }
    .cell b { font: 600 13px/16px var(--pl-sans); }
    .cell small { font: 400 11px/14px var(--pl-sans); color: var(--pl-ink-2); }
    .cell.wide { grid-column: span 2; }
    .anat { display: grid; grid-template-columns: auto 1fr; gap: 22px; align-items: center; margin-top: 14px; }
    .anat .big { padding: 26px 34px; border-radius: 14px; background: var(--pl-paper-2); }
    .anat .big .tb { --h: 56px; font-size: 19px; border-radius: 18px; padding-top: 6px; height: calc(var(--h) + 6px); --lift: 6px; }
    .anat .big .tb:hover { --lift: 9px; }
    .anat .big .tb .top { border-radius: 18px; padding: 0 24px; gap: 10px; }
    .anat .big .tb kbd { min-width: 28px; height: 28px; font-size: 15px; border-radius: 9px; }
    .anat ol { margin: 0; padding-left: 20px; font: 400 13px/20px var(--pl-sans); color: var(--pl-ink-2); }
    .anat ol b { color: var(--pl-ink); font-weight: 600; }
    .bar { display: inline-flex; align-items: center; gap: 8px; padding: 7px 8px 5px 14px; border-radius: 22px; background: var(--pl-paper); box-shadow: var(--pl-shadow-card); }
    .bar { white-space: nowrap; }
    .bar code { font: 600 13px/1 var(--pl-mono); white-space: nowrap; }
    .bar .in { font: 500 12px/1 var(--pl-sans); color: var(--pl-ink-2); }
    .bar .toy { position: relative; display: block; width: 26px; height: 26px; flex: none; transition: scale 300ms var(--pl-spring-pop), rotate 300ms var(--pl-spring-pop); }
    .bar .toy:last-of-type { margin-right: 8px; }
    .bar .toy:hover { scale: 1.16; rotate: -6deg; }
    .bar .toy svg { display: block; width: 100%; height: 100%; overflow: visible; }
    .bar .toy::after { content: attr(data-tip); position: absolute; left: 50%; bottom: calc(100% + 8px); translate: -50% 4px; padding: 4px 8px; border-radius: 8px; background: var(--pl-ink); color: var(--pl-paper);
      font: 600 11px/1.2 var(--pl-sans); text-transform: capitalize; white-space: nowrap; opacity: 0; pointer-events: none; transition: opacity 140ms var(--pl-ease-out), translate 220ms var(--pl-spring-pop); }
    .bar .toy:hover::after { opacity: 1; translate: -50% 0; }
    .cell.full { grid-column: 1 / -1; }
    .old { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
    @media (max-width: 640px) { .anat { grid-template-columns: 1fr; } .cell.wide { grid-column: auto; } }
  </style>${TOY_DEFS}

  <section class="set"><h2>What a button is made of</h2><p>Press this one and hold it.</p>
    <div class="anat"><div class="big">${b('Use rounded-tag', { key: '↵' })}</div>
      <ol>
        <li><b>The top.</b> One solid hue, lit from above: a bright rim along its top edge, a darker one along its bottom. The label is cut out of it in white, never a darker tint of the same colour.</li>
        <li><b>The side.</b> The same hue, darker. It shows as a 4px lip under the top and never moves, so pressing shifts nothing around the button. Under it, a soft shadow of the button’s own colour.</li>
        <li><b>The press.</b> A button is a soft block. Pointed at, it comes up 2px to meet the finger. Pressed, it goes down onto its side and squashes a hair wider. Let go, it springs back past where it rests and settles, as one body. How far it gives depends on its size: a small button is stiffer and quicker than a big one.</li>
        <li><b>The key.</b> If a key does the same thing, its cap sits on the top, at the end of the label. One key, never a combination spelled out.</li>
      </ol></div></section>

  ${set('Kinds', 'Hue says what pressing does. Pink acts. Paper is the quiet choice beside it. Mint has landed. Coral destroys.',
    cell('Action', b('Add to theme', { key: '↵' }), 'the one thing this moment is for')
    + cell('Quiet', b('Keep', { cls: 'quiet', key: 'K' }), 'a real choice, not the main one')
    + cell('Done', b('Written', { cls: 'done', icon: CHECK('currentColor') }), 'what an action turns into')
    + cell('Destroys', b('Discard all', { cls: 'wrong' }), 'only for what can’t be put back'))}

  ${set('States', 'The same button in each state it can be in. The first four you can also do yourself on any button on this page.',
    cell('Rest', b('Apply', { key: 'A' }), 'the top sits 4px up, on its shadow')
    + cell('Pointed at', b('Apply', { key: 'A', attrs: 'data-show="hover"' }), 'rises to 6, the shadow grows')
    + cell('Pressed', b('Apply', { key: 'A', attrs: 'data-show="pressed"' }), 'down on its side, a hair wider')
    + cell('Focused', b('Apply', { key: 'A', attrs: 'data-show="focus"' }), 'a sky ring, keyboard only')
    + cell('Working', `<button type="button" class="tb" aria-busy="true"><span class="top"><span class="lb">Apply</span>${kbd('A')}</span>${DOTS}</button>`, 'held down; keeps its width')
    + cell('Landed', b('Applied', { cls: 'done landed', icon: CHECK('currentColor') }), 'turns mint, the tick pops')
    + cell('Not there', b('Apply', { key: 'A', attrs: 'disabled' }), 'pale and flat: nothing to press')
    + cell('Refused', b('Try again', { cls: 'quiet', icon: UNDO('var(--pl-coral)') }), 'quiet, with what to do next'))}

  ${set('Try it', 'Press Apply. It works for a second and a half, lands, then offers Undo.',
    `<div class="cell wide"><div class="stage" id="try">${b('Apply 3 changes', { key: 'A', attrs: 'id="go"' })}</div><b>A write, start to finish</b><small>rest → working → landed → undo</small></div>`
    + cell('Toggle', b('Select', { cls: 'quiet', attrs: 'id="toggle" aria-pressed="false"' }), 'pressed stays down'))}

  ${set('Sizes', 'Three heights. Small is for inside a bar. Large is the smallest a finger should be asked to hit; on a touch screen every button is large.',
    cell('Small · 28', b('Skip', { cls: 'sm quiet', key: '→' }) + b('Use', { cls: 'sm' }))
    + cell('Regular · 36', b('Skip', { cls: 'quiet', key: '→' }) + b('Use'))
    + cell('Large · 44', b('Use rounded-tag', { cls: 'lg', key: '↵' })))}

  ${set('With a picture', 'On a solid top a picture is cut out in white. On a quiet top it keeps its colour. A picture alone is a square, and says its name when pointed at.',
    cell('Cut out', b('Clean up', { icon: SPARK('currentColor') }))
    + cell('In colour', b('Undo', { cls: 'quiet', icon: UNDO('var(--pl-lilac)') }))
    + cell('Alone', b('', { cls: 'only quiet', icon: UNDO('var(--pl-lilac)'), attrs: 'data-tip="Undo" aria-label="Undo"' }) + b('', { cls: 'only quiet', icon: CLOSE('var(--pl-ink-2)'), attrs: 'data-tip="Close" aria-label="Close"' }) + b('', { cls: 'only', icon: SPARK('currentColor'), attrs: 'data-tip="Clean up" aria-label="Clean up"' }), 'point at one'))}

  ${set('Together', 'In the fix bar: one action, then the quiet ones. Never two pink buttons side by side.',
    `<div class="cell full"><div class="stage"><span class="bar"><i class="toy" data-tip="corner">${toyOf('corner')}</i><code>rounded-[5px]</code><span class="in">on a</span><i class="toy" data-tip="tag">${toyOf('tag')}</i>${b('Use rounded-tag', { cls: 'sm', key: '↵' })}${b('Keep', { cls: 'sm quiet', key: 'K' })}${b('Skip', { cls: 'sm quiet', key: '→' })}</span></div><b>The fix bar’s three</b><small>the cause opens with its toys; then one action and the quiet ones</small></div>`)}

  <section class="set"><h2>What the overlay has today</h2><p>The current button, for comparison: a pale pink pill with dark pink words. In the new language pale means “not there”, so today’s main action reads as switched off.</p>
    <div class="old"><button type="button" class="pl-act">Use rounded-tag <kbd>↵</kbd></button><button type="button" class="pl-act quiet">Keep <kbd>K</kbd></button><button type="button" class="pl-act" disabled>Apply</button></div></section>`;

  // the write, start to finish
  const go = root.getElementById('go'), stage = root.getElementById('try');
  const label = (el, text) => { el.querySelector('.lb').textContent = text; };
  const rest = () => { stage.innerHTML = b('Apply 3 changes', { key: 'A', attrs: 'id="go"' }); root.getElementById('go').onclick = run; };
  function run(e) {
    const el = e.currentTarget;
    if (el.getAttribute('aria-busy')) return;
    el.setAttribute('aria-busy', 'true'); el.insertAdjacentHTML('beforeend', DOTS);
    setTimeout(() => {
      stage.innerHTML = b('Applied', { cls: 'done landed', icon: CHECK('currentColor') }) + b('Undo', { cls: 'quiet', icon: UNDO('var(--pl-lilac)'), attrs: 'id="undo"' });
      root.getElementById('undo').onclick = rest;
    }, 1500);
  }
  go.onclick = run;
  const toggle = root.getElementById('toggle');
  const pressed = document.createElement('style');
  pressed.textContent = `.tb[aria-pressed="true"] { --lift: 1px; box-shadow: none; --hue: var(--pl-sky-soft); --base: var(--pl-sky); --on: var(--pl-sky-ink); } .tb[aria-pressed="true"] .top { box-shadow: inset 0 0 0 1.5px var(--pl-sky); }`;
  root.append(pressed);
  toggle.onclick = () => { const on = toggle.getAttribute('aria-pressed') !== 'true'; toggle.setAttribute('aria-pressed', String(on)); label(toggle, on ? 'Selecting' : 'Select'); };
}
