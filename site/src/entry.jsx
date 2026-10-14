import { createRoot } from 'react-dom/client';
import './styles.css';
import { DialRoot } from 'dialkit';
import 'dialkit/styles.css';

// Each page loads only when it's the one asked for: the homepage and the docs never carry the prototypes' code.
const PAGES = {
  '#primitives': () => import('./Specimen.jsx').then((m) => m.Specimen),
  '#systems': () => import('./system/Systems.jsx').then((m) => m.Systems),
  '#mascots': () => import('./system/Mascots.jsx').then((m) => m.Mascots),
  '#opening': () => import('./opening/Opening.jsx').then((m) => m.Opening),
};
const load = location.pathname.startsWith('/docs') ? () => import('./docs/Docs.jsx').then((m) => m.Docs) : (PAGES[location.hash] ?? (() => import('./Home.jsx').then((m) => m.Home)));

load().then((Page) =>
  createRoot(document.getElementById('root')).render(
    <>
      <Page />
      {/* live tuning panels, development only */}
      {import.meta.env.DEV && <DialRoot position="top-right" />}
    </>,
  ),
);
