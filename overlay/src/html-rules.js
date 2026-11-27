/* ─────────────────────────────────────────────────────────
 * HTML RULES · React Plumber overlay
 *
 * The HTML pack's rules (pack-html.js says what the pack is and which section of the guide each rule comes from). The
 * same rule object craft uses: it reads facts and the element, never writes, and says nothing when its evidence is
 * ambiguous. Each rule is one bullet of Chrome's Modern Web Guidance, html guide, that the drawn page shows.
 * A rule about the page as a whole (its language, its viewport, its landmarks) is said once, on the first element judged.
 * ───────────────────────────────────────────────────────── */
import { say } from './words.js';
import { trimmed, hiddenFromAT, drawn, shown, named, page } from './a11y-rules.js';

const found = (rule, el, n, { value = el.localName, confidence = 0.9, advice }) => [{
  ...say(rule.id, n), key: rule.id, text: el.localName, props: [], value, n: 0,
  evidence: n, confidence, guide: 'html', suggest: { kind: 'advice', text: advice },
}];
const rule = (short, owns, check) => ({ id: `html/${short}`, family: 'craft', owns: [owns], once: 'ancestor', reads: ['rect', 'style'], check({ el, facts }) { return check.call(this, el, facts) ?? []; } });
// the first element a pass judges stands for the page: page-wide rules are said there, once (each rule keeps its own)
// (kept across passes, while that element is still in the page: a second pass that starts elsewhere must not say it again)
const ROOT = new WeakMap(); // document → the element that stands for it
// The page's own element, where a finding about the whole page is said: the outermost judged element that covers the
// most of the page (a route's root, a layout), not whichever was judged first (that was an icon in a feedback dock on
// algorecall, and the report named its file for a page with no <main>). One per pass, so it is said once.
const rootOf = (facts) => {
  const items = facts?.items; if (!items?.length) return null;
  const judged = new Set(items);
  let best = null, area = -1;
  for (const el of items) {
    let inner = false; for (let p = el.parentElement; p; p = p.parentElement) if (judged.has(p)) { inner = true; break; }
    if (inner) continue;
    const r = facts.rect(el), a = r.width * r.height;
    if (a > area) { best = el; area = a; }
  }
  return best;
};
// Chosen afresh for each pass over the page (it is read in waves: a fixed dock can be all there is of it at first), so
// the page-wide checks read the census (craft.js judges them again whenever the page has changed) and the finding moves
// to the page's own element as the page fills in. Without the pass's list (no facts), the first element asked keeps it.
const ROOTS = new WeakMap();
export const isPage = (el, facts) => {
  if (!facts?.items) { const kept = ROOT.get(document)?.deref(); if (kept?.isConnected) return kept === el; ROOT.set(document, new WeakRef(el)); return true; }
  let root = ROOTS.get(facts); if (root === undefined) ROOTS.set(facts, (root = rootOf(facts)));
  return root === el;
};
// a check that speaks once for the whole page is judged with the census: again whenever the page has changed
// (`page`: it speaks once for the whole page, on its root; a fix's trial leaves it out, verdict.js)
export const pageWide = (rule) => { rule.reads = [...(rule.reads ?? []), 'census']; rule.page = true; return rule; };
const PRESSABLE = 'a[href], button, input, select, textarea, summary, label, [role], [tabindex], [contenteditable]';
const viewport = () => document.querySelector('meta[name="viewport"]')?.getAttribute('content') ?? null;
const fold = () => window.innerHeight;
const pageTop = (r) => r.top + window.scrollY;

// a page that is still loading (a busy shell, a handful of elements) has no content to judge as a page yet
const loaded = () => !document.querySelector('[aria-busy="true"]') && document.body.querySelectorAll('*').length >= 40;

// ── §1 the page ─────────────────────────────────────────────
// "DO set the lang attribute on the <html> element"
export const pageLang = rule('page-lang', 'lang', function (el, facts) {
  if (!isPage(el, facts) || trimmed(document.documentElement.getAttribute('lang'))) return;
  return found(this, el, {}, { value: '<html>', advice: 'Add lang to <html> (lang="en").' });
});
// "DO use the <meta name="viewport"> element with … width=device-width, initial-scale=1.0"
export const viewportMeta = rule('viewport-meta', 'viewport', function (el, facts) {
  if (!isPage(el, facts)) return;
  const content = viewport();
  if (content !== null && /width\s*=\s*device-width/i.test(content)) return;
  return found(this, el, { has: content !== null }, { value: content ?? 'no viewport', advice: 'Add <meta name="viewport" content="width=device-width, initial-scale=1"> to the <head>.' });
});
// "DON'T disable page zooming capabilities"
export const zoomDisabled = rule('zoom-disabled', 'zoom', function (el, facts) {
  if (!isPage(el, facts)) return;
  const content = viewport() ?? '';
  const how = /user-scalable\s*=\s*(?:no|0)\b/i.exec(content)?.[0] ?? (() => { const m = /maximum-scale\s*=\s*([\d.]+)/i.exec(content); return m && parseFloat(m[1]) < 2 ? m[0] : null; })();
  if (!how) return;
  return found(this, el, { how }, { value: how, advice: `Remove ${how.split('=')[0].trim()} from the viewport.` });
});
// "DO use the standard HTML5 doctype <!DOCTYPE html> to prevent quirky rendering modes"
export const quirksMode = rule('quirks-mode', 'doctype', function (el, facts) {
  if (!isPage(el, facts) || document.compatMode !== 'BackCompat') return;
  return found(this, el, {}, { value: 'no doctype', advice: 'Start the document with <!DOCTYPE html>.' });
});
// "DO use semantic landmarks (<header>, <nav>, <main>, <aside>, <footer>)"
export const landmarkMain = rule('landmark-main', 'landmark', function (el, facts) {
  if (!isPage(el, facts) || document.querySelector('main, [role="main"]') || !loaded()) return;
  return found(this, el, {}, { value: 'no <main>', confidence: 0.85, advice: 'Wrap the page’s content, apart from its header and footer, in <main>.' });
});
// "DON'T use more than one banner, main, or contentinfo landmark per page" (main is the accessibility pack's)
const SECTIONING = 'article, aside, main, nav, section, [role="article"], [role="complementary"], [role="main"], [role="navigation"], [role="region"]';
export const bannerMany = rule('banner-many', 'landmark', function (el, facts) {
  const what = el.localName === 'header' || el.getAttribute('role') === 'banner' ? 'header' : el.localName === 'footer' || el.getAttribute('role') === 'contentinfo' ? 'footer' : null;
  if (!what || el.closest('dialog, [role="dialog"]')) return;
  const list = page(facts, `html/${what}s`, () => [...document.querySelectorAll(what === 'header' ? 'header, [role="banner"]' : 'footer, [role="contentinfo"]')]
    .filter((h) => (h.hasAttribute('role') || !h.parentElement.closest(SECTIONING)) && !h.closest('dialog, [role="dialog"]') && shown(h, facts)));
  if (list.length < 2 || list[1] !== el) return; // said once, on the second
  return found(this, el, { what, count: list.length }, { value: `${list.length} ${what}s`, advice: `Keep one page ${what}; put the other inside the <section> or <article> it belongs to.` });
});
// "DO use a single <h1> per page/view representing the main topic"
export const h1Missing = rule('h1-missing', 'heading', function (el, facts) {
  if (!isPage(el, facts) || document.querySelector('h1, [role="heading"][aria-level="1"]') || !loaded()) return;
  if (!document.querySelector('h2, h3, h4')) return; // a page with no headings at all is an app surface, judged elsewhere
  return found(this, el, {}, { value: 'no <h1>', confidence: 0.85, advice: 'Make the page’s title an <h1>.' });
});
// "DO use <ul>, <ol>, and <dl> elements for list content"
const BULLET = /^\s*([•·▪●○◦‣*–-]|\d{1,2}[.)])\s+\S/;
export const listFake = rule('list-fake', 'list', function (el, facts) {
  if (el.children.length < 3 || /^(?:ul|ol|dl|menu|select|table|tbody|tr|pre|code)$/.test(el.localName) || el.closest('pre, code, [contenteditable]')) return;
  const lines = [...el.children].filter((c) => /^(?:div|p|span)$/.test(c.localName) && BULLET.test(c.textContent));
  if (lines.length < 3 || lines.length < el.children.length * 0.6 || !shown(el, facts)) return;
  const mark = BULLET.exec(lines[0].textContent)[1];
  return found(this, el, { count: lines.length, mark }, { value: `${lines.length} lines`, confidence: 0.85, advice: /\d/.test(mark) ? 'Make it an <ol> with one <li> a line; the numbers come free.' : 'Make it a <ul> with one <li> a line and draw the mark with ::marker.' });
});
export const listStructure = rule('list-structure', 'list', function (el, facts) {
  const tag = el.localName;
  if (tag !== 'li' && tag !== 'dt' && tag !== 'dd') return;
  const parent = el.parentElement;
  if (!parent || el.getAttribute('role')) return;
  if (tag === 'li' ? /^(?:ul|ol|menu)$/.test(parent.localName) || /^(?:list|menu|menubar|tablist|listbox|tree|group|none|presentation)$/.test(parent.getAttribute('role') ?? '') : parent.localName === 'dl' || parent.parentElement?.localName === 'dl') return;
  if (!shown(el, facts)) return;
  return found(this, el, { tag, needs: tag === 'li' ? 'a <ul> or <ol>' : 'a <dl>' }, { value: `<${tag}> in <${parent.localName}>`, advice: `Wrap these in ${tag === 'li' ? '<ul> (or <ol>)' : '<dl>'}.` });
});
// "DON'T use generic <div> or <span> when semantic elements exist, for instance for interactive elements"
// The evidence a page gives: a hand cursor set on a plain element that nothing makes a control.
export const pointerGeneric = rule('pointer-generic', 'role', function (el, facts) {
  if (!/^(?:div|span|li|td|tr|img|svg|p|section|article)$/.test(el.localName) || el.closest(PRESSABLE)) return;
  if (facts.style(el).cursor !== 'pointer' || !shown(el, facts)) return;
  // the cursor is inherited: said where it is set, not on everything inside
  if (el.parentElement && facts.style(el.parentElement).cursor === 'pointer') return;
  // a card whose whole face is its link (the link stretched over it) has a real control doing the work
  if (el.querySelector('a[href], button, input, select, textarea, [role="button"], [role="link"]')) return;
  return found(this, el, { tag: el.localName }, { value: 'cursor: pointer', confidence: 0.8, advice: 'Make it a <button type="button"> (or an <a href> if it goes somewhere).' });
});
// "DO use <button> for triggered actions … and <a> strictly for URL navigation"
export const linkAsButton = rule('link-as-button', 'role', function (el, facts) {
  if (el.localName !== 'a' || el.getAttribute('role') || !shown(el, facts)) return;
  const href = el.getAttribute('href');
  if (href === null) { if (!trimmed(el.textContent) || facts.style(el).cursor !== 'pointer') return; } // a placeholder link with no hand is the current page in a trail
  else if (href !== '#' && href !== '' && !/^javascript:/i.test(href)) return;
  return found(this, el, { href: href ?? '' }, { value: href === null ? 'no href' : `href="${href.slice(0, 30)}"`, confidence: 0.85, advice: 'Use <button type="button"> for an action; a link needs an address to go to.' });
});
// "DON'T use boolean attributes with redundant values (e.g., use disabled, not disabled="disabled")"
const BOOLEANS = ['disabled', 'checked', 'required', 'readonly', 'hidden', 'selected', 'multiple', 'open', 'autofocus', 'inert', 'controls', 'loop', 'muted', 'autoplay'];
export const booleanValue = rule('boolean-value', 'attribute', function (el, facts) {
  const attr = BOOLEANS.find((a) => el.getAttribute(a) === a);
  if (!attr || !drawn(el, facts)) return;
  return found(this, el, { attr }, { value: `${attr}="${attr}"`, confidence: 0.85, advice: `Write ${attr} with no value.` });
});

// ── §2 grouping ─────────────────────────────────────────────
// "DO use <figcaption> as the first or last child of a <figure>" / "DON'T use <figure> for every single image"
export const figureCaption = rule('figure-caption', 'caption', function (el, facts) {
  if (el.localName !== 'figure' || named(el) || !shown(el, facts)) return;
  const caption = el.querySelector(':scope > figcaption');
  if (caption && (caption === el.firstElementChild || caption === el.lastElementChild)) return;
  if (!caption && el.querySelector('figcaption')) return; // wrapped once more: a layout's doing, still read
  return found(this, el, { where: !!caption }, { value: caption ? 'figcaption in the middle' : 'no figcaption', confidence: 0.8, advice: caption ? 'Move the <figcaption> to be the first or last child.' : 'Add a <figcaption>, or drop the <figure> around the image.' });
});
// "DON'T use <pre> without <code> for code blocks"
export const preNoCode = rule('pre-no-code', 'code', function (el, facts) {
  if (el.localName !== 'pre' || el.querySelector('code') || el.closest('code') || !shown(el, facts)) return;
  const cls = typeof el.className === 'string' ? el.className : '';
  if (!/\b(?:language-|lang-|hljs|shiki|prism|code)/i.test(cls) && !/[{};]\s*$|=>|<\/\w+>|^\s*(?:import|const|function|def|class|\$ )\b/m.test(el.textContent)) return;
  return found(this, el, {}, { value: '<pre>', confidence: 0.8, advice: 'Wrap its contents in <code>.' });
});
// "adding tabindex="0" to the <pre> element if it becomes scrollable, allowing keyboard users to reach the content"
const scrollsSideways = (el, facts) => el.scrollWidth > el.clientWidth + 1 && /auto|scroll/.test(facts.style(el).overflowX);
export const preScrollKeyboard = rule('pre-scroll-keyboard', 'tabindex', function (el, facts) {
  if (el.localName !== 'pre' || el.hasAttribute('tabindex') || !shown(el, facts) || !scrollsSideways(el, facts)) return;
  if (el.querySelector('a[href], button, [tabindex]') || el.parentElement?.closest('[tabindex]')) return;
  return found(this, el, {}, { value: 'no tabindex', confidence: 0.85, advice: 'Add tabindex="0", role="region" and an aria-label.' });
});
// "adding role="region" to the <pre>, along with an accessible name"
export const preScrollRegion = rule('pre-scroll-region', 'name', function (el, facts) {
  if (el.localName !== 'pre' || el.getAttribute('tabindex') !== '0' || el.getAttribute('role') && named(el) || !shown(el, facts)) return;
  return found(this, el, {}, { value: 'tabindex="0"', confidence: 0.8, advice: 'Add role="region" and an aria-label ("Code example").' });
});

// ── §3 images and priority ──────────────────────────────────
const big = (r) => r.width >= 100 && r.height >= 100;
// "DO specify width and height on all <img> tags to preserve aspect ratio and prevent Layout Shifts"
export const imgSize = rule('img-size', 'size', function (el, facts) {
  if (el.localName !== 'img' || el.hasAttribute('width') && el.hasAttribute('height') || !shown(el, facts)) return;
  const s = facts.style(el), r = facts.rect(el);
  // room is kept another way: an aspect-ratio, a box it fills, or an image small enough that nothing moves
  if (s.aspectRatio !== 'auto' || s.position === 'absolute' || s.position === 'fixed' || !big(r) || /^data:/.test(el.currentSrc || el.src)) return;
  const box = el.parentElement && facts.style(el.parentElement);
  if (box && (box.aspectRatio !== 'auto' || s.objectFit === 'cover' && s.height !== 'auto' && el.style.height !== '')) return;
  if (s.objectFit === 'cover' || s.objectFit === 'contain') return; // fitted into a box whose size the layout sets
  return found(this, el, {}, { value: 'no width / height', confidence: 0.8, advice: `Add width="${el.naturalWidth || Math.round(r.width)}" height="${el.naturalHeight || Math.round(r.height)}" (the file’s own size); CSS can still resize it.` });
});
// "DON'T apply loading="lazy" to above-the-fold or hero images. This delays LCP"
export const lazyAboveFold = rule('lazy-above-fold', 'loading', function (el, facts) {
  if (el.localName !== 'img' || el.getAttribute('loading') !== 'lazy' || !shown(el, facts)) return;
  const r = facts.rect(el);
  if (!big(r) || pageTop(r) >= fold() * 0.9 || r.left >= window.innerWidth || r.right <= 0) return;
  return found(this, el, {}, { value: 'loading="lazy"', confidence: 0.85, advice: 'Remove loading="lazy" from images on the first screen.' });
});
// "DO apply loading="lazy" to off-screen images and iframes to defer bandwidth"
export const eagerBelowFold = rule('eager-below-fold', 'loading', function (el, facts) {
  if (el.localName !== 'img' && el.localName !== 'iframe' || el.getAttribute('loading') === 'lazy' || !shown(el, facts)) return;
  const r = facts.rect(el), screens = Math.floor(pageTop(r) / fold());
  if (!big(r) || screens < 2 || /^data:/.test(el.currentSrc || el.src || '') || el.localName === 'iframe' && !el.src) return;
  return found(this, el, { what: el.localName === 'img' ? 'image' : 'frame', screens }, { value: 'no loading', confidence: 0.8, advice: 'Add loading="lazy".' });
});
// "DON'T overuse fetchpriority="high"; prioritization is a zero-sum mechanism"
export const fetchpriorityOverused = rule('fetchpriority-overused', 'priority', function (el, facts) {
  if (el.localName !== 'img' || el.getAttribute('fetchpriority') !== 'high') return;
  const list = page(facts, 'html/high', () => [...document.querySelectorAll('img[fetchpriority="high"]')]);
  if (list.length < 3 || list[0] !== el || !drawn(el, facts)) return; // said once, on the first
  return found(this, el, { count: list.length }, { value: `${list.length} high`, advice: 'Keep fetchpriority="high" on the one image that is the first screen’s largest.' });
});
// "DO use fetchpriority="high" for the Largest Contentful Paint (LCP) element (e.g., hero image)"
export const heroPriority = rule('hero-priority', 'priority', function (el, facts) {
  if (el.localName !== 'img' || el.hasAttribute('fetchpriority') || !shown(el, facts)) return;
  const hero = page(facts, 'html/hero', () => {
    let best = null, area = window.innerWidth * fold() * 0.2; // a hero covers a fifth of the first screen or more
    for (const img of document.querySelectorAll('img')) { const r = facts.rect(img), a = r.width * Math.max(0, Math.min(r.bottom + window.scrollY, fold()) - Math.max(pageTop(r), 0)); if (a > area) { area = a; best = img; } }
    return best;
  });
  if (hero !== el || document.querySelector('img[fetchpriority="high"], link[rel="preload"][as="image"]')) return;
  return found(this, el, {}, { value: 'no fetchpriority', confidence: 0.8, advice: 'Add fetchpriority="high".' });
});
// "DO use the srcset attribute on <img>s for adding multiple versions of the same image at different sizes"
export const imgOversized = rule('img-oversized', 'srcset', function (el, facts) {
  if (el.localName !== 'img' || el.hasAttribute('srcset') || el.closest('picture') || !el.naturalWidth || !shown(el, facts)) return;
  const r = facts.rect(el), shownAt = Math.round(r.width), needs = r.width * Math.max(1, window.devicePixelRatio || 1);
  if (el.naturalWidth < 800 || el.naturalWidth < needs * 2.5 || /\.svg(?:\?|$)|^data:/.test(el.currentSrc || el.src)) return;
  return found(this, el, { natural: el.naturalWidth, shown: shownAt }, { value: `${el.naturalWidth}px → ${shownAt}px`, confidence: 0.8, advice: `Serve a ${Math.round(needs * 2 / 100) * 100}px version here, with srcset and sizes for the larger ones.` });
});
// "DO use the <picture> element with a fallback <img>"
export const pictureImg = rule('picture-img', 'image', function (el, facts) {
  if (el.localName !== 'picture' || el.querySelector('img')) return;
  return found(this, el, {}, { value: '<picture>', advice: 'Add an <img> as its last child.' });
});

// ── §5 disclosures, titles ──────────────────────────────────
// "DO place <summary> as the first child of <details>"
export const summaryFirst = rule('summary-first', 'summary', function (el, facts) {
  if (el.localName !== 'details' || el.firstElementChild?.localName === 'summary' || !shown(el, facts)) return;
  const none = !el.querySelector(':scope > summary');
  return found(this, el, { none }, { value: none ? 'no <summary>' : 'summary not first', advice: none ? 'Add a <summary> as its first child.' : 'Move the <summary> to be the first child.' });
});
// "DON'T nest other interactive elements (links, buttons) directly inside <summary>"
export const summaryNestedControl = rule('summary-nested-control', 'nesting', function (el, facts) {
  if (el.localName !== 'summary') return;
  const inner = el.querySelector('a[href], button, input, select, textarea');
  if (!inner || !shown(el, facts)) return;
  return found(this, el, { tag: inner.localName }, { value: `<${inner.localName}> in <summary>`, advice: 'Move it out of the <summary>, beside the <details>.' });
});
// "DON'T hide visible triangles via list-style: none without providing explicit directional cues"
export const summaryNoCue = rule('summary-no-cue', 'marker', function (el, facts) {
  if (el.localName !== 'summary' || !shown(el, facts)) return;
  const s = facts.style(el);
  if (s.display === 'list-item' && s.listStyleType !== 'none') return;
  // a summary that can't be pressed (pointer-events: none: kept open at this width) has nothing to cue
  if (s.pointerEvents === 'none') return;
  if (el.querySelector('svg, img, [class*="icon" i], [class*="chevron" i], [class*="arrow" i]')) return;
  const drawnBy = (pseudo) => { const c = getComputedStyle(el, pseudo).content; return c && c !== 'none' && c !== 'normal'; };
  if (drawnBy('::before') || drawnBy('::after') || drawnBy('::marker') && s.display === 'list-item') return;
  return found(this, el, {}, { value: s.display === 'list-item' ? 'list-style: none' : `display: ${s.display}`, confidence: 0.8, advice: 'Draw an arrow with summary::after and turn it with details[open].' });
});
// "DON'T use the title attribute to create tooltip effects, as these cannot be accessed using a keyboard"
export const titleTooltip = rule('title-tooltip', 'title', function (el, facts) {
  if (!el.hasAttribute('title') || /^(?:iframe|abbr|link|style|svg|title)$/.test(el.localName) || el.ownerSVGElement) return;
  const title = trimmed(el.getAttribute('title'));
  if (!title || hiddenFromAT(el) || !drawn(el, facts)) return;
  // the same words as are shown (a cut-off line's full text) or as its name tell nobody anything new
  const said = `${trimmed(el.textContent)} ${trimmed(el.getAttribute('aria-label'))} ${trimmed(el.getAttribute('alt'))}`.toLowerCase();
  if (said.includes(title.toLowerCase()) || !said.trim() && el.matches('a[href], button, input')) return; // (a control named only by title is the accessibility pack’s)
  return found(this, el, { title: title.slice(0, 40) }, { value: `title="${title.slice(0, 40)}"`, confidence: 0.8, advice: 'Show it in the page, or in a tooltip that also opens on focus.' });
});

// ── §8 media ────────────────────────────────────────────────
const isBackground = (v) => v.autoplay && v.muted && v.loop;
// "DO set width and height to prevent layout shifts (CLS) on <video> elements"
export const videoSize = rule('video-size', 'size', function (el, facts) {
  if (el.localName !== 'video' || el.hasAttribute('width') && el.hasAttribute('height') || !shown(el, facts)) return;
  const s = facts.style(el);
  if (s.aspectRatio !== 'auto' || s.position === 'absolute' || s.position === 'fixed' || s.objectFit === 'cover' || el.parentElement && facts.style(el.parentElement).aspectRatio !== 'auto') return;
  return found(this, el, {}, { value: 'no width / height', confidence: 0.8, advice: 'Add width and height (the video’s own size), or an aspect-ratio in CSS.' });
});
// "DO provide a poster image fallback for videos"
export const videoPoster = rule('video-poster', 'poster', function (el, facts) {
  if (el.localName !== 'video' || el.hasAttribute('poster') || el.autoplay || !shown(el, facts)) return;
  return found(this, el, {}, { value: 'no poster', confidence: 0.8, advice: 'Add poster with a frame that says what the video is.' });
});
// "DO include subtitles and captions with <track>"
export const videoCaptions = rule('video-captions', 'captions', function (el, facts) {
  if (el.localName !== 'video' || !el.controls || el.muted || isBackground(el) || el.querySelector('track[kind="captions"], track[kind="subtitles"]') || !shown(el, facts)) return;
  return found(this, el, {}, { value: 'no <track>', confidence: 0.8, advice: 'Add <track kind="captions" src="…vtt" srclang="en" label="English">.' });
});
// "DO ensure background videos are muted … and use role="none" or aria-hidden="true". The controls attribute must also be omitted"
export const backgroundVideo = rule('background-video', 'hidden', function (el, facts) {
  if (el.localName !== 'video' || !isBackground(el) || !drawn(el, facts)) return;
  const why = el.controls ? 'controls' : el.closest('[aria-hidden="true"]') || /^(?:none|presentation)$/.test(el.getAttribute('role') ?? '') ? null : 'exposed';
  if (!why) return;
  return found(this, el, { why }, { value: why === 'controls' ? 'controls' : 'no aria-hidden', confidence: 0.85, advice: why === 'controls' ? 'Remove controls, and give people a pause button of your own.' : 'Add aria-hidden="true".' });
});
// "DON'T automatically play audio when a page is opened"
export const autoplaySound = rule('autoplay-sound', 'autoplay', function (el, facts) {
  if (el.localName !== 'video' && el.localName !== 'audio' || !el.autoplay || el.muted) return;
  if (el.localName === 'video' && !drawn(el, facts)) return;
  return found(this, el, { tag: el.localName }, { value: 'autoplay', advice: 'Add muted, or start it when someone presses play.' });
});
// "DON'T apply role="none" or aria-hidden="true" to focusable elements (such as embedded interactive <iframe> components)"
export const iframeHidden = rule('iframe-hidden', 'hidden', function (el, facts) {
  if (el.localName !== 'iframe' || el.getAttribute('tabindex') === '-1' || el.closest('[inert]') || !drawn(el, facts)) return;
  if (!el.closest('[aria-hidden="true"]') && !/^(?:none|presentation)$/.test(el.getAttribute('role') ?? '')) return;
  return found(this, el, {}, { value: el.getAttribute('role') ? `role="${el.getAttribute('role')}"` : 'aria-hidden="true"', advice: 'Give it a title and let it be read, or add tabindex="-1" and inert if it is decoration.' });
});

// ── §9 interactivity ────────────────────────────────────────
// "DON'T use inline event handlers (e.g., onclick). Trigger actions using addEventListener()" (in a form it is the forms pack's)
export const inlineHandler = rule('inline-handler', 'script', function (el, facts) {
  if (el.attributes.length < 1 || el.closest('form')) return;
  let attr = null;
  for (const a of el.attributes) if (a.name.length > 2 && a.name.startsWith('on') && /^on[a-z]+$/.test(a.name)) { attr = a.name; break; }
  if (!attr || !drawn(el, facts)) return;
  return found(this, el, { attr }, { value: attr, confidence: 0.85, advice: 'Attach it with addEventListener from a script file.' });
});

for (const r of [pageLang, viewportMeta, zoomDisabled, quirksMode, landmarkMain, h1Missing]) pageWide(r);
export const HTML_RULES = [pageLang, viewportMeta, zoomDisabled, quirksMode, landmarkMain, bannerMany, h1Missing, listFake, listStructure, pointerGeneric, linkAsButton, booleanValue,
  figureCaption, preNoCode, preScrollKeyboard, preScrollRegion, imgSize, lazyAboveFold, eagerBelowFold, fetchpriorityOverused, heroPriority, imgOversized, pictureImg,
  summaryFirst, summaryNestedControl, summaryNoCue, titleTooltip, videoSize, videoPoster, videoCaptions, backgroundVideo, autoplaySound, iframeHidden, inlineHandler];

// what each rule is about (kinds.js): where the engine asks it. No narrower than the rule's own first test; a rule not
// listed is asked about every element.
const ON = {
  'banner-many': 'header,footer,[role="banner"],[role="contentinfo"]',
  'list-structure': 'li,dt,dd',
  'pointer-generic': 'div,span,li,td,tr,img,svg,p,section,article',
  'link-as-button': 'a',
  'boolean-value': '[disabled],[checked],[required],[readonly],[hidden],[selected],[multiple],[open],[autofocus],[inert],[controls],[loop],[muted],[autoplay]',
  'figure-caption': 'figure',
  'pre-no-code': 'pre',
  'pre-scroll-keyboard': 'pre',
  'pre-scroll-region': 'pre',
  'img-size': 'img',
  'lazy-above-fold': 'img',
  'eager-below-fold': 'img,iframe',
  'fetchpriority-overused': 'img',
  'hero-priority': 'img',
  'img-oversized': 'img',
  'picture-img': 'picture',
  'summary-first': 'details',
  'summary-nested-control': 'summary',
  'summary-no-cue': 'summary',
  'title-tooltip': '[title]',
  'video-size': 'video',
  'video-poster': 'video',
  'video-captions': 'video',
  'background-video': 'video',
  'autoplay-sound': 'video,audio',
  'iframe-hidden': 'iframe',
  'inline-handler': '[on*]',
};
for (const r of HTML_RULES) { const on = ON[r.id.split('/')[1]]; if (on) r.on = on; }
