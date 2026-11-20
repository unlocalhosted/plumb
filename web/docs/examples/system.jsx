'use client';
// One example per design-system check (docs › What it checks › Design system check). Each shows what the check is
// about, not just the property it touches: a Broken / Fixed switch, the line of code it is about, and where the cost
// shows up later (the theme changes and a hard-coded value doesn't follow), a "Change your theme" button that shows it.
import { useLayoutEffect, useRef, useState } from 'react';

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
// Every fix is shown as a transition (interaction principles 35b): switching plays plumber's beats over the element it
// changes: the guides mark it with the value now (coral), the element moves on the spring, the pill crosses over to
// your token's name (sky), the guides go. Going back plays the same, the other way.
const SPRING = 'linear(0, 0.21 6%, 0.62 15%, 0.9 25%, 1.01 36%, 1.02 46%, 1 60%, 1)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const still = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
export function Example({ id }) {
  const ex = EXAMPLES[id], [fixed, setFixed] = useState(false), [t, setT] = useState(0), [busy, setBusy] = useState(false);
  const scene = useRef(null), ring = useRef(null), pill = useRef(null), run = useRef(0);
  // the guides follow the element while it moves
  const follow = () => {
    const el = scene.current?.querySelector('[data-fix]'), box = scene.current;
    if (!el || !box || !ring.current) return;
    const r = el.getBoundingClientRect(), b = box.getBoundingClientRect();
    ring.current.style.cssText = `left:${r.left - b.left - 6}px;top:${r.top - b.top - 6}px;width:${r.width + 12}px;height:${r.height + 12}px`;
    pill.current.style.left = `${r.left - b.left + r.width / 2}px`; pill.current.style.top = `${r.top - b.top - 14}px`;
  };
  useLayoutEffect(follow);
  const go = async (to) => {
    if (to === fixed || busy) return;
    if (still() || !ex.say) { setFixed(to); return; }
    const mine = ++run.current; setBusy(true);
    const [from, into] = to ? ex.say : [ex.say[1], ex.say[0]], g = scene.current.querySelector('.ex-g');
    pill.current.textContent = from; g.dataset.landed = to ? '' : 'back'; g.removeAttribute('data-landed'); follow();
    g.dataset.on = '';                                    // 1. the guides mark it, with the value now
    await sleep(520); if (mine !== run.current) return;
    setFixed(to);                                         // 2. it moves to the fixed value on the spring
    const t0 = performance.now(); const track = () => { follow(); if (performance.now() - t0 < 760) requestAnimationFrame(track); }; track();
    await sleep(300); pill.current.animate([{ opacity: 1, filter: 'blur(0)' }, { opacity: 0, filter: 'blur(2px)' }], { duration: 140 });
    await sleep(140); pill.current.textContent = into;     // 3. the pill crosses over and lands
    if (to) g.dataset.landed = ''; pill.current.animate([{ opacity: 0, scale: .9 }, { opacity: 1, scale: 1.08, offset: .6 }, { opacity: 1, scale: 1 }], { duration: 360, easing: 'cubic-bezier(.34,1.56,.64,1)' });
    await sleep(900); if (mine !== run.current) return;
    delete g.dataset.on;                                  // 4. the guides go
    await sleep(260); setBusy(false);
  };
  if (!ex) return null;
  const T = THEME[t], { scene: drawn, code, note } = ex.show(fixed, t, T);
  return (
    <div className="ex">
      <style>{CSS}</style>
      <div className="ex-bar">
        <div className="ex-seg" role="radiogroup" aria-label="Show">
          <button type="button" role="radio" aria-checked={!fixed} onClick={() => go(false)}>Broken</button>
          <button type="button" role="radio" aria-checked={fixed} onClick={() => go(true)}>Fixed</button>
        </div>
        {ex.theme && <button type="button" className="ex-theme" aria-pressed={!!t} onClick={() => setT(t ? 0 : 1)}>{t ? '↺ Back to the old theme' : 'Change your theme'}</button>}
      </div>
      <div className="ex-scene" ref={scene}>{drawn}<div className="ex-g" aria-hidden="true"><i className="ex-ring" ref={ring} /><b className="ex-gpill" ref={pill} /></div></div>
      <div className="ex-foot">{code}<p>{note}</p></div>
    </div>
  );
}

const CSS = `
  .ex { display: grid; gap: 12px; }
  .ex-bar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
  .ex-seg { display: inline-flex; padding: 3px; border-radius: 10px; background: var(--pl-bg-surface); }
  .ex-seg button { all: unset; cursor: pointer; padding: 6px 12px; border-radius: 8px; font: 600 13px/1 var(--pl-sans); color: var(--pl-text-secondary); }
  .ex-seg button[aria-checked="true"] { background: var(--pl-bg-inset); color: var(--pl-text-primary); }
  .ex-seg button[aria-checked="true"]:first-child { background: color-mix(in oklab, var(--pl-coral) 18%, transparent); color: var(--pl-coral-ink); }
  .ex-seg button[aria-checked="true"]:last-child { background: color-mix(in oklab, var(--pl-mint) 22%, transparent); color: var(--pl-mint-ink); }
  .ex-seg button:focus-visible, .ex-theme:focus-visible { outline: 2px solid var(--pl-sky); outline-offset: 2px; }
  .ex-theme { all: unset; cursor: pointer; padding: 7px 12px; border-radius: 9px; font: 600 13px/1 var(--pl-sans); background: var(--pl-pink); color: #fff; }
  .ex-theme[aria-pressed="true"] { background: var(--pl-bg-surface); color: var(--pl-text-primary); }
  /* the scene is someone's app: light ground, its own ink, in either scheme of the docs */
  .ex-scene { color-scheme: light; color: #111827; background: #fff; border-radius: 14px; padding: 26px 22px; min-height: 120px; display: grid; place-items: center; font: 400 14px/1.4 system-ui; }
  .ex-scene { position: relative; }
  .ex-scene [data-fix] { transition: background-color 640ms ease-in-out, color 640ms ease-in-out, padding 640ms ${SPRING}, border-radius 640ms ${SPRING}, font-size 640ms ${SPRING}, box-shadow 640ms ease-in-out, opacity 400ms ease; }
  /* the guides: a dashed ring round what changes and its value in a pill, coral until it lands on your token (sky) */
  .ex-g { position: absolute; inset: 0; pointer-events: none; --c: var(--pl-coral); opacity: 0; transition: opacity 220ms ease-out; }
  .ex-g[data-on] { opacity: 1; } .ex-g[data-landed=""] { --c: var(--pl-sky); }
  .ex-ring { position: absolute; border: 1.5px dashed var(--c); border-radius: 12px; transition: border-color 280ms ease-out; }
  .ex-g[data-on] .ex-ring { animation: ex-draw 420ms cubic-bezier(.2,.8,.2,1) both; }
  .ex-gpill { position: absolute; translate: -50% -100%; height: 22px; padding: 0 9px; border-radius: 11px; background: var(--c); color: #fff; font: 600 12px/22px system-ui; white-space: nowrap; box-shadow: 0 1px 2px rgb(0 0 0 / .25); transition: background-color 280ms ease-out; }
  .ex-g[data-on] .ex-gpill { animation: ex-pop 360ms cubic-bezier(.34,1.56,.64,1) 120ms both; }
  @keyframes ex-draw { from { opacity: 0; scale: 1.06; } }
  @keyframes ex-pop { from { opacity: 0; scale: .85; } }
  @media (prefers-reduced-motion: reduce) { .ex-g { display: none; } .ex-scene [data-fix] { transition: none; } }
  .ex-foot { display: grid; gap: 6px; }
  .ex-foot p { margin: 0; font: 400 14px/1.5 var(--pl-sans); color: var(--pl-text-secondary); }
  .ex-code { justify-self: start; font: 500 12.5px/1 var(--pl-mono); padding: 5px 8px; border-radius: 7px; background: color-mix(in oklab, var(--pl-mint) 20%, transparent); color: var(--pl-text-primary); }
  .ex-code[data-bad] { background: color-mix(in oklab, var(--pl-coral) 20%, transparent); }
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
