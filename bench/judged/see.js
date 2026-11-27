// The seen picture drawn over a live page, with nothing judged (docs/briefs/shape-engine.md, section 20, layer 1).
// It is here so a person can say whether the groups the engine sees are the groups they see.
//
//   read(win)   looks at the page once and gives plain rows, one per drawn area (a block of text, a picture, a drawn
//               box, a line), each with the drawn box it lies in. No tag name, role or source is used to decide
//               what a unit is: only what is drawn.
//   pieces(win, site)  every piece of text with its look (what is drawn about its letters, as one string) and its
//               role (what the page is built to do with it), for alike.js. The look is read from styles; the role
//               from tags, roles and addresses, which is the weaker reading the spec allows where there is no source.
//   see(...)    the view: the page in a frame, the tree from seen.js outlined over it one level at a time.
import { boxOf, grow, levels, places, runs, settle, RATIO } from './seen.js';
import { judge } from './alike.js';
import { judge as near, RATIO as APART } from './near.js';
import { judge as regular } from './regular.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const host = (url) => url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
const PICTURE = new Set(['img', 'video', 'canvas', 'svg', 'picture', 'iframe', 'object', 'embed']);
const NEVER = new Set(['script', 'style', 'noscript', 'template', 'link', 'meta', 'head', 'title', 'br', 'wbr', 'plumb-overlay', 'nextjs-portal']);
const SHOWS = 6; // two fills this far apart on any channel (of 255) are two fills. Plumber's convention, not sourced.

export function read(win) {
  const doc = win.document, units = [], els = [];
  const vw = win.innerWidth, tall = Math.max(doc.documentElement.scrollHeight, doc.body.scrollHeight, win.innerHeight);
  // any CSS colour, as four numbers, by letting the browser paint it
  const ctx = Object.assign(doc.createElement('canvas'), { width: 1, height: 1 }).getContext('2d', { willReadFrequently: true }), known = new Map();
  const colour = (s) => {
    if (!known.has(s)) { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = '#000'; ctx.fillStyle = s; ctx.fillRect(0, 0, 1, 1); known.set(s, [...ctx.getImageData(0, 0, 1, 1).data]); }
    return known.get(s);
  };
  const apart = (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));
  // A unit is what shows. A box that clips (a scroller, a carousel, a clamped paragraph) hides what lies past its
  // edge, so each unit is cut down to the part inside every clipping box round it, and one wholly outside is not a
  // unit. `cut` keeps how much was hidden on each side, and `clips` the boxes that did it.
  const lay = [];  // every block's own left and right edge: the lines the layout has set
  const push = (kind, el, parent, r, parts, clip) => {
    const x0 = Math.max(r.left, clip.x0), y0 = Math.max(r.top, clip.y0), x1 = Math.min(r.left + r.width, clip.x1), y1 = Math.min(r.top + r.height, clip.y1);
    if (kind === 'line' ? x1 - x0 <= 0 || y1 - y0 <= 0 : x1 - x0 < 3 || y1 - y0 < 3) return -1;
    units.push({ parent, kind, x: x0, y: y0, w: x1 - x0, h: y1 - y0, cut: { l: x0 - r.left, r: r.left + r.width - x1, t: y0 - r.top, b: r.top + r.height - y1 } });
    els.push({ el, parts, clips: clip.by }); return units.length - 1;
  };
  const inline = (s) => s.display === 'inline' || s.display === 'contents';
  // the lines of text a block sets itself: its own text, and the text of what flows in its lines
  const ink = (el) => {
    const parts = [];
    for (const n of el.childNodes) {
      if (n.nodeType === 3 && n.nodeValue.trim()) { const r = doc.createRange(); r.selectNodeContents(n); parts.push(r); }
      else if (n.nodeType === 1 && !PICTURE.has(n.localName) && !NEVER.has(n.localName) && n.textContent.trim() && inline(win.getComputedStyle(n))) parts.push(n);
    }
    return parts.length ? parts : null;
  };
  // an edge that shows: it has a width, and its colour as it lands on what is behind differs from it. A hairline
  // of black at 8% is a line
  const edge = (s, side, behind) => {
    if (!(parseFloat(s[`border${side}Width`]) > 0) || s[`border${side}Style`] === 'none') return false;
    const raw = colour(s[`border${side}Color`]), a = raw[3] / 255;
    return raw[3] > 0 && apart([0, 1, 2].map((k) => raw[k] * a + behind[k] * (1 - a)), behind) > SHOWS;
  };
  const drawn = (s, behind) => {
    // a fill is judged as it lands on what is behind it: a card of white at 4% on a dark page is a card
    const raw = colour(s.backgroundColor), a = raw[3] / 255, c = [0, 1, 2].map((k) => raw[k] * a + behind[k] * (1 - a)), fill = raw[3] > 0 && apart(c, behind) > SHOWS;
    let sides = 0;
    for (const side of ['Top', 'Right', 'Bottom', 'Left']) if (edge(s, side, behind)) sides++;
    return fill || sides >= 3 || s.boxShadow !== 'none' || s.backgroundImage !== 'none' ? { fill: fill ? c : null } : null;
  };
  const walk = (el, parent, behind, clip) => {
    for (const c of el.children) {
      if (NEVER.has(c.localName)) continue;
      const s = win.getComputedStyle(c), r = c.getBoundingClientRect(), big = r.width >= 3 && r.height >= 3;
      // what this element hides of its own contents
      let inner = clip;
      const cx = s.overflowX !== 'visible', cy = s.overflowY !== 'visible';
      if ((cx || cy) && s.display !== 'contents' && !inline(s)) {
        const x0 = r.left + c.clientLeft, y0 = r.top + c.clientTop;
        inner = { x0: cx ? Math.max(clip.x0, x0) : clip.x0, x1: cx ? Math.min(clip.x1, x0 + c.clientWidth) : clip.x1, y0: cy ? Math.max(clip.y0, y0) : clip.y0, y1: cy ? Math.min(clip.y1, y0 + c.clientHeight) : clip.y1, by: [...clip.by, { el: c, x: cx, y: cy }] };
      }
      if (big && !inline(s) && s.display !== 'contents') lay.push({ el: c, x0: r.left, x1: r.right });
      // parked above or left of the page, where no scrolling reaches it (a "skip to content" link at rest)
      if (big && (r.bottom + win.scrollY <= 0 || r.right + win.scrollX <= 0)) continue;
      // an element with no box of its own (display: contents) still shows what is inside it, and the browser's own
      // "is it visible" says no for it. One such wrapper round a whole app left the page read as empty.
      if (s.display !== 'contents' && c.checkVisibility?.({ checkOpacity: true, checkVisibilityCSS: true }) === false) continue;
      if (PICTURE.has(c.localName)) { if (big) push('picture', c, parent, r, null, clip); continue; }
      let here = parent, back = behind;
      const some = (r.width >= 3 || r.height >= 3) && r.width > 0.5 && r.height > 0.5 && !inline(s);
      const d = some && drawn(s, behind);
      if (d) {
        // the page's own ground is not a box on it
        if (r.width >= vw * 0.95 && r.height >= tall * 0.95) back = d.fill ?? behind;
        else if (Math.min(r.width, r.height) <= 2) push('line', c, parent, r, null, clip);
        else if (big) { const at = push('box', c, parent, r, null, clip); if (at >= 0) { here = at; back = d.fill ?? behind; } }
      } else if (!inline(s) && (r.width >= 3 || r.height >= 3)) {
        // an edge drawn on one or two sides is a line: the rule under a row, the bar beside a quote
        const edges = ['Top', 'Right', 'Bottom', 'Left'].filter((side) => edge(s, side, behind));
        if (edges.length && edges.length <= 2) for (const side of edges) {
          const w = parseFloat(s[`border${side}Width`]);
          push('line', c, parent, side === 'Top' ? { left: r.left, top: r.top, width: r.width, height: w } : side === 'Bottom' ? { left: r.left, top: r.bottom - w, width: r.width, height: w }
            : side === 'Left' ? { left: r.left, top: r.top, width: w, height: r.height } : { left: r.right - w, top: r.top, width: w, height: r.height }, null, clip);
        }
      }
      const parts = inline(s) ? null : ink(c);
      if (parts) { const t = inkBox(parts); if (t.width >= 3 && t.height >= 3) push('text', c, here, t, parts, inner); }
      walk(c, here, back, inner);
    }
  };
  // the page itself hides what lies past its right edge when there is nowhere to scroll to
  const wide = Math.max(doc.documentElement.scrollWidth, vw);
  const page = { x0: -win.scrollX, x1: wide - win.scrollX, y0: -Infinity, y1: Infinity, by: [] };
  walk(doc.body, -1, (() => { const b = colour(win.getComputedStyle(doc.body).backgroundColor); return b[3] >= 128 ? b : colour(win.getComputedStyle(doc.documentElement).backgroundColor)[3] >= 128 ? colour(win.getComputedStyle(doc.documentElement).backgroundColor) : [255, 255, 255, 255]; })(), page);
  return { units, els, lay, vw };
}
// one box round every line of a block's text
export function inkBox(parts) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of parts) for (const r of p.getClientRects()) { if (!r.width || !r.height) continue; x0 = Math.min(x0, r.left); y0 = Math.min(y0, r.top); x1 = Math.max(x1, r.right); y1 = Math.max(y1, r.bottom); }
  return x1 < x0 ? { left: 0, top: 0, width: 0, height: 0 } : { left: x0, top: y0, width: x1 - x0, height: y1 - y0 };
}

const CARRIER = 'a[href], button, [role="button"], [role="link"], [role="tab"], [role="menuitem"], input, select, textarea, summary';
const bare = (h) => h.replace(/^www\./, '');
// a link kept by the web archive points at the archive: the address it stood for is inside its path
const real = (url) => { const m = url.host === 'web.archive.org' && /^\/web\/\d+[a-z_]*\/(https?:\/\/.+)$/.exec(url.pathname + url.search + url.hash); try { return m ? new URL(m[1]) : url; } catch { return url; } };

export function pieces(win, site, seen) {
  const doc = win.document, rows = [], els = [], carriers = new Map();
  const here = real(new URL(win.location.href)), home = here.host === win.location.host ? bare(site) : bare(here.host);
  const ctx = Object.assign(doc.createElement('canvas'), { width: 1, height: 1 }).getContext('2d', { willReadFrequently: true }), known = new Map();
  const colour = (c) => { if (!known.has(c)) { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = '#000'; ctx.fillStyle = c; ctx.fillRect(0, 0, 1, 1); known.set(c, [...ctx.getImageData(0, 0, 1, 1).data]); } return known.get(c); };
  const hex = (c) => `#${c.slice(0, 3).map((v) => v.toString(16).padStart(2, '0')).join('')}`;
  const roleOf = (el) => {
    const c = el.closest(CARRIER);
    if (!c) return ['plain', null];
    if (c.localName !== 'a' && c.getAttribute('role') !== 'link') return ['control', c];
    const raw = c.getAttribute('href') ?? '';
    if (raw.startsWith('#')) return ['jump', c];
    let to; try { to = real(new URL(raw, win.location.href)); } catch { return ['page', c]; }
    if (!/^https?:$/.test(to.protocol)) return ['leaves', c];
    if (to.host !== win.location.host && bare(to.host) !== home) return ['leaves', c];
    const same = to.pathname.replace(/\/$/, '') === here.pathname.replace(/\/$/, '');
    return [same ? (to.hash ? 'jump' : 'here') : 'page', c];
  };
  // a line under the letters, however it is drawn: on the element, on what it flows inside, or as a bottom border
  const lined = (el) => {
    for (let e = el, n = 0; e && n < 6; e = e.parentElement, n++) {
      const st = win.getComputedStyle(e);
      if (st.textDecorationLine.includes('underline') || (st.display === 'inline' && ((parseFloat(st.borderBottomWidth) > 0 && st.borderBottomStyle !== 'none') || st.backgroundImage !== 'none' || st.boxShadow !== 'none'))) return true;
      if (st.display !== 'inline') break;
    }
    return false;
  };
  // words kept for a screen reader and cut away from the eye: something round them is clipped down to a dot
  const unseen = (el) => {
    for (let e = el; e && e !== doc.body; e = e.parentElement) {
      const st = win.getComputedStyle(e);
      if (st.overflow === 'visible' && st.clipPath === 'none') continue;
      const r = e.getBoundingClientRect(); if (r.width < 3 || r.height < 3) return true;
    }
    return false;
  };
  // drawn through a blend with what is behind: the colour the page asks for is not the colour that shows
  const mixed = new Map(), blended = (el) => {
    for (let e = el; e && e !== doc.body; e = e.parentElement) { if (!mixed.has(e)) mixed.set(e, win.getComputedStyle(e).mixBlendMode !== 'normal'); if (mixed.get(e)) return true; }
    return false;
  };
  for (const el of doc.body.querySelectorAll('*')) {
    if (NEVER.has(el.localName) || PICTURE.has(el.localName) || el.closest('svg')) continue;
    const parts = []; let text = '';
    for (const n of el.childNodes) if (n.nodeType === 3 && n.nodeValue.trim()) { const r = doc.createRange(); r.selectNodeContents(n); parts.push(r); text += ` ${n.nodeValue.trim()}`; }
    if (!parts.length || !/[\p{L}\p{N}]/u.test(text) || el.checkVisibility?.({ checkOpacity: true, checkVisibilityCSS: true }) === false) continue;
    const box = inkBox(parts); if (box.width < 3 || box.height < 3 || unseen(el) || blended(el)) continue;
    const st = win.getComputedStyle(el), [role, carrier] = roleOf(el), under = lined(el);
    // a carrier with a fill or an outline of its own is a button: its letters are not compared with bare text
    const cs = carrier && win.getComputedStyle(carrier), boxed = cs && (colour(cs.backgroundColor)[3] >= 128 || parseFloat(cs.borderTopWidth) > 0);
    const ink = hex(colour(st.color)), family = st.fontFamily.split(',')[0].replace(/["']/g, '').trim();
    // how strongly it is drawn: links at half strength beside labels at full are not drawn alike
    let strength = 1; for (let e = el; e && e !== doc.body; e = e.parentElement) strength *= parseFloat(win.getComputedStyle(e).opacity);
    // a mark that travels with it: an icon inside the link or the block, or something the page adds before or after
    // the words (an arrow). Marked and unmarked text are not drawn alike either.
    const home = carrier ?? el, added = (e, which) => { const c = win.getComputedStyle(e, which).content; return c && c !== 'none' && c !== 'normal' && c !== '""' && c !== "''"; };
    const marked = !!home.querySelector('svg, img, picture') || [home, el].some((e) => added(e, '::before') || added(e, '::after'));
    const look = [family, st.fontSize, st.fontWeight, ink, under ? 'u' : '', st.textTransform, st.fontStyle, boxed ? `box${hex(colour(cs.backgroundColor))}` : '', `s${Math.round(strength * 20)}`, marked ? 'm' : ''].join('|');
    const words = [`${Math.round(parseFloat(st.fontSize) * 10) / 10}px`, `weight ${st.fontWeight}`, ink, under ? 'underlined' : 'no underline', boxed ? 'in a box of its own' : ''].filter(Boolean).join(', ');
    if (carrier && !carriers.has(carrier)) carriers.set(carrier, carriers.size);
    // how far the letters stand off what is behind them (the usual contrast ratio). Only ever used to order pieces.
    let back = [255, 255, 255, 255];
    for (let e = el; e; e = e.parentElement) { const c = colour(win.getComputedStyle(e).backgroundColor); if (c[3] >= 128) { back = c; break; } }
    const lum = (c) => { const [r, g, b2] = c.slice(0, 3).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b2; };
    const l1 = lum(colour(st.color)), l2 = lum(back), contrast = Math.round(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)) * 10) / 10;
    rows.push({ look, words, role, carrier: carrier ? carriers.get(carrier) : -1, size: parseFloat(st.fontSize), weight: Number(st.fontWeight) || 400, contrast,
      kind: 'text', unit: -1, scope: 'ground', row: -1, group: -1, place: '', up: -1, text: text.trim().replace(/\s+/g, ' ').slice(0, 60) }); els.push({ el, parts });
  }
  // every drawn box of the seen picture, with the look of its frame (fill, outline, corners, shadow) and its role.
  // A box is pressable when it is a link or a control, is inside one, or holds one that covers nearly all of it.
  // Not read: a link stretched over a card by a pseudo-element, and how large the box is.
  seen?.units.forEach((u, i) => {
    if (u.kind !== 'box') return;
    const el = seen.els[i].el, st = win.getComputedStyle(el), area = u.w * u.h;
    let [role, carrier] = roleOf(el);
    if (role === 'plain') for (const c of el.querySelectorAll(CARRIER)) { const r = c.getBoundingClientRect(); if (r.width * r.height >= area * 0.8) { [role] = roleOf(c); break; } }
    // a small box inside a large link (a tag on a card that is one link) is a part of that link, not a thing to press
    else if (carrier && carrier !== el) { const r = carrier.getBoundingClientRect(); if (area < r.width * r.height * 0.8) role = 'part'; }
    if (blended(el)) return;
    const raw = colour(st.backgroundColor), fill = raw[3] ? `${hex(raw)}${raw[3] < 250 ? `/${Math.round(raw[3] / 2.55)}%` : ''}` : '';
    const edge = parseFloat(st.borderTopWidth) > 0 && st.borderTopStyle !== 'none' ? `${Math.round(parseFloat(st.borderTopWidth) * 10) / 10}px ${hex(colour(st.borderTopColor))}` : '';
    const corner = Math.round(parseFloat(st.borderTopLeftRadius) || 0), shade = st.boxShadow !== 'none', picture = st.backgroundImage !== 'none';
    // a box drawn only by a picture behind it is a picture: two of them are not "drawn alike"
    if (!fill && !edge && !shade) return;
    const look = ['box', fill, edge, corner, shade ? 's' : '', picture ? `i${st.backgroundImage.length}:${st.backgroundImage.slice(0, 60)}` : ''].join('|');
    const words = [fill ? `filled ${fill}` : 'no fill', edge ? `outline ${edge}` : 'no outline', corner ? `${corner}px corners` : 'square corners', shade ? 'a shadow' : '', picture ? 'a picture or gradient behind' : ''].filter(Boolean).join(', ');
    rows.push({ look, words, role, carrier: -1, size: 0, weight: 0, contrast: 0, kind: 'box', unit: i, scope: 'ground', row: -1, group: -1, place: '', up: -1, text: (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 40) || 'a box with no words' });
    els.push({ el, parts: null });
  });
  return { rows, els };
}

// The meant side of "near": which neighbours in a row or column belong together, read from the page's own
// structure. This is the weaker reading the spec allows where there is no source. Things under one branch of the
// part that holds the whole row belong together; a heading belongs with what follows it; and where every thing is
// a branch of its own, each heading starts a group.
const HEAD = 'h1, h2, h3, h4, h5, h6, [role="heading"]';
const unitsIn = (n, out = []) => { if (n.unit !== undefined) out.push(n.unit); for (const c of n.children ?? []) unitsIn(c, out); return out; };
const lca = (a, b) => { while (a && !a.contains(b)) a = a.parentElement; return a; };
// Gives one comparison per level of the structure: { from, groups, skip, how }, for the things from place `from`
// on. A gap inside a group that has groups of its own is skipped at this level and judged one level down, so space
// is only ever set against the next level in. A gap beside a group that is one drawn box is skipped too: the box
// already sets that group apart, and space need not.
export function belongs(run, got) {
  const anchors = run.items.map((n) => unitsIn(n).map((u) => got.els[u].el).reduce(lca)), out = [];
  const level = (lo, hi) => {
    const mine = anchors.slice(lo, hi + 1), top = mine.reduce(lca);
    if (!top || mine.some((a) => a === top)) return false;
    const branch = mine.map((a) => { while (a.parentElement !== top) a = a.parentElement; return a; });
    const heads = mine.map((a) => { const h = a.closest(HEAD); return !!h && h !== top && top.contains(h); });
    let g = 0, groups = branch.map((b, k) => (k && b !== branch[k - 1] ? ++g : g)), how = 'structure';
    const skip = new Set();
    if (g === branch.length - 1) {
      if (!heads.slice(1).some(Boolean)) return false;
      g = 0; groups = heads.map((h, k) => (k && h ? ++g : g)); how = 'headings';
      // nothing says where the last heading's group ends, so the gaps inside it are not used
      for (let k = groups.lastIndexOf(g), first = groups.indexOf(g); k > first; k--) skip.add(k - 1);
    } else {
      // a group that is only a heading joins the group after it
      for (let id = g - 1; id >= 0; id--) if (groups.every((x, k) => x !== id || heads[k])) groups.forEach((x, k) => { if (x === id) groups[k] = id + 1; });
      if (new Set(groups).size < 2) return false;
      // a group with groups of its own: its gaps belong to the level below
      for (const id of new Set(groups)) {
        const first = groups.indexOf(id), last = groups.lastIndexOf(id);
        if (last > first && level(lo + first, lo + last)) for (let k = first; k < last; k++) skip.add(k);
      }
    }
    for (const id of new Set(groups)) {
      const first = groups.indexOf(id), last = groups.lastIndexOf(id);
      if (first === last && run.items[lo + first].type === 'box') { if (first > 0) skip.add(first - 1); if (first < groups.length - 1) skip.add(first); }
    }
    // one thing alone at the head of a level leads all of it (a title, a table's header row), and one alone at
    // its end closes all of it (a "view all" link): neither is a group beside the others, so its gap is not judged
    const m = groups.length;
    if (groups[0] !== groups[1]) skip.add(0);
    if (groups[m - 1] !== groups[m - 2]) skip.add(m - 2);
    // a drawn line in a gap already sets the two sides apart
    run.ruled?.forEach((yes, k) => { if (yes && k >= lo && k < lo + m - 1) skip.add(k - lo); });
    if (new Set(groups).size < 2) return false;
    // the gaps a firm claim may rest on: between two groups of one kind. Built the same way (the same tag and
    // class), or each led by a heading. A title block beside a list, or a menu beside icons, are told apart by
    // more than space, so a close gap between them is only worth a look.
    const sig = (b) => `${b.localName}.${typeof b.className === 'string' ? b.className : ''}`, sure = new Set();
    for (let k = 0; k < m - 1; k++) if (groups[k] !== groups[k + 1] && (how === 'headings' ? heads[groups.indexOf(groups[k])] && heads[k + 1] : sig(branch[k]) === sig(branch[k + 1]))) sure.add(k);
    out.push({ from: lo, groups, skip, how, sure });
    return true;
  };
  level(0, run.items.length - 1);
  return out;
}

// Loud (docs/briefs/shape-engine.md, section 17), the part a page can answer without reading its words.
//   accents(got, win)  blocks of text where the accent covers most of the letters. A highlight picks something out
//                      only while most of the block is not highlighted (a thing stands out by differing from what
//                      surrounds it: Wolfe and Horowitz 2017). The accent is a colour with clear hue beside a
//                      neutral one; two greys are not judged, since nothing says which of them is the emphasis.
//                      → [{ unit, share, letters, accent, base }]
//   loudest(got, win, top)  the blocks of text on the first screen in order of type size, then weight: what the
//                      engine takes as shouting, shown so a person can say whether it is. Nothing is judged.
// The numbers are not published: at least 80 letters, the accent on half or more (one expert's remark, on a page
// where it was 63 percent), the other colour on at least 15 percent, hue of 80 of 255 against 40.
export function accents(got, win) {
  const out = [], ctx = Object.assign(win.document.createElement('canvas'), { width: 1, height: 1 }).getContext('2d', { willReadFrequently: true }), known = new Map();
  const rgb = (c) => { if (!known.has(c)) { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = '#000'; ctx.fillStyle = c; ctx.fillRect(0, 0, 1, 1); known.set(c, [...ctx.getImageData(0, 0, 1, 1).data]); } return known.get(c); };
  const hue = (c) => Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]);
  got.units.forEach((u, i) => {
    if (u.kind !== 'text') return;
    const el = got.els[i].el, by = new Map(); let all = 0;
    const walk = win.document.createTreeWalker(el, 4);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      // only the text this block sets in its own lines
      let p = n.parentElement, mine = true; for (let e = p; e && e !== el; e = e.parentElement) { const d = win.getComputedStyle(e).display; if (d !== 'inline' && d !== 'contents') { mine = false; break; } }
      const count = n.nodeValue.replace(/\s/g, '').length; if (!mine || !count) continue;
      const c = rgb(win.getComputedStyle(p).color), key = c.slice(0, 3).join(','); by.set(key, { c, n: (by.get(key)?.n ?? 0) + count }); all += count;
    }
    if (all < 80 || by.size < 2) return;
    const list = [...by.values()].sort((a, b) => hue(b.c) - hue(a.c)), accent = list[0], rest = list.slice(1).filter((x) => hue(x.c) <= 40);
    const base = rest.sort((a, b) => b.n - a.n)[0];
    if (!base || hue(accent.c) < 80 || accent.n / all < 0.5 || base.n / all < 0.15) return;
    out.push({ unit: i, share: Math.round((accent.n / all) * 100), letters: all, accent: accent.c, base: base.c });
  });
  return out;
}
export function loudest(got, win, top = 3) {
  const tall = win.innerHeight, rows = [];
  got.units.forEach((u, i) => { if (u.kind !== 'text' || u.y >= tall || u.y + u.h <= 0) return; const s = win.getComputedStyle(got.els[i].el); rows.push({ unit: i, size: parseFloat(s.fontSize), weight: Number(s.fontWeight) || 400 }); });
  return rows.sort((a, b) => b.size - a.size || b.weight - a.weight).slice(0, top);
}

// What kind of thing a part of the seen picture is, as one string: a block of text by its type, a box by its frame,
// a group by the kinds it holds (a run of one kind counted once, so a card with three lines and one with four are
// one kind). Two parts with one string are a set, and a set is what "nearly regular" is asked of.
export function kinds(got, win) {
  const memo = new Map(), ctx = Object.assign(win.document.createElement('canvas'), { width: 1, height: 1 }).getContext('2d', { willReadFrequently: true });
  const hue = (c) => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = '#000'; ctx.fillStyle = c; ctx.fillRect(0, 0, 1, 1); return [...ctx.getImageData(0, 0, 1, 1).data].join(','); };
  const frame = (el) => { const s = win.getComputedStyle(el); return `${hue(s.backgroundColor)}/${parseFloat(s.borderTopWidth) > 0 && s.borderTopStyle !== 'none' ? `${s.borderTopWidth} ${hue(s.borderTopColor)}` : ''}/${Math.round(parseFloat(s.borderTopLeftRadius) || 0)}`; };
  const of = (n) => {
    if (memo.has(n)) return memo.get(n);
    let k;
    if (n.type === 'unit') {
      const u = got.units[n.unit], el = got.els[n.unit].el, s = win.getComputedStyle(el);
      k = u.kind === 'text' ? `t:${s.fontFamily.split(',')[0]}|${s.fontSize}|${s.fontWeight}|${hue(s.color)}|${s.textTransform}` : u.kind === 'picture' ? 'p' : `b:${frame(el)}`;
    } else {
      const inner = []; for (const c of n.children) { const x = of(c); if (inner.at(-1) !== x) inner.push(x); }
      k = `${n.type === 'box' ? `B:${frame(got.els[n.unit].el)}` : n.type[0] + (n.axis ?? '')}(${inner.join(',')})`;
    }
    memo.set(n, k); return k;
  };
  return of;
}

const CSS = `
  .desk.two { display: grid; grid-template-columns: minmax(0, 1fr) 360px; }
  .view { position: relative; overflow: hidden; min-height: 0; }
  .side { overflow: auto; min-height: 0; background: var(--pl-paper); padding: var(--pl-space-6) var(--pl-space-6) 48px; display: grid; align-content: start; gap: var(--pl-space-6); }
  .side h2 { font: var(--pl-card-title); margin: 0; } .side p { font: var(--pl-card-meta); color: var(--pl-ink-2); margin: 0; }
  .bar a.path { text-decoration: none; } .acts a { text-decoration: none; }
  .bar .where { min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; } .bar .ask { min-width: 0; } .bar .acts { white-space: nowrap; }
  .bar { grid-template-columns: minmax(0, 1fr) minmax(0, auto) auto; }
  .steps { display: flex; align-items: center; gap: var(--pl-space-3); flex-wrap: wrap; }
  .steps .chip[aria-pressed="true"] { background: var(--pl-ink); color: var(--pl-paper); }
  .chip.u { --h: var(--pl-sky); --on: var(--pl-sky-on); }
  .key { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--pl-space-3); }
  .key li { display: grid; grid-template-columns: 22px minmax(0, 1fr); gap: var(--pl-space-4); align-items: start; font: var(--pl-card-meta); }
  .key i { width: 22px; height: 16px; border-radius: 5px; box-sizing: border-box; border: 3px solid var(--h); margin-top: 1px; }
  .key b { font: var(--pl-card-body); display: block; } .key span { color: var(--pl-ink-2); }
  .t-box { --h: var(--pl-butter); } .t-groups { --h: var(--pl-lilac); } .t-run { --h: var(--pl-sky); } .t-pile { --h: var(--pl-coral); } .t-unit { --h: var(--pl-mint, var(--pl-pink)); }
  .now { padding: var(--pl-space-5); border-radius: 14px; background: var(--pl-paper-2); min-height: 86px; }
  .now b { font: var(--pl-card-body); display: block; margin-bottom: 2px; } .now span { font: var(--pl-card-meta); color: var(--pl-ink-2); }
  .seen { position: absolute; inset: 0; pointer-events: none; }
  .g { position: absolute; box-sizing: border-box; border: 3px solid var(--h); border-radius: 10px; box-shadow: 0 0 0 1px var(--pl-halo), inset 0 0 0 1px var(--pl-halo); }
  .g.on { background: color-mix(in oklab, var(--h) 22%, transparent); }
  .g.leaf { border-width: 1.5px; border-radius: 4px; box-shadow: none; }
  .layer.using { pointer-events: none; }
  .modes { display: flex; gap: var(--pl-space-3); } .modes .chip[aria-pressed="true"] { background: var(--pl-ink); color: var(--pl-paper); }
  .pane { display: grid; align-content: start; gap: var(--pl-space-6); }
  .t-near { --h: var(--pl-butter); } .t-agree { --h: var(--pl-mint, var(--pl-sky)); }
  .gap { position: absolute; box-sizing: border-box; background: color-mix(in oklab, var(--h) 55%, transparent); box-shadow: 0 0 0 1px var(--pl-halo); border-radius: 2px; }
  .t-odd { --h: var(--pl-pink); } .g.odd { border-width: 3px; border-radius: 6px; }
  .finds { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--pl-space-3); }
  .finds button { display: grid; gap: var(--pl-space-2); width: 100%; text-align: left; padding: var(--pl-space-5); border: 0; border-radius: 14px; background: var(--pl-paper-2); color: inherit; cursor: pointer; font: inherit; }
  .finds button[aria-pressed="true"] { outline: 2.5px solid var(--pl-pink); }
  .finds b { font: var(--pl-card-body); } .finds span { font: var(--pl-card-meta); color: var(--pl-ink-2); }
  .finds em { font: var(--pl-card-code); font-style: normal; color: var(--pl-ink); }
`;

const WAYS = { page: 'open another page of the site', jump: 'jump down this page', leaves: 'leave the site', control: 'do something here' };
const many = (n, one, more) => `${n} ${n === 1 ? one : more}`;
const SAID = {
  'looks-pressable': (f, rows) => (rows[f.odd[0]].kind === 'box'
    ? ['Boxes drawn the same, and only some can be pressed', `${many(f.odd.length, 'box does', 'boxes do')} nothing when pressed and ${f.odd.length === 1 ? 'is' : 'are'} drawn exactly like ${f.many.length} that can be pressed.`]
    : ['Drawn the same, and only some can be pressed', `${many(f.odd.length, 'piece of text does', 'pieces of text do')} nothing when pressed and ${f.odd.length === 1 ? 'is' : 'are'} drawn exactly like ${f.many.length} things that can be pressed.`]),
  'pressable-plain': (f, rows) => (rows[f.odd[0]].kind === 'box'
    ? ['Boxes drawn the same, and only some can be pressed', `${many(f.odd.length, 'box can', 'boxes can')} be pressed and ${f.odd.length === 1 ? 'is' : 'are'} drawn exactly like ${f.many.length} that do nothing. At rest nothing says which is which.`]
    : ['Drawn the same, and only some can be pressed', `${many(f.odd.length, 'thing can', 'things can')} be pressed and ${f.odd.length === 1 ? 'is' : 'are'} drawn exactly like ${f.many.length} pieces of plain text. At rest nothing says which is which.`]),
  'one-set-two-ways': (f, rows) => {
    const jumps = [...f.many, ...f.odd].filter((i) => rows[i].role === 'jump').length, rest = f.many.length + f.odd.length - jumps;
    return ['One row of links, two kinds', `These links sit together and look the same. ${many(jumps, 'jumps', 'jump')} down this page and ${many(rest, 'opens', 'open')} another page.`];
  },
};

const HOW = {
  box: (n) => `A drawn box. ${n.how ? `Inside, ${INNER[n.how.type](n.how, n.children.length)}` : n.children.length === 1 ? 'It holds one thing.' : ''}`,
  groups: (n) => `${n.children.length} parts, set apart by a gap ${n.ratio} times the gaps inside them. They sit ${n.axis === 'y' ? 'one under another' : 'side by side'}.`,
  run: (n) => `${n.children.length} things ${n.axis === 'y' ? 'in a column' : 'in a row'}, about ${n.gap}px apart, with no gap large enough to split them.`,
  pile: (n) => `${n.children.length} things that overlap, so no gap separates them.`,
  unit: () => 'One drawn area with nothing inside it.',
};
const INNER = {
  groups: (h, n) => `${n} parts set apart by a gap ${h.ratio} times the gaps inside them.`,
  run: (h, n) => `${n} things ${h.axis === 'y' ? 'in a column' : 'in a row'}, about ${h.gap}px apart.`,
  pile: (h, n) => `${n} things that overlap.`,
};
const NAME = { box: 'A drawn box', groups: 'Parts set apart by space', run: 'An even run', pile: 'A pile', unit: 'A single thing' };

export function see(el, root, base, loaded, soften) {
  const { set } = loaded;
  const link = (name) => (name ? `http://${name}.localhost:${loaded.port}/__judge/?seen=1` : null);
  root.innerHTML = `<style>${base}${CSS}</style>
    <header class="bar">
      <div class="where"><b class="count">${esc(set.title ?? set.name)}</b><a class="path" href="${esc(set.app)}" target="_blank" rel="noreferrer">${esc(host(set.app))}</a></div>
      <p class="ask">What the engine sees, before it reads a word. Hold <kbd>Space</kbd> to use the page.</p>
      <div class="acts">${loaded.list ? `<a class="s-btn bare" href="http://localhost:${loaded.port}/__judge/"><span>All sets</span></a>` : ''}
        ${link(loaded.before) ? `<a class="s-btn bare" href="${link(loaded.before)}"><span>Previous</span></a>` : ''}
        <button type="button" class="s-btn q again"><span>Read again</span></button>
        ${link(loaded.after) ? `<a class="s-btn" href="${link(loaded.after)}"><span>Next site</span></a>` : ''}</div>
    </header>
    <main class="desk two">
      <div class="view"><div class="stage"><iframe title="The page being read"></iframe><div class="layer"><div class="seen"></div></div></div></div>
      <aside class="side">
        <div class="modes"><button type="button" class="chip" data-mode="groups" aria-pressed="true">Groups</button><button type="button" class="chip" data-mode="alike" aria-pressed="false">Look against role</button><button type="button" class="chip" data-mode="near" aria-pressed="false">Space against belonging</button><button type="button" class="chip" data-mode="even" aria-pressed="false">Rhythm and edges</button><button type="button" class="chip" data-mode="held" aria-pressed="false">Boxes and what they hold</button><button type="button" class="chip" data-mode="loud" aria-pressed="false">What is loud</button></div>
        <div class="pane loud" hidden></div>
        <div class="pane held" hidden></div>
        <div class="pane even" hidden></div>
        <div class="pane alike" hidden></div>
        <div class="pane near" hidden></div>
        <div class="pane groups">
        <div><h2>Level</h2><p>Level 1 is the parts the page first falls into. Each level after splits those parts again.</p></div>
        <div class="steps"></div>
        <div class="now"><b>Point at a part</b><span>to see why the engine took it as one thing.</span></div>
        <ul class="key">
          <li class="t-box"><i></i><div><b>A drawn box</b><span>A fill, an outline or a shadow that holds things.</span></div></li>
          <li class="t-groups"><i></i><div><b>Parts set apart by space</b><span>The gap between them is at least ${RATIO} times the gaps inside them.</span></div></li>
          <li class="t-run"><i></i><div><b>An even run</b><span>A row or a column with gaps too alike to split.</span></div></li>
          <li class="t-pile"><i></i><div><b>A pile</b><span>Things that overlap.</span></div></li>
          <li class="t-unit"><i></i><div><b>A single thing</b><span>A block of text or a picture.</span></div></li>
        </ul>
        </div>
        <p class="tally"></p>
      </aside>
    </main>`;
  soften(root);
  const $ = (sel) => root.querySelector(sel);
  const frame = $('iframe'), layer = $('.layer'), seen = $('.seen'), stage = $('.stage'), view = $('.view');
  const screen = set.screens.find((s) => s.id === new URL(location.href).searchParams.get('screen')) ?? set.screens[0];
  let scale = 1, got = null, tree = null, flat = [], level = 1, units = false, over = null, held = false;
  let mode = 'groups', found = null, pick = null, spaced = [], npick = null, agreeing = false, moved = 0, evens = [], epick = null, boxed = [], hpick = null, shouts = [], tops = [], lpick = null;

  const fit = () => {
    const w = screen?.width ?? set.width ?? 1440, room = view.clientWidth - 32, tallness = view.clientHeight - 32;
    scale = Math.min(1, room / w);
    Object.assign(stage.style, { width: `${w}px`, height: `${Math.max(200, tallness / scale)}px`, transform: `translateX(-50%) scale(${scale})` });
  };
  // where a node is now: the page may have scrolled since it was read
  const nowOf = (n) => {
    if (n.type === 'unit' || n.type === 'box') {
      const { el: e, parts, clips } = got.els[n.unit]; const r = parts ? inkBox(parts) : e.getBoundingClientRect();
      let x0 = r.left, y0 = r.top, x1 = r.left + r.width, y1 = r.top + r.height;
      for (const c of clips ?? []) { const b = c.el.getBoundingClientRect(); if (c.x) { x0 = Math.max(x0, b.left + c.el.clientLeft); x1 = Math.min(x1, b.left + c.el.clientLeft + c.el.clientWidth); } if (c.y) { y0 = Math.max(y0, b.top + c.el.clientTop); y1 = Math.min(y1, b.top + c.el.clientTop + c.el.clientHeight); } }
      return { x: x0, y: y0, w: Math.max(0, x1 - x0), h: Math.max(0, y1 - y0) };
    }
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const c of n.children) { const r = nowOf(c); if (!r.w) continue; x0 = Math.min(x0, r.x); y0 = Math.min(y0, r.y); x1 = Math.max(x1, r.x + r.w); y1 = Math.max(y1, r.y + r.h); }
    return x1 < x0 ? { x: 0, y: 0, w: 0, h: 0 } : { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  };
  let shown = [];
  // look against role: the odd pieces of every finding, or one finding's odd pieces among the ones they look like
  const drawAlike = () => {
    const html = [];
    const put = (i, cls) => { const { el: e, parts } = found.els[i], r = parts ? inkBox(parts) : e.getBoundingClientRect(); if (r.width) html.push(`<div class="g ${cls}" style="left:${r.left - 4}px;top:${r.top - 3}px;width:${r.width + 8}px;height:${r.height + 6}px"></div>`); };
    if (pick !== null) { const f = found.findings[pick]; f.many.forEach((i) => put(i, 't-run leaf')); f.odd.forEach((i) => put(i, 't-odd odd')); }
    else for (const f of found.findings) f.odd.forEach((i) => put(i, 't-odd odd'));
    seen.innerHTML = html.join('');
  };
  const list = () => {
    const rows = found.rows;
    $('.alike').innerHTML = `<div><h2>Look against role</h2><p>Pieces of text that are drawn exactly alike and are not the same kind of thing. This is what the reading says. No judge has checked it.</p></div>
      ${found.findings.length ? `<ul class="finds">${found.findings.map((f, k) => { const [title, body] = SAID[f.kind](f, rows); return `<li><button type="button" data-find="${k}" aria-pressed="${k === pick}"><b>${f.firm ? '' : 'Worth a look: '}${title}</b><span>${esc(body)}</span><span>${f.odd.slice(0, 6).map((i) => `<em>${esc(rows[i].text)}</em>`).join(' · ')}${f.odd.length > 6 ? ` and ${f.odd.length - 6} more` : ''}</span><span>Drawn as: ${esc(rows[f.odd[0]].words)}, ${f.beside ? 'side by side with others drawn the same' : 'each on a line of its own'}, ${f.scope === 'ground' ? 'on the page itself' : 'inside boxes'}</span></button></li>`; }).join('')}</ul>` : '<p>Nothing on this page looks like one thing and is another.</p>'}`;
  };
  // space against belonging: the gap between two groups, and the largest gap inside one
  const SPACE = { opposite: ['Space says the opposite', 't-odd'], nearly: ['Space does not say where a group ends', 't-near'], agree: ['Space agrees', 't-agree'] };
  const words = (n) => { const u = unitsIn(n).find((i) => got.units[i].kind === 'text'); return u === undefined ? 'a picture or a box' : got.els[u].el.textContent.trim().replace(/\s+/g, ' ').slice(0, 36); };
  const gapBox = (s, k) => {
    const a = nowOf(s.run.items[k]), b = nowOf(s.run.items[k + 1]); if (!a.w || !b.w) return null;
    return s.run.axis === 'y'
      ? { x: Math.min(a.x, b.x), y: a.y + a.h, w: Math.max(a.x + a.w, b.x + b.w) - Math.min(a.x, b.x), h: Math.max(2, b.y - a.y - a.h) }
      : { x: a.x + a.w, y: Math.min(a.y, b.y), w: Math.max(2, b.x - a.x - a.w), h: Math.max(a.y + a.h, b.y + b.h) - Math.min(a.y, b.y) };
  };
  const drawNear = () => {
    const html = [];
    const bar = (s, k, cls) => { const r = gapBox(s, k); if (r) html.push(`<div class="gap ${cls}" style="left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px"></div>`); };
    spaced.forEach((s, n) => {
      if (npick !== null && npick !== n) return;
      if (npick === null && s.v.outcome === 'agree' && !agreeing) return;
      bar(s, s.v.between, SPACE[s.v.outcome][1]);
      if (npick === null) return;
      bar(s, s.v.inside, 't-run');
      // each group as the page means it
      const ids = [...new Set(s.groups)];
      for (const id of ids) {
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        s.run.items.forEach((it, k) => { if (s.groups[k] !== id) return; const r = nowOf(it); if (!r.w) return; x0 = Math.min(x0, r.x); y0 = Math.min(y0, r.y); x1 = Math.max(x1, r.x + r.w); y1 = Math.max(y1, r.y + r.h); });
        if (x1 > x0) html.push(`<div class="g t-run leaf" style="left:${x0 - 4}px;top:${y0 - 3}px;width:${x1 - x0 + 8}px;height:${y1 - y0 + 6}px"></div>`);
      }
    });
    seen.innerHTML = html.join('');
  };
  const listNear = () => {
    const count = (o) => spaced.filter((s) => s.v.outcome === o).length, shown = spaced.map((s, n) => ({ s, n })).filter(({ s }) => s.v.outcome !== 'agree' || agreeing);
    $('.near').innerHTML = `<div><h2>Space against belonging</h2><p>In each row or column, the space between two groups should be at least ${APART} times the largest space inside a group. Closer than that either way, space does not say where a group ends. Which things belong together is read from the page's structure, which is a weak reading. No judge has checked this.</p></div>
      <p>${spaced.length} rows and columns hold groups. Space agrees in ${count('agree')}. ${spaced.filter((s) => s.tier === 'claim').length} firm, between groups of one kind in a column. ${spaced.filter((s) => s.tier === 'note').length} only worth a look.${moved ? ` ${moved} left out because that part of the page was still changing.` : ''}</p>
      <button type="button" class="chip" data-agree aria-pressed="${agreeing}">Show the ones that agree</button>
      ${shown.length ? `<ul class="finds">${shown.map(({ s, n }) => { const g = s.v.gaps; return `<li><button type="button" data-near="${n}" aria-pressed="${n === npick}"><b>${s.tier === 'note' ? 'Worth a look: ' : ''}${SPACE[s.v.outcome][0]}</b><span>${g[s.v.between]}px between two groups, ${g[s.v.inside]}px inside one. ${s.v.r === Infinity ? '' : `That is ${Math.round(s.v.r * 100) / 100} times.`}</span><span><em>${esc(words(s.run.items[s.v.between]))}</em> · <em>${esc(words(s.run.items[s.v.between + 1]))}</em></span><span>${s.run.axis === 'y' ? 'A column' : 'A row'} of ${s.run.items.length}, in ${new Set(s.groups).size} groups read from ${s.how === 'headings' ? 'its headings' : 'the page’s structure'}</span></button></li>`; }).join('')}</ul>` : '<p>Nothing to show.</p>'}`;
  };
  // nearly regular: a set of like things, the value most of them share, and the ones a little off it
  const EVEN = {
    edge: ['Nearly on the column’s edge', (e) => `${e.v.count} of ${e.members.length} things in this column start on one left edge.`, (o) => `${Math.abs(o.by)}px to the ${o.by > 0 ? 'right' : 'left'} of it`],
    left: ['Nearly on one edge', (e) => `${e.v.count} of ${e.members.length} start on the same left edge.`, (o) => `${Math.abs(o.by)}px to the ${o.by > 0 ? 'right' : 'left'} of it`],
    top: ['Nearly on one line', (e) => `${e.v.count} of ${e.members.length} sit on the same top edge.`, (o) => `${Math.abs(o.by)}px ${o.by > 0 ? 'below' : 'above'} it`],
    width: ['Nearly one width', (e) => `${e.v.count} of ${e.members.length} are ${e.v.common}px wide.`, (o) => `${Math.abs(o.by)}px ${o.by > 0 ? 'wider' : 'narrower'}`],
    height: ['Nearly one height', (e) => `${e.v.count} of ${e.members.length} are ${e.v.common}px tall.`, (o) => `${Math.abs(o.by)}px ${o.by > 0 ? 'taller' : 'shorter'}`],
    gap: ['Nearly even spacing', (e) => `${e.v.count} of ${e.members.length - 1} gaps are ${e.v.common}px.`, (o) => `${Math.abs(o.by)}px ${o.by > 0 ? 'wider' : 'tighter'}`],
  };
  const drawEven = () => {
    const html = [];
    evens.forEach((e, n) => {
      if (epick !== null && epick !== n) return;
      const rs = e.members.map(nowOf);
      if (epick !== null) rs.forEach((r) => { if (r.w) html.push(`<div class="g t-run leaf" style="left:${r.x - 2}px;top:${r.y - 2}px;width:${r.w + 4}px;height:${r.h + 4}px"></div>`); });
      for (const o of e.v.slips) {
        if (e.what === 'gap') {
          const a = rs[o.at], b = rs[o.at + 1]; if (!a.w || !b.w) continue;
          const r = e.axis === 'y' ? { x: Math.min(a.x, b.x), y: a.y + a.h, w: Math.max(a.x + a.w, b.x + b.w) - Math.min(a.x, b.x), h: Math.max(2, b.y - a.y - a.h) } : { x: a.x + a.w, y: Math.min(a.y, b.y), w: Math.max(2, b.x - a.x - a.w), h: Math.max(a.y + a.h, b.y + b.h) - Math.min(a.y, b.y) };
          html.push(`<div class="gap t-odd" style="left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px"></div>`);
        } else { const r = rs[o.at]; if (r.w) html.push(`<div class="g t-odd odd" style="left:${r.x - 3}px;top:${r.y - 3}px;width:${r.w + 6}px;height:${r.h + 6}px"></div>`); }
      }
      // the edge the others share, as a line
      if (epick !== null && (e.what === 'left' || e.what === 'top' || e.what === 'edge')) {
        const ok = rs.filter((r, k) => r.w && !e.v.slips.some((o) => o.at === k)); if (!ok.length) return;
        const all = rs.filter((r) => r.w), x0 = Math.min(...all.map((r) => r.x)), y0 = Math.min(...all.map((r) => r.y)), x1 = Math.max(...all.map((r) => r.x + r.w)), y1 = Math.max(...all.map((r) => r.y + r.h));
        html.push(e.what !== 'top' ? `<div class="gap t-run" style="left:${ok[0].x - 1}px;top:${y0 - 8}px;width:2px;height:${y1 - y0 + 16}px"></div>` : `<div class="gap t-run" style="left:${x0 - 8}px;top:${ok[0].y - 1}px;width:${x1 - x0 + 16}px;height:2px"></div>`);
      }
    });
    seen.innerHTML = html.join('');
  };
  const listEven = () => {
    $('.even').innerHTML = `<div><h2>Rhythm and edges</h2><p>Sets of like things that almost share an edge, a size or a gap. A difference of a few pixels is nobody's intention. A larger one is taken as a choice and left alone. No judge has checked this.</p></div>
      <p>${evens.filter((e) => e.v.firm).length} firm, off by 4px or less. ${evens.filter((e) => !e.v.firm).length} only worth a look.</p>
      ${evens.length ? `<ul class="finds">${evens.map((e, n) => { const [title, most, off] = EVEN[e.what]; return `<li><button type="button" data-even="${n}" aria-pressed="${n === epick}"><b>${e.v.firm ? '' : 'Worth a look: '}${title}</b><span>${most(e)} ${e.v.slips.length === 1 ? 'One is' : `${e.v.slips.length} are`} off: ${e.v.slips.slice(0, 3).map(off).join(', ')}.</span><span>${e.v.slips.slice(0, 3).map((o) => `<em>${esc(words(e.members[o.at]))}</em>`).join(' · ')}</span><span>${e.axis === 'y' ? 'A column' : 'A row'} of ${e.members.length} ${e.what === 'edge' ? 'things of more than one kind' : 'like things'}</span></button></li>`; }).join('')}</ul>` : '<p>Nothing here almost agrees.</p>'}`;
  };
  // boxes and what they hold: a thing cut off where nothing is drawn, text that runs past its box
  const HELD = { cut: 'Cut off where nothing is drawn', sliced: 'A line of text cut through', spill: 'Text runs past its box' };
  const leaf = (i) => ({ type: 'unit', unit: i, rect: { x: got.units[i].x, y: got.units[i].y, w: got.units[i].w, h: got.units[i].h } });
  const drawHeld = () => {
    const html = [];
    boxed.forEach((h, n) => {
      if (hpick !== null && hpick !== n) return;
      const rs = h.units.map((i) => nowOf(leaf(i))).filter((r) => r.w);
      rs.forEach((r) => html.push(`<div class="g t-odd odd" style="left:${r.x - 3}px;top:${r.y - 3}px;width:${r.w + 6}px;height:${r.h + 6}px"></div>`));
      if (hpick === null || !rs.length) return;
      if (h.kind === 'cut') { const y0 = Math.min(...rs.map((r) => r.y)), y1 = Math.max(...rs.map((r) => r.y + r.h)), b = h.el.getBoundingClientRect(), x = h.side === 'r' ? b.left + h.el.clientLeft + h.el.clientWidth : b.left + h.el.clientLeft; html.push(`<div class="gap t-odd" style="left:${x - 1}px;top:${y0 - 12}px;width:2px;height:${y1 - y0 + 24}px"></div>`); }
      if (h.box !== undefined) { const r = nowOf(leaf(h.box)); if (r.w) html.push(`<div class="g t-run leaf" style="left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px"></div>`); }
    });
    seen.innerHTML = html.join('');
  };
  const listHeld = () => {
    $('.held').innerHTML = `<div><h2>Boxes and what they hold</h2><p>A thing cut off at a place where the page has drawn no edge and set no line, and text that runs out of the box it is in. No judge has checked this.</p></div>
      <p>${boxed.filter((h) => h.tier === 'claim').length} firm. ${boxed.filter((h) => h.tier !== 'claim').length} only worth a look.</p>
      ${boxed.length ? `<ul class="finds">${boxed.map((h, n) => `<li><button type="button" data-held="${n}" aria-pressed="${n === hpick}"><b>${h.tier === 'claim' ? '' : 'Worth a look: '}${HELD[h.kind]}</b><span>${esc(h.say)}</span><span>${h.units.slice(0, 3).map((i) => `<em>${esc(words(leaf(i)))}</em>`).join(' · ')}</span></button></li>`).join('')}</ul>` : '<p>Nothing is cut off or runs past its box.</p>'}`;
  };
  // what is loud: the loudest text on the first screen (nothing judged), and blocks where the accent is on most of it
  const hexOf = (c) => `#${c.slice(0, 3).map((v) => v.toString(16).padStart(2, '0')).join('')}`;
  const drawLoud = () => {
    const html = [];
    if (lpick === null) tops.forEach((t, k) => { const r = nowOf(leaf(t.unit)); if (r.w) html.push(`<div class="g ${k ? 't-run leaf' : 't-odd odd'}" style="left:${r.x - 4}px;top:${r.y - 4}px;width:${r.w + 8}px;height:${r.h + 8}px"></div>`); });
    shouts.forEach((s, n) => { if (lpick !== null && lpick !== n) return; const r = nowOf(leaf(s.unit)); if (r.w) html.push(`<div class="g t-odd odd" style="left:${r.x - 4}px;top:${r.y - 4}px;width:${r.w + 8}px;height:${r.h + 8}px"></div>`); });
    seen.innerHTML = html.join('');
  };
  const listLoud = () => {
    $('.loud').innerHTML = `<div><h2>What is loud</h2><p>The loudest text on the first screen, by type size and then weight, outlined so you can say whether the engine's ear is right. Nothing is judged there. Whether the loudest thing is the one that matters most needs the words to be read, and that is not built.</p></div>
      <ol class="finds">${tops.map((t) => `<li><span><em>${esc(words(leaf(t.unit)))}</em> ${t.size}px, weight ${t.weight}</span></li>`).join('')}</ol>
      <div><h2>A highlight on most of the text</h2><p>A block where a coloured accent covers half the letters or more, so it no longer picks anything out.</p></div>
      ${shouts.length ? `<ul class="finds">${shouts.map((s, n) => `<li><button type="button" data-loud="${n}" aria-pressed="${n === lpick}"><b>The accent is on most of this text</b><span>${s.share}% of ${s.letters} letters are in ${hexOf(s.accent)}, and the rest in ${hexOf(s.base)}.</span><span><em>${esc(words(leaf(s.unit)))}</em></span></button></li>`).join('')}</ul>` : '<p>No block has its accent on most of its letters.</p>'}`;
  };
  const draw = () => {
    if (!tree) return;
    if (mode === 'loud') return drawLoud();
    if (mode === 'held') return drawHeld();
    if (mode === 'even') return drawEven();
    if (mode === 'alike') return drawAlike();
    if (mode === 'near') return drawNear();
    const h = stage.clientHeight, w = stage.clientWidth, html = [];
    shown = [];
    const add = (n, leaf) => {
      const r = nowOf(n);
      if (!r.w || r.y > h || r.y + r.h < 0 || r.x > w || r.x + r.w < 0) return;
      const pad = leaf ? 1 : n.type === 'box' ? 0 : 5;
      shown.push({ n, r, leaf });
      html.push(`<div class="g t-${n.type}${leaf ? ' leaf' : ''}${n === over ? ' on' : ''}" style="left:${r.x - pad}px;top:${r.y - pad}px;width:${r.w + pad * 2}px;height:${r.h + pad * 2}px"></div>`);
    };
    for (const { node, level: l } of flat) if (l === level) add(node, false);
    if (units) for (const { node } of flat) if (node.type === 'unit') add(node, true);
    seen.innerHTML = html.join('');
  };
  const steps = () => {
    const max = Math.max(1, ...flat.map((f) => f.level));
    if (level > max) level = max;
    $('.steps').innerHTML = Array.from({ length: max }, (_, k) => `<button type="button" class="chip" data-level="${k + 1}" aria-pressed="${k + 1 === level}">${k + 1}</button>`).join('')
      + `<button type="button" class="chip u" data-units aria-pressed="${units}">Every single thing</button>`;
  };
  // a page is read once it has stopped changing: the same things in the same places on two looks, 600 ms apart
  const still = async () => {
    const win = frame.contentWindow, mark = (g) => g.units.map((u) => `${u.kind}${Math.round(u.x)},${Math.round(u.y)},${Math.round(u.w)},${Math.round(u.h)}`).join('|');
    let last = mark(read(win));
    for (let n = 0; n < 14; n++) { await new Promise((f) => setTimeout(f, 600)); const now = mark(read(win)); if (now === last) return true; last = now; }
    return false;
  };
  const again = async (turn) => {
    const attempt = typeof turn === 'number' ? turn : 0;
    const win = frame.contentWindow; if (!win?.document?.body) return;
    $('.tally').textContent = 'Waiting for the page to stop moving.';
    const settled = await still();
    got = read(win); got.units = settle(got.units); tree = grow(got.units); flat = levels(tree); over = null;
    found = pieces(win, new URL(set.app).host, got);
    // where each piece sits, from the seen picture: the block of text it is part of, then that block's place
    const blocks = new Map(), where = places(tree, got.units);
    got.units.forEach((u, i) => { if (u.kind === 'text') blocks.set(got.els[i].el, i); });
    // which block of text leads a group: the first thing, reading from the top left, of a part that holds several
    const heads = new Map(), firstOf = (n) => { while (n.children?.length) n = n.children[0]; return n.unit; };
    // A split inside a split along the same direction is one column, so every group in it, however deep, is a
    // sister of the others: the number given is the outermost column's.
    let cols = 0;
    // Sisters are also at one depth: the sub-headings inside one section are not sisters of the sections.
    const lead = (n, above, depth) => {
      const axis = n.type === 'box' ? n.how?.axis : n.axis, col = !axis ? above : n.type !== 'box' && above && above.axis === axis ? above : { id: cols++, axis };
      for (const c of n.children ?? []) { if (axis && unitsIn(c).length >= 2) { const u = firstOf(c); (heads.get(u) ?? heads.set(u, []).get(u)).push(`${col.id}@${depth}`); } lead(c, col, depth + (axis ? 1 : 0)); }
    };
    lead(tree, null, 0);
    found.rows.forEach((row, i) => {
      if (row.kind === 'box') { const at = where.get(row.unit); if (at) Object.assign(row, at); return; }
      let e = found.els[i].el; while (e && !blocks.has(e)) e = e.parentElement;
      const at = e && where.get(blocks.get(e)); if (at) Object.assign(row, { unit: blocks.get(e), scope: at.scope, row: at.row, group: at.group, place: at.place, up: at.up, heads: heads.get(blocks.get(e)) ?? [] });
    });
    found.findings = judge(found.rows); pick = null; list();
    spaced = runs(tree, got.units).flatMap((run) => belongs(run, got).map((b) => {
      const part = { axis: run.axis, items: run.items.slice(b.from, b.from + b.groups.length), gaps: run.gaps.slice(b.from, b.from + b.groups.length - 1) };
      // a firm claim: a column, judged only on the gaps between groups of one kind. Rows are left as notes: a row
      // is often spread to both edges, and its gaps are then the layout's and say nothing about belonging.
      const unsure = new Set(b.skip); b.groups.forEach((g, k) => { if (k < b.groups.length - 1 && g !== b.groups[k + 1] && !b.sure.has(k)) unsure.add(k); });
      const firm = run.axis === 'y' ? near({ gaps: part.gaps, groups: b.groups, skip: unsure }) : null;
      if (firm && firm.outcome !== 'agree') return { run: part, v: firm, groups: b.groups, how: b.how, tier: 'claim' };
      const v = near({ gaps: part.gaps, groups: b.groups, skip: b.skip });
      return v ? { run: part, v, groups: b.groups, how: b.how, tier: v.outcome === 'agree' ? 'agree' : 'note' } : null;
    })).filter(Boolean);
    // nearly regular: in every row and column, the like things, one attribute at a time
    const kind = kinds(got, win); evens = [];
    // a thing that is turned or slanted has no edge to line up: the box round it is not what is drawn
    const slant = new Map(), turned = (n) => unitsIn(n).some((u) => {
      for (let e = got.els[u].el; e && e !== win.document.body; e = e.parentElement) {
        if (!slant.has(e)) { const t = win.getComputedStyle(e).transform, m = /^matrix\(([^)]+)\)/.exec(t)?.[1].split(',').map(Number); slant.set(e, t.startsWith('matrix3d') || (!!m && (Math.abs(m[1]) > 0.001 || Math.abs(m[2]) > 0.001))); }
        if (slant.get(e)) return true;
      }
      return false;
    });
    for (const run of runs(tree, got.units)) {
      const by = new Map(); run.items.forEach((it, k) => { const key = kind(it); (by.get(key) ?? by.set(key, []).get(key)).push(k); });
      // the edge a whole column has set, whatever the things in it are (a list's bullets against its paragraphs)
      if (run.axis === 'y' && run.items.length >= 4 && !run.items.some(turned)) { const v = regular(run.items.map((it) => boxOf(it).x)); if (v) evens.push({ what: 'edge', axis: 'y', members: run.items, v: { ...v, firm: false } }); }
      for (const [key, at] of by) {
        if (at.length < 4) continue;
        const members = at.map((k) => run.items[k]), boxes = members.map(boxOf), solid = !key.startsWith('t:');
        if (members.some(turned)) continue;
        // bare shapes (ticks, dots, strokes) are often set unevenly on purpose: a slip among them is only worth a look
        const bare = key.startsWith('b:');
        const ask = (what, values, mem = members, least) => { const v = regular(values, least); if (v) evens.push({ what, axis: run.axis, members: mem, v: bare ? { ...v, firm: false } : v }); };
        if (run.axis === 'y') { ask('left', boxes.map((b) => b.x)); if (solid) ask('width', boxes.map((b) => b.w)); }
        else { ask('top', boxes.map((b) => b.y)); if (solid) ask('height', boxes.map((b) => b.h)); }
        // spacing: only where the like things stand next to each other with nothing else between
        let from = 0;
        for (let i = 1; i <= at.length; i++) if (i === at.length || at[i] !== at[i - 1] + 1) {
          // words set side by side differ in width, and when each is centred on a mark (the numbers along a ruler)
          // the space between their letters is not the spacing: text is asked for its gaps in columns only
          if (i - from >= 5 && (solid || run.axis === 'y')) ask('gap', at.slice(from, i - 1).map((k) => Math.round(run.gaps[k])), at.slice(from, i).map((k) => run.items[k]), 5);
          from = i;
        }
      }
    }
    // one slip, said once: the column's edge is left out where the like things in it already say the same
    evens = evens.filter((e) => e.what !== 'edge' || !evens.some((o) => o.what === 'left' && e.v.slips.every((x) => o.v.slips.some((y) => o.members[y.at] === e.members[x.at]))));
    evens.sort((a, b) => Number(b.v.firm) - Number(a.v.firm)); epick = null;
    // boxes and what they hold
    const boxAt = new Map(); got.units.forEach((u, i) => { if (u.kind === 'box') boxAt.set(got.els[i].el, i); });
    boxed = [];
    const inEdge = (k, side) => { const b = k.el.getBoundingClientRect(); return side === 'r' ? b.left + k.el.clientLeft + k.el.clientWidth : b.left + k.el.clientLeft; };
    const cuts = new Map();
    got.units.forEach((u, i) => {
      if (u.kind === 'line' || u.w < 8) return;
      for (const side of ['l', 'r']) {
        if (u.cut[side] < 8) continue;
        const c = [...got.els[i].clips].reverse().find((k) => k.x && Math.abs(inEdge(k, side) - (side === 'r' ? u.x + u.w : u.x)) <= 1);
        if (c) (cuts.get(c.el) ?? cuts.set(c.el, { el: c.el, l: [], r: [] }).get(c.el))[side].push(i);
      }
    });
    for (const rec of cuts.values()) for (const side of ['l', 'r']) {
      if (!rec[side].length) continue;
      const el = rec.el, s = win.getComputedStyle(el), edge = inEdge(rec, side);
      // fine: the edge is the clipping box's own drawn edge, or a drawn box round it ends there; the cut is faded
      // out; it is the window's edge; or it is a line the layout has set, where two or more other blocks begin or end
      let drawnThere = boxAt.has(el);
      for (let a = el.parentElement; a && !drawnThere; a = a.parentElement) if (boxAt.has(a)) { const r = a.getBoundingClientRect(); drawnThere = Math.abs(r.left - edge) <= 2 || Math.abs(r.right - edge) <= 2; }
      if (drawnThere || [s.maskImage, s.webkitMaskImage].some((m) => m && m !== 'none') || edge <= 1 || edge >= got.vw - 1) continue;
      const tally = new Map(); for (const o of got.lay) if (!o.el.contains(el) && !el.contains(o.el)) for (const x of [o.x0, o.x1]) tally.set(Math.round(x), (tally.get(Math.round(x)) ?? 0) + 1);
      let on = 0, close = Infinity; for (const [x, n] of tally) { if (Math.abs(x - edge) <= 1) on += n; else if (n >= 2) close = Math.min(close, Math.abs(x - edge)); }
      if (on >= 2) continue;
      const n = rec[side].length;
      boxed.push({ kind: 'cut', tier: 'note', units: rec[side], side, el, say: `${n === 1 ? 'One thing is' : `${n} things are`} cut off on the ${side === 'r' ? 'right' : 'left'}, at a place where the page draws no edge and no other block begins or ends.${close <= 8 ? ` The nearest line the layout has set is ${Math.round(close)}px away.` : ''}` });
    }
    got.units.forEach((u, i) => {
      if (u.kind !== 'text') return;
      const el = got.els[i].el, st = win.getComputedStyle(el);
      const c = [...got.els[i].clips].reverse().find((k) => k.y), over = c && win.getComputedStyle(c.el).overflowY;
      if (u.cut.b > 2 && u.h >= 8 && (over === 'hidden' || over === 'clip')) {
        const lh = parseFloat(st.lineHeight) || parseFloat(st.fontSize) * 1.2, part = u.cut.b % lh;
        if (part > 2 && part < lh - 2) boxed.push({ kind: 'sliced', tier: 'note', units: [i], say: 'The box this text is in ends part of the way through a line.' });
      }
      let b = el, flow = true;
      while (b && !boxAt.has(b)) { const p = win.getComputedStyle(b).position; if (p === 'absolute' || p === 'fixed') flow = false; b = b.parentElement; }
      if (!b || !flow) return;
      const bx = got.units[boxAt.get(b)];
      // sideways, a line's box is its letters. Up and down it is the line's height, which is often taller than a
      // small box whose letters still fit, so only more than half a line counts there
      const lh2 = parseFloat(st.lineHeight) || parseFloat(st.fontSize) * 1.2, across = Math.max(bx.x - u.x, u.x + u.w - bx.x - bx.w), down = Math.max(bx.y - u.y, u.y + u.h - bx.y - bx.h);
      // text that lies mostly outside its box was never in it to the eye (a row laid out past a collapsed parent)
      const ix = Math.min(u.x + u.w, bx.x + bx.w) - Math.max(u.x, bx.x), iy = Math.min(u.y + u.h, bx.y + bx.h) - Math.max(u.y, bx.y);
      if (ix <= 0 || iy <= 0 || ix * iy < u.w * u.h * 0.5) return;
      if (across > 2 || down > lh2 * 0.6) boxed.push({ kind: 'spill', tier: 'claim', units: [i], box: boxAt.get(b), say: `This text runs ${Math.round(Math.max(across, down))}px past the box it is in.` });
    });
    boxed.sort((a, b) => Number(b.tier === 'claim') - Number(a.tier === 'claim')); hpick = null;
    shouts = accents(got, win); tops = loudest(got, win); lpick = null;
    // A second look six seconds on. A tile that cycles through its own contents is not a page at rest, and a
    // finding read off it is about one frame. A finding is left out, and counted, when a thing it rests on has
    // gone, or is no longer where it was or the size it was. A clock ticking inside its own box changes nothing.
    if (spaced.some((s) => s.tier !== 'agree') || evens.length || boxed.length) {
      $('.tally').textContent = 'Looking once more, to leave out anything that is still changing.';
      const before = win.scrollY; await new Promise((f) => setTimeout(f, 6000));
      let shifted = false;
      const rests = (n) => {
        if (win.scrollY !== before || !unitsIn(n).every((u) => got.els[u].el.isConnected)) return false;
        const now = nowOf(n), was = boxOf(n);
        if (['x', 'y', 'w', 'h'].every((d) => Math.abs(now[d] - was[d]) <= 2)) return true;
        shifted = true; return false;
      };
      const kept = spaced.filter((s) => s.tier === 'agree' || [s.v.between, s.v.inside].every((k) => [s.run.items[k], s.run.items[k + 1]].every((n) => rests(n) && !turned(n))));
      const firmly = evens.filter((e) => e.members.every(rests)), holding = boxed.filter((h) => h.units.every((i) => rests(leaf(i))));
      // things had not finished settling when the page was read (a late picture pushes everything down): read again
      if (shifted && attempt < 2) return again(attempt + 1);
      moved = spaced.length - kept.length + evens.length - firmly.length + boxed.length - holding.length; spaced = kept; evens = firmly; boxed = holding;
    } else moved = 0;
    listEven(); listHeld(); listLoud();
    // each reading's button says how many firm findings it has, so a person knows where to look first
    const firmIn = { alike: found.findings.filter((f) => f.firm).length, near: spaced.filter((s) => s.tier === 'claim').length, even: evens.filter((e) => e.v.firm).length, held: boxed.filter((h) => h.tier === 'claim').length, loud: shouts.length };
    for (const b of root.querySelectorAll('[data-mode]')) { const n = firmIn[b.dataset.mode]; b.dataset.name ??= b.textContent; b.textContent = n ? `${b.dataset.name} · ${n}` : b.dataset.name; }
    window.__seen = { got, tree, found, spaced, words, moved, evens, held: boxed, loud: shouts.map((s) => ({ tier: 'claim', kind: 'accent', say: `${s.share}% of ${s.letters} letters in the accent: ${words(leaf(s.unit))}` })), tops: tops.map((t) => `${words(leaf(t.unit))} (${t.size}px/${t.weight})`) };
    const rank = { claim: 0, note: 1, agree: 2 }; spaced.sort((a, b) => rank[a.tier] - rank[b.tier] || a.v.r - b.v.r); npick = null; listNear();
    const count = (k) => got.units.filter((u) => u.kind === k).length;
    $('.tally').textContent = `${count('text')} blocks of text, ${count('picture')} pictures, ${count('box')} drawn boxes and ${count('line')} lines, read at ${win.innerWidth} wide.${settled ? '' : ' The page was still moving after 8 seconds, so it was read as it stood.'}`;
    steps(); draw();
  };
  const arrive = () => new Promise((done) => {
    const ready = set.ready ?? {};
    if (!ready.press && !ready.until) return setTimeout(done, 1200);
    let n = 0, pressed = false;
    const t = setInterval(() => {
      const doc = frame.contentDocument; if (!doc?.body) return;
      if (ready.press && !pressed) { const b = [...doc.querySelectorAll('a, button')].find((e) => e.textContent.trim() === ready.press); if (b) { b.click(); pressed = true; } }
      const e = ready.until && doc.querySelector(ready.until), r = e?.getBoundingClientRect();
      const there = r?.width ? e.contains(doc.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)) : false;
      if ((ready.until ? there : pressed) || ++n > 80) { clearInterval(t); setTimeout(done, 1500); }
    }, 150);
  });
  const use = (on) => { held = !!on; layer.classList.toggle('using', held); };
  const key = (e, down) => { if (e.code === 'Space') { e.preventDefault(); use(down); } };
  let wait = 0;
  const soon = () => { cancelAnimationFrame(wait); wait = requestAnimationFrame(draw); };

  frame.addEventListener('load', () => {
    const win = frame.contentWindow, doc = win?.document; if (!doc) return;
    doc.addEventListener('scroll', soon, { capture: true, passive: true });
    win.addEventListener('keydown', (e) => key(e, true)); win.addEventListener('keyup', (e) => key(e, false));
    arrive().then(again);
  });
  // the wheel turns whatever scrolls under the pointer: many sites scroll a box of their own, not the window
  layer.addEventListener('wheel', (e) => {
    e.preventDefault();
    const win = frame.contentWindow, doc = win?.document; if (!doc) return;
    const r = frame.getBoundingClientRect(), s = r.width / frame.offsetWidth;
    for (let t = doc.elementFromPoint((e.clientX - r.left) / s, (e.clientY - r.top) / s); t && t !== doc.documentElement; t = t.parentElement) {
      if (t.scrollHeight > t.clientHeight + 1 && /(auto|scroll)/.test(win.getComputedStyle(t).overflowY)) return t.scrollBy(e.deltaX, e.deltaY);
    }
    win.scrollBy(e.deltaX, e.deltaY);
  }, { passive: false });
  layer.addEventListener('pointermove', (e) => {
    const r = stage.getBoundingClientRect(), x = (e.clientX - r.left) / scale, y = (e.clientY - r.top) / scale;
    // the smallest outlined part under the pointer
    const hit = shown.filter((s) => !s.leaf && x >= s.r.x && x <= s.r.x + s.r.w && y >= s.r.y && y <= s.r.y + s.r.h).sort((a, b) => a.r.w * a.r.h - b.r.w * b.r.h)[0]?.n ?? null;
    if (hit === over) return;
    over = hit;
    $('.now').innerHTML = over ? `<b>${NAME[over.type]}</b><span>${esc(HOW[over.type](over))}</span>` : '<b>Point at a part</b><span>to see why the engine took it as one thing.</span>';
    draw();
  });
  layer.addEventListener('pointerleave', () => { over = null; draw(); });
  $('.side').addEventListener('click', (e) => {
    const l = e.target.closest('[data-level]'), u = e.target.closest('[data-units]'), m = e.target.closest('[data-mode]'), f = e.target.closest('[data-find]');
    const nr = e.target.closest('[data-near]'), ev = e.target.closest('[data-even]'), hd = e.target.closest('[data-held]'), ld = e.target.closest('[data-loud]');
    if (ld) {
      lpick = lpick === Number(ld.dataset.loud) ? null : Number(ld.dataset.loud); listLoud();
      if (lpick !== null) got.els[shouts[lpick].unit].el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return draw();
    }
    if (hd) {
      hpick = hpick === Number(hd.dataset.held) ? null : Number(hd.dataset.held); listHeld();
      if (hpick !== null) got.els[boxed[hpick].units[0]].el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
      return draw();
    }
    if (ev) {
      epick = epick === Number(ev.dataset.even) ? null : Number(ev.dataset.even); listEven();
      if (epick !== null) { const x = evens[epick], m = x.members[x.v.slips[0].at]; got.els[unitsIn(m)[0]].el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
      return draw();
    }
    if (e.target.closest('[data-agree]')) { agreeing = !agreeing; listNear(); return draw(); }
    if (nr) {
      npick = npick === Number(nr.dataset.near) ? null : Number(nr.dataset.near); listNear();
      if (npick !== null) { const s = spaced[npick], u0 = unitsIn(s.run.items[s.v.between])[0]; got.els[u0].el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
      return draw();
    }
    if (m) {
      mode = m.dataset.mode;
      for (const b of root.querySelectorAll('[data-mode]')) b.setAttribute('aria-pressed', String(b.dataset.mode === mode));
      $('.pane.alike').hidden = mode !== 'alike'; $('.pane.groups').hidden = mode !== 'groups'; $('.pane.near').hidden = mode !== 'near'; $('.pane.even').hidden = mode !== 'even'; $('.pane.held').hidden = mode !== 'held'; $('.pane.loud').hidden = mode !== 'loud';
      return draw();
    }
    if (f && found) {
      pick = pick === Number(f.dataset.find) ? null : Number(f.dataset.find); list();
      if (pick !== null) found.els[found.findings[pick].odd[0]].el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return draw();
    }
    if (l) level = Number(l.dataset.level); else if (u) units = !units; else return;
    steps(); draw();
  });
  $('.again').addEventListener('click', again);
  window.addEventListener('keydown', (e) => key(e, true)); window.addEventListener('keyup', (e) => key(e, false));
  window.addEventListener('blur', () => use(false));
  new ResizeObserver(() => { fit(); soon(); }).observe(view);
  fit();
  if (screen) frame.src = screen.path;
}
