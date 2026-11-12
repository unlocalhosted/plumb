/* ─────────────────────────────────────────────────────────
 * SPECIMEN · React Plumber (docs/design/onboarding.md, "The page": the detail under Gravity)
 *
 * Gravity shows the shape of your type; the specimen shows the detail. Every size of your theme, largest first, set
 * at that size, and under each the sizes typed by hand that should become it, set at theirs, so you see how close
 * 15px is to 16px before you read a number. Built from the overlay's own pieces: names are lilac words, places are
 * scale-marks.js marks (a coral square, a butter ring), the use bars follow the chart rules (tokens.css
 * --pl-chart-bar, mint, values in ink). Text never takes a data colour.
 *
 *  step       a size of your theme: its name and value, the sample at its size, a mint bar of the places that use it;
 *             places that type its exact value by hand show beside the name as a butter ring and a count
 *  unused     a size nobody uses: the sample and name in ink-3, an ink-3 outline where the bar would be
 *  stray      a size typed by hand, three places or more: its value, the sample at its size, a coral square and count
 *  few        the rest of a step's hand-typed sizes, one line: their values and how many places in all
 *  point      a stray (pointer or keyboard focus): its sample snaps to the step's size on the spring, the line says
 *             how it's written and the step it becomes, and that step lights in sky; pointing a step lights its
 *             strays the same way
 *  arrival    the rows fade up once, the first time the specimen is on screen, --pl-stagger apart within 400ms
 *  narrow     below 720px the value and count sit on one line above the sample
 *  reduced    no fade, no snap motion: a pointed stray shows its new size at once
 *  keys       the hand-typed sizes are one Tab stop: ↑ ↓ move between them, Home and End go to the ends
 *  reader     each row is a list item that reads as a sentence; the marks are hidden from it
 *  empty      no sizes in the theme: nothing is drawn (the headline says so)
 * ───────────────────────────────────────────────────────── */
import { esc } from './choices.js';
import { place } from './scale-marks.js';
import { stagger } from './motion.js';

const nf = new Intl.NumberFormat('en');
const plural = (n, one, many) => `${nf.format(n)} ${n === 1 ? one : many}`;
const fmt = (px) => `${+(+px).toFixed(2)}px`;
const SAMPLE = 'Your text at this size';
const ROW_MIN = 3;   // a hand-typed size with fewer places folds into its step's one-line summary

export const SPECIMEN_CSS = `
  .sp { padding: 0 0 var(--pl-space-4); }
  .sp-head { padding: var(--pl-page-inset) var(--pl-page-inset) var(--pl-space-6); }
  .sp-head h2 { margin: 0; font: var(--pl-page-title); letter-spacing: var(--pl-tracking-title); }
  .sp-head p { margin: 2px 0 0; max-width: 60ch; font: var(--pl-page-small); color: var(--pl-text-secondary); }
  .sp ol { margin: 0; padding: 0; list-style: none; }
  .sp-row { display: grid; grid-template-columns: 176px minmax(0, 1fr) 168px; align-items: center; gap: var(--pl-space-8);
    padding: var(--pl-space-4) var(--pl-page-inset); outline: none; transition: background-color 160ms var(--pl-ease-out), box-shadow 160ms var(--pl-ease-out); }
  .sp-row.step { padding-block: var(--pl-space-6); box-shadow: inset 0 var(--pl-line) 0 var(--pl-border-default); }
  .sp-meta { display: flex; flex-wrap: wrap; align-items: baseline; gap: 2px 8px; min-width: 0; }
  .sp-meta .name { font: 600 13px/20px var(--pl-sans); color: var(--pl-lilac); }
  .sp-meta .px { font: var(--pl-card-code); color: var(--pl-text-secondary); font-variant-numeric: tabular-nums; }
  .sp-meta .copies { display: inline-flex; align-items: center; gap: 6px; flex-basis: 100%; font: var(--pl-page-meta); color: var(--pl-text-secondary); }
  .sp-sample { position: relative; min-width: 0; overflow: hidden; white-space: nowrap; color: var(--pl-text-primary); font-family: var(--pl-sans); font-weight: 400; line-height: 1.2;
    mask-image: linear-gradient(90deg, #000 calc(100% - 32px), transparent); }
  .sp-sample span { display: inline-block; transform-origin: 0 75%; transition: scale var(--pl-dur-travel) var(--pl-spring); }
  .sp-use { display: flex; align-items: center; justify-content: flex-end; gap: 8px; font: var(--pl-page-small); color: var(--pl-text-primary); font-variant-numeric: tabular-nums; white-space: nowrap; }
  .sp-use .bar { width: 96px; height: var(--pl-chart-bar); }
  .sp-use .bar i { display: block; height: 100%; background: var(--pl-mint); border-radius: 0 var(--pl-radius-mark) var(--pl-radius-mark) 0; }
  .sp-row.unused .bar { box-sizing: border-box; border: var(--pl-line) dashed var(--pl-icon-tick); border-radius: var(--pl-radius-mark); }
  .sp-row.unused .sp-sample, .sp-row.unused .name { color: var(--pl-text-secondary); }
  .sp-row.unused .sp-use { color: var(--pl-text-secondary); }
  .sp-use .sc-place { scale: 1.34; }
  .sp-row.stray .to { font: var(--pl-card-code); color: var(--pl-text-primary); opacity: 0; translate: -4px 0; transition: opacity 160ms var(--pl-ease-out), translate 160ms var(--pl-ease-out); }
  .sp-row.stray .how { flex-basis: 100%; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font: var(--pl-card-code); color: var(--pl-text-secondary); }
  .sp-row.few { padding-block: 2px var(--pl-space-5); }
  .sp-row.few .sp-sample { grid-column: 2 / -1; white-space: normal; mask-image: none; font: var(--pl-page-small); color: var(--pl-text-secondary); }
  .sp-row.few code { font: var(--pl-card-code); color: var(--pl-text-primary); }

  /* pointed: the stray snaps to its step's size and says how it's written; the step it becomes lights in sky */
  .sp-row.stray:is(:hover, :focus-visible), .sp-row.lit { background: color-mix(in oklab, var(--pl-sky) 7%, transparent); box-shadow: inset 2px 0 0 var(--pl-sky); }
  .sp-row.stray:is(:hover, :focus-visible) .sp-sample span { scale: var(--snap); }
  .sp-row.stray:is(:hover, :focus-visible) .to { opacity: 1; translate: 0 0; }

  .sp .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
  .sp-wait .sp-row { opacity: 0; }
  .sp-built .sp-row { animation: sp-in var(--pl-dur-build) var(--pl-ease-out) both; animation-delay: var(--at); }
  @keyframes sp-in { from { opacity: 0; translate: 0 4px; } }

  @media (max-width: 720px) {
    .sp-row { grid-template-columns: minmax(0, 1fr) auto; gap: 4px var(--pl-space-5); padding-inline: var(--pl-space-6); }
    .sp-head { padding: var(--pl-space-6) var(--pl-space-6) var(--pl-space-5); }
    .sp-sample { grid-column: 1 / -1; grid-row: 2; }
    .sp-row.few .sp-sample { grid-row: auto; grid-column: 1 / -1; }
    .sp-use .bar { width: 56px; }
  }
  @media (prefers-reduced-motion: reduce) { .sp-sample span, .sp-row.stray .to { transition: none; } .sp-built .sp-row { animation: none; } }
`;

export class Specimen {
  /**
   * @param el      where to draw (inside a shadow root that carries tokens.css, LANGUAGE_CSS, SCALE_CSS, SPECIMEN_CSS)
   * @param steps   your scale: [{ name, px, uses }]
   * @param strays  sizes typed by hand: [{ px, places, near, copy, written: [{ text, n }] }]
   */
  constructor(el, { steps, strays }) {
    this.el = el;
    this.steps = steps.slice().sort((a, b) => b.px - a.px);
    this.strays = strays;
    if (!this.steps.length) { el.innerHTML = ''; return; }
    this.render();
    this.wire();
  }

  rows() {
    const { steps, strays } = this, out = [];
    const most = Math.max(1, ...steps.map((s) => s.uses));
    for (const st of steps) {
      const mine = strays.filter((s) => s.near === st.name && !s.copy).sort((a, b) => b.px - a.px);
      const copy = strays.find((s) => s.near === st.name && s.copy);
      const rows = mine.filter((s) => s.places >= ROW_MIN), few = mine.filter((s) => s.places < ROW_MIN);
      // the ladder stays in one order: bigger sizes above their step, smaller ones below it
      for (const s of rows.filter((s) => s.px > st.px)) out.push(this.stray(s, st));
      out.push(this.step(st, copy, most));
      for (const s of rows.filter((s) => s.px < st.px)) out.push(this.stray(s, st));
      if (few.length) out.push(this.few(few, st));
    }
    return out;
  }

  step(st, copy, most) {
    const { name, px, uses } = st, short = name.replace(/^text-/, '');
    const said = `${short}, ${fmt(px)}: ${uses ? `${plural(uses, 'place uses', 'places use')} it` : 'never used'}${copy ? `, and ${plural(copy.places, 'place types', 'places type')} ${fmt(px)} by hand` : ''}`;
    return `<li class="sp-row step${uses ? '' : ' unused'}" data-step="${esc(name)}"><span class="sr">${esc(said)}</span>
      <div class="sp-meta" aria-hidden="true"><span class="name">${esc(short)}</span><span class="px">${fmt(px)}</span>${copy ? `<span class="copies">${place('typed')}${plural(copy.places, 'place types', 'places type')} it by hand</span>` : ''}</div>
      <div class="sp-sample" aria-hidden="true" style="font-size:${px}px"><span>${SAMPLE}</span></div>
      <div class="sp-use" aria-hidden="true">${uses ? `<span class="bar"><i style="width:${Math.max(4, (uses / most) * 100)}%"></i></span>${nf.format(uses)}` : '<span class="bar"></span>Never used'}</div></li>`;
  }

  stray(s, st) {
    const short = st.name.replace(/^text-/, ''), written = s.written.map((w) => `${esc(w.text)} ×${w.n}`).join(' · ');
    const said = `${fmt(s.px)}, typed by hand in ${plural(s.places, 'place', 'places')}, as ${s.written.map((w) => w.text).join(' and ')}. Nearest on your scale: ${short}, ${fmt(st.px)}`;
    return `<li class="sp-row stray" tabindex="-1" data-near="${esc(st.name)}" style="--snap:${(st.px / s.px).toFixed(4)}"><span class="sr">${esc(said)}</span>
      <div class="sp-meta" aria-hidden="true"><span class="px">${fmt(s.px)}</span><span class="to">→ ${esc(short)}</span><span class="how" title="${esc(s.written.map((w) => `${w.text} ×${w.n}`).join(' · '))}">${written}</span></div>
      <div class="sp-sample" aria-hidden="true" style="font-size:${s.px}px"><span>${SAMPLE}</span></div>
      <div class="sp-use" aria-hidden="true">${place('off')}${nf.format(s.places)}</div></li>`;
  }

  few(few, st) {
    const places = few.reduce((n, s) => n + s.places, 0);
    const sizes = few.length > 4 ? `${few.length} sizes from <code>${fmt(few.at(-1).px)}</code> to <code>${fmt(few[0].px)}</code>` : few.map((s) => `<code>${fmt(s.px)}</code>`).join(', ');
    return `<li class="sp-row few" data-near="${esc(st.name)}"><div class="sp-sample">Also typed by hand: ${sizes}, ${plural(places, 'place', 'places')}.</div></li>`;
  }

  render() {
    this.el.innerHTML = `<section class="sp pl-card" aria-labelledby="sp-title">
      <div class="sp-head"><h2 id="sp-title">Your scale, size by size</h2><p>Each size in your theme, set at that size, with the sizes typed by hand that should become it, and how many places use each. Point at one to see it snap.</p></div>
      <ol>${this.rows().join('')}</ol></section>`;
  }

  wire() {
    const root = this.el.querySelector('.sp'), rows = [...root.querySelectorAll('.sp-row')];
    // a stray lights the step it becomes; a step lights the strays that become it
    // what's lit always follows the row pointed at and the row in focus, so the two never leave a stale light
    let pointed = null, focused = null;
    const links = (from, r) => r !== from && (from.dataset.step ? r.matches('.stray') && r.dataset.near === from.dataset.step : r.dataset.step === from.dataset.near);
    const light = () => { for (const r of rows) r.classList.toggle('lit', [pointed, focused].some((f) => f && links(f, r))); };
    for (const row of rows) {
      if (row.matches('.few')) continue;
      row.addEventListener('pointerenter', () => { pointed = row; light(); });
      row.addEventListener('pointerleave', () => { if (pointed === row) pointed = null; light(); });
      row.addEventListener('focus', () => { if (row.matches(':focus-visible')) { focused = row; light(); } });
      row.addEventListener('blur', () => { if (focused === row) focused = null; light(); });
    }
    // the hand-typed sizes are one Tab stop; the arrows walk them
    const strays = rows.filter((r) => r.matches('.stray'));
    if (strays.length) strays[0].tabIndex = 0;
    root.querySelector('ol').addEventListener('keydown', (e) => {
      const at = strays.indexOf(e.target), to = { ArrowDown: at + 1, ArrowUp: at - 1, Home: 0, End: strays.length - 1 }[e.key];
      if (at < 0 || to === undefined || !strays[to]) return;
      e.preventDefault(); e.target.tabIndex = -1; strays[to].tabIndex = 0; strays[to].focus();
    });
    // the rows fade up the first time the specimen is on screen
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    root.classList.add('sp-wait');
    new IntersectionObserver(([e], io) => {
      if (!e.isIntersecting) return;
      io.disconnect(); root.classList.remove('sp-wait');
      rows.forEach((r, i) => r.style.setProperty('--at', `${stagger(root, i, rows.length)}ms`));
      root.classList.add('sp-built');
    }, { threshold: 0.05 }).observe(root);
  }
}
