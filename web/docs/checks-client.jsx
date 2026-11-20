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

function Row({ c, css }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="ck-row" data-open={open || undefined}>
      <button type="button" className="ck-head" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="ck-name">{c.name}</span>
        <span className="ck-where" data-where={c.where}>{WHERE[c.where]}</span>
        <i className="ck-chev" aria-hidden="true" />
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

export function ChecksClient({ css, data }) {
  const [q, setQ] = useState('');
  const groups = useMemo(() => {
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const hit = (c) => !words.length || words.every((w) => `${c.name} ${c.why} ${c.id}`.toLowerCase().includes(w));
    return data.concerns.map((k) => ({ ...k, checks: data.checks.filter((c) => c.concern === k.id && hit(c)) }));
  }, [q, data]);
  const shown = groups.reduce((n, g) => n + g.checks.length, 0);
  return (
    <div className="ck">
      <style>{CSS}</style>
      <nav className="ck-jump" aria-label="Concerns">
        {data.concerns.map((k) => (
          <a key={k.id} href={`#${k.id}`}><Toy name={k.toy} size={22} /><span>{k.short}</span><b>{data.checks.filter((c) => c.concern === k.id).length}</b></a>
        ))}
      </nav>
      <label className="ck-find"><span>Find a check</span><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="contrast, padding, badge…" /><small>{shown} shown</small></label>
      {groups.map((g) => (
        <section key={g.id} id={g.id} className="ck-group">
          <h2><Toy name={g.toy} size={30} />{g.name} <small>{g.checks.length}</small></h2>
          <p className="ck-about">{ABOUT[g.id]}</p>
          {g.checks.length ? <ul>{g.checks.map((c) => <Row key={c.id} c={c} css={css} />)}</ul> : <p className="ck-none">Nothing here matches.</p>}
        </section>
      ))}
    </div>
  );
}

const CSS = `
  .ck { --ck-gap: 10px; }
  .ck-jump { display: flex; flex-wrap: wrap; gap: 8px; margin: 18px 0 14px; }
  .ck-jump a { display: inline-flex; align-items: center; gap: 8px; padding: 8px 12px 8px 8px; border-radius: 12px; background: var(--pl-bg-inset); color: var(--pl-text-primary); text-decoration: none; font: 600 14px/1 var(--pl-sans); }
  .ck-jump a b { font: 600 12px/1 var(--pl-mono); color: var(--pl-text-secondary); }
  @media (hover: hover) and (pointer: fine) { .ck-jump a:hover { background: color-mix(in oklab, var(--pl-bg-inset) 70%, var(--pl-sky-soft)); } }
  .ck-find { display: flex; align-items: center; gap: 10px; margin: 0 0 8px; font: 500 14px var(--pl-sans); color: var(--pl-text-secondary); }
  .ck-find input { flex: 1; max-width: 360px; font: 500 15px var(--pl-sans); padding: 9px 12px; border-radius: 10px; border: 0; background: var(--pl-bg-inset); color: var(--pl-text-primary); }
  .ck-find input:focus-visible { outline: 2px solid var(--pl-sky); outline-offset: 1px; }
  .ck-find small { font: 500 12px var(--pl-mono); }
  .ck-group { margin: 44px 0 0; scroll-margin-top: 80px; }
  .ck-group h2 { display: flex; align-items: center; gap: 10px; margin: 0 0 4px; }
  .ck-group h2 small { font: 600 14px var(--pl-mono); color: var(--pl-text-secondary); }
  .ck-about { margin: 0 0 12px; color: var(--pl-text-secondary); max-width: 660px; }
  .ck-group ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; }
  .ck-head { all: unset; box-sizing: border-box; width: 100%; display: grid; grid-template-columns: 1fr auto 14px; gap: 12px; align-items: center; padding: 11px 12px; border-radius: 12px; cursor: pointer; font: 500 15px/1.3 var(--pl-sans); color: var(--pl-text-primary); }
  @media (hover: hover) and (pointer: fine) { .ck-head:hover { background: var(--pl-bg-inset); } }
  .ck-head:focus-visible { outline: 2px solid var(--pl-sky); outline-offset: -2px; }
  .ck-row[data-open] .ck-head { background: var(--pl-bg-inset); border-radius: 12px 12px 0 0; font-weight: 650; }
  .ck-where { font: 600 11.5px/1 var(--pl-sans); padding: 5px 8px; border-radius: 99px; background: var(--pl-sky-soft); color: var(--pl-sky-ink); white-space: nowrap; }
  .ck-where[data-where="code"] { background: var(--pl-lilac-soft); color: var(--pl-lilac-ink); }
  .ck-chev { width: 7px; height: 7px; border-right: 1.75px solid var(--pl-text-secondary); border-bottom: 1.75px solid var(--pl-text-secondary); rotate: 45deg; translate: 0 -2px; transition: rotate 200ms var(--pl-ease-out); }
  .ck-row[data-open] .ck-chev { rotate: 225deg; translate: 0 2px; }
  /* the words first, then the fix playing at the row's full width (a tile is drawn for a stage this wide) */
  .ck-body { display: grid; gap: 14px; padding: 6px 12px 16px; background: var(--pl-bg-inset); border-radius: 0 0 12px 12px; }
  .ck-text p { margin: 8px 0 0; font: 400 14.5px/1.55 var(--pl-sans); color: var(--pl-text-secondary); }
  .ck-text b { color: var(--pl-text-primary); font-weight: 650; }
  .ck-id code { font: 500 12px var(--pl-mono); color: var(--pl-text-secondary); }
  .ck-tile { display: grid; gap: 8px; justify-items: start; }
  .ck-tile > div { width: 100%; }
  .ck-tile button { font: 600 12px var(--pl-sans); padding: 7px 12px; border-radius: 9px; border: 0; background: var(--pl-bg-surface); color: var(--pl-text-primary); cursor: pointer; }
  .ck-none { color: var(--pl-text-secondary); }
`;
