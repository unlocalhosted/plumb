import { existsSync } from 'node:fs';
import { readFile, realpath, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, dirname, relative, resolve } from 'node:path';
import { glob } from 'tinyglobby';
import { UsageError, userMessage } from './errors.js';
import { packageMetadata, resolvedTailwind } from './setup-messages.js';
import { ignore } from './project.js';

/** A shell argument, including workspace names containing spaces. */
export const shellPath = (path: string) => /^[\w./@-]+$/.test(path) ? path : "'" + path.replaceAll("'", "'\\''") + "'";

export async function cliProject(argument?: string): Promise<{ root: string; notice: string }> {
  const cwd = process.cwd(), start = resolve(argument ?? cwd);
  try {
    if (!(await stat(start)).isDirectory()) throw new UsageError(`--root ${argument ?? '.'}: not a folder (from ${cwd}).`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT' || (error as NodeJS.ErrnoException).code === 'ENOTDIR') {
      throw new UsageError(`--root ${argument ?? '.'}: no such folder (from ${cwd}).`);
    }
    throw error;
  }
  let root = start;
  const home = await realpath(homedir()).catch(() => homedir());
  while (!existsSync(resolve(root, 'package.json'))) {
    // A home directory is a boundary even when HOME belongs to another user.
    if (root === home || root === homedir() || dirname(root) === root || /^(?:\/Users|\/home)\/[^/]+$/.test(root)) {
      throw new UsageError('No project here. React Plumber reads a React app: a folder with package.json.\n  → cd into your app, or: npx plumber --root path/to/app');
    }
    root = dirname(root);
  }
  const metadata = await packageMetadata(root);
  let patterns: string[] = [];
  const workspaces = metadata.workspaces;
  if (Array.isArray(workspaces)) patterns = workspaces.filter((item): item is string => typeof item === 'string');
  else if (workspaces && typeof workspaces === 'object' && 'packages' in workspaces && Array.isArray(workspaces.packages)) {
    patterns = workspaces.packages.filter((item): item is string => typeof item === 'string');
  }
  const pnpm = resolve(root, 'pnpm-workspace.yaml');
  if (existsSync(pnpm)) {
    try {
      const yaml = await readFile(pnpm, 'utf8');
      const block = /^packages:\s*\n((?:[ \t]+[^\n]*\n?)*)/m.exec(yaml)?.[1] ?? '';
      patterns.push(...[...block.matchAll(/^\s*-\s*['"]?([^'"\s#]+)['"]?\s*(?:#.*)?$/gm)].map(match => match[1]!));
      const inline = /^packages:\s*\[([^\]]*)\]/m.exec(yaml)?.[1];
      if (inline) patterns.push(...inline.split(',').map(item => item.trim().replace(/^['"]|['"]$/g, '')));
    } catch (error) { throw new UsageError(`Could not read pnpm-workspace.yaml: ${userMessage(error)}\n  → \${EDITOR:-vi} pnpm-workspace.yaml`); }
  }
  const explicit = workspaces !== undefined || existsSync(pnpm);
  const selectors = patterns.length ? patterns.map(pattern => `${pattern.replace(/\/$/, '')}/package.json`) :
    explicit ? ['**/package.json'] : ['*/package.json', '*/*/package.json'];
  const manifests = await glob(selectors, { cwd: root, ignore, absolute: true, followSymbolicLinks: false });
  const apps: { path: string; kind: string; tailwind: string | null }[] = [];
  for (const file of manifests.sort()) {
    if (file === resolve(root, 'package.json')) continue;
    const folder = dirname(file), child = await packageMetadata(folder);
    const dependencies = { ...child.dependencies, ...child.devDependencies, ...child.peerDependencies };
    if (!dependencies.react && !dependencies.next) continue;
    // Do not list a nested package twice when its parent already owns an app.
    if (apps.some(app => relative(root, folder).startsWith(app.path + '/'))) continue;
    const version = await resolvedTailwind(folder);
    const declared = dependencies.tailwindcss?.match(/\d+/)?.[0];
    apps.push({ path: relative(root, folder), kind: dependencies.next ? 'Next.js' : dependencies.vite ? 'Vite' : 'library', tailwind: version?.split('.')[0] ?? declared ?? null });
  }
  if (explicit || apps.length > 1) {
    throw new UsageError(`This is a workspace with ${apps.length} ${apps.length === 1 ? 'app' : 'apps'}. Pick one:\n` +
      (apps.length ? apps.map(app => `  npx plumber --root ${shellPath(app.path)}    ${app.kind} · ${app.tailwind ? `Tailwind ${app.tailwind}` : 'no Tailwind'}`).join('\n') :
        '  → npx plumber --root path/to/app'));
  }
  return { root, notice: root === start ? '' : `Using the project at ${relative(start, root)} (${basename(root)}, package.json).\n` };
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
