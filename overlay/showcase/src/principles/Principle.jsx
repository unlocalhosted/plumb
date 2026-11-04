// One principle, one example (docs/craft/showcase.md): /rule/16 is principle #16 broken, /rule/16/fixed the same
// example built right. The frame around the example is built to pass every rule, so the only mark the overlay can draw
// on this screen is the example's.
import { PRINCIPLES } from './catalogue.js';
import { EXAMPLES } from './examples.jsx';
import { useEffect, useState } from 'react';
import { Chevron } from '../icons.jsx';

// plumber, asked about the example alone: window.__plumb.craft scoped to it, as an Alt+click on it would read it
const ask = async () => {
  for (let i = 0; i < 80 && !window.__plumb?.craft; i++) await new Promise((r) => setTimeout(r, 100));
  if (!window.__plumb?.craft) throw new Error('The React Plumber overlay isn’t on this page.');
  return (await window.__plumb.craft({ scope: '[data-example]', timeout: 30000 })).findings;
};
// plumber's own fix, applied where it found the problem: its class swap and the values it says that class sets
function apply(findings) {
  const done = [];
  for (const f of findings) {
    const s = f.suggest;
    if (s?.kind !== 'class') continue;
    const els = [...document.querySelectorAll('[data-example] [data-plumb-source]')].filter((e) => e.getAttribute('data-plumb-source').startsWith(`${f.file}:${f.line}:${f.column}#`));
    for (const e of els) {
      if (s.from) e.classList.remove(...s.from.split(/\s+/));
      e.classList.add(...s.to.split(/\s+/));
      Object.assign(e.style, s.sets ?? {});
    }
    if (els.length) done.push({ rule: f.rule, from: s.from, to: s.to, tag: f.tag, count: els.length });
  }
  return done;
}
// broken: what plumber finds. fixed: what it found, its fix applied, and what it finds when asked again.
function usePlumber(fixed) {
  const [state, setState] = useState({ phase: 'asking' });
  useEffect(() => {
    let live = true;
    (async () => {
      const found = await ask();
      if (!fixed) { if (live) setState({ phase: 'done', found }); return; }
      const applied = apply(found);
      const after = await ask();
      if (live) setState({ phase: 'done', found, applied, after });
    })().catch((e) => live && setState({ phase: 'error', error: e.message }));
    return () => { live = false; };
  }, [fixed]);
  return state;
}

const Finding = ({ f }) => (
  <li className="flex flex-col gap-1">
    <span className="text-sm font-medium">{f.title}</span>
    <span className="text-sm text-ink-muted">{f.because}</span>
    <span className="text-sm">{f.suggest?.kind === 'class' ? <>Fix: <code className="rounded-chip bg-sunken px-1 text-xs">{f.suggest.from ? `${f.suggest.from} → ` : '+ '}{f.suggest.to}</code></> : f.action}</span>
    <span className="text-xs text-ink-muted">{f.rule} · {f.file}:{f.line}{f.count > 1 ? ` · ${f.count} places` : ''}</span>
  </li>
);

// what plumber said about this example, in its own words
function Said({ state, fixed }) {
  if (state.phase === 'asking') return <p className="text-sm text-ink-muted">Asking plumber about this example…</p>;
  if (state.phase === 'error') return <p className="text-sm text-negative">{state.error}</p>;
  const list = (fs, none) => (fs.length ? <ul className="flex flex-col gap-4">{fs.map((f, i) => <Finding key={i} f={f} />)}</ul> : <p className="text-sm text-ink-muted">{none}</p>);
  if (!fixed) return <div className="flex flex-col gap-3"><h2 className="text-base font-semibold">What plumber finds</h2>{list(state.found, 'Nothing. plumber has no finding on this example.')}</div>;
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-base font-semibold">plumber’s fix, applied</h2>
      {state.applied.length
        ? <ul className="flex flex-col gap-1 text-sm">{state.applied.map((a, i) => <li key={i}><code className="rounded-chip bg-sunken px-1 text-xs">{a.from ? `${a.from} → ` : '+ '}{a.to}</code> on {a.count} {a.tag}</li>)}</ul>
        : <p className="text-sm text-ink-muted">plumber gave no fix it can apply here{state.found.length ? ', only advice:' : '.'}</p>}
      {!state.applied.length && state.found.length ? list(state.found, '') : null}
      <h2 className="text-base font-semibold">Asked again</h2>
      {list(state.after, 'Nothing. plumber is satisfied with its own fix.')}
    </div>
  );
}

const FOUND = {
  live: 'The overlay marks it where it is: press Alt+B.',
  probe: 'plumber craft finds it by using the page: pressing, hovering, dragging, or reading it dark, on touch or on a slow reply.',
  habit: 'plumber finds it in the source: run plumber check in the project.',
};

const step = 'grid size-9 place-items-center rounded-control text-ink-muted hover:bg-sunken active:bg-line';

export function Principle({ n, broken }) {
  const p = PRINCIPLES.find((x) => x.n === n);
  const Example = EXAMPLES[n];
  const state = usePlumber(!broken);
  const at = (k, fixed) => `/rule/${k}${fixed ? '/fixed' : ''}`;
  const prev = n > 1 ? n - 1 : null, next = n < PRINCIPLES.length ? n + 1 : null;
  const tab = (on) => 'inline-flex h-8 items-center rounded-[6px] px-3 text-sm ' + (on ? 'bg-surface font-medium text-ink shadow-raised' : 'text-ink-muted');
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6">
      <nav aria-label="Principles" className="flex items-center gap-2 text-sm text-ink-muted">
        <a href="/" className="rounded-chip px-2 py-1 hover:bg-sunken active:bg-line md:hidden">All principles</a>
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
        <a href={at(n, true)} aria-current={broken ? undefined : 'page'} className={tab(!broken)}>Fixed by plumber</a>
      </nav>
      <section data-example aria-label="Example" className="rounded-sheet corner-squircle bg-sunken px-4 pt-5 pb-6">
        {Example ? <Example broken /> : <p className="text-sm text-ink-muted">This example isn’t built yet.</p>}
      </section>
      {Example && p.how === 'live' ? <Said state={state} fixed={!broken} /> : <p className="text-sm text-ink-muted">{FOUND[p.how]}</p>}
    </main>
  );
}

// The 77, grouped by catalogue section; the open one is filled and its fill bleeds out by its padding (#1), so every
// row's words share one edge.
function List({ current }) {
  const sections = [...new Set(PRINCIPLES.map((p) => p.section))];
  return (
    <nav aria-label="All principles" className="flex flex-col gap-6">
      {sections.map((s) => (
        <section key={s} className="flex flex-col gap-1">
          <h2 className="text-xs font-medium text-ink-muted">{s}</h2>
          <ol className="flex flex-col">
            {PRINCIPLES.filter((p) => p.section === s).map((p) => (
              <li key={p.n} className="flex">
                <a href={`/rule/${p.n}`} aria-current={p.n === current ? 'page' : undefined}
                  className={'-mx-2 flex min-w-0 flex-1 items-baseline gap-2 rounded-chip px-2 py-1 text-sm hover:bg-sunken active:bg-line ' + (p.n === current ? 'bg-sunken font-medium text-ink' : EXAMPLES[p.n] ? 'text-ink' : 'text-ink-muted')}>
                  <span className="w-5 shrink-0 text-right text-ink-muted tabular-nums">{p.n}</span>
                  <span className="truncate" title={p.title}>{p.title}</span>
                </a>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </nav>
  );
}

// Two columns from 768px: the list on the left, scrolling on its own; the principle on the right. Narrower, the list
// is its own page (/), and each principle links back to it.
export function Layout({ current, children }) {
  return (
    <div className="md:grid md:grid-cols-[18rem_1fr]">
      <aside className="hidden md:sticky md:top-0 md:block md:h-dvh md:overflow-y-auto md:overscroll-contain md:gutter-stable md:border-r-hairline md:border-line md:bg-surface md:px-4 md:py-6">
        <List current={current} />
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function Index() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Craft principles, one at a time</h1>
        <p className="max-w-measure text-sm text-ink-muted">Each opens one example from a real app, broken and fixed. Press Alt+B on an example to see what React Plumber marks.</p>
      </header>
      <List />
    </main>
  );
}
