import { table } from './cli-table.js';
import { readFile, stat } from 'node:fs/promises';
import { basename, relative, resolve } from 'node:path';
import { UsageError } from './errors.js';
import { projectFacts, manifestAt } from './project-facts/index.js';
import type { App } from './project-facts/index.js';

/** A shell argument, including workspace names containing spaces. */
export const shellPath = (path: string) => /^[\w./@-]+$/.test(path) ? path : "'" + path.replaceAll("'", "'\\''") + "'";

export type WorkspaceApp = App;
/** The React apps of a workspace root, or none for a single project. `workspace` says the root declares one (R1: nothing inferred). */
export async function workspaceApps(root: string): Promise<{ workspace: boolean; apps: WorkspaceApp[]; notice: string }> {
  const facts = await projectFacts(root);
  const unreadable = facts.workspace.source === 'unknown' ? facts.workspace.evidence[0] : undefined;
  if (unreadable?.file === 'package.json') throw new UsageError(`Could not read package.json at ${root}.\n  ${/not valid JSON/.test(unreadable.text) ? 'The file is not valid JSON.' : unreadable.text}\n  → plumber doctor --root ${JSON.stringify(root)}`);
  // R2: an unreadable workspace file is unknown; the folder runs as one project and the person is told once.
  const notice = unreadable ? `Could not read ${unreadable.file}:${unreadable.line} (${unreadable.text}); checking this folder as one project.\n` : '';
  return { workspace: !!facts.workspace.value, apps: facts.apps.value ?? [], notice };
}

export async function cliProject(argument?: string, allowWorkspace = false): Promise<{ root: string; notice: string; apps?: WorkspaceApp[] }> {
  const cwd = process.cwd(), start = resolve(argument ?? cwd);
  try {
    if (!(await stat(start)).isDirectory()) throw new UsageError(`--root ${argument ?? '.'}: not a folder (from ${cwd}).`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT' || (error as NodeJS.ErrnoException).code === 'ENOTDIR') {
      throw new UsageError(`--root ${argument ?? '.'}: no such folder (from ${cwd}).`);
    }
    throw error;
  }
  // R4: a --root that names a folder with package.json is an override; a refusal may not override it back.
  const override = argument !== undefined && manifestAt(start) !== undefined;
  const facts = await projectFacts(start, override ? { root: start } : {});
  const root = facts.root.value;
  if (root === null) throw new UsageError('No project here. React Plumber reads a React app: a folder with package.json.\n  → cd into your app, or: npx plumber --root path/to/app');
  const { workspace, apps, notice } = await workspaceApps(root);
  if (workspace && !override) {
    if (allowWorkspace) return { root, notice, apps };
    if (!apps.length) {
      // R7: a declared workspace with nothing under its patterns is a notice with the evidence, never "0 apps. Pick one:".
      const declared = facts.workspace.value!, where = facts.workspace.evidence[0]!;
      throw new UsageError(`Workspace (${declared.tool}${declared.patterns.length ? `, ${declared.patterns.join(', ')}` : ''}) with no React app under ${declared.patterns.length ? 'those patterns' : 'it'}: ${where.file}:${where.line}, ${where.text}.\n  → run in an app: npx plumber --root path/to/app`);
    }
    throw new UsageError(`This is a workspace with ${apps.length} ${apps.length === 1 ? 'app' : 'apps'}. Pick one:\n` +
      table(apps.map(app => [{ text: `npx plumber --root ${shellPath(app.path)}`, path: true }, `${app.kind} · ${app.tailwind ? `Tailwind ${app.tailwind}` : 'no Tailwind'}`]), [{ weight: 2 }, { weight: 1, ink: 'dim' }], { stream: process.stderr }).join('\n'));
  }
  return { root, notice: notice + (root === start ? '' : `Using the project at ${relative(start, root)} (${basename(root)}, package.json).\n`), ...(workspace ? { apps } : {}) };
}

/** Fail setup before analysis creates caches or adoption writes any files. */
export async function prepareCliAnalysis(root: string, configPath?: string, snippet = false): Promise<string> {
  const { loadConfig } = await import('./config.js');
  const { discoverProject, projectSourceFiles, defaultSource } = await import('./project.js');
  const { tailwindSetupProblem, checkingPlainCss, tailwindAdvisory, packageManager } = await import('./setup-messages.js');
  const loaded = await loadConfig(root, configPath);
  const project = await discoverProject(root, loaded.value);
  const problem = await tailwindSetupProblem(root, project.tailwind.entry, project.tailwind.version);
  if (problem) throw new UsageError(problem);
  const files = (await projectSourceFiles(root, loaded.value)).filter(file => /\.(?:[jt]sx?|css)$/.test(file));
  if (!snippet) {
    let read = false;
    for (const file of files) {
      try { await readFile(file); read = true; break; } catch { /* Try the next source before declaring no readable inputs. */ }
    }
    if (!read) {
      const patterns = loaded.value.source ?? defaultSource;
      const source = patterns.join(', ') || '(empty source list)';
      const folder = patterns.length === 1 ? patterns[0]!.split(/[?*{[]/, 1)[0] || '.' : root;
      throw new UsageError(`Found no .tsx, .jsx or .css files under ${folder}. Is this the right folder?\n` +
        `  Looked in: ${source} (${loaded.path ? `from ${basename(loaded.path)} \u0060source\u0060` : 'default source globs'})\n  → change \u0060source\u0060, or run in your app's folder`);
    }
  }
  if (!snippet && await checkingPlainCss(root, project.tailwind.entry)) {
    const { collectClasses } = await import('./collect/classes.js');
    const collected = await collectClasses(files.filter(file => /\.[jt]sx?$/.test(file)), loaded.value.classHelpers);
    return tailwindAdvisory(collected.sites, packageManager(root));
  }
  return '';
}
