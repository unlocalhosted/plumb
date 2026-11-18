// Quarry: the craft showcase (docs/craft/showcase.md).
//   /                 the 77 principles, each opening one example
//   /rule/16          principle #16: its example, and plumber's fix taken in place with the switch
//   /all, /all/fixed  the whole workspace with every mistake at once
//   /film/42          principle #42 as a marketing film: 16:9, signed with its number, React Plumber's mark
//   /clip/60          principle #60 as a social clip: 4:5, about 12 s, loops; no words on screen
//   /primitives       Quarry's look, three directions side by side, for the owner to pick
// Each mode loads its own sheet of source habits (broken.css or fixed.css).
import { createRoot } from 'react-dom/client';
import './theme.css';
import { Shell } from './Shell.jsx';
import { Index, Layout, Principle } from './principles/Principle.jsx';
import { Primitives } from './primitives/Primitives.jsx';
import { FilmPage } from './principles/FilmPage.jsx';
import { ClipPage } from './principles/ClipPage.jsx';
import { MarksProto } from './principles/proto/MarksProto.jsx';

const path = location.pathname.replace(/\/$/, '');
const rule = path.match(/^\/rule\/(\d+)(\/fixed)?$/);
const all = path.match(/^\/all(\/fixed)?$/);
const film = path.match(/^\/film\/(\d+)$/);
const clip = path.match(/^\/clip\/(\d+)$/);
const broken = rule ? !rule[2] : all ? !all[1] : true;
await (broken ? import('./broken.css') : import('./fixed.css'));
createRoot(document.getElementById('root')).render(
  path === '/proto/marks' ? <MarksProto /> : clip ? <ClipPage n={Number(clip[1])} /> : film ? <FilmPage n={Number(film[1])} /> : path === '/primitives' ? <Primitives /> : rule ? <Layout current={Number(rule[1])}><Principle n={Number(rule[1])} /></Layout> : all ? <Shell broken={broken} /> : <Index />,
);
