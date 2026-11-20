'use client';
// One example per design-system check (docs › What it checks › Design system check). Each shows what the check is
// about, not just the property it touches: a Broken / Fixed switch, the line of code it is about, and where the cost
// shows up later (the theme changes and a hard-coded value doesn't follow), a "Change your theme" button that shows it.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

// the example app's theme, before and after "Change your theme": a rebrand from indigo to teal, softer corners,
// a darker surface. Elements written with the token follow it; hard-coded copies keep the old look.
const THEME = [
  { primary: '#4f46e5', muted: '#64748b', surface: '#ffffff', ink: '#111827', radius: 8, shadow: '0 1px 3px rgb(0 0 0 / .12)', fast: 150 },
  { primary: '#0f766e', muted: '#94a3b8', surface: '#0f172a', ink: '#f1f5f9', radius: 14, shadow: '0 1px 3px rgb(0 0 0 / .5)', fast: 150 },
];

const Btn = ({ bg, children, style, fix }) => <span className="ex-btn" data-fix={fix || undefined} style={{ background: bg, ...style }}>{children}</span>;
const Code = ({ children, bad }) => <code className="ex-code" data-bad={bad || undefined}>{children}</code>;

// each: { theme?: true (offers Change your theme), show(fixed, t) → { scene, code } }
const EXAMPLES = {
  'provenance/color/by-value': { say: ['#4f46e5, typed', 'primary'], theme: true, show: (fixed, t, T) => ({
    scene: <div className="ex-row"><figure><Btn bg={T.primary}>Save</Btn><figcaption>Uses your token</figcaption></figure><figure><Btn fix bg={fixed ? T.primary : THEME[0].primary}>Upgrade</Btn><figcaption>{fixed ? 'Uses your token' : 'Same colour, typed by hand'}</figcaption></figure></div>,
    code: fixed ? <Code>bg-primary</Code> : <Code bad>bg-[#4f46e5]</Code>,
    note: t ? (fixed ? 'Both follow the new brand colour.' : 'The theme changed. The copy typed by hand stayed indigo.') : 'They look the same today. Change your theme to see the difference.' }) },
  'provenance/color': { say: ['#6b7280', 'muted'], theme: true, show: (fixed, t, T) => ({
    scene: <div className="ex-card" style={{ background: T.surface, color: T.ink }}><b>Usage this month</b><span data-fix style={{ color: fixed ? T.muted : '#6b7280' }}>2,401 of 5,000 requests</span></div>,
    code: fixed ? <Code>text-muted</Code> : <Code bad>text-[#6b7280]</Code>,
    note: t ? (fixed ? 'In the dark theme the quiet text turns light with the rest.' : 'In the dark theme the hand-typed grey stays dark grey, and is hard to read.') : 'A grey picked by eye, close to your muted colour but not it.' }) },
  'provenance/color/framework': { say: ['slate-500, Tailwind’s', 'muted'], theme: true, show: (fixed, t, T) => ({
    scene: <div className="ex-card" style={{ background: T.surface, color: T.ink }}><b>Deployments</b><span data-fix style={{ color: fixed ? T.muted : '#64748b' }}>Updated 2 minutes ago</span></div>,
    code: fixed ? <Code>text-muted</Code> : <Code bad>text-slate-500</Code>,
    note: t ? (fixed ? 'Your muted colour changed, and this line changed with it.' : 'text-slate-500 is Tailwind’s, not yours: your theme changed, it didn’t.') : 'Tailwind’s slate-500 looks fine, but your theme doesn’t own it.' }) },
  'provenance/color/tier': { say: ['blue-600', 'action'], theme: true, show: (fixed, t, T) => ({
    scene: <div className="ex-row"><Btn fix bg={fixed ? T.primary : '#2563eb'}>Continue</Btn></div>,
    code: fixed ? <Code>bg-action</Code> : <Code bad>bg-blue-600</Code>,
    note: t ? (fixed ? 'The action colour was rebranded; the button followed because it asks for "action".' : 'blue-600 is still blue-600: the rebrand changed what an action looks like, not blue.') : 'A raw step from your palette where your theme has a name for the job.' }) },
  'provenance/arbitrary': { say: ['18px', '16px · space-4'], show: (fixed) => ({
    scene: <div className="ex-stack">{['Profile', 'Billing', 'Team'].map((w, i) => <div key={w} className="ex-box" data-fix={i === 1 || undefined} style={{ padding: i === 1 && !fixed ? 18 : 16 }}>{w}</div>)}</div>,
    code: fixed ? <Code>p-4</Code> : <Code bad>p-[18px]</Code>,
    note: fixed ? 'All three panels breathe the same.' : 'One panel is 2px roomier than its neighbours: off your 4px steps, and nobody chose it.' }) },
  'provenance/radius': { say: ['5px', '12px · card'], show: (fixed) => ({
    scene: <div className="ex-row">{[0, 1, 2].map((i) => <div key={i} className="ex-tile" data-fix={i === 1 || undefined} style={{ borderRadius: i === 1 && !fixed ? 5 : 12 }} />)}</div>,
    code: fixed ? <Code>rounded-card</Code> : <Code bad>rounded-[5px]</Code>,
    note: fixed ? 'Every card is one shape.' : 'One card has its own corner: it reads as a different kind of thing.' }) },
  'provenance/type': { say: ['15px', '14px · body'], show: (fixed) => ({
    scene: <div className="ex-list">{['Inbox', 'Starred', 'Sent'].map((w, i) => <span key={w} data-fix={i === 2 || undefined} style={{ fontSize: i === 2 && !fixed ? 15 : 14 }}>{w}</span>)}</div>,
    code: fixed ? <Code>text-body</Code> : <Code bad>text-[15px]</Code>,
    note: fixed ? 'One size for one job.' : '15px sits between your 14 and 16: close enough to look like a mistake.' }) },
  'provenance/elevation': { say: ['glow, by hand', 'shadow-card'], theme: true, show: (fixed, t, T) => ({
    scene: <div className="ex-row" style={{ background: t ? '#020617' : '#f3f4f6', padding: 18, borderRadius: 14 }}><div className="ex-tile" data-fix style={{ background: T.surface, boxShadow: fixed ? T.shadow : '0 14px 30px -6px rgb(79 70 229 / .45)' }} /><div className="ex-tile" style={{ background: T.surface, boxShadow: T.shadow }} /></div>,
    code: fixed ? <Code>shadow-card</Code> : <Code bad>shadow-[0_14px_30px_-6px_rgb(79_70_229/.45)]</Code>,
    note: fixed ? 'Both cards sit at the same height, lit the same way.' : 'A glow written by hand: brighter than every other card, and it doesn’t adapt to the dark theme.' }) },
  'provenance/motion': { say: ['437ms', '150ms · fast'], show: (fixed) => ({
    scene: <Presses fixed={fixed} />,
    code: fixed ? <Code>duration-fast</Code> : <Code bad>duration-[437ms]</Code>,
    note: fixed ? 'Press them: every control answers at one speed.' : 'Press them: one menu takes 437ms, the others 150. It feels broken, not slow.' }) },
  'provenance/z': { say: ['z 999', 'tooltip layer'], show: (fixed) => ({
    scene: <div className="ex-stage"><div className="ex-dialog" style={{ zIndex: 20 }}>Delete project?<span className="ex-btn" style={{ background: '#dc2626' }}>Delete</span></div><div className="ex-tip" data-fix style={{ zIndex: fixed ? 10 : 999 }}>Last edited by Sam</div></div>,
    code: fixed ? <Code>z-tooltip</Code> : <Code bad>z-[999]</Code>,
    note: fixed ? 'Named layers: the dialog sits above the page’s tooltips.' : 'A tooltip from the page shows on top of the dialog, because someone typed 999.' }) },
  'existence/dead-class': { say: ['brand-500: no CSS', 'primary'], show: (fixed) => ({
    scene: <div className="ex-row"><Btn fix bg={fixed ? '#4f46e5' : 'transparent'} style={fixed ? {} : { color: '#111', boxShadow: 'inset 0 0 0 1px #d1d5db' }}>Get started</Btn></div>,
    code: fixed ? <Code>bg-primary</Code> : <Code bad>bg-brand-500</Code>,
    note: fixed ? 'A class your theme makes: the button is filled.' : 'There is no brand-500 in your theme, so Tailwind made no CSS. No error, just a plain button.' }) },
  'existence/dead-var': { say: ['--text-muted: undefined', '--color-muted'], show: (fixed) => ({
    scene: <div className="ex-card"><b>Billing</b><span data-fix style={{ color: fixed ? '#64748b' : 'inherit' }}>Next invoice on 1 December</span></div>,
    code: fixed ? <Code>color: var(--color-muted)</Code> : <Code bad>color: var(--text-muted)</Code>,
    note: fixed ? 'The variable exists, so the line is quiet as meant.' : '--text-muted was never defined: the browser drops the line and the text stays full black.' }) },
  'dead/color': { say: ['2 unused', '3 in use'], show: (fixed) => ({
    scene: <div className="ex-swatches" data-fix>{[['primary', '#4f46e5', 31], ['muted', '#64748b', 18], ['danger', '#dc2626', 4], ['brand-old', '#7c3aed', 0], ['accent-2', '#db2777', 0]].filter(([, , n]) => fixed ? n > 0 : true).map(([n, c, k]) => <span key={n} data-unused={!k || undefined}><i style={{ background: c }} />{n}<small>{k ? `${k} uses` : 'unused'}</small></span>)}</div>,
    code: fixed ? <Code>3 colours, each in use</Code> : <Code bad>--color-brand-old, --color-accent-2: 0 uses</Code>,
    note: fixed ? 'The palette says what is really used.' : 'Two colours nobody uses: the next person picks one and starts a new look.' }) },
  'imitation/{Component}': { say: ['div, by hand', '<Button>'], show: (fixed) => ({
    scene: <div className="ex-row"><span tabIndex={0} data-fix className={fixed ? 'ex-btn ex-real' : 'ex-btn ex-copy'} style={{ background: '#4f46e5' }}>Invite</span><small className="ex-hint">Click it, then press Tab</small></div>,
    code: fixed ? <Code>{'<Button>Invite</Button>'}</Code> : <Code bad>{'<div className="rounded-md bg-primary px-3 …">Invite</div>'}</Code>,
    note: fixed ? 'The real Button: a focus ring, the hover and the disabled state come with it.' : 'A copy built by hand: no focus ring, no disabled state, and no future fix to Button reaches it.' }) },
  'ownership/{Component}': { say: ['styles laid over', 'size="sm"'], show: (fixed) => ({
    scene: <div className="ex-row"><span className="ex-badge" data-fix style={fixed ? {} : { padding: '0 2px', fontSize: 10 }}>Beta</span><span className="ex-badge">New</span></div>,
    code: fixed ? <Code>{'<Badge size="sm">Beta</Badge>'}</Code> : <Code bad>{'<Badge className="px-0.5 text-[10px]">Beta</Badge>'}</Code>,
    note: fixed ? 'A size the Badge offers: it still matches its siblings.' : 'Styles laid over the Badge from outside: it no longer matches, and breaks when Badge changes.' }) },
};

function Presses({ fixed }) {
  const [on, setOn] = useState(null);
  const press = (i, ms) => { setOn(i); setTimeout(() => setOn(null), ms); };
  const ms = (i) => (i === 1 && !fixed ? 437 : 150);
  return <div className="ex-row">{['File', 'Edit', 'View'].map((w, i) => <button key={w} type="button" className="ex-menu" data-fix={i === 1 || undefined} data-on={on === i || undefined} style={{ transitionDuration: `${ms(i)}ms` }} onClick={() => press(i, ms(i) * 2)}>{w}</button>)}</div>;
}

export const hasExample = (id) => !!EXAMPLES[id];
// Every fix is shown as a transition (interaction principles 35b), and you can feel it yourself: the stage is your app
// twice, broken on the left of the handle and fixed on its right. Opened, the handle sweeps across and the fix plays
// as it passes the element: the guides mark it with the value now (coral), the pill crosses over to your token (sky)
// and lands; the code line under the stage changes in step. Drag the handle to move through it by hand.
const SPRING = 'linear(0, 0.21 6%, 0.62 15%, 0.9 25%, 1.01 36%, 1.02 46%, 1 60%, 1)';
const still = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const textOf = (node) => (node == null ? '' : typeof node === 'string' || typeof node === 'number' ? String(node) : Array.isArray(node) ? node.map(textOf).join('') : textOf(node.props?.children));
const ease = (k) => 1 - Math.pow(1 - k, 3);

export function Specimen({ id, name, why }) {
  const ex = EXAMPLES[id], [t, setT] = useState(0), [x, setX] = useState(100), [mark, setMark] = useState(null);
  const stage = useRef(null), anim = useRef(0), dragging = useRef(false);
  const T = THEME[t], before = ex?.show(false, t, T), after = ex?.show(true, t, T);
  // where the element is, as a share of the stage's width, and its box for the guides
  const measure = () => {
    const el = stage.current?.querySelector('.sp-before [data-fix]'), box = stage.current;
    if (!el || !box) return;
    const r = el.getBoundingClientRect(), b = box.getBoundingClientRect();
    setMark({ left: r.left - b.left, top: r.top - b.top, w: r.width, h: r.height, at: ((r.left + r.width / 2 - b.left) / b.width) * 100 });
  };
  useLayoutEffect(() => { measure(); }, [t, id]);
  // the sweep: the handle crosses from all broken to all fixed on an ease, the beats follow from where it is
  const sweep = (from = 100, to = 0) => {
    cancelAnimationFrame(anim.current);
    if (still()) { setX(to); return; }
    const t0 = performance.now(), dur = 1500;
    const step = () => { const k = Math.min(1, (performance.now() - t0) / dur); setX(from + (to - from) * ease(k)); if (k < 1 && !dragging.current) anim.current = requestAnimationFrame(step); };
    anim.current = requestAnimationFrame(step);
  };
  useEffect(() => { const id = setTimeout(() => sweep(), 450); return () => { clearTimeout(id); cancelAnimationFrame(anim.current); }; }, []);
  const drag = (e) => {
    if (e.button !== 0) return;
    cancelAnimationFrame(anim.current); dragging.current = true;
    const b = stage.current.getBoundingClientRect(), to = (m) => setX(Math.max(0, Math.min(100, ((m.clientX - b.left) / b.width) * 100)));
    to(e); e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.onpointermove = to; e.currentTarget.onpointerup = () => { dragging.current = false; e.currentTarget.onpointermove = null; };
  };
  if (!ex) return null;
  // the element is fixed once the handle has passed its middle; the guides show while the handle is near or past it
  const passed = mark ? x < mark.at : x < 50, near = mark ? x < mark.at + 22 && x > -1 : false, settled = x <= 0.5;
  const [fromSay, toSay] = ex.say ?? ['', ''], code = [textOf(before.code), textOf(after.code)];
  return (
    <div className="sp">
      <style>{CSS}</style>
      <div className="sp-stage" ref={stage} onPointerDown={drag} style={{ '--x': `${x}%` }}>
        <div className="sp-layer sp-before">{before.scene}</div>
        <div className="sp-layer sp-after" aria-hidden="true">{after.scene}</div>
        {mark && <div className="sp-g" data-on={(near && !settled) || undefined} data-landed={passed || undefined} aria-hidden="true">
          <i className="sp-ring" style={{ left: mark.left - 7, top: mark.top - 7, width: mark.w + 14, height: mark.h + 14 }} />
          <b className="sp-pill" style={{ left: mark.left + mark.w / 2, top: mark.top - 14 }} key={passed ? 'to' : 'from'}>{passed ? toSay : fromSay}</b>
        </div>}
        <div className="sp-handle" role="slider" aria-label="Broken to fixed" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(100 - x)} tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'ArrowLeft') setX(Math.max(0, x - 5)); if (e.key === 'ArrowRight') setX(Math.min(100, x + 5)); }}><i /></div>
        <span className="sp-tag sp-l" data-gone={x < 14 || undefined}>Broken</span><span className="sp-tag sp-r" data-gone={x > 86 || undefined}>Fixed</span>
        <div className="sp-tools" onPointerDown={(e) => e.stopPropagation()}>
          <button type="button" onClick={() => sweep(100, 0)}>▶ Play the fix</button>
          {ex.theme && <button type="button" aria-pressed={!!t} onClick={() => setT(t ? 0 : 1)}>{t ? '↺ Old theme' : 'Change your theme'}</button>}
        </div>
      </div>
      <div className="sp-code" data-fixed={passed || undefined}>
        <span className="sp-diff"><s key={'a' + passed}>{code[0]}</s><i aria-hidden="true">→</i><b>{code[1]}</b></span>
        <p>{passed ? after.note : before.note}</p>
      </div>
      {(name || why) && <div className="sp-meta">{name && <h3>{name}</h3>}{why && <p>{why}</p>}</div>}
    </div>
  );
}
export const Example = Specimen;

// a closed card: the broken state, small, as a picture of the problem
export function Thumb({ id }) {
  const ex = EXAMPLES[id];
  if (!ex) return null;
  const { scene } = ex.show(false, 0, THEME[0]);
  return <div className="sp-thumb" aria-hidden="true"><style>{CSS}</style><div className="sp-thumb-in">{scene}</div></div>;
}

const CSS = `
  /* the specimen: your app as the stage (broken left of the handle, fixed right), the code line, then the words */
  .sp { display: grid; gap: 0; }
  .sp-stage { position: relative; height: 250px; overflow: hidden; border-radius: 16px; background: #fff; color: #111827; color-scheme: light; font: 400 14px/1.4 system-ui; cursor: ew-resize; touch-action: pan-y; user-select: none; }
  .sp-layer { position: absolute; inset: 0; display: grid; place-items: center; padding: 26px 22px; }
  .sp-after { clip-path: inset(0 0 0 var(--x)); }
  .sp-layer [data-fix] { transition: none; }
  .sp-handle { position: absolute; top: 0; bottom: 0; left: var(--x); width: 0; z-index: 3; outline: none; }
  .sp-handle::before { content: ''; position: absolute; top: 0; bottom: 0; left: -1px; width: 2px; background: #111827; opacity: .85; }
  .sp-handle i { position: absolute; top: 50%; left: 0; translate: -50% -50%; width: 30px; height: 30px; border-radius: 50%; background: #111827; box-shadow: 0 2px 8px rgb(0 0 0 / .3); }
  .sp-handle i::before, .sp-handle i::after { content: ''; position: absolute; top: 50%; width: 6px; height: 6px; border-left: 2px solid #fff; border-bottom: 2px solid #fff; translate: 0 -50%; }
  .sp-handle i::before { left: 7px; rotate: 45deg; } .sp-handle i::after { right: 7px; rotate: -135deg; }
  .sp-handle:focus-visible i { box-shadow: 0 0 0 3px var(--pl-sky); }
  .sp-tag { position: absolute; top: 12px; z-index: 2; font: 650 11px/1 system-ui; padding: 5px 9px; border-radius: 99px; letter-spacing: .01em; transition: opacity 200ms; pointer-events: none; }
  .sp-l { left: 12px; background: #fde7e2; color: #9a3412; } .sp-r { right: 12px; background: #d6f5e6; color: #065f46; } .sp-tag[data-gone] { opacity: 0; }
  .sp-tools { position: absolute; left: 12px; bottom: 12px; z-index: 4; display: flex; gap: 6px; cursor: default; }
  .sp-tools button { all: unset; cursor: pointer; padding: 7px 11px; border-radius: 9px; background: #111827; color: #fff; font: 600 12px/1 system-ui; box-shadow: 0 2px 8px rgb(0 0 0 / .18); }
  .sp-tools button:focus-visible { outline: 2px solid var(--pl-sky); outline-offset: 2px; }
  .sp-tools button[aria-pressed="true"] { background: #fff; color: #111827; box-shadow: inset 0 0 0 1px #d1d5db; }
  /* the guides follow the handle: the ring and the value appear as it nears the element, land as it passes */
  .sp-g { position: absolute; inset: 0; z-index: 2; pointer-events: none; --c: var(--pl-coral); opacity: 0; transition: opacity 240ms ease-out; }
  .sp-g[data-on] { opacity: 1; } .sp-g[data-landed] { --c: var(--pl-sky); }
  .sp-ring { position: absolute; border: 1.5px dashed var(--c); border-radius: 13px; transition: border-color 260ms ease-out; }
  .sp-pill { position: absolute; translate: -50% -100%; height: 22px; padding: 0 9px; border-radius: 11px; background: var(--c); color: #fff; font: 600 12px/22px system-ui; white-space: nowrap; box-shadow: 0 1px 3px rgb(0 0 0 / .25); transition: background-color 260ms ease-out;
    animation: sp-land 380ms cubic-bezier(.34,1.56,.64,1) both; }
  @keyframes sp-land { from { opacity: 0; scale: .86; filter: blur(2px); } }
  /* the code: the line plumber edits, changing as the handle passes */
  .sp-code { display: grid; gap: 8px; padding: 14px 4px 0; }
  .sp-diff { justify-self: start; display: inline-flex; align-items: center; gap: 10px; max-width: 100%; padding: 9px 12px; border-radius: 10px; background: #111827; font: 500 12.5px/1.2 var(--pl-mono, ui-monospace); overflow: hidden; }
  .sp-diff s, .sp-diff b { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; transition: color 260ms, opacity 260ms, filter 260ms; font-weight: 500; }
  .sp-diff s { color: #fca5a5; text-decoration: none; } .sp-diff b { color: #6b7280; } .sp-diff i { font-style: normal; color: #6b7280; }
  .sp-code[data-fixed] .sp-diff s { color: #6b7280; text-decoration: line-through; text-decoration-thickness: 1.5px; } .sp-code[data-fixed] .sp-diff b { color: #86efac; }
  .sp-code p { margin: 0; font: 400 14.5px/1.55 var(--pl-sans); color: var(--pl-text-secondary); max-width: 640px; }
  .sp-meta { display: grid; gap: 4px; padding: 14px 4px 0; } .sp-meta h3 { margin: 0; font: 650 18px/1.3 var(--pl-round, var(--pl-sans)); color: var(--pl-text-primary); }
  .sp-meta p { margin: 0; color: var(--pl-text-secondary); }
  /* the closed card's picture: the broken state, small, never pressable */
  .sp-thumb { position: relative; height: 112px; overflow: hidden; border-radius: 12px; background: #fff; color: #111827; color-scheme: light; font: 400 14px/1.4 system-ui; pointer-events: none; }
  .sp-thumb-in { position: absolute; left: 50%; top: 50%; width: 420px; height: 250px; display: grid; place-items: center; translate: -50% -50%; scale: .5; }
  @media (prefers-reduced-motion: reduce) { .sp-g, .sp-pill { transition: none; animation: none; } }
  .ex-row { display: flex; flex-wrap: wrap; gap: 14px; align-items: center; justify-content: center; }
  .ex-row figure { margin: 0; display: grid; gap: 8px; justify-items: center; } .ex-row figcaption { font: 500 12px system-ui; color: #6b7280; }
  .ex-btn { display: inline-flex; align-items: center; height: 38px; padding: 0 16px; border-radius: 8px; color: #fff; font: 600 14px system-ui; transition: background-color 360ms ease, box-shadow 200ms; }
  .ex-card { display: grid; gap: 4px; padding: 16px 18px; min-width: 260px; border-radius: 12px; box-shadow: inset 0 0 0 1px rgb(0 0 0 / .08); transition: background-color 360ms ease, color 360ms ease; }
  .ex-card span { transition: color 360ms ease; }
  .ex-stack { display: grid; gap: 8px; width: 240px; }
  .ex-box { position: relative; background: #f3f4f6; border-radius: 10px; font-weight: 600; }
  .ex-pill { position: absolute; right: -8px; top: 50%; translate: 100% -50%; font: 600 11px/1 system-ui; font-style: normal; padding: 4px 7px; border-radius: 99px; background: var(--pl-sky); color: #fff; white-space: nowrap; }
  .ex-pill[data-bad] { background: var(--pl-coral); }
  .ex-list .ex-pill, .ex-tile .ex-pill { right: auto; left: 50%; top: -12px; translate: -50% -100%; }
  .ex-tile { position: relative; width: 84px; height: 64px; background: #e5e7eb; transition: border-radius 300ms ease, box-shadow 360ms ease, background-color 360ms ease; }
  .ex-list { display: grid; gap: 10px; width: 200px; } .ex-list span { position: relative; padding: 6px 10px; border-radius: 8px; background: #f3f4f6; }
  .ex-list span .ex-pill { left: auto; right: -8px; top: 50%; translate: 100% -50%; }
  .ex-menu { all: unset; cursor: pointer; padding: 8px 14px; border-radius: 8px; background: #f3f4f6; font: 600 14px system-ui; transition-property: background-color, scale; transition-timing-function: ease-out; }
  .ex-menu[data-on] { background: #4f46e5; color: #fff; scale: .96; }
  .ex-stage { position: relative; width: 320px; height: 150px; border-radius: 12px; background: #f3f4f6; }
  .ex-dialog { position: absolute; inset: 22px 40px; display: grid; gap: 12px; place-content: center; justify-items: center; background: #fff; border-radius: 12px; box-shadow: 0 10px 30px -8px rgb(0 0 0 / .3); font-weight: 600; }
  .ex-tip { position: absolute; left: 150px; top: 46px; padding: 6px 10px; border-radius: 8px; background: #111827; color: #fff; font: 500 12px system-ui; white-space: nowrap; }
  .ex-swatches { display: grid; gap: 6px; width: 260px; } .ex-swatches span { display: grid; grid-template-columns: 18px 1fr auto; gap: 10px; align-items: center; font: 500 13px system-ui; }
  .ex-swatches i { width: 18px; height: 18px; border-radius: 5px; } .ex-swatches small { color: #6b7280; } .ex-swatches [data-unused] { opacity: .5; } .ex-swatches [data-unused] small { color: #dc2626; }
  .ex-copy:focus { outline: none; } .ex-real:focus-visible { outline: 3px solid #a5b4fc; outline-offset: 2px; }
  .ex-hint { font: 500 12px system-ui; color: #6b7280; }
  .ex-badge { display: inline-flex; align-items: center; height: 22px; padding: 0 8px; border-radius: 99px; background: #eef2ff; color: #3730a3; font: 600 12px system-ui; }
`;
