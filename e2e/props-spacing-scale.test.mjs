import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../dist/session/server.js';

// F2-01 (docs/qa/element-card-results.md): a theme with only Tailwind v4's `--spacing` has a numeric scale, not an empty one.
const repo = fileURLToPath(new URL('../', import.meta.url));
const source = `import './styles.css';
export function App() {
  return <>
    <div className="grid gap-6 p-4" />
    <a className="px-2.5 py-4" />
    <div className="p-3" />
  </>;
}
`;
async function project(t, css) {
  const root = await mkdtemp(join(repo, 'fixtures/.spacing-scale-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'src'));
  await writeFile(join(root, 'package.json'), JSON.stringify({ name: 'plumber-fixture-spacing-scale', private: true, type: 'module' }));
  await writeFile(join(root, 'src/styles.css'), css);
  await writeFile(join(root, 'src/App.tsx'), source);
  const server = await serve({ root, watch: false }); t.after(() => server.close());
  const call = async (method, params, verb = 'GET') => {
    const url = new URL(`/__plumb/${method}`, `http://127.0.0.1:${server.info.port}`);
    if (verb === 'GET') url.search = new URLSearchParams(params);
    const response = await fetch(url, { method: verb, headers: { 'x-plumb-token': server.info.token, 'Content-Type': 'application/json' }, ...(verb === 'POST' ? { body: JSON.stringify(params) } : {}) });
    return { status: response.status, body: await response.json() };
  };
  const props = async line => { const r = await call('props', { file: 'src/App.tsx', line, column: 6 }); assert.equal(r.status, 200, JSON.stringify(r)); return r.body; };
  const prop = (body, key) => body.props.find(p => p.key === key);
  return { call, props, prop, read: () => readFile(join(root, 'src/App.tsx'), 'utf8') };
}
const steps = p => p.steps.map(s => [s.token, s.value]);

for (const [name, css, note] of [
  ['--spacing: 0.25rem', '@import "tailwindcss";\n@theme { --spacing: 0.25rem; }\n', false],
  ['--spacing defined twice (0.25rem, then calc(0.25rem * var(--z)))', '@import "tailwindcss";\n@theme { --spacing: 0.25rem; }\n@theme { --spacing: calc(0.25rem * var(--z)); }\n:root { --z: 1; }\n', false],
  ['--spacing: calc(0.25rem * var(--z))', '@import "tailwindcss";\n@theme { --spacing: calc(0.25rem * var(--z)); }\n', true],
]) {
  test(`spacing steps exist when the theme has only ${name}`, async t => {
    const api = await project(t, css);
    const body = await api.props(4);
    const padding = api.prop(body, 'padding'), gap = api.prop(body, 'gap');
    assert.deepEqual([padding.token, padding.value, padding.class], ['4', '16px', 'p-4']);
    assert.deepEqual([gap.token, gap.value, gap.class], ['6', '24px', 'gap-6']);
    // the multiples the codebase uses, merged with Tailwind's default ladder, each with its px at the resolved base
    for (const [token, value] of [['2.5', '10px'], ['3', '12px'], ['4', '16px'], ['6', '24px'], ['0.5', '2px'], ['8', '32px'], ['12', '48px']]) {
      assert.ok(steps(padding).some(([t2, v]) => t2 === token && v === value), `padding has ${token} = ${value}: ${JSON.stringify(steps(padding))}`);
    }
    assert.equal(padding.steps.find(s => s.token === '4').class, 'p-4');
    const link = await api.props(5);
    assert.deepEqual([api.prop(link, 'padding-x').token, api.prop(link, 'padding-x').value], ['2.5', '10px']);
    if (note) assert.match(JSON.stringify(padding.note ?? ''), /--z|more than once/);
    // a step is writable, and undoable
    const write = await api.call('set', { file: 'src/App.tsx', hash: body.hash, line: 4, column: 6, key: 'gap', token: '8' }, 'POST');
    assert.equal(write.status, 200, JSON.stringify(write));
    assert.match(await api.read(), /className="grid gap-8 p-4"/);
    assert.equal((await api.call('undo', { id: write.body.undo.id }, 'POST')).status, 200);
    assert.match(await api.read(), /className="grid gap-6 p-4"/);
  });
}

// B9 (docs/research/engine-review.md): in Tailwind v4 the multiplier and a named step coexist: `p-4` and `p-card` are both valid.
test('a named --spacing-* step beside --spacing keeps the whole multiplier ladder, and the named step joins it', async t => {
  const api = await project(t, '@import "tailwindcss";\n@theme { --spacing: 0.25rem; --spacing-card: 1.5rem; }\n');
  const padding = api.prop(await api.props(4), 'padding');
  for (const [token, value] of [['4', '16px'], ['2.5', '10px'], ['6', '24px'], ['12', '48px']]) assert.ok(steps(padding).some(([t2, v]) => t2 === token && v === value), `padding has ${token} = ${value}: ${JSON.stringify(steps(padding))}`);
  const card = padding.steps.find(s => s.token === 'card');
  assert.equal(card?.class, 'p-card');
  assert.match(card?.value, /^(?:24px|1\.5rem)$/);
});
test('--spacing-*: initial drops the multiplier ladder and leaves only the named steps', async t => {
  const api = await project(t, '@import "tailwindcss";\n@theme { --spacing-*: initial; --spacing: 0.25rem; --spacing-card: 1.5rem; }\n');
  const padding = api.prop(await api.props(4), 'padding');
  assert.ok(!padding.steps.some(s => s.token === '4'), JSON.stringify(steps(padding)));
  assert.ok(padding.steps.some(s => s.token === 'card'));
});
// N8: a base that is not a quarter step keeps its own step, so a card can find the step it just wrote
test('a --spacing of 0.3rem has steps at 4.8px multiples that can be written and found again', async t => {
  const api = await project(t, '@import "tailwindcss";\n@theme { --spacing: 0.3rem; }\n');
  const body = await api.props(4);
  const padding = api.prop(body, 'padding');
  assert.deepEqual(steps(padding).find(([token]) => token === '4'), ['4', '19.2px']);
  const write = await api.call('set', { file: 'src/App.tsx', hash: body.hash, line: 4, column: 6, key: 'gap', token: '4' }, 'POST');
  assert.equal(write.status, 200, JSON.stringify(write));
  assert.match(await api.read(), /className="grid gap-4 p-4"/);
  assert.equal(api.prop(await api.props(4), 'gap').token, '4');
});
