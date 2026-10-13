// True below the sm breakpoint, where figures drop to their phone drawings.
import { useEffect, useState } from 'react';

const Q = '(max-width: 639px)';

export function useNarrow() {
  const [narrow, setNarrow] = useState(() => matchMedia(Q).matches);
  useEffect(() => {
    const m = matchMedia(Q);
    const on = () => setNarrow(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return narrow;
}
