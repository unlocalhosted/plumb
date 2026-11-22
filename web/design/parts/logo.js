// The design site's page for the logo: the mark's brand sheet. Everything drawn here comes from the mark's one source
// (overlay/src/mark.js): the hero, how it is built, the rules, the drawing each size gets, its colours, the room it
// needs, how it sits on real surfaces, and what not to do with it. The experiments behind it are in
// docs/design/comps/logo-r.html and logo-stress.html.
import { STEM, BOWL, LEG, LEVELS, BLUE, BLUE_NIGHT, markR } from '../../../overlay/src/mark.js';

export function mount(host, root, css) {
  let n = 0;
  // a mark on the page's own ground follows the page's scheme through --logo-leg; one on a fixed ground says which
  const mark = (opts = {}) => markR({ id: `lg${n++}`, leg: opts.dark === undefined && !opts.mono ? 'var(--logo-leg)' : null, ...opts });
  const cell = (svg, label) => `<span class="cell">${svg}<small>${label}</small></span>`;
  const lock = (px, opts) => `<span class="lock" style="font-size:${px}px">${mark({ h: Math.round(px * 1.3), ...opts })}<span>React Plumber</span></span>`;

  // how it is built: the mark on its 120 grid, with every measure that makes it
  const dim = (d, x, y, t, anchor = 'middle') => `<path d="${d}"/><text x="${x}" y="${y}" text-anchor="${anchor}">${t}</text>`;
  const built = `<svg class="built" viewBox="0 6 132 108" role="img" aria-label="The mark with its measures">
    <defs><linearGradient id="bs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff7ac0"/><stop offset=".55" stop-color="#f24a9f"/><stop offset="1" stop-color="#d0287f"/></linearGradient>
    <linearGradient id="bb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9a7dff"/><stop offset=".55" stop-color="#7356f0"/><stop offset="1" stop-color="#5232d4"/></linearGradient></defs>
    <path d="${STEM}" fill="url(#bs)" opacity=".9"/><path d="${BOWL}" fill="url(#bb)" opacity=".9"/>
    <path d="${LEG}" fill="var(--logo-leg)" fill-opacity=".12" stroke="var(--logo-leg)" stroke-width=".7" stroke-dasharray="1.4 1.4"/>
    <g class="dims">
      ${dim('M24 13.5H58M24 12V15M58 12V15', 41, 11, '34')}
      ${dim('M62 13.5H96M62 12V15M96 12V15', 79, 11, '34')}
      <text x="60" y="11" text-anchor="middle">4</text>
      ${dim('M18.5 18V102M17 18H20M17 102H20', 16, 61.2, '84', 'end')}
      ${dim('M101.5 18V74M100 18H103M100 74H103', 104, 47.2, '56 · two thirds', 'start')}
      ${dim('M101.5 78V102M100 78H103M100 102H103', 104, 91.2, '24 · the leg', 'start')}
      <text x="104" y="77.2" text-anchor="start">4</text>
      <path d="M72 102L89 85" stroke-dasharray="1 1"/><text x="76" y="108.5" text-anchor="middle">radius 24, the stem’s shoulder again</text>
    </g></svg>`;

  // what not to do: each drawn from the same parts, wrong in one way
  const P = (id) => `<defs><linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff7ac0"/><stop offset=".55" stop-color="#f24a9f"/><stop offset="1" stop-color="#d0287f"/></linearGradient>
    <linearGradient id="${id}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9a7dff"/><stop offset=".55" stop-color="#7356f0"/><stop offset="1" stop-color="#5232d4"/></linearGradient></defs>
    <path d="${STEM}" fill="url(#${id}s)"/><path d="${BOWL}" fill="url(#${id}b)"/>`;
  const wrong = (inner, style = '') => `<svg viewBox="22 16 76 88" height="96" width="83" style="${style}" aria-hidden="true">${inner}</svg>`;
  const NOT = [
    ['A solid leg', 'It becomes a third part, and the mark is a plain R. The P inside it is gone.', wrong(`${P('n1')}<path d="${LEG}" fill="${BLUE}"/>`)],
    ['No leg', 'A P at one size and an R at another are two logos. The leg stays, down to 16px.', wrong(P('n2'))],
    ['The leg in the mark’s colours', 'In violet it joins the bowl. Blue is the tool’s colour and keeps it apart.', wrong(`${P('n3')}<path d="${LEG}" fill="#7356f0" fill-opacity=".2" stroke="#7356f0" stroke-width="2"/>`)],
    ['Guardrails when small', 'The frame and points are for the hero. At small sizes they are too fine to see.', mark({ h: 96, level: 3 })],
    ['Stretched or tilted', 'Stretching or tilting changes the gap.', wrong(`${P('n5')}<path d="${LEG}" fill="${BLUE}" fill-opacity=".2" stroke="${BLUE}" stroke-width="2"/>`, 'transform:scaleX(1.35) rotate(-6deg)')],
  ];

  const tiles = [['#fff', false, false, 'inset 0 0 0 1px color-mix(in oklab, var(--pl-ink) 10%, transparent)'], ['#16151a', true, false, 'none'], ['linear-gradient(#ff7ac0,#d0287f)', false, true, 'none'], ['linear-gradient(#9a7dff,#5232d4)', false, true, 'none'], [BLUE, false, true, 'none']];

  root.innerHTML = `<style>${css}
    :host { display: block; font-family: var(--pl-sans); color: var(--pl-ink); --logo-leg: ${BLUE}; }
    :host([data-scheme="dark"]) { --logo-leg: ${BLUE_NIGHT}; }
    @media (prefers-color-scheme: dark) { :host(:not([data-scheme="light"])) { --logo-leg: ${BLUE_NIGHT}; } }
    svg { display: block; overflow: visible; }
    .stage { display: grid; place-items: center; min-height: 480px; border-radius: 26px; background: var(--pl-paper-2); }
    .stage { grid-template-columns: minmax(0, 1fr); }
    .stage > svg { max-width: 100%; height: auto; }
    .two { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; margin-top: 16px; }
    .three { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-top: 16px; }
    .note { padding: 18px 18px 16px; border-radius: 20px; background: var(--pl-paper-2); }
    .note small { font: 600 12px/1 var(--pl-mono); color: var(--pl-ink-2); }
    .note b { display: block; margin: 8px 0 4px; font: var(--pl-round-w, 600) 19px/23px var(--pl-round); }
    .note span { font: 500 14.5px/21px var(--pl-sans); color: var(--pl-ink-2); }
    .tile { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 22px 26px; padding: 26px; border-radius: 22px; background: var(--pl-paper-2); }
    .tile.mid { align-items: center; } .tile.c { justify-content: center; align-items: center; min-height: 300px; }
    .tile.day { background: #fff; color: #1d1b17; box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--pl-ink) 10%, transparent); }
    .tile.night { background: #16151a; color: #f3f1ec; }
    .tile.col { flex-direction: column; align-items: flex-start; gap: 18px; }
    .cell { display: grid; justify-items: center; gap: 9px; }
    .cell small { font: 600 11px/14px var(--pl-mono); color: var(--pl-ink-2); text-align: center; max-width: 150px; }
    .night .cell small { color: #9a968c; } .day .cell small { color: #6b665c; }
    .built { width: 100%; max-width: 560px; height: auto; }
    .built .dims path { fill: none; stroke: var(--pl-ink-2); stroke-width: .35; }
    .built .dims text { font: 600 3.4px/1 var(--pl-mono); fill: var(--pl-ink-2); }
    ol.law { margin: 16px 0 0; padding: 0; list-style: none; display: grid; gap: 10px; counter-reset: law; }
    ol.law li { counter-increment: law; display: grid; grid-template-columns: 34px 1fr; gap: 4px 12px; padding: 16px 18px; border-radius: 18px; background: var(--pl-paper-2); }
    ol.law li::before { content: counter(law); grid-row: span 2; font: var(--pl-round-w, 600) 26px/28px var(--pl-round); color: var(--pl-pink); }
    ol.law b { font: var(--pl-round-w, 600) 18px/24px var(--pl-round); }
    ol.law span { font: 500 15px/22px var(--pl-sans); color: var(--pl-ink-2); max-width: 640px; }
    .sw { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-top: 16px; }
    .sw div { border-radius: 20px; overflow: hidden; background: var(--pl-paper-2); }
    .sw i { display: block; height: 96px; }
    .sw p { margin: 0; padding: 12px 14px 14px; }
    .sw b { display: block; font: var(--pl-round-w, 600) 16px/20px var(--pl-round); color: var(--pl-ink); }
    .sw code { display: block; margin-top: 4px; font: 500 12px/17px var(--pl-mono); color: var(--pl-ink-2); }
    .room { position: relative; display: inline-grid; padding: 55px; }
    .room::before { content: ''; position: absolute; inset: 0; border: 1.5px dashed var(--logo-leg); border-radius: 6px; opacity: .7; }
    .room::after { content: 'one leg of room, all round'; position: absolute; left: 0; right: 0; bottom: 18px; text-align: center; font: 600 11px/1 var(--pl-mono); color: var(--pl-ink-2); }
    .icon { display: grid; place-items: center; width: 96px; height: 96px; border-radius: 22px; }
    .avatar { display: grid; place-items: center; width: 72px; height: 72px; border-radius: 50%; }
    .lock { display: flex; align-items: center; gap: .4em; font: var(--pl-round-w, 600) 28px/1 var(--pl-round); letter-spacing: -0.01em; }
    .tabs { display: flex; flex-wrap: wrap; gap: 12px; }
    .tabbar { display: flex; padding: 8px 8px 0; border-radius: 10px; }
    .tab { display: flex; align-items: center; gap: 8px; width: 190px; padding: 7px 14px 7px 10px; border-radius: 9px 9px 0 0; font: 500 12px/16px system-ui, sans-serif; }
    .not { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; margin-top: 16px; }
    .not div { position: relative; display: grid; justify-items: center; align-content: start; gap: 6px; padding: 28px 14px 16px; border-radius: 20px; background: var(--pl-paper-2); text-align: center; overflow: hidden; }
    .not div::after { content: '✕'; position: absolute; top: 10px; right: 12px; font: 700 13px/1 var(--pl-sans); color: var(--pl-coral, #e5484d); }
    .not b { margin-top: 12px; font: var(--pl-round-w, 600) 15px/19px var(--pl-round); }
    .not span { font: 500 13px/18px var(--pl-sans); color: var(--pl-ink-2); }
    .src { margin-top: 56px; font: 500 13px/20px var(--pl-mono); color: var(--pl-ink-2); }
    @media (max-width: 380px) { .room { padding: 48px 38px; max-width: 100%; box-sizing: border-box; } }
    @media (max-width: 820px) { .two, .three { grid-template-columns: 1fr; } .sw { grid-template-columns: repeat(2, minmax(0, 1fr)); } .not { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  </style>
  <div class="stage">${mark({ h: 380, level: 3 })}</div>

  <h2>One mark, two letters</h2>
  <p>React Plumber. The P is the thing itself, finished and solid. The R is drawn around it in plumber’s own line, the way plumber draws on your page. You read the P first, then the R.</p>
  <div class="three">
    <div class="note"><small>01</small><b>A solid P</b><span>A pink stem and a violet bowl, with exactly 4 between them. That space makes the letter.</span></div>
    <div class="note"><small>02</small><b>A drawn R</b><span>The one part a P lacks to be an R is its leg. It is only ever drawn: an outline in the tool’s blue, never a solid part.</span></div>
    <div class="note"><small>03</small><b>A DOM tree for a leg</b><span>Inside the leg, three nodes, each a child of the one above, joined by pipe elbows. What plumber works on, and how it got its name.</span></div>
  </div>

  <h2>How it is built</h2>
  <p>On a grid of 120. The stem and the bowl are the same width; the bowl is two thirds of the height; the leg takes what is left under it. The leg’s curve is the stem’s shoulder, turned over.</p>
  <div class="tile c" style="margin-top:16px">${built}</div>

  <h2>The four rules</h2>
  <p>What keeps it one mark on every surface.</p>
  <ol class="law">
    <li><b>The P is solid. The leg is only drawn.</b><span>An outline with a breath of tint, never a filled part. A solid leg makes it a plain R and the P is lost.</span></li>
    <li><b>The leg is the tool’s blue.</b><span>The colour of plumber’s guardrails, on every surface. It keeps the leg apart from the pink and violet P. In one colour, it takes that colour.</span></li>
    <li><b>Smaller sizes lose detail and keep the leg.</b><span>First the DOM tree goes, then the dashes. Without the leg a small mark is a different letter.</span></li>
    <li><b>Guardrails at large sizes only.</b><span>The frame, the corner crosses and the points belong to big, quiet places: a homepage, a film title, the top of a README.</span></li>
  </ol>

  <h2>A drawing for each size</h2>
  <p>The same mark, drawn four ways. Each size picks its own.</p>
  <div class="two">
    <div class="tile day">${LEVELS.filter((l) => l.level < 3).map((l) => cell(mark({ h: 150, level: l.level, dark: false }), `${l.name}${l.from ? `, ${l.from}px and up` : ', under 40px'}`)).join('')}</div>
    <div class="tile night">${LEVELS.filter((l) => l.level < 3).map((l) => cell(mark({ h: 150, level: l.level, dark: true }), `${l.name}${l.from ? `, ${l.from}px and up` : ', under 40px'}`)).join('')}</div>
  </div>
  <div class="two">
    <div class="tile day">${[128, 96, 64, 48, 40, 32, 24, 16].map((h) => cell(mark({ h, dark: false }), h)).join('')}</div>
    <div class="tile night">${[128, 96, 64, 48, 40, 32, 24, 16].map((h) => cell(mark({ h, dark: true }), h)).join('')}</div>
  </div>

  <h2>Colour</h2>
  <p>Two colours for the mark, each lit from the top, and one for the tool.</p>
  <div class="sw">
    <div><i style="background:linear-gradient(#ff7ac0,#f24a9f 55%,#d0287f)"></i><p><b>Stem pink</b><code>#ff7ac0 → #f24a9f → #d0287f</code></p></div>
    <div><i style="background:linear-gradient(#9a7dff,#7356f0 55%,#5232d4)"></i><p><b>Bowl violet</b><code>#9a7dff → #7356f0 → #5232d4</code></p></div>
    <div><i style="background:${BLUE}"></i><p><b>Tool blue</b><code>${BLUE} on light</code></p></div>
    <div><i style="background:#16151a;display:grid;place-items:center"><span style="width:56%;height:44%;border-radius:12px;background:${BLUE_NIGHT}"></span></i><p><b>Tool blue, night</b><code>${BLUE_NIGHT} on dark</code></p></div>
  </div>

  <h2>Room, and the smallest size</h2>
  <p>Leave the height of the leg clear on every side: the mark’s own measure. It is never drawn under 16px.</p>
  <div class="tile mid" style="margin-top:16px;gap:48px">
    <span class="room">${mark({ h: 200 })}</span>
    ${cell(mark({ h: 16 }), 'the smallest: 16px')}
  </div>

  <h2>On surfaces</h2>
  <p>An app icon, an avatar, a browser tab, beside the name, and in one colour.</p>
  <div class="tile mid" style="margin-top:16px;gap:16px">
    ${tiles.map(([bg, dark, mono, sh]) => `<span class="icon" style="background:${bg};box-shadow:${sh};color:#fff">${mark({ h: 58, dark, mono })}</span>`).join('')}
    ${[tiles[0], tiles[1], tiles[2]].map(([bg, dark, mono, sh]) => `<span class="avatar" style="background:${bg};box-shadow:${sh};color:#fff">${mark({ h: 40, dark, mono })}</span>`).join('')}
  </div>
  <div class="two">
    <div class="tile day col">${lock(40, { dark: false })}${lock(22, { dark: false })}${lock(14, { dark: false })}</div>
    <div class="tile night col">${lock(40, { dark: true })}${lock(22, { dark: true })}${lock(14, { dark: true })}</div>
  </div>
  <div class="two">
    <div class="tile mid"><span class="tabs">${[['#e9e6df', '#fff', '#1d1b17', false], ['#0f0e12', '#26242b', '#f3f1ec', true]].map(([bar, tab, ink, dark]) => `<span class="tabbar" style="background:${bar}"><span class="tab" style="background:${tab};color:${ink}">${mark({ h: 16, dark })}React Plumber</span></span>`).join('')}</span></div>
    <div class="tile mid" style="gap:14px"><span class="tile day" style="padding:18px">${[96, 40, 16].map((h) => cell(`<span style="color:#1d1b17">${mark({ h, mono: true })}</span>`, 'ink')).join('')}</span><span class="tile night" style="padding:18px">${[96, 40, 16].map((h) => cell(`<span style="color:#fff">${mark({ h, mono: true })}</span>`, 'white')).join('')}</span></div>
  </div>

  <h2>Not this</h2>
  <p>Each was tried on the way here, and each is why a rule exists.</p>
  <div class="not">${NOT.map(([name, why, svg]) => `<div>${svg}<b>${name}</b><span>${why}</span></div>`).join('')}</div>

  <p class="src">Source: overlay/src/mark.js (markR) · How it got here: docs/design/comps/logo-r.html, logo-stress.html</p>`;
}
