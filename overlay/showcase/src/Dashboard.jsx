// The dashboard: the greeting, four figures, the revenue chart, the date-range menu left open, a getting-started video
// and the toast for an invoice just sent. Each mistake is one a dashboard really ships; the comment names its rule.
import { Chevron, Play } from './icons.jsx';

const CARD = 'rounded-card bg-surface shadow-raised corner-squircle';

// #6 a figure and its unit share a baseline, not a centre line. #5 the change badge's padding isn't swollen by its
// leading. #22 every card sits on one level of the ladder (broken: one a hair off it). #17 three weights, three greys.
function Figure({ broken, label, value, unit, change, odd }) {
  const off = broken && odd;
  return (
    <div className={'flex flex-col gap-3 px-4 pb-4 ' + (broken ? 'pt-4 ' : 'pt-3 ') + (off ? 'rounded-card bg-surface corner-squircle shadow-[0_1px_4px_rgb(0_0_0/0.1)]' : CARD)}>
      <span className={'text-sm ' + (off ? 'font-bold text-[#9aa0a8]' : 'text-ink-muted')}>{label}</span>
      <div className={'flex gap-1 ' + (broken ? 'items-center' : 'items-baseline')}>
        <span className="text-3xl font-semibold tracking-tight tabular-nums">{value}</span>
        <span className="text-xs text-ink-subtle">{unit}</span>
      </div>
      <span className={'self-start rounded-chip bg-sunken px-1.5 text-xs font-medium text-positive ' + (broken ? 'py-1 leading-6' : 'py-0.5 leading-4')}>{change}</span>
    </div>
  );
}

// #8/#41 the chart well inside the card's 4px frame is rounded 12 − 4 = 8. #55 the target band mixes in oklch, not
// sRGB, so it doesn't go grey in the middle. #32 the progress bar grows by transform, not width.
function Revenue({ broken }) {
  // broken: the band typed as a style, mixed in sRGB; fixed: the theme's two colours, mixed in oklch
  const band = 'linear-gradient(to right, rgb(79, 70, 229), rgb(236, 72, 153))';
  const bars = [38, 52, 44, 61, 58, 72, 66, 80, 74, 88, 82, 94];
  return (
    <div className={CARD + ' col-span-3 p-1'}>
      <div className={'flex flex-col gap-4 bg-sunken px-4 pb-4 ' + (broken ? 'pt-4 ' : 'pt-3 ') + (broken ? 'rounded-card' : 'rounded-control')}>
        <div className="flex items-baseline justify-between">
          <h2 className="text-base font-semibold">Revenue</h2>
          <span className="text-sm text-ink-muted">Last 12 months</span>
        </div>
        <div className="flex h-36 items-end gap-2">
          {bars.map((h, i) => <span key={i} className="flex-1 rounded-t-chip bg-accent" style={{ height: h + '%' }} />)}
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex justify-between text-sm"><span className="text-ink-muted">Quarterly target</span><span className="tabular-nums">82%</span></div>
          <div className="h-2 overflow-hidden rounded-full bg-surface">
            {broken
              ? <div className="h-full rounded-full transition-[width] duration-300" style={{ width: '82%', backgroundImage: band }} />
              : <div className="h-full origin-left scale-x-82 rounded-full bg-linear-to-r/oklch from-accent to-magenta transition-transform" />}
          </div>
        </div>
      </div>
    </div>
  );
}

// #20 the menu's shadow falls down, from the same light as the cards. #51 it is two layers, not one big blur.
function RangeMenu({ broken }) {
  return (
    <div className="relative">
      <button type="button" className="flex h-9 items-center gap-2 rounded-control bg-surface pr-3 pl-4 text-sm shadow-raised active:bg-sunken">
        Last 12 months<Chevron className="rotate-90 text-ink-subtle" />
      </button>
      <ul role="menu" className={'absolute top-11 right-0 z-20 flex w-48 flex-col rounded-control bg-surface p-1 text-sm ' + (broken ? 'shadow-[0_-8px_24px_rgba(0,0,0,0.12)]' : 'shadow-popover')}>
        {['Last 7 days', 'Last 30 days', 'Last 12 months', 'All time'].map((t) => (
          <li key={t} role="menuitem" className={'flex h-8 items-center rounded-chip px-2 ' + (t === 'Last 12 months' ? 'bg-sunken font-medium' : '')}>{t}</li>
        ))}
      </ul>
    </div>
  );
}

// #2 the play triangle is centred by its weight, not its box (nudged 2px toward its point). #40 a large surface gets
// continuous corners. #14 big type takes tight leading.
function Tour({ broken }) {
  return (
    <div className={'flex flex-col gap-4 bg-ink px-5 pb-5 text-accent-ink ' + (broken ? 'pt-5 ' : 'pt-4 ') + (broken ? 'rounded-sheet' : 'rounded-sheet corner-squircle')} style={{ minHeight: 176 }}>
      <span className="text-sm text-night-muted">Getting started · 2 min</span>
      <p className="max-w-56 text-lg font-medium">Send your first invoice in under a minute</p>
      <button type="button" aria-label="Watch the tour" className="mt-auto grid size-12 place-items-center rounded-full bg-surface text-ink active:bg-sunken">
        <Play size={24} className={broken ? '' : 'translate-x-0.5'} />
      </button>
    </div>
  );
}

// #63 the toast arrives from 95%, never from nothing
function Toast({ broken }) {
  return (
    <div role="status" className={'fixed right-6 bottom-6 z-30 flex items-center gap-3 rounded-control bg-ink py-3 pr-3 pl-4 text-sm text-accent-ink shadow-popover ' + (broken ? 'animate-toast-zero' : 'animate-toast')}>
      Invoice INV-2041 sent to Halden &amp; Co.<a href="#invoices" className="rounded-chip px-2 py-1 font-medium text-night-ink underline-offset-2 hover:underline">View</a>
    </div>
  );
}

export function Dashboard({ broken }) {
  return (
    <section id="dashboard" aria-labelledby="dashboard-title" className="flex scroll-mt-20 flex-col gap-6">
      <div className="flex items-end justify-between gap-6">
        <div className="flex flex-col gap-1">
          <h1 id="dashboard-title" className={'text-3xl font-semibold tracking-tight ' + (broken ? 'leading-normal' : 'leading-tight')}>Good morning, Ada</h1>
          <p className="text-sm text-ink-muted">Three invoices are due this week.</p>
        </div>
        <RangeMenu broken={broken} />
      </div>
      <div className="grid grid-cols-4 gap-4">
        <Figure broken={broken} label="Outstanding" value="48,210" unit="USD" change="+12.4%" />
        <Figure broken={broken} label="Paid this month" value="31,904" unit="USD" change="+4.1%" />
        <Figure broken={broken} label="Overdue" value="6,480" unit="USD" change="−2.3%" odd />
        <Figure broken={broken} label="Clients" value="38" unit="active" change="+3" />
      </div>
      <div className="grid grid-cols-4 gap-4">
        <Revenue broken={broken} />
        <Tour broken={broken} />
      </div>
      <Toast broken={broken} />
    </section>
  );
}
