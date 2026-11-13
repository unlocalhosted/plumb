// The two real apps, read only. Each is frozen into a scratch copy with bench/apps/frozen.mjs (git-visible files,
// uncommitted edits included), served from the copy by bench/apps/verify.mjs --serve under bench/apps/readonly.mjs's
// write guard, and the originals are fingerprinted before and after.
import { join } from 'node:path';
import { freezeApp } from '../apps/frozen.mjs';
import { repo, spawnHost } from './lib.mjs';

export const workspace = process.env.PLUMB_WORKSPACE ?? '/Users/vijaysingh/unlocalhosted';
export const appDefs = {
  algorecall: { name: 'algorecall', app: join(workspace, 'algorecall'), root: join(workspace, 'algorecall'), config: join(repo, 'bench/apps/algorecall.plumber.config.ts'), pages: ['/'], depsInProject: true },
  craftingattention: { name: 'craftingattention', app: join(workspace, 'craftingattention/app'), root: join(workspace, 'craftingattention/app'), pages: ['/'] },
};

export async function freeze(name, scratch) {
  const frozen = await freezeApp({ ...appDefs[name], ignoredInputs: [] }, scratch);
  return frozen;
}

// Starts the frozen app's Vite server (stamped or not) and releases React Plumber's startup gate at once.
export async function startApp(app, scratch, { stamp }) {
  const env = {
    PLUMB_WORKSPACE: workspace, PLUMB_VERIFY_APP: JSON.stringify(app), PLUMB_VERIFY_SCRATCH: scratch, PLUMB_VERIFY_NO_ORACLE: '1',
    PLUMB_VERIFY_STAMP: stamp ? '1' : '0', TMPDIR: scratch, XDG_CACHE_HOME: join(scratch, 'xdg-cache'), XDG_CONFIG_HOME: join(scratch, 'xdg-config'),
    PLUMB_CACHE_DIR: join(scratch, 'plumb'), WRANGLER_LOG_PATH: join(scratch, 'wrangler.log'), WRANGLER_SEND_METRICS: 'false',
  };
  const host = await spawnHost({
    file: join(repo, 'bench/apps/verify.mjs'), args: ['--serve', JSON.stringify(app), scratch],
    execArgv: ['--import', join(repo, 'bench/apps/readonly.mjs')], cwd: app.app, env, label: app.name, timeoutMs: 240_000,
  });
  host.child.send({ type: 'release' });
  return host;
}
