// How the recipes read a project's idioms (docs/research/engine-review.md D9): from what the project declares first
// (package.json, the stylesheet that imports Tailwind, the files that import a helper or a motion library), then from what
// its code uses most. Comments and vendored copies never count, and GET recipes says what each reading rests on.
// One test per idiom, over real HTTP on a project made here.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../dist/session/server.js';

const repo = fileURLToPath(new URL('../', import.meta.url));
const app = `export function App() {\n  return <div id="el" className="p-4">x</div>;\n}\n`;
const base = (deps = {}, extra = {}) => ({
  'package.json': JSON.stringify({ name: 'fx-idioms', private: true, type: 'module', dependencies: deps }) + '\n',
  'plumber.config.ts': `export default { css: 'src/styles.css', source: ['src/**/*.{ts,tsx,css}'] };\n`,
  'src/styles.css': ':root { --x: 1px; }\n',
  'src/App.tsx': app,
  ...extra,
});

async function idioms(t, files) {
  const root = await mkdtemp(join(repo, 'fixtures/.idioms-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const [name, text] of Object.entries(files)) { await mkdir(dirname(join(root, name)), { recursive: true }); await writeFile(join(root, name), text); }
  const server = await serve({ root, watch: false }); t.after(() => server.close());
  const text = await readFile(join(root, 'src/App.tsx'), 'utf8'), offset = text.indexOf('<div id="el"'), before = text.slice(0, offset);
  const url = new URL(`http://127.0.0.1:${server.info.port}/__plumb/recipes`);
  url.search = new URLSearchParams({ file: 'src/App.tsx', line: before.split('\n').length, column: offset - before.lastIndexOf('\n') });
  const response = await fetch(url, { headers: { 'x-plumb-token': server.info.token } });
  const body = await response.json();
  assert.equal(response.status, 200, JSON.stringify(body));
  return body.idioms;
}
const said = (i, idiom) => i.evidence.filter(e => e.idiom === idiom);

test('tailwind: read from package.json and the stylesheet that imports it, and said so', async t => {
  const none = await idioms(t, base());
  assert.equal(none.tailwind, null);
  assert.deepEqual(said(none, 'tailwind'), []);
  const i = await idioms(t, base({ tailwindcss: '^4.1.0' }, { 'src/styles.css': '@import "tailwindcss";\n@theme { --shadow-x: 0 1px 2px rgb(0 0 0 / 0.1); }\n' }));
  assert.deepEqual([i.tailwind.version, i.tailwind.entry], [4, 'src/styles.css']);
  assert.deepEqual(said(i, 'tailwind').map(e => e.says), ['package.json depends on Tailwind ^4.1.0', 'imports tailwindcss']);
});

test('classes: a helper counts only where it is imported or declared; a comment or a vendored copy that never imports it does not', async t => {
  const vendored = await idioms(t, base({}, {
    'src/vendor/example.tsx': `// usage: cn('a', 'b'), cn('c')\nexport const demo = () => cn('x') + cn('y') + cn('z');\n`,
    'src/Card.tsx': "import clsx from 'clsx';\nexport const Card = ({ on }) => <div className={clsx('p-2', on && 'p-4')} />;\n",
  }));
  assert.equal(vendored.classes, 'clsx');
  assert.deepEqual(said(vendored, 'classes'), [{ idiom: 'classes', says: 'clsx(…) is used most', file: 'src/Card.tsx', count: 1 }]);
  const own = await idioms(t, base({}, {
    'src/lib/utils.ts': 'export function cn(...a) { return a.filter(Boolean).join(" "); }\n',
    'src/A.tsx': "import { cn } from './lib/utils';\nexport const A = ({ on }) => <><i className={cn('a', on && 'b')} /><b className={cn('c')} /></>;\n",
  }));
  assert.equal(own.classes, 'cn');
  assert.equal(said(own, 'classes')[0].count, 2);
  assert.equal((await idioms(t, base())).classes, 'plain');
});

test('motion: installed from package.json or an import; the presets file is the one that exports the most', async t => {
  const none = await idioms(t, base({}, { 'src/notes.ts': "// we could import { motion } from 'motion/react'\nexport const x = 1;\n" }));
  assert.deepEqual([none.motion.installed, none.motion.from], [false, null]);
  const i = await idioms(t, base({ motion: '^12.0.0' }, {
    'src/one.ts': "export const quick = { type: 'spring', stiffness: 400, damping: 30 };\n",
    'src/motion/presets.ts': "export const soft = { type: 'spring', stiffness: 200, damping: 26 };\nexport const snappy = { type: 'spring', stiffness: 500, damping: 35 };\n",
  }));
  assert.deepEqual([i.motion.installed, i.motion.from], [true, 'motion/react']);
  assert.deepEqual(i.motion.presets, { file: 'src/motion/presets.ts', names: ['soft', 'snappy'] });
  assert.deepEqual(said(i, 'motion').map(e => e.says), ['package.json depends on motion']);
  assert.deepEqual(said(i, 'presets'), [{ idiom: 'presets', says: 'exports motion presets', file: 'src/motion/presets.ts', count: 2 }]);
});

test('dataState: from a headless library, or code that sets or reads data-state; never from a comment', async t => {
  const comment = await idioms(t, base({}, { 'src/B.tsx': '// TODO: use data-state like radix does: data-[state=open]\nexport const B = 1;\n' }));
  assert.equal(comment.dataState, false);
  const library = await idioms(t, base({ '@radix-ui/react-dialog': '^1.0.0' }));
  assert.equal(library.dataState, true);
  assert.deepEqual(said(library, 'dataState').map(e => e.says), ['package.json depends on @radix-ui/react-dialog']);
  const own = await idioms(t, base({}, { 'src/C.tsx': 'export const C = ({ open }) => <div data-state={open ? "open" : "closed"} className="data-[state=open]:block" />;\n' }));
  assert.equal(own.dataState, true);
  assert.deepEqual(said(own, 'dataState'), [{ idiom: 'dataState', says: 'sets or reads data-state', file: 'src/C.tsx', count: 2 }]);
});
