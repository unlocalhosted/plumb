// A principle as a marketing film for React Plumber: one 16:9 stage (1600 × 900, scaled to the window), nothing of the
// showcase around it. Signed as a piece of craft: the principle's number and name, top left, in the toy face; React
// Plumber's mark, bottom right, quiet, on every frame (the two-block P with its guardrail, chosen 2026-11-13).
//
// THE FRAME (ms)
//      0   OPENING   the desk, empty
//    250             the principle's number, then its name, large in the middle of the stage (rise on the spring)
//   1800             the name travels up to its corner and becomes the signature; the card rises in beneath it
//   2600             the film plays (Film.jsx: feel it, measure it, why it holds, payoff)
//    end   CLOSING   the card and the signature step back; the mark travels from its corner to the middle and grows;
//                    the mark's guardrails draw themselves on and the DOM tree appears in its leg; under it, the site's line
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { PRINCIPLES } from './catalogue.js';
import { Film, beat } from './Film.jsx';
import { ensureLook } from './look.js';
import { STEM, BOWL, LEG, TREE, JOINTS } from '../../../src/mark.js';

ensureLook();
const SCREENS = Object.fromEntries(Object.entries(import.meta.glob('./screens/[0-9]*.jsx', { eager: true })).map(([, m]) => [m.n, m]));
const STAGE = { w: 1600, h: 900, edge: 56 };
const TIMING = {
  name:     150,   // the signature and the card come in together: the card already in on its subject, the problem on screen
  travel:   700,   // (the opening no longer centres the name: a title on an empty desk gave a feed nothing to look at)
  clear:      0,
  film:    1500,   // the film begins
  back:     300,   // closing: after the film, the card and signature step back
  mark:     700,   // the mark travels to the middle
  line:    1500,   // the site's line under it
  says:    4800,   // a scripted film: the closing words held before the mark comes in (15 words)
};
const CLOSING = 'React Plumber is a smart design engineer in your app, looking for 100+ design issues.';   // the owner's words, 2026-11-15
const MOVE = 'cubic-bezier(0.7, 0, 0.3, 1)';
const FIT = 0.95; // a film without a script: card and switch stacked                                  // a scripted film: the card and switch a step smaller, so the story's line fits under them
const MARKS = 1.4;                                 // a scripted film: plumber's marks (pills, the change card) a step under the story's 30px line, never louder
const FILM_UI = 2;                                 // plumber's marks at twice their showcase size: a film is watched smaller than it is made      // the camera's curve: slow start, slow finish
const LINE = 'A design review on every screen.';   // the site's hero line (homepage/src/hero)

// React Plumber's mark (overlay/src/mark.js; the design site's Logo page): a solid P, pink stem and violet bowl, each
// lit from the top, inside a drawn R: its leg is only an outline in plumber's tool blue. In the corner it is the plain
// outline. With `guards` (the closing, where it grows) it becomes the hero: the leg thins to dashes, the small DOM tree
// appears inside it, and the guardrails the mark is built in draw themselves on.
const GUARD = '#2f86dc';
// the mark's two parts, from the one source the site's bar and the overlay's dock draw from too
const Mark = ({ size, guards = false }) => (
  <svg viewBox="0 0 120 120" width={size} height={size} aria-hidden="true" style={{ overflow: 'visible' }}>
    <defs>
      <linearGradient id="mk-stem" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ff7ac0" /><stop offset=".55" stopColor="#f24a9f" /><stop offset="1" stopColor="#d0287f" /></linearGradient>
      <linearGradient id="mk-bowl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#9a7dff" /><stop offset=".55" stopColor="#7356f0" /><stop offset="1" stopColor="#5232d4" /></linearGradient>
      <linearGradient id="mk-lit" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".42" /><stop offset=".25" stopColor="#fff" stopOpacity="0" /></linearGradient>
    </defs>
    {guards ? (
      <g stroke={GUARD} strokeWidth=".5" strokeDasharray="1.4 1.8" strokeLinecap="round" fill="none" style={{ animation: 'mk-guide 700ms ease 900ms both' }}>
        <path d="M6 18H114" /><path d="M6 102H114" /><path d="M24 2V118" /><path d="M96 2V118" />
      </g>
    ) : null}
    <path d={STEM} fill="url(#mk-stem)" /><path d={STEM} fill="url(#mk-lit)" style={{ mixBlendMode: 'soft-light' }} />
    <path d={BOWL} fill="url(#mk-bowl)" /><path d={BOWL} fill="url(#mk-lit)" style={{ mixBlendMode: 'soft-light' }} />
    <path d={LEG} fill={GUARD} fillOpacity={guards ? 0.1 : 0.2} stroke={GUARD} strokeLinejoin="round" strokeDasharray={guards ? '1.5 1.4' : undefined}
      style={{ strokeWidth: guards ? 0.7 : 3, transition: 'stroke-width 700ms ease 500ms, fill-opacity 700ms ease 500ms' }} />
    {guards ? (
      <g fill="none" stroke={GUARD} strokeWidth=".5" style={{ animation: 'mk-pill 420ms cubic-bezier(.3, 1.5, .5, 1) 1500ms both', transformOrigin: '79px 90px' }}>
        <path d={JOINTS} />
        {TREE.map(([x, y]) => <rect key={y} x={x} y={y} width="10" height="4" rx="1.4" />)}
      </g>
    ) : null}
  </svg>
);

// the story's line, word by word: each word comes into focus in turn (the films are about what the eye sees sharp), and a
// *marked* word is then underlined, drawn left to right in plumber's colours: coral while it names the problem, mint once
// it names the fix
const WORD = 55, FOCUS = 460;
function Line({ text, fixed }) {
  const words = text.split(' ');
  return words.map((w, i) => {
    const marked = /^\*.+\*[.,]?$/.test(w), bare = w.replace(/\*/g, ''), [, core, tail] = bare.match(/^(.*?)([.,]?)$/);
    return (
      <span key={i} style={{ display: 'inline-block', whiteSpace: 'pre', animation: `film-word ${FOCUS}ms cubic-bezier(.2, .7, .2, 1) ${i * WORD}ms both` }}>
        {marked ? <span style={{ backgroundImage: `linear-gradient(var(--pl-${fixed ? 'mint' : 'coral'}), var(--pl-${fixed ? 'mint' : 'coral'}))`, backgroundRepeat: 'no-repeat', backgroundPosition: '0 92%',
          backgroundSize: '0% 3px', animation: `film-ink 420ms cubic-bezier(.6, 0, .2, 1) ${words.length * WORD + FOCUS}ms both` }}>{core}</span> : core}{tail}{i < words.length - 1 ? ' ' : ''}
      </span>
    );
  });
}

export function FilmPage({ n }) {
  const p = PRINCIPLES.find((x) => x.n === n), screen = SCREENS[n], Example = screen?.default;
  const [k, setK] = useState(1);
  const [phase, setPhase] = useState('empty');     // empty · name · film · playing · back · mark · line
  const [caption, setCaption] = useState(null);    // the script's line now on screen (a film with spec.script): { text, at }
  const [nod, setNod] = useState(0);               // the brand nods once, when the fix lands and the burst fires
  const sig = useRef(null), mark = useRef(null), stack = useRef(null);
  const [fh, setFh] = useState(0);                 // the card and switch's own height, so the scaled stack takes only the room it shows
  useLayoutEffect(() => { const el = stack.current; if (!el) return; const ro = new ResizeObserver(() => setFh(el.offsetHeight)); ro.observe(el); return () => ro.disconnect(); }, []);
  const [to, setTo] = useState(null);              // where the name and the mark travel from / to: their centred transforms
  useEffect(() => {
    document.title = `${n} · ${p?.title ?? ''} · React Plumber`;
    window.__filmSpec = Example?.film ? { script: Example.film.script ?? null, teach: Example.film.teach ?? null } : null; // read by film-script-check
    document.body.style.background = 'var(--pl-desk, #fff)';
    const fit = () => setK(Math.min(innerWidth / STAGE.w, innerHeight / STAGE.h));
    fit(); addEventListener('resize', fit);
    return () => removeEventListener('resize', fit);
  }, [n]);
  // the centre of the stage, as a move from each one's own corner (measured in the stage's own pixels, once the faces are in)
  useLayoutEffect(() => {
    let gone = false;
    // the two faces themselves, not just whatever was loading: a name measured in the fallback face lands off centre
    const faces = document.fonts ? Promise.all(['750 34px "Bricolage Grotesque"', '800 15px "Bricolage Grotesque"', '400 22px "Instrument Sans"'].map((f) => document.fonts.load(f))).then(() => document.fonts.ready) : Promise.resolve();
    faces.then(() => {
      if (gone || !sig.current || !mark.current) return;
      // centred by what is drawn, not by the box: a wrapped name's box is as wide as it may grow, wider than its lines
      const drawn = (el) => {
        // the text runs themselves (a range over the element would give its children's boxes, each as wide as the column)
        const r = document.createRange(), walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), ink = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity };
        for (let node = walk.nextNode(); node; node = walk.nextNode()) { r.selectNodeContents(node); for (const q of r.getClientRects()) { ink.left = Math.min(ink.left, q.left); ink.top = Math.min(ink.top, q.top); ink.right = Math.max(ink.right, q.right); ink.bottom = Math.max(ink.bottom, q.bottom); } }
        ink.width = ink.right - ink.left; ink.height = ink.bottom - ink.top;
        const box = el.getBoundingClientRect(), s = box.width / el.offsetWidth || 1;
        return { x: el.offsetLeft + (ink.left - box.left) / s, y: el.offsetTop + (ink.top - box.top) / s, w: ink.width / s, h: ink.height / s };
      };
      const at = (el, s, y) => { const d = drawn(el), ox = el.offsetLeft + el.offsetWidth / 2, oy = el.offsetTop + el.offsetHeight / 2;
        // the scale is about the box's centre, so the drawn centre moves with it: move that point to the stage's centre
        const cx = d.x + d.w / 2, cy = d.y + d.h / 2, sx = ox + (cx - ox) * s, sy = oy + (cy - oy) * s;
        return `translate(${STAGE.w / 2 - sx}px, ${y - sy}px) scale(${s})`; };
      setTo({ name: at(sig.current, 1.6, STAGE.h / 2), mark: at(mark.current, 3.4, STAGE.h / 2 - 30) });
    });
    return () => { gone = true; };
  }, []);
  useEffect(() => { if (phase !== 'empty') beat(`frame: ${phase}`); }, [phase]);
  useEffect(() => {
    if (!to) return;
    const t = [setTimeout(() => setPhase('name'), TIMING.name), setTimeout(() => setPhase('film'), TIMING.travel), setTimeout(() => setPhase('playing'), TIMING.film)];
    return () => t.forEach(clearTimeout);
  }, [to]);
  const scripted = !!Example?.film?.script;
  const done = () => {
    const hold = scripted ? TIMING.says : 0;
    setTimeout(() => { setPhase('back'); if (scripted) setCaption({ text: CLOSING, at: 'close' }); }, TIMING.back);
    setTimeout(() => { setPhase('mark'); setCaption({ text: '', at: 'close' }); }, TIMING.back + hold + TIMING.mark);
    setTimeout(() => setPhase('line'), TIMING.back + hold + TIMING.line);
  };
  // the line on screen: the script's first line from the first frame (the question asked at once), then whatever the film says
  // a scripted film puts the demo on the left, as tall as the stage allows, and the words, the switch and plumber's change
  // card in a column on its right (owner's pick, 2026-11-15: stacked under it, the demo was small in a wide frame)
  const side = scripted;
  const fit = side ? 1.1 : FIT;
  const on = phase === 'name' || phase === 'film' || phase === 'playing';
  const said = caption ?? (scripted ? Example.film.script[0] : { text: '' });
  const closingWords = scripted && said.at === 'close';
  if (!Example?.film) return <p style={{ padding: 40 }}>No film for № {n} yet.</p>;
  const centred = false, shown = phase !== 'empty';
  const closing = phase === 'back' || phase === 'mark' || phase === 'line', marked = phase === 'mark' || phase === 'line';
  return (
    <div className="pl-light" style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', overflow: 'hidden', background: 'var(--pl-desk)' }}>
      {/* plumber's own overlay (its toasts, its Alt pill) runs on this dev page; it is not part of the film */}
      <style>{'plumb-overlay { display: none !important; } @keyframes mk-guide { from { opacity: 0; stroke-dashoffset: 40 } to { opacity: 1; stroke-dashoffset: 0 } } @keyframes mk-pill { from { opacity: 0; transform: scale(.6) } to { opacity: 1; transform: scale(1) } } @keyframes film-word { from { opacity: 0; transform: translateY(6px); filter: blur(5px) } to { opacity: 1; transform: none; filter: none } } @keyframes film-ink { from { background-size: 0% 3px } to { background-size: 100% 3px } } @keyframes mk-nod { 0% { transform: none } 22% { transform: scale(.86) rotate(-6deg); animation-timing-function: cubic-bezier(.3, 1.6, .5, 1) } 100% { transform: none } }'}</style>
      <div style={{ position: 'relative', width: STAGE.w, height: STAGE.h, flex: 'none', transform: `scale(${k})`, background: 'var(--pl-desk)', color: 'var(--pl-ink)', visibility: to ? 'visible' : 'hidden' }}>
        {/* the signature: which piece of craft this is; it opens the film large in the middle, then takes its corner */}
        <div ref={sig} style={{ position: 'absolute', left: STAGE.edge, top: STAGE.edge - 8, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 340,
          transform: centred && to ? to.name : 'none', opacity: shown && !closing ? 1 : 0,
          transition: `transform 1000ms ${MOVE}, opacity ${closing ? 500 : 600}ms ease` }}>
          {/* the label level: what this film is, quiet, so the story's words under the card are the loudest type on the stage */}
          <span style={{ font: 'var(--pl-round-w2, 800) 15px/1 var(--pl-round)', color: 'var(--pl-ink-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Craft № {n}</span>
          <span style={{ font: 'var(--pl-round-w, 700) 24px/30px var(--pl-round)', color: 'var(--pl-ink-2)', letterSpacing: '-0.01em', textWrap: 'balance' }}>{p.title}</span>
        </div>
        {/* the film itself, in the middle of the stage; it rises in as the name leaves, and steps back at the end */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingRight: side ? 436 : 0 }}>
          {/* the demo, with the words, switch and change card beside it, fades and steps back at the closing */}
          <div ref={stack} style={{ opacity: on ? 1 : 0, transform: `translateY(${on || closing ? 0 : 12}px) scale(${(closing ? 0.97 : 1) * (scripted ? fit : 1)})`, transformOrigin: '50% 0',
            marginBottom: scripted ? -(1 - fit) * fh : 0, flex: 'none', transition: `opacity 600ms ease ${phase === 'film' ? TIMING.clear : 0}ms, transform 800ms var(--pl-spring) ${phase === 'film' ? TIMING.clear : 0}ms` }}>
            <Film Example={Example} names={Example.names} chrome={false} start={phase === 'playing'} onDone={done} ui={scripted ? MARKS / fit : FILM_UI} openIn onLine={(text, at) => setCaption({ text, at })} onBurst={() => setNod((x) => x + 1)} aside={side ? <p aria-live="polite" style={{ margin: 0, minHeight: 80, font: `400 ${30 / fit}px/${40 / fit}px var(--pl-sans)`, letterSpacing: '-0.01em', color: 'var(--pl-ink)', textWrap: 'balance' }}>{closingWords ? null : <Line key={said.text} text={said.text} fixed={['fix', 'payoff', 'end'].includes(said.at)} />}</p> : null} />
          </div>
        </div>
        {/* the closing words, in the middle of the stage once the demo has stepped back, before the mark comes in */}
        {scripted ? (
          <p style={{ position: 'absolute', left: 0, right: 0, top: STAGE.h / 2 - 20, margin: 0, textAlign: 'center', font: '400 30px/40px var(--pl-sans)', letterSpacing: '-0.01em', color: 'var(--pl-ink)',
            opacity: closingWords && said.text ? 1 : 0, transition: 'opacity 400ms ease' }}>
            {closingWords && said.text ? <Line key={said.text} text={said.text} fixed /> : null}
          </p>
        ) : null}
        {/* the mark, on every frame; at the end it comes to the middle, and the bob settles on its line */}
        <div ref={mark} style={{ position: 'absolute', right: STAGE.edge, bottom: STAGE.edge - 12, display: 'flex', alignItems: 'center', gap: 9,
          opacity: shown ? 0.92 : 0, transform: marked && to ? to.mark : 'none', transition: `transform 1000ms ${MOVE}, opacity 600ms ease` }}>
          {/* chrome level: the brand stays small on every frame; it grows only at the closing */}
          <span key={nod} style={{ display: 'grid', animation: nod ? 'mk-nod 700ms both' : undefined, transformOrigin: '50% 80%' }}><Mark size={32} guards={marked} /></span>
          <span style={{ font: '650 20px/1 var(--pl-sans)', letterSpacing: '-0.03em' }}>React Plumber</span>
        </div>
        <p style={{ position: 'absolute', left: 0, right: 0, top: STAGE.h / 2 + 44, margin: 0, textAlign: 'center', font: '400 34px/42px var(--pl-sans)', color: 'var(--pl-ink-2)',
          opacity: phase === 'line' ? 1 : 0, transform: `translateY(${phase === 'line' ? 0 : 8}px)`, transition: 'opacity 600ms ease, transform 700ms var(--pl-spring)' }}>{LINE}</p>
      </div>
    </div>
  );
}
