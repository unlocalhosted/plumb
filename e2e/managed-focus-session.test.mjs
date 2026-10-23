import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { Session } from '../dist/session/index.js';

test('managed focus survives warm reports, local reads and source changes in the live Session', async t => {
  const repo = fileURLToPath(new URL('../', import.meta.url));
  const root = await mkdtemp(join(repo, 'fixtures/.managed-focus-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'fixtures/relay-habits'), root, { recursive: true });
  const source = `import * as Dialog from '@radix-ui/react-dialog';
import { Command } from 'cmdk';
export const Managed = () => <>
  <div tabIndex={-1} className="outline-none" />
  <Dialog.Content className="outline-none" />
  <Command.Input autoFocus className="outline-none" />
  <input className="focus:outline-none" />
</>;
`;
  const file = join(root, 'src/Managed.jsx');
  await writeFile(file, source);
  const session = await Session.create({ root, watch: false });
  t.after(() => session.close());
  const focus = report => report.findings.filter(f => f.rule === 'habits/focus-outline').flatMap(f => f.sites).filter(s => s.file === file).map(s => s.line).sort((a, b) => a - b);
  assert.deepEqual(focus(await session.report()), [7]);
  await writeFile(join(root, 'src/Drift.jsx'), await readFile(join(root, 'src/Drift.jsx'), 'utf8') + '\n');
  await session.refresh();
  assert.deepEqual(focus(await session.report()), [7], 'unrelated save preserves all managed focus evidence');
  for (const line of [4, 5, 6]) assert.deepEqual(focus(await session.site('src/Managed.jsx', line)), []);
  await writeFile(file, source.replace('tabIndex={-1}', 'tabIndex={0}').replace('<Dialog.Content ', '<Dialog.Content tabIndex={0} ').replace('autoFocus ', 'autoFocus={false} '));
  await session.refresh();
  assert.deepEqual(focus(await session.report()), [4, 5, 6, 7], 'keyboard targets and ordinary text fields still report after source changes');
  await writeFile(file, source);
  await session.refresh();
  assert.deepEqual(focus(await session.report()), [7], 'restoring managed focus clears those findings');
});
