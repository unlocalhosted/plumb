// A principle as a marketing film for React Plumber: one 16:9 stage (1600 × 900, scaled to the window), nothing of the
// showcase around it. Signed as a piece of craft: the principle's number and name, top left, in the toy face; React
// Plumber's mark, bottom right, quiet, on every frame (the plumb bob on its line, the site's own mark: web/site/Bar.jsx).
import { useEffect, useState } from 'react';
import { PRINCIPLES } from './catalogue.js';
import { Film } from './Film.jsx';
import { ensureLook } from './look.js';

ensureLook();
const SCREENS = Object.fromEntries(Object.entries(import.meta.glob('./screens/[0-9]*.jsx', { eager: true })).map(([, m]) => [m.n, m]));
const STAGE = { w: 1600, h: 900, edge: 56 };
const BOB = (
  <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
    <path d="M12 1.5v6" fill="none" stroke="var(--pl-ink)" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M6.2 8.8h11.6L12 22z" fill="var(--pl-pink)" stroke="var(--pl-pink)" strokeWidth="2.4" strokeLinejoin="round" />
    <circle cx="12" cy="12.4" r="1.7" fill="#fff" />
  </svg>
);

export function FilmPage({ n }) {
  const p = PRINCIPLES.find((x) => x.n === n), screen = SCREENS[n], Example = screen?.default;
  const [k, setK] = useState(1);
  useEffect(() => {
    document.title = `${n} · ${p?.title ?? ''} · React Plumber`;
    const fit = () => setK(Math.min(innerWidth / STAGE.w, innerHeight / STAGE.h));
    fit(); addEventListener('resize', fit);
    return () => removeEventListener('resize', fit);
  }, [n]);
  if (!Example?.film) return <p style={{ padding: 40 }}>No film for № {n} yet.</p>;
  return (
    <div className="pl-light" style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', overflow: 'hidden', background: 'var(--pl-desk)' }}>
      {/* plumber's own overlay (its toasts, its Alt pill) runs on this dev page; it is not part of the film */}
      <style>{'plumb-overlay { display: none !important; }'}</style>
      <div style={{ position: 'relative', width: STAGE.w, height: STAGE.h, flex: 'none', transform: `scale(${k})`, background: 'var(--pl-desk)', color: 'var(--pl-ink)' }}>
        {/* the signature: which piece of craft this is */}
        <div style={{ position: 'absolute', left: STAGE.edge, top: STAGE.edge - 8, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 420 }}>
          <span style={{ font: 'var(--pl-round-w2, 800) 15px/1 var(--pl-round)', color: 'var(--pl-ink-2)', letterSpacing: '0.01em' }}>Craft № {n}</span>
          <span style={{ font: 'var(--pl-round-w, 750) 34px/38px var(--pl-round)', letterSpacing: '-0.015em', textWrap: 'balance' }}>{p.title}</span>
        </div>
        {/* the film itself, in the middle of the stage */}
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', paddingBottom: 40 }}>
          <Film Example={Example} names={Example.names} chrome={false} />
        </div>
        {/* the mark, on every frame */}
        <div style={{ position: 'absolute', right: STAGE.edge, bottom: STAGE.edge - 12, display: 'flex', alignItems: 'center', gap: 9, opacity: 0.92 }}>
          {BOB}
          <span style={{ font: 'var(--pl-round-w, 750) 21px/1 var(--pl-round)', letterSpacing: '-0.005em' }}>React Plumber</span>
        </div>
      </div>
    </div>
  );
}
