// Release gate. The character removed is the one at the caret: click between two letters of words that share an
// element with others, press Backspace or Delete, read which letter went (docs/journey.md 81). Real Vite, real React,
// real clicks and keys, at three widths, on centred, wrapping, balanced text with kerning and ligatures set.
// @tier browser
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { platform } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { plumb } from '@unlocalhosted/react-plumber/vite';
import { open } from './helpers/browser.mjs';

const repo = fileURLToPath(new URL('../', import.meta.url));
const APP = `export function App() {
  return (
    <main>
      <h1 id="title">a design engineer<br />on every screen.</h1>
      <p id="lead">Plumber acts as your own design engineer. It finds where your frontend drifts away from your actual system <b>and writes the fix into your code.</b></p>
      <p id="middle">Before <b>the bold words</b> a run in the middle of the line that goes on to wrap onto the next <em>and then some emphasis</em> until the sentence is over.</p>
    </main>
  );
}
`;
const CSS = `body { margin: 24px; font: 20px/1.45 sans-serif; }
main { text-align: center; max-width: 620px; margin: auto; }
h1 { font-size: 44px; line-height: 1.05; text-wrap: balance; }
p { text-wrap: pretty; font-kerning: normal; font-variant-ligatures: common-ligatures contextual; }
`;
// which run of words in which element: first, after a <br>, between two elements, last
const RUNS = [['#lead', 0], ['#title', 1], ['#middle', 1], ['#middle', 2]];

async function site(t) {
  await mkdir(join(repo, 'fixtures'), { recursive: true });
  const root = await mkdtemp(join(repo, 'fixtures/.text-caret-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'src'));
  await writeFile(join(root, 'index.html'), '<!doctype html><html lang="en"><head></head><body><div id="root"></div><script type="module" src="/src/main.jsx"></script></body></html>\n');
  await writeFile(join(root, 'src/main.jsx'), "import { createRoot } from 'react-dom/client';\nimport { App } from './App.jsx';\nimport './app.css';\ncreateRoot(document.getElementById('root')).render(<App />);\n");
  await writeFile(join(root, 'src/App.jsx'), APP);
  await writeFile(join(root, 'src/app.css'), CSS);
  const server = await createServer({ root, cacheDir: join(root, '.vite-cache'), configFile: false, plugins: [plumb({ watch: false })],
    oxc: { jsx: { runtime: 'automatic', development: true } }, logLevel: 'silent', server: { host: '127.0.0.1', port: 0 } });
  t.after(() => server.close());
  await server.listen();
  return { url: `http://127.0.0.1:${server.httpServer.address().port}/`, source: join(root, 'src/App.jsx') };
}

async function ready(t, url, width = 846) {
  const { page, errors } = await open(t, url, { width, height: 1000 });
  await page.waitForFunction(() => window.__plumb?.ready);
  await page.evaluate(() => window.__plumb.ready());
  return { page, errors };
}

// the run's words, where they start and end, and where each line of them starts and ends, as drawn
const readRun = (page, [selector, index]) => page.evaluate(([selector, index]) => {
  const el = document.querySelector(selector), node = [...el.childNodes].filter((n) => n.nodeType === 3 && n.data.trim())[index];
  const lo = node.data.search(/\S/), hi = node.data.trimEnd().length, range = document.createRange(), lines = [];
  for (let i = lo, top = -Infinity; i < hi; i++) {
    if (!/\S/.test(node.data[i])) continue;
    range.setStart(node, i); range.setEnd(node, i + 1);
    const box = range.getBoundingClientRect();
    if (box.top > top + 5) { lines.push({ from: i, to: i + 1 }); top = box.top; }
    lines.at(-1).to = i + 1;
  }
  let before = '';
  for (const n of el.childNodes) { if (n === node) break; before += n.textContent; }
  return { text: el.textContent, offset: before.length, data: node.data, lo, hi, lines };
}, [selector, index]);

// the pixel between two letters: the left edge of the letter after, or the right edge of the one before a space
const between = (page, [selector, index], at) => page.evaluate(([selector, index, at]) => {
  const node = [...document.querySelector(selector).childNodes].filter((n) => n.nodeType === 3 && n.data.trim())[index];
  const end = at >= node.data.trimEnd().length || !/\S/.test(node.data[at]), range = document.createRange();
  range.setStart(node, end ? at - 1 : at); range.setEnd(node, end ? at : at + 1);
  const box = range.getBoundingClientRect();
  return { x: end ? box.right - 0.5 : box.left + Math.min(0.5, box.width / 4), y: box.top + box.height / 2 };
}, [selector, index, at]);

async function edit(page, run, from) {
  const at = await between(page, run, from);
  await page.mouse.dblclick(at.x + 2, at.y);
  await page.locator('plumb-overlay .tx-tag[data-kind="edit"]:not([hidden])').waitFor({ timeout: 10000 });
}
const flat = (text) => text.replace(/​/g, '').replace(/\s+/g, ' ').trim();
const frame = (page) => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve))));

for (const width of [380, 620, 846]) {
  test(`at ${width}px, Backspace and Delete take the letter at the caret`, { timeout: 180000 }, async (t) => {
    const { url } = await site(t);
    const { page, errors } = await ready(t, url, width);
    // nothing is saved here: a click that lands outside the words would save them
    await page.route('**/apply-text*', (route) => route.fulfill({ status: 409, contentType: 'application/json', body: '{"error":"not in this test"}' }));
    const wrong = [];
    let readings = 0;
    for (const run of RUNS) {
      const { text, offset, data, lo, hi, lines } = await readRun(page, run);
      const places = new Set([lo + 1]);
      for (const { from, to } of lines) {
        let middle = Math.floor((from + to) / 2);
        while (!/\S/.test(data[middle])) middle++;
        for (const place of [from, middle, to]) places.add(place);
      }
      for (const at of places) {
        for (const key of ['Backspace', 'Delete']) {
          await edit(page, run, lo + 1);
          const point = await between(page, run, at);
          await page.mouse.click(point.x, point.y);
          await frame(page);
          await page.keyboard.press(key);
          await frame(page);
          const gone = key === 'Backspace' ? at - 1 : at;
          const expected = gone < lo || gone >= hi ? text : text.slice(0, offset + gone) + text.slice(offset + gone + 1);
          const got = await page.locator(run[0]).evaluate((el) => el.textContent);
          readings++;
          if (flat(got) !== flat(expected)) wrong.push(`${run[0]} “${data.slice(Math.max(lo, at - 7), at)}|${data.slice(at, at + 7)}” ${key}`);
          await page.keyboard.press('Escape');
          if (await page.locator(run[0]).evaluate((el) => el.textContent) !== text) {
            await page.reload();
            await page.waitForFunction(() => window.__plumb?.ready);
            await page.evaluate(() => window.__plumb.ready());
          }
        }
      }
    }
    t.diagnostic(`${readings} readings`);
    assert.ok(readings >= 30, 'every run was read');
    assert.deepEqual(wrong, [], `${wrong.length} of ${readings} took another character`);
    assert.deepEqual(errors, []);
  });
}

test('starting an edit moves no letter, and the outline holds those words and not the bold ones after them', { timeout: 60000 }, async (t) => {
  const { url } = await site(t);
  const { page, errors } = await ready(t, url);
  const letters = () => page.evaluate(() => {
    const out = [], range = document.createRange(), walk = document.createTreeWalker(document.querySelector('main'), NodeFilter.SHOW_TEXT);
    for (let node = walk.nextNode(); node; node = walk.nextNode()) {
      for (let i = 0; i < node.data.length; i++) {
        if (!/\S/.test(node.data[i])) continue;
        range.setStart(node, i); range.setEnd(node, i + 1);
        const box = range.getBoundingClientRect();
        out.push(Math.round(box.left * 10), Math.round(box.top * 10));
      }
    }
    return out.join();
  });
  const was = await letters();
  await edit(page, RUNS[0], 1);
  await frame(page);
  assert.equal(await letters(), was, 'no letter moved');
  const drawn = await page.evaluate(() => {
    const path = document.querySelector('plumb-overlay').shadowRoot.querySelector('.tx-ring path');
    if (!path) return { words: false, bold: true };
    const holds = (node, i) => {
      const range = document.createRange();
      range.setStart(node, i); range.setEnd(node, i + 1);
      const box = range.getBoundingClientRect(), svg = path.ownerSVGElement.getBoundingClientRect();
      return path.isPointInFill(new DOMPoint(box.left + box.width / 2 - svg.left, box.top + box.height / 2 - svg.top));
    };
    const lead = document.querySelector('#lead'), bold = lead.querySelector('b').firstChild;
    return { words: holds(lead.firstChild, 3), bold: holds(bold, 2) };
  });
  assert.deepEqual(drawn, { words: true, bold: false });
  await page.keyboard.press('Escape');
  assert.deepEqual(errors, []);
});

test('typing at both ends, spaces and undo stay in the run, and save as plain words', { timeout: 60000 }, async (t) => {
  const { url, source } = await site(t);
  const { page, errors } = await ready(t, url);
  const run = RUNS[2], { lo, hi } = await readRun(page, run);
  await edit(page, run, lo + 2);
  const click = async (at) => { const point = await between(page, run, at); await page.mouse.click(point.x, point.y); await frame(page); };
  await click(hi);
  await page.keyboard.type(' today');
  await click(lo);
  await page.keyboard.type('Now ');
  await page.keyboard.type('gone');
  await page.keyboard.press('ControlOrMeta+z');
  await page.keyboard.press('Enter');
  const expected = APP.replace('</b> a run in', '</b> Now a run in').replace('onto the next <em>', 'onto the next today <em>');
  let now = '';
  for (let i = 0; i < 100 && now !== expected; i++) { await delay(100); now = await readFile(source, 'utf8'); }
  assert.equal(now, expected);
  assert.deepEqual(errors, []);
});

test('words composed at the start of a run stay in it', { timeout: 60000 }, async (t) => {
  const { url } = await site(t);
  const { page, errors } = await ready(t, url);
  const run = RUNS[2], { text, offset, lo } = await readRun(page, run);
  await edit(page, run, lo + 2);
  const point = await between(page, run, lo);
  await page.mouse.click(point.x, point.y);
  await frame(page);
  const input = await page.context().newCDPSession(page);
  await input.send('Input.imeSetComposition', { text: 'नम', selectionStart: 2, selectionEnd: 2 });
  await input.send('Input.insertText', { text: 'नमस्ते' });
  await frame(page);
  assert.equal(flat(await page.locator('#middle').textContent()), flat(`${text.slice(0, offset + lo)}नमस्ते${text.slice(offset + lo)}`));
  assert.equal(await page.locator('#middle b').textContent(), 'the bold words');
  await page.keyboard.press('Escape');
  assert.deepEqual(errors, []);
});

test('pasted lines land at the caret as one line', { timeout: 60000, skip: platform() === 'darwin' && 'it would replace the clipboard of the person at this Mac' }, async (t) => {
  const { url } = await site(t);
  const { page, errors } = await ready(t, url);
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(url).origin });
  await page.evaluate(() => navigator.clipboard.writeText('one\ntwo '));
  const run = RUNS[0], { text } = await readRun(page, run);
  await edit(page, run, 1);
  const point = await between(page, run, 8);
  await page.mouse.click(point.x, point.y);
  await frame(page);
  await page.keyboard.press('ControlOrMeta+v');
  await frame(page);
  assert.equal(flat(await page.locator('#lead').textContent()), flat(`${text.slice(0, 8)}one two ${text.slice(8)}`));
  await page.keyboard.press('Escape');
  assert.deepEqual(errors, []);
});
