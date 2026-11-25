'use client';
// The floor of every page: what Plumber found on this site's homepage and nobody fixed, and the toys that fix it
// (eggs.js, fixes.js). The count is the record's, never typed here (scripts/findings.mjs). It falls as fixes land and
// stays down for the visit; what is left at the end needs code, and says so with the command.
import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { burst } from '../../overlay/src/burst.js';
import { Toy } from './Toy.jsx';
import { Eggs } from './eggs.js';
import { Fixes, TOTAL } from './fixes.js';
import { Pile } from './pile.js';

// [toy, its name]
const PIECES = [['padding', 'Padding'], ['margin', 'Margin'], ['gap', 'Gap'], ['corner', 'Border radius'], ['type', 'Type'],
  ['fill', 'Colour'], ['shadow', 'Shadow'], ['motion', 'Motion'], ['grid', 'Alignment'], ['cursor', 'States and access']];
const FRESH = { left: TOTAL, able: null, toys: {}, cant: {}, none: 0 };

export function Floor() {
  const stage = useRef(null), pile = useRef(null), eggs = useRef(null), fixes = useRef(null), next = useRef(undefined);
  const path = usePathname(), router = useRouter(), here = useRef(path);
  here.current = path;
  const [yay, setYay] = useState(null), yayOff = useRef(0);
  const [pileIs, setPileIs] = useState('waiting');
  const [{ left, able, toys, cant, none }, setCount] = useState(FRESH);

  useEffect(() => {
    const f = new Fixes();
    const count = () => setCount({ left: f.left, able: f.open().length, none: f.cant(), cant: Object.fromEntries(PIECES.map(([t]) => [t, f.cant(t)])), toys: Object.fromEntries(PIECES.map(([t]) => [t, f.open(t).length])) });
    fixes.current = f;
    eggs.current = new Eggs({
      fixes: f,
      lead: (name, point) => pile.current?.lead(name, point) ?? (() => {}),
      changed: count,
      // a tour ran to its end: the toys jump, the pieces fly, and the floor says so
      done(toy, n) {
        const all = !toy || !f.open().length, box = stage.current.getBoundingClientRect(), at = (!all && pile.current.at(toy)) || { x: box.left + box.width / 2, y: box.bottom - 40 };
        pile.current.cheer(all ? undefined : toy);
        burst(document.body, at.x, at.y, { pieces: all ? 110 : 48 });
        if (all) for (const [k, x] of [[260, 0.22], [480, 0.78]]) setTimeout(() => burst(document.body, box.left + box.width * x, box.bottom - 40, { pieces: 70 }), k);
        const name = PIECES.find(([t]) => t === toy)?.[1];
        clearTimeout(yayOff.current);
        setYay({ id: Date.now(), all, say: all ? 'Yay! All fixed.' : `Yay! ${name} is fixed.`, sub: all ? `${TOTAL - f.left} fixes, and you watched every one.` : `${n} down. Pick another toy.` });
        yayOff.current = setTimeout(() => setYay(null), all ? 5200 : 3200);
      },
    });
    pile.current = new Pile(stage.current, ({ state }) => setPileIs(state), (toy) => start(toy));
    count();
    return () => { clearTimeout(yayOff.current); eggs.current.stop(); pile.current.destroy(); f.destroy(); };
  }, []);

  // the faults are the homepage's: from any other page a press goes there first
  function start(toy) {
    if (here.current === '/') return eggs.current.ride(toy);
    next.current = toy ?? null;
    router.push('/', { scroll: false });
  }
  useEffect(() => {
    if (path === '/' && next.current !== undefined) {
      const toy = next.current;
      next.current = undefined;
      const wait = setTimeout(() => (eggs.current.ride(toy)), 900); // long enough for the sections to draw
      return () => clearTimeout(wait);
    }
    return () => eggs.current?.stop();
  }, [path]);

  const done = able === 0, tidy = pileIs === 'tidy' || pileIs === 'tidying';
  const press = () => {
    if (done) { eggs.current?.stop(); pile.current?.press(); return; }
    if (!tidy) pile.current?.press();
    start();
  };
  const where = path === '/' ? 'This LLM-generated page' : 'Our LLM-generated homepage';
  return (
    <div className="floor">
      <div className="floor-head">
        <div>
          <p className="floor-title" role="status">
            {done ? <><b className="floor-n" key={left}>{left}</b> left, and they need code{none ? ' or a newer browser' : ''}.</> : <>{where} has <b className="floor-n" key={left}>{left}</b> issues.</>}
          </p>
          <p className="floor-how">
            {done ? <>You fixed {TOTAL - left}. For the rest, and for your own app, run <code>npx plumber check</code></>
              : left < TOTAL ? <>You’ve fixed {TOTAL - left}. {able} more can be fixed from here.</>
              : <>Plumber found them and we haven’t fixed them. Fix them yourself: press a toy.</>}
          </p>
        </div>
        <button type="button" className={`s-btn floor-act ${done ? 'q' : ''}`} onClick={press}>
          <span>{done ? (tidy ? 'Mix them up' : 'Clean up') : able === null ? 'Fix them' : `Fix ${able}`}</span>
        </button>
      </div>
      {yay && (
        <p className="yay" role="status" key={yay.id} data-all={yay.all || undefined}>
          <b aria-label={yay.say}>{[...yay.say].map((c, i) => <i key={i} aria-hidden="true" style={{ '--i': i }}>{c === ' ' ? '\u00a0' : c}</i>)}</b>
          <span>{yay.sub}</span>
        </p>
      )}
      <div ref={stage} className="pile">
        {PIECES.slice(1).map(([toy]) => <i key={toy} className="pile-gap" data-guide aria-hidden="true"><b /></i>)}
        {PIECES.map(([toy, name]) => {
          const n = toys[toy], not = cant[toy] > 0;
          const say = n === undefined ? name : n ? `${name} · ${n} to fix` : not ? `${name} · not in this browser` : `${name} · fixed`;
          return (
            <button key={toy} type="button" className="piece" data-piece={toy} data-say={say} data-fixed={(n === 0 && !not) || undefined} aria-label={say}>
              <span className="piece-body"><span className="piece-top"><Toy name={toy} size={40} /><i className="piece-done" aria-hidden="true" /></span></span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
