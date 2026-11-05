// #23 translucent borders on elevated surfaces. Lumen, a family photo library: Sunday on a coast trip, three photos
// picked, Share open from its button with Add to album's submenu out, and the selection bar floating over the grid.
// Every surface that floats is built the usual way: a 1px gray-200 border and a large shadow. Over dark photos an opaque
// light-grey line glows like a frame. A 10% black border takes on whatever is behind it and sinks into the shadow.
// plumber makes each one see-through.
import { CloseIcon, CopyIcon, DownloadIcon, ExternalLinkIcon, FolderIcon, HeartIcon, PlusIcon, TrashIcon, UploadIcon } from '@unlocalhosted/dither-icons';
import bixby from '../../media/s23-bixby-bridge.jpg';
import sunsetWalk from '../../media/s23-sunset-walk.jpg';
import dusk from '../../media/s23-dusk-father-son.jpg';
import aerial from '../../media/s23-coast-aerial.jpg';
import darkCoast from '../../media/s23-dark-coast.jpg';
import coastRoad from '../../media/s23-coast-road.jpg';
import surf from '../../media/s23-family-surf.jpg';
import shoulders from '../../media/s23-baby-shoulders.jpg';
import manChild from '../../media/s23-man-child.jpg';
import motherSon from '../../media/s23-mother-son.jpg';
import floats from '../../media/s23-girl-floats.jpg';
import cove from '../../media/s23-cove-waterfall.jpg';
import maya from '../../media/people/person-05.jpg';
import jonas from '../../media/people/person-02.jpg';
import grandma from '../../media/people/person-10.jpg';
import leo from '../../media/people/person-08.jpg';

export const n = 23;

const PHOTOS = [
  { src: bixby, alt: 'Bixby Bridge over the coast', on: true }, { src: sunsetWalk, alt: 'Five people walking the beach at sunset' },
  { src: dusk, alt: 'A father and son at the water’s edge at dusk' }, { src: aerial, alt: 'The coast road from above' },
  { src: darkCoast, alt: 'Headlands under low cloud' }, { src: coastRoad, alt: 'The road winding along the cliffs', video: '0:24' },
  { src: surf, alt: 'A family holding hands in the surf' }, { src: shoulders, alt: 'A baby on his father’s shoulders', on: true },
  { src: manChild, alt: 'A grandfather holding a child on the beach' }, { src: motherSon, alt: 'A mother hugging her son by the sea' },
  { src: floats, alt: 'A girl with armbands splashing in the shallows', on: true }, { src: cove, alt: 'A waterfall falling onto a cove' },
];
const SEND = [[maya, 'Maya'], [grandma, 'Grandma'], [leo, 'Leo']];
const ITEMS = [[CopyIcon, 'Copy link', '⌘L'], [DownloadIcon, 'Download 3 photos', '⇧⌘S'], [FolderIcon, 'Add to album', null, true], [ExternalLinkIcon, 'Open in editor']];
const ALBUMS = [['Big Sur 2026', 48], ['The kids', 1204], ['Grandma’s favourites', 86]];
// the one way every floating surface here is built
const FLOAT = 'border border-gray-200 bg-white shadow-lg';
const Tick = () => (
  <span className="absolute top-2 left-2 grid size-5 place-items-center rounded-full bg-accent ring-2 ring-white">
    <svg viewBox="0 0 12 12" className="size-2.5" aria-hidden="true"><path d="M2.5 6.2l2.4 2.4 4.6-5" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
  </span>
);

function ShareMenu() {
  // Slate's primitives, with dithered icons and real photos
  const picked = PHOTOS.filter((p) => p.on).length;
  return (
    <article className="relative w-full max-w-[28rem] overflow-hidden rounded-card bg-surface shadow-card">
      <header className="flex items-center gap-3 p-3.5 px-4">
        <span className="flex min-w-0 flex-col">
          <span className="text-[15px] leading-5 font-medium tracking-[-0.01em]">Sunday, 2 November</span>
          <span className="flex items-center gap-[5px] text-[13px] text-ink-muted">
            <svg viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M8 14.5s4.5-4.2 4.5-8a4.5 4.5 0 0 0-9 0c0 3.8 4.5 8 4.5 8z" /><circle cx="8" cy="6.5" r="1.6" /></svg>
            Big Sur · <span className="tabular-nums">{picked} of {PHOTOS.length} selected</span>
          </span>
        </span>
        <span className="ml-auto flex shrink-0" aria-label="In these photos: Maya, Jonas and Grandma">
          {[maya, jonas, grandma].map((src) => <img key={src} src={src} alt="" className="-ml-1.5 size-6 rounded-full object-cover ring-2 ring-surface first:ml-0" />)}
        </span>
        <button type="button" aria-expanded="true" className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-control bg-accent-soft pr-3 pl-2.5 text-[13px] font-medium text-accent-deep"><UploadIcon size={14} texture="dither" />Share</button>
      </header>
      <ul className="grid grid-cols-3 gap-0.5" aria-label="Photos">
        {PHOTOS.map((p) => (
          <li key={p.src} className={'relative aspect-square overflow-hidden ' + (p.on ? 'bg-accent-soft' : 'bg-sunken')}>
            <img src={p.src} alt={p.alt} className={'size-full object-cover ' + (p.on ? 'scale-[0.88] rounded-chip' : '')} />
            {p.on ? <Tick /> : null}
            {p.video ? (
              <span className="absolute right-1.5 bottom-1.5 inline-flex items-center gap-1 rounded-chip bg-black/55 px-1.5 text-[11px] leading-4 font-medium text-white tabular-nums">
                <svg viewBox="0 0 16 16" className="size-2" fill="#fff" aria-hidden="true"><path d="M4 2.8v10.4a.8.8 0 0 0 1.2.7l8.6-5.2a.8.8 0 0 0 0-1.4L5.2 2.1a.8.8 0 0 0-1.2.7" /></svg>{p.video}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
      {/* Share, open under its button */}
      <div data-menu role="menu" aria-label="Share" className={'absolute top-[58px] right-3 w-[232px] rounded-control p-1 ' + FLOAT}>
        <div className="mb-1 border-b-hairline border-line px-2 pt-2 pb-2.5">
          <span className="text-xs font-medium text-ink-muted">Send to</span>
          <span className="mt-2 flex justify-between">
            {SEND.map(([src, name]) => (
              <button key={name} type="button" role="menuitem" className="flex w-12 flex-col items-center gap-1 text-[11px] leading-[14px] text-ink-muted">
                <img src={src} alt="" className="size-9 rounded-full object-cover outline-1 -outline-offset-1 outline-black/10" />{name}
              </button>
            ))}
            <button type="button" role="menuitem" className="flex w-12 flex-col items-center gap-1 text-[11px] leading-[14px] text-ink-muted">
              <span className="grid size-9 place-items-center rounded-full bg-sunken"><PlusIcon size={14} texture="dither" /></span>More
            </button>
          </span>
        </div>
        {ITEMS.map(([Icon, label, keys, open]) => (
          <button key={label} type="button" role="menuitem" aria-haspopup={open ? 'menu' : undefined} aria-expanded={open || undefined}
            className={'flex h-[34px] w-full items-center gap-2.5 rounded-chip pr-2 pl-1 text-left text-sm hover:bg-sunken ' + (open ? 'bg-sunken' : '')}>
            <Icon size={16} texture="dither" className="shrink-0 text-ink-muted" />{label}
            {keys ? <kbd className="ml-auto font-sans text-xs text-ink-subtle">{keys}</kbd> : null}
            {open ? <svg viewBox="0 0 16 16" className="ml-auto size-3.5 text-ink-subtle" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 3.5l4.5 4.5L6 12.5" /></svg> : null}
          </button>
        ))}
      </div>
      {/* Add to album, out to the menu's left */}
      <div data-menu role="menu" aria-label="Add to album" className={'absolute top-[234px] right-[240px] w-[188px] rounded-control p-1 ' + FLOAT}>
        {ALBUMS.map(([name, count]) => (
          <button key={name} type="button" role="menuitem" className="flex h-[34px] w-full items-center gap-2 rounded-chip px-2 text-left text-sm hover:bg-sunken">
            <span className="min-w-0 flex-1 truncate">{name}</span><span className="text-xs text-ink-subtle tabular-nums">{count.toLocaleString('en-US')}</span>
          </button>
        ))}
        <button type="button" role="menuitem" className="flex h-[34px] w-full items-center gap-2 rounded-chip px-2 text-left text-sm text-accent-deep hover:bg-sunken"><PlusIcon size={16} texture="dither" />New album</button>
      </div>
      {/* the selection, floating over the grid */}
      <div data-menu role="toolbar" aria-label="Selection" className={'absolute bottom-3 left-1/2 flex h-10 -translate-x-1/2 items-center gap-1 rounded-full pr-1 pl-3.5 text-[13px] ' + FLOAT}>
        <span className="mr-1 font-medium whitespace-nowrap tabular-nums">{picked} selected</span>
        <button type="button" aria-label="Favourite" className="grid size-8 place-items-center rounded-full text-ink-muted hover:bg-sunken"><HeartIcon size={16} texture="dither" /></button>
        <button type="button" aria-label="Delete" className="grid size-8 place-items-center rounded-full text-ink-muted hover:bg-sunken"><TrashIcon size={16} texture="dither" /></button>
        <button type="button" aria-label="Clear selection" className="grid size-8 place-items-center rounded-full text-ink-muted hover:bg-sunken"><CloseIcon size={16} texture="dither" /></button>
      </div>
    </article>
  );
}
ShareMenu.stage = true;
ShareMenu.names = ['Solid border', 'See-through border'];
ShareMenu.lesson = {
  why: 'A solid light-grey border is one fixed colour. Over a white page it’s a quiet edge; over dark photos it’s brighter than everything around it, so the menu, its submenu and the selection bar each wear a glowing frame. A see-through border darkens with whatever is behind it and sinks into the shadow.',
  habit: 'Elevated surfaces (menus, popovers, dialogs, floating bars) get a border of black or white at about 10%, never an opaque grey.',
};
// What the eye sees: the Share menu's edge against the photos behind it, traced along all four sides (the submenu and
// the selection bar wear the same frame). The pill is the border's opacity, in percent.
ShareMenu.measure = (root) => {
  const m = root?.querySelector('[data-menu]');
  if (!m) return null;
  const c = getComputedStyle(m).borderTopColor, r = m.getBoundingClientRect(), k = r.width / m.offsetWidth || 1;
  const a = /rgba|\//.test(c) && c.match(/[\d.]+(?=\)$)/) ? parseFloat(c.match(/[\d.]+(?=\)$)/)[0]) : 1;
  return {
    lines: [{ key: 'l', x: r.left, top: r.top, bottom: r.bottom }, { key: 'r', x: r.right, top: r.top, bottom: r.bottom }],
    rules: [{ key: 't', y: r.top, left: r.left, right: r.right }, { key: 'b', y: r.bottom, left: r.left, right: r.right }],
    bands: [], off: a > 0.3,
    pills: [{ key: 'a', x: r.left - 22 * k, y: r.top + 16 * k, text: String(Math.round(a * 100) * k), ok: a <= 0.3 }],
    cut: { left: r.left - 30 * k, right: r.right + 30 * k, top: r.top - 30 * k, bottom: r.bottom + 30 * k, r: 8 * k },
    // the whole menu, every row of it over the photos, where the grey line glows
    subject: { left: r.left - 60 * k, right: r.right + 30 * k, top: r.top - 30 * k, bottom: r.bottom + 30 * k },
  };
};

export default ShareMenu;
