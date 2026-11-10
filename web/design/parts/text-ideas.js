// The design site's page for new ways to put hard-coded text onto a text style. The problem, for real: a heading has
// hard-coded type (34px, 1.2, semibold) and you want it on the right style of your system, fast and sure. A panel of
// controls makes you do the work; these four let the page and plumber do it:
//   A  try styles on the element    no panel: scroll on the heading and it becomes each style in place
//   B  the page's type ladder       every style on the page as a rung; the heading hangs between two; drop it on one
//   C  make it like that one        click any text that looks right, and the heading takes its style
//   D  one answer, then why         plumber's best guess first, with its reasons; the controls only if you disagree
// All four run on the same piece of someone's app, so they can be compared.
import { LANGUAGE_CSS } from '../../../overlay/src/language.js';
import { BUTTON_CSS, button } from '../../../overlay/src/kit.js';

// the project's text styles, largest first
const STY = [
  { name: 'display', fs: 48, lh: 1.05, fw: 700, ls: -0.04 },
  { name: 'heading-lg', fs: 36, lh: 1.15, fw: 700, ls: -0.025 },
  { name: 'heading', fs: 28, lh: 1.25, fw: 600, ls: -0.02 },
  { name: 'title', fs: 18, lh: 1.4, fw: 600, ls: 0 },
  { name: 'body', fs: 15, lh: 1.6, fw: 400, ls: 0 },
  { name: 'caption', fs: 12.5, lh: 1.4, fw: 500, ls: 0.01 },
];
const HARD = { name: '34px · 1.2 · semibold', fs: 34, lh: 1.2, fw: 600, ls: -0.01, hard: true };
const styleCss = (s) => `font-size:${s.fs}px;line-height:${s.lh};font-weight:${s.fw};letter-spacing:${s.ls}em`;
const set = (el, s) => { el.style.fontSize = `${s.fs}px`; el.style.lineHeight = String(s.lh); el.style.fontWeight = String(s.fw); el.style.letterSpacing = `${s.ls}em`; };
// how far a style is from the hard-coded type: size counts most, then weight, then line height
const distance = (a, b) => Math.abs(a.fs - b.fs) * 1 + Math.abs(a.fw - b.fw) / 100 * 2 + Math.abs(a.lh - b.lh) * 10;
const nearest = () => [...STY].sort((a, b) => distance(HARD, a) - distance(HARD, b));

// someone's landing page: every text on a style except the hero heading
const page = (id) => `
  <div class="site" data-page="${id}">
    <nav><b data-style="title">Lumen</b><span data-style="body">Product</span><span data-style="body">Pricing</span><span data-style="body">Docs</span></nav>
    <header><small data-style="caption">NEW · THEMES 2.0</small><h1 class="hard">Keep every screen on your design system</h1><p data-style="body">Lumen finds the values your team typed by hand and moves them onto your tokens, in your code.</p></header>
    <h2 data-style="heading">How it works</h2>
    <div class="cards">
      <div><h3 data-style="title">Find drift</h3><p data-style="body">Every hard-coded value on the page.</p></div>
      <div><h3 data-style="title">Pick the token</h3><p data-style="body">The nearest one, from your theme.</p></div>
      <div><h3 data-style="title">Write it</h3><p data-style="body">In the file it came from.</p></div>
    </div>
    <h2 data-style="heading-lg">Ready when you are</h2>
  </div>`;

export function mount(host, root, css) {
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scene = (id, title, note, extra = '') => `<section class="scene" id="${id}"><h2>${title}</h2><p>${note}</p><div class="stage" tabindex="0">${page(id)}${extra}</div></section>`;

  root.innerHTML = `<style>${css}${LANGUAGE_CSS}${BUTTON_CSS}
    :host { display: block; font-family: var(--pl-sans); color: var(--pl-ink); }
    .scene { margin: 0 0 48px; }
    .scene > h2 { margin: 0 0 4px; }
    .scene > p { margin: 0 0 16px; max-width: 680px; }
    .stage { position: relative; display: flex; gap: 18px; align-items: flex-start; padding: 22px; border-radius: 22px; background: var(--pl-paper-2); overflow: hidden; outline: none; }

    /* ── someone's app (its own look) ── */
    .site { position: relative; flex: 1; min-width: 0; max-width: 640px; padding: 22px 28px 30px; border-radius: 14px; background: #fff; color: #101828; font-family: system-ui, -apple-system, sans-serif; box-shadow: 0 1px 2px rgb(16 24 40 / .06), 0 10px 30px -16px rgb(16 24 40 / .25); }
    .site nav { display: flex; align-items: baseline; gap: 18px; margin-bottom: 26px; color: #475467; }
    .site nav b { margin-right: auto; color: #101828; }
    .site header { margin-bottom: 28px; }
    .site small { display: block; margin-bottom: 10px; color: #6941c6; }
    /* someone's app keeps its own face and spacing, whatever the design site sets on its own headings */
    .stage .site h1, .stage .site h2, .stage .site h3, .stage .site p { margin: 0; font-family: system-ui, -apple-system, sans-serif; color: #101828; }
    .stage .site p { color: #475467; }
    .stage .site h1 { margin-bottom: 12px; ${styleCss(HARD)}; transition: font-size 260ms var(--pl-spring-pop), line-height 260ms var(--pl-ease-out), letter-spacing 260ms var(--pl-ease-out); }
    .site header p { color: #475467; max-width: 460px; }
    .stage .site h2 { margin-bottom: 14px; }
    .site .cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 28px; }
    .site .cards > div { padding: 14px; border-radius: 10px; background: #f9fafb; }
    .site .cards p { color: #475467; margin-top: 4px; }
    ${STY.map((s) => `.site [data-style="${s.name}"] { ${styleCss(s)} }`).join('\n    ')}
    /* the heading in hand: coral while hard-coded, blue on a style, green once kept */
    .site h1.hard { outline: 1.5px dashed var(--pl-coral); outline-offset: 5px; border-radius: 3px; }
    .site h1.trying { outline: 1.5px solid var(--pl-sky); outline-offset: 5px; border-radius: 3px; }
    .site h1.kept { outline: 1.5px solid var(--pl-mint); outline-offset: 5px; border-radius: 3px; }

    /* plumber's pieces */
    .pill { position: absolute; z-index: 5; display: inline-flex; align-items: center; gap: 8px; height: 30px; padding: 0 10px 0 8px; border-radius: 15px; background: var(--pl-ink); color: var(--pl-paper); font: 600 12.5px/1 var(--pl-sans); white-space: nowrap; box-shadow: 0 6px 18px -8px rgb(0 0 0 / .45); pointer-events: none; transition: opacity 160ms var(--pl-ease-out); }
    .pill small { font: 500 11.5px/1 var(--pl-mono); opacity: .7; }
    .pill .n { display: inline-grid; place-items: center; min-width: 18px; height: 18px; padding: 0 5px; border-radius: 9px; background: color-mix(in oklab, var(--pl-paper) 18%, transparent); font: 600 11px/1 var(--pl-sans); }
    .pill.hard { background: var(--pl-coral); color: var(--pl-coral-on); }
    .pill[hidden] { display: none; }
    .roll { position: relative; display: inline-block; overflow: hidden; height: 16px; vertical-align: middle; }
    .roll > span { display: block; line-height: 16px; }
    kbd { font: 600 10.5px/1 var(--pl-mono); padding: 2px 5px; border-radius: 5px; background: color-mix(in oklab, var(--pl-paper) 18%, transparent); }

    /* A: the ghost of the original, behind the heading as it tries each style */
    .ghost { position: absolute; z-index: 1; pointer-events: none; color: transparent; -webkit-text-stroke: 1px color-mix(in oklab, var(--pl-coral) 70%, transparent); opacity: 0; transition: opacity 200ms var(--pl-ease-out); font-family: system-ui, -apple-system, sans-serif; }
    .ghost.on { opacity: .55; }
    .dots { position: absolute; z-index: 5; display: flex; flex-direction: column; gap: 5px; pointer-events: none; }
    .dots i { width: 6px; height: 6px; border-radius: 50%; background: var(--pl-ink-3); opacity: .35; transition: opacity 160ms, scale 220ms var(--pl-spring-pop), background-color 160ms; }
    .dots i.hard { background: var(--pl-coral); opacity: .9; }
    .dots i.here { opacity: 1; scale: 1.5; background: var(--pl-sky); }

    /* B: the ladder */
    .ladder { position: relative; flex: none; width: 210px; padding: 12px 10px; border-radius: 16px; background: var(--pl-paper); box-shadow: var(--pl-shadow-card); }
    .ladder header { padding: 0 4px 8px; font: var(--pl-round-w, 600) 14px/1 var(--pl-round); }
    .rung { position: relative; display: grid; grid-template-columns: 40px 1fr auto; align-items: center; gap: 8px; height: 46px; padding: 0 8px; border-radius: 10px; cursor: pointer; transition: background-color 140ms; }
    .rung + .rung { border-top: 1px solid var(--pl-rule); }
    .rung:hover, .rung.over { background: color-mix(in oklab, var(--pl-sky) 12%, transparent); }
    .rung .ag { font-family: system-ui, sans-serif; color: var(--pl-ink); text-align: center; line-height: 1; }
    .rung b { font: 600 12.5px/1.2 var(--pl-sans); } .rung b small { display: block; font: 500 11px/1.3 var(--pl-mono); color: var(--pl-ink-3); }
    .rung .n { font: 600 11px/1 var(--pl-sans); color: var(--pl-ink-3); }
    .chip { position: absolute; z-index: 3; left: 8px; right: 8px; display: flex; align-items: center; gap: 6px; height: 26px; padding: 0 8px; border-radius: 8px; background: var(--pl-coral); color: var(--pl-coral-on); font: 600 11.5px/1 var(--pl-sans); cursor: grab; touch-action: none; box-shadow: 0 6px 14px -6px color-mix(in oklab, var(--pl-coral) 80%, transparent); transition: top 320ms var(--pl-spring-pop), background-color 160ms; }
    .chip.dragging { cursor: grabbing; transition: none; scale: 1.04; }
    .chip.kept { background: var(--pl-mint); color: var(--pl-mint-on); box-shadow: none; }
    .site [data-style].lit { outline: 1.5px solid var(--pl-sky); outline-offset: 3px; border-radius: 3px; }

    /* C: the picker of a look */
    .stage.picking .site [data-style] { cursor: copy; }
    .site [data-style].hov { outline: 1.5px solid var(--pl-sky); outline-offset: 3px; border-radius: 3px; background: color-mix(in oklab, var(--pl-sky) 8%, transparent); }
    .act { position: absolute; z-index: 5; }

    /* D: one answer */
    .answer { position: absolute; z-index: 5; width: 300px; padding: 14px 14px 12px; border-radius: 16px; background: var(--pl-paper); box-shadow: var(--pl-shadow-card); display: grid; gap: 10px; }
    .answer .big { display: flex; align-items: center; gap: 10px; }
    .answer .big .ag { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 10px; background: var(--pl-paper-2); font: 700 22px/1 system-ui, sans-serif; letter-spacing: -0.025em; }
    .answer .big b { font: var(--pl-round-w, 600) 17px/1.15 var(--pl-round); } .answer .big b small { display: block; margin-top: 3px; font: 500 12px/1.3 var(--pl-sans); color: var(--pl-ink-2); }
    .answer ul { margin: 0; padding: 0; list-style: none; display: grid; gap: 4px; font: 500 12.5px/1.4 var(--pl-sans); color: var(--pl-ink-2); }
    .answer li::before { content: '✓'; display: inline-block; width: 16px; color: var(--pl-mint-ink); font-weight: 700; }
    .answer li.minus::before { content: '±'; color: var(--pl-ink-3); }
    .answer .row2 { display: flex; align-items: center; gap: 8px; }
    .answer .other { all: unset; margin-left: auto; font: 600 12px/1 var(--pl-sans); color: var(--pl-ink-2); cursor: pointer; }
    .answer .other:hover { color: var(--pl-ink); }
    .answer .alts { display: grid; gap: 2px; border-top: 1px solid var(--pl-rule); padding-top: 8px; }
    .answer .alts[hidden] { display: none; }
    .answer .alts button { all: unset; display: grid; grid-template-columns: 1fr auto; gap: 8px; padding: 7px 8px; border-radius: 8px; cursor: pointer; font: 600 12.5px/1 var(--pl-sans); }
    .answer .alts button:hover { background: var(--pl-paper-2); }
    .answer .alts span { font: 500 11.5px/1 var(--pl-mono); color: var(--pl-ink-3); }
    @media (prefers-reduced-motion: reduce) { .site h1, .chip, .dots i { transition: none !important; } }
  </style>
  ${scene('a', 'A · Try styles on the element', 'No panel. Point at the hero heading and scroll (or drag up and down on it): it becomes each of your text styles in place, starting with the closest, while a coral ghost of the original stays behind it so you see what changes. The pill says which style and how many places use it. The first step is always the closest style. Click to keep; Esc puts it back.')}
  ${scene('b', 'B · The page’s type ladder', 'Every text style this page uses, as rungs from biggest to smallest, with how many elements use each. Point at a rung and its elements light up on the page. The hard-coded heading is the coral chip, hanging where its size falls; drag it onto a rung (or click one) and it takes that style.', `<aside class="ladder"><header>Type on this page</header><div class="rungs"></div></aside>`)}
  ${scene('c', 'C · Make it like that one', 'Press Match on the heading, then click any text on the page that looks right. The heading takes that element’s style, and plumber says which style it is and how many places now use it.')}
  ${scene('d', 'D · One answer, then why', 'Plumber leads with its best guess and its reasons, and one button. The other styles are folded away for when you disagree.')}`;

  const rel = (stage, el) => { const s = stage.getBoundingClientRect(), b = el.getBoundingClientRect(); return { left: b.left - s.left, top: b.top - s.top, right: b.right - s.left, bottom: b.bottom - s.top, width: b.width, height: b.height }; };
  const uses = (stage, name) => stage.querySelectorAll(`.site [data-style="${name}"]`).length;
  const pillAt = (stage, h1, html, cls = '') => {
    let p = stage.querySelector(':scope > .pill.main');
    if (!p) { p = document.createElement('div'); p.className = 'pill main'; stage.append(p); }
    p.className = `pill main ${cls}`; p.innerHTML = html; p.hidden = false;
    const r = rel(stage, h1); p.style.left = `${r.left}px`; p.style.top = `${r.top - 42}px`;
    return p;
  };
  const restore = (h1) => { set(h1, HARD); h1.className = 'hard'; };

  // ── A: scroll on the heading to try each style in place ──
  {
    const stage = root.querySelector('#a .stage'), h1 = stage.querySelector('h1');
    const order = [HARD, ...STY];                     // the hard-coded type is a stop too, so you can scroll back to it
    const sorted = [...order].sort((x, y) => y.fs - x.fs);
    let at = sorted.indexOf(HARD), kept = false;
    const ghost = document.createElement('div'); ghost.className = 'ghost'; ghost.textContent = h1.textContent; stage.append(ghost);
    const dots = document.createElement('div'); dots.className = 'dots'; dots.innerHTML = sorted.map((s) => `<i class="${s.hard ? 'hard' : ''}"></i>`).join(''); stage.append(dots);
    const placeExtras = () => {
      const r = rel(stage, h1), w = h1.getBoundingClientRect().width;
      ghost.style.cssText = `left:${r.left}px;top:${r.top}px;width:${h1.parentElement.getBoundingClientRect().width}px;${styleCss(HARD)}`;
      dots.style.left = `${r.left - 22}px`; dots.style.top = `${r.top + 4}px`;
    };
    const show = () => {
      const s = sorted[at];
      set(h1, s);
      h1.className = kept ? 'kept' : s.hard ? 'hard' : 'trying';
      ghost.classList.toggle('on', !s.hard && !kept);
      [...dots.children].forEach((d, i) => d.classList.toggle('here', i === at && !s.hard));
      const pill = pillAt(stage, h1, s.hard ? `Hard-coded <small>34px · 1.2 · 600</small> <kbd>scroll</kbd>` : kept ? `Kept ${s.name}` : `${s.name} <small>${s.fs}/${s.lh}</small> <span class="n">${uses(stage, s.name)}</span> <kbd>click</kbd>`, s.hard ? 'hard' : '');
      const site = rel(stage, stage.querySelector('.site')), hr = rel(stage, h1); pill.style.left = `${site.right - pill.offsetWidth - 22}px`; pill.style.top = `${hr.top - 40}px`;
      requestAnimationFrame(placeExtras);
    };
    // the closest style first: the first scroll goes to it, whichever way
    const step = (dir) => {
      if (kept) return;
      if (sorted[at].hard) at = sorted.indexOf(nearest()[0]);
      else at = Math.max(0, Math.min(sorted.length - 1, at + dir));
      show();
    };
    let acc = 0;
    h1.addEventListener('wheel', (e) => { e.preventDefault(); acc += e.deltaY; if (Math.abs(acc) > 40) { step(Math.sign(acc)); acc = 0; } }, { passive: false });
    h1.addEventListener('pointerdown', (e) => {
      if (kept) return;
      const y0 = e.clientY; let moved = false; try { h1.setPointerCapture(e.pointerId); } catch {}
      const move = (m) => { const d = m.clientY - y0; if (Math.abs(d) > 4) moved = true; const k = Math.trunc(d / 22); if (k) { step(Math.sign(k)); y0Ref.v = m.clientY; } };
      const y0Ref = { v: y0 };
      const mv = (m) => { const d = m.clientY - y0Ref.v; if (Math.abs(d) > 4) moved = true; if (Math.abs(d) >= 22) { step(Math.sign(d)); y0Ref.v = m.clientY; } };
      const up = () => { h1.removeEventListener('pointermove', mv); h1.removeEventListener('pointerup', up); if (!moved && !sorted[at].hard) { kept = true; show(); } };
      h1.addEventListener('pointermove', mv); h1.addEventListener('pointerup', up);
    });
    stage.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); step(1); } else if (e.key === 'ArrowUp') { e.preventDefault(); step(-1); }
      else if (e.key === 'Enter' && !sorted[at].hard) { kept = true; show(); }
      else if (e.key === 'Escape') { kept = false; at = sorted.indexOf(HARD); show(); }
    });
    h1.style.cursor = 'ns-resize'; h1.style.touchAction = 'none';
    new ResizeObserver(placeExtras).observe(stage); show();
  }

  // ── B: the page's type ladder ──
  {
    const stage = root.querySelector('#b .stage'), h1 = stage.querySelector('h1'), rungs = stage.querySelector('.rungs');
    rungs.innerHTML = STY.map((s) => `<div class="rung" data-name="${s.name}"><span class="ag" style="font-size:${Math.min(26, Math.max(11, s.fs * 0.55))}px;font-weight:${s.fw}">Ag</span><b>${s.name}<small>${s.fs}/${s.lh}</small></b><span class="n">${uses(stage, s.name)}</span></div>`).join('');
    const chip = document.createElement('div'); chip.className = 'chip'; chip.innerHTML = `<span>●</span>hero heading · 34px`; rungs.append(chip); rungs.style.position = 'relative';
    let kept = null;
    // the chip hangs where 34px falls between the rungs
    const hang = () => {
      const list = [...rungs.querySelectorAll('.rung')];
      if (kept) { const r = list.find((x) => x.dataset.name === kept); chip.style.top = `${r.offsetTop + 10}px`; return; }
      const i = STY.findIndex((s) => s.fs < HARD.fs); const a = list[i - 1], b = list[i];
      chip.style.top = `${(a.offsetTop + a.offsetHeight + b.offsetTop) / 2 - 13}px`;
    };
    const light = (name, on) => { for (const el of stage.querySelectorAll(`.site [data-style="${name}"]`)) el.classList.toggle('lit', on); };
    const take = (name) => {
      const s = STY.find((x) => x.name === name); kept = name; set(h1, s); h1.className = 'kept'; h1.dataset.style = name;
      chip.classList.add('kept'); chip.innerHTML = `<span>✓</span>hero heading · ${name}`;
      for (const r of rungs.querySelectorAll('.rung')) r.querySelector('.n').textContent = uses(stage, r.dataset.name);
      hang();
    };
    for (const r of rungs.querySelectorAll('.rung')) {
      r.addEventListener('pointerenter', () => light(r.dataset.name, true));
      r.addEventListener('pointerleave', () => light(r.dataset.name, false));
      r.addEventListener('click', () => take(r.dataset.name));
    }
    chip.addEventListener('pointerdown', (e) => {
      e.preventDefault(); try { chip.setPointerCapture(e.pointerId); } catch {} chip.classList.add('dragging');
      const y0 = e.clientY, t0 = chip.offsetTop; let over = null;
      const mv = (m) => {
        chip.style.top = `${t0 + m.clientY - y0}px`;
        const mid = chip.offsetTop + 13; over = null;
        for (const r of rungs.querySelectorAll('.rung')) { const hit = mid > r.offsetTop && mid < r.offsetTop + r.offsetHeight; r.classList.toggle('over', hit); light(r.dataset.name, hit); if (hit) over = r.dataset.name; }
        // the heading previews the style it is over
        const s = STY.find((x) => x.name === over); set(h1, s || HARD); h1.className = s ? 'trying' : 'hard';
      };
      const up = () => { chip.removeEventListener('pointermove', mv); chip.removeEventListener('pointerup', up); chip.classList.remove('dragging'); for (const r of rungs.querySelectorAll('.rung')) { r.classList.remove('over'); light(r.dataset.name, false); } if (over) take(over); else { restore(h1); hang(); } };
      chip.addEventListener('pointermove', mv); chip.addEventListener('pointerup', up);
    });
    new ResizeObserver(hang).observe(stage); hang();
  }

  // ── C: make it like that one ──
  {
    const stage = root.querySelector('#c .stage'), h1 = stage.querySelector('h1');
    const act = document.createElement('div'); act.className = 'act'; act.innerHTML = button('Match…', { cls: 'sm quiet', key: 'M', attrs: 'data-do="match"' }); stage.append(act);
    const placeAct = () => { const r = rel(stage, h1); act.style.left = `${r.left}px`; act.style.top = `${r.top - 46}px`; };
    let picking = false;
    const lb = () => act.querySelector('.lb');
    const start = () => { picking = true; stage.classList.add('picking'); lb().textContent = 'Click text that looks right'; };
    const stop = () => { picking = false; stage.classList.remove('picking'); for (const el of stage.querySelectorAll('.hov')) el.classList.remove('hov'); stage.querySelector(':scope > .pill.main')?.setAttribute('hidden', ''); };
    act.addEventListener('click', () => (picking ? (stop(), lb().textContent = 'Match…') : start()));
    stage.addEventListener('pointerover', (e) => {
      if (!picking) return; const el = e.target.closest('.site [data-style]'); for (const x of stage.querySelectorAll('.hov')) if (x !== el) x.classList.remove('hov');
      if (!el) return; el.classList.add('hov'); const s = STY.find((x) => x.name === el.dataset.style);
      // the heading previews the look under the pointer
      set(h1, s); h1.className = 'trying';
      const p = pillAt(stage, el, `${s.name} <small>${s.fs}/${s.lh}</small> <span class="n">${uses(stage, s.name)}</span>`); const r = rel(stage, el); p.style.top = `${r.top - 38}px`;
    });
    stage.addEventListener('pointerout', (e) => { if (picking && !stage.contains(e.relatedTarget)) restore(h1); });
    stage.addEventListener('click', (e) => {
      if (!picking) return; const el = e.target.closest('.site [data-style]'); if (!el) return;
      const s = STY.find((x) => x.name === el.dataset.style); stop(); set(h1, s); h1.className = 'kept'; h1.dataset.style = s.name;
      lb().textContent = `Matched ${s.name} · now ${uses(stage, s.name)} places`;
    });
    stage.addEventListener('keydown', (e) => { if (e.key === 'm' || e.key === 'M') start(); if (e.key === 'Escape') { stop(); restore(h1); lb().textContent = 'Match…'; } });
    new ResizeObserver(placeAct).observe(stage); placeAct();
  }

  // ── D: one answer, then why ──
  {
    const stage = root.querySelector('#d .stage'), h1 = stage.querySelector('h1');
    const [best, ...rest] = nearest();
    const others = stage.querySelectorAll('.site h2');
    const card = document.createElement('div'); card.className = 'answer'; stage.append(card);
    const why = (s) => {
      const d = s.fs - HARD.fs, peers = uses(stage, s.name), sameWeight = [...others].some((o) => o.dataset.style === s.name);
      return [
        `${Math.abs(d)}px ${d > 0 ? 'bigger' : 'smaller'} than now, the nearest size you have`,
        peers ? `${peers} other heading${peers > 1 ? 's' : ''} on this page already use${peers > 1 ? '' : 's'} it` : 'nothing else on this page uses it yet',
        `${s.fw === HARD.fw ? 'Same weight' : `Weight ${HARD.fw} → ${s.fw}`}, line height ${HARD.lh} → ${s.lh}`,
      ];
    };
    const draw = (s, kept = false) => {
      const w = why(s);
      card.innerHTML = `<div class="big"><span class="ag" style="font-weight:${s.fw}">Ag</span><b>This is ${s.name}<small>${s.fs}px / ${s.lh} · ${s.fw}</small></b></div>
        <ul><li>${w[0]}</li><li>${w[1]}</li><li class="minus">${w[2]}</li></ul>
        <div class="row2">${button(kept ? `Using ${s.name}` : `Use ${s.name}`, { cls: `sm${kept ? ' done' : ''}`, key: '↵', attrs: 'data-do="use"' })}<button type="button" class="other">Other styles ▾</button></div>
        <div class="alts" hidden>${rest.slice(0, 4).map((x) => `<button type="button" data-name="${x.name}">${x.name}<span>${x.fs}/${x.lh} · ${x.fs - HARD.fs > 0 ? '+' : ''}${x.fs - HARD.fs}px</span></button>`).join('')}</div>`;
      const r = rel(stage, h1); card.style.left = `${Math.min(r.left + 260, stage.clientWidth - 316)}px`; card.style.top = `${r.bottom + 14}px`;
    };
    let current = best;
    card.addEventListener('pointerover', (e) => { const b = e.target.closest('.alts [data-name]'); if (b) { set(h1, STY.find((x) => x.name === b.dataset.name)); h1.className = 'trying'; } else if (e.target.closest('[data-do="use"]')) { set(h1, current); h1.className = 'trying'; } });
    card.addEventListener('pointerleave', () => { if (!h1.classList.contains('kept')) restore(h1); });
    card.addEventListener('click', (e) => {
      if (e.target.closest('.other')) { card.querySelector('.alts').hidden = !card.querySelector('.alts').hidden; return; }
      const alt = e.target.closest('.alts [data-name]'); if (alt) { current = STY.find((x) => x.name === alt.dataset.name); draw(current); return; }
      if (e.target.closest('[data-do="use"]')) { set(h1, current); h1.className = 'kept'; h1.dataset.style = current.name; draw(current, true); }
    });
    stage.addEventListener('keydown', (e) => { if (e.key === 'Enter') { set(h1, current); h1.className = 'kept'; draw(current, true); } if (e.key === 'Escape') { restore(h1); draw(current); } });
    new ResizeObserver(() => draw(current, h1.classList.contains('kept'))).observe(stage); draw(best);
  }
  if (still) for (const h of root.querySelectorAll('.site h1')) h.style.transition = 'none';
}
