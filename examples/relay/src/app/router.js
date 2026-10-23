// A hash router: #/board, #/issues, … and #/board/WEB-185 to open an issue over the current screen. Enough for a
// demo that runs the same on Vite and Next.
import { useEffect, useState } from 'react';

export const routes = [
  { path: 'board', title: 'Board' },
  { path: 'issues', title: 'Issues' },
  { path: 'automations', title: 'Automations' },
  { path: 'inbox', title: 'Inbox' },
  { path: 'settings', title: 'Settings' },
  { path: 'specimen', title: 'Primitives' },
];

const read = () => {
  const [screen = 'board', issue = null] = location.hash.replace(/^#\/?/, '').split('/');
  return { screen: screen || 'board', issue };
};

export function useRoute() {
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const on = () => setRoute(read());
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  return route;
}

export const issueHref = (screen, key) => `#/${screen}/${key}`;
export const closeIssue = (screen) => { location.hash = `#/${screen}`; };
