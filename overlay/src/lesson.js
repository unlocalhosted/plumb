/* ─────────────────────────────────────────────────────────
 * THE LESSON · the project page as Plumber's onboarding (docs/design/onboarding.md, "The lesson")
 *
 * For someone who built a UI fast and has never heard "token". One idea per screen, on their own app, ending in
 * their rules: the config Plumber holds their code to from then on. Each screen's one answer adds a line to the
 * rules, which fill in beside the lesson as it's written.
 *
 *  screens   Welcome → Spacing → Colours → Text → Corners → Your rules; a row of toys at the top says where you are
 *  a screen  what it is (one sentence) · yours, drawn (Gravity: each place typed by hand, a dot by the step it's
 *            closest to) · why it matters (one line) · one choice, shown as what you get, a sensible one picked ·
 *            the rule it becomes, in plain words with the real line under it
 *  words     "token", "scale", "theme" only after the reader has seen the thing; numbers and names behind Details
 *  built     Spacing, Corners and Text from one builder for sizes; Colours its own; Set it up comes next
 * ───────────────────────────────────────────────────────── */
import { LANGUAGE_CSS } from './language.js';
import { SCALE_CSS } from './scale-marks.js';
import { GRAVITY_CSS, Gravity } from './gravity.js';
import { TOY_DEFS, toyOf } from './toys.js';
import { BUTTON_CSS, button } from './kit.js';
import { colourModel, decisionsOf, editsOf, lanesOf, systemOf } from './system-review.js';
import { oklab, toRgb } from './craft-headless.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const nf = new Intl.NumberFormat('en');

const SCREENS = [
  { id: 'welcome', toy: 'tooltip', hue: 'butter', name: 'Welcome' },
  { id: 'spacing', toy: 'padding', hue: 'mint', name: 'Spacing' },
  { id: 'colour', toy: 'fill', hue: 'pink', name: 'Colours' },
  { id: 'text', toy: 'type', hue: 'sky', name: 'Text' },
  { id: 'corners', toy: 'corner', hue: 'pink', name: 'Corners' },
  { id: 'rules', toy: 'card', hue: 'lilac', name: 'Your rules' },
];

const LESSON_CSS = `
  :host { display: block; color: var(--pl-ink); font-family: var(--pl-sans); }
  .lesson { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 20rem); gap: 28px 56px; align-items: start; }
  @media (max-width: 960px) { .lesson { grid-template-columns: 1fr; } }
  /* the rules screen shows the rules itself: no second copy beside it */
  .lesson.whole { grid-template-columns: minmax(0, 1fr); }

  /* where you are: a stepper. Each step is its toy on a plate along one rail; the rail fills pink up to the step you're
     on. Done: the plate in its step's hue with a tick. Here: the plate raised as a pink key. To come: pale, its toy
     greyed. Every step can be pressed, so each answers the hand (lift on hover, sink on press, a ring on focus) */
  .stepper { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); margin: 0 0 12px; padding: 0; list-style: none; }
  .stepper li { position: relative; display: grid; justify-items: center; }
  .stepper li + li::before, .stepper li + li::after { content: ''; position: absolute; top: 24px; left: calc(-50% + 34px); right: calc(50% + 34px); height: 4px; border-radius: 2px; background: var(--pl-rule); }
  .stepper li + li::after { background: var(--pl-pink-block); transform-origin: left; transform: scaleX(0); }
  .stepper li.reached + li.reached::after, .stepper li.reached + li.here::after { transform: scaleX(1); }
  .stepper li.here.arrived::after { animation: pl-rail 420ms var(--pl-ease-out) both; }
  @keyframes pl-rail { from { transform: scaleX(0); } }
  .stepper button { all: unset; display: grid; justify-items: center; gap: 8px; cursor: pointer; border-radius: 16px; padding: 0 6px 4px; }
  .stepper .plate { position: relative; display: grid; place-items: center; width: 52px; height: 52px; border-radius: 17px; background: var(--pl-paper-2);
    transition: translate 320ms var(--pl-spring-pop), box-shadow 200ms var(--pl-ease-out), background 200ms var(--pl-ease-out); }
  .stepper .plate .toy { width: 28px; height: 28px; transition: filter 200ms var(--pl-ease-out), opacity 200ms var(--pl-ease-out); }
  .stepper .name { font: var(--pl-round-w, 650) 15px/18px var(--pl-round); color: var(--pl-ink-2); }
  .stepper .sub { font: 500 12.5px/16px var(--pl-sans); color: var(--pl-ink-2); min-height: 16px; }
  .stepper li:not(.reached):not(.here) .toy { filter: grayscale(.85); opacity: .55; }
  .stepper button:hover .plate { translate: 0 -2px; box-shadow: 0 3px 0 var(--pl-rule); }
  .stepper button:hover .toy { filter: none; opacity: 1; }
  .stepper button:hover .name { color: var(--pl-ink); }
  .stepper button:active .plate { translate: 0 0; box-shadow: none; }
  .stepper button:focus-visible { outline: 2px solid var(--pl-pink-block); outline-offset: 2px; }
  .stepper li.reached .plate { background: var(--hf); }
  .stepper li.reached .name { color: var(--pl-ink); }
  .stepper .tick { position: absolute; right: -5px; bottom: -5px; display: grid; place-items: center; width: 20px; height: 20px; border-radius: 50%; background: var(--pl-done-bg); color: var(--pl-done-text); box-shadow: 0 0 0 3px var(--pl-paper); }
  .stepper .tick svg { width: 11px; height: 11px; }
  .stepper li.here .plate { background: var(--pl-pink-block); translate: 0 -3px; box-shadow: 0 4px 0 color-mix(in oklab, var(--pl-pink) 72%, #000); }
  /* on the pink key the toy sits on a cut-out, so a pink toy (colours, corners) never vanishes into it */
  .stepper li.here .plate::before { content: ''; position: absolute; inset: 9px; border-radius: 11px; background: var(--pl-cut); }
  .stepper li.here .plate .toy { position: relative; width: 24px; height: 24px; }
  .stepper li.here.arrived .plate { animation: pl-here 420ms var(--pl-spring-pop) both; }
  @keyframes pl-here { from { translate: 0 0; scale: .9; } }
  .stepper li.here .name { color: var(--pl-ink); font-weight: var(--pl-round-w, 750); }
  .stepper li.here .sub { color: var(--pl-pink-ink); font-weight: 650; }
  @media (max-width: 760px) { .stepper .name, .stepper .sub { display: none; } .stepper .plate { width: 40px; height: 40px; } .stepper li + li::before, .stepper li + li::after { top: 18px; left: calc(-50% + 26px); right: calc(50% + 26px); } }
  @media (prefers-reduced-motion: reduce) { .stepper li.here.arrived::after, .stepper li.here.arrived .plate { animation: none; } .stepper .plate { transition: none; } }
  /* a screen opens as a page of the design site does: its toy, large, beside a heavy title; a lead in large grey
     words, the thing to notice in ink. Then sections on the white page, no box around them */
  .screen { background: none; }
  .face { display: grid; gap: 14px; padding: 6px 0 0; }
  .face .head { display: flex; align-items: center; gap: 18px; }
  .face .plate { display: contents; }
  .face .plate .toy { width: 56px; height: 56px; flex: none; }
  .face h2 { margin: 0; font: var(--pl-round-w, 750) 46px/50px var(--pl-round); letter-spacing: -0.02em; color: var(--pl-ink); text-wrap: balance; }
  .face p { margin: 0; max-width: 62ch; font: 500 18px/28px var(--pl-sans); color: var(--pl-ink-2); }
  .face p b { color: var(--pl-ink); font-weight: 650; }
  .body { display: grid; gap: 32px; padding: 32px 0 0; }
  .part h3 { margin: 0 0 10px; font: var(--pl-round-w, 650) 24px/28px var(--pl-round); letter-spacing: -0.01em; color: var(--pl-ink); }
  .part > p { margin: 0; max-width: 62ch; font: 500 16.5px/26px var(--pl-sans); color: var(--pl-ink-2); }
  /* three ideas as numbered tiles on the inset tone, as the Identity page lays out what makes a block */
  .why { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
  .why div { padding: 20px 20px 22px; border-radius: 22px; background: var(--pl-paper-2); }
  .why div { display: grid; grid-template-columns: 1fr auto; }
  .why div > :not(small, .toy) { grid-column: 1 / -1; }
  .why small { font: 600 12px/1 var(--pl-mono); color: var(--pl-ink-2); }
  .why .toy { width: 30px; height: 30px; margin: -6px -4px 0 0; }
  .face h2 .name { white-space: nowrap; }
  .why b { display: block; margin: 12px 0 6px; font: var(--pl-round-w, 650) 19px/23px var(--pl-round); color: var(--pl-ink); }
  .why p { margin: 0; font: 500 15px/22px var(--pl-sans); color: var(--pl-ink-2); }
  /* what Plumber read: one block per kind in its step's hue, the places on your steps against the places typed by
     hand, as a number and as one bar */
  .scan { display: grid; gap: 14px; }
  .scan > h3 { display: flex; align-items: baseline; gap: 10px; margin: 0; font: var(--pl-round-w, 700) 24px/28px var(--pl-round); color: var(--pl-ink); }
  .scan > h3 span { font: 500 15px/20px var(--pl-sans); color: var(--pl-ink-2); }
  .scan ol { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin: 0; padding: 0; list-style: none; }
  .scan li { display: grid; gap: 10px; padding: 16px 16px 18px; border-radius: 22px; background: var(--hf); color: var(--hi); box-shadow: 0 4px 0 color-mix(in oklab, var(--hi) 22%, transparent); }
  .scan .top { display: flex; align-items: center; gap: 10px; font: var(--pl-round-w, 700) 16px/20px var(--pl-round); }
  .scan .top .plate { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 11px; background: var(--pl-cut); }
  .scan .top .toy { width: 22px; height: 22px; }
  .scan .big { font: var(--pl-round-w, 750) 34px/36px var(--pl-round); letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
  .scan .big small { display: block; margin-top: 2px; font: 500 13px/18px var(--pl-sans); letter-spacing: 0; }
  .scan .bar { display: flex; height: 8px; border-radius: 4px; overflow: hidden; background: color-mix(in oklab, var(--hi) 18%, transparent); }
  .scan .bar i { background: var(--hi); }
  .scan .hand { font: 500 13px/18px var(--pl-sans); }
  .scan .hand b { font-weight: 700; }
  @media (max-width: 960px) { .scan ol { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  @media (max-width: 760px) { .why { grid-template-columns: 1fr; } .face h2 { font-size: 34px; line-height: 38px; } }
  /* what stands out in your code: a butter block with its words in ink, set apart from the grey lead */
  .notice { display: grid; gap: 8px; margin-top: 14px; padding: 16px 20px; border-radius: 22px; background: var(--pl-butter-face); color: var(--pl-butter-ink); font: 500 15px/22px var(--pl-sans); box-shadow: 0 4px 0 color-mix(in oklab, var(--pl-butter-ink) 16%, transparent); }
  .notice b { font-weight: 700; }
  .notice code { font: 500 13px/18px var(--pl-mono); }

  /* the drawing sits on the inset tone, like the design site's shelves: no outline, no shadow */
  #gravity .gv { border: 0; border-radius: 26px; background: var(--pl-paper-2); box-shadow: none; }
  #gravity .gv-foot { border-top: 0; }

  /* the choice, as soft blocks: pale at rest, lifted on hover, and the one you take turns into the step's colour with a
     tick in its corner. Each draws what you get */
  .choices { display: grid; grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr)); gap: 14px; }
  .choice { all: unset; position: relative; display: grid; gap: 12px; align-content: start; padding: 20px 20px 22px; border-radius: 22px; background: var(--pl-paper-2); color: var(--pl-ink); cursor: pointer;
    transition: translate 300ms var(--pl-spring-pop), box-shadow 200ms var(--pl-ease-out), background 200ms var(--pl-ease-out); }
  .choice:hover { translate: 0 -2px; box-shadow: 0 4px 0 var(--pl-rule); }
  .choice:active { translate: 0 0; box-shadow: none; }
  .choice:focus-visible { outline: 2px solid var(--pl-pink-block); outline-offset: 3px; }
  .choice::after { content: ''; position: absolute; top: 18px; right: 18px; width: 22px; height: 22px; border-radius: 50%; background: var(--pl-paper); }
  .choice[aria-checked="true"] { background: var(--hf); color: var(--hi); translate: 0 -3px; box-shadow: 0 5px 0 color-mix(in oklab, var(--hi) 28%, transparent); }
  .choice[aria-checked="true"]::after { background: var(--pl-done-bg) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath d='M2.5 6.3l2.4 2.4 4.6-5' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center / 12px no-repeat; }
  .choice b { padding-right: 32px; font: var(--pl-round-w, 700) 19px/24px var(--pl-round); }
  .choice b .rec { display: inline-block; margin-left: 8px; padding: 3px 8px; border-radius: 8px; background: var(--pl-pink-block); color: var(--pl-pink-block-on); font: 700 12px/14px var(--pl-sans); vertical-align: 3px; }
  .choice > span { font: 500 14.5px/21px var(--pl-sans); color: var(--pl-ink-2); }
  .choice[aria-checked="true"] > span { color: inherit; opacity: .85; }
  .choice code { font: 500 12.5px/18px var(--pl-mono); }
  @media (prefers-reduced-motion: reduce) { .choice { transition: none; } }
  .steps { display: flex; align-items: flex-end; gap: 6px; min-height: 64px; padding: 10px 12px; border-radius: 14px; background: var(--pl-cut); }
  .steps i { display: block; width: 14px; border-radius: 4px 4px 0 0; background: var(--pl-mint); }
  .steps.many i { background: color-mix(in oklab, var(--pl-mint) 55%, var(--pl-butter)); }
  .steps i.twice { background: var(--pl-butter); }
  .steps .chip { width: 26px; height: 26px; }

  .steps.aa { align-items: baseline; gap: 10px; flex-wrap: wrap; }
  .steps.aa span { font-family: var(--pl-sans); font-weight: 600; line-height: 1; color: var(--pl-sky); }
  .steps.aa span.twice { color: var(--pl-butter-line); }
  .steps.arcs { align-items: flex-end; gap: 10px; }
  .steps.arcs i { width: 26px; height: 26px; background: none; border-top: 3px solid var(--pl-pink); border-left: 3px solid var(--pl-pink); border-radius: 0; box-sizing: border-box; }
  .steps.arcs i.twice { border-color: var(--pl-butter-line); }
  /* colours: the palette as swatches by hue on the inset tone, and colours typed by hand beside the palette colour
     they're closest to */
  .palette { display: grid; gap: 8px; padding: 22px; border-radius: 26px; background: var(--pl-paper-2); }
  .palette .hue { display: flex; flex-wrap: wrap; gap: 6px; }
  .palette .later { font: 500 13px/18px var(--pl-sans); color: var(--pl-ink-2); }
  .chip { width: 34px; height: 34px; border-radius: 11px; box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--pl-ink) 10%, transparent); }
  .typed { display: grid; gap: 4px; margin-top: 14px; padding: 10px; border-radius: 22px; background: var(--pl-paper-2); }
  .typed .t { display: grid; grid-template-columns: 34px minmax(0, 11rem) 18px 34px minmax(0, 1fr); align-items: center; gap: 12px; padding: 6px 10px; border-radius: 14px; font: 500 14px/20px var(--pl-sans); }
  .typed .t:hover { background: var(--pl-paper); }
  .typed .t code { font: 500 12.5px/18px var(--pl-mono); color: var(--pl-ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .typed .t span { color: var(--pl-ink-2); }

  /* the rule it becomes: a lilac block, the same as the rules beside it, the config line on a cut-out */
  .rule { display: grid; grid-template-columns: 44px minmax(0, 1fr); column-gap: 14px; row-gap: 10px; align-items: start; padding: 18px 20px; border-radius: 22px; background: var(--pl-lilac-face); color: var(--pl-lilac-ink); box-shadow: 0 4px 0 color-mix(in oklab, var(--pl-lilac-ink) 16%, transparent); }
  .rule > .plate { grid-row: span 2; display: grid; place-items: center; width: 44px; height: 44px; border-radius: 14px; background: var(--pl-cut); }
  .rule > .plate .toy { width: 28px; height: 28px; }
  .rule p { grid-column: 2; margin: 0; font: var(--pl-round-w, 650) 17px/24px var(--pl-round); }
  .rule code { grid-column: 2; padding: 10px 12px; border-radius: 12px; background: var(--pl-cut); color: var(--pl-ink); font: 500 12.5px/19px var(--pl-mono); white-space: pre-wrap; }
  .nav { display: flex; flex-wrap: wrap; align-items: center; gap: 14px; }
  .nav .later { font: 500 14px/20px var(--pl-sans); color: var(--pl-ink-2); }
  details.more { margin-top: 10px; }
  details.more summary { cursor: pointer; font: 600 13.5px/20px var(--pl-sans); color: var(--pl-ink-2); }
  details.more summary:hover { color: var(--pl-ink); }
  details.more p { font: 500 13.5px/20px var(--pl-sans); color: var(--pl-ink-2); }

  /* the last screen: each rule as a big block in its step's colour, the file it writes, then the one press */
  .final { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; margin: 0; padding: 0; list-style: none; }
  .final li { display: grid; grid-template-columns: 44px minmax(0, 1fr); column-gap: 14px; row-gap: 4px; padding: 18px 20px; border-radius: 22px; background: var(--hf); color: var(--hi); box-shadow: 0 4px 0 color-mix(in oklab, var(--hi) 24%, transparent); }
  .final li .plate { grid-row: span 2; display: grid; place-items: center; width: 44px; height: 44px; border-radius: 14px; background: var(--pl-cut); }
  .final li .plate .toy { width: 28px; height: 28px; }
  .final li b { font: var(--pl-round-w, 700) 18px/22px var(--pl-round); }
  .final li span { font: 500 14.5px/21px var(--pl-sans); }
  .final li.empty { background: var(--pl-paper-2); color: var(--pl-ink-2); box-shadow: none; }
  .final li.empty .toy { filter: grayscale(.85); opacity: .55; }
  .file { margin: 14px 0 0; padding: 18px 20px; border-radius: 22px; background: var(--pl-paper-2); font: 500 13px/20px var(--pl-mono); color: var(--pl-ink); white-space: pre-wrap; overflow-x: auto; }
  .file small { display: block; margin-bottom: 8px; font: 600 12px/16px var(--pl-sans); color: var(--pl-ink-2); }
  .go { display: grid; gap: 14px; padding: 24px; border-radius: 26px; background: var(--pl-mint-face); color: var(--pl-mint-ink); box-shadow: 0 5px 0 color-mix(in oklab, var(--pl-mint-ink) 16%, transparent); }
  .go h3 { margin: 0; font: var(--pl-round-w, 750) 26px/30px var(--pl-round); color: inherit; }
  .go ol { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin: 0; padding: 0; list-style: none; counter-reset: go; }
  .go ol li { padding: 14px 16px; border-radius: 16px; background: var(--pl-cut); color: var(--pl-ink); font: 500 14px/20px var(--pl-sans); counter-increment: go; }
  .go ol li::before { content: '0' counter(go); display: block; margin-bottom: 6px; font: 600 12px/1 var(--pl-mono); color: var(--pl-ink-2); }
  .go .later { color: inherit; }
  @media (max-width: 760px) { .final, .go ol { grid-template-columns: 1fr; } }

  /* your rules, filling in beside the lesson */
  .rules { position: sticky; top: 72px; display: grid; gap: 14px; padding: 22px; border-radius: 26px; background: var(--pl-lilac-face); color: var(--pl-lilac-ink); box-shadow: 0 5px 0 color-mix(in oklab, var(--pl-lilac-ink) 18%, transparent); }
  .rules .count { margin-left: auto; padding: 4px 10px; border-radius: 10px; background: var(--pl-cut); font: var(--pl-round-w, 700) 13px/16px var(--pl-round); color: var(--pl-ink); font-variant-numeric: tabular-nums; }
  .rules h3 { margin: 0; display: flex; align-items: center; gap: 10px; font: var(--pl-round-w, 750) 24px/28px var(--pl-round); }
  .rules h3 .toy { width: 32px; height: 32px; }
  .rules > p { margin: 0; font: 500 14px/20px var(--pl-sans); }
  .rules ol { display: grid; gap: 12px; margin: 4px 0 0; padding: 0; list-style: none; }
  .rules li { display: grid; grid-template-columns: 34px minmax(0, 1fr); column-gap: 12px; row-gap: 2px; align-items: start; padding: 12px 14px; border-radius: 18px;
    background: var(--hf); color: var(--hi); box-shadow: 0 3px 0 color-mix(in oklab, var(--hi) 30%, transparent); font: 500 13.5px/19px var(--pl-sans); }
  .rules li .plate { grid-row: span 3; display: grid; place-items: center; width: 34px; height: 34px; border-radius: 11px; background: var(--pl-cut); }
  .rules li .plate .toy { width: 22px; height: 22px; }
  .rules li b { font: var(--pl-round-w, 700) 15px/20px var(--pl-round); }
  .rules li code { grid-column: 2; font: var(--pl-card-code); opacity: .8; white-space: pre-wrap; }
  .rules li.empty { background: color-mix(in oklab, var(--pl-cut) 55%, transparent); color: var(--pl-lilac-ink); box-shadow: none; }
  .rules li.empty > span:not(.plate) { opacity: .75; }
  .rules li.empty .plate { background: var(--pl-paper-2); }
  .rules li.empty .toy { opacity: .45; filter: grayscale(.6); }
  .rules li.fresh { animation: rule-in var(--pl-dur-build) var(--pl-spring-pop) both; }
  @keyframes rule-in { from { opacity: 0; translate: 0 var(--pl-space-2); scale: .97; } }
  .rules li code { font: var(--pl-card-code); color: var(--pl-text-secondary); white-space: pre-wrap; }
  @media (prefers-reduced-motion: reduce) { .rules li.fresh { animation: none; } }
`;

const HUES = { butter: ['--pl-butter-face', '--pl-butter-ink'], mint: ['--pl-mint-face', '--pl-mint-ink'], pink: ['--pl-pink-face', '--pl-pink-ink'], sky: ['--pl-sky-face', '--pl-sky-ink'], lilac: ['--pl-lilac-face', '--pl-lilac-ink'] };

/* A size kind's screen (spacing, corners, text), all built the same way: its words, its data, and the tidy answer the
   review's model suggests (one list, steps on a base, Tailwind's name, numbered by size) */
const SIZES = {
  spacing: { screen: 'spacing', data: 'spacing', convention: '--spacing-', noun: 'gap and padding', nouns: 'gaps and paddings',
    title: 'Spacing is the room between things.', line: 'Inside a card, between a row of buttons, around a section. Same room, same feel.',
    why: 'When every gap is a little different, screens feel uneven, and changing how roomy your app feels means hunting through every file. One short list of steps, used everywhere, fixes both.',
    gravity: { sizes: 'spacing steps', title: 'Where your gaps and paddings land', empty: 'Add spacing to your theme, and this fills in.' } },
  radius: { screen: 'corners', data: 'radius', convention: '--radius-', noun: 'rounded corner', nouns: 'rounded corners',
    title: 'Corners are how round things are.', line: 'Buttons, cards, inputs, pictures. A few roundnesses, each for a kind of thing, make an app feel made by one hand.',
    why: 'Corners that are almost the same (7px here, 8px there) read as a mistake even when nobody can say why. A small set, one for each kind of thing, keeps the app calm.',
    gravity: { sizes: 'corner sizes', title: 'Where your rounded corners land', empty: 'Add corner sizes to your theme, and this fills in.' } },
  type: { screen: 'text', data: 'size', convention: '--text-', noun: 'text size', nouns: 'text sizes',
    title: 'Text sizes are your app’s voice levels.', line: 'A title, a paragraph, a label, small print. Each level should be clearly bigger or smaller than the next.',
    why: 'Sizes a pixel apart look like the same size set carelessly. A few clear levels tell the reader what to read first, on every screen.',
    gravity: { sizes: 'text sizes', title: 'Where your text sizes land', empty: 'Add text sizes to your theme, and this fills in.' } },
};
function sizeModel(data, family) {
  const spec = SIZES[family], kind = (data.reading ?? []).find((k) => k.family === family);
  const lanes = kind ? lanesOf(kind).filter((l) => l.values.length > 1) : [];
  const decisions = kind ? decisionsOf(kind) : [];
  const offered = (id, value) => decisions.find((d) => d.id === id)?.options.some(([v]) => v === value);
  const biggest = [...lanes].sort((a, b) => b.tokens.length - a.tokens.length)[0];
  const tidy = { ...(offered(`keep:${family}`, biggest?.name) ? { [`keep:${family}`]: biggest.name } : {}), ...(offered(`base:${family}`, 'round') ? { [`base:${family}`]: 'round' } : {}),
    ...(offered(`name:${family}`, spec.convention) ? { [`name:${family}`]: spec.convention } : {}), ...(offered(`count:${family}`, 'size') ? { [`count:${family}`]: 'size' } : {}) };
  const tidied = kind && Object.keys(tidy).length ? systemOf(kind, tidy) : null, one = tidied?.scales.length === 1 ? tidied.scales[0] : null;
  const values = [...new Set(lanes.flatMap((l) => l.values))].sort((a, b) => a - b);
  const twice = values.filter((v) => lanes.filter((l) => l.values.includes(v)).length > 1);
  const byHand = (data[spec.data]?.strays ?? []).reduce((n, s) => n + s.places, 0);
  return { family, spec, kind, lanes, values, twice, byHand, tidy, one, needed: !!one };
}

// how a colour was written, unless it is code: `color: ink` names a variable, so the colour it comes to is shown with
// the name beside it (docs/qa/onboarding-2026-11-19.md, gap 5); CSS words (red, currentColor) are values
function asWritten(text, css) {
  const m = /^([\w-]+):\s*(.+)$/.exec(text ?? '');
  const code = m && !/^var\(/.test(m[2]) && /^[A-Za-z_$][\w$]*(?:\.[\w$]+|\(.*\))*$/.test(m[2]) && (/[A-Z$.(_]/.test(m[2]) || !CSS.supports('color', m[2]));
  // every row here is a colour: the name and the colour it comes to, short enough for the row
  return code ? `${m[2]} · ${css}` : text ?? css;
}
/** The colour screen's model: the palette by hue, and the colours your code types by hand, nearest palette colour first. */
function colourScreenModel(data) {
  const kind = (data.reading ?? []).find((k) => k.family === 'color');
  const model = kind ? colourModel(kind) : { palette: [], roles: [], unused: [], hard: [] };
  // a palette is grouped by the colour itself, not its name: `--accent` and `--draw` share no word, and named that way
  // most rows held one chip (docs/qa/onboarding-2026-11-19.md, gap 5). Greys together, then each hue in 30° bands,
  // light to dark within a row; a colour the browser can't read sits by itself at the end.
  const look = (p) => { const rgb = toRgb(p.value); if (!rgb || rgb[3] === 0) return null; const [l, a, b] = oklab(rgb); return { l, c: Math.hypot(a, b), h: ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360 }; };
  const looks = new Map(model.palette.map((p) => [p, look(p)]));
  const hueOf = (p) => { const k = looks.get(p); return !k ? 'other' : k.c < 0.03 ? 'grey' : `hue-${Math.floor(k.h / 30)}`; };
  const order = (h) => h === 'grey' ? -1 : h === 'other' ? 99 : Number(h.slice(4));
  const hues = [...new Set(model.palette.map(hueOf))].sort((a, b) => order(a) - order(b))
    .map((h) => model.palette.filter((p) => hueOf(p) === h).sort((a, b) => (looks.get(b)?.l ?? 0) - (looks.get(a)?.l ?? 0)));
  const typed = (data.colour?.strays ?? []).slice().sort((a, b) => b.places - a.places);
  const byHand = typed.reduce((n, s) => n + s.places, 0);
  const files = [...new Set(kind?.groups.map((g) => g.file) ?? [])];
  const fixable = model.hard.filter((h) => h.match);
  return { kind, ...model, hues, typed, byHand, files, fixable };
}

/**
 * The lesson, drawn into `host` (its own shadow root; tokens inherit). `data` is the page data (src/project-page/
 * system.ts); `post` writes, when the page may.
 */
export function mountLesson(host, data, { post } = {}) {
  const root = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
  const sizes = { spacing: sizeModel(data, 'spacing'), radius: sizeModel(data, 'radius'), type: sizeModel(data, 'type') };
  const col = colourScreenModel(data);
  const screenOf = { spacing: 'spacing', radius: 'corners', type: 'text' };
  const state = { at: 'welcome', choice: { spacing: sizes.spacing.needed ? 'tidy' : 'keep', radius: sizes.radius.needed ? 'tidy' : 'keep', type: sizes.type.needed ? 'tidy' : 'keep', color: col.fixable.length ? 'point' : 'keep' }, decided: new Set(), fresh: '' };
  const ORDER = ['welcome', 'spacing', 'colour', 'text', 'corners', 'rules'];
  const nextOf = (id) => SCREENS.find((s) => s.id === ORDER[ORDER.indexOf(id) + 1]);

  const TICK = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 6.3l2.4 2.4 4.6-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  let shownAt = state.at;
  const trail = () => {
    const at = ORDER.indexOf(state.at), arrived = ORDER.indexOf(shownAt) < at; shownAt = state.at;
    return `<ol class="stepper" aria-label="Setting up, step ${at + 1} of ${SCREENS.length}">${SCREENS.map((s, i) => {
      const here = s.id === state.at, done = state.decided.has(s.id) || (i < at && ['welcome'].includes(s.id));
      const sub = here ? (s.id === 'welcome' ? 'Start here' : "You're here") : s.id === 'welcome' && i < at ? 'Read' : done ? 'Chosen' : s.id === 'rules' ? 'Set it up' : '';
      return `<li class="${here ? `here${arrived ? ' arrived' : ''}` : ''}${done || i < at ? ' reached' : ''}" style="--hf: var(${HUES[s.hue][0]})"><button type="button" data-go="${s.id}"${here ? ' aria-current="step"' : ''}><span class="plate"><i class="toy">${toyOf(s.toy)}</i>${done && !here && s.id !== 'welcome' ? `<span class="tick">${TICK}</span>` : ''}</span><span class="name">${esc(s.name)}</span><span class="sub">${sub}</span></button></li>`;
    }).join('')}</ol>`;
  };
  const face = (s, title, line) => `<div class="face"><div class="head"><span class="plate"><i class="toy">${toyOf(s.toy)}</i></span><h2>${title}</h2></div>${line ? `<p>${line}</p>` : ''}</div>`;
  const nav = (id) => { const n = nextOf(id); return `<div class="nav">${button(n.id === 'rules' ? 'Add this rule and finish' : `Add this rule, then ${n.name.toLowerCase()}`, { key: '→', attrs: `data-next="${id}"` })}<span class="later">You can come back and change it.</span></div>`; };

  // a size kind with no steps anywhere: nothing in the theme, no Tailwind base, nothing in the reading
  const bare = (m) => !m.lanes.length && !(m.kind?.groups ?? []).length && !(m.family === 'spacing' && data.spacing?.numeric) && !(data[m.spec.data]?.steps ?? []).length;
  // a size kind's rule, in plain words and as the line it writes
  const sizeRule = (m) => {
    const key = m.family === 'type' ? 'type' : m.family;
    if (state.choice[m.family] === 'tidy' && m.one) { const from = [`css:${m.one.lane.file}#${m.one.stem}*`]; return { plain: `Every ${m.spec.noun} uses one of these ${m.one.steps.length}. Anything else, Plumber points out.`, key, from, code: `${key}: { from: ['${from[0]}'] }` }; }
    // no steps at all (a plain-CSS app with no spacing tokens): nothing to keep yet, so no rule rather than an empty one,
    // which would check nothing (docs/qa/onboarding-2026-11-19.md, gap 4)
    if (bare(m)) return { plain: `No rule for ${m.spec.nouns} yet: your theme has no ${m.spec.gravity.sizes}. Plumber leaves them alone until it does.`, key, from: [], skip: true, code: `// ${key}: no steps in your theme yet` };
    // no list of its own, on Tailwind's spacing steps: the rule names the base, as plumber init does
    const numeric = m.family === 'spacing' && !m.lanes.length ? data.spacing?.numeric : null;
    if (numeric) { const from = [numeric.file ? `css:${numeric.file}#--spacing` : 'theme:--spacing'];
      return { plain: `Gaps and paddings use Tailwind's spacing steps, each a multiple of ${nf.format(numeric.px)}px (p-1, p-2, p-4…). Anything else, Plumber points out.`, key, from, code: `${key}: { from: ['${from[0]}'] }` }; }
    const from = m.lanes.length ? m.lanes.map((l) => `css:${l.file}#${l.name}`) : [...new Set((m.kind?.groups ?? []).map((g) => `css:${g.file}`))];
    return { plain: `${m.spec.nouns[0].toUpperCase()}${m.spec.nouns.slice(1)} use the ones you already have. Anything else, Plumber points out.`, key, from, code: `${key}: { from: [${from.map((f) => `'${f}'`).join(', ')}] }` };
  };
  const colourRule = () => ({ plain: `Colours come from your palette of ${col.palette.length} and the ${col.roles.length} named ${col.roles.length === 1 ? 'use' : 'uses'} built on it${state.choice.color === 'point' && col.fixable.length ? `, with ${col.fixable.length} copies pointed back at it` : ''}. A colour typed by hand, Plumber points out.`,
    key: 'color', from: col.files.map((f) => `css:${f}`), code: `color: { from: [${col.files.map((f) => `'css:${f}'`).join(', ')}] }` });
  const ruleOf = (id) => id === 'colour' ? colourRule() : sizeRule(sizes[Object.keys(screenOf).find((f) => screenOf[f] === id)]);

  const rules = () => {
    const done = ORDER.filter((id) => !['welcome', 'rules'].includes(id) && state.decided.has(id));
    return `<aside class="rules" aria-live="polite"><h3><i class="toy">${toyOf('card')}</i>Your rules<span class="count">${done.length} of 4</span></h3>
      <p>Each answer adds a rule. Plumber keeps your code to them from now on: it points out what breaks one, and fixes it with you.</p>
      <ol>${done.map((id) => { const l = ruleOf(id), sc = SCREENS.find((x) => x.id === id); return `<li class="${id === state.fresh ? 'fresh' : ''}" style="--hf: var(${HUES[sc.hue][0]}); --hi: var(${HUES[sc.hue][1]})"><span class="plate"><i class="toy">${toyOf(sc.toy)}</i></span><b>${esc(sc.name)}</b><span>${esc(l.plain)}</span><code>${esc(l.code)}</code></li>`; }).join('')}
        ${SCREENS.filter((x) => !['welcome', 'rules'].includes(x.id) && !state.decided.has(x.id)).map((x) => `<li class="empty"><span class="plate"><i class="toy">${toyOf(x.toy)}</i></span><b>${esc(x.name)}</b><span>Lands here when you choose.</span></li>`).join('')}</ol></aside>`;
  };

  // what Plumber read, kind by kind: places on your steps, places typed by hand
  const scan = () => {
    const sum = (xs, k) => (xs ?? []).reduce((n, x) => n + (x[k] ?? 0), 0);
    const kinds = [['spacing', data.spacing, 'on your spacing steps'], ['colour', data.colour, 'on your colours'], ['text', data.size, 'on your text sizes'], ['corners', data.radius, 'on your corner sizes']];
    return `<div class="scan"><h3>What Plumber found<span>in ${nf.format(data.files ?? 0)} files</span></h3><ol>${kinds.map(([id, d, on]) => {
      const sc = SCREENS.find((x) => x.id === id), ok = sum(d?.steps, 'uses'), hand = sum(d?.strays, 'places'), all = ok + hand;
      return `<li style="--hf: var(${HUES[sc.hue][0]}); --hi: var(${HUES[sc.hue][1]})"><span class="top"><span class="plate"><i class="toy">${toyOf(sc.toy)}</i></span>${esc(sc.name)}</span>
        <span class="big">${all ? `${Math.round((ok / all) * 100)}%` : '–'}<small>${all ? `${nf.format(ok)} places ${on}` : 'None found'}</small></span>
        <span class="bar" aria-hidden="true"><i style="width: ${all ? (ok / all) * 100 : 0}%"></i></span>
        <span class="hand">${hand ? `<b>${nf.format(hand)}</b> typed by hand` : 'None typed by hand'}</span></li>`;
    }).join('')}</ol></div>`;
  };

  const welcome = () => {
    const s = SCREENS[0];
    const n = nf.format(data.files ?? 0);
    return `<section class="screen">${face(s, `Let's make <span class="name">${esc(data.project ?? 'your app')}</span> look like one app.`, `Plumber has read all <b>${n} files</b> and drawn what they do today. Answer four short questions, about spacing, colours, text and corners, and you'll have <b>your rules</b>: the ones your code keeps from now on.`)}
      <div class="body">
        ${scan()}
        <div class="nav">${button('Start with spacing', { key: '→', attrs: 'data-go="spacing"' })}<span class="later">About two minutes. Nothing in your files changes until the very end.</span></div>
        <div class="why">
          <div><small>01</small><i class="toy">${toyOf('fill')}</i><b>See it</b><p>Each step draws what your app does today, so you're choosing from what's really there.</p></div>
          <div><small>02</small><i class="toy">${toyOf('tooltip')}</i><b>Choose</b><p>One question per step, with a good answer already picked. Take it, or pick another.</p></div>
          <div><small>03</small><i class="toy">${toyOf('card')}</i><b>Keep it</b><p>Plumber points out what breaks a rule, right on your page, and fixes it with you. Only new problems count.</p></div>
        </div>
      </div></section>`;
  };

  // the steps a choice gives you, drawn as the kind is: bars for spacing, corners for corners, "Aa" for text
  const preview = (family, vals, mark = []) => family === 'type' ? `<div class="steps aa">${vals.slice(0, 12).map((v) => `<span class="${mark.includes(v) ? 'twice' : ''}" style="font-size: ${Math.min(v, 40)}px" title="${v}px">Aa</span>`).join('')}</div>`
    : family === 'radius' ? `<div class="steps arcs">${vals.slice(0, 10).map((v) => `<i class="${mark.includes(v) ? 'twice' : ''}" style="border-top-left-radius: ${v}px" title="${v}px"></i>`).join('')}</div>`
    : `<div class="steps">${vals.slice(0, 16).map((v) => `<i class="${mark.includes(v) ? 'twice' : ''}" style="height: ${Math.max(4, Math.min(v, 96)) * 0.75}px" title="${v}px"></i>`).join('')}</div>`;

  const sizeScreen = (m) => {
    const s = SCREENS.find((x) => x.id === m.spec.screen), rule = sizeRule(m);
    const notice = [];
    if (m.lanes.length > 1) notice.push(`<b>You have ${m.lanes.length} separate lists of ${m.spec.nouns}, and they repeat each other.</b> ${m.twice.length ? `${m.twice.join(', ')} each appear in more than one list under different names (yellow below).` : ''}`);
    if (m.byHand) notice.push(`<b>${nf.format(m.byHand)} ${m.byHand === 1 ? 'place types a' : 'places type a'} ${m.spec.noun} by hand</b> instead of using one of them: the dots above.`);
    const keepVals = m.values.length ? m.values : (data[m.spec.data]?.steps ?? []).map((x) => x.px).filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b);
    // nothing to keep: the choice says so, with the command that drafts steps from the sizes the code uses
    const skipLine = `Your theme has no ${esc(m.spec.gravity.sizes)} yet. To draft them from the sizes your code already uses, run <code>${esc(data.runner ?? 'npx')} plumber propose --family ${m.family} --write</code>, then open this page again.`;
    return `<section class="screen" style="--hf: var(${HUES[s.hue][0]}); --hi: var(${HUES[s.hue][1]})">${face(s, m.spec.title, m.spec.line)}
      <div class="body">
        <div class="part"><h3>Yours, drawn</h3><div id="gravity"></div>${notice.length ? `<div class="notice">${notice.map((n) => `<span>${n}</span>`).join('')}</div>` : ''}</div>
        <div class="part"><h3>Why it matters</h3><p>${m.spec.why}</p></div>
        <div class="part"><h3>Your choice</h3><div class="choices" role="radiogroup" aria-label="${esc(s.name)}">
          ${m.needed ? `<button type="button" class="choice" role="radio" aria-checked="${state.choice[m.family] === 'tidy'}" data-pick="${m.family}:tidy"><b>One list of ${m.one.steps.length}<span class="rec">Suggested</span></b>${preview(m.family, m.one.steps.map((x) => x.px))}<span>Your lists merged into one, with Tailwind's name. The old names keep working, pointing at the new ones.</span></button>` : ''}
          <button type="button" class="choice" role="radio" aria-checked="${state.choice[m.family] === 'keep'}" data-pick="${m.family}:keep"><b>${bare(m) ? 'Skip it for now' : 'Keep what you have'}</b>${bare(m) ? '' : preview(m.family, keepVals, m.twice)}<span>${bare(m) ? skipLine : m.lanes.length > 1 ? `All ${m.lanes.length} lists stay as they are. You can tidy them later.` : `Your ${m.spec.nouns} stay as they are.`}</span></button>
        </div></div>
        <div class="part"><h3>The rule it becomes</h3><div class="rule"><span class="plate"><i class="toy">${toyOf('card')}</i></span><p>${esc(rule.plain)}</p><code>${esc(rule.code)}</code></div>
          <details class="more"><summary>Details for designers</summary><p>${m.lanes.map((l) => `${esc(l.name)} in ${esc(l.file)}: ${l.values.join(', ')}px`).join('<br>') || 'No lists of steps; single tokens only.'}${m.one ? `<br>Merged: ${m.one.steps.map((x) => `${esc(x.name)} ${esc(x.value)}`).join(', ')}` : ''}</p></details></div>
        ${nav(s.id)}
      </div></section>`;
  };

  const colourScreen = () => {
    const s = SCREENS[2], rule = colourRule();
    const chip = (v, title) => `<i class="chip" style="background: ${esc(v)}" title="${esc(title)}"></i>`;
    return `<section class="screen" style="--hf: var(${HUES[s.hue][0]}); --hi: var(${HUES[s.hue][1]})">${face(s, 'Colours: a small palette, and a name for each job.', 'Your palette is the colours themselves. Each job (text, a background, a border, a button) gets a name that points at one of them.')}
      <div class="body">
        <div class="part"><h3>Yours, drawn</h3><div class="palette">${col.hues.slice(0, 12).map((h) => `<div class="hue">${h.map((p) => chip(p.value, `${p.name}: ${p.value}`)).join('')}</div>`).join('')}${col.hues.length > 12 ? `<span class="later">and ${col.hues.length - 12} more</span>` : ''}</div>
          ${col.typed.length ? `<div class="typed">${col.typed.slice(0, 6).map((t) => { const near = col.palette.find((p) => p.name.slice(2) === t.near) ?? col.roles.find((p) => p.name.slice(2) === t.near); return `<div class="t">${chip(t.css, t.css)}<code>${esc(asWritten(t.written[0]?.text, t.css))}</code><span>→</span>${near ? chip(near.value, near.name) : '<i></i>'}<span>${nf.format(t.places)} ${t.places === 1 ? 'place' : 'places'}${near ? `; your ${esc(near.name)}${t.distance === 0 ? ' exactly' : ' is close'}` : ''}</span></div>`; }).join('')}</div>` : ''}
          <div class="notice"><span><b>${col.palette.length} ${col.palette.length === 1 ? 'colour' : 'colours'} in your palette, ${col.roles.length} named ${col.roles.length === 1 ? 'use' : 'uses'} built on ${col.palette.length === 1 ? 'it' : 'them'}.</b>${col.byHand ? ` ${nf.format(col.byHand)} ${col.byHand === 1 ? 'place types' : 'places type'} a colour by hand instead; the most common are above, each beside the palette colour it's closest to.` : ''}</span>${col.fixable.length ? `<span><b>${col.fixable.length} named ${col.fixable.length === 1 ? 'use copies' : 'uses copy'} a palette colour</b> instead of pointing at it, so ${col.fixable.length === 1 ? 'it won’t follow' : 'they won’t follow'} if the palette changes.</span>` : ''}</div></div>
        <div class="part"><h3>Why it matters</h3><p>Ten slightly different greys make an app look tired, and changing your brand colour means finding every copy. Named uses that point at one palette change everywhere at once, and let dark mode swap the palette underneath.</p></div>
        <div class="part"><h3>Your choice</h3><div class="choices" role="radiogroup" aria-label="Colours">
          ${col.fixable.length ? `<button type="button" class="choice" role="radio" aria-checked="${state.choice.color === 'point'}" data-pick="color:point"><b>Point the copies at the palette<span class="rec">Suggested</span></b><div class="steps">${col.fixable.slice(0, 8).map((h) => chip(h.value, `${h.name} → ${h.match.name}`)).join('')}</div><span>${col.fixable.length} named ${col.fixable.length === 1 ? 'use stops' : 'uses stop'} copying and ${col.fixable.length === 1 ? 'points' : 'point'} at the palette. Nothing looks different today.</span></button>` : ''}
          <button type="button" class="choice" role="radio" aria-checked="${state.choice.color === 'keep'}" data-pick="color:keep"><b>${col.fixable.length ? 'Leave them' : 'Keep your palette as it is'}</b><span>${col.fixable.length ? 'The copies stay copies.' : 'Your palette and its named uses already point the right way.'}</span></button>
        </div></div>
        <div class="part"><h3>The rule it becomes</h3><div class="rule"><span class="plate"><i class="toy">${toyOf('card')}</i></span><p>${esc(rule.plain)}</p><code>${esc(rule.code)}</code></div></div>
        ${nav('colour')}
      </div></section>`;
  };

  const rulesScreen = () => {
    const s = SCREENS[5], done = ORDER.filter((id) => !['welcome', 'rules'].includes(id) && state.decided.has(id));
    const code = `export default {\n  decisions: {\n${done.map((id) => { const r = ruleOf(id); return `    ${r.code}${r.skip ? '' : ','}`; }).join('\n')}\n  },\n};`;
    const left = SCREENS.filter((x) => !['welcome', 'rules'].includes(x.id) && !state.decided.has(x.id));
    return `<section class="screen">${face(s, done.length === 4 ? 'Your rules are ready.' : 'Your rules', `What you chose, in one place. It becomes <b>plumber.config</b>, the file Plumber reads every time it checks your app.`)}
      <div class="body">
        <div class="part"><h3>${done.length ? `${done.length} of 4 chosen` : 'Nothing chosen yet'}</h3>
          <ol class="final">${done.map((id) => { const sc = SCREENS.find((x) => x.id === id); return `<li style="--hf: var(${HUES[sc.hue][0]}); --hi: var(${HUES[sc.hue][1]})"><span class="plate"><i class="toy">${toyOf(sc.toy)}</i></span><b>${esc(sc.name)}</b><span>${esc(ruleOf(id).plain)}</span></li>`; }).join('')}
            ${left.map((x) => `<li class="empty"><span class="plate"><i class="toy">${toyOf(x.toy)}</i></span><b>${esc(x.name)}</b><span><button type="button" class="tb sm quiet" data-go="${x.id}"><span class="top"><span class="lb">Choose it</span></span></button></span></li>`).join('')}</ol>
          ${done.length ? `<pre class="file"><small>plumber.config.ts</small>${esc(code)}</pre>` : ''}</div>
        <div class="go"><h3>Set it up</h3><ol><li>Tidies your tokens the way you chose. Old names keep working.</li><li>Writes these rules into plumber.config.</li><li>Remembers what's already in your code, so you only hear about new problems.</li></ol>
          <div class="nav">${post && done.length ? button('Set it up', { attrs: 'data-setup' }) : ''}<span class="later" data-said>${!post ? 'Open this page with npx plumber to set it up from here.' : done.length ? 'One press. You can undo the token changes right after.' : 'Choose at least one rule first.'}</span></div></div>
      </div></section>`;
  };

  const draw = () => {
    const sizeFamily = Object.keys(screenOf).find((f) => screenOf[f] === state.at);
    const screen = state.at === 'welcome' ? welcome() : state.at === 'colour' ? colourScreen() : sizeFamily ? sizeScreen(sizes[sizeFamily]) : rulesScreen();
    root.innerHTML = `<style>${LANGUAGE_CSS}${SCALE_CSS}${GRAVITY_CSS}${BUTTON_CSS}${LESSON_CSS}</style>${TOY_DEFS}
      <div class="lesson${state.at === 'rules' ? ' whole' : ''}">${trail()}<div>${screen}</div>${state.at === 'rules' ? '' : rules()}</div>`;
    const g = root.getElementById('gravity');
    if (g && sizeFamily) {
      // for this reader a step is its size, once: three names for 16px are one step here (the names are in Details)
      const d = data[SIZES[sizeFamily].data] ?? { steps: [], strays: [] }, bySize = new Map();
      for (const st of d.steps) { const k = `${st.px}px`, had = bySize.get(k); bySize.set(k, { name: k, px: st.px, uses: (had?.uses ?? 0) + st.uses }); }
      const named = d.steps.reduce((m, st) => m.set(st.name, `${st.px}px`), new Map());
      new Gravity(g, { steps: [...bySize.values()], strays: d.strays.map((st) => ({ ...st, near: named.get(st.near) ?? st.near })), words: SIZES[sizeFamily].gravity });
    }
    state.fresh = '';
  };

  // the systems your answers make, for the token edits: a tidy size kind, and colour copies pointed back
  const chosenSystems = () => {
    const out = [];
    for (const f of Object.keys(screenOf)) if (state.decided.has(screenOf[f]) && state.choice[f] === 'tidy' && sizes[f].kind) out.push(systemOf(sizes[f].kind, sizes[f].tidy));
    if (state.decided.has('colour') && state.choice.color === 'point' && col.kind) out.push(systemOf(col.kind, { 'roles:color': 'point' }));
    return out.filter(Boolean);
  };
  const setUp = async (b) => {
    const said = root.querySelector('[data-said]');
    b.setAttribute('aria-busy', 'true');
    let wrote = null;
    try {
      // every rule names where its steps live before anything is written: an empty one checks nothing, and the config
      // would be refused after the tokens were already tidied
      const decisions = Object.fromEntries(ORDER.filter((id) => !['welcome', 'rules'].includes(id) && state.decided.has(id)).map((id) => ruleOf(id)).filter((r) => !r.skip).map((r) => [r.key, { from: r.from }]));
      const empty = Object.entries(decisions).filter(([, d]) => !d.from.length).map(([key]) => ({ spacing: 'spacing', color: 'colours', type: 'text', radius: 'corners' })[key] ?? key);
      if (empty.length) throw new Error(`Your theme has no ${empty.join(' or ')} to keep yet, so that rule would check nothing. Go back to ${empty[0]} and pick another answer.`);
      const edits = editsOf(chosenSystems());
      wrote = edits.length ? await post('/__plumb/system-apply', { files: edits, label: 'Your system' }) : null;
      const set = await post('/__plumb/setup', { decisions }).catch(async (err) => {
        // the rules couldn't be saved: the tokens go back as they were, so the app is never half set up
        if (wrote?.undo) { await post('/__plumb/undo', { id: wrote.undo.id }).catch(() => {}); wrote = null; }
        throw err;
      });
      said.innerHTML = `Done. Your rules are in plumber.config${wrote?.written?.length ? `, ${wrote.written.reduce((n, f) => n + f.set + f.added, 0)} tokens tidied` : ''}, and ${nf.format(set.recorded)} ${set.recorded === 1 ? 'problem' : 'problems'} already in your code remembered, so you'll only hear about new ones. `;
      if (wrote?.undo) { const undo = document.createElement('button'); undo.type = 'button'; undo.className = 'tb sm quiet'; undo.innerHTML = '<span class="top"><span class="lb">Undo the token changes</span></span>'; undo.onclick = async () => { try { await post('/__plumb/undo', { id: wrote.undo.id }); said.textContent = 'Token changes undone. Your rules stay in plumber.config.'; } catch (err) { said.textContent = `Couldn’t undo: ${err.message}`; } }; said.append(undo); }
      b.remove();
    } catch (err) { said.textContent = `Nothing was changed in your files. ${err.message}`; }
    finally { b.removeAttribute('aria-busy'); }
  };

  root.addEventListener('click', (e) => {
    const setup = e.target.closest('[data-setup]');
    if (setup) { setUp(setup); return; }
    const go = e.target.closest('[data-go]'), pick = e.target.closest('[data-pick]'), next = e.target.closest('[data-next]');
    if (pick) { const [family, value] = pick.dataset.pick.split(':'); state.choice[family] = value; draw(); return; }
    if (next) { state.decided.add(next.dataset.next); state.fresh = next.dataset.next; state.at = nextOf(next.dataset.next).id; draw(); window.scrollTo?.({ top: 0 }); return; }
    if (go && !go.disabled) { state.at = go.dataset.go; draw(); }
  });
  draw();
}
