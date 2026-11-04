// One principle, one example (docs/craft/showcase.md): /rule/16 is principle #16 broken, /rule/16/fixed the same
// example built right. The frame around the example is built to pass every rule, so the only mark the overlay can draw
// on this screen is the example's.
import { PRINCIPLES } from './catalogue.js';
import { EXAMPLES } from './examples.jsx';
import { Chevron } from '../icons.jsx';

const FOUND = {
  live: 'The overlay marks it where it is: press Alt+B.',
  probe: 'plumber craft finds it by using the page: pressing, hovering, dragging, or reading it dark, on touch or on a slow reply.',
  habit: 'plumber finds it in the source: run plumber check in the project.',
};

const step = 'grid size-9 place-items-center rounded-control text-ink-muted hover:bg-sunken active:bg-line';

export function Principle({ n, broken }) {
  const p = PRINCIPLES.find((x) => x.n === n);
  const Example = EXAMPLES[n];
  const at = (k, fixed) => `/rule/${k}${fixed ? '/fixed' : ''}`;
  const prev = n > 1 ? n - 1 : null, next = n < PRINCIPLES.length ? n + 1 : null;
  const tab = (on) => 'inline-flex h-8 items-center rounded-[6px] px-3 text-sm ' + (on ? 'bg-surface font-medium text-ink shadow-raised' : 'text-ink-muted');
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6">
      <nav aria-label="Principles" className="flex items-center gap-2 text-sm text-ink-muted">
        <a href="/" className="rounded-chip px-2 py-1 hover:bg-sunken active:bg-line">All principles</a>
        <span className="min-w-0 flex-1 truncate" title={p.section}>{p.section} · {n} of {PRINCIPLES.length}</span>
        {prev ? <a href={at(prev, !broken)} aria-label={'Principle ' + prev} className={step}><Chevron className="rotate-180" /></a> : null}
        {next ? <a href={at(next, !broken)} aria-label={'Principle ' + next} className={step}><Chevron /></a> : null}
      </nav>
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">{p.title}</h1>
        <p className="max-w-measure text-sm text-ink-muted text-pretty">{p.why}</p>
      </header>
      <nav aria-label="Example" className="flex items-center gap-0.5 self-start rounded-control bg-sunken p-0.5">
        <a href={at(n, false)} aria-current={broken ? 'page' : undefined} className={tab(broken)}>Broken</a>
        <a href={at(n, true)} aria-current={broken ? undefined : 'page'} className={tab(!broken)}>Fixed</a>
      </nav>
      <section aria-label="Example" className="rounded-sheet corner-squircle bg-sunken px-4 pt-5 pb-6">
        {Example ? <Example broken={broken} /> : <p className="text-sm text-ink-muted">This example isn’t built yet.</p>}
      </section>
      <p className="text-sm text-ink-muted">{FOUND[p.how]}</p>
    </main>
  );
}

export function Index() {
  const sections = [...new Set(PRINCIPLES.map((p) => p.section))];
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Craft principles, one at a time</h1>
        <p className="max-w-measure text-sm text-ink-muted">Each opens one example from a real app, broken and fixed. Press Alt+B on an example to see what React Plumber marks.</p>
      </header>
      {sections.map((s) => (
        <section key={s} className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">{s}</h2>
          <ol className="flex flex-col">
            {PRINCIPLES.filter((p) => p.section === s).map((p) => (
              <li key={p.n}>
                <a href={`/rule/${p.n}`} className="-mx-2 flex items-baseline gap-3 rounded-chip px-2 py-1.5 text-sm hover:bg-sunken active:bg-line">
                  <span className="w-6 shrink-0 text-right text-ink-muted tabular-nums">{p.n}</span>
                  <span className={EXAMPLES[p.n] ? 'text-ink' : 'text-ink-muted'}>{p.title}</span>
                </a>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </main>
  );
}
