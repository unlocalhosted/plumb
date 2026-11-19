/* ─────────────────────────────────────────────────────────
 * THE LESSON · the project page as Plumber's onboarding (docs/design/onboarding.md, "The lesson")
 *
 * For someone who built a UI fast and has never heard "token". One idea per screen, on their own app, ending in
 * their rules: the config Plumber holds their code to from then on. Each screen's one answer adds a line to the
 * rules, which fill in beside the lesson as it's written.
 *
 *  screens   Welcome → Spacing → Colours → Text → Corners → Your rules; a row of toys at the top says where you are
 *  a screen  what it is (one sentence) · the one thing to notice, in a sentence · yours, drawn (each size at its
 *            size, the pile worth noticing bracketed) · why it matters (one line) · one choice, a sensible one picked
 *            · the rule it becomes · one button (comp: docs/design/comps/onboarding-text.html)
 *  words     "token", "scale", "theme" only after the reader has seen the thing; numbers and names behind Details
 *  built     Spacing, Corners and Text from one builder for sizes; Colours its own; Set it up comes next
 * ───────────────────────────────────────────────────────── */
import { LANGUAGE_CSS } from './language.js';
import { TOY_DEFS, toyOf } from './toys.js';
import { BUTTON_CSS, button } from './kit.js';
import { colourModel, decisionsOf, editsOf, lanesOf, systemOf } from './system-review.js';
import { oklab, toRgb } from './craft-headless.js';
import { NAMED } from './scale.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const nf = new Intl.NumberFormat('en');

const SCREENS = [
  { id: 'welcome', toy: 'tooltip', hue: 'butter', name: 'Welcome' },
  { id: 'spacing', toy: 'padding', hue: 'mint', name: 'Spacing' },
  { id: 'colour', toy: 'fill', hue: 'lilac', name: 'Colours' },
  { id: 'text', toy: 'type', hue: 'sky', name: 'Text' },
  { id: 'corners', toy: 'corner', hue: 'coral', name: 'Corners' },
  { id: 'rules', toy: 'card', hue: 'lilac', name: 'Your rules' },
];

const LESSON_CSS = `
  /* The lesson, composed as one page per step (docs/design/comps/onboarding-text.html, owner 2026-11-19: "no layout,
     boxes thrown together, no insight, no one way to read it"). The system:
     - one reading path: what it is → the one thing to notice → yours, drawn, with that thing pointed at → why, one
       line → one choice → the rule it becomes → one button;
     - one focal point: the drawing, on the only grey shelf; everything else is words on white;
     - colour, one meaning each: the step's hue marks this step (its toy, the answer you picked), butter points at the
       problem, pink is the one action; no other fills;
     - names of files and tokens behind Details. */
  :host { display: block; color: var(--pl-ink); font-family: var(--pl-sans); }
  .lesson { display: grid; grid-template-columns: minmax(0, 1fr) 260px; gap: 0 72px; align-items: start; }
  .lesson.whole { grid-template-columns: minmax(0, 1fr); max-width: 860px; }
  @media (max-width: 960px) { .lesson { grid-template-columns: 1fr; } .rules { display: none; } }

  /* where you are: the steps' toys on one line, done ones in colour, the one you're on named, the rest greyed */
  .where { grid-column: 1 / -1; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin: 0 0 56px; padding: 0; list-style: none; font: 600 14px/1 var(--pl-sans); color: var(--pl-ink-2); }
  .where li { display: flex; align-items: center; gap: 8px; }
  .where li + li::before { content: ''; width: 18px; height: 2px; border-radius: 1px; background: var(--pl-rule); }
  .where li.past + li::before, .where li.here::before { background: var(--pl-ink-2); }
  .where button { all: unset; display: inline-flex; align-items: center; gap: 8px; padding: 4px; border-radius: 10px; cursor: pointer; color: var(--pl-ink-2); transition: background 160ms var(--pl-ease-out); }
  .where button:hover { background: var(--pl-paper-2); }
  .where button:focus-visible { outline: 2px solid var(--pl-pink-block); outline-offset: 2px; }
  .where .toy { width: 22px; height: 22px; }
  .where li:not(.past):not(.here) .toy { filter: grayscale(1); opacity: .45; }
  .where li.here button { color: var(--pl-ink); }
  .where .of { margin-left: 8px; font-weight: 500; }
  .where .of::before { display: none; }

  /* what it is */
  .eyebrow { display: flex; align-items: center; gap: 10px; margin: 0 0 14px; font: 650 14px/1 var(--pl-sans); color: var(--hi, var(--pl-ink-2)); }
  .eyebrow .toy { width: 28px; height: 28px; }
  h1 { margin: 0; font: var(--pl-round-w, 750) 44px/48px var(--pl-round); letter-spacing: -0.02em; text-wrap: balance; color: var(--pl-ink); }
  h1 .name { white-space: nowrap; }
  .lead { margin: 14px 0 0; max-width: 58ch; font: 500 18px/28px var(--pl-sans); color: var(--pl-ink-2); }

  /* the one thing to notice, at reading size, its key words marked in butter */
  .insight { margin: 48px 0 18px; max-width: 36ch; font: var(--pl-round-w, 700) 26px/33px var(--pl-round); letter-spacing: -0.01em; color: var(--pl-ink); text-wrap: pretty; }
  .insight em { font-style: normal; background: linear-gradient(transparent 62%, var(--pl-butter-face) 62%); }

  /* the drawing: the only shelf on the page */
  .shelf { padding: 28px 28px 22px; border-radius: 24px; background: var(--pl-paper-2); }
  .shelf .key { margin: 16px 0 0; font: 500 13px/18px var(--pl-sans); color: var(--pl-ink-2); }
  .ramp { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); align-items: end; gap: 8px 4px; }
  .ramp .size { grid-row: 1; display: grid; justify-items: center; align-content: end; gap: 8px; min-width: 0; }
  .ramp .px { grid-row: 2; justify-self: center; font: 600 11px/1 var(--pl-sans); color: var(--pl-ink-2); font-variant-numeric: tabular-nums; }
  .ramp .use { width: 6px; border-radius: 3px; background: var(--pl-ink-2); opacity: .3; }
  .ramp .aa { line-height: 1; font-weight: 600; color: var(--pl-ink); }
  .ramp .gap { display: grid; justify-items: center; }
  .ramp .gap i { display: block; width: 18px; height: 6px; border-radius: 3px; background: var(--pl-ink); opacity: .75; }
  .ramp .arc { width: 30px; height: 30px; background: var(--pl-ink); opacity: .75; }
  .ramp .in .aa { color: var(--pl-butter-ink); }
  .ramp .in .use { background: var(--pl-butter); opacity: 1; }
  .ramp .in .gap i, .ramp .in .arc { background: var(--pl-butter-ink); }
  /* what's pointed at: a bracket under its sizes, and its words */
  .ramp .br { grid-row: 3; height: 12px; margin: 6px 6px 0; border: 2px solid var(--pl-butter); border-top: 0; border-radius: 0 0 8px 8px; }
  .shelf .say { margin: 10px 0 0; font: 650 14px/20px var(--pl-sans); color: var(--pl-butter-ink); }
  /* colours: your palette as a strip of chips, then the colours typed by hand beside the palette colour they're nearest */
  .chips { display: flex; flex-wrap: wrap; gap: 6px 18px; }
  .chips .hue { display: flex; gap: 4px; }
  .chip { display: inline-block; flex: none; width: 24px; height: 24px; border-radius: 8px; box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--pl-ink) 10%, transparent); }
  .shelf h4 { margin: 0 0 12px; font: 650 13px/18px var(--pl-sans); color: var(--pl-ink-2); }
  .shelf h4 + * { margin-bottom: 0; }
  .shelf .chips + h4 { margin-top: 24px; }
  .pairs { display: grid; gap: 4px; margin: 0; padding: 0; list-style: none; }
  .pairs li { display: grid; grid-template-columns: 24px 24px minmax(0, 1fr) auto; align-items: center; gap: 6px 10px; padding: 6px 0; font: 500 14px/20px var(--pl-sans); color: var(--pl-ink-2); }
  .pairs li code { font: 600 13px/20px var(--pl-mono); color: var(--pl-ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .pairs li.in code { color: var(--pl-butter-ink); }
  .pairs li .n { font-variant-numeric: tabular-nums; }
  .why { margin: 18px 0 0; max-width: 60ch; font: 500 16px/25px var(--pl-sans); color: var(--pl-ink-2); }

  /* one choice: rows on white; the one picked is lit in the step's hue, its dot filled */
  h2 { margin: 56px 0 14px; font: var(--pl-round-w, 700) 22px/28px var(--pl-round); color: var(--pl-ink); }
  .choice { all: unset; box-sizing: border-box; width: 100%; display: grid; grid-template-columns: 24px minmax(0, 1fr) auto; column-gap: 14px; row-gap: 4px; align-items: center; padding: 18px 20px; border-radius: 18px; cursor: pointer; transition: background 160ms var(--pl-ease-out); }
  .choice + .choice { margin-top: 6px; }
  .choice:hover { background: var(--pl-paper-2); }
  .choice:focus-visible { outline: 2px solid var(--pl-pink-block); outline-offset: 2px; }
  .choice .dot { width: 20px; height: 20px; border-radius: 50%; box-shadow: inset 0 0 0 2px var(--pl-rule); transition: box-shadow 200ms var(--pl-spring-pop); }
  .choice b { font: var(--pl-round-w, 700) 17px/22px var(--pl-round); color: var(--pl-ink); }
  .choice b small { margin-left: 8px; font: 650 12px/1 var(--pl-sans); color: var(--hi); }
  .choice p { grid-column: 2 / -1; margin: 0; font: 500 14.5px/21px var(--pl-sans); color: var(--pl-ink-2); }
  .choice p code { font: 600 13px/18px var(--pl-mono); }
  .choice .mini { display: flex; align-items: flex-end; gap: 5px; color: var(--pl-ink); font: 600 14px/1 var(--pl-sans); }
  .choice .mini i { display: block; width: 6px; border-radius: 2px; background: currentColor; opacity: .7; }
  .choice .mini .c { width: 16px; height: 16px; background: currentColor; opacity: .7; }
  /* the step's face, softened toward the page: by night the faces are saturated, and the answer is a tint, not a slab */
  .choice[aria-checked="true"] { background: color-mix(in oklab, var(--hf) 70%, var(--pl-paper)); }
  .choice[aria-checked="true"] .dot { box-shadow: inset 0 0 0 6px var(--hi); }
  .choice[aria-checked="true"] p { color: var(--hi); }
  @media (prefers-reduced-motion: reduce) { .choice, .choice .dot { transition: none; } }
  .becomes { display: flex; gap: 12px; align-items: flex-start; margin: 14px 0 0; padding: 14px 18px; border-radius: 16px; background: var(--pl-paper-2); font: 500 15px/22px var(--pl-sans); color: var(--pl-ink-2); }
  .becomes .toy { flex: none; width: 22px; height: 22px; }
  .becomes b { color: var(--pl-ink); font-weight: 650; }
  details.more { margin-top: 14px; }
  details.more summary { cursor: pointer; font: 600 13.5px/20px var(--pl-sans); color: var(--pl-ink-2); }
  details.more summary:hover { color: var(--pl-ink); }
  details.more div { display: grid; gap: 6px; margin-top: 10px; font: 500 13px/19px var(--pl-sans); color: var(--pl-ink-2); }
  details.more code { font: 500 12.5px/18px var(--pl-mono); color: var(--pl-ink); white-space: pre-wrap; }

  .nav { display: flex; flex-wrap: wrap; align-items: center; gap: 16px; margin-top: 32px; }
  .nav .later { font: 500 14px/20px var(--pl-sans); color: var(--pl-ink-2); }

  /* welcome: each kind as one row on the shelf, how much of it follows your theme */
  .kinds { display: grid; gap: 18px; margin: 0; padding: 0; list-style: none; }
  .kinds li { display: grid; grid-template-columns: 26px 110px minmax(0, 1fr) 48px; align-items: center; gap: 4px 14px; font: 500 14px/20px var(--pl-sans); color: var(--pl-ink-2); }
  .kinds .toy { width: 26px; height: 26px; }
  .kinds b { font: var(--pl-round-w, 700) 16px/20px var(--pl-round); color: var(--pl-ink); }
  .kinds .bar { height: 10px; border-radius: 5px; background: var(--pl-rule); overflow: hidden; }
  .kinds .bar i { display: block; height: 100%; border-radius: 5px; background: var(--pl-ink-2); }
  .kinds .pct { font: var(--pl-round-w, 700) 16px/20px var(--pl-round); color: var(--pl-ink); text-align: right; font-variant-numeric: tabular-nums; }
  .kinds small { grid-column: 3 / -1; font: 500 13px/18px var(--pl-sans); }
  .kinds li.low .bar i { background: var(--pl-butter); }
  .steps3 { display: grid; gap: 10px; margin: 0; padding: 0; list-style: none; counter-reset: s; }
  .steps3 li { display: grid; grid-template-columns: 28px minmax(0, 1fr); font: 500 16px/24px var(--pl-sans); color: var(--pl-ink-2); counter-increment: s; }
  .steps3 li::before { content: counter(s); font: var(--pl-round-w, 700) 16px/24px var(--pl-round); color: var(--pl-ink); }
  .steps3 b { color: var(--pl-ink); font-weight: 650; }

  /* the last screen: your rules as a list, the file they write, then the one press */
  .final { display: grid; gap: 16px; margin: 0; padding: 0; list-style: none; }
  .final li { display: grid; grid-template-columns: 28px minmax(0, 1fr) auto; gap: 2px 14px; align-items: start; font: 500 15px/22px var(--pl-sans); color: var(--pl-ink-2); }
  .final li .toy { grid-row: span 2; width: 28px; height: 28px; }
  .final li b { font: var(--pl-round-w, 700) 17px/22px var(--pl-round); color: var(--pl-ink); }
  .final li span { grid-column: 2; }
  .final li.todo .toy { filter: grayscale(1); opacity: .45; }
  .final li .tb { grid-row: span 2; }
  .file { margin: 0; font: 500 13px/20px var(--pl-mono); color: var(--pl-ink); white-space: pre-wrap; overflow-x: auto; }

  /* your rules, beside: a quiet list that fills in */
  .rules { position: sticky; top: 88px; padding-top: 6px; }
  .rules h3 { margin: 0 0 4px; font: var(--pl-round-w, 700) 17px/22px var(--pl-round); color: var(--pl-ink); }
  .rules > p { margin: 0 0 18px; font: 500 13.5px/20px var(--pl-sans); color: var(--pl-ink-2); }
  .rules ol { display: grid; gap: 14px; margin: 0; padding: 0; list-style: none; }
  .rules li { display: grid; grid-template-columns: 22px minmax(0, 1fr); gap: 2px 12px; font: 500 13.5px/19px var(--pl-sans); color: var(--pl-ink-2); }
  .rules li .toy { grid-row: span 2; width: 22px; height: 22px; }
  .rules li b { font: 650 14px/19px var(--pl-sans); color: var(--pl-ink); }
  .rules li.todo { opacity: .55; }
  .rules li.todo .toy { filter: grayscale(1); }
  .rules li.fresh { animation: rule-in 360ms var(--pl-spring-pop) both; }
  @keyframes rule-in { from { opacity: 0; translate: 0 4px; } }
  @media (prefers-reduced-motion: reduce) { .rules li.fresh { animation: none; } }
  @media (max-width: 760px) { .ramp { grid-auto-columns: minmax(36px, 1fr); overflow-x: auto; padding-bottom: 6px; } h1 { font-size: 34px; line-height: 38px; } .insight { font-size: 22px; line-height: 28px; } .kinds li { grid-template-columns: 26px minmax(0, 1fr) 48px; } .kinds .bar { grid-column: 2 / -1; grid-row: 2; } }
`;

const HUES = { butter: ['--pl-butter-face', '--pl-butter-ink'], mint: ['--pl-mint-face', '--pl-mint-ink'], pink: ['--pl-pink-face', '--pl-pink-ink'], sky: ['--pl-sky-face', '--pl-sky-ink'], lilac: ['--pl-lilac-face', '--pl-lilac-ink'], coral: ['--pl-coral-face', '--pl-coral-ink'] };

/* A size kind's screen (spacing, corners, text), all built the same way: its words, its data, and the tidy answer the
   review's model suggests (one list, steps on a base, Tailwind's name, numbered by size) */
const SIZES = {
  spacing: { screen: 'spacing', data: 'spacing', convention: '--spacing-', noun: 'gap and padding', nouns: 'gaps and paddings', subject: 'gaps and paddings', verb: 'are', ask: 'How should your spacing work?',
    title: 'Spacing is the room between things.', line: 'Inside a card, between a row of buttons, around a section. Same room, same feel.',
    why: 'When every gap is a little different, screens feel uneven, and changing how roomy your app feels means hunting through every file. One short list of steps, used everywhere, fixes both.',
    gravity: { sizes: 'spacing steps', title: 'Where your gaps and paddings land', empty: 'Add spacing to your theme, and this fills in.' } },
  radius: { screen: 'corners', data: 'radius', convention: '--radius-', noun: 'rounded corner', nouns: 'rounded corners', subject: 'rounded corners', verb: 'are', ask: 'How round should things be?',
    title: 'Corners are how round things are.', line: 'Buttons, cards, inputs, pictures. A few roundnesses, each for a kind of thing, make an app feel made by one hand.',
    why: 'Corners that are almost the same (7px here, 8px there) read as a mistake even when nobody can say why. A small set, one for each kind of thing, keeps the app calm.',
    gravity: { sizes: 'corner sizes', title: 'Where your rounded corners land', empty: 'Add corner sizes to your theme, and this fills in.' } },
  type: { screen: 'text', data: 'size', convention: '--text-', noun: 'text size', nouns: 'text sizes', subject: 'text', verb: 'is', ask: 'What should your text sizes be?',
    title: 'Text sizes are your app’s voice levels.', line: 'A title, a paragraph, a label, small print. Each level should be clearly bigger or smaller than the next.',
    why: 'Sizes a pixel apart look like the same size set carelessly. A few clear levels tell the reader what to read first, on every screen.',
    gravity: { sizes: 'text sizes', title: 'Where your text sizes land', empty: 'Add text sizes to your theme, and this fills in.' } },
};
/**
 * A few clear levels of text, from the sizes your theme has.
 * Seeing: a reader tells levels apart only when each is clearly bigger than the next; 12px beside 11px reads as one
 * size set carelessly. Principle: adjacent levels differ by at least a major second (1.125×), the smallest interval
 * type scales are built on (modular scales, Tim Brown, "More Meaningful Typography", A List Apart, 2011; Tailwind's
 * own 12, 14, 16, 18px steps sit 1.125 to 1.17 apart). Signals: how many places use each size, theme and typed by
 * hand together. Suggestion: the busiest size wins, then the next busiest that is a major second from every level
 * kept, and so on; each other size goes to its nearest level. Returns the sizes to keep, or nothing when every step
 * is already a level.
 */
function levelsOf(data, steps) {
  const sizes = [...new Set(steps.map((s) => s.px).filter((v) => v !== null && v > 0))];
  const use = new Map(sizes.map((v) => [v, 0]));
  const near = (px) => sizes.reduce((a, v) => (a === null || Math.abs(v - px) < Math.abs(a - px) ? v : a), null);
  for (const s of data.size?.steps ?? []) { const v = near(s.px); if (v !== null && Math.abs(v - s.px) < 0.5) use.set(v, use.get(v) + s.uses); }
  for (const s of data.size?.strays ?? []) { const v = near(s.px); if (v !== null && Math.abs(v - s.px) < 0.5) use.set(v, use.get(v) + s.places); }
  const apart = (a, b) => Math.max(a, b) / Math.min(a, b) >= NAMED['major second'] - 1e-9;
  const kept = [];
  for (const v of [...sizes].sort((a, b) => use.get(b) - use.get(a) || a - b)) if (kept.every((k) => apart(k, v))) kept.push(v);
  return kept.length < sizes.length ? kept.sort((a, b) => a - b) : null;
}
function sizeModel(data, family) {
  const spec = SIZES[family], kind = (data.reading ?? []).find((k) => k.family === family);
  const lanes = kind ? lanesOf(kind).filter((l) => l.values.length > 1) : [];
  const decisions = kind ? decisionsOf(kind) : [];
  const offered = (id, value) => decisions.find((d) => d.id === id)?.options.some(([v]) => v === value);
  const biggest = [...lanes].sort((a, b) => b.tokens.length - a.tokens.length)[0];
  const tidy = { ...(offered(`keep:${family}`, biggest?.name) ? { [`keep:${family}`]: biggest.name } : {}), ...(offered(`base:${family}`, 'round') ? { [`base:${family}`]: 'round' } : {}),
    ...(offered(`name:${family}`, spec.convention) ? { [`name:${family}`]: spec.convention } : {}), ...(offered(`count:${family}`, 'size') ? { [`count:${family}`]: 'size' } : {}) };
  const merged = kind && Object.keys(tidy).length ? systemOf(kind, tidy) : null;
  if (family === 'type' && merged?.scales.length === 1) { const keep = levelsOf(data, merged.scales[0].steps); if (keep) tidy['levels:type'] = keep; }
  const tidied = tidy['levels:type'] ? systemOf(kind, tidy) : merged, one = tidied?.scales.length === 1 ? tidied.scales[0] : null;
  const values = [...new Set(lanes.flatMap((l) => l.values))].sort((a, b) => a - b);
  const twice = values.filter((v) => lanes.filter((l) => l.values.includes(v)).length > 1);
  const byHand = (data[spec.data]?.strays ?? []).reduce((n, s) => n + s.places, 0);
  return { family, spec, kind, lanes, values, twice, byHand, tidy, one, moved: tidied?.moved ?? [], needed: !!one };
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


  const toy = (name) => `<i class="toy">${toyOf(name)}</i>`;
  const hueOf = (s) => `--hf: var(${HUES[s.hue][0]}); --hi: var(${HUES[s.hue][1]})`;
  const app = esc(data.project ?? 'your app');
  const kinds = ORDER.filter((id) => !['welcome', 'rules'].includes(id));

  // where you are: the steps' toys on one line; the done ones in colour, the one you're on named
  const where = () => {
    const at = ORDER.indexOf(state.at), k = kinds.indexOf(state.at);
    return `<ol class="where" aria-label="Setting up">${SCREENS.map((s, i) => `<li class="${i < at ? 'past' : i === at ? 'here' : ''}"><button type="button" data-go="${s.id}"${i === at ? ' aria-current="step"' : ''} aria-label="${esc(s.name)}">${toy(s.toy)}${i === at ? esc(s.name) : ''}</button></li>`).join('')}
      <li class="of">${k >= 0 ? `Step ${k + 1} of ${kinds.length}` : state.at === 'welcome' ? 'Four short steps' : 'Last step'}</li></ol>`;
  };
  // what it is: the step's toy and name, a title, one line
  const head = (s, eyebrow, title, lead) => `<p class="eyebrow">${toy(s.toy)}${eyebrow}</p><h1>${title}</h1>${lead ? `<p class="lead">${lead}</p>` : ''}`;

  const nav = (id) => { const n = nextOf(id); return `<div class="nav">${button(n.id === 'rules' ? 'Add this rule and finish' : `Add this rule, then ${n.name.toLowerCase()}`, { key: '→', attrs: `data-next="${id}"` })}<span class="later">You can come back and change it.</span></div>`; };

  // the levels a scale holds: its steps with a size (a line height kept beside a text size is not a level)
  const sized = (one) => one.steps.filter((x) => x.px !== null).length;
  // a size kind with no steps anywhere: nothing in the theme, no Tailwind base, nothing in the reading
  const bare = (m) => !m.lanes.length && !(m.kind?.groups ?? []).length && !(m.family === 'spacing' && data.spacing?.numeric) && !(data[m.spec.data]?.steps ?? []).length;
  // a size kind's rule, in plain words and as the line it writes
  const sizeRule = (m) => {
    const key = m.family === 'type' ? 'type' : m.family;
    if (state.choice[m.family] === 'tidy' && m.one) { const from = [`css:${m.one.lane.file}#${m.one.stem}*`]; return { plain: m.moved.length ? `Every ${m.spec.noun} is one of your ${sized(m.one)} levels. Anything else, Plumber points out.` : `Every ${m.spec.noun} uses one of these ${m.one.steps.length}. Anything else, Plumber points out.`, key, from, code: `${key}: { from: ['${from[0]}'] }` }; }
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

  // your rules, beside the lesson: a quiet list that fills in
  const rules = () => `<aside class="rules" aria-live="polite"><h3>Your rules</h3><p>Plumber holds your code to these from now on.</p><ol>${kinds.map((id) => {
    const sc = SCREENS.find((x) => x.id === id), done = state.decided.has(id);
    return `<li class="${done ? '' : 'todo'}${id === state.fresh ? ' fresh' : ''}">${toy(sc.toy)}<b>${esc(sc.name)}</b>${done ? esc(short(ruleOf(id).plain)) : id === state.at ? 'Choose on this page.' : 'Not chosen yet.'}</li>`;
  }).join('')}</ol></aside>`;
  // a rule's first sentence, for the list beside
  const short = (plain) => plain.split(/(?<=\.) /)[0];

  // every size used, with the places that use it: from your theme and typed by hand together
  const sizesOf = (m) => {
    const d = data[m.spec.data] ?? { steps: [], strays: [] }, by = new Map();
    const at = (v) => by.get(v) ?? by.set(v, { px: v, n: 0, hand: 0 }).get(v);
    for (const s of d.steps) at(s.px).n += s.uses;
    for (const s of d.strays) { const e = at(s.px); e.n += s.places; e.hand += s.places; }
    return [...by.values()].filter((x) => x.n > 0).sort((a, b) => a.px - b.px);
  };
  // the one thing to notice: three or more sizes too close to tell apart (the largest at most a third bigger than the
  // smallest), mostly typed by hand, carrying a real share of the places. Steps of a scale that are close (8, 10 and
  // 12px of spacing) are a scale, not a pile, so the pile has to be mostly typed by hand.
  const pileOf = (m, all) => {
    const total = all.reduce((t, x) => t + x.n, 0);
    let best = null;
    for (let i = 0; i < all.length; i++) {
      let n = 0, hand = 0;
      for (let j = i; j < all.length && all[j].px <= Math.max(all[i].px * 1.34, all[i].px + 1); j++) {
        n += all[j].n; hand += all[j].hand;
        if (j - i >= 2 && hand / n >= 0.5 && (!best || n > best.n)) best = { from: all[i].px, to: all[j].px, k: j - i + 1, n };
      }
    }
    return best && best.n / total >= 0.2 ? { ...best, total } : null;
  };
  const share = (part, whole) => { const r = part / whole; return r >= 0.45 && r <= 0.55 ? 'Half' : r >= 0.7 ? 'Most' : `${Math.round(r * 100)}%`; };
  const px = (v) => `${Math.round(v * 10) / 10}px`;

  // yours, drawn: each size at its size (text as Aa, spacing as a gap, corners as a corner), a mark that grows with
  // its places, and a bracket under the pile worth noticing
  const ramp = (m, all, pile) => {
    const most = Math.max(...all.map((x) => x.n)), cut = Math.max(3, most * 0.02);
    const shown = all.filter((x) => x.n >= cut || (pile && x.px >= pile.from && x.px <= pile.to)).slice(0, 26);
    const mark = (x) => m.family === 'type' ? `<span class="aa" style="font-size: ${Math.min(x.px, 30)}px">Aa</span>`
      : m.family === 'radius' ? `<span class="arc" style="border-top-left-radius: ${Math.min(x.px, 30)}px"></span>`
      : `<span class="gap" style="gap: ${Math.min(x.px, 56)}px"><i></i><i></i></span>`;
    const inPile = (x) => pile && x.px >= pile.from && x.px <= pile.to;
    const first = shown.findIndex(inPile), last = shown.length - 1 - [...shown].reverse().findIndex(inPile);
    return `<div class="ramp">${shown.map((x, i) => `<div class="size${inPile(x) ? ' in' : ''}" style="grid-column: ${i + 1}">${mark(x)}<span class="use" style="height: ${4 + (x.n / most) * 40}px"></span></div><span class="px" style="grid-column: ${i + 1}">${px(x.px).replace('px', '')}</span>`).join('')}
      ${pile && first >= 0 ? `<span class="br" style="grid-column: ${first + 1} / ${last + 2}"></span>` : ''}</div>${pile ? `<p class="say">${pile.k} sizes, ${nf.format(pile.n)} places. To a reader they look like one ${esc(m.spec.noun)}, set carelessly.</p>` : ''}`;
  };

  const choice = ({ on, pick, title, rec, mini = '', text }) => `<button type="button" class="choice" role="radio" aria-checked="${on}" data-pick="${pick}"><span class="dot"></span><b>${title}${rec ? '<small>Suggested</small>' : ''}</b><span class="mini">${mini}</span><p>${text}</p></button>`;
  const miniOf = (family, vals) => family === 'type' ? vals.map((v) => v < 4 ? v * 16 : v).filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b).filter((_, i, a) => a.length <= 7 || i % Math.ceil(a.length / 7) === 0).slice(0, 7).map((v) => `<span style="font-size: ${Math.min(v, 30)}px">Aa</span>`).join('')
    : family === 'radius' ? vals.slice(0, 6).map((v) => `<i class="c" style="border-top-left-radius: ${Math.min(v, 16)}px"></i>`).join('')
    : vals.slice(0, 12).map((v) => `<i style="height: ${Math.max(3, Math.min(v, 40) * 0.6)}px"></i>`).join('');
  // what moves when sizes between levels go: each size to its level, the busiest first
  const movesOf = (m) => {
    const used = (px) => sizesOf(m).find((x) => Math.abs(x.px - px) < 0.5)?.n ?? 0;
    const list = [...new Map(m.moved.filter((x) => x.px !== x.toPx).map((x) => [x.px, x])).values()].sort((a, b) => used(b.px) - used(a.px));
    return `${list.slice(0, 4).map((x) => `${px(x.px)} → ${px(x.toPx)}`).join(', ')}${list.length > 4 ? `, and ${list.length - 4} more` : ''}`;
  };
  const becomes = (rule) => `<p class="becomes">${toy('card')}<span><b>Your rule:</b> ${esc(rule.plain)}</span></p>`;

  const sizeScreen = (m) => {
    const s = SCREENS.find((x) => x.id === m.spec.screen), rule = sizeRule(m), all = sizesOf(m), pile = pileOf(m, all);
    const total = all.reduce((t, x) => t + x.n, 0), d = data[m.spec.data] ?? { steps: [], strays: [] };
    const insight = !total ? `${app} doesn’t set any ${esc(m.spec.nouns)} Plumber could read.`
      : pile ? `${share(pile.n, total)} of ${app}’s ${esc(m.spec.subject)} ${m.spec.verb} set in <em>${pile.k} sizes between ${px(pile.from)} and ${px(pile.to)}</em>, each barely different from the next.`
      : m.byHand / total > 0.3 ? `<em>${share(m.byHand, total)} of ${app}’s ${esc(m.spec.subject)}</em> ${m.spec.verb} typed by hand instead of using your steps.`
      : `${share(total - m.byHand, total)} of ${app}’s ${esc(m.spec.subject)} already ${m.spec.verb === 'is' ? 'uses' : 'use'} your steps. <em>${nf.format(m.byHand)} ${m.byHand === 1 ? 'place types' : 'places type'} one by hand.</em>`;
    const keepVals = m.values.length ? m.values : d.steps.map((x) => x.px).filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b);
    const top = [...d.strays].sort((a, b) => b.places - a.places).slice(0, 5);
    return `<section class="screen" style="${hueOf(s)}">${head(s, esc(s.name), m.spec.title, m.spec.line)}
      <p class="insight">${insight}</p>
      ${all.length ? `<div class="shelf">${ramp(m, all, pile)}<p class="key">Each size is drawn at its size; the mark under it grows with the places that use it.</p></div>` : ''}
      <p class="why">${m.spec.why}</p>
      <h2>${m.spec.ask}</h2>
      <div role="radiogroup" aria-label="${esc(s.name)}">
        ${m.needed ? choice({ on: state.choice[m.family] === 'tidy', pick: `${m.family}:tidy`, title: m.moved.length ? `${sized(m.one)} clear levels` : `One list of ${m.one.steps.length}`, rec: true, mini: miniOf(m.family, m.one.steps.map((x) => x.px ?? (String(x.value).endsWith('rem') ? parseFloat(x.value) * 16 : parseFloat(x.value))).filter((v) => v > 0)), text: m.moved.length ? `${m.lanes.length > 1 ? `Your ${m.lanes.length} lists become one` : 'One list'} of ${sized(m.one)} levels, each clearly bigger than the next. Text set in a size between them moves to the nearest level: ${movesOf(m)}.` : `${m.lanes.length > 1 ? `Your ${m.lanes.length} lists become one` : `Your ${esc(m.spec.gravity.sizes)} become one list`}, with Tailwind’s names. The old names keep working, pointing at the new ones.` }) : ''}
        ${choice({ on: state.choice[m.family] === 'keep', pick: `${m.family}:keep`, title: bare(m) ? 'Skip it for now' : 'Keep what you have', mini: bare(m) ? '' : miniOf(m.family, keepVals),
          text: bare(m) ? `Your theme has no ${esc(m.spec.gravity.sizes)} yet. To draft them from the sizes your code uses, run <code>${esc(data.runner ?? 'npx')} plumber propose --family ${m.family} --write</code>.` : m.lanes.length > 1 ? `Your ${m.lanes.length} lists stay as they are. Plumber points out new ${esc(m.spec.nouns)} typed by hand.` : `Nothing changes. Plumber points out new ${esc(m.spec.nouns)} typed by hand.` })}
      </div>
      ${becomes(rule)}
      <details class="more"><summary>Details for designers</summary><div><code>${esc(rule.code)}</code>${m.lanes.map((l) => `<span>${esc(l.name)} in ${esc(l.file)}: ${l.values.join(', ')}px</span>`).join('')}${top.length ? `<span>Typed by hand most often:</span>${top.map((x) => `<code>${esc(x.written[0]?.text ?? px(x.px))}${x.where?.[0] ? `  ${esc(x.where[0].file)}:${x.where[0].line}` : ''}  ×${x.places}</code>`).join('')}` : ''}</div></details>
      ${nav(s.id)}
    </section>`;
  };

  const colourScreen = () => {
    const s = SCREENS[2], rule = colourRule(), onPalette = (data.colour?.steps ?? []).reduce((n, x) => n + x.uses, 0), total = onPalette + col.byHand;
    const exact = col.typed.filter((t) => t.distance === 0).reduce((n, t) => n + t.places, 0);
    const insight = !total ? `${app} doesn’t set any colours Plumber could read.`
      : exact / Math.max(1, col.byHand) >= 0.3 ? `<em>${share(exact, col.byHand)} of the colours ${app} types by hand</em> are already in your palette, typed again.`
      : col.byHand / total > 0.2 ? `<em>${share(col.byHand, total)} of ${app}’s colours</em> are typed by hand instead of coming from your palette.`
      : `${share(onPalette, total)} of ${app}’s colours come from your palette. <em>${nf.format(col.byHand)} ${col.byHand === 1 ? 'place types' : 'places type'} one by hand.</em>`;
    const chip = (v, title) => `<i class="chip" style="background: ${esc(v)}" title="${esc(title)}"></i>`;
    const pairs = col.typed.slice(0, 6).map((t) => { const near = col.palette.find((p) => p.name.slice(2) === t.near) ?? col.roles.find((p) => p.name.slice(2) === t.near);
      return `<li class="${t.distance === 0 ? 'in' : ''}">${chip(t.css, t.css)}${near ? chip(near.value, near.name) : '<i></i>'}<code>${esc(asWritten(t.written[0]?.text, t.css))}</code><span class="n">${near ? `${t.distance === 0 ? 'is' : 'is close to'} your ${esc(near.name.replace(/^--/, ''))} · ` : ''}${nf.format(t.places)}×</span></li>`; }).join('');
    return `<section class="screen" style="${hueOf(s)}">${head(s, 'Colours', 'Colours: a small palette, and a name for each job.', 'Your palette is the colours themselves. Each job (text, a background, a border, a button) gets a name that points at one of them.')}
      <p class="insight">${insight}</p>
      <div class="shelf"><h4>Your palette, ${col.palette.length} ${col.palette.length === 1 ? 'colour' : 'colours'}</h4><div class="chips">${col.hues.map((h) => `<span class="hue">${h.map((p) => chip(p.value, `${p.name}: ${p.value}`)).join('')}</span>`).join('')}</div>
        ${pairs ? `<h4>Typed by hand most often, beside the palette colour it’s nearest</h4><ol class="pairs">${pairs}</ol>` : ''}</div>
      <p class="why">Ten slightly different greys make an app look tired, and changing your brand colour means finding every copy. Named uses that point at one palette change everywhere at once.</p>
      <h2>How should your colours work?</h2>
      <div role="radiogroup" aria-label="Colours">
        ${col.fixable.length ? choice({ on: state.choice.color === 'point', pick: 'color:point', title: 'Point the copies at the palette', rec: true, mini: col.fixable.slice(0, 6).map((h) => chip(h.value, h.name)).join(''), text: `${col.fixable.length} named ${col.fixable.length === 1 ? 'use copies' : 'uses copy'} a palette colour instead of pointing at it. They’d point at it; nothing looks different today.` }) : ''}
        ${choice({ on: state.choice.color === 'keep', pick: 'color:keep', title: col.fixable.length ? 'Leave them' : 'Keep your palette as it is', text: col.fixable.length ? 'The copies stay copies. Plumber points out new colours typed by hand.' : 'Your palette and its named uses already point the right way. Plumber points out new colours typed by hand.' })}
      </div>
      ${becomes(rule)}
      <details class="more"><summary>Details for designers</summary><div><code>${esc(rule.code)}</code></div></details>
      ${nav('colour')}
    </section>`;
  };

  const welcome = () => {
    const s = SCREENS[0];
    const row = (id, d, unit) => {
      const sc = SCREENS.find((x) => x.id === id), on = (d?.steps ?? []).reduce((n, x) => n + x.uses, 0), hand = (d?.strays ?? []).reduce((n, x) => n + x.places, 0), all = on + hand, r = all ? on / all : 0;
      return `<li class="${all && r < 0.5 ? 'low' : ''}">${toy(sc.toy)}<b>${esc(sc.name)}</b><span class="bar"><i style="width: ${Math.round(r * 100)}%"></i></span><span class="pct">${all ? `${Math.round(r * 100)}%` : '–'}</span><small>${all ? `${nf.format(hand)} ${hand === 1 ? 'place types' : 'places type'} ${unit} by hand` : 'Nothing found'}</small></li>`;
    };
    return `<section class="screen" style="${hueOf(s)}">${head(s, 'Welcome', `Let’s make <span class="name">${app}</span> look like one app.`, `Four short questions about spacing, colours, text and corners. Your answers become <b>your rules</b>, and Plumber holds your code to them from then on.`)}
      <p class="insight">Plumber read all ${nf.format(data.files ?? 0)} files. Here is how much of ${app} <em>already follows its own theme</em>.</p>
      <div class="shelf"><ol class="kinds">${row('spacing', data.spacing, 'a gap or padding')}${row('colour', data.colour, 'a colour')}${row('text', data.size, 'a text size')}${row('corners', data.radius, 'a corner')}</ol></div>
      <h2>How it goes</h2>
      <ol class="steps3"><li><span><b>See it.</b> Each step draws what your app does today.</span></li><li><span><b>Choose.</b> One question, with a good answer already picked.</span></li><li><span><b>Keep it.</b> Plumber points out what breaks a rule, on your page, and fixes it with you. What’s there today is remembered, so you only hear about new problems.</span></li></ol>
      <div class="nav">${button('Start with spacing', { key: '→', attrs: 'data-go="spacing"' })}<span class="later">About two minutes. Nothing in your files changes until the very end.</span></div>
    </section>`;
  };

  const rulesScreen = () => {
    const s = SCREENS[5], done = kinds.filter((id) => state.decided.has(id));
    const code = `export default {\n  decisions: {\n${done.map((id) => { const r = ruleOf(id); return `    ${r.code}${r.skip ? '' : ','}`; }).join('\n')}\n  },\n};`;
    return `<section class="screen" style="${hueOf(s)}">${head(s, 'Your rules', done.length === kinds.length ? 'Your rules are ready.' : done.length ? `${done.length} of ${kinds.length} rules chosen.` : 'No rules chosen yet.', 'What you chose, in one place. It becomes <b>plumber.config</b>, the file Plumber reads every time it checks your app.')}
      <h2>What you chose</h2>
      <ol class="final">${kinds.map((id) => { const sc = SCREENS.find((x) => x.id === id), on = state.decided.has(id);
        return `<li class="${on ? '' : 'todo'}">${toy(sc.toy)}<b>${esc(sc.name)}</b>${on ? '' : `<button type="button" class="tb sm quiet" data-go="${id}"><span class="top"><span class="lb">Choose it</span></span></button>`}<span>${on ? esc(ruleOf(id).plain) : 'Not chosen yet.'}</span></li>`; }).join('')}</ol>
      ${done.length ? `<h2>The file it writes</h2><div class="shelf"><pre class="file">${esc(code)}</pre></div>` : ''}
      <h2>Set it up</h2>
      <ol class="steps3"><li><span><b>Tidies your tokens</b> the way you chose. Old names keep working.</span></li><li><span><b>Writes your rules</b> into plumber.config.</span></li><li><span><b>Remembers what’s in your code today,</b> so from now on you only hear about new problems.</span></li></ol>
      <div class="nav">${post && done.length ? button('Set it up', { attrs: 'data-setup' }) : ''}<span class="later" data-said>${!post ? 'Open this page with npx plumber to set it up from here.' : done.length ? 'One press. You can undo the token changes right after.' : 'Choose at least one rule first.'}</span></div>
    </section>`;
  };

  const draw = () => {
    const sizeFamily = Object.keys(screenOf).find((f) => screenOf[f] === state.at);
    const screen = state.at === 'welcome' ? welcome() : state.at === 'colour' ? colourScreen() : sizeFamily ? sizeScreen(sizes[sizeFamily]) : rulesScreen();
    const whole = ['welcome', 'rules'].includes(state.at);
    root.innerHTML = `<style>${LANGUAGE_CSS}${BUTTON_CSS}${LESSON_CSS}</style>${TOY_DEFS}
      <div class="lesson${whole ? ' whole' : ''}">${where()}<div>${screen}</div>${whole ? '' : rules()}</div>`;
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
