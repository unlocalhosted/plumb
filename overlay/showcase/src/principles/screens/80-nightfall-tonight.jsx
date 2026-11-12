// #80 words over a picture have a colour behind them. Nightfall, a stargazing app: tonight's dark-sky spots, each a
// night photo with its name and the drive written over it in white. The photos are dark, the words read well, and at
// the desk, on office wifi, every photo is there: this is what ships.
// The slip is latent. Nothing is behind the words but the picture. On a slow connection the photo comes late, and on
// a dead link it never comes; the words are then white on the card's white, and the tile is blank.
// The viewer's hand is the network: switch the photos off and every name goes with them. With a dark colour on each
// picture's box, the names stay. plumber finds it at rest, while the photos are all there.
import { Signal, usePhotos } from './kit.jsx';
import aurora from '../../media/s18-aurora.jpg';
import moon from '../../media/low-tide.jpg';
import coast from '../../media/s23-dark-coast.jpg';

export const n = 80;

// photo, name, the sky's darkness, the drive
const LEAD = [aurora, 'Glen Etive', 'Darkest sky tonight', '48 min'];
const MORE = [[moon, 'Arisaig sands', '1 h 20'], [coast, 'Neist Point', '2 h 05']];

// a spot: its photo fills the tile, and its words sit over the photo's foot
const Spot = ({ src, name, note, drive, className }) => (
  <a href="#" data-tile="" onClick={(e) => e.preventDefault()} className={'relative block overflow-hidden rounded-chip outline-1 -outline-offset-1 outline-black/10 ' + className}>
    {/* the photo: it fills the tile, and nothing is said about what is there when it isn't */}
    <img src={src} alt="" className="absolute inset-0 size-full object-cover" />
    <span className="absolute inset-x-0 bottom-0 flex flex-col px-3 pb-2.5 text-white">
      <span data-words="" className="truncate text-sm font-medium" title={name}>{name}</span>
      <span data-words="" className="truncate text-xs tabular-nums" title={note ? `${note} · ${drive}` : drive}>{note ? `${note} · ${drive}` : drive}</span>
    </span>
  </a>
);

export default function NightfallTonight() {
  const { src, signal } = usePhotos();
  return (
    <article className="relative w-[340px] max-w-full rounded-card bg-surface p-1.5 shadow-card">
      <header className="flex items-baseline gap-2 px-2.5 pt-2 pb-3">
        <span className="text-[15px] leading-5 font-medium tracking-[-0.01em]">Tonight</span>
        <span className="ml-auto shrink-0 text-xs text-ink-muted tabular-nums">Clear from 22:40</span>
      </header>
      <div className="flex flex-col gap-1.5">
        <Spot src={src(LEAD[0])} name={LEAD[1]} note={LEAD[2]} drive={LEAD[3]} className="h-44" />
        <div className="grid grid-cols-2 gap-1.5">
          {MORE.map(([photo, name, drive]) => <Spot key={name} src={src(photo)} name={name} drive={drive} className="h-28" />)}
        </div>
      </div>
      <Signal signal={signal} />
    </article>
  );
}
NightfallTonight.stage = true;
NightfallTonight.camera = false;
NightfallTonight.names = ['Only the photo', 'A colour behind it'];
NightfallTonight.hint = 'Switch the photos off, as a slow connection does. It looks right until then.';
NightfallTonight.lesson = {
  matters: 'This card passes a design review: the photos are dark, the white names read well, and at the desk every photo arrives. It breaks later, on a train or the day a photo’s link dies. Then the names are white on a white card and the tile is blank. plumber finds it now, while it still looks right.',
  why: 'The words are white because the photo is dark, but the photo is the one part of the tile that comes over the network. Until it lands, or if it never does, what is behind the words is the card.',
  habit: 'Any picture with words on it also gets a background colour the words can be read on. It costs one class and is never seen on a good day.',
};
// What the eye sees, on every tile at once: the hatched tile is a box with nothing behind its words but the photo, the
// lines under the words are the ones that go with it, and the pill counts them. With a colour on the box there is
// nothing to hatch and nothing lost.
const seen = (css) => { // a colour as the browser paints it: [r, g, b, a]
  const c = (seen.c ??= Object.assign(document.createElement('canvas'), { width: 1, height: 1 }).getContext('2d', { willReadFrequently: true }));
  c.clearRect(0, 0, 1, 1); c.fillStyle = css; c.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = c.getImageData(0, 0, 1, 1).data;
  return [r, g, b, a / 255];
};
const light = ([r, g, b]) => { const l = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * l(r) + 0.7152 * l(g) + 0.0722 * l(b); };
NightfallTonight.measure = (root) => {
  const tiles = [...(root?.querySelectorAll('[data-tile]') ?? [])];
  const card = root?.firstElementChild;
  if (!tiles.length || !card) return null;
  const bands = [], pills = [], rules = [];
  let off = false;
  const k = card.getBoundingClientRect().width / card.offsetWidth || 1;
  const under = seen(getComputedStyle(card).backgroundColor);
  tiles.forEach((tile, i) => {
    const r = tile.getBoundingClientRect(), own = seen(getComputedStyle(tile.querySelector('img')).backgroundColor);
    const ground = own[3] > 0.5 ? own : under; // what is behind the words once the photo is gone
    let lost = 0;
    [...tile.querySelectorAll('[data-words]')].forEach((t, j) => {
      const a = light(seen(getComputedStyle(t).color)), b = light(ground);
      const gone = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) < 3;
      lost += gone ? 1 : 0;
      const q = t.getBoundingClientRect();
      rules.push({ key: `w${i}.${j}`, y: q.bottom, left: q.left, right: gone ? q.right : q.left });
    });
    off ||= lost > 0;
    bands.push({ key: `t${i}`, pattern: 'hatch', left: r.left, right: r.right, top: r.top, bottom: lost ? r.bottom : r.top });
    pills.push({ key: `p${i}`, x: r.left + r.width / 2, y: r.top, text: String(lost * k), ok: lost === 0 });
  });
  const first = tiles[0].getBoundingClientRect(), last = tiles[tiles.length - 1].getBoundingClientRect(), c = card.getBoundingClientRect();
  return {
    off, bands, pills, rules, lines: [],
    cut: { left: first.left, right: first.right, top: first.top, bottom: last.bottom, r: 6 * k },
    subject: { left: c.left, right: c.right, top: c.top, bottom: c.bottom },
  };
};
