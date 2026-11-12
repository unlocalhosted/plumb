// The design site's page for inputs: what it draws inside its host. The overlay has two typed fields, both in the fix
// bar: naming a new token, and saying why a value is kept. Each is shown live with the fix bar's own styles and
// words (field.js, which the fix bar puts in its own stylesheet; words.js FIX), behaving by the panel's own rules; then every state side by side; then
// what is still open, counted.
import { LANGUAGE_CSS } from '../../../overlay/src/language.js';
import { FIX_BUTTONS_CSS, FIX_NOTE_CSS, FIX_FIELD_CSS } from '../../../overlay/src/field.js';
import { FIX } from '../../../overlay/src/words.js';
import { TOY_DEFS, toyOf } from '../../../overlay/src/toys.js';

export function mount(host, root, css) {
  const PLACES = 3, VALUE = '13px', NS = '--spacing';
  const okName = (name) => /^[a-z][a-z0-9-]{0,30}$/.test(name); // the panel's own check (fixpanel.js, the new step)
  const hint = (name) => (name && !okName(name) ? FIX.newStepBad : okName(name) ? `${FIX.becomes(PLACES)} <code>gap-${name}</code>` : FIX.newStepHint(PLACES));

  // a name field, in a given state: '' rest, 'focus', 'ok', 'bad'
  const nameField = (name, state = '') => `<label class="field${state === 'focus' ? ' is-focus' : ''}"${state === 'bad' ? ' data-invalid' : ''}>${NS}-<input name="token" value="${name}" size="${Math.max(4, name.length + 1)}" placeholder="${FIX.newStepExample}" autocomplete="off" spellcheck="false" aria-label="Name of the new gap"${state && state !== 'live' ? ' tabindex="-1"' : ''}>: ${VALUE}</label>
    <div class="hint${name && !okName(name) ? ' err' : ''}">${hint(name)}</div>`;

  const STATES = [
    ['At rest', 'Empty, the example name in grey. The hint says what will happen.', '', ''],
    ['Typing', 'The ring darkens while it has the caret.', 'gut', 'focus'],
    ['A good name', 'The hint names the class every place becomes.', 'gutter', 'ok'],
    ['Not a name', 'A coral ring and the rule, in words. The button waits.', 'Gutter 2', 'bad'],
  ];

  root.innerHTML = `${TOY_DEFS}<style>${css}${LANGUAGE_CSS}${FIX_BUTTONS_CSS}${FIX_NOTE_CSS}${FIX_FIELD_CSS}
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
    .fx .field.is-focus { box-shadow: inset 0 0 0 1.5px var(--pl-text-primary); }
    .fx .field.is-focus input { caret-color: var(--pl-text-primary); }
    .state .cap { border-top: 1px solid var(--pl-border-default); }
    /* ── three ideas ── */
    .ideas .idea { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr); align-items: center; border-top: 1px solid var(--pl-border-default); }
    .ideas .idea:first-child { border-top: 0; }
    .ideas .card { width: 100%; max-width: 440px; box-sizing: border-box; padding: 16px 18px 18px; border-radius: 18px; background: var(--pl-bg-surface); display: grid; gap: 12px;
      box-shadow: 0 0 0 .5px rgb(0 0 0 / .09), 0 8px 20px -8px rgb(0 0 0 / .14), 0 28px 56px -24px rgb(0 0 0 / .18); font: 13px/1.35 var(--pl-sans); }
    .ideas .lead { color: var(--pl-text-secondary); font-size: 12.5px; }
    .ideas input { all: unset; font: inherit; color: inherit; min-width: 1ch; }
    .ideas .say { min-height: 17px; font-size: 12px; color: var(--pl-text-secondary); } .ideas .say.err { color: var(--pl-text-hard-coded); }
    .ideas .say code { font: 600 11.5px/1 var(--pl-mono); color: var(--pl-text-primary); }

    /* A: a well, pressed into the bar, its blank a lilac slot */
    .well { position: relative; display: flex; align-items: center; height: 42px; padding: 0 12px; border-radius: 12px; font: 500 13px/1 var(--pl-mono); color: var(--pl-text-secondary);
      background: var(--pl-bg-inset); box-shadow: inset 0 2px 3px -1px rgb(0 0 0 / .16), inset 0 0 0 1px rgb(0 0 0 / .05), 0 1px 0 rgb(255 255 255 / .7); cursor: text; }
    :host([data-scheme="dark"]) .well { box-shadow: inset 0 2px 4px -1px rgb(0 0 0 / .5), inset 0 0 0 1px rgb(255 255 255 / .04), 0 1px 0 rgb(255 255 255 / .06); }
    .well .slot { display: inline-flex; margin: 0 2px; padding: 4px 7px; border-radius: var(--pl-radius-tag); background: var(--pl-lilac-soft); color: var(--pl-lilac-ink);
      transition: background-color 160ms var(--pl-ease-out), color 160ms var(--pl-ease-out); }
    .well .slot input { width: var(--w, 6ch); transition: width 260ms var(--pl-spring-pop); caret-color: var(--pl-lilac); font-weight: 600; }
    .well:focus-within .slot { box-shadow: 0 0 0 2px color-mix(in oklab, var(--pl-lilac) 45%, transparent); }
    .well[data-bad] .slot { background: var(--pl-coral-soft); color: var(--pl-coral-ink); animation: shake 260ms var(--pl-ease-out); }
    @keyframes shake { 25% { translate: -3px 0; } 60% { translate: 2px 0; } }
    .well .tick { position: absolute; right: 10px; width: 20px; height: 20px; border-radius: 50%; background: var(--pl-mint); scale: 0; opacity: 0;
      transition: scale 320ms var(--pl-spring-pop), opacity 120ms; }
    .well .tick::after { content: ''; position: absolute; left: 7px; top: 4px; width: 4px; height: 8px; border: solid #fff; border-width: 0 2px 2px 0; rotate: 45deg; }
    .well[data-ok] .tick { scale: 1; opacity: 1; }

    /* B: you type the tag */
    .maker { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .big-tag { display: inline-flex; align-items: center; gap: 8px; height: 38px; padding: 0 14px 0 9px; border-radius: 10px; background: var(--pl-lilac-soft); color: var(--pl-lilac-ink);
      font: 700 17px/1 var(--pl-round, var(--pl-sans)); box-shadow: var(--pl-shadow-tag); translate: 0 -2px; cursor: text;
      transition: translate 300ms var(--pl-spring-pop), box-shadow 200ms var(--pl-ease-out), background-color 160ms, color 160ms; }
    .big-tag .toy { display: block; width: 24px; height: 24px; transition: rotate 300ms var(--pl-spring-pop), scale 300ms var(--pl-spring-pop); }
    .big-tag .toy svg { display: block; width: 100%; height: 100%; }
    .big-tag input { width: var(--w, 6ch); transition: width 260ms var(--pl-spring-pop); caret-color: var(--pl-lilac); }
    .big-tag:focus-within { box-shadow: var(--pl-shadow-tag), 0 0 0 2px color-mix(in oklab, var(--pl-lilac) 45%, transparent); }
    .big-tag:focus-within .toy { rotate: -8deg; scale: 1.1; }
    .maker[data-bad] .big-tag { translate: 0 0; box-shadow: none; background: var(--pl-coral-soft); color: var(--pl-coral-ink); }
    .maker .arrow { color: var(--pl-text-secondary); }

    /* C: the result, as you type */
    .plain { display: flex; align-items: baseline; gap: 0; padding: 4px 0 6px; border-bottom: 1.5px solid var(--pl-border-default); font: 500 15px/1 var(--pl-mono); color: var(--pl-text-secondary); cursor: text; }
    .plain input { color: var(--pl-text-primary); width: var(--w, 6ch); caret-color: var(--pl-text-primary); }
    .plain:focus-within { border-bottom-color: var(--pl-text-primary); }
    .plain[data-bad] { border-bottom-color: var(--pl-text-hard-coded); }
    .code { margin: 0; padding: 10px 12px; border-radius: 10px; background: var(--pl-bg-inset); font: 500 12px/1.6 var(--pl-mono); color: var(--pl-text-secondary); white-space: pre-wrap; overflow-wrap: anywhere; }
    .code .ln { display: block; font-size: 11px; color: var(--pl-text-secondary); opacity: .7; }
    .code s { color: var(--pl-text-hard-coded); text-decoration-thickness: 1.5px; }
    .code .nw { font-weight: 600; color: var(--pl-mint-ink); background: var(--pl-mint-soft); border-radius: 4px; padding: 0 3px; }
    .code[data-bad] .nw { color: var(--pl-coral-ink); background: var(--pl-coral-soft); }
    .code .nm i { font-style: normal; display: inline-block; animation: pl-pop 220ms var(--pl-spring-pop) both; }
    .dots { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--pl-text-secondary); }
    .dots i { width: 9px; height: 9px; border-radius: 50%; background: var(--pl-border-default); transition: background-color 200ms var(--pl-ease-out), scale 300ms var(--pl-spring-pop); }
    .dots[data-ok] i { background: var(--pl-mint); scale: 1.15; }
    .dots[data-ok] i:nth-child(2) { transition-delay: 40ms; } .dots[data-ok] i:nth-child(3) { transition-delay: 80ms; }
    @media (prefers-reduced-motion: reduce) { .ideas * { transition: none !important; animation: none !important; } }
    @media (max-width: 720px) { .ideas .idea { grid-template-columns: 1fr; } }
    .open { margin-top: 14px; padding: 14px 18px 14px 34px; border-radius: 16px; background: var(--pl-bg-surface); box-shadow: 0 0 0 1px var(--pl-border-default); font: 400 13px/21px var(--pl-sans); color: var(--pl-text-secondary); }
    .open li + li { margin-top: 6px; } .open b { color: var(--pl-text-primary); font-weight: 600; }
    @media (max-width: 1000px) { .states { grid-template-columns: 1fr 1fr; } .state:nth-child(3) { border-left: 0; } .state:nth-child(n+3) { border-top: 1px solid var(--pl-border-default); } }
    @media (max-width: 720px) { .fields > div, .states { grid-template-columns: 1fr; } .state { border-left: 0; border-top: 1px solid var(--pl-border-default); } .state:first-child { border-top: 0; } }
  </style>
  <h2>How the system works</h2>
  <div class="prose">
    <p>Plumber asks you to type only twice, both in the fix bar: <b>a name</b>, when a value isn't in your theme yet and adding it is the fix, and <b>a reason</b>, when you keep a value as it is. Everything else is picked, pointed at or pressed.</p>
    <p>A field is a sentence with one blank. The name sits between what it is and its value, <code>--spacing-<i>gutter</i>: 13px</code>, so you see the line that will be written. The words under it say what happens next, and change as you type.</p>
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
        <label class="field why">${FIX.keepWhy} <input name="why" value="" placeholder="${FIX.keepExample}" maxlength="120" autocomplete="off"></label>
        <div class="acts"><button class="primary keep-yes" disabled>${FIX.keepPlaces(PLACES)} <kbd>↵</kbd></button><button class="ghost">${FIX.cancel} <kbd>Esc</kbd></button></div>
      </div></div>
      <div class="cap"><h3>Saying why you keep it</h3><p>Kept values are written down with their reason, so the next person knows. Up to 120 characters; the button waits for three.</p></div></div>
  </div>

  <h2>States</h2>
  <p>The name field, in each state it has. A field is never disabled; the button under it is.</p>
  <div class="panel states">${STATES.map(([h, p, name, st]) => `<div class="state"><div class="fx">${nameField(name, st)}</div><div class="cap"><h3>${h}</h3><p>${p}</p></div></div>`).join('')}</div>

  <h2>Three ideas: a field with some love</h2>
  <p>The field above was built as a plain web form, the one thing you touch in Plumber that isn't in the visual language. Three ways in, each a different kind of answer. All three are live; type a name, try a bad one.</p>
  <div class="panel ideas">
    <div class="idea" data-k="a"><div class="stage"><div class="card">
        <div class="lead">${FIX.newStep('gap', VALUE)}</div>
        <label class="well">${NS}-<span class="slot"><input value="gutter" spellcheck="false" autocomplete="off" aria-label="Name of the new gap"></span>: ${VALUE}<i class="tick" aria-hidden="true"></i></label>
        <div class="say"></div></div></div>
      <div class="cap"><h3>A. A well</h3><p>The soft block's opposite: a place pressed into the bar, lit on its lower lip. The blank is a lilac slot (names are lilac) that grows on a spring as you type; a good name gets a mint tick that pops in, a bad one turns the slot coral and gives a small shake.</p></div></div>
    <div class="idea" data-k="b"><div class="stage"><div class="card">
        <div class="lead">${FIX.newStep('gap', VALUE)}</div>
        <div class="maker"><span class="big-tag"><i class="toy">${toyOf('gap')}</i><input value="gutter" spellcheck="false" autocomplete="off" aria-label="Name of the new gap"></span><span class="arrow">is</span><span class="pl-pill" data-hue="sky">${VALUE}</span></div>
        <div class="say"></div></div></div>
      <div class="cap"><h3>B. You type the tag</h3><p>No box: you type straight into the thing you're making, a name tag with the gap's toy on it, a size bigger than usual. It stands raised a little, like a tag on your page; a bad name and it goes flat and coral until it's a name again.</p></div></div>
    <div class="idea" data-k="c"><div class="stage"><div class="card">
        <div class="lead">${FIX.newStep('gap', VALUE)}</div>
        <label class="plain">${NS}-<input value="gutter" spellcheck="false" autocomplete="off" aria-label="Name of the new gap"></label>
        <pre class="code"><span class="ln">Pricing.jsx</span>&lt;div className="flex <s>gap-[13px]</s> <b class="nw">gap-<span class="nm">gutter</span></b>"&gt;</pre>
        <div class="dots" aria-hidden="true"><i></i><i></i><i></i><span></span></div></div></div>
      <div class="cap"><h3>C. The result, as you type</h3><p>The field stays quiet; the love goes to what it does. Under it, the line of your code with the hard-coded class struck out and the new one written letter by letter as you type, and the three places it reaches lighting up mint once the name is good.</p></div></div>
  </div>

  <h2>What is still open</h2>
  <ul class="open">
    <li><b>No search.</b> The plan listed "searching"; there is no search field. The colour picker is found by key and by pointing, nearest first. If a long list ever needs one, it should be this same field.</li>
    <li><b>Corners and type off the tokens.</b> The field's corner is written as 10px and the bar's button as 11px, between the row token (8) and the card token (12); the name field's type is 12.5px mono and the reason's 13px, neither a type token.</li>
  </ul>`;

  // the name field: the hint, the size and the button follow what is typed, by the panel's rules
  const live = root.querySelector('[data-f="name"]');
  live.addEventListener('input', (e) => {
    const f = e.target, name = f.value, field = f.closest('.field');
    f.size = Math.max(4, name.length + 1);
    field.toggleAttribute('data-invalid', !!name && !okName(name));
    const h = live.querySelector('.hint'); h.innerHTML = hint(name); h.classList.toggle('err', !!name && !okName(name));
    live.querySelector('.take').disabled = !okName(name);
  });
  const why = root.querySelector('[data-f="why"]');
  why.addEventListener('input', (e) => { why.querySelector('.keep-yes').disabled = e.target.value.trim().length < 3; });

  // the three ideas, by the panel's own rule for a name
  for (const idea of root.querySelectorAll('.idea')) {
    const k = idea.dataset.k, input = idea.querySelector('input'), say = idea.querySelector('.say');
    const update = (typed) => {
      const name = input.value, ok = okName(name), bad = !!name && !ok;
      input.style.setProperty('--w', `${Math.max(2, name.length + 0.5)}ch`);
      if (say) { say.innerHTML = bad ? FIX.newStepBad : ok ? `${FIX.becomes(PLACES)} <code>gap-${name}</code>` : FIX.newStepHint(PLACES); say.classList.toggle('err', bad); }
      if (k === 'a') { const w = idea.querySelector('.well'); w.toggleAttribute('data-ok', ok); if (bad && typed) { w.removeAttribute('data-bad'); void w.offsetWidth; } w.toggleAttribute('data-bad', bad); }
      if (k === 'b') idea.querySelector('.maker').toggleAttribute('data-bad', bad);
      if (k === 'c') {
        idea.querySelector('.plain').toggleAttribute('data-bad', bad); idea.querySelector('.code').toggleAttribute('data-bad', bad); idea.querySelector('.dots').toggleAttribute('data-ok', ok);
        const nm = idea.querySelector('.nm'), prev = nm.textContent;
        nm.innerHTML = [...(name || '…')].map((ch, i) => (typed && i >= prev.length - 0 && name.startsWith(prev) && i === name.length - 1 ? `<i>${ch}</i>` : ch)).join('');
        idea.querySelector('.dots span').textContent = ok ? `${PLACES} places` : '';
      }
    };
    input.addEventListener('input', () => update(true));
    update(false);
  }
  void host;
}
