/* ─────────────────────────────────────────────────────────
 * THE WIPE (the owner's pick for the hero, comp A). One app screen, a team's Projects dashboard, drawn twice: as
 * written in a hurry (each card and row got its own size and space) and as Plumber's clean-up leaves it (each kind of
 * thing on one step). A line splits them: left of it the page as written, its spaces marked off in coral; right of it
 * the page settled, marked on in green. The counts under it are measured from the two rendered screens.
 *
 * STORYBOARD (on load; reduced motion shows the end)
 *      0ms   the whole screen as written, marked; the line parked at the right edge
 *    700ms   the line sweeps left to the middle (1400ms, ease-in-out): the page settles behind it
 *   2100ms   each side's label adds its counts; from here the line is yours: drag it, or focus it and use ← →
 * ───────────────────────────────────────────────────────── */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

const W = 1104, H = 540; // the screen is drawn at this size and scaled to fit
const REST = 52;         // where the line settles, % from the left
const V = {
  messy: { title: 27, pad: [14, 18, 21], gap: [7, 11, 13], text: [13.5, 13, 14, 13.5], label: [11.5, 12, 11], row: [9, 10, 8, 9], stat: [26, 28, 25], side: 10, table: [8, 14] },
  clean: { title: 24, pad: [16, 16, 16], gap: [8, 12, 12], text: [13, 13, 13, 13], label: [12, 12, 12], row: [12, 12, 12, 12], stat: [28, 28, 28], side: 12, table: [8, 12] },
};
const PROJECTS = [
  ['Checkout redesign', 'On track', 'on', 72, 'AO', 330],
  ['Members & roles', 'At risk', 'off', 41, 'RM', 230],
  ['Billing migration', 'On track', 'on', 88, 'LB', 80],
  ['Onboarding emails', 'Not started', 'idle', 0, 'KS', 160],
];

export function Wipe() {
  const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const area = useRef(null), frame = useRef(null), messy = useRef(null), clean = useRef(null);
  const [at, setAt] = useState(reduced ? REST : 100);
  const [sweeping, setSweeping] = useState(false);
  const [settled, setSettled] = useState(reduced);
  const [fit, setFit] = useState(1);
  const [counts, setCounts] = useState(null);
  const [marks, setMarks] = useState({ messy: [], clean: [] });

  useEffect(() => {
    if (reduced) return;
    const a = setTimeout(() => { setSweeping(true); setAt(REST); }, 700);
    const b = setTimeout(() => { setSweeping(false); setSettled(true); }, 2100);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [reduced]);

  // the screen fits the space the hero leaves it: its width always; on a wide window, its height too, so the whole
  // hero is one viewport (hero.css makes the hero exactly that tall and gives the wipe what remains)
  useLayoutEffect(() => {
    const wide = matchMedia('(min-width: 48rem)');
    const measure = () => {
      const w = area.current.clientWidth, h = area.current.clientHeight;
      setFit(Math.min(1, w / W, wide.matches && h > 0 ? h / H : Infinity));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(area.current);
    wide.addEventListener('change', measure);
    return () => { ro.disconnect(); wide.removeEventListener('change', measure); };
  }, []);

  // the marks and the counts, read from the two screens as drawn (in the screen's own units, before scaling)
  useLayoutEffect(() => {
    setMarks({ messy: measure(messy.current), clean: measure(clean.current) });
    setCounts({ messy: count(messy.current), clean: count(clean.current) });
  }, []);

  // the line is yours: drag it anywhere on the frame, or use the arrow keys on it
  const drag = e => {
    if (!settled) return;
    const r = frame.current.getBoundingClientRect();
    const move = ev => setAt(Math.max(0, Math.min(100, ((ev.clientX - r.left) / r.width) * 100)));
    move(e);
    const up = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); };
    addEventListener('pointermove', move); addEventListener('pointerup', up);
  };
  const key = e => {
    const step = e.shiftKey ? 10 : 4;
    if (e.key === 'ArrowLeft') { e.preventDefault(); setAt(v => Math.max(0, v - step)); }
    if (e.key === 'ArrowRight') { e.preventDefault(); setAt(v => Math.min(100, v + step)); }
    if (e.key === 'Home') { e.preventDefault(); setAt(0); }
    if (e.key === 'End') { e.preventDefault(); setAt(100); }
  };

  return (
    <figure ref={area} className="wipe" aria-label="A Projects dashboard as written, and after Plumber’s clean-up">
      <div ref={frame} className="wipe-frame surface" style={{ width: W * fit, height: H * fit, '--at': `${at}%` }} data-sweeping={sweeping} onPointerDown={drag}>
        <div className="wipe-fit" style={{ width: W, height: H, transform: `scale(${fit})` }} aria-hidden="true">
          <div className="wipe-layer"><Screen kind="messy" ref={messy} marks={marks.messy} tone="off" /></div>
          <div className="wipe-layer wipe-clean"><Screen kind="clean" ref={clean} marks={marks.clean} tone="on" /></div>
        </div>
        {/* each side's label carries its own counts, measured from its screen */}
        <span className="wipe-label wipe-label-l">as written{counts && <b data-shown={settled}> · {counts.messy.text} text sizes · {counts.messy.space} spaces</b>}</span>
        <span className="wipe-label wipe-label-r">after Plumber{counts && <b data-shown={settled}> · {counts.clean.text} styles · {counts.clean.space} steps</b>}</span>
        <span className="wipe-line" role="slider" tabIndex={0} aria-label="Compare the page as written with the page after Plumber"
          aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(at)} aria-valuetext={`${Math.round(100 - at)}% of the page shown after Plumber`} onKeyDown={key}>
          <i />
        </span>
      </div>
    </figure>
  );
}

/* The dashboard, as written or settled. Every value that changes is on the element that carries it, marked with what
 * kind of thing it is, so the marks and counts can be read back from the browser. */
const Screen = ({ kind, ref, marks, tone }) => {
  const v = V[kind];
  return (
    <div ref={ref} className="scr">
      <aside className="scr-side">
        <span className="scr-brand"><i />Northwind</span>
        {['Inbox', 'Projects', 'Roadmap', 'Members', 'Settings'].map(n => <span key={n} className={`scr-nav${n === 'Projects' ? ' on' : ''}`} style={{ padding: `${v.side - 4}px 10px` }}>{n}</span>)}
      </aside>
      <div className="scr-main">
        <header className="scr-top"><span className="scr-search">Search projects</span><span className="scr-new">New project</span></header>
        <div className="scr-body" style={{ gap: v.gap[2] }}>
          <h3 className="scr-title" style={{ fontSize: v.title }} data-mark="text">Projects</h3>
          <div className="scr-stats" style={{ gap: v.gap[1] }} data-mark="gap">
            {[['Active', 12], ['Due this week', 4], ['Overdue', 1]].map(([l, n], i) => (
              <div key={l} className="scr-stat" style={{ padding: v.pad[i] }} data-mark="pad">
                <small style={{ fontSize: v.label[i] }} data-mark="text">{l}</small><b style={{ fontSize: v.stat[i] }} data-mark="text">{n}</b>
              </div>
            ))}
          </div>
          <div className="scr-table" style={{ padding: `${v.table[0]}px ${v.table[1]}px` }} data-mark="pad">
            {PROJECTS.map(([name, state, t, pct, who, h], i) => (
              <div key={name} className="scr-row" style={{ gap: v.gap[0] + 4, padding: `${v.row[i]}px 0`, fontSize: v.text[i] }} data-mark="gap">
                <span data-mark="text">{name}</span>
                <span className={`scr-chip scr-chip-${t}`}>{state}</span>
                <span className="scr-bar"><i style={{ width: `${pct}%` }} /></span>
                <i className="scr-av" style={{ '--h': h }}>{who}</i>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="scr-marks">
        {marks.map((m, i) => <span key={i} className={`smk smk-${m.kind}`} data-tone={tone} style={m.style} />)}
      </div>
    </div>
  );
};

// Plumber's spacing marks: padding as a band inside the edge, a gap as a hatched band between two children.
function measure(root) {
  const b = root.getBoundingClientRect(), k = b.width / root.offsetWidth || 1, out = [];
  const box = r => ({ left: (r.left - b.left) / k, top: (r.top - b.top) / k, width: r.width / k, height: r.height / k });
  for (const el of root.querySelectorAll('[data-mark="pad"], [data-mark="gap"]')) {
    const r = el.getBoundingClientRect(), css = getComputedStyle(el);
    if (el.dataset.mark === 'pad') { out.push({ kind: 'pad', style: { ...box(r), padding: css.padding, borderRadius: css.borderRadius } }); continue; }
    const kids = [...el.children].map(c => c.getBoundingClientRect());
    for (let i = 1; i < kids.length; i++) {
      const a = kids[i - 1], z = kids[i];
      const g = z.top >= a.bottom - 1 ? { left: r.left, top: a.bottom, width: r.width, height: z.top - a.bottom } : { left: a.right, top: r.top, width: z.left - a.right, height: r.height };
      if (g.width > 0 && g.height > 0) out.push({ kind: 'gap', style: box(g) });
    }
  }
  return out;
}

// How many different text sizes and spaces the screen uses.
function count(root) {
  const text = new Set(), space = new Set();
  for (const el of root.querySelectorAll('[data-mark]')) {
    const css = getComputedStyle(el);
    if (el.dataset.mark === 'text') text.add(parseFloat(css.fontSize));
    else if (el.dataset.mark === 'pad') [css.paddingTop, css.paddingRight].forEach(p => space.add(parseFloat(p)));
    else { space.add(parseFloat(css.columnGap)); space.add(parseFloat(css.paddingTop)); }
  }
  return { text: text.size, space: [...space].filter(v => v > 0).length };
}
