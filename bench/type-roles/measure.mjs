// Every text element on crafting-ui as rendered, per route: computed type values, context, content shape, size
// relative to siblings and parent, class bundle and source place. Real Chromium over the live dev server.
//   PLUMBER_CHROMIUM=<chrome> node bench/type-roles/measure.mjs [http://localhost:5180] > bench/type-roles/measurements.json
import { chromium } from 'playwright';
const base = process.argv[2] ?? 'http://localhost:5180';
const seeds = ['/', '/motion', '/icons', '/how-its-made', '/assets', '/icons/concepts', '/interfaces', '/motion/primitives', '/motion/skills', '/motion/standards', '/motion/techniques', '/motion/techniques/multiplane-occlusion/vocabulary', '/motion/vocabulary', '/primitives', '/standards', '/stickers', '/workshop', '/workshop/craft-rules'];
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLUMBER_CHROMIUM || undefined });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
const seen = new Set(), queue = [...seeds], out = { base, routes: [], elements: [] };
while (queue.length && out.routes.length < 40) {
  const route = queue.shift();
  if (seen.has(route)) continue; seen.add(route);
  try { await page.goto(base + route, { waitUntil: 'networkidle', timeout: 60000 }); } catch (error) { out.routes.push({ route, error: error.message.slice(0, 120) }); continue; }
  await page.waitForTimeout(800);
  // expand what can be expanded, then scroll through so sections that mount on view do
  await page.evaluate(() => { for (const d of document.querySelectorAll('details')) d.open = true; });
  const expanders = await page.$$('[aria-expanded="false"]:not(a)');
  for (const el of expanders.slice(0, 40)) { try { await el.click({ timeout: 500 }); await page.waitForTimeout(80); } catch {} }
  const height = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < height; y += 600) { await page.evaluate((y) => window.scrollTo(0, y), y); await page.waitForTimeout(120); }
  await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(400);
  const result = await page.evaluate((route) => {
    const px = (v) => Math.round(parseFloat(v) * 100) / 100;
    const letters = (s) => /[\p{L}\p{N}]/u.test(s);
    const landmarks = (el) => { const out = []; for (let n = el.parentElement; n; n = n.parentElement) { const r = n.getAttribute('role'); const t = n.localName; if (['header', 'footer', 'nav', 'main', 'aside', 'article', 'section', 'dialog', 'figure', 'figcaption', 'table', 'thead', 'blockquote', 'button', 'a', 'li', 'dt', 'dd', 'label', 'summary', 'caption'].includes(t)) out.push(t); if (r && ['banner', 'contentinfo', 'navigation', 'main', 'complementary', 'dialog', 'listitem', 'tab', 'tablist', 'menu', 'menuitem', 'button', 'heading', 'note', 'status', 'tooltip'].includes(r)) out.push('role=' + r); } return out; };
    const nearestCard = (el) => { for (let n = el.parentElement; n; n = n.parentElement) { if (n.localName === 'li' || n.getAttribute('role') === 'listitem') return 'li'; if (n.localName === 'article') return 'article'; if (/\b(card|tile|panel|sheet|row|chip|pill|badge|tag|callout|note)\b/i.test(n.className ?? '')) return (n.className.match(/\b(card|tile|panel|sheet|row|chip|pill|badge|tag|callout|note)\b/i) ?? [])[0].toLowerCase(); } return null; };
    const stampOf = (el) => { for (let n = el; n; n = n.parentElement) { const s = n.getAttribute?.('data-plumb-source'); if (s) return { stamp: s.split('#')[0], own: n === el }; } return { stamp: null, own: false }; };
    const items = [];
    for (const el of document.body.querySelectorAll('*')) {
      if (el.closest('plumb-overlay') || ['script', 'style', 'noscript', 'svg', 'path'].includes(el.localName)) continue;
      const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.nodeValue).join(' ').replace(/\s+/g, ' ').trim();
      if (!letters(own)) continue;
      const rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) === 0) continue;
      const size = px(cs.fontSize), lh = cs.lineHeight === 'normal' ? null : px(cs.lineHeight), ls = cs.letterSpacing === 'normal' ? 0 : px(cs.letterSpacing);
      const parent = el.parentElement, parentSize = parent ? px(getComputedStyle(parent).fontSize) : null;
      const siblings = parent ? [...parent.children].filter((c) => c !== el && [...c.childNodes].some((n) => n.nodeType === 3 && letters(n.nodeValue))).map((c) => px(getComputedStyle(c).fontSize)) : [];
      const sib = siblings.length ? siblings.sort((a, b) => a - b)[Math.floor(siblings.length / 2)] : null;
      const text = own.length > 120 ? own.slice(0, 117) + '…' : own;
      const shape = /^[\d.,%:+\-–—×\s/]+$/.test(own) ? 'number' : own === own.toUpperCase() && own !== own.toLowerCase() ? 'caps' : own.length > 60 || /[.!?]$/.test(own) && own.split(' ').length > 6 ? 'sentence' : 'phrase';
      const { stamp, own: ownStamp } = stampOf(el);
      items.push({ route, tag: el.localName, role: el.getAttribute('role'), id: el.id || null, cls: (el.getAttribute('class') ?? '').trim(), stamp, ownStamp, text, length: own.length, shape,
        size, lh, lhRatio: lh ? Math.round(lh / size * 1000) / 1000 : null, ls, lsEm: Math.round(ls / size * 1000) / 1000, weight: cs.fontWeight, transform: cs.textTransform, color: cs.color, family: cs.fontFamily.split(',')[0].replace(/"/g, ''),
        landmarks: landmarks(el), card: nearestCard(el), parentRatio: parentSize ? Math.round(size / parentSize * 100) / 100 : null, siblingRatio: sib ? Math.round(size / sib * 100) / 100 : null,
        width: Math.round(rect.width), lines: lh ? Math.max(1, Math.round(rect.height / lh)) : null });
    }
    const links = [...document.querySelectorAll('a[href^="/"]')].map((a) => a.getAttribute('href').split('#')[0].replace(/\/+$/, '') || '/').filter((h) => !/\.[a-z]+$/.test(h));
    return { items, links: [...new Set(links)] };
  }, route);
  out.routes.push({ route, elements: result.items.length });
  out.elements.push(...result.items);
  for (const link of result.links) if (!seen.has(link) && queue.length < 60) queue.push(link);
}
await browser.close();
process.stdout.write(JSON.stringify(out));
console.error(`routes ${out.routes.length}, text elements ${out.elements.length}, with a stamp ${out.elements.filter((e) => e.stamp).length}`);
