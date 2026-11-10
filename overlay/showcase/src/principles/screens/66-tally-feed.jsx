// #66 spinners wait ~200ms, then stay ≥ ~500ms. Tally, bookkeeping for Okapi Studio: the Monzo business account's feed
// card. Everything on it that fetches shows the card's one spinner: Sync now, and the 7d / 30d / 90d range, which
// redraws the balance. Each press is a real request to the showcase's /api (about 120ms), or held 1.4s, as plumber
// holds a reply to see a slow one. Broken: the spinner shows on the press and goes with the reply, so every quick reply
// blinks it, on every control. Fixed: spin-delay's habit, shown only after 200ms and then kept at least 500ms, so a
// fast reply shows none and a slow one a steady one.
// plumber's rule (craft-headless spinnerTiming, craft-spec 'spinner-timing') reads when the spinner showed after the
// press and how long a fast reply kept it. Time is the lesson, so the marks are the ruler: the reply on one lane, the
// spinner on the other, the rule's 200ms line on it.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { RetryIcon } from '@unlocalhosted/dither-icons';
import monzoLogo from '../../media/logos/monzo.svg';
import stripeLogo from '../../media/logos/stripe.svg';
import githubLogo from '../../media/logos/github.svg';
import figmaLogo from '../../media/logos/figma.svg';
import slackLogo from '../../media/logos/slack.svg';
import airbnbLogo from '../../media/logos/airbnb.svg';

export const n = 66;
export const handsOn = true;

// plumber's marks live in a shadow root with plumber's tokens, so reading [data-example] never reads them
const TOKENS = '/__plumb/src/tokens.css';
function MarksLayer({ children }) {
  const host = useRef(null);
  const [root, setRoot] = useState(null);
  useEffect(() => {
    const r = host.current.shadowRoot ?? host.current.attachShadow({ mode: 'open' });
    r.innerHTML = `<link rel="stylesheet" href="${TOKENS}"><style>:host { position: absolute; inset: 0; pointer-events: none; overflow: visible; }</style>`;
    setRoot(r);
  }, []);
  return <div ref={host} data-scheme="light" aria-hidden="true" className="pointer-events-none absolute inset-0">{root ? createPortal(children, root) : null}</div>;
}
const hue = (off) => (off ? 'var(--pl-off)' : 'var(--pl-on)');
const Tag = ({ x, y, off, end, children }) => (
  <span style={{ position: 'absolute', left: x, top: y, transform: end ? 'translate(-100%, -50%)' : 'translateY(-50%)', display: 'flex', alignItems: 'center', height: 20, padding: '0 var(--pl-space-3)',
    borderRadius: 'var(--pl-radius-tag)', font: '500 11px/1 var(--pl-mono)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
    color: 'var(--pl-on-accent)', background: hue(off), boxShadow: '0 0 0 1px var(--pl-halo)' }}>{children}</span>
);
function local(root) {
  const o = root.getBoundingClientRect(), k = o.width / root.offsetWidth || 1;
  return (el) => { const r = el.getBoundingClientRect(); return { x: (r.left - o.left) / k, y: (r.top - o.top) / k, w: r.width / k, h: r.height / k }; };
}
function Ruler({ top, width, span, played, kind, events, label = 'live' }) {
  const x = (ms) => (Math.min(span, Math.max(0, ms)) / span) * width;
  const step = span <= 1200 ? 100 : 250, major = span <= 1200 ? 200 : 1000;
  const ticks = [];
  for (let ms = 0; ms <= span; ms += step) ticks.push(ms);
  const col = (k) => (k === 'off' ? 'var(--pl-off)' : k === 'on' ? 'var(--pl-on)' : 'var(--pl-sky)');
  return (
    <div style={{ position: 'absolute', left: 0, top, width, height: 40 }}>
      <span style={{ position: 'absolute', right: 0, top: -6, font: '600 10.5px/14px var(--pl-sans)', color: 'var(--pl-ink-2)' }}>{label}</span>
      <span style={{ position: 'absolute', left: 0, right: 0, top: 16, borderTop: '1px solid var(--pl-ink-3)' }} />
      {ticks.map((ms) => (
        <span key={ms}>
          <span style={{ position: 'absolute', left: x(ms), top: ms % major ? 14 : 12, width: 1, height: ms % major ? 4 : 8, background: 'var(--pl-ink-3)' }} />
          {ms % major ? null : <span style={{ position: 'absolute', left: Math.min(width - 14, Math.max(8, x(ms))), top: 22, transform: 'translateX(-50%)', font: '400 10.5px/14px var(--pl-mono)', color: 'var(--pl-ink-2)' }}>{ms >= 1000 ? `${ms / 1000}s` : ms}</span>}
        </span>
      ))}
      {played > 0 ? <span style={{ position: 'absolute', left: 0, top: 15, height: 3, width: x(played), borderRadius: 2, background: col(kind) }} /> : null}
      {events.map(([ms, k], i) => (
        <span key={i} style={{ position: 'absolute', left: x(ms), top: k ? 11 : 13, width: k ? 11 : 7, height: k ? 11 : 7, marginLeft: k ? -5.5 : -3.5, borderRadius: '50%',
          background: k ? col(k) : '#fff', boxShadow: k ? '0 0 0 2px #fff' : '0 0 0 1.5px var(--pl-sky)' }} />
      ))}
      <span style={{ position: 'absolute', left: x(played), top: 4, width: 2, height: 24, marginLeft: -1, borderRadius: 1, background: 'var(--pl-sky)', boxShadow: '0 0 0 1px #fff' }} />
    </div>
  );
}
function useTicking(on) {
  const [, tick] = useState(0);
  useEffect(() => {
    if (!on) return;
    let id = requestAnimationFrame(function f() { tick((n) => n + 1); id = requestAnimationFrame(f); });
    return () => cancelAnimationFrame(id);
  }, [on]);
}

// the balance over each range: paydays step up, rent and payroll step down (y in a 0–96 box, lower is more)
const RANGES = {
  '7d': { since: '30 October', delta: '+£1,962.30', path: 'M0 52 L80 50 L160 49 L240 34 L320 36 L400 30 L476 17', axis: ['Thu', 'Sat', 'Mon', 'Wed', 'Today'] },
  '30d': { since: '7 October', delta: '+£4,210.55', path: 'M0 70 L32 68 L48 66 L64 67 L80 44 L96 45 L112 47 L128 46 L144 62 L160 60 L176 58 L192 59 L208 57 L224 40 L240 41 L256 43 L272 42 L288 52 L304 50 L320 51 L336 49 L352 34 L368 35 L384 33 L400 36 L416 34 L432 22 L448 24 L464 23 L476 17', axis: ['7 Oct', '14 Oct', '21 Oct', '28 Oct', 'Today'] },
  '90d': { since: '8 August', delta: '+£9,846.10', path: 'M0 80 L40 78 L60 62 L100 66 L140 70 L160 54 L200 58 L240 61 L260 44 L300 47 L340 50 L360 36 L400 38 L440 30 L476 17', axis: ['8 Aug', '1 Sep', '1 Oct', '1 Nov', 'Today'] },
};
const FEED = [
  { who: 'Stripe payout', meta: 'Today · 3 invoices', color: '#635bff', logo: stripeLogo, cat: ['Sales', 'bg-positive'], amount: '+£1,840.00', fresh: true, in: true },
  { who: 'GitHub', meta: 'Today · Team plan, 6 seats', color: '#181717', logo: githubLogo, pick: true, amount: '−£25.20', fresh: true },
  { who: 'Figma', meta: 'Yesterday · Professional', color: '#f24e1e', logo: figmaLogo, cat: ['Software', 'bg-accent'], amount: '−£54.00' },
  { who: 'Slack', meta: 'Mon 3 Nov · Pro, monthly', color: '#4a154b', logo: slackLogo, cat: ['Software', 'bg-accent'], amount: '−£38.40' },
  { who: 'Airbnb', meta: 'Sat 1 Nov · Offsite, Lisbon', color: '#ff5a5f', logo: airbnbLogo, cat: ['Travel', 'bg-caution'], amount: '−£612.75' },
];

const SPIN = { delay: 200, min: 500 }, SLOW = 1400, PRESS = 150;
const Spinner = ({ className = '' }) => <span role="status" aria-label="Loading" className={'size-3.5 shrink-0 animate-spin rounded-full border-[1.5px] border-ink/20 border-t-ink-muted ' + className} />;

export default function BankFeed({ side = 'broken', onStatus }) {
  const root = useRef(null), sheet = useRef(null), controls = useRef({});
  const [reply, setReply] = useState('fast');
  const [run, setRun] = useState(null); // { t0, which, replied, on, off }
  const [spinning, setSpinning] = useState(null); // which control's spinner shows
  const [synced, setSynced] = useState('2 min ago');
  const [range, setRange] = useState('30d');
  const fixed = side === 'fixed';
  useTicking(!!run && (run.replied === null || (run.on !== null && run.off === null)));
  const now = () => performance.now();
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (ms, fn) => timers.current.push(setTimeout(fn, ms));
  const cur = useRef(null); // this press: its start, and when its spinner showed
  const show = (t0, which) => { if (cur.current?.t0 !== t0) return; cur.current.on = now() - t0; setSpinning(which); setRun((r) => (r && r.t0 === t0 ? { ...r, on: cur.current.on } : r)); };
  const hide = (t0) => { setSpinning(null); setRun((r) => (r && r.t0 === t0 && r.on !== null ? { ...r, off: now() - t0 } : r)); };
  // every fetch on the card goes through here, so every control's spinner behaves the same way
  const load = async (which, done) => {
    if (run && run.replied === null) return;
    timers.current.forEach(clearTimeout); timers.current = [];
    const t0 = now();
    cur.current = { t0, on: null };
    setRun({ t0, which, replied: null, on: null, off: null, reply });
    if (!fixed) show(t0, which); else later(SPIN.delay, () => show(t0, which));
    await Promise.all([fetch(`/api/${which === 'sync' ? 'sync' : 'balance'}`).then((r) => r.json()), new Promise((r) => setTimeout(r, reply === 'slow' ? SLOW : 0))]);
    const replied = now() - t0;
    setRun((r) => (r && r.t0 === t0 ? { ...r, replied } : r));
    done();
    if (!fixed) hide(t0);
    else {
      timers.current.forEach(clearTimeout); timers.current = [];
      // shown already: keep it its 500ms; never shown: it never will be
      const on = cur.current?.t0 === t0 ? cur.current.on : null;
      if (on !== null) later(Math.max(0, on + SPIN.min - replied), () => hide(t0));
    }
  };
  const flashed = run && run.on !== null && run.off !== null && run.off - run.on < SPIN.delay;
  const early = run && run.on !== null && run.on < PRESS;
  // the rule's two findings: shown under 150ms after the press (on any reply), or blinked off a fast one
  const off = !!(flashed || early);
  const what = run?.which === 'sync' ? 'Sync now' : `the ${run?.which} range`;
  useEffect(() => {
    if (!run) return onStatus?.(`Press Sync now, or another range. The reply comes ${reply === 'fast' ? 'as fast as it does (about 120ms)' : 'held 1.4s'}: try both.`);
    if (run.replied === null) return onStatus?.(run.on === null ? 'Waiting for the reply…' : 'Loading…');
    const ms = Math.round(run.replied);
    onStatus?.(fixed
      ? (run.on === null ? `The reply came in ${ms}ms, before the spinner was due: none showed, nothing blinked.` : `It waited 200ms, then stayed ${Math.round((run.off ?? now() - run.t0) - run.on)}ms: steady, not a blink.`)
      : (flashed ? `${what[0].toUpperCase() + what.slice(1)} showed its spinner on the press and lost it ${Math.round(run.off - run.on)}ms later: a blink, for a reply that took ${ms}ms.` : `On a slow reply it spun the whole ${ms}ms; on a fast one the same spinner only blinks.`));
  }, [run, reply, onStatus, fixed]);

  const card = sheet.current ? { w: sheet.current.offsetWidth, h: sheet.current.offsetHeight } : null;
  const span = 1600, t = run ? Math.min(span, run.off !== null && run.replied !== null ? Math.max(run.off, run.replied) : run.replied !== null && run.on === null ? run.replied : now() - run.t0) : 0;
  const lane = (top, label, a, b, kind) => {
    const x = (ms) => (Math.min(span, ms) / span) * (card?.w ?? 0);
    return (
      <div style={{ position: 'absolute', left: 0, top, width: card?.w ?? 0, height: 14 }}>
        <span style={{ position: 'absolute', right: '100%', marginRight: 8, top: 0, font: '500 10.5px/14px var(--pl-sans)', color: 'var(--pl-ink-2)', whiteSpace: 'nowrap' }}>{label}</span>
        <span style={{ position: 'absolute', left: 0, right: 0, top: 6, borderTop: '1px dashed var(--pl-ink-3)' }} />
        {a !== null ? <span style={{ position: 'absolute', left: x(a), top: 4, height: 5, width: Math.max(2, x(b ?? t) - x(a)), borderRadius: 3, background: kind === 'off' ? 'var(--pl-off)' : kind === 'on' ? 'var(--pl-on)' : 'var(--pl-sky)' }} /> : null}
      </div>
    );
  };
  const r = RANGES[range];
  const reg = (k) => (el) => { controls.current[k] = el; };
  return (
    <div ref={root} className="relative w-[32.5rem] max-w-full pb-28">
      <article ref={sheet} className="overflow-hidden rounded-card bg-surface shadow-card">
        <header className="px-5 pt-[18px]">
          <span className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-[8px] bg-[#14233c]"><img src={monzoLogo} alt="" className="size-[18px] invert" /></span>
            <span className="flex min-w-0 flex-col">
              <span className="text-[15px] leading-5 font-medium tracking-[-0.01em]">Business current</span>
              <span className="truncate text-[13px] text-ink-muted">Monzo •••• 4821 · <span className={synced === 'just now' ? 'font-medium text-positive' : ''}>Synced {synced}</span></span>
            </span>
            <button ref={reg('sync')} type="button" onClick={() => load('sync', () => setSynced('just now'))}
              className="ml-auto inline-flex h-8 w-[7.5rem] shrink-0 items-center justify-center gap-1.5 rounded-control text-[13px] font-medium text-ink-muted ring-1 ring-line ring-inset hover:bg-sunken hover:text-ink active:bg-line">
              {spinning === 'sync' ? <Spinner /> : <RetryIcon size={14} texture="solid" />}
              {spinning === 'sync' ? 'Syncing' : 'Sync now'}
            </button>
          </span>
          <span className="mt-4 flex items-end justify-between gap-4">
            <span className="flex flex-col">
              <span className="text-[32px] leading-9 font-medium tracking-[-0.02em] whitespace-nowrap tabular-nums">£24,318<span className="text-xl text-ink-muted">.40</span></span>
              <span className="mt-1 text-[13px] text-ink-muted"><span className="font-medium text-positive tabular-nums">{r.delta}</span> since {r.since}</span>
            </span>
            <span ref={reg('range')} role="radiogroup" aria-label="Range" className="flex rounded-control bg-sunken p-0.5 text-xs text-ink-muted">
              {Object.keys(RANGES).map((k) => (
                <button key={k} type="button" role="radio" aria-checked={range === k} onClick={() => load(k, () => setRange(k))}
                  className={'h-6 rounded-[5px] px-2.5 tabular-nums active:bg-line ' + (range === k ? 'bg-surface font-medium text-ink shadow-raised' : 'hover:text-ink')}>{k}</button>
              ))}
            </span>
          </span>
          <span className="relative mt-2.5 block">
            <svg viewBox="0 0 480 96" preserveAspectRatio="none" className="block h-24 w-full" aria-label={`Balance, ${range}`}>
              <defs><linearGradient id="s66-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#5550d8" stopOpacity="0.16" /><stop offset="1" stopColor="#5550d8" stopOpacity="0" /></linearGradient></defs>
              <g className="stroke-ink/7" strokeWidth="1"><line x1="0" x2="480" y1="24.5" y2="24.5" /><line x1="0" x2="480" y1="56.5" y2="56.5" /><line x1="0" x2="480" y1="88.5" y2="88.5" /></g>
              <path d={`${r.path} L476 96 L0 96 Z`} fill="url(#s66-fill)" />
              <path d={r.path} fill="none" className="stroke-accent" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            </svg>
            {spinning && spinning !== 'sync' ? <span className="absolute top-0 right-0 grid size-6 place-items-center rounded-full bg-surface shadow-raised"><Spinner /></span> : null}
          </span>
          <span className="flex justify-between pt-1 pb-3.5 text-[11px] text-ink-subtle">{r.axis.map((a) => <span key={a}>{a}</span>)}</span>
        </header>
        <section className="border-t-hairline px-5 pt-1 pb-0.5">
          <h3 className="flex justify-between pt-2.5 pb-1 text-xs font-medium text-ink-subtle">From the feed<span className="text-accent-deep">2 new</span></h3>
          <ul>
            {FEED.map((f) => (
              <li key={f.who} className="grid grid-cols-[2rem_1fr_auto_5.75rem] items-center gap-3 border-b-hairline py-[9px] last:hairline-none">
                <span className="grid size-8 place-items-center rounded-full" style={{ background: f.color }}><img src={f.logo} alt="" className="size-[15px] invert" /></span>
                <span className="flex min-w-0 flex-col">
                  <span className="flex items-center gap-1.5 text-sm font-medium">{f.who}{f.fresh ? <span className="size-1.5 rounded-full bg-accent" aria-label="New" /> : null}</span>
                  <span className="truncate text-[12.5px] text-ink-muted">{f.meta}</span>
                </span>
                {f.pick ? <button type="button" className="inline-flex h-[22px] items-center rounded-chip bg-caution-soft px-2 text-xs text-caution hover:bg-caution/15 active:bg-caution/20">Choose category</button>
                  : <span className="inline-flex h-[22px] items-center gap-1.5 rounded-chip bg-sunken px-2 text-xs text-ink-muted"><span className={'size-1.5 rounded-full ' + f.cat[1]} />{f.cat[0]}</span>}
                <span className={'text-right text-sm font-medium tabular-nums ' + (f.in ? 'text-positive' : '')}>{f.amount}</span>
              </li>
            ))}
          </ul>
        </section>
        <footer className="flex items-center gap-2 border-t-hairline bg-sunken px-5 py-3 text-[12.5px] text-ink-muted">
          Okapi Studio · 14 to review this month<a href="#review" onClick={(e) => e.preventDefault()} className="ml-auto inline-flex min-h-6 items-center font-medium text-accent-deep hover:underline">Review all</a>
        </footer>
      </article>
      <div className="mt-3 flex items-center gap-2 text-xs text-ink-subtle">
        Reply
        <span role="group" aria-label="Reply" className="flex rounded-control bg-sunken p-0.5 ring-1 ring-line">
          {[['fast', 'as it comes'], ['slow', 'held 1.4s']].map(([k, label]) => (
            <button key={k} type="button" aria-pressed={reply === k} onClick={() => setReply(k)}
              className={'h-6 rounded-[5px] px-2 ' + (reply === k ? 'bg-surface text-ink shadow-raised' : 'hover:text-ink')}>{label}</button>
          ))}
        </span>
      </div>
      <MarksLayer>
        {card ? (
          <div style={{ position: 'absolute', left: 0, top: card.h + 62, width: card.w }}>
            {lane(0, 'reply', run ? 0 : null, run?.replied ?? null, '')}
            {lane(18, 'spinner', run?.on ?? null, run?.off ?? null, run?.on !== null && run ? (off ? 'off' : run.off !== null || run.replied !== null ? 'on' : '') : '')}
            {/* the rule's line: a spinner is due no sooner than 200ms after the press */}
            <span style={{ position: 'absolute', left: (SPIN.delay / span) * card.w, top: -4, height: 40, borderLeft: '1px dashed var(--pl-sky)', opacity: 0.7 }} />
            <span style={{ position: 'absolute', left: (SPIN.delay / span) * card.w + 4, top: -6, font: '500 10px/12px var(--pl-mono)', color: 'var(--pl-sky)' }}>200</span>
            <div style={{ position: 'absolute', left: 0, top: 30 }}>
              <Ruler top={0} width={card.w} span={span} played={t} kind={!run || run.replied === null ? '' : off ? 'off' : 'on'}
                events={run ? [[0, ''], ...(run.replied !== null ? [[run.replied, '']] : [])] : []} label={run?.reply === 'slow' ? 'reply held' : 'live'} />
            </div>
          </div>
        ) : null}
        {run && run.replied !== null && root.current && controls.current[run.which === 'sync' ? 'sync' : 'range'] ? (() => {
          const b = local(root.current)(controls.current[run.which === 'sync' ? 'sync' : 'range']), ms = (v) => Math.round(v);
          const text = flashed ? `flashed ${ms(run.off - run.on)}ms` : early ? `${ms(run.on)}ms after the press` : run.on === null ? `no spinner · ${ms(run.replied)}ms ✓` : fixed ? `after 200 · held ${ms((run.off ?? now() - run.t0) - run.on)}ms ✓` : `${ms(run.on)}ms after the press`;
          // above the control that was pressed, clear of the card's words
          return <Tag end x={b.x + b.w} y={b.y - 22} off={off}>{text}</Tag>;
        })() : null}
      </MarksLayer>
    </div>
  );
}
BankFeed.names = ['Spinner at once', 'After 200ms, for 500ms'];
BankFeed.lesson = {
  why: 'A spinner shown on the press and hidden on the reply blinks whenever the reply is quick: a flash of “something’s wrong” for a wait nobody would have noticed. Most replies are quick, so most presses blink, on every control that fetches.',
  habit: 'Wait about 200ms before showing a spinner, and once it shows, keep it at least 500ms. A fast reply shows none; a slow one shows a steady one.',
};
