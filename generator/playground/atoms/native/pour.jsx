// A press that pours: the deeper shade of the button floods out from the exact point you pressed, and the words are
// drawn a second time in the shade's own ink, clipped to the same circle, so they read on both sides of its edge.
// Letting go on the button commits ("Opening checkout"); sliding off before letting go drains it back, nothing done.
// From the keyboard it pours from the centre. With reduced motion the shade arrives at once.
// Built for any product's atom from its skin (skin.js): --atom-fill, --atom-on-fill, --atom-deep, --atom-on-deep.
import { useEffect, useRef, useState } from 'react';
import './pour.css';

export function Pour({ label, doneLabel, icon, onCommit }) {
  const ref = useRef(null), timer = useRef(0);
  const [at, setAt] = useState(null); // where the pour starts, relative to the button
  const [state, setState] = useState('rest'); // rest | pouring | done
  useEffect(() => () => clearTimeout(timer.current), []);
  const from = (x, y) => { const r = ref.current.getBoundingClientRect(); const px = x - r.left, py = y - r.top;
    // the circle reaches the farthest corner, so the pour always covers the whole face
    const reach = Math.ceil(Math.max(Math.hypot(px, py), Math.hypot(r.width - px, py), Math.hypot(px, r.height - py), Math.hypot(r.width - px, r.height - py)));
    setAt({ x: px, y: py, reach }); };
  const press = (x, y) => { if (state === 'done') return; from(x, y); setState('pouring'); };
  const drain = () => { if (state === 'pouring') setState('rest'); };
  const commit = () => { setState('done'); onCommit?.(); clearTimeout(timer.current); timer.current = setTimeout(() => setState('rest'), 2800); };
  const centre = () => { const r = ref.current.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
  const words = (cls) => <span className={cls}><span className="pour-label">{state === 'done' ? doneLabel : label}</span>{icon && <span className="pour-icon" aria-hidden>{icon}</span>}</span>;
  return (
    <button ref={ref} type="button" className="pour" data-state={state}
      style={at ? { '--x': `${at.x}px`, '--y': `${at.y}px`, '--reach': `${at.reach}px` } : undefined}
      onPointerDown={(e) => { if (e.button === 0) press(e.clientX, e.clientY); }}
      onPointerLeave={drain} onPointerCancel={drain}
      onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) press(...centre()); }}
      onKeyUp={(e) => { if (e.key === 'Escape') drain(); }}
      onBlur={drain}
      onClick={() => { if (state !== 'done') commit(); }}>
      {words('pour-face')}
      <span className="pour-flood" aria-hidden>{words('pour-face')}</span>
      <span className="pour-said" aria-live="polite">{state === 'done' ? doneLabel : ''}</span>
    </button>
  );
}
