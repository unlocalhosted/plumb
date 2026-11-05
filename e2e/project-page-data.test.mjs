// The page the command opens, as the browser gets it: the shell at /, the page's modules, and the project's numbers
// at GET /__plumb/system, with the same three causes `plumber check --json` prints. Another site must not be able to
// read the numbers.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { request } from 'node:http';
import { serve } from '../dist/session/server.js';
import { check, project } from './helpers/causes-project.mjs';
import { run } from './helpers/bare-cli.mjs';

async function page(t) {
  const root = await project(t);
  const server = await serve({ root, watch: false, page: true }); t.after(() => server.close());
  return { root, server, base: `http://127.0.0.1:${server.info.port}` };
}

test('GET / is the page shell with the project name, and loads the page module', { timeout: 90000 }, async (t) => {
  const { base, server } = await page(t);
  const response = await fetch(base + '/');
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /text\/html/);
  const html = await response.text();
  assert.match(html, /<title>[^<]+ · React Plumber<\/title>/);
  assert.match(html, /import \{ mountProjectPage \} from '\/__plumb\/src\/project-page\.js'/);
  // the credential is in the body, never in a URL
  assert.ok(html.includes(server.info.token));
  assert.ok(!html.includes('?token') && !html.includes('token='));
  for (const module of ['project-page.js', 'gravity.js', 'specimen.js', 'cause-list.js', 'scale-marks.js', 'tokens.css']) {
    const served = await fetch(`${base}/__plumb/src/${module}`);
    assert.equal(served.status, 200, module);
    assert.ok((await served.text()).length > 100, module);
  }
});

test('GET /__plumb/system answers the page data: scales, strays beside them, and the first 3 causes the CLI prints', { timeout: 90000 }, async (t) => {
  const { root, server, base } = await page(t);
  const answer = await fetch(base + '/__plumb/system', { headers: { 'x-plumb-token': server.info.token } });
  assert.equal(answer.status, 200);
  const data = await answer.json();
  for (const key of ['project', 'files', 'size', 'radius', 'weight', 'colour', 'dead', 'causes']) assert.ok(key in data, key);
  assert.ok(data.files > 0);
  // the 15px text is a stray beside the theme's 14 and 16
  const fifteen = data.size.strays.find(s => s.px === 15);
  assert.ok(fifteen, JSON.stringify(data.size.strays));
  assert.equal(fifteen.places, 2);
  assert.deepEqual(data.size.steps.map(s => s.px), [14, 16]);
  // white is a colour stray written more than one way, and bg-white is a dead class
  assert.ok(data.colour.strays.some(s => s.css === '#ffffff'), JSON.stringify(data.colour.strays));
  assert.ok(data.dead.some(d => d.class.includes('white')), JSON.stringify(data.dead));
  // the same causes the CLI prints, the first three, in its order
  const printed = check(root).causes;
  assert.deepEqual(data.causes.map(c => [c.id, c.count]), printed.slice(0, 3).map(c => [c.id, c.count]));
  assert.ok(data.causes.length <= 3);
  assert.ok(data.causes.length > 0);
  assert.equal(data.open, printed.length);
  // each in the terminal's own words: the plain version on the same project says the same sentences
  const plain = run(['--root', root]).stdout.replace(/\s+/g, ' ');
  for (const cause of data.causes) assert.ok(plain.includes(cause.said), `${cause.said}\n---\n${plain}`);
  // its places by file, from the project's folder: nothing about the machine leaves it
  for (const cause of data.causes) {
    assert.equal(cause.files.reduce((n, f) => n + f.places.length, 0), cause.count);
    for (const f of cause.files) assert.ok(!f.file.startsWith('/') && !f.file.includes(root) && !/^[A-Z]:/.test(f.file), f.file);
  }
});

test('the numbers are the person\'s own: no token is refused, and a page from another site cannot read the shell', { timeout: 90000 }, async (t) => {
  const { base } = await page(t);
  assert.equal((await fetch(base + '/__plumb/system')).status, 401);
  assert.equal((await fetch(base + '/__plumb/system', { headers: { 'x-plumb-token': 'x'.repeat(64) } })).status, 401);
  // another site's script, or a rebound DNS name, is not the person's own tab
  assert.equal((await fetch(base + '/', { headers: { 'sec-fetch-site': 'cross-site' } })).status, 403);
  assert.equal((await fetch(base + '/', { headers: { origin: 'https://example.com' } })).status, 403);
  const rebound = await new Promise((done, fail) => request({ host: '127.0.0.1', port: new URL(base).port, path: '/', headers: { host: 'rebound.example.com:' + new URL(base).port } }, response => { response.resume(); done(response.statusCode); }).on('error', fail).end());
  assert.equal(rebound, 403);
});

test('the engine\'s POST system keeps answering the overlay (the proposal), beside the page\'s GET', { timeout: 90000 }, async (t) => {
  const { base, server } = await page(t);
  const headers = { 'x-plumb-token': server.info.token, 'Content-Type': 'application/json' };
  const proposal = await fetch(base + '/__plumb/system', { method: 'POST', headers, body: JSON.stringify({}) });
  assert.equal(proposal.status, 200);
  assert.ok('proposal' in await proposal.json());
});
