'use client';
// The floor of every page: Plumber's toys lie on it, out of place, and Clean up puts them on their gaps (pile.js).
// Behind each piece is a hidden fix (eggs.js): nothing says so until one is found, then the line under the title
// counts them. Pieces and button both work by keyboard, and the title says what happened.
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Toy } from './Toy.jsx';
import { Eggs } from './eggs.js';
import { Pile } from './pile.js';

// [toy, its name]
const PIECES = [['padding', 'Padding'], ['margin', 'Margin'], ['gap', 'Gap'], ['corner', 'Border radius'], ['type', 'Font size'],
  ['fill', 'Colour'], ['shadow', 'Shadow'], ['motion', 'Motion'], ['grid', 'Grid'], ['cursor', 'States']];

export function Floor() {
  const stage = useRef(null), pile = useRef(null), eggs = useRef(null);
  const path = usePathname();
  const [found, setFound] = useState(() => new Set());
  const [{ state, out }, setSaid] = useState({ state: 'waiting', out: PIECES.length });
  useEffect(() => {
    const show = new Eggs((name, point) => pile.current.lead(name, point));
    eggs.current = show;
    pile.current = new Pile(stage.current, setSaid, (name) => {
      setFound((was) => new Set(was).add(name));
      show.play(name);
    });
    return () => { show.stop(); pile.current.destroy(); };
  }, []);
  // a fix belongs to the page it started on
  useEffect(() => () => eggs.current?.stop(), [path]);
  const tidy = state === 'tidy' || state === 'tidying';
  const title = state === 'tidying' ? 'Cleaning up…'
    : tidy ? `All ${PIECES.length} back on your tokens.`
    : out === 1 ? '1 piece is out of place.' : `${out} pieces are out of place.`;
  const how = found.size === PIECES.length ? `You found all ${PIECES.length} hidden fixes.`
    : found.size ? `You found ${found.size} of the ${PIECES.length} fixes hidden here.`
    : tidy ? 'Pull one out and see what happens.' : 'Pick one up and throw it, or let Plumber put them back.';
  return (
    <div className="floor">
      <div className="floor-head">
        <div>
          <p className="floor-title" role="status">{title}</p>
          <p className="floor-how">{how}</p>
        </div>
        <button type="button" className={`s-btn floor-act ${tidy ? 'q' : ''}`} onClick={() => { eggs.current?.stop(); pile.current?.press(); }}><span>{tidy ? 'Mix them up' : 'Clean up'}</span></button>
      </div>
      <div ref={stage} className="pile">
        {PIECES.slice(1).map(([toy]) => <i key={toy} className="pile-gap" data-guide aria-hidden="true"><b /></i>)}
        {PIECES.map(([toy, name]) => (
          <button key={toy} type="button" className="piece" data-piece={toy} data-say={name} aria-label={name}>
            <span className="piece-body"><span className="piece-top"><Toy name={toy} size={40} /></span></span>
          </button>
        ))}
      </div>
    </div>
  );
}
