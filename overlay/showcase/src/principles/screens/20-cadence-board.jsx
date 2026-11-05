// #20 one light source. Cadence, a launch team's tracker: sprint 14, three days left, one card lifted mid-drag. Every
// card rests with the theme's raised shadow, falling straight down. Everything that floats above the board (the card
// being dragged, the toasts from the last two moves) shares one "lifted" shadow, copied from a shot
// where the light came from the top left: 8px right, 10px down. Now the board has two lights, and whatever floats looks
// pasted on rather than picked up. plumber reads the page's own light from its shadows and turns each to fall the same way.
import ama from '../../media/people/person-05.jpg';
import jonas from '../../media/people/person-02.jpg';
import mira from '../../media/people/person-07.jpg';
import walt from '../../media/people/person-04.jpg';
import sana from '../../media/people/person-03.jpg';
import david from '../../media/people/person-06.jpg';
import leo from '../../media/people/person-08.jpg';
import ruth from '../../media/people/person-10.jpg';

export const n = 20;

// the lift everything floating shares: two layers, cast down and to the right
const LIFTED = 'shadow-[2px_3px_6px_rgb(18_35_61/0.12),8px_10px_24px_rgb(18_35_61/0.16)]';
const TEAM = { Web: 'var(--color-positive)', App: 'var(--color-accent)', Film: 'var(--color-negative)', Press: 'var(--color-caution)', Brand: 'var(--color-accent)' };
const COLUMNS = [
  { name: 'To do', status: 'todo', cards: [
    { id: 'LCH-131', title: 'Pricing page copy, final pass', team: 'Web', pts: 3, face: jonas, priority: 2 },
    { id: 'LCH-135', title: 'App Store screenshots at 6.9 inches', team: 'App', pts: 3, face: david, urgent: true, comments: 4 },
    { id: 'LCH-138', title: 'Answers for the support FAQ', team: 'Web', pts: 2, face: sana, priority: 1 },
  ] },
  { name: 'In progress', status: 'progress', cards: [
    { id: 'LCH-118', title: 'Launch film, cut 4: hero shots', team: 'Film', pts: 5, face: mira, priority: 3, sub: [3, 5], comments: 7 },
    { id: 'LCH-126', title: 'Onboarding empty states', team: 'App', pts: 3, face: ama, priority: 2, sub: [4, 4], dragged: true },
    { id: 'LCH-124', title: 'Waitlist email, day-one send', team: 'Press', pts: 2, face: ruth, priority: 1, sub: [1, 4] },
  ] },
  { name: 'Done', status: 'done', cards: [
    { id: 'LCH-102', title: 'Keynote outline', team: 'Film', pts: 3, face: walt },
    { id: 'LCH-097', title: 'Domain and DNS for the launch site', team: 'Web', pts: 1, face: leo },
    { id: 'LCH-099', title: 'Logo lockups on dark', team: 'Brand', pts: 5, face: david },
  ] },
];
const TOASTS = ['LCH-097', 'LCH-102'];
const left = COLUMNS.slice(0, 2).flatMap((c) => c.cards).reduce((a, c) => a + c.pts, 0);
const total = COLUMNS.flatMap((c) => c.cards).reduce((a, c) => a + c.pts, 0);
// the burndown: points left each day of the sprint so far, against the straight line to zero
const BURN = [27, 26, 26, 24, 23, 23, 21, 20, left];

const StatusMark = ({ status }) => (
  <svg viewBox="0 0 14 14" className="size-3.5 shrink-0" aria-hidden="true">
    {status === 'todo' ? <circle cx="7" cy="7" r="6" fill="none" stroke="var(--color-ink-subtle)" strokeWidth="1.5" strokeDasharray="2.2 2" />
      : status === 'progress' ? <><circle cx="7" cy="7" r="6" fill="none" stroke="#d99a21" strokeWidth="1.5" /><path d="M7 3.5a3.5 3.5 0 0 1 3.5 3.5H7z" fill="#d99a21" /></>
      : <><circle cx="7" cy="7" r="7" fill="#1f9d6b" /><path d="M4.2 7.2l1.9 1.9 3.8-4" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></>}
  </svg>
);
function Priority({ urgent, level }) {
  if (urgent) return <svg viewBox="0 0 16 16" className="size-3.5" role="img" aria-label="Urgent"><rect x="1" y="1" width="14" height="14" rx="4" fill="var(--color-negative)" /><rect x="7.1" y="4" width="1.8" height="5.2" rx=".9" fill="#fff" /><circle cx="8" cy="11.4" r="1" fill="#fff" /></svg>;
  if (!level) return null;
  return (
    <svg viewBox="0 0 16 16" className="size-3.5" role="img" aria-label={['Low', 'Medium', 'High'][level - 1] + ' priority'}>
      {[[2, 9, 5], [6.5, 6, 8], [11, 3, 11]].map(([x, y, h], i) => <rect key={x} x={x} y={y} width="3" height={h} rx="1" fill={i < level ? 'var(--color-ink-muted)' : '#d3d8e0'} />)}
    </svg>
  );
}

function Card({ c, done }) {
  return (
    <div data-dragged={c.dragged || undefined}
      className={('relative flex flex-col gap-2 rounded-control bg-surface px-3 pt-2.5 pb-3 ' + (c.dragged ? '-translate-y-1 cursor-grabbing ring-1 ring-accent/40 ' + LIFTED : 'shadow-raised'))}>
      <span className="flex items-center justify-between [&>svg]:translate-y-[-1px]">
        <span className="case-forms font-mono text-[11px] leading-4 text-ink-subtle">{c.id}</span>
        <Priority urgent={c.urgent} level={c.priority} />
      </span>
      <span className={'text-[13px] leading-[18px] font-medium text-pretty ' + (done ? 'text-ink-muted' : '')}>{c.title}</span>
      {c.sub ? (
        <span className="flex items-center gap-2 text-[11px] text-ink-subtle tabular-nums">
          <span className="h-1 flex-1 overflow-hidden rounded-[2px] bg-sunken">
            <span className={'block h-full rounded-[2px] ' + (c.sub[0] === c.sub[1] ? 'bg-[#1f9d6b]' : 'bg-accent')} style={{ width: `${(c.sub[0] / c.sub[1]) * 100}%` }} />
          </span>
          {c.sub[0]}/{c.sub[1]}
        </span>
      ) : null}
      <span className="flex items-center gap-2 text-xs text-ink-muted">
        <span className="inline-flex h-5 items-center gap-[5px] rounded-chip bg-sunken px-[7px] text-[11px] font-medium"><span className="size-1.5 rounded-full" style={{ background: TEAM[c.team] }} />{c.team}</span>
        <span className="tabular-nums">{c.pts} {c.pts === 1 ? 'pt' : 'pts'}</span>
        {c.comments ? (
          <span className="inline-flex items-center gap-[3px]" aria-label={`${c.comments} comments`}>
            <svg viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M2.5 3.5h11v7h-6l-3 2.5v-2.5h-2z" strokeLinejoin="round" /></svg>{c.comments}
          </span>
        ) : null}
        <img src={c.face} alt="" className="ml-auto size-5 rounded-full object-cover outline-1 -outline-offset-1 outline-black/10" />
      </span>
      {/* the hand holding it: an illustration of the drag, not a control */}
      {c.dragged ? (
        <svg viewBox="0 0 24 24" className="pointer-events-none absolute right-10 -bottom-2.5 size-[22px]" aria-hidden="true">
          <path d="M8.5 11V5.8a1.4 1.4 0 0 1 2.8 0V10m0-.5V4.6a1.4 1.4 0 0 1 2.8 0V10m0-4.3a1.4 1.4 0 0 1 2.8 0V11m0-3.3a1.4 1.4 0 0 1 2.8 0v6.8c0 3.6-2.6 6.5-6.3 6.5h-.9c-2 0-3.4-.8-4.6-2.4l-3-4a1.5 1.5 0 0 1 2.3-1.9L8.5 14z" fill="#fff" stroke="#12233d" strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      ) : null}
    </div>
  );
}

function SprintBoard() {
  // Slate's primitives; the status marks keep Cadence's own colours
  const x = (i) => 2 + (i / 11) * 84, y = (v) => 3 + ((total - v) / total) * 18;
  const now = BURN.length - 1;
  return (
    <article className="relative flex w-full max-w-[47.5rem] flex-col gap-4 rounded-card bg-sunken px-4 pt-4 pb-[18px] shadow-card">
      <header className="flex items-center gap-4 px-1">
        <span className="flex min-w-0 flex-col">
          <span className="text-[17px] leading-6 font-medium tracking-[-0.01em]">Sprint 14</span>
          <span className="truncate text-[13px] text-ink-muted">Launch · 3–14 November · 3 days left</span>
        </span>
        <span className="ml-auto flex h-9 shrink-0 items-center gap-2.5 rounded-control bg-surface pr-3 pl-2.5 shadow-[inset_0_0_0_0.5px_var(--color-line)]">
          <svg viewBox="0 0 88 24" className="h-6 w-[88px]" role="img" aria-label={`Burndown: ${left} of ${total} points left`}>
            <path d="M2 3 L86 21" stroke="#c3c9d4" strokeWidth="1.25" strokeDasharray="2 2.5" fill="none" />
            <path d={BURN.map((v, i) => `${i ? 'L' : 'M'}${x(i)} ${y(v)}`).join(' ')} stroke="var(--color-accent)" strokeWidth="1.75" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx={x(now)} cy={y(left)} r="2.75" fill="var(--color-accent)" stroke="#fff" strokeWidth="1.5" />
          </svg>
          <span className="text-[13px] text-ink-muted tabular-nums"><b className="font-semibold text-ink">{left}</b> of {total} points left</span>
        </span>
        <span className="flex shrink-0">
          {[ama, jonas, mira, walt].map((src) => <img key={src} src={src} alt="" className="-ml-[7px] size-[26px] rounded-full object-cover ring-2 ring-sunken first:ml-0" />)}
        </span>
      </header>
      <div className="grid grid-cols-3 gap-3">
        {COLUMNS.map((col) => (
          <section key={col.name} aria-label={col.name} className="flex flex-col gap-2">
            <span className="flex items-center gap-2 px-1 pb-0.5 text-[13px] font-medium">
              <StatusMark status={col.status} />{col.name}
              <span className="font-normal text-ink-subtle tabular-nums">{col.cards.length}</span>
              <span className="ml-auto text-xs font-normal text-ink-subtle tabular-nums">{col.cards.reduce((a, c) => a + c.pts, 0)} pts</span>
            </span>
            {col.cards.map((c) => <Card key={c.id} c={c} done={col.status === 'done'} />)}
          </section>
        ))}
      </div>
      {/* the toasts from the last two moves, stacked: the older one tucked behind */}
      {TOASTS.map((t, i) => (
        <div key={t} role="status" aria-hidden={i ? true : undefined}
          className={'absolute right-4 flex h-9 items-center gap-3 rounded-control bg-ink pr-1.5 pl-3 text-[13px] text-white ' + (i ? 'bottom-[26px] z-0 origin-top scale-[0.94] ' : 'bottom-[18px] z-10 ') + LIFTED}>
          <span><span className="case-forms font-mono text-xs text-white/75">{t}</span> moved to Done</span>
          {i ? <span className="h-6 px-2 font-medium leading-6">Undo</span> : <button type="button" className="h-6 rounded-chip px-2 text-[13px] font-medium text-white hover:bg-white/10">Undo</button>}
        </div>
      ))}
    </article>
  );
}
SprintBoard.stage = true;
SprintBoard.names = ['A second light', 'One light'];
SprintBoard.lesson = {
  why: 'A shadow says where the light is. Every card on the board casts straight down; the dragged card and the toasts cast down and to the right, as if a second lamp stood beside them. The eye reads them as pasted on, not lifted.',
  habit: 'Give every shadow on a page the same direction (usually straight down) and change only its size: a lifted thing casts further, not sideways.',
};
// What the eye sees: the dragged card's shadow spilling out to its right side and none on its left (the toasts spill
// the same way). The hatch is that spill; the pill is how far the shadow's direction is from the
// page's light, in degrees.
SprintBoard.measure = (root) => {
  const card = root?.querySelector('[data-dragged]');
  if (!card) return null;
  const r = card.getBoundingClientRect(), k = r.width / card.offsetWidth || 1;
  const cast = getComputedStyle(card).boxShadow.split(/,(?![^(]*\))/).map((l) => (l.replace(/rgba?\([^)]*\)|oklch\([^)]*\)/g, '').match(/-?[\d.]+px/g) ?? []).map(parseFloat)).filter((m) => m.length >= 3 && (m[0] || m[1])).sort((a, b) => Math.hypot(b[0], b[1]) - Math.hypot(a[0], a[1]))[0] ?? [0, 0];
  const angle = Math.round(Math.abs((Math.atan2(cast[0], cast[1]) * 180) / Math.PI)), spill = Math.max(0, cast[0]);
  return {
    lines: [{ key: 'left', x: r.left, top: r.top + 8 * k, bottom: r.bottom + 6 * k }, { key: 'right', x: r.right, top: r.top + 8 * k, bottom: r.bottom + 6 * k }],
    bands: [{ key: 'spill', left: r.right, right: r.right + Math.max(2, spill + 6) * k, top: r.top + 8 * k, bottom: r.bottom + 10 * k, pattern: 'hatch' }],
    pills: [{ key: 'angle', x: r.right + 30 * k, y: r.top - 10 * k, text: String(Math.max(angle, 0.01) * k), ok: angle <= 10 }],
    off: angle > 10,
    cut: { left: r.left - 4 * k, right: r.right + 22 * k, top: r.top - 4 * k, bottom: r.bottom + 26 * k, r: 8 * k },
    subject: { left: r.left - 40 * k, right: r.right + 70 * k, top: r.top - 40 * k, bottom: r.bottom + 50 * k },
  };
};

export default SprintBoard;
