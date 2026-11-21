// A glow while checkout opens: the edge says "working" only between the press and the next screen. Pressing turns the
// words to "Opening checkout", and a glow in the solver's glow colour (Radix's border-and-focus step of the brand's own
// ramp) breathes outward from the edge until the wait ends. Nothing glows at rest. With reduced motion there is no
// breathing; the words carry the wait alone. (border-beam was tried first: it only offers its own palettes, so the
// glow could not be the brand's colour.)
import { useEffect, useRef, useState } from 'react';
import './press.css';
import './beam.css';
export function Beam({ label, doneLabel, icon, onCommit }) {
  const timer = useRef(0);
  const [done, setDone] = useState(false);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <button type="button" className="np beam" data-state={done ? 'done' : 'rest'}
      onClick={() => { if (done) return; setDone(true); onCommit?.(); clearTimeout(timer.current); timer.current = setTimeout(() => setDone(false), 2800); }}>
      <span className="np-row"><span>{done ? doneLabel : label}</span>{icon && !done && icon}</span>
      <span className="np-said" aria-live="polite">{done ? doneLabel : ''}</span>
    </button>
  );
}
