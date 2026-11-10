// #51 layered shadows. A shared album, "Sintra, October", with three photos picked and Delete pressed. Everything
// that floats is lifted with one big soft shadow, Tailwind's shadow-2xl or a hand-written one like it: the dialog,
// and each photo in the fan of what's about to go. One big blur gives no contact under an edge and no depth around
// it, so each floats in a fog. plumber stacks a few layers, a tight dark one for contact and wider faint ones.
import { TrashIcon, UploadIcon } from '@unlocalhosted/dither-icons';
import pena from '../../media/s51-pena.jpg';
import penaDusk from '../../media/s51-pena-dusk.jpg';
import coast from '../../media/s51-coast.jpg';
import castle from '../../media/s51-castle.jpg';
import tiles from '../../media/s51-tiles.jpg';
import well from '../../media/s51-well.jpg';
import fountain from '../../media/s51-fountain.jpg';
import ravi from '../../media/people/person-02.jpg';
import sol from '../../media/people/person-10.jpg';
import mei from '../../media/people/person-07.jpg';
import lena from '../../media/people/person-05.jpg';
import sana from '../../media/people/person-03.jpg';
import theo from '../../media/people/person-08.jpg';
import walt from '../../media/people/person-04.jpg';
import ines from '../../media/people/person-01.jpg';

export const n = 51;

// the day's photos in the album's order; three are picked, two are videos
const GRID = [
  { src: pena, big: true }, { src: coast, pick: true }, { src: lena },
  { src: castle, video: '0:14' }, { src: tiles, pick: true },
  { src: penaDusk }, { src: well, pick: true }, { src: ravi }, { src: fountain },
  { src: theo }, { src: sana, video: '0:41' }, { src: walt }, { src: ines },
];
const PICKED = GRID.filter((g) => g.pick).map((g) => g.src);
const FAN = ['-left-0 -rotate-8', 'left-6 -rotate-1 z-10', 'left-12 rotate-7 z-20'];
const Stack = ({ faces, size, ring }) => (
  <span className="flex">{faces.map((src, i) => <img key={src} src={src} alt="" className={size + ' rounded-full object-cover ring-2 ' + ring + (i ? ' -ml-1.5' : '')} />)}</span>
);

export default function DeleteDialog() {
  return (
    <article className="relative w-full max-w-[30rem] overflow-hidden rounded-card bg-surface shadow-card">
      <header className="flex items-center gap-3 px-4 pt-4 pb-3">
        <span className="flex flex-col">
          <span className="text-[17px] leading-6 font-semibold tracking-[-0.01em]">Sintra, October</span>
          <span className="text-xs text-ink-muted tabular-nums">Shared album · 48 photos · 2 videos</span>
        </span>
        <span className="ml-auto flex items-center gap-1.5">
          <Stack faces={[ravi, sol, mei]} size="size-[26px]" ring="ring-surface" />
          <span className="text-xs text-ink-muted tabular-nums">+1</span>
        </span>
      </header>
      <div className="flex items-center gap-2 px-4 pb-2.5 text-[13px]">
        <span className="inline-flex h-[26px] items-center rounded-full bg-accent px-[9px] text-xs font-medium text-accent-ink tabular-nums">3 selected</span>
        <span className="text-ink-muted">Sunday, 12 October</span>
        <span className="ml-auto flex gap-0.5">
          <button type="button" aria-label="Share" className="grid size-7 place-items-center rounded-control text-ink-muted"><UploadIcon size={16} texture="solid" /></button>
          <button type="button" aria-label="Delete" aria-pressed="true" className="grid size-7 place-items-center rounded-control bg-negative-soft text-negative"><TrashIcon size={16} texture="solid" /></button>
        </span>
      </div>
      <div className="grid grid-cols-4 gap-[3px] px-[3px] pb-[3px]">
        {GRID.map((g) => (
          <span key={g.src} className={'relative aspect-square overflow-hidden ' + (g.big ? 'col-span-2 row-span-2 ' : '') + (g.pick ? 'bg-accent/14' : '')}>
            <img src={g.src} alt="" className={'size-full object-cover ' + (g.pick ? 'scale-[0.88] rounded-chip' : '')} />
            {g.pick ? (
              <span className="absolute top-1.5 left-1.5 grid size-[18px] place-items-center rounded-full bg-accent ring-2 ring-white">
                <svg viewBox="0 0 16 16" className="size-3" aria-hidden="true"><path d="M4.5 8.2 7 10.6l4.5-5" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </span>
            ) : null}
            {g.video ? <span className="absolute right-[5px] bottom-[5px] rounded-[3px] bg-ink/60 px-1 text-[10px] leading-[14px] font-medium text-white tabular-nums">{g.video}</span> : null}
          </span>
        ))}
      </div>

      {/* the page under the confirm, dimmed flat */}
      <div aria-hidden="true" className="absolute inset-0 bg-ink/38" />
      <div data-dialog role="alertdialog" aria-label="Delete 3 photos from Sintra, October?" className="absolute inset-x-14 top-1/2 -translate-y-1/2 rounded-sheet bg-surface p-5 shadow-2xl">
        {/* the three that go, fanned out */}
        <span className="relative mb-3.5 block h-16 w-[104px]">
          {PICKED.map((src, i) => <img key={src} data-fan src={src} alt="" className={'absolute top-1 size-[52px] rounded-control object-cover outline-2 outline-white shadow-[0_8px_20px_rgb(18_35_61/0.28)] ' + FAN[i]} />)}
          <span className="absolute -top-0.5 left-[88px] z-30 h-[22px] min-w-[22px] rounded-full bg-negative px-1.5 text-center text-xs leading-[22px] text-white ring-2 ring-white tabular-nums">3</span>
        </span>
        <span className="block text-base font-semibold tracking-[-0.01em]">Delete 3 photos from Sintra, October?</span>
        <span className="mt-1 block text-[13px] leading-[19px] text-ink-muted text-pretty">They’ll stay in Recently deleted for 30 days, then go for good.</span>
        <span className="mt-3.5 flex items-center gap-2.5 rounded-control bg-caution-soft px-2.5 py-[9px] text-[12.5px] leading-[17px] text-caution">
          <Stack faces={[ravi, mei]} size="size-[22px]" ring="ring-caution-soft" />
          Ravi and 2 others in this album lose them too.
        </span>
        <span className="mt-3.5 flex items-center gap-2 text-xs text-ink-muted">
          <span className="relative h-1.5 flex-1 overflow-hidden rounded-[3px] bg-sunken">
            <span className="absolute inset-y-0 left-0 w-[78%] bg-ink/22" />
            <span className="absolute inset-y-0 left-[75.6%] w-[2.4%] bg-negative" />
          </span>
          <span className="tabular-nums">Frees 31.4 MB of 200 GB</span>
        </span>
        <span className="mt-[18px] flex justify-end gap-2">
          <button type="button" className="h-9 rounded-control px-3.5 text-sm font-medium shadow-[inset_0_0_0_1px_var(--color-line)] hover:bg-sunken">Cancel</button>
          <button type="button" className="h-9 rounded-control bg-negative px-3.5 text-sm font-medium text-white ring-2 ring-negative/35 ring-offset-2 hover:bg-negative/90">Delete 3 photos</button>
        </span>
      </div>
    </article>
  );
}
DeleteDialog.stage = true;
DeleteDialog.names = ['One blur', 'Layered'];
DeleteDialog.lesson = {
  why: 'A single shadow can be soft or tight, not both. One big blur pushed down leaves almost nothing right under an edge: no contact, so the dialog and each photo in the fan hover in a haze instead of resting above what’s under them.',
  habit: 'Build shadows from layers: a small, dark one for contact and wider, fainter ones for distance, each doubling the last.',
};
// What the eye sees: the contact right under the dialog's edge. The pill is how dark the shadow is 2px below the edge,
// in percent, from the shadow's own layers (each a Gaussian falloff of its blur, offset and spread, laid over each
// other): one big blur leaves the edge floating; a small, dark layer gives it contact.
const erf = (x) => { const t = 1 / (1 + 0.3275911 * Math.abs(x)), y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; };
const contactAt = (shadow, d) => {
  const layers = shadow.split(/,(?![^(]*\))/).filter((l) => !/inset/.test(l)).map((l) => {
    const a = parseFloat(l.match(/(?:rgba?|oklch|oklab)\([^)]*?[,/]\s*([\d.]+)\s*\)/)?.[1] ?? '1'), n = (l.replace(/(?:rgba?|oklch|oklab)\([^)]*\)/g, '').match(/-?[\d.]+px/g) ?? []).map(parseFloat);
    return { a, y: n[1] ?? 0, blur: n[2] ?? 0, spread: n[3] ?? 0 };
  }).filter((l) => l.a > 0 && (l.blur || l.y));
  return 1 - layers.reduce((left, l) => { const sigma = Math.max(0.5, l.blur / 2), reach = l.y + l.spread, cov = 0.5 * (1 - erf((d - reach) / (sigma * Math.SQRT2))); return left * (1 - l.a * cov); }, 1);
};
DeleteDialog.measure = (root) => {
  const d = root?.querySelector('[data-dialog]');
  if (!d) return null;
  const r = d.getBoundingClientRect(), k = r.width / d.offsetWidth || 1, contact = Math.round(contactAt(getComputedStyle(d).boxShadow, 2) * 100);
  // the fan's photos float the same way: a thin band under each one's foot
  const fan = [...root.querySelectorAll('[data-fan]')].map((p, i) => { const q = p.getBoundingClientRect(); return { key: 'fan' + i, left: q.left + 6 * k, right: q.right - 6 * k, top: q.bottom, bottom: q.bottom + 3 * k, pattern: 'hatch' }; });
  return {
    lines: [], off: contact < 25,
    rules: [{ key: 'edge', y: r.bottom, left: r.left, right: r.right }],
    bands: [{ key: 'contact', left: r.left + 12 * k, right: r.right - 12 * k, top: r.bottom, bottom: r.bottom + 4 * k, pattern: 'hatch' }, ...fan],
    pills: [{ key: 'contact', x: r.right + 24 * k, y: r.bottom, text: String(contact * k), ok: contact >= 25 }],
    cut: { left: r.left, right: r.right, top: r.top, bottom: r.bottom + 14 * k, r: 14 * k },
    subject: { left: r.left - 20 * k, right: r.right + 50 * k, top: r.top - 20 * k, bottom: r.bottom + 40 * k },
  };
};
