// #18 no widows in headings. Dispatch, a news reader, on Wednesday morning. Every headline on the front is a heading
// set the default way: the browser fills each line as far as it can and carries over what's left, so the lead's last
// word, and both stories' under it, sit alone on their own lines. plumber balances the lines.
import { HeartIcon, PlayIcon } from '@unlocalhosted/dither-icons';
import aurora from '../../media/s18-aurora.jpg';
import tram from '../../media/s18-tram.jpg';
import windFarm from '../../media/s18-wind-farm.jpg';
import ingrid from '../../media/people/person-10.jpg';
import tomas from '../../media/people/person-02.jpg';
import hana from '../../media/people/person-07.jpg';

export const n = 18;

// the storm as the Kp index, in three-hour bars over the last day, coloured by the storm scale
const KP = [[22, '#9fd8b8'], [25, '#9fd8b8'], [33, '#9fd8b8'], [50, '#e7b84a'], [75, '#e0763c'], [100, '#c9374a'], [88, '#c9374a'], [62, '#e0763c']];
const STORIES = [
  { kicker: 'Cities', head: 'Lisbon gives three of its steepest streets to trams and bicycles', from: 'Harbour Weekly', mark: ['H', '#0f6f58'], read: 4, by: 'Tomás Reis', face: tomas, photo: tram, alt: 'A yellow tram on a steep Lisbon street' },
  { kicker: 'Climate', head: 'The North Sea’s newest wind farm sends its first power ashore', from: 'Meridian', mark: ['M', '#3631a6'], read: 5, by: 'Hana Mori', face: hana, photo: windFarm, alt: 'Wind turbines standing in the sea' },
];
// the briefing's waveform, fixed so every render is the same; played to 12 of 32
const WAVE = [8, 14, 10, 18, 24, 16, 12, 20, 26, 22, 14, 10, 16, 22, 28, 20, 12, 8, 14, 18, 24, 20, 16, 10, 12, 18, 22, 16, 12, 8, 10, 14];
const PLAYED = 12;
const photoEdge = 'outline-1 -outline-offset-1 outline-black/10';

function NewsFront() {
  // Slate's primitives, with real photos; the storm scale keeps its own colours
  return (
    <article className="w-full max-w-[35rem] overflow-hidden rounded-card bg-surface shadow-card">
      <header className="flex items-baseline justify-between px-6 pt-5 pb-3.5">
        <span className="text-[17px] leading-6 font-medium tracking-[-0.01em]">Today</span>
        <span className="text-[13px] text-ink-muted">Wednesday, 5 November</span>
      </header>
      <section className="px-6 pb-5">
        <img src={aurora} alt="Green aurora over a still lake at night" className={'block h-[232px] w-full rounded-control object-cover ' + photoEdge} />
        <p className="mt-1.5 text-[11px] leading-4 text-ink-subtle">Bjuröklubb, Sweden, 01:40 last night · Niklas Jonasson</p>
        <p className="mt-3.5 text-xs font-medium text-accent">Science <span className="font-normal text-ink-subtle">· 2 hours ago</span></p>
        <h3 data-head className="mt-1.5 text-[22px] leading-7 font-semibold tracking-[-0.015em]">Northern lights reach farther south than in any year recorded</h3>
        <p className="mt-2 text-[15px] leading-[22px] text-ink-muted text-pretty">A storm on the sun lit skies as far south as Lisbon and Rome. Forecasters expect a second, weaker wave tonight.</p>
        {/* the storm, drawn */}
        <figure className="mt-4 rounded-control bg-sunken px-3.5 pt-3 pb-2.5">
          <figcaption className="flex items-baseline justify-between gap-3 text-xs text-ink-muted">
            <span><b className="text-[13px] font-medium text-ink">Kp 8</b> · severe geomagnetic storm, peaked 02:00</span>
            <span className="shrink-0">Last 24 hours</span>
          </figcaption>
          <span className="mt-2.5 flex h-11 items-end gap-1" role="img" aria-label="Kp index rising from 2 to 8 overnight">
            {KP.map(([h, c], i) => <span key={i} className="flex-1 rounded-t-[2px]" style={{ height: `${h}%`, background: c }} />)}
          </span>
          <span className="mt-1 flex justify-between text-[11px] leading-4 text-ink-subtle tabular-nums">
            {['09:00', '15:00', '21:00', '03:00', 'now'].map((t) => <span key={t}>{t}</span>)}
          </span>
        </figure>
        <p className="mt-3.5 flex items-center gap-2 text-[13px] text-ink-muted">
          <img src={ingrid} alt="" className={'size-6 rounded-full object-cover ' + photoEdge} />
          <span><b className="font-medium text-ink">Ingrid Solberg</b> · Meridian · 6 min read</span>
          <button type="button" aria-label="Save for later" className="-mr-1.5 ml-auto grid size-7 place-items-center rounded-control text-ink-subtle hover:bg-sunken hover:text-ink"><HeartIcon size={16} texture="dither" /></button>
        </p>
      </section>
      <ul className="border-t-hairline border-line px-6 pt-1">
        {STORIES.map((st) => (
          <li key={st.head} className="grid grid-cols-[minmax(0,1fr)_4.5rem] items-center gap-4 border-b-hairline border-line py-3.5">
            <span className="flex flex-col">
              <span className="text-xs font-medium text-accent">{st.kicker}</span>
              <h3 data-head className="mt-[3px] text-[15px] leading-5 font-semibold tracking-[-0.01em]">{st.head}</h3>
              <span className="mt-1.5 flex items-center gap-1.5 text-xs text-ink-muted">
                <span className="grid size-4 place-items-center rounded-chip text-[9px] font-semibold text-white" style={{ background: st.mark[1] }}>{st.mark[0]}</span>
                {st.from} · {st.read} min
                <img src={st.face} alt="" className="ml-1 size-4 rounded-full object-cover" />{st.by}
              </span>
            </span>
            <img src={st.photo} alt={st.alt} className={'size-[72px] rounded-control object-cover ' + photoEdge} />
          </li>
        ))}
      </ul>
      {/* the morning briefing: audio, its waveform played up to where you stopped */}
      <section className="flex items-center gap-3.5 bg-sunken px-6 pt-3.5 pb-[18px]">
        <button type="button" aria-label="Play the morning briefing" className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-accent-ink hover:bg-accent-deep"><PlayIcon size={14} texture="dither" /></button>
        <span className="flex min-w-0 flex-col">
          <span className="text-sm font-medium">Morning briefing</span>
          <span className="text-xs text-ink-muted">Five stories, read aloud · 12 min</span>
        </span>
        <span className="ml-auto flex h-7 items-center gap-0.5" role="img" aria-label="Played 4 minutes 18 of 12 minutes">
          {WAVE.map((h, i) => <span key={i} className={'w-0.5 rounded-[1px] ' + (i < PLAYED ? 'bg-accent' : 'bg-[#cdd3dd]')} style={{ height: h }} />)}
        </span>
        <span className="w-10 text-right text-xs text-ink-muted tabular-nums">4:18</span>
      </section>
    </article>
  );
}
NewsFront.stage = true;
NewsFront.names = ['Greedy', 'Balanced'];
NewsFront.lesson = {
  why: 'A browser fills each line as far as it can and carries over whatever is left, so a heading’s last word often ends up alone. One short word under a full line reads as a mistake, and the heading loses its shape.',
  habit: 'Headings get text-wrap: balance (even lines); paragraphs get text-wrap: pretty (no lone last word).',
};
// What the eye sees on the lead headline (plumber balances all three): each line's length, as a band under it. The
// pill is the last line's length as a share of the longest.
NewsFront.measure = (root) => {
  const h = root?.querySelector('[data-head]');
  if (!h) return null;
  const k = h.getBoundingClientRect().width / h.offsetWidth || 1, range = document.createRange();
  range.selectNodeContents(h);
  const rows = [];
  for (const q of range.getClientRects()) { const row = rows.find((r) => Math.abs(r.top - q.top) < 4); if (row) { row.left = Math.min(row.left, q.left); row.right = Math.max(row.right, q.right); } else rows.push({ top: q.top, bottom: q.bottom, left: q.left, right: q.right }); }
  rows.sort((a, b) => a.top - b.top);
  const widths = rows.map((r) => r.right - r.left), share = widths.at(-1) / Math.max(...widths);
  const r = h.getBoundingClientRect();
  return {
    lines: [], off: share < 0.5,
    bands: rows.map((row, i) => ({ key: `row${i}`, left: row.left, right: row.right, top: row.bottom - 3 * k, bottom: row.bottom, pattern: 'hatch' })),
    pills: [{ key: 'share', x: Math.min(r.right + 18 * k, rows.at(-1).right + 40 * k), y: rows.at(-1).top + 8 * k, text: String(Math.round(share * 100) * k), ok: share >= 0.5 }],
    cut: { left: r.left, right: r.right, top: r.top, bottom: r.bottom },
    subject: { left: r.left - 30 * k, right: r.right + 50 * k, top: r.top - 40 * k, bottom: r.bottom + 30 * k },
  };
};

export default NewsFront;
