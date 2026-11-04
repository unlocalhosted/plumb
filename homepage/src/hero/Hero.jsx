/* ─────────────────────────────────────────────────────────
 * HERO (page-plan.html, section 0; the owner's pick, comp A "the wipe"). Medium: the page itself changing. A centred
 * headline, the install, then one full-width app screen split by a line: as written on one side, after Plumber on
 * the other (Wipe.jsx). Set in the homepage's foundations.
 * ───────────────────────────────────────────────────────── */
import { CopyCommand } from './CopyCommand.jsx';
import { Wipe } from './Wipe.jsx';

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
        <h1 id="hero-title" className="display">Click a pixel.<br />Plumber edits the file.</h1>
        <p className="lead">It reads your Tailwind theme, marks what’s off on the running page, and writes the fix into your JSX. <b>Keeps agent-written UI on your system</b>, without a prompt.</p>
        <div className="hero-cta">
          <CopyCommand command={INSTALL} />
          <a className="btn btn-ghost hero-docs" href="https://github.com/unlocalhosted/plumb#readme">Read the docs</a>
        </div>
      </header>
      <Wipe />
    </section>
  );
}
