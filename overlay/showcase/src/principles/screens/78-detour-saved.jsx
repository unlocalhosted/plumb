// #78 a picture is cropped to its box, never stretched. Detour, a trip planner: the places three friends saved for five
// days in Lisbon and Sintra. Every row's thumbnail is one fixed 96 by 72 box, which looked right while the test photos
// were all landscape. Then people saved their own: phone photos, tall ones, a square one. With nothing said about fit,
// each picture is pulled to fill the box, so towers go squat and a round well turns oval, on every row. plumber crops
// each one to the box instead (object-fit: cover).
import pena from '../../media/s51-pena.jpg';
import towers from '../../media/s51-castle.jpg';
import well from '../../media/s51-well.jpg';
import coast from '../../media/s51-coast.jpg';
import tiles from '../../media/s51-tiles.jpg';
import tram from '../../media/s40-lisbon-tram.jpg';
import ines from '../../media/people/person-04.jpg';
import tom from '../../media/people/person-07.jpg';
import ada from '../../media/people/person-01.jpg';

export const n = 78;

// place, kind and where, the photo, its day and hour, how long it takes, who saved it
const PLACES = [
  ['Palácio da Pena', 'Palace · Sintra hills', pena, 2, '09:30', '2 h', ines],
  ['Queen’s Terrace', 'Viewpoint · Pena park', towers, 2, '11:45', '30 min', ines],
  ['Initiation Well', 'Garden · Quinta da Regaleira', well, 2, '14:00', '1 h 30', tom],
  ['Praia da Ursa', 'Beach · Cabo da Roca', coast, 3, '10:00', 'Half day', ada],
  ['Museu do Azulejo', 'Museum · Xabregas', tiles, 4, '11:00', '1 h 30', tom],
  ['Tram 28', 'Ride · Graça to Estrela', tram, 4, '16:30', '50 min', ada],
];

const Avatar = ({ src, className = 'size-5' }) => <img src={src} alt="" className={'block rounded-full object-cover outline-1 -outline-offset-1 outline-black/10 ' + className} />;
// a place's photo: one box for every row, whatever shape the picture came in
const Thumb = ({ src, alt, lead }) => <img src={src} alt={alt} data-lead={lead || undefined} className="block h-[72px] w-24 shrink-0 rounded-chip outline-1 -outline-offset-1 outline-black/10" />;

export default function DetourSaved() {
  return (
    <article className="w-full max-w-[30rem] overflow-hidden rounded-card bg-surface shadow-card">
      <header className="flex items-center gap-3 border-b-hairline border-line px-5 py-4">
        <span className="flex min-w-0 flex-col">
          <span className="text-[15px] leading-5 font-medium tracking-[-0.01em]">Lisbon and Sintra</span>
          <span className="truncate text-[13px] text-ink-muted"><span className="tabular-nums">12–16</span> May · <span className="tabular-nums">6</span> places saved</span>
        </span>
        <span className="ml-auto flex">
          {[ines, tom, ada].map((src, i) => <span key={i} className={'rounded-full ring-2 ring-surface ' + (i ? '-ml-1.5' : '')}><Avatar src={src} className="size-7" /></span>)}
        </span>
      </header>
      <ul className="m-0 flex list-none flex-col p-0">
        {PLACES.map(([name, where, src, day, at, takes, who], i) => (
          <li key={name} className={'flex items-center gap-3.5 px-5 py-3 ' + (i ? 'border-t-hairline border-line' : '')}>
            <Thumb src={src} alt={name} lead={i === 1} />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-sm font-medium" title={name}>{name}</span>
              <span className="truncate text-[13px] text-ink-muted" title={where}>{where}</span>
              <span className="mt-1 flex items-center gap-1.5 text-xs text-ink-muted"><Avatar src={who} className="size-[18px]" />{takes}</span>
            </span>
            <span className="flex shrink-0 flex-col items-end gap-1">
              <span className="inline-flex h-5 items-center rounded-chip bg-sunken px-1.5 text-[11.5px] font-medium text-ink-muted">Day {day}</span>
              <span className="text-xs text-ink-muted tabular-nums">{at}</span>
            </span>
          </li>
        ))}
      </ul>
    </article>
  );
}
DetourSaved.stage = true;
DetourSaved.names = ['Stretch to fill', 'Crop to cover'];
DetourSaved.lesson = {
  why: 'An image with a width and a height is pulled to fill both, whatever shape the picture is. It looks right while every test photo is landscape. Then someone saves a tall phone photo, and the towers go squat.',
  habit: 'Any image you give a fixed box also gets object-fit: cover. You never choose the shape of a picture someone else uploads.',
};
// What the eye sees: the tall photo of the towers in its wide box. The pill is how much wider than itself it is drawn,
// in percent; cropped, it is drawn as it is.
DetourSaved.measure = (root) => {
  const img = root?.querySelector('[data-lead]');
  if (!img || !img.naturalWidth) return null;
  const r = img.getBoundingClientRect(), k = r.width / img.offsetWidth || 1;
  const stretch = getComputedStyle(img).objectFit === 'fill' ? (img.offsetWidth / img.offsetHeight) / (img.naturalWidth / img.naturalHeight) : 1;
  const by = Math.round(Math.abs(stretch > 1 ? stretch - 1 : 1 / stretch - 1) * 100);
  return {
    off: by > 0,
    lines: [{ key: 'l', x: r.left, top: r.top, bottom: r.bottom }, { key: 'r', x: r.right, top: r.top, bottom: r.bottom }],
    rules: [{ key: 't', y: r.top, left: r.left, right: r.right }, { key: 'b', y: r.bottom, left: r.left, right: r.right }],
    pills: [{ key: 'by', x: r.left + r.width / 2, y: r.top - 14 * k, text: String(by * k), ok: by === 0 }],
    cut: { left: r.left - 6 * k, right: r.right + 6 * k, top: r.top - 6 * k, bottom: r.bottom + 6 * k, r: 6 * k },
    subject: { left: r.left - 40 * k, right: r.right + 150 * k, top: r.top - 60 * k, bottom: r.bottom + 60 * k },
  };
};
