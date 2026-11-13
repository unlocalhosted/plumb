// The design site's page for the X-ray (prototype, 2026-11-13): point at any part of someone's card and see what it's
// made of, drawn on it and said beside it. Built from the overlay's own module (overlay/src/xray.js), with someone's
// theme scale so each value is judged: mint on the scale, coral off it.
import { LANGUAGE_CSS } from '../../../overlay/src/language.js';
import { TOY_DEFS } from '../../../overlay/src/toys.js';
import { XRAY_CSS } from '../../../overlay/src/xray.js';
import { PICKER_CSS } from '../../../overlay/src/picker.js';
import { XRAY_LIVE_CSS, mountXray } from '../../../overlay/src/xray-live.js';

// someone's theme (Tailwind's): spacing, radius and type steps in px
const SCALE = {
  spacing: [[2, '0.5'], [4, '1'], [6, '1.5'], [8, '2'], [10, '2.5'], [12, '3'], [14, '3.5'], [16, '4'], [20, '5'], [24, '6'], [28, '7'], [32, '8'], [40, '10'], [48, '12']],
  radius: [[2, 'xs'], [4, 'sm'], [6, 'md'], [8, 'lg'], [12, 'xl'], [16, '2xl'], [24, '3xl'], [9999, 'full']],
  // widths and heights: the spacing scale to 96, then Tailwind's larger steps and its container widths
  size: [[32, '8'], [36, '9'], [40, '10'], [48, '12'], [64, '16'], [80, '20'], [96, '24'], [128, '32'], [160, '40'], [192, '48'], [224, '56'], [256, '64'], [288, '72'], [320, '80'], [384, '96'], [448, 'md'], [512, 'lg'], [576, 'xl'], [672, '2xl']],
  type: [[12, 'xs'], [14, 'sm'], [16, 'base'], [18, 'lg'], [20, 'xl'], [24, '2xl']],
};
const tokenOf = (family, n) => SCALE[family]?.find(([v]) => Math.abs(v - n) <= 0.5 || (v === 9999 && n > 500))?.[1] ?? null;

// each part of the card: the name its code gives it, and the line it's written on
// where each part is used (its call site), for a change written at the use rather than in the component's own file
const CALLS = { tool: 'components/editor/Toolbar.tsx:30', image: 'app/feed/PhotoCard.tsx:13', like: 'app/feed/PhotoCard.tsx:19', editor: 'app/notes/NoteCard.tsx:12', avatar: 'app/settings/MemberRow.tsx:9', role: 'app/settings/MemberRow.tsx:12', invite: 'app/settings/TeamCard.tsx:42', cancel: 'app/settings/TeamCard.tsx:41', badge: 'app/settings/TeamCard.tsx:17' };
const USES = { avatar: 14, role: 9, invite: 31, cancel: 31, like: 31, badge: 6, tool: 18, image: 42, editor: 3 }; // how many places the demo's app uses each component
const NAMES = {
  card: ['TeamCard', 'app/settings/TeamCard.tsx:14'], head: ['CardHeader', 'app/settings/TeamCard.tsx:16'], title: ['h3', 'app/settings/TeamCard.tsx:18'],
  badge: ['Badge', 'node_modules/@acme/ui/dist/badge.js:1'], lede: ['p', 'app/settings/TeamCard.tsx:21'], list: ['ul', 'app/settings/TeamCard.tsx:24'],
  member: ['MemberRow', 'app/settings/MemberRow.tsx:7'], avatar: ['Avatar', 'components/ui/avatar.tsx:12'], who: ['div', 'app/settings/MemberRow.tsx:10'],
  note: ['NoteCard', 'app/notes/NoteCard.tsx:8'], toolbar: ['Toolbar', 'components/editor/Toolbar.tsx:6'], tool: ['ToolbarButton', 'components/editor/Toolbar.tsx:14'], editor: ['Editor', 'components/editor/Editor.tsx:20'],
  photo: ['PhotoCard', 'app/feed/PhotoCard.tsx:11'], image: ['Image', 'components/ui/image.tsx:5'], pbody: ['div', 'app/feed/PhotoCard.tsx:14'], ptitle: ['h4', 'app/feed/PhotoCard.tsx:15'], pmeta: ['p', 'app/feed/PhotoCard.tsx:16'], like: ['Button', 'components/ui/button.tsx:22'],
  role: ['Select', 'components/ui/select.tsx:31'], foot: ['div', 'app/settings/TeamCard.tsx:40'], invite: ['Button', 'components/ui/button.tsx:22'], cancel: ['Button', 'components/ui/button.tsx:22'],
};

export function mount(host, root, css) {
  const people = [['MA', 'Mara Ellis', 'mara@shoreline.co', 'Owner', '#ffd3cd'], ['JK', 'Jun Kato', 'jun@shoreline.co', 'Editor', '#c5e6fd'], ['SR', 'Sami Reyes', 'sami@shoreline.co', 'Viewer', '#e3dcff']];
  root.innerHTML = `<style>${css}${LANGUAGE_CSS}${XRAY_CSS}${PICKER_CSS}${XRAY_LIVE_CSS}
    :host { display: block; font-family: var(--pl-sans); color: var(--pl-text-primary); }
    h2 { margin: 44px 0 6px; font: 600 20px/28px var(--pl-sans); letter-spacing: -0.01em; }
    h2 + p, .prose p { margin: 0 0 10px; font: 400 14px/22px var(--pl-sans); color: var(--pl-text-secondary); max-width: 680px; }
    .prose b { color: var(--pl-text-primary); font-weight: 600; }
    .stage { position: relative; margin-top: 14px; min-height: 620px; border-radius: 22px; background: #f4f4f6; overflow: hidden; display: flex; flex-wrap: wrap; gap: 32px; align-items: flex-start; justify-content: center; padding: 72px 48px 110px; }
    .stage .app:not(.note) { user-select: none; -webkit-user-select: none; }
    /* someone's note editor: a toolbar of the same button three times, and words you can type (Enter is the X-ray's
       while it's on) */
    .app.note { width: 340px; padding: 0; gap: 0; overflow: hidden; }
    .note .tb { display: flex; gap: 4px; padding: 8px 10px; border-bottom: 1px solid #eaecf0; }
    .note .tb button { width: 30px; height: 28px; padding: 0; border-radius: 6px; background: #f2f4f7; color: #344054; font: 600 13px/1 ui-sans-serif, system-ui, sans-serif; }
    .note .ed { padding: 14px 18px 18px; outline: none; font: 400 14px/22px ui-sans-serif, system-ui, sans-serif; color: #344054; cursor: text; }
    .note .ed h4 { margin: 0 0 6px; font: 650 16px/22px ui-sans-serif, system-ui, sans-serif; color: #101828; }
    .note .ed p { margin: 0 0 8px; } .note .ed ul { display: block; margin: 0; padding-left: 18px; list-style: disc; } .note .ed li { display: list-item; }
    /* someone's photo card: a picture, its title, who saved it, a like */
    .app.photo { width: 280px; padding: 0; gap: 0; overflow: hidden; border-radius: 16px; }
    .photo img { display: block; width: 100%; height: 180px; object-fit: cover; border-radius: 10px 10px 0 0; }
    .photo .pb { display: grid; gap: 6px; padding: 12px 14px 14px; }
    .photo h4 { margin: 0; font: 650 15px/20px ui-sans-serif, system-ui, sans-serif; color: #101828; }
    .photo p { margin: 0; font: 400 13px/18px ui-sans-serif, system-ui, sans-serif; color: #667085; }
    .photo .like { justify-self: start; padding: 6px 11px; border-radius: 99px; background: #fdf2f8; color: #c11574; font: 600 13px/18px ui-sans-serif, system-ui, sans-serif; box-shadow: none; }
    .stage .rerender { position: absolute; right: 16px; bottom: 12px; height: 28px; padding: 0 12px; border: 0; border-radius: 9px; background: #fff; box-shadow: 0 0 0 1px #d8d8de; font: 600 12px/1 var(--pl-sans); color: #44444c; cursor: pointer; z-index: 7; }
    .stage .server { position: absolute; right: 150px; bottom: 12px; height: 28px; padding: 0 12px; border: 0; border-radius: 9px; background: #fff; box-shadow: 0 0 0 1px #d8d8de; font: 600 12px/1 var(--pl-sans); color: #44444c; cursor: pointer; z-index: 7; }
    .stage .server[aria-pressed="true"] { background: var(--pl-coral-soft); color: var(--pl-coral-ink); box-shadow: 0 0 0 1px var(--pl-coral); }
    .stage .hint kbd { font: 600 11px/1 var(--pl-sans); padding: 2px 5px; border-radius: 5px; background: #fff; box-shadow: 0 0 0 1px #d8d8de; }
    .stage .hint { position: absolute; left: 0; right: 0; bottom: 18px; margin: 0; text-align: center; font: 500 12.5px/1 var(--pl-sans); color: #6b6b75; }
    .stage[data-pinned] .hint b { color: var(--pl-pink); }

    /* someone's card, in someone's styles: some on their scale, some written by hand */
    .app { flex: none; width: 420px; box-sizing: border-box; padding: 22px; border-radius: 14px; background: #fff; color: #101828; box-shadow: 0 1px 2px rgb(16 24 40 / .06), 0 12px 32px -16px rgb(16 24 40 / .28);
      font: 400 14px/20px ui-sans-serif, system-ui, sans-serif; display: grid; gap: 18px; cursor: default; }
    .app .head { display: flex; align-items: center; gap: 10px; }
    .app h3 { margin: 0; font: 650 17px/24px ui-sans-serif, system-ui, sans-serif; letter-spacing: -0.01em; }
    .app .badge { padding: 2px 8px; border-radius: 9999px; background: #ecfdf3; color: #067647; font: 600 12px/18px ui-sans-serif, system-ui, sans-serif; }
    .app .lede { margin: -12px 0 0; color: #475467; }
    .app ul { margin: 0; padding: 0; list-style: none; display: grid; gap: 12px; }
    .app li { display: flex; align-items: center; gap: 12px; }
    .app .av { width: 36px; height: 36px; border-radius: 9999px; display: grid; place-items: center; font: 600 13px/1 ui-sans-serif, system-ui, sans-serif; color: #344054; }
    .app .who { display: grid; flex: 1; min-width: 0; } .app .who b { font-weight: 600; } .app .who span { font-size: 13px; color: #667085; }
    .app .role { padding: 6px 10px; border-radius: 8px; box-shadow: inset 0 0 0 1px #d0d5dd; font: 500 13px/18px ui-sans-serif, system-ui, sans-serif; color: #344054; }
    .app .foot { display: flex; justify-content: flex-end; gap: 8px; padding-top: 4px; }
    .app button { padding: 9px 15px; border: 0; border-radius: 7px; font: 600 14px/20px ui-sans-serif, system-ui, sans-serif; cursor: default; }
    .app .invite { background: #2563eb; color: #fff; } .app .cancel { background: #fff; color: #344054; box-shadow: inset 0 0 0 1px #d0d5dd; }
    @media (max-width: 900px) { .stage { padding: 56px 20px 340px; } }
  </style>
  ${TOY_DEFS}
  <h2>The idea</h2>
  <div class="prose">
    <p>Point at anything on your page and see what it's made of. <b>On the element</b>, its space in the patterns: padding hatched, margin dotted, gaps striped, corners traced, its size on rulers. Mint where a value is on your scale, coral where it's written by hand. <b>Beside it</b>, a card says the same in numbers: which part it is and where it's written, its box drawn small, then corner, gap, type, colour and contrast, each value with its token.</p>
    <p>Nothing to switch on. <b>Point at a part and it's in hand</b>: a padding side, a margin side (a band outside it, even at 0), the width or height ruler, a corner, the gap, the words. It lights up with one pill saying what it is; <b>hold ⇧</b> and the pointer becomes its drag cursor: press and drag, or scroll with two fingers, and it snaps to your scale. Without ⇧ the page scrolls and clicks as usual. The row at the top of the card holds it too: two fingers left and right choose which sides or the value, up and down change it. <b>Every number in the card is a control too</b>: drag it sideways, scroll on it, or click it for the list. The card waits while you move to it. Changes collect at the foot of the card; <b>Sync</b> (or ↵) writes them, Esc puts them back. With nothing to sync, ↵ opens a note for your agent.</p>
  </div>
  <h2>Point at the cards</h2>
  <p>Three pieces of someone's app: a team card with repeated rows, a note editor you can type in (while the X-ray is on, ↵ is its own), and a photo card.</p>
  <div class="stage" tabindex="0">
    <div class="app" data-x="card">
      <div class="head" data-x="head"><h3 data-x="title">Your team</h3><span class="badge" data-x="badge">3 seats left</span></div>
      <p class="lede" data-x="lede">People here can edit the workspace and its billing.</p>
      <ul data-x="list">${people.map(([i, n, e, r, c]) => `<li data-x="member"><span class="av" data-x="avatar" style="background:${c}">${i}</span><span class="who" data-x="who"><b>${n}</b><span>${e}</span></span><span class="role" data-x="role">${r}</span></li>`).join('')}</ul>
      <div class="foot" data-x="foot"><button class="cancel" data-x="cancel">Cancel</button><button class="invite" data-x="invite">Invite people</button></div>
    </div>
    <div class="app note" data-x="note">
      <div class="tb" data-x="toolbar"><button data-x="tool">B</button><button data-x="tool"><i>I</i></button><button data-x="tool">U</button></div>
      <div class="ed" contenteditable="true" spellcheck="false" data-x="editor"><h4>Release notes</h4><p>Teams can now invite up to five people from settings.</p><ul><li>Faster sync between devices</li><li>New avatars and roles</li></ul></div>
    </div>
    <div class="app photo" data-x="photo">
      <img data-x="image" src="https://images.unsplash.com/photo-1603979649806-5299879db16b?w=600&q=80&auto=format&fit=crop" alt="A lake below green mountains at dawn">
      <div class="pb" data-x="pbody"><h4 data-x="ptitle">Bachalpsee at dawn</h4><p data-x="pmeta">Saved by Mara · 2 days ago</p><button class="like" data-x="like">♥ 128</button></div>
    </div>
    <button type="button" class="server" aria-pressed="false" title="Pretend Plumber's server is down, to see what Sync says">Server: on</button>
    <button type="button" class="rerender" title="Draws the card again from scratch, the way React does after a state change or a hot reload">Re-render the card</button>
    <p class="hint">Point at a part · hold <kbd>⇧</kbd> to drag it or scroll it · or change a number · <kbd>↵</kbd> sync, or a note for your agent · <kbd>Esc</kbd> put back</p>
  </div>`;

  const stage = root.querySelector('.stage');
  // the demo's controls: a pretend server that can be switched off, and a re-render that draws the cards again from
  // their markup, new elements in place of the old (as React does)
  let serverUp = true;
  const APP_HTML = [...stage.querySelectorAll('.app')].map((a) => a.outerHTML);
  stage.querySelector('.server').addEventListener('click', (e) => { e.stopPropagation(); serverUp = !serverUp; e.currentTarget.textContent = `Server: ${serverUp ? 'on' : 'off'}`; e.currentTarget.setAttribute('aria-pressed', String(!serverUp)); });
  stage.querySelector('.rerender').addEventListener('click', (e) => { e.stopPropagation(); const t = document.createElement('div'); [...stage.querySelectorAll('.app')].forEach((a, i) => { t.innerHTML = APP_HTML[i]; a.replaceWith(t.firstElementChild); }); });

  // the X-ray itself is the overlay's (xray-live.js); this page tells it what the demo app is
  const parts = (x) => stage.querySelectorAll(`.app [data-x="${x}"], .app[data-x="${x}"]`);
  const compOf = (el) => { const n = NAMES[el.dataset.x]; return n && /^(components|node_modules)\//.test(n[1] ?? '') ? n : null; };
  mountXray({
    container: stage, events: stage, root, contextStop: stage,
    partAt: (e) => e.target.closest?.('.app [data-x], .app[data-x]') ?? null,
    name: (el) => NAMES[el.dataset.x] ?? [el.localName, null],
    key: (el) => el.dataset.x ?? null,
    all: (k) => [...parts(k)],
    component: (el) => { const c = compOf(el); return c && { name: c[0], file: c[1], uses: USES[el.dataset.x] }; },
    everywhere: (el) => { const c = compOf(el); return [...stage.querySelectorAll('.app [data-x], .app[data-x]')].filter((t) => { const n = NAMES[t.dataset.x]; return n && n[0] === c[0] && n[1] === c[1]; }); },
    tokenOf, scale: (f) => SCALE[f],
    isPage: (r) => !!(r.target.closest?.('.app') || [...r.addedNodes, ...r.removedNodes].some((n) => n.nodeType === 1 && n.matches?.('.app'))),
    // the pretend server: where each change would be written, and what it says when it can't be
    write: async (groups) => groups.map((g) => {
      const own = NAMES[g.part]?.[1] ?? '', lib = /node_modules/.test(own);
      if (!serverUp) return { id: g.id, state: 'failed', why: "Plumber's server isn't answering, so nothing was written. It's still pending." };
      if (g.scope === 'all' && lib) return { id: g.id, state: 'moved', why: `${g.name} comes from a library, so it was written where you use it:`, where: CALLS[g.part] ?? own };
      return { id: g.id, state: 'ok', where: g.scope === 'all' ? own : CALLS[g.part] ?? own };
    }),
    // the demo's undo puts the places back on the page
    undo: async (r) => r.els.forEach((el, i) => { const was = r.befores[i]; if (was) el.style.setProperty(r.prop, was); else el.style.removeProperty(r.prop); }),
  });
  void host;
}
