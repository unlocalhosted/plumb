#!/usr/bin/env node
// One full four-app run; mutate only a disposable clone of MetalUI, never the real repositories.
import fs from 'node:fs/promises';
import { fork, execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { freezeApp, git } from './frozen.mjs';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const temporary = join(repo, 'fixtures/.verify-frozen');
await fs.mkdir(temporary, { recursive: true });
const scratch = await fs.mkdtemp(join(temporary, 'proof-'));
const original = resolve(repo, '../metalui');
const evidence = { startedAt: new Date().toISOString(), actualOriginal: original, mutations: [] };
let timer, child;
try {
  const frozen = await freezeApp({ name: 'metalui', root: original, app: join(original, 'apps/docs') }, join(scratch, 'bootstrap'));
  evidence.bootstrap = frozen.snapshot;
  const source = frozen.app.root;
  const metadata = join(scratch, 'metadata');
  execFileSync('git', ['clone', '--quiet', '--bare', '--depth', '2', 'file://' + original, metadata]);
  await fs.rename(metadata, join(source, '.git'));
  git(source, 'config', '--local', 'core.bare', 'false');
  git(source, 'read-tree', 'HEAD');
  evidence.scratchOriginal = source;
  const tracked = 'apps/docs/src/pages/Landing.tsx';
  const file = join(source, tracked);
  let tail = Promise.resolve();
  child = fork(join(repo, 'bench/apps/verify.mjs'), [], {
    cwd: repo, env: { ...process.env, TMPDIR: scratch, PLUMB_VERIFY_APP_ROOTS: JSON.stringify({ metalui: source }) },
    stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
  });
  child.on('message', event => {
    if (event.type !== 'snapshot' || event.app !== 'metalui') return;
    evidence.snapshot = event.snapshot;
    // Change an already-tracked, rendered source repeatedly after the verifier's copy is sealed.
    timer = setInterval(() => {
      tail = tail.then(async () => {
        await fs.appendFile(file, '\n// scratch original changed during frozen verification\n');
        evidence.mutations.push({ at: new Date().toISOString(), file: tracked });
      });
    }, 1000);
    evidence.headBefore = git(source, 'rev-parse', 'HEAD').trim();
    const parent = git(source, 'rev-parse', 'HEAD^').trim();
    git(source, 'update-ref', 'HEAD', parent); // existing commit only; no commits created
    evidence.headAfter = parent;
  });
  const { code, signal } = await new Promise(resolveExit => child.once('exit', (code, signal) => resolveExit({ code, signal })));
  clearInterval(timer); await tail;
  evidence.exitCode = code; evidence.signal = signal; evidence.finishedAt = new Date().toISOString();
  if (!evidence.mutations.length || evidence.headBefore === evidence.headAfter) throw new Error('Proof did not mutate the scratch original');
  const report = JSON.parse(await fs.readFile(join(repo, 'docs/verification/verify.metalui.json'), 'utf8'));
  if (!report.snapshot?.unchanged || !report.snapshot?.repositories[0]?.originalMoved) throw new Error('Frozen integrity / original HEAD movement was not recorded');
  evidence.frozenUnchanged = report.snapshot.unchanged;
  evidence.originalMovementInformational = report.status === 'passed' && report.notes.some(note => note.includes('original moved on'));
  process.exitCode = code ?? 1;
} finally {
  clearInterval(timer);
  if (child && child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
  await fs.rm(scratch, { recursive: true, force: true });
  evidence.scratchRemoved = true;
  await fs.mkdir(join(repo, 'docs/verification'), { recursive: true });
  await fs.writeFile(join(repo, 'docs/verification/verify-frozen.proof.json'), JSON.stringify(evidence, null, 2) + '\n');
}
