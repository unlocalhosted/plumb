/**
 * The project page `npx plumber` opens (docs/design/onboarding.md, "The page"), built only from the overlay's own
 * modules. The CLI serves it with your project's numbers (GET /__plumb/system); the demo's project.html mounts it
 * with crafting-ui's, read 2026-11-03.
 *
 * It owns the document it's mounted in: the body takes the page's desk colour and the scheme follows the OS, then
 * the Day/Night button, or a page holding this one (?scheme= first, then postMessage).
 */
import { LANGUAGE_CSS } from './language.js';
import { CAUSE_LIST_CSS, CauseList } from './cause-list.js';
import { TOY_DEFS } from './toys.js';
import { mountLesson } from './lesson.js';

const nf = new Intl.NumberFormat('en');
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const PAGE_CSS = `
  :host { display: block; min-height: 100vh; background: var(--pl-paper); }
  .top { position: sticky; top: 0; z-index: 3; display: flex; align-items: center; gap: 12px; padding: 12px var(--pl-page-space-1); background: color-mix(in oklab, var(--pl-paper) 90%, transparent); backdrop-filter: blur(12px); box-shadow: 0 1px 0 var(--pl-rule); }
  .top b { font: 600 14px var(--pl-sans); color: var(--pl-text-primary); white-space: nowrap; }
  .top .pl-rainbow { width: 22px; height: 12px; border-radius: 3px; }
  .top .read { font: var(--pl-card-meta); color: var(--pl-text-secondary); }
  .top .pl-act { margin-left: auto; }
  main { max-width: var(--pl-page-max); margin: 0 auto; padding: var(--pl-page-space-2) var(--pl-page-space-1) var(--pl-page-space-4); color: var(--pl-text-primary); }
  /* the causes sit in step 3 under its own heading ("In your code"), so the list's heading steps aside */
  #causes { display: block; }
  #causes .cl-head { display: none; }
  @media (max-width: 720px) { main { padding: var(--pl-page-space-1) var(--pl-space-6) var(--pl-page-space-3); } .top { padding: 10px 16px; } .top .read { display: none; } }
`;

/**
 * @param host    the element the page draws into (it gets a shadow root)
 * @param data    the page data: { project, files, size: { steps, strays }, … } (src/project-page/system.ts)
 * @param tokens  the text of tokens.css
 * @param io      { post(path, body) }: how the page writes, when it may (the CLI's page); without it, nothing is written
 */
export function mountProjectPage(host, data, tokens, io = {}) {
  const doc = host.ownerDocument, root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `<style>${tokens}${LANGUAGE_CSS}${CAUSE_LIST_CSS}${PAGE_CSS}</style>${TOY_DEFS}
  <header class="top"><span class="pl-rainbow"></span><b>React Plumber</b><span class="pl-tag">${esc(data.project)}</span><span class="read">${nf.format(data.files)} files read</span><button type="button" class="pl-act quiet" id="scheme">Day</button></header>
  <main><div id="lesson"></div></main>`;
  mountLesson(root.getElementById('lesson'), data, { post: io.post });

  // the body around the root shows on overscroll and at the edges, so it takes the desk colour the root resolves
  doc.body.style.margin = '0';
  const button = root.getElementById('scheme');
  const setScheme = (dark) => {
    host.dataset.scheme = dark ? 'dark' : 'light';
    doc.body.style.background = getComputedStyle(host).getPropertyValue('--pl-paper');
    button.textContent = dark ? 'Day' : 'Night';
  };
  const asked = new URLSearchParams(doc.defaultView.location.search).get('scheme');
  setScheme(asked ? asked === 'dark' : doc.defaultView.matchMedia('(prefers-color-scheme: dark)').matches);
  doc.defaultView.addEventListener('message', (e) => { if (e.origin === doc.defaultView.location.origin && e.data?.scheme) setScheme(e.data.scheme === 'dark'); });
  button.addEventListener('click', () => setScheme(host.dataset.scheme !== 'dark'));
  return { root };
}
