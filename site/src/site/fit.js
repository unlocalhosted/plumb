// Fits a drawing's coordinate box into its container, centred, and maps drawing coordinates to CSS pixels so
// labels can be HTML at their true size beside a drawing that scales.
import { useLayoutEffect, useRef, useState } from 'react';

export function useFit(box) {
  const ref = useRef(null);
  const [fit, setFit] = useState({ k: 1, ox: 0, oy: 0, w: box.w, h: box.h });
  useLayoutEffect(() => {
    const set = (width, height) => {
      const k = Math.min(width / box.w, height / box.h);
      setFit({ k, ox: (width - box.w * k) / 2 - box.x * k, oy: (height - box.h * k) / 2 - box.y * k, w: width, h: height });
    };
    // measure before first paint, so the drawing never shows at the wrong place
    const r = ref.current.getBoundingClientRect();
    set(r.width, r.height);
    const ro = new ResizeObserver(([e]) => set(e.contentRect.width, e.contentRect.height));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [box.x, box.y, box.w, box.h]);
  const px = (x, y) => [fit.ox + x * fit.k, fit.oy + y * fit.k];
  return { ref, ...fit, px };
}
