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

test('unocss: the dependency and uno.config.ts are found; unsupported', async t => {
  const { list } = await detected(t, { 'package.json': { name: 'site', type: 'module', dependencies: { react: '*', vite: '*', tailwindcss: '^4', unocss: '^66.0.0' } }, 'uno.config.ts': 'export default {};\n', 'src/main.jsx': "import 'virtual:uno.css';\n" });
  const item = find(list, 'unocss');
  assert.equal(item.support, 'unsupported');
  assert.deepEqual([item.evidence[0].file, item.evidence[0].line], ['src/main.jsx', 1]);
  assert.ok(item.evidence.some(e => e.file === 'uno.config.ts'));
});

test('panda: the styled-system import is the evidence; unsupported', async t => {
  const { list } = await detected(t, { 'package.json': { name: 'site', type: 'module', dependencies: { react: '*', vite: '*', tailwindcss: '^4', '@pandacss/dev': '^0.50.0' } }, 'panda.config.ts': 'export default {};\n', 'src/Card.jsx': "import { css } from '../styled-system/css';\nexport const Card = () => <div className={css({ p: 4 })} />;\n" });
  const item = find(list, 'panda');
  assert.equal(item.support, 'unsupported');
  assert.deepEqual([item.evidence[0].file, item.evidence[0].line], ['src/Card.jsx', 1]);
});

test('vanilla-extract: a .css.ts import is the evidence; unsupported', async t => {
  const { list } = await detected(t, { 'package.json': { name: 'site', type: 'module', dependencies: { react: '*', vite: '*', tailwindcss: '^4', '@vanilla-extract/css': '^1.17.0' } }, 'src/Card.css.ts': "import { style } from '@vanilla-extract/css';\nexport const card = style({ padding: 13 });\n", 'src/Card.jsx': "import { card } from './Card.css.ts';\nexport const Card = () => <div className={card} />;\n" });
  const item = find(list, 'vanilla-extract');
  assert.equal(item.support, 'unsupported');
  assert.equal(item.evidence[0].file, 'src/Card.css.ts');
});

test('stylex: the @stylexjs import is the evidence; unsupported', async t => {
  const { list } = await detected(t, { 'package.json': { name: 'site', type: 'module', dependencies: { react: '*', vite: '*', tailwindcss: '^4', '@stylexjs/stylex': '^0.12.0' } }, 'src/Card.jsx': "import * as stylex from '@stylexjs/stylex';\nconst s = stylex.create({ card: { padding: 13 } });\nexport const Card = () => <div {...stylex.props(s.card)} />;\n" });
  const item = find(list, 'stylex');
  assert.equal(item.support, 'unsupported');
  assert.deepEqual([item.evidence[0].file, item.evidence[0].line], ['src/Card.jsx', 1]);
});

test('styled-components: found at the import site; unsupported; Tailwind beside it is still judged (mixed app)', async t => {
  const { list, state } = await detected(t, { 'package.json': { name: 'site', type: 'module', dependencies: { react: '*', vite: '*', tailwindcss: '^4', 'styled-components': '^6.1.0' } }, 'src/Button.jsx': "import { useState } from 'react';\nimport { Card } from './Card.jsx';\nimport styled from 'styled-components';\nexport const Button = styled.button`padding: 13px;`;\n", 'src/Card.jsx': 'export const Card = () => <div className="p-s4" />;\n' });
  const item = find(list, 'styled-components');
  assert.equal(item.support, 'unsupported');
  assert.deepEqual([item.evidence[0].file, item.evidence[0].line], ['src/Button.jsx', 3]);
  assert.equal(find(list, 'tailwind').support, 'supported');
  assert.ok(state.numbers.libraries.includes('styled-components'), 'the state report still names it');
  assert.ok(!state.facts.libraries.value.some(item => item.id === 'styled-components'), 'it is a styling system, not a component library');
});

test('emotion: found at the import site; unsupported', async t => {
  const { list, state } = await detected(t, { 'package.json': { name: 'site', type: 'module', dependencies: { react: '*', vite: '*', tailwindcss: '^4', '@emotion/react': '^11.14.0', '@emotion/styled': '^11.14.0' } }, 'src/Card.jsx': "import styled from '@emotion/styled';\nexport const Card = styled.div`padding: 13px;`;\n" });
  const item = find(list, 'emotion');
  assert.equal(item.support, 'unsupported');
  assert.deepEqual([item.evidence[0].file, item.evidence[0].line], ['src/Card.jsx', 1]);
  assert.ok(state.numbers.libraries.includes('@emotion'));
});

test('linaria: found at the import site; unsupported', async t => {
  const { list } = await detected(t, { 'package.json': { name: 'site', type: 'module', dependencies: { react: '*', vite: '*', tailwindcss: '^4', '@linaria/core': '^6.3.0' } }, 'src/Card.jsx': "import { css } from '@linaria/core';\nexport const card = css`padding: 13px;`;\n" });
  const item = find(list, 'linaria');
  assert.equal(item.support, 'unsupported');
  assert.deepEqual([item.evidence[0].file, item.evidence[0].line], ['src/Card.jsx', 1]);
});

test('base-ui: @base-ui/react (the current package name) is found beside @base-ui-components', async t => {
  const { list } = await detected(t, { 'package.json': { name: 'site', type: 'module', dependencies: { react: '*', vite: '*', tailwindcss: '^4', '@base-ui/react': '^1.8.0' } }, 'src/Menu.jsx': "import { Menu } from '@base-ui/react/menu';\nexport const M = () => <Menu.Root />;\n" }, 'libraries');
  const item = find(list, 'base-ui-react');
  assert.equal(item.label, 'Base UI'); assert.equal(item.support, 'partial');
  assert.deepEqual([item.evidence[0].file, item.evidence[0].line], ['src/Menu.jsx', 1]);
});
