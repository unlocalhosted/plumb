/* The install command: the page's one action, so its button is the overlay's action colour (pink), drawn as a
 * keycap that presses down.
 * States: rest, hover (pink deepens a step), focus (sky ring), pressed (scale 0.97), copied ("Copied", mint, 1.6s),
 * couldn't copy (the command is selected and the button says so). */
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
    <div className="toy-install">
      <code ref={text} className="select-all">{command}</code>
      <button type="button" onClick={copy} data-state={state}>
        {state === 'copied' ? 'Copied' : state === 'failed' ? 'Press ⌘C' : 'Copy'}
      </button>
      <span className="sr-only" role="status" aria-live="polite">{state === 'copied' ? 'Copied' : state === 'failed' ? 'Couldn’t copy. The command is selected.' : ''}</span>
    </div>
  );
}
