// Three concepts for "start on the repo you have", as art pieces with very few words (owner, 2026-11-04: the idea was
// wrong, the bar is an art piece, three concepts first). Each says one truth: today's problems are kept as they
// are; only a new one shows. Static, to choose by seeing. Dev only.
//   A  the day you start   a line in time: before it, today's problems under frosted glass; after it, one new one
//   B  sealed              today's problems suspended in a slab of glass; one new one glowing outside it
//   C  still water         today's problems lie still on the bottom; one new one drops in and makes waves
import { createRoot } from 'react-dom/client';
import '../theme.css';
import '../surfaces.css';
import './concepts.css';

const N = 94; // the homepage's own known problems
const rand = i => { const x = Math.sin(i * 12.9898) * 43758.5453; return x - Math.floor(x); }; // the same scatter every time
const spots = (n, x0, x1, y0, y1, seed = 0) => Array.from({ length: n }, (_, i) => ({
  x: x0 + rand(i + seed) * (x1 - x0), y: y0 + rand(i + seed + 500) * (y1 - y0), s: rand(i + seed + 900), d: rand(i + seed + 1300),
}));

function DayYouStart() {
  return (
    <div className="art art-a pl-light">
      <div className="field-glow" aria-hidden="true"><i /></div>
      <div className="a-past">
        {spots(N, 4, 92, 10, 90, 1).map((p, i) => <i key={i} style={{ left: `${p.x}%`, top: `${p.y}%`, '--s': 5 + p.s * 9 }} />)}
      </div>
      <div className="a-frost" aria-hidden="true" />
      <span className="a-tag a-tag-kept">94 kept</span>
      <div className="a-line"><span className="a-tag">today</span></div>
      <div className="a-new"><i /><i /><i /><b /></div>
      <span className="a-tag a-tag-new">1 new</span>
    </div>
  );
}

function Sealed() {
  return (
    <div className="art art-b pl-light">
      <div className="field-glow" aria-hidden="true"><i /></div>
      <div className="b-slab">
        {spots(N, 6, 94, 8, 86, 7).map((p, i) => (
          <i key={i} style={{ left: `${p.x}%`, top: `${p.y}%`, '--s': 4 + p.s * 8, '--depth': p.d }} />
        ))}
        <span className="b-etch">94</span>
        <span className="b-etch-sub">kept as they were</span>
      </div>
      <div className="b-new"><b /><span>1 new</span></div>
    </div>
  );
}

function StillWater() {
  return (
    <div className="art art-c pl-light">
      <div className="field-glow" aria-hidden="true"><i /></div>
      <div className="c-bed">
        {spots(N, 3, 97, 6, 94, 13).map((p, i) => (
          <i key={i} style={{ left: `${p.x}%`, top: `${p.y}%`, '--s': 8 + p.s * 10, rotate: `${p.d * 180}deg` }} />
        ))}
      </div>
      <div className="c-caustics" aria-hidden="true" />
      <svg className="c-ripple" viewBox="-160 -160 320 320" aria-hidden="true">
        {[22, 44, 70, 100, 134].map((r, k) => <circle key={r} r={r} style={{ '--k': k }} />)}
        <circle className="c-drop" r="9" />
      </svg>
      <span className="c-tag c-tag-still">94 lying still</span>
      <span className="c-tag c-tag-new">1 new</span>
    </div>
  );
}

const CONCEPTS = [
  ['A', 'The day you start', 'A line in time. Before it, today’s problems, frosted over and left alone. After it, the one new problem stands out.', DayYouStart],
  ['B', 'Sealed', 'Today’s problems, suspended in a slab of glass: kept, visible, harmless. One new one glows outside it.', Sealed],
  ['C', 'Still water', 'Today’s problems lie still on the bottom. A new one drops in, and only it makes waves.', StillWater],
];

createRoot(document.getElementById('root')).render(
  <main className="concepts">
    {CONCEPTS.map(([k, name, why, Art]) => (
      <section key={k} className="concept">
        <header><b>{k}</b><h2>{name}</h2><p>{why}</p></header>
        <Art />
      </section>
    ))}
  </main>,
);
