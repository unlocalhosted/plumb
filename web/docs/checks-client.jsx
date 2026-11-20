'use client';
// The list of checks, interactive: a concern's checks under its toy, a filter, and each check as a card. A check with
// an example is the example itself: its scene, a Broken / Fixed toggle that plays the fix, the code line, the note.
// Nothing opens (owner, 2026-11-20: no inline growing, no side drawer), so the grid never moves.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Toy } from '../site/Toy.jsx';
import { Specimen, hasExample } from './examples/system.jsx';

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

// a check as a card, four rows of the grid's subgrid so a row of cards lines up: with an example, the scene, the
// toggle and code, the name, the note; without one, the name, what it catches, how it is fixed, the rule
function Card({ c, css }) {
  const head = <div className="ck-head"><h3 className="ck-name">{c.name}</h3><span className="ck-where" data-where={c.where}>{WHERE[c.where]}</span></div>;
  if (hasExample(c.id)) return <li className="ck-card" data-ex><Specimen id={c.id} css={css} head={head} /></li>;
  return (
    <li className="ck-card">
      {head}
      <p className="ck-text"><b>What it catches.</b> {c.why || 'See the rule for what it looks for.'}</p>
      <p className="ck-text"><b>How Plumber fixes it.</b> {c.fix}</p>
      <code className="ck-id">{c.id}</code>
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
  const [q, setQ] = useState('');
  const shown = useMemo(() => {
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return checks.filter((c) => !words.length || words.every((w) => `${c.name} ${c.why} ${c.id}`.toLowerCase().includes(w)));
  }, [q, checks]);
  return (
    <div className="ck">
      <style>{CSS}</style>
      <div className="ck-lead"><Toy name={concern.toy} size={44} /><p>{ABOUT[concern.id]}</p></div>
      <label className="ck-find"><span>Find a check</span><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="contrast, padding, badge…" /><small>{shown.length} of {checks.length}</small></label>
      {shown.length ? <ul className="ck-grid">{shown.map((c) => <Card key={c.id} c={c} css={css} />)}</ul> : <p className="ck-none">Nothing here matches.</p>}
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
  /* a concern's page: its toy and sentence, a filter, the checks as a grid of cards that never move */
  .ck-lead { display: flex; align-items: center; gap: 14px; margin: 6px 0 18px; } .ck-lead p { margin: 0; color: var(--pl-text-secondary); max-width: 620px; }
  .ck .ck-grid { list-style: none; margin: 14px 0 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr)); gap: 16px 14px; }
  .ck .ck-card { grid-row: span 4; display: grid; grid-template-rows: subgrid; grid-template-columns: minmax(0, 1fr); row-gap: 12px; align-content: start; margin: 0; padding: 10px 10px 16px; border-radius: 20px; background: var(--pl-bg-inset); min-width: 0; }
  .ck .ck-card:not([data-ex]) { padding: 16px; }
  .ck-card > :not(.sp-stage) { margin-inline: 4px; }
  .ck-head { display: flex; flex-wrap: wrap; gap: 6px 10px; align-items: baseline; justify-content: space-between; }
  .ck .ck-name { margin: 0; font: 650 16px/1.3 var(--pl-sans); color: var(--pl-text-primary); }
  .ck-where { font: 600 11.5px/1 var(--pl-sans); padding: 5px 8px; border-radius: 99px; background: var(--pl-sky-soft); color: var(--pl-sky-ink); white-space: nowrap; }
  .ck-where[data-where="code"] { background: var(--pl-lilac-soft); color: var(--pl-lilac-ink); }
  .ck .ck-text { margin: 0; font: 400 14px/1.5 var(--pl-sans); color: var(--pl-text-secondary); }
  .ck-text b { color: var(--pl-text-primary); font-weight: 650; }
  .ck-id { align-self: end; justify-self: start; font: 500 12px var(--pl-mono); color: var(--pl-text-secondary); }
  .ck-none { color: var(--pl-text-secondary); }
`;
