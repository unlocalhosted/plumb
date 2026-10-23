// A hash router: #/board, #/issues, … Enough for a demo that runs the same on Vite and Next.
import { useEffect, useState } from 'react';

export const routes = [
  { path: 'board', title: 'Board' },
  { path: 'issues', title: 'Issues' },
  { path: 'automations', title: 'Automations' },
  { path: 'inbox', title: 'Inbox' },
  { path: 'settings', title: 'Settings' },
  { path: 'specimen', title: 'Primitives' },
];

const current = () => location.hash.replace(/^#\/?/, '') || 'board';

export function useRoute() {
  const [route, setRoute] = useState(current);
  useEffect(() => {
    const on = () => setRoute(current());
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  return route;
}
