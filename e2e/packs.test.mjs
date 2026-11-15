// The packs built from Chrome's Modern Web Guidance (docs/briefs/rule-packs.md): accessibility, forms, components, HTML
// on the page, security in source. Each pack: one page with every problem on it, through the real CLI, a real Vite
// server with the plugin and real Chromium; every rule must name its problem at the line that has it. Then the twin:
// the same parts built right, with the cases that once gave false hits, where no pack may say anything.
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { createServer } from 'vite';
import { chromium } from 'playwright';
import tailwindcss from '@tailwindcss/vite';
import { plumb } from '@unlocalhosted/react-plumber/vite';

const repo = fileURLToPath(new URL('../', import.meta.url));
const cli = join(repo, 'dist/cli.js');
const run = promisify(execFile);
const built = () => readFile(cli).then(() => true, () => false);

async function fixture(t, app, { index, files = {}, plugins = [] } = {}) {
  const root = await mkdtemp(join(repo, 'fixtures/.packs-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'overlay/demo/src'), join(root, 'src'), { recursive: true });
  if (index) await writeFile(join(root, 'index.html'), index); else await cp(join(repo, 'overlay/demo/index.html'), join(root, 'index.html'));
  await writeFile(join(root, 'src/App.jsx'), app);
  for (const [name, text] of Object.entries(files)) { await mkdir(dirname(join(root, name)), { recursive: true }); await writeFile(join(root, name), text); }
  const server = await createServer({ root, cacheDir: join(root, '.vite-cache'), configFile: false, plugins: [tailwindcss(), plumb({ watch: false }), ...plugins],
    oxc: { jsx: { runtime: 'automatic', development: true } }, logLevel: 'silent', server: { host: '127.0.0.1', port: 0 } });
  t.after(() => server.close());
  await server.listen();
  return { root, url: `http://127.0.0.1:${server.httpServer.address().port}/` };
}
const plumber = (args) => run('node', [cli, ...args], { cwd: repo, env: process.env, timeout: 180000, maxBuffer: 1e8 }).then((r) => ({ code: 0, ...r }), (e) => ({ code: e.code, stdout: e.stdout, stderr: e.stderr }));
const lineOf = (source, id) => { const at = source.indexOf(`id="${id}"`); assert.ok(at >= 0, `the page has no id="${id}"`); return source.slice(0, at).split('\n').length; };

// What the packs say about a page: rule → the lines it spoke at.
async function said(t, app, options) {
  const { root, url } = await fixture(t, app, options);
  const result = await plumber(['craft', '--url', url, '--json', '--no-probe', '--no-pairs', '--root', root]);
  const report = JSON.parse(result.stdout);
  const by = new Map();
  for (const f of report.findings) { const list = by.get(f.rule) ?? []; list.push(f.sites[0].line); by.set(f.rule, list); }
  return by;
}
// every [rule, id…] spoke at the line of one of its ids
function speaks(by, pack, source, expected) {
  const missing = [];
  for (const [rule, ...ids] of expected) {
    const lines = by.get(`${pack}/${rule}`) ?? [], want = ids.map((id) => lineOf(source, id));
    if (!lines.some((l) => want.includes(l))) missing.push(`${pack}/${rule}: expected line ${want.join(' or ')} (${ids.join(', ')}), spoke at ${JSON.stringify(lines)}`);
  }
  assert.deepEqual(missing, []);
}
const ofPacks = (by) => [...by].filter(([rule]) => /^(?:a11y|forms|components|html|experience)\//.test(rule)).map(([rule, lines]) => `${rule} @${lines.join(',')}`);
const PX = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';

const A11Y = `export function App() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-s4 p-s4">
      <h1 id="h1a">Bad page</h1>
      <h4 id="skip">Skipped</h4>
      <h1 id="h1b">Second</h1>
      <nav id="n1"><a id="ra" href="/a">Read more</a></nav>
      <nav id="n2"><a id="rb" href="/b">Read more</a></nav>
      <img id="noalt" src="${PX}" width="40" height="40" />
      <img id="cliche" alt="Image of a cat" src="${PX}" width="40" height="40" />
      <svg id="svgimg" role="img" width="24" height="24"><circle cx="12" cy="12" r="10" /></svg>
      <button id="tab3" tabIndex={3}>Third</button>
      <button id="tab0" tabIndex={0}>Zero</button>
      <div aria-hidden="true"><button id="hid">Hidden</button></div>
      <button id="pres" role="presentation">Gone</button>
      <div id="lab" aria-label="A box">box</div>
      <button id="lin" aria-label="Close dialog">Dismiss</button>
      <button id="rin" aria-label="Save button">Save</button>
      <iframe id="fr" srcDoc="<p>x</p>" scrolling="no" width="100" height="40" />
      <table id="tb"><tbody><tr><td>Name</td><td>Age</td></tr><tr><td>A</td><td>1</td></tr></tbody></table>
      <details><summary id="sum"><h3>In summary</h3></summary>body</details>
      <nav id="red" role="navigation" aria-label="Third"><a href="/c">C</a></nav>
      <ul><li id="lib" role="button">Li button</li></ul>
      <div id="divb" role="button" tabIndex={0}>Div button</div>
      <input id="mail" type="email" aria-label="Email" />
      <button id="noname"><svg aria-hidden="true" width="16" height="16"><circle cx="8" cy="8" r="6" /></svg></button>
      <main id="main2">another</main>
    </main>
  );
}
`;
const A11Y_EXPECTED = [['control-name', 'noname'], ['image-alt', 'noalt'], ['alt-cliche', 'cliche'], ['svg-name', 'svgimg'], ['tabindex-positive', 'tab3'], ['tabindex-redundant', 'tab0'], ['hidden-focusable', 'hid'],
  ['role-presentation-control', 'pres'], ['label-on-generic', 'lab'], ['label-in-name', 'lin'], ['role-in-label', 'rin'], ['link-name-reused', 'ra', 'rb'], ['heading-skip', 'skip'], ['heading-h1-many', 'h1a', 'h1b'],
  ['main-many', 'main2'], ['nav-unnamed', 'n1', 'n2'], ['iframe-title', 'fr'], ['iframe-scroll', 'fr'], ['table-headers', 'tb'], ['heading-in-summary', 'sum'], ['redundant-role', 'red'], ['role-on-structure', 'lib'],
  ['native-over-role', 'divb'], ['field-autocomplete', 'mail']];

const FORMS = `export function App() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-s4 p-s4">
      <style>{"#inv2:invalid { border-color: red } #hidcheck { display: none }"}</style>
      <h1>Bad forms</h1>
      <form id="outer" action="/send">
        <label id="lb1">Loose label</label><input name="loose" />
        <label id="lb2" htmlFor="nowhere">Dangling</label>
        <input id="noname" aria-label="No name" />
        <button id="cancel">Cancel</button>
        <button id="ok" type="submit">Submit</button>
        <fieldset id="fs"><input aria-label="in group" name="g" /></fieldset>
        <div id="rev" style={{ display: 'flex', flexDirection: 'row-reverse' }}><button type="button">One</button><button type="button">Two</button></div>
        <input id="inl" name="inl" aria-label="inline" ref={(e) => e && e.setAttribute('onclick', 'x()')} />
        <form id="nested" aria-label="inner"><input name="n" aria-label="n" /></form>
      </form>
      <input id="pw" type="password" aria-label="Password" autoComplete="off" />
      <input id="srch" type="search" aria-label="Search" />
      <form id="getpw" method="get"><input type="password" name="p" aria-label="P" autoComplete="current-password" /><button type="button">Sign in</button></form>
      <form aria-label="Third">
        <textarea id="ta" name="msg" aria-label="Message" style={{ resize: 'none' }} />
        <div style={{ marginBottom: 4 }}><input name="above" aria-label="above" /></div>
        <label id="farlab" htmlFor="far" style={{ display: 'block', marginBottom: 24 }}>Far label</label>
        <input id="far" name="far" />
        <input id="inv" name="contact" aria-label="Contact" aria-invalid="true" />
        <input id="inv2" name="need" aria-label="Needed" required />
        <label htmlFor="star">Company *</label>
        <input id="star" name="company" />
        <label htmlFor="over">Phone</label>
        <input id="over" name="phone" aria-label="Contact number" />
        <label htmlFor="otp">Verification code</label>
        <input id="otp" name="otp" />
        <label htmlFor="zip">ZIP</label>
        <input id="zip" name="zip" type="number" />
        <div id="boxes">{[0, 1, 2, 3, 4, 5].map((i) => <input key={i} maxLength={1} aria-label={'digit ' + i} />)}</div>
        <label htmlFor="user">Username</label>
        <input id="user" name="username" />
        <label id="hidlab" htmlFor="hidcheck">Agree</label>
        <input id="hidcheck" type="checkbox" name="agree" />
        <label htmlFor="first">First name</label>
        <input id="first" name="firstName" pattern="[A-Za-z]+" />
        <input id="r1" type="radio" name="plan" aria-label="Free" />
        <input type="radio" name="plan" aria-label="Pro" />
        <label htmlFor="desc">Described</label>
        <input id="desc" name="desc" aria-invalid="true" aria-describedby="gone" />
        <label htmlFor="mail">Mail</label>
        <input id="mail" name="email" />
        <label htmlFor="ph">Password hint</label>
        <input id="ph" name="hint" placeholder="8-20 characters" />
        <button id="dis" disabled>Create account</button>
      </form>
    </main>
  );
}
`;
const FORMS_EXPECTED = [['nested-form', 'nested'], ['button-type', 'cancel'], ['submit-missing', 'getpw'], ['fieldset-legend', 'fs'], ['field-name', 'noname'], ['password-no-form', 'pw'], ['search-landmark', 'srch'],
  ['form-unnamed', 'outer', 'getpw'], ['get-sensitive', 'getpw'], ['textarea-resize', 'ta'], ['label-unbound', 'lb1'], ['label-unbound', 'lb2'], ['label-proximity', 'farlab'], ['invalid-undescribed', 'inv'],
  ['required-unsaid', 'star'], ['label-overridden', 'over'], ['autocomplete-off', 'pw'], ['numeric-keyboard', 'otp'], ['number-for-code', 'zip'], ['split-code', 'boxes'], ['identifier-correction', 'user'],
  ['invalid-on-load', 'inv2'], ['submit-disabled', 'dis'], ['control-hidden', 'hidlab'], ['latin-only', 'first'], ['submit-wording', 'ok'], ['radio-group', 'r1'], ['describedby-missing', 'desc'], ['input-type', 'mail'],
  ['visual-order', 'rev'], ['placeholder-instruction', 'ph'], ['inline-handler', 'inl']];

const COMPONENTS = `export function App() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-s4 p-s4">
      <style>{"dialog#shown { display: block; position: static }"}</style>
      <h1>Bad components</h1>
      <nav id="crumbs" aria-label="Breadcrumb"><ul><li><a href="/x">Home</a></li><li>/</li><li><a href="/x/y">Docs</a></li></ul></nav>
      <a id="cardlink" href="/card">Card title <button type="button">Save</button></a>
      <section id="car" aria-roledescription="carousel"><div role="group" aria-roledescription="slide">one</div><div role="group" aria-roledescription="slide">two</div></section>
      <div id="fakedlg" role="dialog"><p>Are you sure?</p></div>
      <dialog id="shown" aria-label="Shown"><button type="button">x</button></dialog>
      <dialog id="openattr" open aria-modal="true" aria-label="Open attr"><button type="button">Close</button></dialog>
      <div id="menu" role="menu" aria-label="Actions"><button type="button">Rename</button></div>
      <button id="stray" type="button" role="menuitem">Stray item</button>
      <nav aria-label="Site"><ul id="navmenu" role="menubar" aria-label="Site"><li role="none"><a role="menuitem" href="/a">A</a></li><li role="none"><a role="menuitem" href="/b">B</a></li></ul></nav>
      <button id="pop" type="button" aria-haspopup="menu">Options</button>
      <div id="sw" role="switch" tabIndex={0}>Wifi</div>
      <nav id="mainnav" aria-label="Main"><a href="/">Home</a><a href="/about">About</a></nav>
      <nav aria-label="More"><a href="/m" aria-current="page">M</a><details id="det"><summary>More</summary><a href="/c">C</a></details></nav>
      <nav id="two" aria-label="Two"><a href="/p" aria-current="page">P</a><a href="/q" aria-current="page">Q</a></nav>
      <div id="tabs" role="tablist" style={{ display: 'flex', flexWrap: 'wrap', width: 200 }}>
        <button id="seltab" role="tab" aria-selected="true" style={{ fontWeight: 700, width: 90 }}>One</button>
        <button role="tab" aria-selected="true" style={{ width: 90 }}>Two</button>
        <button role="tab" aria-selected="false" style={{ width: 90 }}>Three</button>
        <button role="tab" aria-selected="false" style={{ width: 90 }}>Four</button>
      </div>
      <div>
        <div id="p1" role="tabpanel">Panel one</div>
        <div id="p2" role="tabpanel">Panel two</div>
      </div>
      <div role="tablist" aria-label="Pages"><a id="linktab" role="tab" aria-selected="true" href="/one">One</a><a role="tab" aria-selected="false" tabIndex={-1} href="/two">Two</a></div>
      <button id="loosetab" type="button" role="tab" aria-selected="false">Loose tab</button>
      <div id="tb" role="toolbar"><button type="button">Bold</button></div>
      <button id="copy" type="button" aria-pressed="false">Copy</button>
      <div id="mb" role="menubar"><button type="button" role="menuitem">File</button></div>
      <progress id="pr" value="40" max="100" tabIndex={0} />
      <div id="divpr" role="progressbar" aria-valuenow={40} aria-label="Upload" style={{ width: 100, height: 8 }} />
      <div id="exp" aria-expanded="false">Plain box</div>
      <button id="sync" type="button" aria-expanded="false" aria-controls="panel">Toggle</button>
      <div id="panel">I am showing</div>
    </main>
  );
}
`;
const COMPONENTS_EXPECTED = [['breadcrumb-list', 'crumbs'], ['breadcrumb-current', 'crumbs'], ['breadcrumb-separator', 'crumbs'], ['link-nested-control', 'cardlink'], ['carousel-name', 'car'], ['dialog-name', 'fakedlg'],
  ['dialog-native', 'fakedlg'], ['dialog-close', 'fakedlg'], ['dialog-display', 'shown'], ['dialog-fake-modal', 'openattr'], ['menu-structure', 'menu'], ['menu-structure', 'stray'], ['nav-as-menu', 'navmenu'],
  ['popup-expanded', 'pop'], ['checked-missing', 'sw'], ['nav-current', 'mainnav'], ['nav-details', 'det'], ['current-many', 'two'], ['tablist-name', 'tabs'], ['tab-selected', 'tabs'], ['tabs-wrap', 'tabs'],
  ['tab-stops', 'tabs'], ['tab-shift', 'seltab'], ['tabpanel-name', 'p1', 'p2'], ['tabpanel-many', 'p2'], ['tabs-as-nav', 'linktab'], ['tab-structure', 'loosetab'], ['toolbar-name', 'tb'], ['pressed-on-action', 'copy'],
  ['menubar-name', 'mb'], ['progress-name', 'pr'], ['progress-tabindex', 'pr'], ['progress-native', 'divpr'], ['expanded-on-generic', 'exp'], ['expanded-out-of-sync', 'sync']];

// a real modal has to be opened from script: its two rules on their own page
const MODAL = `import { useEffect, useRef } from 'react';
export function App() {
  const ref = useRef(null);
  useEffect(() => { document.body.style.overflow = 'hidden'; if (!ref.current.open) ref.current.showModal(); }, []);
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-s4 p-s4">
      <h1>Modal</h1>
      <dialog id="modal" ref={ref} aria-modal="true" aria-label="Really?"><button type="button">Close</button></dialog>
    </main>
  );
}
`;

const HTML = `export function App() {
  return (
    <div id="root-el" className="mx-auto flex max-w-5xl flex-col gap-s4 p-s4">
      <img id="lazy" alt="lazy" loading="lazy" src="/wide.svg" width="400" height="300" />
      <header>Top</header>
      <header id="hd2">Second top</header>
      <h2>Bad html</h2>
      <div id="fake"><div>• one thing</div><div>• two things</div><div>• three things</div></div>
      <div><li id="looseli">loose item</li></div>
      <div id="hand" style={{ cursor: 'pointer' }}>Click me</div>
      <a id="hash" href="#">Do it</a>
      <input id="bool" aria-label="b" ref={(e) => e && e.setAttribute('disabled', 'disabled')} />
      <figure id="fig"><img alt="x" src="${PX}" width="40" height="40" /></figure>
      <pre id="pre1" style={{ width: 200, overflowX: 'auto' }}>{"const answer = 42; function veryLongFunctionNameThatRunsOffTheEdgeOfItsBox() { return answer; }"}</pre>
      <pre id="pre2" tabIndex={0}><code>x</code></pre>
      <img id="nosize" alt="no size" src="/wide.svg" style={{ width: 300 }} />
      <img id="hi1" alt="a" fetchpriority="high" src="${PX}" width="10" height="10" />
      <img alt="b" fetchpriority="high" src="${PX}" width="10" height="10" />
      <img alt="c" fetchpriority="high" src="${PX}" width="10" height="10" />
      <picture id="pic"><source srcSet="/a.webp" /></picture>
      <details id="d1"><p>before</p><summary>Late summary</summary></details>
      <details><summary id="d2" style={{ listStyle: 'none' }}>No arrow <a href="/x">link</a></summary>body</details>
      <span id="tip" title="More about this">Hover me</span>
      <video id="vid" controls src="/none.mp4" style={{ width: 200 }} />
      <video id="bg" autoPlay muted loop controls src="/none.mp4" width="100" height="60" />
      <audio id="aud" autoPlay src="/none.mp3" />
      <div aria-hidden="true"><iframe id="fr" title="f" srcDoc="<p>x</p>" width="100" height="40" /></div>
      <button id="inl" type="button" ref={(e) => e && e.setAttribute('onclick', 'x()')}>Inline</button>
      <div style={{ height: 2400 }} />
      <img id="far" alt="far" src="/wide.svg" width="300" height="200" />
      <footer>End</footer>
      <footer id="ft2">Second end</footer>
    </div>
  );
}
`;
// a page that says nothing about itself: no doctype, no language, a viewport that forbids zoom and names no width
const BARE_INDEX = '<html><head><meta charset="utf-8"><meta name="viewport" content="user-scalable=no"><title>bare</title></head><body><div id="root"></div><script type="module" src="/src/entry.jsx"></script></body></html>';
const WIDE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="#888"/></svg>';
const HTML_EXPECTED = [['page-lang', 'root-el'], ['viewport-meta', 'root-el'], ['zoom-disabled', 'root-el'], ['quirks-mode', 'root-el'], ['landmark-main', 'root-el'], ['h1-missing', 'root-el'], ['lazy-above-fold', 'lazy'],
  ['banner-many', 'hd2'], ['banner-many', 'ft2'], ['list-fake', 'fake'], ['list-structure', 'looseli'], ['pointer-generic', 'hand'], ['link-as-button', 'hash'], ['boolean-value', 'bool'], ['figure-caption', 'fig'],
  ['pre-no-code', 'pre1'], ['pre-scroll-keyboard', 'pre1'], ['pre-scroll-region', 'pre2'], ['img-size', 'nosize'], ['fetchpriority-overused', 'hi1'], ['picture-img', 'pic'], ['summary-first', 'd1'],
  ['summary-nested-control', 'd2'], ['summary-no-cue', 'd2'], ['title-tooltip', 'tip'], ['video-size', 'vid'], ['video-poster', 'vid'], ['video-captions', 'vid'], ['background-video', 'bg'], ['autoplay-sound', 'aud'],
  ['iframe-hidden', 'fr'], ['inline-handler', 'inl'], ['eager-below-fold', 'far']];

// a 1.4 KB TrueType face (boxes for a to z), made with fontTools: a real web font the page can load
const SLOW_TTF = Buffer.from('AAEAAAAKAIAAAwAgT1MvMkEXQbIAAAEoAAAAYGNtYXAAzQA8AAABxAAAADxnbHlmYcqN5AAAAjwAAAK+aGVhZC9Gbg4AAACsAAAANmhoZWEFFgFgAAAA5AAAACRobXR4BLACvAAAAYgAAAA6bG9jYQn0CUsAAAIAAAAAOm1heHAAHgAGAAABCAAAACBuYW1lkMmi3gAABPwAAABjcG9zdAQ+BBAAAAVgAAAAWgABAAAAAQAAre6uDF8PPPUAAwPoAAAAAOceFTkAAAAA5x4VOQAyAAABwgK8AAAAAwACAAAAAAAAAAEAAAMg/zgAAAH0ADIAMgHCAAEAAAAAAAAAAAAAAAAAAAABAAEAAAAcAAQAAQAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAwH0AZAABQAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAPz8/PwAAACAAegAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAB9AAyADIAMgAyADIAMgAyADIAMgAyADIAMgAyADIAMgAyADIAMgAyADIAMgAyADIAMgAyADIAMgAyAAAAAAACAAAAAwAAABQAAwABAAAAFAAEACgAAAAGAAQAAQACACAAev//AAAAIABh////4f+hAAEAAAAAAAAAAAANAA0AGgAnADQAQQBOAFsAaAB1AIIAjwCcAKkAtgDDANAA3QDqAPcBBAERAR4BKwE4AUUBUgFfAAAAAQAyAAABwgK8AAMAADMRIREyAZACvP1EAAABADIAAAHCArwAAwAAMxEhETIBkAK8/UQAAAEAMgAAAcICvAADAAAzESERMgGQArz9RAAAAQAyAAABwgK8AAMAADMRIREyAZACvP1EAAABADIAAAHCArwAAwAAMxEhETIBkAK8/UQAAAEAMgAAAcICvAADAAAzESERMgGQArz9RAAAAQAyAAABwgK8AAMAADMRIREyAZACvP1EAAABADIAAAHCArwAAwAAMxEhETIBkAK8/UQAAAEAMgAAAcICvAADAAAzESERMgGQArz9RAAAAQAyAAABwgK8AAMAADMRIREyAZACvP1EAAABADIAAAHCArwAAwAAMxEhETIBkAK8/UQAAAEAMgAAAcICvAADAAAzESERMgGQArz9RAAAAQAyAAABwgK8AAMAADMRIREyAZACvP1EAAABADIAAAHCArwAAwAAMxEhETIBkAK8/UQAAAEAMgAAAcICvAADAAAzESERMgGQArz9RAAAAQAyAAABwgK8AAMAADMRIREyAZACvP1EAAABADIAAAHCArwAAwAAMxEhETIBkAK8/UQAAAEAMgAAAcICvAADAAAzESERMgGQArz9RAAAAQAyAAABwgK8AAMAADMRIREyAZACvP1EAAABADIAAAHCArwAAwAAMxEhETIBkAK8/UQAAAEAMgAAAcICvAADAAAzESERMgGQArz9RAAAAQAyAAABwgK8AAMAADMRIREyAZACvP1EAAABADIAAAHCArwAAwAAMxEhETIBkAK8/UQAAAEAMgAAAcICvAADAAAzESERMgGQArz9RAAAAQAyAAABwgK8AAMAADMRIREyAZACvP1EAAABADIAAAHCArwAAwAAMxEhETIBkAK8/UQAAAEAMgAAAcICvAADAAAzESERMgGQArz9RAAAAAAAAAQANgABAAAAAAABAAgAAAABAAAAAAACAAcACAADAAEECQABABAADwADAAEECQACAA4AH1Nsb3dmYWNlUmVndWxhcgBTAGwAbwB3AGYAYQBjAGUAUgBlAGcAdQBsAGEAcgAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcAAAAAwBEAEUARgBHAEgASQBKAEsATABNAE4ATwBQAFEAUgBTAFQAVQBWAFcAWABZAFoAWwBcAF0AAA==', 'base64');
// what only the drawn page shows. No title, a dark ground the browser is never told about, a web font with no font-display,
// a loop with no reduced-motion style, and a spinner that says nothing (it speaks now that what holds a loop is judged).
const EXPERIENCE_INDEX = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><script src="/blocking.js"></script></head><body style="background:#111;color:#eee"><div id="root"></div><script type="module" src="/src/entry.jsx"></script></body></html>';
const EXPERIENCE = `export function App() {
  const far = 'http://[::ffff:7f00:1]:' + location.port; // this server under an address that is not plainly local
  return (
    <div id="root-el" className="flex flex-col gap-s4 p-s4">
      <style>{"@font-face { font-family: Slowface; src: url(/slow.ttf) format('truetype'); } @keyframes drift { to { translate: 20px 0 } } @keyframes turn { to { rotate: 360deg } } .drift { animation: drift 2s linear infinite alternate } .spinner { animation: turn 1s linear infinite }"}</style>
      <div style={{ position: 'relative', width: 200, height: 40 }}>
        <button id="under" type="button" style={{ width: 200, height: 40 }}>Under</button>
        <div id="cover" style={{ position: 'absolute', inset: 0, zIndex: 5 }} />
      </div>
      <nav aria-label="Main"><a href="/a">One</a><a href="/b">Two</a><a href="/c">Three</a><a href="/d">Four</a><a href="/e">Five</a><a href="/f">Six</a><a href="/g">Seven</a><a href="/h">Eight</a><a href="/i">Nine</a><a href="/j">Ten</a></nav>
      <main>
        <h1>Bad experience</h1>
        <p style={{ fontFamily: 'Slowface' }}>set in a web font that hides its words while it loads</p>
        <img src={far + '/wide.svg'} alt="" width="20" height="20" /><img src={far + '/wide.svg?2'} alt="" width="20" height="20" />
        <p id="nowrap" style={{ whiteSpace: 'nowrap' }}>This is a whole sentence of ordinary words that has been told it may never wrap onto a second line.</p>
        <p id="just" style={{ textAlign: 'justify', width: 260 }}>This paragraph is justified without hyphenation, so its spaces stretch to fill every line and open rivers of white that run down through the text for anyone reading it.</p>
        <p id="caps" style={{ textTransform: 'uppercase' }}>An entire sentence set in capitals is read letter by letter instead of word by word.</p>
        <div id="wide" style={{ width: 3000, height: 4 }} />
        <div><div id="loop" className="drift" style={{ width: 200, height: 40 }}>drifting</div></div>
        <div id="spinbox"><div className="spinner" style={{ width: 20, height: 20, border: '2px solid' }} /></div>
        <a id="l1" href="/pricing">Pricing</a>
        <a id="l2" href="/pricing">What it costs</a>
        <ul>
          <li>First <button id="del1" type="button">Delete</button></li>
          <li>Second <button type="button">Delete</button></li>
          <li>Third <button type="button">Delete</button></li>
        </ul>
        <button id="state" type="button" aria-pressed="false" aria-label="Copy, not selected">c</button>
        <div id="scroller" style={{ height: 60, overflowY: 'auto', width: 300 }}><p>line one</p><p>line two</p><p>line three</p><p>line four</p><p>line five</p></div>
        <div id="strip" style={{ display: 'flex', overflowX: 'auto', scrollbarWidth: 'none', width: 300 }}><span style={{ flex: 'none', width: 150 }}>one</span><span style={{ flex: 'none', width: 150 }}>two</span><span style={{ flex: 'none', width: 150 }}>three</span></div>
      </main>
    </div>
  );
}
`;
const EXPERIENCE_EXPECTED = [['nowrap-sentence', 'nowrap'], ['justify-rivers', 'just'], ['caps-long', 'caps'], ['page-overflow-x', 'root-el'], ['motion-no-opt-out', 'root-el'], ['script-blocking', 'root-el'],
  ['page-title', 'root-el'], ['skip-link', 'root-el'], ['color-scheme-missing', 'root-el'], ['link-target-renamed', 'l2'], ['button-name-reused', 'del1'], ['state-in-label', 'state'], ['scroll-no-hint', 'strip'],
  ['scroll-keyboard', 'scroller'], ['control-covered', 'under'], ['font-display', 'root-el'], ['preconnect-missing', 'root-el']];

// The same parts, built as the guides say, and the cases that once gave false hits: a keyboard hint inside a label,
// selectable icons named like actions, a roving tab stop, and four from algorecall: a form sent by script with no
// method, a switch named by a <label for>, a drawing whose numbers are not its name (and a page still loading, below).
const RIGHT = `export function App() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-s4 p-s4">
      <header><nav aria-label="Breadcrumb"><ol><li><a href="/x">Home</a></li><li><a href="/x/y" aria-current="page">Docs</a></li></ol></nav></header>
      <main>
        <h1>Right page</h1>
        <search><label>Find <kbd>/</kbd><input type="search" name="q" aria-label="Find an icon" /></label></search>
        <button type="button" aria-pressed="false" aria-label="Icon: copy">c</button>
        <div role="tablist" aria-label="Views">
          <button type="button" role="tab" id="t1" aria-selected="true" tabIndex={0}>One</button>
          <button type="button" role="tab" id="t2" aria-selected="false" tabIndex={-1}>Two</button>
        </div>
        <div role="tabpanel" aria-labelledby="t1">Panel one</div>
        <form aria-label="Sign in" method="post" action="/in">
          <label htmlFor="em">Email</label>
          <input id="em" name="email" type="email" autoComplete="email" required />
          <label htmlFor="pw">Password</label>
          <input id="pw" name="password" type="password" autoComplete="current-password" required />
          <fieldset><legend>Plan</legend><label><input type="radio" name="plan" value="a" /> Free</label><label><input type="radio" name="plan" value="b" /> Pro</label></fieldset>
          <button type="button">Cancel</button>
          <button type="submit">Sign in</button>
        </form>
        <form aria-label="Script sign in" onSubmit={(e) => e.preventDefault()}>
          <label htmlFor="pw2">Passphrase</label>
          <input id="pw2" name="passphrase" type="password" autoComplete="current-password" />
          <button type="submit">Continue</button>
        </form>
        <label htmlFor="snd">Sound</label>
        <button type="button" role="switch" aria-checked="true" id="snd" />
        <button type="button" aria-label="Two pointers: the shape this algorithm leaves">1 3 4 6 8</button>
        <ul><li>one</li><li>two</li><li>three</li></ul>
        <img alt="A grey box" src="/wide.svg" width="400" height="300" />
        <figure><img alt="A chart" src="${PX}" width="40" height="40" /><figcaption>Sales by month</figcaption></figure>
        <details><summary>More</summary>body</details>
        <label htmlFor="up">Upload</label>
        <progress id="up" value="40" max="100" />
        <button type="button" aria-expanded="false" aria-controls="later">Toggle</button>
        <a href="/elsewhere" title="Elsewhere">Elsewhere</a>
        <a href="/interfaces">Interfaces</a>
        <a href="/interfaces"><span>Vol. I</span><span>Interfaces</span></a>
      </main>
      <footer>End</footer>
    </div>
  );
}
`;

// one of each thing the security pack reads in source, each beside its safe twin
const SECURITY = `const SAFE = '<b>fixed</b>';
export function Bad({ html, name, el }) {
  window.addEventListener('message', (event) => { document.title = event.data.title; });
  window.addEventListener('message', (event) => { if (event.origin !== 'https://ok.example') return; document.title = event.data; });
  parent.postMessage({ token: name }, '*');
  parent.postMessage({ ok: true }, 'https://ok.example');
  const policy = trustedTypes.createPolicy('p', { createHTML: (s) => s });
  document.cookie = 'session=' + name + '; path=/';
  document.cookie = 'theme=dark; path=/; Secure; SameSite=Lax';
  fetch('http://api.example.com/data');
  fetch('http://localhost:3000/data');
  el.innerHTML = SAFE;
  el.innerHTML = '<b>' + name + '</b>';
  return (<div>
    <script src="https://cdn.example.com/lib@1.0.0.js" />
    <script src="https://cdn.example.com/lib@1.0.0.js" integrity="sha384-x" crossOrigin="anonymous" />
    <a href="http://example.com">a link is navigation</a>
    <div dangerouslySetInnerHTML={{ __html: SAFE }} />
    {policy ? null : html}
  </div>);
}
`;
const SECURITY_APP = `import { Bad } from './Bad.jsx';
export function App() { return <main><h1>Source</h1>{false && <Bad />}</main>; }
`;
// rule → the text of the line it must name, and the safe twin's line it must not
const SECURITY_EXPECTED = [['message-origin', 'event.data.title'], ['postmessage-target', "'*'"], ['trusted-types-pass-through', 'createHTML: (s) => s'], ['cookie-flags', "'session='"],
  ['insecure-resource', 'http://api.example.com'], ['dom-sink', "'<b>' + name"], ['subresource-integrity', 'lib@1.0.0.js" />']];
const SECURITY_SAFE = ["event.origin !== 'https://ok.example'", "{ ok: true }", 'theme=dark', 'localhost:3000', 'el.innerHTML = SAFE', 'integrity="sha384-x"', 'a link is navigation', '__html: SAFE'];

test('accessibility pack: each of its 24 rules names its problem at the line that has it', { timeout: 240000 }, async (t) => {
  if (!await built()) return t.skip('Run npm run build first.');
  speaks(await said(t, A11Y), 'a11y', A11Y, A11Y_EXPECTED);
});

test('forms pack: 32 rules name their problem at its line', { timeout: 240000 }, async (t) => {
  if (!await built()) return t.skip('Run npm run build first.');
  speaks(await said(t, FORMS), 'forms', FORMS, FORMS_EXPECTED);
});

test('components pack: 33 rules name their problem at its line, and a real modal gets its two', { timeout: 300000 }, async (t) => {
  if (!await built()) return t.skip('Run npm run build first.');
  speaks(await said(t, COMPONENTS), 'components', COMPONENTS, COMPONENTS_EXPECTED);
  speaks(await said(t, MODAL), 'components', MODAL, [['dialog-aria-extras', 'modal'], ['dialog-scroll-lock', 'modal']]);
});

test('HTML pack: 32 rules name their problem at its line, the page-wide ones once, on the page’s own element', { timeout: 240000 }, async (t) => {
  if (!await built()) return t.skip('Run npm run build first.');
  const by = await said(t, HTML, { index: BARE_INDEX, files: { 'public/wide.svg': WIDE_SVG } });
  speaks(by, 'html', HTML, HTML_EXPECTED);
  for (const rule of ['page-lang', 'viewport-meta', 'zoom-disabled', 'quirks-mode', 'landmark-main', 'h1-missing']) assert.equal(by.get(`html/${rule}`).length, 1, `${rule} is said once`);
});

test('experience pack: 17 rules name what only the drawn page shows, and the spinner that says nothing is heard', { timeout: 240000 }, async (t) => {
  if (!await built()) return t.skip('Run npm run build first.');
  const by = await said(t, EXPERIENCE, { index: EXPERIENCE_INDEX, files: { 'public/wide.svg': WIDE_SVG, 'public/slow.ttf': SLOW_TTF, 'public/blocking.js': '/* nothing */' } });
  speaks(by, 'experience', EXPERIENCE, EXPERIENCE_EXPECTED);
  speaks(by, 'components', EXPERIENCE, [['spinner-silent', 'spinbox']]);
  // an icon called Copy that can be picked: its state is in its label (said above), and it is not an action given a state
  assert.equal(by.get('components/pressed-on-action'), undefined);
});

test('the same parts built right, with the cases that once gave false hits: no pack says anything', { timeout: 240000 }, async (t) => {
  if (!await built()) return t.skip('Run npm run build first.');
  assert.deepEqual(ofPacks(await said(t, RIGHT, { files: { 'public/wide.svg': WIDE_SVG } })), []);
});

const LOADING = `export function App() {
  return (<div role="status" aria-busy="true"><h2>Loading</h2><p>Fetching your problems</p></div>);
}
`;
// one line of code that draws thirty buttons, each with the same two faults: said once per check, at that line, with the
// count in its words, never thirty times (crafting-ui's icon grid draws 89 such buttons from one line). Marks on the page
// stay per element; what a person reads (the CLI's findings, the overlay's records) is per place.
const MANY = `const ICONS = Array.from({ length: 30 }, (_, i) => 'Icon ' + (i + 1));
export function App() {
  return (
    <main className="flex flex-col gap-s4 p-s4">
      <h1>Thirty</h1>
      <ul>{ICONS.map((name) => <li key={name}>{name}
        <button id="pick" type="button" aria-pressed="false" aria-label={name + ', not selected'}>i</button>
        <button id="del" type="button">Delete</button></li>)}</ul>
      <button id="lone" type="button" aria-pressed="true" aria-label="Bold, selected">B</button>
    </main>
  );
}
`;
test('one line that draws thirty buttons is one finding per check, at that line, with the count said', { timeout: 240000 }, async (t) => {
  if (!await built()) return t.skip('Run npm run build first.');
  const { root, url } = await fixture(t, MANY);
  const result = await plumber(['craft', '--url', url, '--json', '--no-probe', '--no-pairs', '--root', root]);
  const report = JSON.parse(result.stdout);
  const records = report.routes.flatMap((r) => r.findings);
  const at = (list, rule) => list.filter((f) => f.rule === rule).map((f) => f.line ?? f.sites[0].line).sort((a, b) => a - b);
  const pick = lineOf(MANY, 'pick'), del = lineOf(MANY, 'del'), lone = lineOf(MANY, 'lone');
  // the label that repeats its state: the thirty from one line are one, the lone toggle on its own line is another
  assert.deepEqual(at(report.findings, 'experience/state-in-label'), [pick, lone]);
  assert.deepEqual(at(records, 'experience/state-in-label'), [pick, lone], 'the overlay records it per place too');
  // and the one place knows it stands for thirty elements
  assert.equal(records.find((f) => f.rule === 'experience/state-in-label' && f.line === pick).count, 30);
  // thirty buttons named Delete: one finding, and its words carry the count rather than repeating it
  const reused = report.findings.filter((f) => f.rule === 'experience/button-name-reused');
  assert.equal(reused.length, 1, JSON.stringify(reused));
  assert.equal(reused[0].sites[0].line, del);
  assert.match(reused[0].title, /\b30 buttons\b/);
  // and the plain report says each once
  const text = await plumber(['craft', '--url', url, '--no-probe', '--no-pairs', '--root', root]);
  assert.equal(text.stdout.match(/experience\/state-in-label/g)?.length, 2, text.stdout);
  assert.equal(text.stdout.match(/experience\/button-name-reused/g)?.length, 1, text.stdout);
});

test('on the page, thirty rows from one line say as much as three (the fewest the repeated-name check needs)', { timeout: 240000 }, async (t) => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.PLUMBER_CHROMIUM || undefined });
  t.after(() => browser.close());
  const problems = async (app) => {
    const { url } = await fixture(t, app);
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
    await page.goto(url);
    await page.waitForFunction(() => window.__plumb); await page.evaluate(() => window.__plumb.ready());
    await page.keyboard.press('Alt+B');
    await page.waitForFunction(() => window.__plumb.overlay.progress?.done, null, { timeout: 60000 });
    // what the bar says: its count, and the rest of the line it reads out (fixes, notes)
    await page.waitForFunction(() => !/checking/i.test(document.querySelector('plumb-overlay').shadowRoot.querySelector('.fx .status')?.textContent ?? 'checking'), null, { timeout: 60000 });
    const said = await page.evaluate(() => { const st = document.querySelector('plumb-overlay').shadowRoot.querySelector('.fx .status'); return { count: st.querySelector('.count').textContent, rest: st.getAttribute('aria-description') ?? '' }; });
    const marked = await page.evaluate(() => [...document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.bp .hit')].filter((h) => h.dataset.id.endsWith('experience/state-in-label')).length);
    await page.close();
    return { ...said, marked };
  };
  const many = await problems(MANY), three = await problems(MANY.replace('length: 30', 'length: 3'));
  // what is counted is places; what is marked is elements (the thirty each carry their own mark)
  assert.deepEqual({ count: many.count, rest: many.rest }, { count: three.count, rest: three.rest }, JSON.stringify({ many, three }));
  assert.ok(many.marked > three.marked, JSON.stringify({ many, three }));
});

// algorecall's showcase page has no <main>; the finding was said on the first element judged, an icon in a feedback dock
// drawn before the page, so the report named the dock's file. A finding about the page belongs on the page's own element.
const DOCKED = `import { useEffect, useState } from 'react';
import { Dock } from './Dock.jsx';
export function App() {
  // the page's body arrives after a moment (its data loads), the dock is there at once: the page is read in waves
  const [ready, setReady] = useState(false);
  useEffect(() => { const t = setTimeout(() => setReady(true), 1200); return () => clearTimeout(t); }, []);
  return (
    <>
      <Dock />
      {ready && <div id="page-root" className="flex flex-col gap-s4 p-s4">
        <h1>Showcase</h1>
        ${'<p>A section of the page, with enough words in it to be read as content.</p>\n        '.repeat(40)}
      </div>}
    </>
  );
}
`;
const DOCK = `const NOTES = Array.from({ length: 48 }, (_, i) => 'Note ' + (i + 1));
export function Dock() {
  return <div id="dock" style={{ position: 'fixed', right: 16, bottom: 16, width: 120, height: 160, overflow: 'hidden' }}><ul>{NOTES.map((n) => <li key={n}><span>{n}</span></li>)}</ul></div>;
}
`;
test('a finding about the whole page is said on the page, not on a dock drawn before it', { timeout: 240000 }, async (t) => {
  if (!await built()) return t.skip('Run npm run build first.');
  const by = await said(t, DOCKED, { files: { 'src/Dock.jsx': DOCK } });
  assert.deepEqual(by.get('html/landmark-main'), [lineOf(DOCKED, 'page-root')], JSON.stringify(ofPacks(by)));
});

// algorecall's skill tree never counted as read through: something on it rewrites an inline style every frame, the page's
// fingerprint changed with it, and every element's page-wide judgement was put back in the queue before the queue could
// drain. Then the same for an element's own: sixty labels in a drawing, each moved every frame, never stayed judged.
// A box and sixty labels moved by script, as an animation library moves them, beside 1,500 elements to judge.
const MOVED = `import { useEffect, useRef } from 'react';
const ROWS = Array.from({ length: 300 }, (_, i) => i);
export function App() {
  const box = useRef(null);
  const dots = useRef(null);
  // as an animation library moves things: an inline transform rewritten every frame, on one box and on sixty labels in a drawing
  useEffect(() => { let f = 0, id = 0; const tick = () => { f++; if (box.current) box.current.style.transform = 'translateX(' + (f % 40) + 'px)'; for (const [i, t] of [...(dots.current?.children ?? [])].entries()) t.style.transform = 'translateX(' + ((f + i) % 30) + 'px) translateY(' + (i % 6) * 12 + 'px)'; id = requestAnimationFrame(tick); }; id = requestAnimationFrame(tick); return () => cancelAnimationFrame(id); }, []);
  return (
    <main className="flex flex-col gap-s4 p-s4">
      <h1>Moving</h1>
      <div ref={box} id="moved" style={{ width: 40, height: 40 }}>moved by script</div>
      <svg width="400" height="80" viewBox="0 0 400 80"><g ref={dots}>{Array.from({ length: 60 }, (_, i) => <text key={i} x={(i % 10) * 36} y="12" fontSize="10">{i}</text>)}</g></svg>
      <ul>{ROWS.map((i) => <li key={i}><span>Row {i}</span> <b>{i}</b> <i>note</i> <em>more</em></li>)}</ul>
    </main>
  );
}
`;
test('a page with a box moved by script every frame is still read through', { timeout: 240000 }, async (t) => {
  if (!await built()) return t.skip('Run npm run build first.');
  const { root, url } = await fixture(t, MOVED);
  const result = await plumber(['craft', '--url', url, '--json', '--no-probe', '--no-pairs', '--timeout', '45000', '--root', root]);
  const page = JSON.parse(result.stdout).routes[0];
  assert.ok(page.read > 0, `read ${page.read}`);
  assert.equal(page.complete, true, 'stopped before every element was read');
});

// algorecall's /login was judged as its loading screen (14 elements of 118) once pages settled quickly: the dev server was
// still compiling the route on its first visit. A route whose code arrives three seconds late, behind a small fallback.
const LATE = `import { lazy, Suspense } from 'react';
const late = '/late-route.js';
const Real = lazy(() => import(/* @vite-ignore */ late).then(() => import('./Real.jsx')));
export function App() {
  return <Suspense fallback={<div><span>Loading</span></div>}><Real /></Suspense>;
}
`;
const REAL = `export default function Real() {
  return (
    <main className="flex flex-col gap-s4 p-s4">
      <h1>Sign in</h1>
      <h3 id="skipped">Welcome back</h3>
      ${'<p>Words on the page, so there is a page to judge once it is here.</p>\n      '.repeat(30)}
    </main>
  );
}
`;
const lateRoute = { name: 'late-route', configureServer(server) { server.middlewares.use('/late-route.js', (_req, res) => setTimeout(() => { res.setHeader('content-type', 'text/javascript'); res.end('export default 1;'); }, 3000)); } };
test('a route whose code arrives late is judged once it is there, not as its loading screen', { timeout: 240000 }, async (t) => {
  if (!await built()) return t.skip('Run npm run build first.');
  const by = await said(t, LATE, { files: { 'src/Real.jsx': REAL }, plugins: [lateRoute] });
  assert.deepEqual(by.get('a11y/heading-skip'), [lineOf(REAL, 'skipped')], JSON.stringify(ofPacks(by)));
});

// The reader's one line of readings: 600 elements built by script (each read on its own) and twenty from a pass-through
// component, all read through. This guards the line; it does not force the race that stranded six elements on
// algorecall's problems page (a pass-through element asked again while 128 readings were in flight, in a line of its
// own that nothing pumped): batching lands readings together, so a small page rarely meets it. That is proven on the app.
const CROWD = `import { useLayoutEffect, useRef } from 'react';
import { Box } from './Box.jsx';
export function App() {
  const host = useRef(null);
  useLayoutEffect(() => { for (let i = 0; i < 600; i++) { const d = document.createElement('div'); d.className = 'p-2'; d.textContent = 'built ' + i; host.current.append(d); } }, []);
  return (
    <main className="flex flex-col gap-s4 p-s4">
      <h1>Crowd</h1>
      {Array.from({ length: 20 }, (_, i) => <Box key={i} className="p-3 rounded-md">passed {i}</Box>)}
      <div ref={host} />
    </main>
  );
}
`;
const BOX = `export function Box({ className, children }) { return <div className={className}>{children}</div>; }
`;
test('a crowded page with pass-through parts is read through', { timeout: 240000 }, async (t) => {
  if (!await built()) return t.skip('Run npm run build first.');
  const { root, url } = await fixture(t, CROWD, { files: { 'src/Box.jsx': BOX } });
  const result = await plumber(['craft', '--url', url, '--json', '--no-probe', '--no-pairs', '--timeout', '45000', '--root', root]);
  assert.equal(JSON.parse(result.stdout).routes[0].complete, true, 'stopped before every element was read');
});

test('a page that is still loading is not told it has no main and no h1', { timeout: 240000 }, async (t) => {
  if (!await built()) return t.skip('Run npm run build first.');
  assert.deepEqual(ofPacks(await said(t, LOADING)), []);
});

test('security pack: each of its 7 rules names the unsafe line in source and leaves its safe twin alone', { timeout: 240000 }, async (t) => {
  if (!await built()) return t.skip('Run npm run build first.');
  const { root } = await fixture(t, SECURITY_APP, { files: { 'src/Bad.jsx': SECURITY, 'package.json': '{ "name": "packs-source", "private": true, "type": "module" }' } });
  const result = await plumber(['check', '--root', root, '--json']);
  assert.ok(result.stdout, `check printed nothing: ${result.stderr}`);
  const report = JSON.parse(result.stdout);
  const lines = SECURITY.split('\n');
  const found = report.findings.filter((f) => f.rule.startsWith('security/')).map((f) => ({ rule: f.rule, text: lines[f.sites[0].line - 1] ?? '' }));
  const missing = SECURITY_EXPECTED.filter(([rule, text]) => !found.some((f) => f.rule === `security/${rule}` && f.text.includes(text))).map(([rule]) => rule);
  assert.deepEqual(missing, [], `spoke: ${JSON.stringify(found.map((f) => `${f.rule}: ${f.text.trim().slice(0, 50)}`))}`);
  assert.deepEqual(SECURITY_SAFE.filter((text) => found.some((f) => f.text.includes(text))), [], 'a safe twin was named');
});

// ── near misses ─────────────────────────────────────────────
// For every rule, the closest thing to its problem that is right. A rule that speaks here is wrong about something
// people build on purpose. One page per pack; no pack may say anything on any of them.
const NEAR_A11Y = `export function App() {
  return (
    <div className="flex flex-col gap-s4 p-s4">
      <a href="#content">Skip to content</a>
      <nav aria-label="Primary"><a href="/a">Read more</a> <a href="/a">Read more</a></nav>
      <nav aria-label="Secondary"><a href="/b">Pricing</a></nav>
      <main id="content">
        <h1>Near misses</h1>
        <h2>Section</h2>
        <h3>Sub</h3>
        <h2>Back up a level</h2>
        <button type="button" aria-label="Close"><svg aria-hidden="true" width="16" height="16"><circle cx="8" cy="8" r="6" /></svg></button>
        <span id="lbl">Volume</span>
        <button type="button" aria-labelledby="lbl"><svg aria-hidden="true" width="16" height="16"><circle cx="8" cy="8" r="6" /></svg></button>
        <label htmlFor="nm">Nickname</label>
        <input id="nm" name="nickname" />
        <img alt="" src="${PX}" width="40" height="40" />
        <img role="presentation" src="${PX}" width="40" height="40" />
        <img alt="Photo album cover for Blue" src="${PX}" width="40" height="40" />
        <svg role="img" width="24" height="24"><title>Sales rising</title><circle cx="12" cy="12" r="10" /></svg>
        <button type="button"><svg aria-hidden="true" width="16" height="16"><circle cx="8" cy="8" r="6" /></svg> Save</button>
        <div role="tablist" aria-label="Views"><button type="button" role="tab" aria-selected="true" tabIndex={0}>One</button><button type="button" role="tab" aria-selected="false" tabIndex={-1}>Two</button></div>
        <div aria-hidden="true"><button type="button" tabIndex={-1}>Decoration</button></div>
        <div role="group" aria-label="Filters"><button type="button">All</button></div>
        <button type="button" aria-label="Close dialog">Close</button>
        <a href="/radio" aria-label="Listen to radio stations">Radio</a>
        <iframe title="Map of the office" srcDoc="<p>x</p>" width="100" height="40" />
        <table><thead><tr><th>Name</th><th>Age</th></tr></thead><tbody><tr><td>A</td><td>1</td></tr></tbody></table>
        <table role="presentation"><tbody><tr><td>left</td><td>right</td></tr><tr><td>a</td><td>b</td></tr></tbody></table>
        <h3>Questions</h3>
        <details><summary>What is it?</summary>An answer.</details>
        <div role="navigation" aria-label="Pages"><a href="/1">1</a></div>
        <ul><li><button type="button">In a list</button></li></ul>
        <label htmlFor="em">Email</label>
        <input id="em" name="email" type="email" autoComplete="email" />
        <label htmlFor="qy">Query</label>
        <input id="qy" name="query" />
      </main>
    </div>
  );
}
`;
const NEAR_FORMS = `export function App() {
  return (
    <main className="flex flex-col gap-s4 p-s4">
      <style>{"#uv:user-invalid { border-color: red } #fi:focus:invalid { border-color: red } .vh { position: absolute; width: 1px; height: 1px; clip-path: inset(50%); overflow: hidden; white-space: nowrap }"}</style>
      <h1>Near forms</h1>
      <search><form aria-label="Search" method="get" action="/search"><label htmlFor="q">Search</label><input id="q" name="q" type="search" /><button type="submit">Search site</button></form></search>
      <form aria-label="Profile" method="post" action="/profile">
        <fieldset><legend>Plan</legend><label><input type="radio" name="plan" value="a" /> Free</label><label><input type="radio" name="plan" value="b" /> Pro</label></fieldset>
        <fieldset aria-label="Contact"><label htmlFor="ph">Phone</label><input id="ph" name="phone" type="tel" autoComplete="tel" aria-label="Phone number" /></fieldset>
        <div style={{ marginTop: 24, marginBottom: 24 }}><label htmlFor="co" style={{ display: 'block', marginBottom: 4 }}>Company *</label><input id="co" name="company" autoComplete="organization" required /></div>
        <div style={{ marginBottom: 24 }}><label htmlFor="un" style={{ display: 'block', marginBottom: 4 }}>Username</label><input id="un" name="username" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} /></div>
        <label htmlFor="otp">Verification code</label>
        <input id="otp" name="otp" inputMode="numeric" autoComplete="one-time-code" />
        <label htmlFor="qty">Quantity</label>
        <input id="qty" name="quantity" type="number" />
        <label htmlFor="in">Initials</label>
        <div><input id="in" name="i1" maxLength={1} /><input name="i2" maxLength={1} aria-label="Second initial" /><input name="i3" maxLength={1} aria-label="Third initial" /></div>
        <label htmlFor="uv">Team</label>
        <input id="uv" name="team" required />
        <label htmlFor="fi">Role</label>
        <input id="fi" name="role" required />
        <label htmlFor="bad">Website</label>
        <input id="bad" name="website" type="url" aria-invalid="true" aria-describedby="bad-msg" />
        <p id="bad-msg">Start with https://</p>
        <label htmlFor="ok">Notes</label>
        <input id="ok" name="notes" aria-invalid="false" aria-describedby="later" autoComplete="off" />
        <label htmlFor="msg">Message</label>
        <textarea id="msg" name="message" style={{ resize: 'none', fieldSizing: 'content' }} />
        <label htmlFor="msg2">More</label>
        <textarea id="msg2" name="more" style={{ resize: 'vertical' }} />
        <label><input className="vh" type="checkbox" name="agree" /> I agree</label>
        <label htmlFor="pc">Promo code</label>
        <input id="pc" name="voucher" pattern="[A-Za-z]+" autoCapitalize="none" />
        <label htmlFor="fn">Full name</label>
        <input id="fn" name="name" autoComplete="name" pattern="[\\\\p{L}\\\\p{M}' .-]+" />
        <label htmlFor="eu">Email or username</label>
        <input id="eu" name="email_or_username" autoComplete="username" autoCapitalize="none" />
        <label htmlFor="pw">Password (8-20 characters)</label>
        <input id="pw" name="password" type="password" autoComplete="new-password" placeholder="8-20 characters" />
        <label htmlFor="ex">Work email</label>
        <input id="ex" name="work" type="email" autoComplete="email" placeholder="jane@example.com" />
        <div style={{ display: 'flex' }}><button type="button">Cancel</button><button>Save changes</button></div>
        <button type="submit" disabled aria-busy="true">Saving…</button>
      </form>
      <form aria-label="Quick add" onSubmit={(e) => e.preventDefault()}><label htmlFor="qa">Task</label><input id="qa" /></form>
      <label>Legend for the chart below</label>
    </main>
  );
}
`;
const NEAR_COMPONENTS = `export function App() {
  return (
    <div className="flex flex-col gap-s4 p-s4">
      <style>{"@keyframes turn { to { rotate: 360deg } } .spinner { animation: turn 1s linear infinite } .vh { position: absolute; width: 1px; height: 1px; clip-path: inset(50%); overflow: hidden }"}</style>
      <header><nav aria-label="Breadcrumb"><ol><li><a href="/x">Library</a></li><li><span aria-hidden="true">/</span><a href="/x/y" aria-current="page">Docs</a></li></ol></nav>
        <nav aria-label="Site"><ul><li><a href="/" aria-current="page">Home</a></li><li><a href="/about">About</a></li></ul></nav></header>
      <main>
        <h1>Near components</h1>
        <article><h2><a href="/card">Card title</a></h2><button type="button">Save for later</button></article>
        <section aria-roledescription="carousel" aria-label="Featured"><div role="group" aria-roledescription="slide" aria-label="1 of 2">one</div><div role="group" aria-roledescription="slide" aria-label="2 of 2">two</div></section>
        <dialog open aria-labelledby="dt"><h2 id="dt">Cookies</h2><form method="dialog"><button>Close</button></form></dialog>
        <dialog aria-label="Closed and not drawn"><button type="button">x</button></dialog>
        <button type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="m1">Options</button>
        <div id="m1" role="menu" aria-label="Options" hidden><button type="button" role="menuitem">Rename</button></div>
        <div role="menu" aria-label="Actions"><button type="button" role="menuitem">Rename</button><button type="button" role="menuitemcheckbox" aria-checked="true">Pinned</button></div>
        <div role="switch" aria-checked="false" tabIndex={0} aria-label="Wifi" />
        <details><summary>More links</summary><a href="/c">C</a></details>
        <div role="tablist" aria-label="Views" style={{ display: 'flex' }}>
          <button type="button" role="tab" id="t1" aria-selected="true" tabIndex={0}>One</button>
          <button type="button" role="tab" id="t2" aria-selected="false" tabIndex={-1}>Two</button>
          <button type="button" role="tab" id="t3" aria-selected="false" tabIndex={-1}>Three</button>
        </div>
        <div><div role="tabpanel" aria-labelledby="t1">Panel one</div><div role="tabpanel" aria-labelledby="t2" hidden>Panel two</div></div>
        <div role="toolbar" aria-label="Formatting"><button type="button" aria-pressed="false">Bold</button><button type="button">Copy</button></div>
        <div role="menubar" aria-label="App"><button type="button" role="menuitem">File</button></div>
        <label htmlFor="up">Upload</label>
        <progress id="up" value="40" max="100" />
        <div role="status"><div className="spinner" style={{ width: 20, height: 20, border: '2px solid' }} /><span className="vh">Loading</span></div>
        <button type="button"><span className="spinner" style={{ display: 'inline-block', width: 12, height: 12, border: '2px solid' }} /> Saving</button>
        <button type="button" aria-expanded="true" aria-controls="open-panel">Details</button>
        <div id="open-panel">Showing</div>
        <button type="button" aria-expanded="false" aria-controls="shut-panel">More</button>
        <div id="shut-panel" hidden>Not showing</div>
      </main>
    </div>
  );
}
`;
const NEAR_HTML = `export function App() {
  return (
    <div className="flex flex-col gap-s4 p-s4">
      <header>Top</header>
      <main>
        <h1>Near html</h1>
        <article><header>An article has its own header</header><p>Body</p><footer>and footer</footer></article>
        <div><div>- 5 °C outside</div><div>- 2 °C tonight</div></div>
        <ul><li>one</li></ul>
        <ol><li>first</li></ol>
        <dl><div><dt>Term</dt><dd>Meaning</dd></div></dl>
        <div style={{ cursor: 'pointer', position: 'relative' }}><h2><a href="/card">A card whose link is stretched over it</a></h2></div>
        <label style={{ cursor: 'pointer' }}><input type="checkbox" name="x" /> A label with a hand</label>
        <ul role="listbox" aria-label="Sizes"><li role="option" aria-selected="false" tabIndex={0} style={{ cursor: 'pointer' }}>Small</li></ul>
        <a href="#more">Jump to more</a>
        <a>Current page</a>
        <input aria-label="Off" disabled />
        <figure><img alt="A chart" src="${PX}" width="40" height="40" /><figcaption>Sales by month</figcaption></figure>
        <figure aria-label="Logo"><img alt="" src="${PX}" width="40" height="40" /></figure>
        <pre><code>{"const answer = 42;"}</code></pre>
        <pre>{"Monday  rain\\nTuesday sun"}</pre>
        <pre tabIndex={0} role="region" aria-label="Long code" style={{ width: 200, overflowX: 'auto' }}><code>{"const veryLongNameThatRunsOffTheEdge = anotherVeryLongNameIndeed + 1;"}</code></pre>
        <img alt="Sized" src="/wide.svg" width="400" height="300" fetchpriority="high" />
        <img alt="By ratio" src="/wide.svg" style={{ width: 200, aspectRatio: '4 / 3' }} />
        <picture><source srcSet="/wide.svg" /><img alt="In a picture" src="/wide.svg" width="400" height="300" /></picture>
        <details><summary style={{ listStyle: 'none' }}><svg aria-hidden="true" width="12" height="12"><path d="M2 4l4 4 4-4" /></svg> With its own arrow</summary>body</details>
        <span title="Exactly the words">Exactly the words</span>
        <abbr title="World Health Organization">WHO</abbr>
        <video controls width="320" height="180" poster="/wide.svg" src="/none.mp4"><track kind="captions" src="/c.vtt" srcLang="en" label="English" /></video>
        <video autoPlay muted loop aria-hidden="true" width="100" height="60" src="/none.mp4" />
        <audio controls src="/none.mp3" />
        <iframe title="A frame" srcDoc="<p>x</p>" width="100" height="40" />
        <div style={{ height: 2400 }} />
        <img id="more" alt="Far and lazy" loading="lazy" src="/wide.svg" width="300" height="200" />
      </main>
      <footer>End</footer>
    </div>
  );
}
`;
const NEAR_EXPERIENCE_INDEX = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Near experience</title><script src="/blocking.js" defer></script></head><body><div id="root"></div><script type="module" src="/src/entry.jsx"></script></body></html>';
const NEAR_EXPERIENCE = `export function App() {
  return (
    <div className="flex flex-col gap-s4 p-s4">
      <style>{"@keyframes drift { to { translate: 20px 0 } } @media (prefers-reduced-motion: no-preference) { .drift { animation: drift 2s linear infinite alternate } }"}</style>
      <a href="#content">Skip to content</a>
      <nav aria-label="Main"><a href="/a">One</a><a href="/b">Two</a><a href="/c">Three</a><a href="/d">Four</a><a href="/e">Five</a><a href="/f">Six</a><a href="/g">Seven</a><a href="/h">Eight</a><a href="/i">Nine</a><a href="/j">Ten</a></nav>
      <main id="content">
        <h1>Near experience</h1>
        <p style={{ textTransform: 'uppercase', fontSize: 10 }}>AlgoRecall &middot; Field Guide &middot; Vol. I &middot; April MMXXVI &middot; Set in dark mode by default</p>
        <div style={{ position: 'relative', width: 240, height: 40 }}>
          <button type="button" style={{ width: 240, height: 40 }}>Under a sheen</button>
          <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
        </div>
        <article style={{ position: 'relative', width: 240 }}>
          <h2><a href="/card" className="stretched">Card</a></h2>
          <div style={{ position: 'absolute', inset: 0 }} onClick={() => {}} hidden />
          <button type="button" style={{ position: 'relative', zIndex: 1 }}>Raised above</button>
        </article>
        <span style={{ whiteSpace: 'nowrap' }}>Three short words</span>
        <p style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: 200 }} title="A long line that is cut off on purpose and shows its whole self when asked to by anyone">A long line that is cut off on purpose and shows its whole self when asked to by anyone</p>
        <p lang="en" style={{ textAlign: 'justify', hyphens: 'auto', width: 260 }}>This paragraph is justified and hyphenated, so its spaces stay even from line to line and no rivers of white open up down through the words of the text.</p>
        <span style={{ textTransform: 'uppercase' }}>New this week</span>
        <div style={{ overflowX: 'auto', width: 300 }} tabIndex={0} role="region" aria-label="Wide table"><div style={{ width: 900, height: 20 }}>wide, in its own scroller</div></div>
        <div className="drift" style={{ width: 200, height: 40 }}>drifting, unless asked not to</div>
        <a href="/pricing">Pricing</a>
        <a href="/pricing">See pricing</a>
        <a href="/docs">Docs</a>
        <a href="/docs">Docs</a>
        <ul>
          <li><span id="r1">First</span> <button type="button" aria-describedby="r1">Delete</button></li>
          <li><span id="r2">Second</span> <button type="button" aria-describedby="r2">Delete</button></li>
          <li><span id="r3">Third</span> <button type="button" aria-describedby="r3">Delete</button></li>
        </ul>
        <button type="button">Sign up</button>
        <button type="button">Sign up</button>
        <button type="button" aria-pressed="false" aria-label="Turn on notifications">n</button>
        <button type="button" aria-pressed="true" aria-label="Active users">u</button>
        <button type="button" aria-expanded="false" aria-label="Open menu">m</button>
        <div tabIndex={0} role="region" aria-label="Chips" style={{ display: 'flex', overflowX: 'auto', scrollbarWidth: 'none', width: 300 }}><span style={{ flex: 'none', width: 130 }}>one</span><span style={{ flex: 'none', width: 130 }}>two</span><span style={{ flex: 'none', width: 130 }}>half in view</span></div>
        <div style={{ height: 60, overflowY: 'auto', width: 300 }} tabIndex={0} role="region" aria-label="Log"><p>line one</p><p>line two</p><p>line three</p><p>line four</p></div>
        <div style={{ height: 60, overflowY: 'auto', width: 300 }}><p><a href="/1">link one</a></p><p>line two</p><p>line three</p><p>line four</p></div>
      </main>
    </div>
  );
}
`;
for (const [name, app, options] of [['accessibility', NEAR_A11Y], ['forms', NEAR_FORMS], ['components', NEAR_COMPONENTS], ['HTML', NEAR_HTML, { files: { 'public/wide.svg': WIDE_SVG } }],
  ['experience', NEAR_EXPERIENCE, { index: NEAR_EXPERIENCE_INDEX, files: { 'public/blocking.js': '/* nothing */' } }]]) {
  test(`near misses, ${name}: the closest right thing to each rule's problem, and no pack says anything`, { timeout: 240000 }, async (t) => {
    if (!await built()) return t.skip('Run npm run build first.');
    assert.deepEqual(ofPacks(await said(t, app, options)), []);
  });
}

// ── the advice, taken ───────────────────────────────────────
// Each broken page above, with every rule's own advice applied to its problem. A rule that still speaks gave advice
// that does not fix what it found; another rule that wakes was woken by the fix. Neither may happen.
const TAKEN_A11Y = `export function App() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-s4 p-s4">
      <h1>Bad page</h1>
      <h2>Skipped</h2>
      <h2>Second</h2>
      <nav aria-label="First"><a href="/a">Read more about A</a></nav>
      <nav aria-label="Second"><a href="/b">Read more about B</a></nav>
      <img alt="A grey dot" src="${PX}" width="40" height="40" />
      <img alt="A cat" src="${PX}" width="40" height="40" />
      <svg role="img" width="24" height="24"><title>A full circle</title><circle cx="12" cy="12" r="10" /></svg>
      <button type="button">Third</button>
      <button type="button">Zero</button>
      <div inert=""><button type="button">Hidden</button></div>
      <button type="button">Gone</button>
      <div role="group" aria-label="A box">box</div>
      <button type="button" aria-label="Dismiss dialog">Dismiss</button>
      <button type="button" aria-label="Save">Save</button>
      <iframe title="A small frame" srcDoc="<p>x</p>" width="100" height="40" />
      <table><tbody><tr><th>Name</th><th>Age</th></tr><tr><td>A</td><td>1</td></tr></tbody></table>
      <h3>In summary</h3>
      <details><summary>In summary</summary>body</details>
      <nav aria-label="Third"><a href="/c">C</a></nav>
      <ul><li><button type="button">Li button</button></li></ul>
      <button type="button">Div button</button>
      <input type="email" aria-label="Email" autoComplete="email" />
      <button type="button" aria-label="Refresh"><svg aria-hidden="true" width="16" height="16"><circle cx="8" cy="8" r="6" /></svg></button>
      <div>another</div>
    </main>
  );
}
`;
const TAKEN_FORMS = `export function App() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-s4 p-s4">
      <style>{"#inv2:user-invalid { border-color: red } .vh { position: absolute; width: 1px; height: 1px; clip-path: inset(50%); overflow: hidden; white-space: nowrap }"}</style>
      <h1>Bad forms</h1>
      <form aria-label="Outer" action="/send" method="post">
        <label htmlFor="loose">Loose label</label><input id="loose" name="loose" />
        <label htmlFor="dang">Dangling</label><input id="dang" name="dangling" />
        <input name="named" aria-label="No name" />
        <button type="button">Cancel</button>
        <button type="submit">Save changes</button>
        <fieldset><legend>Group</legend><input aria-label="in group" name="g" /></fieldset>
        <div style={{ display: 'flex' }}><button type="button">One</button><button type="button">Two</button></div>
        <input name="inl" aria-label="inline" />
      </form>
      <form aria-label="Inner" method="post" action="/inner"><input name="n" aria-label="n" /></form>
      <search><form aria-label="Search" method="get" action="/s"><input type="search" name="q" aria-label="Search" /></form></search>
      <form aria-label="Sign in" method="post" action="/in"><input type="password" name="p" aria-label="Password" autoComplete="current-password" /><button type="submit">Sign in</button></form>
      <form aria-label="Third" method="post" action="/third">
        <textarea name="msg" aria-label="Message" style={{ resize: 'none', fieldSizing: 'content' }} />
        <div style={{ marginBottom: 24 }}><input name="above" aria-label="above" /></div>
        <label htmlFor="far" style={{ display: 'block', marginBottom: 2 }}>Far label</label>
        <input id="far" name="far" />
        <input name="contact" aria-label="Contact" aria-invalid="true" aria-describedby="contact-msg" />
        <p id="contact-msg">Give a way to reach you.</p>
        <input id="inv2" name="need" aria-label="Needed" required />
        <label htmlFor="star">Company *</label>
        <input id="star" name="company" autoComplete="organization" required />
        <label htmlFor="over">Phone</label>
        <input id="over" name="phone" type="tel" autoComplete="tel" />
        <label htmlFor="otp">Verification code</label>
        <input id="otp" name="otp" inputMode="numeric" autoComplete="one-time-code" />
        <label htmlFor="zip">ZIP</label>
        <input id="zip" name="zip" inputMode="numeric" autoComplete="postal-code" />
        <input name="code" aria-label="Six digit code" inputMode="numeric" autoComplete="one-time-code" />
        <label htmlFor="user">Username</label>
        <input id="user" name="username" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
        <label htmlFor="hidcheck">Agree</label>
        <input id="hidcheck" className="vh" type="checkbox" name="agree" />
        <label htmlFor="full">Full name</label>
        <input id="full" name="name" autoComplete="name" />
        <fieldset><legend>Plan</legend><input type="radio" name="plan" aria-label="Free" /><input type="radio" name="plan" aria-label="Pro" /></fieldset>
        <label htmlFor="desc">Described</label>
        <input id="desc" name="desc" aria-invalid="true" aria-describedby="gone" />
        <p id="gone">This one is wrong.</p>
        <label htmlFor="mail">Mail</label>
        <input id="mail" name="email" type="email" autoComplete="email" />
        <label htmlFor="ph">Password hint (8-20 characters)</label>
        <input id="ph" name="hint" placeholder="8-20 characters" />
        <button type="submit">Create account</button>
      </form>
    </main>
  );
}
`;
const TAKEN_COMPONENTS = `export function App() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-s4 p-s4">
      <h1>Bad components</h1>
      <nav aria-label="Breadcrumb"><ol><li><a href="/x">Library</a></li><li><span aria-hidden="true">/</span><a href="/x/y" aria-current="page">Docs</a></li></ol></nav>
      <article><a href="/card">Card title</a> <button type="button">Save</button></article>
      <section aria-roledescription="carousel" aria-label="Featured"><div role="group" aria-roledescription="slide" aria-label="1 of 2">one</div><div role="group" aria-roledescription="slide" aria-label="2 of 2">two</div></section>
      <dialog open aria-label="Are you sure?"><p>Are you sure?</p><form method="dialog"><button>Close</button></form></dialog>
      <dialog aria-label="Shown"><button type="button">x</button></dialog>
      <dialog open aria-label="Open attr"><button type="button">Close</button></dialog>
      <div role="menu" aria-label="Actions"><button type="button" role="menuitem">Rename</button></div>
      <button type="button">Stray item</button>
      <nav aria-label="Site"><ul><li><a href="/a">A</a></li><li><a href="/b">B</a></li></ul></nav>
      <button type="button" aria-haspopup="menu" aria-expanded="false">Options</button>
      <div role="switch" aria-checked="false" tabIndex={0}>Wifi</div>
      <nav aria-label="Main"><a href="/" aria-current="page">Home</a><a href="/about">About</a></nav>
      <nav aria-label="More"><a href="/m">M</a><button type="button" aria-expanded="false" aria-controls="more-list">More</button><ul id="more-list" hidden><li><a href="/c">C</a></li></ul></nav>
      <nav aria-label="Two"><a href="/p">P</a><a href="/q">Q</a></nav>
      <div role="tablist" aria-label="Views" style={{ display: 'flex' }}>
        <button type="button" role="tab" id="tb1" aria-selected="true" tabIndex={0}>One</button>
        <button type="button" role="tab" id="tb2" aria-selected="false" tabIndex={-1}>Two</button>
        <button type="button" role="tab" id="tb3" aria-selected="false" tabIndex={-1}>Three</button>
        <button type="button" role="tab" id="tb4" aria-selected="false" tabIndex={-1}>Four</button>
      </div>
      <div>
        <div role="tabpanel" aria-labelledby="tb1">Panel one</div>
        <div role="tabpanel" aria-labelledby="tb2" hidden>Panel two</div>
      </div>
      <nav aria-label="Pages"><a href="/one">One</a><a href="/two">Two</a></nav>
      <button type="button">Loose tab</button>
      <div role="toolbar" aria-label="Formatting"><button type="button">Bold</button></div>
      <button type="button">Copy</button>
      <div role="menubar" aria-label="App"><button type="button" role="menuitem">File</button></div>
      <progress aria-label="Download" value="40" max="100" />
      <progress aria-label="Upload" value="40" max="100" />
      <button type="button" aria-expanded="false" aria-controls="plain">Plain box</button>
      <div id="plain" hidden>inside</div>
      <button type="button" aria-expanded="true" aria-controls="panel">Toggle</button>
      <div id="panel">I am showing</div>
    </main>
  );
}
`;
const TAKEN_HTML = `export function App() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-s4 p-s4">
      <header>Top</header>
      <main>
        <h1>Bad html</h1>
        <img alt="first screen" src="/wide.svg" width="400" height="300" fetchpriority="high" />
        <section aria-label="Second"><header>Second top</header></section>
        <ul><li>one thing</li><li>two things</li><li>three things</li></ul>
        <ul><li>loose item</li></ul>
        <button type="button">Click me</button>
        <button type="button">Do it</button>
        <input aria-label="b" disabled />
        <figure><img alt="x" src="${PX}" width="40" height="40" /><figcaption>A dot</figcaption></figure>
        <pre tabIndex={0} role="region" aria-label="Example" style={{ width: 200, overflowX: 'auto' }}><code>{"const answer = 42; function veryLongFunctionNameThatRunsOffTheEdgeOfItsBox() { return answer; }"}</code></pre>
        <pre tabIndex={0} role="region" aria-label="Short"><code>x</code></pre>
        <img alt="sized" src="/wide.svg" width="400" height="300" style={{ width: 300, height: 'auto' }} />
        <img alt="b" src="${PX}" width="10" height="10" />
        <picture><source srcSet="/wide.svg" /><img alt="pictured" src="/wide.svg" width="400" height="300" /></picture>
        <details><summary>Late summary</summary><p>before</p></details>
        <details><summary>No arrow</summary>body <a href="/x">link</a></details>
        <span>Hover me: more about this</span>
        <video controls width="320" height="180" poster="/wide.svg" src="/none.mp4"><track kind="captions" src="/c.vtt" srcLang="en" label="English" /></video>
        <video autoPlay muted loop aria-hidden="true" src="/none.mp4" width="100" height="60" />
        <audio controls src="/none.mp3" />
        <iframe title="f" srcDoc="<p>x</p>" width="100" height="40" />
        <button type="button">Inline</button>
        <div style={{ height: 2400 }} />
        <img alt="far" loading="lazy" src="/wide.svg" width="300" height="200" />
      </main>
      <footer>End</footer>
    </div>
  );
}
`;
const TAKEN_EXPERIENCE_INDEX = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="dark"><title>Experience, fixed</title><script src="/blocking.js" defer></script></head><body style="background:#111;color:#eee;color-scheme:dark"><div id="root"></div><script type="module" src="/src/entry.jsx"></script></body></html>';
const TAKEN_EXPERIENCE = `export function App() {
  return (
    <div className="flex flex-col gap-s4 p-s4">
      <style>{"@keyframes drift { to { translate: 20px 0 } } @keyframes turn { to { rotate: 360deg } } @media (prefers-reduced-motion: no-preference) { .drift { animation: drift 2s linear infinite alternate } } .spinner { animation: turn 1s linear infinite } .vh { position: absolute; width: 1px; height: 1px; clip-path: inset(50%); overflow: hidden }"}</style>
      <a href="#content">Skip to content</a>
      <div style={{ position: 'relative', width: 200, height: 40 }}>
        <button type="button" style={{ width: 200, height: 40 }}>Under</button>
        <div style={{ position: 'absolute', inset: 0, zIndex: 5, pointerEvents: 'none' }} />
      </div>
      <nav aria-label="Main"><a href="/a">One</a><a href="/b">Two</a><a href="/c">Three</a><a href="/d">Four</a><a href="/e">Five</a><a href="/f">Six</a><a href="/g">Seven</a><a href="/h">Eight</a><a href="/i">Nine</a><a href="/j">Ten</a></nav>
      <main id="content">
        <h1>Bad experience</h1>
        <p>This is a whole sentence of ordinary words that has been told it may never wrap onto a second line.</p>
        <p lang="en" style={{ textAlign: 'justify', hyphens: 'auto', width: 260 }}>This paragraph is justified without hyphenation, so its spaces stretch to fill every line and open rivers of white that run down through the text for anyone reading it.</p>
        <p>An entire sentence set in capitals is read letter by letter instead of word by word.</p>
        <div style={{ maxWidth: '100%', height: 4 }} />
        <div><div className="drift" style={{ width: 200, height: 40 }}>drifting</div></div>
        <div role="status"><div className="spinner" style={{ width: 20, height: 20, border: '2px solid' }} /><span className="vh">Loading</span></div>
        <a href="/pricing">Pricing</a>
        <a href="/pricing">Pricing</a>
        <ul>
          <li>First <button type="button" aria-label="Delete First">Delete</button></li>
          <li>Second <button type="button" aria-label="Delete Second">Delete</button></li>
          <li>Third <button type="button" aria-label="Delete Third">Delete</button></li>
        </ul>
        <ul>
          <li><button type="button" aria-pressed="false" aria-label="Copy">c</button></li>
          <li><button type="button" aria-pressed="true" aria-label="Close">x</button></li>
          <li><button type="button" aria-pressed="false" aria-label="Download">d</button></li>
        </ul>
        <div tabIndex={0} role="region" aria-label="Log" style={{ height: 60, overflowY: 'auto', width: 300 }}><p>line one</p><p>line two</p><p>line three</p><p>line four</p><p>line five</p></div>
        <div tabIndex={0} role="region" aria-label="Chips" style={{ display: 'flex', overflowX: 'auto', scrollbarWidth: 'none', width: 300, maskImage: 'linear-gradient(to right, black 85%, transparent)' }}><span style={{ flex: 'none', width: 150 }}>one</span><span style={{ flex: 'none', width: 150 }}>two</span><span style={{ flex: 'none', width: 150 }}>three</span></div>
      </main>
    </div>
  );
}
`;
for (const [name, app, options] of [['accessibility', TAKEN_A11Y], ['forms', TAKEN_FORMS], ['components', TAKEN_COMPONENTS], ['HTML', TAKEN_HTML, { files: { 'public/wide.svg': WIDE_SVG } }],
  ['experience', TAKEN_EXPERIENCE, { index: TAKEN_EXPERIENCE_INDEX, files: { 'public/blocking.js': '/* nothing */' } }]]) {
  test(`the advice taken, ${name}: every rule's fix applied to its problem silences it and wakes no other`, { timeout: 240000 }, async (t) => {
    if (!await built()) return t.skip('Run npm run build first.');
    assert.deepEqual(ofPacks(await said(t, app, options)), []);
  });
}
