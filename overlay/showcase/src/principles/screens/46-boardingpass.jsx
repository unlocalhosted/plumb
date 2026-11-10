// #46 capitals get case-sensitive forms. Tern, a small Lisbon airline, its boarding pass on flight morning, LIS to
// CPH. A boarding pass is set in capitals, and every value on it goes through one Caps style: dashes, brackets and
// colons are drawn to sit beside lowercase, so between capitals they hang low, in the flight number, the class, the
// group, the meal. The case feature lifts them to the capitals' middle, everywhere at once.
import sana from '../../media/people/person-03.jpg';

export const n = 46;

// Tern's own colour: a deep Atlantic teal for the band, its bright tint for what you act on (the gate, your seat)
const TEAL = '#0e7c86';
// every value on the pass, in capitals, tracked as capitals are
const Caps = ({ className = '', children }) => <span data-caps className={'uppercase tracking-[0.04em] ' + className}>{children}</span>;
const Label = ({ children }) => <span className="text-[11px] leading-[14px] font-medium tracking-caps text-ink-subtle uppercase">{children}</span>;
const Field = ({ label, children }) => <span className="flex flex-col gap-[3px]"><Label>{label}</Label><Caps className="text-[13px] leading-[18px] font-medium">{children}</Caps></span>;

// the seat on a slice of the cabin, rows 12 to 16: taken (x), free (o), yours (me)
const CABIN = { 12: 'xxo xox', 13: 'xox xxx', 14: 'mxx oxx', 15: 'xxo xxo', 16: 'oxx xox' };
const Seat = ({ s }) => <span className={'h-3.5 rounded-[3px_3px_4px_4px] ' + (s === 'x' ? 'bg-ink/12' : s === 'm' ? 'shadow-[0_0_0_2px_#e3f2f2]' : 'bg-surface shadow-[inset_0_0_0_1px_rgb(18_35_61/0.16)]')} style={s === 'm' ? { background: TEAL } : undefined} />;

// a QR-like code drawn from the booking reference: three finder squares and a seeded field of modules
function qr(ref) {
  const n = 25;
  let seed = [...ref].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;
  const finder = (x, y) => (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9);
  let d = '';
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (!finder(x, y) && rnd() < 0.48) d += `M${x} ${y}h1v1h-1z`;
  return { n, d };
}
const CODE = qr('K7QX2M-TN754-14A');
const Finder = ({ x, y }) => <><rect x={x} y={y} width="7" height="7" fill="#12233d" /><rect x={x + 1} y={y + 1} width="5" height="5" fill="#fff" /><rect x={x + 2} y={y + 2} width="3" height="3" fill="#12233d" /></>;

// the ticket's notches: the main part is cut at its foot, the stub at its head
const notch = (y) => ({ mask: `radial-gradient(circle 10px at 0 ${y}, transparent 9.5px, #000 10px) left / 51% 100% no-repeat, radial-gradient(circle 10px at 100% ${y}, transparent 9.5px, #000 10px) right / 51% 100% no-repeat` });

export default function BoardingPass() {
  return (
    <article aria-label="Boarding pass, Lisbon to Copenhagen" className="w-full max-w-[27.5rem] [filter:drop-shadow(0_1px_1px_rgb(18_35_61/0.05))_drop-shadow(0_6px_14px_rgb(18_35_61/0.08))]">
      <div className="overflow-hidden rounded-t-card bg-surface" style={notch('100%')}>
        <header className="flex items-center gap-2.5 bg-[#0b4f5c] px-6 py-3.5">
          <span className="grid size-[22px] place-items-center rounded-[6px] bg-[#e6f3f3]">
            <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden="true"><path d="M1.5 9.5c2.6-.3 4.6-1.5 6-3.9.6 2 1.9 3.2 4.1 3.5 1-.1 1.9-.6 2.9-1.4-.7 2-2.3 3.4-4.6 3.6-2.4.1-4.5-.6-8.4-1.8Z" fill="#0b4f5c" /></svg>
          </span>
          <span className="flex flex-1 items-baseline justify-between">
            <span className="text-[15px] font-semibold tracking-[-0.01em] text-white">Tern</span>
            <span className="text-[11px] leading-[14px] font-medium tracking-caps text-[#b9dcdc] uppercase">Boarding pass</span>
          </span>
        </header>

        {/* the route: the two codes, the flight drawn between them */}
        <div className="grid grid-cols-[auto_1fr_auto] items-end gap-4 px-6 pt-5">
          <span className="flex flex-col">
            <span className="text-xs text-ink-muted">Lisbon</span>
            <span className="mt-1 text-[42px] leading-none font-semibold tracking-[-0.02em]">LIS</span>
            <span className="mt-1.5 text-[13px] font-medium tabular-nums">07:55</span>
          </span>
          <span className="relative h-16">
            <svg viewBox="0 0 200 64" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" aria-hidden="true">
              <path d="M4 44 C 60 6, 140 6, 196 44" fill="none" stroke="rgb(18 35 61 / 0.22)" strokeWidth="1.5" strokeDasharray="1 5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            </svg>
            <span className="absolute top-[42px] left-[2%] -ml-[3px] size-1.5 rounded-full" style={{ background: TEAL }} />
            <span className="absolute top-[41px] right-[2%] -mr-1 size-2 rounded-full bg-surface" style={{ boxShadow: `inset 0 0 0 1.5px ${TEAL}` }} />
            <svg viewBox="0 0 16 16" className="absolute top-1.5 left-1/2 -ml-[9px] size-[18px]" aria-hidden="true"><path d="M15 8c0-.6-.5-1-1.1-1H10L6.6 1.5H5.2L7 7H3.6L2.4 5.4H1.2L2 8l-.8 2.6h1.2L3.6 9H7l-1.8 5.5h1.4L10 9h3.9c.6 0 1.1-.4 1.1-1Z" fill="#12233d" /></svg>
            <span className="absolute inset-x-0 bottom-0 text-center text-xs text-ink-muted">3h 35m · direct</span>
          </span>
          <span className="flex flex-col items-end">
            <span className="text-xs text-ink-muted">Copenhagen</span>
            <span className="mt-1 text-[42px] leading-none font-semibold tracking-[-0.02em]">CPH</span>
            <span className="mt-1.5 text-[13px] font-medium tabular-nums">12:30</span>
          </span>
        </div>

        {/* the big three */}
        <div className="mx-6 mt-5 grid grid-cols-3 divide-x-hairline rounded-control bg-sunken">
          {[['Gate', 'B12', true], ['Boards', '07:15'], ['Seat', '14A']].map(([l, v, gate]) => (
            <span key={l} className="flex flex-col gap-1 px-3.5 pt-2.5 pb-3">
              <Label>{l}</Label>
              <span className="text-[22px] leading-[26px] font-semibold tracking-[-0.01em] tabular-nums" style={gate ? { color: TEAL } : undefined}>{v}</span>
            </span>
          ))}
        </div>

        <div className="grid grid-cols-[1.15fr_1fr_1fr] gap-x-4 gap-y-3.5 px-6 pt-[18px]">
          <Field label="Flight">TN–754</Field>
          <Field label="Class">Economy (Y)</Field>
          <Field label="Terminal">T1</Field>
          <Field label="Group">2 (Priority)</Field>
          <Field label="Meal">Veg – VGML</Field>
          <Field label="Aircraft">A321neo</Field>
        </div>

        <div className="grid grid-cols-[auto_1fr] items-start gap-6 px-6 pt-[18px] pb-[22px]">
          <div role="img" aria-label="Seat 14A, a window seat on row 14" className="grid grid-cols-[22px_repeat(3,14px)_10px_repeat(3,14px)] items-center gap-1 text-center text-[10px] leading-[14px] text-ink-subtle tabular-nums">
            <span />{'ABC'.split('').map((c) => <span key={c}>{c}</span>)}<span />{'DEF'.split('').map((c) => <span key={c}>{c}</span>)}
            {Object.entries(CABIN).map(([row, seats]) => [
              <span key={row} className="text-left" style={row === '14' ? { color: TEAL, fontWeight: 600 } : undefined}>{row}</span>,
              ...seats.split('').map((s, i) => (s === ' ' ? <span key={row + i} /> : <Seat key={row + i} s={s} />)),
            ])}
          </div>
          <div className="flex flex-col">
            <Label>Boarding by zone</Label>
            <span className="mt-2 grid grid-cols-5 gap-[3px]">
              <span className="h-2 rounded-[2px] bg-ink/22" />
              <span className="h-2 rounded-[2px]" style={{ background: TEAL }} />
              {[3, 4, 5].map((z) => <span key={z} className="h-2 rounded-[2px] bg-sunken shadow-[inset_0_0_0_1px_var(--color-line)]" />)}
            </span>
            <span className="mt-1 grid grid-cols-5 gap-[3px] text-[10px] leading-[14px] text-ink-subtle tabular-nums">
              {[1, 2, 3, 4, 5].map((z) => <span key={z} style={z === 2 ? { color: TEAL, fontWeight: 600 } : undefined}>{z}</span>)}
            </span>
            <span className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
              <span className="inline-flex h-5 items-center gap-[5px] rounded-full bg-positive-soft px-[7px] text-[11px] font-medium text-positive"><span className="size-[5px] rounded-full bg-positive" />On time</span>
              <span className="tabular-nums">Zone 2 boards in 38 min</span>
            </span>
          </div>
        </div>
      </div>

      {/* the tear: a dashed rule, not a hairline */}
      <div aria-hidden="true" className="relative z-10 mx-5 h-0 border-t-[1.5px] border-dashed border-ink/18" />

      <div className="grid grid-cols-[1fr_auto] items-center gap-4 rounded-b-card bg-surface px-6 pt-[18px] pb-5" style={notch('0')}>
        <div className="flex flex-col">
          <span className="flex items-center gap-3">
            <img src={sana} alt="" className="size-10 rounded-full object-cover outline-1 -outline-offset-1 outline-black/10" />
            <span className="flex flex-col"><Label>Passenger</Label><Caps className="text-sm font-semibold">Okafor / Sana Ms</Caps></span>
          </span>
          <span className="mt-3 flex gap-5">
            <Field label="Booking">K7QX2M</Field>
            <Field label="Bags">1 × 23 kg</Field>
            <span className="flex flex-col gap-[3px]"><Label>Seq</Label><span className="text-[13px] leading-[18px] font-medium tabular-nums">041</span></span>
          </span>
        </div>
        <span className="size-[92px] rounded-control p-1.5 shadow-[inset_0_0_0_1px_var(--color-line)]">
          <svg viewBox={`0 0 ${CODE.n} ${CODE.n}`} shapeRendering="crispEdges" className="block size-full" role="img" aria-label="Boarding code">
            <Finder x={0} y={0} /><Finder x={CODE.n - 7} y={0} /><Finder x={0} y={CODE.n - 7} />
            <path d={CODE.d} fill="#12233d" />
          </svg>
        </span>
      </div>
    </article>
  );
}
BoardingPass.stage = true;
BoardingPass.names = ['Lowercase forms', 'Case forms'];
BoardingPass.lesson = {
  why: 'Hyphens, dashes, brackets and colons are drawn to sit at the middle of lowercase letters. Between capitals that middle is too low, so on a pass set in capitals the dash in TN–754, the brackets round Y and the dash in the meal all sag below the letters around them.',
  habit: 'Text set in capitals turns on the font’s case-sensitive forms, so its punctuation rises to the capitals.',
};
// the values are 13px: the stage goes in closer than usual so a 1px rise can be seen
BoardingPass.maxZoom = 5;
// What the eye sees in the flight number: the middle of its capitals, carried across, and where the dash's ink actually
// sits, measured from the default glyph (canvas measureText). The hatch is the sag between; the pill is the sag in px.
// With the case forms on, the alternate rises to the middle (the browser draws it; canvas can't, so the fixed side
// shows the middle and the glyph itself, zoomed).
let ctx;
BoardingPass.measure = (root) => {
  const el = [...(root?.querySelectorAll('[data-caps]') ?? [])].find((e) => /^[A-Z]+–\d+$/.test(e.textContent));
  if (!el) return null;
  const k = el.getBoundingClientRect().width / el.offsetWidth || 1, s = getComputedStyle(el), r = el.getBoundingClientRect();
  ctx ??= document.createElement('canvas').getContext('2d');
  ctx.font = `${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
  const m = ctx.measureText('H'), q = document.createRange(); q.selectNodeContents(el);
  const box = q.getClientRects()[0], base = box.top + ((box.height / k - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2 + m.fontBoundingBoxAscent) * k;
  const mid = base - (m.actualBoundingBoxAscent / 2) * k, on = /case/.test(s.fontFeatureSettings);
  const i = el.textContent.indexOf('–'), c = document.createRange(); c.setStart(el.firstChild, i); c.setEnd(el.firstChild, i + 1);
  const dash = c.getBoundingClientRect(), g = ctx.measureText('–'), dy = base - ((g.actualBoundingBoxAscent - g.actualBoundingBoxDescent) / 2) * k;
  const sag = Math.max(0, (dy - mid) / k);
  return {
    lines: [],
    rules: [{ key: 'mid', y: mid, left: r.left - 8 * k, right: r.right + 8 * k },
      { key: 'dash', y: on ? mid : dy, left: dash.left - 1 * k, right: dash.right + 1 * k }],
    bands: [{ key: 'dsag', left: dash.left - 1 * k, right: dash.right + 1 * k, top: mid, bottom: on ? mid : Math.max(mid, dy), pattern: 'hatch' }],
    off: !on,
    pills: [{ key: 'sag', x: r.left - 20 * k, y: mid, text: on ? '0' : (Math.max(sag, 0.05) * k).toFixed(1), ok: on }],
    cut: { left: r.left - 3 * k, right: r.right + 3 * k, top: r.top, bottom: r.bottom },
    subject: { left: r.left - 40 * k, right: r.right + 14 * k, top: r.top - 16 * k, bottom: r.bottom + 12 * k },
  };
};
