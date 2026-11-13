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
 *  built     Spacing first, as the model the others follow; Colours, Text and Corners show as next
 * ───────────────────────────────────────────────────────── */
import { LANGUAGE_CSS } from './language.js';
import { SCALE_CSS } from './scale-marks.js';
import { GRAVITY_CSS, Gravity } from './gravity.js';
import { TOY_DEFS, toyOf } from './toys.js';
import { BUTTON_CSS, button } from './kit.js';
import { decisionsOf, lanesOf, systemOf } from './system-review.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const nf = new Intl.NumberFormat('en');

const SCREENS = [
  { id: 'welcome', toy: 'tooltip', hue: 'butter', name: 'Welcome' },
  { id: 'spacing', toy: 'padding', hue: 'mint', name: 'Spacing' },
  { id: 'colour', toy: 'fill', hue: 'pink', name: 'Colours', soon: true },
  { id: 'text', toy: 'type', hue: 'sky', name: 'Text', soon: true },
  { id: 'corners', toy: 'corner', hue: 'pink', name: 'Corners', soon: true },
  { id: 'rules', toy: 'card', hue: 'lilac', name: 'Your rules' },
];

const LESSON_CSS = `
  :host { display: block; color: var(--pl-text-primary); }
  .lesson { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 20rem); gap: var(--pl-page-space-1); align-items: start; }
  @media (max-width: 960px) { .lesson { grid-template-columns: 1fr; } }

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

/** The spacing screen's model: what the reader is shown and the two answers, from the reading and the review's model. */
function spacingModel(data) {
  const kind = (data.reading ?? []).find((k) => k.family === 'spacing');
  const lanes = kind ? lanesOf(kind).filter((l) => l.values.length > 1) : [];
  const decisions = kind ? decisionsOf(kind) : [];
  const has = (id) => decisions.some((d) => d.id === id);
  const biggest = [...lanes].sort((a, b) => b.tokens.length - a.tokens.length)[0];
  const tidy = { ...(has('keep:spacing') && biggest ? { 'keep:spacing': biggest.name } : {}), ...(has('base:spacing') ? { 'base:spacing': 'round' } : {}),
    ...(has('name:spacing') ? { 'name:spacing': '--spacing-' } : {}), ...(has('count:spacing') ? { 'count:spacing': 'size' } : {}) };
  const tidied = kind ? systemOf(kind, tidy) : null, one = tidied?.scales.length === 1 ? tidied.scales[0] : null;
  const values = [...new Set(lanes.flatMap((l) => l.values))].sort((a, b) => a - b);
  const twice = values.filter((v) => lanes.filter((l) => l.values.includes(v)).length > 1);
  const byHand = (data.spacing?.strays ?? []).reduce((n, s) => n + s.places, 0);
  return { kind, lanes, values, twice, byHand, tidy, one, needed: Object.keys(tidy).length > 0 };
}

/**
 * The lesson, drawn into `host` (its own shadow root; tokens inherit). `data` is the page data (src/project-page/
 * system.ts); `post` writes, when the page may.
 */
export function mountLesson(host, data, { post } = {}) {
  const root = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
  const sp = spacingModel(data);
  const state = { at: 'welcome', spacing: sp.needed ? 'tidy' : 'keep', decided: new Set(), fresh: '' };

  const trail = () => `<ol class="trail" aria-label="The lesson">${SCREENS.map((s) => `<li><button type="button" data-go="${s.id}"${s.id === state.at ? ' aria-current="step"' : ''}${state.decided.has(s.id) ? ' data-done' : ''}${s.soon ? ' disabled title="Next, after spacing"' : ''}><i class="toy">${toyOf(s.toy)}</i>${esc(s.name)}</button></li>`).join('')}</ol>`;
  const face = (s, title, line) => `<div class="face" style="--hf: var(${HUES[s.hue][0]}); --hi: var(${HUES[s.hue][1]})"><span class="plate"><i class="toy">${toyOf(s.toy)}</i></span><div><h2>${title}</h2>${line ? `<p>${line}</p>` : ''}</div></div>`;

  // the spacing rule, in plain words and as the line it writes
  const spacingRule = () => {
    if (state.spacing === 'tidy' && sp.one) {
      const file = sp.one.lane.file;
      return { plain: `Every gap and padding uses one of these ${sp.one.steps.length} steps. Anything else, Plumber points out.`, code: `spacing: { from: ['css:${file}#${sp.one.stem}*'] }` };
    }
    return { plain: `Gaps and paddings use the spacing you already have (${sp.lanes.length} ${sp.lanes.length === 1 ? 'list' : 'lists'}). Anything else, Plumber points out.`, code: `spacing: { from: [${sp.lanes.map((l) => `'css:${l.file}#${l.name}'`).join(', ')}] }` };
  };

  const rules = () => {
    const lines = [];
    if (state.decided.has('spacing')) lines.push({ id: 'spacing', title: 'Spacing', ...spacingRule() });
    return `<aside class="rules" aria-live="polite"><h3><i class="toy">${toyOf('card')}</i>Your rules</h3>
      <p>Each answer adds a rule. Plumber keeps your code to them from now on: it points out what breaks one, and fixes it with you.</p>
      <ol>${lines.map((l) => `<li class="${l.id === state.fresh ? 'fresh' : ''}"><b>${esc(l.title)}</b>${esc(l.plain)}<code>${esc(l.code)}</code></li>`).join('')}
        ${SCREENS.filter((s) => !['welcome', 'rules'].includes(s.id) && !state.decided.has(s.id)).map((s) => `<li class="empty"><b>${esc(s.name)}</b>Not decided yet.</li>`).join('')}</ol></aside>`;
  };

  const welcome = () => {
    const s = SCREENS[0];
    return `<section class="screen">${face(s, `Let's set up how ${esc(data.project ?? 'your app')} looks, on purpose.`, `Plumber read your app (${nf.format(data.files ?? 0)} files). In a few short steps you'll decide its spacing, colours, text and corners.`)}
      <div class="body">
        <div class="part"><h3>What happens</h3><p>Each step shows you what your app does today, drawn, and asks one question. Your answer becomes one of <b>your rules</b>. They fill in on the right as you go.</p></div>
        <div class="part"><h3>Why</h3><p>When every screen picks its own gap, colour and size, an app looks a little off everywhere and nobody can say why. A few rules, chosen once, keep it looking like one app as it grows, whoever writes the code.</p></div>
        <div class="part"><h3>After</h3><p>Plumber holds your code to your rules. It shows what breaks one, right on your page, and fixes it with you. What's already there is remembered as it is, so you only hear about new problems.</p></div>
        <div class="nav">${button('Start with spacing', { key: '→', attrs: 'data-go="spacing"' })}<span class="later">About two minutes. Nothing changes in your files until the last step.</span></div>
      </div></section>`;
  };

  const spacing = () => {
    const s = SCREENS[1], rule = spacingRule();
    const bars = (vals, cls = '', mark = []) => `<div class="steps ${cls}">${vals.slice(0, 16).map((v) => `<i class="${mark.includes(v) ? 'twice' : ''}" style="height: ${Math.max(4, Math.min(v, 96)) * 0.75}px" title="${v}px"></i>`).join('')}</div>`;
    const notice = [];
    if (sp.lanes.length > 1) notice.push(`<b>You have ${sp.lanes.length} separate lists of spacing, and they repeat each other.</b> ${sp.twice.length ? `${sp.twice.join(', ')} each appear in two lists under different names (yellow below).` : ''}`);
    if (sp.byHand) notice.push(`<b>${nf.format(sp.byHand)} ${sp.byHand === 1 ? 'place types' : 'places type'} a gap or padding by hand</b> instead of using any of them: the dots above.`);
    return `<section class="screen">${face(s, 'Spacing is the room between things.', 'Inside a card, between a row of buttons, around a section. Same room, same feel.')}
      <div class="body">
        <div class="part"><h3>Yours, drawn</h3><div id="gravity"></div>${notice.length ? `<div class="notice">${notice.map((n) => `<span>${n}</span>`).join('')}</div>` : ''}</div>
        <div class="part"><h3>Why it matters</h3><p>When every gap is a little different, screens feel uneven, and changing how roomy your app feels means hunting through every file. One short list of steps, used everywhere, fixes both.</p></div>
        <div class="part"><h3>Your choice</h3><div class="choices" role="radiogroup" aria-label="Spacing">
          ${sp.needed && sp.one ? `<button type="button" class="choice" role="radio" aria-checked="${state.spacing === 'tidy'}" data-pick="tidy"><b>One list of ${sp.one.steps.length} steps<span class="rec">Suggested</span></b>${bars(sp.one.steps.map((x) => x.px))}<span>Your lists merged into one, each step 4px apart or a multiple of it. The old names keep working, pointing at the new steps.</span></button>` : ''}
          <button type="button" class="choice" role="radio" aria-checked="${state.spacing === 'keep'}" data-pick="keep"><b>Keep what you have</b>${bars(sp.values, sp.lanes.length > 1 ? 'many' : '', sp.twice)}<span>${sp.lanes.length > 1 ? `All ${sp.lanes.length} lists stay as they are. You can tidy them later.` : 'Your spacing stays as it is.'}</span></button>
        </div></div>
        <div class="part"><h3>The rule it becomes</h3><div class="rule"><p>${esc(rule.plain)}</p><code>${esc(rule.code)}</code></div>
          <details class="more"><summary>Details for designers</summary><p>${sp.lanes.map((l) => `${esc(l.name)} in ${esc(l.file)}: ${l.values.join(', ')}px`).join('<br>')}${sp.one ? `<br>Merged: ${sp.one.steps.map((x) => `${esc(x.name)} ${esc(x.value)}`).join(', ')}` : ''}</p></details></div>
        <div class="nav">${button('Add this rule', { key: '→', attrs: 'data-next="spacing"' })}<span class="later">Colours, text and corners are the next screens to be built; this one is the model for them.</span></div>
      </div></section>`;
  };

  const rulesScreen = () => {
    const s = SCREENS[5], rule = state.decided.has('spacing') ? spacingRule() : null;
    return `<section class="screen">${face(s, 'Your rules', 'What you chose, in one place. This becomes plumber.config, the file Plumber reads every time it checks your app.')}
      <div class="body"><div class="part"><h3>So far</h3>${rule ? `<div class="rule"><p>${esc(rule.plain)}</p><code>${esc(`export default {\n  decisions: {\n    ${rule.code},\n  },\n};`)}</code></div>` : '<p>Nothing decided yet. Start with spacing.</p>'}</div>
        <div class="part"><h3>Setting it up</h3><p>Writing your rules and remembering what's already there is the step that comes after colours, text and corners. Until then, nothing in your files changes.</p></div></div></section>`;
  };

  const draw = () => {
    const screen = state.at === 'welcome' ? welcome() : state.at === 'spacing' ? spacing() : rulesScreen();
    root.innerHTML = `<style>${LANGUAGE_CSS}${SCALE_CSS}${GRAVITY_CSS}${BUTTON_CSS}${LESSON_CSS}</style>${TOY_DEFS}
      <div class="lesson">${trail()}<div>${screen}</div>${rules()}</div>`;
    const g = root.getElementById('gravity');
    // for this reader a step is its size, once: three names for 16px are one step here (the names are in Details)
    const bySize = new Map();
    for (const st of data.spacing?.steps ?? []) { const k = `${st.px}px`, had = bySize.get(k); bySize.set(k, { name: k, px: st.px, uses: (had?.uses ?? 0) + st.uses }); }
    const named = (data.spacing?.steps ?? []).reduce((m, st) => m.set(st.name, `${st.px}px`), new Map());
    const strays = (data.spacing?.strays ?? []).map((st) => ({ ...st, near: named.get(st.near) ?? st.near }));
    if (g) new Gravity(g, { steps: [...bySize.values()], strays, words: { sizes: 'spacing steps', title: 'Where your gaps and paddings land', empty: 'Add spacing to your theme, and this fills in.' } });
    state.fresh = '';
  };

  root.addEventListener('click', (e) => {
    const go = e.target.closest('[data-go]'), pick = e.target.closest('[data-pick]'), next = e.target.closest('[data-next]');
    if (pick) { state.spacing = pick.dataset.pick; draw(); return; }
    if (next) { state.decided.add(next.dataset.next); state.fresh = next.dataset.next; state.at = 'rules'; draw(); return; }
    if (go && !go.disabled) { state.at = go.dataset.go; draw(); }
  });
  draw();
  void post;
}
