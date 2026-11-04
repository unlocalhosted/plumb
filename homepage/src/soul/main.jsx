// Soul prototypes: the same first screen (the claim, the install, the demo) in three souls, to choose by seeing.
//   toy        "a toy you can trust": the overlay's own brief, turned up
//   world      the old page's plumbing world, rebuilt on the new tokens
//   editorial  bold editorial: dramatic scale, dark, one accent
// Dev only. Switch with the picker or ?soul=.
import { createRoot } from 'react-dom/client';
import { useEffect, useRef, useState } from 'react';
import { GLYPHS } from '../../../overlay/src/glyphs.js';
import '../theme.css';
import './soul.css';
import { ITEMS } from '../hero/items.jsx';

const SOULS = { combo: 'A + D', toy: 'A · Stickers', sheet: 'B · Sticker sheet', window: 'C · Paint window', words: 'D · Words fix themselves', world: 'Old world', editorial: 'Editorial' };
const INSTALL = 'npm install -D @unlocalhosted/react-plumber';
const Tracker = ITEMS[0].Piece;
const messy = { text: false, spacing: false, colour: false, icons: false };

function App() {
  const [soul, setSoul] = useState(() => new URLSearchParams(location.search).get('soul') ?? 'combo');
  useEffect(() => { document.documentElement.dataset.soul = soul; history.replaceState(null, '', `?soul=${soul}`); }, [soul]);
  return (
    <>
      {soul === 'toy' && <Toy />}
      {soul === 'world' && <World />}
      {soul === 'editorial' && <Editorial />}
      {soul === 'sheet' && <Sheet />}
      {soul === 'window' && <PaintWindow />}
      {soul === 'words' && <Words />}
      {soul === 'combo' && <Combo />}
      <aside className="soul-picker" aria-label="Soul">
        {Object.entries(SOULS).map(([k, v]) => <button key={k} type="button" aria-pressed={soul === k} onClick={() => setSoul(k)}>{v}</button>)}
      </aside>
    </>
  );
}

/* ── A toy you can trust ─────────────────────────────────── */
function Toy() {
  return (
    <div className="toy">
      <nav className="toy-nav">
        <span className="toy-brand"><i className="toy-rainbow" />React Plumber</span>
        <span className="toy-links"><a>How it reads</a><a>Clean up</a><a>Docs</a><a className="toy-cta">Install</a></span>
      </nav>
      <header className="toy-hero">
        <h1>
          Click a <span className="toy-pixel"><span className="toy-ants">pixel</span><em className="toy-sticker toy-sticker-off">13px</em></span>.<br />
          Plumber edits the <span className="toy-file">file<em className="toy-sticker toy-sticker-on">p-3 ✓</em></span>.
        </h1>
        <p>It reads your Tailwind theme, marks what’s off on the running page, and writes the fix into your JSX.</p>
        <div className="toy-install"><code>{INSTALL}</code><button type="button">Copy</button></div>
      </header>
      <section className="toy-stage">
        <span className="toy-deco toy-hatch" /><span className="toy-deco toy-dither" /><span className="toy-deco toy-checker" />
        <span className="toy-float toy-float-a">gap-[7px] → gap-4</span>
        <span className="toy-float toy-float-b">rounded-row ✓</span>
        <div className="toy-screen"><Tracker clean={messy} /></div>
      </section>
    </div>
  );
}

/* ── The old world, rebuilt ──────────────────────────────── */
function Wrench({ size = 64 }) {
  return (
    <svg className="wrench" width={size} height={size * 1.6} viewBox="0 0 40 64" aria-hidden="true">
      <path d="M12 4h6v10h4V4h6c3 4 3 10 0 14l-3 3v38a3 3 0 0 1-6 0V21l-4-3C9 14 9 8 12 4z" fill="var(--pl-sky)" stroke="var(--pl-sky-ink)" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="16.5" cy="28" r="2.2" fill="var(--pl-sky-ink)" /><circle cx="23.5" cy="28" r="2.2" fill="var(--pl-sky-ink)" />
      <circle cx="17.2" cy="27.3" r="0.7" fill="#fff" /><circle cx="24.2" cy="27.3" r="0.7" fill="#fff" />
      <circle cx="20" cy="56" r="2" fill="var(--pl-paper)" />
    </svg>
  );
}
function World() {
  return (
    <div className="world">
      <nav className="world-nav">
        <span className="world-brand"><Wrench size={16} />React Plumber</span>
        <span className="world-links"><a>Your system</a><a>Every place</a><a>CI</a><a className="world-cta">Install</a></span>
      </nav>
      <header className="world-hero">
        <div className="world-copy">
          <h1>Click a pixel. Plumber edits the file.</h1>
          <p>Plumber finds where your UI wanders off its design system, and tightens it back from the page. This card has come loose in six places. Fix it.</p>
          <div className="world-install"><code>{INSTALL}</code><button type="button">Copy</button></div>
        </div>
        <div className="world-stage">
          <div className="world-screen"><Tracker clean={messy} /></div>
          {[['18%', '12%'], ['61%', '22%'], ['33%', '58%'], ['74%', '64%'], ['12%', '80%'], ['52%', '86%']].map(([l, t], i) => (
            <span key={i} className="world-nut" style={{ left: l, top: t }}>{i + 1}</span>
          ))}
          <span className="world-seal"><b>6</b><small>off the scale</small></span>
          <span className="world-sticker">off by 2px</span>
          <div className="world-buddy"><Wrench size={46} /></div>
        </div>
      </header>
    </div>
  );
}

/* ── Bold editorial ──────────────────────────────────────── */
function Editorial() {
  const steps = [['tight', 4], ['related', 8], ['control', 12], ['card', 16], ['stack', 24]];
  return (
    <div className="ed">
      <nav className="ed-nav"><span>React Plumber</span><span className="ed-links"><a>Docs</a><a>GitHub</a><a className="ed-cta">Install</a></span></nav>
      <header className="ed-hero">
        <h1><span>Click a pixel.</span><span className="ed-second">Plumber edits the file.</span></h1>
        <div className="ed-ruler" aria-hidden="true">
          {steps.map(([n, v]) => <span key={n} className="ed-tick" style={{ left: `${(v / 28) * 100}%` }}><i /><b>{n}</b><small>{v}px</small></span>)}
          <span className="ed-yours"><em>13px</em><i /></span>
        </div>
        <div className="ed-foot">
          <p>React Plumber reads your Tailwind theme, marks every value that isn’t on it, and writes the fix into your JSX.</p>
          <div className="ed-install"><code>{INSTALL}</code><button type="button">Copy</button></div>
        </div>
      </header>
    </div>
  );
}


const PASSES = [['text', 'Text', 'type', 'pink'], ['spacing', 'Spacing', 'spacing', 'mint'], ['colour', 'Colour', 'color', 'butter'], ['icons', 'Icons', 'icons', 'lilac']];
const ICONS_GLYPH = '<rect x="4.5" y="4.5" width="6" height="6" rx="1.5"/><rect x="13.5" y="4.5" width="6" height="6" rx="1.5"/><rect x="4.5" y="13.5" width="6" height="6" rx="1.5"/><rect x="13.5" y="13.5" width="6" height="6" rx="1.5"/>';
const Glyph = ({ name }) => <svg className="glyph" viewBox="0 0 24 24" aria-hidden="true" dangerouslySetInnerHTML={{ __html: name === 'icons' ? ICONS_GLYPH : GLYPHS[name] }} />;
const Nav = ({ k }) => (
  <nav className="toy-nav">
    <span className="toy-brand"><i className="toy-rainbow" />React Plumber</span>
    <span className="toy-links"><a>How it reads</a><a>Clean up</a><a>Docs</a><a className="toy-cta">Install</a></span>
  </nav>
);
const Install = () => <div className="toy-install"><code>{INSTALL}</code><button type="button">Copy</button></div>;

/* ── B · Sticker sheet: drag a fix onto the screen ───────── */
function Sheet() {
  const [clean, setClean] = useState(messy);
  const [drag, setDrag] = useState(null); // { id, x, y }
  const [stamp, setStamp] = useState(null);
  const screen = useRef(null);
  useEffect(() => {
    if (!drag) return;
    const move = e => setDrag(d => d && { ...d, x: e.clientX, y: e.clientY });
    const up = e => {
      const r = screen.current.getBoundingClientRect();
      if (e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom) {
        setClean(c => ({ ...c, [drag.id]: true }));
        setStamp({ id: drag.id, x: e.clientX - r.left, y: e.clientY - r.top, n: Date.now() });
      }
      setDrag(null);
    };
    addEventListener('pointermove', move); addEventListener('pointerup', up, { once: true });
    return () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); };
  }, [drag]);
  const done = PASSES.filter(([id]) => clean[id]).length;
  return (
    <div className="toy sheet">
      <Nav />
      <header className="sheet-hero">
        <h1>Click a pixel.<br />Plumber edits the file.</h1>
        <p>Drag a fix onto the screen. That’s the whole idea: Plumber does it to your real code.</p>
        <Install />
      </header>
      <section className="sheet-stage">
        <div className="sheet-screen" ref={screen} data-hot={!!drag}>
          <Tracker clean={clean} />
          {stamp && <span key={stamp.n} className="sheet-stamp" style={{ left: stamp.x, top: stamp.y }}>✓ {PASSES.find(p => p[0] === stamp.id)[1]}</span>}
        </div>
        <aside className="sheet-paper" aria-label="Fix stickers">
          <p className="sheet-paper-title">Fix stickers <small>{done}/4 used</small></p>
          {PASSES.map(([id, name, g, hue]) => (
            <button key={id} type="button" className="sheet-sticker" data-hue={hue} data-used={clean[id]}
              onPointerDown={e => { if (!clean[id]) { e.preventDefault(); setDrag({ id, x: e.clientX, y: e.clientY }); } }}
              onClick={() => !clean[id] && setClean(c => ({ ...c, [id]: true }))}>
              <Glyph name={g} />{name}
            </button>
          ))}
          <button type="button" className="sheet-reset" onClick={() => setClean(messy)}>Peel them all off</button>
        </aside>
      </section>
      {drag && <span className="sheet-dragging" data-hue={PASSES.find(p => p[0] === drag.id)[3]} style={{ left: drag.x, top: drag.y }}><Glyph name={PASSES.find(p => p[0] === drag.id)[2]} />{PASSES.find(p => p[0] === drag.id)[1]}</span>}
    </div>
  );
}

/* ── C · Paint window: the overlay's marks as tools ──────── */
function PaintWindow() {
  const [clean, setClean] = useState(messy);
  const [tool, setTool] = useState(null);
  const run = id => { setTool(id); setTimeout(() => setClean(c => ({ ...c, [id]: true })), 450); };
  const left = PASSES.filter(([id]) => !clean[id]).length;
  return (
    <div className="toy pw">
      <Nav />
      <header className="pw-hero">
        <h1>Click a pixel. <span>Plumber edits the file.</span></h1>
        <Install />
      </header>
      <section className="pw-window">
        <div className="pw-title"><span className="pw-close" /><b>Members.jsx — Plumber</b><span className="pw-zoom" /></div>
        <div className="pw-body">
          <div className="pw-tools" role="toolbar" aria-label="Clean-up passes">
            {PASSES.map(([id, name, g, hue]) => (
              <button key={id} type="button" className="pw-tool" data-hue={hue} aria-pressed={tool === id} data-done={clean[id]} onClick={() => run(id)} title={name}>
                <Glyph name={g} /><small>{name}</small>
              </button>
            ))}
            <span className="pw-swatches"><i className="pl-hatch-t" /><i className="pl-dither-t" /><i className="pl-ants-t" /></span>
          </div>
          <div className="pw-canvas" data-tool={tool}><div className="pw-screen"><Tracker clean={clean} /></div></div>
        </div>
        <div className="pw-status"><span>{left ? `${left} passes to go` : 'Every value is on your scale'}</span><span>⌥B blueprint · click a tool to clean up</span></div>
      </section>
    </div>
  );
}

/* ── D · Words that fix themselves ───────────────────────── */
const WORDS = [
  { w: 'Click', off: { fontSize: 88, translate: '0 6px' }, pill: '88px' },
  { w: 'a', off: { marginLeft: 34 }, pill: 'gap 34' },
  { w: 'pixel.', off: { fontSize: 104, translate: '0 -8px', rotate: '-2deg' }, pill: '104px' },
  { br: true },
  { w: 'Plumber', off: { fontSize: 92, letterSpacing: '-0.02em' }, pill: '92px' },
  { w: 'edits', off: { marginLeft: 8, translate: '0 10px' }, pill: 'gap 8' },
  { w: 'the', off: { fontSize: 84 } , pill: '84px' },
  { w: 'file.', off: { rotate: '2deg', marginLeft: 30 }, pill: 'gap 30' },
];
function Words() {
  const [stage, setStage] = useState(0); // 0 messy, 1 marked, 2 fixed
  useEffect(() => {
    const t = [setTimeout(() => setStage(1), 900), setTimeout(() => setStage(2), 2600)];
    return () => t.forEach(clearTimeout);
  }, []);
  return (
    <div className="toy words">
      <Nav />
      <header className="words-hero">
        <h1 data-stage={stage}>
          {WORDS.map((x, i) => x.br ? <br key={i} /> : (
            <span key={i} className="word" style={stage < 2 ? x.off : undefined}>
              {x.w}{stage === 1 && <em className="word-pill" style={{ animationDelay: `${i * 70}ms` }}>{x.pill}</em>}
            </span>
          ))}
        </h1>
        <p className="words-caption" data-stage={stage}>{stage < 2 ? 'This headline was written in a hurry.' : 'Plumber put every size and gap on the scale.'}</p>
        <p className="words-lead">It reads your Tailwind theme, marks what’s off on the running page, and writes the fix into your JSX.</p>
        <div className="words-row"><Install /><button type="button" className="words-replay" onClick={() => { setStage(0); setTimeout(() => setStage(1), 700); setTimeout(() => setStage(2), 2300); }}>↺ Again</button></div>
      </header>
    </div>
  );
}

/* ── A + D: the headline fixes itself, then becomes the toy ── */
// Each word's hurried values; the special words carry A's marks once the headline is on the scale.
const COMBO = [
  { w: 'Click', off: { fontSize: 82, translate: '0 6px' }, pill: '82px' },
  { w: 'a', off: { marginLeft: 34 }, pill: 'gap 34' },
  { w: 'pixel', mark: 'pixel', off: { fontSize: 104, translate: '0 -8px', rotate: '-2deg' }, pill: '104px', tail: '.' },
  { br: true },
  { w: 'Plumber', off: { fontSize: 90, letterSpacing: '-0.02em' }, pill: '90px' },
  { w: 'edits', off: { marginLeft: 8, translate: '0 10px' }, pill: 'gap 8' },
  { w: 'the', off: { fontSize: 80 }, pill: '80px' },
  { w: 'file', mark: 'file', off: { rotate: '2deg', marginLeft: 30 }, pill: 'gap 30', tail: '.' },
];
function Combo() {
  const [stage, setStage] = useState(0); // 0 hurried · 1 marked · 2 on the scale · 3 the toy's marks
  const play = () => {
    setStage(0);
    const t = [setTimeout(() => setStage(1), 800), setTimeout(() => setStage(2), 2400), setTimeout(() => setStage(3), 3300)];
    return () => t.forEach(clearTimeout);
  };
  useEffect(play, []);
  return (
    <div className="toy combo">
      <Nav />
      <header className="combo-hero">
        <h1 data-stage={stage}>
          {COMBO.map((x, i) => x.br ? <br key={i} /> : (
            <span key={i} className={`word combo-word combo-${x.mark ?? 'plain'}`} style={stage < 2 ? x.off : undefined}>
              {x.mark === 'pixel' && stage >= 3 ? <span className="toy-ants">{x.w}</span> : x.w}{x.tail}
              {stage === 1 && <em className="word-pill" style={{ animationDelay: `${i * 70}ms` }}>{x.pill}</em>}
              {stage >= 3 && x.mark === 'pixel' && <em className="toy-sticker toy-sticker-off combo-sticker">13px</em>}
              {stage >= 3 && x.mark === 'file' && <em className="toy-sticker toy-sticker-on combo-sticker">p-3 ✓</em>}
            </span>
          ))}
        </h1>
        <p className="words-caption" data-stage={Math.min(stage, 2)}>{stage < 2 ? 'This headline was written in a hurry.' : 'Plumber put every size and gap on the scale.'}</p>
        <p className="combo-lead">It reads your Tailwind theme, marks what’s off on the running page, and writes the fix into your JSX.</p>
        <div className="words-row"><Install /><button type="button" className="words-replay" onClick={play}>↺ Again</button></div>
      </header>
      <section className="toy-stage">
        <span className="toy-deco toy-hatch" /><span className="toy-deco toy-dither" /><span className="toy-deco toy-checker" />
        <span className="toy-float toy-float-a">gap-[7px] → gap-4</span>
        <span className="toy-float toy-float-b">rounded-row ✓</span>
        <div className="toy-screen"><Tracker clean={messy} /></div>
      </section>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
