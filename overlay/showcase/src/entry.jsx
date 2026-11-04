// Quarry: the craft showcase (docs/craft/showcase.md).
//   /                 the 77 principles, each opening one example
//   /rule/16          principle #16: its example, and plumber's fix taken in place with the switch
//   /all, /all/fixed  the whole workspace with every mistake at once
//   /primitives       Quarry's look, three directions side by side, for the owner to pick
// Each mode loads its own sheet of source habits (broken.css or fixed.css).
import { createRoot } from 'react-dom/client';
import './theme.css';
import { Shell } from './Shell.jsx';
import { Index, Layout, Principle } from './principles/Principle.jsx';
import { Primitives } from './primitives/Primitives.jsx';
import { HandsOnPage } from './principles/hands-on.jsx';

const path = location.pathname.replace(/\/$/, '');
const rule = path.match(/^\/rule\/(\d+)(\/fixed)?$/);
const hands = path.match(/^\/hands-on\/(\d+)$/); // a hands-on example alone with its switch (principles/hands-on.jsx)
const all = path.match(/^\/all(\/fixed)?$/);
const broken = rule ? !rule[2] : all ? !all[1] : true;
await (broken ? import('./broken.css') : import('./fixed.css'));
createRoot(document.getElementById('root')).render(
  path === '/primitives' ? <Primitives /> : hands ? <HandsOnPage n={Number(hands[1])} /> : rule ? <Layout current={Number(rule[1])}><Principle n={Number(rule[1])} /></Layout> : all ? <Shell broken={broken} /> : <Index />,
);
