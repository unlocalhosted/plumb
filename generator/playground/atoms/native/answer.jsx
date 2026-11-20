// It answers in words: the label rolls up to say what is happening ("Opening checkout"), with a thin line growing along
// the bottom edge while it does. The words never fade: they move, fully drawn, inside the button's own window.
import { useEffect, useRef, useState } from 'react';
import './press.css';
import './answer.css';
export function Answer({ label, doneLabel, icon, onCommit }) {
  const [done, setDone] = useState(false), timer = useRef(0);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <button type="button" className="np answer" data-state={done ? 'done' : 'rest'}
      onClick={() => { if (done) return; setDone(true); onCommit?.(); clearTimeout(timer.current); timer.current = setTimeout(() => setDone(false), 2800); }}>
      <span className="answer-window">
        <span className="np-row answer-now" aria-hidden={done}><span>{label}</span>{icon && <span className="np-icon" aria-hidden>{icon}</span>}</span>
        <span className="np-row answer-next" aria-hidden={!done}><span>{doneLabel}</span></span>
      </span>
      <span className="answer-line" aria-hidden />
      <span className="np-said" aria-live="polite">{done ? doneLabel : ''}</span>
    </button>
  );
}
