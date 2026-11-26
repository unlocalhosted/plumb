// Two read-only views of the judged sets (bench/judged/README.md), drawn by the judging page:
//   the list    every set the server holds, who has judged it, and where to open it
//   the review  one judge's marks over the live site, with every point listed beside it. A point with a box is drawn
//               on the page; a dashed box was placed from an older copy of the page and may have moved; a point with
//               no box (it was made on the reviewer's own picture, or is about movement) is only in the list.
// Holding Space lets the pointer through to the site, so a point about hover or motion can be tried where it happens.
//
// A point may carry a scene, which shows it as the reviewer met it and replaces its box:
//   show    the things it is about, each found on the live page by name ({ sel, name, all }) and followed as it moves
//   join    words for what ties the first two together, when the point is a comparison
//   try     what to do with your own hand; while such a point is open the pointer goes through to the site
//   beside  things that are not on the page (the tab icon, the share picture), shown in the list ({ src, name })
// A set may say how to reach the state the reviewer was in: ready.press (the words on a control to press once, such as
// "Skip intro") and ready.until (the page counts as arrived when this element can be seen).

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
  .spots { position: absolute; inset: 0; pointer-events: none; }
  .spot { position: absolute; box-sizing: border-box; border: 3px solid var(--h); border-radius: 12px; }
  .spot > b, .tie { position: absolute; font: 700 12px/1 var(--pl-round); padding: 5px 9px; border-radius: 99px; background: var(--h); color: var(--on); white-space: nowrap; }
  .spot > b { left: -3px; top: calc(100% + 6px); }
  .spot.small > b { left: calc(100% + 6px); top: 50%; transform: translateY(-50%); } /* beside a small thing, clear of the line under it */
  .tie { transform: translate(-50%, -50%); }
  .wire { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; } .wire polyline { fill: none; stroke: var(--h); stroke-width: 3; stroke-linejoin: round; stroke-linecap: round; }
  .turn { grid-column: 2; margin: var(--pl-space-3) 0 0; padding: var(--pl-space-4) var(--pl-space-5); border-radius: 12px; background: var(--pl-sky); color: var(--pl-sky-on); font: var(--pl-card-body); }
  .turn b { display: block; font: var(--pl-card-label); letter-spacing: var(--pl-tracking-caps); text-transform: uppercase; margin-bottom: 2px; }
  .beside { grid-column: 2; display: flex; gap: var(--pl-space-5); margin: var(--pl-space-3) 0 0; }
  .beside figure { margin: 0; display: grid; gap: var(--pl-space-2); justify-items: start; }
  .beside img { height: 72px; width: auto; border-radius: 10px; background: var(--pl-paper-2); image-rendering: auto; }
  .beside figcaption { font: var(--pl-card-meta); color: var(--pl-ink-2); }
  .back { margin: var(--pl-space-3) 0 var(--pl-space-4) calc(22px + var(--pl-space-5) + var(--pl-space-5)); }
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
        <span class="go">${others.map((j) => `<a class="s-btn" href="${at(s.name, `?judge=${j}&view=1`)}"><span>See ${esc(j)}’s points</span></a>`).join('')}<a class="s-btn bare" href="${at(s.name, '?seen=1')}"><span>What the engine sees</span></a><a class="s-btn q" href="${at(s.name)}"><span>Judge it</span></a></span></li>`;
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
  let i = 0, sel = null, scale = 1, scene = null, away = false, held = false;
  const spots = document.createElement('div'); spots.className = 'spots'; layer.append(spots);
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
  // the pointer goes through to the site while Space is held, and while a point that asks for your hand is open
  const use = (on = held) => { held = !!on; layer.classList.toggle('using', held || !!scene?.try); };
  const key = (e, down) => { if (e.code === 'Space' && !e.target?.closest?.('input, textarea, [contenteditable]')) { e.preventDefault(); use(down); } };

  // ── a scene: the things a point is about, found on the live page and followed while it is open ──
  const things = (doc, f) => { try { return f.all ? [...doc.querySelectorAll(f.sel)] : [doc.querySelector(f.sel)].filter(Boolean); } catch { return []; } };
  const follow = () => {
    if (!screens.length) return;
    const doc = frame.contentDocument, level = sel && marks().find((m) => m.ref === sel)?.level;
    // a site may change page without loading one: ask where the frame is, every frame
    const here = frame.contentWindow?.location.pathname.replace(/\/$/, ''), gone = here !== undefined && here !== screen().path.replace(/\/$/, '');
    if (gone !== away) { away = gone; draw(); }
    const rects = [];
    if (scene && doc && !away) for (const f of scene.show ?? []) for (const el of things(doc, f)) { const r = el.getBoundingClientRect(); if (r.width && r.height) rects.push({ r, name: f.name }); }
    const need = rects.length + (scene?.join && rects.length > 1 ? 2 : 0);
    if (spots.childElementCount !== need || spots.dataset.for !== `${sel}`) {
      spots.dataset.for = `${sel}`;
      spots.innerHTML = rects.map(({ name }) => `<div class="spot lvl" data-l="${level}">${name ? `<b>${esc(name)}</b>` : ''}</div>`).join('')
        + (need > rects.length ? `<svg class="wire lvl" data-l="${level}"><polyline/></svg><b class="tie lvl" data-l="${level}">${esc(scene.join)}</b>` : '');
    }
    rects.forEach(({ r }, k) => { spots.children[k].classList.toggle('small', r.width < 80); spots.children[k].style.cssText = `left:${r.left - 6}px;top:${r.top - 6}px;width:${r.width + 12}px;height:${r.height + 12}px`; });
    if (need > rects.length) {
      // a bracket over the first two, clear of both, with the words on it
      const [a, b] = rects.map((x) => x.r), ax = a.left + a.width / 2, bx = b.left + b.width / 2, top = Math.min(a.top, b.top) - 34;
      const y = top > 8 ? top : Math.max(a.bottom, b.bottom) + 40, from = (r) => (top > 8 ? r.top - 6 : r.bottom + 6);
      spots.children[rects.length].firstElementChild.setAttribute('points', `${ax},${from(a)} ${ax},${y} ${bx},${y} ${bx},${from(b)}`);
      spots.children[rects.length + 1].style.cssText = `left:${(ax + bx) / 2}px;top:${y}px`;
    }
    requestAnimationFrame(follow);
  };
  const reveal = () => { const doc = frame.contentDocument, first = scene && doc && (scene.show ?? []).flatMap((f) => things(doc, f))[0]; first?.scrollIntoView({ block: 'center', behavior: 'smooth' }); };
  // the state the reviewer was in: press what the set names, once, and wait for what it names to be in sight
  const arrive = () => new Promise((done) => {
    const ready = set.ready ?? {};
    if (!ready.press && !ready.until) return done();
    let n = 0, pressed = false;
    const t = setInterval(() => {
      const doc = frame.contentDocument; if (!doc?.body) return;
      if (ready.press && !pressed) { const b = [...doc.querySelectorAll('a, button')].find((e) => e.textContent.trim() === ready.press); if (b) { b.click(); pressed = true; } }
      const el = ready.until && doc.querySelector(ready.until), r = el?.getBoundingClientRect();
      const there = r?.width ? el.contains(doc.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)) : false;
      if ((ready.until ? there : pressed) || ++n > 80) { clearInterval(t); done(); }
    }, 150);
  });

  const draw = () => {
    $('.tabs').innerHTML = screens.length > 1 ? screens.map((s, k) => `<button type="button" class="tab" aria-pressed="${k === i}" data-k="${k}">${esc(s.path)}</button>`).join('') : '';
    page.replaceChildren(); page.hidden = !!scene;
    const at = new Map(); // two points on the same box: their numbers sit side by side
    for (const m of marks()) {
      if (!m.placed || m.scene) continue;
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
      const where = m.scene ? 'on the live page' : !boxes.length ? 'not on today’s page' : boxes.some((k) => k.approx && !k.found) ? 'placed from an older copy' : '';
      const open = m.ref === sel, sc = open && m.scene;
      return `<li class="item${m.ref === sel ? ' sel' : ''}"><button type="button" data-ref="${m.ref}" aria-expanded="${m.ref === sel}">
        <span class="num lvl" data-l="${m.level}">${num(m.ref)}</span><span class="kind">${LEVELS[m.level][0]}${where ? ` · ${where}` : ''}</span>
        <p class="words">${esc(m.words)}</p>
        ${sc?.try ? `<p class="turn"><b>Your turn</b>${esc(sc.try)}</p>` : ''}${sc?.beside ? `<div class="beside">${sc.beside.map((b) => `<figure><img src="${esc(b.src)}" alt=""><figcaption>${esc(b.name)}</figcaption></figure>`).join('')}</div>` : ''}
        ${open ? `<dl class="more"><dt>The page shows</dt><dd>${esc(m.shows)}</dd>${m.basis ? `<dt>How we know</dt><dd>${esc(know(m))}</dd>` : ''}<dt>How he got there</dt><dd>${esc(m.how)}</dd><dt>For plumber</dt><dd>${esc(m.engine)}</dd>${m.has?.length ? `<dt>Plumber’s checks</dt><dd>${esc(checks(m))}</dd>` : ''}${m.today ? `<dt>Today</dt><dd>${esc(m.today)}</dd>` : ''}</dl>` : ''}
      </button>${sc && away ? `<button type="button" class="s-btn back" data-back><span>Back to the page</span></button>` : ''}</li>`;
    }).join('');
    $('.note2').textContent = set.review?.note ?? '';
    place();
  };
  // choose a point: open its text, and bring its first box into view on the page
  const pick = (ref) => {
    sel = sel === ref ? null : ref;
    scene = (sel && marks().find((m) => m.ref === sel)?.scene) || null;
    use();
    const box = sel && !scene && marks().find((m) => m.ref === sel && m.placed);
    if (box) frame.contentWindow?.scrollTo({ top: Math.max(0, box.y - 140), behavior: 'smooth' });
    if (scene && away) frame.contentWindow.location.replace(screen().path); else reveal();
    draw();
  };
  const show = (k) => { i = k; sel = null; scene = null; use(); frame.src = screen().path; fit(); draw(); };
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
    away = win.location.pathname.replace(/\/$/, '') !== screen().path.replace(/\/$/, '');
    // now, and again once late pictures and typefaces have moved things
    settle(); setTimeout(settle, 1500); setTimeout(settle, 4500);
    if (!away) arrive().then(() => { reveal(); draw(); });
  });
  // the wheel turns whatever scrolls under the pointer: many sites scroll a box of their own, not the window
  layer.addEventListener('wheel', (e) => {
    e.preventDefault();
    const win = frame.contentWindow, doc = win?.document; if (!doc) return;
    const r = frame.getBoundingClientRect(), s = r.width / frame.offsetWidth;
    for (let el = doc.elementFromPoint((e.clientX - r.left) / s, (e.clientY - r.top) / s); el && el !== doc.documentElement; el = el.parentElement) {
      if (el.scrollHeight > el.clientHeight + 1 && /(auto|scroll)/.test(win.getComputedStyle(el).overflowY)) return el.scrollBy(e.deltaX, e.deltaY);
    }
    win.scrollBy(e.deltaX, e.deltaY);
  }, { passive: false });
  layer.addEventListener('click', (e) => { const b = e.target.closest('.box'); if (b) pick(b.dataset.ref); });
  $('.side').addEventListener('click', (e) => {
    const tab = e.target.closest('.tab'), back = e.target.closest('[data-back]'), item = e.target.closest('.item > button:not([data-back])');
    if (tab) show(Number(tab.dataset.k)); else if (back) frame.contentWindow.location.replace(screen().path); else if (item) pick(item.dataset.ref);
  });
  window.addEventListener('keydown', (e) => key(e, true)); window.addEventListener('keyup', (e) => key(e, false));
  window.addEventListener('blur', () => use(false));
  new ResizeObserver(() => { fit(); settle(); }).observe(view);
  requestAnimationFrame(follow);
  if (screens.length) show(0); else $('.note2').textContent = `${judge} has no marks in this set.`;
}

const KNOW = { measured: 'Read from the page or a copy of it.', seen: 'Seen in his recording or picture, or in ours.', word: 'His sentence only.' };
const HOW = { same: 'the same judgement', near: 'a neighbour', opposite: 'says the opposite' };
const know = (p) => `${KNOW[p.basis] ?? ''}${p.unseen ? ` Not seen by us: ${p.unseen}` : ''}`;
const checks = (p) => (p.has ?? []).map((h) => `“${h.name}” (${HOW[h.how]})${h.note ? `: ${h.note}` : ''}`).join(' ');
export function show(el, root, base, loaded, judge, soften) {
  if (loaded.index) list(root, base, loaded, soften); else review(el, root, base, loaded, judge, soften);
}
