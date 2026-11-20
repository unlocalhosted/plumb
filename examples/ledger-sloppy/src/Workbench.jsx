// A page that behaves like a real app (open /?work, then Alt+B): an issue tracker with honest mistakes in its styles and
// with every kind of state the overlay has to survive. The settings page (/) is a still life; this one moves.
//
// What is here, and what it is here to break:
//   live      the header counts and the sync bar change every second or two: React re-renders elements, and writes its
//             own inline style (the bar's width), while the overlay previews on them
//   list      rows are filtered, sorted, shuffled, removed and added: the element the overlay holds is moved or gone,
//             and one source line is many places
//   loading   "Load more" shows skeleton rows, then real ones (or fails, with a retry): late and replaced elements
//   states    selected, hovered (with the page's own transition), disabled, pressed, checked, focused, empty, error
//   layers    a dialog and a menu the page opens in a portal on <body>, each closing on its own Esc; a toast that
//             leaves by itself; a tooltip that exists only while pointed at
//   text      words written in JSX, words passed as props, words built by code (counts, plurals, a ticking clock),
//             an input being typed in, and a note the page itself makes editable
//   layout    a list that scrolls inside the page under a sticky header, a board that scrolls sideways, a card that is
//             scaled, a bar fixed to the bottom, a dark panel
//   late      the activity panel is loaded a second and a half after the page
//   Break it  the strip at the top does on purpose what a real app does by accident
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const PEOPLE = ['Ada', 'Grace', 'Alan', 'Edsger', 'Barbara'];
const LABELS = { bug: 'Bug', feature: 'Feature', chore: 'Chore' };
const seed = [
  { id: 'PLM-214', title: 'Undo loses the last change after a reload', label: 'bug', who: 'Ada', pri: 1, done: false },
  { id: 'PLM-209', title: 'Spacing drag jumps when the row re-renders', label: 'bug', who: 'Grace', pri: 2, done: false },
  { id: 'PLM-201', title: 'Name the new shadow token from the panel', label: 'feature', who: 'Alan', pri: 3, done: true },
  { id: 'PLM-198', title: 'History strip covers the toast on small screens', label: 'bug', who: 'Edsger', pri: 2, done: false },
  { id: 'PLM-190', title: 'Upgrade the build to the new bundler', label: 'chore', who: 'Barbara', pri: 4, done: false },
  { id: 'PLM-187', title: 'Keyboard walk skips rows inside a scroller', label: 'feature', who: 'Ada', pri: 3, done: false },
];
let made = 300;
const fresh = (n) => Array.from({ length: n }, () => { made += 3; return { id: `PLM-${made}`, title: ['Tooltip stays after its button unmounts', 'Dark panel reads as the light scheme', 'Board column loses its scroll position', 'Count says “1 issues”'][made % 4], label: ['bug', 'feature', 'chore'][made % 3], who: PEOPLE[made % 5], pri: 1 + (made % 4), done: false }; });

// ── small parts, each used in several places with different props ──
const Dot = ({ pri }) => <span className="inline-block h-[7px] w-[7px] rounded-full" style={{ background: ['#d92d20', '#f79009', '#2f5bd3', '#98a2b3'][pri - 1] }} />;
const Avatar = ({ name, size = 20 }) => <span className="grid place-items-center rounded-full bg-accent/15 text-[10px] font-semibold text-accent" style={{ width: size, height: size }}>{name[0]}</span>;
const tone = { bug: 'bg-[#fee4e2] text-[#b42318]', feature: 'bg-accent/10 text-accent', chore: 'bg-ground text-ink-muted' };
const Tag = ({ kind }) => <span className={`rounded-[5px] px-[7px] py-[2px] text-[11px] font-medium ${tone[kind]}`}>{LABELS[kind]}</span>;
function Button({ children, quiet, ...rest }) {
  return <button {...rest} className={`rounded-control px-s3 py-[6px] text-[13px] font-medium transition-colors duration-150 disabled:opacity-40 ${quiet ? 'text-ink-muted hover:bg-ground' : 'bg-accent text-surface hover:bg-[#2a51bd]'}`}>{children}</button>;
}
const Icon = ({ d, size = 16 }) => <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d={d} /></svg>;
const plural = (n, one) => `${n} ${one}${n === 1 ? '' : 's'}`;

// ── layers the page opens itself ──
function Layer({ children }) { return createPortal(children, document.body); }
function Dialog({ issue, onClose }) {
  const box = useRef(null);
  useEffect(() => {
    box.current?.querySelector('input')?.focus();
    const key = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    addEventListener('keydown', key, true);
    return () => removeEventListener('keydown', key, true);
  }, [onClose]);
  return (
    <Layer>
      <div id="dialog" className="fixed inset-0 z-50 grid place-items-center bg-ink/40" onClick={onClose}>
        <div ref={box} role="dialog" aria-modal="true" aria-label="Edit issue" className="flex w-[420px] flex-col gap-s3 rounded-card bg-surface p-[18px] shadow-rest" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-[15px] font-semibold">Edit {issue.id}</h2>
          <label className="flex flex-col gap-[5px] text-small text-ink-muted">Title<input defaultValue={issue.title} className="rounded-control border border-rule px-[10px] py-s2 text-body text-ink outline-none focus:border-accent" /></label>
          <label className="flex flex-col gap-s1 text-small text-ink-muted">Notes<textarea rows={3} placeholder="What did you find?" className="rounded-control border border-rule px-s3 py-s2 text-body text-ink outline-none focus:border-accent" /></label>
          <div className="flex justify-end gap-s2 pt-[6px]"><Button quiet onClick={onClose}>Cancel</Button><Button onClick={onClose}>Save changes</Button></div>
        </div>
      </div>
    </Layer>
  );
}
function Menu({ at, onPick, onClose }) {
  useEffect(() => {
    const key = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    const away = () => onClose();
    addEventListener('keydown', key, true); addEventListener('pointerdown', away);
    return () => { removeEventListener('keydown', key, true); removeEventListener('pointerdown', away); };
  }, [onClose]);
  return (
    <Layer>
      <ul id="menu" role="menu" className="fixed z-50 flex w-[168px] flex-col rounded-control bg-surface p-[5px] text-[13px] shadow-rest" style={{ left: at.x, top: at.y }} onPointerDown={(e) => e.stopPropagation()}>
        {['Assign to me', 'Mark as done', 'Copy link', 'Delete'].map((text) => <li key={text} role="menuitem" tabIndex={-1} className={`cursor-default rounded-[5px] px-[9px] py-[6px] hover:bg-ground ${text === 'Delete' ? 'text-[#b42318]' : ''}`} onClick={() => onPick(text)}>{text}</li>)}
      </ul>
    </Layer>
  );
}
function Tip({ text, children }) {
  const [on, setOn] = useState(false);
  return <span className="relative inline-flex" onPointerEnter={() => setOn(true)} onPointerLeave={() => setOn(false)}>{children}{on && <span role="tooltip" className="absolute left-1/2 top-full z-10 mt-[5px] -translate-x-1/2 whitespace-nowrap rounded-[5px] bg-ink px-[7px] py-[3px] text-[11px] text-surface">{text}</span>}</span>;
}

// ── the late panel: its code arrives after the page ──
function ActivityNow() {
  const lines = [['Ada', 'closed', 'PLM-201'], ['Grace', 'commented on', 'PLM-209'], ['Alan', 'opened', 'PLM-214']];
  return <ul className="flex flex-col gap-[9px]">{lines.map(([who, did, id]) => <li key={id} className="flex items-center gap-s2 text-[13px]"><Avatar name={who} size={18} /><span><b className="font-medium">{who}</b> {did} <span className="text-white/60">{id}</span></span></li>)}</ul>;
}
const Activity = lazy(() => new Promise((done) => setTimeout(() => done({ default: ActivityNow }), 1500)));

// ── one row of the list: one source line, many places ──
function Row({ issue, selected, onSelect, onToggle, onMenu, onOpen }) {
  return (
    <li data-issue={issue.id} aria-selected={selected} onClick={() => onSelect(issue.id)} onDoubleClick={() => onOpen(issue)}
      className={`group flex items-center gap-s3 border-b border-rule px-s4 py-[9px] transition-colors duration-200 hover:bg-ground ${selected ? 'bg-accent/5' : ''} ${issue.done ? 'opacity-60' : ''}`}>
      <input type="checkbox" checked={issue.done} onChange={() => onToggle(issue.id)} onClick={(e) => e.stopPropagation()} aria-label={`Done: ${issue.title}`} />
      <Dot pri={issue.pri} />
      <span className="w-[62px] text-small text-ink-muted">{issue.id}</span>
      <span className={`flex-1 truncate text-body ${issue.done ? 'line-through' : ''}`}>{issue.title}</span>
      <Tag kind={issue.label} />
      <Tip text={`Assigned to ${issue.who}`}><Avatar name={issue.who} /></Tip>
      <button aria-label="More" className="rounded-[5px] p-[3px] text-ink-muted opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100" onClick={(e) => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); onMenu(issue, { x: r.right - 168, y: r.bottom + 4 }); }}><Icon d="M3 8h.01M8 8h.01M13 8h.01" /></button>
    </li>
  );
}
const Skeleton = () => <li className="flex items-center gap-s3 border-b border-rule px-s4 py-[11px]" aria-hidden="true"><span className="h-[12px] w-[12px] animate-pulse rounded-[3px] bg-ground" /><span className="h-[10px] w-[48px] animate-pulse rounded-full bg-ground" /><span className="h-[10px] flex-1 animate-pulse rounded-full bg-ground" /></li>;

export function Workbench() {
  const [issues, setIssues] = useState(seed);
  const [tab, setTab] = useState('open');
  const [view, setView] = useState('list');
  const [sort, setSort] = useState('pri');
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState('PLM-209');
  const [live, setLive] = useState(true);
  const [now, setNow] = useState(() => new Date());
  const [synced, setSynced] = useState(34);
  const [load, setLoad] = useState('idle'); // idle | loading | failed
  const [failNext, setFailNext] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [menu, setMenu] = useState(null);
  const [toast, setToast] = useState(null);
  const [note, setNote] = useState(false);

  // live: a clock every second, the sync bar every 700 ms; React writes the bar's width itself
  useEffect(() => {
    if (!live) return;
    const clock = setInterval(() => setNow(new Date()), 1000), bar = setInterval(() => setSynced((n) => (n >= 100 ? 8 : n + 7)), 700);
    return () => { clearInterval(clock); clearInterval(bar); };
  }, [live]);
  // a toast leaves by itself
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2600); return () => clearTimeout(t); }, [toast]);

  const shown = issues.filter((i) => (tab === 'all' || (tab === 'done') === i.done) && i.title.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => (sort === 'pri' ? a.pri - b.pri : sort === 'who' ? a.who.localeCompare(b.who) : 0));
  const open = issues.filter((i) => !i.done).length;
  const toggle = (id) => setIssues((all) => all.map((i) => (i.id === id ? { ...i, done: !i.done } : i)));
  const more = () => {
    setLoad('loading');
    setTimeout(() => { if (failNext) { setLoad('failed'); setFailNext(false); } else { setIssues((all) => [...all, ...fresh(3)]); setLoad('idle'); } }, 1400);
  };
  const pick = (text) => {
    const issue = menu.issue; setMenu(null);
    if (text === 'Delete') setIssues((all) => all.filter((i) => i.id !== issue.id));
    if (text === 'Mark as done') toggle(issue.id);
    if (text === 'Assign to me') setIssues((all) => all.map((i) => (i.id === issue.id ? { ...i, who: 'Ada' } : i)));
    setToast(text === 'Delete' ? `${issue.id} deleted` : text === 'Copy link' ? 'Link copied' : `${issue.id} updated`);
  };
  const breakers = [
    ['Shuffle rows', () => { setSort('none'); setIssues((all) => [...all].sort(() => Math.random() - 0.5)); }],
    ['Remove the selected row', () => setIssues((all) => all.filter((i) => i.id !== picked))],
    ['Add a row at the top', () => setIssues((all) => [...fresh(1), ...all])],
    ['Re-render storm', () => { let n = 0; const t = setInterval(() => { setNow(new Date()); if (++n > 40) clearInterval(t); }, 50); }],
    ['Fail the next load', () => setFailNext(true)],
    [live ? 'Stop the clock' : 'Start the clock', () => setLive((v) => !v)],
  ];

  return (
    <main className="mx-auto flex max-w-[980px] flex-col gap-[18px] px-s4 pb-[88px] pt-s6">
      {/* Break it: what a real app does by accident, on purpose */}
      <section id="breakers" aria-label="Break it" className="flex flex-wrap items-center gap-s2 rounded-card border border-dashed border-rule px-s3 py-s2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Break it</span>
        {breakers.map(([text, run]) => <button key={text} onClick={run} className="rounded-[5px] bg-surface px-[9px] py-[4px] text-[12px] text-ink shadow-rest hover:bg-ground">{text}</button>)}
        {failNext && <span className="text-[12px] text-[#b42318]">the next load will fail</span>}
      </section>

      <header className="flex items-end justify-between gap-s4">
        <div className="flex flex-col gap-[3px]">
          <h1 id="title" className="text-[22px] font-semibold tracking-tight">Issues</h1>
          <p id="summary" className="text-[13px] text-ink-muted">{plural(open, 'open issue')} · {plural(issues.length - open, 'done issue')} · updated <time>{now.toLocaleTimeString()}</time></p>
        </div>
        <div className="flex items-center gap-[10px]">
          <div className="flex w-[150px] flex-col gap-[4px]" aria-label={`Synced ${synced}%`}>
            <span className="text-[11px] text-ink-muted">Syncing {synced}%</span>
            <span className="h-[5px] overflow-hidden rounded-full bg-rule"><span id="sync-bar" className="block h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${synced}%` }} /></span>
          </div>
          <Button quiet disabled>Export</Button>
          <Button onClick={() => setDialog(issues[0] ?? seed[0])}>New issue</Button>
        </div>
      </header>

      <div className="flex items-center gap-s3">
        <div role="tablist" className="flex gap-[2px] rounded-control bg-ground p-[3px]">
          {[['open', 'Open'], ['done', 'Done'], ['all', 'All']].map(([key, text]) => <button key={key} role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className={`rounded-[6px] px-[11px] py-[5px] text-[13px] transition-colors ${tab === key ? 'bg-surface font-medium shadow-rest' : 'text-ink-muted'}`}>{text}</button>)}
        </div>
        <input id="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter issues" className="w-[220px] rounded-control border border-rule bg-surface px-[10px] py-[6px] text-[13px] outline-none focus:border-accent" />
        <button aria-pressed={sort === 'who'} onClick={() => setSort((s) => (s === 'who' ? 'pri' : 'who'))} className="rounded-control px-s2 py-[6px] text-[13px] text-ink-muted aria-pressed:bg-accent/10 aria-pressed:text-accent">Sort by person</button>
        <div className="ml-auto flex gap-[2px]">
          {[['list', 'M3 4h10M3 8h10M3 12h10'], ['board', 'M3 3v10M8 3v10M13 3v10']].map(([key, d]) => <button key={key} aria-label={key} aria-pressed={view === key} onClick={() => setView(key)} className="rounded-[6px] p-[6px] text-ink-muted aria-pressed:bg-ground aria-pressed:text-ink"><Icon d={d} /></button>)}
        </div>
      </div>

      {view === 'list' ? (
        // a list that scrolls inside the page, under a header that sticks
        <section id="list" className="max-h-[330px] overflow-y-auto rounded-card bg-surface shadow-rest">
          <div className="sticky top-0 z-[1] flex items-center gap-s3 border-b border-rule bg-surface px-s4 py-[7px] text-[11px] font-medium uppercase tracking-wide text-ink-muted"><span className="w-[13px]" /><span className="w-[7px]" /><span className="w-[62px]">Id</span><span className="flex-1">Title</span><span>Label</span><span className="w-[48px] text-right">Who</span></div>
          {shown.length ? (
            <ul>{shown.map((issue) => <Row key={issue.id} issue={issue} selected={issue.id === picked} onSelect={setPicked} onToggle={toggle} onMenu={(i, at) => setMenu({ issue: i, at })} onOpen={setDialog} />)}{load === 'loading' && [0, 1, 2].map((k) => <Skeleton key={k} />)}</ul>
          ) : (
            <div id="empty" className="flex flex-col items-center gap-[6px] px-s4 py-[38px] text-center"><Icon d="M2 8a6 6 0 1 0 12 0A6 6 0 0 0 2 8zM5.5 9.5s1 1 2.5 1 2.5-1 2.5-1" size={22} /><p className="text-body font-medium">Nothing here</p><p className="text-small text-ink-muted">{query ? `No issue matches “${query}”.` : 'Every issue in this view is done.'}</p></div>
          )}
          <div className="flex items-center justify-between px-s4 py-[10px]">
            {load === 'failed' ? <p id="load-error" role="alert" className="text-[13px] text-[#b42318]">Couldn’t load more issues. <button className="underline" onClick={more}>Try again</button></p> : <span className="text-small text-ink-muted">{plural(shown.length, 'issue')} shown</span>}
            <Button quiet disabled={load === 'loading'} onClick={more}>{load === 'loading' ? 'Loading…' : 'Load more'}</Button>
          </div>
        </section>
      ) : (
        // a board that scrolls sideways; its middle card is scaled
        <section id="board" className="flex gap-s3 overflow-x-auto pb-s2">
          {Object.entries(LABELS).map(([kind, name], k) => (
            <div key={kind} className="flex w-[300px] flex-none flex-col gap-[9px] rounded-card bg-ground p-[10px]">
              <h3 className="flex items-center justify-between px-[3px] text-[13px] font-semibold">{name}<span className="text-small font-normal text-ink-muted">{issues.filter((i) => i.label === kind).length}</span></h3>
              {issues.filter((i) => i.label === kind).map((issue, n) => <article key={issue.id} className={`flex flex-col gap-[7px] rounded-control bg-surface p-[11px] shadow-rest ${k === 1 && n === 0 ? 'scale-[1.03]' : ''}`}><p className="text-[13px] leading-[18px]">{issue.title}</p><div className="flex items-center justify-between"><span className="text-[11px] text-ink-muted">{issue.id}</span><Avatar name={issue.who} size={18} /></div></article>)}
            </div>
          ))}
        </section>
      )}

      <div className="grid grid-cols-[1fr_300px] gap-s4">
        <section className="flex flex-col gap-[10px] rounded-card bg-surface p-s4 shadow-rest">
          <h2 className="text-[15px] font-semibold">Notes</h2>
          <p className="text-body leading-[21px]">Plain words, <b>bold words</b> and <em>slanted words</em> in one paragraph, next to a count built by code: {plural(shown.length, 'row')} in view.</p>
          {/* the page's own editable words: the overlay's editor must leave them to the page */}
          <p id="own-note" contentEditable={note} suppressContentEditableWarning onBlur={() => setNote(false)} className={`rounded-control px-s2 py-[5px] text-body ${note ? 'bg-ground outline outline-1 outline-accent' : ''}`}>This note is the page’s own to edit.</p>
          <div><Button quiet onClick={() => setNote(true)}>Edit the note</Button></div>
          <details className="text-[13px] text-ink-muted"><summary className="cursor-default">What changed this week</summary><p className="pt-[6px]">Three bugs closed, one feature shipped, the build still slow.</p></details>
        </section>
        {/* a dark panel: its ground is not the page's */}
        <aside id="activity" className="flex flex-col gap-s3 rounded-card bg-[#15181b] p-s4 text-white">
          <h2 className="text-[15px] font-semibold">Activity</h2>
          <Suspense fallback={<p className="animate-pulse text-[13px] text-white/50">Loading activity…</p>}><Activity /></Suspense>
        </aside>
      </div>

      {/* a bar fixed to the bottom of the window */}
      <footer id="bar" className="fixed inset-x-0 bottom-0 flex items-center justify-between border-t border-rule bg-surface/90 px-[22px] py-[9px] backdrop-blur">
        <span className="text-[13px] text-ink-muted">{picked && issues.some((i) => i.id === picked) ? `${picked} selected` : 'Nothing selected'}</span>
        <div className="flex gap-s2"><Button quiet disabled={!issues.some((i) => i.id === picked)} onClick={() => toggle(picked)}>Mark as done</Button><Button disabled={!issues.some((i) => i.id === picked)} onClick={() => setDialog(issues.find((i) => i.id === picked))}>Edit</Button></div>
      </footer>

      {dialog && <Dialog issue={dialog} onClose={() => setDialog(null)} />}
      {menu && <Menu at={menu.at} onPick={pick} onClose={() => setMenu(null)} />}
      {toast && <Layer><div id="toast" role="status" className="fixed bottom-[64px] left-1/2 z-50 -translate-x-1/2 rounded-control bg-ink px-s3 py-[7px] text-[13px] text-surface shadow-rest">{toast}</div></Layer>}
    </main>
  );
}
