// #2 optical centre beats geometric centre. The hosted invoice Figma opens from Quay Studio's reminder: the amount,
// Ana's walkthrough of it (her screen, her camera, a chapter for each part she explains), the lines it bills, Pay.
// Every play button in it is one component, and its triangle was exported with its box centred, as custom glyphs
// usually are: a triangle's weight sits toward its flat side, so each one reads left of centre. plumber's fix nudges
// the glyph toward its point by its weight, in every button at once.
import ana from '../../media/people/person-07.jpg';
import figmaLogo from '../../media/logos/figma.svg';
import visaLogo from '../../media/logos/visa.svg';
import mastercardLogo from '../../media/logos/mastercard.svg';

export const n = 2;

// a brand's mark, drawn in a colour of ours through its own shape (the url is quoted: vite inlines small svgs)
const Mark = ({ logo, className = '', color = '#fff' }) => (
  <span aria-hidden="true" className={'block shrink-0 ' + className} style={{ background: color, mask: `url("${logo}") center / contain no-repeat` }} />
);

const LINES = [
  { what: 'Keynote deck, 42 slides', detail: 'Layouts, charts, speaker builds', hours: 22, amount: '$3,190.00' },
  { what: 'Opener motion', detail: '40-second title sequence', hours: 8, amount: '$1,160.00' },
  { what: 'Rehearsal changes', detail: 'Two rounds, on site', hours: 3, amount: '$435.00' },
  { what: 'Stock footage licence', detail: 'Expense, at cost', hours: 0, amount: '$35.00' },
];
// where Ana's walkthrough stops on each line it explains (its index in LINES)
const CHAPTERS = [
  { title: 'Keynote deck', at: '0:00', line: 0 },
  { title: 'Opener motion', at: '0:26', line: 1 },
  { title: 'Rehearsals', at: '1:10', line: 2 },
];

// Ana's screen in the recording: the invoice itself, with the line she's talking about highlighted
function Screen({ line, small = false }) {
  return (
    <div aria-hidden="true" className={'absolute inset-x-[17%] top-[11%] -bottom-[4%] rounded-t-[4px] bg-surface ' + (small ? 'px-[7%] pt-[6%]' : 'px-[6%] pt-[5%]')}>
      <div className="flex items-center justify-between">
        <span className={'rounded-[2px] bg-ink ' + (small ? 'h-[3px] w-[10px]' : 'h-[7px] w-[22px]')} />
        <span className={'grid place-items-center bg-[#f24e1e] ' + (small ? 'size-[7px] rounded-[2px]' : 'size-3.5 rounded-[3px]')}>
          <Mark logo={figmaLogo} className={small ? 'size-[4px]' : 'size-[7px]'} />
        </span>
      </div>
      <div className={'mt-[7%] w-[30%] rounded-[3px] bg-ink/55 ' + (small ? 'h-[4px]' : 'h-[9px]')} />
      {[52, 40, 47, 30].map((w, i) => (
        <div key={i} className={'relative mt-[5.5%] flex items-center justify-between ' + (small ? 'h-[2px]' : 'h-1')}>
          {i === line ? <span className={'absolute -inset-x-[6%] rounded-[2px] bg-accent/20 ' + (small ? '-inset-y-[3px]' : '-inset-y-[5px]')} /> : null}
          <i className="relative h-full rounded-full bg-ink/15" style={{ width: `${w}%` }} />
          <i className="relative h-full w-[12%] rounded-full bg-ink/15" />
        </div>
      ))}
    </div>
  );
}

// every play button on the invoice: one component, its glyph exported from the design file with its box centred
function Play({ label, big = false }) {
  return (
    <button type="button" data-play aria-label={label}
      className={'relative grid shrink-0 place-items-center rounded-full bg-surface text-ink transition-[scale] duration-150 hover:scale-105 active:scale-95 outline-offset-2 focus-visible:outline-2 focus-visible:outline-surface '
        + (big ? 'size-14' : 'size-11') + ' shadow-[0_1px_3px_rgb(18_35_61/0.25),0_6px_20px_rgb(18_35_61/0.3)]'}>
      <svg viewBox="0.3 0 20 20" className="size-6" fill="currentColor" aria-hidden="true"><path d="M2 1.6v16.8a1 1 0 0 0 1.5.86l14.6-8.4a1 1 0 0 0 0-1.72L3.5.74A1 1 0 0 0 2 1.6" /></svg>
    </button>
  );
}

export default function HostedInvoice() {
  const longest = Math.max(...LINES.map((l) => l.hours));
  return (
    <article className="w-full max-w-[31rem] rounded-card bg-surface shadow-card">
      <div className="flex flex-col gap-5 p-6">
        <header className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-control bg-ink text-xs font-semibold tracking-[0.02em] text-accent-ink">QS</span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium">Quay Studio</span>
            <span className="truncate text-[13px] text-ink-muted">Invoice <span className="case-forms tabular-nums">INV-2041</span> · PO-7716</span>
          </span>
          <span className="ml-auto flex shrink-0 items-center gap-2 text-xs text-ink-muted">for
            <span className="grid size-5 place-items-center rounded-[5px] bg-[#f24e1e]"><Mark logo={figmaLogo} className="size-2.5" /></span>
            <span className="text-[13px] text-ink">Figma</span>
          </span>
        </header>

        <section className="flex flex-col gap-1">
          <span className="text-xs font-medium text-ink-muted">Amount due</span>
          <span className="flex items-center gap-3">
            <span className="text-[34px] leading-[38px] font-medium tracking-[-0.02em] tabular-nums">$4,820.00</span>
            <span className="inline-flex h-6 items-center rounded-full bg-negative-soft px-2.5 text-xs font-medium text-negative ring-1 ring-negative/15 ring-inset">12 days late</span>
          </span>
          <span className="text-[13px] text-ink-muted">Was due 24 October · Net 30 · Config keynote, phase 2</span>
        </section>

        {/* the walkthrough: a frame of Ana's recording, her camera, and a chapter for each part she explains */}
        <figure className="flex flex-col gap-3">
          <div data-video className="relative grid aspect-[16/9] place-items-center overflow-hidden rounded-control bg-[#1b2a42]">
            <Screen line={1} />
            <svg aria-hidden="true" viewBox="0 0 14 18" className="absolute top-[57%] left-[62%] h-[18px] w-3.5"><path d="M1 1v14l3.8-3.6L7.6 17l2.4-1-2.7-5.4H13z" fill="#12233d" stroke="#fff" strokeWidth="1.2" strokeLinejoin="round" /></svg>
            <div aria-hidden="true" className="absolute inset-0 bg-ink/28" />
            <Play big label="Play Ana’s walkthrough, 1 minute 24 seconds" />
            <span className="absolute bottom-3 left-3 flex h-6 items-center rounded-full bg-ink/72 px-2.5 text-xs font-medium text-surface tabular-nums">1:24</span>
            <img src={ana} alt="Ana, on camera" className="absolute right-3 bottom-3 size-[52px] rounded-full object-cover shadow-[0_0_0_2px_#fff,0_2px_8px_rgb(18_35_61/0.35)]" />
          </div>
          <ol className="grid grid-cols-3 gap-2.5" aria-label="Chapters">
            {CHAPTERS.map((c) => (
              <li key={c.at} className="flex min-w-0 flex-col gap-1.5">
                <span className="relative grid aspect-[16/9] place-items-center overflow-hidden rounded-chip bg-[#1b2a42]">
                  <Screen line={c.line} small />
                  <span aria-hidden="true" className="absolute inset-0 bg-ink/28" />
                  <Play label={`Play from ${c.at}, ${c.title}`} />
                </span>
                <span className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="truncate text-ink-muted">{c.title}</span>
                  <span className="text-ink-subtle tabular-nums">{c.at}</span>
                </span>
              </li>
            ))}
          </ol>
        </figure>

        <section className="flex flex-col">
          <h3 className="flex justify-between pb-1.5 text-xs font-medium text-ink-muted">What this covers<span className="font-normal">33 hours at $145, plus one expense</span></h3>
          <ul>
            {LINES.map((l) => (
              <li key={l.what} className="grid grid-cols-[1fr_4.5rem_5.25rem] items-center gap-3.5 border-t-hairline border-line py-2.5">
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium">{l.what}</span>
                  <span className="truncate text-[13px] text-ink-muted">{l.detail}</span>
                </span>
                {l.hours ? (
                  <span className="h-1.5 overflow-hidden rounded-full bg-sunken" title={`${l.hours} hours`}>
                    <span className="block h-full rounded-full bg-accent" style={{ width: `${(l.hours / longest) * 100}%` }} />
                  </span>
                ) : <span />}
                <span className="text-right text-sm tabular-nums">{l.amount}</span>
              </li>
            ))}
          </ul>
          <p className="flex justify-between border-t-hairline border-line pt-2.5 text-sm font-semibold">Total due<span className="tabular-nums">$4,820.00</span></p>
        </section>

        <section className="flex flex-col gap-2.5">
          <button type="button" className="h-11 rounded-control bg-accent px-4 text-[15px] font-medium text-accent-ink transition-[background-color,scale] duration-150 hover:bg-accent-deep active:scale-[0.99] outline-offset-2 focus-visible:outline-2 focus-visible:outline-accent">Pay $4,820.00</button>
          <span className="flex items-center justify-between text-[13px] text-ink-muted">
            <span className="flex items-center gap-2.5">Card or bank transfer
              <Mark logo={visaLogo} color="var(--color-ink-muted)" className="h-4 w-8" />
              <Mark logo={mastercardLogo} color="var(--color-ink-muted)" className="h-4 w-[22px]" />
            </span>
            <a href="#pdf" className="-my-1 inline-flex min-h-6 items-center font-medium hover:text-ink">Download PDF</a>
          </span>
        </section>
      </div>
    </article>
  );
}
HostedInvoice.stage = true;
HostedInvoice.names = ['Box centred', 'Weight centred'];
HostedInvoice.lesson = {
  why: 'A triangle’s weight sits toward its flat side. Centre its box in the circle and the point carries empty space, so the glyph reads left of centre, on the big button and on every chapter’s.',
  habit: 'Centre an uneven glyph by its weight, not its box: nudge it toward its point, about a twelfth of its width.',
};

// The glyph's real shape, in its own units: the box of its ink and its centre of mass, sampled from the filled path
// once (the shape never changes; only where it's drawn does)
const SHAPES = new WeakMap();
function shapeOf(svg) {
  const path = svg.querySelector('path');
  if (SHAPES.has(path)) return SHAPES.get(path);
  const vb = svg.viewBox.baseVal, pt = svg.createSVGPoint(), step = vb.width / 160;
  let a = 0, cx = 0, x0 = Infinity, x1 = -Infinity;
  for (let y = vb.y; y < vb.y + vb.height; y += step) for (let x = vb.x; x < vb.x + vb.width; x += step) {
    pt.x = x; pt.y = y;
    if (!path.isPointInFill(pt)) continue;
    a++; cx += x; x0 = Math.min(x0, x); x1 = Math.max(x1, x + step);
  }
  const v = { mid: (x0 + x1) / 2 - vb.x, centroid: cx / a - vb.x, units: vb.width };
  SHAPES.set(path, v);
  return v;
}
// What the eye sees on every play button: its middle, and where the eye puts the triangle's middle (halfway between
// its ink's middle and its weight, as plumber reads it). The pill on the big button is the distance between them;
// under 1px the eye can't tell (plumber's own threshold for this rule).
HostedInvoice.measure = (root) => {
  const buttons = [...(root?.querySelectorAll('[data-play]') ?? [])];
  if (!buttons.length) return null;
  const lines = [], bands = [], pills = [];
  let off0 = 0, k = 1;
  buttons.forEach((b, i) => {
    const g = b.querySelector('svg'), br = b.getBoundingClientRect(), gr = g.getBoundingClientRect();
    k = br.width / b.offsetWidth || 1;
    const shape = shapeOf(g), u = gr.width / shape.units, centre = br.left + br.width / 2, seen = gr.left + ((shape.mid + shape.centroid) / 2) * u, off = (centre - seen) / k;
    lines.push({ key: `centre${i}`, x: centre, top: br.top - 6 * k, bottom: br.bottom + 6 * k }, { key: `seen${i}`, x: seen, top: gr.top, bottom: gr.bottom });
    bands.push({ key: `gap${i}`, left: Math.min(centre, seen), right: Math.max(centre, seen), top: gr.top, bottom: gr.bottom, pattern: 'hatch' });
    if (i === 0) {
      off0 = off;
      pills.push({ key: 'off', x: centre, y: br.top - 14 * k, text: (Math.abs(off) * k).toFixed(1), ok: Math.abs(off) < 1 });
    }
  });
  const br = buttons[0].getBoundingClientRect();
  return {
    lines, bands, pills, off: Math.abs(off0) >= 1,
    cut: { left: br.left, right: br.right, top: br.top, bottom: br.bottom, r: br.width / 2 }, // the big button itself
    subject: { left: br.left - 60 * k, right: br.right + 60 * k, top: br.top - 40 * k, bottom: br.bottom + 40 * k },
  };
};
