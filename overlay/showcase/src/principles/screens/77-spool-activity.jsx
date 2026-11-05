// #77 a skeleton is the shape of what lands. Spool, a design team's hub: activity gathered from their tools. While it
// loads, the list shows a generic skeleton, a thin bar a row, three of them; four real rows land, each with a face, two
// lines and sometimes a thumbnail. Every row of the skeleton promises less than its row, so the card grows 128px the
// moment the reply lands and View all activity drops out from under the pointer reaching for it. Fixed: the skeleton is
// drawn from the loaded row itself, the same height, the same number of rows, the same face and lines.
// The reply is a real request to the showcase's /api, held 0.9s as plumber holds it to read the skeleton.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { RetryIcon } from '@unlocalhosted/dither-icons';
import figmaLogo from '../../media/logos/figma.svg';
import githubLogo from '../../media/logos/github.svg';
import linearLogo from '../../media/logos/linear.svg';
import notionLogo from '../../media/logos/notion.svg';
import design from '../../media/s77-design.jpg';
import ines from '../../media/people/person-01.jpg';
import arlo from '../../media/people/person-06.jpg';
import tomi from '../../media/people/person-09.jpg';
import walt from '../../media/people/person-04.jpg';

export const n = 77;
export const handsOn = true;

// plumber's marks live in a shadow root with plumber's tokens, so reading [data-example] never reads them
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
const Hatch = ({ x, y, w, h }) => (
  <span style={{ position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: 2, opacity: 0.55, backgroundImage: 'repeating-linear-gradient(45deg, var(--pl-off) 0 1px, transparent 1px 4px)' }} />
);
const Outline = ({ x, y, w, h, off, r = 4 }) => (
  <span style={{ position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: r, boxShadow: `inset 0 0 0 1px ${hue(off)}`, opacity: 0.7 }} />
);
const Tag = ({ x, y, off, children }) => (
  <span style={{ position: 'absolute', left: x, top: y, transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', height: 20, padding: '0 var(--pl-space-3)',
    borderRadius: 'var(--pl-radius-tag)', font: '500 11px/1 var(--pl-mono)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
    color: 'var(--pl-on-accent)', background: hue(off), boxShadow: '0 0 0 1px var(--pl-halo)' }}>{children}</span>
);
const Contact = ({ x, y }) => <span style={{ position: 'absolute', left: x - 5, top: y - 5, width: 10, height: 10, borderRadius: '50%', boxShadow: '0 0 0 1.5px var(--pl-sky), 0 0 0 3px var(--pl-halo)' }} />;
const Ghost = ({ x, y, w, h, r = 4, off = true }) => <span style={{ position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: r, border: `1px dashed ${hue(off)}`, opacity: 0.6 }} />;
function local(root) {
  const o = root.getBoundingClientRect(), k = o.width / root.offsetWidth || 1;
  return (el) => { const r = el.getBoundingClientRect(); return { x: (r.left - o.left) / k, y: (r.top - o.top) / k, w: r.width / k, h: r.height / k }; };
}

// each person's face carries the mark of the tool the activity came from
const TOOLS = { figma: ['#f24e1e', figmaLogo, 'Figma'], github: ['#181717', githubLogo, 'GitHub'], linear: ['#5e6ad2', linearLogo, 'Linear'], notion: ['#191919', notionLogo, 'Notion'] };
const ROWS = [
  { id: 1, who: 'Ines Duarte', face: ines, tool: 'figma', verb: 'commented on', what: 'Checkout, v3', when: '2 min ago', thumb: true, unread: true },
  { id: 2, who: 'Arlo Kim', face: arlo, tool: 'github', verb: 'merged', what: 'Date picker keyboard support', when: '18 min ago', pr: '#611' },
  { id: 3, who: 'Tomi Adeyemi', face: tomi, tool: 'linear', verb: 'moved', what: 'Empty states audit', after: ' to Review', when: '1 h ago' },
  { id: 4, who: 'Walt Greer', face: walt, tool: 'notion', verb: 'edited', what: 'Spring launch brief', when: '3 h ago' },
];
const HOLD = 900;
function Face({ src, tool }) {
  const [color, logo] = TOOLS[tool];
  return (
    <span className="relative size-8 shrink-0">
      <img src={src} alt="" className="size-full rounded-full object-cover outline-1 -outline-offset-1 outline-black/10" />
      <span className="absolute -right-1 -bottom-1 grid size-[17px] place-items-center rounded-[5px] ring-2 ring-surface" style={{ background: color }}>
        <img src={logo} alt="" className="size-[8.5px] invert" />
      </span>
    </span>
  );
}

export default function SkeletonLand({ side = 'broken', onStatus }) {
  const root = useRef(null), list = useRef(null), more = useRef(null), hand = useRef(null);
  const [items, setItems] = useState(null);
  const [loading, setLoading] = useState(false);
  const [rec, setRec] = useState(null); // { before: { box, n, link }, after: { box, n, link }, hand }
  const pending = useRef(null);
  const [held, setHeld] = useState(null); // the skeleton's box, as read while the reply is held
  const [who, setWho] = useState('Everyone');
  const fixed = side === 'fixed';
  const at = () => local(root.current);
  const inside = (p, r) => p && r && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  // the body is read, not just the headers: plumber holds the reply's body to read the skeleton while it shows
  useEffect(() => { fetch('/api/activity').then((r) => r.json()).then(() => setItems(ROWS)); }, []);
  // the skeleton is read while it shows, as plumber reads it while the reply is held
  useLayoutEffect(() => {
    if (!loading) return;
    pending.current = { before: { box: at()(list.current), n: list.current.children.length, link: at()(more.current) } };
    setHeld(pending.current.before.box);
    let gone = false;
    Promise.all([fetch('/api/activity').then((r) => r.json()), new Promise((r) => setTimeout(r, HOLD))]).then(() => {
      if (gone) return;
      // the pointer, the moment before the rows land: was it on the link?
      pending.current.hand = inside(hand.current, at()(more.current)) ? hand.current : null;
      setItems(ROWS); setLoading(false);
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
  const refresh = () => { if (!loading) { setRec(null); setLoading(true); } };

  const grew = rec ? rec.after.box.h - rec.before.box.h : 0, off = Math.abs(grew) > 4; // the rule's line (craft-spec: 4px)
  const moved = rec ? rec.after.link.y - rec.before.link.y : 0;
  useEffect(() => {
    onStatus?.(loading ? 'Loading. Now reach for View all activity, under the feed.'
      : !rec ? 'Press Refresh, then reach for View all activity while it loads.'
      : off ? `It landed ${Math.round(grew)}px taller than its skeleton, so View all activity dropped ${Math.round(moved)}px${rec.hand ? ', out from under your pointer' : ''}.`
      : `It landed in the skeleton’s own shape: the same ${rec.after.n} rows, the same height. Nothing under it moved${rec.hand ? ', and your pointer is still on the link' : ''}.`);
  }, [loading, rec, onStatus]);

  const row = 'flex items-center gap-3 px-5';
  const edge = rec ? rec.before.box.x + rec.before.box.w : 0;
  return (
    <div ref={root} onPointerMove={track} className="relative w-[40rem] max-w-full">
      <article className="w-[27.5rem] max-w-full rounded-card bg-surface shadow-card">
        <header className="flex items-center gap-2.5 px-5 pt-4 pb-2.5">
          <span className="text-[17px] leading-6 font-medium tracking-[-0.01em]">Activity</span>
          <span role="group" aria-label="Show" className="flex rounded-control bg-sunken p-0.5 text-xs text-ink-muted">
            {['Everyone', 'Mentions'].map((k) => (
              <button key={k} type="button" aria-pressed={who === k} onClick={() => setWho(k)} className={'h-6 rounded-[5px] px-2 ' + (who === k ? 'bg-surface font-medium text-ink shadow-raised' : 'hover:text-ink')}>{k}</button>
            ))}
          </span>
          <button type="button" onClick={refresh}
            className="ml-auto inline-flex h-7 items-center gap-1.5 rounded-control pr-2.5 pl-2 text-[13px] font-medium text-ink-muted ring-1 ring-line ring-inset hover:bg-sunken hover:text-ink active:bg-line">
            <RetryIcon size={14} texture="solid" />Refresh
          </button>
        </header>
        <ul ref={list} aria-busy={loading || !items} className="py-1">
          {loading || !items
            ? (fixed ? ROWS : ROWS.slice(0, 3)).map((r) => fixed ? (
              // the rows' own shape: the face, the line, the time under it
              <li key={r.id} className={row + ' h-14'}><span className="size-8 shrink-0 animate-pulse rounded-full bg-sunken" /><span className="flex flex-1 flex-col gap-1.5"><span className="h-3 w-3/4 animate-pulse rounded-chip bg-sunken" /><span className="h-2.5 w-24 animate-pulse rounded-chip bg-sunken" /></span></li>
            ) : (
              // a generic skeleton: one thin bar a row
              <li key={r.id} className={row + ' h-8'}><span className="h-3 w-full animate-pulse rounded-chip bg-sunken" /></li>
            ))
            : items.map((a) => (
              <li key={a.id} className={row + ' h-14'}>
                <Face src={a.face} tool={a.tool} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[13.5px] text-ink-muted"><span className="font-medium text-ink">{a.who}</span> {a.verb} <span className="font-medium text-ink">{a.what}</span>{a.after ?? ''}</span>
                  <span className="text-xs text-ink-subtle">{TOOLS[a.tool][2]} · {a.when}</span>
                </span>
                {a.thumb ? <img src={design} alt="" className="h-8 w-12 shrink-0 rounded-chip object-cover outline-1 -outline-offset-1 outline-black/10" /> : null}
                {a.pr ? <span className="inline-flex h-[22px] shrink-0 items-center rounded-chip bg-positive-soft px-1.5 text-xs font-medium text-positive tabular-nums">{a.pr}</span> : null}
                {a.unread ? <span className="size-1.5 shrink-0 rounded-full bg-accent" aria-label="New" /> : null}
              </li>
            ))}
        </ul>
        <footer className="flex items-center border-t-hairline px-5 pt-3 pb-3.5">
          <a ref={more} href="#activity" onClick={(e) => e.preventDefault()} className="inline-flex min-h-6 items-center text-[13px] font-medium text-accent hover:underline">View all activity</a>
          <span className="ml-auto text-xs text-ink-subtle tabular-nums">36 this week</span>
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
            <Ghost {...rec.before.box} off={off} />
            {/* the growth as a bracket beside the card, so no hatch crosses the rows' words */}
            {off ? <Hatch x={edge + 8} y={rec.before.box.y + rec.before.box.h} w={12} h={grew} /> : null}
            <Tag x={edge + 32} y={rec.before.box.y + rec.before.box.h + grew / 2} off={off}>{off ? `+${Math.round(grew)}px · ${rec.before.n} → ${rec.after.n} rows` : `0px · ${rec.after.n} rows ✓`}</Tag>
            {off && moved ? <Outline {...rec.before.link} off /> : null}
            {rec.hand ? <Contact {...rec.hand} /> : null}
          </>
        ) : null}
      </MarksLayer>
    </div>
  );
}
SkeletonLand.names = ['A generic skeleton', 'The rows’ own shape'];
SkeletonLand.lesson = {
  why: 'A skeleton promises the shape of what’s coming. A generic one, a thin bar a row, promises less than lands: every row arrives taller, the list grows by all of them, and everything under it jumps, often just as you reach for it.',
  habit: 'Draw the skeleton from the loaded row itself: the same height, the same number of rows, the same face and lines.',
};
