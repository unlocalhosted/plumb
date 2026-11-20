// The button census as a page to read and explore, in the manner of a newspaper data story: a headline, a lede, charts
// annotated in plain words, and every button in a searchable table at the end. Built from data/buttons.json.
//   node generator/data/census-page.mjs   → generator/shots/census.html (published as an artifact)
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const here = fileURLToPath(new URL('./', import.meta.url));
const D = JSON.parse(await readFile(`${here}buttons.json`, 'utf8'));

const TRICKS = ['glow', 'blur', 'icon-morph', 'liquid', 'shimmer', 'ripple', 'gradient-border', 'particles', 'noise', 'tilt', 'text-scramble'];
const short = (s, n) => { s = String(s ?? '').replace(/\s+/g, ' ').trim(); return s.length > n ? `${s.slice(0, n - 1)}…` : s; };
// compact rows: one array per button, so the page carries every one of them
const rows = D.map((r) => [
  short(r.name, 60), r.registry.replace(/^@/, ''), short(r.description, 150), r.found === 'named' ? 1 : 0, r.driver, r.commitRule,
  r.secondsToCommit, r.wordsDuringAction, r.tricks.map((t) => TRICKS.indexOf(t)).filter((i) => i >= 0), r.springs.slice(0, 4).map((s) => [s.zeta, parseInt(s.settle)]),
  r.reducedMotion ? 1 : 0, r.keyboard ? 1 : 0, r.hardcodedColours.length, r.animationLib, r.lines,
  Object.entries(r.evidence).slice(0, 3).map(([k, v]) => [k, short(v, 110)]), r.id.split('/').slice(1).join('/'),
]);
const n = D.length, pct = (k) => Math.round((k / n) * 100);
const c = (f) => D.filter(f).length;
const press = c((r) => r.commitRule === 'press');
const springs = D.flatMap((r) => r.springs.map((s) => s.zeta)).sort((a, b) => a - b);
const median = springs[Math.floor(springs.length / 2)];
const stats = { n, regs: new Set(D.map((r) => r.registry)).size, named: c((r) => r.found === 'named'), press, pressPct: pct(press),
  hold: c((r) => r.commitRule === 'held-time'), confirm: c((r) => r.commitRule === 'confirm'), slide: c((r) => r.commitRule === 'threshold'), countdown: c((r) => r.commitRule === 'countdown'),
  springs: springs.length, springParts: c((r) => r.springs.length), median: median.toFixed(2), bouncy: springs.filter((z) => z < 0.6).length, still: springs.filter((z) => z >= 0.97).length,
  reduced: c((r) => r.reducedMotion), keyboard: c((r) => r.keyboard), hard: c((r) => r.hardcodedColours.length), lines: D.reduce((a, r) => a + r.lines, 0) };

const html = `<title>The Button Census</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Libre+Franklin:wght@400;500;600;700;800&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&display=swap">
<style>
/* Layout: a newspaper story column (about 600px) with charts that step wider than the text, then a full-width table. */
:root {
  --paper: #ffffff; --ink: #121212; --gray: #5a5a5a; --rule: #dfdfdf; --faint: #f3f3f1;
  --press: #c9c9c9; --hold: #d4622a; --confirm: #2a6fb0; --slide: #6a4fb3; --countdown: #3c8a5a;
  --dot: #2a6fb0; --zone-bounce: #fbeee5; --zone-still: #e8f1ea; --hi: #fff3c4;
  --serif: "Source Serif 4", Georgia, "Times New Roman", serif;
  --sans: "Libre Franklin", "Franklin Gothic Medium", "Helvetica Neue", Arial, sans-serif;
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {
  --paper: #121212; --ink: #ececec; --gray: #a3a3a3; --rule: #333; --faint: #1c1c1c; --press: #4a4a4a;
  --hold: #ee8a5c; --confirm: #6aa6de; --slide: #a28ce6; --countdown: #6cc08d; --dot: #6aa6de; --zone-bounce: #2c211b; --zone-still: #1b261e; --hi: #3a3416; color-scheme: dark } }
:root[data-theme="dark"] { --paper: #121212; --ink: #ececec; --gray: #a3a3a3; --rule: #333; --faint: #1c1c1c; --press: #4a4a4a;
  --hold: #ee8a5c; --confirm: #6aa6de; --slide: #a28ce6; --countdown: #6cc08d; --dot: #6aa6de; --zone-bounce: #2c211b; --zone-still: #1b261e; --hi: #3a3416; color-scheme: dark }
body { background: var(--paper); color: var(--ink); font-family: var(--serif); padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); padding-block: 0 72px; }
.col { max-width: 600px; margin: 0 auto; }
.wide { max-width: 940px; margin: 0 auto; }
.kicker { font: 700 12px/1 var(--sans); letter-spacing: .08em; text-transform: uppercase; color: var(--gray); margin: 56px 0 14px; }
h1 { font: 700 clamp(34px, 6vw, 50px)/1.08 var(--serif); letter-spacing: -.01em; margin: 0; text-wrap: balance; }
.dek { font: 400 clamp(18px, 2.4vw, 21px)/1.45 var(--serif); color: var(--gray); margin: 16px 0 18px; text-wrap: pretty; }
.byline { font: 500 13px/1.4 var(--sans); color: var(--ink); border-top: 1px solid var(--rule); padding-top: 12px; margin-bottom: 34px; }
.byline span { color: var(--gray); font-weight: 400; }
p.body { font: 400 19px/1.62 var(--serif); margin: 0 0 22px; text-wrap: pretty; }
h2 { font: 700 26px/1.2 var(--serif); margin: 52px 0 14px; text-wrap: balance; }
.figure { margin: 28px auto 34px; }
.fig-h { font: 700 15px/1.3 var(--sans); margin: 0 0 4px; }
.fig-sub { font: 400 13.5px/1.4 var(--sans); color: var(--gray); margin: 0 0 14px; }
.source { font: 400 11.5px/1.4 var(--sans); color: var(--gray); margin-top: 10px; }
.legend { display: flex; flex-wrap: wrap; gap: 6px 16px; font: 500 13px/1 var(--sans); margin: 0 0 12px; }
.legend button { all: unset; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; padding: 4px 0; border-bottom: 2px solid transparent; }
.legend button[aria-pressed="true"] { border-bottom-color: var(--ink); }
.legend button:focus-visible { outline: 2px solid var(--confirm); outline-offset: 3px; }
.sw { width: 11px; height: 11px; border-radius: 2px; display: inline-block; }
svg { display: block; width: 100%; height: auto; overflow: visible; }
svg text { font-family: var(--sans); fill: var(--ink); }
.anno { font-size: 12.5px; fill: var(--ink); }
.anno-g { font-size: 11.5px; fill: var(--gray); }
.tip { position: fixed; pointer-events: none; background: var(--paper); color: var(--ink); border: 1px solid var(--rule); box-shadow: 0 4px 16px rgb(0 0 0 / .12); padding: 8px 10px; font: 400 12.5px/1.4 var(--sans); max-width: 260px; z-index: 5; }
.tip b { font-weight: 700; display: block; }
.cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 18px; }
.card { border-top: 4px solid var(--c); padding-top: 10px; }
.card .big { font: 700 34px/1 var(--sans); font-variant-numeric: tabular-nums; }
.card h3 { font: 700 15px/1.3 var(--sans); margin: 6px 0 4px; }
.card p { font: 400 14px/1.45 var(--serif); margin: 0 0 8px; color: var(--ink); }
.card .eg { font: 400 12.5px/1.45 var(--sans); color: var(--gray); }
.card button { all: unset; cursor: pointer; font: 600 12.5px/1 var(--sans); color: var(--confirm); margin-top: 8px; }
.card button:hover, .card button:focus-visible { text-decoration: underline; }
.bars { display: grid; gap: 7px; }
.bar { display: grid; grid-template-columns: 128px 1fr 54px; gap: 10px; align-items: center; font: 500 13.5px/1.2 var(--sans); }
.bar button { all: unset; cursor: pointer; text-align: right; }
.bar button:hover, .bar button:focus-visible { text-decoration: underline; }
.bar .track { height: 16px; background: var(--faint); position: relative; }
.bar .fill { position: absolute; inset: 0 auto 0 0; background: var(--ink); }
.bar .n { font-variant-numeric: tabular-nums; color: var(--gray); font-weight: 400; }
.pctrow { display: grid; grid-template-columns: 1fr 64px; gap: 10px; align-items: center; font: 400 15px/1.35 var(--serif); padding: 10px 0; border-bottom: 1px solid var(--rule); }
.pctrow b { font: 700 22px/1 var(--sans); text-align: right; font-variant-numeric: tabular-nums; }
.pctrow .meter { grid-column: 1 / -1; height: 6px; background: var(--faint); position: relative; }
.pctrow .meter i { position: absolute; inset: 0 auto 0 0; background: var(--ink); }
/* the explorer */
.tools { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin: 0 0 12px; font: 400 14px var(--sans); }
.tools input, .tools select { font: 400 14px var(--sans); color: var(--ink); background: var(--paper); border: 1px solid var(--rule); padding: 8px 10px; border-radius: 3px; }
.tools input { flex: 1 1 220px; min-width: 0; }
.tools .count { color: var(--gray); margin-left: auto; font-variant-numeric: tabular-nums; }
.tools button { font: 600 13px var(--sans); background: none; border: 0; color: var(--confirm); cursor: pointer; padding: 6px 0; }
.tablewrap { overflow-x: auto; border-top: 2px solid var(--ink); }
table { border-collapse: collapse; width: 100%; font: 400 13.5px/1.35 var(--sans); min-width: 700px; }
th { text-align: left; font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: .05em; color: var(--gray); padding: 10px 8px; border-bottom: 1px solid var(--rule); }
td { padding: 9px 8px; border-bottom: 1px solid var(--rule); vertical-align: top; }
td.name b { font-weight: 600; } td.name span { display: block; color: var(--gray); font-size: 12px; }
td.num { font-variant-numeric: tabular-nums; text-align: right; }
tr.row { cursor: pointer; } tr.row:hover td { background: var(--faint); } tr.row:focus-visible { outline: 2px solid var(--confirm); outline-offset: -2px; }
tr.more td { background: var(--faint); font-size: 13px; }
tr.more code { font: 12px ui-monospace, Menlo, monospace; display: block; white-space: pre-wrap; word-break: break-word; color: var(--ink); margin: 3px 0; }
.chip { display: inline-block; font-size: 11.5px; padding: 1px 7px; border-radius: 99px; background: var(--faint); margin: 0 4px 3px 0; }
.dotc { display: inline-block; width: 8px; height: 8px; border-radius: 2px; margin-right: 6px; vertical-align: 1px; }
.pager { display: flex; gap: 14px; justify-content: center; align-items: center; margin-top: 14px; font: 500 13.5px var(--sans); }
.pager button { font: 600 13.5px var(--sans); background: none; border: 1px solid var(--rule); color: var(--ink); padding: 7px 14px; border-radius: 3px; cursor: pointer; }
.pager button:disabled { opacity: .4; cursor: default; }
.method { border-top: 1px solid var(--rule); margin-top: 56px; padding-top: 8px; }
.method p { font: 400 15px/1.55 var(--serif); color: var(--ink); margin: 0 0 14px; }
.method h2 { font: 700 18px/1.3 var(--sans); }
@media (max-width: 520px) { .bar { grid-template-columns: 96px 1fr 44px; } p.body { font-size: 18px; } }
@media (prefers-reduced-motion: no-preference) { .fill, .meter i { transition: width .5s ease; } }
</style>

<main>
<header class="col">
  <p class="kicker">Interface design</p>
  <h1>Nearly Every Button on the Internet Does the Same Thing</h1>
  <p class="dek">We read ${stats.n.toLocaleString()} button components from ${stats.regs} public libraries. ${stats.pressPct} percent of them commit on a single press. The rest, a few dozen holds, slides and confirmations, show what else a button can be.</p>
  <p class="byline">By the organism generator <span>· Data from shadcn's public registry directory, read on Nov. 20, 2026</span></p>
</header>

<section class="col">
  <p class="body">A button has one job: to turn a decision into an action. How it does that job is a design choice, and it says something. A plain press is quick and forgiving. A button you have to hold, or drag across, slows you down on purpose, so nobody pays or deletes by accident.</p>
  <p class="body">To see which choices designers actually make, we collected every button-like part in shadcn's directory of component registries, the libraries that developers copy into their own products, and read each one's source code. After folding in duplicates and setting aside example files, ${stats.n.toLocaleString()} distinct buttons remained, about ${Math.round(stats.lines / 1000).toLocaleString()} thousand lines of code.</p>
</section>

<figure class="figure wide" id="waffle-fig">
  <p class="fig-h">How each button commits</p>
  <p class="fig-sub">Each square is one button. Select a kind to pick out its squares.</p>
  <div class="legend" id="legend"></div>
  <svg id="waffle" role="img" aria-label="Unit chart of ${stats.n} buttons by how they commit"></svg>
  <p class="source">Source: ${stats.regs} registries listed at ui.shadcn.com/r/registries.json; commit rule read from each part's source.</p>
</figure>

<section class="col">
  <h2>The rare, deliberate buttons</h2>
  <p class="body">Only ${(stats.hold + stats.confirm + stats.slide + stats.countdown).toLocaleString()} buttons ask for more than a press. They are rare because they cost the user time, and that cost is the point: each one is built for a moment when a mistake would hurt.</p>
</section>
<div class="wide cards" id="cards"></div>

<section class="col">
  <h2>Most buttons bounce, a little</h2>
  <p class="body">${stats.springParts.toLocaleString()} of the buttons state the physics of their motion as a spring. From each spring's stiffness, damping and mass we worked out two things a person feels: whether it overshoots (its damping ratio; below 1 it does), and how long it takes to settle. The typical spring has a damping ratio of ${stats.median}. That is just enough overshoot to feel alive, settling in about a quarter of a second.</p>
</section>
<figure class="figure wide">
  <p class="fig-h">Every spring in the census</p>
  <p class="fig-sub">Damping ratio against the time to settle. Point at a dot to see the button.</p>
  <svg id="springs" role="img" aria-label="Scatter of ${stats.springs} springs by damping ratio and settle time"></svg>
  <p class="source">Damping ratio ζ = c / 2√(km); settle time to within 2 percent. Springs given as a duration and bounce are converted the same way.</p>
</figure>

<section class="col">
  <h2>What they add on top</h2>
  <p class="body">Two in three buttons are plain. The rest add a visual idea to the press: a glow, a blur, an icon that reshapes as it works, a liquid fill, a shimmer that sweeps across the label. Select a trick to see every button that uses it.</p>
  <div class="figure"><p class="fig-h">Visual tricks, by number of buttons</p><p class="fig-sub">A button can use several.</p><div class="bars" id="tricks"></div></div>

  <h2>What they forget</h2>
  <p class="body">Motion that delights one person can make another dizzy, and a button that only answers a mouse shuts out anyone using a keyboard. The census shows how often these are handled, and how often a library paints its own colors in a way that a product's theme cannot reach.</p>
  <div class="figure" id="care"></div>
</section>

<section class="wide">
  <h2>Every button in the census</h2>
  <p class="fig-sub" style="margin-bottom:14px">Search by name, library or description, or filter by kind. Select a row to see what we read and where.</p>
  <div class="tools">
    <label for="q" hidden>Search</label><input id="q" type="search" placeholder="Search ${stats.n.toLocaleString()} buttons">
    <label for="fc" hidden>How it commits</label><select id="fc"><option value="">Any commit</option><option value="press">Press</option><option value="held-time">Hold</option><option value="confirm">Confirm</option><option value="threshold">Slide</option><option value="countdown">Countdown</option></select>
    <label for="ft" hidden>Trick</label><select id="ft"><option value="">Any trick</option></select>
    <label for="fn" hidden>Named</label><select id="fn"><option value="">Named or described</option><option value="1">Named a button</option><option value="0">Only described</option></select>
    <button id="clear" type="button">Clear</button>
    <span class="count" id="count"></span>
  </div>
  <div class="tablewrap"><table><thead><tr><th>Button</th><th>Commits</th><th>Driven by</th><th>Tricks</th><th style="text-align:right">Spring ζ</th><th style="text-align:right">Lines</th></tr></thead><tbody id="tbody"></tbody></table></div>
  <div class="pager"><button id="prev" type="button">Previous</button><span id="page"></span><button id="next" type="button">Next</button></div>
</section>

<section class="col method">
  <h2>How we did this</h2>
  <p>We started from shadcn's public directory of component registries (${'593'} listed). From every registry marked healthy or degraded, we read its index and kept parts whose name, title or description describe a button (including calls to action, hold-to-confirm, slide-to-confirm and confirmation buttons), leaving out range sliders and whole page sections. We downloaded each part's source as a developer installing it would.</p>
  <p>A program read each part's code, with comments removed, into fixed fields: what drives it (a press, a drag, a held time, a state or the pointer's distance), how it commits, the words' behavior while it acts, its visual tricks, its springs, whether it handles reduced motion and the keyboard, and the colors it writes out by hand. Each value keeps the line of code it was read from; select a row in the table to see them. Parts published by more than one registry were counted once (972 copies were folded in) and example files were set aside.</p>
  <p>The census has limits. Its accuracy has not yet been measured against a hand-checked sample, and pattern-reading misses things: one button described as asking for confirmation is recorded as a plain press. About half the parts only mention a button in their description. Timings come from code, not from watching the buttons move. The libraries are the shadcn ecosystem, which shares a look and is not every button on the web.</p>
</section>
</main>
<div class="tip" id="tip" hidden></div>

<script>
const ROWS = ${JSON.stringify(rows)};
const TRICKS = ${JSON.stringify(TRICKS)};
const KINDS = [['press', 'Press', '--press'], ['held-time', 'Hold', '--hold'], ['confirm', 'Confirm', '--confirm'], ['threshold', 'Slide', '--slide'], ['countdown', 'Countdown', '--countdown']];
const KIND = Object.fromEntries(KINDS.map(([k, l, v]) => [k, { l, v }]));
const TRICKNAME = { glow: 'Glow', blur: 'Blur', 'icon-morph': 'Icon reshapes', liquid: 'Liquid', shimmer: 'Shimmer', ripple: 'Ripple', 'gradient-border': 'Moving border', particles: 'Particles', noise: 'Grain', tilt: '3-D tilt', 'text-scramble': 'Text scramble' };
const DRIVER = { press: 'a press', state: 'a state', 'pointer-distance': 'the pointer', 'time-held': 'a held time', position: 'a drag' };
const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
const tip = document.getElementById('tip');
const showTip = (e, h) => { tip.innerHTML = h; tip.hidden = false; const x = Math.min(e.clientX + 14, innerWidth - 280), y = e.clientY + 14; tip.style.left = x + 'px'; tip.style.top = y + 'px'; };
const hideTip = () => { tip.hidden = true; };

// ── the unit chart: one square per button, deliberate kinds last so they gather at the end ──
const order = ROWS.map((r, i) => i).sort((a, b) => KINDS.findIndex(k => k[0] === ROWS[a][5]) - KINDS.findIndex(k => k[0] === ROWS[b][5]));
let picked = null;
function waffle() {
  const svg = document.getElementById('waffle'), cols = innerWidth < 560 ? 50 : 100, s = 10, rowsN = Math.ceil(order.length / cols);
  svg.setAttribute('viewBox', \`0 0 \${cols * s} \${rowsN * s + 4}\`);
  let out = '';
  order.forEach((i, k) => { const kind = KIND[ROWS[i][5]], x = (k % cols) * s, y = Math.floor(k / cols) * s, dim = picked && ROWS[i][5] !== picked;
    out += \`<rect data-i="\${i}" x="\${x}" y="\${y}" width="\${s - 2}" height="\${s - 2}" fill="var(\${kind.v})" opacity="\${dim ? 0.18 : 1}"/>\`; });
  svg.innerHTML = out;
}
const legend = document.getElementById('legend');
legend.innerHTML = KINDS.map(([k, l, v]) => \`<button type="button" data-k="\${k}" aria-pressed="false"><span class="sw" style="background:var(\${v})"></span>\${l} <span style="color:var(--gray);font-weight:400">\${ROWS.filter(r => r[5] === k).length.toLocaleString()}</span></button>\`).join('');
legend.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; picked = picked === b.dataset.k ? null : b.dataset.k; legend.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x.dataset.k === picked)); waffle(); });
document.getElementById('waffle').addEventListener('mousemove', (e) => { const i = e.target.dataset?.i; if (i == null) return hideTip(); const r = ROWS[i]; showTip(e, \`<b>\${esc(r[0])}</b>\${esc(r[1])} · \${KIND[r[5]].l.toLowerCase()}\`); });
document.getElementById('waffle').addEventListener('mouseleave', hideTip);
waffle(); addEventListener('resize', () => { waffle(); springsChart(); });

// ── the deliberate kinds, as cards with examples ──
const CARD = {
  'held-time': ['Hold to commit', 'A fill grows while you keep pressing; let go early and it drains. Built for deleting, revoking and paying.'],
  confirm: ['Press, then confirm', 'The first press opens a question in place, with a second button to commit. The stakes are said before you act.'],
  threshold: ['Slide to commit', 'You drag a thumb across a track. Short of the line, it springs back. Common on phones, rare elsewhere.'],
  countdown: ['A countdown', 'It commits after a few seconds unless you cancel, like an undo that comes first.'],
};
document.getElementById('cards').innerHTML = Object.entries(CARD).map(([k, [h, p]]) => { const list = ROWS.filter(r => r[5] === k); const eg = list.filter(r => r[3]).slice(0, 3).map(r => esc(r[0])).join(', ');
  return \`<div class="card" style="--c:var(\${KIND[k].v})"><div class="big">\${list.length}</div><h3>\${h}</h3><p>\${p}</p>\${eg ? \`<div class="eg">For example: \${eg}</div>\` : ''}<button type="button" data-k="\${k}">See all \${list.length} in the table</button></div>\`; }).join('');
document.getElementById('cards').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; filter({ c: b.dataset.k }); });

// ── the springs ──
const SP = ROWS.flatMap((r, i) => r[9].map(([z, t]) => [z, t, i]));
function springsChart() {
  const svg = document.getElementById('springs'), W = 900, H = 400, L = 54, R = 20, T = 20, B = 46;
  const x = (z) => L + Math.min(z, 2) / 2 * (W - L - R), y = (t) => H - B - Math.min(t, 1200) / 1200 * (H - T - B);
  svg.setAttribute('viewBox', \`0 0 \${W} \${H}\`);
  let g = \`<rect x="\${x(0)}" y="\${T}" width="\${x(0.6) - x(0)}" height="\${H - T - B}" fill="var(--zone-bounce)"/><rect x="\${x(0.97)}" y="\${T}" width="\${x(2) - x(0.97)}" height="\${H - T - B}" fill="var(--zone-still)"/>\`;
  for (const t of [0, 300, 600, 900, 1200]) g += \`<line x1="\${L}" x2="\${W - R}" y1="\${y(t)}" y2="\${y(t)}" stroke="var(--rule)"/><text x="\${L - 8}" y="\${y(t) + 4}" text-anchor="end" class="anno-g">\${t === 1200 ? '1.2 s+' : t + ' ms'}</text>\`;
  for (const z of [0, 0.5, 1, 1.5, 2]) g += \`<text x="\${x(z)}" y="\${H - B + 18}" text-anchor="middle" class="anno-g">\${z === 2 ? '2+' : z}</text>\`;
  g += \`<text x="\${(L + W - R) / 2}" y="\${H - 6}" text-anchor="middle" class="anno-g">Damping ratio: lower bounces more</text>\`;
  g += SP.map(([z, t, i]) => \`<circle data-i="\${i}" data-z="\${z}" data-t="\${t}" cx="\${x(z).toFixed(1)}" cy="\${y(t).toFixed(1)}" r="3.2" fill="var(--dot)" fill-opacity=".38"/>\`).join('');
  const m = ${median};
  g += \`<line x1="\${x(m)}" x2="\${x(m)}" y1="\${T}" y2="\${H - B}" stroke="var(--ink)" stroke-dasharray="3 3"/><text x="\${x(m) + 6}" y="\${T + 14}" class="anno">Typical spring: \${m.toFixed(2)}</text>\`;
  g += \`<text x="\${x(0.3)}" y="\${T + 34}" text-anchor="middle" class="anno">Visible bounce</text><text x="\${x(1.48)}" y="\${T + 34}" text-anchor="middle" class="anno">Arrives without bouncing</text>\`;
  svg.innerHTML = g;
}
springsChart();
document.getElementById('springs').addEventListener('mousemove', (e) => { const d = e.target.dataset; if (d?.i == null) return hideTip(); const r = ROWS[d.i];
  showTip(e, \`<b>\${esc(r[0])}</b>\${esc(r[1])}<br>damping ratio \${d.z} · settles in \${d.t} ms\`); });
document.getElementById('springs').addEventListener('mouseleave', hideTip);

// ── tricks and care ──
const tc = TRICKS.map((t, k) => [t, ROWS.filter(r => r[8].includes(k)).length]).sort((a, b) => b[1] - a[1]);
const tmax = tc[0][1];
document.getElementById('tricks').innerHTML = tc.map(([t, n]) => \`<div class="bar"><button type="button" data-t="\${t}">\${TRICKNAME[t]}</button><div class="track"><div class="fill" style="width:\${n / tmax * 100}%"></div></div><span class="n">\${n}</span></div>\`).join('');
document.getElementById('tricks').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) filter({ t: b.dataset.t }); });
const N = ROWS.length, share = (f) => ROWS.filter(f).length;
const CARE = [['Say what happens under reduced motion', share(r => r[10])], ['Answer the keyboard as well as the pointer', share(r => r[11])], ['Write at least one color by hand, out of a theme’s reach', share(r => r[12] > 0)]];
document.getElementById('care').innerHTML = '<p class="fig-h">Share of buttons that…</p>' + CARE.map(([l, n]) => \`<div class="pctrow"><span>\${l}</span><b>\${Math.round(n / N * 100)}%</b><div class="meter"><i style="width:\${n / N * 100}%"></i></div></div>\`).join('');

// ── the explorer ──
const ft = document.getElementById('ft'); ft.innerHTML += TRICKS.map(t => \`<option value="\${t}">\${TRICKNAME[t]}</option>\`).join('');
const q = document.getElementById('q'), fc = document.getElementById('fc'), fn = document.getElementById('fn');
let page = 0, open = -1; const PER = 40;
function list() { const s = q.value.trim().toLowerCase(), t = TRICKS.indexOf(ft.value);
  return ROWS.map((r, i) => i).filter(i => { const r = ROWS[i];
    return (!fc.value || r[5] === fc.value) && (t < 0 || r[8].includes(t)) && (fn.value === '' || String(r[3]) === fn.value) && (!s || (r[0] + ' ' + r[1] + ' ' + r[2]).toLowerCase().includes(s)); })
    .sort((a, b) => ROWS[b][3] - ROWS[a][3] || (ROWS[b][5] !== 'press') - (ROWS[a][5] !== 'press')); }
function render() { const L = list(), pages = Math.max(1, Math.ceil(L.length / PER)); page = Math.min(page, pages - 1);
  document.getElementById('count').textContent = \`\${L.length.toLocaleString()} buttons\`;
  document.getElementById('page').textContent = \`Page \${page + 1} of \${pages}\`;
  document.getElementById('prev').disabled = page === 0; document.getElementById('next').disabled = page >= pages - 1;
  document.getElementById('tbody').innerHTML = L.slice(page * PER, page * PER + PER).map(i => { const r = ROWS[i], k = KIND[r[5]];
    const row = \`<tr class="row" tabindex="0" data-i="\${i}"><td class="name"><b>\${esc(r[0])}</b><span>\${esc(r[1])}</span></td><td><span class="dotc" style="background:var(\${k.v})"></span>\${k.l}\${r[6] != null && ['held-time', 'threshold', 'confirm'].includes(r[5]) ? \` · \${r[6]} s\` : ''}</td><td>\${DRIVER[r[4]]}</td><td>\${r[8].map(t => \`<span class="chip">\${TRICKNAME[TRICKS[t]]}</span>\`).join('') || '<span style="color:var(--gray)">none</span>'}</td><td class="num">\${r[9][0] ? r[9][0][0] : '–'}</td><td class="num">\${r[14].toLocaleString()}</td></tr>\`;
    const more = open === i ? \`<tr class="more"><td colspan="6">\${r[2] ? \`<p style="margin:0 0 6px">\${esc(r[2])}</p>\` : ''}<div style="color:var(--gray);margin-bottom:4px">Words while it acts: \${r[7]} · animation: \${r[13]} · reduced motion: \${r[10] ? 'yes' : 'no'} · keyboard: \${r[11] ? 'yes' : 'no'} · hand-written colors: \${r[12]}</div>\${r[15].length ? 'Read from:' + r[15].map(([f, l]) => \`<code>\${esc(f)}: \${esc(l)}</code>\`).join('') : ''}<div style="color:var(--gray);margin-top:4px">\${esc(r[1])}/\${esc(r[16])}</div></td></tr>\` : '';
    return row + more; }).join(''); }
function filter({ c = '', t = '' }) { fc.value = c; ft.value = t; q.value = ''; fn.value = ''; page = 0; open = -1; render(); document.getElementById('q').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' }); }
[q, fc, ft, fn].forEach(el => el.addEventListener('input', () => { page = 0; open = -1; render(); }));
document.getElementById('clear').onclick = () => filter({});
document.getElementById('prev').onclick = () => { page--; open = -1; render(); };
document.getElementById('next').onclick = () => { page++; open = -1; render(); };
const toggle = (tr) => { const i = +tr.dataset.i; open = open === i ? -1 : i; render(); };
document.getElementById('tbody').addEventListener('click', (e) => { const tr = e.target.closest('tr.row'); if (tr) toggle(tr); });
document.getElementById('tbody').addEventListener('keydown', (e) => { const tr = e.target.closest('tr.row'); if (tr && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggle(tr); } });
render();
</script>`;
await writeFile(`${here}../shots/census.html`, html);
console.log(`shots/census.html · ${(html.length / 1e6).toFixed(2)} MB · ${n} buttons`);
