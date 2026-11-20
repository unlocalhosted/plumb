// The design site's page for the price molecule (web/design/molecules/price.js): the first part the organism generator
// builds pricing cards from. Every form, at every loudness a card can ask for, at each density, on the chosen plan's
// block, and changing. What is drawn here is the molecule itself, not a picture of it.
import { LANGUAGE_CSS } from '../../../overlay/src/language.js';
import { BUTTON_CSS, button } from '../../../overlay/src/kit.js';
import { price, rollPrice, PRICE_CSS, fitsPrice } from '../molecules/price.js';
import { figureStep } from '../molecules/contract.js';

export function mount(host, root, css) {
  const PLAN = { amount: 25, period: '/ month' };
  const DEAL = { amount: 129, was: 149, currency: '€', period: 'once' };
  const FREE = { amount: 0, period: 'forever' };
  const FORMS = [
    { form: 'figure', record: PLAN, name: 'Figure', says: 'The number as a figure in the toy face, its period small beside it on one baseline. For the plan whose price is the reason to choose it.', needs: 'amount; period if it repeats' },
    { form: 'deal', record: DEAL, name: 'Deal', says: 'The old price struck through before the new one, so the saving reads in one look. Only when there really was an old price.', needs: 'amount and was' },
    { form: 'quiet', record: FREE, name: 'Quiet', says: 'A few words in the reading face, to sit on the name’s line. For a free plan, or a card where the name leads and the price only confirms.', needs: 'amount' },
  ];
  const LOUD = [
    { rank: 1, lead: 'strong', label: 'leads, strongly' }, { rank: 1, lead: 'clear', label: 'leads' }, { rank: 1, lead: 'flat', label: 'leads, barely' },
    { rank: 2, lead: 'clear', label: 'second' }, { rank: 3, lead: 'clear', label: 'quiet' },
  ];
  const step = (o) => (o.rank >= 3 ? 14 : figureStep(o));
  // the quiet form is made to sit on a plan name's line, so it is shown beside one (the name is context, set as a card's
  // name would be, not part of the price)
  const withName = (html, name = 'Free') => `<span class="ctx"><span class="nm">${name}</span>${html}</span>`;
  const cell = (inner, cap, sub = '') => `<figure class="m"><div class="stage">${inner}</div><figcaption><b>${cap}</b>${sub ? `<small>${sub}</small>` : ''}</figcaption></figure>`;

  root.innerHTML = `<style>${css}${LANGUAGE_CSS}${BUTTON_CSS}${PRICE_CSS}
    :host { display: block; font-family: var(--pl-sans); color: var(--pl-text-primary); }
    .row { display: grid; gap: 14px; margin-top: 18px; }
    .three { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .five { grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
    .ctx { display: inline-flex; align-items: baseline; gap: 10px; }
    .ctx .nm { font: var(--pl-round-w, 700) 20px/1 var(--pl-round); color: var(--pl-text-primary); }
    .m { margin: 0; display: grid; grid-template-rows: auto auto; gap: 10px; }
    .stage { display: flex; align-items: center; min-height: 112px; padding: 20px; border-radius: var(--pl-radius-card); background: var(--pl-bg-inset); }
    .stage.block { background: var(--pl-pink-block); }
    figcaption { display: grid; gap: 3px; }
    figcaption b { font: var(--pl-round-w, 700) 16px/20px var(--pl-round); }
    figcaption small { font: 400 13px/19px var(--pl-sans); color: var(--pl-text-secondary); }
    figcaption code { font: 500 12px/17px var(--pl-mono); color: var(--pl-text-secondary); }
    .pill { display: inline-block; margin-left: 6px; padding: 1px 6px; border-radius: var(--pl-radius-pill); background: var(--pl-sky-soft); color: var(--pl-sky-ink); font: 500 11px/16px var(--pl-mono); vertical-align: 1px; }
    .switch { display: flex; gap: 8px; margin: 18px 0 0; }
    .switch .tb:not(.on) { --hue: var(--pl-bg-surface); }
    .live { margin-top: 14px; display: flex; gap: 14px; }
    .atoms .stage { min-height: 88px; }
    figcaption a { color: var(--pl-text-primary); text-underline-offset: 2px; }
    .live .stage { min-width: 260px; }
    @media (max-width: 860px) { .three { grid-template-columns: 1fr; } }
  </style>
  <h2>Made of</h2>
  <p>The price is a molecule: three atoms doing one job together. Each atom is set by a foundation, and nothing here sets a size or a colour of its own.</p>
  <div class="row three atoms">
    ${cell(`<span class="mol-price" data-on="paper" style="--step:40px;--unit:14px;--gap:4px;--ink:var(--pl-text-primary);--ink-2:var(--pl-text-secondary)"><span class="unit"><span class="fig"><span class="now">$25</span></span></span></span>`, 'The figure', 'A number in the toy face, heavy, with tabular digits so prices in a row line up. Its size is a step from <a href="/design/type">Type</a>.')}
    ${cell(`<span class="mol-price" data-on="paper" style="--step:40px;--unit:16px;--gap:4px;--ink:var(--pl-text-primary);--ink-2:var(--pl-text-secondary)"><span class="per">/ month</span></span>`, 'The words', 'What the figure counts per: a period, “once”, “forever”. The reading face, at the size of supporting words, in the second ink (<a href="/design/color">Colour</a>).')}
    ${cell(`<span class="mol-price" data-on="paper" style="--step:40px;--unit:16px;--gap:4px;--ink:var(--pl-text-primary);--ink-2:var(--pl-text-secondary)"><s class="was"><span class="sr">was </span>€149</s></span>`, 'The old price', 'A price that no longer applies, struck through in the second ink. Only ever beside a figure.')}
  </div>

  <h2>Three forms</h2>
  <p>A price says what a plan costs, at the loudness the card asks for. Three ways to say it, each for a different kind of plan.</p>
  <div class="row three">${FORMS.map((f) => cell(f.form === 'quiet' ? withName(price(f.record, { form: 'quiet', rank: 3 })) : price(f.record, { form: f.form, rank: 1, lead: 'clear', density: 'balanced' }), f.name, `${f.says}<br><code>needs ${f.needs}</code>`)).join('')}</div>

  <h2>Loud and quiet</h2>
  <p>The card decides how loud the price is: its rank among the card’s parts, and how far the loudest part stands above the next. Each picks one of the site’s steps, nothing in between. From third place on, every form reads as words.</p>
  ${FORMS.filter((f) => f.form !== 'quiet').map((f) => `<div class="row five">${LOUD.map((o) => cell(price(f.record, { form: f.form, ...o, density: 'balanced' }), `${f.name}, ${o.label}`, `<span class="pill">${step(o)}px</span>`)).join('')}</div>`).join('')}

  <h2>Density</h2>
  <p>Density moves the space inside the price, between the figure, the old price and the period. The figure’s size stays where its rank put it.</p>
  <div class="row three">${['airy', 'balanced', 'compact'].map((d) => cell(price(DEAL, { form: 'deal', rank: 1, lead: 'clear', density: d }), d[0].toUpperCase() + d.slice(1), `<span class="pill">${{ airy: 8, balanced: 4, compact: 2 }[d]}px</span> between its parts`)).join('')}</div>

  <h2>On the chosen plan</h2>
  <p>When a card is the chosen one, it becomes the one solid block in the action hue. Everything on it is lettered in the block’s own ink; the period and the old price stay quieter by size, not by a paler colour.</p>
  <div class="row three">${FORMS.map((f) => `<figure class="m"><div class="stage block">${f.form === 'quiet' ? withName(price(f.record, { form: 'quiet', rank: 3, on: 'pink' })).replace('class="nm"', 'class="nm" style="color:var(--pl-pink-block-on)"') : price(f.record, { form: f.form, rank: 1, lead: 'clear', density: 'balanced', on: 'pink' })}</div><figcaption><b>${f.name}</b></figcaption></figure>`).join('')}</div>

  <h2>When it changes</h2>
  <p>Switching how a plan is billed changes the number. It rolls one way when the price goes up and the other way when it goes down, as one piece, and lands. With reduced motion it swaps.</p>
  <div class="switch" role="group" aria-label="Billing">${button('Monthly', { cls: 'on', attrs: 'data-bill="month" aria-pressed="true"' })}${button('Yearly', { cls: 'quiet', attrs: 'data-bill="year" aria-pressed="false"' })}</div>
  <div class="live">
    <div class="stage" data-live="figure">${price({ amount: 29, period: '/ month' }, { form: 'figure', rank: 1, lead: 'strong' })}</div>
    <div class="stage block" data-live="chosen">${price({ amount: 49, period: '/ month' }, { form: 'figure', rank: 1, lead: 'clear', on: 'pink' })}</div>
  </div>`;

  const BILL = { month: { figure: 29, chosen: 49, period: '/ month' }, year: { figure: 290, chosen: 490, period: '/ year' } };
  for (const b of root.querySelectorAll('[data-bill]')) b.addEventListener('click', () => {
    const k = b.dataset.bill, v = BILL[k];
    for (const o of root.querySelectorAll('[data-bill]')) { const on = o === b; o.classList.toggle('on', on); o.classList.toggle('quiet', !on); o.setAttribute('aria-pressed', String(on)); }
    for (const [slot, n] of [['figure', v.figure], ['chosen', v.chosen]]) {
      const el = root.querySelector(`[data-live="${slot}"] .mol-price`);
      rollPrice(el, n);
      const per = el.querySelector('.per'); if (per) per.textContent = v.period;
    }
  });
  void fitsPrice;
}
