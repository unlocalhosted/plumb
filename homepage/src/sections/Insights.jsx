/* ─────────────────────────────────────────────────────────
 * THE INSIGHTS (STORY.md, the lead; the owner, 2026-11-04: "we look for far more patterns, design engineering
 * patterns"). Plumber knows 77 principles in 7 families (docs/craft/rules.md); the showcase stages 48 of them. Nine are
 * shown here, each borrowed from the showcase's example (overlay/showcase/src/principles/examples.jsx) and redrawn in
 * the homepage's foundations: a small real scene, wrong in exactly the principle's way, flipping to right.
 *
 * Each card flips by itself while on screen (staggered, so the grid never flips at once) and pauses while pointed at;
 * its Broken / Fixed switch holds a state and stops that card's flipping. Reduced motion: every card shows Fixed, still,
 * and the switch still works.
 * ───────────────────────────────────────────────────────── */
import { useEffect, useRef, useState } from 'react';
import './insights.css';

const FAMILIES = [['Interaction feel', 16], ['Typography', 15], ['Colour and light', 15], ['Layout and platform', 13], ['Alignment and balance', 6], ['Spacing and rhythm', 6], ['Rendering and pixels', 6]];
const EVERY = 2600;

const CARDS = [
  { n: 2, family: 'Alignment', title: 'Optical centre beats geometric centre', why: 'The eye centres by weight, not by the box.', states: ['Box centred', 'Weight centred'], Scene: Play },
  { n: 8, family: 'Spacing', title: 'Nested radius = outer − padding', why: 'Equal radii pinch the corner; concentric ones don’t.', states: ['Same radius', 'Concentric'], Scene: Album },
  { n: 16, family: 'Typography', title: 'Tabular figures for numbers that change', why: 'Proportional digits jitter as they tick and never stack.', states: ['Proportional', 'Tabular'], Scene: Timer },
  { n: 18, family: 'Typography', title: 'No widows in headings', why: 'One word alone on the last line looks broken.', states: ['Widow', 'Balanced'], Scene: Headline },
  { n: 21, family: 'Colour and light', title: 'Shadows are tinted, not grey', why: 'A grey shadow on a coloured ground looks dirty.', states: ['Grey shadow', 'Tinted'], Scene: Shadow },
  { n: 55, family: 'Colour and light', title: 'Gradients mix in OKLab', why: 'sRGB goes grey between two saturated colours.', states: ['sRGB', 'OKLab'], Scene: Forecast },
  { n: 39, family: 'Rendering', title: 'Images get an inner outline', why: 'A pale photo bleeds into a pale card without one.', states: ['No outline', 'Inner outline'], Scene: Photo },
  { n: 42, family: 'Rendering', title: 'Bold on hover must not shift layout', why: 'Weight changes width, and the whole row jumps.', states: ['Bold shifts', 'Width kept'], Scene: Tabs },
  { n: 63, family: 'Interaction feel', title: 'Never scale from 0', why: 'From 0 it appears from nowhere; from the trigger it grows out of it.', states: ['From 0', 'From the trigger'], Scene: Menu },
];

export function Insights() {
  const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const grid = useRef(null);
  const [live, setLive] = useState(false);
  useEffect(() => {
    if (reduced) return;
    const io = new IntersectionObserver(([e]) => setLive(e.isIntersecting), { threshold: 0.15 });
    io.observe(grid.current);
    return () => io.disconnect();
  }, [reduced]);

  return (
    <section className="ins-x" aria-labelledby="insights-title">
      <header className="ins-x-head">
        <span className="ins-x-eyebrow">77 patterns</span>
        <h2 id="insights-title" className="title">It sees what design engineers see.</h2>
        <p className="lead">Plumber checks your running app for the details experienced people catch and most interfaces ship anyway. <b>It marks them on the page and, where it can, writes the fix.</b> Nine of the 77:</p>
        <ul className="ins-x-families" aria-label="The seven families">
          {FAMILIES.map(([name, n]) => <li key={name}>{name} <span className="tabular">{n}</span></li>)}
        </ul>
      </header>
      <div ref={grid} className="ins-x-grid">
        {CARDS.map((c, i) => <Card key={c.n} card={c} live={live} reduced={reduced} offset={i * 290} />)}
      </div>
    </section>
  );
}

/* One insight: the scene on its stage, the state it's in, the switch, the principle and why. */
function Card({ card, live, reduced, offset }) {
  const [fixed, setFixed] = useState(reduced);
  const [held, setHeld] = useState(false);   // the switch was used: stop flipping
  const [paused, setPaused] = useState(false); // pointed at: pause
  useEffect(() => {
    if (reduced || !live || held || paused) return;
    let interval = 0;
    const start = setTimeout(() => { setFixed(f => !f); interval = setInterval(() => setFixed(f => !f), EVERY); }, offset + 900);
    return () => { clearTimeout(start); clearInterval(interval); };
  }, [live, held, paused, reduced, offset]);
  const { Scene } = card;
  return (
    <article className="ins-card" onPointerEnter={() => setPaused(true)} onPointerLeave={() => setPaused(false)} aria-label={`${card.n}. ${card.title}`}>
      <div className="ins-stage">
        <Scene fixed={fixed} live={live && !reduced} />
        <span className="ins-state" data-fixed={fixed} aria-hidden="true"><i />{card.states[fixed ? 1 : 0]}</span>
        <div className="ins-switch" role="group" aria-label="Show it">
          {['Broken', 'Fixed'].map((label, k) => (
            <button key={label} type="button" aria-pressed={fixed === !!k} onClick={() => { setHeld(true); setFixed(!!k); }}>{label}</button>
          ))}
        </div>
      </div>
      <div className="ins-foot">
        <span className="ins-n tabular">{card.n}</span>
        <span className="ins-text"><b>{card.title}</b><span>{card.why}</span></span>
      </div>
    </article>
  );
}

/* ── the scenes: each wrong in exactly one way ── */

// #2 a video's play button: the triangle centred by its box sits left of centre; by its weight, it sits true
function Play({ fixed }) {
  return (
    <div className="sc sc-play" data-fixed={fixed}>
      <div className="sc-video"><span className="sc-play-btn"><svg viewBox="0 0 24 24"><path d="M7 4.5v15L19 12z" /></svg></span><small>Walkthrough · 1:24</small></div>
    </div>
  );
}

// #8 an album tile: the cover's corner as round as the tile's pinches; outer minus padding sits concentric
function Album({ fixed }) {
  return (
    <div className="sc sc-album" data-fixed={fixed}>
      <div className="sc-tile"><div className="sc-cover" /><b>Low Tide</b><small>Mara Ellis · 9 songs</small></div>
    </div>
  );
}

// #16 a time tracker: the running clock and the day's entries, in proportional or tabular figures
function Timer({ fixed, live }) {
  const [t, setT] = useState(6157);
  useEffect(() => { if (!live) return; const id = setInterval(() => setT(v => v + 1), 1000); return () => clearInterval(id); }, [live]);
  const clock = s => `${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  return (
    <div className="sc sc-timer" data-fixed={fixed}>
      <div className="sc-clock"><small>Moodboard review</small><b>{clock(t)}</b></div>
      <ul><li><span>Wireframes</span><b>{clock(7578)}</b></li><li><span>Kickoff call</span><b>{clock(2885)}</b></li></ul>
    </div>
  );
}

// #18 a news front's headline: wrapped where it ran out of room, or balanced
function Headline({ fixed }) {
  return (
    <div className="sc sc-news" data-fixed={fixed}>
      <small>Business · 4 min read</small>
      <h4>Northwind closes its seed round to build calmer team tools</h4>
    </div>
  );
}

// #21 a recipe card on its saffron page: a grey shadow, or one tinted by the ground it falls on
function Shadow({ fixed }) {
  return (
    <div className="sc sc-shadow" data-fixed={fixed}>
      <div className="sc-recipe"><small>Dinner · 35 min</small><b>Saffron risotto</b><span>Carnaroli rice · saffron · stock</span></div>
    </div>
  );
}

// #55 a forecast's temperature bars, cold blue to warm amber, mixed in sRGB or OKLab
function Forecast({ fixed }) {
  const days = [['Mon', 10, 70], ['Tue', 22, 88], ['Wed', 4, 62], ['Thu', 16, 80]];
  return (
    <div className="sc sc-forecast" data-fixed={fixed}>
      {days.map(([d, a, b]) => <div key={d} className="sc-day"><span>{d}</span><i><b style={{ left: `${a}%`, right: `${100 - b}%` }} /></i></div>)}
    </div>
  );
}

// #39 a moodboard pin: a pale glaze photo on a pale card, with or without its faint inner outline
function Photo({ fixed }) {
  return (
    <div className="sc sc-photo" data-fixed={fixed}>
      <div className="sc-pin"><div className="sc-glaze" /><b>Celadon test 4</b><small>cone 6 · reduction</small></div>
    </div>
  );
}

// #42 a project's view tabs: the pointed one goes semibold; without its bold width kept, every tab after it jumps
function Tabs({ fixed, live }) {
  const tabs = ['Overview', 'Board', 'Timeline', 'Files'];
  const [hover, setHover] = useState(0);
  useEffect(() => { if (!live) return; const id = setInterval(() => setHover(h => (h + 1) % tabs.length), 650); return () => clearInterval(id); }, [live]);
  return (
    <div className="sc sc-tabs" data-fixed={fixed}>
      <nav>{tabs.map((t, i) => <span key={t} data-label={t} data-hover={i === hover}>{t}</span>)}</nav>
      <div className="sc-tabs-body" />
    </div>
  );
}

// #63 a Share menu opening from its button: from scale 0 at its centre, or from almost-there at the trigger
function Menu({ fixed, live }) {
  const [open, setOpen] = useState(true);
  useEffect(() => { if (!live) return; const id = setInterval(() => setOpen(o => !o), 1100); return () => clearInterval(id); }, [live]);
  return (
    <div className="sc sc-menu" data-fixed={fixed} data-open={open}>
      <span className="sc-share">Share</span>
      <div className="sc-pop"><span>Copy link</span><span>Invite people</span><span>Export PDF</span></div>
    </div>
  );
}
