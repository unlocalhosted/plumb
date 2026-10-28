// Library adapters (docs/briefs/library-adapters.result.md): what plumb understands of Base UI, Radix and shadcn/ui
// is declared per capability, and support is derived from it. Through the real CLI: `state --json` carries every
// rendered primitive and part with its site; doctor shows the compact usage line; a file that will not parse makes
// the capability unknown with evidence, never a crash.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { detected, find, json, run } from './helpers/layouts.mjs';

const sites = item => item.usage.sites.map(site => `${site.file}:${site.line} ${site.component}${site.part ? `.${site.part}` : ''}`);

test('Base UI: every primitive and part is counted, with each site, across subpath imports', async t => {
  const { list, project } = await detected(t, {
    'package.json': { name: 'site', type: 'module', dependencies: { react: '*', vite: '*', tailwindcss: '^4', '@base-ui/react': '^1.8.0' } },
    'src/Volume.jsx': "import { Slider } from '@base-ui/react/slider';\nexport const Volume = () => (\n  <Slider.Root className=\"w-24\">\n    <Slider.Control><Slider.Track><Slider.Thumb className=\"size-3\" /></Slider.Track></Slider.Control>\n  </Slider.Root>\n);\n",
    'src/Toggle.jsx': "import { Switch } from '@base-ui/react/switch';\nimport { Slider } from '@base-ui/react/slider';\nexport const Toggle = () => <><Switch.Root><Switch.Thumb /></Switch.Root><Slider.Root /></>;\n",
    'src/Pop.jsx': "import { Popover } from '@base-ui/react';\nexport const Pop = () => <Popover.Root><Popover.Trigger /><Popover.Portal><Popover.Positioner><Popover.Popup className=\"p-4\" /></Popover.Positioner></Popover.Portal></Popover.Root>;\n",
  }, 'libraries');
  const item = find(list, 'base-ui-react');
  assert.equal(item.support, 'partial');
  assert.deepEqual(item.capabilities, { usage: 'judged' });
  assert.match(item.judged, /^usage \(every primitive, part and site\)$/);
  assert.match(item.skipped, /states, structure \(portals, slots, render props\), owned values are not judged yet/);
  assert.equal(item.usage.files, 3);
  assert.deepEqual(item.usage.components, { Slider: 2, Popover: 1, Switch: 1 });
  assert.deepEqual(sites(item), [
    'src/Pop.jsx:2 Popover.Root', 'src/Pop.jsx:2 Popover.Trigger', 'src/Pop.jsx:2 Popover.Portal', 'src/Pop.jsx:2 Popover.Positioner', 'src/Pop.jsx:2 Popover.Popup',
    'src/Toggle.jsx:3 Switch.Root', 'src/Toggle.jsx:3 Switch.Thumb', 'src/Toggle.jsx:3 Slider.Root',
    'src/Volume.jsx:3 Slider.Root', 'src/Volume.jsx:4 Slider.Control', 'src/Volume.jsx:4 Slider.Track', 'src/Volume.jsx:4 Slider.Thumb',
  ]);
  const doctor = await run(project, ['doctor'], 1);
  assert.match(doctor.stdout, /^Libraries:\s+Base UI\s+Base UI: 3 files · Slider 2, Popover 1, Switch 1/m);
  assert.match(doctor.stdout.split('\nSupport\n')[1], /^partial\s+Base UI:\s+src\/Pop\.jsx:1\s+usage \(every primitive, part and site\); states, st/m);
  const check = await run(project, [], 0);
  assert.equal(check.stderr, '! Partly judged: Base UI (src/Pop.jsx:1): usage (every primitive, part and site); states, structure (portals, slots, render props), owned values are not judged yet\n');
});

test('Radix: namespace, named-part and prefixed imports name the same component and part; the bare name is its root', async t => {
  const { list } = await detected(t, {
    'package.json': { name: 'site', type: 'module', dependencies: { react: '*', vite: '*', tailwindcss: '^4', '@radix-ui/react-popover': '^1.1.0', '@radix-ui/react-dialog': '^1.1.0', '@radix-ui/react-slot': '^1.2.0' } },
    'src/Pop.jsx': "import * as Popover from '@radix-ui/react-popover';\nexport const Pop = () => <Popover.Root><Popover.Trigger asChild><button /></Popover.Trigger><Popover.Portal><Popover.Content className=\"p-4\" /></Popover.Portal></Popover.Root>;\n",
    'src/Modal.jsx': "import { Dialog, DialogContent, Trigger } from '@radix-ui/react-dialog';\nimport { Slot } from '@radix-ui/react-slot';\nexport const Modal = () => <Dialog><Trigger /><DialogContent><Slot /></DialogContent></Dialog>;\n",
  }, 'libraries');
  const item = find(list, 'radix');
  assert.equal(item.support, 'partial');
  assert.deepEqual(item.usage.components, { Dialog: 1, Popover: 1, Slot: 1 });
  assert.deepEqual(sites(item), [
    'src/Modal.jsx:3 Dialog.Root', 'src/Modal.jsx:3 Dialog.Trigger', 'src/Modal.jsx:3 Dialog.Content', 'src/Modal.jsx:3 Slot',
    'src/Pop.jsx:2 Popover.Root', 'src/Pop.jsx:2 Popover.Trigger', 'src/Pop.jsx:2 Popover.Portal', 'src/Pop.jsx:2 Popover.Content',
  ]);
});

test('shadcn: components.json aliases say where the generated components live; each import of them is a site', async t => {
  const { list } = await detected(t, {
    'components.json': { style: 'new-york', tailwind: { css: 'src/index.css', cssVariables: true, baseColor: 'neutral' }, aliases: { components: '~/components', ui: '~/ui', utils: '~/lib/utils' }, iconLibrary: 'lucide' },
    'src/ui/button.jsx': 'export const Button = () => <button className="h-9" />;\n',
    'src/ui/dialog.jsx': 'export const Dialog = () => null; export const DialogContent = () => null;\n',
    'src/App.jsx': "import { Button } from '~/ui/button';\nimport { Dialog, DialogContent } from '~/ui/dialog';\nexport const App = () => <Dialog><DialogContent><Button className=\"h-[38px]\" /></DialogContent></Dialog>;\n",
  }, 'libraries');
  const item = find(list, 'shadcn');
  assert.equal(item.support, 'partial');
  assert.deepEqual(item.usage.components, { Button: 1, Dialog: 1 });
  assert.deepEqual(sites(item), ['src/App.jsx:3 Dialog', 'src/App.jsx:3 Dialog.Content', 'src/App.jsx:3 Button']);
  assert.match(item.skipped, /the design system \(components\.json, components\/ui\) are not judged yet/);
});

test('a file that will not parse makes usage unknown, with the file named; the rest is still counted and nothing crashes', async t => {
  const { list, project } = await detected(t, {
    'package.json': { name: 'site', type: 'module', dependencies: { react: '*', vite: '*', tailwindcss: '^4', '@base-ui/react': '^1.8.0' } },
    'src/Good.jsx': "import { Switch } from '@base-ui/react/switch';\nexport const Good = () => <Switch.Root />;\n",
    'src/Bad.jsx': "import { Switch } from '@base-ui/react/switch';\nexport const Bad = () => <Switch.Root>\n",
  }, 'libraries');
  const item = find(list, 'base-ui-react');
  assert.deepEqual(item.capabilities, { usage: 'unknown' });
  assert.equal(item.support, 'partial');
  assert.match(item.skipped, /usage \(every primitive, part and site\) could not be read here/);
  assert.ok(item.evidence.some(where => where.file === 'src/Bad.jsx' && /could not parse/.test(where.text)), JSON.stringify(item.evidence));
  assert.deepEqual(sites(item), ['src/Good.jsx:2 Switch.Root']);
  const state = json(await run(project, ['state', '--json']));
  assert.ok(state.facts.libraries.value.find(entry => entry.id === 'base-ui-react').usage);
});

test('a library with a detector and no adapter says it is found, not understood yet', async t => {
  const { list, project } = await detected(t, { 'package.json': { name: 'site', type: 'module', dependencies: { react: '*', vite: '*', tailwindcss: '^4', 'react-aria-components': '^1.5.0' } }, 'src/B.jsx': "import { Button } from 'react-aria-components';\nexport const B = () => <Button className=\"p-s4\" />;\n" }, 'libraries');
  const item = find(list, 'react-aria');
  assert.equal(item.support, 'partial'); assert.equal(item.capabilities, undefined); assert.equal(item.usage, undefined);
  const check = await run(project, [], 0);
  assert.equal(check.stderr, '! Partly judged: React Aria (src/B.jsx:1): found, not understood yet: your classes on its elements are judged like plain elements; its states, portals and own variables are not\n');
});
