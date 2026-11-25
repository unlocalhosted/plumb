/* ─────────────────────────────────────────────────────────
 * HERO (STORY.md, section 0; the owner's pick, 2026-11-04: comp B "the review" with comp C's moment). The lead:
 * Plumber knows the patterns design engineers know. A centred headline, the install, then one app screen with five
 * real mistakes, pinned like a design review and fixed one at a time (Review.jsx). Set in the homepage's foundations.
 * ───────────────────────────────────────────────────────── */
import { useEffect, useState } from 'react';
import { CopyCommand } from './CopyCommand.jsx';
import { useReduced } from '../reduced.js';
import { Review } from './Review.jsx';

export const INSTALL = 'npm install -D @unlocalhosted/react-plumber';

// what Plumber is, three ways: the first line of the headline flips through them. The first is the one a reader
// without motion, a search engine and a screen reader get
const IS = ['a design engineer', 'a UI slop linter', 'a design review'];
const FLIP = { every: 2800 };

/* The headline's first line, flipping. All three lines lie in one place, so the tallest keeps the room and nothing
 * under the headline moves; one is in, the one before it is on its way out, the rest wait below. It stops while the
 * tab is hidden. Reduced motion: the first line, still. */
function Flip() {
  const reduced = useReduced();
  const [at, setAt] = useState(0);
  useEffect(() => {
    if (reduced) { setAt(0); return; }
    const turn = setInterval(() => { if (!document.hidden) setAt((n) => (n + 1) % IS.length); }, FLIP.every);
    return () => clearInterval(turn);
  }, [reduced]);
  const was = (at + IS.length - 1) % IS.length;
  return (
    <span className="hero-flip" aria-hidden="true">
      {IS.map((say, i) => <span key={say} data-is={i === at ? 'in' : i === was ? 'out' : 'wait'}>{say}</span>)}
    </span>
  );
}

// `proof`: what the site puts under the install (web/site/Proof.jsx).
export function Hero({ proof = null }) {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <nav className="hero-nav" aria-label="Main">
        <a className="hero-brand" href="#top"><i aria-hidden="true" />React Plumber</a>
        <span className="hero-links">
          <a href="https://github.com/unlocalhosted/plumb#readme">Docs</a>
          <a href="https://github.com/unlocalhosted/plumb">GitHub</a>
        </span>
      </nav>
      <header className="hero-head" id="top">
        <h1 id="hero-title" className="display hero-title" aria-label={`${IS[0]} on every screen.`}><Flip /><span className="hero-rest" aria-hidden="true">on every screen.</span></h1>
        <p className="lead">Plumber acts as your own design engineer. It finds where your frontend drifts away from your actual system <b>and writes the fix into your JSX.</b></p>
        <div className="hero-cta">
          <CopyCommand command={INSTALL} />
          <a className="s-btn q hero-docs" href="/docs"><span>Read the docs</span></a>
        </div>
        {proof}
      </header>
      <Review />
    </section>
  );
}
