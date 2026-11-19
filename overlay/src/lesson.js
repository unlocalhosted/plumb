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
  :host { display: block; color: var(--pl-text-primary); }
  .lesson { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 20rem); gap: var(--pl-page-space-1); align-items: start; }
  @media (max-width: 960px) { .lesson { grid-template-columns: 1fr; } }
  /* the rules screen shows the rules itself: no second copy beside it */
  .lesson.whole { grid-template-columns: minmax(0, 1fr); }

  /* where you are: a row of toys, the current one lit, the ones to come pale */
  .trail { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: var(--pl-space-4); margin: 0 0 var(--pl-space-4); padding: 0; list-style: none; }
  .trail button { all: unset; display: inline-flex; align-items: center; gap: var(--pl-space-3); padding: var(--pl-space-2) var(--pl-space-5) var(--pl-space-2) var(--pl-space-2); border-radius: var(--pl-radius-card);
    font: var(--pl-card-label); font-family: var(--pl-round); font-size: 13px; color: var(--pl-text-secondary); cursor: pointer; }
  .trail button .toy { width: var(--pl-space-8); height: var(--pl-space-8); }
  .trail button[aria-current="step"] { background: var(--pl-bg-surface); color: var(--pl-text-primary); box-shadow: var(--pl-shadow-tag); }
  .trail button[data-done] .toy { filter: none; }
  .trail button:disabled { cursor: default; opacity: .45; }
  .trail button:disabled .toy { filter: grayscale(1); }
  .trail button:focus-visible { outline: 2px solid var(--pl-instrument); outline-offset: 2px; }
  .toy svg { display: block; width: 100%; height: 100%; overflow: visible; }

  /* a screen: a face in its hue with its toy, then the five parts on paper */
  .screen { border-radius: var(--pl-radius-card); background: var(--pl-bg-surface); box-shadow: var(--pl-shadow-card); overflow: hidden; }
  .face { display: flex; align-items: center; gap: var(--pl-space-6); padding: var(--pl-space-7) var(--pl-space-8); background: var(--hf); color: var(--hi); }
  .face .plate { display: grid; place-items: center; width: var(--pl-page-space-2); height: var(--pl-page-space-2); flex: none; border-radius: var(--pl-radius-card); background: var(--pl-cut); }
  .face .plate .toy { width: var(--pl-page-space-1); height: var(--pl-page-space-1); }
  .face h2 { margin: 0; font: var(--pl-page-title); font-family: var(--pl-round); font-size: 26px; line-height: 30px; }
  .face p { margin: var(--pl-space-2) 0 0; font: var(--pl-page-body); max-width: 52ch; }
  .body { display: grid; gap: var(--pl-page-space-1); padding: var(--pl-space-8); }
  .part h3 { margin: 0 0 var(--pl-space-3); font: var(--pl-card-label); text-transform: uppercase; letter-spacing: var(--pl-tracking-caps); color: var(--pl-text-secondary); }
  .part > p { margin: 0; max-width: 60ch; font: var(--pl-page-body); }
  .notice { display: grid; gap: var(--pl-space-3); margin-top: var(--pl-space-6); padding: var(--pl-space-6); border-radius: var(--pl-radius-card); background: var(--pl-butter-soft); color: var(--pl-butter-ink); font: var(--pl-page-small); max-width: 62ch; }
  .notice b { font-weight: 700; }

  /* one choice, shown as what you get */
  .choices { display: grid; grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr)); gap: var(--pl-space-6); }
  .choice { all: unset; display: grid; gap: var(--pl-space-4); align-content: start; padding: var(--pl-space-6); border-radius: var(--pl-radius-card); background: var(--pl-bg-inset); cursor: pointer;
    box-shadow: inset 0 0 0 2px transparent; transition: box-shadow var(--pl-dur-feedback) var(--pl-ease-out), background var(--pl-dur-feedback) var(--pl-ease-out); }
  .choice:hover { background: var(--pl-bg-surface-hover); }
  .choice[aria-checked="true"] { background: color-mix(in oklab, var(--pl-mint) 12%, var(--pl-bg-surface)); box-shadow: inset 0 0 0 2px var(--pl-mint); }
  .choice:focus-visible { outline: 2px solid var(--pl-instrument); outline-offset: 2px; }
  .choice b { font: var(--pl-card-title); font-size: 16px; }
  .choice b .rec { margin-left: var(--pl-space-3); padding: 2px var(--pl-space-3); border-radius: var(--pl-radius-tag); background: var(--pl-mint); color: var(--pl-mint-on); font: var(--pl-card-label); }
  .choice span { font: var(--pl-card-body); color: var(--pl-text-secondary); }
  .steps { display: flex; align-items: flex-end; gap: var(--pl-space-3); min-height: var(--pl-page-space-4); padding-top: var(--pl-space-4); }
  .steps i { display: block; width: var(--pl-space-6); border-radius: var(--pl-radius-mark) var(--pl-radius-mark) 0 0; background: var(--pl-mint); }
  .steps.many i { background: color-mix(in oklab, var(--pl-mint) 55%, var(--pl-butter)); }
  .steps i.twice { background: var(--pl-butter); }

  .steps.aa { align-items: baseline; gap: var(--pl-space-4); flex-wrap: wrap; }
  .steps.aa span { font-family: var(--pl-sans); font-weight: 600; line-height: 1; color: var(--pl-sky); }
  .steps.aa span.twice { color: var(--pl-butter-line); }
  .steps.arcs { align-items: flex-end; gap: var(--pl-space-4); }
  .steps.arcs i { width: var(--pl-space-8); height: var(--pl-space-8); background: none; border-top: var(--pl-space-1) solid var(--pl-pink); border-left: var(--pl-space-1) solid var(--pl-pink); border-radius: 0; box-sizing: border-box; }
  .steps.arcs i.twice { border-color: var(--pl-butter-line); }
  /* colours: the palette as chips by hue, and colours typed by hand beside the palette colour they're closest to */
  .palette { display: grid; gap: var(--pl-space-3); padding: var(--pl-space-6); border-radius: var(--pl-radius-card); background: var(--pl-bg-inset); }
  .palette .hue { display: flex; flex-wrap: wrap; gap: var(--pl-space-2); }
  .chip { width: var(--pl-space-8); height: var(--pl-space-8); border-radius: var(--pl-radius-row); box-shadow: inset 0 0 0 var(--pl-line) color-mix(in oklab, var(--pl-text-primary) 12%, transparent); }
  .typed { display: grid; gap: var(--pl-space-3); margin-top: var(--pl-space-6); }
  .typed .t { display: grid; grid-template-columns: var(--pl-space-8) minmax(0, 9rem) var(--pl-space-6) var(--pl-space-8) minmax(0, 1fr); align-items: center; gap: var(--pl-space-4); font: var(--pl-card-body); }
  .typed .t code { font: var(--pl-card-code); color: var(--pl-text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .typed .t span { color: var(--pl-text-secondary); }

  /* the rule it becomes */
  .rule { display: grid; gap: var(--pl-space-3); padding: var(--pl-space-6); border-radius: var(--pl-radius-card); background: var(--pl-lilac-soft); color: var(--pl-lilac-ink); }
  .rule p { margin: 0; font: var(--pl-page-small); font-weight: 600; }
  .rule code { font: var(--pl-card-code); opacity: .85; white-space: pre-wrap; }
  .nav { display: flex; align-items: center; gap: var(--pl-space-5); }
  .nav .later { font: var(--pl-card-meta); color: var(--pl-text-secondary); }
  details.more summary { cursor: pointer; font: var(--pl-card-meta); color: var(--pl-text-secondary); }
  details.more p { font: var(--pl-card-body); color: var(--pl-text-secondary); }

  /* your rules, filling in beside the lesson */
  .rules { position: sticky; top: var(--pl-page-space-2); display: grid; gap: var(--pl-space-5); padding: var(--pl-space-7); border-radius: var(--pl-radius-card); background: var(--pl-bg-inset); }
  .rules h3 { margin: 0; display: flex; align-items: center; gap: var(--pl-space-4); font: var(--pl-card-title); font-family: var(--pl-round); font-size: 17px; }
  .rules h3 .toy { width: var(--pl-space-7); height: var(--pl-space-7); }
  .rules > p { margin: 0; font: var(--pl-card-body); color: var(--pl-text-secondary); }
  .rules ol { display: grid; gap: var(--pl-space-4); margin: 0; padding: 0; list-style: none; }
  .rules li { display: grid; gap: var(--pl-space-1); padding: var(--pl-space-4) var(--pl-space-5); border-radius: var(--pl-radius-row); background: var(--pl-bg-surface); font: var(--pl-card-body); }
  .rules li b { font: var(--pl-card-title); }
  .rules li.empty { background: none; box-shadow: inset 0 0 0 1px var(--pl-border-default); color: var(--pl-text-secondary); }
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

  const trail = () => `<ol class="trail" aria-label="The lesson">${SCREENS.map((s) => `<li><button type="button" data-go="${s.id}"${s.id === state.at ? ' aria-current="step"' : ''}${state.decided.has(s.id) ? ' data-done' : ''}><i class="toy">${toyOf(s.toy)}</i>${esc(s.name)}</button></li>`).join('')}</ol>`;
  const face = (s, title, line) => `<div class="face" style="--hf: var(${HUES[s.hue][0]}); --hi: var(${HUES[s.hue][1]})"><span class="plate"><i class="toy">${toyOf(s.toy)}</i></span><div><h2>${title}</h2>${line ? `<p>${line}</p>` : ''}</div></div>`;
  const nav = (id) => { const n = nextOf(id); return `<div class="nav">${button(n.id === 'rules' ? 'Add this rule and finish' : `Add this rule, then ${n.name.toLowerCase()}`, { key: '→', attrs: `data-next="${id}"` })}<span class="later">You can come back and change it.</span></div>`; };

  // a size kind's rule, in plain words and as the line it writes
  const sizeRule = (m) => {
    const key = m.family === 'type' ? 'type' : m.family;
    if (state.choice[m.family] === 'tidy' && m.one) { const from = [`css:${m.one.lane.file}#${m.one.stem}*`]; return { plain: `Every ${m.spec.noun} uses one of these ${m.one.steps.length}. Anything else, Plumber points out.`, key, from, code: `${key}: { from: ['${from[0]}'] }` }; }
    // no list of its own, on Tailwind's spacing steps: the rule names the base, as plumber init does
    const numeric = m.family === 'spacing' && !m.lanes.length ? data.spacing?.numeric : null;
    if (numeric) { const from = [numeric.file ? `css:${numeric.file}#--spacing` : 'theme:--spacing'];
      return { plain: `Gaps and paddings use Tailwind's spacing steps, each a multiple of ${nf.format(numeric.px)}px (p-1, p-2, p-4…). Anything else, Plumber points out.`, key, from, code: `${key}: { from: ['${from[0]}'] }` }; }
    const from = m.lanes.length ? m.lanes.map((l) => `css:${l.file}#${l.name}`) : [...new Set((m.kind?.groups ?? []).map((g) => `css:${g.file}`))];
    return { plain: `${m.spec.nouns[0].toUpperCase()}${m.spec.nouns.slice(1)} use the ones you already have. Anything else, Plumber points out.`, key, from, code: `${key}: { from: [${from.map((f) => `'${f}'`).join(', ')}] }` };
  };
  const colourRule = () => ({ plain: `Colours come from your palette of ${col.palette.length} and the ${col.roles.length} named uses built on it${state.choice.color === 'point' && col.fixable.length ? `, with ${col.fixable.length} copies pointed back at it` : ''}. A colour typed by hand, Plumber points out.`,
    key: 'color', from: col.files.map((f) => `css:${f}`), code: `color: { from: [${col.files.map((f) => `'css:${f}'`).join(', ')}] }` });
  const ruleOf = (id) => id === 'colour' ? colourRule() : sizeRule(sizes[Object.keys(screenOf).find((f) => screenOf[f] === id)]);

  const rules = () => {
    const done = ORDER.filter((id) => !['welcome', 'rules'].includes(id) && state.decided.has(id));
    return `<aside class="rules" aria-live="polite"><h3><i class="toy">${toyOf('card')}</i>Your rules</h3>
      <p>Each answer adds a rule. Plumber keeps your code to them from now on: it points out what breaks one, and fixes it with you.</p>
      <ol>${done.map((id) => { const l = ruleOf(id), name = SCREENS.find((s) => s.id === id).name; return `<li class="${id === state.fresh ? 'fresh' : ''}"><b>${esc(name)}</b>${esc(l.plain)}<code>${esc(l.code)}</code></li>`; }).join('')}
        ${SCREENS.filter((s) => !['welcome', 'rules'].includes(s.id) && !state.decided.has(s.id)).map((s) => `<li class="empty"><b>${esc(s.name)}</b>Not decided yet.</li>`).join('')}</ol></aside>`;
  };

  const welcome = () => {
    const s = SCREENS[0];
    return `<section class="screen">${face(s, `Let's set up how ${esc(data.project ?? 'your app')} looks, on purpose.`, `Plumber read your app (${nf.format(data.files ?? 0)} files). In a few short steps you'll decide its spacing, colours, text and corners.`)}
      <div class="body">
        <div class="part"><h3>What happens</h3><p>Each step shows you what your app does today, drawn, and asks one question. Your answer becomes one of <b>your rules</b>. They fill in on the right as you go.</p></div>
        <div class="nav">${button('Start with spacing', { key: '→', attrs: 'data-go="spacing"' })}<span class="later">About two minutes. Nothing changes in your files until the last step.</span></div>
        <div class="part"><h3>Why</h3><p>When every screen picks its own gap, colour and size, an app looks a little off everywhere and nobody can say why. A few rules, chosen once, keep it looking like one app as it grows, whoever writes the code.</p></div>
        <div class="part"><h3>After</h3><p>Plumber holds your code to your rules. It shows what breaks one, right on your page, and fixes it with you. What's already there is remembered as it is, so you only hear about new problems.</p></div>
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
    return `<section class="screen">${face(s, m.spec.title, m.spec.line)}
      <div class="body">
        <div class="part"><h3>Yours, drawn</h3><div id="gravity"></div>${notice.length ? `<div class="notice">${notice.map((n) => `<span>${n}</span>`).join('')}</div>` : ''}</div>
        <div class="part"><h3>Why it matters</h3><p>${m.spec.why}</p></div>
        <div class="part"><h3>Your choice</h3><div class="choices" role="radiogroup" aria-label="${esc(s.name)}">
          ${m.needed ? `<button type="button" class="choice" role="radio" aria-checked="${state.choice[m.family] === 'tidy'}" data-pick="${m.family}:tidy"><b>One list of ${m.one.steps.length}<span class="rec">Suggested</span></b>${preview(m.family, m.one.steps.map((x) => x.px))}<span>Your lists merged into one, with Tailwind's name. The old names keep working, pointing at the new ones.</span></button>` : ''}
          <button type="button" class="choice" role="radio" aria-checked="${state.choice[m.family] === 'keep'}" data-pick="${m.family}:keep"><b>Keep what you have</b>${preview(m.family, keepVals, m.twice)}<span>${m.lanes.length > 1 ? `All ${m.lanes.length} lists stay as they are. You can tidy them later.` : `Your ${m.spec.nouns} stay as they are.`}</span></button>
        </div></div>
        <div class="part"><h3>The rule it becomes</h3><div class="rule"><p>${esc(rule.plain)}</p><code>${esc(rule.code)}</code></div>
          <details class="more"><summary>Details for designers</summary><p>${m.lanes.map((l) => `${esc(l.name)} in ${esc(l.file)}: ${l.values.join(', ')}px`).join('<br>') || 'No lists of steps; single tokens only.'}${m.one ? `<br>Merged: ${m.one.steps.map((x) => `${esc(x.name)} ${esc(x.value)}`).join(', ')}` : ''}</p></details></div>
        ${nav(s.id)}
      </div></section>`;
  };

  const colourScreen = () => {
    const s = SCREENS[2], rule = colourRule();
    const chip = (v, title) => `<i class="chip" style="background: ${esc(v)}" title="${esc(title)}"></i>`;
    return `<section class="screen">${face(s, 'Colours: a small palette, and a name for each job.', 'Your palette is the colours themselves. Each job (text, a background, a border, a button) gets a name that points at one of them.')}
      <div class="body">
        <div class="part"><h3>Yours, drawn</h3><div class="palette">${col.hues.slice(0, 12).map((h) => `<div class="hue">${h.map((p) => chip(p.value, `${p.name}: ${p.value}`)).join('')}</div>`).join('')}${col.hues.length > 12 ? `<span class="later">and ${col.hues.length - 12} more</span>` : ''}</div>
          ${col.typed.length ? `<div class="typed">${col.typed.slice(0, 6).map((t) => { const near = col.palette.find((p) => p.name.slice(2) === t.near) ?? col.roles.find((p) => p.name.slice(2) === t.near); return `<div class="t">${chip(t.css, t.css)}<code>${esc(t.written[0]?.text ?? t.css)}</code><span>→</span>${near ? chip(near.value, near.name) : '<i></i>'}<span>${nf.format(t.places)} ${t.places === 1 ? 'place' : 'places'}${near ? `; your ${esc(near.name)}${t.distance === 0 ? ' exactly' : ' is close'}` : ''}</span></div>`; }).join('')}</div>` : ''}
          <div class="notice"><span><b>${col.palette.length} colours in your palette, ${col.roles.length} named uses built on them.</b>${col.byHand ? ` ${nf.format(col.byHand)} ${col.byHand === 1 ? 'place types' : 'places type'} a colour by hand instead; the most common are above, each beside the palette colour it's closest to.` : ''}</span>${col.fixable.length ? `<span><b>${col.fixable.length} named ${col.fixable.length === 1 ? 'use copies' : 'uses copy'} a palette colour</b> instead of pointing at it, so ${col.fixable.length === 1 ? 'it won’t follow' : 'they won’t follow'} if the palette changes.</span>` : ''}</div></div>
        <div class="part"><h3>Why it matters</h3><p>Ten slightly different greys make an app look tired, and changing your brand colour means finding every copy. Named uses that point at one palette change everywhere at once, and let dark mode swap the palette underneath.</p></div>
        <div class="part"><h3>Your choice</h3><div class="choices" role="radiogroup" aria-label="Colours">
          ${col.fixable.length ? `<button type="button" class="choice" role="radio" aria-checked="${state.choice.color === 'point'}" data-pick="color:point"><b>Point the copies at the palette<span class="rec">Suggested</span></b><div class="steps">${col.fixable.slice(0, 8).map((h) => chip(h.value, `${h.name} → ${h.match.name}`)).join('')}</div><span>${col.fixable.length} named ${col.fixable.length === 1 ? 'use stops' : 'uses stop'} copying and ${col.fixable.length === 1 ? 'points' : 'point'} at the palette. Nothing looks different today.</span></button>` : ''}
          <button type="button" class="choice" role="radio" aria-checked="${state.choice.color === 'keep'}" data-pick="color:keep"><b>${col.fixable.length ? 'Leave them' : 'Keep your palette as it is'}</b><span>${col.fixable.length ? 'The copies stay copies.' : 'Your palette and its named uses already point the right way.'}</span></button>
        </div></div>
        <div class="part"><h3>The rule it becomes</h3><div class="rule"><p>${esc(rule.plain)}</p><code>${esc(rule.code)}</code></div></div>
        ${nav('colour')}
      </div></section>`;
  };

  const rulesScreen = () => {
    const s = SCREENS[5], done = ORDER.filter((id) => !['welcome', 'rules'].includes(id) && state.decided.has(id));
    const code = `export default {\n  decisions: {\n${done.map((id) => `    ${ruleOf(id).code},`).join('\n')}\n  },\n};`;
    return `<section class="screen">${face(s, 'Your rules', 'What you chose, in one place. This becomes plumber.config, the file Plumber reads every time it checks your app.')}
      <div class="body"><div class="part"><h3>${done.length ? `${done.length} of 4 decided` : 'Nothing decided yet'}</h3>${done.length ? `<div class="rule">${done.map((id) => `<p>${esc(ruleOf(id).plain)}</p>`).join('')}<code>${esc(code)}</code></div>` : '<p>Start with spacing.</p>'}</div>
        <div class="part"><h3>Set it up</h3><p>One press does three things: tidies your tokens as you chose (old names keep working), writes these rules into plumber.config, and remembers what's already in your code, so from now on you only hear about new problems.</p>
          <div class="nav">${post && done.length ? button('Set it up', { attrs: 'data-setup' }) : ''}<span class="later" data-said>${!post ? 'Open this page with npx plumber to set it up from here.' : done.length ? 'You can undo the token changes right after.' : ''}</span></div></div></div></section>`;
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
      const decisions = Object.fromEntries(ORDER.filter((id) => !['welcome', 'rules'].includes(id) && state.decided.has(id)).map((id) => { const r = ruleOf(id); return [r.key, { from: r.from }]; }));
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
