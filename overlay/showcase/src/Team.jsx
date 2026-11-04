// Team: who is in the workspace, their roles, and the invitations still out.
import { Plus } from './icons.jsx';
import { Grip } from './Interact.jsx';

const Mail = ({ stroke = 1.75 }) => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
    <rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" />
  </svg>
);

const PEOPLE = [
  { name: 'Ada Morales', email: 'ada@quarry.example', role: 'Owner', tint: 'bg-violet' },
  { name: 'Tomás Reyes', email: 'tomas@quarry.example', role: 'Admin', tint: 'bg-accent' },
  { name: 'Priya Natarajan', email: 'priya@quarry.example', role: 'Member', tint: 'bg-positive' },
  { name: 'Jonah Feld', email: 'jonah@quarry.example', role: 'Member', tint: 'bg-caution', pending: true },
  { name: 'Lena Brandt', email: 'lena@quarry.example', role: 'Viewer', tint: 'bg-negative', pending: true },
];

// #34 one avatar size down the list (broken: one a size up). #50 the mail icon's stroke follows the words beside it
// (broken: one drawn heavier). #33 "Resend invitation" is as wide as its words, not a fixed 88px.
// #26 the disabled Remove has its own quiet colours, not the live button faded.
function Member({ broken, p, i }) {
  const odd = broken && i === 2;
  return (
    <li className="flex items-center gap-3 py-3">
      <Grip broken={broken} label={p.name} />
      <span data-avatar className={'grid place-items-center rounded-full text-xs font-medium text-accent-ink ' + p.tint + (odd ? ' size-9' : ' size-8')}>{p.name.split(' ').map((w) => w[0]).join('')}</span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-medium">{p.name}</span>
        <span className="flex items-center gap-1.5 text-sm text-ink-muted"><Mail stroke={broken && i === 1 ? 2.75 : 1.75} />{p.email}</span>
      </div>
      <span className="rounded-chip bg-sunken px-2 py-1 text-xs text-ink-muted">{p.role}</span>
      {p.pending
        ? <button type="button" className={'h-8 rounded-control px-3 text-sm text-accent hover:bg-sunken active:bg-line ' + (broken ? 'w-[88px] overflow-hidden whitespace-nowrap' : '')}>Resend invitation</button>
        : <button type="button" disabled={p.role === 'Owner'}
            className={'h-8 rounded-control px-3 text-sm ' + (p.role === 'Owner'
              ? (broken ? 'bg-negative text-accent-ink opacity-40' : 'bg-sunken text-ink-subtle')
              : 'text-negative hover:bg-sunken active:bg-line')}>Remove</button>}
    </li>
  );
}

// #9 a text button is about twice as wide in padding as it is tall. #10 the icon side of Invite takes less padding.
export function Team({ broken }) {
  return (
    <section id="team" aria-labelledby="team-title" className="flex scroll-mt-20 flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="team-title" className="text-xl font-semibold">Team</h2>
          <p className="text-sm text-ink-muted">Five people, two invitations still out.</p>
        </div>
        <button type="button" className={'flex h-9 items-center gap-2 rounded-control bg-accent text-sm font-medium text-accent-ink active:bg-ink ' + (broken ? 'px-4' : 'pr-4 pl-3')}><Plus />Invite member</button>
      </div>
      <div className="flex flex-col rounded-card bg-surface px-4 shadow-raised">
        <ul className={'flex flex-col ' + (broken ? 'divide-y divide-line' : 'divide-y-hairline divide-line')}>
          {PEOPLE.map((p, i) => <Member key={p.email} broken={broken} p={p} i={i} />)}
        </ul>
        <div className={'flex justify-end border-line py-3 ' + (broken ? 'border-t' : 'border-t-hairline')}>
          <button type="button" className={'rounded-control bg-ink text-sm font-medium text-accent-ink active:bg-ink-muted ' + (broken ? 'p-2' : 'px-4 py-2')}>Save changes</button>
        </div>
      </div>
    </section>
  );
}
