// Quarry: the craft showcase (docs/craft/showcase.md).
//   /                 the 77 principles, each opening one example
//   /rule/16          principle #16's example, broken; /rule/16/fixed the same example built right
//   /all, /all/fixed  the whole workspace with every mistake at once
// Each mode loads its own sheet of source habits (broken.css or fixed.css).
import { createRoot } from 'react-dom/client';
import './theme.css';
import { Shell } from './Shell.jsx';
import { Index, Principle } from './principles/Principle.jsx';

const path = location.pathname.replace(/\/$/, '');
const rule = path.match(/^\/rule\/(\d+)(\/fixed)?$/);
const all = path.match(/^\/all(\/fixed)?$/);
const broken = rule ? !rule[2] : all ? !all[1] : true;
await (broken ? import('./broken.css') : import('./fixed.css'));
createRoot(document.getElementById('root')).render(
  rule ? <Principle n={Number(rule[1])} broken={broken} /> : all ? <Shell broken={broken} /> : <Index />,
);
