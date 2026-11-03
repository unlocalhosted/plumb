// The carousel's pieces: three whole app screens, our own, each written the way an agent in a hurry writes them,
// with text sizes and spaces picked one at a time. Each takes `clean` = { text, spacing }: which of Plumber's
// clean-up passes have been applied. The messy value and the cleaned value of every class sit side by side, so the
// passes are real class swaps, the same ones the overlay's clean-up writes.
//
//   data-t            a piece of text the text pass reads
//   data-s="gap|pad"  a space the spacing pass reads: the gap between children, or a padding
//
// The before → after counts are measured from the rendered screen, never written down here.
// Text styles after the pass: label 11, meta 12, card 13, body 16, heading 20 (the page's own ladder).
// Spaces after the pass: 2, 4, 6, 8, 12, 16, 24 (the page's own ladder, spacing-1 … spacing-8).

import { createContext, useContext } from 'react';

const pick = (on, messy, clean) => (on ? clean : messy);
const use = clean => [(m, c) => pick(clean.text, m, c), (m, c) => pick(clean.spacing, m, c), (m, c) => pick(clean.colour, m, c)];
// Colour drift is a near-copy of one of the page's colours (what an agent writes when it eyeballs a colour): the token
// mixed a few percent toward another, written out in full so Tailwind can find it, and so it drifts in light and dark.
// Which passes are applied, for the icons drawn deep inside each screen.
const Clean = createContext({});

// Pictures are drawn from the page's own colours, so the homepage stays on its theme.
const picture = (a, b, angle = 135) => ({ background: `linear-gradient(${angle}deg, var(--pl-${a}), var(--pl-${b}))` });

// A coastline: sky, sea and a cliff, as flat shapes.
function Coast() {
  return (
    <svg aria-hidden="true" viewBox="0 0 160 96" preserveAspectRatio="none" className="block size-full">
      <rect width="160" height="96" fill="var(--pl-sky-soft)" /><circle cx="122" cy="26" r="10" fill="var(--pl-butter-soft)" />
      <path d="M0 62h160v34H0z" fill="var(--pl-sky)" opacity=".55" />
      <path d="M0 40c18-4 30 2 44 10s24 10 34 22l6 24H0z" fill="var(--pl-mint)" opacity=".75" />
      <path d="M0 52c14-2 26 4 36 12s18 14 22 32H0z" fill="var(--pl-mint-ink)" opacity=".55" />
    </svg>
  );
}
// A screenshot: a little app, as bars.
function Shot({ hue }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 160 112" preserveAspectRatio="none" className="block size-full">
      <rect width="160" height="112" fill={`var(--pl-${hue}-soft)`} />
      <rect x="16" y="16" width="128" height="80" rx="6" fill="var(--pl-paper)" />
      <rect x="28" y="30" width="56" height="7" rx="3" fill="var(--pl-ink-3)" /><rect x="28" y="44" width="96" height="5" rx="2.5" fill="var(--pl-rule)" />
      <rect x="28" y="54" width="80" height="5" rx="2.5" fill="var(--pl-rule)" /><rect x="28" y="72" width="40" height="12" rx="4" fill={`var(--pl-${hue})`} />
    </svg>
  );
}
// A city at night, for the video's first frame.
function City() {
  return (
    <svg aria-hidden="true" viewBox="0 0 320 136" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 block size-full">
      <path d="M0 136V96h22V70h18v26h14V58h20v38h16V80h18V50h24v46h12V66h20v30h16V44h22v52h14V74h18v22h22V60h24v76z" fill="var(--pl-ink)" opacity=".7" />
    </svg>
  );
}

// Each icon was dropped in at whatever size looked right that minute; the icons pass puts them all on one size.
const DRIFT = { inbox: 'size-[14px]', me: 'size-[17px]', stack: 'size-[15px]', plus: 'size-[13px]', clip: 'size-[18px]', mic: 'size-[15px]', up: 'size-[17px]',
  play: 'size-[14px]', reply: 'size-[15px]', repost: 'size-[18px]', heart: 'size-[13px]', chevron: 'size-[12px]', copy: 'size-[17px]', tool: 'size-[14px]' };
function Icon({ d, className = '' }) {
  const clean = useContext(Clean);
  const name = Object.keys(I).find(k => I[k] === d);
  return <svg aria-hidden="true" data-i viewBox="0 0 16 16" className={`shrink-0 ${pick(clean.icons, DRIFT[name] ?? 'size-[15px]', 'size-6')} ${className}`} fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>;
}
const I = {
  inbox: 'M2.5 9.5h3l1 1.5h3l1-1.5h3M2.5 9.5 4 3.5h8l1.5 6v3h-11z',
  me: 'M8 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM3 13.5c.8-2.2 2.7-3.5 5-3.5s4.2 1.3 5 3.5',
  stack: 'M8 2.5 13.5 5 8 7.5 2.5 5zM2.5 8 8 10.5 13.5 8M2.5 11 8 13.5 13.5 11',
  plus: 'M8 3.5v9M3.5 8h9',
  clip: 'M10.5 5.5 6 10a1.4 1.4 0 0 0 2 2l5-5a2.8 2.8 0 0 0-4-4l-5 5a4.2 4.2 0 0 0 6 6l3.5-3.5',
  mic: 'M8 10.5a2.5 2.5 0 0 0 2.5-2.5V4.5a2.5 2.5 0 0 0-5 0V8A2.5 2.5 0 0 0 8 10.5zM4 8a4 4 0 0 0 8 0M8 12v2',
  up: 'M8 12.5v-9M4.5 7 8 3.5 11.5 7',
  play: 'M5.5 3.5v9l7-4.5z',
  reply: 'M3 7.5h7a3 3 0 0 1 3 3v2M6 4.5l-3 3 3 3',
  repost: 'M4 6.5 6 4.5h6.5v4M12 9.5l-2 2H3.5v-4',
  heart: 'M8 13s-5-3.2-5-6.5A2.5 2.5 0 0 1 8 5a2.5 2.5 0 0 1 5 1.5C13 9.8 8 13 8 13z',
  chevron: 'M5 6.5 8 9.5l3-3',
  copy: 'M5.5 5.5h7v7h-7zM3.5 10.5v-7h7',
  tool: 'M10 3.5a3 3 0 0 0-2.8 4.1L3.5 11.3l1.2 1.2 3.7-3.7A3 3 0 0 0 12.5 6l-1.8 1.8-1.5-1.5L11 4.5A3 3 0 0 0 10 3.5z',
};

function Avatar({ who, hue = 'lilac', size = 'size-8' }) {
  return <span className={`grid ${size} shrink-0 place-items-center rounded-full text-label font-strong`} style={{ background: `var(--pl-${hue}-soft)`, color: `var(--pl-${hue}-ink)` }}>{who}</span>;
}

/* ── 1 · an issue tracker ──────────────────────────────────── */
function Tracker(props) { return <Clean.Provider value={props.clean}><TrackerScreen {...props} /></Clean.Provider>; }
function TrackerScreen({ clean }) {
  const [t, s, k] = use(clean);
  const groups = [
    ['In progress', 'butter', [['WEB-412', 'Checkout total jumps when a coupon applies', 'Bug', 'coral', 'MK', 3], ['WEB-409', 'Dark mode for the billing page', 'Design', 'lilac', 'JD', 2]]],
    ['Todo', 'sky', [['WEB-417', 'Empty state for saved searches', 'Design', 'lilac', 'AR', 1], ['WEB-415', 'Rate-limit the export endpoint', 'API', 'sky', 'TS', 2], ['WEB-401', 'Keyboard shortcuts sheet', 'Feature', 'mint', 'MK', 1]]],
  ];
  return (
    <div className="flex h-full w-full overflow-hidden rounded-card bg-paper shadow-card">
      <aside data-c="bg" className={`flex w-sidebar shrink-0 flex-col border-0 border-r border-solid border-rule ${k('bg-[color-mix(in_oklab,var(--pl-paper-2)_94%,var(--pl-ink))]', 'bg-paper-2')} ${s('gap-[13px] p-[11px]', 'gap-6 p-5')}`} data-s="pad">
        <p data-t className={`m-0 font-strong ${t('text-[17px]', 'text-body')}`}>Acme</p>
        <nav className={`flex flex-col ${s('gap-[3px]', 'gap-1')}`} data-s="gap">
          {[['inbox', 'Inbox', '3', 'gap-[7px] px-[7px] py-[5px]', 'text-[13.5px]'], ['me', 'My issues', '', 'gap-[11px] px-[9px] py-[10px]', 'text-[15px]'], ['stack', 'Projects', '', 'gap-[5px] px-[4px] py-[3px]', 'text-[12.5px]']].map(([ic, name, n, mess, size], i) => (
            <span key={name} className={`flex items-center rounded-row ${i === 1 ? 'bg-paper text-ink' : 'text-ink-2'} ${s(mess, 'gap-4 px-4 py-3')}`} data-s="pad">
              <Icon d={I[ic]} /><span data-t className={`flex-1 ${t(size, 'text-card')}`}>{name}</span>
              {n && <span data-t className={`font-mono text-ink-2 ${t('text-[10.5px]', 'text-label')}`}>{n}</span>}
            </span>
          ))}
        </nav>
        <div className={`flex flex-col ${s('gap-[5px]', 'gap-3')}`} data-s="gap">
          <p data-t className={`m-0 text-ink-2 ${t('text-[11.5px]', 'text-label')}`}>Teams</p>
          {['Web', 'Mobile', 'Platform'].map(n => <span key={n} data-t className={`text-ink-2 ${t('text-[13px]', 'text-card')}`}>{n}</span>)}
        </div>
      </aside>
      <main className="flex min-w-0 flex-1 flex-col">
        <header className={`flex items-center justify-between border-0 border-b border-solid border-rule ${s('px-[17px] py-[13px]', 'px-6 py-5')}`} data-s="pad">
          <div className={`flex items-center ${s('gap-[9px]', 'gap-5')}`} data-s="gap">
            <h3 data-t data-c="text" className={`m-0 font-strong ${t('text-[18px]', 'text-body')} ${k('text-[color-mix(in_oklab,var(--pl-ink)_82%,var(--pl-paper))]', 'text-ink')}`}>Web · Active</h3>
            {['Status', 'Priority', 'Label'].map(f => <span key={f} data-t className={`rounded-pill bg-paper-2 text-ink-2 ${t('text-[11px]', 'text-label')} ${s('px-[9px] py-[3px]', 'px-4 py-1')}`}>{f}</span>)}
          </div>
          <span data-t data-c="bg" className={`inline-flex items-center rounded-row font-strong text-paper ${k('bg-[color-mix(in_oklab,var(--pl-ink)_84%,var(--pl-sky))]', 'bg-ink')} ${t('text-[12.5px]', 'text-label')} ${s('gap-[5px] px-[11px] py-[6px]', 'gap-2 px-5 py-3')}`}><Icon d={I.plus} />New issue</span>
        </header>
        <div className="flex flex-col">
          {groups.map(([name, hue, rows]) => (
            <section key={name} className="flex flex-col">
              <p data-c="bg" className={`m-0 flex items-center ${k('bg-[color-mix(in_oklab,var(--pl-paper-2)_90%,var(--pl-butter))]', 'bg-paper-2')} ${s('gap-[6px] px-[17px] py-[7px]', 'gap-3 px-6 py-3')}`} data-s="pad">
                <span className="size-3 rounded-full" style={{ background: `var(--pl-${hue})` }} />
                <b data-t className={t('text-[12.5px]', 'text-meta')}>{name}</b>
                <span data-t className={`text-ink-2 ${t('text-[12px]', 'text-meta')}`}>{rows.length}</span>
              </p>
              {rows.map(([id, title, label, lhue, who, pri], r) => (
                <div key={id} className={`flex items-center border-0 border-b border-solid border-rule ${s(['gap-[11px] px-[17px] py-[9px]', 'gap-[6px] px-[17px] py-[15px]', 'gap-[14px] px-[17px] py-[5px]'][r % 3], 'gap-5 px-6 py-4')}`} data-s="pad">
                  <span className="flex items-end gap-1" aria-hidden="true">{[1, 2, 3].map(b => <i key={b} className="block w-1 rounded-mark" style={{ height: 3 + b * 3, background: b <= pri ? 'var(--pl-ink)' : 'var(--pl-rule)' }} />)}</span>
                  <span data-t data-c="text" className={`font-mono ${k('text-[color-mix(in_oklab,var(--pl-ink-2)_80%,var(--pl-sky))]', 'text-ink-2')} ${t('text-[11.5px]', 'text-meta')}`}>{id}</span>
                  <span data-t className={`min-w-0 flex-1 truncate ${t(['text-[14px]', 'text-[15.5px]', 'text-[12.5px]'][r % 3], 'text-card')}`}>{title}</span>
                  <span data-t className={`rounded-pill ${t('text-[10.5px]', 'text-label')} ${s('px-[7px] py-[2px]', 'px-3 py-1')}`} style={{ background: `var(--pl-${lhue}-soft)`, color: `var(--pl-${lhue}-ink)` }}>{label}</span>
                  <Avatar who={who} size="size-7" />
                </div>
              ))}
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}

/* ── 2 · an assistant chat ─────────────────────────────────── */
function Assistant(props) { return <Clean.Provider value={props.clean}><AssistantScreen {...props} /></Clean.Provider>; }
function AssistantScreen({ clean }) {
  const [t, s, k] = use(clean);
  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-card bg-paper shadow-card">
      <header className={`flex items-center justify-between border-0 border-b border-solid border-rule ${s('px-[15px] py-[10px]', 'px-6 py-4')}`} data-s="pad">
        <span data-t className={`inline-flex items-center rounded-row font-strong ${t('text-[14.5px]', 'text-card')} ${s('gap-[3px] px-[7px] py-[4px]', 'gap-1 px-4 py-2')}`}>Sage 4 <Icon d={I.chevron} className="text-ink-2" /></span>
        <span data-t className={`text-ink-2 ${t('text-[12.5px]', 'text-meta')}`}>Trip notes · shared</span>
      </header>
      <div className={`flex flex-1 flex-col overflow-hidden ${s('gap-[19px] px-[22px] py-[17px]', 'gap-8 px-8 py-6')}`} data-s="pad">
        <div className={`flex flex-col items-end ${s('gap-[7px]', 'gap-4')}`} data-s="gap">
          <div className="h-media w-thumb overflow-hidden rounded-row" role="img" aria-label="A photo of a coastline"><Coast /></div>
          <p data-t data-c="bg" className={`m-0 max-w-thread rounded-card ${k('bg-[color-mix(in_oklab,var(--pl-sky-soft)_55%,var(--pl-paper-2))]', 'bg-paper-2')} ${t('text-[13px]', 'text-card')} ${s('px-[21px] py-[6px]', 'px-5 py-4')}`} data-s="pad">Where is this, and how long is the walk along the cliffs?</p>
        </div>
        <div className={`flex ${s('gap-[11px]', 'gap-5')}`} data-s="gap">
          <Avatar who="S" hue="sky" />
          <div className={`flex min-w-0 flex-1 flex-col ${s('gap-[9px]', 'gap-5')}`} data-s="gap">
            <span data-t data-c="text" className={`inline-flex w-fit items-center rounded-row bg-paper-2 ${k('text-[color-mix(in_oklab,var(--pl-ink-2)_78%,var(--pl-lilac))]', 'text-ink-2')} ${t('text-[11.5px]', 'text-meta')} ${s('gap-[5px] px-[8px] py-[4px]', 'gap-2 px-4 py-2')}`}><Icon d={I.tool} />Searched maps · read 2 pages</span>
            <p data-t className={`m-0 ${t('text-[16.5px]', 'text-card')}`}>That’s the coast path near Porthcurno. The cliff section to Land’s End is <b>5.6 km</b>, about two hours.</p>
            <pre data-t data-c="bg" className={`m-0 overflow-hidden rounded-row font-mono text-ink-2 ${k('bg-[color-mix(in_oklab,var(--pl-paper-2)_88%,var(--pl-mint))]', 'bg-paper-2')} ${t('text-[12.5px]', 'text-meta')} ${s('px-[12px] py-[9px]', 'px-5 py-4')}`} data-s="pad">{'distance: 5.6 km   climb: 210 m\nstart: Porthcurno   end: Land’s End'}</pre>
            <div className={`flex items-center rounded-row border border-solid border-rule ${s('gap-[9px] px-[10px] py-[7px]', 'gap-5 px-5 py-3')}`} data-s="pad">
              <span className="grid size-8 place-items-center rounded-full bg-ink text-paper"><Icon d={I.play} /></span>
              <span className="flex h-6 flex-1 items-center gap-1" aria-hidden="true">{[3, 6, 9, 5, 11, 7, 4, 8, 12, 6, 3, 7, 10, 5, 8, 4, 6, 9, 5, 3].map((h, i) => <i key={i} className="block w-1 rounded-mark bg-ink-3" style={{ height: h * 2 }} />)}</span>
              <span data-t className={`font-mono text-ink-2 ${t('text-[11px]', 'text-meta')}`}>0:42</span>
            </div>
            <span className={`flex text-ink-2 ${s('gap-[13px]', 'gap-6')}`} data-s="gap"><Icon d={I.copy} /><Icon d={I.heart} /><Icon d={I.repost} /></span>
          </div>
        </div>
      </div>
      <footer className={`border-0 border-t border-solid border-rule ${s('p-[11px]', 'p-5')}`} data-s="pad">
        <div className={`flex items-center rounded-card bg-paper-2 ${s('gap-[8px] py-[7px] pr-[7px] pl-[13px]', 'gap-4 py-3 pr-3 pl-5')}`} data-s="pad">
          <span data-t className={`flex-1 text-ink-2 ${t('text-[14px]', 'text-card')}`}>Ask a follow-up…</span>
          <span className="text-ink-2"><Icon d={I.clip} /></span><span className="text-ink-2"><Icon d={I.mic} /></span>
          <span data-c="bg" className={`grid size-8 place-items-center rounded-full text-paper ${k('bg-[color-mix(in_oklab,var(--pl-ink)_80%,var(--pl-pink))]', 'bg-ink')}`}><Icon d={I.up} /></span>
        </div>
      </footer>
    </div>
  );
}

/* ── 3 · a social feed ─────────────────────────────────────── */
function Feed(props) { return <Clean.Provider value={props.clean}><FeedScreen {...props} /></Clean.Provider>; }
function FeedScreen({ clean }) {
  const [t, s, k] = use(clean);
  const actions = (r, p, l) => (
    <div className={`flex text-ink-2 ${s('gap-[21px]', 'gap-8')}`} data-s="gap">
      {[['reply', r], ['repost', p], ['heart', l]].map(([ic, n]) => <span key={ic} className={`inline-flex items-center ${s('gap-[5px]', 'gap-2')}`}><Icon d={I[ic]} /><span data-t className={`font-mono ${t('text-[11.5px]', 'text-meta')}`}>{n}</span></span>)}
    </div>
  );
  const head = (who, name, handle, at, hue) => (
    <div className={`flex items-center ${s('gap-[7px]', 'gap-4')}`} data-s="gap">
      <Avatar who={who} hue={hue} size="size-avatar" />
      <p className="m-0"><b data-t className={t('text-[14.5px]', 'text-card')}>{name}</b> <span data-t data-c="text" className={`${k('text-[color-mix(in_oklab,var(--pl-ink-2)_76%,var(--pl-sky))]', 'text-ink-2')} ${t('text-[12.5px]', 'text-meta')}`}>{handle} · {at}</span></p>
    </div>
  );
  return (
    <div className="flex h-full w-full overflow-hidden rounded-card bg-paper shadow-card">
      <main className={`flex min-w-0 flex-1 flex-col border-0 border-r border-solid border-rule ${s('gap-0', 'gap-0')}`}>
        <article className={`flex flex-col border-0 border-b border-solid border-rule ${s('gap-[9px] p-[15px]', 'gap-5 p-6')}`} data-s="pad">
          {head('NO', 'Noor', '@noorbuilds', '2h', 'pink')}
          <p data-t data-c="text" className={`m-0 ${t('text-[15px]', 'text-card')} ${k('text-[color-mix(in_oklab,var(--pl-ink)_85%,var(--pl-lilac))]', 'text-ink')}`}>Shipped the new onboarding today. Two screens instead of six, and the drop-off halved.</p>
          <div className={`grid grid-cols-2 ${s('gap-[5px]', 'gap-3')}`} data-s="gap">
            <div className="h-media overflow-hidden rounded-row" role="img" aria-label="Screenshot of the first screen"><Shot hue="pink" /></div>
            <div className="h-media overflow-hidden rounded-row" role="img" aria-label="Screenshot of the second screen"><Shot hue="lilac" /></div>
          </div>
          {actions(24, 8, 312)}
        </article>
        <article className={`flex flex-col ${s('gap-[19px] p-[22px]', 'gap-5 p-6')}`} data-s="pad">
          {head('TW', 'Theo Wren', '@theo', '5h', 'mint')}
          <div className="relative grid h-video place-items-center overflow-hidden rounded-row" style={picture('sky-ink', 'lilac-ink', 180)} role="img" aria-label="Video: a timelapse of a city">
            <City />
            <span className="relative grid size-avatar place-items-center rounded-full bg-paper text-ink"><Icon d={I.play} /></span>
            <span data-t className={`absolute right-4 bottom-4 rounded-pill bg-ink font-mono text-paper ${t('text-[10.5px]', 'text-label')} ${s('px-[6px] py-[2px]', 'px-3 py-1')}`}>1:08</span>
          </div>
          {actions(6, 2, 97)}
        </article>
      </main>
      <aside className={`flex w-rail shrink-0 flex-col ${s('gap-[12px] p-[14px]', 'gap-6 p-6')}`} data-s="pad">
        <p data-t data-c="text" className={`m-0 font-strong ${t('text-[18px]', 'text-body')} ${k('text-[color-mix(in_oklab,var(--pl-ink)_80%,var(--pl-butter))]', 'text-ink')}`}>Trending</p>
        {[['Design systems', '2.1k posts'], ['Coastal walks', '840 posts'], ['Tailwind 4', '1.3k posts']].map(([what, n]) => (
          <div key={what} className={`flex flex-col ${s('gap-[1px]', 'gap-1')}`}>
            <span data-t className={t('text-[13.5px]', 'text-card')}>{what}</span>
            <span data-t className={`text-ink-2 ${t('text-[11px]', 'text-meta')}`}>{n}</span>
          </div>
        ))}
      </aside>
    </div>
  );
}

export const ITEMS = [
  { id: 'tracker', name: 'Issue tracker', Piece: Tracker },
  { id: 'assistant', name: 'Assistant chat', Piece: Assistant },
  { id: 'feed', name: 'Social feed', Piece: Feed },
];
