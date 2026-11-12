/* ─────────────────────────────────────────────────────────
 * HERO (STORY.md, section 0; the owner's pick, 2026-11-04: comp B "the review" with comp C's moment). The lead:
 * Plumber knows the patterns design engineers know. A centred headline, the install, then one app screen with five
 * real mistakes, pinned like a design review and fixed one at a time (Review.jsx). Set in the homepage's foundations.
 * ───────────────────────────────────────────────────────── */
import { CopyCommand } from './CopyCommand.jsx';
import { Review } from './Review.jsx';

export const INSTALL = 'npm install -D @unlocalhosted/react-plumber';

export function Hero() {
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
        <h1 id="hero-title" className="display">A design review<br />on every screen.</h1>
        <p className="lead">Hold Alt on your running app. Plumber finds what a senior design engineer would, names the pattern, <b>and writes the fix into your JSX.</b></p>
        <div className="hero-cta">
          <CopyCommand command={INSTALL} />
          <a className="s-btn q hero-docs" href="https://github.com/unlocalhosted/plumb#readme"><span>Read the docs</span></a>
        </div>
      </header>
      <Review />
    </section>
  );
}
