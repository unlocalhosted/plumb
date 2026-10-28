// Styling systems and component libraries are detected with evidence and a support level, through the real CLI
// (`plumber state --json` → facts). Detection only: finding a system plumb cannot judge never fails the run.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fixture, installTailwind, json, run, viteApp } from './helpers/layouts.mjs';

export async function detected(t, files, kind = 'styling') {
  const project = await fixture(t, viteApp(files));
  await installTailwind(project.root);
  const state = json(await run(project, ['state', '--json']));
  const list = kind === 'styling' ? state.facts.styling.value.systems : state.facts.libraries.value;
  // The check still runs: finding something unsupported is never a failure by itself.
  const check = await run(project, ['--json'], 0);
  assert.ok(json(check));
  return { list, state, project };
}
export const find = (list, id) => { const item = list.find(item => item.id === id); assert.ok(item, `${id} in ${list.map(item => item.id)}`); return item; };

test('css-modules: a *.module.css import is found at its line, partial, beside Tailwind', async t => {
  const { list } = await detected(t, { 'src/Card.module.css': '.card { padding: 13px; }\n', 'src/Card.jsx': "import styles from './Card.module.css';\nexport const Card = () => <div className={styles.card} />;\n" });
  const item = find(list, 'css-modules');
  assert.equal(item.support, 'partial');
  assert.deepEqual([item.evidence[0].file, item.evidence[0].line], ['src/Card.jsx', 1]);
  assert.match(item.judged, /\*\.module\.css/); assert.match(item.skipped, /styles object/);
  assert.equal(find(list, 'tailwind').support, 'supported');
});

test('sass: an .scss import is found and marked unsupported; Tailwind is still judged', async t => {
  const { list } = await detected(t, { 'package.json': { name: 'site', type: 'module', dependencies: { react: '*', vite: '*', tailwindcss: '^4', sass: '^1.80.0' } }, 'src/Card.scss': '.card { padding: 13px; }\n', 'src/Card.jsx': "import './Card.scss';\nexport const Card = () => <div className=\"card\" />;\n" });
  const item = find(list, 'sass');
  assert.equal(item.support, 'unsupported');
  assert.deepEqual([item.evidence[0].file, item.evidence[0].line], ['src/Card.jsx', 1]);
  assert.ok(item.evidence.some(e => e.file === 'package.json' && /^sass:/.test(e.text)));
  assert.equal(find(list, 'tailwind').support, 'supported');
});

test('less: a .less import is found and marked unsupported', async t => {
  const { list } = await detected(t, { 'src/Card.less': '.card { padding: 13px; }\n', 'src/Card.jsx': "import './Card.less';\nexport const Card = () => <div className=\"card\" />;\n" });
  const item = find(list, 'less');
  assert.equal(item.support, 'unsupported');
  assert.deepEqual([item.evidence[0].file, item.evidence[0].line], ['src/Card.jsx', 1]);
});

test('postcss: a postcss.config.js is the evidence; partial, stylesheets as authored', async t => {
  const { list } = await detected(t, { 'postcss.config.js': 'export default { plugins: {} };\n' });
  const item = find(list, 'postcss');
  assert.equal(item.support, 'partial');
  assert.deepEqual([item.evidence[0].file, item.evidence[0].line], ['postcss.config.js', 1]);
});
