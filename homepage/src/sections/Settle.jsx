/* ─────────────────────────────────────────────────────────
 * EVERY FIX USES YOUR THEME. The doubt it answers: "will its fixes match my design system, or bring their own?"
 * The proof, as in the hero, is a real screen being fixed: a team's Members panel, its spaces picked by eye. The toy:
 * your theme is a sheet of stickers. Plumber reads the sheet, then peels the right sticker for each space and slaps
 * it on, picked by the space's job, not by the nearest number (21px of card padding becomes card, 16px, not 24). The
 * JSX under the screen changes as each one lands.
 *
 * STORYBOARD (starts when the frame scrolls into view; "Again" replays it; reduced motion shows the end)
 *      0ms   the screen as written: five spaces picked one at a time
 *    700ms   marked: each space drawn as the box model draws it, coral, with its value
 *   1700ms   your theme is read: a scan runs down the sticker sheet, each step lifts as it's read
 *   3000ms   one space at a time (900ms apart): its sticker peels off the sheet, arcs over and slaps onto the space;
 *            the space glides to the step, its band turns mint, its line of JSX swaps
 *   7900ms   done: the marks lift, the stickers stay; "0 new values" slaps onto the frame
 * ───────────────────────────────────────────────────────── */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { BLOCK_ICONS } from '../../../overlay/src/boxmodel.js';
import './settle.css';

// The theme: the steps it names, and why each exists (what @theme says in the app's own CSS).
const STEPS = [
  { name: 'tight', px: 4, why: 'inside a group' },
  { name: 'related', px: 8, why: 'related parts' },
  { name: 'control', px: 12, why: 'a control’s padding' },
  { name: 'card', px: 16, why: 'card padding' },
  { name: 'stack', px: 24, why: 'between groups' },
];
const STEP = Object.fromEntries(STEPS.map(s => [s.name, s]));
// The five spaces, in the order Plumber fixes them. Three of them are picked by their job against their number: 21px
// is nearest 24 but it's a card's padding; 13px and 11px are nearest 12 but one sits between groups, one inside a row.
const SPOTS = [
  { id: 'card', written: 21, cls: 'p', tag: 'section', step: 'card', said: 'The card’s padding, 21px, becomes card: 16px. Not 24, the nearest number: its job is card padding.' },
  { id: 'stack', written: 13, cls: 'gap', tag: 'div', step: 'stack', said: 'The space between the invite and the list, 13px, becomes stack: 24px, between groups.' },
  { id: 'control', written: 9, cls: 'px', tag: 'input', step: 'control', said: 'The field’s padding, 9px, becomes control: 12px, a control’s padding.' },
  { id: 'related', written: 11, cls: 'gap', tag: 'li', step: 'related', said: 'Avatar to name, 11px, becomes related: 8px. They belong together.' },
  { id: 'tight', written: 3, cls: 'gap', tag: 'span', step: 'tight', said: 'Name to email, 3px, becomes tight: 4px, inside a group.' },
];
const TIMING = { marked: 700, read: 1700, first: 3000, each: 900 };
const DONE = SPOTS.length + 3; // stage after the last space is fixed
const STAGES = [0, TIMING.marked, TIMING.read, ...SPOTS.map((_, i) => TIMING.first + i * TIMING.each), TIMING.first + SPOTS.length * TIMING.each];
const SAID = [
  'A Members screen, written in a hurry: five spaces, each picked by eye.',
  'Plumber marks each space with the value it was given.',
  'It reads your theme: five steps, and why each one exists.',
  ...SPOTS.map(s => s.said),
  'Every space is now one of your steps. No new values.',
];
const PEOPLE = [
  { name: 'Ada Okafor', mail: 'ada@northwind.studio', role: 'Owner', hue: 'pink' },
  { name: 'Ravi Menon', mail: 'ravi@northwind.studio', role: 'Editor', hue: 'sky' },
  { name: 'Lena Brandt', mail: 'lena@northwind.studio', role: 'Viewer', hue: 'butter' },
];

export function Settle() {
  const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const art = useRef(null);
  const [run, setRun] = useState(reduced ? 1 : 0); // 0 waiting to be seen; each replay counts up, to restart
  const [stage, setStage] = useState(reduced ? DONE : 0);
  const [marks, setMarks] = useState({});

  useEffect(() => {
    if (reduced) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setRun(1); io.disconnect(); } }, { threshold: 0.4 });
    io.observe(art.current);
    return () => io.disconnect();
  }, [reduced]);
  useEffect(() => {
    if (!run || reduced) return;
    setStage(0);
    const timers = STAGES.slice(1).map((t, i) => setTimeout(() => setStage(i + 1), t));
    return () => timers.forEach(clearTimeout);
  }, [run, reduced]);

  const fixed = i => stage >= 3 + i;
  const px = (s, i) => (fixed(i) ? STEP[s.step].px : s.written);
  const sp = Object.fromEntries(SPOTS.map((s, i) => [s.id, px(s, i)]));

  // where each space and each sticker sits on the frame, read from the browser, again once the spaces have glided
  useLayoutEffect(() => {
    const measure = () => setMarks(measure_(art.current));
    measure();
    const t = setTimeout(measure, 460);
    const ro = new ResizeObserver(measure);
    ro.observe(art.current);
    return () => { clearTimeout(t); ro.disconnect(); };
  }, [stage]);

  return (
    <section className="settle" aria-labelledby="theme-title">
      <div className="settle-head">
        <h2 id="theme-title" className="m-0">Every fix uses <span className="settle-yours" data-on={stage >= DONE}>your theme</span>.</h2>
        <p>Plumber reads the steps your Tailwind theme names, and why each one exists. Each space gets the step its job calls for, never a new number.</p>
      </div>

      <div ref={art} className="settle-field pl-light" data-stage={stage} data-run={run}>
        <div className="field-glow" aria-hidden="true"><i /></div>
        <span className="toy-deco toy-dither" aria-hidden="true" />
        <span className="toy-deco toy-checker" aria-hidden="true" />

        {/* your theme, as a sheet of stickers */}
        <aside className="sheet" aria-label="Your theme’s spacing steps">
          <p className="sheet-file"><i aria-hidden="true" />app.css</p>
          <p className="sheet-at">@theme</p>
          <ul>
            {STEPS.map((s, k) => {
              const used = SPOTS.findIndex(x => x.step === s.name);
              return (
                <li key={s.name} style={{ '--k': k }} data-peeling={stage === 3 + used}>
                  <span className="sheet-sticker" data-step={s.name}>{s.name}</span>
                  <code className="tabular">{s.px}px</code>
                  <small>{s.why}</small>
                </li>
              );
            })}
          </ul>
          <i className="sheet-scan" aria-hidden="true" />
        </aside>

        {/* the screen being fixed */}
        <div className="settle-work">
          <section className="app" data-spot="card" style={{ padding: sp.card }} aria-label="Example: a team’s Members screen">
            <header className="app-head">
              <h3>Members</h3>
              <p>3 of 5 seats · Northwind Studio</p>
            </header>
            <div className="app-body" data-spot="stack" style={{ gap: sp.stack }}>
              <form className="app-invite" onSubmit={e => e.preventDefault()}>
                <input data-spot="control" style={{ paddingInline: sp.control }} placeholder="name@northwind.studio" aria-label="Email to invite" tabIndex={-1} />
                <button type="button" tabIndex={-1}>Invite</button>
              </form>
              <ul className="app-people">
                {PEOPLE.map((p, i) => (
                  <li key={p.name} data-spot={i === 0 ? 'related' : undefined} style={{ gap: sp.related }}>
                    <i className="app-avatar" style={{ background: `var(--pl-${p.hue}-soft)`, color: `var(--pl-${p.hue}-ink)` }} aria-hidden="true">{p.name[0]}</i>
                    <span className="app-who" data-spot={i === 0 ? 'tight' : undefined} style={{ gap: sp.tight }}><b>{p.name}</b><small>{p.mail}</small></span>
                    <span className="app-role">{p.role}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* the JSX, as it changes */}
          <figure className="diff" aria-label="The change Plumber writes">
            <figcaption><span>Members.jsx</span><span className="tabular">{stage >= DONE ? '5 classes · 0 new values' : `${Math.max(0, stage - 2)} of 5`}</span></figcaption>
            <ol>
              {SPOTS.map((s, i) => (
                <li key={s.id} data-state={fixed(i) ? 'fixed' : stage >= 1 ? 'off' : 'rest'}>
                  <span className="diff-sign" aria-hidden="true">{fixed(i) ? '+' : stage >= 1 ? '−' : ' '}</span>
                  <code>&lt;{s.tag} className="<span className="diff-val" key={fixed(i) ? 'f' : 'w'}>{fixed(i) ? `${s.cls}-${s.step}` : `${s.cls}-[${s.written}px]`}</span>"&gt;</code>
                </li>
              ))}
            </ol>
          </figure>
        </div>

        {/* the marks: each space as the box model draws it, coral while off, mint once on a step */}
        {stage >= 1 && SPOTS.map((s, i) => marks[s.id] && (
          <Mark key={s.id} m={marks[s.id]} on={fixed(i)} delay={i * 70} />
        ))}

        {/* beside the screen, each space's label: first the number it was given, then the sticker from your theme that
            peels off the sheet, arcs over and slaps onto it */}
        {stage >= 1 && SPOTS.map((s, i) => marks[s.id] && (
          <span key={`l${s.id}`} className="settle-label" data-on={fixed(i)} data-side={marks.side} style={{ left: marks[s.id].lx, top: marks[s.id].ly, '--lead': `${marks.lead}px` }} aria-hidden="true">
            <em className="settle-pill tabular" style={{ animationDelay: `${i * 70 + 120}ms` }}>{s.written}px</em>
          </span>
        ))}
        {SPOTS.map((s, i) => fixed(i) && marks[s.id] && marks[`step:${s.step}`] && (
          <span key={`${run}-${s.id}`} className="stuck" aria-hidden="true" data-quiet={reduced}
            data-side={marks.side} style={{ left: marks[s.id].lx, top: marks[s.id].ly, '--fx': `${marks[`step:${s.step}`].left - marks[s.id].lx}px`, '--fy': `${marks[`step:${s.step}`].cy - marks[s.id].ly}px`,
              '--tilt': `${[-5, 4, -3, 5, -4][i]}deg` }}>
            <b>{s.step}</b>
          </span>
        ))}

        {stage >= DONE && <span className="toy-float settle-none" aria-hidden="true">0 new values</span>}
        <p className="sr-only" aria-live="polite">{SAID[stage]}</p>
      </div>

      <div className="settle-foot">
        <p className="settle-said" aria-hidden="true" data-done={stage >= DONE}>{SAID[stage]}</p>
        <button type="button" className="settle-again" onClick={() => setRun(r => r + 1)} disabled={reduced}>↺ Again</button>
      </div>
    </section>
  );
}

/* One space, drawn as the overlay's box model draws it (hero.css .mk): padding a band inside the edge, a gap the band
 * between two children; its block icon when the band is big enough. */
function Mark({ m, on, delay }) {
  return (
    <span className="settle-mark" style={{ left: m.left, top: m.top, width: m.width, height: m.height }} aria-hidden="true">
      <span className={`mk mk-${m.kind} pop`} data-tone={on ? 'mint' : 'coral'}
        style={{ inset: 0, padding: m.padding, borderRadius: m.radius, animationDelay: `${delay}ms` }}>
        {m.icon && <span className="mk-icon" style={m.icon} dangerouslySetInnerHTML={{ __html: BLOCK_ICONS[m.kind === 'pad' ? 'p' : 'g'] }} />}
      </span>
    </span>
  );
}

const ICON = 12; // a band too small for its icon keeps only its tint (the overlay's rule)
function measure_(root) {
  if (!root) return {};
  const b = root.getBoundingClientRect();
  const local = r => ({ left: r.left - b.left, top: r.top - b.top, width: r.width, height: r.height });
  const out = {};
  for (const el of root.querySelectorAll('[data-spot]')) {
    const css = getComputedStyle(el), r = el.getBoundingClientRect(), id = el.dataset.spot;
    let m;
    if (css.display.includes('grid') || css.display.includes('flex')) {
      const [a, z] = [...el.children].map(k => k.getBoundingClientRect());
      m = z.top >= a.bottom - 1
        ? { kind: 'gap', ...local({ left: r.left, top: a.bottom, width: r.width, height: z.top - a.bottom }) }
        : { kind: 'gap', ...local({ left: a.right, top: r.top, width: z.left - a.right, height: r.height }) };
      if (Math.min(m.width, m.height) >= ICON) m.icon = { left: '50%', top: '50%' };
    } else {
      m = { kind: 'pad', ...local(r), padding: css.padding, radius: css.borderRadius };
      const pad = parseFloat(css.paddingLeft);
      if (parseFloat(css.paddingTop) >= ICON) m.icon = { left: '50%', top: parseFloat(css.paddingTop) / 2 };
      else if (pad >= ICON) m.icon = { left: pad / 2, top: '50%' };
    }
    m.right = r.right - b.left;
    out[id] = m;
  }
  // the labels: a column just right of the screen, each at its space's height, never closer than one label apart; where
  // there's no room beside it (a phone), each sits inside the right end of its own space instead
  const app = local(root.querySelector('.app').getBoundingClientRect());
  const outside = b.width - (app.left + app.width) > 120;
  out.side = outside ? 'out' : 'over';
  out.lead = outside ? 14 : 0;
  const LABEL = 34;
  let last = -Infinity;
  for (const id of Object.keys(out).filter(k => out[k].kind).sort((a, z) => anchor(out[a]) - anchor(out[z]))) {
    out[id].lx = outside ? app.left + app.width + 14 : out[id].right - 6;
    out[id].ly = last = Math.max(anchor(out[id]), last + LABEL);
  }
  for (const el of root.querySelectorAll('[data-step]')) {
    const r = local(el.getBoundingClientRect());
    out[`step:${el.dataset.step}`] = { left: outside ? r.left : r.left + r.width, cy: r.top + r.height / 2 };
  }
  return out;
}
// the height a space's label sits at: a gap's middle; a padding's top band, or the middle when it pads only the sides
const anchor = m => {
  if (m.kind === 'gap') return m.top + m.height / 2;
  const top = parseFloat(m.padding);
  return top >= 8 ? m.top + top / 2 : m.top + m.height / 2;
};
