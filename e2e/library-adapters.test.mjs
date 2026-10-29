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
  assert.equal(item.support, 'supported');
  assert.deepEqual(item.capabilities, { usage: 'judged', states: 'judged', structure: 'judged', owned: 'judged' });
  assert.equal(item.judged, 'usage (every primitive, part and site), states, structure (portals, slots, render props), owned values (its own variables and providers)');
  assert.equal(item.skipped, undefined);
  assert.deepEqual(item.usage.sites.filter(site => site.structure).map(site => `${site.component}.${site.part} ${site.structure}`), ['Popover.Portal portal'], 'the portal part is marked');
  assert.equal(item.usage.files, 3);
  assert.deepEqual(item.usage.components, { Slider: 2, Popover: 1, Switch: 1 });
  assert.deepEqual(sites(item), [
    'src/Pop.jsx:2 Popover.Root', 'src/Pop.jsx:2 Popover.Trigger', 'src/Pop.jsx:2 Popover.Portal', 'src/Pop.jsx:2 Popover.Positioner', 'src/Pop.jsx:2 Popover.Popup',
    'src/Toggle.jsx:3 Switch.Root', 'src/Toggle.jsx:3 Switch.Thumb', 'src/Toggle.jsx:3 Slider.Root',
    'src/Volume.jsx:3 Slider.Root', 'src/Volume.jsx:4 Slider.Control', 'src/Volume.jsx:4 Slider.Track', 'src/Volume.jsx:4 Slider.Thumb',
  ]);
  const doctor = await run(project, ['doctor'], 1);
  assert.match(doctor.stdout, /^Libraries:\s+Base UI\s+Base UI: 3 files · Slider 2, Popover 1, Switch 1/m);
  assert.match(doctor.stdout.split('\nSupport\n')[1], /^supported\s+Base UI:\s+src\/Pop\.jsx:1\s+usage \(every primitive, part and site\), states, st/m);
  const check = await run(project, [], 0);
  assert.equal(check.stderr, '', 'a fully understood library prints no notice');
});

test('Radix: namespace, named-part and prefixed imports name the same component and part; the bare name is its root', async t => {
  const { list } = await detected(t, {
    'package.json': { name: 'site', type: 'module', dependencies: { react: '*', vite: '*', tailwindcss: '^4', '@radix-ui/react-popover': '^1.1.0', '@radix-ui/react-dialog': '^1.1.0', '@radix-ui/react-slot': '^1.2.0' } },
    'src/Pop.jsx': "import * as Popover from '@radix-ui/react-popover';\nexport const Pop = () => <Popover.Root><Popover.Trigger asChild><button /></Popover.Trigger><Popover.Portal><Popover.Content className=\"p-4\" /></Popover.Portal></Popover.Root>;\n",
    'src/Modal.jsx': "import { Dialog, DialogContent, Trigger } from '@radix-ui/react-dialog';\nimport { Slot } from '@radix-ui/react-slot';\nexport const Modal = () => <Dialog><Trigger /><DialogContent><Slot /></DialogContent></Dialog>;\n",
  }, 'libraries');
  const item = find(list, 'radix');
  assert.equal(item.support, 'supported');
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
  assert.equal(item.support, 'supported');
  assert.deepEqual(item.usage.components, { Button: 1, Dialog: 1 });
  assert.deepEqual(sites(item), ['src/App.jsx:3 Dialog', 'src/App.jsx:3 Dialog.Content', 'src/App.jsx:3 Button']);
  assert.equal(item.skipped, undefined);
  assert.deepEqual(item.detail, { style: 'new-york', css: 'src/index.css', cssVariables: true, baseColor: 'neutral', iconLibrary: 'lucide', ui: '~/ui', utils: '~/lib/utils' });
});

test('a file that will not parse makes usage unknown, with the file named; the rest is still counted and nothing crashes', async t => {
  const { list, project } = await detected(t, {
    'package.json': { name: 'site', type: 'module', dependencies: { react: '*', vite: '*', tailwindcss: '^4', '@base-ui/react': '^1.8.0' } },
    'src/Good.jsx': "import { Switch } from '@base-ui/react/switch';\nexport const Good = () => <Switch.Root />;\n",
    'src/Bad.jsx': "import { Switch } from '@base-ui/react/switch';\nexport const Bad = () => <Switch.Root>\n",
  }, 'libraries');
  const item = find(list, 'base-ui-react');
  assert.deepEqual(item.capabilities, { usage: 'unknown', states: 'judged', structure: 'judged', owned: 'judged' });
  assert.equal(item.support, 'partial');
  assert.match(item.skipped, /could not be read here: usage \(every primitive, part and site\)/);
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

// ---- Layer 2: Base UI states. Every declaration applied in a library state names that state: Tailwind variants on
// its data attributes, stylesheet rules with them, and className / style functions the library calls with its state.
const states = declaration => declaration.when.filter(condition => condition.kind === 'state').map(condition => condition.text);
const at = (report, line, text) => {
  const found = report.findings.flatMap(finding => (finding.occurrences ?? [finding.declaration]).map(declaration => ({ finding, declaration }))).filter(({ declaration }) => declaration.site.line === line && (text === undefined || declaration.site.text === text));
  assert.ok(found.length, `a finding at line ${line}${text ? ` for ${text}` : ''} in ${report.findings.map(finding => `${finding.declaration.site.line} ${finding.declaration.site.text}`).join(' | ')}`);
  return found.map(item => item.declaration);
};

test('Base UI states: variants, stylesheet selectors, className and style functions each name the state they apply in', async t => {
  const { project } = await detected(t, {
    'package.json': { name: 'site', type: 'module', dependencies: { react: '*', vite: '*', tailwindcss: '^4', '@base-ui/react': '^1.8.0' } },
    'src/index.css': '@import "tailwindcss";\n@theme { --spacing-s4: 1rem; --color-ink: #111; }\n.thumb[data-dragging] { padding: 13px; }\n',
    'src/Check.jsx': [
      "import './index.css';",
      "import { Checkbox } from '@base-ui/react/checkbox';",
      "import { Slider } from '@base-ui/react/slider';",
      'export const Check = ({ wide }) => (',
      '  <Checkbox.Root className="size-5 data-checked:bg-[#ff0000] data-[orientation=horizontal]:p-[7px]">',
      "    <Checkbox.Indicator className={(state) => state.checked ? 'p-[13px]' : 'p-[9px]'} />",
      "    <Checkbox.Indicator className={({ disabled, indeterminate }) => cn('m-[3px]', disabled && 'm-[5px]', indeterminate === true && 'm-[6px]')} />",
      '    <Slider.Thumb className="thumb" style={(state) => ({ padding: state.dragging ? 13 : 7 })} />',
      "    <Slider.Thumb className={(state) => { if (state.dragging) return 'p-[11px]'; return 'p-[1px]'; }} />",
      "    <div className={(state) => state.checked ? 'p-[13px]' : 'p-[9px]'} />",
      '  </Checkbox.Root>',
      ');',
      "const cn = (...parts) => parts.filter(Boolean).join(' ');",
    ].join('\n') + '\n',
  }, 'libraries');
  const report = json(await run(project, ['--json'], 0));
  assert.deepEqual(states(at(report, 5, 'data-checked:bg-[#ff0000]')[0]), ['checked']);
  assert.deepEqual(states(at(report, 5, 'data-[orientation=horizontal]:p-[7px]')[0]), ['orientation=horizontal']);
  assert.deepEqual(states(at(report, 6, 'p-[13px]')[0]), ['checked']);
  assert.deepEqual(states(at(report, 6, 'p-[9px]')[0]), ['!checked']);
  assert.deepEqual(states(at(report, 7, 'm-[5px]')[0]), ['disabled']);
  assert.deepEqual(states(at(report, 7, 'm-[6px]')[0]), ['indeterminate']);
  assert.deepEqual(at(report, 7, 'm-[3px]').map(states), [[]], 'the unconditional class has no state');
  const style = at(report, 8).filter(declaration => declaration.origin === 'inline');
  assert.deepEqual(style.map(declaration => [declaration.value, states(declaration)]), [['13px', ['dragging']], ['7px', ['!dragging']]]);
  assert.deepEqual(states(at(report, 9, 'p-[11px]')[0]), ['dragging']);
  assert.deepEqual(states(at(report, 9, 'p-[1px]')[0]), ['!dragging']);
  const sheet = report.findings.flatMap(finding => finding.occurrences ?? [finding.declaration]).find(declaration => declaration.origin === 'stylesheet' && declaration.value === '13px');
  assert.deepEqual(states(sheet), ['dragging'], 'a stylesheet rule on the attribute names the state too');
  // A plain element's className function is not a library state: the class is opaque, as before.
  assert.ok(!report.findings.some(finding => finding.declaration.site.line === 10 && finding.declaration.site.text === 'p-[13px]'));
  assert.equal(report.findings.find(finding => finding.rule === 'existence/dynamic-class' && finding.declaration.site.line === 10)?.declaration.site.text, undefined);
  // The one-line human finding names the state too; a negated state reads "not", and lines without a state are unchanged.
  const human = (await run(project, ['--all'], 0)).stdout;
  assert.match(human, /^ *! +p-\[13px\] .*Check\.jsx:6\n +off your spacing scale \(checked\)$/m, human);
  assert.match(human, /\(not checked\)/, human);
  const explain = await run(project, ['sites', 'src/Check.jsx'], 0).catch(() => null);
  if (explain) assert.match(explain.stdout, /state: checked/);
});

// ---- Layer 4: Base UI owned values. The library's runtime variables are defined by it (never a dead variable) and
// are its decision (never off a scale); its providers are shown in the usage map with nothing to judge.
test('Base UI owned values: its runtime variables are neither dead nor drift; a variable of your own still is; providers are shown', async t => {
  const { list, project } = await detected(t, {
    'package.json': { name: 'site', type: 'module', dependencies: { react: '*', vite: '*', tailwindcss: '^4', '@base-ui/react': '^1.8.0' } },
    'src/index.css': '@import "tailwindcss";\n@theme { --spacing-s4: 1rem; --color-ink: #111; }\n.indicator { left: var(--active-tab-left); width: var(--active-tab-width); }\n.mine { left: var(--my-left); }\n',
    'src/Tabs.jsx': [
      "import './index.css';",
      "import { Tabs } from '@base-ui/react/tabs';",
      "import { Tooltip } from '@base-ui/react/tooltip';",
      "import { DirectionProvider } from '@base-ui/react/direction-provider';",
      'export const T = () => (',
      '  <DirectionProvider direction="ltr"><Tooltip.Provider delay={200}>',
      '    <Tabs.Root><Tabs.List><Tabs.Tab className="w-[var(--anchor-width)] p-[calc(var(--popup-height)+13px)]">a</Tabs.Tab><Tabs.Indicator className="indicator" /></Tabs.List></Tabs.Root>',
      '  </Tooltip.Provider></DirectionProvider>',
      ');',
    ].join('\n') + '\n',
  }, 'libraries');
  const item = find(list, 'base-ui-react');
  assert.equal(item.support, 'supported');
  assert.deepEqual(item.capabilities, { usage: 'judged', states: 'judged', structure: 'judged', owned: 'judged' });
  assert.deepEqual(item.usage.sites.filter(site => site.structure === 'provider').map(site => `${site.component}${site.part ? `.${site.part}` : ''}`), ['DirectionProvider', 'Tooltip.Provider']);
  const check = await run(project, ['--json'], 0);
  assert.equal(check.stderr, '', 'a fully understood library prints no notice');
  const report = json(check);
  const dead = report.findings.filter(finding => finding.rule === 'existence/dead-var').map(finding => finding.title);
  assert.deepEqual(dead, ['`var(--my-left)` is never defined'], 'only your own undefined variable is dead');
  assert.ok(!report.findings.some(finding => finding.rule.startsWith('provenance/') && /active-tab|anchor-width/.test(finding.declaration.value)), 'the library\'s variable is not off your scale');
  const calc = report.findings.find(finding => finding.rule.startsWith('provenance/') && /popup-height/.test(finding.declaration.value));
  assert.ok(calc, 'the 13px beside the library variable is still judged');
  assert.equal(calc.declaration.owned, undefined);
  const owned = report.findings.flatMap(finding => finding.occurrences ?? [finding.declaration]).find(declaration => declaration.owned);
  assert.equal(owned, undefined, 'owned declarations are in no finding');
});

// ---- Layer 5: Radix states. `data-state` carries the value; placement attributes are valued; the rest are flags.
test('Radix states: data-state values, data-side, data-disabled and data-highlighted name the state, in variants and stylesheets', async t => {
  const { list, project } = await detected(t, {
    'package.json': { name: 'site', type: 'module', dependencies: { react: '*', vite: '*', tailwindcss: '^4', '@radix-ui/react-popover': '^1.1.0', '@radix-ui/react-checkbox': '^1.1.0' } },
    'src/index.css': '@import "tailwindcss";\n@theme { --spacing-s4: 1rem; --color-ink: #111; }\n.box[data-state="checked"] { padding: 13px; }\n.item[data-highlighted] { margin: 7px; }\n',
    'src/Pop.jsx': [
      "import './index.css';",
      "import * as Popover from '@radix-ui/react-popover';",
      "import * as Checkbox from '@radix-ui/react-checkbox';",
      'export const Pop = () => (',
      '  <Popover.Root>',
      '    <Popover.Trigger className="data-[state=open]:bg-[#ff0000] data-disabled:p-[9px]">Open</Popover.Trigger>',
      '    <Popover.Portal><Popover.Content className="data-[side=top]:p-[13px] data-[state=closed]:m-[3px]" /></Popover.Portal>',
      '    <Checkbox.Root className="box"><Checkbox.Indicator className="item" /></Checkbox.Root>',
      '  </Popover.Root>',
      ');',
    ].join('\n') + '\n',
  }, 'libraries');
  const item = find(list, 'radix');
  assert.deepEqual(item.capabilities, { usage: 'judged', states: 'judged', structure: 'judged', owned: 'judged' });
  assert.equal(item.support, 'supported');
  const report = json(await run(project, ['--json'], 0));
  assert.deepEqual(states(at(report, 6, 'data-[state=open]:bg-[#ff0000]')[0]), ['open']);
  assert.deepEqual(states(at(report, 6, 'data-disabled:p-[9px]')[0]), ['disabled']);
  assert.deepEqual(states(at(report, 7, 'data-[side=top]:p-[13px]')[0]), ['side=top']);
  assert.deepEqual(states(at(report, 7, 'data-[state=closed]:m-[3px]')[0]), ['closed']);
  const sheets = report.findings.flatMap(finding => finding.occurrences ?? [finding.declaration]).filter(declaration => declaration.origin === 'stylesheet');
  assert.deepEqual(sheets.map(declaration => [declaration.value, states(declaration)]).sort(), [['13px', ['checked']], ['7px', ['highlighted']]]);
});

// ---- Layer 7: Radix owned values. `--radix-*` variables are the primitives' own; Theme and the providers are shown.
test('Radix owned values: --radix-* variables are neither dead nor drift; Theme and Tooltip.Provider are shown as providers', async t => {
  const { list, project } = await detected(t, {
    'package.json': { name: 'site', type: 'module', dependencies: { react: '*', vite: '*', tailwindcss: '^4', '@radix-ui/react-popover': '^1.1.0', '@radix-ui/react-tooltip': '^1.1.0', '@radix-ui/themes': '^3.0.0' } },
    'src/index.css': '@import "tailwindcss";\n@theme { --spacing-s4: 1rem; --color-ink: #111; }\n.content { transform-origin: var(--radix-popover-content-transform-origin); height: var(--radix-accordion-content-height); }\n.mine { padding: var(--my-pad); }\n',
    'src/App.jsx': [
      "import './index.css';",
      "import * as Popover from '@radix-ui/react-popover';",
      "import * as Tooltip from '@radix-ui/react-tooltip';",
      "import { Theme } from '@radix-ui/themes';",
      'export const App = () => (',
      '  <Theme accentColor="indigo"><Tooltip.Provider delayDuration={300}>',
      '    <Popover.Root><Popover.Content className="content w-[var(--radix-select-trigger-width)] p-[calc(var(--radix-popover-content-available-height)-13px)]" /></Popover.Root>',
      '  </Tooltip.Provider></Theme>',
      ');',
    ].join('\n') + '\n',
  }, 'libraries');
  const item = find(list, 'radix');
  assert.equal(item.support, 'supported');
  assert.deepEqual(item.usage.sites.filter(site => site.structure === 'provider').map(site => `${site.component}${site.part ? `.${site.part}` : ''}`), ['Theme', 'Tooltip.Provider']);
  const check = await run(project, ['--json'], 0);
  assert.equal(check.stderr, '');
  const report = json(check);
  assert.deepEqual(report.findings.filter(finding => finding.rule === 'existence/dead-var').map(finding => finding.title), ['`var(--my-pad)` is never defined']);
  assert.ok(!report.findings.some(finding => finding.rule.startsWith('provenance/') && /radix-(?:popover-content-transform-origin|accordion-content-height|select-trigger-width)/.test(finding.declaration.value)));
  assert.ok(report.findings.some(finding => finding.rule.startsWith('provenance/') && /available-height\) - 13px/.test(finding.declaration.value)), 'the 13px beside the library variable is still judged');
});

// ---- Layer 8: shadcn as the system. components.json is read; components/ui are the design system; a call-site class
// that overrides a variant's (or the base's) value is drift, with cn()'s tailwind-merge semantics named.
test('shadcn system: components.json facts; a call-site class that overrides a variant or base class is drift, a margin beside it is not', async t => {
  const { cp, readdir } = await import('node:fs/promises');
  const { join } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const { fixture, installTailwind } = await import('./helpers/layouts.mjs');
  const project = await fixture(t, {});
  await cp(fileURLToPath(new URL('../fixtures/shadcn-system/', import.meta.url)), project.root, { recursive: true });
  await installTailwind(project.root);
  assert.ok((await readdir(join(project.root, 'src/components/ui'))).includes('button.tsx'));
  const state = json(await run(project, ['state', '--json']));
  const item = find(state.facts.libraries.value, 'shadcn');
  assert.equal(item.support, 'supported');
  assert.deepEqual(item.capabilities, { usage: 'judged', states: 'judged', structure: 'judged', owned: 'judged', system: 'judged' });
  assert.deepEqual(item.detail, { style: 'new-york', css: 'src/index.css', cssVariables: true, baseColor: 'neutral', iconLibrary: 'lucide', ui: '@/components/ui', utils: '@/lib/utils' });
  assert.deepEqual(item.usage.components, { Button: 1, Dialog: 1, Popover: 1, Select: 1, Tooltip: 1 });
  assert.ok(item.usage.sites.some(site => site.component === 'Dialog' && site.part === 'Trigger' && site.structure === 'render'), 'DialogTrigger asChild is a render site');
  assert.equal(state.facts.styling.value.tokens.kind, 'shadcn', '@theme inline with components.json is the token source');
  const report = json(await run(project, ['--json'], 0));
  const ownership = report.findings.filter(finding => finding.rule.startsWith('ownership/')).map(finding => `${finding.sites[0].line} ${finding.title}`).sort();
  assert.deepEqual(ownership, [
    '11 `h-[38px]` overrides Button\'s `h-9` (size = default)',
    '12 `px-7` changes Button\'s padding-inline-end', '12 `px-7` changes Button\'s padding-inline-start',
    '16 `p-[29px]` changes DialogContent\'s padding-bottom', '16 `p-[29px]` changes DialogContent\'s padding-left', '16 `p-[29px]` changes DialogContent\'s padding-right', '16 `p-[29px]` changes DialogContent\'s padding-top',
    '20 `w-96` overrides PopoverContent\'s `w-72` (base)',
    '24 `text-[11px]` changes TooltipContent\'s font-size',
    '27 `w-[180px]` overrides SelectTrigger\'s `w-fit` (base)',
  ]);
  const override = report.findings.find(finding => finding.title.includes('h-[38px]'));
  assert.match(override.because, /cn\(\) merges classes with tailwind-merge, so this call site's class wins/);
  assert.match(override.action, /Use a variant: variant = default \| destructive \| outline \| secondary \| ghost \| link; size = default \| sm \| lg \| icon/);
  assert.ok(!report.findings.some(finding => finding.rule.startsWith('ownership/') && finding.sites.some(site => site.line === 13)), 'mt-2 on a ghost Button is the caller\'s margin, not an override');
  assert.equal(await run(project, [], 0).then(result => result.stderr), '', 'no notice: the system is understood');
});
