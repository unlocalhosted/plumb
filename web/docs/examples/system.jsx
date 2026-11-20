'use client';
// One example per design-system check (docs › What it checks › Design system check). Each shows what the check is
// about, not just the property it touches: a Broken / Fixed switch, the line of code it is about, and where the cost
// shows up later (the theme changes and a hard-coded value doesn't follow), a "Change your theme" button that shows it.
import { useEffect, useRef, useState } from 'react';

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
    note: fixed ? 'Both follow the rebrand, because both ask for your primary colour.' : 'Typed by hand, it stayed indigo when your theme was rebranded.' }) },
  'provenance/color': { say: ['#6b7280', 'muted'], theme: true, show: (fixed, t, T) => ({
    scene: <div className="ex-card" style={{ background: T.surface, color: T.ink }}><b>Usage this month</b><span data-fix style={{ color: fixed ? T.muted : '#6b7280' }}>2,401 of 5,000 requests</span></div>,
    code: fixed ? <Code>text-muted</Code> : <Code bad>text-[#6b7280]</Code>,
    note: fixed ? 'On your muted colour, it turns light with the rest of the dark theme.' : 'A grey picked by eye stays dark grey in the dark theme, and is hard to read.' }) },
  'provenance/color/framework': { say: ['slate-500, Tailwind’s', 'muted'], theme: true, show: (fixed, t, T) => ({
    scene: <div className="ex-card" style={{ background: T.surface, color: T.ink }}><b>Deployments</b><span data-fix style={{ color: fixed ? T.muted : '#64748b' }}>Updated 2 minutes ago</span></div>,
    code: fixed ? <Code>text-muted</Code> : <Code bad>text-slate-500</Code>,
    note: fixed ? 'On your muted colour, it follows your theme into the dark.' : 'slate-500 is Tailwind’s, not yours: your theme went dark, it didn’t.' }) },
  'provenance/color/tier': { say: ['blue-600', 'action'], theme: true, show: (fixed, t, T) => ({
    scene: <div className="ex-row"><Btn fix bg={fixed ? T.primary : '#2563eb'}>Continue</Btn></div>,
    code: fixed ? <Code>bg-action</Code> : <Code bad>bg-blue-600</Code>,
    note: fixed ? 'It asks for “action”, so the rebrand reached it.' : 'blue-600 is still blue-600: the rebrand changed what an action looks like, not blue.' }) },
  'provenance/arbitrary': { say: ['18px', '16px · space-4'], show: (fixed) => ({
    scene: <div className="ex-stack">{['Profile', 'Billing', 'Team'].map((w, i) => <div key={w} className="ex-box" data-fix={i === 1 || undefined} style={{ padding: i === 1 && !fixed ? 18 : 16 }}>{w}</div>)}</div>,
    code: fixed ? <Code>p-4</Code> : <Code bad>p-[22px]</Code>,
    note: fixed ? 'All three panels breathe the same.' : 'One panel is 6px roomier than its neighbours: off your steps, and nobody chose it.' }) },
  'provenance/radius': { say: ['5px', '12px · card'], show: (fixed) => ({
    scene: <div className="ex-row">{[0, 1, 2].map((i) => <div key={i} className="ex-tile" data-fix={i === 1 || undefined} style={{ borderRadius: i === 1 && !fixed ? 5 : 12 }} />)}</div>,
    code: fixed ? <Code>rounded-card</Code> : <Code bad>rounded-[3px]</Code>,
    note: fixed ? 'Every card is one shape.' : 'One card has its own corner: it reads as a different kind of thing.' }) },
  'provenance/type': { say: ['15px', '14px · body'], show: (fixed) => ({
    scene: <div className="ex-list">{['Inbox', 'Starred', 'Sent'].map((w, i) => <span key={w} data-fix={i === 2 || undefined} style={{ fontSize: i === 2 && !fixed ? 15 : 14 }}>{w}</span>)}</div>,
    code: fixed ? <Code>text-body</Code> : <Code bad>text-[17px]</Code>,
    note: fixed ? 'One size for one job.' : '17px sits between your 16 and 18: close enough to look like a mistake.' }) },
  'provenance/elevation': { say: ['glow, by hand', 'shadow-card'], theme: true, show: (fixed, t, T) => ({
    scene: <div className="ex-row" style={{ background: t ? '#020617' : '#f3f4f6', padding: 18, borderRadius: 14 }}><div className="ex-tile" data-fix style={{ background: T.surface, boxShadow: fixed ? T.shadow : '0 14px 30px -6px rgb(79 70 229 / .45)' }} /><div className="ex-tile" style={{ background: T.surface, boxShadow: T.shadow }} /></div>,
    code: fixed ? <Code>shadow-card</Code> : <Code bad>shadow-[0_14px_30px_-6px_rgb(79_70_229/.45)]</Code>,
    note: fixed ? 'Both cards sit at the same height, lit the same way.' : 'A glow written by hand: brighter than every other card, and it doesn’t adapt to the dark theme.' }) },
  'provenance/motion': { say: ['437ms', '150ms · fast'], show: (fixed) => ({
    scene: <Presses fixed={fixed} />,
    code: fixed ? <Code>duration-fast</Code> : <Code bad>duration-[440ms]</Code>,
    note: fixed ? 'Press them: every control answers at one speed.' : 'One menu takes 440ms to answer, the others 150. It feels broken, not slow.' }) },
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
// Every fix is shown as a transition (interaction principles 35b), with the one motion the tiles of "How a change
// moves" use (overlay/src/check-motion.js on show-motion.js): the stage is the check's own scene, Play runs the beats,
// and the slider under it holds the same motion wherever the hand is. The code line crosses over halfway.
const textOf = (node) => (node == null ? '' : typeof node === 'string' || typeof node === 'number' ? String(node) : Array.isArray(node) ? node.map(textOf).join('') : textOf(node.props?.children));

export function Specimen({ id, css = '' }) {
  const ex = EXAMPLES[id], host = useRef(null), ctl = useRef(null), rail = useRef(null), [p, setP] = useState(0), [ready, setReady] = useState(false);
  useEffect(() => {
    let gone = false, raf = 0, first = 0;
    import('../../../overlay/src/check-motion.js').then(({ mountCheck }) => {
      if (gone || !host.current) return;
      ctl.current = mountCheck(host.current, id, { tokensCss: css }); setReady(true);
      // the slider and the code follow the motion while it plays
      const follow = () => { if (ctl.current) setP(ctl.current.p); raf = requestAnimationFrame(follow); }; follow();
      first = setTimeout(() => ctl.current?.play(), 450);
    });
    return () => { gone = true; cancelAnimationFrame(raf); clearTimeout(first); };
  }, [id, css]);
  const drag = (e) => {
    if (!ctl.current || e.button !== 0) return;
    const b = rail.current.getBoundingClientRect(), to = (m) => ctl.current.scrub(Math.max(0, Math.min(1, (m.clientX - b.left) / b.width)));
    to(e); e.currentTarget.setPointerCapture(e.pointerId); e.currentTarget.onpointermove = to; e.currentTarget.onpointerup = () => { e.currentTarget.onpointermove = null; };
  };
  if (!ex) return null;
  const before = ex.show(false, 0, THEME[0]), after = ex.show(true, 0, THEME[0]), fixed = p >= 0.5, k = Math.max(0, Math.min(1, p));
  return (
    <div className="sp">
      <style>{CSS}</style>
      <div className="sp-stage" ref={host} />
      <div className="sp-ctl">
        <button type="button" className="sp-play" disabled={!ready} onClick={() => ctl.current?.play()}>▶ Play the fix</button>
        <div className="sp-rail" ref={rail} onPointerDown={drag} role="slider" tabIndex={0} aria-label="Broken to fixed" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(k * 100)}
          onKeyDown={(e) => { if (e.key === 'ArrowRight') ctl.current?.scrub(Math.min(1, k + 0.1)); if (e.key === 'ArrowLeft') ctl.current?.scrub(Math.max(0, k - 0.1)); }}>
          <span className="sp-end" data-on={!fixed || undefined}>Broken</span>
          <span className="sp-track"><i style={{ width: `${k * 100}%` }} /><b style={{ left: `${k * 100}%` }} /></span>
          <span className="sp-end" data-on={fixed || undefined}>Fixed</span>
        </div>
      </div>
      <div className="sp-code" data-fixed={fixed || undefined}>
        <span className="sp-diff"><s>{textOf(before.code)}</s><i aria-hidden="true">→</i><b>{textOf(after.code)}</b></span>
        <p>{fixed ? after.note : before.note}</p>
      </div>
    </div>
  );
}
export const Example = Specimen;

// a closed card: the check's own scene, still, at broken
export function Thumb({ id, css = '' }) {
  const host = useRef(null);
  useEffect(() => { let gone = false; import('../../../overlay/src/check-motion.js').then(({ mountCheck }) => { if (!gone && host.current) mountCheck(host.current, id, { tokensCss: css })?.still(0); }); return () => { gone = true; }; }, [id, css]);
  return <div className="sp-thumb" aria-hidden="true"><style>{CSS}</style><div className="sp-thumb-in" ref={host} /></div>;
}

const CSS = `
  /* the specimen: the check's own scene played by the tiles' motion, a slider that holds it, the code line, the note */
  .sp { display: grid; gap: 12px; }
  .sp-stage { border-radius: 16px; overflow: hidden; min-height: 250px; }
  .sp-ctl { display: flex; align-items: center; gap: 12px; }
  .sp-play { all: unset; cursor: pointer; flex: none; padding: 8px 12px; border-radius: 10px; background: var(--pl-pink); color: #fff; font: 600 12.5px/1 var(--pl-sans); box-shadow: 0 6px 14px -8px var(--pl-pink); }
  .sp-play:disabled { opacity: .5; cursor: default; } .sp-play:focus-visible, .sp-rail:focus-visible { outline: 2px solid var(--pl-sky); outline-offset: 3px; }
  .sp-rail { flex: 1; display: grid; grid-template-columns: auto 1fr auto; gap: 10px; align-items: center; cursor: ew-resize; touch-action: pan-y; user-select: none; border-radius: 10px; padding: 6px 4px; }
  .sp-end { font: 600 12px/1 var(--pl-sans); color: var(--pl-text-secondary); transition: color 200ms; }
  .sp-end:first-child[data-on] { color: var(--pl-coral); } .sp-end:last-child[data-on] { color: var(--pl-mint); }
  .sp-track { position: relative; height: 6px; border-radius: 3px; background: color-mix(in oklab, var(--pl-coral) 30%, var(--pl-bg-surface)); }
  .sp-track i { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 3px; background: var(--pl-mint); }
  .sp-track b { position: absolute; top: 50%; width: 18px; height: 18px; translate: -50% -50%; border-radius: 50%; background: var(--pl-bg-surface); box-shadow: 0 1px 4px rgb(0 0 0 / .35), inset 0 0 0 2px var(--pl-text-primary); }
  /* the code: the line plumber edits, crossing over as the fix lands */
  .sp-code { display: grid; gap: 8px; }
  .sp-diff { justify-self: start; display: inline-flex; align-items: center; gap: 10px; max-width: 100%; padding: 9px 12px; border-radius: 10px; background: #111827; font: 500 12.5px/1.2 var(--pl-mono, ui-monospace); overflow: hidden; }
  .sp-diff s, .sp-diff b { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; transition: color 260ms; font-weight: 500; text-decoration: none; }
  .sp-diff s { color: #fca5a5; } .sp-diff b { color: #6b7280; } .sp-diff i { font-style: normal; color: #6b7280; }
  .sp-code[data-fixed] .sp-diff s { color: #6b7280; text-decoration: line-through; text-decoration-thickness: 1.5px; } .sp-code[data-fixed] .sp-diff b { color: #86efac; }
  .sp-code p { margin: 0; font: 400 14.5px/1.55 var(--pl-sans); color: var(--pl-text-secondary); max-width: 640px; }
  .sp-thumb { position: relative; height: 118px; overflow: hidden; border-radius: 12px; background: #fff; pointer-events: none; }
  .sp-thumb-in { position: absolute; left: 50%; top: 50%; width: 460px; translate: -50% -50%; scale: .5; }
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
