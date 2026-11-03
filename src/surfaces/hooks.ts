import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import MagicString from 'magic-string';
import { parseSync } from 'oxc-parser';
import type { Node } from 'oxc-parser';
import { diff } from '../adoption/overlay.js';
import { UsageError } from '../errors.js';
import { packageManagerOf } from '../project-facts/index.js';

const check = 'plumber check --changed --agent --strict-ledger';
// A hook runs in a plain shell: node_modules/.bin is not on its PATH. npx (it ships with Node) runs the project's own
// plumber from there and never downloads one; `pnpm exec` refuses in a workspace file with no packages. Yarn's
// Plug'n'Play has no node_modules, so yarn runs it there.
const runners = { npm: 'npx --no-install', pnpm: 'npx --no-install', yarn: 'yarn', bun: 'npx --no-install', deno: 'npx --no-install' } as const;
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
interface Plan { file: string; root: string; before: string; after: string }

type Expression = Extract<Node, { type: 'ObjectExpression' | 'ArrayExpression' | 'Literal' }>;
type Property = import('@oxc-project/types').ObjectProperty;
/** The settings file as written, edited in place: what is already there keeps its formatting, and only the new entry
 * (or the command of an older plumber hook) is written in. */
class Settings {
  readonly text: MagicString;
  readonly root: Extract<Node, { type: 'ObjectExpression' }>;
  constructor(readonly source: string, name: string) {
    this.text = new MagicString(source);
    // JSON is an expression: parse it as one, then every offset is one less in the file
    const parsed = parseSync('settings.js', `(${source})`);
    const statement = parsed.program.body[0];
    const value = statement?.type === 'ExpressionStatement' ? (statement.expression.type === 'ParenthesizedExpression' ? statement.expression.expression : statement.expression) : undefined;
    if (parsed.errors.length || value?.type !== 'ObjectExpression') throw new UsageError(`Invalid JSON in ${name}; no hook settings changed.`);
    this.root = value;
  }
  at(node: { start: number; end: number }) { return { start: node.start - 1, end: node.end - 1 }; }
  property(node: Extract<Node, { type: 'ObjectExpression' }>, key: string): Property | undefined {
    return node.properties.find((p): p is Property => p.type === 'Property' && p.key.type === 'Literal' && p.key.value === key);
  }
  // the indentation of the line a node starts on, and one step deeper
  indent(at: number): string { const line = this.source.slice(this.source.lastIndexOf('\n', at - 1) + 1, at); return /^\s*/.exec(line)![0]; }
  step(): string { return /\n([ \t]+)"/.exec(this.source)?.[1] ?? '  '; }
  /** Add `"key": value` as the last member of an object, or `value` as the last element of an array. */
  append(into: Expression, entry: string, value: unknown): void {
    const items = into.type === 'ObjectExpression' ? into.properties : into.type === 'ArrayExpression' ? into.elements : [];
    const { start, end } = this.at(into), last = items.at(-1);
    // a container written across lines gets the new member on a line of its own, at its siblings' indentation
    const multiline = this.source.slice(start, end).includes('\n');
    const json = (indent: string) => JSON.stringify(value, null, multiline ? this.step() : undefined).replaceAll('\n', '\n' + indent);
    if (last) {
      const lastEnd = this.at(last as { start: number; end: number }).end;
      if (multiline) { const indent = this.indent(this.at(last as { start: number; end: number }).start); this.text.appendLeft(lastEnd, `,\n${indent}${entry}${json(indent)}`); }
      else this.text.appendLeft(lastEnd, `, ${entry}${json('')}`);
      return;
    }
    if (multiline) { const outer = this.indent(start), indent = outer + this.step(); this.text.overwrite(start, end, `${this.source[start]}\n${indent}${entry}${json(indent)}\n${outer}${this.source[end - 1]}`); }
    else this.text.overwrite(start, end, `${this.source[start]}${entry}${json('')}${this.source[end - 1]}`);
  }
}

async function plan(root: string, name: string, event: string, entry: { matcher?: string; hooks?: { type: string; command: string }[]; command?: string }, cursor: boolean, command: string): Promise<Plan> {
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
  // a plumber hook already there, written with this command or an older one (a bare `plumber check …`)
  const ours = (value: unknown) => typeof value === 'string' && value.endsWith(command.slice(command.indexOf(check)));
  const commands = (item: unknown): unknown[] => !object(item) ? [] : cursor ? [item.command] : item.matcher === 'Edit|Write|MultiEdit' && Array.isArray(item.hooks) ? item.hooks.map(h => object(h) && h.type === 'command' ? h.command : undefined) : [];
  if (existing.some(item => commands(item).includes(command))) return { file, root, before, after: before };
  if (!before.trim()) {
    const fresh: Record<string, unknown> = cursor ? { version: 1 } : {};
    fresh.hooks = { [event]: [entry] };
    return { file, root, before, after: JSON.stringify(fresh, null, 2) + '\n' };
  }
  const edit = new Settings(before, name);
  const older = existing.findIndex(item => commands(item).some(ours));
  const hooksNode = edit.property(edit.root, 'hooks')?.value;
  const eventNode = hooksNode?.type === 'ObjectExpression' ? edit.property(hooksNode, event)?.value : undefined;
  if (older >= 0 && eventNode?.type === 'ArrayExpression') {
    // the older command is replaced where it is written
    const item = eventNode.elements[older];
    const literals: Node[] = [];
    const visit = (node: Node | null | undefined): void => {
      if (!node) return;
      if (node.type === 'Literal' && ours(node.value)) literals.push(node);
      else if (node.type === 'ObjectExpression') { for (const p of node.properties) if (p.type === 'Property') visit(p.value); }
      else if (node.type === 'ArrayExpression') { for (const e of node.elements) visit(e as Node); }
    };
    visit(item as Node);
    for (const literal of literals) { const { start, end } = edit.at(literal); edit.text.overwrite(start, end, JSON.stringify(command)); }
  } else {
    if (cursor && settings.version === undefined) edit.append(edit.root, '"version": ', 1);
    if (hooksNode?.type !== 'ObjectExpression') edit.append(edit.root, '"hooks": ', { [event]: [entry] });
    else if (eventNode?.type !== 'ArrayExpression') edit.append(hooksNode, `${JSON.stringify(event)}: `, [entry]);
    else edit.append(eventNode, '', entry);
  }
  const after = edit.text.toString();
  try { JSON.parse(after); } catch { throw new UsageError(`Could not add the hook to ${name} without rewriting it; no hook settings changed.`); }
  return { file, root, before, after };
}
export async function planHooks(root: string, agents: ('claude' | 'cursor')[] = ['claude', 'cursor'], project?: string): Promise<Plan[]> {
  const runner = runners[packageManagerOf(root).value ?? 'npm'];
  const base = `${runner} ${check}`;
  const command = project === undefined ? base : `${base} --root '${project.replaceAll("'", "'\\''")}'`;
  // Validate every target before writing either. Unknown settings and hooks survive.
  const plans = [];
  if (agents.includes('claude')) plans.push(await plan(root, '.claude/settings.json', 'PostToolUse', { matcher: 'Edit|Write|MultiEdit', hooks: [{ type: 'command', command }] }, false, command));
  if (agents.includes('cursor')) plans.push(await plan(root, '.cursor/hooks.json', 'afterFileEdit', { command }, true, command));
  return plans;
}
/** Write each changed settings file and say what changed, as a diff of the changed lines with paths from `shown`. */
export async function writeHooks(plans: Plan[], list = false, shown?: string): Promise<string> {
  const output: string[] = [];
  for (const { file, root, before, after } of plans) {
    const name = relative(shown ?? root, file).replaceAll('\\', '/');
    if (list) { output.push(`Would write ${name}.`); continue; }
    if (after === before) { output.push(`Kept ${name}.`); continue; }
    await mkdir(dirname(file), { recursive: true });
    const temp = `${file}.plumb-${process.pid}.tmp`;
    await writeFile(temp, after, { flag: 'wx' });
    await rename(temp, file);
    output.push(diff({ file, before: before || undefined, after }, shown ?? root) + `Wrote ${name}.`);
  }
  return output.join('\n\n') + '\n';
}

export async function installHooks(root: string, agents: ('claude' | 'cursor')[] = ['claude', 'cursor'], project?: string, list = false): Promise<string> {
  return writeHooks(await planHooks(root, agents, project), list);
}
