// #78 a picture is cropped to its box, never stretched. Detour, a trip planner: the card for one day of a trip, Sintra.
// Its cover is the classic `h-48 w-full`: a set height, and as wide as the card. It was built and reviewed at a phone's
// width with this photo, where the box is exactly the photo's shape (3:2), so the cover is right: this is what ships.
// The slip is latent. Nothing says how the photo fits, so it is pulled to whatever the box becomes: on a tablet or a
// desktop column the card is wider, the box is a different shape, and the palace goes squat. The friends' faces are
// the same slip, smaller: square boxes that are right until someone uploads a photo that isn't square.
// The viewer's hand is the screen: drag the card's edge wider. Pulled to fill, the palace changes shape with every
// pixel. Cropped (object-fit: cover), it keeps its shape. plumber finds it at rest, before it stretches.
import { Edge, useWidth } from './kit.jsx';
import pena from '../../media/s51-pena.jpg';
import ines from '../../media/people/person-04.jpg';
import tom from '../../media/people/person-07.jpg';
import ada from '../../media/people/person-01.jpg';

export const n = 78;

// the day's stops: when, what, how long
const STOPS = [['09:30', 'Palácio da Pena', '2 h'], ['11:45', 'Queen’s Terrace', '30 min'], ['12:30', 'Fonte dos Passarinhos', '20 min'], ['14:00', 'Initiation Well', '1 h 30']];
const WIDTH = { min: 240, start: 300, max: 560, step: 24 }; // the card, in px: the phone it was built on, to a desktop column

// a friend's face: a square box, and nothing about how the photo fits it (right while every upload is square)
const Avatar = ({ src, className = 'size-5' }) => <img src={src} alt="" className={'block shrink-0 rounded-full outline-1 -outline-offset-1 outline-black/10 ' + className} />;

export default function DetourDay() {
  const { w, grip } = useWidth(WIDTH);
  return (
    <article className="relative max-w-full rounded-card bg-surface p-1.5 shadow-card" style={{ width: w }}>
      {/* the cover: a set height, the card's width, and nothing about how the photo fits */}
      <img src={pena} alt="The Pena Palace on its hill" data-thumb="" className="block h-48 w-full rounded-chip outline-1 -outline-offset-1 outline-black/10" />
      <div className="flex flex-col gap-2.5 px-2.5 pt-3 pb-2.5">
        <div className="flex items-baseline gap-2">
          <span className="min-w-0 truncate text-[15px] leading-5 font-medium tracking-[-0.01em]" title="Sintra, the hills">Sintra, the hills</span>
          <span className="ml-auto inline-flex h-5 shrink-0 items-center rounded-chip bg-sunken px-1.5 text-[11.5px] font-medium text-ink-muted">Day 2</span>
        </div>
        <ol className="m-0 flex list-none flex-col gap-1 p-0 text-[13px]">
          {STOPS.map(([at, name, takes]) => (
            <li key={name} className="flex items-baseline gap-2.5">
              <span className="w-9 shrink-0 text-ink-muted tabular-nums">{at}</span>
              <span className="min-w-0 truncate" title={name}>{name}</span>
              <span className="ml-auto shrink-0 text-xs text-ink-muted tabular-nums">{takes}</span>
            </li>
          ))}
        </ol>
        <div className="flex items-center gap-2 border-t-hairline border-line pt-2.5 text-xs text-ink-muted">
          <span className="flex shrink-0">{[ines, tom, ada].map((src, i) => <span key={i} className={'rounded-full ring-2 ring-surface ' + (i ? '-ml-1.5' : '')}><Avatar src={src} className="size-6" /></span>)}</span>
          <span className="min-w-0 truncate" title="Ines, Tom and Ada">Ines, Tom and Ada</span>
          <span className="ml-auto shrink-0 tabular-nums">{Math.round(w)}px wide</span>
        </div>
      </div>
      <Edge grip={grip} />
    </article>
  );
}
DetourDay.stage = true;
DetourDay.names = ['Stretch to fill', 'Crop to cover'];
DetourDay.hint = 'Drag the card’s edge out, to a tablet’s width. It looks right until then.';
DetourDay.lesson = {
  matters: 'This card passes a design review: at the width it was built at, with this photo, the cover is exact. It breaks later, on a wider screen or the day someone adds a photo of another shape. Then the picture is pulled to the box: a palace goes squat, a face goes wide. plumber finds it now, while it still looks right.',
  why: 'An image given a width and a height is pulled to fill both, whatever shape the picture is. Here the height is set and the width follows the card, so the two only agree at one width.',
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
    const far = pulled ? ((WIDTH.max - 12) / img.offsetHeight) / (img.naturalWidth / img.naturalHeight) : 1; // at the card's widest
    // the pill: how far it is pulled now, or, while it still fits, how far the widest card will pull it
    const now = Math.abs(stretch > 1 ? stretch - 1 : 1 / stretch - 1), by = Math.round((now > 0.03 ? now : Math.abs(far - 1)) * 100);
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
