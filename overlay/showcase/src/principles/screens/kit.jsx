// What the screens share. A screen is one file here (screens/NN-name.jsx): `export const n = NN`, the component as the
// default export with its statics (.names, .lesson, .measure, .stage), and `export const handsOn = true` when the
// viewer's own hand is the probe. The stage (Principle.jsx) finds each screen by its number.

import { useRef, useState } from 'react';

// A card whose width is in the viewer's hand, for a rule about what a developer doesn't control (the screen it lands
// on). `range` is { min, start, max, step } in px. The edge follows the pointer (the card is centred, so it grows both
// ways), and the drag ends however the hand ends it. Put <Edge> last inside the card, which must be `relative`.
export function useWidth(range) {
  const [w, setW] = useState(range.start);
  const drag = useRef(null);
  const clamp = (x) => Math.max(range.min, Math.min(range.max, x));
  const end = () => { drag.current = null; };
  const grip = {
    onPointerDown: (e) => {
      const card = e.currentTarget.parentElement, k = card.getBoundingClientRect().width / card.offsetWidth || 1;
      drag.current = { x: e.clientX, w: card.offsetWidth, k };
      e.currentTarget.setPointerCapture(e.pointerId);
      e.preventDefault();
    },
    onPointerMove: (e) => {
      const d = drag.current;
      if (!d) return;
      if (e.pointerType === 'mouse' && e.buttons === 0) return end();
      setW(clamp(d.w + (2 * (e.clientX - d.x)) / d.k));
    },
    onPointerUp: end, onPointerCancel: end, onLostPointerCapture: end,
    onKeyDown: (e) => {
      const by = { ArrowLeft: -range.step, ArrowRight: range.step }[e.key];
      if (by) { e.preventDefault(); setW((x) => clamp(x + by)); }
    },
    role: 'slider', 'aria-label': 'Card width', 'aria-orientation': 'horizontal', 'aria-valuemin': range.min, 'aria-valuemax': range.max, 'aria-valuenow': Math.round(w),
  };
  return { w, grip };
}
// the edge to drag, just outside the card's right side
export function Edge({ grip }) {
  return (
    <button type="button" {...grip} className="group absolute top-1/2 -right-7 z-10 flex h-16 w-6 -translate-y-1/2 cursor-ew-resize touch-none items-center justify-center rounded-control outline-accent focus-visible:outline-2">
      <span className="h-9 w-1.5 rounded-full bg-ink-subtle/50 transition-colors group-hover:bg-ink-muted group-active:bg-accent" />
    </button>
  );
}

// a person's face, with their company's logo on its corner in the brand's colour: brand = { color, logo, glyph? }
export function Face({ src, brand, size = 'size-8' }) {
  return (
    <span className={'relative shrink-0 ' + size}>
      <img src={src} alt="" className="size-full rounded-full object-cover outline-1 -outline-offset-1 outline-black/10" />
      {brand ? (
        <span className="absolute -right-1 -bottom-1 grid size-[17px] place-items-center rounded-[5px] ring-2 ring-surface" style={{ background: brand.color }}>
          <span className="size-[9px]" style={{ background: brand.glyph ?? '#fff', mask: `url("${brand.logo}") center / contain no-repeat` }} />
        </span>
      ) : null}
    </span>
  );
}
