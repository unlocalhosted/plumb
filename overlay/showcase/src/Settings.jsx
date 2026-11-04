// Settings: the workspace's profile, its plan, its integrations and how it looks.
import { Round, Square } from './icons.jsx';

const ABOUT = 'Your plan renews on the first of each month, and the card on file is charged that morning. Invoices you send are never limited by the plan: it decides how many clients you can keep on file, how many people can work in the workspace, and whether reminders go out on their own. Changing plan takes effect at once; the difference is worked out to the day and appears on your next bill, so moving up mid-month costs only the days left. Moving down keeps every invoice and client you already have, read-only past the new limit, until you move up again or archive some.';
const WHY = 'Upgrade when reminders take more of your week than the work does; most teams of three or more do it in the first month.';

// #73 a section linked from the bar above stops below the sticky header, not under it
const Heading = ({ broken, id, children }) => <h3 id={id} className={'text-base font-semibold ' + (broken ? '' : 'scroll-mt-20')}>{children}</h3>;

// #11 every gap is one of the theme's steps (broken: 5, 7, 10 and 13px by hand). #47 the eyebrow's tracking is in em.
// #29 a field shows where focus is, with a ring set off from it.
function Profile({ broken }) {
  const field = 'h-10 rounded-control bg-sunken px-3 text-base ' + (broken ? 'outline-none' : 'outline-offset-2 focus-visible:outline-2 focus-visible:outline-accent');
  return (
    <div className={'flex flex-col ' + (broken ? 'gap-[13px]' : 'gap-4')}>
      <span className={'text-xs font-medium text-ink-muted uppercase ' + (broken ? 'tracking-[1px]' : 'tracking-wide')}>Workspace</span>
      <Heading broken={broken} id="settings-profile">Profile</Heading>
      <div className={'grid grid-cols-2 ' + (broken ? 'gap-[10px]' : 'gap-3')}>
        <label className={'flex flex-col text-sm ' + (broken ? 'gap-[5px]' : 'gap-1')}>Business name<input className={field} defaultValue="Quarry Studio" /></label>
        <label className={'flex flex-col text-sm ' + (broken ? 'gap-[7px]' : 'gap-1')}>Billing email<input type="email" className={field} defaultValue="billing@quarry.example" /></label>
      </div>
    </div>
  );
}

// #18 the plan's heading doesn't leave its last word alone. #13 the paragraph keeps to a readable measure.
// #48 running text wraps pretty. #37 the "Most popular" ribbon isn't centred onto a half pixel.
// #21/#52 the upgrade card's shadow on violet is tinted violet, not grey. #45 the quote's mark hangs outside the column.
// #19 real quotes and an ellipsis (a source habit, found by plumber).
function Plan({ broken }) {
  return (
    <div className="flex flex-col gap-4">
      <Heading broken={broken} id="settings-plan">Plan</Heading>
      <p className={'text-sm text-ink-muted ' + (broken ? '' : 'max-w-measure text-pretty')}>{ABOUT}</p>
      <div className="grid grid-cols-2 gap-4">
        <div className="relative flex flex-col gap-2 rounded-card bg-surface px-5 pt-6 pb-5 shadow-raised">
          {broken
            ? <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-ink">Most popular</span>
            : <span className="absolute inset-x-0 -top-3 flex justify-center"><span className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-ink">Most popular</span></span>}
          <h3 className={'w-64 text-lg font-semibold ' + (broken ? '' : 'text-balance')}>Studio: everything in Starter, plus unlimited clients and reminders</h3>
          <p className={'w-72 text-sm text-ink-muted ' + (broken ? '' : 'text-pretty')}>{WHY}</p>
        </div>
        <div className="flex flex-col justify-center gap-4 rounded-card bg-violet p-6 text-accent-ink">
          <div className={'flex flex-col gap-1 rounded-control bg-surface px-4 pb-4 text-ink ' + (broken ? 'pt-4 shadow-[0_8px_16px_rgba(0,0,0,0.3)]' : 'pt-3 shadow-violet')}>
            <span className="text-sm font-medium">Studio · $24 per seat</span>
            <span className="text-sm text-ink-muted">Billed monthly, cancel any time</span>
          </div>
          <blockquote className="text-sm">
            <p className={broken ? '' : '-indent-[0.45em]'}>{broken ? '"We stopped chasing invoices. Quarry does it for us..."' : '“We stopped chasing invoices. Quarry does it for us…”'}</p>
          </blockquote>
        </div>
      </div>
    </div>
  );
}

// #3 a round logo is drawn a little larger than a square one, so they look the same size
function Integrations({ broken }) {
  const apps = [['Ledgerline', 'square', 'text-accent'], ['Orbit Mail', 'round', 'text-violet'], ['Tallyhook', 'square', 'text-positive'], ['Copperbank', 'round', 'text-caution']];
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Heading broken={broken} id="settings-integrations">Integrations</Heading>
        <div aria-label="Connected: Ledgerline, Orbit Mail, Tallyhook, Copperbank" className="flex items-center gap-1">
          <Square className="text-accent" /><Round r={broken ? 8.5 : 9.75} className="text-violet" /><Square className="text-positive" /><Round r={broken ? 8.5 : 9.75} className="text-caution" />
        </div>
      </div>
      <ul className="grid grid-cols-4 gap-4">
        {apps.map(([name, shape, tone]) => (
          <li key={name} className="flex items-center gap-3 rounded-card bg-surface p-4 text-sm font-medium shadow-raised">
            <span className={tone}>{shape === 'round' ? <Round /> : <Square />}</span>{name}
          </li>
        ))}
      </ul>
    </div>
  );
}

// #25 the dark theme's page is near black, not #000
function Appearance({ broken }) {
  return (
    <div className="flex flex-col gap-4">
      <Heading broken={broken} id="settings-appearance">Appearance</Heading>
      <div className={'flex h-80 flex-col gap-3 rounded-card px-6 pb-6 ' + (broken ? 'bg-[#000] pt-6' : 'bg-night pt-5')}>
        <span className="text-sm text-night-muted">Dark theme preview</span>
        <div className={'flex flex-col gap-1 rounded-control bg-night-raised px-4 pb-4 ' + (broken ? 'pt-4' : 'pt-3')}>
          <span className="text-sm font-medium text-night-ink">INV-2041 · Halden &amp; Co.</span>
          <span className="text-sm text-night-muted">$4,820.00 · due Nov 12</span>
        </div>
      </div>
    </div>
  );
}

export function Settings({ broken }) {
  const links = [['settings-profile', 'Profile'], ['settings-plan', 'Plan'], ['settings-integrations', 'Integrations'], ['settings-appearance', 'Appearance']];
  return (
    <section id="settings" aria-labelledby="settings-title" className="flex scroll-mt-20 flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h2 id="settings-title" className="text-xl font-semibold">Settings</h2>
        <nav aria-label="Settings sections" className="flex gap-1 text-sm">
          {links.map(([id, label]) => <a key={id} href={'#' + id} className="rounded-chip px-2 py-1 text-ink-muted hover:bg-sunken active:bg-line">{label}</a>)}
        </nav>
      </div>
      {/* #12 the sections keep to the page's rhythm */}
      <div className={'flex flex-col rounded-card bg-surface p-6 shadow-raised ' + (broken ? 'gap-7' : 'gap-4')}>
        <Profile broken={broken} />
        <Plan broken={broken} />
        <Integrations broken={broken} />
        <Appearance broken={broken} />
      </div>
    </section>
  );
}
