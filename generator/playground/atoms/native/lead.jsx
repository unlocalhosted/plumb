// The arrow leads: pressing sends the button's own arrow on its way, and while checkout opens it keeps travelling out
// to the right and back in from the left, so the wait moves in the direction the customer is going.
import { useEffect, useRef, useState } from 'react';
import './press.css';
import './lead.css';
export function Lead({ label, doneLabel, icon, onCommit }) {
  const [done, setDone] = useState(false), timer = useRef(0);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <button type="button" className="np lead" data-state={done ? 'done' : 'rest'}
      onClick={() => { if (done) return; setDone(true); onCommit?.(); clearTimeout(timer.current); timer.current = setTimeout(() => setDone(false), 2800); }}>
      <span className="np-row"><span className="lead-label">{done ? doneLabel : label}</span>{icon && <span className="np-icon lead-arrow" aria-hidden>{icon}</span>}</span>
      <span className="np-said" aria-live="polite">{done ? doneLabel : ''}</span>
    </button>
  );
}
