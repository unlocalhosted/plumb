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
import tailwindcss from '@tailwindcss/vite';
import { plumb } from '@unlocalhosted/react-plumber/vite';

const repo = fileURLToPath(new URL('../', import.meta.url));
const cli = join(repo, 'dist/cli.js');
const run = promisify(execFile);
const built = () => readFile(cli).then(() => true, () => false);

async function fixture(t, app, { index, files = {} } = {}) {
  const root = await mkdtemp(join(repo, 'fixtures/.packs-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'overlay/demo/src'), join(root, 'src'), { recursive: true });
  if (index) await writeFile(join(root, 'index.html'), index); else await cp(join(repo, 'overlay/demo/index.html'), join(root, 'index.html'));
  await writeFile(join(root, 'src/App.jsx'), app);
  for (const [name, text] of Object.entries(files)) { await mkdir(dirname(join(root, name)), { recursive: true }); await writeFile(join(root, name), text); }
  const server = await createServer({ root, cacheDir: join(root, '.vite-cache'), configFile: false, plugins: [tailwindcss(), plumb({ watch: false })],
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
const ofPacks = (by) => [...by].filter(([rule]) => /^(?:a11y|forms|components|html)\//.test(rule)).map(([rule, lines]) => `${rule} @${lines.join(',')}`);
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

// The same parts, built as the guides say, and the cases that once gave false hits: a keyboard hint inside a label,
// selectable icons named like actions, a roving tab stop, a card whose link is stretched, a constant given to a button.
const RIGHT = `export function App() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-s4 p-s4">
      <header><nav aria-label="Breadcrumb"><ol><li><a href="/x">Home</a></li><li><a href="/x/y" aria-current="page">Docs</a></li></ol></nav></header>
      <main>
        <h1>Right page</h1>
        <search><label>Find <kbd>/</kbd><input type="search" name="q" aria-label="Find an icon" /></label></search>
        <button type="button" aria-pressed="false" aria-label="Copy, not selected">c</button>
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
        <ul><li>one</li><li>two</li><li>three</li></ul>
        <img alt="A grey box" src="/wide.svg" width="400" height="300" />
        <figure><img alt="A chart" src="${PX}" width="40" height="40" /><figcaption>Sales by month</figcaption></figure>
        <details><summary>More</summary>body</details>
        <label htmlFor="up">Upload</label>
        <progress id="up" value="40" max="100" />
        <button type="button" aria-expanded="false" aria-controls="later">Toggle</button>
        <a href="/elsewhere" title="Elsewhere">Elsewhere</a>
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

test('HTML pack: 32 rules name their problem at its line, the page-wide ones once on the first element', { timeout: 240000 }, async (t) => {
  if (!await built()) return t.skip('Run npm run build first.');
  const by = await said(t, HTML, { index: BARE_INDEX, files: { 'public/wide.svg': WIDE_SVG } });
  speaks(by, 'html', HTML, HTML_EXPECTED);
  for (const rule of ['page-lang', 'viewport-meta', 'zoom-disabled', 'quirks-mode', 'landmark-main', 'h1-missing']) assert.equal(by.get(`html/${rule}`).length, 1, `${rule} is said once`);
});

test('the same parts built right, with the cases that once gave false hits: no pack says anything', { timeout: 240000 }, async (t) => {
  if (!await built()) return t.skip('Run npm run build first.');
  assert.deepEqual(ofPacks(await said(t, RIGHT, { files: { 'public/wide.svg': WIDE_SVG } })), []);
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
