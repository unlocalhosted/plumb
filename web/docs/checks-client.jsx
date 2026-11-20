'use client';
// The list of checks, interactive: a concern's checks under its toy, a filter, and each check opening to what it
// catches and how it is fixed, with the fix's motion tile playing in it (one tile per kind of change).
import { useEffect, useMemo, useRef, useState } from 'react';
import { Toy } from '../site/Toy.jsx';
import { Specimen, Thumb, hasExample } from './examples/system.jsx';

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

// a check as a card in the grid: its picture (its broken state), its name, where it is read. Pressed, it opens in the
// panel beside the grid; the card itself never grows, so the grid never moves
function Card({ c, css, selected, onOpen }) {
  const ex = hasExample(c.id);
  return (
    <li className="ck-card" data-selected={selected || undefined} data-ex={ex || undefined}>
      <button type="button" className="ck-face" aria-haspopup="dialog" aria-current={selected || undefined} onClick={(e) => onOpen(e)}>
        {ex && <Thumb id={c.id} css={css} />}
        <span className="ck-name">{c.name}</span>
        <span className="ck-meta"><span className="ck-where" data-where={c.where}>{WHERE[c.where]}</span>{(ex || c.tile) && <span className="ck-plays">Play the fix</span>}</span>
      </button>
    </li>
  );
}

// The panel a check opens in (owner, 2026-11-20: "i click on something the cards slide"): it slides in from the right
// over the page's edge and leaves the grid where it is; the previous and next check are a key away (← →), Esc closes.
function Panel({ c, css, at, of, onPrev, onNext, onClose }) {
  const ref = useRef(null), ex = c && hasExample(c.id);
  useEffect(() => {
    if (!c) return;
    ref.current?.focus({ preventScroll: true });
    const key = (e) => {
      if (e.target.closest?.('input, textarea, [role="slider"], [role="radiogroup"]')) return;
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); onNext(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); onPrev(); }
    };
    addEventListener('keydown', key);
    return () => removeEventListener('keydown', key);
  }, [c, onClose, onNext, onPrev]);
  return (
    <aside className="ck-panel" data-on={c ? '' : undefined} role="dialog" aria-modal="false" aria-label={c?.name ?? 'Check'} tabIndex={-1} ref={ref}>
      {c && (
        <div className="ck-pin" key={c.id}>
          <header className="ck-ph">
            <div className="ck-pt"><span className="ck-where" data-where={c.where}>{WHERE[c.where]}</span><h2>{c.name}</h2></div>
            <div className="ck-pnav">
              <button type="button" onClick={onPrev} aria-label="Previous check" disabled={at <= 0}>‹</button>
              <span>{at + 1} of {of}</span>
              <button type="button" onClick={onNext} aria-label="Next check" disabled={at >= of - 1}>›</button>
              <button type="button" className="ck-x" onClick={onClose} aria-label="Close">×</button>
            </div>
          </header>
          <div className="ck-pbody">
            {ex ? <Specimen id={c.id} css={css} /> : c.tile ? <Tile title={c.tile} css={css} /> : null}
            <div className="ck-text">
              {!ex && <p><b>What it catches.</b> {c.why || 'See the rule for what it looks for.'}</p>}
              <p><b>How Plumber fixes it.</b> {c.fix}</p>
              <p className="ck-id"><code>{c.id}</code></p>
            </div>
          </div>
        </div>
      )}
    </aside>
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
  const [q, setQ] = useState(''), [open, setOpen] = useState(null), last = useRef(null);
  const shown = useMemo(() => {
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return checks.filter((c) => !words.length || words.every((w) => `${c.name} ${c.why} ${c.id}`.toLowerCase().includes(w)));
  }, [q, checks]);
  const at = shown.findIndex((c) => c.id === open);
  return (
    <div className="ck">
      <style>{CSS}</style>
      <div className="ck-lead"><Toy name={concern.toy} size={44} /><p>{ABOUT[concern.id]}</p></div>
      <label className="ck-find"><span>Find a check</span><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="contrast, padding, badge…" /><small>{shown.length} of {checks.length}</small></label>
      {shown.length ? <ul className="ck-grid">{shown.map((c) => <Card key={c.id} c={c} css={css} selected={open === c.id} onOpen={(e) => { last.current = e?.currentTarget ?? null; setOpen(c.id); }} />)}</ul> : <p className="ck-none">Nothing here matches.</p>}
      <Panel c={shown.find((c) => c.id === open) ?? null} css={css} at={at} of={shown.length}
        onPrev={() => at > 0 && setOpen(shown[at - 1].id)} onNext={() => at < shown.length - 1 && setOpen(shown[at + 1].id)}
        onClose={() => { setOpen(null); last.current?.focus?.({ preventScroll: true }); }} />
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
  .ck .ck-grid { list-style: none; margin: 14px 0 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(196px, 1fr)); gap: 10px; }
  .ck .ck-card { display: flex; flex-direction: column; margin: 0; border-radius: 18px; background: var(--pl-bg-inset); min-width: 0; transition: translate 240ms var(--pl-spring), box-shadow 240ms var(--pl-ease-out); }
  @media (hover: hover) and (pointer: fine) { .ck .ck-card:not([data-open]):hover { translate: 0 -2px; box-shadow: 0 10px 24px -14px rgb(0 0 0 / .45); } }
  .ck .ck-card[data-ex] .ck-face { padding: 8px 8px 14px; gap: 10px; align-content: start; }
  .ck .ck-card[data-ex] .ck-face .ck-name, .ck .ck-card[data-ex] .ck-face .ck-meta { padding: 0 6px; }
  .ck .ck-card[data-ex] .ck-text p { font-size: 13.5px; } /* with a specimen, the fix line and the rule are the small print under it */
  .ck-face { all: unset; box-sizing: border-box; width: 100%; flex: 1 0 auto; min-height: 92px; display: grid; align-content: space-between; gap: 12px; padding: 14px; border-radius: 14px; cursor: pointer; }
  @media (hover: hover) and (pointer: fine) { .ck-card:not([data-open]) .ck-face:hover { background: color-mix(in oklab, var(--pl-bg-inset) 75%, var(--pl-sky-soft)); } }
  .ck-face:focus-visible { outline: 2px solid var(--pl-sky); outline-offset: 2px; }
  .ck-name { font: 600 15px/1.35 var(--pl-sans); color: var(--pl-text-primary); }
  .ck-meta { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
  .ck .ck-card[data-selected] { box-shadow: 0 0 0 2px var(--pl-pink); }
  /* the panel: slides in from the right over the page's edge, the grid stays where it is */
  .ck-panel { position: fixed; top: 76px; right: 16px; bottom: 16px; z-index: 40; width: min(640px, calc(100vw - 32px)); box-sizing: border-box; overflow: auto; overscroll-behavior: contain;
    border-radius: 22px; background: var(--pl-bg-surface); color: var(--pl-text-primary); box-shadow: 0 24px 60px -20px rgb(0 0 0 / .55), 0 0 0 1px color-mix(in oklab, var(--pl-text-primary) 8%, transparent);
    transform: translateX(calc(100% + 32px)); visibility: hidden; transition: transform 480ms var(--pl-spring), visibility 0s linear 480ms; outline: none; }
  .ck-panel[data-on] { transform: none; visibility: visible; transition: transform 480ms var(--pl-spring), visibility 0s; }
  .ck-pin { animation: ck-in 260ms var(--pl-ease-out) both; } /* the next check comes in, the page itself stays */
  @keyframes ck-in { from { opacity: 0; translate: 0 6px; } }
  .ck-ph { position: sticky; top: 0; z-index: 2; display: flex; gap: 12px; align-items: flex-start; justify-content: space-between; padding: 18px 18px 14px 22px; background: var(--pl-bg-surface); }
  .ck-pt { display: grid; gap: 8px; justify-items: start; } .ck-pt h2 { margin: 0; font: 650 21px/1.25 var(--pl-round, var(--pl-sans)); }
  .ck-pnav { flex: none; display: flex; align-items: center; gap: 4px; font: 600 12px/1 var(--pl-mono); color: var(--pl-text-secondary); }
  .ck-pnav span { padding: 0 6px; }
  .ck-pnav button { all: unset; cursor: pointer; display: grid; place-items: center; width: 32px; height: 32px; border-radius: 10px; font: 500 20px/1 var(--pl-sans); color: var(--pl-text-primary); background: var(--pl-bg-inset); }
  .ck-pnav button:disabled { opacity: .35; cursor: default; } .ck-pnav .ck-x { margin-left: 6px; }
  @media (hover: hover) and (pointer: fine) { .ck-pnav button:not(:disabled):hover { background: color-mix(in oklab, var(--pl-bg-inset) 70%, var(--pl-sky-soft)); } }
  .ck-pnav button:focus-visible { outline: 2px solid var(--pl-sky); outline-offset: 2px; }
  .ck-pbody { display: grid; gap: 18px; padding: 0 22px 24px; }
  @media (prefers-reduced-motion: reduce) { .ck-panel, .ck-panel[data-on] { transition: none; } .ck-pin { animation: none; } }
  .ck-plays { font: 600 11.5px/1 var(--pl-sans); color: var(--pl-pink); } .ck-plays::before { content: '▶ '; font-size: 9px; }
  .ck-where { font: 600 11.5px/1 var(--pl-sans); padding: 5px 8px; border-radius: 99px; background: var(--pl-sky-soft); color: var(--pl-sky-ink); white-space: nowrap; }
  .ck-where[data-where="code"] { background: var(--pl-lilac-soft); color: var(--pl-lilac-ink); }
  /* the words first, then the fix playing at the row's full width (a tile is drawn for a stage this wide) */
  .ck-body { display: grid; gap: 14px; padding: 4px 14px 18px; }
  .ck-text p { margin: 8px 0 0; font: 400 14.5px/1.55 var(--pl-sans); color: var(--pl-text-secondary); }
  .ck-text b { color: var(--pl-text-primary); font-weight: 650; }
  .ck-id code { font: 500 12px var(--pl-mono); color: var(--pl-text-secondary); }
  .ck-tile { display: grid; gap: 8px; justify-items: start; }
  .ck-tile > div { width: 100%; }
  .ck-tile button { font: 600 12px var(--pl-sans); padding: 7px 12px; border-radius: 9px; border: 0; background: var(--pl-bg-surface); color: var(--pl-text-primary); cursor: pointer; }
  .ck-none { color: var(--pl-text-secondary); }
`;
