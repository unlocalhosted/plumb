// Lifetime in metal: the one rare, valuable purchase gets the material that says precious. A silver ring (the brand is
// a calm purple, so the metal stays neutral rather than rainbow) lives on the button's edge, and the pointer dents it
// like liquid as it nears (metal-fx's useMetalBend). The press itself is the product's own: it sinks onto its lip.
// The ring punches its centre through to the wrapper's own background, so the face's purple is set on the wrapper.
// The dark-surface tuning: on a light page the light tuning draws silver on white and the ring vanishes; the glow
// under it is left off, since on a light page it reads as a smudge.
// Without WebGL 2 the library draws the plain button. With reduced motion the ring holds still.
import { useEffect, useRef, useState } from 'react';
import { MetalFx, useMetalBend } from 'metal-fx';
import './press.css';
const still = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
export function Metal({ label, doneLabel, icon, onCommit }) {
  const ref = useRef(null), timer = useRef(0);
  const [done, setDone] = useState(false);
  useMetalBend(ref);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <MetalFx ref={ref} variant="button" preset="silver" theme="dark" strength={1} disableGlow innerShadow paused={still()} style={{ width: 'min(100%, var(--atom-width, 100%))', background: 'var(--atom-fill)', borderRadius: 'var(--atom-radius)' }}>
      <button type="button" className="np" style={{ width: '100%' }} data-state={done ? 'done' : 'rest'}
        onClick={() => { if (done) return; setDone(true); onCommit?.(); clearTimeout(timer.current); timer.current = setTimeout(() => setDone(false), 2800); }}>
        <span className="np-row"><span>{done ? doneLabel : label}</span>{icon && !done && icon}</span>
        <span className="np-said" aria-live="polite">{done ? doneLabel : ''}</span>
      </button>
    </MetalFx>
  );
}
