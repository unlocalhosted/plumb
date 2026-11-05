// #63 never scale from 0. Commonplace, a team's docs: the page for the design team's offsite. Every popover on the page
// (the Insert menu from the + by the empty line, the status picker, who's still to answer) opens with the same
// entrance, written the modern way: a transition from its starting style.
//   broken  starting:scale-0: each grows out of a single point, a speck, then a smear of tiny words
//   fixed   starting:scale-95: each fades in at nearly its size, from the control it belongs to
// The viewer's hand is the probe: open any of them. The marks are the menu's own first frames, sampled as it entered
// (dashed boxes at its first painted frame, a quarter and half way in), and how big its first frame was.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChartIcon, CheckIcon, CodeIcon, LayersIcon, MessageIcon, PlusIcon } from '@unlocalhosted/dither-icons';
import cottage from '../../media/s63-cottage.jpg';
import priya from '../../media/people/person-07.jpg';
import ines from '../../media/people/person-01.jpg';
import theo from '../../media/people/person-02.jpg';
import ama from '../../media/people/person-03.jpg';
import amara from '../../media/people/person-05.jpg';
import felix from '../../media/people/person-06.jpg';
import owen from '../../media/people/person-08.jpg';
import ruth from '../../media/people/person-10.jpg';

export const n = 63;
export const handsOn = true;

// plumber's marks layer (as the stage's PlumbLayer), and the marks this demo uses
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
  <span style={{ position: 'absolute', left: x, top: y, transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', height: 20, padding: '0 var(--pl-space-3)',
    borderRadius: 'var(--pl-radius-tag)', font: '500 11px/1 var(--pl-mono)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
    color: 'var(--pl-on-accent)', background: hue(off), boxShadow: '0 0 0 1px var(--pl-halo)' }}>{children}</span>
);
const Ghost = ({ x, y, w, h, off }) => <span style={{ position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: 10, border: `1px dashed ${hue(off)}`, opacity: 0.6 }} />;
function local(root) {
  const o = root.getBoundingClientRect(), k = o.width / root.offsetWidth || 1;
  return (el) => { const r = el.getBoundingClientRect(); return { x: (r.left - o.left) / k, y: (r.top - o.top) / k, w: r.width / k, h: r.height / k }; };
}

const INSERTS = [
  ['Heading', 'A section title', 'H1', '#'], ['Table', 'Rows and columns', LayersIcon], ['Chart', 'From a table on this page', ChartIcon],
  ['Code block', 'With syntax colours', CodeIcon], ['Callout', 'A note that stands out', MessageIcon],
];
const STATUSES = [['Booked', 'bg-positive'], ['Holding', 'bg-caution'], ['Cancelled', 'bg-negative']];
const GOING = [ines, theo, ama, amara, felix, owen, ruth];
const ROOMS = [
  ['The hayloft', [priya, ama], 'Priya, Ama', 2], ['Garden room', [theo, owen], 'Theo, Owen', 2],
  ['The bunk room', [ines, amara, ruth], 'Ines, Amara, Ruth', 4], ['Shepherd’s hut', [felix], 'Felix', 1],
];
const POP = 'absolute z-20 flex flex-col rounded-card bg-surface p-1 shadow-popover ring-1 ring-ink/[0.07] origin-top-left transition-[scale,opacity] ease-(--ease-arrive)';

export default function CommonplacePage({ side = 'broken', onStatus }) {
  const root = useRef(null), menu = useRef(null);
  const [open, setOpen] = useState(null), [slow, setSlow] = useState(true);
  const [status, setStatus] = useState('Booked');
  const [skins, setSkins] = useState([]); // { p, box } at fixed fractions of the entrance
  const k = slow ? 4 : 1, dur = 200 * k, broken = side === 'broken';
  // every popover's entrance, one habit: from 0 as built, from 95% as plumber fixes it
  const enter = broken ? 'starting:scale-0 starting:opacity-0' : 'starting:scale-95 starting:opacity-0';
  useEffect(() => { setOpen(null); setSkins([]); }, [side, slow]);
  const toggle = (id) => (e) => { e.stopPropagation(); setSkins([]); setOpen((o) => (o === id ? null : id)); };
  useEffect(() => {
    if (!open) return;
    const away = (e) => { if (!menu.current?.contains(e.target) && !e.target.closest?.('[aria-expanded]')) setOpen(null); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(null); };
    // Escape is heard in the capture phase: the plumber overlay on this page stops it on its way down
    addEventListener('pointerdown', away); addEventListener('keydown', esc, true);
    return () => { removeEventListener('pointerdown', away); removeEventListener('keydown', esc, true); };
  }, [open]);
  // sample the real menu every frame of its entrance, keep the frames nearest each fraction
  useLayoutEffect(() => {
    if (!open) return;
    let id; const t0 = performance.now(), at = local(root.current), seen = [];
    const tick = (now) => {
      if (menu.current) seen.push({ p: (now - t0) / dur, box: at(menu.current) });
      if (now - t0 < dur + 50) id = requestAnimationFrame(tick);
      else { const near = (f) => seen.reduce((a, b) => (Math.abs(b.p - f) < Math.abs(a.p - f) ? b : a), seen[0]); setSkins([seen.find((q) => q.box.w > 1), near(0.25), near(0.5)].filter(Boolean)); }
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [open, dur]);
  const full = menu.current && root.current && open && skins.length ? local(root.current)(menu.current) : null;
  const first = skins[0], share = first && full ? Math.round((first.box.w / full.w) * 100) : null;
  const name = { insert: 'Insert menu', status: 'status picker', going: 'list of who’s going' }[open];
  useEffect(() => {
    onStatus?.(!skins.length ? 'Click + by the empty line, the Booked status, or who’s going, and watch each one’s first frames.'
      : broken ? `The ${name}’s first frame was ${share}% of its size: a speck by its button, growing out of nowhere, not a popover opening.`
      : `The ${name}’s first frame was already ${share}% of its size: it opens from its button, it doesn’t inflate.`);
  }, [skins.length, share, broken, name, onStatus]);
  const style = { transitionDuration: `${dur}ms` };
  const item = 'flex items-center rounded-control px-2 text-left hover:bg-sunken active:bg-line';
  return (
    <div ref={root} className="relative w-[37.5rem] max-w-full pb-10">
      <article className="relative rounded-sheet bg-surface shadow-window">
        <img src={cottage} alt="" className="block h-32 w-full rounded-t-sheet object-cover object-[50%_60%]" />
        <div className="px-12 pt-[22px] pb-7">
          <span className="text-xs text-ink-subtle">Design team / Team life</span>
          <h1 className="mt-1 text-[26px] leading-8 font-semibold tracking-tight">Offsite, the cottage</h1>
          <dl className="mt-3.5 grid grid-cols-[5rem_1fr] gap-y-2.5 text-[13px]">
            <dt className="flex h-6 items-center text-ink-subtle">When</dt><dd className="flex h-6 items-center tabular-nums">Thu 12 – Fri 13 March</dd>
            <dt className="flex h-6 items-center text-ink-subtle">Host</dt>
            <dd className="flex h-6 items-center gap-2"><img src={priya} alt="" className="size-5 rounded-full object-cover outline-1 -outline-offset-1 outline-black/10" />Priya Raman</dd>
            <dt className="flex h-6 items-center text-ink-subtle">Status</dt>
            <dd className="relative flex h-6 items-center gap-2">
              <button type="button" aria-haspopup="menu" aria-expanded={open === 'status'} onClick={toggle('status')}
                className={'inline-flex h-6 items-center gap-1.5 rounded-chip px-[7px] text-xs font-medium hover:brightness-95 active:brightness-90 ' + (status === 'Booked' ? 'bg-positive-soft text-positive' : status === 'Holding' ? 'bg-caution-soft text-caution' : 'bg-negative-soft text-negative')}>
                <span className="size-1.5 rounded-full bg-current" />{status}
              </button>
              <span className="text-ink-muted">Cottage, minibus, dinner</span>
              {open === 'status' ? (
                <div ref={menu} role="menu" aria-label="Status" className={`${POP} ${enter} top-7 left-0 w-44`} style={style}>
                  {STATUSES.map(([s, dot]) => (
                    <button key={s} type="button" role="menuitemradio" aria-checked={status === s} onClick={() => { setStatus(s); setOpen(null); }} className={item + ' h-8 gap-2 text-[13px]'}>
                      <span className={'size-1.5 rounded-full ' + dot} />{s}{status === s ? <CheckIcon size={14} texture="solid" className="ml-auto text-accent" /> : null}
                    </button>
                  ))}
                </div>
              ) : null}
            </dd>
            <dt className="flex h-6 items-center text-ink-subtle">Going</dt>
            <dd className="relative flex h-6 items-center gap-2">
              <button type="button" aria-haspopup="dialog" aria-expanded={open === 'going'} onClick={toggle('going')} className="-mx-1 flex h-7 items-center gap-2 rounded-control px-1 hover:bg-sunken active:bg-line">
                <span className="flex">{GOING.map((f, i) => <img key={i} src={f} alt="" className={'size-[22px] rounded-full object-cover ring-2 ring-surface ' + (i ? '-ml-1.5' : '')} />)}</span>
                <span className="text-ink-muted tabular-nums">9 of 11 · Sam and Leo to answer</span>
              </button>
              {open === 'going' ? (
                <div ref={menu} role="dialog" aria-label="Who’s going" className={`${POP} ${enter} top-8 left-0 w-64 p-1`} style={style}>
                  <span className="px-2 pt-1.5 pb-1 text-[11px] font-medium text-ink-subtle">Still to answer</span>
                  {[['SO', 'Sam Okoro', 'Asked on Monday'], ['LH', 'Leo Hart', 'Asked on Monday']].map(([ini, who, when]) => (
                    <span key={who} className="flex h-11 items-center gap-2.5 px-2 text-[13px]">
                      <span className="grid size-7 place-items-center rounded-full bg-sunken text-[11px] font-medium text-ink-muted">{ini}</span>
                      <span className="flex flex-col"><span className="font-medium">{who}</span><span className="text-xs text-ink-subtle">{when}</span></span>
                    </span>
                  ))}
                  <button type="button" onClick={() => setOpen(null)} className="m-1 h-8 rounded-control bg-accent text-[13px] font-medium text-accent-ink hover:bg-accent-deep active:bg-accent-deep">Remind them both</button>
                </div>
              ) : null}
            </dd>
          </dl>
          <p className="mt-4 max-w-[30rem] text-sm leading-[22px] text-pretty">Two days in the hills, no laptops after six. Bring boots for the ridge walk on Friday; the minibus leaves the studio at eight.</p>
          <span className="mt-2.5 flex flex-col gap-1 text-sm">
            <span className="flex h-[26px] items-center gap-2.5"><span className="grid size-4 place-items-center rounded-[4px] bg-accent text-accent-ink"><CheckIcon size={12} texture="solid" /></span><span className="text-ink-subtle line-through decoration-ink/30">Book the cottage and the minibus</span></span>
            <span className="flex h-[26px] items-center gap-2.5"><span className="size-4 rounded-[4px] ring-[1.5px] ring-ink/30 ring-inset" />Agenda for the Thursday workshop</span>
          </span>
          {/* the empty line, and the + that opens the Insert menu */}
          <span className="relative -ml-8 mt-2 flex h-7 items-center gap-2">
            <button type="button" aria-label="Insert a block" aria-haspopup="menu" aria-expanded={open === 'insert'} onClick={toggle('insert')}
              className="grid size-6 place-items-center rounded-chip bg-sunken text-ink ring-1 ring-line ring-inset hover:bg-line active:bg-line"><PlusIcon size={14} texture="solid" /></button>
            <span className="ml-2 flex items-center gap-0.5 text-sm text-ink-subtle"><span aria-hidden="true" className="h-[18px] w-0.5 rounded-full bg-ink" />Type / for blocks</span>
            {open === 'insert' ? (
              <div ref={menu} role="menu" aria-label="Insert a block" className={`${POP} ${enter} top-8 left-0 w-[17rem]`} style={style}>
                <span className="px-2 pt-2 pb-1 text-[11px] font-medium text-ink-subtle">Basic blocks</span>
                {INSERTS.map(([label, desc, Icon, key]) => (
                  <button key={label} type="button" role="menuitem" onClick={() => setOpen(null)} className={item + ' h-11 gap-2.5'}>
                    <span className="grid size-[30px] shrink-0 place-items-center rounded-control bg-surface text-xs font-semibold text-ink-muted ring-1 ring-line ring-inset">{typeof Icon === 'string' ? Icon : <Icon size={14} texture="dither" />}</span>
                    <span className="flex flex-col"><span className="text-[13px] leading-[17px] font-medium">{label}</span><span className="text-xs text-ink-subtle">{desc}</span></span>
                    {key ? <kbd className="ml-auto font-sans text-xs text-ink-subtle">{key}</kbd> : null}
                  </button>
                ))}
              </div>
            ) : null}
          </span>

          <h2 className="mt-4 text-[15px] font-semibold tracking-[-0.01em]">Rooms</h2>
          <table className="mt-2 w-full text-[13px]">
            <thead><tr className="border-b-hairline border-line text-left text-xs text-ink-subtle"><th className="h-[30px] font-medium">Room</th><th className="font-medium">Who</th><th className="text-right font-medium">Sleeps</th></tr></thead>
            <tbody>
              {ROOMS.map(([room, faces, who, sleeps], i) => (
                <tr key={room} className={i < ROOMS.length - 1 ? 'border-b-hairline border-line' : ''}>
                  <td className="h-10">{room}</td>
                  <td><span className="flex items-center gap-2 text-ink-muted"><span className="flex">{faces.map((f, j) => <img key={j} src={f} alt="" className={'size-[22px] rounded-full object-cover ring-2 ring-surface ' + (j ? '-ml-3.5' : '')} />)}</span>{who}</span></td>
                  <td className="text-right text-ink-muted tabular-nums">{sleeps}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
      <div className="absolute right-0 bottom-0 flex items-center gap-2 text-xs text-ink-muted">
        Speed
        <span role="group" aria-label="Speed" className="flex gap-0.5 rounded-control bg-sunken p-0.5 ring-1 ring-line">
          {[[true, '¼×'], [false, '1×']].map(([v, l]) => <button key={l} type="button" aria-pressed={slow === v} onClick={() => setSlow(v)} className={'h-6 rounded-[5px] px-2 active:bg-line ' + (slow === v ? 'bg-surface text-ink shadow-raised' : 'hover:text-ink')}>{l}</button>)}
        </span>
      </div>
      <MarksLayer>
        {skins.map((sk, i) => <Ghost key={i} {...sk.box} off={broken} />)}
        {skins.map((sk, i) => <span key={'l' + i} style={{ position: 'absolute', left: sk.box.x + sk.box.w + 4, top: sk.box.y + sk.box.h - 6, font: '500 10px var(--pl-mono)', color: 'var(--pl-ink-2)' }}>{['1st', '¼', '½'][i]}</span>)}
        {full && first ? <Tag x={full.x + full.w + 14} y={full.y + 14} off={broken}>{broken ? `1st frame ${share}% · from 0` : `1st frame ${share}% ✓`}</Tag> : null}
      </MarksLayer>
    </div>
  );
}
CommonplacePage.names = ['From 0', 'From 95%'];
CommonplacePage.lesson = {
  why: 'Something that grows from scale 0 starts as a point: for its first frames it’s a speck, then a smear of tiny words. Nothing real grows out of nothing, so it reads as appearing from nowhere instead of opening from the button that asked for it. Every popover on this page enters that way: the Insert menu, the status picker, who’s still to answer.',
  habit: 'Start entrances at 0.9–0.97 with opacity 0, with transform-origin at the trigger. It opens; it doesn’t inflate.',
};
