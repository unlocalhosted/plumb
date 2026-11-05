// #36 scrollbar-gutter: stable (hands-on: the viewer's click is the probe). Thread, a team chat: Longwave, a podcast
// studio, mid-edit. A live huddle in #ep-112-edit with its voice levels, the channel list with a sponsor's shared
// channel, mention counts in the brand and plain unread counts in grey, DMs with faces and presence, your own status at
// the foot. The channel list scrolls with the app's own thin scrollbar (styled with ::-webkit-scrollbar, so it takes its
// 8px on every platform, a Mac's included), and keeps no room for it: press Show all channels, the list grows past its
// height, the scrollbar appears, and every count jumps 8px left under the pointer, out of line with Mentions and the
// DMs' counts above and below. plumber's fix, [scrollbar-gutter:stable], keeps the room from the start: nothing moves.
//
// The marks (drawn live from what the click just did, in a shadow root with plumber's tokens, so plumber reading
// [data-example] never reads them): where the counts' right edge rested, the ground they slid across, the shift in px.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BellIcon, MessageIcon, PlusIcon } from '@unlocalhosted/dither-icons';
import spotifyLogo from '../../media/logos/spotify.svg';
import amara from '../../media/people/person-09.jpg';
import arlo from '../../media/people/person-06.jpg';
import kwame from '../../media/people/person-02.jpg';
import mei from '../../media/people/person-07.jpg';
import jonas from '../../media/people/person-04.jpg';
import ana from '../../media/people/person-10.jpg';
import priya from '../../media/people/person-05.jpg';

export const n = 36;
export const handsOn = true;

// plumber's marks, as hands-on.jsx draws them (copied: that file is shared): a shadow root with plumber's tokens
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
const Line = ({ x, y, h, off, dashed }) => (
  <span style={{ position: 'absolute', left: x, top: y, width: 0, height: h, borderLeft: `1px ${dashed ? 'dashed' : 'solid'} ${hue(off)}`, opacity: dashed ? 0.8 : 0.55 }} />
);
const Hatch = ({ x, y, w, h }) => (
  <span style={{ position: 'absolute', left: x, top: y, width: w, height: h, opacity: 0.55, backgroundImage: 'repeating-linear-gradient(45deg, var(--pl-off) 0 1px, transparent 1px 4px)' }} />
);
const Tag = ({ x, y, off, children }) => (
  <span style={{ position: 'absolute', left: x, top: y, transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', height: 20, padding: '0 var(--pl-space-3)',
    borderRadius: 'var(--pl-radius-tag)', font: '500 11px/1 var(--pl-mono)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
    color: 'var(--pl-on-accent)', background: hue(off), boxShadow: '0 0 0 1px var(--pl-halo)', animation: 'none' }}>{children}</span>
);
// a box in the example's own pixels, whatever the stage's camera does to it (a scale on an ancestor)
function local(root) {
  const o = root.getBoundingClientRect(), k = o.width / root.offsetWidth || 1;
  return (el) => { const r = el.getBoundingClientRect(); return { x: (r.left - o.left) / k, y: (r.top - o.top) / k, w: r.width / k, h: r.height / k }; };
}

// name, unread, mentions of you, how it's marked (#, the live huddle, a channel shared with a sponsor)
const CHANNELS = [
  ['general', 3], ['ep-112-edit', 12, true, 'live'], ['guests', 5], ['spotify-sponsorship', 2, true, 'shared'], ['show-notes', 0], ['clips', 8],
  ['design', 0], ['booking', 1], ['music-licensing', 0], ['hiring', 4], ['random', 0], ['ops', 0],
];
const SHOWN = 8; // the list's height fits these; the rest wait behind Show all channels
const DMS = [[mei, 'Mei Lin', 1, 'here'], [jonas, 'Jonas Weber', 0, 'here'], [ana, 'Ana Duarte', 0, 'away', 'back Monday']];
const LEVELS = [6, 12, 16, 9, 13, 5];

const Count = ({ n: count, at, ...rest }) => (
  <span {...rest} className={'ml-auto grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums ' + (at ? 'bg-accent text-accent-ink' : 'bg-[rgb(18_35_61/0.07)] text-ink-muted')}>{count}</span>
);
const Caret = () => <svg viewBox="0 0 10 10" className="size-2.5" fill="currentColor" aria-hidden="true"><path d="M2 3.5h6L5 7z" /></svg>;

export default function ThreadChannels({ side = 'broken', onStatus }) {
  const root = useRef(null), list = useRef(null);
  const [all, setAll] = useState(false);
  const [rest, setRest] = useState(null), [now, setNow] = useState(null);
  const edges = () => { const at = local(root.current); return [...list.current.querySelectorAll('[data-count]')].slice(0, 5).map((c) => at(c)); };
  useLayoutEffect(() => { setAll(false); setNow(null); requestAnimationFrame(() => setRest(edges())); }, [side]);
  useLayoutEffect(() => { if (all) requestAnimationFrame(() => setNow(edges())); else setNow(null); }, [all]);
  const shift = rest && now ? Math.max(0, ...now.map((b, i) => rest[i].x + rest[i].w - (b.x + b.w))) : null;
  useEffect(() => {
    onStatus?.(shift === null ? 'Press Show all channels, and watch the unread counts on the right.'
      : shift >= 0.5 ? `The list grew past its height, its scrollbar appeared, and every count slid ${shift.toFixed(0)}px left to make room.`
      : 'The scrollbar appeared into room that was kept for it. Nothing moved.');
  }, [shift, onStatus]);
  const off = shift !== null && shift >= 0.5;

  return (
    <div ref={root} className="relative w-[min(27rem,calc(100vw-2rem))]">
      <aside aria-label="Longwave" className="flex w-72 flex-col rounded-card bg-surface shadow-card">
        <header className="flex items-center gap-2.5 pt-3.5 pr-3 pb-3 pl-3.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-[8px] bg-[#1f2b44] text-[#ffd36b]">
            <svg viewBox="0 0 18 18" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M1.5 9c1.5-4 3-4 4.5 0s3 4 4.5 0 3-4 4.5 0 1.5 2 1.5 2" /></svg>
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="text-[15px] leading-5 font-semibold tracking-[-0.01em]">Longwave</span>
            <span className="text-xs text-ink-muted">Podcast studio · <span className="tabular-nums">14</span> people</span>
          </span>
          <button type="button" aria-label="New message" className="ml-auto grid size-[30px] place-items-center rounded-control text-ink-muted ring-1 ring-line ring-inset hover:bg-sunken hover:text-ink"><PlusIcon size={15} texture="solid" /></button>
        </header>

        {/* the huddle: who's talking, drawn as their levels */}
        <div className="mx-2 mb-1.5 flex items-center gap-2.5 rounded-[8px] bg-[#e9f6f0] px-2.5 py-2">
          <span aria-hidden="true" className="flex h-4 items-center gap-0.5">{LEVELS.map((h, i) => <i key={i} className="w-[2.5px] rounded-full bg-[#1f9d6b]" style={{ height: h }} />)}</span>
          <span className="flex min-w-0 flex-col">
            <span className="text-[12.5px] leading-4 font-medium text-[#17573f]">Huddle in #ep-112-edit</span>
            <span className="text-[11.5px] leading-[14px] text-[#2f6b53] tabular-nums">Amara talking · 12:04</span>
          </span>
          <span className="ml-auto flex">{[amara, arlo, kwame].map((src, i) => <img key={i} src={src} alt="" className={'block size-5 rounded-full object-cover ring-2 ring-[#e9f6f0] outline-1 -outline-offset-1 outline-black/10 ' + (i ? '-ml-[5px]' : '')} />)}</span>
        </div>

        <nav aria-label="Inbox" className="px-2 py-0.5">
          <a href="#threads" onClick={(e) => e.preventDefault()} className="flex h-8 items-center gap-2 rounded-control px-2.5 text-[13.5px] text-ink-muted hover:bg-sunken"><MessageIcon size={16} texture="dither" />Threads</a>
          <a href="#mentions" onClick={(e) => e.preventDefault()} className="flex h-8 items-center gap-2 rounded-control pr-2 pl-2.5 text-[13.5px] text-ink-muted hover:bg-sunken"><BellIcon size={16} texture="dither" />Mentions<Count n={2} at /></a>
        </nav>

        <h3 className="mt-2 flex h-7 items-center gap-1 px-[18px] text-xs font-medium text-ink-subtle"><Caret />Channels</h3>
        <ul ref={list} data-scroll className={'flex max-h-[272px] flex-col overflow-y-auto px-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-solid [&::-webkit-scrollbar-thumb]:border-surface [&::-webkit-scrollbar-thumb]:bg-[rgb(18_35_61/0.18)] ' + (side === 'fixed' ? '[scrollbar-gutter:stable]' : '')}>
          {CHANNELS.slice(0, all ? CHANNELS.length : SHOWN).map(([name, unread, at, kind]) => (
            <li key={name} className={'flex h-8 shrink-0 items-center gap-2 rounded-control pr-2 pl-2.5 text-[13.5px] hover:bg-sunken ' + (kind === 'live' ? 'bg-accent-soft font-semibold text-accent-deep hover:bg-accent-soft' : unread ? 'font-semibold text-ink' : 'text-ink-muted')}>
              {kind === 'live' ? <svg viewBox="0 0 12 12" className="mx-px size-3 text-[#1f9d6b]" fill="currentColor" aria-label="Huddle live"><rect x="1" y="4" width="2" height="4" rx="1" /><rect x="5" y="1.5" width="2" height="9" rx="1" /><rect x="9" y="3" width="2" height="6" rx="1" /></svg>
                : kind === 'shared' ? <span title="Shared with Spotify" className="grid size-3.5 place-items-center rounded-chip bg-[#1db954]"><span className="size-[9px] bg-white" style={{ mask: `url("${spotifyLogo}") center / contain no-repeat` }} /></span>
                : <span aria-hidden="true" className="w-3.5 text-center font-normal text-ink-subtle">#</span>}
              <span className="truncate">{name}</span>
              {unread ? <Count data-count n={unread} at={at} /> : null}
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => setAll((a) => !a)} className="mx-2 mt-1.5 flex h-8 items-center gap-2 rounded-control px-2.5 text-[13.5px] font-medium text-accent-deep hover:bg-sunken">
          <svg viewBox="0 0 14 14" className={'size-3.5 ' + (all ? '' : 'rotate-180')} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3.5 8.5 7 5l3.5 3.5" /></svg>
          {all ? 'Show fewer' : 'Show all channels'}
        </button>

        <h3 className="mt-2 flex h-7 items-center gap-1 px-[18px] text-xs font-medium text-ink-subtle"><Caret />Direct messages</h3>
        <ul className="px-2 py-0.5">
          {DMS.map(([src, who, unread, presence, note]) => (
            <li key={who} className={'flex h-8 items-center gap-2 rounded-control pr-2 pl-2 text-[13.5px] hover:bg-sunken ' + (unread ? 'font-semibold text-ink' : 'text-ink-muted')}>
              <span className="relative size-5 shrink-0">
                <img src={src} alt="" className="block size-5 rounded-[6px] object-cover outline-1 -outline-offset-1 outline-black/10" />
                <i aria-label={presence === 'here' ? 'Active' : 'Away'} className={'absolute -right-[3px] -bottom-[3px] size-[9px] rounded-full ring-2 ring-surface ' + (presence === 'here' ? 'bg-[#1f9d6b]' : 'bg-surface shadow-[inset_0_0_0_1.5px_#a3acb9]')} />
              </span>
              {who}{note ? <span className="text-xs font-normal text-ink-subtle">· {note}</span> : null}
              {unread ? <Count n={unread} at /> : null}
            </li>
          ))}
        </ul>

        <footer className="mt-2 flex items-center gap-2.5 rounded-b-card border-t-hairline border-line bg-sunken px-3.5 pt-2.5 pb-3">
          <span className="relative">
            <img src={priya} alt="" className="block size-[30px] rounded-[8px] object-cover outline-1 -outline-offset-1 outline-black/10" />
            <i aria-label="Do not disturb" className="absolute -right-[3px] -bottom-[3px] size-2.5 rounded-full bg-[#d33b4e] ring-2 ring-sunken" />
          </span>
          <span className="flex flex-col">
            <span className="text-[13px] leading-4 font-medium">Priya Nair</span>
            <span className="text-xs leading-4 text-ink-muted">Recording until 3pm</span>
          </span>
        </footer>
      </aside>
      <MarksLayer>
        {rest && now ? rest.map((b, i) => (
          <span key={i}>
            <Line x={b.x + b.w} y={b.y - 2} h={b.h + 4} off={off} dashed={off} />
            {off ? <Hatch x={now[i].x + now[i].w} y={b.y + 3} w={b.x + b.w - (now[i].x + now[i].w)} h={b.h - 6} /> : null}
          </span>
        )) : null}
        {rest && now ? <Tag x={rest[0].x + rest[0].w + 22} y={rest[0].y + rest[0].h / 2} off={off}>{off ? `−${shift.toFixed(0)}px · all slid` : '0px ✓'}</Tag> : null}
      </MarksLayer>
    </div>
  );
}
ThreadChannels.names = ['Room when needed', 'Room kept'];
ThreadChannels.lesson = {
  why: 'A scrollbar that takes space (any styled one does, even on a Mac) only claims it when the content first overflows. Show more channels, and every count in the list jumps sideways by its width, under the pointer.',
  habit: 'Give scroll areas whose content grows scrollbar-gutter: stable, so the room is there before the scrollbar is.',
};
