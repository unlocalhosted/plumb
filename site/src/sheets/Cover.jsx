/* ─────────────────────────────────────────────────────────
 * ANATOMY — STORYBOARD (scroll-scrubbed)
 *
 * The real ProfileCard, built in HTML and tilted into isometric with CSS 3D. Its layers are real: the spec sheet
 * it sits on, its surface, its spacing, its content.
 *
 *  0.00   the card sits assembled on its spec sheet
 *  0.06   the view pulls back from 1.25× to 1× (0.06 → 0.30) while
 *  0.06   layers separate along the depth axis, out from the middle (0.06 → 0.55)
 *  0.28   dashed explode axes draw through the corners; leaders and labels arrive (0.28 → 0.45)
 *  0.55   fully apart; holds until the sheet ends
 *
 *  point at a label: its layer lifts, the others dim
 * ───────────────────────────────────────────────────────── */
import { useState } from 'react';
import { motion, useTransform } from 'motion/react';
import { useFit } from '../site/fit.js';
import { SPRING } from '../site/motion.js';
import { useNarrow } from '../site/useNarrow.js';

const TIMING = {
  explode: [0.06, 0.55], // layers separate
  pullBack: [0.06, 0.3], // the view steps back from the assembled card
  labels: [0.28, 0.45], // axes, leaders and labels arrive
};

const VIEW = { tilt: 58, turn: -38 }; // rotateX, then rotateZ: the isometric view, in degrees
const CARD = { w: 320, h: 212 }; // the card, in CSS px
const SHEET = 26; // how far the spec sheet reaches past the card
const CLOSE = 1.25; // how close the view starts, so the assembled card fills the sheet
const STACK = {
  snug: 7, // depth between layers when assembled: the card reads as one object with thickness
  apart: 118, // depth between layers when apart
  lift: 18, // extra lift on the pointed-at layer
  dim: 0.25, // opacity of the other layers while one is pointed at
};
const GUTTER = 240; // px kept free on the right for labels; the longest note must fit in it
const BOX = { x: -230, y: -330, w: 460 + GUTTER, h: 660 }; // the drawing's extent around the stack's centre
const BOX_NARROW = { x: -230, y: -330, w: 460, h: 660 }; // phones hide the labels

// Bottom to top. z is centred on the stack, so it opens out from the middle.
const LAYERS = [
  { id: 'decisions', name: 'Decisions', note: 'tokens and scales', reach: SHEET },
  { id: 'surface', name: 'Surface', note: 'bg-card · shadow-lift', reach: 0 },
  { id: 'spacing', name: 'Spacing', note: 'p-6 · gap-3 · gap-4', reach: 0 },
  { id: 'content', name: 'Content', note: 'text-base · bg-primary', reach: 0 },
];

// Where a point on a layer lands on screen, relative to the stack's centre (orthographic: no perspective).
const rad = (d) => (d * Math.PI) / 180;
function project(x, y, z) {
  const a = rad(VIEW.turn);
  const b = rad(VIEW.tilt);
  const x1 = x * Math.cos(a) - y * Math.sin(a);
  const y1 = x * Math.sin(a) + y * Math.cos(a);
  return [x1, y1 * Math.cos(b) - z * Math.sin(b)];
}
const zOf = (i, s) => (i - (LAYERS.length - 1) / 2) * s;

/* ── the layers, as real HTML ───────────────────────────── */

function Decisions() {
  return (
    <div className="plate absolute flex flex-col justify-between rounded-md p-4" style={{ inset: -SHEET }}>
      <div className="flex gap-1.5">
        {['bg-tint-1', 'bg-tint-2', 'bg-tint-3', 'bg-tint-4', 'bg-primary', 'bg-foreground'].map((c) => (
          <span key={c} className={`size-6 rounded-sm border border-primary/20 ${c}`} />
        ))}
      </div>
      <div className="flex items-end justify-between">
        <div className="flex items-end gap-1">
          {[4, 8, 12, 16, 24, 32].map((s) => (
            <span key={s} className="border border-primary bg-tint-1" style={{ width: s, height: s }} />
          ))}
        </div>
        <div className="flex items-baseline gap-2 text-primary">
          <span className="text-2xl">Aa</span>
          <span className="text-base">Aa</span>
          <span className="font-mono text-xs">AA</span>
        </div>
      </div>
    </div>
  );
}

function Surface() {
  return <div className="absolute inset-0 rounded-md bg-card shadow-lift" />;
}

// Spacing as solid fills: the padding band all round, the gaps inside it, each measured with a chip.
function Spacing() {
  const pad = 24;
  const chip = 'absolute rounded-sm bg-primary px-1.5 font-mono text-xs leading-5 text-primary-foreground';
  return (
    <div className="absolute inset-0 overflow-hidden rounded-md">
      <span className="absolute inset-0 rounded-md bg-primary/12" />
      <span className="absolute rounded-sm bg-card/70" style={{ inset: pad }} />
      <span className="absolute bg-primary/35" style={{ left: pad + 40, top: pad, width: 12, height: 40 }} />
      <span className="absolute bg-primary/25" style={{ left: pad, right: pad, top: pad + 40, height: 16 }} />
      <span className="absolute bg-primary/25" style={{ left: pad, right: pad, top: pad + 100, height: 16 }} />
      <span className={chip} style={{ left: 4, top: 2 }}>24</span>
      <span className={chip} style={{ left: pad + 32, top: pad + 44 }}>12</span>
    </div>
  );
}

function Content() {
  return (
    <div className="absolute inset-0 flex flex-col gap-4 p-6">
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-tint-2 font-mono text-sm text-primary">AL</span>
        <span className="flex min-w-0 flex-col">
          <span className="flex items-center gap-2 text-base font-medium">
            Ada Lovelace
            <span className="rounded-sm bg-primary px-1.5 text-xs font-semibold text-primary-foreground">Pro</span>
          </span>
          <span className="text-sm text-muted-foreground">Analyst, Engine No. 1</span>
        </span>
      </div>
      <p className="text-sm text-muted-foreground">Writes the notes that turn a machine for numbers into a machine for anything.</p>
      <div className="flex gap-2">
        <span className="inline-flex h-8 items-center rounded-sm bg-primary px-3 text-xs font-semibold text-primary-foreground">Message</span>
        <span className="inline-flex h-8 items-center rounded-sm border border-border bg-background px-3 text-xs font-semibold text-muted-foreground">Follow</span>
      </div>
    </div>
  );
}

const DRAW = { decisions: Decisions, surface: Surface, spacing: Spacing, content: Content };

/* ── the figure ─────────────────────────────────────────── */

export function CoverFigure({ progress }) {
  const narrow = useNarrow();
  const fit = useFit(narrow ? BOX_NARROW : BOX);
  const [focus, setFocus] = useState(null);
  const spread = useTransform(progress, TIMING.explode, [STACK.snug, STACK.apart], { clamp: true });
  const reveal = useTransform(progress, TIMING.labels, [0, 1], { clamp: true });
  const zoom = useTransform(progress, TIMING.pullBack, [CLOSE, 1], { clamp: true });
  const scale = useTransform(zoom, (z) => fit.k * z);
  const [cx, cy] = fit.px(0, 0);
  const view = { cx, cy, k: fit.k, zoom };

  return (
    <figure ref={fit.ref} className="absolute inset-x-0 inset-y-6 overflow-hidden rounded-lg bg-secondary" aria-label="The ProfileCard taken apart into its layers: decisions, surface, spacing and content">
      {/* the stack, centred, drawn at the fit's scale */}
      <motion.div className="absolute" style={{ left: cx, top: cy, scale, originX: 0, originY: 0 }}>
        <div className="absolute" style={{ width: CARD.w, height: CARD.h, left: -CARD.w / 2, top: -CARD.h / 2, transformStyle: 'preserve-3d', transform: `rotateX(${VIEW.tilt}deg) rotateZ(${VIEW.turn}deg)` }}>
          {LAYERS.map((l, i) => (
            <Layer key={l.id} i={i} id={l.id} spread={spread} focus={focus} />
          ))}
        </div>
      </motion.div>

      <Axes key={`axes-${fit.k}-${fit.w}`} spread={spread} reveal={reveal} view={view} />
      {!narrow && LAYERS.map((l, i) => <Leader key={`${l.id}-${fit.k}-${fit.w}`} i={i} layer={l} spread={spread} reveal={reveal} view={view} focus={focus} setFocus={setFocus} />)}
    </figure>
  );
}

function Layer({ i, id, spread, focus }) {
  const Draw = DRAW[id];
  const z = useTransform(spread, (s) => zOf(i, s) + (focus === id ? STACK.lift : 0));
  // the spacing overlay is a measurement, not part of the card: it only shows once the layers part
  const show = useTransform(spread, [STACK.snug, STACK.snug + 40], [id === 'spacing' ? 0 : 1, 1]);
  return (
    <motion.div className="absolute inset-0" style={{ z, transformStyle: 'preserve-3d' }} animate={{ opacity: focus && focus !== id ? STACK.dim : 1 }} transition={SPRING.settle}>
      <motion.div className="absolute inset-0" style={{ opacity: show }}>
        <Draw />
      </motion.div>
    </motion.div>
  );
}

// Dashed axes through the card's outer corners, and the plumb line through the Message button, with its bob.
function Axes({ spread, reveal, view }) {
  const top = useTransform(spread, (s) => zOf(LAYERS.length - 1, s));
  const bottom = useTransform(spread, (s) => zOf(0, s));
  const lines = [
    { at: [-CARD.w / 2 + 24 + 38, CARD.h / 2 - 24 - 16], cls: 'border-solid', bob: true }, // the Message button
  ];
  return lines.map((l, i) => <Axis key={i} l={l} top={top} bottom={bottom} reveal={reveal} view={view} />);
}

function Axis({ l, top, bottom, reveal, view }) {
  const [x0] = project(l.at[0], l.at[1], 0);
  const k = (zm) => view.k * zm;
  const left = useTransform(view.zoom, (zm) => view.cx + x0 * k(zm));
  const y1 = useTransform([top, view.zoom], ([z, zm]) => view.cy + project(l.at[0], l.at[1], z + (l.bob ? 70 : 24))[1] * k(zm));
  const y2 = useTransform([bottom, view.zoom], ([z, zm]) => view.cy + project(l.at[0], l.at[1], z - (l.bob ? 70 : 24))[1] * k(zm));
  const height = useTransform([y1, y2], ([a, b]) => Math.max(0, b - a));
  return (
    <>
      <motion.span aria-hidden="true" className={`pointer-events-none absolute w-0 border-l-2 border-primary ${l.cls}`} style={{ left, top: y1, height, opacity: l.bob ? 1 : reveal }} />
      {l.bob && (
        <motion.svg aria-hidden="true" width="16" height="20" viewBox="0 0 16 20" className="pointer-events-none absolute -ml-2" style={{ left, top: y2 }}>
          <path d="M1 0 L15 0 L8 19 z" className="fill-primary" />
        </motion.svg>
      )}
    </>
  );
}

function Leader({ i, layer, spread, reveal, view, focus, setFocus }) {
  // each label lands on its layer's right-most corner, which no other layer reaches past at that height
  const cornerX = CARD.w / 2 + layer.reach;
  const cornerY = CARD.h / 2 + layer.reach;
  const ax = useTransform(view.zoom, (zm) => view.cx + project(cornerX, cornerY, 0)[0] * view.k * zm);
  const top = useTransform([spread, view.zoom], ([s, zm]) => view.cy + project(cornerX, cornerY, zOf(i, s) + (focus === layer.id ? STACK.lift : 0))[1] * view.k * zm);
  const on = focus === layer.id;
  return (
    <motion.button
      type="button"
      onPointerEnter={() => setFocus(layer.id)}
      onPointerLeave={() => setFocus(null)}
      onFocus={() => setFocus(layer.id)}
      onBlur={() => setFocus(null)}
      aria-label={`${layer.name}: ${layer.note}`}
      style={{ top, left: ax, right: 0, opacity: reveal }}
      className="absolute flex -translate-y-1/2 flex-row-reverse items-center outline-none"
    >
      <span className={`flex shrink-0 flex-col rounded-md bg-card px-3 py-2 text-left shadow-plate transition-shadow ${on ? 'ring-2 ring-primary' : ''}`}>
        <span className="text-sm font-semibold text-foreground">{layer.name}</span>
        <span className="font-mono text-xs whitespace-nowrap text-muted-foreground">{layer.note}</span>
      </span>
      <motion.span className="h-0.5 flex-1 origin-left bg-primary" style={{ scaleX: reveal }} />
      <span className={`size-2.5 shrink-0 rounded-full border-2 border-card bg-primary shadow-plate transition-transform ${on ? 'scale-125' : ''}`} />
    </motion.button>
  );
}

export const coverBeats = [
  { at: 0, body: <p>Under every component are decisions: <b>your tokens and scales</b>. On them sit its surface, its spacing and its content. Scroll to take ProfileCard apart.</p> },
  { at: TIMING.labels[0], body: <p>Plumb reads every layer the way your build does, and traces each value back to the decision it should have come from. Point at a label to lift its layer.</p> },
];
