#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { check } from './index.js';
import { errorMessage, UsageError } from './errors.js';
import { formatText, tool } from './report.js';

const help = `Plumb ${tool.version}: layer 0, harness only
Usage: plumb [check] [--json] [--root <dir>] [--config <path>]

  --json           Print the JSON report
  --root <dir>     Project directory (default: current directory)
  --config <path>  Config file (relative to root, or absolute)
  --version        Print the package version
  --help           Print this help

Exit codes: 0 ok, 1 failing findings (none in layer 0), 2 usage/config error
`;

async function main(): Promise<void> {
  const args = (() => {
    try {
      return parseArgs({
        options: {
          json: { type: 'boolean' }, root: { type: 'string' }, config: { type: 'string' },
          version: { type: 'boolean' }, help: { type: 'boolean' },
        },
        allowPositionals: true,
        strict: true,
      });
    } catch (error) {
      throw new UsageError(`${errorMessage(error)}; run plumb --help for supported flags.`);
    }
  })();
  if (args.positionals.length > 1 || (args.positionals.length === 1 && args.positionals[0] !== 'check')) {
    throw new UsageError(`Unknown command ${JSON.stringify(args.positionals.join(' '))}; use plumb or plumb check (see --help).`);
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
  const report = await check(options);
  process.stdout.write(args.values.json ? `${JSON.stringify(report, null, 2)}\n` : formatText(report));
  process.exitCode = report.findings.some(finding => finding.severity === 'error') ? 1 : 0;
}

try {
  await main();
} catch (error) {
  process.stderr.write(`plumb: ${errorMessage(error)}\n`);
  process.exitCode = 2;
}
