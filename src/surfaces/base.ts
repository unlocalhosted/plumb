import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtemp, readdir, rm, stat, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Report } from '../report.js';
import type { CheckOptions } from '../index.js';
import { gitContext } from '../ledger/git.js';
import { UsageError } from '../errors.js';

/** Analyze tracked base sources in isolation, borrowing installed dependencies read-only. */
export async function baseReport(root: string, ref: string, options: Pick<CheckOptions, 'config'>) {
  const context = gitContext(root, ref);
  const temp = await mkdtemp(join(tmpdir(), 'plumb-base-'));
  try {
    const archive = execFileSync('git', ['-C', context.top, 'archive', context.commit], { maxBuffer: 256 * 1024 * 1024 });
    execFileSync('tar', ['-xf', '-', '-C', temp], { input: archive });
    async function linkModules(directory: string): Promise<void> {
      const original = resolve(context.top, relative(temp, directory));
      try { if ((await stat(join(original, 'node_modules'))).isDirectory()) await symlink(join(original, 'node_modules'), join(directory, 'node_modules'), 'dir'); }
      catch (e) { if (!['ENOENT', 'EEXIST'].includes((e as NodeJS.ErrnoException).code ?? '')) throw e; }
      for (const entry of await readdir(directory, { withFileTypes: true })) if (entry.isDirectory() && entry.name !== 'node_modules') await linkModules(join(directory, entry.name));
    }
    await linkModules(temp);
    // Fixtures/projects often resolve dependencies from an ancestor of the Git root.
    let parent = dirname(context.top);
    while (parent !== dirname(parent)) {
      try { if ((await stat(join(parent, 'node_modules'))).isDirectory()) { await symlink(join(parent, 'node_modules'), join(temp, 'node_modules'), 'dir'); break; } }
      catch (e) { if ((e as NodeJS.ErrnoException).code === 'EEXIST') break; if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; }
      parent = dirname(parent);
    }
    const config = options.config === undefined ? undefined : isAbsolute(options.config) && relative(context.top, options.config).startsWith('..') ? options.config : resolve(temp, relative(context.top, resolve(root, options.config)));
    const checked = spawnSync(process.execPath, [fileURLToPath(new URL('../cli.js', import.meta.url)),
      '--root', resolve(temp, relative(context.top, root)), '--json', ...(config === undefined ? [] : ['--config', config])],
      { encoding: 'utf8', maxBuffer: 128 * 1024 * 1024, timeout: 60000,
        env: { ...process.env, PLUMB_CACHE_DIR: process.env.PLUMB_CACHE_DIR ?? join(temp, '.plumb-cache') } });
    if (checked.error) throw checked.error;
    if (checked.status !== 0 && checked.status !== 1) throw new Error(checked.stderr || 'Base check did not complete.');
    return JSON.parse(checked.stdout) as Report;
  } catch (error) {
    throw new UsageError(`Cannot analyze --base ${ref} for coverage: ${error instanceof Error ? error.message : String(error)}`);
  } finally { await rm(temp, { recursive: true, force: true }); }
}
