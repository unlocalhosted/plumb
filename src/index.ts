import { stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { loadConfig } from './config.js';
import { errorMessage, UsageError } from './errors.js';
import { discoverProject } from './project.js';
import { tool } from './report.js';
import type { Report } from './report.js';

export { defineConfig } from './config.js';
export type { PlumbConfig, DecisionSource, ComponentContract, CustomHabit } from './config.js';
export type { Report, Finding, Declaration, Decision, Site, Condition, Family, FamilyCoverage } from './report.js';

export interface CheckOptions {
  root?: string;
  config?: string;
}

export async function check(options: CheckOptions = {}): Promise<Report> {
  const start = performance.now();
  const root = resolve(options.root ?? process.cwd());
  try {
    if (!(await stat(root)).isDirectory()) throw new Error('expected a directory');
  } catch (error) {
    throw new UsageError(`Set --root to an existing project directory: ${root}: ${errorMessage(error)}`);
  }
  const config = await loadConfig(root, options.config);
  const discoverStart = performance.now();
  let project: Awaited<ReturnType<typeof discoverProject>>;
  try {
    project = await discoverProject(root, config.value);
  } catch (error) {
    if (error instanceof UsageError) throw error;
    throw new UsageError(`Fix project files under ${root}: ${errorMessage(error)}`);
  }
  const discover = performance.now() - discoverStart;
  return {
    schemaVersion: 1,
    tool,
    root,
    config: { path: config.path, inferred: config.path === null },
    ...project,
    findings: [],
    coverage: {},
    timing: { totalMs: performance.now() - start, phases: { discover } },
  };
}
