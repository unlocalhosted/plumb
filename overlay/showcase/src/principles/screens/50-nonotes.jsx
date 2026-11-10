// #50 icon strokes keep their weight. Quire, a team's notes app: "offsite budget" in Personal finds nothing, and the
// words turn up in other folders' notes and their attachments. Every icon is one stroked set drawn in a 24 box at 1.75;
// the small ones keep that width at any size, but the big ones (the empty state's magnifier, each result's file) are
// drawn at 44 to 48px with the stroke scaled along, so it lands at 3.2 to 3.5px: heavy outlines that shout over the
// words. plumber keeps the stroke at the width it's drawn, whatever the size.
import ines from '../../media/people/person-01.jpg';
import arlo from '../../media/people/person-06.jpg';
import lena from '../../media/people/person-05.jpg';

export const n = 50;

// the set: one 24 box, a 1.75 stroke, round ends
const Icon = ({ size, className = '', children }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={'shrink-0 ' + className}>{children}</svg>
);
// what keeps a small icon's stroke at 1.75px whatever it's drawn at
const KEEP = '[&_*]:[vector-effect:non-scaling-stroke]';
const MAGNIFIER = <><circle cx="11" cy="11" r="7" /><path d="M16.5 16.5 21 21" /></>;
const FILES = {
  sheet: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M4 9h16M4 15h16M10 3v18" /></>,
  doc: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></>,
  receipt: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6M9 16h3" /></>,
};

// each folder keeps one colour, on its chip and its notes
const FOLDERS = [
  { name: 'Personal', color: '#5550d8', count: 0, on: true },
  { name: 'Ops', color: '#0e7c86', count: 2 },
  { name: 'Shared', color: '#c2366f', count: 1 },
  { name: 'Archive', color: '#8a6a2f', count: 1 },
];
const tone = (name) => FOLDERS.find((f) => f.name === name).color;
const Hit = ({ children }) => <mark className="rounded-[2px] bg-[#fdf0b8] text-inherit">{children}</mark>;
const NOTES = [
  { file: 'sheet', title: <><Hit>Offsite</Hit> 2027, venues and <Hit>budget</Hit></>, hits: 9, attached: 'venues.xlsx',
    snippet: <>Sintra holds 40 for €18,400 all in; the <Hit>budget</Hit> line we agreed was €22,000, so there is room for the boat.</>,
    plain: 'Sintra holds 40 for €18,400 all in; the budget line we agreed was €22,000, so there is room for the boat.', who: 'Inês Duarte', face: ines, folder: 'Ops', when: '2h ago' },
  { file: 'doc', title: <>Q1 <Hit>offsite</Hit>, agenda draft</>, hits: 4,
    snippet: <>Day two is the <Hit>budget</Hit> review, morning only, then the walk up to the castle.</>,
    plain: 'Day two is the budget review, morning only, then the walk up to the castle.', who: 'Arlo Brandt', face: arlo, folder: 'Ops', when: 'Mon' },
  { file: 'receipt', title: <>Travel <Hit>budget</Hit> for the design team</>, hits: 2, attached: 'flights.pdf',
    snippet: <>Flights for the <Hit>offsite</Hit> come out of this, not the events line.</>,
    plain: 'Flights for the offsite come out of this, not the events line.', who: 'Lena Park', face: lena, folder: 'Shared', when: '12 Oct' },
];
const MOST = 9;

export default function NoNotes() {
  return (
    <article className="flex w-full max-w-[26.25rem] flex-col overflow-hidden rounded-card bg-surface shadow-card">
      <div className="px-4 pt-4">
        <label className="flex h-10 items-center gap-2 rounded-control pr-2 pl-3 text-ink-muted shadow-[inset_0_0_0_1px_var(--color-accent),0_0_0_3px_rgb(85_80_216/0.16)]">
          <Icon size={16} className={KEEP}>{MAGNIFIER}</Icon>
          <input type="search" defaultValue="offsite budget" aria-label="Search notes" className="min-w-0 flex-1 bg-transparent text-base text-ink caret-accent outline-none md:text-[15px]" />
          <button type="button" aria-label="Clear the search" className="grid size-6 place-items-center rounded-full bg-sunken text-ink-subtle"><Icon size={12} className={KEEP}><path d="M7 7l10 10M17 7 7 17" /></Icon></button>
          <kbd className="rounded-chip px-[5px] font-sans text-[11px] leading-4 text-ink-subtle shadow-[inset_0_0_0_1px_var(--color-line)]">esc</kbd>
        </label>
        <div role="tablist" aria-label="Folders" className="-mx-4 flex gap-1.5 border-b-hairline border-line px-4 pt-3 pb-3.5">
          {FOLDERS.map((f) => (
            <button key={f.name} type="button" role="tab" aria-selected={!!f.on} className={'inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[13px] whitespace-nowrap ' + (f.on ? 'bg-ink text-white' : 'text-ink-muted shadow-[inset_0_0_0_1px_var(--color-line)]')}>
              <span className="size-[7px] rounded-[2px]" style={{ background: f.color, boxShadow: f.on ? '0 0 0 1.5px #fff' : undefined }} />
              {f.name}
              <span className={'font-medium tabular-nums ' + (f.on ? 'text-[#c3c9d4]' : 'text-ink-subtle')}>{f.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* the empty result: the set's magnifier, drawn big */}
      <div data-empty className="flex flex-col items-center gap-3.5 px-8 pt-8 pb-7 text-center">
        <Icon size={48} className="text-ink-subtle">{MAGNIFIER}</Icon>
        <span className="flex flex-col gap-1">
          <span className="text-[15px] font-medium">No notes in Personal match “offsite budget”</span>
          <span className="text-[13px] text-ink-muted text-pretty">Searched 214 notes and their attachments. The words turn up in 3 other folders.</span>
        </span>
      </div>

      <section aria-label="Found in other folders" className="px-4 pb-2">
        <h3 className="-mx-4 flex justify-between border-t-hairline border-line px-4 pt-3.5 pb-1.5 text-xs font-medium text-ink-muted">Found in other folders<span className="tabular-nums">4 notes</span></h3>
        <ul>
          {NOTES.map((note) => (
            <li key={note.who} data-note className="grid grid-cols-[2.75rem_1fr_auto] gap-x-3 border-b-hairline border-line py-2.5 last:hairline-none">
              {/* what the words were found in, from the same set, drawn at the size of a file */}
              <span className="row-span-3 pt-0.5 text-ink-subtle">
                <Icon size={44}>{FILES[note.file]}</Icon>
              </span>
              <span className="truncate text-sm font-medium">{note.title}</span>
              <span className="flex items-center gap-1.5 text-xs font-medium text-ink-subtle tabular-nums">
                <span aria-hidden="true" className="flex gap-0.5">{Array.from({ length: 6 }, (_, i) => <span key={i} className={'h-2.5 w-[3px] rounded-[1px] ' + (i < Math.round((note.hits / MOST) * 6) ? 'bg-accent' : 'bg-ink/12')} />)}</span>
                <span aria-label={`${note.hits} matches`}>{note.hits}</span>
              </span>
              <span title={note.plain} className="col-start-2 col-end-4 truncate text-[13px] text-ink-muted">{note.snippet}</span>
              <span className="col-start-2 col-end-4 mt-1 flex items-center gap-2 text-xs text-ink-muted">
                <img src={note.face} alt="" className="size-5 rounded-full object-cover outline-1 -outline-offset-1 outline-black/10" />
                <span>{note.who}</span>
                <span className="inline-flex h-5 items-center gap-[5px] rounded-chip bg-sunken px-[7px] font-medium"><span className="size-1.5 rounded-[2px]" style={{ background: tone(note.folder) }} />{note.folder}</span>
                <span className="truncate">{note.attached ? `In ${note.attached}` : `Edited ${note.when}`}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
      <footer className="flex items-center justify-between border-t-hairline border-line bg-sunken px-4 py-2.5 text-xs text-ink-muted">
        <span className="tabular-nums">1 more in Archive</span>
        <a href="#all" onClick={(e) => e.preventDefault()} className="inline-flex items-center gap-1 font-medium text-accent-deep">Search all folders<Icon size={14} className={KEEP}><path d="M9 6l6 6-6 6" /></Icon></a>
      </footer>
    </article>
  );
}
NoNotes.stage = true;
NoNotes.names = ['Stroke scales', 'Stroke stays'];
NoNotes.lesson = {
  why: 'An icon’s stroke is drawn in its own 24-unit box, so drawing it twice as big draws the line twice as thick: 3.5px on the empty state’s magnifier and 3.2px on each file, against 1.75px for the same set in the field. The big ones stop matching their set and outweigh the words beside them.',
  habit: 'Keep the stroke width fixed as icons grow: vector-effect: non-scaling-stroke, or your icon set’s absoluteStrokeWidth.',
};
// What the eye sees: the stroke's width on the left of the big magnifier's ring and of each file's outline. The pill
// is the magnifier's, in px.
NoNotes.measure = (root) => {
  const svg = root?.querySelector('[data-empty] svg'), ring = svg?.querySelector('circle');
  if (!ring) return null;
  const r = svg.getBoundingClientRect(), k = r.width / svg.clientWidth || 1;
  const drawn = (s, shape) => { const cs = getComputedStyle(shape); return cs.vectorEffect === 'non-scaling-stroke' ? parseFloat(cs.strokeWidth) : parseFloat(cs.strokeWidth) * (s.clientWidth / 24); };
  const lines = [], bands = [];
  const mark = (key, s, shape) => {
    const w = drawn(s, shape), c = shape.getBoundingClientRect(), mid = c.top + c.height / 2, h = Math.min(14, c.height / 3) * k;
    lines.push({ key: key + 'o', x: c.left, top: mid - h, bottom: mid + h }, { key: key + 'i', x: c.left + w * k, top: mid - h, bottom: mid + h });
    bands.push({ key, left: c.left, right: c.left + w * k, top: mid - h, bottom: mid + h, pattern: 'hatch' });
    return w;
  };
  const w = mark('ring', svg, ring);
  root.querySelectorAll('[data-note] svg').forEach((s, i) => mark('file' + i, s, s.querySelector('rect, path')));
  const c = ring.getBoundingClientRect(), mid = c.top + c.height / 2;
  return {
    lines, bands,
    pills: [{ key: 'stroke', x: c.left - 24 * k, y: mid, text: (w * k).toFixed(1), ok: w <= 2.5 }],
    off: w > 2.5,
    cut: { left: r.left - 6 * k, right: r.right + 6 * k, top: r.top - 6 * k, bottom: r.bottom + 6 * k, r: 10 * k },
    subject: { left: r.left - 70 * k, right: r.right + 50 * k, top: r.top - 40 * k, bottom: r.bottom + 40 * k },
  };
};
