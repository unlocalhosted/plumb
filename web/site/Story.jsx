'use client';
// One fault of a kind, told where the visitor is (site/Floor.jsx). The real piece from the homepage comes up here as
// a still copy, large; the fault is said in plain words; a switch flips the copy between as it is and fixed, with the
// product's own show (overlay/src/show.js); then the rest of the kind is offered. Nothing on the page changes until
// "Fix all" is pressed (interaction-principles 28: preview, then write).
import { useEffect, useRef, useState } from 'react';
import { Scope } from '../../overlay/src/scope.js';
import { play, PageGuides, BEAT, SPRING } from '../../overlay/src/show.js';
import { reduced } from '../../overlay/src/motion.js';
import { burst } from '../../overlay/src/burst.js';
import { ITEMS } from './fixes.js';

// a kind's story: the rule that is shown, the piece to show it on, and the words
export const STORIES = {
  shadow: {
    rule: 'craft/layered-shadow',
    piece: '.tok-card',
    prop: 'box-shadow',
    pill: ['one blur', 'layered'],
    was: ['This shadow is one big blur. It looks like a smudge under the card.', 'one blur'],
    fixed: ['Now it is four small shadows, stacked. The card sits on the page.', 'blurs of 6, 12, 24 and 48px'],
    same: (n) => `${n} more ${n === 1 ? 'shadow is' : 'shadows are'} one big blur like this.`,
    other: (n) => `${n} more ${n === 1 ? 'is' : 'are'} grey on a coloured surface.`,
    made: (n) => `${n} shadows fixed.`,
  },
};

// a still copy of a piece of the page that looks the same anywhere: every element carries the styles it had there
function copyOf(el) {
  const copy = el.cloneNode(true);
  const from = [el, ...el.querySelectorAll('*')], to = [copy, ...copy.querySelectorAll('*')];
  from.forEach((s, i) => {
    const c = getComputedStyle(s);
    let css = '';
    for (const p of c) css += `${p}:${c.getPropertyValue(p)};`;
    for (const a of [...to[i].attributes]) if (a.name !== 'style') to[i].removeAttribute(a.name);
    to[i].style.cssText = `${css}animation:none;transition:none;`;
  });
  Object.assign(copy.style, { margin: '0', position: 'relative', inset: 'auto', transform: 'none', translate: 'none', flex: 'none' });
  copy.inert = true;
  copy.setAttribute('aria-hidden', 'true');
  return copy;
}

/**
 * @param toy    the kind being told
 * @param fixes  the visit's fixes (fixes.js)
 * @param left   how many faults the page still has
 * @param onMade called after the kind is fixed, so the floor counts again
 * @param onClose
 */
export function Story({ toy, fixes, left, onMade, onClose }) {
  const tell = STORIES[toy];
  const tray = useRef(null), piece = useRef(null), run = useRef(null), was = useRef(''), root = useRef(null);
  const [side, setSide] = useState('was');
  const [flipped, setFlipped] = useState(false);
  const [made, setMade] = useState(0);
  const [it, setIt] = useState(null);
  const list = useRef([]);

  useEffect(() => {
    list.current = fixes.open(toy);
    const i = list.current.find((n) => ITEMS[n].rule === tell.rule && document.querySelector(ITEMS[n].sel[0])?.matches(tell.piece))
      ?? list.current.find((n) => ITEMS[n].rule === tell.rule);
    const el = i === undefined ? null : document.querySelector(ITEMS[i].sel[0]);
    if (!el) { onClose(); return undefined; }
    const copy = copyOf(el);
    was.current = copy.style.getPropertyValue(tell.prop);
    copy.style.zoom = String(Math.min(1.5, 300 / el.offsetWidth, 230 / el.offsetHeight));
    tray.current.replaceChildren(copy);
    piece.current = copy;
    const same = list.current.filter((n) => ITEMS[n].rule === tell.rule).length - 1;
    setIt({ i, at: ITEMS[i].at, same, other: list.current.length - 1 - same, all: list.current.length });
    root.current.scrollIntoView({ block: 'nearest', behavior: reduced() ? 'instant' : 'smooth' });
    return () => { run.current?.end(); };
  }, []);

  function flip(to) {
    if (to === side || !piece.current) return;
    run.current?.end();
    setSide(to);
    const el = piece.current, value = to === 'fixed' ? ITEMS[it.i].make.css[tell.prop] : was.current;
    const set = () => { el.style.transition = reduced() ? 'none' : `${tell.prop} ${BEAT.move}ms ${SPRING}`; el.style.setProperty(tell.prop, value); };
    if (to === 'was' || reduced()) { set(); if (to === 'fixed') setFlipped(true); return; }
    // the product's show: the guides mark the piece and say what it has, it moves, the pill lands on what it became
    const scope = new Scope(), guides = new PageGuides(document.body);
    run.current = scope;
    let done = false;
    const morph = () => { if (!done) { done = true; set(); } };
    scope.onEnd(() => { morph(); guides.remove(); });
    const bands = [{ el, rect: () => el.getBoundingClientRect() }];
    play([{ look: 'ring', from: tell.pill[0], to: tell.pill[1], chip: null, bands: () => bands, morph }], { guides, signal: scope.signal })
      .then(() => scope.end(), () => scope.end());
    setFlipped(true);
  }

  function fixAll(e) {
    run.current?.end();
    fixes.make(list.current);
    setMade(list.current.length);
    if (side !== 'fixed') { setSide('fixed'); piece.current.style.setProperty(tell.prop, ITEMS[it.i].make.css[tell.prop]); }
    const r = e.currentTarget.getBoundingClientRect();
    burst(document.body, r.left + r.width / 2, r.top + r.height / 2, { pieces: 40 });
    onMade();
  }

  const [say, small] = tell[side];
  return (
    <div ref={root} className="story" data-side={side}>
      <div ref={tray} className="story-tray" />
      <div className="story-words">
        <p className="story-say" key={side} role="status">{say}</p>
        <p className="story-small">{small}{it && side === 'was' ? <> · <code>{it.at}</code></> : null}</p>
        <div className="story-flip" role="group" aria-label="Show it">
          <button type="button" className={`s-btn ${side === 'was' ? '' : 'q'}`} aria-pressed={side === 'was'} onClick={() => flip('was')}><span>As it is</span></button>
          <button type="button" className={`s-btn ${side === 'fixed' ? '' : 'q'}`} aria-pressed={side === 'fixed'} onClick={() => flip('fixed')}><span>Fixed</span></button>
        </div>
        {it && flipped && !made && (
          <div className="story-rest">
            <p>{it.same > 0 && tell.same(it.same)} {it.other > 0 && tell.other(it.other)}</p>
            <button type="button" className="s-btn" onClick={fixAll}><span>Fix all {it.all}</span></button>
          </div>
        )}
        {made > 0 && (
          <div className="story-rest">
            <p role="status">{tell.made(made)} {left} faults left.</p>
            <button type="button" className="s-btn q" onClick={onClose}><span>Close</span></button>
          </div>
        )}
      </div>
    </div>
  );
}
