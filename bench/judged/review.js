// Two read-only views of the judged sets (bench/judged/README.md), drawn by the judging page:
//   the list    every set the server holds, who has judged it, and where to open it
//   the review  one judge's marks over the live site, with every point listed beside it. A point with a box is drawn
//               on the page; a dashed box was placed from an older copy of the page and may have moved; a point with
//               no box (it was made on the reviewer's own picture, or is about movement) is only in the list.
// Holding Space lets the pointer through to the site, so a point about hover or motion can be tried where it happens.

const LEVELS = { shape: ['Shape', 'lilac'], craft: ['Craft detail', 'pink'], behaviour: ['Behaviour', 'sky'], content: ['Content and story', 'butter'] };
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const host = (url) => url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');

const CSS = `
  .lvl[data-l="shape"] { --h: var(--pl-lilac); --on: var(--pl-lilac-on); } .lvl[data-l="craft"] { --h: var(--pl-pink); --on: var(--pl-pink-on); }
  .lvl[data-l="behaviour"] { --h: var(--pl-sky); --on: var(--pl-sky-on); } .lvl[data-l="content"] { --h: var(--pl-butter); --on: var(--pl-butter-on); }
  .bar a.path { text-decoration: none; } .bar a.path:hover { text-decoration: underline; }
  .acts a { text-decoration: none; }
  .desk.two { display: grid; grid-template-columns: minmax(0, 1fr) 400px; }
  .view { position: relative; overflow: hidden; min-height: 0; }
  .side { overflow: auto; min-height: 0; background: var(--pl-paper); padding: var(--pl-space-6) var(--pl-space-6) 48px; }
  .tabs { display: flex; flex-wrap: wrap; gap: var(--pl-space-3); margin: 0 0 var(--pl-space-6); }
  .tab { font: var(--pl-card-code); padding: 6px 10px; border: 0; border-radius: 99px; background: var(--pl-paper-2); color: var(--pl-ink-2); cursor: pointer; }
  .tab[aria-pressed="true"] { background: var(--pl-ink); color: var(--pl-paper); }
  .tab:focus-visible, .item > button:focus-visible { outline: 2.5px solid var(--pl-sky); outline-offset: 2px; }
  .points { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--pl-space-3); }
  .item > button { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: var(--pl-space-3) var(--pl-space-5); width: 100%; text-align: left; padding: var(--pl-space-5); border: 0; border-radius: 14px; background: transparent; color: inherit; cursor: pointer; font: inherit; }
  .item > button:hover { background: var(--pl-paper-2); } .item.sel > button { background: var(--pl-paper-2); }
  .num { display: inline-grid; place-items: center; min-width: 22px; height: 22px; padding: 0 6px; box-sizing: border-box; border-radius: 11px; background: var(--h); color: var(--on); font: 700 12px/1 var(--pl-round); }
  .kind { grid-column: 2; font: var(--pl-card-label); letter-spacing: var(--pl-tracking-caps); text-transform: uppercase; color: var(--pl-ink-2); }
  .words { grid-column: 2; font: var(--pl-card-body); margin: 0; }
  .more { grid-column: 2; display: grid; grid-template-columns: 6.5em minmax(0, 1fr); gap: var(--pl-space-3) var(--pl-space-4); margin: var(--pl-space-3) 0 0; }
  .more dt { font: var(--pl-card-meta); color: var(--pl-ink-2); } .more dd { margin: 0; font: var(--pl-card-meta); }
  .note2 { font: var(--pl-card-meta); color: var(--pl-ink-2); margin: var(--pl-space-7) 0 0; }
  .box.lvl { cursor: pointer; } .box.approx { border-style: dashed; } .box.dim { opacity: .35; }
  .layer.using { pointer-events: none; }
  .list { max-width: 980px; margin: 0 auto; padding: var(--pl-page-space-1) var(--pl-space-8) 96px; overflow: auto; }
  .list h1 { font: var(--pl-page-title); margin: 0 0 var(--pl-space-3); } .list > p { font: var(--pl-page-small); color: var(--pl-ink-2); margin: 0 0 var(--pl-space-8); max-width: 70ch; }
  .rows { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--pl-space-2); }
  .rows li { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr) auto; align-items: center; gap: var(--pl-space-6); padding: var(--pl-space-4) var(--pl-space-5); border-radius: 12px; background: var(--pl-paper); }
  .rows b { font: var(--pl-card-title); } .rows code { font: var(--pl-card-code); color: var(--pl-ink-2); display: block; }
  .rows .who { font: var(--pl-card-meta); color: var(--pl-ink-2); }
  .rows .go { display: flex; gap: var(--pl-space-3); } .rows a { text-decoration: none; }
`;

function list(root, base, loaded, soften) {
  const at = (name, query = '') => `http://${name}.localhost:${loaded.port}/__judge/${query}`;
  root.innerHTML = `<style>${base}${CSS}:host { display: block; overflow: auto; }</style><div class="list">
    <h1>Judged sets</h1>
    <p>Each set is one app or site, shown live with a layer for marking it. Open a set to judge it yourself, or to see what another judge marked on it.</p>
    <ul class="rows">${loaded.sets.map((s) => {
      const others = Object.keys(s.judges).filter((j) => j !== 'owner' && j !== 'test');
      const said = Object.entries(s.judges).map(([j, n]) => `${esc(j)}: ${n.marks} ${n.marks === 1 ? 'mark' : 'marks'} on ${n.screens} ${n.screens === 1 ? 'screen' : 'screens'}`).join(' · ') || 'not judged yet';
      return `<li><div><b>${esc(s.title)}</b><code>${esc(host(s.app))}</code></div><span class="who">${said}</span>
        <span class="go">${others.map((j) => `<a class="s-btn" href="${at(s.name, `?judge=${j}&view=1`)}"><span>See ${esc(j)}’s points</span></a>`).join('')}<a class="s-btn q" href="${at(s.name)}"><span>Judge it</span></a></span></li>`;
    }).join('')}</ul></div>`;
  soften(root);
}

function review(el, root, base, loaded, judge, soften) {
  const { set, judgements } = loaded;
  const link = (name) => (name ? `http://${name}.localhost:${loaded.port}/__judge/?judge=${judge}&view=1` : null);
  root.innerHTML = `<style>${base}${CSS}</style>
    <header class="bar">
      <div class="where"><b class="count">${esc(set.title ?? set.name)}</b><a class="path" href="${esc(set.app)}" target="_blank" rel="noreferrer">${esc(host(set.app))}</a></div>
      <p class="ask">${esc(judge)}’s points on the live site. Hold <kbd>Space</kbd> to use the page.</p>
      <div class="acts">${loaded.list ? `<a class="s-btn bare" href="http://localhost:${loaded.port}/__judge/"><span>All sets</span></a>` : ''}
        ${link(loaded.before) ? `<a class="s-btn bare" href="${link(loaded.before)}"><span>Previous</span></a>` : ''}
        ${set.review?.reply ? `<a class="s-btn q" href="${esc(set.review.reply)}" target="_blank" rel="noreferrer"><span>His reply</span></a>` : ''}
        ${link(loaded.after) ? `<a class="s-btn" href="${link(loaded.after)}"><span>Next site</span></a>` : ''}</div>
    </header>
    <main class="desk two">
      <div class="view"><div class="stage"><iframe title="The site being reviewed"></iframe><div class="layer"><div class="page"></div></div></div></div>
      <aside class="side"><div class="tabs"></div><ol class="points"></ol><p class="note2"></p></aside>
    </main>`;
  soften(root);
  const $ = (sel) => root.querySelector(sel);
  const frame = $('iframe'), layer = $('.layer'), page = $('.page'), stage = $('.stage'), view = $('.view');
  const screens = set.screens.filter((s) => judgements[s.id]);
  let i = 0, sel = null, scale = 1;
  const screen = () => screens[i];
  const marks = () => judgements[screen().id].marks;
  const width = () => screen().width ?? set.width;
  const num = (ref) => ref.split('.').pop();

  const fit = () => {
    const w = width(), room = view.clientWidth - 32, tall = view.clientHeight - 32;
    scale = Math.min(1, room / w);
    Object.assign(stage.style, { width: `${w}px`, height: `${Math.max(200, tall / scale)}px`, transform: `translateX(-50%) scale(${scale})` });
  };
  const place = () => { const win = frame.contentWindow; if (win) page.style.transform = `translate(${-win.scrollX}px, ${-win.scrollY}px)`; };
  const use = (on) => layer.classList.toggle('using', !!on);
  const key = (e, down) => { if (e.code === 'Space' && !e.target?.closest?.('input, textarea, [contenteditable]')) { e.preventDefault(); use(down); } };

  const draw = () => {
    $('.tabs').innerHTML = screens.length > 1 ? screens.map((s, k) => `<button type="button" class="tab" aria-pressed="${k === i}" data-k="${k}">${esc(s.path)}</button>`).join('') : '';
    page.replaceChildren();
    const at = new Map(); // two points on the same box: their numbers sit side by side
    for (const m of marks()) {
      if (!m.placed) continue;
      const spot = `${m.x},${m.y}`, nth = at.get(spot) ?? 0; at.set(spot, nth + 1);
      const b = document.createElement('button'); b.type = 'button';
      b.className = `box lvl${m.approx && !m.found ? ' approx' : ''}${m.ref === sel ? ' sel' : sel ? ' dim' : ''}`; b.dataset.l = m.level; b.dataset.ref = m.ref;
      b.setAttribute('aria-label', `Point ${num(m.ref)}: ${m.words}`);
      b.style.cssText = `left:${m.x}px;top:${m.y}px;width:${m.w}px;height:${m.h}px`; b.innerHTML = `<b style="left:${-2 + nth * 26}px">${num(m.ref)}</b>`;
      page.append(b);
    }
    const seen = new Set(), points = marks().filter((m) => !seen.has(m.ref) && seen.add(m.ref));
    $('.points').innerHTML = points.map((m) => {
      const boxes = marks().filter((k) => k.ref === m.ref && k.placed);
      const where = !boxes.length ? 'not on today’s page' : boxes.some((k) => k.approx && !k.found) ? 'placed from an older copy' : '';
      return `<li class="item${m.ref === sel ? ' sel' : ''}"><button type="button" data-ref="${m.ref}" aria-expanded="${m.ref === sel}">
        <span class="num lvl" data-l="${m.level}">${num(m.ref)}</span><span class="kind">${LEVELS[m.level][0]}${where ? ` · ${where}` : ''}</span>
        <p class="words">${esc(m.words)}</p>
        ${m.ref === sel ? `<dl class="more"><dt>The page shows</dt><dd>${esc(m.shows)}</dd>${m.basis ? `<dt>How we know</dt><dd>${esc(know(m))}</dd>` : ''}<dt>How he got there</dt><dd>${esc(m.how)}</dd><dt>For plumber</dt><dd>${esc(m.engine)}</dd>${m.has?.length ? `<dt>Plumber’s checks</dt><dd>${esc(checks(m))}</dd>` : ''}${m.today ? `<dt>Today</dt><dd>${esc(m.today)}</dd>` : ''}</dl>` : ''}
      </button></li>`;
    }).join('');
    $('.note2').textContent = set.review?.note ?? '';
    place();
  };
  // choose a point: open its text, and bring its first box into view on the page
  const pick = (ref) => {
    sel = sel === ref ? null : ref;
    const box = sel && marks().find((m) => m.ref === sel && m.placed);
    if (box) frame.contentWindow?.scrollTo({ top: Math.max(0, box.y - 140), behavior: 'smooth' });
    draw();
  };
  const show = (k) => { i = k; sel = null; frame.src = screen().path; fit(); draw(); };
  // each box was measured in another window. Find the element it was tied to on this page and move the box with it.
  const own = (el) => { let t = ''; for (const n of el.childNodes) if (n.nodeType === 3) t += n.nodeValue; return t.replace(/\s+/g, ' ').trim(); };
  const settle = () => {
    const win = frame.contentWindow, doc = win?.document;
    if (!doc?.body) return;
    for (const m of marks()) {
      if (!m.placed || !m.anchor) continue;
      m.x0 ??= m.x; m.y0 ??= m.y;
      let best = null;
      for (const el of doc.body.getElementsByTagName(m.anchor.tag)) {
        if (!own(el).startsWith(m.anchor.text)) continue;
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        const x = r.left + win.scrollX + m.anchor.dx, y = r.top + win.scrollY + m.anchor.dy, far = Math.abs(x - m.x0) + Math.abs(y - m.y0);
        if (!best || far < best.far) best = { far, x, y };
      }
      if (best) { m.x = Math.round(best.x); m.y = Math.round(best.y); m.found = true; }
    }
    draw();
  };

  frame.addEventListener('load', () => {
    const win = frame.contentWindow, doc = win?.document;
    if (!doc) return;
    // plumber, and Next's own dev badge, are not part of the site
    const hide = new win.CSSStyleSheet(); hide.replaceSync('plumb-overlay, nextjs-portal { display: none !important; }');
    doc.adoptedStyleSheets = [...doc.adoptedStyleSheets, hide];
    win.addEventListener('scroll', place, { passive: true });
    win.addEventListener('keydown', (e) => key(e, true)); win.addEventListener('keyup', (e) => key(e, false));
    place();
    // now, and again once late pictures and typefaces have moved things
    settle(); setTimeout(settle, 1500); setTimeout(settle, 4500);
  });
  layer.addEventListener('wheel', (e) => { e.preventDefault(); frame.contentWindow?.scrollBy(e.deltaX, e.deltaY); }, { passive: false });
  layer.addEventListener('click', (e) => { const b = e.target.closest('.box'); if (b) pick(b.dataset.ref); });
  $('.side').addEventListener('click', (e) => {
    const tab = e.target.closest('.tab'), item = e.target.closest('.item > button');
    if (tab) show(Number(tab.dataset.k)); else if (item) pick(item.dataset.ref);
  });
  window.addEventListener('keydown', (e) => key(e, true)); window.addEventListener('keyup', (e) => key(e, false));
  window.addEventListener('blur', () => use(false));
  new ResizeObserver(() => { fit(); settle(); }).observe(view);
  if (screens.length) show(0); else $('.note2').textContent = `${judge} has no marks in this set.`;
}

const KNOW = { measured: 'Read from the page or a copy of it.', seen: 'Seen in his recording or picture, or in ours.', word: 'His sentence only.' };
const HOW = { same: 'the same judgement', near: 'a neighbour', opposite: 'says the opposite' };
const know = (p) => `${KNOW[p.basis] ?? ''}${p.unseen ? ` Not seen by us: ${p.unseen}` : ''}`;
const checks = (p) => (p.has ?? []).map((h) => `“${h.name}” (${HOW[h.how]})${h.note ? `: ${h.note}` : ''}`).join(' ');
export function show(el, root, base, loaded, judge, soften) {
  if (loaded.index) list(root, base, loaded, soften); else review(el, root, base, loaded, judge, soften);
}
