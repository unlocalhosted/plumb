/* ─────────────────────────────────────────────────────────
 * TELLS RULES · React Plumber overlay
 *
 * The tells pack's rules (pack-tells.js says what the pack is and where each rule comes from): the marks of a
 * generated screen, read off the drawn page. The same rule object craft uses: it reads, never writes, and says
 * nothing when its evidence is ambiguous. What a rule cannot know from the page (whether a badge or a dot is bound to
 * real state, whether numbered cards have a real order) makes it advisory, never silent about the doubt.
 * ───────────────────────────────────────────────────────── */
import { say } from './words.js';
import { trimmed, hiddenFromAT, drawn } from './a11y-rules.js';
import { rgb } from './craft-read.js';
import { TELLS } from './pack-tells.js';

const found = (rule, el, n, { value = el.localName, confidence = 0.8, advice }) => [{
  ...say(rule.id, n), key: rule.id, text: el.localName, props: [], value, n: 0,
  evidence: n, confidence, guide: TELLS.guides[rule.id.split('/')[1]], suggest: { kind: 'advice', text: advice },
}];
const rule = (short, owns, on, check) => ({ id: `tells/${short}`, family: 'craft', owns: [owns], once: 'ancestor', reads: ['rect', 'style'], ...(on ? { on } : {}),
  check({ el, facts }) { return on && !el.matches(on) ? [] : check.call(this, el, facts) ?? []; } });

const shown = (el, facts) => drawn(el, facts) && !hiddenFromAT(el);
// the words an element holds itself, not those of what is inside it
const ownText = (el) => { let t = ''; for (const n of el.childNodes) if (n.nodeType === 3) t += n.nodeValue; return trimmed(t); };
const wordsIn = (t) => t.split(' ').filter((w) => /\p{L}{2}/u.test(w)).length;
const px = (v) => parseFloat(v) || 0;
const quote = (t, n = 40) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);
const CODE = 'pre, code, kbd, samp, textarea, input, [contenteditable="true"], svg';
const CONTROL = 'button, a, [role="button"], [role="link"], [role="tab"], [role="menuitem"], [role="option"], select, option, label, summary';
const TEXT = 'p,div,span,li,td,dd,dt,blockquote,label,a,button,h1,h2,h3,h4,h5,h6,small,strong,em,figcaption,caption,legend,summary';
const HEADING = 'h1,h2,h3,h4';

// sRGB → OKLab (Björn Ottosson), for chroma and hue
function lab([r, g, b]) {
  const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const [R, G, B] = [lin(r), lin(g), lin(b)];
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B), m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B), q = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * q, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * q, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * q];
}
// a colour's chroma and hue in OKLCH, or null when it cannot be read or is see-through
function lch(s, minAlpha = 0.15) {
  const c = rgb(s);
  if (!c || (c[3] ?? 1) < minAlpha) return null;
  const [L, A, B] = lab(c);
  return { L, C: Math.hypot(A, B), h: ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360 };
}
const hueGap = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };
// the colours named in a computed background-image or shadow, in order
const coloursIn = (s) => String(s).match(/(?:rgba?|oklch|oklab|color)\([^()]*\)/g) ?? [];

// What reads as the heading of el's part: the next element in reading order, if it is a heading or opens with one.
// Walks out of a wrapper el is the last thing in (a pill around the label), at most two levels.
function headingAfter(el, facts) {
  for (let n = el, up = 0; n && up < 3; n = n.parentElement, up++) {
    let next = n.nextElementSibling;
    while (next && !drawn(next, facts)) next = next.nextElementSibling;
    if (!next) continue;
    const h = next.matches(HEADING) ? next : next.firstElementChild?.matches(HEADING) ? next.firstElementChild : null;
    return h;
  }
  return null;
}

// ── words ───────────────────────────────────────────────────
// U1: small capitals, spaced out, right above a bigger heading. A table header, a key cap and a control are not it.
export const eyebrow = rule('eyebrow', 'case', 'p,div,span,small,strong,em,h5,h6,dt', function (el, facts) {
  const s = facts.style(el);
  if (s.textTransform !== 'uppercase') return;
  const text = trimmed(el.textContent);
  if (!text || wordsIn(text) > 6 || text.length > 48 || el.closest(`th, ${CONTROL}, ${CODE}, nav, [role="navigation"], table, thead`)) return;
  // the label is the innermost element that holds the words: a pill around it is the same label
  if ([...el.children].some((k) => trimmed(k.textContent) === text && facts.style(k).textTransform === 'uppercase')) return;
  const size = px(s.fontSize), tracking = s.letterSpacing === 'normal' ? 0 : px(s.letterSpacing);
  if (!(tracking >= size * 0.04) || !shown(el, facts)) return;
  const h = headingAfter(el, facts);
  if (!h || px(facts.style(h).fontSize) < size * 1.4 || !shown(h, facts)) return;
  return found(this, el, { text: quote(text) }, { value: quote(text), confidence: 0.85, advice: 'Delete the label. If the heading needs it to make sense, rewrite the heading.' });
});

// U2: "01", "02.", "03 //" standing alone as an element's words, or "//" used as an ornament. A real sequence (an
// ordered list, steps marked as steps) is left alone; a sequence the page does not mark gets an advisory.
const PADDED = /^0[1-9](?:\s*(?:\.|\/\/|—|–|-|\/))?$|^0[1-9]\s*\/\/\s*\S/;
export const numbering = rule('numbering', 'text', TEXT, function (el, facts) {
  const text = ownText(el);
  if (!text || !PADDED.test(text) || el.closest(`ol, ${CODE}, time, table, [aria-current="step"], [role="progressbar"]`)) return;
  if (el.closest('[aria-label], [aria-labelledby]')?.matches('[aria-label*="step" i], [aria-label*="progress" i]')) return;
  if (!shown(el, facts)) return;
  return found(this, el, { text }, { value: text, confidence: 0.8, advice: 'Delete the number, unless people really follow these in order. Then use a numbered list.' });
});

// U6: three or more facts joined by dots or bars in one line. Links joined that way (a footer, a breadcrumb) are a
// row of links, not a status.
const SEPARATORS = /\s[·•|]\s|·|•/g;
export const statusChain = rule('status-chain', 'text', 'p,div,span,small,li,dd,figcaption', function (el, facts) {
  const text = trimmed(el.textContent);
  if (text.length > 160 || el.closest(`nav, footer, [aria-label*="breadcrumb" i], ${CODE}, ${CONTROL}, table`)) return;
  const count = (text.match(SEPARATORS) ?? []).length;
  if (count < 2 || el.querySelectorAll('a').length >= 2) return;
  // said once, on the innermost element that holds the whole chain
  if ([...el.children].some((k) => (trimmed(k.textContent).match(SEPARATORS) ?? []).length >= count)) return;
  if (facts.rect(el).height > px(facts.style(el).lineHeight === 'normal' ? px(facts.style(el).fontSize) * 1.4 : facts.style(el).lineHeight) * 2.2 || !shown(el, facts)) return;
  return found(this, el, { count: count + 1 }, { value: quote(text, 60), confidence: 0.8, advice: 'Keep the one fact people act on. Move the others to where they matter, or drop them.' });
});

// U9: a flavour word set as a badge: a small rounded fill or outline holding only that word, outside a control.
const BADGE_WORD = /^(?:new|live|beta|ai|pro|hot|popular|most popular|coming soon|featured|trending|ai-powered|powered by ai|✨\s*new|🔥\s*popular|🔥\s*hot)$/i;
export const flavourBadge = rule('flavour-badge', 'badge', 'span,div,small,sup,mark,p,strong,b', function (el, facts) {
  const text = trimmed(el.textContent);
  // a heading that is only the word is a title, not a badge; a pill inside a heading is a badge
  if (!BADGE_WORD.test(text) || el.matches('h1,h2,h3,h4,h5,h6') || el.closest(`${CONTROL}, ${CODE}, th, [role="status"]`)) return;
  // the badge is the box that draws the shape: this element or the one that holds only it
  const box = [el, el.parentElement].find((b) => b && trimmed(b.textContent) === text && badgeShaped(b, facts));
  if (!box || box !== el || !shown(el, facts)) return;
  return found(this, el, { text }, { value: text, confidence: 0.8, advice: 'Delete the badge, unless the app knows this is true for this item. Then show it only when it is.' });
});
function badgeShaped(el, facts) {
  const s = facts.style(el), r = facts.rect(el);
  if (r.height < 12 || r.height > 32 || r.width > 160) return false;
  const filled = (rgb(s.backgroundColor)?.[3] ?? 0) > 0.05 || px(s.borderTopWidth) > 0 || s.backgroundImage !== 'none';
  return filled && px(s.borderTopLeftRadius) >= Math.min(r.height / 4, 4);
}

// U10: a small round fill next to words: a "live" dot. One with a name (aria-label, title, a role) says what it
// shows to a screen reader and is taken as bound to something; one sitting on an avatar's corner is a presence dot.
// A small round fill with nothing in it, beside words: what it looks like, or null.
function dotOf(el, facts) {
  if (el.childElementCount || trimmed(el.textContent) || el.hasAttribute('aria-label') || el.hasAttribute('title') || el.matches('[role]')) return null;
  // its laid-out size, not its drawn one: a ping scales the dot to twice its size mid-beat
  const r = { width: el.offsetWidth ?? facts.rect(el).width, height: el.offsetHeight ?? facts.rect(el).height };
  if (r.width < 4 || r.width > 12 || Math.abs(r.width - r.height) > 1) return null;
  const s = facts.style(el);
  if (px(s.borderTopLeftRadius) < r.width / 2 - 0.5 || /absolute|fixed/.test(s.position)) return null;
  const fill = lch(s.backgroundColor, 0.3);
  if (!fill || el.closest(`${CONTROL}, [aria-busy="true"], [class*="skeleton" i], ${CODE}`)) return null;
  // beside words: the parent holds words other than the dot
  if (!trimmed(el.parentElement?.textContent ?? '') || !shown(el, facts)) return null;
  const moving = s.animationName !== 'none' && px(s.animationDuration) > 0;
  if (!moving && fill.C < 0.06) return null; // a grey dot is a separator, not a status
  return { moving, animation: s.animationName };
}
// U10: a small round fill next to words: a "live" dot. One with a name (aria-label, title, a role) says what it shows
// to a screen reader and is taken as bound to something; one on an avatar's corner is a presence dot. A pulsing dot
// is never judged itself (the engine leaves whatever loops alone, craft.js), so it is said on what holds it.
const DOT_ADVICE = 'Delete the dot, unless a real status drives it. Then give it a name, like aria-label="Connected".';
export const statusDot = rule('status-dot', 'dot', 'span,div,i,b,small,p,li,a,header,article,section,strong', function (el, facts) {
  const self = el.matches('span,div,i,b,small') ? dotOf(el, facts) : null;
  if (self && !self.moving) return found(this, el, { moving: false }, { value: 'dot', confidence: 0.8, advice: DOT_ADVICE });
  for (const kid of el.children) {
    const dot = dotOf(kid, facts);
    if (dot?.moving) return found(this, el, { moving: true }, { value: `animation: ${dot.animation}`, confidence: 0.85, advice: DOT_ADVICE });
  }
});

// U11: a pictograph in a heading, a control, a label or a list item. Ticks, crosses and the trade marks are values,
// not decoration.
const EMOJI = /(?![©®™✓-✘←-⇿■-◿•])\p{Extended_Pictographic}/u;
export const emoji = rule('emoji', 'text', 'h1,h2,h3,h4,h5,h6,button,a,label,li,dt,th,summary,legend,[role="button"],[role="tab"],[role="menuitem"]', function (el, facts) {
  const text = el.textContent;
  const m = text.match(EMOJI);
  if (!m || el.closest(CODE) || !trimmed(text.replace(new RegExp(EMOJI.source, 'gu'), ''))) return; // an emoji alone is the control's face
  // said once, on the innermost heading, control or item that holds it
  if (el.querySelector('h1,h2,h3,h4,h5,h6,button,a,label,li,dt,th,summary,legend,[role="button"],[role="tab"],[role="menuitem"]')?.textContent.match(EMOJI)) return;
  if (!shown(el, facts)) return;
  return found(this, el, { emoji: m[0] }, { value: m[0], confidence: 0.8, advice: 'Delete the emoji. Keep an icon only where it is the control itself.' });
});

// U11: an icon in a tinted, rounded square, sitting above or beside the words of an item. An icon button, an avatar
// (a photo or initials) and a tile that holds words are not it.
export const iconTile = rule('icon-tile', 'icon', 'div,span', function (el, facts) {
  if (trimmed(el.textContent) || el.childElementCount !== 1 || (el.closest(CONTROL) && !trimmed(el.closest(CONTROL).textContent))) return;
  const icon = el.firstElementChild;
  if (!icon.matches('svg, i, img[src$=".svg"]')) return;
  const r = facts.rect(el), ir = facts.rect(icon);
  if (r.width < 28 || r.width > 64 || Math.abs(r.width - r.height) > 2 || ir.width > r.width * 0.75) return;
  const s = facts.style(el), fill = lch(s.backgroundColor) ?? lch(coloursIn(s.backgroundImage)[0] ?? '');
  if (!fill || fill.C < 0.015 || px(s.borderTopLeftRadius) < 6) return; // a pastel tint (sky-100 is 0.026) counts; a grey one has almost none
  // beside words: the tile's parent holds words, so it decorates an item rather than standing as a picture
  if (!trimmed(el.parentElement?.textContent ?? '') || !shown(el, facts)) return;
  return found(this, el, {}, { value: 'tinted tile', confidence: 0.8, advice: 'Delete the tile and its icon. If the icon says something the name does not, keep it plain beside the name.' });
});

// U12: a title that says what kind of chart it is
const CHART_TYPE = /\b(bar|line|pie|area|scatter|donut|column) (chart|graph|plot) (?:of|showing|for)\b/i;
export const chartTypeTitle = rule('chart-type-title', 'text', 'h1,h2,h3,h4,h5,h6,figcaption,caption,p,div,span,text,title', function (el, facts) {
  const m = ownText(el).match(CHART_TYPE);
  if (!m || el.closest(CODE.replace(', svg', '')) || !shown(el, facts)) return;
  return found(this, el, { kind: `${m[1].toLowerCase()} ${m[2].toLowerCase()}` }, { value: quote(ownText(el)), confidence: 0.85, advice: 'Name what it measures, like "Monthly revenue".' });
});

// U13: words that tell people how to read a chart or a table
const READING = /\beach (?:bar|point|dot|line|slice|column|row|square|cell) (?:represents|shows|is)\b|\bhover (?:over (?:a|any|each|the)|for (?:more )?details|to see)\b/i;
export const readingInstructions = rule('reading-instructions', 'text', TEXT, function (el, facts) {
  const m = ownText(el).match(READING);
  if (!m || el.closest(`${CODE}, [role="tooltip"]`) || !shown(el, facts)) return;
  return found(this, el, { phrase: m[0] }, { value: quote(ownText(el)), confidence: 0.85, advice: 'Delete it.' });
});

// U4, the part a phrase settles: words that say what the screen visibly does
const NARRATING = /\b(?:click (?:the|on the) (?:button|link) (?:below|above)|(?:use|fill (?:in|out)) the form below|th(?:is|e) (?:chart|graph|table|section|page|panel|card|list|dashboard) (?:below |above )?(?:shows|displays|lists|contains|presents|gives you)|below (?:you(?:'|’)ll|you will) find|here(?:'|’)s (?:a|an) (?:overview|summary|quick look))\b/i;
export const narrating = rule('narrating', 'sentence', TEXT, function (el, facts) {
  const m = ownText(el).match(NARRATING);
  if (!m || el.closest(`${CODE}, [role="alert"], [role="alertdialog"]`) || !shown(el, facts)) return;
  return found(this, el, { phrase: m[0] }, { value: quote(ownText(el)), confidence: 0.8, advice: 'Delete it. Keep words that say what to do or what happened.' });
});

// U3: the line right under a heading. Whether it says anything the heading does not is a question of meaning, so
// the page only finds the pair; the CLI asks a model (pack-tells.js, MEANING_RULES) and says nothing without one.
export const subtitleEcho = rule('subtitle-echo', 'subtitle', 'h1,h2,h3,h4', function (el, facts) {
  const heading = trimmed(el.textContent);
  if (!heading || heading.length > 80 || el.closest(`${CODE}, ${CONTROL}, nav, table`)) return;
  let next = el.nextElementSibling;
  while (next && !drawn(next, facts)) next = next.nextElementSibling;
  if (!next || !next.matches('p, div, span, small') || next.querySelector('a, button, input, select, textarea, h1, h2, h3, h4, h5, h6, img, svg')) return;
  const line = trimmed(next.textContent);
  if (!line || wordsIn(line) < 3 || wordsIn(line) > 25 || px(facts.style(next).fontSize) > px(facts.style(el).fontSize)) return;
  if (!shown(el, facts) || !shown(next, facts)) return;
  const out = found(this, next, { heading: quote(heading, 30), meaning: { heading, line } }, { value: quote(line, 60), confidence: 0.8, advice: 'Delete the line, or replace it with a fact the heading does not give.' });
  // named by its words, not its tag: rows drawn from one line of a list are told apart, so each pair is asked on its
  // own (the read keeps one finding per rule, text and place, craft-run.js)
  out[0].text = quote(line, 60);
  return out;
});

// pstack unslop 13: an em dash in the page's own words. A lone dash standing for an empty value is a table's way of
// saying "none".
export const emDash = rule('em-dash', 'punctuation', TEXT, function (el, facts) {
  const text = ownText(el);
  if (!text.includes('—') || /^[—\s]+$/.test(text) || el.closest(`${CODE}, blockquote, q, cite`)) return;
  const count = (text.match(/—/g) ?? []).length;
  if (!shown(el, facts)) return;
  return found(this, el, { count }, { value: quote(text), confidence: 0.8, advice: 'End the sentence there, or use a comma.' });
});

// pstack unslop 7 and 31: the stock words of generated product copy
const STOCK = /\b(seamless(?:ly)?|effortless(?:ly)?|supercharge[sd]?|empower(?:s|ing)?|elevate[sd]?|unlock(?:s|ing)?|delve|leverag(?:e|es|ing)|utiliz(?:e|es|ing)|next-generation|reimagined|cutting-edge|game-chang(?:er|ing)|revolutioni[sz](?:e|es|ing)|unleash(?:es|ing)?|streamline[sd]?|harness(?:es|ing)?|robust|pivotal|vibrant|testament|transformative)\b/i;
export const stockWords = rule('stock-words', 'wording', TEXT, function (el, facts) {
  const m = ownText(el).match(STOCK);
  if (!m || el.closest(CODE) || !shown(el, facts)) return;
  return found(this, el, { word: m[1].toLowerCase() }, { value: quote(ownText(el)), confidence: 0.8, advice: 'Say what it does in plain words, or cut the word.' });
});

// ── surface ─────────────────────────────────────────────────
// U17: a gradient whose colours are of different hues (a tone shift inside one hue is fine), on a surface or as the
// fill of words
export const hueGradient = rule('hue-gradient', 'background', null, function (el, facts) {
  const s = facts.style(el);
  if (!/gradient\(/.test(s.backgroundImage)) return;
  const stops = coloursIn(s.backgroundImage).map((c) => lch(c)).filter((c) => c && c.C >= 0.05);
  let widest = 0;
  for (let i = 0; i < stops.length; i++) for (let j = i + 1; j < stops.length; j++) widest = Math.max(widest, hueGap(stops[i].h, stops[j].h));
  if (widest < 40) return;
  const text = /text/.test(s.backgroundClip || s.webkitBackgroundClip || '') || /text/.test(s.getPropertyValue('-webkit-background-clip'));
  const r = facts.rect(el);
  // a sliver or a bar (a progress bar, a temperature range, a swatch): a gradient there carries a value
  const short = Math.min(r.width, r.height), long = Math.max(r.width, r.height);
  if (!text && (r.width * r.height < 400 || short < 12 || (short < 32 && long >= short * 6))) return;
  if (el.closest('canvas, [role="img"], picture') || !shown(el, facts)) return;
  return found(this, el, { text }, { value: 'background-image', confidence: 0.8, advice: text ? 'Fill the words with one solid colour.' : 'Use one solid colour, or a gradient within one hue.' });
});

// U17: a shadow with no offset, a wide blur and a coloured fill: a glow
export const glow = rule('glow', 'shadow', null, function (el, facts) {
  const s = facts.style(el);
  if (s.boxShadow === 'none' || !s.boxShadow) return;
  // each shadow: its colour, then its lengths
  for (const part of s.boxShadow.split(/,(?![^()]*\))/)) {
    if (/inset/.test(part)) continue;
    const colour = coloursIn(part)[0], c = colour && lch(colour, 0.2);
    const lengths = part.replace(colour ?? '', '').match(/-?[\d.]+px/g)?.map(px) ?? [];
    const [x = 0, y = 0, blur = 0] = lengths;
    if (!c || c.C < 0.08 || Math.abs(x) > 1 || Math.abs(y) > 2 || blur < 10) continue;
    if (el.closest(CODE) || !shown(el, facts)) return;
    // a focus ring is a glow on purpose, and only while focused
    if (el.matches(':focus-visible, :focus')) return;
    return found(this, el, { px: Math.round(blur) }, { value: 'box-shadow', confidence: 0.8, advice: 'Use a soft neutral shadow, like 0 1px 2px rgb(0 0 0 / 0.05), or a hairline border.' });
  }
});

// U20: transition: all on something that is drawn and has a duration
export const transitionAll = rule('transition-all', 'motion', null, function (el, facts) {
  const s = facts.style(el);
  if (!s.transitionProperty.split(',').some((p) => p.trim() === 'all')) return;
  if (!s.transitionDuration.split(',').some((d) => px(d) > 0) || el.closest(CODE) || !shown(el, facts)) return;
  return found(this, el, {}, { value: 'transition-property: all', confidence: 0.8, advice: 'Name the properties that should move, like transition-property: color, background-color.' });
});

// U20: a card that grows when the pointer is over it. Read from the page's own hover rules: a scale above 1.01 on
// something card-sized.
let hoverGrows = null, hoverPass = null;
function growRules() {
  const pass = document.styleSheets.length + ':' + document.querySelectorAll('style, link[rel="stylesheet"]').length;
  if (hoverGrows && hoverPass === pass) return hoverGrows;
  hoverPass = pass; hoverGrows = [];
  const scaleOf = (st) => {
    const raw = st.getPropertyValue('scale') || st.getPropertyValue('transform');
    const vars = st.getPropertyValue('--tw-scale-x');
    const v = /var\(--tw-scale/.test(raw) ? vars : raw;
    const m = String(v).match(/([\d.]+)(%)?/);
    if (!m) return 0;
    return m[2] ? parseFloat(m[1]) / 100 : /scale\(/.test(v) || /^\s*[\d.]+/.test(v) ? parseFloat(m[1]) : 0;
  };
  // Nested rules (Tailwind 4 writes `.hover\:scale-105 { &:hover { @media (hover: hover) { scale: … } } }`) carry
  // their parent's selector down: `&` is the parent, and the declarations may sit in a block with no selector.
  const read = (rules, sel = '', hover = false) => {
    for (const r of rules) {
      let here = sel, on = hover;
      if (r.selectorText) {
        here = r.selectorText.split(',').map((part) => (part.includes('&') ? part.replace(/&/g, sel || '') : sel ? `${sel} ${part}` : part).trim()).join(', ');
        on = hover || /:hover/.test(r.selectorText);
      }
      if (on && r.style && (r.selectorText || r.constructor?.name === 'CSSNestedDeclarations')) {
        const scale = scaleOf(r.style);
        // the element the hover is on: the selector with :hover taken out
        const base = here.replace(/:hover/g, '').trim();
        if (scale > 1.01 && base) hoverGrows.push({ selector: base, scale });
      }
      if (r.cssRules?.length) read(r.cssRules, here, on);
    }
  };
  for (const sheet of document.styleSheets) { try { read(sheet.cssRules); } catch { /* another origin's sheet cannot be read */ } }
  return hoverGrows;
}
export const hoverGrow = rule('hover-grow', 'hover', 'div,a,article,li,section,button', function (el, facts) {
  const r = facts.rect(el);
  if (r.width < 160 || r.height < 72) return; // a button or an icon may press and grow; a card should not
  const hit = growRules().find(({ selector }) => { try { return el.matches(selector); } catch { return false; } });
  if (!hit || !shown(el, facts)) return;
  return found(this, el, { scale: Math.round(hit.scale * 100) / 100 }, { value: `scale ${hit.scale}`, confidence: 0.8, advice: 'Drop the grow. Change the border, shadow or background on hover instead.' });
});

// U19: words set at 800 or 900
export const heavyWeight = rule('heavy-weight', 'font-weight', 'h1,h2,h3,h4,h5,h6,p,span,div,strong,b,a,button,li,dt,dd,label,small', function (el, facts) {
  const s = facts.style(el), weight = parseInt(s.fontWeight, 10);
  if (!(weight >= 800) || !ownText(el) || el.closest(CODE)) return;
  // said once, where the weight is set: a child that inherits it is the same choice
  if (el.parentElement && parseInt(facts.style(el.parentElement).fontWeight, 10) === weight && ownText(el.parentElement)) return;
  if (!shown(el, facts)) return;
  return found(this, el, { weight }, { value: `font-weight: ${weight}`, confidence: 0.8, advice: 'Use 600, and let size and colour carry the order.' });
});

export const TELLS_RULES = [eyebrow, numbering, statusChain, flavourBadge, statusDot, emoji, iconTile, chartTypeTitle, readingInstructions, narrating, subtitleEcho, emDash, stockWords,
  hueGradient, glow, transitionAll, hoverGrow, heavyWeight];
