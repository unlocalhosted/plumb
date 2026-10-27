// Fixture apps for layer 6 (structure): a tooltip provider with the wrong delay that the code can fix, and custom controls
// whose handlers the index reads.
import { STYLES as BASE } from './probes-apps.mjs';
export const STYLES = BASE;

const BTN = 'rounded-control bg-surface px-s4 py-s2 text-body transition-transform active:scale-95';

// one provider, set to 0, in the same file as its triggers
export const PROVIDER = `import * as Tooltip from '@radix-ui/react-tooltip';
export function App() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col items-start gap-s4 px-s4 pb-s6 text-body text-ink">
      <Tooltip.Provider delayDuration={0}>
        <div className="flex gap-s2">
          <Tooltip.Root><Tooltip.Trigger asChild><button id="tp-1" className="${BTN}">One</button></Tooltip.Trigger><Tooltip.Portal><Tooltip.Content className="menu-box" sideOffset={6}>One tip</Tooltip.Content></Tooltip.Portal></Tooltip.Root>
          <Tooltip.Root><Tooltip.Trigger asChild><button id="tp-2" className="${BTN}">Two</button></Tooltip.Trigger><Tooltip.Portal><Tooltip.Content className="menu-box" sideOffset={6}>Two tip</Tooltip.Content></Tooltip.Portal></Tooltip.Root>
        </div>
      </Tooltip.Provider>
    </main>
  );
}
`;

// controls built from divs: one that flashes on tap, one that has been taken care of, a native button, and two drags
export const CONTROLS = `import { useRef, useState } from 'react';
export function App() {
  const [n, setN] = useState(0);
  const [x, setX] = useState(0);
  const from = useRef(null);
  const start = (e) => { from.current = e.clientX; e.currentTarget.setPointerCapture(e.pointerId); };
  const move = (e) => { if (from.current !== null) setX(e.clientX - from.current); };
  const end = () => { from.current = null; };
  return (
    <main className="mx-auto flex max-w-5xl flex-col items-start gap-s4 px-s4 pb-s6 text-body text-ink">
      <div id="cc-bad" role="button" tabIndex={0} onClick={() => setN(n + 1)} className="cursor-pointer rounded-control bg-surface px-s4 py-s2 text-body">Add</div>
      <div id="cc-good" role="button" tabIndex={0} onClick={() => setN(n + 1)} className="cursor-pointer touch-manipulation rounded-control bg-surface px-s4 py-s2 text-body [-webkit-tap-highlight-color:transparent]">Add</div>
      <button id="cc-native" onClick={() => setN(n + 1)} className="${BTN}">Add {n}</button>
      <div id="dg-bad" role="button" tabIndex={0} onPointerDown={start} onPointerMove={move} onPointerUp={end} style={{ transform: \`translateX(\${x}px)\` }} className="w-24 cursor-grab rounded-control bg-surface px-s4 py-s2 text-body [-webkit-tap-highlight-color:transparent]">Drag</div>
      <div id="dg-good" role="button" tabIndex={0} onPointerDown={start} onPointerMove={move} onPointerUp={end} style={{ transform: \`translateX(\${x}px)\` }} className="w-24 cursor-grab touch-none rounded-control bg-surface px-s4 py-s2 text-body [-webkit-tap-highlight-color:transparent]">Drag</div>
    </main>
  );
}
`;
