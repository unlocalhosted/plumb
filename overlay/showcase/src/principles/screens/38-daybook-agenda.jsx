// #38 hairlines are one device pixel. Daybook, a calendar: Ruth's Thursday at 14:42, eighteen minutes before a Figma
// call. The week drawn as booked hours per calendar, seven events with their people, the now line, the next call ready
// to join, tomorrow at the foot. Every event row is divided from the next with border-b, 1px, the thinnest line
// Tailwind names: on a 2× screen that's two device pixels, six times down the card, each divider as heavy as the
// strokes of the words it separates. Every other line on the card is already a hairline. plumber halves the rows'.
import ruth from '../../media/people/person-01.jpg';
import theo from '../../media/people/person-08.jpg';
import priya from '../../media/people/person-05.jpg';
import arlo from '../../media/people/person-06.jpg';
import jonas from '../../media/people/person-04.jpg';
import mei from '../../media/people/person-07.jpg';
import kwame from '../../media/people/person-02.jpg';
import sol from '../../media/people/person-10.jpg';
import ines from '../../media/people/person-03.jpg';
import tomi from '../../media/people/person-09.jpg';
import figmaLogo from '../../media/logos/figma.svg';

export const n = 38;

// one colour per calendar, everywhere: the bar on an event, the week's bars, tomorrow's chips
const CAL = { work: '#5550d8', hire: '#1f9d6b', home: '#d9822b' };
// each day's booked hours, per calendar (the bars are 4px a half hour)
const WEEK = [
  ['Mon', 3, [['work', 14], ['hire', 6]]],
  ['Tue', 4, [['work', 22]]],
  ['Wed', 5, [['work', 10], ['hire', 10], ['home', 4]]],
  ['Thu', 6, [['work', 18], ['hire', 6], ['home', 5]], 'today'],
  ['Fri', 7, [['work', 8]]],
  ['Sat', 8, [['home', 6]]],
  ['Sun', 9, []],
];
const EVENTS = [
  { at: '9:00', until: '9:30', what: 'Design crit', where: 'Studio 2', cal: 'work', faces: [mei, kwame, sol], more: 4, past: true },
  { at: '10:00', until: '10:45', what: '1:1 with Theo', where: 'Corner room', cal: 'work', faces: [theo], past: true },
  { at: '11:00', until: '12:00', what: 'Interview: Priya Nair', where: 'Video call · Senior designer', cal: 'hire', faces: [priya, arlo], past: true },
  { at: '13:00', until: '13:45', what: 'Lunch with Jonas', where: 'Café Mona, Kastanienallee', cal: 'home', faces: [jonas], past: true },
  { now: '14:42' },
  { at: '15:00', until: '15:30', what: 'Config talk run-through', where: 'Video call', cal: 'work', faces: [ruth, tomi], next: 'in 18 min', brand: figmaLogo },
  { at: '16:00', until: '17:00', what: 'Release review', where: 'Room 4B', cal: 'work', faces: [ines, mei, theo], more: 9 },
  { at: '17:30', until: '18:15', what: 'Ada’s swimming lesson', where: 'Stadtbad Oderberger', cal: 'home', faces: [] },
];

function Faces({ list, more, ring = 'ring-surface' }) {
  if (!list.length) return null;
  return (
    <span className="flex items-center">
      {list.map((src, i) => <img key={i} src={src} alt="" className={'size-6 rounded-full object-cover ring-2 outline-1 -outline-offset-1 outline-black/10 ' + ring + (i ? ' -ml-1.5' : '')} />)}
      {more ? <span className={'-ml-1.5 grid size-6 place-items-center rounded-full bg-sunken text-[10.5px] font-semibold text-ink-muted tabular-nums ring-2 ' + ring}>+{more}</span> : null}
    </span>
  );
}

export default function DaybookAgenda() {
  return (
    <article className="w-full max-w-[30rem] overflow-hidden rounded-card bg-surface shadow-card">
      {/* the day and its week: each day's booked hours as a bar per calendar, so a heavy day reads before you open it */}
      <header className="border-b-hairline border-line px-6 pt-5 pb-4">
        <div className="flex items-baseline gap-2">
          <span className="text-[22px] leading-7 font-semibold tracking-[-0.015em]">Thursday</span>
          <span className="text-sm text-ink-muted">6 November</span>
          <span className="ml-auto flex items-center gap-1.5 self-center text-[13px] text-ink-muted">
            <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true"><path d="M4.5 10.5a3 3 0 0 1 .4-6 3.8 3.8 0 0 1 7.1 1.2 2.4 2.4 0 0 1-.4 4.8z" /><path d="M5.5 13l-.5 1.2M8.5 13 8 14.2M11.5 13l-.5 1.2" /></svg>
            <span className="font-medium text-ink tabular-nums">12°</span> Showers till 11
          </span>
        </div>
        <ol aria-label="This week" className="mt-4 grid grid-cols-7 gap-1.5">
          {WEEK.map(([day, date, load, today]) => (
            <li key={day} aria-current={today ? 'date' : undefined} className={'flex flex-col items-center gap-1.5 rounded-control pt-1.5 pb-2 ' + (today ? 'bg-accent-soft' : '')}>
              <span className={'text-[11px] font-medium ' + (today ? 'text-accent-deep' : 'text-ink-subtle')}>{day}</span>
              <span className={'grid size-7 place-items-center rounded-full text-sm font-medium tabular-nums ' + (today ? 'bg-accent text-accent-ink' : date < 6 ? 'text-ink-subtle' : '')}>{date}</span>
              <span className="flex h-1 w-8 gap-0.5">
                {load.map(([cal, w], i) => <i key={i} className="h-full rounded-[2px]" style={{ width: w, background: CAL[cal] }} />)}
              </span>
            </li>
          ))}
        </ol>
      </header>

      <p className="flex justify-between px-6 pt-3.5 pb-1 text-xs font-medium text-ink-subtle">
        <span>7 events · 5h 15m booked</span><span>Next free <span className="tabular-nums">15:30</span></span>
      </p>
      <ul className="isolate px-6 pb-1.5">
        {EVENTS.map((e, i) => e.now ? (
          // now: a 2px rule in the calendar's red, a mark, not a divider
          <li key="now" aria-label={`Now, ${e.now}`} className="relative h-0">
            <span className="absolute top-[-1px] right-0 left-12 h-0.5 rounded-full bg-negative before:absolute before:top-[-3px] before:-left-1 before:size-2 before:rounded-full before:bg-negative" />
            <span className="absolute top-[-8px] left-0 h-4 rounded-chip bg-negative px-1 text-[10.5px] leading-4 font-semibold text-white tabular-nums">{e.now}</span>
          </li>
        ) : (
          <li key={e.what} data-row={i === 0 || undefined}
            className={'relative grid grid-cols-[2.75rem_3px_1fr_auto] items-center gap-3 border-b border-line py-[11px] last:border-0 ' + (e.next ? 'before:absolute before:inset-x-[-12px] before:inset-y-[5px] before:-z-10 before:rounded-control before:bg-accent-soft' : '')}>
            <span className="self-start pt-px tabular-nums">
              <span className={'block text-[13px] font-medium ' + (e.past ? 'text-ink-muted' : '')}>{e.at}</span>
              <span className="block text-xs text-ink-subtle">{e.until}</span>
            </span>
            {/* a past event's bar is its calendar's colour washed out, the way its words are muted */}
            <span className="self-stretch rounded-[2px]" style={{ background: e.past ? `color-mix(in oklab, ${CAL[e.cal]} 35%, white)` : CAL[e.cal] }} />
            <span className="flex min-w-0 flex-col">
              <span className={'flex items-center gap-1.5 truncate text-sm font-medium ' + (e.past ? 'text-ink-muted' : '')}>
                {e.brand ? <span className="grid size-4 shrink-0 place-items-center rounded-chip bg-[#f24e1e]"><span className="size-[9px] bg-white" style={{ mask: `url("${e.brand}") center / contain no-repeat` }} /></span> : null}
                <span className="truncate">{e.what}</span>
              </span>
              <span className="flex items-center gap-1.5 truncate text-[12.5px] text-ink-muted">
                {e.next ? <span className="inline-flex h-5 shrink-0 items-center rounded-chip bg-caution-soft px-[7px] text-[11.5px] font-medium text-caution tabular-nums">{e.next}</span> : null}
                <span className="truncate">{e.where}</span>
              </span>
            </span>
            <span className="flex items-center gap-2">
              <Faces list={e.faces} more={e.more} ring={e.next ? 'ring-accent-soft' : 'ring-surface'} />
              {e.next ? <button type="button" className="inline-flex h-7 items-center rounded-control bg-accent px-3 text-[13px] font-medium text-accent-ink shadow-[0_1px_2px_rgb(54_49_166/0.3),inset_0_1px_0_rgb(255_255_255/0.18)] hover:bg-accent-deep">Join</button> : null}
            </span>
          </li>
        ))}
      </ul>

      {/* tomorrow, at the foot */}
      <footer className="flex items-center gap-3 border-t-hairline border-line bg-sunken px-6 pt-3.5 pb-4 text-[12.5px] text-ink-muted">
        <span>Tomorrow <span className="font-medium text-ink">3 events</span>, first at <span className="font-medium text-ink tabular-nums">10:00</span></span>
        <span className="ml-auto flex gap-1">{['work', 'work', 'home'].map((c, i) => <i key={i} className="h-1.5 w-[18px] rounded-full" style={{ background: CAL[c] }} />)}</span>
      </footer>
    </article>
  );
}
DaybookAgenda.stage = true;
DaybookAgenda.names = ['1px', 'One device pixel'];
DaybookAgenda.lesson = {
  why: 'CSS pixels aren’t screen pixels. On a 2× screen, border-b’s 1px is drawn two device pixels thick: as heavy as the thinnest strokes of the words, so every divider down the agenda competes with the events it separates.',
  habit: 'Draw dividers one device pixel on 2× screens: a half-pixel inset shadow, or a box 0.5px tall, never a 0.5px border.',
};
// What the eye sees: the first divider, magnified. The pill is its thickness in device pixels.
DaybookAgenda.measure = (root) => {
  const row = root?.querySelector('[data-row]');
  if (!row) return null;
  const r = row.getBoundingClientRect(), k = r.width / row.offsetWidth || 1, cs = getComputedStyle(row);
  // the line is the border, or once fixed, the inset shadow drawn in its place
  const w = parseFloat(cs.borderBottomWidth) || Math.abs(parseFloat(cs.boxShadow.match(/(-?[\d.]+)px\s+0px\s+0px\s+inset/)?.[1] ?? cs.boxShadow.match(/0px\s+(-?[\d.]+)px/)?.[1] ?? 0)) || 0;
  const device = Math.round(w * (devicePixelRatio || 1) * 10) / 10;
  return {
    lines: [], off: device > 1,
    rules: [{ key: 'divider', y: r.bottom - (w * k) / 2, left: r.left, right: r.right }],
    bands: [{ key: 'line', left: r.left + 120 * k, right: r.right, top: r.bottom - 4 * k, bottom: r.bottom + 3 * k, pattern: 'dots' }],
    // in the open stretch between the next event's title and its faces, clear of every word
    pills: [{ key: 'device', x: r.left + 230 * k, y: r.bottom + 12 * k, text: String(device * k), ok: device <= 1 }],
    cut: { left: r.left, right: r.right, top: r.bottom - 14 * k, bottom: r.bottom + 14 * k, r: 4 * k },
    subject: { left: r.left - 10 * k, right: r.left + 270 * k, top: r.bottom - 40 * k, bottom: r.bottom + 36 * k },
  };
};
