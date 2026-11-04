// Hands-on examples (docs/craft/tactile-demos.md, .claude/skills/craft-rule §3¾): for a principle whose mistake only
// exists while someone does something, the viewer's own hand is the probe. Each example is one component with two
// sides (`side`: 'broken' | 'fixed', as the probe stage's are): the real component, which really behaves that way, and
// plumber's marks drawn live from what the viewer just did. Marks are a vocabulary, not a kit: each draws one number
// plumber's rule measures and the lesson turns on, and nothing else (no trail unless the path is the lesson).
//
// The marks live in a shadow root with plumber's tokens (overlay/src/tokens.css), as the stage's PlumbLayer does, so
// plumber reading [data-example] never reads them. Each example says what just happened through `onStatus`.
//
// HANDS_ON[n] = Component, with .names (the switch, naming the technique) and .lesson ({ why, habit }).
// The rule page (Principle.jsx) shows them with their switch, what just happened, and the lesson.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckIcon, FileIcon, FolderIcon, HistoryIcon, PlusIcon, RetryIcon, SlidersIcon } from '@unlocalhosted/dither-icons';

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

// plumber's marks, as the stage draws them (Principle.jsx Marks): 1px lines at 55%, hatch at 45°, the blueprint tag
const hue = (off) => (off ? 'var(--pl-off)' : 'var(--pl-on)');
const Line = ({ x, y, h, off, dashed }) => (
  <span style={{ position: 'absolute', left: x, top: y, width: 0, height: h, borderLeft: `1px ${dashed ? 'dashed' : 'solid'} ${hue(off)}`, opacity: dashed ? 0.8 : 0.55 }} />
);
const Hatch = ({ x, y, w, h }) => (
  <span style={{ position: 'absolute', left: x, top: y, width: w, height: h, opacity: 0.55, backgroundImage: 'repeating-linear-gradient(45deg, var(--pl-off) 0 1px, transparent 1px 4px)' }} />
);
const Outline = ({ x, y, w, h, off, r = 4 }) => (
  <span style={{ position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: r, boxShadow: `inset 0 0 0 1px ${hue(off)}`, opacity: 0.7 }} />
);
const Tag = ({ x, y, off, end, children }) => (
  <span style={{ position: 'absolute', left: x, top: y, transform: end ? 'translate(-100%, -50%)' : 'translateY(-50%)', display: 'flex', alignItems: 'center', height: 20, padding: '0 var(--pl-space-3)',
    borderRadius: 'var(--pl-radius-tag)', font: '500 11px/1 var(--pl-mono)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
    color: 'var(--pl-on-accent)', background: hue(off), boxShadow: '0 0 0 1px var(--pl-halo)', animation: 'none' }}>{children}</span>
);

// a box in the example's own pixels, whatever the stage's camera does to it (a scale on an ancestor)
function local(root) {
  const o = root.getBoundingClientRect(), k = o.width / root.offsetWidth || 1;
  return (el) => { const r = el.getBoundingClientRect(); return { x: (r.left - o.left) / k, y: (r.top - o.top) / k, w: r.width / k, h: r.height / k }; };
}

// ── #42 Bold on hover must not shift layout ─────────────────────────────────
// A project's views as tabs. Broken: hover:font-semibold, the habit plumber flags (ProjectTabs). Semibold letters are
// wider, so the tab under the pointer grows and every tab after it slides. Fixed: plumber's fix, darker on hover.
// The marks: only what moved and by how much. Each later tab's resting edge (a dashed line), the ground it slid across
// (hatch), the tab that grew (an outline), and the shift in px, read from the real tabs against where they rest.
// No trail, no ruler: the route and the time aren't the lesson.
const VIEWS = ['Overview', 'Board', 'Timeline', 'Files', 'Settings'];
const TASKS = [
  ['Brief the press list', 'LR', 'Thu', true],
  ['Final cut of the launch film', 'JB', 'Fri', true],
  ['Pricing page copy', 'AO', '12 Mar', false],
];
function BoldHover({ side = 'broken', onStatus }) {
  const root = useRef(null), nav = useRef(null);
  const [rest, setRest] = useState(null);
  const [read, setRead] = useState(null); // the last hover read: held after the pointer leaves, until the next one
  const hover = side === 'broken' ? 'hover:font-semibold hover:text-ink' : 'hover:text-ink';
  const tabs = () => [...(nav.current?.querySelectorAll('a') ?? [])];
  // where each tab rests, read with nothing hovered: on mount, on each side, once the font is in, on resize
  const measure = () => { if (!root.current || tabs().some((t) => t.matches(':hover'))) return; const at = local(root.current); setRest(tabs().map(at)); };
  useLayoutEffect(() => { measure(); setRead(null); }, [side]);
  useEffect(() => {
    document.fonts?.ready.then(measure);
    const ro = new ResizeObserver(() => measure());
    ro.observe(root.current);
    return () => ro.disconnect();
  }, []);
  // read on the next frame: the pointer's events arrive before the browser has moved :hover (and the weight with it)
  const look = () => requestAnimationFrame(readHover);
  const readHover = () => {
    if (!rest || !root.current) return;
    const list = tabs(), i = list.findIndex((t) => t.matches(':hover'));
    if (i <= 0) return; // nothing, or the current view (it's already semibold)
    const at = local(root.current), now = list.map(at);
    const after = now.map((_, j) => j).filter((j) => j > i);
    const shift = Math.max(0, ...after.map((j) => now[j].x - rest[j].x));
    setRead({ i, now, after, shift });
  };
  useEffect(() => {
    if (!read) return onStatus?.('Run your pointer along the tabs, slowly.');
    const name = VIEWS[read.i], n = read.after.length;
    onStatus?.(read.shift >= 0.5
      ? `${name} turned semibold and grew ${read.shift.toFixed(1)}px, so the ${n} tab${n === 1 ? '' : 's'} after it slid over by that much. Every tab you cross does it again.`
      : `${name} darkened and kept its width: nothing after it moved.`);
  }, [read, onStatus]);

  const off = read && read.shift >= 0.5;
  return (
    <article ref={root} onPointerMove={look} onPointerOver={look} className="relative w-[30rem] max-w-full rounded-card bg-surface shadow-card">
      <header className="flex items-center gap-2 px-5 pt-4 pb-3">
        <FolderIcon size={16} texture="dither" className="text-ink-muted" />
        <span className="text-[17px] leading-6 font-medium tracking-[-0.01em]">Spring launch</span>
        <span className="ml-auto inline-flex h-7 items-center gap-1.5 rounded-control pr-2.5 pl-2 text-[13px] font-medium text-ink-muted ring-1 ring-line ring-inset"><PlusIcon size={14} texture="solid" />New task</span>
      </header>
      <nav ref={nav} aria-label="Views" className="flex gap-5 border-b-hairline border-line px-5">
        {VIEWS.map((v, i) => (
          <a key={v} href={`#${v.toLowerCase()}`} onClick={(e) => e.preventDefault()} aria-current={i === 0 ? 'page' : undefined}
            className={i === 0 ? '-mb-px border-b-2 border-ink py-2.5 text-sm font-semibold' : `border-b-2 border-transparent py-2.5 text-sm text-ink-muted ${hover}`}>{v}</a>
        ))}
      </nav>
      <ul className="px-3 py-2">
        {TASKS.map(([task, who, due, soon]) => (
          <li key={task} className="flex h-10 items-center gap-3 px-2 text-[13px]">
            <span className="size-3.5 shrink-0 rounded-full ring-[1.25px] ring-ink/25 ring-inset" />
            <span className="min-w-0 flex-1 truncate">{task}</span>
            <span className="grid size-6 place-items-center rounded-full bg-sunken text-[10px] font-medium text-ink-muted ring-1 ring-line ring-inset">{who}</span>
            <span className={'w-14 rounded-chip px-1.5 py-1 text-center text-[11px] font-medium ' + (soon ? 'bg-caution-soft text-caution' : 'text-ink-subtle')}>{due}</span>
          </li>
        ))}
      </ul>
      <MarksLayer>
        {read && rest ? (
          <>
            {off ? <Outline {...read.now[read.i]} y={read.now[read.i].y + 6} h={read.now[read.i].h - 12} off /> : null}
            {read.after.map((j) => (
              <span key={j}>
                <Line x={rest[j].x} y={rest[j].y + 6} h={rest[j].h - 12} off={off} dashed={off} />
                {off ? <Hatch x={rest[j].x} y={rest[j].y + 10} w={read.now[j].x - rest[j].x} h={rest[j].h - 20} /> : null}
              </span>
            ))}
            {(() => { const last = read.now.at(-1); return <Tag x={last.x + last.w + 10} y={last.y + last.h / 2} off={off}>{off ? `+${read.shift.toFixed(1)}px · ${read.after.length} slid` : '0px ✓'}</Tag>; })()}
          </>
        ) : null}
      </MarksLayer>
    </article>
  );
}
BoldHover.names = ['Bold on hover', 'Darker on hover'];
BoldHover.lesson = {
  why: 'Bold letters are wider than regular ones. When a tab turns semibold under the pointer it grows a few pixels, and every tab after it slides over: move along the row and the whole row jitters under your cursor.',
  habit: 'Show hover with colour, not weight. If a hover must be bold, reserve the bold width first (a hidden bold copy of the label).',
};

// The time ruler under an example (probe-marks.html's): 0 to `span` ms from the gesture's start, what has played, the
// events on it. Drawn in the marks layer, under the component.
function Ruler({ top, width, span, played, kind, events, label = 'live' }) {
  const x = (ms) => (Math.min(span, Math.max(0, ms)) / span) * width;
  const step = span <= 1200 ? 100 : 250, major = span <= 1200 ? 200 : 1000;
  const ticks = [];
  for (let ms = 0; ms <= span; ms += step) ticks.push(ms);
  const col = (k) => (k === 'off' ? 'var(--pl-off)' : k === 'on' ? 'var(--pl-on)' : 'var(--pl-sky)');
  return (
    <div style={{ position: 'absolute', left: 0, top, width, height: 40 }}>
      <span style={{ position: 'absolute', right: 0, top: -6, font: '600 10.5px/14px var(--pl-sans)', color: 'var(--pl-ink-2)' }}>{label}</span>
      <span style={{ position: 'absolute', left: 0, right: 0, top: 16, borderTop: '1px solid var(--pl-ink-3)' }} />
      {ticks.map((ms) => (
        <span key={ms}>
          <span style={{ position: 'absolute', left: x(ms), top: ms % major ? 14 : 12, width: 1, height: ms % major ? 4 : 8, background: 'var(--pl-ink-3)' }} />
          {ms % major ? null : <span style={{ position: 'absolute', left: Math.min(width - 14, Math.max(8, x(ms))), top: 22, transform: 'translateX(-50%)', font: '400 10.5px/14px var(--pl-mono)', color: 'var(--pl-ink-2)' }}>{ms >= 1000 ? `${ms / 1000}s` : ms}</span>}
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
// hollow, so the word you pressed still reads through it
const Contact = ({ x, y }) => <span style={{ position: 'absolute', left: x - 5, top: y - 5, width: 10, height: 10, borderRadius: '50%', boxShadow: '0 0 0 1.5px var(--pl-sky), 0 0 0 3px var(--pl-halo)' }} />;
const Ghost = ({ x, y, w, h, r = 10, off = true }) => <span style={{ position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: r, border: `1px dashed ${hue(off)}`, opacity: 0.6 }} />;

// a clock that ticks while `on`, for marks that grow while you hold
function useTicking(on) {
  const [, tick] = useState(0);
  useEffect(() => {
    if (!on) return;
    let id = requestAnimationFrame(function f() { tick((n) => n + 1); id = requestAnimationFrame(f); });
    return () => cancelAnimationFrame(id);
  }, [on]);
}

// ── #61 Menus open on pointerdown, with press-drag-release ─────────────────
// A shared folder's View menu. Broken: the menu a hand-rolled one is, opened by onClick, so it opens when the button
// comes back up. Fixed: opened on pointerdown, as Radix's DropdownMenu and Base UI's Menu do; held, the item under
// the pointer is chosen when you let go, so press, drag, release picks in one motion.
// plumber's probe (src/craft-probe.ts menuDown) presses and holds and reads whether the press alone opened it. The
// marks are that: where you pressed, and the ruler from the press to the moment it opened. The drag-release half
// isn't probed yet, so it gets no mark: the product shows it (the list re-sorts), the status says it in words.
const FILES = [
  ['Brand guidelines.pdf', '2 Mar', 4.8], ['Logo, final.svg', '28 Feb', 0.2], ['Launch film, cut 3.mov', '4 Mar', 812],
  ['Press release.doc', '1 Mar', 0.3], ['Photography', '26 Feb', 240],
];
const SORTS = [['name', 'Name'], ['date', 'Date modified'], ['size', 'Size']];
const dated = (d) => new Date(`${d} 2026`).getTime();
const sortBy = { name: (a, b) => a[0].localeCompare(b[0]), date: (a, b) => dated(b[1]) - dated(a[1]), size: (a, b) => b[2] - a[2] };
const sized = (mb) => (mb >= 1 ? `${mb >= 100 ? Math.round(mb) : mb} MB` : `${Math.round(mb * 1000)} KB`);
function MenuPress({ side = 'broken', onStatus }) {
  const root = useRef(null), sheet = useRef(null), trigger = useRef(null), menu = useRef(null);
  const [open, setOpen] = useState(false);
  const [sort, setSort] = useState('name');
  const [over, setOver] = useState(null);
  const [g, setG] = useState(null); // the press: { at, t0, held, opened, up, picked, missed }
  const [footprint, setFootprint] = useState(null); // where the menu sits when open, for the ghost
  const fixed = side === 'fixed';
  useTicking(!!g?.held);
  const now = () => performance.now();
  const at = () => (root.current ? local(root.current) : null);
  // where the menu sits (it keeps its box while closed, only invisible), for the ghost of a release that missed it
  useLayoutEffect(() => { if (menu.current && root.current) setFootprint(at()(menu.current)); }, []);

  const pick = (key) => { setSort(key); setOpen(false); setOver(null); };
  const opened = () => setG((p) => (p && p.opened === null ? { ...p, opened: now() - p.t0 } : p));
  useEffect(() => {
    const down = (e) => { if (open && !root.current?.querySelector('[data-menu-area]')?.contains(e.target)) { setOpen(false); setOver(null); } };
    const key = (e) => { if (e.key === 'Escape') { setOpen(false); setOver(null); } };
    window.addEventListener('pointerdown', down); window.addEventListener('keydown', key);
    return () => { window.removeEventListener('pointerdown', down); window.removeEventListener('keydown', key); };
  }, [open]);

  const onDown = (e) => {
    if (e.button !== 0) return;
    if (fixed) e.preventDefault(); // the press is the menu's: no focus ring, and the click after it is ignored
    // a press that closes it is no try: the broken menu closes on its click, the fixed one on this press
    if (open) { setG(null); if (fixed) { setOpen(false); setOver(null); } return; }
    const o = root.current.getBoundingClientRect(), k = o.width / root.current.offsetWidth || 1;
    setG({ at: { x: (e.clientX - o.left) / k, y: (e.clientY - o.top) / k }, t0: now(), held: true, opened: fixed ? 0 : null, up: null, picked: null, missed: null });
    if (fixed) setOpen(true);
  };
  // the release: where the hand let go, wherever that is
  useEffect(() => {
    if (!g?.held) return;
    const up = (e) => {
      const t = now() - g.t0;
      const item = document.elementFromPoint(e.clientX, e.clientY)?.closest?.('[data-sort]');
      const onTrigger = trigger.current?.contains(document.elementFromPoint(e.clientX, e.clientY));
      if (fixed && item && open) { pick(item.dataset.sort); setG((p) => ({ ...p, held: false, up: t, picked: item.dataset.sort })); return; }
      // broken: a release away from the button is no click, so nothing opens; over where an item would be is a miss
      const missed = !fixed && !onTrigger ? (footprint && (() => { const o = root.current.getBoundingClientRect(), k = o.width / root.current.offsetWidth || 1, p = { x: (e.clientX - o.left) / k, y: (e.clientY - o.top) / k }; return p.x >= footprint.x && p.x <= footprint.x + footprint.w && p.y >= footprint.y && p.y <= footprint.y + footprint.h; })()) : false;
      setG((p) => ({ ...p, held: false, up: t, missed }));
    };
    window.addEventListener('pointerup', up);
    return () => window.removeEventListener('pointerup', up);
  }, [g?.held, open, fixed, footprint]);
  const onClick = (e) => {
    if (fixed && e.detail) return; // a pointer opened it already, on the press
    if (e.detail === 0) setG(null); // a keyboard click: no press to time
    else if (!open) opened();
    setOpen(!open); setOver(null);
  };

  useEffect(() => {
    const say = !g ? 'Press View and hold it. Then try it in one motion: press, drag down to Date modified, let go.'
      : g.held ? (g.opened === null ? 'Holding… the menu hasn’t opened.' : 'Open on the press. Still holding: drag to an item and let go.')
      : g.picked ? `Sorted by ${SORTS.find(([k]) => k === g.picked)[1].toLowerCase()}, in one press: down, drag, up.`
      : g.missed ? 'You let go where the menu would be, but it opens on the click, and a release away from the button is no click. Nothing was picked.'
      : g.opened !== null && !fixed ? `It opened only when you let go, ${Math.round(g.opened)}ms after the press.`
      : g.opened === 0 ? 'It opened on the press and stays open; pick an item.'
      : 'Nothing opened.';
    onStatus?.(say);
  }, [g, onStatus, fixed]);

  const files = [...FILES].sort(sortBy[sort]);
  const card = sheet.current ? { w: sheet.current.offsetWidth, h: sheet.current.offsetHeight } : null;
  const t = g ? (g.held ? now() - g.t0 : g.opened ?? g.up ?? 0) : 0;
  const late = g && g.opened !== null && g.opened > 0;
  const kind = !g ? '' : g.opened === 0 ? 'on' : late || (g.up !== null && g.opened === null) ? 'off' : '';
  return (
    // the component, and room under it for plumber's ruler
    <div ref={root} className="relative w-[30rem] max-w-full pb-14">
    <article ref={sheet} className="rounded-card bg-surface shadow-card">
      <header className="flex items-center gap-2 px-5 pt-4 pb-3">
        <FolderIcon size={16} texture="dither" className="text-ink-muted" />
        <span className="text-[17px] leading-6 font-medium tracking-[-0.01em]">Brand</span>
        <span className="text-[13px] text-ink-subtle">· Shared drive</span>
        <div data-menu-area className="relative ml-auto">
          <button ref={trigger} type="button" aria-haspopup="menu" aria-expanded={open} onPointerDown={onDown} onClick={onClick}
            className={'inline-flex h-7 items-center gap-1.5 rounded-control pr-2.5 pl-2 text-[13px] font-medium ring-1 ring-line ring-inset select-none ' + (open ? 'bg-sunken text-ink' : 'text-ink-muted hover:bg-sunken hover:text-ink')}>
            <SlidersIcon size={14} texture="solid" />View
          </button>
          <div ref={menu} role="menu" aria-label="View" aria-hidden={!open} inert={!open} className={'absolute top-9 right-0 z-10 w-52 rounded-card bg-surface p-1 shadow-popover ring-1 ring-line ' + (open ? '' : 'invisible')}>
            <p className="px-2 pt-1.5 pb-1 text-[11px] font-medium tracking-[0.04em] text-ink-subtle uppercase">Sort by</p>
            {SORTS.map(([key, label]) => (
              <button key={key} type="button" role="menuitemradio" aria-checked={sort === key} data-sort={key}
                onPointerEnter={() => setOver(key)} onPointerLeave={() => setOver((o) => (o === key ? null : o))} onClick={() => pick(key)}
                className={'flex h-8 w-full items-center gap-2 rounded-control px-2 text-left text-[13px] ' + (over === key ? 'bg-sunken' : '')}>
                <span className="grid size-4 place-items-center text-accent">{sort === key ? <CheckIcon size={14} texture="solid" /> : null}</span>{label}
              </button>
            ))}
          </div>
        </div>
      </header>
      <div className="grid grid-cols-[1fr_5rem_4.5rem] gap-3 border-b-hairline border-line px-5 pb-2 text-[11px] font-medium tracking-[0.04em] text-ink-subtle uppercase">
        <span>Name</span><span>Modified</span><span className="text-right">Size</span>
      </div>
      <ul className="px-3 py-1.5">
        {files.map(([name, date, mb]) => (
          <li key={name} className="grid h-9 grid-cols-[1fr_5rem_4.5rem] items-center gap-3 px-2 text-[13px]">
            <span className="flex min-w-0 items-center gap-2.5">{mb >= 100 && !name.includes('.') ? <FolderIcon size={14} texture="solid" className="shrink-0 text-ink-subtle" /> : <FileIcon size={14} texture="solid" className="shrink-0 text-ink-subtle" />}<span className="truncate">{name}</span></span>
            <span className="text-ink-muted">{date}</span>
            <span className="text-right text-ink-muted tabular-nums">{sized(mb)}</span>
          </li>
        ))}
      </ul>
    </article>
      <MarksLayer>
        {g ? <Contact {...g.at} /> : null}
        {g?.missed && footprint ? <Ghost {...footprint} /> : null}
        {g && card ? (() => {
          const tr = at()?.(trigger.current);
          return late || kind === 'on' || (g.up !== null && g.opened === null) ? (
            <Tag end x={(tr?.x ?? 0) - 8} y={(tr?.y ?? 0) + (tr?.h ?? 0) / 2} off={kind !== 'on'}>
              {kind === 'on' ? '0ms · on the press' : g.opened === null ? 'never opened while held' : `${Math.round(g.opened)}ms · on release`}
            </Tag>
          ) : null;
        })() : null}
        {card ? <Ruler top={card.h + 14} width={card.w} span={1000} played={t} kind={kind}
          events={g ? [[0, ''], ...(g.opened !== null ? [[g.opened, g.opened === 0 ? 'on' : 'off']] : []), ...(g.up !== null && g.up !== g.opened ? [[g.up, '']] : [])] : []} /> : null}
      </MarksLayer>
    </div>
  );
}
MenuPress.names = ['Opens on click', 'Opens on press'];
MenuPress.lesson = {
  why: 'A menu that opens on click waits for the button to come back up, so a press only opens it on release. And it can’t do what desktop menus do: press, drag to an item, let go. A release away from the button is no click at all.',
  habit: 'Open menus on pointerdown, and pick the item under the pointer on pointerup. Radix’s DropdownMenu and Base UI’s Menu do both; a hand-rolled onClick menu does neither.',
};

// ── #77 Skeletons match the final layout exactly ───────────────────────────
// Quarry's activity feed and its refresh. Each refresh is a real request to the showcase's /api/activity, its reply
// held 0.9s as plumber holds a page's replies (said on the marks). Broken: a generic skeleton, a thin bar per row, so
// the rows land taller and everything under the feed jumps, the link you were reaching for included. Fixed: the
// skeleton is the rows' own shape (a mark, two lines), so nothing moves when they land.
// plumber's rule (craft-headless skeletonMatch) compares the skeleton's box while the page waited with the box of what
// landed. The marks are that: the box it promised (a dashed ghost), what it grew by (hatch, a tag), and what below
// moved, with your pointer if it was on it. No ruler: how long it took isn't the lesson.
const HOLD = 900;
const initials = (what) => what.split(' ')[0].slice(0, 2).toUpperCase();
function SkeletonLand({ side = 'broken', onStatus }) {
  const root = useRef(null), list = useRef(null), more = useRef(null), hand = useRef(null);
  const [items, setItems] = useState(null);
  const [loading, setLoading] = useState(false);
  const [rec, setRec] = useState(null); // { before: { box, n, link }, after: { box, n, link }, hand }
  const pending = useRef(null);
  const [held, setHeld] = useState(null); // the skeleton's box, as read while the reply is held
  const fixed = side === 'fixed';
  const at = () => local(root.current);
  const inside = (p, r) => p && r && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  useEffect(() => { fetch('/api/activity').then((r) => r.json()).then(setItems); }, []);
  // the skeleton is read while it shows, as plumber reads it while the reply is held
  useLayoutEffect(() => {
    if (!loading) return;
    pending.current = { before: { box: at()(list.current), n: list.current.children.length, link: at()(more.current) } };
    setHeld(pending.current.before.box);
    let gone = false;
    Promise.all([fetch('/api/activity').then((r) => r.json()), new Promise((r) => setTimeout(r, HOLD))]).then(([body]) => {
      if (gone) return;
      // the pointer, the moment before the rows land: was it on the link?
      pending.current.hand = inside(hand.current, at()(more.current)) ? hand.current : null;
      setItems(body); setLoading(false);
    });
    return () => { gone = true; };
  }, [loading]);
  // and what landed, the frame it lands
  useLayoutEffect(() => {
    if (loading || !pending.current) return;
    const p = pending.current; pending.current = null;
    setRec({ ...p, after: { box: at()(list.current), n: list.current.children.length, link: at()(more.current) } });
  }, [loading, items]);
  const track = (e) => { const o = root.current.getBoundingClientRect(), k = o.width / root.current.offsetWidth || 1; hand.current = { x: (e.clientX - o.left) / k, y: (e.clientY - o.top) / k }; };

  const grew = rec ? rec.after.box.h - rec.before.box.h : 0, off = Math.abs(grew) > 4; // the rule's line (craft-spec: 4px)
  const moved = rec ? rec.after.link.y - rec.before.link.y : 0;
  useEffect(() => {
    onStatus?.(loading ? 'Loading. Now reach for View all activity, under the feed.'
      : !rec ? 'Press Refresh, then reach for View all activity while it loads.'
      : off ? `It landed ${Math.round(grew)}px taller than its skeleton, so View all activity dropped ${Math.round(moved)}px${rec.hand ? ', out from under your pointer' : ''}.`
      : `It landed in the skeleton’s own shape: the same ${rec.after.n} rows, the same height. Nothing under it moved${rec.hand ? ', and your pointer is still on the link' : ''}.`);
  }, [loading, rec, onStatus]);

  const row = 'flex items-center gap-3 px-5';
  return (
    <div ref={root} onPointerMove={track} className="relative w-[26rem] max-w-full">
      <article className="rounded-card bg-surface shadow-card">
        <header className="flex items-center gap-2 px-5 pt-4 pb-2">
          <HistoryIcon size={16} texture="dither" className="text-ink-muted" />
          <span className="text-[17px] leading-6 font-medium tracking-[-0.01em]">Activity</span>
          <button type="button" onClick={() => !loading && (setRec(null), setLoading(true))}
            className="ml-auto inline-flex h-7 items-center gap-1.5 rounded-control pr-2.5 pl-2 text-[13px] font-medium text-ink-muted ring-1 ring-line ring-inset hover:bg-sunken hover:text-ink">
            <RetryIcon size={14} texture="solid" />Refresh
          </button>
        </header>
        <ul ref={list} aria-busy={loading || !items} className="py-1">
          {loading || !items
            ? [0, 1, 2].map((i) => fixed ? (
              // the rows' own shape: the mark, the line, the time under it
              <li key={i} className={row + ' h-14'}><span className="size-8 shrink-0 animate-pulse rounded-full bg-sunken" /><span className="flex flex-1 flex-col gap-1.5"><span className="h-3 w-3/4 animate-pulse rounded-chip bg-sunken" /><span className="h-2.5 w-16 animate-pulse rounded-chip bg-sunken" /></span></li>
            ) : (
              // a generic skeleton: one thin bar a row
              <li key={i} className={row + ' h-8'}><span className="h-3 w-full animate-pulse rounded-chip bg-sunken" /></li>
            ))
            : items.map((a) => (
              <li key={a.id} className={row + ' h-14'}>
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-sunken text-[11px] font-medium text-ink-muted ring-1 ring-line ring-inset">{initials(a.what)}</span>
                <span className="min-w-0"><span className="block truncate text-[13px]">{a.what}</span><span className="block text-[12px] text-ink-subtle">{a.when}</span></span>
              </li>
            ))}
        </ul>
        <footer className="border-t-hairline border-line px-5 py-3">
          <a ref={more} href="#activity" onClick={(e) => e.preventDefault()} className="inline-flex items-center gap-1 text-[13px] font-medium text-accent hover:underline">View all activity</a>
        </footer>
      </article>
      <MarksLayer>
        {loading && held ? (
          // plumber measuring the skeleton while the reply is held
          <>
            <span style={{ position: 'absolute', left: held.x, top: held.y, width: held.w, height: held.h, border: '1px dashed var(--pl-sky)', borderRadius: 4, opacity: 0.8 }} />
            <span style={{ position: 'absolute', left: held.x + held.w + 10, top: held.y + 10, transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', height: 20, padding: '0 var(--pl-space-3)', borderRadius: 'var(--pl-radius-tag)', font: '500 11px/1 var(--pl-mono)', color: 'var(--pl-on-accent)', background: 'var(--pl-sky)', boxShadow: '0 0 0 1px var(--pl-halo)', whiteSpace: 'nowrap' }}>reply held 0.9s</span>
          </>
        ) : null}
        {rec ? (
          <>
            <Ghost {...rec.before.box} r={4} off={off} />
            {off ? <Hatch x={rec.before.box.x} y={rec.before.box.y + rec.before.box.h} w={rec.before.box.w} h={grew} /> : null}
            <Tag x={rec.after.box.x + rec.after.box.w + 10} y={rec.before.box.y + rec.before.box.h + grew / 2} off={off}>{off ? `+${Math.round(grew)}px · ${rec.before.n} → ${rec.after.n} rows` : `0px · ${rec.after.n} rows ✓`}</Tag>
            {off && moved ? <Outline {...rec.before.link} off r={4} /> : null}
            {rec.hand ? <Contact {...rec.hand} /> : null}
          </>
        ) : null}
      </MarksLayer>
    </div>
  );
}
SkeletonLand.names = ['A generic skeleton', 'The rows’ own shape'];
SkeletonLand.lesson = {
  why: 'A skeleton promises the shape of what’s coming. A generic one, a thin bar a row, promises less than lands: the rows arrive taller and everything under them jumps, often just as you reach for it.',
  habit: 'Draw the skeleton from the loaded row itself: the same height, the same number of rows, the same mark and lines. Then landing changes what’s in the boxes, not where they are.',
};

// ── #66 Spinners: wait ~150–300ms, then hold ≥ ~500ms ──────────────────────
// A bank feed's Sync now. Each press is a real request to the showcase's /api (about 120ms), or held 1.4s, as plumber
// holds a reply to see a slow one: the viewer picks which, and the control says it's held. Broken: the spinner shows
// on the press and goes with the reply, so a fast reply blinks it. Fixed: spin-delay's habit, shown only after 200ms
// and then kept at least 500ms, so a fast reply shows none and a slow one a steady one.
// plumber's rule (craft-headless spinnerTiming, craft-spec 'spinner-timing') reads when the spinner showed after the
// press and how long a fast reply kept it. Time is the lesson, so the marks are the ruler: the reply on one lane, the
// spinner on the other, the rule's 200ms line on it.
const SPIN = { delay: 200, min: 500 }, SLOW = 1400, PRESS = 150;
function SpinnerTiming({ side = 'broken', onStatus }) {
  const root = useRef(null), sheet = useRef(null), button = useRef(null);
  const [reply, setReply] = useState('fast');
  const [run, setRun] = useState(null); // { t0, replied, on, off }
  const [spinning, setSpinning] = useState(false);
  const [synced, setSynced] = useState('2 min ago');
  const fixed = side === 'fixed';
  useTicking(!!run && (run.replied === null || (run.on !== null && run.off === null)));
  const now = () => performance.now();
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (ms, fn) => timers.current.push(setTimeout(fn, ms));
  const cur = useRef(null); // this press: its start, and when its spinner showed
  const show = (t0) => { if (cur.current?.t0 !== t0) return; cur.current.on = now() - t0; setSpinning(true); setRun((r) => (r && r.t0 === t0 ? { ...r, on: cur.current.on } : r)); };
  const hide = (t0) => { setSpinning(false); setRun((r) => (r && r.t0 === t0 && r.on !== null ? { ...r, off: now() - t0 } : r)); };
  const sync = async () => {
    if (run && run.replied === null) return;
    timers.current.forEach(clearTimeout); timers.current = [];
    const t0 = now();
    cur.current = { t0, on: null };
    setRun({ t0, replied: null, on: null, off: null, reply });
    if (!fixed) show(t0); else later(SPIN.delay, () => show(t0));
    await Promise.all([fetch('/api/sync').then((r) => r.json()), new Promise((r) => setTimeout(r, reply === 'slow' ? SLOW : 0))]);
    const replied = now() - t0;
    setRun((r) => (r && r.t0 === t0 ? { ...r, replied } : r));
    setSynced('just now');
    if (!fixed) hide(t0);
    else {
      timers.current.forEach(clearTimeout); timers.current = [];
      // shown already: keep it its 500ms; never shown: it never will be
      const on = cur.current?.t0 === t0 ? cur.current.on : null;
      if (on !== null) later(Math.max(0, on + SPIN.min - replied), () => hide(t0));
    }
  };
  const flashed = run && run.on !== null && run.off !== null && run.off - run.on < SPIN.delay;
  const early = run && run.on !== null && run.on < PRESS;
  // the rule's two findings: shown under 150ms after the press (on any reply), or blinked off a fast one
  const off = !!(flashed || early);
  useEffect(() => {
    if (!run) return onStatus?.(`Press Sync now. The reply comes ${reply === 'fast' ? 'as fast as it does (about 120ms)' : 'held 1.4s'}: try both.`);
    if (run.replied === null) return onStatus?.(run.on === null ? 'Waiting for the reply…' : 'Syncing…');
    const ms = Math.round(run.replied);
    onStatus?.(fixed
      ? (run.on === null ? `The reply came in ${ms}ms, before the spinner was due: none showed, nothing blinked.` : `It waited 200ms, then stayed ${Math.round((run.off ?? now() - run.t0) - run.on)}ms: steady, not a blink.`)
      : (flashed ? `The spinner showed on the press and was gone ${Math.round(run.off - run.on)}ms later: a blink, for a reply that took ${ms}ms.` : `On a slow reply it spun the whole ${ms}ms; on a fast one the same spinner only blinks.`));
  }, [run, reply, onStatus, fixed]);

  const card = sheet.current ? { w: sheet.current.offsetWidth, h: sheet.current.offsetHeight } : null;
  const span = 1600, t = run ? Math.min(span, run.off !== null && run.replied !== null ? Math.max(run.off, run.replied) : run.replied !== null && run.on === null ? run.replied : now() - run.t0) : 0;
  const lane = (top, label, a, b, kind) => {
    const x = (ms) => (Math.min(span, ms) / span) * (card?.w ?? 0);
    return (
      <div style={{ position: 'absolute', left: 0, top, width: card?.w ?? 0, height: 14 }}>
        <span style={{ position: 'absolute', right: '100%', marginRight: 8, top: 0, font: '500 10.5px/14px var(--pl-sans)', color: 'var(--pl-ink-2)', whiteSpace: 'nowrap' }}>{label}</span>
        <span style={{ position: 'absolute', left: 0, right: 0, top: 6, borderTop: '1px dashed var(--pl-ink-3)' }} />
        {a !== null ? <span style={{ position: 'absolute', left: x(a), top: 4, height: 5, width: Math.max(2, x(b ?? t) - x(a)), borderRadius: 3, background: kind === 'off' ? 'var(--pl-off)' : kind === 'on' ? 'var(--pl-on)' : 'var(--pl-sky)' }} /> : null}
      </div>
    );
  };
  return (
    <div ref={root} className="relative w-[26rem] max-w-full pb-28">
      <article ref={sheet} className="rounded-card bg-surface shadow-card">
        <div className="flex items-center gap-3 px-5 py-4">
          <span className="grid size-9 shrink-0 place-items-center rounded-control bg-accent-soft text-[12px] font-semibold text-accent-deep">NB</span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-medium">Northfield Bank</span>
            <span className="block text-[12px] text-ink-subtle">Business current •••• 4821 · Synced {synced}</span>
          </span>
          <button ref={button} type="button" onClick={sync}
            className="inline-flex h-8 w-[7.5rem] items-center justify-center gap-1.5 rounded-control text-[13px] font-medium text-ink-muted ring-1 ring-line ring-inset hover:bg-sunken hover:text-ink">
            {spinning ? <span role="status" aria-label="Syncing" className="size-3.5 animate-spin rounded-full border-[1.5px] border-ink/20 border-t-ink-muted" /> : <RetryIcon size={14} texture="solid" />}
            {spinning ? 'Syncing' : 'Sync now'}
          </button>
        </div>
      </article>
      <div className="mt-3 flex items-center gap-2 text-[12px] text-ink-subtle">
        Reply
        <span role="group" aria-label="Reply" className="flex rounded-control bg-sunken p-0.5 ring-1 ring-line">
          {[['fast', 'as it comes'], ['slow', 'held 1.4s']].map(([k, label]) => (
            <button key={k} type="button" aria-pressed={reply === k} onClick={() => setReply(k)}
              className={'rounded-[5px] px-2 py-0.5 ' + (reply === k ? 'bg-surface text-ink shadow-raised' : 'hover:text-ink')}>{label}</button>
          ))}
        </span>
      </div>
      <MarksLayer>
        {card ? (
          <div style={{ position: 'absolute', left: 0, top: card.h + 62, width: card.w }}>
            <div style={{ position: 'relative', marginLeft: 0 }}>
              {lane(0, 'reply', run ? 0 : null, run?.replied ?? null, '')}
              {lane(18, 'spinner', run?.on ?? null, run?.off ?? null, run?.on !== null && run ? (off ? 'off' : run.off !== null || run.replied !== null ? 'on' : '') : '')}
              {/* the rule's line: a spinner is due no sooner than 200ms after the press */}
              <span style={{ position: 'absolute', left: (SPIN.delay / span) * card.w, top: -4, height: 40, borderLeft: '1px dashed var(--pl-sky)', opacity: 0.7 }} />
              <span style={{ position: 'absolute', left: (SPIN.delay / span) * card.w + 4, top: -6, font: '500 10px/12px var(--pl-mono)', color: 'var(--pl-sky)' }}>200</span>
              <div style={{ position: 'absolute', left: 0, top: 30 }}>
                <Ruler top={0} width={card.w} span={span} played={t} kind={!run || run.replied === null ? '' : off ? 'off' : 'on'}
                  events={run ? [[0, ''], ...(run.replied !== null ? [[run.replied, '']] : [])] : []} label={run?.reply === 'slow' ? 'reply held' : 'live'} />
              </div>
            </div>
          </div>
        ) : null}
        {run && run.replied !== null && button.current && root.current ? (() => {
          const b = local(root.current)(button.current), ms = (v) => Math.round(v);
          const text = flashed ? `flashed ${ms(run.off - run.on)}ms` : early ? `${ms(run.on)}ms after the press` : run.on === null ? `no spinner · ${ms(run.replied)}ms ✓` : fixed ? `after 200 · held ${ms((run.off ?? now() - run.t0) - run.on)}ms ✓` : `${ms(run.on)}ms after the press`;
          // above the button, clear of the account's words
          return <Tag end x={b.x + b.w} y={b.y - 26} off={off}>{text}</Tag>;
        })() : null}
      </MarksLayer>
    </div>
  );
}
SpinnerTiming.names = ['Spinner at once', 'After 200ms, for 500ms'];
SpinnerTiming.lesson = {
  why: 'A spinner shown on the press and hidden on the reply blinks whenever the reply is quick: a flash of “something’s wrong” for a wait nobody would have noticed. Most replies are quick, so most presses blink.',
  habit: 'Wait about 200ms before showing a spinner, and once it shows, keep it at least 500ms (spin-delay’s delay and minDuration). A fast reply shows none; a slow one shows a steady one.',
};

export const HANDS_ON = { 42: BoldHover, 61: MenuPress, 77: SkeletonLand, 66: SpinnerTiming };
