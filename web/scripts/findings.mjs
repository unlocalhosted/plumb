// What Plumber finds on this site's homepage, recorded for the footer's game (site/Floor.jsx): the count it states
// and the fixes behind its toys. Nothing in it is typed by hand: run it again after the homepage changes.
//
//   npm run dev                  (Plumber's craft run needs the stamps, so the dev server)
//   node scripts/findings.mjs
//
//   1  the overlay's own craft run reads the page, and `plumber check` the homepage's source (the margins and
//      timings the page checks don't judge: only those on an element this page draws)
//   2  findings that are false here are left out of the count, each kind with its reason (FALSE_HERE)
//   3  a finding gets a fix where Plumber names one a browser can make (FIX): its CSS, or the value in its action
//   4  every fix is made on the page and Plumber reads it again: a fix stays only if its finding is gone (the
//      script also prints what the second read found for the first time: each must be a fault that was there already,
//      hidden under the fixed one, with the same value, and never one a fix made)
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const at = (p) => fileURLToPath(new URL(p, import.meta.url));
const { chromium } = createRequire(at('../../package.json'))('playwright');
const { version } = JSON.parse(readFileSync(at('../node_modules/@unlocalhosted/react-plumber/package.json'), 'utf8'));
const URL_ = process.argv[2] ?? 'http://localhost:4330/';

const FALSE_HERE = [
  [(f) => f.rule === 'craft/grey-levels' && f.evidence?.colour === '#ffffff', 'white words on a coloured block, and gradient-filled headings, read as a grey'],
  [(f) => f.rule === 'craft/contrast' && f.evidence?.lc === 0, 'a key whose words are drawn with text-fill-color, read by their clipped colour'],
  [(f) => f.rule === 'experience/font-display', "next/font's fallback is a local face, so nothing is downloaded"],
  [(f) => f.rule === 'craft/pure-black-white', "white is this site's surface colour (--pl-desk)"],
  [(f) => ['craft/list-wrap', 'craft/scroll-cue'].includes(f.rule) && /ins-x-(track|viewport)/.test(f.cls), 'a carousel is meant to run past its row, and has its dots to say so'],
  [(f) => f.els > 0 && f.shown === 0, 'the element is not shown on this site'],
];

const num = (f, re) => Number(f.action.match(re)?.[1] ?? NaN);
const kebab = (k) => k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
const FIX = {
  'craft/inner-outer-spacing': (f) => { const n = num(f, /Make the gap (\d+)px/); return n >= 0 ? { css: { 'column-gap': `${n}px`, 'row-gap': `${n}px` } } : null; },
  // elevation-ladder and weight-levels name a value too, and taking it makes new findings (a level moved trips its
  // neighbours; weight 800 trips "800 and 900 shout"): those need a person, so they have no fix here
  'craft/contrast': (f) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(f.evidence.color.slice(i, i + 2), 16));
    return { css: { color: Math.max(r, g, b) - Math.min(r, g, b) < 30 ? 'var(--pl-text-secondary)' : `color-mix(in oklab, ${f.evidence.color} 82%, #1d1b17)` } };
  },
  'craft/text-opacity': (f) => ({ css: { opacity: '1', fill: f.evidence.mixed } }),
  'craft/card-optical-padding': (f) => { const n = num(f, /Take about (\d+)px/); return n ? { css: { 'padding-top': `calc(var(--was) - ${n}px)` }, was: 'padding-top' } : null; },
  'craft/icon-side': (f) => { const n = num(f, /icon side (\d+)px/); return n ? { css: { [`padding-${f.evidence.side}`]: `${n}px` } } : null; },
  'craft/hit-target': (f) => { const n = num(f, /tap area (\d+)px/); return n ? { css: { 'min-width': `${n}px`, 'min-height': `${n}px` } } : null; },
  'craft/touch-manipulation': () => ({ css: { 'touch-action': 'manipulation', '-webkit-tap-highlight-color': 'transparent' } }),
  'craft/scroll-cue': () => ({ css: { 'mask-image': 'linear-gradient(90deg, #000 calc(100% - 24px), transparent)' } }),
  'craft/truncate-intent': () => ({ attr: { title: '{text}' } }),
  'craft/stroke-weight': () => ({ inside: 'svg *', css: { 'vector-effect': 'non-scaling-stroke' } }),
  'a11y/svg-name': () => ({ inside: 'svg', attr: { 'aria-hidden': 'true' } }),
  'a11y/label-in-name': () => ({ attr: { 'aria-label': '{text}, {aria-label}' } }),
  'a11y/nav-unnamed': () => ({ attr: { 'aria-label': 'Example tabs' } }),
  'a11y/heading-skip': () => ({ attr: { 'aria-level': '3', role: 'heading' } }),
  'tells/eyebrow': () => ({ css: { display: 'none' } }),
};
const fixOf = (f) => {
  if (!f.sel.length) return null;
  const own = FIX[f.rule]?.(f);
  if (own) return own;
  const sets = f.suggest?.sets;
  return sets ? { css: Object.fromEntries(Object.entries(sets).map(([k, v]) => [kebab(k), String(v)])) } : null;
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 860 }, reducedMotion: 'no-preference' });
await page.goto(URL_, { waitUntil: 'load', timeout: 90000 });
await page.waitForTimeout(5000);
const read = () => page.evaluate(async () => JSON.parse(JSON.stringify((await window.__plumb.craft({ timeout: 120000 })).findings)));
const found = await read();

const placed = await page.evaluate((found) => {
  const steady = (c) => !/^(bare|on|down|hov|translate-)/.test(c) && /^[a-z][\w-]*$/i.test(c);
  // a path that holds in a production build, where there are no stamps: tags by their place, under a fixed landmark
  const path = (el) => {
    const parts = [];
    for (let e = el; e; e = e.parentElement) {
      if (e.id && /^[a-z][\w-]*$/i.test(e.id)) { parts.unshift(`#${e.id}`); break; }
      if (e.matches('main.homepage, body > header.bar, footer.foot')) { parts.unshift(e.matches('main') ? 'main.homepage' : e.matches('header') ? 'header.bar' : 'footer.foot'); break; }
      const same = [...e.parentElement.children].filter((c) => c.tagName === e.tagName);
      const name = [...e.classList].filter(steady).slice(0, 1).map((c) => `.${c}`).join('');
      parts.unshift(`${e.tagName.toLowerCase()}${name}${same.length > 1 ? `:nth-of-type(${same.indexOf(e) + 1})` : ''}`);
    }
    return parts.join(' > ');
  };
  const stamped = [...document.querySelectorAll('[data-plumb-source]')];
  return found.map((f) => {
    const site = `${String(f.file ?? '').replace(/^.*\/plumb\//, '')}:${f.line}:${f.column}`;
    const els = f.file ? stamped.filter((e) => e.getAttribute('data-plumb-source').split('#')[0] === site) : [];
    const shown = els.filter((e) => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden');
    return { els: els.length, shown: shown.length, cls: els[0]?.getAttribute('class') ?? '', sel: [...new Set(els.map(path))].filter((s) => document.querySelectorAll(s).length === 1) };
  });
}, found);
found.forEach((f, i) => Object.assign(f, placed[i], { action: f.action ?? f.suggest?.text ?? '' }));

const left = new Map(), counted = [];
for (const f of found) {
  const why = FALSE_HERE.find(([is]) => is(f))?.[1];
  if (why) left.set(why, (left.get(why) ?? 0) + 1); else counted.push(f);
}

// the source check's margins and timings, where this page draws the element and a token is there to take
const cli = spawnSync(process.execPath, [at('../node_modules/@unlocalhosted/react-plumber/dist/cli.js'), 'check', '--root', at('../../homepage'), '--json'], { encoding: 'utf8', maxBuffer: 1 << 27 });
const styles = JSON.parse(cli.stdout).findings.filter((f) => /^provenance\/(spacing|motion)/.test(f.rule)).flatMap((f) => (f.sites ?? []).flatMap((site) => {
  const text = String(site.text ?? ''), prop = text.split(':')[0].trim();
  const file = existsSync(site.file) ? site.file : at(`../../homepage/${site.file}`);
  const options = (f.choices ?? []).map((c) => String(c.amount ?? c.value ?? c.resolved ?? ''));
  if (!/^(margin(-top|-right|-bottom|-left)?|transition)$/.test(prop) || !/\/(hero|sections)\//.test(file) || !file.endsWith('.css') || !existsSync(file)) return [];
  const lines = readFileSync(file, 'utf8').split('\n');
  let line = site.line - 1;
  while (line > 0 && !lines[line].includes('{')) line--;
  const selector = lines[line].split('{')[0].trim();
  if (!selector || /[@:]/.test(selector.replace(/\[[^\]]*\]/g, ''))) return [];
  return [{ family: f.rule, selector, prop, text, title: f.title, options, at: `${file.split('/').pop()}:${site.line}`, names: (f.choices ?? []).map((c) => String(c.name ?? c.label ?? '')) }];
}));
const sourced = await page.evaluate((styles) => styles.map((f) => {
  let els;
  try { els = [...document.querySelectorAll(`main.homepage ${f.selector}`)]; } catch { return null; }
  const el = els.find((e) => e.getClientRects().length);
  if (!el) return null;
  const css = getComputedStyle(el), probe = document.body.appendChild(document.createElement('i'));
  probe.style.position = 'absolute';
  const tokens = f.options.map((value, i) => {
    const token = value.match(/var\((--pl-[\w-]+)\)/)?.[1] ?? f.names[i].match(/--pl-[\w-]+/)?.[0];
    if (!token) return null;
    const raw = css.getPropertyValue(token).trim(), n = parseFloat(raw);
    return Number.isFinite(n) ? { token, n: /[\d.]s$/.test(raw) && !raw.endsWith('ms') ? n * 1000 : n } : null;
  }).filter(Boolean);
  probe.remove();
  if (!tokens.length) return null;
  const motion = f.prop === 'transition';
  let side = f.prop, was;
  if (motion) was = Math.round(parseFloat(css.transitionDuration) * (css.transitionDuration.split(',')[0].trim().endsWith('ms') ? 1 : 1000));
  else {
    if (side === 'margin') side = ['margin-top', 'margin-right', 'margin-bottom', 'margin-left'].find((p) => parseFloat(css.getPropertyValue(p)) > 0 && f.title.startsWith(`${parseFloat(css.getPropertyValue(p))}px`));
    if (!side) return null;
    was = parseFloat(css.getPropertyValue(side));
  }
  // the value on screen has to be the one the finding names
  if (!was || !(motion ? f.text.includes(`${was}ms`) : f.text.includes(`${was}px`))) return null;
  const to = tokens.sort((a, b) => Math.abs(a.n - was) - Math.abs(b.n - was) || b.n - a.n)[0];
  if (to.n === was) return null;
  const key = motion ? 'transition-duration' : side;
  return { sel: [`main.homepage ${f.selector}`], from: was, to: to.n, token: to.token.slice(5), make: { css: { [key]: `var(${to.token})` } } };
}), styles);
const seenInSource = new Set();
styles.forEach((f, i) => {
  if (!sourced[i] || seenInSource.has(f.at)) return;
  seenInSource.add(f.at);
  counted.push({ ...sourced[i], source: f.at, rule: f.family, title: f.title, action: `Use ${sourced[i].token}.` });
});
for (const f of counted) if (!f.source) f.make = fixOf(f);

// make every fix, then let Plumber read the page again
await page.evaluate((fixes) => {
  for (const { sel, make } of fixes) for (const s of sel) {
    const host = document.querySelector(s);
    if (!host) continue;
    for (const el of make.inside ? host.querySelectorAll(make.inside) : [host]) {
      if (make.was) el.style.setProperty('--was', getComputedStyle(el).getPropertyValue(make.was));
      for (const [k, v] of Object.entries(make.css ?? {})) el.style.setProperty(k, v, 'important');
      for (const [k, v] of Object.entries(make.attr ?? {})) el.setAttribute(k, v.replace('{text}', el.textContent.trim()).replace('{aria-label}', el.getAttribute('aria-label') ?? ''));
    }
  }
}, counted.filter((f) => f.make && f.source !== 'tokens.css:38').map(({ sel, make }) => ({ sel, make })));
await page.waitForTimeout(2500);
// the source check can't read a page, so its fixes are confirmed here: the element now has the token's own value
const onToken = await page.evaluate((list) => list.map(({ sel, make, to }) => {
  const el = [...document.querySelectorAll(sel[0])].find((e) => e.getClientRects().length);
  if (!el) return false;
  const key = Object.keys(make.css)[0], raw = getComputedStyle(el).getPropertyValue(key).split(',')[0].trim();
  return Math.abs(parseFloat(raw) * (key === 'transition-duration' && !raw.endsWith('ms') ? 1000 : 1) - to) < 0.6;
}), counted.filter((f) => f.source));
counted.filter((f) => f.source).forEach((f, i) => { if (!onToken[i]) f.make = null; });
const key = (f) => `${f.rule}|${f.file}|${f.line}|${f.column}`;
const again = await read(), still = new Set(again.map(key));
await browser.close();
// a page that didn't draw is not a page with no faults: never write that over a record
if (found.length < 10) throw new Error(`Plumber read only ${found.length} findings: did the page draw? Nothing was written.`);

const failed = [];
for (const f of counted) if (!f.source && f.make && still.has(key(f))) { failed.push(f.rule); f.make = null; }
// each of the footer's ten toys, and the rules whose fixes are behind it
const TOY = {
  padding: ['craft/card-optical-padding', 'craft/icon-side', 'craft/hit-target'],
  margin: ['provenance/spacing', 'provenance/spacing/by-value'],
  gap: ['craft/inner-outer-spacing'],
  corner: ['craft/continuous-corners'],
  type: ['craft/text-wrap-role', 'craft/truncate-intent', 'tells/eyebrow'],
  fill: ['craft/contrast', 'craft/text-opacity', 'craft/gradient-space'],
  shadow: ['craft/layered-shadow', 'craft/tinted-shadow'],
  motion: ['provenance/motion', 'provenance/motion/by-value'],
  grid: ['craft/baseline-align', 'craft/flex-min'],
  cursor: ['craft/touch-manipulation', 'craft/scroll-cue', 'a11y/label-in-name', 'a11y/nav-unnamed', 'a11y/heading-skip', 'a11y/svg-name'],
};
const toyOfRule = (rule) => Object.keys(TOY).find((toy) => TOY[toy].includes(rule));
for (const f of counted) if (f.make && !toyOfRule(f.rule)) f.make = null;
// fixes tried one kind at a time that made a new fault: the finding is true and counts, and needs a person
const HARMS = { 'tokens.css:38': "12px under the card's name knocks its two sizes off one baseline (craft/baseline-align)" };
for (const f of counted) if (f.source && HARMS[f.source]) { f.make = null; f.action += ` By hand: ${HARMS[f.source]}.`; }
const items = counted.map((f) => ({
  toy: f.make ? toyOfRule(f.rule) : undefined,
  from: f.from, to: f.to, token: f.token,
  rule: f.rule, title: f.title, action: f.action,
  at: f.source ?? (f.file ? `${String(f.file).split('/').pop()}:${f.line}` : ''),
  sel: f.sel, make: f.make,
}));
const data = { plumber: version, page: '/', found: found.length + counted.filter((f) => f.source).length, left: [...left].map(([why, n]) => ({ n, why })), items };
// the page is sent the fixes whole and, of the rest, only what it is and where
writeFileSync(at('../site/findings.json'), `${JSON.stringify({
  plumber: version, page: data.page, recorded: new Date().toISOString().slice(0, 16), found: data.found, left: data.left,
  total: items.length,
  items: items.filter((i) => i.make).map(({ action, ...item }) => item),
  code: items.filter((i) => !i.make).map((i) => `${i.rule} ${i.at}`),
}, null, 1)}\n`);

const tally = (list) => Object.entries(list.reduce((n, r) => ({ ...n, [r]: (n[r] ?? 0) + 1 }), {})).map(([r, n]) => `${n} ${r}`).join(', ');
console.log(`found ${data.found} · left out ${data.found - counted.length} · counted ${counted.length} · fixed and confirmed ${items.filter((i) => i.make).length}`);
for (const { n, why } of data.left) console.log(`  left out ${n}: ${why}`);
console.log(`  still found after its fix: ${tally(failed) || 'none'}`);
console.log(`  needs code: ${tally(items.filter((i) => !i.make).map((i) => i.rule))}`);
console.log(`  behind each toy: ${Object.keys(TOY).map((toy) => `${toy} ${items.filter((i) => i.toy === toy).length}`).join(', ')}`);
for (const i of items.filter((i) => i.toy === 'margin' || i.toy === 'motion')) console.log(`    ${i.toy} ${i.at} ${i.from} -> ${i.to} ${i.token} | ${i.title}`);
console.log(`  second read: ${again.length} findings, ${again.filter((f) => !found.some((g) => key(g) === key(f))).length} of them new`);
for (const f of again) if (!found.some((g) => key(g) === key(f))) console.log(`    + ${f.rule} ${String(f.file).split('/').pop()}:${f.line} ${f.title} ${JSON.stringify(f.evidence ?? {}).slice(0, 120)}`);
console.log(`  new: ${tally(again.filter((f) => !found.some((g) => key(g) === key(f))).map((f) => f.rule)) || 'none'}`);
