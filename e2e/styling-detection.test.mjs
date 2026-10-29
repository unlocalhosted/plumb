// Styling systems and component libraries are detected with evidence and a support level, through the real CLI
// (`plumber state --json` → facts). Detection only: finding a system plumb cannot judge never fails the run.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { detected, find, fixture, json, put, run } from './helpers/layouts.mjs';

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
  assert.equal(item.label, 'Base UI'); assert.equal(item.support, 'supported', 'every capability of its adapter ran');
  assert.deepEqual([item.evidence[0].file, item.evidence[0].line], ['src/Menu.jsx', 1]);
});

test('react-aria: react-aria-components is found; partial', async t => {
  const { list } = await detected(t, { 'package.json': { name: 'site', type: 'module', dependencies: { react: '*', vite: '*', tailwindcss: '^4', 'react-aria-components': '^1.5.0' } }, 'src/B.jsx': "import { Button } from 'react-aria-components';\nexport const B = () => <Button className=\"p-s4\" />;\n" }, 'libraries');
  const item = find(list, 'react-aria');
  assert.equal(item.support, 'partial'); assert.deepEqual([item.evidence[0].file, item.evidence[0].line], ['src/B.jsx', 1]);
});

test('ark: @ark-ui/react is found; partial', async t => {
  const { list } = await detected(t, { 'package.json': { name: 'site', type: 'module', dependencies: { react: '*', vite: '*', tailwindcss: '^4', '@ark-ui/react': '^4.0.0' } }, 'src/D.jsx': "import { Dialog } from '@ark-ui/react/dialog';\nexport const D = () => <Dialog.Root />;\n" }, 'libraries');
  const item = find(list, 'ark');
  assert.equal(item.support, 'partial'); assert.deepEqual([item.evidence[0].file, item.evidence[0].line], ['src/D.jsx', 1]);
});

test('shadcn: components.json is the evidence, with no package; its generated files are the app\'s own source', async t => {
  const { list } = await detected(t, { 'components.json': '{ "style": "new-york", "tailwind": { "css": "src/index.css" }, "aliases": { "ui": "@/components/ui" } }\n', 'src/components/ui/button.jsx': 'export const Button = () => <button className="p-s4" />;\n' }, 'libraries');
  const item = find(list, 'shadcn');
  assert.equal(item.support, 'supported', 'every capability of its adapter ran'); assert.deepEqual([item.evidence[0].file, item.evidence[0].line], ['components.json', 1]);
  assert.equal(item.detail.package, undefined, 'known by its config, not a dependency');
  assert.equal(item.detail.style, 'new-york');
});

test('tailwind-merge: found; supported through the class helper', async t => {
  const { list } = await detected(t, { 'package.json': { name: 'site', type: 'module', dependencies: { react: '*', vite: '*', tailwindcss: '^4', 'tailwind-merge': '^3.0.0' } }, 'src/cn.js': "import { twMerge } from 'tailwind-merge';\nexport const cn = (...a) => twMerge(a.join(' '));\n" }, 'libraries');
  const item = find(list, 'tailwind-merge');
  assert.equal(item.support, 'supported'); assert.deepEqual([item.evidence[0].file, item.evidence[0].line], ['src/cn.js', 1]);
});

test('clsx: clsx or classnames is found; supported through the class helper', async t => {
  const { list } = await detected(t, { 'package.json': { name: 'site', type: 'module', dependencies: { react: '*', vite: '*', tailwindcss: '^4', clsx: '^2.1.0' } }, 'src/A.jsx': "import clsx from 'clsx';\nexport const A = ({ on }) => <div className={clsx('p-s4', on && 'text-ink')} />;\n" }, 'libraries');
  const item = find(list, 'clsx');
  assert.equal(item.support, 'supported'); assert.deepEqual([item.evidence[0].file, item.evidence[0].line], ['src/A.jsx', 1]);
});

// ---- The support model through the real surfaces: CLI notice and refusal, doctor Support table, readiness rows.
import { viteReadiness } from './helpers/layouts.mjs';

test('mixed app: Tailwind is judged and styled-components is named once, with evidence, in check, doctor and readiness', { timeout: 120000 }, async t => {
  const files = { 'package.json': { name: 'site', type: 'module', dependencies: { react: '*', vite: '*', tailwindcss: '^4', 'styled-components': '^6.1.0' } },
    'src/Button.jsx': "import { Card } from './Card.jsx';\nimport styled from 'styled-components';\nexport const Button = styled.button`padding: 13px;`;\n", 'src/Card.jsx': 'export const Card = () => <div className="p-s4" />;\n' };
  const { project } = await detected(t, files);
  const line = '! Not judged: styled-components (src/Button.jsx:2); not judged yet. nothing to do; plumb skips it\n';
  for (const args of [[], ['--json'], ['--agent']]) {
    const result = await run(project, args, 0);
    assert.equal(result.stderr, line);
  }
  const doctor = await run(project, ['doctor'], 1);
  const support = doctor.stdout.split('\nSupport\n')[1].split('\nDiagnostics\n')[0];
  assert.match(support, /^supported\s+Tailwind 4:\s+package\.json:\d+/m);
  assert.match(support.replace(/\n {20,}/g, ' '), /^unsupported\s+styled-components:\s+src\/Button\.jsx:2\s+not judged yet: styled`` and css`` templates\./m);
  assert.match(doctor.stdout, /fix Not judged: styled-components \(src\/Button\.jsx:2\); not judged yet\.[\s\S]{0,120}\[read\.styling\.styled-components\]/);
  assert.match(doctor.stdout, /^  degraded\s+Read$/m, 'Read is degraded, not off: Tailwind is still judged');
  const ready = await viteReadiness(t, project.root);
  const row = ready.requirements.find(item => item.id === 'read.styling.styled-components');
  assert.equal(row.status, 'missing');
  assert.deepEqual([row.evidence[0].file, row.evidence[0].line], ['src/Button.jsx', 2]);
  assert.equal(row.fix.kind, 'step');
  assert.equal(ready.requirements.find(item => item.id === 'read.styles').status, 'ok');
});

test('only an unsupported system: the check refuses with what was found, why, and what to do; state still describes it', async t => {
  const project = await fixture(t, { 'package.json': { name: 'site', type: 'module', dependencies: { react: '*', 'styled-components': '^6.1.0' } },
    'src/App.jsx': "import styled from 'styled-components';\nconst Box = styled.div`padding: 13px;`;\nexport const App = () => <Box />;\n" });
  const result = await run(project, [], 2);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, '✗ Styles live in styled-components (src/App.jsx:1); React Plumber does not read styled`` and css`` templates yet.\n  It judges Tailwind 4 classes, stylesheets and inline style; this app has none of those to read.\n  → nothing to do; plumb skips it. Run in an app with Tailwind 4 or stylesheets.\n');
  const state = json(await run(project, ['state', '--json']));
  assert.equal(state.kind, 'styled-in-js');
  // One stylesheet beside it is enough to judge: the run goes ahead and names what it skips.
  await put(project.root, { 'src/styles.css': '.box { padding: 13px; }\n', 'src/App.jsx': "import './styles.css';\nimport styled from 'styled-components';\nexport const App = () => <div className=\"box\" />;\n" });
  const judged = await run(project, ['--json'], 0);
  assert.match(judged.stderr, /^! Not judged: styled-components \(src\/App\.jsx:2\)/);
});

test('an unknown library is ignored silently; a partial system says what is and is not judged', async t => {
  const { list, project, state } = await detected(t, { 'package.json': { name: 'site', type: 'module', dependencies: { react: '*', vite: '*', tailwindcss: '^4', 'some-unknown-ui': '^1.0.0', 'left-pad': '^1.3.0' } },
    'src/Card.module.css': '.card { padding: 13px; }\n', 'src/Card.jsx': "import styles from './Card.module.css';\nimport { Thing } from 'some-unknown-ui';\nexport const Card = () => <Thing className={styles.card} />;\n" });
  assert.deepEqual(state.facts.libraries.value, []);
  assert.ok(!list.some(item => /unknown|left-pad/.test(item.id)));
  const result = await run(project, [], 0);
  assert.equal(result.stderr, '! Partly judged: CSS Modules (src/Card.jsx:1): declarations in *.module.css, as stylesheets; class names applied through the styles object are not traced to elements\n');
  const doctor = await run(project, ['doctor'], 1);
  assert.match(doctor.stdout, /^partial\s+CSS Modules:\s+src\/Card\.jsx:1/m);
  assert.match(doctor.stdout, /ok Partly judged: CSS Modules \(src\/Card\.jsx:1\)[\s\S]{0,200}\[read\.styling\.css-modules\]/);
});
