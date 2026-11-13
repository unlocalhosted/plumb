// The design site's page for surfaces: what things sit on, and how high. There are three heights and no others:
// pressed in (a well), flat (the ground and the one inset tone), lifted (a card, a tag, a soft block). Each is shown
// holding the product's own pieces (the fix bar's field, the language's pills and tags, the name tag, the kit's
// buttons, a soft block), once by day and once by night; then the tokens, read from the token file itself.
import { LANGUAGE_CSS } from '../../../overlay/src/language.js';
import { TOY_DEFS, toyOf } from '../../../overlay/src/toys.js';
import { BUTTON_CSS, button as b } from '../../../overlay/src/kit.js';
import { SOFT_CSS } from '../../../overlay/src/soft.js';
import { FIX_FIELD_CSS } from '../../../overlay/src/field.js';
import { NAME_TAG_CSS } from '../../../overlay/src/nametag.js';
import { TAG } from '../../../overlay/src/words.js';

export function mount(host, root, css) {
  // the pieces, each the product's own markup
  const well = `<div class="fx"><label class="field" data-ok>--spacing-<span class="slot"><input value="gutter" style="--w:6.5ch" aria-label="Name of the new gap" tabindex="-1" readonly></span><span class="val">: 13px</span><i class="ok-tick" aria-hidden="true"></i></label></div>`;
  const pills = `<span class="pl-pill" data-hue="mint">p-4</span><span class="pl-pill" data-hue="lilac">gap-3</span><span class="pl-pill" data-hue="sky">text-sm</span><span class="pl-pill" data-hue="coral">13px</span>`;
  const tag = `<span class="pl-tag">${toyOf('card')}PricingCard</span>`;
  const nameTag = `<div class="tag"><span class="el">Button</span><span class="who">in PricingCard</span><span class="n">${TAG.off(2)}</span></div>`;
  const card = `<div class="pl-card crd"><div class="hd">${tag}<span class="pl-pill" data-hue="coral">rounded-[9px]</span></div>${well}<div class="acts">${b('Add to theme', { cls: 'sm', key: '↵' })}${b('Keep', { cls: 'sm quiet', key: 'K' })}</div></div>`;
  const block = `<a class="s-box" data-hue="butter" href="#" onclick="return false"><span class="in"><span class="plate"><i class="toy">${toyOf('card')}</i></span><b>Surfaces</b><em>Three heights, and no others.</em></span></a>`;

  // the same desk, by day and by night: every height at once
  const desk = (scheme, name) => `<div class="desk pl-${scheme}"><small>${name}</small>
      <div class="lay"><div class="left">${block}<div class="strip">${pills}</div></div><div class="right">${nameTag}${card}</div></div></div>`;

  // the tokens, from the file: name, value now, and the file's own note on what it is for
  const TOKENS = ['bg-page', 'bg-surface', 'bg-inset', 'bg-surface-hover', 'bg-surface-pressed', 'bg-selected', 'bg-scrim', 'shadow-card', 'shadow-tag', 'shadow-well'];
  const MINE = { 'shadow-card': 'a card, a menu, a bar: the one soft shadow (no note in the file; this one is the page’s)', 'shadow-tag': 'a tag or a pill held over your page: tight, close to the page (no note in the file; this one is the page’s)' };
  const noteOf = (name) => (new RegExp(`--pl-${name}:[^;]*;\\s*/\\*\\s*([^*]+?)\\s*\\*/`).exec(css)?.[1] ?? MINE[name] ?? '');

  const HEIGHTS = [
    ['Pressed in', 'A well', 'Where you type, or a line you copy. It is sunk into the surface that holds it: the opposite of a button, so it never looks pressable.', `<div class="on-card">${well}</div>`, ['bg-inset', 'shadow-well']],
    ['Flat', 'The ground', 'White. Nothing is cream and nothing has an outline: a thing is told apart by being a solid thing.', `<div class="ground">${tag}<span class="pl-tag" data-hue="sky">${toyOf('heading')}h3</span></div>`, ['bg-page']],
    ['Flat', 'The inset tone', 'The one quieter tone, with no edge: a strip, a track, the ground under a row of small things.', `<div class="strip">${pills}</div>`, ['bg-inset']],
    ['Lifted', 'A tag', 'A small thing held over your page: the name tag, a value pill by a mark. A tight shadow, close to the page.', nameTag, ['bg-surface', 'shadow-tag']],
    ['Lifted', 'A card', 'What you work in: paper, with the one soft shadow. The only lifted thing that holds other things.', card, ['bg-surface', 'shadow-card']],
    ['Lifted', 'A soft block', 'A thing you can go to or press. It stands on a side of its own colour and goes down under the finger.', block, []],
  ];

  root.innerHTML = `<style>${css}${LANGUAGE_CSS}${SOFT_CSS}${BUTTON_CSS}${FIX_FIELD_CSS}${NAME_TAG_CSS}
    :host { display: block; font-family: var(--pl-sans); color: var(--pl-text-primary); }
    h2 { margin: 44px 0 6px; font: 600 20px/28px var(--pl-sans); letter-spacing: -0.01em; }
    h2 + p { margin: 0 0 10px; font: 400 14px/22px var(--pl-sans); color: var(--pl-text-secondary); max-width: 680px; }
    code { font: 500 12px/1.4 var(--pl-mono); }

    /* the pieces, standing still on this page instead of floating over yours */
    .tag { position: relative; display: inline-flex; }
    .fx .field { margin: 0; }
    .crd { display: grid; gap: 12px; width: 300px; max-width: 100%; box-sizing: border-box; padding: 14px; }
    .crd .hd { display: flex; align-items: center; gap: 8px; }
    .crd .acts { display: flex; gap: 8px; }
    .strip { display: flex; flex-wrap: wrap; gap: 8px; padding: 14px 16px; border-radius: 16px; background: var(--pl-bg-inset); }
    .s-box { width: 210px; max-width: 100%; }
    .s-box .toy { display: block; width: 40px; height: 40px; } .s-box .toy svg { display: block; width: 100%; height: 100%; overflow: visible; }
    .pl-tag svg { width: 14px; height: 14px; }

    /* day and night: the same desk twice. pl-light and pl-dark are the overlay's own switches for a part of a page */
    .twin { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px; padding: 16px; border-radius: 34px; background: var(--pl-bg-inset); }
    .desk { position: relative; padding: 58px 30px 36px; border-radius: 26px; background: var(--pl-bg-page); color: var(--pl-text-primary); }
    .desk > small { position: absolute; left: 26px; top: 22px; font: var(--pl-round-w, 700) 13px/1 var(--pl-round); color: var(--pl-text-secondary); }
    .lay { display: flex; flex-wrap: wrap; gap: 26px 30px; align-items: flex-start; justify-content: center; }
    .lay .left, .lay .right { display: grid; gap: 22px; justify-items: start; }

    /* each height on its own: the piece on the left, what it is on the right */
    .heights { display: grid; gap: 0; margin-top: 10px; }
    .rung { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 36px; align-items: center; padding: 34px 0; }
    .rung + .rung { border-top: 1.5px solid color-mix(in oklab, var(--pl-text-primary) 7%, transparent); }
    .rung .show { display: grid; place-items: center; min-height: 120px; }
    .rung .on-card { padding: 16px; border-radius: var(--pl-radius-card); background: var(--pl-bg-surface); box-shadow: var(--pl-shadow-card); }
    .rung .ground { display: flex; gap: 10px; }
    .rung .say small { display: block; font: var(--pl-round-w, 700) 12px/1 var(--pl-round); letter-spacing: .04em; text-transform: uppercase; color: var(--pl-text-secondary); }
    .rung .say b { display: block; margin: 8px 0 6px; font: var(--pl-round-w, 700) 22px/26px var(--pl-round); }
    .rung .say p { margin: 0; font: 400 14px/22px var(--pl-sans); color: var(--pl-text-secondary); max-width: 420px; }
    .rung .say .toks { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }

    .toks-tbl { margin-top: 16px; border-radius: 24px; background: var(--pl-bg-inset); padding: 8px 22px; }
    .tr { display: grid; grid-template-columns: 210px 46px minmax(0, 1fr); gap: 16px; align-items: center; padding: 12px 0; font: 400 13px/19px var(--pl-sans); color: var(--pl-text-secondary); }
    .tr + .tr { border-top: 1.5px solid color-mix(in oklab, var(--pl-text-primary) 7%, transparent); }
    .tr code { color: var(--pl-text-primary); }
    .tr .sw { width: 40px; height: 28px; border-radius: 8px; background: var(--pl-bg-surface); }
    .open { margin-top: 14px; padding: 16px 20px 16px 38px; border-radius: 24px; background: var(--pl-bg-inset); font: 400 13px/21px var(--pl-sans); color: var(--pl-text-secondary); }
    .open li + li { margin-top: 6px; } .open b { color: var(--pl-text-primary); font-weight: 600; }
    @media (max-width: 900px) { .twin, .rung { grid-template-columns: 1fr; } .tr { grid-template-columns: 1fr 46px; } .tr span:last-child { grid-column: 1 / -1; } }
  </style>${TOY_DEFS}

  <h2>Day and night</h2>
  <p>The same desk, twice, with the product’s own pieces on it: a soft block, pills on the inset tone, the name tag, and a card holding a field and two buttons. Everything is live; press the buttons and the block.</p>
  <div class="twin">${desk('light', 'Day')}${desk('dark', 'Night')}</div>

  <h2>Three heights, and no others</h2>
  <p>A thing is pressed in, flat, or lifted. Height says what you can do with it, so nothing gets a shadow for looks.</p>
  <div class="heights">${HEIGHTS.map(([h, name, says, html, toks]) => `<div class="rung"><div class="show">${html}</div><div class="say"><small>${h}</small><b>${name}</b><p>${says}</p>${toks.length ? `<div class="toks">${toks.map((t) => `<span class="pl-pill" data-hue="sky">--pl-${t}</span>`).join('')}</div>` : ''}</div></div>`).join('')}</div>

  <h2>The tokens</h2>
  <p>Read from the token file, with the file’s own note on what each is for. The swatch is the value in the scheme you are in.</p>
  <div class="toks-tbl">${TOKENS.map((t) => `<div class="tr"><code>--pl-${t}</code><i class="sw" style="${t.startsWith('shadow') ? `box-shadow: var(--pl-${t})` : `background: var(--pl-${t}); box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--pl-text-primary) 10%, transparent)`}"></i><span>${noteOf(t)}</span></div>`).join('')}</div>

  <h2>What is still open</h2>
  <ul class="open">
    <li><b>Bars and the dock are not here yet.</b> The fix bar has its own page. The dock is still drawn with grey line pictures and plain-text buttons, from before the icon set; it needs rebuilding before it is shown as a model.</li>
    <li><b>A card’s edge is a hairline.</b> The card and tag shadows both start with a 1px ring in the rule colour. The language says a thing is not told apart by an outline; on white ground the ring is doing that job.</li>
    <li><b>The scrim</b> (the dim over your page in Blueprint) has a token and no picture here.</li>
  </ul>`;

  void host;
}
