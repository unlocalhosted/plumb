// Where the element card writes (docs/briefs/qa-fixes.md, cause 1; docs/qa/element-card-results.md F1-01 to F1-04).
// One resolver, the element's class site: its own line when the className there is a plain string, else the usage up the
// chain that passes the classes in as a plain string. The card's header names that place, "N like it" counts the
// elements drawn from it, and every writer (spacing, layout, shadow) writes there. A component whose classes are nowhere
// a plain string is refused at rest, in plain words, and nothing is tried.
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { plumb } from '@unlocalhosted/react-plumber/vite';

const repo = fileURLToPath(new URL('../', import.meta.url));

// classes that come from where a component is used: a component that forwards a className prop, one that adds it to its
// own (a template literal), a link that spreads its props (a list of three and one alone), and one built in code
const USAGE = `
function Box({ className, children }) { return <div className={className}>{children}</div>; }
function Panel({ className, children }) { return <div className={\`rounded-card bg-surface \${className}\`}>{children}</div>; }
function Row({ to, ...props }) { return <a href={to} {...props} />; }
function Built({ children }) { const tone = 'p-s3'; return <div id="built" className={'flex gap-s2 ' + tone}>{children}</div>; }
export function Usage() {
  return (
    <section id="usage" className="flex flex-col gap-s3">
      <Box className="flex flex-col gap-[10px] p-[14px] rounded-card bg-surface shadow-rest"><span id="box-a">box a</span><span>more words</span></Box>
      <Panel className="p-4 flex gap-2"><span id="panel-a">panel</span><span>two</span></Panel>
      <nav className="flex flex-col gap-s1">
        {['one', 'two', 'three'].map((w) => <Row key={w} id={\`row-\${w}\`} to={\`#\${w}\`} className="grid grid-cols-2 gap-s2 rounded-card bg-surface px-s3 py-s2"><span>{w}</span><span>row</span></Row>)}
      </nav>
      <Row id="solo" to="#solo" className="flex gap-s2 px-s2 py-s2"><span>solo</span></Row>
      <Built><span>built</span><span>in code</span></Built>
    </section>
  );
}
`;

async function browser(t) {
  try {
    const browser = await chromium.launch({ headless: true, executablePath: (process.env.PLUMBER_CHROMIUM ?? process.env.PLUMB_CHROMIUM) || undefined });
    t.after(() => browser.close()); return browser;
  } catch (error) {
    if (!/Executable doesn't exist/.test(error.message)) throw error;
    t.skip('Playwright Chromium missing. Install with: npx playwright install chromium'); return null;
  }
}

async function demo(t) {
  const root = await mkdtemp(join(repo, 'fixtures/.element-site-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'overlay/demo/src'), join(root, 'src'), { recursive: true });
  await cp(join(repo, 'overlay/demo/index.html'), join(root, 'index.html'));
  const file = join(root, 'src/App.jsx');
  const app = (await readFile(file, 'utf8'))
    .replace('export function App() {', `${USAGE}\nexport function App() {`)
    .replace("{new URLSearchParams(location.search).has('corners') && <Corners />}", "{new URLSearchParams(location.search).has('corners') && <Corners />}\n      {new URLSearchParams(location.search).has('usage') && <Usage />}");
  assert.match(app, /<Usage \/>/);
  await writeFile(file, app);
  // dependencies found up front: a discovery mid-test would reload the page under a write
  const server = await createServer({ root, cacheDir: join(root, '.vite-cache'), configFile: false, plugins: [tailwindcss(), plumb({ watch: false })],
    optimizeDeps: { noDiscovery: true, include: ['react', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'react-dom', 'react-dom/client'] },
    oxc: { jsx: { runtime: 'automatic', development: true } }, logLevel: 'silent', server: { host: '127.0.0.1', port: 0 } });
  t.after(() => server.close()); await server.listen();
  return { root, file, url: `http://127.0.0.1:${server.httpServer.address().port}/` };
}

async function open(t) {
  const launched = await browser(t); if (!launched) return null;
  const { file, url } = await demo(t);
  const original = await readFile(file, 'utf8');
  // the line a piece of the fixture is written on
  const lineOf = (needle) => original.slice(0, original.indexOf(needle)).split('\n').length;
  const page = await launched.newPage({ reducedMotion: 'reduce', viewport: { width: 1280, height: 900 } });
  const errors = []; page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${url}?usage`);
  await page.waitForFunction(() => window.__plumb?.overlay);
  await page.evaluate(() => window.__plumb.ready());
  const overlay = page.locator('plumb-overlay'), card = overlay.locator('.ec');
  const read = () => readFile(file, 'utf8');
  // Alt+click near an element's top left corner (inside its padding): its card
  const alt = async (el, at = { x: 4, y: 4 }) => {
    await el.scrollIntoViewIfNeeded();
    await page.keyboard.down('Alt');
    await el.click({ modifiers: ['Alt'], position: at });
    await page.keyboard.up('Alt');
    await card.locator('.hd .at').filter({ hasText: /:\d+/ }).waitFor({ timeout: 20000 });
    await card.locator('.drill').first().waitFor({ timeout: 20000 });
    await page.waitForFunction(() => window.__plumb.overlay.progress?.done, null, { timeout: 20000 });
  };
  const marked = () => page.evaluate(() => { window.__mark = true; });
  // a write to the file may make the dev server reload the page: wait for that to be over
  const settle = async () => {
    if (await page.waitForFunction(() => !window.__mark, null, { timeout: 2500 }).then(() => true, () => false)) {
      await page.waitForFunction(() => window.__plumb?.overlay, null, { timeout: 20000 });
      await page.waitForTimeout(400);
    }
  };
  const said = (re) => overlay.locator('.fx .said').filter({ hasText: re }).waitFor({ timeout: 20000 });
  const undo = async () => {
    await marked();
    await overlay.locator('.fx .said .undo').click();
    await page.waitForFunction(() => /Undone/.test(document.querySelector('plumb-overlay')?.shadowRoot.querySelector('.fx .said')?.textContent ?? ''), null, { timeout: 30000 });
    assert.equal(await read(), original, 'Undo restores the file exactly');
    await settle();
  };
  return { page, overlay, card, original, read, lineOf, alt, marked, settle, said, undo, errors };
}

test('A component that forwards className: the card names the usage, spacing writes there, Shadow’s Writes is the usage’s line (F1-02)', { timeout: 150000 }, async (t) => {
  const o = await open(t); if (!o) return;
  const { page, card, read, lineOf, alt, marked, settle, said, undo, errors } = o;
  const box = page.locator('#box-a').locator('..');
  await alt(box);
  const at = lineOf('<Box className="flex flex-col');
  assert.equal(await card.locator('.hd .at').innerText(), `App.jsx:${at}`, 'the header names the line the classes are written on');
  assert.equal(await card.locator('.drill[data-open="shadow"]').isDisabled(), false);

  // spacing on the Box: one notch up from 14 is 16 · s4, written into the usage's className
  const b = await box.boundingBox();
  // beside the first child, in the left padding (between the two children is the gap)
  await page.mouse.move(b.x + 4, b.y + 22);
  await page.mouse.move(b.x + 3, b.y + 22);
  await page.waitForFunction(() => /^14 padding left/.test(document.querySelector('plumb-overlay').shadowRoot.querySelector('.sp-bub')?.innerText.replace(/\s+/g, ' ') ?? ''));
  await marked();
  await page.mouse.wheel(0, -100);
  await said(/padding left 16px/);
  await settle();
  const now = await read();
  assert.ok(now.split('\n')[at - 1].includes('<Box className="flex flex-col gap-[10px] p-[14px] rounded-card bg-surface shadow-rest pl-s4">'), now.split('\n')[at - 1]);
  assert.equal(await card.locator('.down').count(), 0, 'nothing refused');
  await undo();

  // Shadow ›: a pick's Writes is the usage's line (no refusal about a className built at runtime)
  await alt(box);
  await card.locator('.drill[data-open="shadow"]').click();
  await o.overlay.locator('.ec-strip .shot[data-key="p:raised"]').click();
  await card.locator('.writes .edit').first().waitFor({ timeout: 20000 });
  const writes = await card.locator('.writes').innerText();
  assert.match(writes, /src\/App\.jsx[\s\S]*\+\s*<Box className="flex flex-col gap-\[10px\] p-\[14px\] rounded-card bg-surface shadow-raised">/, writes);
  assert.equal(await card.locator('.use').isDisabled(), false, 'it can be written');
  assert.deepEqual(errors, []);
});

test('A link that spreads its props, used in a list: the card names the list’s line and counts its rows; Layout writes there (F1-01, F1-04)', { timeout: 150000 }, async (t) => {
  const o = await open(t); if (!o) return;
  const { page, card, read, lineOf, alt, marked, settle, said, undo, errors } = o;
  const row = page.locator('#row-one');
  const b = await row.boundingBox();
  await alt(row, { x: b.width - 4, y: 3 });
  const at = lineOf("{['one', 'two', 'three'].map");
  assert.equal(await card.locator('.hd .at').innerText(), `App.jsx:${at}`);
  // the other rows of the list are drawn from that line; the link used alone isn't
  assert.match(await card.locator('.reach').innerText(), /draws 2 other places/);

  // Layout ›: Flex, side by side and wrapping; Writes says where; Write it changes the list's className
  await card.locator('.drill[data-open="layout"]').click();
  await card.locator('[data-lmode="flex"]').click();
  const writes = await card.locator('.writes').innerText();
  assert.match(writes, new RegExp(`App\\.jsx:${at}[\\s\\S]*- grid grid-cols-2[\\s\\S]*\\+ flex`), writes);
  await marked();
  await card.locator('.use').click();
  await said(/a flex layout now/);
  await settle();
  const line = (await read()).split('\n')[at - 1];
  assert.match(line, /className="flex gap-s2 rounded-card bg-surface px-s3 py-s2"/, line);
  await undo();

  // Shadow › on the spreading link: no "spreads props" refusal; the engine is asked at the list's line
  await alt(row, { x: b.width - 4, y: 3 });
  await card.locator('.drill[data-open="shadow"]').click();
  await o.overlay.locator('.ec-strip .shot').first().waitFor();
  await o.overlay.locator('.ec-strip .shot[data-key="y:rest"]').click();
  await page.waitForFunction(() => !/Reading what it writes/.test(document.querySelector('plumb-overlay').shadowRoot.querySelector('.ec .writes')?.textContent ?? 'Reading what it writes'), null, { timeout: 20000 });
  assert.doesNotMatch(await card.locator('.writes').innerText(), /spreads props/);
  assert.deepEqual(errors, []);
});

test('A component that adds the usage’s className to its own: Layout writes at the usage, where the class is (F1-03)', { timeout: 150000 }, async (t) => {
  const o = await open(t); if (!o) return;
  const { page, card, read, lineOf, alt, marked, settle, said, undo, errors } = o;
  const panel = page.locator('#panel-a').locator('..');
  await alt(panel);
  const at = lineOf('<Panel className="p-4 flex gap-2">');
  assert.equal(await card.locator('.hd .at').innerText(), `App.jsx:${at}`);
  await card.locator('.drill[data-open="layout"]').click();
  await card.locator('[data-lmode="grid"]').click();
  await marked();
  await card.locator('.use').click();
  await said(/a grid now/);
  await settle();
  assert.match((await read()).split('\n')[at - 1], /<Panel className="p-4 grid grid-cols-2 gap-2">/);
  assert.equal(await card.locator('.down').count(), 0, 'nothing refused');
  await undo();
  assert.deepEqual(errors, []);
});

test('Classes built in code with no plain string anywhere: refused at rest in plain words, fields locked, a scroll writes nothing', { timeout: 150000 }, async (t) => {
  const o = await open(t); if (!o) return;
  const { page, card, original, read, alt, errors } = o;
  const built = page.locator('#built');
  await alt(built);
  await card.locator('.down').waitFor({ timeout: 20000 });
  assert.match(await card.locator('.down').innerText(), /built in code/);
  assert.equal(await card.locator('.drill:not([disabled])').count(), 0, 'every field is locked');
  const b = await built.boundingBox();
  await page.mouse.move(b.x + 4, b.y + b.height / 2);
  await page.mouse.wheel(0, -100);
  await page.waitForTimeout(1200);
  assert.equal(await read(), original, 'nothing written');
  assert.equal(await built.evaluate((n) => n.getAttribute('style') ?? ''), '', 'nothing tried on it');
  assert.deepEqual(errors, []);
});

