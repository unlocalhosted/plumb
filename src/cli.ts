#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { relative } from 'node:path';
import { check, explain } from './index.js';
import { errorMessage, UsageError } from './errors.js';
import { formatText, tool } from './report.js';

const help = `Plumb ${tool.version}: design decisions and habits
Usage: plumb [check] [--json] [--verbose] [--root <dir>] [--config <path>]
       plumb habits [--json] [--root <dir>] [--config <path>]
       plumb decisions [--family <name>] [--json] [--root <dir>] [--config <path>]
       plumb explain <file> [--json] [--verbose] [--root <dir>] [--config <path>]

  --json           Print the JSON report
  --verbose        Include internal notes in text output
  --root <dir>     Project directory (default: current directory)
  --config <path>  Config file (relative to root, or absolute)
  --version        Print the package version
  --help           Print this help

Exit codes: 0 ok, 1 failing findings, 2 usage/config error
`;

async function main(): Promise<void> {
  const args = (() => {
    try {
      return parseArgs({
        options: {
          json: { type: 'boolean' }, verbose: { type: 'boolean' }, root: { type: 'string' }, config: { type: 'string' },
          family: { type: 'string' }, version: { type: 'boolean' }, help: { type: 'boolean' },
        },
        allowPositionals: true,
        strict: true,
      });
    } catch (error) {
      throw new UsageError(`${errorMessage(error)}; run plumb --help for supported flags.`);
    }
  })();
  const listingHabits = args.positionals[0] === 'habits';
  const deciding = args.positionals[0] === 'decisions';
  const families = ['spacing', 'color', 'radius', 'type', 'motion', 'elevation', 'size', 'z', 'opacity'];
  if (args.values.family !== undefined && (!deciding || !families.includes(args.values.family))) throw new UsageError('--family requires plumb decisions and a known family.');
  const explaining = args.positionals[0] === 'explain';
  if (explaining ? args.positionals.length !== 2 : args.positionals.length > 1 || (args.positionals.length === 1 && args.positionals[0] !== 'check' && !deciding && !listingHabits)) {
    throw new UsageError(`Unknown command ${JSON.stringify(args.positionals.join(' '))}; use plumb check or plumb explain <file> (see --help).`);
  }
  if (args.values.help) { process.stdout.write(help); return; }
  if (args.values.version) { process.stdout.write(`${tool.version}\n`); return; }
  for (const name of ['root', 'config'] as const) {
    if (args.values[name]?.trim() === '') throw new UsageError(`Provide a non-empty path for --${name}.`);
  }
  const options = {
    ...(args.values.root === undefined ? {} : { root: args.values.root }),
    ...(args.values.config === undefined ? {} : { config: args.values.config }),
  };
  if (explaining) {
    const result = await explain(args.positionals[1]!, options);
    const text = result.sites.map(site => `${relative(result.root, site.file)}:${site.line}:${site.column}  ${site.token}  <${site.owner.name}>\n` +
      site.conditions.map(condition => `  ${condition.kind}: ${condition.text}\n`).join('') +
      (site.declarations.length ? site.declarations.map(declaration => `  ${declaration.origin}  ${declaration.prop}: ${declaration.value}\n` + declaration.when.map(condition => `    ${condition.kind}: ${condition.text}\n`).join('')).join('') : '  no lowered declarations\n') +
      (args.values.verbose ? site.notes.map(note => `  note: ${note}\n`).join('') : '')).join('\n');
    const other = result.declarations.filter(declaration => !['class', 'arbitrary'].includes(declaration.origin)).map(declaration => `${relative(result.root, declaration.site.file)}:${declaration.site.line}:${declaration.site.column}  ${declaration.origin}  <${declaration.owner.name}>\n  ${declaration.prop}: ${declaration.value}${declaration.opaque ? ` (${declaration.opaque})` : ''}\n` + declaration.when.map(condition => `    ${condition.kind}: ${condition.text}\n`).join('')).join('\n');
    process.stdout.write(args.values.json ? `${JSON.stringify(result, null, 2)}\n` : text + other);
    return;
  }
  const report = await check({ ...options, ...(listingHabits ? { listHabits: true } : {}) });
  if (listingHabits) {
    process.stdout.write(args.values.json ? `${JSON.stringify(report.habits, null, 2)}\n` : report.habits!.map(habit => `${habit.id}  ${habit.breaks} breaks  ${habit.severity}  ${habit.enabled ? 'enabled' : 'disabled'}\n  ${habit.reason}\n`).join(''));
    return;
  }
  if (deciding) {
    const records = report.decisions.filter(record => args.values.family === undefined || record.family === args.values.family);
    process.stdout.write(args.values.json ? `${JSON.stringify(records, null, 2)}\n` : records.map(record => `${record.family}  ${record.name}: ${record.value}\n  resolved: ${record.resolved ?? 'unresolved'}  origin: ${record.origin}  tier: ${record.tier}\n  why: ${record.why || '(none)'}\n  ${relative(report.root, record.source.file)}:${record.source.line}\n`).join(''));
    return;
  }
  process.stdout.write(args.values.json ? `${JSON.stringify(report, null, 2)}\n` : formatText(report, args.values.verbose));
  process.exitCode = report.findings.some(finding => finding.severity === 'error') ? 1 : 0;
}

try {
  await main();
} catch (error) {
  process.stderr.write(`plumb: ${errorMessage(error)}\n`);
  process.exitCode = 2;
}
