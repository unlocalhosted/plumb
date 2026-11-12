// The design site's page for inputs: what it draws inside its host. The overlay has two typed fields, both in the fix
// bar: naming a new token, and saying why a value is kept. Each is shown live with the fix bar's own styles and
// words (field.js, which the fix bar puts in its own stylesheet; words.js FIX), behaving by the panel's own rules; then every state side by side; then
// what is still open, counted.
import { LANGUAGE_CSS } from '../../../overlay/src/language.js';
import { FIX_BUTTONS_CSS, FIX_NOTE_CSS, FIX_FIELD_CSS, fieldSays, fit, fitFor } from '../../../overlay/src/field.js';
import { FIX } from '../../../overlay/src/words.js';

export function mount(host, root, css) {
  const PLACES = 3, VALUE = '13px', NS = '--spacing';
  const okName = (name) => /^[a-z][a-z0-9-]{0,30}$/.test(name); // the panel's own check (fixpanel.js, the new step)
  const hint = (name) => (name && !okName(name) ? FIX.newStepBad : okName(name) ? `${FIX.becomes(PLACES)} <code>gap-${name}</code>` : FIX.newStepHint(PLACES));

  // a name field, in a given state: '' rest, 'focus', 'ok', 'bad'
  const nameField = (name, state = '') => `<label class="field${state === 'focus' ? ' is-focus' : ''}"${state === 'bad' ? ' data-invalid' : okName(name) ? ' data-ok' : ''}>${NS}-<span class="slot"><input name="token" value="${name}" style="${fitFor(name || FIX.newStepExample)}" placeholder="${FIX.newStepExample}" autocomplete="off" spellcheck="false" aria-label="Name of the new gap"${state && state !== 'live' ? ' tabindex="-1"' : ''}></span><span class="val">: ${VALUE}</span><i class="ok-tick" aria-hidden="true"></i></label>
    <div class="hint${name && !okName(name) ? ' err' : ''}">${hint(name)}</div>`;

  const STATES = [
    ['At rest', 'A well in the bar, the blank a lilac slot with the example name in it. The hint says what will happen.', '', ''],
    ['Typing', 'A lilac ring round the slot while it has the caret; the slot grows with each letter, on a spring.', 'gut', 'focus'],
    ['A good name', 'A mint tick pops in at the end, and the hint names the class every place becomes.', 'gutter', 'ok'],
    ['Not a name', 'The slot turns coral with one small shake, and the rule is said in words. The button waits.', 'Gutter 2', 'bad'],
  ];

  root.innerHTML = `<style>${css}${LANGUAGE_CSS}${FIX_BUTTONS_CSS}${FIX_NOTE_CSS}${FIX_FIELD_CSS}
    :host { display: block; font-family: var(--pl-sans); color: var(--pl-text-primary); }
    h2 { margin: 44px 0 6px; font: 600 20px/28px var(--pl-sans); letter-spacing: -0.01em; }
    h2 + p, .prose p { margin: 0 0 10px; font: 400 14px/22px var(--pl-sans); color: var(--pl-text-secondary); max-width: 680px; }
    .prose b { color: var(--pl-text-primary); font-weight: 600; }
    code { font: 500 12px/1.4 var(--pl-mono); }
    .prose code { padding: 1px 5px; border-radius: 5px; background: var(--pl-bg-inset); }
    .panel { margin-top: 14px; border-radius: 18px; background: var(--pl-bg-surface); box-shadow: 0 0 0 1px var(--pl-border-default); overflow: hidden; }

    /* the fix bar, standing on the page instead of floating over it */
    .stage { display: grid; place-items: center; padding: 36px 24px; background: var(--pl-bg-inset); }
    .fx { width: 100%; max-width: 440px; box-sizing: border-box; border-radius: 18px; background: var(--pl-bg-surface); color: var(--pl-text-primary); font: 13px/1.35 var(--pl-sans); overflow: hidden;
      box-shadow: 0 0 0 .5px rgb(0 0 0 / .09), 0 1px 1px rgb(0 0 0 / .04), 0 8px 20px -8px rgb(0 0 0 / .14), 0 28px 56px -24px rgb(0 0 0 / .18); padding-top: 12px; }
    .fx button { font: inherit; border: 0; cursor: pointer; background: none; }
    .fx kbd { font: inherit; }
    .fx button:focus-visible, .fx input:focus-visible { outline: 2px solid var(--pl-border-focus); outline-offset: 2px; }
    .fields > div { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr); align-items: center; border-top: 1px solid var(--pl-border-default); }
    .fields > div:first-child { border-top: 0; }
    .cap { padding: 16px 18px 18px; display: grid; gap: 4px; }
    .cap h3 { margin: 0; font: 600 16px/22px var(--pl-sans); }
    .cap p { margin: 0; font: 400 13px/19px var(--pl-sans); color: var(--pl-text-secondary); }
    .fx .lead { padding: 14px 18px 0; font-weight: 600; }

    /* every state, frozen side by side; the typing one carries the focus ring the stylesheet gives :focus-within */
    .states { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); }
    .state { border-left: 1px solid var(--pl-border-default); display: grid; grid-template-rows: auto 1fr; }
    .state:first-child { border-left: 0; }
    .state .fx { width: 100%; box-shadow: none; background: none; backdrop-filter: none; -webkit-backdrop-filter: none; border-radius: 0; padding-bottom: 12px; }
    .state .fx .field { margin: 14px 12px 2px; } .state .fx .hint { margin: 4px 12px 0; }
    .fx .field.is-focus .slot { box-shadow: 0 0 0 2px color-mix(in oklab, var(--pl-lilac) 45%, transparent); }
    .state .cap { border-top: 1px solid var(--pl-border-default); }
    .open { margin-top: 14px; padding: 14px 18px 14px 34px; border-radius: 16px; background: var(--pl-bg-surface); box-shadow: 0 0 0 1px var(--pl-border-default); font: 400 13px/21px var(--pl-sans); color: var(--pl-text-secondary); }
    .open li + li { margin-top: 6px; } .open b { color: var(--pl-text-primary); font-weight: 600; }
    @media (max-width: 1000px) { .states { grid-template-columns: 1fr 1fr; } .state:nth-child(3) { border-left: 0; } .state:nth-child(n+3) { border-top: 1px solid var(--pl-border-default); } }
    @media (max-width: 720px) { .fields > div, .states { grid-template-columns: 1fr; } .state { border-left: 0; border-top: 1px solid var(--pl-border-default); } .state:first-child { border-top: 0; } }
  </style>
  <h2>How the system works</h2>
  <div class="prose">
    <p>Plumber asks you to type only twice, both in the fix bar: <b>a name</b>, when a value isn't in your theme yet and adding it is the fix, and <b>a reason</b>, when you keep a value as it is. Everything else is picked, pointed at or pressed.</p>
    <p>A field is a sentence with one blank. The name sits between what it is and its value, <code>--spacing-<i>gutter</i>: 13px</code>, so you see the line that will be written. The field is a well, pressed into the bar: the opposite of a button. The blank is lilac, as names are, and it grows as you type; a mint tick says it's good, a coral slot and a small shake say it isn't.</p>
  </div>

  <h2>The two fields</h2>
  <p>Live, with the fix bar's own styles and words. Type in them.</p>
  <div class="panel fields">
    <div><div class="stage"><div class="fx" data-f="name">
        <div class="note">${FIX.newStep('gap', VALUE)}</div>
        <div class="live">${nameField('gutter', 'live')}</div>
        <div class="acts"><button class="primary take">${FIX.addToTheme} <kbd>↵</kbd></button><button class="ghost">${FIX.keep} <kbd>K</kbd></button></div>
      </div></div>
      <div class="cap"><h3>Naming a token</h3><p>A first name is offered by what the value is (a gap is a gutter, a radius is round); edit it freely. Lowercase letters, numbers and dashes; the button waits until it's a name.</p></div></div>
    <div><div class="stage"><div class="fx" data-f="why">
        <label class="field why">${FIX.keepWhy} <input name="why" value="" placeholder="${FIX.keepExample}" maxlength="120" autocomplete="off"><i class="ok-tick" aria-hidden="true"></i></label>
        <div class="acts"><button class="primary keep-yes" disabled>${FIX.keepPlaces(PLACES)} <kbd>↵</kbd></button><button class="ghost">${FIX.cancel} <kbd>Esc</kbd></button></div>
      </div></div>
      <div class="cap"><h3>Saying why you keep it</h3><p>Kept values are written down with their reason, so the next person knows. Up to 120 characters; the button waits for three.</p></div></div>
  </div>

  <h2>States</h2>
  <p>The name field, in each state it has. A field is never disabled; the button under it is.</p>
  <div class="panel states">${STATES.map(([h, p, name, st]) => `<div class="state"><div class="fx">${nameField(name, st)}</div><div class="cap"><h3>${h}</h3><p>${p}</p></div></div>`).join('')}</div>

  <h2>What is still open</h2>
  <ul class="open">
    <li><b>No search.</b> The plan listed "searching"; there is no search field. The colour picker is found by key and by pointing, nearest first. If a long list ever needs one, it should be this same field.</li>
    <li><b>Corners and type off the tokens.</b> The bar's buttons write their corners as 10px and 11px, between the row token (8) and the card token (12); the name field's type is 12.5px mono and the reason's 13px, neither a type token.</li>
  </ul>`;

  // the name field: the hint, the size and the button follow what is typed, by the panel's rules
  const live = root.querySelector('[data-f="name"]');
  live.addEventListener('input', (e) => {
    const f = e.target, name = f.value, field = f.closest('.field');
    fit(f);
    fieldSays(field, { ok: okName(name), bad: !!name && !okName(name) });
    const h = live.querySelector('.hint'); h.innerHTML = hint(name); h.classList.toggle('err', !!name && !okName(name));
    live.querySelector('.take').disabled = !okName(name);
  });
  const why = root.querySelector('[data-f="why"]');
  why.addEventListener('input', (e) => { const ok = e.target.value.trim().length >= 3; why.querySelector('.keep-yes').disabled = !ok; fieldSays(e.target.closest('.field'), { ok }); });

  void host;
}
