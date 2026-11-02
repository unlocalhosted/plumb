// A text element described fully by GET props (docs/briefs/element-editors.md, layer 1): an unset weight is addable,
// tracking and transform read and written, a flex <p> is text, the project's text styles are steps, and setting one
// writes the role class in place of the classes it replaces. Real server, real HTTP, on fixtures/type-roles.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../dist/session/server.js';

const repo = fileURLToPath(new URL('../', import.meta.url));
async function project(t) {
  const root = await mkdtemp(join(repo, 'fixtures/.props-text-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'fixtures/type-roles'), root, { recursive: true });
  // the measured <p> from crafting-ui: a flex row of caps text, a style passed in, a className with a hole
  await writeFile(join(root, 'src/Caps.tsx'), `export function Caps({ style, className = '', children }: { style?: React.CSSProperties; className?: string; children?: React.ReactNode }) {
  return <p id="caps" style={style} className={\`measure flex flex-wrap items-center gap-x-3 text-[12px] tracking-[0.08em] text-faint uppercase \${className}\`}>{children}</p>
}
`);
  const server = await serve({ root, watch: false }); t.after(() => server.close());
  const base = `http://127.0.0.1:${server.info.port}`;
  const call = async (method, params, verb = 'GET') => {
    const url = new URL('/__plumb/' + method, base);
    if (verb === 'GET') url.search = new URLSearchParams(params);
    const response = await fetch(url, { method: verb, headers: { 'x-plumb-token': server.info.token, 'Content-Type': 'application/json' }, ...(verb === 'POST' ? { body: JSON.stringify(params) } : {}) });
    return { status: response.status, body: await response.json() };
  };
  const props = async (file, line, column, computed) => { const r = await call('props', { file, line, column, ...(computed ? { computed: JSON.stringify(computed) } : {}) }); assert.equal(r.status, 200, JSON.stringify(r.body)); return r.body; };
  const prop = (body, key) => body.props.find(p => p.key === key);
  return { root, call, props, prop, read: (file) => readFile(join(root, file), 'utf8') };
}

test('a flex <p> of caps text is text; tracking and transform are read; unset weight and leading are addable, with the default that applies', async t => {
  const api = await project(t);
  const body = await api.props('src/Caps.tsx', 2, 10, { 'font-weight': '400', 'line-height': '18px' });
  assert.equal(body.kind, 'text');
  const keys = body.props.map(p => p.key);
  for (const key of ['font-size', 'font-weight', 'line-height', 'letter-spacing', 'text-transform', 'style']) assert.ok(keys.includes(key), key);
  assert.deepEqual([api.prop(body, 'letter-spacing').value, api.prop(body, 'letter-spacing').source, api.prop(body, 'letter-spacing').class, api.prop(body, 'letter-spacing').family], ['0.08em', 'class', 'tracking-[0.08em]', 'type']);
  assert.deepEqual([api.prop(body, 'text-transform').value, api.prop(body, 'text-transform').token, api.prop(body, 'text-transform').class], ['uppercase', 'uppercase', 'uppercase']);
  assert.deepEqual(api.prop(body, 'text-transform').steps.map(s => [s.token, s.class]), [['none', 'normal-case'], ['uppercase', 'uppercase'], ['lowercase', 'lowercase'], ['capitalize', 'capitalize']]);
  // nothing sets the weight or the leading: addable (no dynamic reason: the className's fixed part takes a class), and what applies is said
  for (const [key, applies] of [['font-weight', '400'], ['line-height', '18px']]) {
    const p = api.prop(body, key);
    assert.deepEqual([p.source, p.value, p.dynamic, p.default], ['none', null, undefined, applies], key);
  }
  // without the page's values, the theme's or the browser's default
  const plain = await api.props('src/Caps.tsx', 2, 10);
  assert.deepEqual([api.prop(plain, 'font-weight').default, api.prop(plain, 'line-height').default, api.prop(plain, 'font-size').value, api.prop(plain, 'font-size').default], ['400', '1.5', '12px', undefined]);
  // set the unset weight: a class is added to the fixed part; set the transform: the class is replaced
  const weighed = await api.call('set', { file: 'src/Caps.tsx', hash: body.hash, line: 2, column: 10, key: 'font-weight', token: 'medium' }, 'POST');
  assert.equal(weighed.status, 200, JSON.stringify(weighed.body));
  assert.match(await api.read('src/Caps.tsx'), /uppercase font-medium \$\{className\}/);
  const lowered = await api.call('set', { file: 'src/Caps.tsx', hash: weighed.body.hash, line: 2, column: 10, key: 'text-transform', token: 'none' }, 'POST');
  assert.equal(lowered.status, 200, JSON.stringify(lowered.body));
  assert.match(await api.read('src/Caps.tsx'), /text-faint normal-case font-medium/);
  const tracked = await api.call('set', { file: 'src/Caps.tsx', hash: lowered.body.hash, line: 2, column: 10, key: 'letter-spacing', token: '[0.1em]' }, 'POST');
  assert.equal(tracked.status, 400); // not a step: tracking steps come from the theme's --tracking-* tokens, and this theme has none
  assert.match(tracked.body.error, /not a step of letter-spacing/);
});

test('the project’s text styles are steps of the style property; setting one writes the role class in place of the classes it replaces; undo restores', async t => {
  const api = await project(t);
  // the config's decision (body-large 16/1.6, compact 1.4) gives the steps before any role is written to the theme
  const before = await api.props('src/App.tsx', 14, 7);
  const style = api.prop(before, 'style');
  assert.deepEqual(style.steps.map(s => [s.token, s.label, s.class, s.size, s.lineHeight, s.weight, s.transform]), [['body-large', 'Body large', 'type-body-large', '16px', 1.6, 400, 'none'], ['body-large-compact', 'Body large (compact)', 'type-body-large-compact', '16px', 1.4, 400, 'none']]);
  assert.deepEqual([style.value, style.token, style.source, style.class], [null, null, 'none', null]);
  // write the whole proposal so the theme carries every role, then the steps are all of them, with their bundles
  const proposal = (await api.call('system', {}, 'POST')).body.proposal;
  const applied = await api.call('apply-all', { tokens: proposal.write.tokens, css: proposal.write.css }, 'POST');
  assert.equal(applied.status, 200, JSON.stringify(applied.body).slice(0, 300));
  const after = await api.props('src/App.tsx', 14, 7);
  const steps = api.prop(after, 'style').steps;
  assert.deepEqual(steps.map(s => s.token), ['headline-small', 'title-medium', 'body-large', 'body-large-compact', 'label-medium', 'label-small']);
  assert.deepEqual(steps.find(s => s.token === 'label-medium'), { token: 'label-medium', value: '0.75rem', label: 'Label medium', class: 'type-label-medium', css: 'var(--text-label-medium)', size: '0.75rem', lineHeight: null, weight: 400, letterSpacing: 0.08, transform: 'uppercase' });
  // the prose paragraph wears text-[1rem] leading-[1.6]: setting the body style replaces both with the role class
  const source = await api.read('src/App.tsx');
  assert.ok(source.includes('<p id="prose-a" className="text-[1rem] leading-[1.6]">'));
  const set = await api.call('set', { file: 'src/App.tsx', hash: after.hash, line: 14, column: 7, key: 'style', token: 'body-large' }, 'POST');
  assert.equal(set.status, 200, JSON.stringify(set.body));
  assert.ok((await api.read('src/App.tsx')).includes('<p id="prose-a" className="type-body-large">'));
  const worn = await api.props('src/App.tsx', 14, 7);
  assert.deepEqual([api.prop(worn, 'style').token, api.prop(worn, 'style').value, api.prop(worn, 'style').class], ['body-large', 'Body large', 'type-body-large']);
  // the same style again is refused; a different one swaps the role class
  assert.equal((await api.call('set', { file: 'src/App.tsx', hash: set.body.hash, line: 14, column: 7, key: 'style', token: 'body-large' }, 'POST')).status, 400);
  const compact = await api.call('set', { file: 'src/App.tsx', hash: set.body.hash, line: 14, column: 7, key: 'style', token: 'body-large-compact' }, 'POST');
  assert.equal(compact.status, 200, JSON.stringify(compact.body));
  assert.ok((await api.read('src/App.tsx')).includes('<p id="prose-a" className="type-body-large-compact">'));
  // undo both writes: the paragraph as it was
  for (const handle of [compact.body.undo, set.body.undo]) assert.equal((await api.call('undo', { id: handle.id }, 'POST')).status, 200);
  assert.equal(await api.read('src/App.tsx'), source);
});
