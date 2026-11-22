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
const FRESH = { left: TOTAL, able: null, toys: {} };

export function Floor() {
  const stage = useRef(null), pile = useRef(null), eggs = useRef(null), fixes = useRef(null), next = useRef(undefined);
  const path = usePathname(), router = useRouter(), here = useRef(path);
  here.current = path;
  const [pileIs, setPileIs] = useState('waiting');
  const [{ left, able, toys }, setCount] = useState(FRESH);
  const [found, setFound] = useState(null);

  useEffect(() => {
    const f = new Fixes();
    const count = () => setCount({ left: f.left, able: f.open().length, toys: Object.fromEntries(PIECES.map(([t]) => [t, f.open(t).length])) });
    fixes.current = f;
    eggs.current = new Eggs({
      fixes: f, card: setFound,
      lead: (name, point) => pile.current?.lead(name, point) ?? (() => {}),
      changed() {
        count();
        if (!f.open().length) burst(document.body, innerWidth / 2, innerHeight * 0.6, { pieces: 64 });
      },
    });
    pile.current = new Pile(stage.current, ({ state }) => setPileIs(state), (toy) => start(toy));
    count();
    return () => { eggs.current.stop(); pile.current.destroy(); f.destroy(); };
  }, []);

  // the faults are the homepage's: from any other page a press goes there first
  function start(toy) {
    if (here.current === '/') return eggs.current.play(toy);
    next.current = toy ?? null;
    router.push('/', { scroll: false });
  }
  useEffect(() => {
    if (path === '/' && next.current !== undefined) {
      const toy = next.current;
      next.current = undefined;
      const wait = setTimeout(() => eggs.current.play(toy ?? undefined), 900); // long enough for the sections to draw
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
            {done ? <><b className="floor-n" key={left}>{left}</b> left, and they need code.</> : <>{where} has <b className="floor-n" key={left}>{left}</b> issues.</>}
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
      <div ref={stage} className="pile">
        {PIECES.slice(1).map(([toy]) => <i key={toy} className="pile-gap" data-guide aria-hidden="true"><b /></i>)}
        {PIECES.map(([toy, name]) => {
          const n = toys[toy], say = n === undefined ? name : n ? `${name} · ${n} to fix` : `${name} · fixed`;
          return (
            <button key={toy} type="button" className="piece" data-piece={toy} data-say={say} data-fixed={n === 0 || undefined} aria-label={say}>
              <span className="piece-body"><span className="piece-top"><Toy name={toy} size={40} /><i className="piece-done" aria-hidden="true" /></span></span>
            </button>
          );
        })}
      </div>
      {found && (
        <div className="found" role="status" data-done={found.done || undefined}>
          <b>{found.title}</b>
          {found.at && <span><code>{found.at}</code>{found.more ? ` and ${found.more} more like it` : ''}</span>}
        </div>
      )}
    </div>
  );
}
