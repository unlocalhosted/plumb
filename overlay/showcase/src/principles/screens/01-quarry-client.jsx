// #1 align content, not boxes. Quarry's client page for Figma, as Quay Studio sees it mid-November: the year in figures
// and bars, who signs off, Ana's note, the recent invoices, the next reminder. The page's tinted panels (the year's
// figures, the note, the reminder) are one component, and each sits on the same column as the unfilled sections around
// it, so its padding pushes its words 16px in from every other line. plumber's fix bleeds each panel out by its padding.
import { Face } from './kit.jsx';
import figmaLogo from '../../media/logos/figma.svg';
import ines from '../../media/people/person-01.jpg';
import ana from '../../media/people/person-07.jpg';

export const n = 1;

const FIGMA = { color: '#f24e1e', logo: figmaLogo };
// billed each month of 2026, as a share of the best month; October is overdue, November not billed yet
const MONTHS = [
  ['J', 38], ['F', 52], ['M', 0], ['A', 71], ['M', 44], ['J', 60], ['J', 33], ['A', 86], ['S', 100], ['O', 78, 'over'], ['N', 24, 'open'], ['D', 0],
];
const INVOICES = [
  { what: 'Config keynote, phase 2', id: 'INV-2041', po: 'PO-7716', when: 'due 24 Oct', state: 'Overdue', amount: '$4,820.00' },
  { what: 'Config keynote, phase 1', id: 'INV-2036', po: 'PO-7702', when: 'paid in 9 days', state: 'Paid', amount: '$4,350.00' },
  { what: 'FigJam template pack', id: 'INV-2029', po: 'PO-7655', when: 'paid in 14 days', state: 'Paid', amount: '$3,200.00' },
  { what: 'Event photography edit', id: 'INV-2017', po: 'PO-7590', when: 'paid in 10 days', state: 'Paid', amount: '$2,610.00' },
];
// Slate's status: a soft pill in the status's own ink, with a hairline ring of the same ink
const STATUS = {
  Overdue: 'bg-negative-soft text-negative ring-negative/15',
  Paid: 'bg-positive-soft text-positive ring-positive/15',
};

// the page's tinted panel: one component, used wherever the page sets something apart
const Panel = ({ label, children }) => (
  <aside data-panel aria-label={label} className="rounded-control bg-sunken px-4 pt-3 pb-3.5">{children}</aside>
);

function Figure({ label, value, detail, tone = '' }) {
  return (
    <span className="flex min-w-0 flex-col">
      <span className="text-xs text-ink-muted">{label}</span>
      <span className={'text-[22px] leading-7 font-medium tracking-[-0.02em] tabular-nums ' + tone}>{value}</span>
      <span className="truncate text-xs text-ink-subtle">{detail}</span>
    </span>
  );
}

export default function ClientPage() {
  return (
    <article className="w-full max-w-[32.5rem] rounded-card bg-surface shadow-card">
      <div data-profile className="flex flex-col gap-5 p-6">
        <header className="flex items-center gap-3.5">
          <span className="grid size-11 shrink-0 place-items-center rounded-card" style={{ background: FIGMA.color }}>
            <span className="size-5 bg-white" style={{ mask: `url("${FIGMA.logo}") center / contain no-repeat` }} />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-[17px] leading-6 font-medium tracking-[-0.01em]">Figma</span>
            <span className="truncate text-[13px] text-ink-muted">Design tools · San Francisco · client since 2023</span>
          </span>
        </header>

        <Panel label="The year in figures">
          <div className="grid grid-cols-[1.15fr_1fr_1fr] gap-4">
            <Figure label="Billed in 2026" value="$38,420" detail="9 invoices · 265 hours" />
            <Figure label="Outstanding" value="$4,820" detail="12 days late" tone="text-negative" />
            <Figure label="Pays in" value="11 days" detail="on average" />
          </div>
        </Panel>

        <section aria-label="Billed each month of 2026" className="grid grid-cols-12 gap-2.5">
          {MONTHS.map(([m, h, kind], i) => (
            <span key={i} className="flex flex-col gap-1.5">
              <span className="flex h-[52px] flex-col justify-end">
                <i className={'block rounded-[3px_3px_1px_1px] ' + (kind === 'over'
                  ? 'bg-negative bg-[repeating-linear-gradient(-45deg,rgb(255_255_255/0.35)_0_3px,transparent_3px_6px)]'
                  : kind === 'open' ? 'shadow-[inset_0_0_0_1px_rgb(18_35_61/0.16)]' : h ? 'bg-accent' : 'bg-line')}
                  style={{ height: h ? `${h}%` : 2 }} />
              </span>
              <span className="text-center text-[11px] leading-4 text-ink-subtle">{m}</span>
            </span>
          ))}
        </section>

        <dl className="grid grid-cols-[7rem_1fr] gap-x-4 gap-y-2.5 text-sm">
          <dt className="text-ink-muted">Billing contact</dt>
          <dd className="flex min-w-0 items-center gap-2"><Face src={ines} size="size-5" /><span className="truncate">Ines Moreau <span className="text-ink-muted">· Brand events</span></span></dd>
          <dt className="text-ink-muted">Terms</dt><dd>Net 30, in USD</dd>
          <dt className="text-ink-muted">Rate</dt><dd><span className="tabular-nums">$145</span> an hour <span className="text-ink-muted">· since January</span></dd>
        </dl>

        <Panel label="Note from Ana">
          <p className="flex items-center gap-2 text-sm font-medium">Note from Ana<span className="text-xs font-normal text-ink-subtle">12 Sep</span><span className="ml-auto flex"><Face src={ana} size="size-5" /></span></p>
          <p className="mt-0.5 text-sm text-pretty text-ink-muted">Their accounts team rejects any invoice without a PO number. Ines approves anything over $5,000, so bill the keynote by phase.</p>
        </Panel>

        <section className="flex flex-col">
          <h3 className="flex justify-between text-xs font-medium text-ink-muted">Recent invoices<span className="font-normal">9 this year</span></h3>
          <ul className="mt-1">
            {INVOICES.map((r) => (
              <li key={r.id} className="grid grid-cols-[1fr_auto_6rem] items-center gap-3 border-b-hairline border-line py-2.5 last:hairline-none">
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium">{r.what}</span>
                  <span className="truncate text-[13px] text-ink-muted"><span className="case-forms tabular-nums">{r.id}</span> · {r.po} · {r.when}</span>
                </span>
                <span className={'inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium ring-1 ring-inset ' + STATUS[r.state]}>{r.state}</span>
                <span className={'text-right text-sm tabular-nums ' + (r.state === 'Overdue' ? 'font-medium text-negative' : '')}>{r.amount}</span>
              </li>
            ))}
          </ul>
        </section>

        <Panel label="Next reminder">
          <p className="flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0"><span className="font-medium">Reminder to Ines on Monday</span><span className="block text-[13px] text-ink-muted">The second one for <span className="case-forms tabular-nums">INV-2041</span> · the first went on 3 Nov</span></span>
            <a href="#remind" className="-my-1 inline-flex min-h-8 shrink-0 items-center text-[13px] font-medium text-accent hover:text-accent-deep">Send now</a>
          </p>
        </Panel>
      </div>
    </article>
  );
}
ClientPage.stage = true;
ClientPage.names = ['Boxes aligned', 'Words aligned'];
ClientPage.lesson = {
  why: 'Each tinted panel sits on the same column as the sections around it, so its padding pushes its words 16px in. The eye follows letters, not boxes: the figures, the note and the reminder all read as if they were indented.',
  habit: 'A filled panel in a column bleeds out by its own padding: the fill escapes into the gutter, the words stay on the edge every other line shares.',
};
// What the eye sees: where each section's words start, against the column the page sets. Each panel's padding is the
// hatch (plumber's pattern for padding); the pills are how far each panel's words sit off the column.
ClientPage.measure = (root) => {
  const page = root?.querySelector('[data-profile]');
  const panels = [...(page?.querySelectorAll(':scope > [data-panel]') ?? [])];
  if (!page || !panels.length) return null;
  // on screen, under the camera's zoom: the padding is scaled with everything else
  const ps = getComputedStyle(page), pr = page.getBoundingClientRect(), k = pr.width / page.offsetWidth || 1, column = pr.left + parseFloat(ps.paddingLeft) * k;
  const wordsOf = (el) => {
    const r = document.createRange(), first = el.querySelector('dt, h3, header span span, p, span span') ?? el;
    r.selectNodeContents(first);
    return r.getBoundingClientRect().left;
  };
  const lines = [...page.children].map((sec, i) => { const b = sec.getBoundingClientRect(); return { key: 's' + i, x: wordsOf(sec), top: b.top, bottom: b.bottom }; });
  const top = pr.top + parseFloat(ps.paddingTop) * k, bottom = pr.bottom - parseFloat(ps.paddingBottom) * k;
  lines.push({ key: 'column', x: column, top, bottom });
  const bands = [], pills = [];
  let worst = 0;
  panels.forEach((p, i) => {
    const b = p.getBoundingClientRect(), words = wordsOf(p), off = (words - column) / k;
    worst = Math.max(worst, Math.abs(off));
    bands.push({ key: 'pad' + i, left: b.left, right: Math.max(b.left, words), top: b.top, bottom: b.bottom, pattern: 'hatch' });
    pills.push({ key: 'off' + i, x: column, y: b.top - 12 * k, text: (Math.abs(off) * k).toFixed(1), ok: Math.abs(off) < 0.5 });
  });
  const first = panels[0].getBoundingClientRect(), note = panels[1]?.getBoundingClientRect() ?? first;
  return {
    lines, bands, pills, off: worst >= 0.5,
    subject: { left: pr.left - 4 * k, right: pr.left + pr.width * 0.7, top: first.top - 40 * k, bottom: note.bottom + 12 * k },
  };
};
