// Quarry's primitives, three directions side by side (/primitives), for the owner to pick before any example is
// re-skinned. The bar is Mercury / Stripe: calm finance software. Each direction is a whole system (canvas, surfaces,
// one brand colour, ink levels, status language, card, avatar, note), drawn on the two real components the showcase
// already has (#1's client profile, #16's timer) so it is judged in context, not as swatches alone.

/* ─────────────────────────────────────────────────────────
 * THE DIRECTIONS
 *   paper    warm off-white, deep indigo, edgeless cards lifted by a soft shadow
 *   slate    cool and exact, navy ink, hairline-bordered cards, a muted blue-violet
 *   forest   private-bank calm, deep green on warm paper, larger corners
 * Every colour a component uses comes from its direction's variables, nowhere else.
 * ───────────────────────────────────────────────────────── */
const DIRECTIONS = [
  {
    id: 'paper', name: 'Paper', says: 'Warm off-white, one deep indigo, cards lifted by shadow alone.',
    vars: {
      '--q-canvas': '#f6f5f2', '--q-surface': '#ffffff', '--q-sunken': '#f3f1ec', '--q-line': 'rgb(40 34 24 / 0.08)',
      '--q-ink': '#1c1b18', '--q-ink-2': '#6b675f', '--q-ink-3': '#9d988e',
      '--q-brand': '#3d3fb8', '--q-brand-soft': '#ecedfa', '--q-brand-ink': '#26277a',
      '--q-pos': '#1f6b47', '--q-pos-soft': '#e6f2eb', '--q-neg': '#a4352b', '--q-neg-soft': '#f7e9e5', '--q-warn': '#87590f', '--q-warn-soft': '#f5eddc',
      '--q-radius': '14px', '--q-radius-sm': '8px',
      '--q-card': '0 0 0 1px rgb(40 34 24 / 0.05), 0 1px 2px rgb(40 34 24 / 0.04), 0 12px 32px -12px rgb(40 34 24 / 0.12)',
    },
    status: 'dot', note: 'quiet',
  },
  {
    id: 'slate', name: 'Slate', says: 'Cool and exact: navy ink, hairline borders, a muted blue-violet.',
    vars: {
      '--q-canvas': '#f5f7fa', '--q-surface': '#ffffff', '--q-sunken': '#f3f5f9', '--q-line': '#e2e7ee',
      '--q-ink': '#12233d', '--q-ink-2': '#5a6779', '--q-ink-3': '#8d98a8',
      '--q-brand': '#5550d8', '--q-brand-soft': '#efeefd', '--q-brand-ink': '#3631a6',
      '--q-pos': '#0f6f58', '--q-pos-soft': '#e5f4ef', '--q-neg': '#b02a3a', '--q-neg-soft': '#fbeaed', '--q-warn': '#965a03', '--q-warn-soft': '#fcf1dd',
      '--q-radius': '10px', '--q-radius-sm': '6px',
      '--q-card': '0 0 0 1px #e2e7ee, 0 1px 1px rgb(18 35 61 / 0.03), 0 2px 6px rgb(18 35 61 / 0.04)',
    },
    status: 'pill', note: 'rule',
  },
  {
    id: 'forest', name: 'Forest', says: 'Private-bank calm: deep green on warm paper, softer corners.',
    vars: {
      '--q-canvas': '#f3f2ec', '--q-surface': '#fffefa', '--q-sunken': '#f1efe7', '--q-line': 'rgb(28 38 32 / 0.09)',
      '--q-ink': '#17201b', '--q-ink-2': '#5f675f', '--q-ink-3': '#979d95',
      '--q-brand': '#1f4d3a', '--q-brand-soft': '#e7eee9', '--q-brand-ink': '#143326',
      '--q-pos': '#2a6a4b', '--q-pos-soft': '#e6efe9', '--q-neg': '#9b3c2e', '--q-neg-soft': '#f5e8e3', '--q-warn': '#80600f', '--q-warn-soft': '#f2ecd9',
      '--q-radius': '18px', '--q-radius-sm': '10px',
      '--q-card': '0 0 0 1px rgb(28 38 32 / 0.06), 0 2px 4px rgb(28 38 32 / 0.03), 0 18px 40px -18px rgb(28 38 32 / 0.16)',
    },
    status: 'dot', note: 'quiet',
  },
];

/* The type ramp, shared: one family, five steps, two greys; weight only where it carries meaning */
const TYPE = [
  { name: 'Figure', cls: 'text-[34px] leading-[38px] font-medium tracking-[-0.02em] tabular-nums', sample: '1:42:40' },
  { name: 'Title', cls: 'text-[17px] leading-6 font-medium tracking-[-0.01em]', sample: 'Halden & Co.' },
  { name: 'Body', cls: 'text-sm leading-5', sample: 'They need a PO number on every invoice.' },
  { name: 'Meta', cls: 'text-[13px] leading-[18px] text-(--q-ink-2)', sample: 'Brand studio · Copenhagen' },
  { name: 'Label', cls: 'text-xs leading-4 font-medium text-(--q-ink-2)', sample: 'Recent invoices' },
];

const SWATCHES = [['canvas', '--q-canvas'], ['surface', '--q-surface'], ['sunken', '--q-sunken'], ['ink', '--q-ink'], ['ink 2', '--q-ink-2'], ['brand', '--q-brand'], ['positive', '--q-pos'], ['negative', '--q-neg'], ['caution', '--q-warn']];

// status: a dot and a word in the status ink (quiet), or a soft pill with an inset ring (explicit)
function Status({ kind, children, style }) {
  const ink = `var(--q-${kind})`, soft = `var(--q-${kind}-soft)`;
  return style === 'pill'
    ? <span className="inline-flex h-5 items-center rounded-full px-2 text-xs font-medium" style={{ color: ink, background: soft, boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${ink} 14%, transparent)` }}>{children}</span>
    : <span className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: ink }}><span className="size-1.5 rounded-full" style={{ background: ink }} />{children}</span>;
}

// a client shows up by its own mark (as a finance tool shows a company), in the brand's soft tint, never a saturated
// block of initials. Halden's mark: two stacked bars, the second shorter.
const Mark = ({ size = 'size-11' }) => (
  <span className={size + ' grid shrink-0 place-items-center rounded-(--q-radius-sm) bg-(--q-brand-soft) text-(--q-brand-ink)'}>
    <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden="true"><rect x="5" y="6.5" width="14" height="4" rx="2" /><rect x="5" y="13.5" width="9" height="4" rx="2" /></svg>
  </span>
);

function Profile({ d }) {
  return (
    <article className="w-full rounded-(--q-radius) bg-(--q-surface) shadow-(--q-card)">
      <div className="flex flex-col gap-5 p-6">
        <header className="flex items-center gap-3.5">
          <Mark />
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-[17px] leading-6 font-medium tracking-[-0.01em]">Halden & Co.</span>
            <span className="truncate text-[13px] text-(--q-ink-2)">Brand studio · Copenhagen</span>
          </span>
        </header>
        <dl className="grid grid-cols-[7rem_1fr] gap-x-4 gap-y-1.5 text-sm">
          <dt className="text-(--q-ink-2)">Billing contact</dt><dd>Mette Halden</dd>
          <dt className="text-(--q-ink-2)">Terms</dt><dd>Net 14, in DKK</dd>
        </dl>
        {d.note === 'rule'
          ? <aside className="-mx-6 border-y border-(--q-line) bg-(--q-sunken) px-6 py-3 text-sm"><p className="font-medium">Note from Ana</p><p className="mt-0.5 text-(--q-ink-2)">They need a PO number on every invoice.</p></aside>
          : <aside className="-mx-3 rounded-(--q-radius-sm) bg-(--q-sunken) px-3 py-2.5 text-sm"><p className="font-medium">Note from Ana</p><p className="mt-0.5 text-(--q-ink-2)">They need a PO number on every invoice.</p></aside>}
        <section>
          <h3 className="text-xs font-medium text-(--q-ink-2)">Recent invoices</h3>
          <ul className="mt-1">
            {[['Brand refresh', 'INV-2041', 'neg', 'Overdue', '$4,820.00'], ['Signage', 'INV-2036', 'pos', 'Paid', '$1,950.00']].map(([what, id, kind, word, amount]) => (
              <li key={id} className="flex items-center gap-3 border-b border-(--q-line) py-2.5 last:border-0">
                <span className="flex min-w-0 flex-1 flex-col"><span className="truncate text-sm font-medium">{what}</span><span className="case-forms text-[13px] text-(--q-ink-2)">{id}</span></span>
                <Status kind={kind} style={d.status}>{word}</Status>
                <span className="w-20 text-right text-sm tabular-nums">{amount}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </article>
  );
}

function Timer() {
  return (
    <article className="w-full rounded-(--q-radius) bg-(--q-surface) shadow-(--q-card)">
      <div className="flex flex-col gap-4 p-6">
        <span className="flex items-center gap-2 text-xs font-medium text-(--q-ink-2)"><span className="size-1.5 rounded-full bg-(--q-pos)" />Tracking · Marlow Joinery</span>
        <div className="flex items-center justify-between">
          <span className="text-[34px] leading-[38px] font-medium tracking-[-0.02em] tabular-nums">1:42:40</span>
          <button type="button" aria-label="Pause timer" className="grid size-10 place-items-center rounded-full bg-(--q-brand) text-white outline-offset-2 focus-visible:outline-2 focus-visible:outline-(--q-brand)">
            <svg viewBox="0 0 16 16" className="size-3.5" fill="currentColor" aria-hidden="true"><rect x="3.5" y="2.5" width="3" height="11" rx="1" /><rect x="9.5" y="2.5" width="3" height="11" rx="1" /></svg>
          </button>
        </div>
        <span className="text-[13px] text-(--q-ink-2)"><span className="text-(--q-ink) tabular-nums">$248.11</span> at $145 an hour</span>
      </div>
    </article>
  );
}

function Direction({ d }) {
  return (
    <section aria-label={d.name} style={d.vars} className="flex min-w-0 flex-col gap-6 rounded-[22px] bg-(--q-canvas) p-6 text-(--q-ink)">
      <header className="flex flex-col gap-1">
        <h2 className="text-[17px] font-medium tracking-[-0.01em]">{d.name}</h2>
        <p className="text-[13px] text-(--q-ink-2)">{d.says}</p>
      </header>
      <div className="grid grid-cols-9 gap-1.5">
        {SWATCHES.map(([name, v]) => (
          <span key={name} className="flex flex-col gap-1">
            <span className="h-9 rounded-[6px] ring-1 ring-(--q-line)" style={{ background: `var(${v})` }} />
            <span className="truncate text-[10px] text-(--q-ink-2)">{name}</span>
          </span>
        ))}
      </div>
      <div className="flex flex-col gap-2.5 rounded-(--q-radius) bg-(--q-surface) p-5 shadow-(--q-card)">
        {TYPE.map((t) => (
          <div key={t.name} className="flex items-baseline gap-4">
            <span className="w-12 shrink-0 text-[10px] text-(--q-ink-3)">{t.name}</span>
            <span className={'min-w-0 truncate ' + t.cls}>{t.sample}</span>
          </div>
        ))}
        <div className="flex items-center gap-4 pt-1">
          <span className="w-12 shrink-0 text-[10px] text-(--q-ink-3)">Status</span>
          <span className="flex flex-wrap gap-3"><Status kind="pos" style={d.status}>Paid</Status><Status kind="neg" style={d.status}>Overdue</Status><Status kind="warn" style={d.status}>Due soon</Status></span>
        </div>
      </div>
      <Profile d={d} />
      <Timer />
    </section>
  );
}

export function Primitives() {
  return (
    <main className="mx-auto flex max-w-[92rem] flex-col gap-8 px-6 py-10">
      <header className="flex max-w-2xl flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Quarry primitives: three directions</h1>
        <p className="text-sm text-ink-muted">The look every principle's example is built from. Each column is a whole system, shown on the two screens the showcase already has. Pick one (or parts of them); the examples are then rebuilt on it.</p>
      </header>
      <div className="grid gap-6 lg:grid-cols-3">
        {DIRECTIONS.map((d) => <Direction key={d.id} d={d} />)}
      </div>
    </main>
  );
}
