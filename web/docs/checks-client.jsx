'use client';
// The list of checks, interactive: a concern's checks under its toy, a filter, and each check opening to what it
// catches and how it is fixed, with the fix's motion tile playing in it (one tile per kind of change).
import { useEffect, useMemo, useRef, useState } from 'react';
import { Toy } from '../site/Toy.jsx';

// what each concern is about, in a sentence a person can hold on to
const ABOUT = {
  system: 'Values set by hand instead of your theme’s tokens, and Tailwind’s defaults standing in for yours. Read from your code as well as your page.',
  craft: 'The finish a senior designer checks for: corners that nest, spacing that relates, type that is set, shadows from one light.',
  access: 'Whether everyone can use it: names for screen readers, contrast, targets big enough to tap, forms that say what they need.',
  slop: 'The marks a generated screen leaves: badges and dots that mean nothing, glows, two-hue gradients, cards that grow on hover.',
  words: 'How the words read: one fact a line, no narrating the screen, no subtitle that repeats its heading, lines that break well.',
  states: 'How it behaves: a press that answers, menus that open on press, motion you can interrupt, loading and empty states.',
};
const WHERE = { page: 'On the page', code: 'In your code' };

function Tile({ title, css }) {
  const host = useRef(null), tile = useRef(null);
  useEffect(() => {
    let gone = false;
    import('../../overlay/src/show-motion.js').then(({ mountTile }) => {
      if (gone || !host.current) return;
      tile.current = mountTile(host.current, title, { tokensCss: css });
      setTimeout(() => tile.current?.play(), 200);
    });
    return () => { gone = true; };
  }, [title, css]);
  return (
    <div className="ck-tile">
      <div ref={host} />
      <button type="button" onClick={() => tile.current?.play()}>▶ Play again</button>
    </div>
  );
}

// a check as a card: its name and where it is read; opened, it takes the whole row and says what it catches and how
// it is fixed, with the fix playing where there is one
function Card({ c, css, open, onOpen }) {
  return (
    <li className="ck-card" data-open={open || undefined}>
      <button type="button" className="ck-face" aria-expanded={open} onClick={onOpen}>
        <span className="ck-name">{c.name}</span>
        <span className="ck-meta"><span className="ck-where" data-where={c.where}>{WHERE[c.where]}</span>{c.tile && <span className="ck-plays">▶ Shows the fix</span>}</span>
      </button>
      {open && (
        <div className="ck-body">
          <div className="ck-text">
            <p><b>What it catches.</b> {c.why || 'See the rule for what it looks for.'}</p>
            <p><b>How Plumber fixes it.</b> {c.fix}</p>
            <p className="ck-id"><code>{c.id}</code></p>
          </div>
          {c.tile && <Tile title={c.tile} css={css} />}
        </div>
      )}
    </li>
  );
}

export function OverviewGrid({ data }) {
  return (
    <div className="ck">
      <style>{CSS}</style>
      <ul className="ck-concerns">
        {data.concerns.map((k) => (
          <li key={k.id}>
            <a href={`/docs/checks-${k.id}`}>
              <Toy name={k.toy} size={40} />
              <span className="ck-cname">{k.name}</span>
              <span className="ck-count">{data.checks.filter((c) => c.concern === k.id).length} checks</span>
              <span className="ck-cabout">{ABOUT[k.id]}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ConcernGrid({ css, concern, checks }) {
  const [q, setQ] = useState(''), [open, setOpen] = useState(null);
  const shown = useMemo(() => {
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return checks.filter((c) => !words.length || words.every((w) => `${c.name} ${c.why} ${c.id}`.toLowerCase().includes(w)));
  }, [q, checks]);
  return (
    <div className="ck">
      <style>{CSS}</style>
      <div className="ck-lead"><Toy name={concern.toy} size={44} /><p>{ABOUT[concern.id]}</p></div>
      <label className="ck-find"><span>Find a check</span><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="contrast, padding, badge…" /><small>{shown.length} of {checks.length}</small></label>
      {shown.length ? <ul className="ck-grid">{shown.map((c) => <Card key={c.id} c={c} css={css} open={open === c.id} onOpen={() => setOpen(open === c.id ? null : c.id)} />)}</ul> : <p className="ck-none">Nothing here matches.</p>}
    </div>
  );
}

const CSS = `
  .ck { --ck-gap: 10px; }
  .ck-find { display: flex; align-items: center; gap: 10px; margin: 0 0 8px; font: 500 14px var(--pl-sans); color: var(--pl-text-secondary); }
  .ck-find input { flex: 1; max-width: 360px; font: 500 15px var(--pl-sans); padding: 9px 12px; border-radius: 10px; border: 0; background: var(--pl-bg-inset); color: var(--pl-text-primary); }
  .ck-find input:focus-visible { outline: 2px solid var(--pl-sky); outline-offset: 1px; }
  .ck-find small { font: 500 12px var(--pl-mono); }
  /* the six concerns, as cards you go to */
  .ck .ck-concerns { list-style: none; margin: 22px 0 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 14px; }
  .ck-concerns a { display: grid; gap: 6px; align-content: start; height: 100%; box-sizing: border-box; padding: 18px; border-radius: 18px; background: var(--pl-bg-inset); color: var(--pl-text-primary); text-decoration: none;
    transition: background-color 160ms var(--pl-ease-out), translate 220ms var(--pl-spring); }
  @media (hover: hover) and (pointer: fine) { .ck-concerns a:hover { background: color-mix(in oklab, var(--pl-bg-inset) 80%, var(--pl-sky-soft)); translate: 0 -2px; } }
  .ck-concerns a:focus-visible { outline: 2px solid var(--pl-sky); outline-offset: 2px; }
  .ck-cname { margin-top: 6px; font: 650 18px/1.25 var(--pl-round, var(--pl-sans)); }
  .ck-count { font: 600 12.5px/1 var(--pl-mono); color: var(--pl-text-secondary); }
  .ck-cabout { font: 400 14px/1.5 var(--pl-sans); color: var(--pl-text-secondary); }
  /* a concern's page: its toy and sentence, a filter, the checks as a grid of cards */
  .ck-lead { display: flex; align-items: center; gap: 14px; margin: 6px 0 18px; } .ck-lead p { margin: 0; color: var(--pl-text-secondary); max-width: 620px; }
  .ck .ck-grid { list-style: none; margin: 14px 0 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(196px, 1fr)); gap: 10px; grid-auto-flow: dense; }
  .ck .ck-card { display: flex; flex-direction: column; margin: 0; border-radius: 14px; background: var(--pl-bg-inset); min-width: 0; }
  .ck-card[data-open] { grid-column: 1 / -1; }
  .ck-face { all: unset; box-sizing: border-box; width: 100%; flex: 1 0 auto; min-height: 92px; display: grid; align-content: space-between; gap: 12px; padding: 14px; border-radius: 14px; cursor: pointer; }
  @media (hover: hover) and (pointer: fine) { .ck-card:not([data-open]) .ck-face:hover { background: color-mix(in oklab, var(--pl-bg-inset) 75%, var(--pl-sky-soft)); } }
  .ck-face:focus-visible { outline: 2px solid var(--pl-sky); outline-offset: 2px; }
  .ck-name { font: 600 15px/1.35 var(--pl-sans); color: var(--pl-text-primary); }
  .ck-meta { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
  .ck-plays { font: 600 11.5px/1 var(--pl-sans); color: var(--pl-pink); }
  .ck-card[data-open] .ck-face { flex: none; min-height: 0; padding-bottom: 6px; }
  .ck-where { font: 600 11.5px/1 var(--pl-sans); padding: 5px 8px; border-radius: 99px; background: var(--pl-sky-soft); color: var(--pl-sky-ink); white-space: nowrap; }
  .ck-where[data-where="code"] { background: var(--pl-lilac-soft); color: var(--pl-lilac-ink); }
  /* the words first, then the fix playing at the row's full width (a tile is drawn for a stage this wide) */
  .ck-body { display: grid; gap: 14px; padding: 0 14px 16px; }
  .ck-text p { margin: 8px 0 0; font: 400 14.5px/1.55 var(--pl-sans); color: var(--pl-text-secondary); }
  .ck-text b { color: var(--pl-text-primary); font-weight: 650; }
  .ck-id code { font: 500 12px var(--pl-mono); color: var(--pl-text-secondary); }
  .ck-tile { display: grid; gap: 8px; justify-items: start; }
  .ck-tile > div { width: 100%; }
  .ck-tile button { font: 600 12px var(--pl-sans); padding: 7px 12px; border-radius: 9px; border: 0; background: var(--pl-bg-surface); color: var(--pl-text-primary); cursor: pointer; }
  .ck-none { color: var(--pl-text-secondary); }
`;
