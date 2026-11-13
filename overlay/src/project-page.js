/**
 * The project page `npx plumber` opens (docs/design/onboarding.md, "The page"), built only from the overlay's own
 * modules. The CLI serves it with your project's numbers (GET /__plumb/system); the demo's project.html mounts it
 * with crafting-ui's, read 2026-11-03.
 *
 * It owns the document it's mounted in: the body takes the page's desk colour and the scheme follows the OS, then
 * the Day/Night button, or a page holding this one (?scheme= first, then postMessage).
 */
import { LANGUAGE_CSS } from './language.js';
import { SCALE_CSS } from './scale-marks.js';
import { GRAVITY_CSS, Gravity } from './gravity.js';
import { SPECIMEN_CSS, Specimen } from './specimen.js';
import { CAUSE_LIST_CSS, CauseList } from './cause-list.js';
import { TOY_DEFS, toyOf } from './toys.js';

const nf = new Intl.NumberFormat('en');
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const PAGE_CSS = `
  :host { display: block; min-height: 100vh; background: var(--pl-bg-page); }
  .top { position: sticky; top: 0; z-index: 3; display: flex; align-items: center; gap: 12px; padding: 12px var(--pl-page-space-1); background: color-mix(in oklab, var(--pl-bg-surface) 88%, transparent); backdrop-filter: blur(12px); box-shadow: 0 1px 0 var(--pl-border-default); }
  .top b { font: 600 14px var(--pl-sans); color: var(--pl-text-primary); white-space: nowrap; }
  .top .pl-rainbow { width: 22px; height: 12px; border-radius: 3px; }
  .top .read { font: var(--pl-card-meta); color: var(--pl-text-secondary); }
  .top .pl-act { margin-left: auto; }
  main { max-width: var(--pl-page-max); margin: 0 auto; padding: var(--pl-page-space-2) var(--pl-page-space-1) var(--pl-page-space-4); color: var(--pl-text-primary); }
  .eyebrow { font: var(--pl-page-meta); color: var(--pl-text-secondary); }
  h1 { margin: 10px 0 14px; max-width: 26ch; font: var(--pl-page-display); letter-spacing: var(--pl-tracking-display); text-wrap: balance; }
  h1 .n { font-variant-numeric: tabular-nums; }
  h1 .off { color: var(--pl-coral); } h1 .on { color: var(--pl-mint); }
  #specimen:not(:empty), #causes { display: block; margin-top: var(--pl-page-space-1); }
  .lede { max-width: 60ch; margin: 0 0 var(--pl-page-space-1); font: var(--pl-page-body); color: var(--pl-text-secondary); text-wrap: pretty; }
  @media (max-width: 720px) { main { padding: var(--pl-page-space-1) var(--pl-space-6) var(--pl-page-space-3); } .top { padding: 10px 16px; } .top .read { display: none; } h1 { font: var(--pl-page-display-narrow); } }
`;

/* How Plumber read your system, as a review: per kind, one verdict line is the loud thing; under it one quiet row per
   scale (its stem, its steps as plain numbers or swatches, how it was read). A reading from the name alone is the only
   thing marked, because it is the only one worth a second look. Files are said once; lone tokens fold away */
const READING_CSS = `
  #reading { display: block; margin-top: var(--pl-page-space-3); }
  #reading h2 { margin: 0; font: var(--pl-page-title); letter-spacing: var(--pl-tracking-title); }
  #reading .verdict { max-width: 60ch; margin: var(--pl-space-4) 0 var(--pl-page-space-1); font: var(--pl-page-body); color: var(--pl-text-secondary); }
  #reading .verdict b { color: var(--pl-text-primary); font-weight: 600; }
  .kinds { display: grid; gap: var(--pl-space-5); }
  .kind { padding: var(--pl-space-6) var(--pl-space-8) var(--pl-space-7); border-radius: var(--pl-radius-card); background: var(--pl-bg-inset); }
  .kind > header { display: grid; grid-template-columns: var(--pl-space-8) minmax(0, 1fr); align-items: center; gap: var(--pl-space-5); }
  .kind .toy { width: var(--pl-space-8); height: var(--pl-space-8); }
  .kind .toy svg { display: block; width: 100%; height: 100%; overflow: visible; }
  .kind header b { font: var(--pl-card-title); font-family: var(--pl-round); font-size: 17px; }
  .kind header span { margin-left: var(--pl-space-4); font: var(--pl-card-body); color: var(--pl-text-secondary); }
  .rows { display: grid; margin: var(--pl-space-5) 0 0 calc(var(--pl-space-8) + var(--pl-space-5)); }
  .row { display: grid; grid-template-columns: minmax(0, 11rem) minmax(0, 1fr) auto; align-items: baseline; gap: var(--pl-space-6); padding: var(--pl-space-3) 0; }
  .row code { font: var(--pl-card-code); color: var(--pl-text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .row .steps { display: flex; flex-wrap: wrap; align-items: center; gap: var(--pl-space-1) var(--pl-space-4); font: var(--pl-card-code); color: var(--pl-text-secondary); font-variant-numeric: tabular-nums; }
  .row .steps .unit { color: var(--pl-text-placeholder); }
  .row .sw { width: var(--pl-space-6); height: var(--pl-space-6); border-radius: 50%; box-shadow: inset 0 0 0 var(--pl-line) color-mix(in oklab, var(--pl-text-primary) 14%, transparent); }
  .row .how { font: var(--pl-card-meta); color: var(--pl-text-secondary); white-space: nowrap; }
  .row .how.look { color: var(--pl-soft-text); font-weight: 600; }
  .file { margin: var(--pl-space-5) 0 0 calc(var(--pl-space-8) + var(--pl-space-5)); font: var(--pl-card-meta); color: var(--pl-text-secondary); }
  .kind details { margin: var(--pl-space-4) 0 0 calc(var(--pl-space-8) + var(--pl-space-5)); }
  .kind summary { cursor: pointer; font: var(--pl-card-meta); color: var(--pl-text-secondary); }
  .kind details .rows { margin-left: 0; }
  @media (max-width: 720px) { .kind { padding: var(--pl-space-6); } .rows, .file, .kind details { margin-left: 0; } .row { grid-template-columns: 1fr auto; } .row .steps { grid-column: 1 / -1; } }
`;
// each kind by the toy and the word the rest of Plumber uses for it
const KINDS = { spacing: ['padding', 'Spacing'], color: ['fill', 'Colour'], radius: ['corner', 'Corners'], type: ['type', 'Type'], motion: ['motion', 'Motion'],
  elevation: ['shadow', 'Shadows'], z: ['layer', 'Layers'], size: ['size', 'Sizes'], opacity: ['opacity', 'Opacity'] };
const STYLE = /^(?:(?:normal|italic|bold|\d{3})\s+)*([\d.]+)(px|rem|em|%)(?:\s*\/\s*[\d.]+(?:px|rem|em|%)?)?\s+\S/;
// a scale's steps as plain numbers with their unit said once: 2 4 6 8 px; a text style by its size; a face by its first name
function steps(family, tokens) {
  if (family === 'elevation') return `<span>${tokens.length} ${tokens.length === 1 ? 'shadow' : 'shadows'}</span>`;
  if (family === 'color') return tokens.slice(0, 14).map((t) => `<i class="sw" style="background: ${esc(t.value)}" title="${esc(t.value)}"></i>`).join('') + (tokens.length > 14 ? `<span>+${tokens.length - 14}</span>` : '');
  const parts = tokens.map((t) => { const v = String(t.value).trim(), style = STYLE.exec(v), n = /^(-?[\d.]+)(px|rem|em|ms|s|%)?$/.exec(v);
    return style ? [style[1], style[2]] : n ? [n[1], n[2] ?? ''] : [v.split(',')[0].replace(/["']/g, '').slice(0, 16), null]; });
  const unit = parts.every((p) => p[1] !== null && p[1] === parts[0][1]) ? parts[0][1] : null;
  const shown = parts.map((p) => (unit === null && p[1] ? `${p[0]}${p[1]}` : p[0]));
  const list = [...new Set(unit === null ? shown : shown.sort((a, b) => Number(a) - Number(b)))];
  return list.slice(0, 12).map((v) => `<span>${esc(v)}</span>`).join('') + (list.length > 12 ? `<span>+${list.length - 12}</span>` : '') + (unit ? `<span class="unit">${esc(unit)}</span>` : '');
}
// how a line was read, in a word or two; the name alone is a guess worth a look
function how(reasons) {
  const by = [reasons.some((r) => r.startsWith('its value')) && 'value', reasons.some((r) => r.startsWith('used in')) && 'use', reasons.some((r) => r.startsWith('its name')) && 'name'].filter(Boolean);
  if (by.length === 1 && by[0] === 'name') return `<span class="how look" title="${esc(reasons.join(' · '))}">by its name only</span>`;
  return `<span class="how" title="${esc(reasons.join(' · '))}"></span>`;
}
function reading(kinds) {
  if (!kinds?.length) return '';
  const all = kinds.flatMap((k) => k.groups), tokens = all.reduce((m, g) => m + g.tokens.length, 0);
  const scales = all.filter((g) => g.pattern).length, looks = all.filter((g) => g.pattern && how(g.reasons).includes('look')).length;
  const row = (k, g) => `<div class="row"><code>${esc(g.pattern)}</code><div class="steps">${steps(k.family, g.tokens)}</div>${how(g.reasons)}</div>`;
  return `<h2>How Plumber read your system</h2>
    <p class="verdict"><b>${nf.format(tokens)} tokens in ${kinds.length} kinds, ${scales} scales.</b> ${looks ? `${looks} ${looks === 1 ? 'was' : 'were'} read from the name alone; check ${looks === 1 ? 'it' : 'those'}.` : 'Each was read from more than its name.'} A scale in the wrong kind moves in <code>plumber.config</code>.</p>
    <div class="kinds">${kinds.map((k) => {
      const [toy, name] = KINDS[k.family] ?? ['size', k.family], n = k.groups.reduce((m, g) => m + g.tokens.length, 0);
      const groups = k.groups.filter((g) => g.pattern), lone = k.groups.filter((g) => !g.pattern), loneCount = lone.reduce((m, g) => m + g.tokens.length, 0);
      const files = [...new Set(k.groups.map((g) => g.file))];
      const byFile = files.map((file) => [file, groups.filter((g) => g.file === file)]).filter(([, gs]) => gs.length);
      return `<section class="kind"><header><i class="toy">${toyOf(toy)}</i><div><b>${name}</b><span>${groups.length ? `${groups.length} ${groups.length === 1 ? 'scale' : 'scales'}` : 'no scale'}${loneCount ? `, ${loneCount} on their own` : ''} · ${nf.format(n)} ${n === 1 ? 'token' : 'tokens'}</span></div></header>
        ${(() => { let shown = 0; const head = [], rest = []; for (const [file, gs] of byFile) for (const g of gs) (shown++ < 6 ? head : rest).push([file, g]);
          const block = (list) => [...new Set(list.map(([f]) => f))].map((file) => `${byFile.length > 1 ? `<div class="file">${esc(file)}</div>` : ''}<div class="rows">${list.filter(([f]) => f === file).map(([, g]) => row(k, g)).join('')}</div>`).join('');
          return block(head) + (rest.length ? `<details><summary>${rest.length} more ${rest.length === 1 ? 'scale' : 'scales'}</summary>${block(rest)}</details>` : ''); })()}
        ${loneCount ? `<details><summary>${loneCount} on their own</summary><div class="rows">${lone.map((g) => row(k, { ...g, pattern: g.tokens.length === 1 ? g.tokens[0].name : g.file.split('/').pop() })).join('')}</div></details>` : ''}
      </section>`;
    }).join('')}</div>`;
}

/** What the type scale says, in one heading and one paragraph. */
function typeScale(size) {
  const steps = size.steps, strays = size.strays.filter((s) => s.px >= 6);
  const onScale = steps.reduce((n, s) => n + s.uses, 0), byHand = strays.reduce((n, s) => n + s.places, 0);
  const copies = strays.filter((s) => s.copy).reduce((n, s) => n + s.places, 0), unused = steps.filter((s) => !s.uses);
  const inUse = new Set([...strays.map((s) => s.px), ...steps.filter((s) => s.uses).map((s) => s.px)]).size;
  if (!steps.length) return { steps, strays, html: `
    <span class="eyebrow">Your type scale</span>
    <h1>Your theme has no text sizes yet.</h1>
    <p class="lede">${byHand ? `${nf.format(byHand)} places type a text size by hand${inUse > 1 ? `, in ${inUse} different sizes` : ''}.` : 'Nothing in your code sets a text size either.'}</p>` };
  if (!byHand) return { steps, strays, html: `
    <span class="eyebrow">Your type scale</span>
    <h1>All <span class="n on">${nf.format(onScale)}</span> places that set a text size use your scale.</h1>
    <p class="lede">Your theme has ${steps.length} text sizes.${unused.length ? ` ${unused.length === 1 ? 'One' : unused.length} of them ${unused.length === 1 ? 'is' : 'are'} never used: ${unused.map((s) => esc(s.name)).join(', ')}.` : ''}</p>` };
  return { steps, strays, html: `
    <span class="eyebrow">Your type scale</span>
    <h1><span class="n off">${nf.format(byHand)}</span> places type a text size by hand. Only <span class="n on">${nf.format(onScale)}</span> use your scale.</h1>
    <p class="lede">Your theme has ${steps.length} text sizes; your code uses ${inUse}. ${nf.format(copies)} of the hand-typed places pick a size your theme already has, so they're one rename away.${unused.length ? ` ${unused.length === 1 ? 'One size' : `${unused.length} sizes`} in your theme ${unused.length === 1 ? 'is' : 'are'} never used: ${unused.map((s) => esc(s.name)).join(', ')}.` : ''}</p>` };
}

/**
 * @param host    the element the page draws into (it gets a shadow root)
 * @param data    the page data: { project, files, size: { steps, strays }, … } (src/project-page/system.ts)
 * @param tokens  the text of tokens.css
 */
export function mountProjectPage(host, data, tokens) {
  const doc = host.ownerDocument, root = host.attachShadow({ mode: 'open' });
  const type = typeScale(data.size);
  root.innerHTML = `<style>${tokens}${LANGUAGE_CSS}${SCALE_CSS}${GRAVITY_CSS}${SPECIMEN_CSS}${CAUSE_LIST_CSS}${PAGE_CSS}${READING_CSS}</style>${TOY_DEFS}
  <header class="top"><span class="pl-rainbow"></span><b>React Plumber</b><span class="pl-tag">${esc(data.project)}</span><span class="read">${nf.format(data.files)} files read</span><button type="button" class="pl-act quiet" id="scheme">Day</button></header>
  <main>${type.html}<div id="gravity"></div><div id="specimen"></div><div id="causes"></div><div id="reading">${reading(data.reading)}</div></main>`;
  const gravity = new Gravity(root.getElementById('gravity'), { steps: type.steps, strays: type.strays });
  const specimen = new Specimen(root.getElementById('specimen'), { steps: type.steps, strays: type.strays });
  const causes = new CauseList(root.getElementById('causes'), { causes: data.causes, open: data.open });

  // the body around the root shows on overscroll and at the edges, so it takes the desk colour the root resolves
  doc.body.style.margin = '0';
  const button = root.getElementById('scheme');
  const setScheme = (dark) => {
    host.dataset.scheme = dark ? 'dark' : 'light';
    doc.body.style.background = getComputedStyle(host).getPropertyValue('--pl-desk');
    button.textContent = dark ? 'Day' : 'Night';
  };
  const asked = new URLSearchParams(doc.defaultView.location.search).get('scheme');
  setScheme(asked ? asked === 'dark' : doc.defaultView.matchMedia('(prefers-color-scheme: dark)').matches);
  doc.defaultView.addEventListener('message', (e) => { if (e.origin === doc.defaultView.location.origin && e.data?.scheme) setScheme(e.data.scheme === 'dark'); });
  button.addEventListener('click', () => setScheme(host.dataset.scheme !== 'dark'));
  return { root, gravity, specimen, causes };
}
