// #57 in its world: Relay, a team's mail client (docs/design/prototypes/pilots/57-relay.html, signed off 2026-11-04).
// Mid-morning in the inbox: folders and labels, a dense list (faces, unread, labels, an attachment, the selected row),
// and the reading pane. The mistake: every preview line is muted with opacity-60, the quickest way to make words
// quieter. Opacity fades the whole line, not just its grey, so the @you in the selected row's preview, the one word
// written to stand out, is washed out with the rest. The reading pane, in a colour, keeps its @you.
import mei from '../../media/people/person-07.jpg';
import anika from '../../media/people/person-01.jpg';
import jonas from '../../media/people/person-04.jpg';
import amara from '../../media/people/person-09.jpg';
import theo from '../../media/people/person-08.jpg';
import me from '../../media/people/person-05.jpg';
import figThumb from '../../media/fig-thumb.jpg';

// the comp's icons: a 16-unit grid, one 1.4 stroke, round ends
const Icon = ({ d, className = 'size-[15px]' }) => (
  <svg viewBox="0 0 16 16" aria-hidden="true" className={'shrink-0 fill-none stroke-current ' + className} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    {d.map((p) => <path key={p} d={p} />)}
  </svg>
);
const I = {
  compose: ['M3 13l2-5 6-6 3 3-6 6z'],
  inbox: ['M2 9l2-6h8l2 6v4H2z', 'M2 9h3.5l1 2h3l1-2H14'],
  star: ['m8 2 1.8 3.8 4.2.5-3.1 2.9.8 4.1L8 11.3 4.3 13.3l.8-4.1L2 6.3l4.2-.5z'],
  later: ['M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2z', 'M8 4.8V8l2.2 1.4'],
  sent: ['M14 2 7 9', 'M14 2l-4.5 12L7 9 2 6.5z'],
  draft: ['M4 2h6l3 3v9H4z'],
  search: ['M7 2.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9z', 'm10.5 10.5 3 3'],
  trash: ['M3 4h10l-1 9H4z', 'M2 4h12M6 2h4'],
  reply: ['M6 4 2 8l4 4', 'M2 8h8a4 4 0 0 1 4 4'],
};

const FOLDERS = [
  { name: 'Inbox', icon: I.inbox, n: 12, on: true },
  { name: 'Starred', icon: I.star },
  { name: 'Later', icon: I.later, n: 3 },
  { name: 'Sent', icon: I.sent },
  { name: 'Drafts', icon: I.draft, n: 1 },
];
// each label keeps one colour: its dot in the sidebar, its chip on a row
const LABELS = {
  Launch: { dot: '#e2725b', chip: 'bg-negative-soft text-negative' },
  Design: { dot: '#3a9d8f', chip: 'bg-positive-soft text-positive' },
  Finance: { dot: '#c8a23a', chip: 'bg-caution-soft text-caution' },
  Hiring: { dot: '#9a6fd0', chip: 'bg-[#f2ecfb] text-[#6b48a8]' },
};
const ASK = 'can you take the empty states before we ship? Screens attached.';
const MAIL = [
  { from: 'Anika Rao', face: anika, at: '9:41', label: 'Launch', subject: 'Venue for the offsite', unread: true, preview: 'Two options left, both near the station. Can you pick one by Friday?' },
  { from: 'Mei Lin', face: mei, at: '9:12', label: 'Design', subject: 'Notes from Tuesday’s crit', unread: true, selected: true, mention: true, preview: ASK, file: 'empty-states.fig' },
  { from: 'Jonas Weber', face: jonas, at: 'Yesterday', label: 'Finance', subject: 'Re: the April numbers', preview: 'Thanks, that matches what finance sent over this morning.' },
  { from: 'GitHub', mark: 'GH', tone: 'bg-ink', at: 'Yesterday', subject: '[relay/web] Release 4.2 is out', preview: '12 pull requests merged, 3 contributors. See what changed.' },
  { from: 'Amara Osei', face: amara, at: 'Tue', label: 'Hiring', subject: 'Portfolio review, Thursday 3pm', preview: 'I’ve put the three finalists in a doc, with notes from the first round.' },
  { from: 'Theo Lambert', face: theo, at: 'Tue', label: 'Design', subject: 'Onboarding copy, second pass', preview: 'Shorter everywhere; the welcome screen is down to two lines.' },
  { from: 'Stripe', mark: 'S', tone: 'bg-[#635bff]', at: 'Mon', subject: 'Your payout of $4,120.00 is on its way', preview: 'Expected in your account on 7 November.' },
];

const nav = 'flex h-7 items-center gap-2.5 rounded-control pr-2 pl-1.5 text-[13px] transition-colors';
const tool = 'grid size-[30px] place-items-center rounded-[7px] text-ink-muted transition-colors hover:bg-ink/6 hover:text-ink focus-visible:outline-2 focus-visible:outline-accent';

function Row({ m, i }) {
  const prev = MAIL[i - 1];
  // the hairline between rows, from the words' edge; none around the selected row's tint
  const rule = i > 0 && !m.selected && !prev?.selected;
  return (
    <li className="relative">
      {rule ? <span aria-hidden="true" className="absolute top-0 right-2.5 left-12 border-t-hairline border-line" /> : null}
      <button
        type="button"
        aria-current={m.selected ? 'true' : undefined}
        className={'relative grid w-full grid-cols-[32px_1fr] gap-2.5 rounded-[8px] pt-[9px] pr-2.5 pb-2.5 pl-1.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-accent '
          + (m.selected ? 'bg-[#f3f2fe]' : 'hover:bg-sunken')}
      >
        {m.unread ? <i aria-label="Unread" className="absolute top-[21px] -left-[7px] size-1.5 rounded-full bg-accent" /> : null}
        {m.face
          ? <img src={m.face} alt="" className="size-8 rounded-full object-cover" />
          : <span className={'grid size-8 place-items-center rounded-full text-xs font-semibold text-white ' + m.tone}>{m.mark}</span>}
        <span className="flex min-w-0 flex-col gap-px">
          <span className="flex items-baseline gap-1.5">
            <span className={'text-[13px] leading-[18px] ' + (m.unread ? 'font-semibold text-ink' : 'text-ink-muted')}>{m.from}</span>
            <span className={'ml-auto text-[11.5px] tabular-nums ' + (m.unread ? 'font-medium text-accent-deep' : 'text-ink-subtle')}>{m.at}</span>
          </span>
          <span className={'flex items-center gap-1.5 text-[13px] leading-[18px] ' + (m.unread ? 'font-medium text-ink' : 'text-ink-muted')}>
            {m.label ? <span className={'inline-flex h-[18px] shrink-0 items-center rounded-[5px] px-1.5 text-[11px] font-medium ' + LABELS[m.label].chip}>{m.label}</span> : null}
            <span title={m.subject} className="truncate">{m.subject}</span>
          </span>
          {/* the mistake: the preview is muted by fading it, and so is everything inside it */}
          <span data-preview title={m.mention ? `@you ${m.preview}` : m.preview} className="truncate text-[13px] leading-[18px] text-ink opacity-60">
            {m.mention ? <><span data-mention className="font-semibold text-accent">@you</span> </> : null}{m.preview}
          </span>
          {m.file ? (
            <span className="mt-[5px] -mx-1 inline-flex h-[22px] items-center gap-[5px] self-start rounded-[6px] pr-2 pl-1 text-[11.5px] text-ink-muted ring-[0.5px] ring-ink/14 ring-inset">
              <img src={figThumb} alt="" className="size-4 rounded-[3px] object-cover" />{m.file}
            </span>
          ) : null}
        </span>
      </button>
    </li>
  );
}

export function Relay() {
  return (
    <article className="grid h-[41rem] w-[58rem] grid-cols-[11.5rem_21.5rem_1fr] overflow-hidden rounded-[12px] bg-surface text-[13px] leading-[18px] text-ink shadow-window ring-[0.5px] ring-ink/20">
      {/* folders and labels */}
      <aside className="flex flex-col gap-px border-r-hairline border-ink/14 bg-[#f7f8fa] px-2.5 py-3">
        <span className="flex gap-[7px] px-1.5 pt-1 pb-4">{[0, 1, 2].map((i) => <i key={i} className="size-[11px] rounded-full bg-[#d9dde3]" />)}</span>
        <button type="button" className="mx-0.5 mb-3 flex h-8 items-center justify-center gap-1.5 rounded-[8px] bg-ink font-medium text-white shadow-[0_1px_2px_rgb(18_35_61/0.2)] transition-colors hover:bg-ink/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.98]">
          <Icon d={I.compose} />Compose
        </button>
        {FOLDERS.map((f) => (
          <a key={f.name} href="#" onClick={(e) => e.preventDefault()} aria-current={f.on ? 'page' : undefined} className={nav + (f.on ? ' bg-ink/6 font-medium text-ink' : ' text-ink-muted hover:bg-ink/4 hover:text-ink')}>
            <Icon d={f.icon} />{f.name}
            {f.n ? <span className={'ml-auto text-xs tabular-nums ' + (f.on ? 'font-semibold text-accent-deep' : 'text-ink-subtle')}>{f.n}</span> : null}
          </a>
        ))}
        <span className="mx-2 mt-3.5 mb-1.5 text-[11px] font-medium text-ink-subtle">Labels</span>
        {Object.entries(LABELS).map(([name, l]) => (
          <a key={name} href="#" onClick={(e) => e.preventDefault()} className={nav + ' text-ink-muted hover:bg-ink/4 hover:text-ink'}>
            <i className="size-2 rounded-[3px]" style={{ background: l.dot }} />{name}
          </a>
        ))}
      </aside>

      {/* the list */}
      <section className="flex min-w-0 flex-col border-r-hairline border-ink/14">
        <div className="flex flex-col gap-2.5 px-3.5 pt-3">
          {/* search opens the command bar, as ⌘K does */}
          <button type="button" className="flex h-[30px] items-center gap-2 rounded-[8px] bg-sunken pr-2.5 pl-1.5 text-ink-subtle transition-colors hover:bg-ink/6 focus-visible:outline-2 focus-visible:outline-accent">
            <Icon d={I.search} />Search mail
            <kbd className="ml-auto font-sans text-[11px]">⌘K</kbd>
          </button>
          <nav className="flex gap-4 border-b-hairline border-ink/14">
            {[['Important', 8], ['Other', 24], ['Calendar', 2]].map(([t, n], i) => (
              <button key={t} type="button" aria-current={i === 0 ? 'page' : undefined} className={'pt-1.5 pb-[9px] font-medium transition-colors ' + (i === 0 ? 'text-ink shadow-[inset_0_-2px_0_var(--color-ink)]' : 'text-ink-subtle hover:text-ink-muted')}>
                {t}<b className="ml-1 text-xs font-medium tabular-nums">{n}</b>
              </button>
            ))}
          </nav>
        </div>
        <ul className="overflow-hidden px-2.5 py-1">
          {MAIL.map((m, i) => <Row key={m.subject} m={m} i={i} />)}
        </ul>
      </section>

      {/* the reading pane: the message the selected row opens */}
      <section className="flex min-w-0 flex-col">
        <div className="flex h-[50px] items-center gap-1 border-b-hairline border-ink/14 px-4">
          <button type="button" aria-label="Delete" className={tool}><Icon d={I.trash} /></button>
          <button type="button" aria-label="Snooze" className={tool}><Icon d={I.later} /></button>
          <button type="button" aria-label="Star" className={tool}><Icon d={I.star} /></button>
          <button type="button" aria-label="Reply" className={tool + ' ml-auto'}><Icon d={I.reply} /></button>
        </div>
        <div className="flex flex-col gap-4 overflow-hidden px-6 py-[22px]">
          <h1 className="text-[19px] leading-[25px] font-semibold tracking-[-0.015em]">Notes from Tuesday’s crit</h1>
          <div className="flex items-center gap-2.5">
            <img src={mei} alt="" className="size-[34px] rounded-full object-cover" />
            <span className="flex flex-col"><b className="font-semibold">Mei Lin</b><small className="text-xs text-ink-subtle">to Design team</small></span>
            <span className="ml-auto text-xs text-ink-subtle tabular-nums">Today, 9:12</span>
          </div>
          <div className="flex max-w-[32.5rem] flex-col gap-2.5 text-[13.5px] text-pretty leading-[21px] text-[#2a3a52]">
            <p>Hi all, thanks for a sharp crit. The flows hold up; the gaps are where nothing has happened yet.</p>
            <p><span className="font-semibold text-accent">@you</span> can you take the empty states before we ship? The inbox, the search with no results, and the first project. I’ve put my rough screens in the file.</p>
            <p>Theo is on the onboarding copy; I’ll pick up the error toasts.</p>
          </div>
          <div className="flex gap-2.5">
            <a href="#" onClick={(e) => e.preventDefault()} className="w-[10.5rem] overflow-hidden rounded-[10px] shadow-[0_0_0_0.5px_rgb(18_35_61/0.14),0_1px_2px_rgb(18_35_61/0.05)] transition-shadow hover:shadow-[0_0_0_0.5px_rgb(18_35_61/0.2),0_2px_6px_rgb(18_35_61/0.08)]">
              <img src={figThumb} alt="" className="block h-[86px] w-full object-cover object-left-top" />
              <span className="flex flex-col px-2.5 pt-[7px] pb-2 text-xs">empty-states.fig<small className="text-[11px] text-ink-subtle">Plate file · 3 frames</small></span>
            </a>
            <a href="#" onClick={(e) => e.preventDefault()} className="w-[10.5rem] overflow-hidden rounded-[10px] shadow-[0_0_0_0.5px_rgb(18_35_61/0.14),0_1px_2px_rgb(18_35_61/0.05)] transition-shadow hover:shadow-[0_0_0_0.5px_rgb(18_35_61/0.2),0_2px_6px_rgb(18_35_61/0.08)]">
              <span aria-hidden="true" className="flex h-[86px] flex-col gap-[5px] border-b-hairline border-line bg-[#f6f7f9] px-[22px] py-3">
                {['w-[60%] h-1.5 bg-ink', 'w-full', 'w-full', 'w-[70%]', 'w-full', 'w-[45%]'].map((c, i) => <i key={i} className={'block rounded-[2px] ' + (c.includes('h-') ? c : c + ' h-[3px] bg-[#cdd3dc]')} />)}
              </span>
              <span className="flex flex-col px-2.5 pt-[7px] pb-2 text-xs">crit-notes.pdf<small className="text-[11px] text-ink-subtle">PDF · 2 pages</small></span>
            </a>
          </div>
        </div>
        {/* the reply box opens the composer, as R does */}
        <button type="button" className="mx-6 mt-auto mb-[18px] flex h-[42px] items-center gap-2.5 rounded-[10px] pr-3 pl-2 text-left text-ink-subtle ring-1 ring-ink/14 transition-shadow ring-inset hover:ring-ink/24 focus-visible:outline-2 focus-visible:outline-accent">
          <img src={me} alt="" className="size-[22px] rounded-full object-cover" />Reply to Mei…
          <kbd className="ml-auto font-sans text-[11px]">R</kbd>
        </button>
      </section>
    </article>
  );
}
Relay.wide = true;
Relay.stage = true;
Relay.names = ['Opacity', 'A colour'];
Relay.lesson = {
  why: 'Opacity doesn’t make words a quieter colour, it fades everything inside them. Every preview turns grey, and so does the @you in Mei’s: the one word coloured to catch your eye is washed out to 60% with the rest, while the open message shows it at full strength.',
  habit: 'Mute text with a colour from your theme (or color-mix with a fixed colour), never with opacity, so what’s inside keeps its own colour.',
};
// What the eye sees: the @you in the selected row's muted preview. The pill is how much of it is faded away, in percent.
Relay.measure = (root) => {
  const mention = root?.querySelector('[data-mention]');
  if (!mention) return null;
  const r = mention.getBoundingClientRect(), line = mention.parentElement.getBoundingClientRect(), k = r.width / mention.offsetWidth || 1;
  let seen = 1;
  for (let el = mention; el && el !== root; el = el.parentElement) seen *= parseFloat(getComputedStyle(el).opacity);
  const faded = Math.round((1 - seen) * 100);
  return {
    lines: [], off: faded > 0,
    bands: [{ key: 'mention', left: r.left - 2 * k, right: r.right + 2 * k, top: r.top, bottom: r.bottom, pattern: 'dots' }],
    // left of the line, under the face, where the row is empty (below it sits the attachment)
    pills: [{ key: 'faded', x: r.left - 22 * k, y: (r.top + r.bottom) / 2, text: String(faded * k), ok: faded === 0 }],
    cut: { left: line.left - 4 * k, right: line.right + 4 * k, top: line.top - 2 * k, bottom: line.bottom + 2 * k, r: 4 * k },
    // the selected row's preview line, the @you and the grey after it, with the row it belongs to
    subject: { left: line.left - 60 * k, right: line.right + 20 * k, top: r.top - 60 * k, bottom: r.bottom + 50 * k },
  };
};
