/* The install command: the page's one action, so its button is the overlay's action colour (pink).
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
    <div className="flex max-w-full items-center gap-5 rounded-row bg-paper py-2 pr-2 pl-6 shadow-[inset_0_0_0_1px_var(--pl-rule)]">
      <code ref={text} className="min-w-0 overflow-x-auto font-mono text-meta whitespace-nowrap text-ink select-all">{command}</code>
      <button type="button" onClick={copy} data-state={state} className="copy-button shrink-0 rounded-tag px-5 py-3 text-label font-strong">
        {state === 'copied' ? 'Copied' : state === 'failed' ? 'Press ⌘C' : 'Copy'}
      </button>
      <span className="sr-only" role="status" aria-live="polite">{state === 'copied' ? 'Copied' : state === 'failed' ? 'Couldn’t copy. The command is selected.' : ''}</span>
    </div>
  );
}
