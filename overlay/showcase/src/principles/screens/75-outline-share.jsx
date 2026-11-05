// #75 scroll shadows. Outline, planning docs: Anika shares Brindle's Q3 plan. The dialog lists who has access in boxes
// of fixed height, one list component for people, teams and pending invites. On a Mac (and on phones) the scrollbar
// only appears while you scroll, so at rest each list looks complete: every one is cut on a row's edge, which reads as
// the end. Four people show of eight, two teams of four, two invites of three, and nothing says so. plumber draws a
// soft shadow at the bottom of each list while more is hidden, gone once you reach its end.
import anika from '../../media/people/person-07.jpg';
import jonas from '../../media/people/person-08.jpg';
import priya from '../../media/people/person-03.jpg';
import theo from '../../media/people/person-02.jpg';
import mira from '../../media/people/person-10.jpg';
import sana from '../../media/people/person-05.jpg';
import leo from '../../media/people/person-04.jpg';
import arlo from '../../media/people/person-06.jpg';

export const n = 75;

const GOALS = [['Self-serve signups', '2,140 of 3,000', 71], ['Churn under 3%', '3.4%', 44], ['Mobile beta', 'Week 6 of 8', 75]];
const PEOPLE = [
  ['Anika Rao', 'anika@brindle.io', anika, 'Owner'], ['Jonas Weber', 'jonas@brindle.io', jonas, 'Can edit'],
  ['Priya Nair', 'priya@brindle.io', priya, 'Can edit'], ['Theo Lambert', 'theo@brindle.io', theo, 'Can view'],
  ['Mira Okafor', 'mira@brindle.io', mira, 'Can view'], ['Sana Iqbal', 'sana@brindle.io', sana, 'Can edit'],
  ['Leo Brandt', 'leo@brindle.io', leo, 'Can view'], ['Arlo Kim', 'arlo@brindle.io', arlo, 'Can view'],
];
const TEAMS = [['Design', '12 people', 'Can edit', '#5550d8'], ['Growth', '8 people', 'Can edit', '#0f6f58'], ['Leadership', '5 people', 'Can view', '#965a03'], ['Finance', '4 people', 'Can view', '#b02a3a']];
const INVITES = [['ines.duarte@kestrel.vc', 'Sent Tuesday'], ['oskar@fieldnote.studio', 'Sent Monday'], ['hello@marlow.agency', 'Sent 28 Oct']];

const Caret = () => <svg viewBox="0 0 8 8" className="size-2" fill="currentColor" aria-hidden="true"><path d="M1 2.5h6L4 6z" /></svg>;
const Role = ({ children }) => (
  <button type="button" className="ml-auto inline-flex h-7 shrink-0 items-center gap-1 rounded-control pr-1.5 pl-2 text-[12.5px] text-ink-muted hover:bg-surface hover:ring-1 hover:ring-line hover:ring-inset active:bg-sunken">{children}<Caret /></button>
);
// one list component for every list in the dialog: a box of fixed height that scrolls
const List = ({ label, aside, h, first, children }) => (
  <>
    <span className="mt-4 flex justify-between text-xs font-medium text-ink-muted">{label}<span className="font-normal text-ink-subtle">{aside}</span></span>
    <ul data-list={first || undefined} className={'-mx-2 mt-1 flex flex-col overflow-y-auto ' + h}>{children}</ul>
  </>
);
const Row = ({ h = 'h-12', children }) => <li className={'flex shrink-0 items-center gap-3 rounded-control px-2 hover:bg-sunken ' + h}>{children}</li>;

export default function Share() {
  return (
    <article role="dialog" aria-label="Share Q3 plan" className="w-full max-w-[26.25rem] rounded-sheet bg-surface shadow-popover ring-1 ring-line">
      <div className="px-5 pt-5">
        <header className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-[8px] bg-accent-soft text-accent-deep">
            <svg viewBox="0 0 18 18" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true"><path d="M4 2.5h6.5L14 6v9.5H4Z" /><path d="M10 2.5V6.5h4M6.5 9.5h5M6.5 12h3.5" strokeLinecap="round" /></svg>
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="text-[15px] leading-5 font-semibold tracking-[-0.01em]">Share “Q3 plan”</span>
            <span className="truncate text-[12.5px] text-ink-muted">Brindle · Planning · edited 20 min ago</span>
          </span>
          <button type="button" aria-label="Close" className="ml-auto grid size-7 shrink-0 place-items-center rounded-control text-ink-subtle hover:bg-sunken hover:text-ink active:bg-line">
            <svg viewBox="0 0 12 12" className="size-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M3 3l6 6M9 3l-6 6" /></svg>
          </button>
        </header>
        {/* the doc's three goals, as the doc draws them */}
        <span className="mt-3.5 grid grid-cols-3 gap-1.5">
          {GOALS.map(([label, value, pct]) => (
            <span key={label} className="flex min-w-0 flex-col rounded-[8px] bg-sunken px-2.5 py-2">
              <span className="truncate text-[11.5px] text-ink-muted">{label}</span>
              <span className="text-[13px] font-medium tabular-nums">{value}</span>
              <span className="mt-1.5 h-1 overflow-hidden rounded-full bg-ink/8"><span className="block h-full rounded-full bg-accent" style={{ width: `${pct}%` }} /></span>
            </span>
          ))}
        </span>
        <span className="mt-4 flex gap-2">
          <span className="flex h-9 min-w-0 flex-1 items-center rounded-control pr-1 ring-1 ring-line ring-inset focus-within:ring-2 focus-within:ring-accent">
            <input type="text" aria-label="Add people" placeholder="Add people by name or email" className="h-full min-w-0 flex-1 rounded-control bg-transparent pl-2.5 text-base outline-none placeholder:text-ink-subtle md:text-[13px]" />
            <button type="button" className="inline-flex h-7 shrink-0 items-center gap-1 rounded-control px-1.5 text-[13px] font-medium text-ink-muted hover:bg-sunken active:bg-line">Can edit<Caret /></button>
          </span>
          <button type="button" disabled className="h-9 rounded-control bg-sunken px-3.5 text-[13px] font-medium text-ink-subtle">Invite</button>
        </span>
        <List label="People with access" aside="Sorted by role" h="h-48" first>
          {PEOPLE.map(([name, email, face, role]) => (
            <Row key={name}>
              <img src={face} alt="" className="size-8 shrink-0 rounded-full object-cover outline-1 -outline-offset-1 outline-black/10" />
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-[13.5px] font-medium">{name}{name === 'Anika Rao' ? <span className="font-normal text-ink-subtle"> (you)</span> : null}</span>
                <span className="truncate text-xs text-ink-subtle">{email}</span>
              </span>
              {role === 'Owner' ? <span className="ml-auto pr-2 text-[12.5px] text-ink-subtle">Owner</span> : <Role>{role}</Role>}
            </Row>
          ))}
        </List>
        <List label="Teams" aside="Everyone in the team" h="h-20">
          {TEAMS.map(([team, size, role, color]) => (
            <Row key={team} h="h-10">
              <span className="grid size-8 shrink-0 place-items-center rounded-[8px] text-xs font-semibold text-white" style={{ background: color }}>{team[0]}</span>
              <span className="flex min-w-0 items-baseline gap-2"><span className="text-[13.5px] font-medium">{team}</span><span className="text-xs text-ink-subtle tabular-nums">{size}</span></span>
              <Role>{role}</Role>
            </Row>
          ))}
        </List>
        <List label="Waiting to accept" aside="Outside Brindle" h="h-20">
          {INVITES.map(([email, sent]) => (
            <Row key={email} h="h-10">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-sunken text-[11px] font-semibold text-ink-muted ring-1 ring-line ring-inset">{email.slice(0, 2).toUpperCase()}</span>
              <span className="flex min-w-0 items-baseline gap-2"><span className="truncate text-[13.5px] font-medium">{email}</span><span className="shrink-0 text-xs text-ink-subtle">{sent}</span></span>
              <Role>Can view</Role>
            </Row>
          ))}
        </List>
        <span className="mt-2 flex items-center gap-3 border-t-hairline pt-3.5 pb-4">
          <span className="grid size-8 shrink-0 place-items-center rounded-[8px] bg-positive-soft text-positive">
            <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><circle cx="8" cy="8" r="5.8" /><path d="M2.2 8h11.6M8 2.2c1.7 1.8 2.4 3.7 2.4 5.8S9.7 12 8 13.8C6.3 12 5.6 10.1 5.6 8S6.3 4 8 2.2Z" /></svg>
          </span>
          <span className="flex flex-col"><span className="text-[13.5px] font-medium">Anyone at Brindle</span><span className="text-xs text-ink-subtle">can find and view this doc</span></span>
          <Role>Can view</Role>
        </span>
      </div>
      <footer className="flex items-center gap-2 rounded-b-sheet border-t-hairline bg-sunken px-5 py-3">
        <button type="button" className="inline-flex h-8 items-center gap-1.5 rounded-control bg-surface pr-3 pl-2.5 text-[13px] font-medium shadow-raised ring-1 ring-line ring-inset hover:bg-canvas active:bg-sunken">
          <svg viewBox="0 0 14 14" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true"><path d="M6 8a2.6 2.6 0 0 0 3.7 0l2-2a2.6 2.6 0 0 0-3.7-3.7l-.6.6M8 6a2.6 2.6 0 0 0-3.7 0l-2 2a2.6 2.6 0 0 0 3.7 3.7l.6-.6" /></svg>Copy link
        </button>
        <button type="button" className="ml-auto h-8 rounded-control bg-ink px-3 text-[13px] font-medium text-white hover:bg-ink/90 active:bg-ink/80">Done</button>
      </footer>
    </article>
  );
}
Share.stage = true;
Share.names = ['No cue', 'Scroll shadows'];
Share.lesson = {
  why: 'Where scrollbars only appear while you scroll (macOS, phones), a list that ends on a row’s edge looks finished. Four people show of eight, two teams of four, two invites of three, and nothing says there are more.',
  habit: 'Give every box that scrolls a cue at the edge where more is hidden, a shadow or a fade that’s gone once you reach the end.',
};
// What the eye sees: the people list's bottom edge, where it cuts off. The hatch is the edge; the pill is how many
// people are below it.
Share.measure = (root) => {
  const list = root?.querySelector('[data-list]');
  if (!list) return null;
  const r = list.getBoundingClientRect(), k = r.width / list.offsetWidth || 1;
  const hidden = [...list.children].filter((li) => li.getBoundingClientRect().top >= r.bottom - 1).length;
  const cue = /local/.test(getComputedStyle(list).backgroundAttachment) || /gradient/.test(getComputedStyle(list).maskImage);
  return {
    lines: [],
    rules: [{ key: 'edge', y: r.bottom, left: r.left, right: r.right }],
    // the cut-off edge, hatched while nothing says there's more; it closes when the scroll shadow takes its place
    bands: [{ key: 'edge', left: r.left, right: r.right, top: cue ? r.bottom : r.bottom - 14 * k, bottom: r.bottom, pattern: 'hatch' }],
    pills: [{ key: 'hidden', x: r.right - 24 * k, y: r.bottom + 14 * k, text: String(hidden * k), ok: cue }],
    off: !cue,
    cut: { left: r.left, right: r.right, top: r.top, bottom: r.bottom, r: 6 * k },
    subject: { left: r.left - 20 * k, right: r.right + 20 * k, top: r.bottom - 120 * k, bottom: r.bottom + 40 * k },
  };
};
