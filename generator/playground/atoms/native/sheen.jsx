// A sheen, once: a soft band of light crosses the button when it first comes into view and each time the pointer
// arrives, never on a loop, so the one thing to do catches the eye without nagging. The light passes under the words.
import { useEffect, useRef, useState } from 'react';
import './press.css';
import './sheen.css';
export function Sheen({ label, doneLabel, icon, onCommit }) {
  const ref = useRef(null), timer = useRef(0);
  const [done, setDone] = useState(false), [pass, setPass] = useState(0);
  useEffect(() => { const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setPass((n) => n + 1); io.disconnect(); } }, { threshold: 0.9 });
    io.observe(ref.current); return () => { io.disconnect(); clearTimeout(timer.current); }; }, []);
  return (
    <button ref={ref} type="button" className="np sheen" data-state={done ? 'done' : 'rest'}
      onPointerEnter={(e) => { if (e.pointerType === 'mouse') setPass((n) => n + 1); }}
      onClick={() => { if (done) return; setDone(true); onCommit?.(); clearTimeout(timer.current); timer.current = setTimeout(() => setDone(false), 2800); }}>
      {/* with reduced motion there is no light at all: a band that can't travel would only sit there */}
      {pass > 0 && !matchMedia('(prefers-reduced-motion: reduce)').matches && <span key={pass} className="sheen-light" aria-hidden />}
      <span className="np-row"><span>{done ? doneLabel : label}</span>{icon && !done && <span className="np-icon" aria-hidden>{icon}</span>}</span>
      <span className="np-said" aria-live="polite">{done ? doneLabel : ''}</span>
    </button>
  );
}
