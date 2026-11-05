// #74 isolation instead of z-index wars. Plinth, a site builder: Oriel Studio's six client sites in a grid. Each cover
// zooms a little on hover, which lifted it over the card's status badge, so the badge got z-[999]. It's one badge
// component, so every card's Live or Draft badge now beats everything on the page, including the app's own Sort menu
// (z-50): open the menu over the grid and the first card's badge pokes through it. plumber brings the badges back to a
// small number; each only needs to beat its own cover.
import lodge from '../../media/s74-lodge.jpg';
import trail from '../../media/s74-trail.jpg';
import architecture from '../../media/s74-architecture.jpg';
import neon from '../../media/s74-neon.jpg';
import pottery from '../../media/s74-pottery.jpg';
import sea from '../../media/s74-sea.jpg';

export const n = 74;

// each site drawn as itself on its cover: its name and nav, its headline; a week of visits beside it
const SITES = [
  { name: 'Alder Lodge', domain: 'alderlodge.com', cover: lodge, nav: ['ALDER LODGE', 'ROOMS', 'BOOK'], head: 'A cabin under the pines.', live: true, visits: '2,481', spark: 'M1 13 L9 11 L17 12 L25 8 L33 9 L41 5 L55 3' },
  { name: 'Ridgeline Walks', domain: 'ridgeline.co', cover: trail, nav: ['RIDGELINE', 'ROUTES', 'JOIN'], head: 'Walk the hills in five days.', live: true, visits: '1,206', spark: 'M1 9 L9 10 L17 7 L25 9 L33 6 L41 8 L55 6' },
  { name: 'Formwork Architects', domain: 'Draft · edited Mon', cover: architecture, nav: ['FORMWORK', 'WORK', 'STUDIO'], head: 'Concrete, drawn by hand.' },
  { name: 'Night Swim', domain: 'nightswim.band', cover: neon, nav: ['NIGHT SWIM', 'TOUR', 'LISTEN'], head: 'New record, out 14 Nov.', live: true, visits: '8,930', spark: 'M1 15 L9 14 L17 14 L25 12 L33 10 L41 6 L55 2' },
  { name: 'Hob Ceramics', domain: 'hob.shop', cover: pottery, nav: ['HOB', 'SHOP', 'CLASSES'], head: 'Thrown by hand, fired twice.', live: true, visits: '642', spark: 'M1 8 L9 9 L17 7 L25 10 L33 11 L41 10 L55 12' },
  { name: 'Tidewater Swims', domain: 'Draft · edited 28 Oct', cover: sea, nav: ['TIDEWATER', 'SWIMS', 'JOIN'], head: 'Sea swims at first light.' },
];
const SORTS = [['Recently edited', 'R'], ['Name', 'N'], ['Most visits', 'V'], ['Created', 'C']];
const Caret = () => <svg viewBox="0 0 8 8" className="size-2 text-ink-muted" fill="currentColor" aria-hidden="true"><path d="M1 2.5h6L4 6z" /></svg>;
const BTN = 'inline-flex h-8 shrink-0 items-center whitespace-nowrap gap-1.5 rounded-control pr-1.5 pl-2.5 text-[13px] font-medium ring-1 ring-line ring-inset hover:bg-sunken active:bg-line';

export default function Sites() {
  return (
    <article className="relative w-full max-w-[42.5rem] rounded-card bg-surface px-5 pt-4 pb-5 shadow-card">
      <header className="flex items-center gap-2">
        <button type="button" aria-haspopup="menu" aria-expanded="true" className={BTN + ' bg-sunken'}>Sort: Recently edited <Caret /></button>
        <button type="button" aria-haspopup="menu" className={BTN + ' max-sm:hidden'}>Owner: Anyone <Caret /></button>
        <span className="mr-1 ml-auto text-[13px] text-ink-subtle tabular-nums max-sm:hidden">6 sites · 4 live</span>
        <span role="group" aria-label="View" className="flex rounded-control bg-sunken p-0.5 max-sm:ml-auto">
          {[['Grid', true], ['List', false]].map(([label, on]) => (
            <button key={label} type="button" aria-label={label} aria-pressed={on} className={'grid size-7 place-items-center rounded-[5px] ' + (on ? 'bg-surface text-ink shadow-raised' : 'text-ink-subtle hover:text-ink')}>
              {on ? <svg viewBox="0 0 14 14" className="size-3.5" fill="currentColor" aria-hidden="true"><rect x="1" y="1" width="5" height="5" rx="1.2" /><rect x="8" y="1" width="5" height="5" rx="1.2" /><rect x="1" y="8" width="5" height="5" rx="1.2" /><rect x="8" y="8" width="5" height="5" rx="1.2" /></svg>
                : <svg viewBox="0 0 14 14" className="size-3.5" fill="currentColor" aria-hidden="true"><rect x="1" y="2" width="12" height="2" rx="1" /><rect x="1" y="6" width="12" height="2" rx="1" /><rect x="1" y="10" width="12" height="2" rx="1" /></svg>}
            </button>
          ))}
        </span>
        <button type="button" className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-control bg-accent pr-3 whitespace-nowrap pl-2.5 text-[13px] font-medium text-accent-ink hover:bg-accent-deep active:bg-accent-deep">
          <svg viewBox="0 0 14 14" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M7 2.5v9M2.5 7h9" /></svg>New site
        </button>
      </header>
      {/* the app's Sort menu, open over the grid */}
      <div data-menu role="menu" aria-label="Sort" className="absolute top-[3.25rem] left-5 z-50 flex w-49 flex-col rounded-card bg-surface p-1 shadow-popover ring-1 ring-line">
        {SORTS.map(([label, key], i) => (
          <button key={label} type="button" role="menuitemradio" aria-checked={i === 0} className={'flex h-8 items-center gap-2 rounded-control pr-2.5 pl-1.5 text-left text-[13px] active:bg-line ' + (i === 0 ? 'font-medium ' : '') + (i === 1 ? 'bg-sunken' : 'hover:bg-sunken')}>
            <span className="w-3.5 text-accent">{i === 0 ? <svg viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2.5 6.2 5 8.6 9.5 3.5" /></svg> : null}</span>
            {label}<kbd className="ml-auto font-sans text-xs font-normal text-ink-subtle">{key}</kbd>
          </button>
        ))}
        <span className="mx-1.5 my-1 h-hairline bg-line" />
        <button type="button" role="menuitemcheckbox" aria-checked="true" className="flex h-8 items-center gap-2 rounded-control pr-2.5 pl-1.5 text-left text-[13px] hover:bg-sunken active:bg-line">
          <span className="w-3.5" />Show drafts
          <span className="relative ml-auto h-4 w-7 rounded-full bg-accent"><span className="absolute top-0.5 right-0.5 size-3 rounded-full bg-surface" /></span>
        </button>
      </div>
      <ul className="mt-4 grid grid-cols-3 gap-x-4 gap-y-5 max-sm:grid-cols-2">
        {SITES.map((s, i) => (
          <li key={s.name} className="flex min-w-0 flex-col gap-2.5">
            <span className="relative block aspect-[4/3] overflow-hidden rounded-[8px]">
              <img src={s.cover} alt="" className="absolute inset-0 size-full object-cover outline-1 -outline-offset-1 outline-black/10 transition-transform duration-300 hover:scale-105" />
              <span className="absolute inset-0 scrim-eased" />
              <span className="absolute inset-x-3 top-[2.125rem] flex items-center gap-2 text-[7px] font-semibold tracking-[0.04em] text-white" aria-hidden="true">
                <span className="mr-auto text-[8px] tracking-[0.02em]">{s.nav[0]}</span><span>{s.nav[1]}</span><span>{s.nav[2]}</span>
              </span>
              <span className="absolute right-[28%] bottom-3 left-3 text-[15px] leading-[17px] font-semibold tracking-[-0.02em] text-balance text-white">{s.head}</span>
              {/* one badge component on every card, raised so a zooming cover can't cover it */}
              <span data-badge={i === 0 || undefined} className={'absolute top-2 left-2 z-[999] inline-flex h-5 items-center gap-1.5 rounded-chip bg-surface px-1.5 text-[11px] font-medium shadow-raised ' + (s.live ? 'text-positive' : 'text-ink-muted')}>
                <span className="size-1.5 rounded-full bg-current" />{s.live ? 'Live' : 'Draft'}
              </span>
            </span>
            <span className="flex items-start gap-2 px-0.5">
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-[13.5px] font-medium">{s.name}</span>
                <span className="truncate text-xs text-ink-subtle">{s.domain}</span>
              </span>
              <span className="ml-auto flex shrink-0 flex-col items-end">
                <svg viewBox="0 0 56 18" className="h-[18px] w-14" fill="none" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
                  {s.live ? <path d={s.spark} className="stroke-accent" /> : <path d="M1 12 H55" className="stroke-ink-subtle/50" strokeDasharray="2 3" />}
                </svg>
                <span className="text-xs text-ink-muted tabular-nums">{s.live ? s.visits : '—'}</span>
              </span>
            </span>
          </li>
        ))}
      </ul>
    </article>
  );
}
Sites.stage = true;
Sites.names = ['z-[999]', 'z-10'];
Sites.lesson = {
  why: 'A z-index isn’t local. The badge only had to sit above its own cover, but 999 puts it above everything that shares its stacking context: the app’s menus, popovers and toasts at 50 lose to a status label, on every card that has one.',
  habit: 'Give a component its own stacking context and keep the numbers inside it small; save high layers for the app’s overlays.',
};
// What the eye sees: the open menu and the badge under it. The hatch is the badge where it shows through the menu;
// the pill is the badge's z-index against the menu's 50.
Sites.measure = (root) => {
  const badge = root?.querySelector('[data-badge]'), menu = root?.querySelector('[data-menu]');
  if (!badge || !menu) return null;
  const b = badge.getBoundingClientRect(), m = menu.getBoundingClientRect(), k = m.width / menu.offsetWidth || 1;
  const z = parseInt(getComputedStyle(badge).zIndex, 10) || 0, through = z > 50;
  return {
    lines: [],
    bands: through ? [{ key: 'through', left: b.left, right: b.right, top: b.top, bottom: b.bottom, pattern: 'hatch' }] : [],
    // on the menu's own edge, level with the badge: outside the shade, beside what it pokes through
    pills: [{ key: 'z', x: m.right + 22 * k, y: b.top + b.height / 2, text: String(z * k), ok: !through }],
    off: through,
    cut: { left: m.left, right: m.right, top: m.top, bottom: m.bottom, r: 10 * k },
    subject: { left: m.left - 30 * k, right: m.right + 60 * k, top: m.top - 30 * k, bottom: m.bottom + 30 * k },
  };
};
