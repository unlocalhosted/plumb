#!/usr/bin/env node
// @ts-check
// `sm`: the state oracle's command line (spec section 5). All answers are sorted JSON on stdout.
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { UsageError, findRoot, loadConfig, discover, withMachines, includeMatcher, relPath } from './config.mjs';
import { finish, sortFindings, cmp } from './findings.mjs';

const VALUE_FLAGS = new Set(['--root', '--baseline', '--changed-since']);
const BOOL_FLAGS = new Set(['--no-cache', '--no-log', '--advice', '--staged', '--allow-growth']);
const COMMANDS = ['list', 'show', 'on', 'paths', 'gaps', 'check'];

/** @param {string[]} argv */
function parseArgs(argv) {
  /** @type {string[]} */
  const positional = [];
  /** @type {Record<string, string | boolean>} */
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { positional.push(a); continue; }
    const eq = a.indexOf('=');
    const name = eq === -1 ? a : a.slice(0, eq);
    if (VALUE_FLAGS.has(name)) {
      const value = eq === -1 ? argv[++i] : a.slice(eq + 1);
      if (value === undefined) throw new UsageError('bad-flag', `${name} needs a value.`);
      flags[name.slice(2)] = value;
    } else if (BOOL_FLAGS.has(name) && eq === -1) flags[name.slice(2)] = true;
    else throw new UsageError('bad-flag', `Unknown flag ${a}.`);
  }
  return { positional, flags };
}

/** JSON with keys sorted at every level, 2-space indented, trailing newline. @param {unknown} value */
export function render(value) {
  return JSON.stringify(value, (_, v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort(cmp).map(k => [k, v[k]])) : v), 2) + '\n';
}

/** @param {unknown} value */
function emit(value) {
  process.stdout.write(render(value));
}

/** Every machine in `include`, with format findings per file. @param {string} root @param {{ include: string[], exclude: string[] }} config */
async function loadMachines(root, config) {
  const { analyzeFile } = await import('./analyze.mjs');
  const files = await discover(root, config);
  /** @type {import('./machine.mjs').Machine[]} */
  const machines = [];
  /** @type {Map<string, any[]>} */
  const invalid = new Map();
  for (const { file, text } of withMachines(root, files)) {
    const result = await analyzeFile(file, text);
    machines.push(...result.machines);
    const format = result.findings.filter(f => f.rule.startsWith('sm/machine-') || f.rule === 'sm/parse');
    if (format.length) invalid.set(file, finish(format));
  }
  duplicateIds(machines, invalid);
  machines.sort((a, b) => cmp(a.id, b.id) || cmp(a.file, b.file) || a.line - b.line);
  return { machines, invalid };
}

/** `sm/machine-id-duplicate` across files (whole-repo runs only). @param {import('./machine.mjs').Machine[]} machines @param {Map<string, any[]>} invalid */
function duplicateIds(machines, invalid) {
  /** @type {Map<string, import('./machine.mjs').Machine[]>} */
  const groups = new Map();
  for (const m of machines) if (m.canonical) groups.set(m.id, [...(groups.get(m.id) ?? []), m]);
  for (const [id, list] of groups) {
    if (list.length < 2) continue;
    for (const m of list) {
      const other = list.find(o => o !== m) ?? m;
      const f = {
        rule: 'sm/machine-id-duplicate', level: 'error', file: m.file, line: m.line, column: 1, endLine: m.line, endColumn: 1, machine: id,
        key: `sm/machine-id-duplicate|${m.file}|machine:${id}|${id}|1`, message: `Machine id \`${id}\` is also declared in ${other.file}.`, fix: 'Give one of them a new id.',
      };
      invalid.set(m.file, sortFindings([...(invalid.get(m.file) ?? []), f]));
      m.canonical = null;
    }
  }
}

/** @param {import('./machine.mjs').Machine[]} machines @param {string} id */
function machineById(machines, id) {
  const valid = machines.filter(m => m.canonical);
  const m = valid.find(m => m.id === id);
  if (!m) throw new UsageError('unknown-machine', `No machine \`${id}\`. Machines: ${valid.map(m => m.id).join(', ') || '(none)'}.`);
  return m;
}

/** @param {import('./machine.mjs').Canonical} c @param {string} state */
function requireState(c, state) {
  if (!c.states.some(s => s.name === state)) throw new UsageError('unknown-state', `\`${c.id}\` has no state \`${state}\`. States: ${c.states.map(s => s.name).join(', ')}.`);
}

/** @param {string[]} argv */
async function main(argv) {
  const { positional, flags } = parseArgs(argv);
  const [command, ...args] = positional;
  if (!command || !COMMANDS.includes(command)) throw new UsageError('unknown-command', `Unknown command \`${command ?? ''}\`. Commands: ${COMMANDS.join(', ')}.`);
  const cwd = process.cwd();
  const root = findRoot(cwd, typeof flags.root === 'string' ? flags.root : undefined);
  const config = loadConfig(root);
  const { summary, on, paths } = await import('./graph.mjs');

  if (command === 'list') {
    const { machines, invalid } = await loadMachines(root, config);
    emit({
      command, schema: 1,
      machines: machines.filter(m => m.canonical).map(m => ({ ...summary(/** @type {any} */ (m.canonical)), file: m.file, line: m.line })),
      invalid: [...invalid].sort((a, b) => cmp(a[0], b[0])).map(([file, findings]) => ({ file, findings })),
    });
    return 0;
  }
  if (command === 'show' || command === 'on' || command === 'paths' || command === 'gaps') {
    const { machines } = await loadMachines(root, config);
    if (command === 'gaps') {
      const { graphFindings } = await import('./graph.mjs');
      const { lineTable } = await import('./parse.mjs');
      let targets = machines.filter(m => m.canonical);
      if (args[0]) targets = [machineById(machines, args[0])];
      /** @type {any[]} */
      const findings = [];
      for (const m of targets) findings.push(...finish(graphFindings(m.file, lineTable(readFileSync(join(root, m.file), 'utf8')), m)));
      emit({ command, findings: sortFindings(findings), schema: 1 });
      return findings.length ? 1 : 0;
    }
    if (!args[0]) throw new UsageError('unknown-machine', `\`${command}\` needs a machine id. Machines: ${machines.filter(m => m.canonical).map(m => m.id).join(', ') || '(none)'}.`);
    const m = machineById(machines, args[0]);
    const c = /** @type {import('./machine.mjs').Canonical} */ (m.canonical);
    if (command === 'show') { emit({ command, machine: { ...c, file: m.file, line: m.line }, schema: 1 }); return 0; }
    if (!args[1]) throw new UsageError('unknown-state', `\`${command}\` needs a state. States: ${c.states.map(s => s.name).join(', ')}.`);
    requireState(c, args[1]);
    if (command === 'on') {
      if (args[2] === undefined) throw new UsageError('bad-flag', '`on` needs an event: sm on <id> <state> <event>.');
      const answer = /** @type {{ result: string, to: string | null }} */ (on(c, args[1], args[2]));
      emit({ command, event: args[2], machine: c.id, result: answer.result, state: args[1], to: answer.to, schema: 1 });
      return 0;
    }
    const path = paths(c, args[1]);
    emit({ command, machine: c.id, path, reachable: path !== null, state: args[1], schema: 1 });
    return 0;
  }
  if (command === 'check') {
    const { check } = await import('./check.mjs');
    const { code, answer } = await check({ root, cwd, config, files: args, flags, includeMatcher, relPath, statSync });
    emit(answer);
    return code;
  }
  return 0;
}

main(process.argv.slice(2)).then(
  code => { process.exitCode = code; },
  error => {
    if (error instanceof UsageError) {
      emit({ error: { code: error.code, message: error.message, ...error.extra }, schema: 1 });
      process.exitCode = 2;
    } else {
      emit({ error: { code: 'internal', message: error?.stack ?? String(error) }, schema: 1 });
      process.exitCode = 3;
    }
  },
);
