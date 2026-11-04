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
// plumber's sets as style declarations: camelCase to kebab, a bare number in pixels (as its rules hand them over)
const kebab = (o = {}) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase()), typeof v === 'number' ? `${v}px` : v]));

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
        // the class lands on the element; what it stands for lands where it reaches (its target), or on the element
        const memo = {}, styles = kebab(f.suggest.sets), on = f.suggest.target ? [...el.querySelectorAll(f.suggest.target)] : [];
        swapPreview(el, { from: f.suggest.from, to: f.suggest.to }, true, memo, on.length ? {} : styles);
        taken.current.push({ el, memo });
        for (const child of on) { const m = {}; swapPreview(child, { from: '', to: '' }, true, m, styles); taken.current.push({ el: child, memo: m }); }
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
const pad = 6;

// The loupe: a live copy of the example, magnified on the spot the example's measure names, so a fix of a pixel or
// two can be seen. The copy drops plumber's source stamps and the scope mark, so plumber never reads it.
const ZOOM = 4, LENS_H = 112;
function Loupe({ seen, stage, phase }) {
  const host = useRef(null);
  const [w, setW] = useState(256);
  useEffect(() => {
    const draw = () => {
      const src = document.querySelector(SCOPE), into = host.current;
      if (!src || !into || !seen?.focus || !stage.current) return;
      const LW = into.clientWidth || 256;
      setW(LW);
      const copy = src.cloneNode(true);
      copy.removeAttribute('data-example');
      for (const e of [copy, ...copy.querySelectorAll('*')]) { e.removeAttribute('data-plumb-source'); e.removeAttribute('id'); }
      const box = src.getBoundingClientRect(), s = stage.current.getBoundingClientRect();
      const fx = seen.focus.x - (box.left - s.left), fy = seen.focus.y - (box.top - s.top);
      Object.assign(copy.style, { position: 'absolute', left: '0', top: '0', width: `${box.width}px`, margin: '0', boxShadow: 'none', transformOrigin: '0 0', transform: `translate(${LW / 2 - fx * ZOOM}px, ${LENS_H / 2 - fy * ZOOM}px) scale(${ZOOM})` });
      into.replaceChildren(copy);
    };
    draw();
    const t = setTimeout(draw, 480); // again once plumber's glide has settled
    return () => clearTimeout(t);
  }, [seen?.focus?.x, seen?.focus?.y, phase, stage]);
  if (!seen?.focus) return null;
  return (
    <div data-loupe aria-hidden="true" className="relative overflow-hidden rounded-control border border-line bg-surface" style={{ height: LENS_H }}>
      <div ref={host} inert className="absolute inset-0" />
      {/* the guides, at the loupe's scale */}
      {seen.ticks.map((t, i) => (t.y === undefined
        ? <span key={i} className={'absolute border-l border-dashed transition-[left] duration-300 ' + (seen.off ? 'border-negative/70' : 'border-accent/70')} style={{ left: w / 2 + (t.x - seen.focus.x) * ZOOM, top: 0, height: LENS_H }} />
        : <span key={i} className={'absolute border-t border-dashed transition-[top] duration-300 ' + (seen.off ? 'border-negative/70' : 'border-accent/70')} style={{ top: LENS_H / 2 + (t.y - seen.focus.y) * ZOOM, left: 0, width: w }} />))}
      <span className="absolute right-2 bottom-2 rounded-full bg-ink/80 px-1.5 font-mono text-[10px] text-accent-ink">{ZOOM}×</span>
    </div>
  );
}

function Annotations({ state, stage, measureOf, onAnchor, onSeen }) {
  const [boxes, setBoxes] = useState([]);
  const [seen, setSeen] = useState(null);
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
      const first = sitesOf(state.found[0] ?? {}).map((e) => e.getBoundingClientRect());
      if (first.length && !measureOf) onAnchor?.({ y: Math.round((Math.min(...first.map((r) => r.top)) + Math.max(...first.map((r) => r.bottom))) / 2 - s.top), reach: Math.round(s.right - Math.max(...first.map((r) => r.right)) - pad - 10) });
      // the example's own view of the harm, when it has one (where the eye sees the problem), in the stage's frame
      const m = measureOf?.(document.querySelector(SCOPE));
      const next = m ? { ...m, focus: m.focus ? { x: m.focus.x - s.left, y: m.focus.y - s.top } : null, ticks: m.ticks.map((t) => (t.y === undefined ? { x: t.x - s.left, top: t.top - s.top, bottom: t.bottom - s.top } : { y: t.y - s.top, left: t.left - s.left, right: t.right - s.left })) } : null;
      if (next) {
        // the subject: what the guides span, and the element they're about (so the pill clears its words)
        const a = m.around?.getBoundingClientRect?.(), box = a ? [[a.left - s.left, a.top - s.top], [a.right - s.left, a.bottom - s.top]] : [];
        const xs = [...next.ticks.flatMap((t) => (t.y === undefined ? [t.x] : [t.left, t.right])), ...box.map((p) => p[0])], ys = [...next.ticks.flatMap((t) => (t.y === undefined ? [t.top, t.bottom] : [t.y])), ...box.map((p) => p[1])];
        next.subject = { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys), width: s.width };
        // the card lines up with the subject; its leader leaves from the window's edge, never across the example
        onAnchor?.({ y: Math.round(next.focus ? next.focus.y : (next.subject.top + next.subject.bottom) / 2), reach: 0 });
      }
      setSeen(next); onSeen?.(next);
      if (performance.now() < until) frame = requestAnimationFrame(measure);
    };
    measure();
    addEventListener('resize', measure);
    return () => { cancelAnimationFrame(frame); removeEventListener('resize', measure); };
  }, [state.phase, state.found, stage]);
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-sheet corner-squircle">
      {boxes.map((b) => (
        <div key={b.key}>
          {/* the spotlight: everything but the named elements fades back */}
          <div className="absolute rounded-control transition-[box-shadow] duration-300" style={{ left: b.x - pad, top: b.y - pad, width: b.w + pad * 2, height: b.h + pad * 2, boxShadow: `0 0 0 9999px color-mix(in oklch, var(--color-surface) ${fixed ? 72 : 0}%, transparent)` }} />
          {/* the bracket: the measured span, ticked at both ends (only where the example names no subject of its own) */}
          {seen ? null : <div className={'absolute border-y border-r border-dashed transition-colors duration-300 ' + (fixed ? 'border-accent/50' : 'border-negative/50')} style={{ left: b.x + b.w + pad + 4, top: b.y, width: 5, height: b.h }} />}
          {seen ? null : <span className={'absolute flex items-center gap-1 rounded-chip px-1.5 py-0.5 font-mono text-[11px] whitespace-nowrap text-accent-ink transition-colors duration-300 ' + (fixed ? 'bg-accent' : 'bg-negative')}
            style={{ left: b.x + b.w + pad + 10, top: b.y - 30, transform: 'translateX(-100%)' }}>{seen ? (fixed && !seen.off ? seen.fixed : seen.broken) : fixed ? <>{b.now} ✓</> : b.was}</span>}
        </div>
      ))}

      {/* where the eye sees it: a tick on each place the example measures, red while they disagree, blue once they line up */}
      {seen?.ticks.map((t, i) => (t.y === undefined
        ? <span key={i} className={'absolute border-l border-dashed transition-[left,border-color] duration-300 ' + (seen.off ? 'border-negative/60' : 'border-accent/60')} style={{ left: t.x - 0.5, top: t.top, height: t.bottom - t.top }} />
        : <span key={i} className={'absolute border-t border-dashed transition-[top,border-color] duration-300 ' + (seen.off ? 'border-negative/60' : 'border-accent/60')} style={{ top: t.y - 0.5, left: t.left, width: t.right - t.left }} />))}
    </div>
  );
}

// plumber's finding as a card floating beside the window, joined to what it found by a leader line: what it saw, why,
// its fix as a chip, and where in the source. Once its fix is in, what plumber says when asked again.
const Part = ({ label, children }) => <div className="flex flex-col gap-1"><span className="text-xs font-medium text-ink-muted">{label}</span>{children}</div>;
function FindingCard({ state, anchor, seen, stage, lesson }) {
  const fixed = state.phase === 'fixed';
  const f = state.found?.[0];
  const chip = (to, from) => { const t = `${from ? `${from} → ` : '+ '}${to}`; return <code title={t} className="block truncate rounded-chip bg-sunken px-1.5 py-0.5 font-mono text-[11px] text-ink-muted">{t}</code>; };
  let body;
  if (state.phase === 'asking') body = (
    <div aria-label="Asking plumber about this example" className="flex flex-col gap-2">
      <span className="h-3.5 w-11/12 animate-pulse rounded-chip bg-sunken" /><span className="h-3.5 w-3/4 animate-pulse rounded-chip bg-sunken" /><span className="h-3.5 w-1/2 animate-pulse rounded-chip bg-sunken" />
    </div>
  );
  else if (state.phase === 'error') body = <p className="text-sm text-negative">{state.error}</p>;
  else if (!f) body = <p className="text-sm text-ink-muted">plumber has no finding on this example.</p>;
  else body = (
    <div key={fixed ? 'fixed' : 'found'} className="flex animate-rise flex-col gap-4 motion-reduce:animate-none">
      {/* a lesson, not a diff: what plumber sees, why it happens, the habit to keep, then plumber's fix */}
      {fixed ? (
        <Part label="What changed">
          <p className="text-sm text-pretty">plumber’s fix: {f.suggest?.why ?? f.action}.</p>
          {f.suggest?.kind === 'class' ? chip(f.suggest.to, f.suggest.from) : null}
          <p className="text-sm text-ink-muted text-pretty">{state.after?.length ? `Asked again: ${state.after[0].title}` : 'Asked again, plumber finds nothing.'}</p>
        </Part>
      ) : (
        <>
          <Part label="What plumber sees"><p className="text-sm font-medium text-pretty">{f.title}</p></Part>
          <Part label="Why it happens"><p className="text-sm text-ink-muted text-pretty">{lesson?.why ?? f.because}</p></Part>
        </>
      )}
      {lesson?.habit ? <p className="rounded-control bg-sunken px-3 pt-2 pb-2.5 text-sm text-pretty"><span className="font-medium">The habit: </span>{lesson.habit}</p> : null}
      {fixed ? null : (
        <Part label="plumber’s fix">
          <p className="text-sm text-pretty">{f.suggest?.why ? f.suggest.why[0].toUpperCase() + f.suggest.why.slice(1) + '.' : f.action}</p>
          {f.suggest?.kind === 'class' ? chip(f.suggest.to, f.suggest.from) : null}
        </Part>
      )}
      <p className="font-mono text-[11px] text-ink-muted">{f.rule} · {f.file.split('/').pop()}:{f.line}{f.count > 1 ? ` · ${f.count} places` : ''}</p>
    </div>
  );
  return (
    <aside aria-label="What plumber finds" className="relative w-full md:mt-(--anchor) md:w-72 md:shrink-0" style={{ '--anchor': `${Math.max(0, (anchor?.y ?? 40) - 40)}px`, '--reach': `${40 + Math.max(0, anchor?.reach ?? 0)}px` }}>
      {/* the leader: from the bracket, across the window's edge, to the card */}
      <span aria-hidden="true" className={'absolute top-10 right-full hidden w-(--reach) border-t border-dashed transition-colors duration-300 md:block ' + (fixed ? 'border-accent/50' : 'border-negative/50')} />
      {/* the measurement, as a tab on plumber's card where the leader arrives: never over the example's words */}
      {seen ? (
        <span className={'absolute -top-3 left-4 z-10 rounded-chip px-1.5 py-0.5 font-mono text-[11px] whitespace-nowrap text-accent-ink transition-colors duration-300 ' + (state.phase === 'fixed' && !seen.off ? 'bg-accent' : 'bg-negative')}>
          {state.phase === 'fixed' && !seen.off ? seen.fixed : seen.broken}
        </span>
      ) : null}
      <div className="flex flex-col gap-3 rounded-card border border-line bg-surface/90 px-4 pt-3 pb-4 shadow-overlay backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-medium text-ink-muted">plumber</span>
          <span className={'rounded-full px-2 py-0.5 text-xs font-medium transition-colors duration-300 ' + (fixed ? 'bg-accent-soft text-accent' : 'bg-negative-soft text-negative')}>{fixed ? 'Fixed' : 'Found'}</span>
        </div>
        {seen?.focus && state.phase !== 'asking' ? <Loupe seen={seen} stage={stage} phase={state.phase} /> : null}
        {body}
      </div>
    </aside>
  );
}

const FOUND = {
  probe: 'plumber craft finds it by using the page: pressing, hovering, dragging, or reading it dark, on touch or on a slow reply.',
  habit: 'plumber finds it in the source: run plumber check in the project.',
};

const RING = 'outline-offset-2 focus-visible:outline-2 focus-visible:outline-accent';
const step = 'grid size-8 shrink-0 place-items-center rounded-full text-ink-muted hover:bg-sunken active:bg-line ' + RING;

// The page: the board is the hero. A slim bar floats at the top (where you are, the switch, prev and next); the
// principle's name sits small above the window; plumber's card floats beside it.
export function Principle({ n }) {
  const p = PRINCIPLES.find((x) => x.n === n);
  const Example = EXAMPLES[n];
  const { state, fix, undo } = usePlumber();
  const stage = useRef(null);
  const [anchor, setAnchor] = useState(null);
  const [seen, setSeen] = useState(null);
  const prev = n > 1 ? n - 1 : null, next = n < PRINCIPLES.length ? n + 1 : null;
  const fixed = state.phase === 'fixing' || state.phase === 'fixed', ready = state.phase === 'broken' || state.phase === 'fixed';
  const live = Example && p.how === 'live';
  useEffect(() => { document.title = `${n} · ${p.title} · plumber`; }, [n, p.title]);
  useEffect(() => {
    const key = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey || /input|textarea|select/i.test(e.target.localName)) return;
      if (e.key === 'ArrowLeft' && prev) location.href = `/rule/${prev}`;
      else if (e.key === 'ArrowRight' && next) location.href = `/rule/${next}`;
      else if (live && ready && e.key === 'f' && !fixed) fix();
      else if (live && ready && e.key === 'b' && fixed) undo();
    };
    addEventListener('keydown', key);
    return () => removeEventListener('keydown', key);
  });
  const tab = (on) => 'inline-flex h-7 items-center rounded-full px-3 text-sm transition-colors disabled:text-ink-subtle ' + RING + ' ' + (on ? 'bg-ink font-medium text-accent-ink' : 'text-ink-muted hover:text-ink');
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 flex justify-center px-4 pt-4">
        <nav aria-label="Principle" className="flex w-full max-w-3xl items-center gap-2 rounded-full border border-line bg-surface/85 py-1.5 pr-1.5 pl-4 shadow-raised backdrop-blur">
          {/* narrow: where you are is also the way to the list of all 77 */}
          <a href="/" aria-label={`Principle ${n} of ${PRINCIPLES.length}: all principles`} className={'shrink-0 rounded-full text-sm font-medium tabular-nums sm:hidden ' + RING}>{n} / {PRINCIPLES.length}</a>
          <span className="hidden min-w-0 flex-1 truncate text-sm text-ink-muted sm:inline" title={p.section}>{p.section} · <span className="tabular-nums">{n}</span> of {PRINCIPLES.length}</span>
          <span className="flex-1 sm:hidden" />
          {live ? (
            <div role="group" aria-label="Example" className="flex items-center gap-0.5 rounded-full bg-sunken p-0.5">
              <button type="button" aria-pressed={!fixed} disabled={!ready} onClick={() => fixed && undo()} title="Broken (B)" className={tab(!fixed)}>Broken</button>
              <button type="button" aria-pressed={fixed} disabled={!ready} onClick={() => !fixed && fix()} title="Fixed by plumber (F)" className={tab(fixed)}>Fixed</button>
            </div>
          ) : null}
          {prev ? <a href={`/rule/${prev}`} aria-label={'Principle ' + prev} title="Previous (←)" className={step}><Chevron className="rotate-180" /></a> : null}
          {next ? <a href={`/rule/${next}`} aria-label={'Principle ' + next} title="Next (→)" className={step}><Chevron /></a> : null}
        </nav>
      </header>
      <main className="flex flex-1 flex-col items-center gap-6 px-4 pt-10 pb-16 sm:pt-14">
        <div className="flex max-w-lg flex-col items-center gap-2 text-center">
          <span className={'rounded-full px-2 py-0.5 font-mono text-[11px] font-medium transition-colors duration-300 ' + (fixed ? 'bg-accent text-accent-ink' : 'bg-negative text-accent-ink')}>#{n} · {fixed ? 'fixed' : 'broken'}</span>
          <h1 className="text-xl font-semibold tracking-tight text-balance">{p.title}</h1>
          <p className="text-sm text-ink-muted text-balance">{p.why}</p>
        </div>
        <div className="flex w-full max-w-5xl flex-col items-center gap-6 md:flex-row md:items-start md:justify-center md:gap-10">
          <div ref={stage} className="relative w-full max-w-lg">
            {/* the window plumber reads */}
            <section data-example aria-label="Example" className="flex w-full min-w-0 justify-center rounded-sheet corner-squircle border border-line bg-surface px-4 pt-4 pb-5 shadow-window sm:px-6 sm:pt-5 sm:pb-6">
              {Example ? <Example broken /> : <p className="text-sm text-ink-muted">This example isn’t built yet.</p>}
            </section>
            {Example && state.found ? <Annotations state={state} stage={stage} measureOf={Example.measure} onAnchor={setAnchor} onSeen={setSeen} /> : null}
          </div>
          {live ? <FindingCard state={state} anchor={anchor} seen={seen} stage={stage} lesson={Example?.lesson} /> : <p className="max-w-72 text-sm text-ink-muted">{FOUND[p.how] ?? ''}</p>}
        </div>
      </main>
    </div>
  );
}

// The 77, grouped by catalogue section; the open one is filled and its fill bleeds out by its padding (#1), so every
// row's words share one edge.
// the open principle is brought into the list's view once, when the page opens, not on every render
const intoView = (el) => { if (el && !el.dataset.shown) { el.dataset.shown = '1'; el.scrollIntoView({ block: 'center' }); } };
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
                <a href={`/rule/${p.n}`} aria-current={p.n === current ? 'page' : undefined} ref={p.n === current ? intoView : undefined}
                  className={'-mx-2 flex min-w-0 flex-1 items-baseline gap-2 rounded-chip px-2 py-1 text-sm hover:bg-sunken active:bg-line ' + RING + ' ' + (p.n === current ? 'bg-sunken font-medium text-ink' : EXAMPLES[p.n] ? 'text-ink' : 'text-ink-muted')}>
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
    <div className="board min-h-dvh md:pl-72">
      <aside className="hidden md:fixed md:inset-y-4 md:left-4 md:block md:w-64 md:overflow-y-auto md:overscroll-contain md:rounded-card md:border md:border-line md:bg-surface/80 md:px-4 md:py-5 md:shadow-overlay md:backdrop-blur md:gutter-stable">
        <List current={current} />
      </aside>
      {children}
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
