// #39 images get a faint inner outline. Tack, a moodboard app: Ama Ceramics' "Glaze tests" for the spring mugs, the day
// the glaze was chosen. A masonry of real pins: the chosen mugs, the satin white to aim for, a celadon test,
// round three's test tiles with the picked one ringed, the honey base's recipe drawn as its parts, Saturday's firing,
// a note from Kwame. The pin's photo is drawn without an inner outline. Most photos have edges of their own, but a
// piece shot on a white sweep has none: three of them here, and each one's edge is the pin's own white, so the picture
// has no shape and the pots float loose in the card. plumber adds a 10% black outline inside every pin's photo.
import ceramic from '../../media/ceramic.jpg';
import satin from '../../media/s39-satin-white.jpg';
import celadon from '../../media/s39-celadon-vase.jpg';
import ama from '../../media/people/person-03.jpg';
import kwame from '../../media/people/person-02.jpg';
import sol from '../../media/people/person-10.jpg';

export const n = 39;

// sRGB (0–1) to OKLab, for a colour's lightness as the eye sees it
const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toLab = (c) => {
  const [r, g, b] = c.map(lin), l = Math.cbrt(0.4122 * r + 0.5363 * g + 0.0514 * b), m = Math.cbrt(0.2119 * r + 0.6807 * g + 0.1074 * b), s2 = Math.cbrt(0.0883 * r + 0.2817 * g + 0.6299 * b);
  return [0.2105 * l + 0.7936 * m - 0.0041 * s2, 1.978 * l - 2.4286 * m + 0.4506 * s2, 0.0259 * l + 0.7828 * m - 0.8087 * s2];
};

// round three's tiles: each glaze as fired, the picked one ringed; light glazes take dark codes
const TILES = [
  ['T3-1', '#2f5fa8', '#1d3f7c', true], ['T3-2', '#d9a83a', '#b8801f'], ['T3-3', '#e3d6bd', '#cdb994'],
  ['T3-4', '#8fb3a1', '#5f8b77'], ['T3-5', '#5a2e1d', '#2c160d'], ['T3-6', '#b9b2a6', '#8e867a'],
];
// the honey base, by weight, and the iron that turns it honey
const RECIPE = [['Silica', 30, '#d8d2c4'], ['Custer feldspar', 25, '#c9a77c'], ['Whiting', 20, '#e9e4da'], ['EPK kaolin', 15, '#b8b0a2'], ['Talc', 10, '#9c9486']];
const IRON = ['Red iron oxide', 4, '#9a4a1f'];

const Pin = ({ children, className = '' }) => <figure className={'m-0 rounded-card bg-surface p-1.5 shadow-[0_0_0_1px_rgb(18_35_61/0.08),0_1px_1px_rgb(18_35_61/0.03),0_2px_6px_rgb(18_35_61/0.05)] ' + className}>{children}</figure>;
// a pin's photo: 10px pin corners, 6px in, so the photo takes 4px
const Photo = ({ src, alt, light, aspect = 'aspect-square' }) => <img src={src} alt={alt} width="168" height="168" data-light={light || undefined} className={'block w-full rounded-chip object-cover ' + aspect} />;
const Caption = ({ title, note }) => (
  <figcaption className="flex flex-col px-1.5 pt-2 pb-1">
    <span className="truncate text-[13px] font-medium">{title}</span>
    <span className="truncate text-xs text-ink-muted">{note}</span>
  </figcaption>
);
const Avatar = ({ src, className = 'size-7' }) => <img src={src} alt="" className={'block rounded-full object-cover outline-1 -outline-offset-1 outline-black/10 ' + className} />;

export default function TackGlaze() {
  return (
    <article className="w-full max-w-[37.5rem] overflow-hidden rounded-card bg-surface shadow-card">
      <header className="flex items-center gap-3 border-b-hairline border-line px-5 py-4">
        <span className="flex min-w-0 flex-col">
          <span className="text-[15px] leading-5 font-medium tracking-[-0.01em]">Glaze tests</span>
          <span className="truncate text-[13px] text-ink-muted">Ama Ceramics · Spring mugs · <span className="tabular-nums">14</span> pins</span>
        </span>
        <span className="ml-auto flex">
          {[ama, kwame, sol].map((src, i) => (
            <span key={i} className={'relative rounded-full ring-2 ring-surface ' + (i ? '-ml-1.5' : '')}>
              <Avatar src={src} />
              {i === 0 ? <span aria-label="Ama is here" className="absolute -right-px -bottom-px size-[9px] rounded-full bg-[#1f9d6b] ring-2 ring-surface" /> : null}
            </span>
          ))}
        </span>
        <button type="button" className="h-8 rounded-control bg-accent px-3 text-[13px] font-medium text-accent-ink shadow-[0_1px_2px_rgb(54_49_166/0.3),inset_0_1px_0_rgb(255_255_255/0.18)] hover:bg-accent-deep">Share</button>
      </header>

      <div className="grid grid-cols-3 items-start gap-3 bg-sunken p-4">
        <div className="flex flex-col gap-3">
          {/* the lead pin: the chosen glaze, shot on a white sweep */}
          <Pin>
            <Photo src={ceramic} alt="Two stacked mugs, cobalt over honey" light />
            <Caption title="Cobalt over honey" note="Two dips, cone 6" />
            <span className="flex items-center gap-1.5 px-1.5 pt-1 pb-1 text-xs text-ink-muted">
              <span className="inline-flex h-5 items-center rounded-chip bg-positive-soft px-1.5 text-[11.5px] font-medium text-positive">Chosen</span>
              <span className="ml-auto flex items-center gap-1"><Avatar src={ama} className="size-[18px]" /><span className="tabular-nums">4</span></span>
            </span>
          </Pin>
          {/* Saturday's firing: temperature over the day, to cone 6 and a 15-minute hold, then the cool */}
          <Pin>
            <svg viewBox="0 0 168 96" preserveAspectRatio="none" className="block h-24 w-full rounded-chip bg-sunken" aria-label="Firing curve, peak 1,222°">
              <g className="stroke-[rgb(18_35_61/0.08)] [stroke-dasharray:2_3]"><line x1="0" x2="168" y1="24.5" y2="24.5" /><line x1="0" x2="168" y1="56.5" y2="56.5" /></g>
              <path d="M6 84 C30 80 46 62 62 46 S96 22 104 20 L114 20 C124 22 134 44 162 70" fill="none" className="stroke-[#c4562f]" strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              <circle cx="109" cy="20" r="3.5" className="fill-[#c4562f] stroke-white" strokeWidth="1.5" />
            </svg>
            <span className="relative -mt-24 block h-24 text-[10px] leading-3 text-ink-subtle tabular-nums" aria-hidden="true">
              <span className="absolute top-[9px] left-1">1,222°</span><span className="absolute top-[41px] left-1">800°</span><span className="absolute right-1.5 bottom-1">9h</span>
            </span>
            <Caption title="Saturday’s firing" note="Kiln 2 · cone 6, 15 min hold" />
          </Pin>
        </div>

        <div className="flex flex-col gap-3">
          <Pin>
            <Photo src={satin} alt="A satin white cup, from above" light aspect="aspect-[3/2]" />
            <Caption title="Satin white" note="The surface to aim for" />
          </Pin>
          <div className="rounded-card bg-caution-soft px-3 pt-2 pb-3 shadow-[0_0_0_1px_rgb(150_90_3/0.12),0_2px_6px_rgb(150_90_3/0.06)]">
            <p className="text-[13px] leading-[19px] text-[#4a3305]">Cobalt runs on the rim at two dips. Try one and a half on Saturday.</p>
            <p className="mt-2.5 flex items-center gap-1.5 text-xs text-caution"><Avatar src={kwame} className="size-5" />Kwame · 2h ago</p>
          </div>
          {/* the honey base: its parts drawn as a bar of their shares, then the iron that colours it */}
          <Pin>
            <div className="px-1.5 pt-2 pb-1">
              <p className="text-[13px] font-medium">Honey base</p>
              <p className="text-xs text-ink-muted">Recipe, by weight</p>
              <span className="my-2 flex h-2 gap-0.5">{[...RECIPE, IRON].map(([what, w, c]) => <i key={what} className="rounded-[2px]" style={{ flex: w, background: c }} />)}</span>
              <dl className="grid grid-cols-[8px_1fr_auto] items-center gap-x-1.5 gap-y-1 text-xs text-ink-muted">
                {RECIPE.map(([what, w, c]) => [
                  <i key={what + 'c'} className="size-2 rounded-[2px]" style={{ background: c }} />,
                  <dt key={what}>{what}</dt>,
                  <dd key={what + 'w'} className="text-right font-medium text-ink tabular-nums">{w}</dd>,
                ])}
                <span className="col-span-full h-hairline bg-line" />
                <i className="size-2 rounded-[2px]" style={{ background: IRON[2] }} /><dt>{IRON[0]}</dt><dd className="text-right font-medium text-ink tabular-nums">+{IRON[1]}</dd>
              </dl>
            </div>
          </Pin>
        </div>

        <div className="flex flex-col gap-3">
          <Pin>
            <Photo src={celadon} alt="A small vase in a celadon wash" light />
            <Caption title="Celadon wash" note="Test 2, brown at the rim" />
          </Pin>
          {/* round three: each test tile's glaze, the picked one ringed */}
          <Pin>
            <span className="grid grid-cols-3 gap-1.5 p-0.5">
              {TILES.map(([code, a, b, pick]) => {
                const light = toLab([1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16) / 255))[0] > 0.75;
                return (
                  <span key={code} className={'relative aspect-square rounded-chip shadow-[inset_0_0_0_1px_rgb(0_0_0/0.08)] ' + (pick ? 'ring-[1.5px] ring-accent ring-offset-2 ring-offset-surface' : '')}
                    style={{ background: `linear-gradient(in oklch 165deg, ${a}, ${b})` }}>
                    <span className={'absolute bottom-[3px] left-1 text-[10px] leading-3 font-semibold tabular-nums ' + (light ? 'text-[#4a3d26]' : 'text-white')}>{code}</span>
                  </span>
                );
              })}
            </span>
            <Caption title="Test tiles, round 3" note="Six glazes, spring clay" />
          </Pin>
        </div>
      </div>
    </article>
  );
}
TackGlaze.stage = true;
TackGlaze.names = ['No outline', 'Inner outline'];
TackGlaze.lesson = {
  why: 'A photo’s edge is drawn by its own pixels. A piece shot on a white sweep has none: its border is the pin’s white, so the picture has no shape and the pots float loose in the card, three times on this board.',
  habit: 'Give every image a 1px inner outline at about 10% black (white on dark grounds). Dark photos hide it; light ones get their edge back.',
};
// What the eye sees: the lead photo's edge against its pin. The pill is how far apart the two are in lightness, out of
// 100: near 0, there's no edge to see.
TackGlaze.measure = (root) => {
  const img = root?.querySelector('[data-light]');
  if (!img) return null;
  const r = img.getBoundingClientRect(), k = r.width / img.offsetWidth || 1, s = getComputedStyle(img);
  const lined = s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0;
  // the edge as painted: the photo's own outer pixels, or the outline over them
  const c = Object.assign(document.createElement('canvas'), { width: 16, height: 16 }).getContext('2d', { willReadFrequently: true });
  c.drawImage(img, 0, 0, 16, 16);
  if (lined) { c.strokeStyle = s.outlineColor; c.lineWidth = 2; c.strokeRect(0, 0, 16, 16); }
  const d = c.getImageData(0, 0, 16, 1).data, edge = [0, 1, 2].map((i) => d[i + 4 * 8] / 255);
  const L = (x) => toLab(x)[0], gap = Math.round(Math.abs(L(edge) - L([1, 1, 1])) * 100);
  return {
    lines: [], off: gap < 4,
    rules: [{ key: 'top', y: r.top, left: r.left, right: r.right }],
    bands: [{ key: 'edge', left: r.left, right: r.right, top: r.top - 4 * k, bottom: r.top + 4 * k, pattern: 'dots' }],
    pills: [{ key: 'gap', x: r.left + r.width / 2, y: r.top - 16 * k, text: String(Math.max(gap, 1) * k), ok: gap >= 4 }],
    cut: { left: r.left - 8 * k, right: r.right + 8 * k, top: r.top - 8 * k, bottom: r.bottom + 8 * k, r: 6 * k },
    subject: { left: r.left - 30 * k, right: r.right + 30 * k, top: r.top - 50 * k, bottom: r.bottom + 30 * k },
  };
};
