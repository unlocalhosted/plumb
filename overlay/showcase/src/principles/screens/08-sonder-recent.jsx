// #8 nested corners are concentric: inner radius = outer radius − the padding between them. Sonder's Recently played,
// Friday evening with Low Tide playing: the week's listening, four tiles (the album playing, one half heard, one played
// often, a mix made for you), the player. Every tile is one component: a 14px card with 8px of padding, whose cover
// keeps the card's own 14px corner, so the two curves run side by side at different rates and the gap between them
// pinches at every corner of every tile. plumber's fix: 14 − 8 = 6px, on every cover at once.
import { PauseIcon } from '@unlocalhosted/dither-icons';
import lowTide from '../../media/low-tide.jpg';
import paperCities from '../../media/paper-cities.jpg';
import afterglow from '../../media/afterglow.jpg';

export const n = 8;

// minutes listened each day this week, as a share of today's
const WEEK = [['M', 40], ['T', 62], ['W', 35], ['T', 80], ['F', 100, true], ['S', 8], ['S', 8]];
const TILES = [
  { title: 'Low Tide', artist: 'Marina Avila', cover: lowTide, playing: true, meta: 'Playing · side A' },
  { title: 'Paper Cities', artist: 'The Lanterns', cover: paperCities, heard: 6 / 11, meta: '6 of 11' },
  { title: 'Afterglow', artist: 'Kaito Ren', cover: afterglow, meta: 'Played 12 times' },
  { title: 'Late Night Mix', artist: 'Made for you', mix: [afterglow, lowTide, paperCities], more: 24, meta: 'Updated Friday' },
];
// the playing track's waveform: the played part in ink
const WAVE = [37, 35, 59, 39, 63, 58, 45, 70, 46, 68, 48, 49, 66, 85, 46, 48, 63, 71, 51, 40, 51, 21, 33, 25, 26, 29, 39, 64, 42, 64, 70, 60, 71, 47, 48, 56, 81, 67, 59, 71, 61, 50, 68, 58, 37, 42, 35, 37, 32, 27, 52, 31, 46, 64, 43, 61];
const PLAYED = 24;
const img = 'block size-full object-cover';

function Tile({ t }) {
  return (
    <li>
      <button type="button" data-tile className="flex w-full flex-col gap-2 rounded-sheet bg-sunken p-2 text-left transition-colors hover:bg-line/40">
        <span data-cover className="relative block aspect-square overflow-hidden rounded-sheet">
          {t.mix ? (
            <span className="grid size-full grid-cols-2">
              {t.mix.map((c) => <img key={c} src={c} alt="" className={img + ' outline-1 -outline-offset-1 outline-ink/10'} />)}
              <span className="grid place-items-center bg-accent text-[13px] font-semibold text-accent-ink tabular-nums">+{t.more}</span>
            </span>
          ) : <img src={t.cover} alt="" className={img + ' outline-1 -outline-offset-1 outline-ink/10'} />}
          {t.playing ? (
            <span aria-label="Playing" className="absolute bottom-2 left-2 flex h-[22px] items-end gap-0.5 rounded-full bg-ink/72 px-1.5 py-[5px]">
              {[6, 12, 8, 10].map((h, i) => <i key={i} className="w-[3px] rounded-[1px] bg-white" style={{ height: h }} />)}
            </span>
          ) : null}
        </span>
        <span className="flex min-w-0 flex-col px-0.5 pb-0.5">
          <span className="truncate text-[13px] font-medium">{t.title}</span>
          <span className="truncate text-xs text-ink-muted">{t.artist}</span>
          <span className={'mt-1.5 flex items-center gap-1.5 text-[11.5px] leading-[14px] ' + (t.playing ? 'font-medium text-accent-deep' : 'text-ink-subtle')}>
            {t.heard ? <span className="h-[3px] flex-1 overflow-hidden rounded-full bg-ink/10"><b className="block h-full rounded-full bg-ink-muted" style={{ width: `${t.heard * 100}%` }} /></span> : null}
            <span className="truncate tabular-nums">{t.meta}</span>
          </span>
        </span>
      </button>
    </li>
  );
}

export default function RecentlyPlayed() {
  return (
    <article className="@container w-full max-w-[36rem] overflow-hidden rounded-card bg-surface shadow-card">
      <header className="flex items-center gap-4 px-5 pt-[18px] pb-3.5">
        <span className="flex min-w-0 flex-col">
          <span className="text-[17px] leading-6 font-medium tracking-[-0.01em]">Recently played</span>
          <span className="truncate text-[13px] text-ink-muted">14 h 32 m this week, mostly after dark</span>
        </span>
        <span role="img" aria-label="Listening by day: the most today, Friday" className="ml-auto flex shrink-0 flex-col items-center gap-1">
          <span className="flex h-6 items-end gap-[3px]">{WEEK.map(([d, h, now], i) => <i key={i} className={'w-2.5 rounded-[2px] ' + (now ? 'bg-accent' : 'bg-ink/14')} style={{ height: `${h}%` }} />)}</span>
          <span className="flex gap-[3px] text-[10px] leading-3 text-ink-subtle">{WEEK.map(([d], i) => <span key={i} className="w-2.5 text-center">{d}</span>)}</span>
        </span>
        <a href="#history" className="-my-1 inline-flex min-h-6 shrink-0 items-center text-[13px] font-medium text-accent hover:text-accent-deep">See all</a>
      </header>

      <ul data-albums className="grid grid-cols-2 gap-3 px-5 @md:grid-cols-4">
        {TILES.map((t) => <Tile key={t.title} t={t} />)}
      </ul>

      <footer className="mt-4 flex items-center gap-3 border-t-hairline border-line px-5 pt-3 pb-3.5">
        <img src={lowTide} alt="" className="size-11 shrink-0 rounded-control object-cover outline-1 -outline-offset-1 outline-ink/10" />
        <span className="flex w-[132px] min-w-0 shrink-0 flex-col">
          <span className="truncate text-[13px] font-medium">Undertow</span>
          <span className="truncate text-xs text-ink-muted">Marina Avila · Low Tide</span>
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span aria-hidden="true" className="flex h-[26px] items-center gap-0.5">
            {WAVE.map((h, i) => <i key={i} className={'flex-1 rounded-[1px] ' + (i < PLAYED ? 'bg-ink' : 'bg-ink/16')} style={{ height: `${h}%` }} />)}
          </span>
          <span className="flex justify-between text-[11px] leading-[14px] text-ink-subtle tabular-nums"><span>1:42</span><span>4:05</span></span>
        </span>
        <button type="button" aria-label="Pause" className="grid size-10 shrink-0 place-items-center rounded-full bg-ink text-surface transition-[background-color,scale] duration-150 hover:bg-ink/85 active:scale-95"><PauseIcon size={16} texture="solid" /></button>
      </footer>
    </article>
  );
}
RecentlyPlayed.stage = true;
RecentlyPlayed.names = ['Same radius', 'Concentric'];
RecentlyPlayed.lesson = {
  why: 'Each cover keeps its tile’s 14px corner but sits 8px inside it, so the two curves run side by side at different rates: the gap between them is 8px along the sides and pinches at every corner of every tile.',
  habit: 'Inner radius = outer radius − everything between them, padding and border. Here 14 − 8 = 6, at every level of nesting.',
};
// What the eye sees at each tile's top-left corner: the tile's edges and the cover's, and the padding between them (the
// hatch). The pill, on the first tile, is how far the cover's corner is from concentric (its radius against 14 − 8).
RecentlyPlayed.measure = (root) => {
  const tiles = [...(root?.querySelectorAll('[data-tile]') ?? [])];
  if (!tiles.length) return null;
  const lines = [], rules = [], bands = [], pills = [];
  let off0 = 0, k = 1;
  tiles.forEach((tile, i) => {
    const cover = tile.querySelector('[data-cover]'), t = tile.getBoundingClientRect(), c = cover.getBoundingClientRect();
    k = t.width / tile.offsetWidth || 1;
    const R = parseFloat(getComputedStyle(tile).borderTopLeftRadius), r = parseFloat(getComputedStyle(cover).borderTopLeftRadius), p = (c.left - t.left) / k;
    const off = Math.abs(r - Math.max(0, R - p)), span = 34 * k;
    lines.push({ key: `tile${i}`, x: t.left, top: t.top, bottom: t.top + span }, { key: `cover${i}`, x: c.left, top: c.top, bottom: c.top + span });
    rules.push({ key: `tile-top${i}`, y: t.top, left: t.left, right: t.left + span }, { key: `cover-top${i}`, y: c.top, left: c.left, right: c.left + span });
    bands.push({ key: `pad${i}`, left: t.left, right: c.left, top: t.top, bottom: t.top + span, pattern: 'hatch' }, { key: `pad-top${i}`, left: c.left, right: t.left + span, top: t.top, bottom: c.top, pattern: 'hatch' });
    if (i === 0) { off0 = off; pills.push({ key: 'off', x: t.left + span + 18 * k, y: t.top - 10 * k, text: (off * k).toFixed(1), ok: off <= 1.5 }); }
  });
  const t = tiles[0].getBoundingClientRect(), R = parseFloat(getComputedStyle(tiles[0]).borderTopLeftRadius);
  return {
    lines, rules, bands, pills, off: off0 > 1.5,
    cut: { left: t.left, right: t.right, top: t.top, bottom: t.bottom, r: R * k },
    subject: { left: t.left - 30 * k, right: t.left + 90 * k, top: t.top - 30 * k, bottom: t.top + 80 * k },
  };
};
