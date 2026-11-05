// #15 small capitals need tracking. Burrow, an issue tracker: the Upload pipeline project in cycle 14, six days before
// it ships. Its table's column labels are 11px semibold capitals with no letter spacing, every one of them. Capitals
// are drawn to sit beside lowercase; set alone and small, they crowd into each other. plumber opens them to 0.06em.
import { UploadIcon } from '@unlocalhosted/dither-icons';
import mira from '../../media/people/person-07.jpg';
import jonas from '../../media/people/person-02.jpg';
import sana from '../../media/people/person-03.jpg';
import david from '../../media/people/person-06.jpg';
import theo from '../../media/people/person-08.jpg';
import lea from '../../media/people/person-05.jpg';

export const n = 15;

// Burrow's status marks: a dashed ring to do, a quarter in progress, a half in review, solid done
const MARK = { done: '#1f9d6b', review: 'var(--color-accent)', progress: '#d99a21', todo: '#dfe3ea' };
const STATUS = {
  todo: { label: 'To do', glyph: <circle cx="7" cy="7" r="6" fill="none" stroke="var(--color-ink-subtle)" strokeWidth="1.5" strokeDasharray="2.2 2" /> },
  progress: { label: 'In progress', glyph: <><circle cx="7" cy="7" r="6" fill="none" stroke={MARK.progress} strokeWidth="1.5" /><path d="M7 3.5a3.5 3.5 0 0 1 3.5 3.5H7z" fill={MARK.progress} /></> },
  review: { label: 'In review', glyph: <><circle cx="7" cy="7" r="6" fill="none" stroke={MARK.review} strokeWidth="1.5" /><path d="M7 3.5a3.5 3.5 0 0 1 0 7z" fill={MARK.review} /></> },
};
const LABEL = { Bug: 'var(--color-negative)', Feature: 'var(--color-accent)', Accessibility: 'var(--color-ink-subtle)', Performance: '#1f9d6b' };
// priority as bars: how many of the three are lit; urgent is its own red square
const ISSUES = [
  { id: 'PLM-214', title: 'Upload queue retries forever on a 413', labels: ['Bug'], who: 'Mira', face: mira, status: 'review', urgent: true, comments: 6, updated: '2h' },
  { id: 'PLM-221', title: 'Resume a paused upload after the laptop sleeps', labels: ['Feature'], who: 'Jonas', face: jonas, status: 'review', priority: 3, updated: '4h' },
  { id: 'PLM-209', title: 'Dark mode loses focus rings in menus', labels: ['Bug', 'Accessibility'], who: 'Theo', face: theo, status: 'progress', priority: 2, comments: 2, updated: '5h' },
  { id: 'PLM-217', title: 'Chunk size follows the connection', labels: ['Performance'], who: 'Sana', face: sana, status: 'progress', priority: 2, updated: '1d' },
  { id: 'PLM-224', title: 'Name the file when an upload fails', labels: ['Feature'], who: 'David', face: david, status: 'progress', priority: 1, updated: '1d' },
  { id: 'PLM-198', title: 'Search ignores accents in file names', labels: ['Bug'], who: 'Lea', face: lea, status: 'todo', priority: 3, updated: '2d' },
  { id: 'PLM-226', title: 'Drag a folder in and keep its structure', labels: ['Feature'], status: 'todo', priority: 1, updated: '3d' },
];
// the cycle: one segment per issue, by status
const CYCLE = [['done', 9, 'done'], ['review', 2, 'in review'], ['progress', 3, 'in progress'], ['todo', 4, 'to do']];
const TEAM = [mira, jonas, sana, david];

function Priority({ urgent, level }) {
  if (urgent) return (
    <svg viewBox="0 0 16 16" className="size-4 shrink-0" role="img" aria-label="Urgent"><rect x="1" y="1" width="14" height="14" rx="4" fill="var(--color-negative)" /><rect x="7.1" y="4" width="1.8" height="5.2" rx=".9" fill="#fff" /><circle cx="8" cy="11.4" r="1" fill="#fff" /></svg>
  );
  return (
    <svg viewBox="0 0 16 16" className="size-4 shrink-0" role="img" aria-label={['Low', 'Medium', 'High'][level - 1] + ' priority'}>
      {[[2, 9, 5], [6.5, 6, 8], [11, 3, 11]].map(([x, y, h], i) => <rect key={x} x={x} y={y} width="3" height={h} rx="1" fill={i < level ? 'var(--color-ink-muted)' : '#d3d8e0'} />)}
    </svg>
  );
}
const Comments = ({ count }) => (
  <span className="mr-2.5 inline-flex items-center gap-[3px]" aria-label={`${count} comments`}>
    <svg viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M2.5 3.5h11v7h-6l-3 2.5v-2.5h-2z" strokeLinejoin="round" /></svg>{count}
  </span>
);

function IssueTable() {
  // Slate's primitives; the statuses keep Burrow's own marks
  const head = ['Issue', 'Assignee', 'Status', 'Updated'];
  const total = CYCLE.reduce((a, [, k]) => a + k, 0);
  return (
    <article className="w-full max-w-[42.5rem] overflow-hidden rounded-card bg-surface shadow-card">
      <header className="flex items-center gap-3 px-5 pt-[18px] pb-3.5">
        <span className="grid size-8 shrink-0 place-items-center rounded-control bg-accent-soft text-accent"><UploadIcon size={16} texture="dither" /></span>
        <span className="flex min-w-0 flex-col">
          <span className="text-[17px] leading-6 font-medium tracking-[-0.01em]">Upload pipeline</span>
          <span className="truncate text-[13px] text-ink-muted">Platform · cycle 14 · ships Thursday 20 November</span>
        </span>
        <span className="ml-auto flex shrink-0 items-center">
          {TEAM.map((src) => <img key={src} src={src} alt="" className="-ml-1.5 size-6 rounded-full object-cover ring-2 ring-surface first:ml-0" />)}
          <span className="ml-1.5 text-xs text-ink-muted">+2</span>
        </span>
      </header>
      {/* the cycle, drawn: a segment per issue, coloured by its status */}
      <section aria-label="Cycle 14 progress" className="px-5 pb-4">
        <span className="flex h-2 gap-0.5">
          {CYCLE.flatMap(([k, count]) => Array.from({ length: count }, (_, i) => <span key={k + i} className="flex-1 rounded-[2px]" style={{ background: MARK[k] }} />))}
        </span>
        <span className="mt-2 flex flex-wrap gap-x-3.5 gap-y-1 text-xs text-ink-muted">
          {CYCLE.map(([k, count, label]) => (
            <span key={k} className="flex items-center gap-1.5"><span className="size-2 rounded-[2px]" style={{ background: MARK[k] }} /><b className="font-medium text-ink tabular-nums">{count}</b> {label}</span>
          ))}
          <span className="ml-auto"><b className="font-medium text-ink tabular-nums">{Math.round((CYCLE[0][1] / total) * 100)}%</b> done · 6 days left</span>
        </span>
      </section>
      <table className="w-full table-fixed text-left text-sm">
        <colgroup><col /><col className="w-32" /><col className="w-32" /><col className="w-24" /></colgroup>
        <thead><tr className="border-y-hairline border-line bg-sunken/60">
          {head.map((h, i) => <th key={h} data-label scope="col" className={'py-2 text-[11px] leading-4 font-semibold text-ink-muted uppercase ' + (i === 0 ? 'px-5' : i === 3 ? 'pr-5 text-right' : '')}>{h}</th>)}
        </tr></thead>
        <tbody>
          {ISSUES.map((r) => (
            <tr key={r.id} className={'border-b-hairline border-line last:hairline-none ' + (r.urgent ? 'bg-accent-soft/55' : '')}>
              <td className="py-2.5 px-5">
                <span className="grid grid-cols-[1rem_minmax(0,1fr)] items-center gap-2.5">
                  <Priority urgent={r.urgent} level={r.priority} />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-medium" title={r.title}>{r.title}</span>
                    <span className="flex items-center gap-2 text-xs text-ink-muted">
                      <span className="case-forms font-mono">{r.id}</span>
                      {r.labels.map((l) => <span key={l} className="inline-flex items-center gap-[5px]"><span className="size-1.5 rounded-full" style={{ background: LABEL[l] }} />{l}</span>)}
                    </span>
                  </span>
                </span>
              </td>
              <td className="py-2.5">
                {r.face
                  ? <span className="flex items-center gap-2 text-[13px]"><img src={r.face} alt="" className="size-5 shrink-0 rounded-full object-cover outline-1 -outline-offset-1 outline-black/10" />{r.who}</span>
                  : <span className="flex items-center gap-2 text-[13px] text-ink-subtle"><span className="size-5 shrink-0 rounded-full border border-dashed border-ink/30" />No one</span>}
              </td>
              <td className="py-2.5">
                <span className="flex items-center gap-2 text-[13px]"><svg viewBox="0 0 14 14" className="size-3.5 shrink-0" aria-hidden="true">{STATUS[r.status].glyph}</svg>{STATUS[r.status].label}</span>
              </td>
              <td className="py-2.5 pr-5 text-right text-[13px] text-ink-muted tabular-nums">{r.comments ? <Comments count={r.comments} /> : null}{r.updated}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  );
}
IssueTable.stage = true;
IssueTable.names = ['Untracked', 'Tracked'];
IssueTable.lesson = {
  why: 'Capitals are spaced to sit beside lowercase letters, which carry most of a line’s white space. Set alone, small and bold, they have nothing between them: the letters touch at a glance and the label reads as a smudge.',
  habit: 'Small capitals get 0.05–0.1em of letter spacing; big display type gets tighter instead.',
};
// one 11px label needs a closer look than the stage's usual 2.4×
IssueTable.maxZoom = 5;
// What the eye sees on one label ("Assignee"; plumber spaces all four): the space between one capital's ink and the
// next (the hatch), nothing drawn over the letters themselves. Placed at the letters' real positions (the DOM's) with
// each glyph's own ink bounds (canvas measureText). The pill is the tightest of those gaps, in px.
IssueTable.measure = (root) => {
  const th = [...(root?.querySelectorAll('[data-label]') ?? [])][1];
  if (!th) return null;
  const t = th.firstChild, k = th.getBoundingClientRect().width / th.offsetWidth || 1, range = document.createRange();
  const s = getComputedStyle(th), ctx = document.createElement('canvas').getContext('2d');
  ctx.font = `${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
  const ink = [];
  for (let i = 0; i < t.length; i++) {
    range.setStart(t, i); range.setEnd(t, i + 1);
    const b = range.getBoundingClientRect(), ch = s.textTransform === 'uppercase' ? t.data[i].toUpperCase() : t.data[i];
    if (!ch.trim()) continue;
    const m = ctx.measureText(ch);
    ink.push({ left: b.left + -m.actualBoundingBoxLeft * k, right: b.left + m.actualBoundingBoxRight * k, top: b.top, bottom: b.bottom, h: b.height });
  }
  const bands = [];
  let tight = Infinity;
  ink.forEach((g, i) => {
    const nx = ink[i + 1];
    if (!nx) return;
    tight = Math.min(tight, (nx.left - g.right) / k);
    bands.push({ key: `g${i}`, left: g.right, right: Math.max(g.right + 0.5 * k, nx.left), top: g.top + g.h * 0.3, bottom: g.bottom - g.h * 0.3, pattern: 'hatch' });
  });
  const first = ink[0], last = ink.at(-1), ok = tight >= 1;
  return {
    lines: [], bands, off: !ok,
    pills: [{ key: 'gap', x: (first.left + last.right) / 2, y: first.top - 10 * k, text: (Math.max(tight, 0.05) * k).toFixed(1), ok }],
    cut: { left: first.left - 4 * k, right: last.right + 4 * k, top: first.top - 2 * k, bottom: first.bottom + 2 * k },
    subject: { left: first.left - 12 * k, right: last.right + 12 * k, top: first.top - 22 * k, bottom: first.bottom + 14 * k },
  };
};

export default IssueTable;
