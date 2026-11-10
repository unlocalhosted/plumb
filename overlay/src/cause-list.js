/* ─────────────────────────────────────────────────────────
 * CAUSE LIST · React Plumber (docs/design/onboarding.md, "The page": 2, what I'd stop first)
 *
 * The three biggest causes, in the terminal's own sentences (src/say-cause.ts sends them; this never rewords one), so
 * the page keeps the terminal's promise. Each shows what the value is, the ways it was written, what your theme calls
 * it, and its places by file. Built from the overlay's pieces: values are pills (coral as written, mint your theme's
 * name), the action is pl-act, a colour is shown as itself on the checker. Text never takes a data colour.
 *
 *  cause      the value as itself (a colour swatch; anything else, its label in a pill), the sentence, then a row of
 *             how it was written (coral pills with counts) → what your theme calls it (a mint pill)
 *  places     "See the 96 places" opens the files under the cause, busiest first, each place as line and text. A file
 *             says once how many of its places render nothing, and those lines are struck through (the words stay for
 *             readers). Eight files show, then "Show 27 more files"
 *  open       the button turns to "Hide the places"; the list fades in on --pl-dur-build; one cause open at a time
 *  more       under the list: "The 3 biggest of 469 causes."
 *  empty      no causes: a mint disc and "Nothing to stop. Every value your code sets comes from your theme."
 *  keys       the buttons are buttons; the list they open is labelled by its cause
 *  reduced    the list appears without the fade
 *  narrow     below 720px the swatch sits beside the sentence's first line, the pills wrap
 * ───────────────────────────────────────────────────────── */
import { esc } from './choices.js';
import { place } from './scale-marks.js';

const nf = new Intl.NumberFormat('en');
const plural = (n, one, many) => `${nf.format(n)} ${n === 1 ? one : many}`;
const FILES_SHOWN = 8;

export const CAUSE_LIST_CSS = `
  .cl-head { padding: var(--pl-page-inset) var(--pl-page-inset) var(--pl-space-4); }
  .cl-head h2 { margin: 0; font: var(--pl-page-title); letter-spacing: var(--pl-tracking-title); }
  .cl-head p { margin: 2px 0 0; font: var(--pl-page-small); color: var(--pl-text-secondary); }
  .cl ol { margin: 0; padding: 0; list-style: none; }
  .cl-cause { display: grid; grid-template-columns: 40px minmax(0, 1fr); gap: var(--pl-space-6); padding: var(--pl-space-7) var(--pl-page-inset); box-shadow: inset 0 var(--pl-line) 0 var(--pl-border-default); }
  .cl-cause:first-child { box-shadow: none; }
  .cl-swatch { position: relative; width: 40px; height: 40px; border-radius: var(--pl-radius-row); overflow: hidden; box-shadow: inset 0 0 0 var(--pl-line) var(--pl-border-default); }
  .cl-swatch i { position: absolute; inset: 0; box-shadow: inset 0 0 0 var(--pl-line) color-mix(in oklab, var(--pl-icon-primary) 12%, transparent); border-radius: inherit; }
  /* a colour with alpha sits on a checker of ink, so white at 30% still shows on a white card */
  .cl-swatch.see { background: conic-gradient(color-mix(in oklab, var(--pl-text-primary) 22%, transparent) 25%, transparent 0 50%, color-mix(in oklab, var(--pl-text-primary) 22%, transparent) 0 75%, transparent 0) 0 0 / 10px 10px; }
  .cl-value { align-self: start; justify-self: start; }
  .cl-said { margin: 0; max-width: 62ch; font: var(--pl-page-body); color: var(--pl-text-primary); text-wrap: pretty; font-variant-numeric: tabular-nums; }
  .cl-ways { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: var(--pl-space-5); }
  .cl-ways .to { margin: 0 2px; font: var(--pl-page-small); color: var(--pl-text-secondary); }
  .cl-ways .pl-pill b { font-weight: 500; opacity: .72; }
  .cl-show { margin-top: var(--pl-space-5); }
  .cl-places { margin: var(--pl-space-5) 0 0; padding: 0; list-style: none; border-radius: var(--pl-radius-row); background: var(--pl-bg-inset); }
  .cl-places:not([hidden]) { animation: cl-in var(--pl-dur-build) var(--pl-ease-out) both; }
  @keyframes cl-in { from { opacity: 0; translate: 0 -4px; } }
  .cl-file { padding: var(--pl-space-4) var(--pl-space-5); box-shadow: inset 0 var(--pl-line) 0 var(--pl-border-default); }
  .cl-file:first-child { box-shadow: none; }
  .cl-file > div { display: flex; justify-content: space-between; gap: var(--pl-space-5); font: var(--pl-card-code); color: var(--pl-text-primary); }
  .cl-file > div span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; direction: rtl; text-align: left; }
  .cl-file > div b { flex: none; font-weight: 500; color: var(--pl-text-secondary); font-variant-numeric: tabular-nums; }
  .cl-file ul { margin: 2px 0 0; padding: 0; list-style: none; }
  .cl-file li { display: grid; grid-template-columns: 48px minmax(0, 1fr); gap: var(--pl-space-4); font: var(--pl-card-code); color: var(--pl-text-secondary); }
  .cl-file li code { font: inherit; color: var(--pl-text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .cl-file li.dead code { color: var(--pl-text-secondary); text-decoration: line-through; text-decoration-color: var(--pl-coral); text-decoration-thickness: 1.5px; }
  .cl-file .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
  .cl-file li .ln { font-variant-numeric: tabular-nums; text-align: right; }
  .cl-more { padding: var(--pl-space-4) var(--pl-space-5); box-shadow: inset 0 var(--pl-line) 0 var(--pl-border-default); }
  .cl-foot { padding: var(--pl-space-6) var(--pl-page-inset) var(--pl-page-inset); box-shadow: inset 0 var(--pl-line) 0 var(--pl-border-default); font: var(--pl-page-small); color: var(--pl-text-secondary); }
  .cl-none { display: flex; align-items: center; gap: var(--pl-space-4); padding: var(--pl-space-4) var(--pl-page-inset) var(--pl-page-inset); font: var(--pl-page-body); }
  .cl-none .sc-place { scale: 1.6; }
  @media (max-width: 720px) {
    .cl-cause { grid-template-columns: 28px minmax(0, 1fr); gap: var(--pl-space-5); padding-inline: var(--pl-space-6); }
    .cl-swatch { width: 28px; height: 28px; border-radius: var(--pl-radius-tag); }
    .cl-head, .cl-foot { padding-inline: var(--pl-space-6); }
    .cl-file li { grid-template-columns: 40px minmax(0, 1fr); }
    .cl-file > div { flex-direction: column; gap: 0; }
  }
  @media (prefers-reduced-motion: reduce) { .cl-places:not([hidden]) { animation: none; } }
`;

// a colour as itself: `#rrggbb`, or `#rrggbb/NN` for one at NN% (the causes model's canonical form)
function swatch(cause) {
  const m = /^#([0-9a-f]{6})(?:\/(\d{1,3}))?$/i.exec(cause.value);
  if (cause.family !== 'color' || !m) return `<span class="pl-pill cl-value" data-hue="coral">${esc(cause.label)}</span>`;
  const fill = m[2] ? `color-mix(in srgb, #${m[1]} ${m[2]}%, transparent)` : `#${m[1]}`;
  return `<span class="cl-swatch${m[2] ? ' see' : ''}" aria-hidden="true"><i style="background:${fill}"></i></span>`;
}

export class CauseList {
  /**
   * @param el      where to draw (inside a shadow root that carries tokens.css, LANGUAGE_CSS, SCALE_CSS, CAUSE_LIST_CSS)
   * @param causes  the page's causes (src/project-page/system.ts PageCause): biggest first, each with its sentence
   * @param open    how many causes there are in all
   */
  constructor(el, { causes, open }) {
    this.el = el;
    this.causes = causes ?? [];
    this.open = open ?? this.causes.length;
    this.render();
    this.wire();
  }

  cause(c, i) {
    const ways = c.spellings.map((s) => `<span class="pl-pill" data-hue="coral">${esc(s.text)} <b>×${nf.format(s.count)}</b></span>`).join('');
    const to = c.suggestion ? `<span class="to" aria-hidden="true">→</span><span class="pl-pill" data-hue="mint">${esc(c.suggestion.name)}</span>` : '';
    return `<li class="cl-cause">${swatch(c)}<div>
      <p class="cl-said" id="cl-said-${i}">${esc(c.said)}</p>
      <div class="cl-ways" role="group" aria-label="How it's written${c.suggestion ? `, and what your theme calls it` : ''}">${ways}${to}</div>
      <button type="button" class="pl-act quiet cl-show" aria-expanded="false" aria-controls="cl-places-${i}">See the ${plural(c.count, 'place', 'places')}</button>
      <ul class="cl-places" id="cl-places-${i}" aria-labelledby="cl-said-${i}" hidden></ul></div></li>`;
  }

  places(c, all) {
    const files = all ? c.files : c.files.slice(0, FILES_SHOWN), rest = c.files.length - files.length;
    const dead = (f) => { const n = f.places.filter((p) => p.rendersNothing).length; return !n ? '' : n === f.places.length ? (n === 1 ? ', renders nothing' : ', all render nothing') : `, ${n} render nothing`; };
    return files.map((f) => `<li class="cl-file"><div><span title="${esc(f.file)}">${esc(f.file)}</span><b>${plural(f.places.length, 'place', 'places')}${dead(f)}</b></div>
      <ul>${f.places.map((p) => `<li${p.rendersNothing ? ' class="dead"' : ''}><span class="ln">${p.line}</span><code>${esc(p.text)}</code>${p.rendersNothing ? '<span class="sr">renders nothing</span>' : ''}</li>`).join('')}</ul></li>`).join('')
      + (rest ? `<li class="cl-more"><button type="button" class="pl-act quiet" data-all>Show ${plural(rest, 'more file', 'more files')}</button></li>` : '');
  }

  render() {
    const { causes, open } = this;
    this.el.innerHTML = `<section class="cl pl-card" aria-labelledby="cl-title">
      <div class="cl-head"><h2 id="cl-title">What I’d stop first</h2>${causes.length ? `<p>The same causes your terminal named, biggest first.</p>` : ''}</div>
      ${causes.length ? `<ol>${causes.map((c, i) => this.cause(c, i)).join('')}</ol>${open > causes.length ? `<div class="cl-foot">The ${causes.length} biggest of ${plural(open, 'cause', 'causes')}.</div>` : ''}`
        : `<p class="cl-none">${place('on')}Nothing to stop. Every value your code sets comes from your theme.</p>`}
    </section>`;
  }

  wire() {
    const buttons = [...this.el.querySelectorAll('.cl-show')];
    // one cause open at a time, so the list stays a list of three
    const show = (b, on) => {
      const i = buttons.indexOf(b), list = this.el.querySelector(`#cl-places-${i}`), c = this.causes[i];
      b.setAttribute('aria-expanded', String(on));
      b.textContent = on ? 'Hide the places' : `See the ${plural(c.count, 'place', 'places')}`;
      if (on && !list.childElementCount) list.innerHTML = this.places(c, false);
      list.hidden = !on;
    };
    for (const b of buttons) b.addEventListener('click', () => {
      const on = b.getAttribute('aria-expanded') !== 'true';
      for (const other of buttons) if (other !== b && other.getAttribute('aria-expanded') === 'true') show(other, false);
      show(b, on);
    });
    this.el.addEventListener('click', (e) => {
      const all = e.target.closest('[data-all]');
      if (!all) return;
      const list = all.closest('.cl-places'), c = this.causes[+list.id.split('-').pop()];
      list.innerHTML = this.places(c, true);
      // keep the reader where they were: focus the first file that wasn't shown before
      const first = list.children[FILES_SHOWN];
      first.tabIndex = -1; first.focus();
    });
  }
}
