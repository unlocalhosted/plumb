// A sample for React Plumber as a whole (2026-11-18): an invoicing dashboard as AI tends to write it, and the same
// dashboard after five design fixes, applied one at a time. `step` (0..5) says how many fixes have landed:
//   1 colour      five loud colours → one accent, kept for the data
//   2 hierarchy   four numbers shouting equally → one number leads
//   3 grid        edges that nearly line up → one grid
//   4 spacing     padding all over the place → one scale
//   5 type        many sizes, a floating unit → three sizes, figures that line up
// Every box is placed absolutely from a table, so each fix moves things with plain CSS transitions (a renderer that
// steps the clock frame by frame sees every one of them). Gradients cannot transition, so they crossfade.
const MOVE = 'left 700ms cubic-bezier(.65,0,.35,1), top 700ms cubic-bezier(.65,0,.35,1), width 700ms cubic-bezier(.65,0,.35,1), height 700ms cubic-bezier(.65,0,.35,1), padding 600ms ease, background-color 600ms ease, color 600ms ease, border-color 600ms ease, box-shadow 600ms ease, border-radius 600ms ease, font-size 600ms cubic-bezier(.65,0,.35,1), opacity 500ms ease';

const LOUD = { page: '#eef0f6', card: '#ffffff', ink: '#111827', muted: '#9ca3af', violet: '#6d5dfc', pink: '#ec4899', green: '#10b981', red: '#ef4444', amber: '#f59e0b' };
const CALM = { page: '#f6f5f1', card: '#ffffff', ink: '#1c1b19', muted: '#6f6b63', accent: '#2f5bea', soft: '#e9eefd', up: '#1a7f4b', down: '#b42318', line: 'rgb(28 27 25 / .08)' };

const MONTHS = [38, 52, 44, 61, 58, 66, 63, 74, 70, 82, 79, 92];

// where each box sits, per step: [left, top, width, height]
function layout(s) {
  const lead = s >= 2, grid = s >= 3;
  if (!lead) return {
    head: [22, 18, 556, 64],
    s0: [22, 100, 176, 112], s1: [210, 96, 180, 116], s2: [402, 100, 174, 112],
    rev: [22, 230, 362, 262], start: [396, 236, 182, 256],
  };
  if (!grid) return {
    head: [22, 18, 556, 64],
    s0: [22, 100, 362, 150], s1: [396, 98, 182, 70], s2: [396, 180, 180, 72],
    rev: [22, 266, 362, 226], start: [396, 270, 182, 222],
  };
  return {
    head: [24, 20, 552, 60],
    s0: [24, 100, 360, 152], s1: [400, 100, 176, 68], s2: [400, 184, 176, 68],
    rev: [24, 268, 360, 224], start: [400, 268, 176, 224],
  };
}

const box = ([left, top, width, height]) => ({ position: 'absolute', left, top, width, height, boxSizing: 'border-box', transition: MOVE });

export default function SlopDashboard({ step = 0 }) {
  const calm = step >= 1, lead = step >= 2, spaced = step >= 4, typed = step >= 5;
  const L = layout(step);
  const card = (pad) => ({
    background: calm ? CALM.card : LOUD.card,
    borderRadius: calm ? 14 : [10, 16, 8][pad % 3],
    border: `1px solid ${calm ? CALM.line : 'transparent'}`,
    boxShadow: calm ? '0 1px 2px rgb(28 27 25 / .05)' : '0 10px 30px rgb(17 24 39 / .12)',
    padding: spaced ? 20 : [14, 18, 12, 22, 16][pad % 5],
    color: calm ? CALM.ink : LOUD.ink,
    overflow: 'hidden',
  });
  const muted = calm ? CALM.muted : LOUD.muted;
  const num = (size) => ({ fontSize: size, fontWeight: typed ? 600 : 700, letterSpacing: '-0.02em', lineHeight: 1, fontVariantNumeric: typed ? 'tabular-nums' : 'normal', transition: MOVE });
  const label = { fontSize: typed ? 12 : 13, fontWeight: typed ? 500 : 600, color: muted, textTransform: typed ? 'none' : 'uppercase', letterSpacing: typed ? 0 : '0.06em', transition: MOVE };
  const delta = (up, text, i) => typed || calm
    ? <span style={{ fontSize: 12, fontWeight: 500, color: up ? CALM.up : CALM.down, transition: MOVE }}>{up ? '↑' : '↓'} {text}</span>
    : <span style={{ alignSelf: 'flex-start', fontSize: 12, fontWeight: 600, padding: '4px 10px', lineHeight: '18px', borderRadius: 99, color: '#fff', background: [LOUD.green, LOUD.violet, LOUD.red][i], transition: MOVE }}>{up ? '+' : '−'}{text}</span>;
  const stat = (i, name, value, d, up) => {
    const hero = lead && i === 0;
    return (
      <div style={{ ...box(L['s' + i]), ...card(i), ...(lead && !hero ? { padding: spaced ? '12px 16px' : [14, 10, 12][i] } : null), display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: spaced ? 8 : [6, 10, 4][i] }}>
        <span style={label}>{name}</span>
        <span style={{ display: 'flex', alignItems: typed ? 'baseline' : 'center', gap: 4 }}>
          <span style={{ ...num(hero ? 46 : lead ? 22 : [30, 32, 28][i]), color: !calm && i === 2 ? LOUD.red : !calm && i === 1 ? LOUD.green : 'inherit' }}>{value}</span>
          <span style={{ fontSize: typed ? 13 : 11, fontWeight: 600, color: muted, transition: MOVE }}>USD</span>
        </span>
        {(!lead || hero) ? delta(up, d, i) : null}
      </div>
    );
  };
  return (
    <div style={{ position: 'relative', width: 600, height: 512, borderRadius: 18, background: calm ? CALM.page : LOUD.page, transition: MOVE, font: '400 14px/1.3 "Inter", system-ui, sans-serif', color: calm ? CALM.ink : LOUD.ink, overflow: 'hidden' }}>
      {/* the greeting and the period */}
      <div data-part="head" style={{ ...box(L.head), display: 'flex', alignItems: typed ? 'flex-end' : 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: typed ? 24 : 28, fontWeight: typed ? 600 : 800, letterSpacing: '-0.02em', lineHeight: typed ? 1.15 : 1.4, transition: MOVE }}>Good morning, Ada</div>
          <div style={{ fontSize: typed ? 14 : 13, color: muted, marginTop: spaced ? 6 : 2, transition: MOVE }}>Three invoices are due this week.</div>
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, padding: spaced ? '8px 12px' : '7px 14px', borderRadius: calm ? 10 : 99, border: `1.5px solid ${calm ? CALM.line : LOUD.violet}`, color: calm ? CALM.ink : LOUD.violet, background: calm ? CALM.card : '#f1efff', transition: MOVE, whiteSpace: 'nowrap' }}>Last 12 months ▾</span>
      </div>

      <div data-part="s0">{stat(0, 'Outstanding', '48,210', '12.4%', true)}</div>
      <div data-part="s1">{stat(1, 'Paid this month', '31,904', '4.1%', true)}</div>
      <div data-part="s2">{stat(2, 'Overdue', '6,480', '2.3%', false)}</div>

      {/* revenue: bars, and the quarterly target */}
      <div data-part="rev" style={{ ...box(L.rev), ...card(3), display: 'flex', flexDirection: 'column', gap: spaced ? 16 : 10 }}>
        <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: typed ? 14 : 16, fontWeight: typed ? 600 : 800, transition: MOVE }}>Revenue</span>
          <span style={{ ...label }}>Last 12 months</span>
        </span>
        <span style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'flex-end', gap: spaced ? 6 : 8 }}>
          {MONTHS.map((v, i) => (
            <span key={i} style={{ position: 'relative', flex: 1, height: `${v}%`, borderRadius: calm ? 4 : 2, transition: MOVE, overflow: 'hidden' }}>
              <span style={{ position: 'absolute', inset: 0, background: `linear-gradient(${LOUD.violet}, ${LOUD.pink})`, opacity: calm ? 0 : 1, transition: MOVE }} />
              <span style={{ position: 'absolute', inset: 0, background: CALM.accent, opacity: calm ? (i === MONTHS.length - 1 ? 1 : 0.22) : 0, transition: MOVE }} />
            </span>
          ))}
        </span>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: muted }}><span>Quarterly target</span><span style={{ fontVariantNumeric: typed ? 'tabular-nums' : 'normal', color: calm ? CALM.ink : LOUD.ink, fontWeight: 600 }}>82%</span></span>
          <span style={{ position: 'relative', height: calm ? 6 : 10, borderRadius: 99, background: calm ? CALM.soft : '#e5e7eb', overflow: 'hidden', transition: MOVE }}>
            <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '82%', background: 'linear-gradient(90deg, #3b82f6, #ec4899)', opacity: calm ? 0 : 1, transition: MOVE }} />
            <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '82%', background: CALM.accent, borderRadius: 99, opacity: calm ? 1 : 0, transition: MOVE }} />
          </span>
        </span>
      </div>

      {/* getting started */}
      <div data-part="start" style={{ ...box(L.start), ...card(4), background: calm ? CALM.soft : '#0b0b14', color: calm ? CALM.ink : '#fff', border: `1px solid ${calm ? 'rgb(47 91 234 / .12)' : 'transparent'}`,
        boxShadow: calm ? 'none' : '0 20px 40px rgb(109 93 252 / .45)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <span style={{ display: 'flex', flexDirection: 'column', gap: spaced ? 8 : 4 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: calm ? CALM.accent : '#a5b4fc', transition: MOVE }}>Getting started · 2 min</span>
          <span style={{ fontSize: typed ? 16 : 21, fontWeight: typed ? 600 : 800, lineHeight: typed ? 1.3 : 1.35, letterSpacing: '-0.01em', transition: MOVE }}>Send your first invoice in under a minute</span>
        </span>
        <span style={{ display: 'grid', placeItems: 'center', width: 44, height: 44, borderRadius: 99, background: calm ? CALM.accent : '#fff', transition: MOVE }}>
          <svg width="16" height="16" viewBox="0 0 16 16" style={{ transform: `translateX(${typed ? 1.5 : 0}px)`, transition: MOVE }}><path d="M4 2.5v11l9-5.5z" fill={calm ? '#fff' : '#0b0b14'} /></svg>
        </span>
      </div>
    </div>
  );
}
