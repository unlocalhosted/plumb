// #79 text in a row may shrink. Roster, a workspace's members page: a face, a name over an email, and the role at the
// end of each row. The name and email are set to cut off with an ellipsis (`truncate`). At the width it was built and
// reviewed at, every name fits, nothing is cut, and the card is right: this is what ships.
// The slip is latent. The column that holds the text is a flex item, and a flex item is never narrower than its
// longest line unless it is told it may be. So the ellipsis can never happen: on a phone, or for a longer email, the
// column stays as wide as its text and the role menu is pushed off the card.
// The viewer's hand is the screen: drag the card's edge narrower and the rows break one by one. With min-w-0 on the
// column, the text is cut off and every role stays on the card, at any width. plumber finds it at rest, before it breaks.
import { Edge, useWidth } from './kit.jsx';
import ines from '../../media/people/person-04.jpg';
import tom from '../../media/people/person-07.jpg';
import ada from '../../media/people/person-01.jpg';
import bart from '../../media/people/person-02.jpg';
import anne from '../../media/people/person-03.jpg';
import sol from '../../media/people/person-10.jpg';

export const n = 79;

// face, name, email, role
const PEOPLE = [
  [ines, 'Ines Carvalho', 'ines@fieldnote.studio', 'Owner'],
  [bart, 'Kwame Okonkwo', 'kwame.okonkwo@northwind.example', 'Admin'],
  [tom, 'Tom Reyes', 'tom@fieldnote.studio', 'Editor'],
  [anne, 'Anneliese Lindqvist', 'a.lindqvist@uniklinikum.example', 'Viewer'],
  [ada, 'Ada Mensah', 'ada.mensah@fieldnote.studio', 'Editor'],
  [sol, 'Sol Nakamura', 'sol.nakamura@harbourside.example', 'Viewer'],
];
const WIDTH = { min: 240, start: 420, max: 560, step: 24 }; // the card, in px: a small phone to a desktop column

const Chevron = () => <svg viewBox="0 0 12 12" aria-hidden="true" className="size-3 text-ink-subtle"><path d="M3 4.75 6 7.75l3-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;

export default function RosterMembers() {
  const { w, grip } = useWidth(WIDTH);
  return (
    <article className="relative max-w-full rounded-card bg-surface shadow-card" style={{ width: w }}>
      <header className="flex items-center gap-3 border-b-hairline border-line px-4 py-3.5">
        <span className="flex min-w-0 flex-col">
          <span className="text-[15px] leading-5 font-medium tracking-[-0.01em]">Members</span>
          <span className="truncate text-[13px] text-ink-muted" title="Fieldnote · 6 people, 3 guests">Fieldnote · <span className="tabular-nums">6</span> people, <span className="tabular-nums">3</span> guests</span>
        </span>
        <button type="button" className="ml-auto h-8 shrink-0 rounded-control bg-accent px-3 text-[13px] font-medium text-accent-ink hover:bg-accent-deep">Invite</button>
      </header>
      <ul className="m-0 flex list-none flex-col p-0">
        {PEOPLE.map(([face, name, email, role], i) => (
          <li key={email} data-row="" className={'flex items-center gap-3 px-4 py-2.5 ' + (i ? 'border-t-hairline border-line' : '')}>
            <img src={face} alt="" className="block size-9 shrink-0 rounded-full object-cover outline-1 -outline-offset-1 outline-black/10" />
            {/* the name and email: cut off when they don't fit, or so it was meant */}
            <span className="flex flex-1 flex-col">
              <span className="truncate text-sm font-medium" title={name}>{name}</span>
              <span className="truncate text-[13px] text-ink-muted" title={email}>{email}</span>
            </span>
            <button type="button" data-role="" className="flex h-7 shrink-0 items-center gap-1 rounded-control bg-sunken pr-1.5 pl-2.5 text-[13px] font-medium text-ink-muted hover:text-ink">{role}<Chevron /></button>
          </li>
        ))}
      </ul>
      <Edge grip={grip} />
    </article>
  );
}
RosterMembers.stage = true;
RosterMembers.camera = false;
RosterMembers.names = ['Text holds it open', 'Free to shrink'];
RosterMembers.hint = 'Drag the card’s edge in, to a phone’s width. It looks right until then.';
RosterMembers.lesson = {
  matters: 'This card passes a design review: every name fits, nothing is cut, the roles line up. It breaks later, on a narrow phone or the day someone joins with a long email. Then the role menu is pushed off the card, and the truncate that was meant to stop it does nothing. plumber finds it now, while it still looks right.',
  why: 'A flex item is never narrower than its longest unbroken line unless it is told it may be. So the column holding the name can’t shrink, and the ellipsis never gets anything to cut.',
  habit: 'The part of a row that holds text gets min-w-0. Then truncate works, for any name at any width.',
};
// What the eye sees, on every row: the hatched strip is the width the column refuses to go under, its longest line, in
// px. Nothing is broken yet; that floor is what will push the role out. Free to shrink, the floor is 0 and the strip closes.
RosterMembers.measure = (root) => {
  const rows = [...(root?.querySelectorAll('[data-row]') ?? [])];
  const card = root?.firstElementChild?.getBoundingClientRect();
  if (!rows.length || !card) return null;
  const bands = [], pills = [], lines = [];
  let k = 1, off = false;
  rows.forEach((row, i) => {
    const col = row.children[1], r = col.getBoundingClientRect();
    k = row.getBoundingClientRect().width / row.offsetWidth || 1;
    // the floor: the longest line in the column, unless the column has been told it may shrink
    const floor = getComputedStyle(col).minWidth === 'auto' ? Math.max(...[...col.children].map((t) => t.scrollWidth)) * k : 0;
    off ||= floor > 0.5;
    bands.push({ key: `f${i}`, pattern: 'hatch', left: r.left, right: r.left + floor, top: r.top, bottom: r.bottom });
    lines.push({ key: `e${i}`, x: r.left + floor, top: r.top, bottom: r.bottom });
    pills.push({ key: `p${i}`, x: r.left + floor, y: r.top, text: String(floor), ok: floor <= 0.5 });
  });
  const first = rows[0].getBoundingClientRect(), last = rows[rows.length - 1].getBoundingClientRect();
  return {
    off, bands, pills, lines, rules: [],
    cut: { left: first.left, right: first.right, top: first.top, bottom: last.bottom, r: 0 },
    subject: { left: card.left, right: card.right, top: card.top, bottom: card.bottom },
  };
};
