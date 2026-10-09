import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { UsageError } from '../errors.js';

const command = 'plumb check --changed --agent --strict-ledger';
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
interface Plan { file: string; before: string; after: string }
async function plan(root: string, name: string, event: string, entry: object, cursor = false, checkCommand = command): Promise<Plan> {
  const file = resolve(root, name);
  let before = '';
  try { before = await readFile(file, 'utf8'); } catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; }
  let settings: unknown;
  try { settings = before ? JSON.parse(before) : {}; } catch { throw new UsageError(`Invalid JSON in ${name}; no hook settings changed.`); }
  if (!object(settings) || (settings.hooks !== undefined && !object(settings.hooks))) throw new UsageError(`Expected object settings/hooks in ${name}; no hook settings changed.`);
  if (cursor && settings.version !== undefined && settings.version !== 1) throw new UsageError(`Unsupported Cursor hook version in ${name}; no hook settings changed.`);
  const hooks = settings.hooks as Record<string, unknown> | undefined ?? {};
  const existing = hooks[event] ?? [];
  if (!Array.isArray(existing)) throw new UsageError(`Expected hooks.${event} array in ${name}; no hook settings changed.`);
  const equivalent = (item: unknown) => {
    if (!object(item)) return false;
    if (cursor) return item.command === checkCommand;
    return item.matcher === 'Edit|Write|MultiEdit' && Array.isArray(item.hooks) && item.hooks.some(h => object(h) && h.type === 'command' && h.command === checkCommand);
  };
  if (existing.some(equivalent)) return { file, before, after: before };
  if (cursor) settings.version = 1;
  settings.hooks = { ...hooks, [event]: [...existing, entry] };
  return { file, before, after: JSON.stringify(settings, null, 2) + '\n' };
}
export async function installHooks(root: string, agents: ('claude' | 'cursor')[] = ['claude', 'cursor'], project?: string): Promise<string> {
  const checkCommand = project === undefined ? command : `${command} --root '${project.replaceAll("'", "'\\''")}'`;
  // Validate every target before writing either. Unknown settings and hooks survive.
  const plans = [];
  if (agents.includes('claude')) plans.push(await plan(root, '.claude/settings.json', 'PostToolUse', { matcher: 'Edit|Write|MultiEdit', hooks: [{ type: 'command', command: checkCommand }] }, false, checkCommand));
  if (agents.includes('cursor')) plans.push(await plan(root, '.cursor/hooks.json', 'afterFileEdit', { command: checkCommand }, true, checkCommand));
  const output: string[] = [];
  for (const { file, before, after } of plans) {
    if (after === before) { output.push(`${file}: unchanged.`); continue; }
    await mkdir(dirname(file), { recursive: true });
    const temp = `${file}.plumb-${process.pid}.tmp`;
    await writeFile(temp, after, { flag: 'wx' });
    await rename(temp, file);
    output.push(`--- ${file}\n+++ ${file}\n@@ settings before / after @@\n` + before.trimEnd().split('\n').filter(Boolean).map(line => `-${line}`).join('\n') + '\n' + after.trimEnd().split('\n').map(line => `+${line}`).join('\n'));
  }
  return output.join('\n\n') + '\n';
}
