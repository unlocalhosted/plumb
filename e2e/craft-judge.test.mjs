// Layer 7 of the craft hard rules: the judge. A rule that measured something but would not stand behind it hands the
// finding to an eye, once, and the answer is kept in the project. The real CLI, a real server and Chromium; the model is
// a local server of the test's own (it stands where Anthropic's API does), so the run can be seen to ask, and to stop asking.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { at, built, fixture, lineOf, plumber } from './helpers/craft-headless.mjs';
import { STYLES } from './helpers/pairs-app.mjs';

const APP = `export function App() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-s4 px-s4 pb-s6 text-body text-ink">
      <p id="dw-a" className="text-small text-ink dark:text-night-ink">Alpha words</p>
      <p id="dw-b" className="text-small text-ink dark:text-night-ink">Beta words</p>
    </main>
  );
}
`;

// a model that says yes to Alpha and no to anything else, and keeps what it was sent
async function model(t) {
  const asked = [];
  const server = createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      const body = JSON.parse(raw);
      const parts = body.messages[0].content;
      const text = parts.find((p) => p.type === 'text').text;
      asked.push({ key: req.headers['x-api-key'], model: body.model, image: parts.find((p) => p.type === 'image')?.source, text });
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ content: [{ type: 'text', text: JSON.stringify(text.includes('Alpha') ? { verdict: 'yes', sentence: 'The light words glow and look bold on the dark ground.' } : { verdict: 'no', sentence: 'They read as regular.' }) }] }));
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  t.after(() => server.close());
  return { asked, url: `http://127.0.0.1:${server.address().port}/v1/messages` };
}

test('judge: no flag and no answers, the run is as before; --judge asks once and keeps the answer; the next run needs no model; CI never asks', { timeout: 600000 }, async (t) => {
  if (!await built()) return t.skip('Run npm run build first.');
  const { root, url } = await fixture(t, APP, { styles: STYLES });
  const kept = join(root, '.plumber/judge');
  const line = (id) => lineOf(APP, id);
  const run = (extra = [], env = {}) => plumber(['--url', url, '--json', '--root', root, '--no-probe', ...extra], { CI: '', ANTHROPIC_API_KEY: '', ...env });
  const mine = (r) => at(JSON.parse(r.stdout), 'craft/dark-weight').filter((f) => f.file.endsWith('src/App.jsx'));

  // 1. nothing asked, nothing kept: the same run twice, and no judge folder
  const plain = await run(), again = await run();
  assert.equal(plain.stdout, again.stdout);
  assert.deepEqual(mine(plain), []);
  assert.equal(await readdir(kept).then(() => true, () => false), false);

  // 2. --judge with no key says what to do, and writes nothing
  const keyless = await run(['--judge']);
  assert.equal(keyless.code, 2);
  assert.match(keyless.stderr, /ANTHROPIC_API_KEY/);

  // 3. --judge with a model: asked about both, a yes is lifted to a note, a no is silence, both are kept
  const eye = await model(t);
  const env = { ANTHROPIC_API_KEY: 'test-key-not-real', PLUMBER_JUDGE_URL: eye.url, PLUMBER_JUDGE_MODEL: 'test-model' };
  const first = await run(['--judge'], env);
  assert.equal(eye.asked.length, 2, first.stderr);
  assert.ok(eye.asked.every((q) => q.key === 'test-key-not-real' && q.model === 'test-model' && q.image.media_type === 'image/png' && q.image.data.length > 200));
  assert.ok(eye.asked.every((q) => /dark/i.test(q.text) && /weight/i.test(q.text)), 'the rule’s words and its evidence go with the crop');
  const found = mine(first);
  assert.deepEqual(found.map((f) => [f.line, f.severity]), [[line('dw-a'), 'info']]);
  assert.match(found[0].finding.because, /glow/);
  assert.equal(first.code, 0, 'a note never fails the run');
  assert.equal((await readdir(kept)).filter((n) => n.endsWith('.json')).length, 2);

  // 4. no flag, no model: the kept answers are enough, byte for byte
  const later = await run();
  assert.equal(later.stdout, first.stdout);
  assert.equal(eye.asked.length, 2);

  // 5. answers lost, CI set: a model is never asked, and the grey stays silent
  await rm(kept, { recursive: true });
  const ci = await run(['--judge'], { ...env, CI: '1' });
  assert.equal(eye.asked.length, 2);
  assert.deepEqual(mine(ci), []);
  assert.equal(ci.code, 0);
});
