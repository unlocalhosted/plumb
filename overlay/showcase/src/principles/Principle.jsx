// One principle, one example (docs/craft/showcase.md), all of it plumber's: /rule/16 opens the example inside
// plumber's blueprint, scoped to it (the rest of the screen dimmed, the example's marks and gutters drawn); the switch
// takes plumber's own fix in place with plumber's own glide (inplace.js: swapPreview and its GLIDE), and puts it back
// the same way. Nothing reloads; the frame around the example is built to pass every rule.
import { useEffect, useRef, useState } from 'react';
import { PRINCIPLES } from './catalogue.js';
import { EXAMPLES } from './examples.jsx';
import { Chevron } from '../icons.jsx';

const SCOPE = '[data-example]';
const plumber = async () => {
  for (let i = 0; i < 80 && !window.__plumb?.craft; i++) await new Promise((r) => setTimeout(r, 100));
  if (!window.__plumb?.craft) throw new Error('The React Plumber overlay isn’t on this page.');
  return window.__plumb;
};
// plumber's own in-place primitives, as the overlay serves them
const INPLACE = '/__plumb/src/inplace.js'; // served by the overlay at runtime, not bundled with the app
const inplace = () => import(/* @vite-ignore */ INPLACE);
// what plumber finds in the example, read without drawing (the blueprint then draws it, scoped)
const ask = async () => (await (await plumber()).craft({ scope: SCOPE, timeout: 30000, hidden: true })).findings;
const sitesOf = (f) => [...document.querySelectorAll(`${SCOPE} [data-plumb-source]`)].filter((e) => e.getAttribute('data-plumb-source').startsWith(`${f.file}:${f.line}:${f.column}#`));
const kebab = (o = {}) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase()), v]));

// The example's life: plumber reads it, the blueprint opens on it, and the switch takes plumber's fix or gives it back.
function usePlumber() {
  const [state, setState] = useState({ phase: 'asking' });
  const taken = useRef([]);
  useEffect(() => {
    let live = true;
    (async () => {
      const found = await ask();
      if (live) setState({ phase: 'broken', found });
    })().catch((e) => live && setState({ phase: 'error', error: e.message }));
    return () => { live = false; };
  }, []);
  const fix = async () => {
    const { swapPreview, GLIDE } = await inplace();
    taken.current = [];
    for (const f of state.found) {
      if (f.suggest?.kind !== 'class') continue;
      for (const el of sitesOf(f)) {
        const memo = {};
        swapPreview(el, { from: f.suggest.from, to: f.suggest.to }, true, memo, kebab(f.suggest.sets));
        taken.current.push({ el, memo });
      }
    }
    setState((s) => ({ ...s, phase: 'fixing' }));
    await new Promise((r) => setTimeout(r, GLIDE.ms + 120));
    const after = await ask();
    setState((s) => ({ ...s, phase: 'fixed', after, applied: taken.current.length }));
  };
  const undo = async () => {
    const { swapPreview } = await inplace();
    for (const { el, memo } of taken.current) swapPreview(el, null, false, memo);
    taken.current = [];
    setState((s) => ({ ...s, phase: 'broken', after: null }));
  };
  return { state, fix, undo };
}

// The finding on the page, as the reference demo draws it: the elements plumber named lit, the rest of the example
// faded back, and a bracket with a pill carrying plumber's own value. Red as found; once plumber's fix is in, blue with
// a check and the value its fix sets. It follows the elements while they glide, and sits outside the example, so
// plumber never reads it.
function Annotations({ state, stage }) {
  const [boxes, setBoxes] = useState([]);
  const fixed = state.phase === 'fixing' || state.phase === 'fixed';
  useEffect(() => {
    if (!stage.current || !state.found) return undefined;
    let frame = 0, until = performance.now() + 900;
    const measure = () => {
      const s = stage.current.getBoundingClientRect();
      setBoxes(state.found.map((f) => {
        const rs = sitesOf(f).map((e) => e.getBoundingClientRect());
        if (!rs.length) return null;
        const x = Math.min(...rs.map((r) => r.left)) - s.left, y = Math.min(...rs.map((r) => r.top)) - s.top;
        const w = Math.max(...rs.map((r) => r.right)) - s.left - x, h = Math.max(...rs.map((r) => r.bottom)) - s.top - y;
        const was = `${f.text}: ${f.value}`, now = f.suggest?.kind === 'class' ? f.suggest.to : f.suggest?.text ?? f.action;
        return { key: f.rule + f.line, x, y, w, h, was, now };
      }).filter(Boolean));
      if (performance.now() < until) frame = requestAnimationFrame(measure);
    };
    measure();
    addEventListener('resize', measure);
    return () => { cancelAnimationFrame(frame); removeEventListener('resize', measure); };
  }, [state.phase, state.found, stage]);
  const pad = 6;
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-sheet">
      {boxes.map((b) => (
        <div key={b.key}>
          {/* the spotlight: everything but the named elements fades back */}
          <div className="absolute rounded-control transition-[box-shadow] duration-300" style={{ left: b.x - pad, top: b.y - pad, width: b.w + pad * 2, height: b.h + pad * 2, boxShadow: `0 0 0 9999px color-mix(in oklch, var(--color-sunken) ${fixed ? 70 : 0}%, transparent)` }} />
          {/* the bracket: the measured span, ticked at both ends */}
          <div className={'absolute border-y-2 transition-colors duration-300 ' + (fixed ? 'border-accent' : 'border-negative')} style={{ left: b.x + b.w + pad + 4, top: b.y, width: 6, height: b.h, borderRightWidth: 2, borderRightStyle: 'solid' }} />
          <span className={'absolute flex items-center gap-1 rounded-chip px-1.5 py-0.5 font-mono text-[11px] whitespace-nowrap text-accent-ink transition-colors duration-300 ' + (fixed ? 'bg-accent' : 'bg-negative')}
            style={{ left: b.x + b.w + pad + 14, top: b.y + b.h / 2 - 10 }}>{fixed ? <>{b.now} ✓</> : b.was}</span>
        </div>
      ))}
    </div>
  );
}

const Finding = ({ f }) => (
  <li className="flex flex-col gap-1">
    <span className="text-sm font-medium">{f.title}</span>
    <span className="text-sm text-ink-muted">{f.because}</span>
    <span className="text-sm">{f.suggest?.kind === 'class' ? <>Fix: <code className="rounded-chip bg-sunken px-1 text-xs">{f.suggest.from ? `${f.suggest.from} → ` : '+ '}{f.suggest.to}</code></> : f.action}</span>
    <span className="text-xs text-ink-muted">{f.rule} · {f.file}:{f.line}{f.count > 1 ? ` · ${f.count} places` : ''}</span>
  </li>
);

// what plumber says, in its own words: what it found, and once its fix is in, what it finds when asked again
function Said({ state }) {
  if (state.phase === 'asking') return <p className="text-sm text-ink-muted">Asking plumber about this example…</p>;
  if (state.phase === 'error') return <p className="text-sm text-negative">{state.error}</p>;
  const list = (fs, none) => (fs.length ? <ul className="flex flex-col gap-4">{fs.map((f, i) => <Finding key={i} f={f} />)}</ul> : <p className="text-sm text-ink-muted">{none}</p>);
  if (state.phase !== 'fixed') return <div className="flex flex-col gap-3"><h2 className="text-base font-semibold">What plumber finds</h2>{list(state.found, 'Nothing. plumber has no finding on this example.')}</div>;
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-base font-semibold">Asked again, with its fix in</h2>
      {state.applied ? null : <p className="text-sm text-ink-muted">plumber gave advice here, not a fix it can apply.</p>}
      {list(state.after, 'Nothing. plumber is satisfied with its own fix.')}
    </div>
  );
}

const FOUND = {
  probe: 'plumber craft finds it by using the page: pressing, hovering, dragging, or reading it dark, on touch or on a slow reply.',
  habit: 'plumber finds it in the source: run plumber check in the project.',
};

const step = 'grid size-9 place-items-center rounded-control text-ink-muted hover:bg-sunken active:bg-line';

export function Principle({ n }) {
  const p = PRINCIPLES.find((x) => x.n === n);
  const Example = EXAMPLES[n];
  const { state, fix, undo } = usePlumber();
  const stage = useRef(null);
  const prev = n > 1 ? n - 1 : null, next = n < PRINCIPLES.length ? n + 1 : null;
  const fixed = state.phase === 'fixing' || state.phase === 'fixed', ready = state.phase === 'broken' || state.phase === 'fixed';
  const tab = (on) => 'inline-flex h-8 items-center rounded-[6px] px-3 text-sm disabled:text-ink-subtle ' + (on ? 'bg-surface font-medium text-ink shadow-raised' : 'text-ink-muted');
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6">
      <nav aria-label="Principles" className="flex items-center gap-2 text-sm text-ink-muted">
        <a href="/" className="rounded-chip px-2 py-1 hover:bg-sunken active:bg-line md:hidden">All principles</a>
        <span className="min-w-0 flex-1 truncate" title={p.section}>{p.section} · {n} of {PRINCIPLES.length}</span>
        {prev ? <a href={`/rule/${prev}`} aria-label={'Principle ' + prev} className={step}><Chevron className="rotate-180" /></a> : null}
        {next ? <a href={`/rule/${next}`} aria-label={'Principle ' + next} className={step}><Chevron /></a> : null}
      </nav>
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">{p.title}</h1>
        <p className="max-w-measure text-sm text-ink-muted text-pretty">{p.why}</p>
      </header>
      {Example && p.how === 'live' ? (
        <div role="group" aria-label="Example" className="flex items-center gap-0.5 self-start rounded-control bg-sunken p-0.5">
          <button type="button" aria-pressed={!fixed} disabled={!ready} onClick={() => fixed && undo()} className={tab(!fixed)}>Broken</button>
          <button type="button" aria-pressed={fixed} disabled={!ready} onClick={() => !fixed && fix()} className={tab(fixed)}>Fixed by plumber</button>
        </div>
      ) : null}
      <div ref={stage} className="relative">
        <section data-example aria-label="Example" className="rounded-sheet corner-squircle bg-sunken px-4 pt-5 pb-6">
          {Example ? <Example broken /> : <p className="text-sm text-ink-muted">This example isn’t built yet.</p>}
        </section>
        {Example && state.found ? <Annotations state={state} stage={stage} /> : null}
      </div>
      {Example && p.how === 'live' ? <Said state={state} /> : <p className="text-sm text-ink-muted">{FOUND[p.how] ?? ''}</p>}
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
