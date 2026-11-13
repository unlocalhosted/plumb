/* The install command: a line pressed into the page (a well, like every place you read or type text) with the page's
 * one action beside it, a soft block in the action's pink (it goes down under the finger and springs back).
 * States: rest, hover (lifts), focus (ring), pressed (down), copied ("Copied", mint, 1.6s), couldn't copy (the
 * command is selected and the button says so). */
import { useEffect, useRef, useState } from 'react';

export function CopyCommand({ command }) {
  const [state, setState] = useState('rest');
  const text = useRef(null), timer = useRef(0);
  useEffect(() => () => clearTimeout(timer.current), []);
  async function copy() {
    clearTimeout(timer.current);
    let next = 'copied';
    try { await navigator.clipboard.writeText(command); }
    catch {
      const range = document.createRange(); range.selectNodeContents(text.current);
      getSelection().removeAllRanges(); getSelection().addRange(range); next = 'failed';
    }
    setState(next);
    timer.current = setTimeout(() => setState('rest'), next === 'failed' ? 4000 : 1600);
  }
  return (
    <div className="install">
      <code ref={text} className="select-all">{command}</code>
      <button type="button" className="install-copy s-btn" onClick={copy} data-state={state}>
        <span>{state === 'copied' ? 'Copied' : state === 'failed' ? 'Press ⌘C' : 'Copy'}</span>
      </button>
      <span className="sr-only" role="status" aria-live="polite">{state === 'copied' ? 'Copied' : state === 'failed' ? 'Couldn’t copy. The command is selected.' : ''}</span>
    </div>
  );
}
