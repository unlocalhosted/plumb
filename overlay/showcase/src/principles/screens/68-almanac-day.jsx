// #68 exits faster than entrances. Almanac, Ruth Calder's calendar: Thursday's morning, every event opening its own
// preview. One preview component, so every event's preview opens and closes on one transition, 300ms both ways (the
// same duration-300 for both states). Coming in, 300ms reads as the preview arriving; going out, you've already moved
// on to the next event, and the same 300ms keeps the old preview over it. Fixed: plumber's fix,
// data-[state=closed]:duration-200, so every preview leaves on its own, shorter time.
// The marks are the two durations as the browser ran them (transitionrun → transitionend on the preview): two bars to
// one scale, the exit's coral when it's no quicker than the entrance. Slowed to ¼ so the difference can be felt.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import meetLogo from '../../media/logos/googlemeet.svg';
import ruth from '../../media/people/person-07.jpg';
import sam from '../../media/people/person-02.jpg';
import maya from '../../media/people/person-05.jpg';
import dana from '../../media/people/person-10.jpg';
import tomi from '../../media/people/person-09.jpg';
import ines from '../../media/people/person-01.jpg';
import arlo from '../../media/people/person-06.jpg';
import remy from '../../media/people/person-08.jpg';

export const n = 68;
export const handsOn = true;

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
const Tag = ({ x, y, off, children }) => (
  <span style={{ position: 'absolute', left: x, top: y, transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', height: 20, padding: '0 var(--pl-space-3)',
    borderRadius: 'var(--pl-radius-tag)', font: '500 11px/1 var(--pl-mono)', whiteSpace: 'nowrap',
    color: 'var(--pl-on-accent)', background: off ? 'var(--pl-off)' : 'var(--pl-on)', boxShadow: '0 0 0 1px var(--pl-halo)' }}>{children}</span>
);

// a colour per calendar: Design (the brand), Hiring, Personal
const CAL = {
  design: { bar: 'shadow-[inset_3px_0_0_#5550d8]', soft: 'bg-accent-soft hover:bg-[#e4e3fb]', ink: 'text-accent-deep', dot: 'bg-accent', ring: '#efeefd' },
  hire: { bar: 'shadow-[inset_3px_0_0_#0f8a8a]', soft: 'bg-[#e2f4f3] hover:bg-[#d3eeec]', ink: 'text-[#0b5e5e]', dot: 'bg-[#0f8a8a]', ring: '#e2f4f3' },
  life: { bar: 'shadow-[inset_3px_0_0_#c2571a]', soft: 'bg-[#fbece2] hover:bg-[#f8e0d0]', ink: 'text-[#8a3a0c]', dot: 'bg-[#c2571a]', ring: '#fbece2' },
};
const WEEK = [['Mon', 3, ['design', 'hire']], ['Tue', 4, ['design']], ['Wed', 5, ['hire', 'life']], ['Thu', 6, ['design', 'hire', 'life']], ['Fri', 7, ['design']], ['Sat', 8, ['life']], ['Sun', 9, []]];
const HOUR = 52, TOP = 6, START = 8 * 60;
const at = (h, m = 0) => TOP + ((h * 60 + m - START) / 60) * HOUR;
const EVENTS = [
  { id: 'school', title: 'School run', cal: 'life', when: '8:15 – 8:40', top: at(8, 15), h: 24, place: 'Elm Street Primary', note: 'Dana’s turn on Friday.' },
  { id: 'crit', title: 'Design crit', cal: 'design', when: '9:00 – 9:30', top: at(9), h: 26, place: 'Studio 2', meet: 'meet.google.com/qrv-tkzp-hfd', guests: [ruth, sam, maya, dana], who: 'Ruth, Sam and 3 more', rsvp: '3 going · 1 maybe', note: 'Bring the onboarding flows. We’ll go through the empty states first.' },
  { id: 'one', title: '1:1 with Tomi', cal: 'design', when: '10:00 – 10:45', top: at(10), h: 39, faces: [tomi], meet: 'meet.google.com/hzu-pwqe-tro', guests: [tomi, ruth], who: 'Tomi and you', rsvp: '2 going', note: 'Tomi’s first month: what’s working, what isn’t.' },
  { id: 'review', title: 'Portfolio review, Senior designer', cal: 'hire', when: '11:00 – 12:15', top: at(11), h: 65, faces: [ines, arlo, ruth], more: 2, sub: 'Ines, Arlo', place: 'Room 4', guests: [ines, arlo, ruth, sam], who: 'Ines, Arlo and 3 more', rsvp: '5 going', note: 'The candidate presents two projects; questions after each.' },
  { id: 'lunch', title: 'Lunch with Remy', cal: 'life', when: '12:30 – 13:00', top: at(12, 30), h: 24, place: 'Café Mona', guests: [remy], who: 'Remy and you', rsvp: '2 going', note: 'Table booked by the window.' },
  { id: 'ship', title: 'Onboarding flows, ship review', cal: 'design', when: '13:00 – 14:00', top: at(13), h: 50, sub: 'Room 4', place: 'Room 4', meet: 'meet.google.com/kfa-yxne-wqi', guests: [ruth, sam, maya], who: 'Ruth, Sam and Maya', rsvp: '3 going', note: 'Last look before it ships on Monday.' },
];
const Face = ({ src, ring, size = 'size-[22px]' }) => <img src={src} alt="" className={'shrink-0 rounded-full object-cover outline-1 -outline-offset-1 outline-black/10 ' + size} style={{ boxShadow: `0 0 0 2px ${ring}` }} />;

export default function ExitFaster({ side = 'broken', onStatus }) {
  const grid = useRef(null);
  const [open, setOpen] = useState('crit'), [slow, setSlow] = useState(true);
  const [ran, setRan] = useState({ in: null, out: null }); // measured ms, at 1×
  const started = useRef(new Map());
  const fixed = side === 'fixed', k = slow ? 4 : 1;
  useEffect(() => { setRan({ in: null, out: null }); }, [side, slow]);
  // timed from the browser's own transition events on each preview (what ran, not what we asked)
  useEffect(() => {
    const el = grid.current;
    const run = (e) => { if (e.target.dataset?.popover !== undefined && e.propertyName === 'opacity') started.current.set(e.target, { t: performance.now(), open: e.target.dataset.state === 'open' }); };
    const end = (e) => {
      const s = started.current.get(e.target);
      if (!s || e.propertyName !== 'opacity') return;
      started.current.delete(e.target);
      setRan((r) => ({ ...r, [s.open ? 'in' : 'out']: (performance.now() - s.t) / k }));
    };
    el.addEventListener('transitionrun', run); el.addEventListener('transitionend', end);
    return () => { el.removeEventListener('transitionrun', run); el.removeEventListener('transitionend', end); };
  }, [k]);
  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') setOpen(null); };
    addEventListener('keydown', esc);
    return () => removeEventListener('keydown', esc);
  }, []);
  useEffect(() => {
    onStatus?.(ran.out === null ? 'Close the preview, or open another event: watch the old preview leave.'
      : ran.in === null ? `It went over ${Math.round(ran.out)}ms. Now open an event, and compare.`
      : !fixed ? `${Math.round(ran.in)}ms in, ${Math.round(ran.out)}ms out: you’d already moved on, and it lingered just as long.`
      : `${Math.round(ran.in)}ms in, ${Math.round(ran.out)}ms out: it leaves as quickly as you moved on.`);
  }, [ran.in, ran.out, fixed, onStatus]);
  const x = (ms) => (ms / 300) * 220, off = ran.out !== null && ran.in !== null && ran.out > ran.in * 0.8;
  return (
    <div className="relative w-[32.5rem] max-w-full pb-24">
      <article className="relative rounded-card bg-surface shadow-card">
        <header className="flex items-baseline justify-between px-5 pt-[18px]">
          <span className="text-[17px] leading-6 font-medium tracking-[-0.01em]">Thursday</span>
          <span className="text-[13px] text-ink-muted">6 November · Week 45</span>
        </header>
        <span className="grid grid-cols-7 gap-1 border-b-hairline px-4 pt-3 pb-3.5">
          {WEEK.map(([d, date, cals]) => (
            <span key={d} className={'flex h-12 flex-col items-center justify-center gap-0.5 rounded-[8px] text-[11px] ' + (date === 6 ? 'bg-accent text-white/85' : 'text-ink-subtle')}>
              {d}<span className={'text-[15px] leading-5 font-medium tabular-nums ' + (date === 6 ? 'text-white' : date > 7 ? 'text-ink-subtle' : 'text-ink')}>{date}</span>
              <span className="flex h-1 gap-0.5">{cals.map((c) => <span key={c} className={'size-1 rounded-full ' + (date === 6 ? 'bg-white' : CAL[c].dot)} />)}</span>
            </span>
          ))}
        </span>
        <div ref={grid} className="relative h-[334px]">
          {['8:00', '9:00', '10:00', '11:00', '12:00', '13:00'].map((h, i) => (
            <span key={h} className="absolute right-5 left-16 h-hairline bg-line" style={{ top: TOP + i * HOUR }}>
              <span className="absolute -top-[7px] -left-[3.25rem] w-[2.125rem] text-right text-[11px] leading-[14px] text-ink-subtle tabular-nums">{h}</span>
            </span>
          ))}
          {EVENTS.map((e) => {
            const c = CAL[e.cal], tall = e.h >= 39;
            return (
              <button key={e.id} type="button" aria-expanded={open === e.id} onClick={() => setOpen((o) => (o === e.id ? null : e.id))}
                className={'absolute right-5 left-16 flex gap-2 overflow-hidden rounded-control px-2.5 text-left active:brightness-95 ' + c.ink + ' ' + c.soft + ' ' + c.bar + ' ' + (tall ? 'items-start py-1.5' : 'items-center') + (open === e.id ? ' ring-[1.5px] ring-current ring-inset' : '')}
                style={{ top: e.top + 1, height: e.h - 2 }}>
                <span className={'flex min-w-0 gap-2 ' + c.ink + (tall ? ' flex-col gap-0' : ' items-baseline')}>
                  <span className="truncate text-[13px] font-medium">{e.title}</span>
                  <span className="truncate text-xs tabular-nums">{tall ? e.when + (e.sub ? ` · ${e.sub}` : '') : e.when.split(' – ')[0] + (e.place && e.id === 'crit' ? ` – 9:30 · ${e.place}` : '')}</span>
                </span>
                {e.faces ? (
                  <span className="ml-auto flex self-center">
                    {e.faces.map((f, i) => <span key={i} className={i ? '-ml-1.5' : ''}><Face src={f} ring={c.ring} /></span>)}
                    {e.more ? <span className="-ml-1.5 grid size-[22px] place-items-center rounded-full bg-surface text-[10px] font-medium text-ink-muted tabular-nums" style={{ boxShadow: `0 0 0 2px ${c.ring}` }}>+{e.more}</span> : null}
                  </span>
                ) : null}
              </button>
            );
          })}
          <span className="pointer-events-none absolute right-5 left-[3.75rem] h-0.5 bg-[#d93a3a]" style={{ top: at(9, 40) }}><span className="absolute -top-[3px] -left-1 size-2 rounded-full bg-[#d93a3a]" /></span>
          {/* every event's preview: one component, one transition */}
          {EVENTS.map((e) => {
            const shown = open === e.id, below = e.top + e.h + 8 + 250 < 334 + 120;
            return (
              <div key={e.id} data-popover role="dialog" aria-label={e.title} aria-hidden={!shown} data-state={shown ? 'open' : 'closed'}
                style={{ ...(below ? { top: e.top + e.h + 6 } : { bottom: 334 - e.top + 6 }), ...(slow ? { transitionDuration: `${(shown ? 300 : fixed ? 200 : 300) * k}ms` } : {}) }}
                className={'absolute left-[8.25rem] z-10 flex w-[17rem] flex-col rounded-card bg-surface px-4 pt-[11px] pb-4 shadow-popover ring-1 ring-line transition-[opacity,scale,visibility] duration-300 ease-arrive data-[state=open]:scale-100 data-[state=open]:opacity-100 data-[state=closed]:invisible data-[state=closed]:scale-95 data-[state=closed]:opacity-0 '
                  + (below ? 'origin-top-left ' : 'origin-bottom-left ') + (fixed ? 'data-[state=closed]:duration-200' : '')}>
                <span className="flex items-center gap-2 text-[15px] leading-5 font-medium"><span className={'size-2.5 rounded-[3px] ' + CAL[e.cal].dot} />{e.title}</span>
                <span className="mt-0.5 pl-[18px] text-[13px] text-ink-muted tabular-nums">Thu 6 Nov · {e.when}{e.place ? ` · ${e.place}` : ''}</span>
                {e.meet ? (
                  <span className="mt-3 flex items-center gap-2.5 text-[13px]">
                    <span className="grid size-7 shrink-0 place-items-center rounded-control bg-[#00897b]"><img src={meetLogo} alt="" className="size-4 invert" /></span>
                    <span className="flex min-w-0 flex-col"><span>Google Meet</span><span className="truncate text-xs text-ink-subtle">{e.meet}</span></span>
                  </span>
                ) : null}
                {e.guests ? (
                  <span className="mt-3 flex items-center gap-2.5 text-[13px]">
                    <span className="flex shrink-0 pl-1.5">{e.guests.map((g, i) => <span key={i} className="-ml-1.5"><Face src={g} ring="#fff" size="size-6" /></span>)}</span>
                    <span className="flex min-w-0 flex-col"><span className="truncate">{e.who}</span><span className="text-xs text-ink-subtle">{e.rsvp}</span></span>
                  </span>
                ) : null}
                <span className="mt-3 text-[13px] leading-[19px] text-pretty text-ink-muted">{e.note}</span>
                <span className="mt-3.5 flex gap-2">
                  {e.meet ? <button type="button" tabIndex={shown ? 0 : -1} className="h-8 rounded-control bg-accent px-3 text-[13px] font-medium text-accent-ink hover:bg-accent-deep active:brightness-95">Join with Meet</button> : null}
                  <button type="button" tabIndex={shown ? 0 : -1} onClick={() => setOpen(null)} className="h-8 rounded-control px-3 text-[13px] font-medium ring-1 ring-line ring-inset hover:bg-sunken active:brightness-95">Close</button>
                </span>
              </div>
            );
          })}
        </div>
      </article>
      <div className="absolute right-0 bottom-0 flex items-center gap-2 text-xs text-ink-muted">
        Speed
        <span role="group" aria-label="Speed" className="flex gap-0.5 rounded-control bg-sunken p-0.5 ring-1 ring-line">
          {[[true, '¼×'], [false, '1×']].map(([v, l]) => <button key={l} type="button" aria-pressed={slow === v} onClick={() => setSlow(v)} className={'h-6 rounded-[5px] px-2 ' + (slow === v ? 'bg-surface text-ink shadow-raised' : 'hover:text-ink')}>{l}</button>)}
        </span>
      </div>
      <MarksLayer>
        {/* the two durations, measured, to one scale */}
        <div style={{ position: 'absolute', left: 0, bottom: 40, width: '100%', height: 32 }}>
          {[['in', ran.in, 'var(--pl-sky)'], ['out', ran.out, off ? 'var(--pl-off)' : 'var(--pl-on)']].map(([label, ms, col], i) => (
            <span key={label} style={{ position: 'absolute', left: 0, top: i * 18, display: 'flex', alignItems: 'center', gap: 8, font: '600 10.5px/14px var(--pl-sans)', color: 'var(--pl-ink-2)' }}>
              <span style={{ width: 22 }}>{label}</span>
              <span style={{ height: 6, width: ms === null ? 0 : x(ms), borderRadius: 3, background: col, transition: 'width 200ms var(--pl-ease-out)' }} />
              {ms !== null ? <span style={{ font: '500 11px var(--pl-mono)', color: 'var(--pl-ink-2)' }}>{Math.round(ms)}ms</span> : null}
            </span>
          ))}
          {ran.out !== null && ran.in !== null ? <Tag x={30 + x(Math.max(ran.in, ran.out)) + 64} y={25} off={off}>{off ? 'no quicker out' : 'out ⅔ of in ✓'}</Tag> : null}
        </div>
      </MarksLayer>
    </div>
  );
}
ExitFaster.names = ['Same both ways', 'Faster out'];
ExitFaster.lesson = {
  why: 'Opening and closing aren’t the same moment. Coming in, 300ms reads as the preview arriving. Going out, you’ve already moved on, and the same 300ms keeps it in front of the next event you want: it feels slow to leave, on every event.',
  habit: 'Give the exit its own, shorter duration: about 70% of the entrance.',
};
