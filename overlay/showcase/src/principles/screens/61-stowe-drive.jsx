// #61 menus open on pointerdown, with press-drag-release. Stowe, a team's file drive: the Brand drive, its space by
// kind of file, the files with their owners. Every menu on it (View, and each file's ⋯) is the same hand-rolled menu.
//   broken  opened by onClick, so it opens only when the button comes back up; and press, drag to an item, let go
//           picks nothing, because a release away from the button is no click
//   fixed   opened on pointerdown, as Radix's DropdownMenu and Base UI's Menu do; held, the item under the pointer is
//           chosen when you let go, so press, drag, release picks in one motion
// plumber's probe (src/craft-probe.ts menuDown) presses, holds and reads whether the press alone opened it. The marks are
// that: where you pressed, and the ruler from the press to the moment it opened; a release that missed shows the menu
// it would have hit.
import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckIcon, DownloadIcon, FolderIcon, HeartIcon, PathIcon, SlidersIcon, FileIcon } from '@unlocalhosted/dither-icons';
import campaign from '../../media/s61-campaign.jpg';
import film from '../../media/s61-film.jpg';
import jonas from '../../media/people/person-02.jpg';
import ruth from '../../media/people/person-10.jpg';
import felix from '../../media/people/person-06.jpg';

export const n = 61;
export const handsOn = true;

// plumber's marks layer (as hands-on.jsx's), and the marks this demo uses
const TOKENS = '/__plumb/src/tokens.css';
function MarksLayer({ children }) {
  const host = useRef(null);
  const [root, setRoot] = useState(null);
  useEffect(() => {
    const r = host.current.shadowRoot ?? host.current.attachShadow({ mode: 'open' });
    r.innerHTML = `<link rel="stylesheet" href="${TOKENS}"><style>:host { position: absolute; inset: 0; pointer-events: none; overflow: visible; }</style>`;
    setRoot(r);
  }, []);
  return <div ref={host} data-scheme="light" aria-hidden="true" className="pointer-events-none absolute inset-0">{root ? createPortal(children, root) : null}</div>;
}
const hue = (off) => (off ? 'var(--pl-off)' : 'var(--pl-on)');
const Tag = ({ x, y, off, children }) => (
  <span style={{ position: 'absolute', left: x, top: y, transform: 'translate(-100%, -50%)', display: 'flex', alignItems: 'center', height: 20, padding: '0 var(--pl-space-3)',
    borderRadius: 'var(--pl-radius-tag)', font: '500 11px/1 var(--pl-mono)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
    color: 'var(--pl-on-accent)', background: hue(off), boxShadow: '0 0 0 1px var(--pl-halo)' }}>{children}</span>
);
const Contact = ({ x, y }) => <span style={{ position: 'absolute', left: x - 5, top: y - 5, width: 10, height: 10, borderRadius: '50%', boxShadow: '0 0 0 1.5px var(--pl-sky), 0 0 0 3px var(--pl-halo)' }} />;
const Ghost = ({ x, y, w, h }) => <span style={{ position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: 10, border: `1px dashed ${hue(true)}`, opacity: 0.6 }} />;
function Ruler({ top, width, span, played, kind, events }) {
  const x = (ms) => (Math.min(span, Math.max(0, ms)) / span) * width;
  const ticks = [];
  for (let ms = 0; ms <= span; ms += 100) ticks.push(ms);
  const col = (k) => (k === 'off' ? 'var(--pl-off)' : k === 'on' ? 'var(--pl-on)' : 'var(--pl-sky)');
  return (
    <div style={{ position: 'absolute', left: 0, top, width, height: 40 }}>
      <span style={{ position: 'absolute', right: 0, top: -6, font: '600 10.5px/14px var(--pl-sans)', color: 'var(--pl-ink-2)' }}>live</span>
      <span style={{ position: 'absolute', left: 0, right: 0, top: 16, borderTop: '1px solid var(--pl-ink-3)' }} />
      {ticks.map((ms) => (
        <span key={ms}>
          <span style={{ position: 'absolute', left: x(ms), top: ms % 200 ? 14 : 12, width: 1, height: ms % 200 ? 4 : 8, background: 'var(--pl-ink-3)' }} />
          {ms % 200 ? null : <span style={{ position: 'absolute', left: Math.min(width - 14, Math.max(8, x(ms))), top: 22, transform: 'translateX(-50%)', font: '400 10.5px/14px var(--pl-mono)', color: 'var(--pl-ink-2)' }}>{ms >= 1000 ? `${ms / 1000}s` : ms}</span>}
        </span>
      ))}
      {played > 0 ? <span style={{ position: 'absolute', left: 0, top: 15, height: 3, width: x(played), borderRadius: 2, background: col(kind) }} /> : null}
      {events.map(([ms, k], i) => (
        <span key={i} style={{ position: 'absolute', left: x(ms), top: k ? 11 : 13, width: k ? 11 : 7, height: k ? 11 : 7, marginLeft: k ? -5.5 : -3.5, borderRadius: '50%',
          background: k ? col(k) : '#fff', boxShadow: k ? '0 0 0 2px #fff' : '0 0 0 1.5px var(--pl-sky)' }} />
      ))}
      <span style={{ position: 'absolute', left: x(played), top: 4, width: 2, height: 24, marginLeft: -1, borderRadius: 1, background: 'var(--pl-sky)', boxShadow: '0 0 0 1px #fff' }} />
    </div>
  );
}
function local(root) {
  const o = root.getBoundingClientRect(), k = o.width / root.offsetWidth || 1;
  return (el) => { const r = el.getBoundingClientRect(); return { x: (r.left - o.left) / k, y: (r.top - o.top) / k, w: r.width / k, h: r.height / k }; };
}
function useTicking(on) {
  const [, tick] = useState(0);
  useEffect(() => {
    if (!on) return;
    let id = requestAnimationFrame(function f() { tick((x) => x + 1); id = requestAnimationFrame(f); });
    return () => cancelAnimationFrame(id);
  }, [on]);
}

// one colour per kind of file, everywhere: the space bar, its key, the tile on the row (approved in the comp)
const KIND = { video: '#ef7d32', image: 'var(--color-accent)', pdf: '#c8323f', doc: '#2f6fe4', vector: '#12917f' };
const SPACE = [['video', 'Video', 42.8], ['image', 'Images', 12.4], ['pdf', 'PDFs', 4.2], ['doc', 'Documents', 1.8], ['vector', 'Vectors', 2]];
const FILES = [
  { name: 'Photography', folder: true, detail: '126 items', owner: ['Ruth Okafor', ruth], date: '26 Feb', mb: 2400 },
  { name: 'Brand guidelines.pdf', kind: 'pdf', tile: 'PDF', detail: '48 pages', owner: ['Felix Brandt', felix], date: '2 Mar', mb: 4.8 },
  { name: 'Campaign, hero.jpg', kind: 'image', thumb: campaign, detail: '6000 × 4000', owner: ['Ruth Okafor', ruth], date: '3 Mar', mb: 18.4 },
  { name: 'Launch film, cut 3.mov', kind: 'video', thumb: film, length: '2:14', detail: '4K · 2 min 14 s', owner: ['Jonas Berg', jonas], date: '4 Mar', mb: 812 },
  { name: 'Logo, final.svg', kind: 'vector', tile: 'SVG', detail: 'Vector', owner: ['Felix Brandt', felix], date: '28 Feb', mb: 0.184 },
  { name: 'Press release.doc', kind: 'doc', tile: 'DOC', detail: '1,120 words', owner: ['Jonas Berg', jonas], date: '1 Mar', mb: 0.312 },
];
const SORTS = [['name', 'Name', 'A to Z'], ['date', 'Date modified'], ['size', 'Size'], ['owner', 'Owner']];
const SHOWS = [['folders', 'Folders first', '⇧⌘F'], ['thumbs', 'Thumbnails'], ['space', 'Space by kind']];
const ACTIONS = [['star', 'Star', HeartIcon], ['link', 'Copy link', PathIcon], ['download', 'Download', DownloadIcon], ['rename', 'Rename', FileIcon]];
const dated = (d) => new Date(`${d} 2026`).getTime();
const sortBy = { name: (a, b) => a.name.localeCompare(b.name), date: (a, b) => dated(b.date) - dated(a.date), size: (a, b) => b.mb - a.mb, owner: (a, b) => a.owner[0].localeCompare(b.owner[0]) };
const sized = (mb) => (mb >= 1000 ? `${(mb / 1000).toFixed(1)} GB` : mb >= 1 ? `${mb >= 100 ? Math.round(mb) : mb} MB` : `${Math.round(mb * 1000)} KB`);
const COLS = 'grid grid-cols-[1fr_9.25rem_4.5rem_4rem_1.75rem] items-center gap-3';

export default function StoweDrive({ side = 'broken', onStatus }) {
  const root = useRef(null), sheet = useRef(null);
  const triggers = useRef({}), menus = useRef({});
  const [open, setOpen] = useState(null);       // which menu: 'view' or a file's name
  const [over, setOver] = useState(null);
  const [sort, setSort] = useState('name');
  const [show, setShow] = useState({ folders: true, thumbs: true, space: true });
  const [starred, setStarred] = useState({ 'Brand guidelines.pdf': true });
  const [g, setG] = useState(null);             // the press: { id, at, t0, held, opened, up, picked, missed }
  const [footprints, setFootprints] = useState({}); // where each menu sits when open, for the ghost of a release that missed it
  const fixed = side === 'fixed';
  useTicking(!!g?.held);
  const now = () => performance.now();
  const at = () => (root.current ? local(root.current) : null);
  useLayoutEffect(() => { if (root.current) setFootprints(Object.fromEntries(Object.entries(menus.current).filter(([, m]) => m).map(([id, m]) => [id, at()(m)]))); }, [sort, show.space]);

  const close = () => { setOpen(null); setOver(null); };
  // what an item does, whichever menu it's on
  const pick = (id, key) => {
    if (id === 'view') {
      if (SORTS.some(([k]) => k === key)) setSort(key); else setShow((s) => ({ ...s, [key]: !s[key] }));
    } else if (key === 'star') setStarred((s) => ({ ...s, [id]: !s[id] }));
    close();
  };
  const label = (id, key) => (id === 'view' ? [...SORTS, ...SHOWS].find(([k]) => k === key)[1] : `${ACTIONS.find(([k]) => k === key)[1]} on ${id}`);
  const opened = () => setG((p) => (p && p.opened === null ? { ...p, opened: now() - p.t0 } : p));
  useEffect(() => {
    const down = (e) => { if (open && !e.target.closest?.('[data-menu-area]')) close(); };
    const key = (e) => { if (e.key === 'Escape') close(); };
    // Escape is heard in the capture phase: the plumber overlay on this page stops it on its way down
    window.addEventListener('pointerdown', down); window.addEventListener('keydown', key, true);
    return () => { window.removeEventListener('pointerdown', down); window.removeEventListener('keydown', key, true); };
  }, [open]);

  // every menu's trigger is wired here, the same way: broken opens on the click, fixed on the press
  const onDown = (id) => (e) => {
    if (e.button !== 0) return;
    if (fixed) e.preventDefault(); // the press is the menu's: no focus ring, and the click after it is ignored
    // a press that closes it is no try: the broken menu closes on its click, the fixed one on this press
    if (open === id) { setG(null); if (fixed) close(); return; }
    const o = root.current.getBoundingClientRect(), k = o.width / root.current.offsetWidth || 1;
    setG({ id, at: { x: (e.clientX - o.left) / k, y: (e.clientY - o.top) / k }, t0: now(), held: true, opened: fixed ? 0 : null, up: null, picked: null, missed: null });
    if (fixed) { setOpen(id); setOver(null); }
  };
  const onClick = (id) => (e) => {
    if (fixed && e.detail) return; // a pointer opened it already, on the press
    if (e.detail === 0) setG(null); // a keyboard click: no press to time
    else if (open !== id) opened();
    setOpen(open === id ? null : id); setOver(null);
  };
  // the release: where the hand let go, wherever that is
  useEffect(() => {
    if (!g?.held) return;
    const up = (e) => {
      const t = now(), hit = document.elementFromPoint(e.clientX, e.clientY);
      const item = hit?.closest?.(`[data-menu="${CSS.escape(g.id)}"] [data-pick]`);
      if (fixed && item && open === g.id) { pick(g.id, item.dataset.pick); setG((p) => ({ ...p, held: false, up: t - p.t0, picked: label(g.id, item.dataset.pick) })); return; }
      // broken: a release away from the button is no click, so nothing opens; over where an item would be is a miss
      const onTrigger = triggers.current[g.id]?.contains(hit), f = footprints[g.id];
      const o = root.current.getBoundingClientRect(), k = o.width / root.current.offsetWidth || 1, p = { x: (e.clientX - o.left) / k, y: (e.clientY - o.top) / k };
      const missed = !fixed && !onTrigger && !!f && p.x >= f.x && p.x <= f.x + f.w && p.y >= f.y && p.y <= f.y + f.h;
      setG((q) => ({ ...q, held: false, up: t - q.t0, missed }));
    };
    window.addEventListener('pointerup', up);
    return () => window.removeEventListener('pointerup', up);
  }, [g?.held, g?.id, open, fixed, footprints]);

  useEffect(() => {
    const what = g ? (g.id === 'view' ? 'View' : 'the ⋯') : '';
    onStatus?.(!g ? 'Press View, or any file’s ⋯, and hold it. Then try it in one motion: press, drag to an item, let go.'
      : g.held ? (g.opened === null ? 'Holding… the menu hasn’t opened.' : 'Open on the press. Still holding: drag to an item and let go.')
      : g.picked ? `${g.picked}, in one press: down, drag, up.`
      : g.missed ? `You let go where the menu would be, but ${what} opens on the click, and a release away from the button is no click. Nothing was picked.`
      : g.opened !== null && !fixed ? `It opened only when you let go, ${Math.round(g.opened)}ms after the press.`
      : g.opened === 0 ? 'It opened on the press and stays open; pick an item.'
      : 'Nothing opened.');
  }, [g, onStatus, fixed]);

  const files = [...FILES].sort((a, b) => (show.folders ? (b.folder ? 1 : 0) - (a.folder ? 1 : 0) : 0) || sortBy[sort](a, b));
  const card = sheet.current ? { w: sheet.current.offsetWidth, h: sheet.current.offsetHeight } : null;
  const t = g ? (g.held ? now() - g.t0 : g.opened ?? g.up ?? 0) : 0;
  const late = g && g.opened !== null && g.opened > 0;
  const kind = !g ? '' : g.opened === 0 ? 'on' : late || (g.up !== null && g.opened === null) ? 'off' : '';

  // render helpers, called as functions so the same button stays under the hand between press and release
  const Trigger = ({ id, children, className, ...rest }) => (
    <button ref={(el) => { triggers.current[id] = el; }} type="button" aria-haspopup="menu" aria-expanded={open === id} onPointerDown={onDown(id)} onClick={onClick(id)} className={className + ' select-none'} {...rest}>{children}</button>
  );
  const Item = ({ id, k, checked, children }) => (
    <button type="button" role={checked === undefined ? 'menuitem' : 'menuitemcheckbox'} aria-checked={checked} data-pick={k}
      onPointerEnter={() => setOver(k)} onPointerLeave={() => setOver((o) => (o === k ? null : o))} onClick={() => pick(id, k)}
      className={'flex h-8 w-full items-center gap-2 rounded-control px-2 text-left text-[13px] active:bg-line ' + (over === k && open === id ? 'bg-sunken' : '')}>{children}</button>
  );
  const MenuBox = ({ id, label: name, className, children }) => (
    // the menu keeps its box while closed, only hidden, so a release that missed it can show where it was
    <div ref={(el) => { menus.current[id] = el; }} role="menu" aria-label={name} data-menu={id} aria-hidden={open !== id} inert={open !== id}
      className={'absolute z-20 rounded-card bg-surface p-1 shadow-popover ring-1 ring-ink/[0.07] ' + className + (open === id ? '' : ' invisible')}>{children}</div>
  );
  const Check = ({ on }) => <span className="grid size-4 place-items-center text-accent">{on ? <CheckIcon size={14} texture="solid" /> : null}</span>;
  const Caps = ({ children }) => <p className="px-2 pt-2 pb-1 text-[11px] font-medium tracking-caps text-ink-subtle uppercase">{children}</p>;

  return (
    // the component, and room under it for plumber's ruler
    <div ref={root} className="relative w-[37.5rem] max-w-full pb-14">
      <article ref={sheet} className="rounded-sheet bg-surface shadow-window">
        <header className="flex items-center gap-3 px-5 pt-[18px]">
          <span className="grid size-9 place-items-center rounded-card bg-accent-soft text-accent-deep"><FolderIcon size={16} texture="dither" /></span>
          <span className="flex flex-col">
            <span className="text-[17px] leading-6 font-medium tracking-[-0.01em]">Brand</span>
            <span className="text-[13px] text-ink-muted">Shared drive · <span className="tabular-nums">214</span> items</span>
          </span>
          <span className="ml-auto flex">
            {[jonas, ruth, felix].map((f, i) => <img key={i} src={f} alt="" className={'size-[26px] rounded-full object-cover ring-2 ring-surface ' + (i ? '-ml-[7px]' : '')} />)}
            <span className="-ml-[7px] grid size-[26px] place-items-center rounded-full bg-sunken text-[11px] font-medium text-ink-muted tabular-nums ring-2 ring-surface">+4</span>
          </span>
          <div data-menu-area className="relative">
            {Trigger({ id: 'view', className: 'inline-flex h-8 items-center gap-1.5 rounded-control pr-2.5 pl-2 text-[13px] font-medium ring-1 ring-line ring-inset ' + (open === 'view' ? 'bg-sunken text-ink' : 'text-ink hover:bg-sunken active:bg-line'),
              children: <><SlidersIcon size={14} texture="solid" className="text-ink-muted" />View</> })}
            {MenuBox({ id: 'view', label: 'View', className: "top-10 right-0 w-56", children: <>
              <Caps>Sort by</Caps>
              {SORTS.map(([k, l, dir]) => <Fragment key={k}>{Item({ id: 'view', k: k, checked: sort === k, children: <><Check on={sort === k} />{l}{dir && sort === k ? <span className="ml-auto text-xs text-ink-subtle">{dir}</span> : null}</> })}</Fragment>)}
              <span aria-hidden="true" className="mx-1.5 my-1 block h-hairline bg-line" />
              <Caps>Show</Caps>
              {SHOWS.map(([k, l, key]) => <Fragment key={k}>{Item({ id: 'view', k: k, checked: show[k], children: <><Check on={show[k]} />{l}{key ? <kbd className="ml-auto font-sans text-xs text-ink-subtle">{key}</kbd> : null}</> })}</Fragment>)}
            </> })}
          </div>
        </header>

        {show.space ? (
          <section aria-label="Space by kind" className="px-5 pt-4 pb-3.5">
            <span className="flex justify-between text-xs text-ink-muted"><span><span className="font-medium text-ink tabular-nums">31.6 GB</span> of 50 GB used</span><span className="tabular-nums">18.4 GB free</span></span>
            <span className="mt-2 flex h-2 gap-0.5 overflow-hidden rounded-[4px] bg-sunken">{SPACE.map(([k, , w]) => <span key={k} className="h-full" style={{ width: `${w}%`, background: KIND[k] }} />)}</span>
            <span className="mt-2 flex gap-3.5 text-xs text-ink-muted">{SPACE.map(([k, l]) => <span key={k} className="flex items-center gap-1.5"><span className="size-2 rounded-[2px]" style={{ background: KIND[k] }} />{l}</span>)}</span>
          </section>
        ) : <div className="h-3" />}

        <div className={`${COLS} h-8 border-y-hairline border-line px-5 text-[11px] font-medium tracking-caps text-ink-subtle uppercase`}>
          <span className={sort === 'name' ? 'text-ink' : ''}>Name</span><span className={sort === 'owner' ? 'text-ink' : ''}>Owner</span>
          <span className={sort === 'date' ? 'text-ink' : ''}>Modified</span><span className={'text-right ' + (sort === 'size' ? 'text-ink' : '')}>Size</span><span />
        </div>
        <ul className="pb-1.5">
          {files.map((f, i) => (
            <li key={f.name} className={`${COLS} relative h-[52px] px-5 text-[13px]`}>
              {i ? <span aria-hidden="true" className="absolute top-0 right-5 left-16 h-hairline bg-line" /> : null}
              <span className="flex min-w-0 items-center gap-3">
                {f.folder ? <span className="grid size-8 shrink-0 place-items-center rounded-control bg-sunken text-ink-muted ring-1 ring-line ring-inset"><FolderIcon size={16} texture="dither" /></span>
                  : f.thumb && show.thumbs ? (
                    <span className="relative size-8 shrink-0">
                      <img src={f.thumb} alt="" className="size-full rounded-control object-cover outline-1 -outline-offset-1 outline-black/10" />
                      {f.length ? <span className="absolute inset-x-0.5 bottom-0.5 h-[11px] rounded-[3px] bg-black/60 text-center text-[8px] leading-[11px] font-bold text-white tabular-nums">{f.length}</span> : null}
                    </span>
                  ) : <span className="grid size-8 shrink-0 place-items-center rounded-control text-[8.5px] font-bold tracking-wide text-white case-forms" style={{ background: KIND[f.kind] }}>{f.tile ?? f.name.split('.').pop().toUpperCase()}</span>}
                <span className="flex min-w-0 flex-col">
                  <span className="flex items-center gap-1.5"><span className="truncate font-medium">{f.name}</span>{starred[f.name] ? <HeartIcon size={12} texture="solid" className="shrink-0 text-negative" aria-label="Starred" /> : null}</span>
                  <span className="text-xs text-ink-subtle tabular-nums">{f.detail}</span>
                </span>
              </span>
              <span className="flex min-w-0 items-center gap-2 text-ink-muted"><img src={f.owner[1]} alt="" className="size-[22px] shrink-0 rounded-full object-cover outline-1 -outline-offset-1 outline-black/10" /><span className="truncate">{f.owner[0]}</span></span>
              <span className="text-ink-muted">{f.date}</span>
              <span className="text-right text-ink-muted tabular-nums">{sized(f.mb)}</span>
              <div data-menu-area className="relative">
                {Trigger({ id: f.name, 'aria-label': `Actions for ${f.name}`, className: 'grid size-7 place-items-center rounded-control text-ink-muted ' + (open === f.name ? 'bg-sunken text-ink' : 'hover:bg-sunken hover:text-ink active:bg-line'),
                  children: <span aria-hidden="true" className="text-[15px] leading-none">⋯</span> })}
                {MenuBox({ id: f.name, label: f.name, className: "top-8 right-0 w-44", children: <>
                  {ACTIONS.map(([k, l, I]) => <Fragment key={k}>{Item({ id: f.name, k: k, children: <><span className="grid size-4 place-items-center text-ink-muted"><I size={14} texture="solid" /></span>{k === 'star' && starred[f.name] ? 'Unstar' : l}</> })}</Fragment>)}
                </> })}
              </div>
            </li>
          ))}
        </ul>
      </article>
      <MarksLayer>
        {g ? <Contact {...g.at} /> : null}
        {g?.missed && footprints[g.id] ? <Ghost {...footprints[g.id]} /> : null}
        {g && card && (late || kind === 'on' || (g.up !== null && g.opened === null)) ? (() => {
          const tr = triggers.current[g.id] ? at()(triggers.current[g.id]) : { x: 0, y: 0, h: 0 };
          return (
            <Tag x={tr.x - 8} y={tr.y + tr.h / 2} off={kind !== 'on'}>
              {kind === 'on' ? '0ms · on the press' : g.opened === null ? 'never opened while held' : `${Math.round(g.opened)}ms · on release`}
            </Tag>
          );
        })() : null}
        {card ? <Ruler top={card.h + 14} width={card.w} span={1000} played={t} kind={kind}
          events={g ? [[0, ''], ...(g.opened !== null ? [[g.opened, g.opened === 0 ? 'on' : 'off']] : []), ...(g.up !== null && g.up !== g.opened ? [[g.up, '']] : [])] : []} /> : null}
      </MarksLayer>
    </div>
  );
}
StoweDrive.names = ['Opens on click', 'Opens on press'];
StoweDrive.lesson = {
  why: 'A menu that opens on click waits for the button to come back up, so a press only opens it on release. And it can’t do what desktop menus do: press, drag to an item, let go. A release away from the button is no click at all. Here every menu is built that way, View and each file’s ⋯ alike.',
  habit: 'Open menus on pointerdown, and pick the item under the pointer on pointerup. Radix’s DropdownMenu and Base UI’s Menu do both; a hand-rolled onClick menu does neither.',
};
