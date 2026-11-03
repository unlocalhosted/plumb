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

const nf = new Intl.NumberFormat('en');
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const PAGE_CSS = `
  :host { display: block; min-height: 100vh; background: var(--pl-desk); }
  .top { position: sticky; top: 0; z-index: 3; display: flex; align-items: center; gap: 12px; padding: 12px var(--pl-page-space-1); background: color-mix(in oklab, var(--pl-paper) 88%, transparent); backdrop-filter: blur(12px); box-shadow: 0 1px 0 var(--pl-rule); }
  .top b { font: 600 14px var(--pl-sans); color: var(--pl-ink); }
  .top .pl-rainbow { width: 22px; height: 12px; border-radius: 3px; }
  .top .read { font: var(--pl-card-meta); color: var(--pl-ink-2); }
  .top .pl-act { margin-left: auto; }
  main { max-width: 1120px; margin: 0 auto; padding: var(--pl-page-space-2) var(--pl-page-space-1) var(--pl-page-space-4); color: var(--pl-ink); }
  .eyebrow { font: var(--pl-page-meta); color: var(--pl-ink-2); }
  h1 { margin: 10px 0 14px; max-width: 26ch; font: var(--pl-page-display); letter-spacing: var(--pl-tracking-display); text-wrap: balance; }
  h1 .n { font-variant-numeric: tabular-nums; }
  h1 .off { color: var(--pl-coral); } h1 .on { color: var(--pl-mint); }
  .lede { max-width: 60ch; margin: 0 0 var(--pl-page-space-1); font: var(--pl-page-body); color: var(--pl-ink-2); text-wrap: pretty; }
  @media (max-width: 720px) { main { padding: var(--pl-page-space-1) var(--pl-space-6) var(--pl-page-space-3); } .top { padding: 10px 16px; } h1 { font-size: 30px; line-height: 36px; } }
`;

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
  root.innerHTML = `<style>${tokens}${LANGUAGE_CSS}${SCALE_CSS}${GRAVITY_CSS}${PAGE_CSS}</style>
  <header class="top"><span class="pl-rainbow"></span><b>React Plumber</b><span class="pl-tag">${esc(data.project)}</span><span class="read">${nf.format(data.files)} files read</span><button type="button" class="pl-act quiet" id="scheme">Day</button></header>
  <main>${type.html}<div id="gravity"></div></main>`;
  const gravity = new Gravity(root.getElementById('gravity'), { steps: type.steps, strays: type.strays });

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
  return { root, gravity };
}
