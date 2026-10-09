#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { relative } from 'node:path';
import { check, explain } from './index.js';
import { errorMessage, UsageError } from './errors.js';
import { formatText, tool } from './report.js';
import { inspectLedger, ledgerCommand } from './ledger/commands.js';

const help = `Plumb ${tool.version}: design decisions and ledger
Usage: plumb [check] [--json] [--verbose] [--root <dir>] [--config <path>]
       plumb decisions [--family <name>] [--json] [--root <dir>] [--config <path>]
       plumb explain <file> [--json] [--verbose] [--root <dir>] [--config <path>]

       plumb init | baseline [--force]
       plumb accept <key> --why "…"
       plumb accept --rule <rule> --site <file:line> --why "…"
       plumb accept-decisions [--why "…"]
       plumb ledger [--ratchet] [--prune] [--rebase]
       plumb show <key|rule> | why <file:line>
       plumb check [--base <git-ref>] [--strict-ledger]

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
          base: { type: 'string' }, 'strict-ledger': { type: 'boolean' }, force: { type: 'boolean' }, why: { type: 'string' }, rule: { type: 'string' }, site: { type: 'string' }, ratchet: { type: 'boolean' }, prune: { type: 'boolean' }, rebase: { type: 'boolean' },
          family: { type: 'string' }, version: { type: 'boolean' }, help: { type: 'boolean' },
        },
        allowPositionals: true,
        strict: true,
      });
    } catch (error) {
      throw new UsageError(`${errorMessage(error)}; run plumb --help for supported flags.`);
    }
  })();
  if (args.values.help) { process.stdout.write(help); return; }
  if (args.values.version) { process.stdout.write(`${tool.version}\n`); return; }
  const command = args.positionals[0] ?? 'check';
  const deciding = command === 'decisions';
  const explaining = command === 'explain';
  const mutating = ['init', 'baseline', 'accept', 'accept-decisions', 'ledger'].includes(command);
  const inspecting = command === 'show' || command === 'why';
  const families = ['spacing', 'color', 'radius', 'type', 'motion', 'elevation', 'size', 'z', 'opacity'];
  if (args.values.family !== undefined && (!deciding || !families.includes(args.values.family))) throw new UsageError('--family requires plumb decisions and a known family.');
  if (!['check', 'decisions', 'explain', 'init', 'baseline', 'accept', 'accept-decisions', 'ledger', 'show', 'why'].includes(command) ||
      ((explaining || inspecting) ? args.positionals.length !== 2 : command === 'accept' ? args.positionals.length > 2 : args.positionals.length > 1)) {
    throw new UsageError(`Unknown command ${JSON.stringify(args.positionals.join(' '))}; use plumb check or plumb explain <file> (see --help).`);
  }
  const flags: Record<string, string[]> = {
    base: ['check'], 'strict-ledger': ['check'], force: ['baseline'], why: ['accept', 'accept-decisions'],
    rule: ['accept'], site: ['accept'], ratchet: ['ledger'], prune: ['ledger'], rebase: ['ledger'],
  };
  for (const [flag, commands] of Object.entries(flags)) if (args.values[flag as keyof typeof args.values] !== undefined && !commands.includes(command)) throw new UsageError(`--${flag} requires plumb ${commands.join(' or ')}.`);
  if (args.values.base?.trim() === '') throw new UsageError('Provide a non-empty Git ref for --base.');
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
  const report = await check({ ...options, ledger: !mutating && !inspecting && !deciding,
    ...(args.values.base === undefined ? {} : { base: args.values.base }),
    ...(args.values['strict-ledger'] === undefined ? {} : { strictLedger: args.values['strict-ledger'] }) });
  if (mutating) {
    const result = await ledgerCommand(command, report, {
      ...(args.values.force === undefined ? {} : { force: args.values.force }),
      ...(args.values.why === undefined ? {} : { why: args.values.why }),
      ...(args.positionals[1] === undefined ? {} : { key: args.positionals[1] }),
      ...(args.values.rule === undefined ? {} : { rule: args.values.rule }),
      ...(args.values.site === undefined ? {} : { site: args.values.site }),
      ...(args.values.ratchet === undefined ? {} : { ratchet: args.values.ratchet }),
      ...(args.values.prune === undefined ? {} : { prune: args.values.prune }),
      ...(args.values.rebase === undefined ? {} : { rebase: args.values.rebase }),
    });
    process.stdout.write(args.values.json ? `${JSON.stringify(result, null, 2)}\n` : `${result.message}\n`);
    return;
  }
  if (inspecting) {
    const result = await inspectLedger(command as 'show' | 'why', args.positionals[1]!, report);
    const text = result.findings.map(finding => `${finding.key}\n  ${finding.why}\n  ${finding.sites.map(site => `${relative(report.root, site.file)}:${site.line}  ${site.text}`).join('\n  ')}\n`).join('') +
      result.declarations.map(d => `  ${d.prop}: ${d.resolved ?? d.value}\n`).join('') +
      result.decisions.map(d => `  decision ${d.name}: ${d.value}  ${d.why}\n`).join('') +
      result.ledger.map(line => `  ${relative(report.root, line.file)}:${line.line}  ${line.entry.kind}  ${line.entry.key}  ${line.entry.why ?? '(no why)'}\n`).join('');
    process.stdout.write(args.values.json ? `${JSON.stringify(result, null, 2)}\n` : text || 'No matching finding, declaration or ledger entry.\n');
    return;
  }
  if (deciding) {
    const records = report.decisions.filter(record => args.values.family === undefined || record.family === args.values.family);
    process.stdout.write(args.values.json ? `${JSON.stringify(records, null, 2)}\n` : records.map(record => `${record.family}  ${record.name}: ${record.value}\n  resolved: ${record.resolved ?? 'unresolved'}  origin: ${record.origin}  tier: ${record.tier}\n  why: ${record.why || '(none)'}\n  ${relative(report.root, record.source.file)}:${record.source.line}\n`).join(''));
    return;
  }
  process.stdout.write(args.values.json ? `${JSON.stringify(report, null, 2)}\n` : formatText(report, args.values.verbose) + (report.ledger ? `\nledger  ${report.ledger.message}\n` : ''));
  process.exitCode = report.findings.some(finding => finding.severity === 'error') ? 1 : 0;
}

try {
  await main();
} catch (error) {
  process.stderr.write(`plumb: ${errorMessage(error)}\n`);
  process.exitCode = 2;
}
