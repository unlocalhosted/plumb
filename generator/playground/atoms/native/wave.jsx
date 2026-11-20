// The press becomes checkout: a distortion wave in the brand's own purple opens from where the button was pressed and
// carries it into its next state ("Opening checkout"), leaving a trace of colour on the edges as it clears. The faces
// are drawn under the wave; the control itself stays live above it, unbent. With reduced motion it is a crossfade.
import { useEffect, useRef, useState } from 'react';
import { DistortionWave } from 'distortion-waves';
import './press.css';
import './wave.css';
export function Wave({ label, doneLabel, icon, onCommit }) {
  const button = useRef(null), timer = useRef(0);
  const [done, setDone] = useState(false);
  useEffect(() => () => clearTimeout(timer.current), []);
  const face = (words, withIcon, cls) => <div className={`np wave-face ${cls}`} aria-hidden><span className="np-row"><span>{words}</span>{withIcon && icon}</span></div>;
  return (
    <DistortionWave className="wave" revealed={done} source={button} type="center" palette="#7b3fe4"
      revealedContent={face(doneLabel, false, 'wave-done')}
      overlay={<button ref={button} type="button" className="wave-hit" aria-label={done ? doneLabel : label}
        onClick={() => { if (done) return; setDone(true); onCommit?.(); clearTimeout(timer.current); timer.current = setTimeout(() => setDone(false), 2800); }} />}>
      {face(label, true, 'wave-rest')}
    </DistortionWave>
  );
}
