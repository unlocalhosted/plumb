// Layer 6 of the craft hard rules: structure. The server reads what the source says an element is (its component and
// library, its literal props and handlers); rules use it, and a suggestion that is a prop is written into the source
// through the server, then the page comes back quiet. Real CLI, real server, real Chromium.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { chromium } from 'playwright';
import { at, built, fixture, hasLine, lineOf, plumber } from './helpers/craft-headless.mjs';
import { CONTROLS, PROVIDER, STYLES } from './helpers/structure-apps.mjs';

const launch = () => chromium.launch({ executablePath: process.env.PLUMBER_CHROMIUM || process.env.PLUMB_CHROMIUM || undefined });

test('structure: a tooltip with the wrong delay names its provider’s prop; writing it fixes the source and the page comes back quiet', { timeout: 600000 }, async (t) => {
  if (!await built()) return t.skip('Run npm run build first.');
  const { root, url } = await fixture(t, PROVIDER, { styles: STYLES });
  const first = JSON.parse((await plumber(['--url', url, '--json', '--root', root, '--no-pairs'])).stdout);
  const found = first.routes[0].findings.filter((f) => f.rule === 'craft/tooltip-delay');
  assert.equal(found.length, 1, JSON.stringify(found.map((f) => f.text)));
  const suggest = found[0].suggest;
  assert.equal(suggest.kind, 'prop');
  assert.deepEqual([suggest.component, suggest.name, suggest.from, suggest.to], ['Tooltip.Provider', 'delayDuration', 0, 500]);
  assert.equal(suggest.site.file, 'src/App.jsx');
  assert.equal(suggest.site.line, lineOf(PROVIDER, 'tp-1') - 2); // the <Tooltip.Provider> line, two above the first trigger

  // the write: the same request the overlay makes
  const browser = await launch();
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.goto(url);
  await page.waitForFunction(() => window.__plumb?.overlay);
  await page.evaluate(() => window.__plumb.ready());
  const result = await page.evaluate(async (s) => {
    const { post } = await import('/__plumb/src/api.js');
    return post('prop', { file: s.site.file, hash: s.site.hash, line: s.site.line, column: s.site.column, name: s.name, value: s.to });
  }, suggest);
  assert.equal(result.applied[0], 'prop:delayDuration');
  const source = await readFile(join(root, 'src/App.jsx'), 'utf8');
  assert.match(source, /<Tooltip\.Provider delayDuration=\{500\}>/);

  // a stale hash is refused, and nothing is written
  const stale = await page.evaluate(async (s) => {
    const { post } = await import('/__plumb/src/api.js');
    return post('prop', { file: s.site.file, hash: s.site.hash, line: s.site.line, column: s.site.column, name: s.name, value: 900 }).then(() => 'written', (e) => e.message);
  }, suggest);
  assert.match(stale, /changed since|Read it again/);
  assert.match(await readFile(join(root, 'src/App.jsx'), 'utf8'), /delayDuration=\{500\}/);

  // and the page comes back quiet
  const again = JSON.parse((await plumber(['--url', url, '--json', '--root', root, '--no-pairs'])).stdout);
  assert.deepEqual(at(again, 'craft/tooltip-delay'), []);
});

test('structure: a drag on a control built from a div also scrolls the page on a phone; with touch-none, a click-only div (Tailwind resets the tap highlight) and a native button, nothing', { timeout: 600000 }, async (t) => {
  if (!await built()) return t.skip('Run npm run build first.');
  const { root, url } = await fixture(t, CONTROLS, { styles: STYLES });
  const report = JSON.parse((await plumber(['--url', url, '--json', '--root', root, '--no-probe', '--no-pairs'])).stdout);
  const line = (id) => lineOf(CONTROLS, id);
  const why = () => JSON.stringify(at(report, 'craft/touch-manipulation').map((f) => [f.line, f.finding.title]));
  // (the tap highlight is the page's decision, and Tailwind's preflight has already made it, so a div that only clicks is fine)
  assert.ok(!hasLine(report, 'craft/touch-manipulation', line('dg-good')), why());
  assert.ok(!hasLine(report, 'craft/touch-manipulation', line('cc-bad')) && !hasLine(report, 'craft/touch-manipulation', line('cc-good')) && !hasLine(report, 'craft/touch-manipulation', line('cc-native')), why());
  // the drag that leaves the page free to scroll under it
  const drag = at(report, 'craft/touch-manipulation').find((f) => f.line === line('dg-bad'));
  assert.ok(drag, why());
  assert.match(drag.finding.title, /scrolls the page/);
});

// the library table: what the source says each of these is, asked of the server the way the overlay asks
const LIBRARIES = `import * as Tooltip from '@radix-ui/react-tooltip';
import * as Dropdown from '@radix-ui/react-dropdown-menu';
import { Menu, MenuButton, MenuItems } from '@headlessui/react';
import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip';
import { TooltipProvider } from './components/ui/tooltip.jsx';
export function App() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col items-start gap-s4 px-s4 text-body text-ink">
      <Tooltip.Provider delayDuration={300}><span>radix provider</span></Tooltip.Provider>
      <Dropdown.Root><Dropdown.Trigger>menu</Dropdown.Trigger><Dropdown.Portal><Dropdown.Content><Dropdown.Sub><Dropdown.SubTrigger>more</Dropdown.SubTrigger></Dropdown.Sub></Dropdown.Content></Dropdown.Portal></Dropdown.Root>
      <Menu as="div"><MenuButton>headless</MenuButton><MenuItems>items</MenuItems></Menu>
      <BaseTooltip.Provider delay={200}><span>base provider</span></BaseTooltip.Provider>
      <TooltipProvider delayDuration={100}><span>shadcn provider</span></TooltipProvider>
      <button onClick={() => {}} onPointerDown={() => {}} className="rounded-control bg-surface px-s4 py-s2 text-body">plain</button>
    </main>
  );
}
`;
const SHADCN = `import * as Primitive from '@radix-ui/react-tooltip';
export const TooltipProvider = Primitive.Provider;
`;

test('structure: the server says what each element is (library, role, literal props, handlers) for Radix, Headless UI, Base UI and shadcn by file name', { timeout: 300000 }, async (t) => {
  if (!await built()) return t.skip('Run npm run build first.');
  const { url } = await fixture(t, LIBRARIES, { styles: STYLES, files: { 'components/ui/tooltip.jsx': SHADCN } });
  const where = (needle) => { const i = LIBRARIES.indexOf(needle); const before = LIBRARIES.slice(0, i).split('\n'); return { line: before.length, column: before.at(-1).length + 1 }; };
  const browser = await launch();
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.goto(url);
  await page.waitForFunction(() => window.__plumb?.overlay);
  await page.evaluate(() => window.__plumb.ready());
  const ask = (needle) => page.evaluate(async ({ file, ...at }) => { const { request } = await import('/__plumb/src/api.js'); return request('structure', { file, ...at }); }, { file: 'src/App.jsx', ...where(needle) });
  const got = async (needle) => { const s = await ask(needle); return [s.library, s.role]; };
  assert.deepEqual(await got('<Tooltip.Provider'), ['radix', 'tooltip-provider']);
  assert.deepEqual(await got('<Dropdown.Trigger'), ['radix', 'menu']);
  assert.deepEqual(await got('<Dropdown.SubTrigger'), ['radix', 'submenu']);
  assert.deepEqual(await got('<MenuButton'), ['headlessui', 'menu']);
  assert.deepEqual(await got('<BaseTooltip.Provider'), ['base-ui', 'tooltip-provider']);
  assert.deepEqual(await got('<TooltipProvider'), ['shadcn', 'tooltip-provider']);
  assert.deepEqual(await got('<button onClick'), [null, null]);
  // literal props and handlers
  assert.equal((await ask('<Tooltip.Provider')).props.delayDuration, 300);
  assert.deepEqual((await ask('<button onClick')).handlers, ['onClick', 'onPointerDown']);
  // a position that is not an element says so, and a file outside the project is refused
  assert.equal(await page.evaluate(async () => { const { request } = await import('/__plumb/src/api.js'); return request('structure', { file: 'src/App.jsx', line: 1, column: 1 }); }), null);
  assert.equal(await page.evaluate(async () => { const { request } = await import('/__plumb/src/api.js'); return request('structure', { file: '../../etc/passwd', line: 1, column: 1 }); }), null);
});
