/* ─────────────────────────────────────────────────────────
 * EXPERIENCE RULES · React Plumber overlay
 *
 * The experience pack's rules (pack-experience.js says what the pack is and which guide each rule comes from): what
 * only the drawn page shows. Each reads something the source does not hold: a computed style, a laid-out box, what is
 * on top at a point, the fonts and requests the page made, two elements compared across the page.
 * The same rule object craft uses: it reads, never writes, and says nothing when its evidence is ambiguous.
 * A rule about the page as a whole is said once, on the page's own element: the outermost judged element that covers the most of it (html-rules.js, isPage).
 * ───────────────────────────────────────────────────────── */
import { say } from './words.js';
import { accessibleName, trimmed, hiddenFromAT, drawn, shown, page } from './a11y-rules.js';
import { isPage, pageWide } from './html-rules.js';
import { EXPERIENCE } from './pack-experience.js';

const found = (rule, el, n, { value = el.localName, confidence = 0.9, advice }) => [{
  ...say(rule.id, n), key: rule.id, text: el.localName, props: [], value, n: 0,
  evidence: n, confidence, guide: EXPERIENCE.guides[rule.id.split('/')[1]], suggest: { kind: 'advice', text: advice },
}];
const rule = (short, owns, on, check) => ({ id: `experience/${short}`, family: 'craft', owns: [owns], once: 'ancestor', reads: ['rect', 'style'], ...(on ? { on } : {}),
  // `on` is where the engine asks; a rule asked anywhere else (a preview of a fix, a plain sweep) still knows its own kind
  check({ el, facts }) { return on && !el.matches(on) ? [] : check.call(this, el, facts) ?? []; } });
// the words an element holds itself, not those of what is inside it
const ownText = (el) => { let t = ''; for (const n of el.childNodes) if (n.nodeType === 3) t += n.nodeValue; return trimmed(t); };
const wordsIn = (t) => t.split(' ').filter((w) => /\p{L}{2}/u.test(w)).length;
const TEXT = 'p,div,span,li,td,dd,dt,blockquote,label,a,button,h1,h2,h3,h4,h5,h6';
const describe = (el) => `<${el.localName}${el.id ? `#${el.id}` : typeof el.className === 'string' && el.className.trim() ? `.${el.className.trim().split(/\s+/)[0]}` : ''}>`;
// the page's own style rules, walked once a pass: what its media queries ask about
function mediaTexts() {
  const out = [];
  const read = (rules) => { for (const r of rules) { if (r.media?.mediaText) out.push(r.media.mediaText); if (r.cssRules?.length) read(r.cssRules); } };
  for (const sheet of document.styleSheets) { try { if (sheet.media?.mediaText) out.push(sheet.media.mediaText); read(sheet.cssRules); } catch { /* another origin's sheet cannot be read */ } }
  return out;
}

// ── words ───────────────────────────────────────────────────
// respect-os-text-scale: "Do not restrict inline-axis text wrapping with white-space: nowrap on blocks that contain sentences"
export const nowrapSentence = rule('nowrap-sentence', 'wrap', TEXT, function (el, facts) {
  const s = facts.style(el);
  if (!/nowrap/.test(s.whiteSpace) && s.textWrapMode !== 'nowrap') return;
  const text = ownText(el), words = wordsIn(text);
  if (words < 8 || text.length < 50 || !shown(el, facts)) return;
  // words a screen reader hears in a box kept out of sight (a 1px visually hidden hint) can't run off any screen
  const box = facts.rect(el); if (box.width <= 2 || box.height <= 2 || facts.style(el).visibility === 'hidden') return;
  // cut off on purpose (craft's truncate-intent judges that), or a strip made to scroll (a ticker, a row of chips)
  if (s.textOverflow === 'ellipsis' || el.closest('pre, code, [aria-hidden="true"]')) return;
  for (let p = el; p && p !== document.body; p = p.parentElement) if (/auto|scroll/.test(facts.style(p).overflowX)) return;
  return found(this, el, { words }, { value: 'white-space: nowrap', confidence: 0.85, advice: 'Let it wrap: remove nowrap (keep it only on short labels).' });
});
// typography: "Avoid rivers of whitespace: Avoid text-align: justify … If you must use it, combine it with hyphens: auto"
export const justifyRivers = rule('justify-rivers', 'align', 'p,div,li,td,dd,blockquote', function (el, facts) {
  const s = facts.style(el);
  if (s.textAlign !== 'justify' || s.hyphens === 'auto') return;
  if (ownText(el).length < 120 || !shown(el, facts) || facts.rect(el).height < (parseFloat(s.lineHeight) || parseFloat(s.fontSize) * 1.2) * 2) return;
  return found(this, el, {}, { value: 'text-align: justify', confidence: 0.85, advice: 'Align it to the start, or add hyphens: auto (with lang set on the page).' });
});
// typography: "Don't rely on all-caps for emphasis"
export const capsLong = rule('caps-long', 'case', TEXT, function (el, facts) {
  if (facts.style(el).textTransform !== 'uppercase') return;
  const text = ownText(el);
  // a run of labels joined by separators ("Field Guide · Vol. I · April") is labels, each read as one: the longest
  // piece is what is read in capitals (a colophon on algorecall was counted as twelve words)
  const words = Math.max(0, ...text.split(/\s[·•|/–—]\s|\s*[·•|]\s*/).map(wordsIn));
  if (words < 7 || text.length < 45 || !shown(el, facts)) return;
  return found(this, el, { words }, { value: 'text-transform: uppercase', confidence: 0.85, advice: 'Set it in sentence case; keep capitals for labels of a word or two.' });
});

// ── the page ────────────────────────────────────────────────
// responsive-design / WCAG 1.4.10: the page itself must not scroll sideways
export const pageOverflowX = rule('page-overflow-x', 'overflow', null, function (el, facts) {
  if (!isPage(el, facts)) return;
  const doc = document.documentElement, by = doc.scrollWidth - doc.clientWidth;
  if (by < 2) return;
  // the deepest thing that runs past the edge and is not inside something that clips or scrolls it
  let culprit = null;
  for (const c of document.body.querySelectorAll('*')) {
    if (c.closest('plumb-overlay')) continue;
    const r = facts.rect(c);
    if (r.width && r.right + window.scrollX > doc.clientWidth + 1 && facts.style(c).position !== 'fixed') culprit = !culprit || culprit.contains(c) ? c : culprit;
  }
  if (!culprit) return;
  return found(this, el, { by, what: describe(culprit) }, { value: `${by}px`, confidence: 0.85, advice: `Let ${describe(culprit)} shrink or wrap (min-width: 0, max-width: 100%, overflow-wrap), or scroll inside its own box.` });
});
// motion / WCAG 2.2.2: something that loops for ever, on a page whose styles never ask about reduced motion
export const motionNoOptOut = rule('motion-no-opt-out', 'motion', null, function (el, facts) {
  if (!isPage(el, facts)) return;
  const loop = document.getAnimations().map((a) => a.effect?.getComputedTiming?.().iterations === Infinity && a.playState === 'running' ? a.effect.target : null)
    .find((t) => t && !t.closest('plumb-overlay, [aria-hidden="true"]') && (() => { const r = facts.rect(t); return r.width > 96 || r.height > 96; })());
  // a small spinner is a status, not decoration in motion; what is hidden from assistive tech is still seen, but is usually a backdrop
  if (!loop || mediaTexts().some((m) => /prefers-reduced-motion/.test(m))) return;
  return found(this, el, { what: describe(loop) }, { value: 'no prefers-reduced-motion', confidence: 0.8, advice: 'Wrap the animation in @media (prefers-reduced-motion: no-preference), or stop it under (prefers-reduced-motion: reduce).' });
});
// visually-stable-font-fallbacks: a web font with no font-display hides its text while it loads
export const fontDisplay = rule('font-display', 'font', null, function (el, facts) {
  if (!isPage(el, facts)) return;
  let face = null;
  for (const f of document.fonts) if (f.status === 'loaded' && (f.display === 'auto' || f.display === 'block')) { face = f; break; }
  if (!face) return;
  const family = face.family.replace(/^["']|["']$/g, '');
  // an icon font shows nothing useful in a fallback face: hiding it while it loads is right
  if (/icon|symbol|awesome|glyph/i.test(family)) return;
  return found(this, el, { family }, { value: `font-display: ${face.display}`, confidence: 0.85, advice: 'Add font-display: swap to its @font-face (or optional, with a size-adjusted fallback).' });
});
// performance: "DO utilize resource hints: Add preconnect or dns-prefetch for essential third-party domains"
export const preconnectMissing = rule('preconnect-missing', 'hint', null, function (el, facts) {
  if (!isPage(el, facts)) return;
  const hinted = new Set([...document.querySelectorAll('link[rel~="preconnect"], link[rel~="dns-prefetch"]')].map((l) => { try { return new URL(l.href).origin; } catch { return ''; } }));
  const counts = new Map();
  for (const e of performance.getEntriesByType('resource')) {
    if (!/^(?:link|css|script|img|font|fetch)$/.test(e.initiatorType) || e.startTime > 4000) continue;
    let origin; try { origin = new URL(e.name).origin; } catch { continue; }
    if (origin === location.origin || hinted.has(origin) || /^https?:\/\/(?:localhost|127\.|\[::1\])/.test(origin)) continue;
    counts.set(origin, (counts.get(origin) ?? 0) + 1);
  }
  const worst = [...counts].sort((a, b) => b[1] - a[1])[0];
  if (!worst || worst[1] < 2) return;
  return found(this, el, { host: worst[0].replace(/^https?:\/\//, ''), count: worst[1] }, { value: worst[0], confidence: 0.8, advice: `Add <link rel="preconnect" href="${worst[0]}"> to the <head> (crossorigin too, if it serves fonts).` });
});
// performance: "DO use async or defer for all non-critical scripts"
export const scriptBlocking = rule('script-blocking', 'script', null, function (el, facts) {
  if (!isPage(el, facts)) return;
  // a nomodule script never runs in a browser that has modules; the dev server's own scripts (Next's /_next/ chunks,
  // Turbopack's reload client, Vite's client) are not in the project and are gone in a build
  const count = [...document.querySelectorAll('head script[src]:not([async]):not([defer]):not([type="module"]):not([nomodule])')]
    .filter((s) => !/\/(?:_next|@vite|@react-refresh)\//.test(new URL(s.src, location.href).pathname)).length;
  if (!count) return;
  return found(this, el, { count }, { value: `${count} in <head>`, confidence: 0.85, advice: 'Add defer (or async where order does not matter), or load them as type="module".' });
});
// accessibility: "Don't include an empty <title>" (2.4.2)
export const pageTitle = rule('page-title', 'title', null, function (el, facts) {
  if (!isPage(el, facts) || trimmed(document.title)) return;
  return found(this, el, {}, { value: 'no <title>', advice: 'Give the page a <title> that says what it is, most specific words first.' });
});
// accessibility §1 (skip links) / 2.4.1: a long run of stops before the content, and nothing to jump it
const STOP = 'a[href], button, input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])';
export const skipLink = rule('skip-link', 'skip', null, function (el, facts) {
  if (!isPage(el, facts)) return;
  const main = document.querySelector('main, [role="main"]');
  if (!main) return;
  const stops = [...document.querySelectorAll(STOP)].filter((s) => !s.closest('plumb-overlay'));
  // a skip link is hidden until it has focus: looked for among the first stops whether or not it is drawn
  if (stops.slice(0, 3).some((s) => s.localName === 'a' && s.getAttribute('href').startsWith('#') && s.getAttribute('href').length > 1)) return;
  const count = stops.filter((s) => main.compareDocumentPosition(s) & Node.DOCUMENT_POSITION_PRECEDING && drawn(s, facts) && !hiddenFromAT(s)).length;
  if (count < 10) return;
  return found(this, el, { count }, { value: `${count} stops`, confidence: 0.8, advice: 'Make the first link on the page "Skip to content", pointing at the main content’s id; show it when it has focus.' });
});
// dark-mode: a dark page that does not declare color-scheme keeps light scrollbars, controls and first paint
const luminance = (css) => { const m = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,/\s]+([\d.]+))?/.exec(css); if (!m || m[4] === '0') return null; const [r, g, b] = [m[1], m[2], m[3]].map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
export const colorSchemeMissing = rule('color-scheme-missing', 'scheme', null, function (el, facts) {
  if (!isPage(el, facts) || document.querySelector('meta[name="color-scheme"]')) return;
  if (!/^normal$|^light$/.test(facts.style(document.documentElement).colorScheme)) return;
  const ground = luminance(facts.style(document.body).backgroundColor) ?? luminance(facts.style(document.documentElement).backgroundColor);
  if (ground === null || ground > 0.12) return;
  return found(this, el, {}, { value: 'color-scheme: normal', confidence: 0.85, advice: 'Add color-scheme: dark (or light dark) on :root, and <meta name="color-scheme"> to match.' });
});

// ── names across the page ───────────────────────────────────
// accessibility §3: "Avoid inconsistent link text: If multiple hyperlinks direct users to the same target page, make sure each link has the same accessible name"
export const linkTargetRenamed = rule('link-target-renamed', 'name', 'a', function (el, facts) {
  if (!el.hasAttribute('href') || el.getAttribute('href').startsWith('#') || !shown(el, facts)) return;
  const targets = page(facts, 'experience/targets', () => {
    const m = new Map();
    for (const a of document.querySelectorAll('a[href]')) {
      if (a.closest('plumb-overlay') || hiddenFromAT(a) || !drawn(a, facts)) continue;
      const name = accessibleName(a).name; if (!name) continue;
      const list = m.get(a.href); if (list) list.push({ a, name }); else m.set(a.href, [{ a, name }]);
    }
    return m;
  });
  const list = targets.get(el.href);
  if (!list || list.length < 2) return;
  const key = (n) => n.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim(), first = list[0];
  // one name inside the other ("Pricing", "See pricing") is the same name at more length; said once, on the first that differs
  // two short names with no word in common: a card read out whole, or "Vol. I" beside "Volume I", is the same place said at another length
  const few = (n) => key(n).split(' ').length <= 6, shares = (a, b) => { const [x, y] = [key(a), key(b)]; return x.split(' ').some((w) => w.length > 3 && y.includes(w)) || y.split(' ').some((w) => w.length > 3 && x.includes(w)); };
  const other = few(first.name) ? list.find((x) => few(x.name) && !shares(x.name, first.name)) : null;
  if (!other || other.a !== el) return;
  return found(this, el, { name: other.name.slice(0, 30), other: first.name.slice(0, 30) }, { value: el.getAttribute('href').slice(0, 40), confidence: 0.8, advice: `Call both links "${first.name.slice(0, 30)}", or start this one with those words.` });
});
// accessibility §3: "Don't reuse an accessible name across controls with different effects in the same view" (4.1.2)
// The evidence that the effects differ: each sits in its own row, item or card.
const ROW = 'li, tr, article, [role="row"], [role="listitem"], [role="article"]';
export const buttonNameReused = rule('button-name-reused', 'name', 'button,[role="button"]', function (el, facts) {
  if (!shown(el, facts) || !el.closest(ROW)) return;
  const groups = page(facts, 'experience/buttons', () => {
    const m = new Map();
    for (const b of document.querySelectorAll('button, [role="button"]')) {
      const row = b.closest(ROW);
      if (!row || b.closest('plumb-overlay') || hiddenFromAT(b) || !drawn(b, facts)) continue;
      const name = accessibleName(b).name.toLowerCase(); if (!name) continue;
      const g = m.get(name); if (g) { g.rows.add(row); g.list.push(b); } else m.set(name, { rows: new Set([row]), list: [b] });
    }
    return m;
  });
  const g = groups.get(accessibleName(el).name.toLowerCase());
  // three rows, three buttons of one name: a list, not two calls to action that happen to match
  if (!g || g.rows.size < 3 || g.list[0] !== el) return;
  // a button that names what it acts on another way (aria-describedby, aria-labelledby with its row's title) is told apart
  if (g.list.some((b) => b.hasAttribute('aria-describedby') || b.hasAttribute('aria-labelledby'))) return;
  const name = accessibleName(el).name;
  return found(this, el, { name: name.slice(0, 30), count: g.list.length }, { value: name.slice(0, 30), confidence: 0.8, advice: `Name each for its row: aria-label="${name.slice(0, 20)} <the row’s title>", or aria-labelledby with the button’s and the title’s ids.` });
});
// accessibility §3: "Don't repeat state information already exposed by ARIA inside the label"
// a state word counts only where a label states a state: at its end, set off from the name ("Copy, not selected"). "Turn on alerts", "Active users" and "Open menu" are names.
const TAIL = (words) => new RegExp(`[,(:\\u2013-]\\s*((?:not |un)?(?:${words}))\\)?\\s*$`, 'i');
const STATES = [['aria-pressed', TAIL('pressed|selected|active|on|off')], ['aria-selected', TAIL('selected')], ['aria-checked', TAIL('checked')], ['aria-expanded', TAIL('expanded|collapsed|open|closed')]];
export const stateInLabel = rule('state-in-label', 'name', '[aria-label]', function (el, facts) {
  const label = trimmed(el.getAttribute('aria-label'));
  const hit = label && STATES.map(([attr, re]) => el.hasAttribute(attr) && re.exec(label) ? { attr, word: re.exec(label)[1] } : null).find(Boolean);
  if (!hit || !shown(el, facts)) return;
  return found(this, el, hit, { value: `aria-label="${label.slice(0, 40)}"`, confidence: 0.85, advice: `Take "${hit.word}" out of the label: ${hit.attr} already says it.` });
});

// ── scrolling, and what is on top ───────────────────────────
const BOXES = 'div,ul,ol,nav,section,table,tbody,main,aside,article';
// scrollability-affordance-hints: content past the edge needs a sign that it is there
export const scrollNoHint = rule('scroll-no-hint', 'scroll', BOXES, function (el, facts) {
  const s = facts.style(el);
  if (!/auto|scroll/.test(s.overflowX)) return;
  const hidden = el.scrollWidth - el.clientWidth;
  if (hidden < 24 || !shown(el, facts)) return;
  // a sign that there is more: a scrollbar, a fade, arrows beside it, or something cut in half at the edge
  if (s.scrollbarWidth !== 'none' && el.offsetHeight - el.clientHeight > 0) return;
  if (s.maskImage && s.maskImage !== 'none' || s.webkitMaskImage && s.webkitMaskImage !== 'none') return;
  if ([el.previousElementSibling, el.nextElementSibling].some((n) => n && (n.matches('button') || n.querySelector('button')))) return;
  const edge = facts.rect(el).right;
  if ([...el.children].some((c) => { const r = facts.rect(c); return r.left < edge - 12 && r.right > edge + 12; })) return;
  if (s.scrollbarWidth !== 'none' && !navigator.userAgent.includes('Mac')) return; // an always-drawn scrollbar would show on this platform
  return found(this, el, { hidden }, { value: `overflow-x: ${s.overflowX}`, confidence: 0.8, advice: 'Fade the far edge (mask-image), let the last item sit half in view, or add arrows.' });
});
// accessibility §5 / 2.1.1: a scroll area with nothing focusable in it cannot be scrolled from a keyboard everywhere
export const scrollKeyboard = rule('scroll-keyboard', 'tabindex', BOXES, function (el, facts) {
  if (el === document.body || el.localName === 'main' && el.parentElement === document.body) return;
  const s = facts.style(el);
  const down = /auto|scroll/.test(s.overflowY) && el.scrollHeight - el.clientHeight > 24, across = /auto|scroll/.test(s.overflowX) && el.scrollWidth - el.clientWidth > 24;
  if (!down && !across || !shown(el, facts)) return;
  if (el.hasAttribute('tabindex') || el.querySelector(STOP) || !trimmed(el.textContent)) return;
  // the page's own scroller in an app shell: the keys scroll it wherever focus is
  const r = facts.rect(el);
  if (r.height >= window.innerHeight * 0.9 && r.width >= window.innerWidth * 0.6) return;
  return found(this, el, {}, { value: `overflow: ${down ? s.overflowY : s.overflowX}`, confidence: 0.8, advice: 'Add tabindex="0", and a role="region" with an aria-label so the stop says what it is.' });
});
// card: "Do NOT apply z-index to entire containers as that would make them capture pointer events"; 2.4.11
// Asked of the browser itself: what is on top at the middle of this control?
export const controlCovered = rule('control-covered', 'cover', 'button,a,input,select,textarea,[role="button"]', function (el, facts) {
  if (el.localName === 'a' && !el.hasAttribute('href') || el.matches(':disabled') || !shown(el, facts)) return;
  const r = facts.rect(el), x = r.left + r.width / 2, y = r.top + r.height / 2;
  if (r.width < 16 || r.height < 16 || x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) return;
  if (facts.style(el).pointerEvents === 'none' || el.closest('[inert]')) return;
  // (plumber's own layer may be drawn over the page, and so may a dev server's badge or error layer: looked through,
  // since no one using the app ever sees them; found on cal.com, 2026-11-26: Next's dev badge "covered" two links)
  const top = document.elementsFromPoint(x, y).find((t) => !t.closest('plumb-overlay, nextjs-portal, vite-error-overlay, astro-dev-toolbar, vite-plugin-checker-error-overlay'));
  if (!top || top === el || el.contains(top) || top.contains(el)) return;
  // its own label drawn over it (a styled checkbox), an open layer above the page, or a bar that stays put while the page scrolls under it
  if (top.closest('label')?.control === el || top.closest('dialog, [popover], [role="dialog"], [role="menu"], [role="listbox"], [role="tooltip"]')) return;
  for (let p = top; p && p !== document.body; p = p.parentElement) if (/fixed|sticky/.test(facts.style(p).position)) return;
  if (facts.style(top).pointerEvents === 'none') return;
  const what = el.localName === 'a' ? 'link' : el.localName === 'button' || el.getAttribute('role') === 'button' ? 'button' : 'field';
  return found(this, el, { what, by: describe(top) }, { value: describe(top), confidence: 0.8, advice: `Raise this ${what} above ${describe(top)} (position: relative and a z-index), or give what covers it pointer-events: none.` });
});

for (const r of [pageOverflowX, motionNoOptOut, fontDisplay, preconnectMissing, scriptBlocking, pageTitle, skipLink, colorSchemeMissing]) pageWide(r);
export const EXPERIENCE_RULES = [nowrapSentence, justifyRivers, capsLong, pageOverflowX, motionNoOptOut, fontDisplay, preconnectMissing, scriptBlocking, pageTitle, skipLink, colorSchemeMissing,
  linkTargetRenamed, buttonNameReused, stateInLabel, scrollNoHint, scrollKeyboard, controlCovered];
