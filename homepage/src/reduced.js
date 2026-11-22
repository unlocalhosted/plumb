// Whether the person asked for less motion, the same on the server and on the first render in the browser (a page
// rendered as files can't know, so both start from "no"), then the real answer before anything plays. Read while
// rendering, it made the first render differ from the file's and React threw the page away (journey, "Made sure, then deployed").
import { useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';
const watch = (changed) => {
  const media = matchMedia(QUERY);
  media.addEventListener('change', changed);
  return () => media.removeEventListener('change', changed);
};

export function useReduced() {
  return useSyncExternalStore(watch, () => matchMedia(QUERY).matches, () => false);
}
