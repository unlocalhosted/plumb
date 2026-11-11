// #78 a picture is cropped to its box, never stretched. Detour, a trip planner: the card for one day of a trip, Sintra.
// Its cover is the classic `h-44 w-full`: a set height, and as wide as the card. Nothing says how the photo fits, so it
// is pulled to that box, and the box is a different shape on every screen the card lands on. The cover is the Pena
// Palace in the middle of a wide photo: pulled wide its towers go squat, pulled narrow they go thin, and cropped it is
// still the palace at any width. The three stops under it are the same slip, smaller; one is a round well, an oval here.
// The viewer's hand is the screen: drag the card's edge and it is as wide as a phone, or a column on a desktop.
// Pulled to fill, the palace changes shape with every pixel. Cropped (object-fit: cover), it keeps its shape.
import { useRef, useState } from 'react';
import well from '../../media/s51-well.jpg';
import pena from '../../media/s51-pena.jpg';
import towers from '../../media/s51-castle.jpg';
import garden from '../../media/s51-fountain.jpg';
import ines from '../../media/people/person-04.jpg';
import tom from '../../media/people/person-07.jpg';
import ada from '../../media/people/person-01.jpg';

export const n = 78;

// the day's other stops: the photo, what it is, when
const STOPS = [[towers, 'Queen’s Terrace', '11:45'], [well, 'Initiation Well', '14:00'], [garden, 'Fonte dos Passarinhos', '12:30']];
const WIDTH = { min: 200, start: 480, max: 560, step: 24 }; // the card, in px: a small phone to a desktop column

const Avatar = ({ src, className = 'size-5' }) => <img src={src} alt="" className={'block rounded-full object-cover outline-1 -outline-offset-1 outline-black/10 ' + className} />;

// The card's width in the viewer's hand. The edge follows the pointer (the card is centred, so it grows both ways),
// and the drag ends however the hand ends it.
function useWidth() {
  const [w, setW] = useState(WIDTH.start);
  const drag = useRef(null);
  const clamp = (x) => Math.max(WIDTH.min, Math.min(WIDTH.max, x));
  const end = () => { drag.current = null; };
  const grip = {
    onPointerDown: (e) => {
      const card = e.currentTarget.parentElement, k = card.getBoundingClientRect().width / card.offsetWidth || 1;
      drag.current = { x: e.clientX, w: card.offsetWidth, k };
      e.currentTarget.setPointerCapture(e.pointerId);
      e.preventDefault();
    },
    onPointerMove: (e) => {
      const d = drag.current;
      if (!d) return;
      if (e.pointerType === 'mouse' && e.buttons === 0) return end();
      setW(clamp(d.w + (2 * (e.clientX - d.x)) / d.k));
    },
    onPointerUp: end, onPointerCancel: end, onLostPointerCapture: end,
    onKeyDown: (e) => {
      const by = { ArrowLeft: -WIDTH.step, ArrowRight: WIDTH.step }[e.key];
      if (by) { e.preventDefault(); setW((x) => clamp(x + by)); }
    },
  };
  return { w, grip };
}

export default function DetourDay() {
  const { w, grip } = useWidth();
  return (
    <article className="relative max-w-full rounded-card bg-surface p-1.5 shadow-card" style={{ width: w }}>
      {/* the cover: a set height, the card's width, and nothing about how the photo fits */}
      <img src={pena} alt="The Pena Palace on its hill" data-thumb="" className="block h-44 w-full rounded-chip outline-1 -outline-offset-1 outline-black/10" />
      <div className="mt-1.5 flex gap-1.5">
        {STOPS.map(([src, name]) => <img key={name} src={src} alt={name} data-thumb="" className="block h-16 min-w-0 flex-1 rounded-chip outline-1 -outline-offset-1 outline-black/10" />)}
      </div>
      <div className="flex flex-col gap-2 px-2.5 pt-3 pb-2.5">
        <div className="flex items-baseline gap-2">
          <span className="min-w-0 truncate text-[15px] leading-5 font-medium tracking-[-0.01em]" title="Sintra, the hills">Sintra, the hills</span>
          <span className="ml-auto inline-flex h-5 shrink-0 items-center rounded-chip bg-sunken px-1.5 text-[11.5px] font-medium text-ink-muted">Day 2</span>
        </div>
        <p className="truncate text-[13px] text-ink-muted" title="Palácio da Pena, 09:30 · 4 stops · 6.2 km on foot">Palácio da Pena, <span className="tabular-nums">09:30</span> · <span className="tabular-nums">4</span> stops · <span className="tabular-nums">6.2</span> km on foot</p>
        <div className="flex items-center gap-2 text-xs text-ink-muted">
          <span className="flex">{[ines, tom, ada].map((src, i) => <span key={i} className={'rounded-full ring-2 ring-surface ' + (i ? '-ml-1.5' : '')}><Avatar src={src} /></span>)}</span>
          <span className="truncate">Ines, Tom and Ada</span>
          <span className="ml-auto shrink-0 tabular-nums">{Math.round(w)}px wide</span>
        </div>
      </div>
      {/* the edge to drag: the card is as wide as the screen it lands on */}
      <button type="button" {...grip} role="slider" aria-label="Card width" aria-orientation="horizontal" aria-valuemin={WIDTH.min} aria-valuemax={WIDTH.max} aria-valuenow={Math.round(w)}
        className="group absolute top-1/2 -right-7 flex h-16 w-6 -translate-y-1/2 cursor-ew-resize touch-none items-center justify-center rounded-control outline-accent focus-visible:outline-2">
        <span className="h-9 w-1.5 rounded-full bg-ink-subtle/50 transition-colors group-hover:bg-ink-muted group-active:bg-accent" />
      </button>
    </article>
  );
}
DetourDay.stage = true;
DetourDay.names = ['Stretch to fill', 'Crop to cover'];
DetourDay.hint = 'Drag the card’s edge: it is as wide as the screen it lands on.';
DetourDay.lesson = {
  matters: 'You set the cover’s height. The screen sets its width, and whoever took the photo sets its shape. So the box and the picture almost never match, and with nothing said about fit the picture is pulled until they do: a palace goes squat, a round well becomes an oval, a face goes wide. It looks right at the one width you built it at, with the one photo you tested.',
  why: 'An image given a width and a height is pulled to fill both, whatever shape the picture is.',
  habit: 'Any image you give a box also gets object-fit: cover. One class, and no screen or upload can bend it.',
};
// What the eye sees, on every photo at once: the lines are the picture's own shape inside its box, and the dotted
// strips beside them are stretch, the part of the box the picture was pulled out to fill. The pill is how much, in
// percent. Cropped, the lines sit on the box's edges and there is no strip left. The camera stays on the whole card:
// the slip is on every picture, and so is the fix.
DetourDay.camera = false;
DetourDay.measure = (root) => {
  const imgs = [...(root?.querySelectorAll('[data-thumb]') ?? [])].filter((i) => i.naturalWidth && i.offsetHeight);
  const card = root?.firstElementChild?.getBoundingClientRect();
  if (!imgs.length || !card) return null;
  const lines = [], rules = [], bands = [], pills = [];
  let k = 1, off = false;
  imgs.forEach((img, i) => {
    const r = img.getBoundingClientRect();
    k = r.width / img.offsetWidth || 1;
    // how far the picture is pulled: > 1 wider than it is, < 1 taller. A playing glide is the stage's, not the page's
    const pulled = getComputedStyle(img).objectFit === 'fill' && !img.getAnimations().length;
    const stretch = pulled ? (img.offsetWidth / img.offsetHeight) / (img.naturalWidth / img.naturalHeight) : 1;
    const by = Math.round(Math.abs(stretch > 1 ? stretch - 1 : 1 / stretch - 1) * 100);
    off ||= by > 0;
    // the picture's own shape, centred in the box: narrower when it's pulled wide, shorter when it's pulled tall
    const dx = stretch > 1 ? (r.width - r.width / stretch) / 2 : 0, dy = stretch < 1 ? (r.height - r.height * stretch) / 2 : 0;
    lines.push({ key: `l${i}`, x: r.left + dx, top: r.top, bottom: r.bottom }, { key: `r${i}`, x: r.right - dx, top: r.top, bottom: r.bottom });
    rules.push({ key: `t${i}`, y: r.top + dy, left: r.left, right: r.right }, { key: `b${i}`, y: r.bottom - dy, left: r.left, right: r.right });
    // the strips sit at the sides of a picture narrower than its box, above and below one that is wider; with no
    // stretch they close onto the same edges, so they shrink away where they are
    const sides = img.naturalWidth / img.naturalHeight < img.offsetWidth / img.offsetHeight;
    bands.push(sides
      ? { key: `a${i}`, pattern: 'dots', left: r.left, right: r.left + dx, top: r.top, bottom: r.bottom }
      : { key: `a${i}`, pattern: 'dots', left: r.left, right: r.right, top: r.top, bottom: r.top + dy });
    bands.push(sides
      ? { key: `z${i}`, pattern: 'dots', left: r.right - dx, right: r.right, top: r.top, bottom: r.bottom }
      : { key: `z${i}`, pattern: 'dots', left: r.left, right: r.right, top: r.bottom - dy, bottom: r.bottom });
    pills.push({ key: `p${i}`, x: r.left + r.width / 2, y: r.top, text: String(by * k), ok: by === 0 });
  });
  const first = imgs[0].getBoundingClientRect(), last = imgs[imgs.length - 1].getBoundingClientRect();
  return {
    off, lines, rules, bands, pills,
    cut: { left: first.left - 6 * k, right: first.right + 6 * k, top: first.top - 6 * k, bottom: last.bottom + 6 * k, r: 8 * k },
    subject: { left: card.left, right: card.right, top: card.top, bottom: card.bottom },
  };
};
