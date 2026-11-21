// One recommendation for crafting attention's buy button, live, in its own skin (skin.json, read off the shipped
// button), for the plumber site's recommendations page: index.html?r=<id> in an iframe per recommendation.
import { createRoot } from 'react-dom/client';
import { Pour } from '../playground/atoms/native/pour.jsx';
import { Lead } from '../playground/atoms/native/lead.jsx';
import { Answer } from '../playground/atoms/native/answer.jsx';
import { Sheen } from '../playground/atoms/native/sheen.jsx';
import { Metal } from '../playground/atoms/native/metal.jsx';
import { Beam } from '../playground/atoms/native/beam.jsx';
import skins from './skin.json';
import '../playground/atoms/native/press.css';
// the pairing solver's sets: each suggestion's colours, words and shadows per state, per mode
import.meta.glob('../playground/atoms/native/sets/*.css', { eager: true });
// the button as shipped: one press, the arrow nudging on hover, nothing more
const Shipped = ({ label, icon }) => <button type="button" className="np"><span className="np-row"><span>{label}</span>{icon}</span></button>;
const ARROW = <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M10 4h2v2h2v2h2v4h-2v2h-2v2h-2v-2h2v-2H4V8h8V6h-2Z" /></svg>;
const R = { shipped: Shipped, metal: Metal, beam: Beam, pour: Pour, lead: Lead, answer: Answer, sheen: Sheen };
const C = R[new URLSearchParams(location.search).get('r')] ?? Pour;
const icon = <span className="np-icon" aria-hidden>{ARROW}</span>;
// crafting attention's light page or its dark one (?mode=dark), skin and page colour read off each
const mode = new URLSearchParams(location.search).get('mode') === 'dark' ? 'dark' : 'light', skin = skins[mode];
document.body.style.background = skins.page[mode];
document.documentElement.dataset.product = 'craftingattention'; document.documentElement.dataset.mode = mode;
const id = new URLSearchParams(location.search).get('r') ?? 'pour';
createRoot(document.getElementById('root')).render(
  <div style={{ ...skin, width: '100%', display: 'grid', placeItems: 'center', fontFamily: skin['--atom-font'] }}>
    <div data-form={`native/${id}`} style={{ width: '100%', display: 'grid', placeItems: 'center' }}><C label="Start with an account" doneLabel="Opening checkout" icon={icon} /></div>
  </div>);
