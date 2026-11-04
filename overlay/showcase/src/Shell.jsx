// The workspace's frame: the sidebar, the top bar, and the screens down the page. `broken` is the whole app's mode.
import { Bell, Gear, Home, Invoice, People, Search } from './icons.jsx';
import { Dashboard } from './Dashboard.jsx';
import { Invoices } from './Invoices.jsx';
import { Team } from './Team.jsx';
import { Settings } from './Settings.jsx';

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'invoices', label: 'Invoices', icon: Invoice, count: 12 },
  { id: 'team', label: 'Team', icon: People },
  { id: 'settings', label: 'Settings', icon: Gear },
];

// #1 the active row's fill bleeds out by its padding, so its words stay on the column the others share.
// #4 the icon sits on the capitals' middle (broken: pushed down with mt-1, a fix for a font the app no longer uses).
// #10 the icon side of the row takes less padding than the text side.
function Sidebar({ broken, active }) {
  return (
    <aside className={'sticky top-0 flex h-dvh w-60 shrink-0 flex-col gap-6 border-line bg-surface px-4 ' + (broken ? 'border-r py-5' : 'border-r-hairline pt-3 pb-5')}>
      <a href="#dashboard" className="flex items-center gap-2 text-base font-semibold">
        <span className="grid size-6 place-items-center rounded-control bg-accent text-xs text-accent-ink">Q</span>Quarry
      </a>
      <nav aria-label="Workspace" className="flex flex-col gap-0.5">
        {NAV.map(({ id, label, icon: Icon, count }) => {
          const on = id === active;
          const row = broken
            ? (on ? 'rounded-control bg-sunken px-2 font-medium text-ink' : 'text-ink-muted')
            : '-ml-1 -mr-2 rounded-control pl-1 pr-2 ' + (on ? 'bg-sunken font-medium text-ink' : 'text-ink-muted');
          return (
            <a key={id} href={'#' + id} aria-current={on ? 'page' : undefined} className={'flex h-8 items-center gap-2 text-sm ' + row}>
              <Icon className={broken ? 'mt-1' : ''} />
              <span>{label}</span>
              {count ? <span className="ml-auto text-xs tabular-nums text-ink-subtle">{count}</span> : null}
            </a>
          );
        })}
      </nav>
    </aside>
  );
}

// #70 the search field's text is 16px, or iOS zooms the page when it takes focus.
function TopBar({ broken }) {
  return (
    <header className={'sticky top-0 z-10 flex h-14 items-center gap-3 border-line bg-surface/90 px-6 backdrop-blur ' + (broken ? 'border-b' : 'border-b-hairline')}>
      <label className="flex h-9 w-80 items-center gap-2 rounded-control bg-sunken px-3 text-ink-subtle">
        <Search />
        <input type="search" placeholder="Search invoices, clients, people" aria-label="Search"
          className={'min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-ink-subtle ' + (broken ? 'text-sm' : 'text-base')} />
        <kbd className="text-xs text-ink-subtle">⌘K</kbd>
      </label>
      <div className="ml-auto flex items-center gap-3">
        <ModeSwitch broken={broken} />
        <button type="button" aria-label="Notifications" className="grid size-9 place-items-center rounded-control text-ink-muted hover:bg-sunken active:bg-line"><Bell /></button>
        <span className="grid size-8 place-items-center rounded-full bg-violet text-xs font-medium text-accent-ink">AM</span>
      </div>
    </header>
  );
}

// the showcase's own control: the same workspace with the mistakes, or built right
function ModeSwitch({ broken }) {
  const tab = (on) => 'inline-flex h-7 items-center rounded-[6px] px-3 text-sm ' + (on ? 'bg-surface font-medium text-ink shadow-raised' : 'text-ink-muted');
  return (
    <nav aria-label="Showcase mode" className="flex items-center gap-0.5 rounded-control bg-sunken p-0.5">
      <a href="?" aria-current={broken ? 'page' : undefined} className={tab(broken)}>Broken</a>
      <a href="?fixed" aria-current={broken ? undefined : 'page'} className={tab(!broken)}>Fixed</a>
    </nav>
  );
}

export function Shell({ broken }) {
  return (
    <div className="flex min-h-dvh">
      <Sidebar broken={broken} active="invoices" />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar broken={broken} />
        <main className="flex flex-col gap-10 px-8 py-8">
          <Dashboard broken={broken} />
          <Invoices broken={broken} />
          <Team broken={broken} />
          <Settings broken={broken} />
        </main>
      </div>
    </div>
  );
}
