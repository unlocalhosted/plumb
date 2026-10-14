// Feature boundary: real dev guard and a production build, through window.fetch and rendered DOM.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { build, createServer, preview } from 'vite';
import { chromium } from 'playwright';

const repo = fileURLToPath(new URL('../', import.meta.url));
const hash = value => createHash('sha256').update(value).digest('hex');

test('homepage text replay writes only DOM, validates refusals and commutes with class fixes', { timeout: 90000 }, async t => {
  const configFile = resolve(repo, 'site/vite.config.mjs');
  const path = resolve(repo, 'site/src/hero/DriftedCard.jsx');
  const source = await readFile(path, 'utf8');
  const fixture = JSON.parse(await readFile(resolve(repo, 'site/src/hero/replay.json'), 'utf8'));
  await build({ configFile, logLevel: 'silent' });
  const staticServer = await preview({ configFile, logLevel: 'silent', preview: { host: '127.0.0.1', port: 0 } });
  const dev = await createServer({ configFile, logLevel: 'error', server: { port: 0, watch: null } });
  await dev.listen();
  t.after(async () => { await dev.close(); await new Promise(done => staticServer.httpServer.close(done)); });
  const browser = await chromium.launch({ executablePath: (process.env.PLUMBER_CHROMIUM ?? process.env.PLUMB_CHROMIUM) || undefined }); t.after(() => browser.close());
  for (const [server, production] of [[dev, false], [staticServer, true]]) {
    const page = await browser.newPage({ reducedMotion: 'reduce' }); t.after(() => page.close());
    const requests = [], errors = [];
    page.on('request', request => { if (request.url().includes('/__plumb/') && !request.url().endsWith('.js') && !request.url().endsWith('.css')) requests.push(request.url()); });
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}`);
    await page.locator('[data-drift="name"]').waitFor();
    const positions = {};
    for (const part of ['name', 'button']) {
      const stamp = await page.locator(`[data-drift="${part}"]`).getAttribute('data-plumb-source');
      positions[part] = fixture.positions.find(position => position.stamp === stamp).location;
    }
    const call = (method, params, verb = 'GET') => page.evaluate(async ({ method, params, verb }) => {
      const url = new URL('/__plumb/' + method, location.href);
      if (verb === 'GET') url.search = new URLSearchParams(params);
      const response = await fetch(url, { method: verb, ...(verb === 'POST' ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(params) } : {}) });
      return { status: response.status, body: await response.json() };
    }, { method, params, verb });
    let expected = source;
    const read = part => call('text', positions[part]);
    const write = async (part, to, old, replacement) => {
      const before = (await read(part)).body;
      const result = await call('apply-text', { file: fixture.file, hash: before.hash, run: before.runs[0].id, from: before.runs[0].text, to }, 'POST');
      assert.equal(result.status, 200, JSON.stringify(result.body));
      expected = expected.replace(old, replacement);
      assert.equal(result.body.hash, hash(expected));
      assert.equal((await read(part)).body.runs[0].text, to);
      assert.equal(await page.locator(`[data-drift="${part}"]`).textContent(), to);
      assert.equal(await readFile(path, 'utf8'), source);
      return { before, result };
    };
    const first = await write('name', 'Grace Hopper', 'Ada Lovelace', 'Grace Hopper');
    const valid = { file: fixture.file, hash: first.result.body.hash, run: (await read('name')).body.runs[0].id, from: 'Grace Hopper', to: 'Other' };
    for (const [params, reason] of [
      [{ ...valid, hash: first.before.hash }, 'The file changed since the overlay read it. Read it again.'],
      [{ ...valid, from: 'wrong' }, 'The text changed since the overlay read it. Read it again.'],
      [{ ...valid, run: 'unknown' }, "Unknown text run id. Read the element's text again."],
      [{ ...valid, to: '' }, 'Replacement text must not be empty.'],
      [{ ...valid, to: 'x'.repeat(501) }, 'Replacement text must be at most 500 characters.'],
    ]) {
      assert.deepEqual(await call('apply-text', params, 'POST'), { status: 400, body: { error: reason } });
      assert.equal((await read('name')).body.hash, valid.hash);
      assert.equal(await page.locator('[data-drift="name"]').textContent(), 'Grace Hopper');
      assert.equal(await readFile(path, 'utf8'), source);
    }
    for (const [part, from, to] of [['name', 'text-[15px]', 'text-base'], ['button', 'px-[15px]', 'px-3']]) {
      const edits = (await call('edits', positions[part])).body;
      const edit = edits.edits.find(edit => edit.from === from && edit.to === to); assert.ok(edit);
      const result = await call('apply', { file: fixture.file, hash: edits.hash, edits: [{ id: edit.id }] }, 'POST');
      assert.equal(result.status, 200, JSON.stringify(result.body)); expected = expected.replace(from, to);
      assert.equal(result.body.hash, hash(expected));
      assert.equal((await read(part)).body.hash, result.body.hash);
      assert.equal(await page.locator(`[data-drift="${part}"]`).evaluate((node, token) => node.classList.contains(token), to), true);
    }
    await write('button', '{}<> & "hi"\nnext', 'Message', '{"{}<> & \\"hi\\"\\nnext"}');
    await write('button', 'Write again', '{"{}<> & \\"hi\\"\\nnext"}', '{"Write again"}');
    await write('name', 'First\nSecond', 'Grace Hopper', '{"First\\nSecond"}');
    const current = (await read('name')).body;
    const params = { file: fixture.file, hash: current.hash, run: current.runs[0].id, from: current.runs[0].text, to: 'Final' };
    const results = await Promise.all([call('apply-text', params, 'POST'), call('apply-text', params, 'POST')]);
    assert.deepEqual(results.map(result => result.status).sort(), [200, 400]);
    assert.equal(await page.locator('[data-drift="name"]').textContent(), 'Final');
    const latest = (await read('name')).body;
    await page.locator('[data-drift="name"]').evaluate(node => { node.firstChild.data = 'tampered'; });
    assert.deepEqual(await call('apply-text', { ...params, hash: latest.hash, run: latest.runs[0].id, from: 'Final' }, 'POST'), {
      status: 400, body: { error: 'The demo element changed since Plumb read it. Read it again.' },
    });
    assert.equal((await read('name')).body.hash, latest.hash);
    assert.equal((await call('apply-text', params)).status, 405);
    assert.equal((await call('text', positions.name, 'POST')).status, 405);
    if (production) {
      assert.deepEqual(requests, [], 'No static API requests reach the network');
      const refused = fixture.positions.find(position => position.location.file !== fixture.file && !fixture.responses[position.authored.text].editable);
      assert.equal((await call('text', refused.location)).body.reason, fixture.responses[refused.authored.text].reason);
    }
    assert.deepEqual(errors, []);
    assert.equal(await readFile(path, 'utf8'), source);
    await page.reload(); await page.locator('[data-drift="name"]').waitFor();
    assert.equal((await read('name')).body.hash, hash(source));
    assert.equal((await read('name')).body.runs[0].text, 'Ada Lovelace');
    await page.close();
  }
});
