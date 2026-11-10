// #45 hanging punctuation. Northlight, a monthly culture magazine, its November long read open mid-way: the photograph
// of the sign, the reader's place in the story, the byline, the crowd under the sign hour by hour, friends' highlights,
// the next story. Every paragraph that opens on a quote mark (the pull quote, and each line of dialogue) sets the mark
// flush, so its words start a mark's width in from every other line of the column. plumber hangs the mark in the margin.
import { ArrowRightIcon, BookIcon, UploadIcon } from '@unlocalhosted/dither-icons';
import afterglow from '../../media/afterglow.jpg';
import ferry from '../../media/s45-ferry.jpg';
import mei from '../../media/people/person-07.jpg';
import ravi from '../../media/people/person-02.jpg';
import sol from '../../media/people/person-10.jpg';
import lena from '../../media/people/person-05.jpg';

export const n = 45;

// Northlight's own mark: a warm neon pink taken from the issue's cover, for the section and the reader's place
const PINK = 'text-[#c2366f]';
// the crowd under the sign on a Friday, each hour from 20:00; the peak is the hour to 02:00
const CROWD = [30, 47, 74, 108, 144, 178, 212, 98, 38];
const HOURS = ['20', '21', '22', '23', '00', '01', '02', '03', '04'];
const PEAK = CROWD.indexOf(Math.max(...CROWD));

// a paragraph of the story; one that opens on dialogue is set by Said, as the magazine's editor renders it
const P = ({ children }) => <p className="mt-[18px] text-base leading-7 text-pretty">{children}</p>;
const Said = ({ children }) => <p data-said className="mt-[18px] text-base leading-7 text-pretty">{children}</p>;

export default function LongRead() {
  return (
    <article className="w-full max-w-[35rem] overflow-hidden rounded-card bg-surface shadow-card">
      <div className="h-[200px]">
        <img src={afterglow} alt="The pink and blue sign above the studio door" className="size-full object-cover object-[50%_40%]" />
      </div>
      {/* the reader's place in the story */}
      <div role="progressbar" aria-label="Read so far" aria-valuenow={38} className="h-[3px] bg-sunken"><span className="block h-full w-[38%] bg-[#c2366f]" /></div>

      <div data-column className="px-8 pt-[22px]">
        <div className="flex items-center justify-between text-xs">
          <span className={'font-semibold ' + PINK}>Culture · Long read</span>
          <span className="flex items-center gap-1.5 text-ink-muted tabular-nums">
            {/* how much is read, as a ring: a conic fill under a mask, a chart rather than an icon */}
            <span aria-hidden="true" className="size-3 rounded-full [mask:radial-gradient(farthest-side,transparent_calc(100%-1.5px),#000_calc(100%-1px))]" style={{ background: 'conic-gradient(#c2366f 137deg, rgb(18 35 61 / 0.14) 0)' }} />
            7 min left of 12
          </span>
        </div>
        <h2 className="mt-2.5 text-[28px] leading-[34px] font-semibold tracking-[-0.02em] text-balance">The sign that kept Rua da Rosa awake</h2>
        <p className="mt-2 text-base text-ink-muted text-pretty">A studio, a landlord and three nights of argument over a tube of pink light.</p>
        <div className="mt-4 flex items-center gap-2.5 border-b-hairline border-line pb-[18px] text-[13px]">
          <img src={mei} alt="" className="size-8 rounded-full object-cover outline-1 -outline-offset-1 outline-black/10" />
          <span className="flex min-w-0 flex-col">
            <span className="font-medium">Mei Lin</span>
            <span className="truncate text-ink-muted">Photographs by Kaito Ren · November issue</span>
          </span>
          <span className="ml-auto flex gap-1">
            <button type="button" aria-label="Saved to your reading list" aria-pressed="true" className={'grid size-8 place-items-center rounded-control bg-[#fbe9f0] ' + PINK}><BookIcon size={16} texture="solid" /></button>
            <button type="button" aria-label="Share" className="grid size-8 place-items-center rounded-control text-ink-muted hover:bg-sunken"><UploadIcon size={16} texture="solid" /></button>
          </span>
        </div>

        <P>
          By the third night the studio had stopped arguing about the sign. Kaito Ren wanted it pink; the landlord wanted it gone. <mark className="rounded-[2px] bg-[#fdf0b8] py-px text-inherit shadow-[0_2px_0_-0.5px_#f2d25c]">The street, it turned out, had already decided</mark>: by midnight on Friday there were forty people on the cobbles, looking up.
        </P>
        <Said>“Pink,” Kaito told the landlord on the second night, “or I take the whole thing down myself.” The tubes were already bent; nobody believed him.</Said>

        {/* the pull quote */}
        <blockquote data-quote className="mt-[22px] border-y-hairline border-line pt-[18px] pb-4">
          <p className="text-[22px] leading-[30px] font-medium tracking-[-0.01em] text-balance">“Neon is a promise you make to the street at two in the morning.”</p>
          <cite className="mt-2.5 block text-[13px] text-ink-muted not-italic">Kaito Ren, who bent the tubes by hand</cite>
        </blockquote>

        <P>The sign stayed. So did the crowd, which now gathers under it every Friday and peaks, as the bar staff will tell you, a little before two.</P>
        <Said>“We stopped counting at forty,” says Inês Duarte, who runs the bar opposite. “Then we started again, because people kept asking.”</Said>

        <figure className="mt-[22px] rounded-control bg-sunken px-4 pt-4 pb-3">
          <figcaption className="flex items-baseline justify-between gap-4 text-[13px]">
            <b className="font-semibold">Under the sign, a Friday</b>
            <span className="text-xs text-ink-muted">People on Rua da Rosa, each hour</span>
          </figcaption>
          <div className="mt-2 grid h-[90px] grid-cols-9 items-end gap-1.5">
            {CROWD.map((c, i) => (
              <span key={HOURS[i]} className="flex h-full flex-col items-center justify-end gap-1">
                {i === PEAK ? <span className={'text-[11px] leading-[14px] font-semibold tabular-nums ' + PINK}>{c}</span> : null}
                <span className={'w-full rounded-t-[3px] rounded-b-[1px] ' + (i === PEAK ? 'bg-[#c2366f]' : 'bg-ink/16')} style={{ height: `${(c / CROWD[PEAK]) * 72}px` }} />
              </span>
            ))}
          </div>
          <div className="mt-1.5 grid grid-cols-9 gap-1.5 text-center text-[11px] leading-[14px] text-ink-subtle tabular-nums">
            {HOURS.map((h) => <span key={h}>{h}</span>)}
          </div>
          <p className="mt-2.5 text-xs text-ink-muted text-pretty">Counted from the bar opposite on 17 October. The peak is 212 people, in the hour to 02:00.</p>
        </figure>
      </div>

      {/* the foot: friends who read it, and the next story */}
      <div className="mt-6 flex items-center gap-2.5 border-t-hairline border-line px-8 py-3.5 text-[13px]">
        <span className="flex">
          {[ravi, sol, lena].map((src, i) => <img key={src} src={src} alt="" className={'size-6 rounded-full object-cover ring-2 ring-surface ' + (i ? '-ml-1.5' : '')} />)}
        </span>
        <span className="text-ink-muted"><b className="font-medium text-ink">Ravi Nair</b> and 2 friends highlighted this story</span>
      </div>
      <a href="#next" onClick={(e) => e.preventDefault()} className="flex items-center gap-3 border-t-hairline border-line bg-sunken px-8 pt-3 pb-3.5">
        <img src={ferry} alt="" className="size-11 rounded-control object-cover outline-1 -outline-offset-1 outline-black/10" />
        <span className="flex min-w-0 flex-col">
          <span className="text-xs text-ink-muted">Next in the November issue · 9 min</span>
          <span className="truncate text-sm font-medium">The last night ferry to Cacilhas</span>
        </span>
        <ArrowRightIcon size={16} texture="solid" className="ml-auto text-ink-muted" />
      </a>
    </article>
  );
}
LongRead.stage = true;
LongRead.names = ['Flush', 'Hanging'];
LongRead.lesson = {
  why: 'An opening quote mark is punctuation, not a letter, but set flush it takes the first place on the line. Every paragraph that opens on a quote, the pull quote and each line of dialogue, starts its words a mark’s width in from the rest of the column, and the column looks dented wherever someone speaks.',
  habit: 'Hang opening quotes in the margin, so the words line up with the column: a negative text-indent the width of the mark.',
};
// What the eye sees: the column's edge, and where the words start after the mark, in every paragraph that opens on
// one (the hatch is the mark's width). The pill is the pull quote's, in px.
LongRead.measure = (root) => {
  const col = root?.querySelector('[data-column]'), q = root?.querySelector('[data-quote] p');
  if (!col || !q) return null;
  const k = col.getBoundingClientRect().width / col.offsetWidth || 1, cs = getComputedStyle(col);
  const edge = col.getBoundingClientRect().left + parseFloat(cs.paddingLeft) * k;
  // where the first word starts in a paragraph that opens on a mark: the character after the mark
  const word = (p) => { const r = document.createRange(); r.setStart(p.firstChild, 1); r.setEnd(p.firstChild, 2); return r.getBoundingClientRect(); };
  const opens = [...root.querySelectorAll('[data-said]'), q];
  const w = word(q), off = (w.left - edge) / k, qr = q.getBoundingClientRect(), first = root.querySelector('[data-said]').getBoundingClientRect();
  const lines = [{ key: 'edge', x: edge, top: first.top - 8 * k, bottom: qr.bottom + 8 * k }];
  const bands = [];
  opens.forEach((p, i) => {
    const g = word(p);
    lines.push({ key: 'word' + i, x: g.left, top: g.top, bottom: g.bottom });
    bands.push({ key: 'mark' + i, left: Math.min(edge, g.left), right: Math.max(edge, g.left), top: g.top, bottom: g.bottom, pattern: 'hatch' });
  });
  return {
    lines, bands,
    pills: [{ key: 'off', x: edge, y: w.top - 12 * k, text: (Math.abs(off) * k).toFixed(1), ok: Math.abs(off) < 1 }],
    off: Math.abs(off) >= 1,
    cut: { left: qr.left - 14 * k, right: qr.right, top: first.top, bottom: qr.bottom },
    // the dialogue line and the pull quote under it: the dent repeats down the column
    subject: { left: edge - 40 * k, right: edge + 300 * k, top: first.top - 30 * k, bottom: qr.bottom + 30 * k },
  };
};
