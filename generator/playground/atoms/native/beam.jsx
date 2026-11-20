// A beam while checkout opens: the edge says "working" only between the press and the next screen. Pressing turns the
// words to "Opening checkout" and a glow in the brand's blue-purple breathes outward onto the page around it (a glow riding the
// border itself vanishes into a purple face); it fades when the wait ends.
// Nothing glows at rest. With reduced motion there is no travelling glow; the words carry the wait alone.
import { useEffect, useRef, useState } from 'react';
import { BorderBeam } from 'border-beam';
import './press.css';
const still = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
export function Beam({ label, doneLabel, icon, onCommit }) {
  const timer = useRef(0);
  const [done, setDone] = useState(false);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <BorderBeam active={done && !still()} size="pulse-outside" colorVariant="ocean" theme="light" strength={1} duration={1.4} style={{ width: 'min(100%, var(--atom-width, 100%))' }}>
      <button type="button" className="np" style={{ width: '100%' }} data-state={done ? 'done' : 'rest'}
        onClick={() => { if (done) return; setDone(true); onCommit?.(); clearTimeout(timer.current); timer.current = setTimeout(() => setDone(false), 2800); }}>
        <span className="np-row"><span>{done ? doneLabel : label}</span>{icon && !done && icon}</span>
        <span className="np-said" aria-live="polite">{done ? doneLabel : ''}</span>
      </button>
    </BorderBeam>
  );
}
