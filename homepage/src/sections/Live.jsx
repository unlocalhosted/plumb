/* ─────────────────────────────────────────────────────────
 * LIVE EDITING (STORY.md, pillar 2; page-plan.html, section 2). Medium: a real recording. The overlay on a small app,
 * captured by homepage/recording/record.mjs: double-click the heading and retype it, Enter writes the string; Alt+B,
 * try 12px and 8px on the rows, Enter takes 8px, A applies it. Nothing is mocked; the file shows only as a caption.
 *
 * The clip plays muted and looped while it's on screen and pauses off it. Reduced motion: it doesn't play by itself;
 * the poster (the final state) shows, with the browser's controls to play it.
 * ───────────────────────────────────────────────────────── */
import { useEffect, useRef } from 'react';
import './live.css';

const MEDIA = '/media/live-editing';

export function Live() {
  const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const video = useRef(null);

  useEffect(() => {
    if (reduced) return;
    const v = video.current;
    v.muted = true; // React doesn't reliably set the attribute, and an unmuted video is never allowed to autoplay
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) v.play().catch(() => {}); else v.pause(); }, { threshold: 0.35 });
    io.observe(v);
    return () => io.disconnect();
  }, [reduced]);

  return (
    <section className="live" aria-labelledby="live-title">
      <header className="live-head">
        <span className="live-eyebrow">Live editing</span>
        <h2 id="live-title" className="title">Edit directly on your webpage.<br />Changes are synced to src.</h2>
        <p className="lead">Retype a heading or try a space on your running app. Plumber writes <b>the exact words or class into the exact line of JSX</b> that made it. No prompt, no hunting for the file.</p>
      </header>

      <figure className="live-rec surface">
        <div className="live-bar" aria-hidden="true"><i /><i /><i /><span>localhost:5173</span></div>
        <video ref={video} className="live-video" muted loop playsInline preload="metadata" poster={`${MEDIA}-poster.png`} controls={reduced}
          aria-label="Recording: the heading Members is double-clicked and retyped as Your team; then Alt+B shows the rows’ 10px gap is off the scale, 12px and 8px are tried live, and 8px is applied.">
          <source src={`${MEDIA}.webm`} type="video/webm" />
          <source src={`${MEDIA}.mp4`} type="video/mp4" />
        </video>
      </figure>
      <p className="live-caption">Written to <code>App.jsx</code>: <code>Members</code> → <code>Your team</code> · <code>gap-[10px]</code> → <code>gap-related</code>. A real recording of the overlay.</p>

      <ul className="live-steps">
        <li><span><kbd>Double-click</kbd></span><b>Edit words</b><span>Type over them. Enter writes the string in your source.</span></li>
        <li><span><kbd>Alt</kbd><kbd>B</kbd></span><b>Try a space live</b><span>Every place moves as you choose between your theme’s steps.</span></li>
        <li><span><kbd>A</kbd></span><b>Apply</b><span>One guarded write per file, hot-reloaded, undoable.</span></li>
      </ul>
    </section>
  );
}
