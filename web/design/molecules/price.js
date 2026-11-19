// The price molecule: what a plan costs, said at the loudness its rank asks for. Three forms.
//
//   figure  the number as a figure in the toy face, its period small beside it on one baseline ("$25 / month")
//   deal    the same, with the old price struck through before it ("$149 $129 once"); needs `was`
//   quiet   the price as a few words in the reading face, to sit beside a name ("$0 forever"); for rank 3 and on, or a
//           flat card where the name leads
//
// Content record: { amount, currency = '$', period?, was?, note? }. The figure and its period are one unit and never
// wrap apart; on a short line the old price moves above the figure. `amount` may be a word ("Custom"): then there is
// no figure, only the word at the same step, and no period. Numbers are tabular, so a row of prices lines up digit for
// digit, and they roll when they change (rollPrice). Struck text carries "was" for a screen reader.
import { figureStep, innerGap, inks, esc } from './contract.js';

export const PRICE_FORMS = ['figure', 'deal', 'quiet'];
// which records a form can say: a deal needs an old price
export const fitsPrice = (form, record) => form !== 'deal' || record.was != null;

export function price(record, { form = 'figure', rank = 1, lead = 'clear', density = 'balanced', on = 'paper' } = {}) {
  const { amount, currency = '$', period, was, note } = record;
  const ink = inks(on), gap = innerGap(density);
  const numeric = typeof amount === 'number' || /^\d/.test(String(amount));
  const said = numeric ? `${currency}${amount}` : String(amount);
  if (form === 'quiet' || rank >= 3) {
    return `<span class="mol-price quiet" data-on="${on}" style="--ink:${ink.secondary}" aria-label="${esc(`${said}${period ? ` ${period}` : ''}`)}">${esc(said)}${period ? ` ${esc(period)}` : ''}</span>`;
  }
  const step = figureStep({ rank, lead });
  // the period sits at the size of supporting words; beside a headline figure it steps up once so it isn't lost
  const unit = step >= 40 ? 16 : 14;
  return `<div class="mol-price" data-on="${on}" style="--step:${step}px;--unit:${unit}px;--gap:${gap}px;--ink:${ink.primary};--ink-2:${ink.secondary}">
    ${form === 'deal' && was != null ? `<s class="was"><span class="sr">was </span>${esc(`${currency}${was}`)}</s>` : ''}
    <span class="unit"><span class="fig" data-value="${esc(said)}"><span class="now">${esc(said)}</span></span>${numeric && period ? `<span class="per">${esc(period)}</span>` : ''}</span>
    ${note ? `<span class="note">${esc(note)}</span>` : ''}
  </div>`;
}

// One body, in the direction of travel (interaction-principles.md 23): the old figure leaves over the top while the
// new one comes in from below when the price goes up, the other way when it goes down. In 260ms, out 200ms, half the
// figure's height of travel, a touch of blur. Interruptible: a new change starts from wherever the last one is.
// Under reduced motion it swaps.
export function rollPrice(el, to, { currency = '$' } = {}) {
  const fig = el.querySelector('.fig'); if (!fig) return;
  const from = fig.dataset.value, text = typeof to === 'number' ? `${currency}${to}` : String(to);
  if (from === text) return;
  fig.dataset.value = text;
  const old = fig.querySelector('.now'), next = Object.assign(document.createElement('span'), { className: 'now', textContent: text });
  for (const s of fig.querySelectorAll('.now.out')) s.remove();
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { old.replaceWith(next); return; }
  const up = (parseFloat(text.replace(/[^\d.]/g, '')) || 0) >= (parseFloat(from.replace(/[^\d.]/g, '')) || 0);
  old.classList.add('out'); fig.append(next);
  const d = up ? -1 : 1, travel = '0.5em';
  old.animate([{ transform: 'translateY(0)', opacity: 1, filter: 'blur(0)' }, { transform: `translateY(calc(${travel} * ${d}))`, opacity: 0, filter: 'blur(2px)' }], { duration: 200, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' }).finished.then(() => old.remove(), () => {});
  next.animate([{ transform: `translateY(calc(${travel} * ${-d}))`, opacity: 0, filter: 'blur(2px)' }, { transform: 'translateY(0)', opacity: 1, filter: 'blur(0)' }], { duration: 260, easing: 'cubic-bezier(.2,.8,.2,1)' });
}

export const PRICE_CSS = `
  .mol-price { display: flex; flex-wrap: wrap; align-items: baseline; column-gap: var(--gap); row-gap: 2px; color: var(--ink); }
  /* the figure and its period never part: when the line is short, only the old price moves, above the figure */
  .mol-price .unit { display: inline-flex; align-items: baseline; gap: var(--gap); white-space: nowrap; }
  .mol-price .fig { position: relative; display: inline-grid; font: var(--pl-round-w, 700) var(--step)/1 var(--pl-round); letter-spacing: -0.02em;
    font-variant-numeric: tabular-nums; }
  .mol-price .fig .now { grid-area: 1 / 1; white-space: nowrap; }
  .mol-price .per { font: 400 var(--unit)/1.2 var(--pl-sans); color: var(--ink-2); white-space: nowrap; }
  .mol-price .was { font: 500 var(--unit)/1.2 var(--pl-sans); color: var(--ink-2); text-decoration-thickness: 1.5px; font-variant-numeric: tabular-nums; }
  .mol-price .note { flex-basis: 100%; font: 400 13px/20px var(--pl-sans); color: var(--ink-2); }
  .mol-price .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
  /* white on a hue holds only for bold words at 14px and up (visual-language.md, Colour): on a block, the small words go bold */
  .mol-price:not([data-on="paper"]) .per, .mol-price:not([data-on="paper"]) .was, .mol-price.quiet:not([data-on="paper"]) { font-weight: 650; }
  .mol-price.quiet { font: 400 14px/22px var(--pl-sans); color: var(--ink); font-variant-numeric: tabular-nums; white-space: nowrap; }
`;
