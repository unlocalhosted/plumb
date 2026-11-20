// The design site's page for a button in use: plumber's own buttons, and what plumber finds wrong while you press
// them. Each button sits on a stage; when you let go, a filmstrip of it opens under it, the wrong moments in coral,
// each fault with its fix (generator/playground/atoms/gesture.js, the same view the atoms page uses).
import { LANGUAGE_CSS } from '../../../overlay/src/language.js';
import { TOY_DEFS } from '../../../overlay/src/toys.js';
import { BUTTON_CSS, button as b } from '../../../overlay/src/kit.js';
import { watchGestures } from '../../../generator/playground/atoms/gesture.js';

const BUTTONS = [
  ['Action', b('Add to theme', { key: '↵' }), 'the one thing this moment is for'],
  ['Quiet', b('Keep', { cls: 'quiet', key: 'K' }), 'a real choice, not the main one'],
  ['Destroys', b('Discard all', { cls: 'wrong' }), 'only for what can’t be put back'],
];

export function mount(host, root, css) {
  root.innerHTML = `<style>${css}${LANGUAGE_CSS}${BUTTON_CSS}
    :host { display: block; font-family: var(--pl-sans); color: var(--pl-ink); }
    :host([data-scheme="dark"]) { --pl-paper: #2a2930; --pl-paper-2: #35343c; --pl-rule: #45444d; --pl-ink: #f4f3ef; }
    .uses { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; }
    .atom { display: grid; gap: 6px; align-content: start; padding: 18px; border-radius: 18px; background: var(--pl-paper-2); }
    .atom-stage { position: relative; display: grid; place-items: center; min-height: 88px; }
    .atom h3 { margin: 6px 0 0; font: var(--pl-round-w, 600) 15px/20px var(--pl-round); }
    .atom p { margin: 0; font: 400 13px/19px var(--pl-sans); color: var(--pl-ink-2); }
  </style>${TOY_DEFS}
  <section class="set pl-light"><h2>Press one</h2><p>Press, hold, or slide off before you let go. When you let go, plumber shows the button frame by frame, marks the moments that went wrong, and says how to fix each.</p>
    <div class="uses">${BUTTONS.map(([name, html, says]) => `<section class="atom"><div class="atom-stage" data-atom>${html}</div><h3>${name}</h3><p>${says}</p></section>`).join('')}</div>
  </section>`;
  // plumber's craft engine, built for the site (web/scripts/engine.mjs): the site's bundler can't take its source
  import(/* webpackIgnore: true */ /* turbopackIgnore: true */ '/engine/craft.js').then((engine) => watchGestures(root, engine));
  void host;
}
