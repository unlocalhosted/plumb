import { relative, resolve } from 'node:path';
import { UsageError } from '../errors.js';
import { cliProject, shellPath } from '../cli-project.js';
import { manifestAt, projectFacts } from '../project-facts/index.js';
import { readiness } from '../readiness/index.js';
import type { ReadinessReport } from '../readiness/index.js';
import { count } from '../messages.js';

/**
 * Gates: a step checks only what it needs. When it can go on it says nothing; when it can't, it says what's wrong in
 * one line and the fix in the next, and stops (docs/design/onboarding.md, "When a check can't pass"). The checks are
 * the doctor's: the project facts and the setup rows in src/readiness, not a second copy of them.
 */
const noReact = () => new UsageError("No React here. Plumber reads React apps.\n  → Run it from your app's folder, or pass --root apps/web.");

/** The folder `npx plumber` works on, or the gate that says why there isn't one: no React here, or several apps to pick from. */
export async function chooseProject(argument: string | undefined): Promise<{ root: string; notice: string }> {
  // no package.json above here: there is no app to read
  const start = resolve(argument ?? process.cwd());
  if (argument === undefined && (await projectFacts(start)).root.value === null) throw noReact();
  const project = await cliProject(argument, true);
  // R4: a --root that names a folder with package.json is the person's choice; a workspace around it doesn't override it
  const chosen = argument !== undefined && manifestAt(resolve(argument)) !== undefined;
  if (project.apps && !chosen) {
    if (!project.apps.length) throw noReact();
    const names = project.apps.map(app => app.path);
    throw new UsageError(`Found ${count(names.length, 'app')}: ${names.join(', ')}.\n  → Run npx plumber --root ${shellPath(names[0]!)}${names.length > 1 ? ' (or the one you mean)' : ''}.`);
  }
  return project;
}

/**
 * The gates on a project that was chosen. `setup`: this run could write into the dev config (the page offers it, `--yes`
 * does it), so a dev config with changes that aren't committed stops it: the person would commit our lines with theirs.
 */
export async function projectGates(root: string, config: string | undefined, setup: boolean): Promise<ReadinessReport> {
  const ready = await readiness({ root, ...(config === undefined ? {} : { config }), noReport: true });
  // neither installed nor declared: a declared react that isn't installed yet is the setup rows' to say
  const react = ready.project.react.value;
  if (react && !react.installed && !react.declared) throw noReact();
  if (!setup) return ready;
  const plugin = ready.requirements.find(item => item.id === 'locate.plugin');
  // a project outside Git has no commit to compare with; only a repo can have changes that aren't committed
  if (plugin?.fix?.kind === 'diff' && plugin.fix.dirty && ready.project.repo.value) {
    throw new UsageError(`${relative(root, resolve(root, plugin.fix.file)) || plugin.fix.file} has changes you haven't committed.\n  → Commit or stash them, then run npx plumber again.`);
  }
  return ready;
}
