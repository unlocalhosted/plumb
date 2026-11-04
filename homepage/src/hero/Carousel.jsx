/* ─────────────────────────────────────────────────────────
 * THE CAROUSEL: a few pieces of product UI, each cleaned up by Plumber's own "Clean up this page" passes
 * (overlay/src/cleanup.js, words from overlay/src/words.js CLEANUP). The visitor watches the passes run; they can
 * step through them by hand, and move between pieces.
 *
 * STORYBOARD (each piece, from the moment it's in the middle)
 *      0ms   the piece as written: sizes and spaces picked one at a time
 *    700ms   Text: every line box is tinted coral, as the box model draws type; the bar says how many sizes and the
 *            styles that cover them, on the scale ruler
 *   1900ms   applied: the text glides to its styles; the bands turn mint
 *   3100ms   Spacing: padding and gaps are drawn as the box model draws them (bands with their block icons), coral
 *   4300ms   applied: the spaces glide onto the scale; the marks turn mint
 *   5400ms   the marks lift; the bar keeps the before → after
 *   7600ms   the next piece slides in (the spring the overlay uses), and it starts again
 * Colour and icons show as "next": Plumber doesn't do them yet, and the page doesn't pretend.
 * Reduced motion: nothing plays by itself; each piece shows cleaned, and the passes are buttons.
 * ───────────────────────────────────────────────────────── */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ITEMS } from './items.jsx';
// The product's own marks: the box model's block icons and the family glyphs, imported, never redrawn.
import { BLOCK_ICONS } from '../../../overlay/src/boxmodel.js';
import { GLYPHS } from '../../../overlay/src/glyphs.js';

const ICON = 12; // a band too small for its icon keeps only its tint (the overlay's rule)
const Glyph = ({ name }) => <svg className="glyph" viewBox="0 0 24 24" aria-hidden="true" dangerouslySetInnerHTML={{ __html: name === 'icons' ? ICONS_GLYPH : GLYPHS[name] }} />;
// The overlay has no glyph for icons yet; four tiles in the same pen.
const ICONS_GLYPH = '<rect x="4.5" y="4.5" width="6" height="6" rx="1.5"/><rect x="13.5" y="4.5" width="6" height="6" rx="1.5"/><rect x="4.5" y="13.5" width="6" height="6" rx="1.5"/><rect x="13.5" y="13.5" width="6" height="6" rx="1.5"/>';

// The passes, in the order Plumber's clean-up runs them (overlay/src/cleanup.js PASSES).
const PASSES = ['text', 'spacing', 'colour', 'icons'];
const PASS = {
  text: { name: 'Text', glyph: 'type' }, spacing: { name: 'Spacing', glyph: 'spacing' },
  colour: { name: 'Colour', glyph: 'color' }, icons: { name: 'Icons', glyph: 'icons' },
};
// ms each stage starts: each pass is marked, then applied; then the marks lift; the last moves to the next piece
const TIMING = [0, 700, 1700, 2800, 3800, 4900, 5900, 7000, 8000, 9100, 11000];
// One fix from each pass, as the sticker that slaps on when it's applied.
const FIXED = { text: 'text-[13.5px] → text-card', spacing: 'gap-[7px] → gap-4', colour: '#3b78d8 → accent', icons: '15px → 16px' };
const STYLE_NAME = { 11: 'label', 12: 'meta', 13: 'card', 16: 'body', 20: 'heading' };

const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export function Carousel() {
  const reduced = reducedMotion();
  const [index, setIndex] = useState(0);
  const [stage, setStage] = useState(reduced ? 5 : 0);
  const [playing, setPlaying] = useState(!reduced);
  const [manual, setManual] = useState(null);        // { text, spacing, pass } when the visitor drives
  const counts = useCounts();

  useEffect(() => {
    if (!playing) return;
    setStage(0);
    const timers = TIMING.slice(1, -1).map((ms, i) => setTimeout(() => setStage(i + 1), ms));
    timers.push(setTimeout(() => setIndex(i => (i + 1) % ITEMS.length), TIMING.at(-1)));
    return () => timers.forEach(clearTimeout);
  }, [playing, index]);

  const go = i => { setManual(null); setIndex((i + ITEMS.length) % ITEMS.length); if (!playing) setStage(reduced ? 5 : 0); };
  const clean = manual ?? Object.fromEntries(PASSES.map((p, i) => [p, stage >= 2 * (i + 1)]));
  const pass = manual ? manual.pass : stage >= 1 && stage <= 2 * PASSES.length ? PASSES[Math.ceil(stage / 2) - 1] : null;
  const toggle = p => {
    setPlaying(false);
    setManual(m => { const now = m ?? clean; return { ...now, [p]: !now[p], pass: p }; });
  };
  const stageRef = useRef(null);
  const fit = useFit(stageRef);
  const item = ITEMS[index];
  const shown = pass ?? [...PASSES].reverse().find(q => clean[q]) ?? 'text'; // the pass in hand, or the last one applied
  const c = counts[item.id];

  return (
    <section className="carousel mt-page-2" aria-roledescription="carousel" aria-label="Plumber cleaning up UI, a piece at a time">
      <div ref={stageRef} className="stage pl-light" id="demo" style={{ '--fit': fit, height: fit < 1 ? 600 * fit : undefined }}>
        <div className="field-glow" aria-hidden="true"><i /></div>
        {/* the toy's table: the product's own patterns lying around, and the fix just made, as a sticker */}
        <span className="toy-deco toy-hatch" aria-hidden="true" /><span className="toy-deco toy-dither" aria-hidden="true" /><span className="toy-deco toy-checker" aria-hidden="true" />
        {clean[shown] && <span key={`${index}-${shown}`} className="toy-float toy-float-fix" aria-hidden="true">{FIXED[shown]}</span>}
        {ITEMS.map((it, i) => {
          const at = ((i - index + ITEMS.length + 1) % ITEMS.length) - 1; // -1 left, 0 middle, 1 right
          const done = at === -1 ? { text: true, spacing: true } : at === 1 ? { text: false, spacing: false } : clean;
          return (
            <div key={it.id} className="slot" data-at={at} aria-hidden={at !== 0} inert={at !== 0}
              onClick={at !== 0 ? () => go(i) : undefined}>
              <Piece item={it} clean={done} pass={at === 0 ? pass : null} tone={pass && clean[pass] ? 'mint' : 'coral'} />
            </div>
          );
        })}
      </div>

      <div className="cleanup" role="group" aria-label="Clean up this piece">
        {/* one thing at a time: only the pass in hand is named, with the product's glyph for it */}
        <div className="cleanup-now">
          <span key={shown} className="cleanup-pass"><Glyph name={PASS[shown].glyph} />{PASS[shown].name}</span>
          <button type="button" className="cleanup-play" onClick={() => { setManual(null); setPlaying(p => !p); }} aria-label={playing ? 'Pause' : 'Play'}>
            <svg viewBox="0 0 16 16" aria-hidden="true">{playing ? <path d="M5 3.5v9M11 3.5v9" /> : <path d="M5 3.5v9l7-4.5z" />}</svg>
          </button>
        </div>
        <Said pass={pass} clean={clean} c={c} />
      </div>

    </section>
  );
}

/* What the clean-up says, in Plumber's own words (overlay/src/words.js CLEANUP), with the sizes or spaces on the scale ruler:
 * before in coral, after in mint. */
function Said({ pass, clean, c }) {
  if (!c) return <p className="cleanup-said" />;
  const p = pass ?? [...PASSES].reverse().find(q => clean[q]) ?? 'text';
  const before = c[p].before, after = c[p].after;
  const n = c[p].moved;
  const head = {
    text: `This piece uses ${before.length} text sizes. These ${after.length} styles cover them.`,
    spacing: `This piece has ${before.length} different spaces between things. After this, ${after.length}.`,
    // the colour pass's own sentence (overlay/src/words.js CLEANUP.colour.head)
    colour: after.length < before.length ? `This piece uses ${before.length} different colours. After this, ${after.length}.`
      : `This piece uses ${before.length} colours. ${n} ${n === 1 ? 'place uses a near-copy' : 'places use near-copies'} of yours.`,
    // not in the product's words yet: written for the page, to be replaced by the icons pass's own
    icons: `This piece draws its icons at ${before.length} sizes. After this, ${after.length}.`,
  }[p];
  const law = {
    text: 'Text that does the same job should look the same everywhere.',
    spacing: 'Things that belong together sit closer than things that don’t.',
    colour: 'Things that do the same job should be the same colour.',
    icons: 'Icons that sit side by side should be drawn at one size.',
  }[p];
  return (
    <div className="cleanup-said" aria-live="polite">
      <p className="m-0"><b>{head}</b> <span className="text-ink-2">{law}</span></p>
      {p === 'colour' ? <Swatches before={before} after={after} to={c[p].to} on={clean[p]} /> : <Ruler p={p} before={before} after={after} to={c[p].to} on={clean[p]} />}
    </div>
  );
}

/* The scale ruler (the overlay's primitive, overlay/src/choices.js): the theme's steps as mint ticks, each value the
 * screen uses as a coral dot where it really sits. When the pass applies, each dot glides to the step its place
 * became and turns mint: many values settle onto a few steps, and nothing has to be read to see it. */
function Ruler({ p, before, after, to, on }) {
  const all = [...before, ...after];
  const lo = Math.min(...all), hi = Math.max(...all);
  const x = v => `${((v - lo) / (hi - lo || 1)) * 100}%`;
  return (
    <div className="ruler" aria-label={`${before.length} values become ${after.length} steps`}>
      <div className="ruler-line" />
      {after.map(v => (
        <span key={`t${v}`} className="ruler-tick" style={{ left: x(v) }}>
          <i /><b className="tabular">{p === 'text' ? `${STYLE_NAME[v] ?? ''} ${v}` : p === 'icons' ? `${v}px` : v}</b>
        </span>
      ))}
      {before.map((v, i) => (
        <span key={`d${v}`} className="ruler-dot" data-on={on} title={`${v}px → ${to.get(v)}px`}
          style={{ left: x(on ? to.get(v) ?? v : v), top: on ? 0 : -2 - (i % 3) * 7, transitionDelay: `${i * 30}ms` }} />
      ))}
    </div>
  );
}

/* Colour has no number line: the page's colours are swatches in a row, and the theme's colours they become sit
 * under them. When the pass applies, each swatch glides onto its token's place and takes its colour. */
function Swatches({ before, after, to, on }) {
  const x = (i, n) => `${((i + 0.5) / n) * 100}%`;
  return (
    <div className="swatches" aria-label={`${before.length} colours become ${after.length}`}>
      {after.map((v, i) => <span key={`t${v}`} className="swatch-slot" style={{ left: x(i, after.length), '--sw': v }} />)}
      {before.map((v, i) => {
        const target = to.get(v) ?? v, j = after.indexOf(target);
        return <span key={`d${v}`} className="swatch" data-on={on} title={target === v ? 'already yours' : 'a near-copy'}
          style={{ left: on && j >= 0 ? x(j, after.length) : x(i, before.length), background: on ? target : v, top: on ? 22 : 0, transitionDelay: `${i * 40}ms` }} />;
      })}
    </div>
  );
}

/* A piece, and the marks the pass in hand draws on it, in the box model's language: line boxes, padding, gaps. */
function Piece({ item, clean, pass, tone }) {
  const box = useRef(null);
  const [marks, setMarks] = useState([]);
  useLayoutEffect(() => {
    if (!pass) { setMarks([]); return; }
    const measure = () => setMarks(measureMarks(box.current, pass));
    measure();
    const t = setTimeout(measure, 380); // again once the values have glided
    return () => clearTimeout(t);
  }, [pass, clean.text, clean.spacing]);
  return (
    <div ref={box} className="piece">
      <item.Piece clean={clean} />
      {marks.map((m, i) => (
        <span key={`${pass}-${i}`} aria-hidden="true" className={`mk mk-${m.kind} pop`} data-tone={tone}
          style={{ left: m.left, top: m.top, width: m.width, height: m.height, padding: m.padding, borderRadius: m.radius, animationDelay: `${Math.min(i, 12) * 25}ms` }}>
          {m.icon && <span className="mk-icon" style={m.icon} dangerouslySetInnerHTML={{ __html: BLOCK_ICONS[m.kind === 'pad' ? 'p' : 'g'] }} />}
        </span>
      ))}
    </div>
  );
}

function measureMarks(root, pass) {
  if (!root) return [];
  const b = root.getBoundingClientRect();
  const k = b.width / root.offsetWidth || 1; // the screen may be scaled to fit; marks sit in its own units
  const local = r => ({ left: (r.left - b.left) / k, top: (r.top - b.top) / k, width: r.width / k, height: r.height / k });
  // text: each line box as a band, as the box model draws typography
  if (pass === 'text') return [...root.querySelectorAll('[data-t]')].map(el => ({ kind: 'text', ...local(el.getBoundingClientRect()) }));
  // colour: a dashed ring round each place, no fill, so the colour under it is what's judged (colour-pass.js)
  if (pass === 'colour') return [...root.querySelectorAll('[data-c]')].map(el => ({ kind: 'colour', ...local(el.getBoundingClientRect()), radius: getComputedStyle(el).borderRadius }));
  if (pass === 'icons') return [...root.querySelectorAll('[data-i]')].map(el => ({ kind: 'icon-ring', ...local(el.getBoundingClientRect()) }));
  const out = [];
  for (const el of root.querySelectorAll('[data-s]')) {
    const css = getComputedStyle(el);
    if (el.dataset.s === 'pad') {
      const top = parseFloat(css.paddingTop) / k;
      out.push({ kind: 'pad', ...local(el.getBoundingClientRect()), padding: css.padding, radius: css.borderRadius,
        icon: top >= ICON ? { left: '50%', top: top / 2 } : null });
    }
    else {
      const kids = [...el.children].map(k => k.getBoundingClientRect()), r = el.getBoundingClientRect();
      for (let i = 1; i < kids.length; i++) {
        const a = kids[i - 1], z = kids[i];
        const g = z.top >= a.bottom - 1
          ? { kind: 'gap', ...local({ left: r.left, top: a.bottom, width: r.width, height: z.top - a.bottom }) }
          : { kind: 'gap', ...local({ left: a.right, top: r.top, width: z.left - a.right, height: r.height }) };
        out.push({ ...g, icon: Math.min(g.width, g.height) >= ICON ? { left: '50%', top: '50%' } : null });
      }
    }
  }
  return out;
}

/* The before → after counts, measured: each piece is drawn once as written and once cleaned, out of sight, and its
 * distinct text sizes and spaces are read from the browser. */
function useCounts() {
  const [counts, setCounts] = useState({});
  useEffect(() => {
    const host = document.createElement('div');
    host.style.cssText = 'position:absolute;left:-10000px;top:0;width:880px;height:520px;visibility:hidden';
    document.body.append(host);
    import('react-dom/client').then(({ createRoot }) => {
      const root = createRoot(host);
      root.render(<>{ITEMS.map(it => ['m', 'c'].map(k => (
        <div key={it.id + k} data-measure={`${it.id}:${k}`} style={{ height: 520 }}><it.Piece clean={Object.fromEntries(PASSES.map(p => [p, k === 'c']))} /></div>
      )))}</>);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        // every value in reading order, so the messy and cleaned drawings pair up element by element
        const read = (id, k) => {
          const el = host.querySelector(`[data-measure="${id}:${k}"]`);
          const text = [...el.querySelectorAll('[data-t]')].map(n => parseFloat(getComputedStyle(n).fontSize));
          const space = [...el.querySelectorAll('[data-s]')].flatMap(n => {
            const css = getComputedStyle(n);
            return (n.dataset.s === 'gap' ? [css.rowGap] : [css.paddingTop, css.paddingRight, css.paddingBottom, css.paddingLeft]).map(parseFloat);
          });
          const colour = [...el.querySelectorAll('[data-c]')].map(n => {
            const css = getComputedStyle(n);
            return n.dataset.c === 'bg' ? css.backgroundColor : n.dataset.c === 'border' ? css.borderColor : css.color;
          });
          const icons = [...el.querySelectorAll('[data-i]')].map(n => n.getBoundingClientRect().width);
          return { text, space, colour, icons };
        };
        const distinct = list => [...new Set(list.filter(v => v > 0))].sort((a, b) => a - b);
        // each value as written, and the value that place became (the first place it appears)
        const moves = (from, to) => { const out = new Map(); const ok = v => typeof v === 'string' || v > 0; from.forEach((v, i) => { if (ok(v) && ok(to[i]) && !out.has(v)) out.set(v, to[i]); }); return out; };
        setCounts(Object.fromEntries(ITEMS.map(it => {
          const m = read(it.id, 'm'), c = read(it.id, 'c');
          return [it.id, {
            text: { before: distinct(m.text), after: distinct(c.text), to: moves(m.text, c.text) },
            spacing: { before: distinct(m.space), after: distinct(c.space), to: moves(m.space, c.space) },
            colour: { before: [...new Set(m.colour)], after: [...new Set(c.colour)], to: moves(m.colour, c.colour), moved: m.colour.filter((v, i) => v !== c.colour[i]).length },
            icons: { before: distinct(m.icons), after: distinct(c.icons), to: moves(m.icons, c.icons) },
          }];
        })));
        root.unmount(); host.remove();
      }));
    });
  }, []);
  return counts;
}

/* The screens are drawn at 880 × 520; on a narrower window the stage scales them down to fit, whole. */
function useFit(stage) {
  const [fit, setFit] = useState(1);
  useLayoutEffect(() => {
    const measure = () => setFit(Math.min(1, (stage.current.clientWidth - 48) / 880));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(stage.current);
    return () => ro.disconnect();
  }, [stage]);
  return fit;
}
