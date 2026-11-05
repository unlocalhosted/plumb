// #57 text colour by colour, not by opacity. Relay, a team's mail client: the Important tab mid-morning. Each message's
// preview line is muted with opacity-60, the quickest way to make words quieter. But opacity fades the whole line, not
// just its grey: the coloured words inside it, written to stand out (Mei's @you, the pull request GitHub wants your
// review on, the Linear issue that's yours), are washed out with the rest. plumber names a colour for the words instead.
import { MailIcon, SearchIcon, SlidersIcon } from '@unlocalhosted/dither-icons';
import githubLogo from '../../media/logos/github.svg';
import linearLogo from '../../media/logos/linear.svg';
import critWall from '../../media/s57-crit-wall.jpg';
import mei from '../../media/people/person-07.jpg';
import anika from '../../media/people/person-03.jpg';
import theo from '../../media/people/person-02.jpg';
import ruth from '../../media/people/person-10.jpg';
import amara from '../../media/people/person-05.jpg';
import jonas from '../../media/people/person-04.jpg';

export const n = 57;

// a word in a preview coloured to catch the eye: a mention, a pull request, an issue
const Ref = ({ children }) => <span data-mention className="font-medium text-accent case-forms">{children}</span>;
// labels in Slate's status tints
const LABEL = {
  Design: 'bg-accent-soft text-accent-deep',
  Launch: 'bg-negative-soft text-negative',
  Finance: 'bg-caution-soft text-caution',
  Hiring: 'bg-positive-soft text-positive',
};
const BRAND = { github: { color: '#181717', logo: githubLogo }, linear: { color: '#5e6ad2', logo: linearLogo } };

const DAYS = [
  ['Today', [
    { from: 'Mei Lin', face: mei, count: 3, at: '9:12', unread: true, selected: true, label: 'Design', subject: 'Notes from Tuesday’s crit',
      preview: [<Ref key="r">@you</Ref>, ' can you take the empty states before we ship? The inbox, search with no results, and the first project.'], files: true },
    { from: 'Anika Rao', face: anika, at: '8:47', unread: true, label: 'Launch', subject: 'Venue for the offsite',
      preview: ['Two options left, both near the station. Can you pick one by Friday so I can book the rooms?'], team: true },
    { from: 'GitHub', brand: 'github', count: 6, at: '8:03', unread: true, subject: '[relay/web] Release 4.2 is out',
      preview: [<Ref key="r">#1290</Ref>, ' is waiting on your review. 12 pull requests merged by 3 contributors.'] },
  ]],
  ['Yesterday', [
    { from: 'Amara Osei', face: amara, at: 'Yesterday', label: 'Hiring', subject: 'Portfolio review with the finalists',
      preview: ['I’ve put the three finalists in a doc, with notes from each first call.'], invite: true },
    { from: 'Jonas Weber', face: jonas, count: 2, at: 'Yesterday', label: 'Finance', subject: 'Re: the April numbers',
      preview: ['Thanks, that matches what finance sent this morning. I’ll close the month.'] },
    { from: 'Linear', brand: 'linear', at: 'Yesterday', subject: 'Your week in Relay Web',
      preview: [<Ref key="r">REL-214</Ref>, ' is still yours. You closed 14 issues and opened 3; cycle 22 ends on Friday.'] },
  ]],
];

// the preview as plain words, for its title
const text = (parts) => parts.map((p) => (typeof p === 'string' ? p : p.props.children)).join('');
const ICON_BTN = 'grid size-7 place-items-center rounded-control text-ink-muted hover:bg-sunken hover:text-ink active:bg-line';

function Avatar({ m }) {
  if (m.brand) {
    const b = BRAND[m.brand];
    return (
      <span className="grid size-9 place-items-center rounded-full" style={{ background: b.color }}>
        <span className="size-[17px] bg-white" style={{ mask: `url("${b.logo}") center / contain no-repeat` }} />
      </span>
    );
  }
  return <img src={m.face} alt="" className="size-9 rounded-full object-cover outline-1 -outline-offset-1 outline-black/10" />;
}

function Message({ m, first }) {
  const bold = m.unread ? 'font-medium' : 'font-normal';
  return (
    <li className={'relative grid grid-cols-[2.25rem_1fr] gap-3 px-5 pt-2.5 pb-[11px] ' + (m.selected ? 'bg-sunken' : '')}>
      {first || m.selected ? null : <span aria-hidden="true" className="absolute top-0 right-5 left-[4.25rem] h-hairline bg-line" />}
      {m.unread ? <span aria-label="Unread" className="absolute top-6 left-2 size-1.5 rounded-full bg-accent" /> : null}
      <Avatar m={m} />
      <span className="flex min-w-0 flex-col gap-px">
        <span className="flex items-baseline gap-2">
          <span className={'text-sm whitespace-nowrap ' + bold}>{m.from}</span>
          {m.count ? <span className="text-xs text-ink-subtle tabular-nums">{m.count}</span> : null}
          <span className={'ml-auto text-xs whitespace-nowrap tabular-nums ' + (m.unread ? 'font-medium text-accent-deep' : 'text-ink-subtle')}>{m.at}</span>
        </span>
        <span className="flex min-w-0 items-center gap-1.5 text-[13px]">
          {m.label ? <span className={'inline-flex h-[18px] shrink-0 items-center rounded-chip px-1.5 text-[11px] font-medium ' + LABEL[m.label]}>{m.label}</span> : null}
          <span className="truncate">{m.subject}</span>
        </span>
        {/* the habit: the preview muted with opacity, as quick as it gets. Whatever is coloured inside fades with it */}
        <span data-preview title={text(m.preview)} className="truncate text-[13px] leading-[19px] opacity-60">{m.preview}</span>
        {m.files ? (
          <span className="mt-[7px] flex gap-2">
            <span className="flex h-[30px] items-center gap-1.5 rounded-control bg-surface pr-2.5 pl-[3px] text-xs whitespace-nowrap shadow-raised ring-1 ring-line">
              <img src={critWall} alt="" className="size-6 rounded-chip object-cover outline-1 -outline-offset-1 outline-black/10" />crit-wall.jpg<span className="text-ink-subtle tabular-nums">4.2 MB</span>
            </span>
            <span className="flex h-[30px] items-center gap-1.5 rounded-control bg-surface pr-2.5 pl-[3px] text-xs whitespace-nowrap shadow-raised ring-1 ring-line">
              <span className="grid size-6 place-items-center rounded-chip bg-negative text-[8px] font-semibold tracking-wide text-white">PDF</span>crit-notes.pdf
            </span>
          </span>
        ) : null}
        {m.team ? (
          <span className="mt-[7px] flex items-center gap-2 text-xs text-ink-subtle">
            <span className="flex">{[theo, ruth, amara].map((f, i) => <img key={i} src={f} alt="" className={'size-5 rounded-full object-cover ring-2 ring-surface ' + (i ? '-ml-1.5' : '')} />)}</span>
            Theo, Ruth and Amara are on it
          </span>
        ) : null}
        {m.invite ? (
          <span className="mt-[7px] flex items-center gap-2.5 rounded-card bg-surface py-1.5 pr-1.5 pl-1.5 shadow-raised ring-1 ring-line">
            <span className="w-[34px] shrink-0 overflow-hidden rounded-chip text-center ring-1 ring-line">
              <span className="block bg-negative text-[9px] leading-[13px] font-semibold tracking-[0.06em] text-white">THU</span>
              <span className="block text-[15px] leading-5 font-semibold tabular-nums">14</span>
            </span>
            <span className="flex min-w-0 flex-col text-[12.5px] leading-[17px]">
              <span className="truncate">Portfolio review</span>
              <span className="truncate text-ink-muted tabular-nums">15:00–16:00 · Studio 2</span>
            </span>
            <span className="ml-auto flex gap-1">
              <button type="button" className="h-[26px] rounded-control px-2.5 text-xs font-medium text-ink-muted ring-1 ring-line ring-inset hover:bg-sunken hover:text-ink active:bg-line">Maybe</button>
              <button type="button" className="h-[26px] rounded-control bg-accent px-2.5 text-xs font-medium text-accent-ink hover:bg-accent-deep active:bg-accent-deep">Going</button>
            </span>
          </span>
        ) : null}
      </span>
    </li>
  );
}

export default function RelayInbox() {
  return (
    <article className="w-full max-w-[28.5rem] overflow-hidden rounded-sheet bg-surface shadow-window">
      <header className="px-5 pt-[18px]">
        <span className="flex items-center gap-2">
          <MailIcon size={16} texture="dither" className="text-ink-muted" />
          <span className="flex items-baseline gap-2">
            <span className="text-[17px] leading-6 font-medium tracking-[-0.01em]">Inbox</span>
            <span className="text-[13px] text-ink-subtle tabular-nums">12 unread</span>
          </span>
          <span className="ml-auto flex gap-0.5">
            <button type="button" aria-label="Search mail" className={ICON_BTN}><SearchIcon size={16} texture="dither" /></button>
            <button type="button" aria-label="Filter" className={ICON_BTN}><SlidersIcon size={16} texture="dither" /></button>
          </span>
        </span>
        <nav aria-label="Inbox tabs" className="mt-2.5 flex gap-[18px] border-b-hairline border-line">
          {[['Important', 8], ['Other', 24], ['Calendar', 2]].map(([t, c], i) => (
            <a key={t} href={`#${t.toLowerCase()}`} onClick={(e) => e.preventDefault()} aria-current={i === 0 ? 'page' : undefined}
              className={'relative flex h-[34px] items-center gap-1.5 text-[13px] font-medium ' + (i === 0 ? 'text-ink' : 'text-ink-muted hover:text-ink')}>
              {t}
              <span className={'grid h-[18px] min-w-[18px] place-items-center rounded-full px-[5px] text-[11px] font-semibold tabular-nums ' + (i === 0 ? 'bg-accent-soft text-accent-deep' : 'bg-sunken text-ink-muted')}>{c}</span>
              {i === 0 ? <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-accent" /> : null}
            </a>
          ))}
        </nav>
      </header>
      {DAYS.map(([day, list]) => (
        <section key={day} aria-label={day}>
          <h3 className="px-5 pt-3 pb-1 text-xs font-medium text-ink-subtle">{day}</h3>
          <ul>{list.map((m, i) => <Message key={m.subject} m={m} first={i === 0} />)}</ul>
        </section>
      ))}
      <div className="h-1.5" />
    </article>
  );
}
RelayInbox.stage = true;
RelayInbox.names = ['Opacity', 'A colour'];
RelayInbox.lesson = {
  why: 'Opacity doesn’t make words a quieter colour, it fades everything inside them. Every preview turns grey, and so does each word in it coloured to catch your eye: Mei’s @you, the pull request waiting on you, your Linear issue, all washed out to 60% with the rest.',
  habit: 'Mute text with a colour from your theme, never with opacity, so what’s inside keeps its own colour.',
};
// What the eye sees: each coloured word inside a muted line. A band on each, and a pill with how much of it is faded
// away, in percent. The camera goes to Mei's, the first.
RelayInbox.measure = (root) => {
  const refs = [...(root?.querySelectorAll('[data-mention]') ?? [])];
  if (!refs.length) return null;
  const k = refs[0].getBoundingClientRect().width / refs[0].offsetWidth || 1;
  const bands = [], pills = [];
  let off = false;
  refs.forEach((el, i) => {
    const r = el.getBoundingClientRect();
    let seen = 1;
    for (let e = el; e && e !== root; e = e.parentElement) seen *= parseFloat(getComputedStyle(e).opacity);
    const faded = Math.round((1 - seen) * 100);
    off ||= faded > 0;
    bands.push({ key: i, left: r.left - 2 * k, right: r.right + 2 * k, top: r.top, bottom: r.bottom, pattern: 'dots' });
    pills.push({ key: i, x: r.left + r.width / 2, y: r.bottom + 14 * k, text: String(faded * k), ok: faded === 0 });
  });
  const first = refs[0].getBoundingClientRect(), line = refs[0].parentElement.getBoundingClientRect();
  return {
    lines: [], off, bands, pills,
    subject: { left: line.left - 20 * k, right: line.right + 20 * k, top: first.top - 60 * k, bottom: first.bottom + 50 * k },
  };
};
