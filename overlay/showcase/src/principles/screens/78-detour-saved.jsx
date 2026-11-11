// #78 a picture is cropped to its box, never stretched. Detour, a trip planner: the places three friends are saving for
// five days in Lisbon and Sintra. Every row's thumbnail is one fixed 96 by 72 box, which looked right while the test
// photos were all landscape. Then people save their own: phone photos, tall ones, a square one. With nothing said about
// fit, each picture is pulled to fill the box, so towers go squat and a round well turns oval, on every row.
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
const Thumb = ({ src, alt }) => <img src={src} alt={alt} data-thumb="" className="block h-[72px] w-24 shrink-0 rounded-chip outline-1 -outline-offset-1 outline-black/10" />;

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
            <Thumb src={src} alt={name} />
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
  matters: 'You choose the box. Your users choose the picture. The day someone saves a tall phone photo, a tower goes squat or a face goes wide, and the page looks broken though nothing in your code changed. Testing never shows it, because your test photos already fit.',
  why: 'An image given a width and a height is pulled to fill both, whatever shape the picture is.',
  habit: 'Any image you give a fixed box also gets object-fit: cover. One class, and no upload can bend it.',
};
// What the eye sees, on every photo at once: the lines are the picture's own shape inside its box, and the dotted
// strips beside them are stretch, the part of the box the picture was pulled out to fill. The pill is how much, in
// percent. Cropped, the lines sit on the box's edges and there is no strip left. The camera stays on the whole card:
// the slip is on every row, and so is the fix.
DetourSaved.camera = false;
DetourSaved.measure = (root) => {
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
