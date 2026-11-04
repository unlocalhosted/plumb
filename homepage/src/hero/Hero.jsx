/* ─────────────────────────────────────────────────────────
 * HERO: "a toy you can trust" (the owner's pick, A + D from the soul prototypes)
 *
 * The headline is written in a hurry, then Plumber puts it on the scale, then it gets the toy's marks. Under it, the
 * demo: the carousel on a sky stage (Carousel.jsx).
 *
 * STORYBOARD (the headline)
 *      0ms   written in a hurry: words at sizes and gaps picked one at a time, a little coral in their ink
 *    800ms   marked: each one outlined in dashed coral, a pill with its value pops on (70ms apart)
 *   2400ms   on the scale: every word snaps to the headline's size and spacing (steep curve, 700ms); the caption
 *            turns mint
 *   3300ms   the toy's marks: marching ants round "pixel" with a coral 13px sticker; a mint highlight sweeps under
 *            "file" with a p-3 ✓ sticker
 * "Again" replays it. Reduced motion: the last stage, at once.
 * ───────────────────────────────────────────────────────── */
import { useEffect, useRef, useState } from 'react';
import { CopyCommand } from './CopyCommand.jsx';
import { Carousel } from './Carousel.jsx';
import './toy.css';

export const INSTALL = 'npm install -D @unlocalhosted/react-plumber';
const TIMING = [800, 2400, 3300]; // ms each stage starts

// Each word's hurried values; the two marked words carry the toy's marks once the headline is on the scale.
const WORDS = [
  { w: 'Click', off: { fontSize: '0.86em', translate: '0 0.06em' }, pill: '82px' },
  { w: 'a', off: { marginLeft: '0.36em' }, pill: 'gap 34' },
  { w: 'pixel', mark: 'pixel', tail: '.', off: { fontSize: '1.08em', translate: '0 -0.08em', rotate: '-2deg' }, pill: '104px' },
  { br: true },
  { w: 'Plumber', off: { fontSize: '0.94em', letterSpacing: '-0.02em' }, pill: '90px' },
  { w: 'edits', off: { marginLeft: '0.08em', translate: '0 0.1em' }, pill: 'gap 8' },
  { w: 'the', off: { fontSize: '0.84em' }, pill: '80px' },
  { w: 'file', mark: 'file', tail: '.', off: { rotate: '2deg', marginLeft: '0.32em' }, pill: 'gap 30' },
];

export function Hero() {
  const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [stage, setStage] = useState(reduced ? 3 : 0); // 0 hurried · 1 marked · 2 on the scale · 3 the toy's marks
  const timers = useRef([]);
  const play = () => {
    timers.current.forEach(clearTimeout);
    if (reduced) { setStage(3); return; }
    setStage(0);
    timers.current = TIMING.map((ms, i) => setTimeout(() => setStage(i + 1), ms));
  };
  useEffect(() => { play(); return () => timers.current.forEach(clearTimeout); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className="toy-home" aria-label="React Plumber">
      <nav className="toy-nav" aria-label="Main">
        <a className="toy-brand" href="#top"><i className="toy-rainbow" aria-hidden="true" />React Plumber</a>
        <span className="toy-links"><a href="#theme-title">How it reads</a><a href="#demo">Clean up</a><a href="https://github.com/unlocalhosted/plumb#readme">Docs</a><a className="toy-cta" href="#top">Install</a></span>
      </nav>
      <header className="combo-hero" id="top">
        <h1 data-stage={stage} aria-label="Click a pixel. Plumber edits the file.">
          {WORDS.map((x, i) => x.br ? <br key={i} /> : (
            <span key={i} aria-hidden="true" className={`word combo-${x.mark ?? 'plain'}`} style={stage < 2 ? x.off : undefined}>
              {x.mark === 'pixel' && stage >= 3 ? <span className="toy-ants">{x.w}</span> : x.w}{x.tail}
              {stage === 1 && <em className="word-pill" style={{ animationDelay: `${i * 70}ms` }}>{x.pill}</em>}
              {stage >= 3 && x.mark === 'pixel' && <em className="toy-sticker toy-sticker-off combo-sticker">13px</em>}
              {stage >= 3 && x.mark === 'file' && <em className="toy-sticker toy-sticker-on combo-sticker">p-3 ✓</em>}
            </span>
          ))}
        </h1>
        <p className="words-caption" data-stage={Math.min(stage, 2)} aria-live="polite">
          {stage < 2 ? 'This headline was written in a hurry.' : 'Plumber put every size and gap on the scale.'}
        </p>
        <p className="combo-lead">It reads your Tailwind theme, marks what’s off on the running page, and writes the fix into your JSX.</p>
        <div className="words-row">
          <CopyCommand command={INSTALL} />
          <button type="button" className="words-replay" onClick={play}><span aria-hidden="true">↺</span> Again</button>
        </div>
      </header>
      <Carousel />
    </section>
  );
}
