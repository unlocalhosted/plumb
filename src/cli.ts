#!/usr/bin/env node
import { migrationNotice, statePath } from './paths.js';
import { CheckCache } from './check-cache.js';
import { count } from './messages.js';
import { createReadStream } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { serve, serveStdio } from './session/server.js';
import { clientTry, watchReports } from './session/client.js';
import { parseArgs } from 'node:util';
import { relative, resolve } from 'node:path';
import { appendFile, readFile } from 'node:fs/promises';
import { loadConfig } from './config.js';
import { sarif } from './surfaces/sarif.js';
import { githubCommands, githubSummary, renderSummary } from './surfaces/github.js';
import { formatAgent } from './surfaces/agent.js';
import { writeAgentDocs } from './surfaces/docs.js';
import { installHooks } from './surfaces/hooks.js';
import { baseReport } from './surfaces/base.js';
import { changedLines } from './surfaces/changed-lines.js';
import { readTrend, recordTrend, trendMarkdown, trendSince } from './surfaces/trend.js';
import { formatParity, parity } from './parity.js';
import { check, explain, trySnippet } from './index.js';
import { formatUserError, UsageError } from './errors.js';
import { formatText, tool } from './report.js';
import { formatCheck } from './cli-report.js';
import { table, wrap } from './cli-table.js';
import { inspectLedger, ledgerCommand } from './ledger/commands.js';
import { initProject } from './adoption/init.js';
import { installOverlay, installProject, validateAgents } from './adoption/install.js';
import { doctor } from './adoption/doctor.js';
import { commandFlags, unknownName } from './cli-flags.js';
import { cliProject, prepareCliAnalysis } from './cli-project.js';
import { withCliProgress } from './cli-progress.js';
import { profileProgress } from './profile.js';

const help = `React Plumber ${tool.version}: design decisions, habits and ledger
Usage: plumber [check] [--json] [--verbose] [--root <dir>] [--config <path>]
       plumber presets [--json] [--root <dir>] [--config <path>]
       plumber serve [--port <number> | --stdio] [--overlay --origin <url> [--served-root <dir>]] [--root <dir>] [--config <path>]
       plumber check --watch [--json|--agent] [--root <dir>]
       plumber habits [--json] [--root <dir>] [--config <path>]
       plumber decisions [--family <name>] [--json] [--root <dir>] [--config <path>]
       plumber explain <file> [--json] [--verbose] [--root <dir>] [--config <path>]
       plumber try [--lang tsx|css] [--as <path>] [--json|--agent] < snippet
       plumber imitation --suggest [--json] [--root <dir>] [--config <path>]
       plumber report [--markdown] [--since <git-ref>] [--root <dir>]
       plumber parity <tokens.json> [--format dtcg] [--strict] [--json]

       plumber init | baseline [--force]
       plumber accept <key> --why "…"
       plumber accept --rule <rule> --site <file:line> --why "…"
       plumber accept-decisions [--why "…"]
       plumber ledger [--ratchet] [--prune] [--rebase]
       plumber show <key|rule> | why <file:line>
       plumber check [--base <git-ref>] [--changed] [--strict-ledger]
       plumber check [--sarif | --agent | --format github]
       plumber agent-docs
       plumber install [--ci] [--list] [--agent <name> ...] | install --hooks [--list]
       plumber install --overlay [--write] [--root <dir>]  Print host wiring, or apply it with --write
       plumber doctor [--root <dir>] [--config <path>]

  --json           Print the JSON report
  --verbose        Include internal notes in text output
  --all            Show the full human report
  --broken         Show broken styles
  --family <name>  Show findings in one token family
  --file <path>    Show findings at a path or glob (quote globs)
  --rule <id>      Show one rule or rule category
  --new            Show only new sites
  --debt           Show only recorded debt sites
  --root <dir>     Project directory (default: current directory)
  --config <path>  Config file (relative to root, or absolute)
  --version        Print the package version
  --help           Print this help

Exit codes: 0 ok, 1 failing findings, 2 usage/config error
`;

async function main(): Promise<void> {
  const args = (() => {
    try {
      const options = {
          json: { type: 'boolean' }, verbose: { type: 'boolean' }, root: { type: 'string' }, config: { type: 'string' },
          base: { type: 'string' }, 'strict-ledger': { type: 'boolean' }, force: { type: 'boolean' }, why: { type: 'string' }, rule: { type: 'string' }, site: { type: 'string' }, ratchet: { type: 'boolean' }, prune: { type: 'boolean' }, rebase: { type: 'boolean' },
          changed: { type: 'boolean' }, agent: { type: 'boolean' }, sarif: { type: 'boolean' }, format: { type: 'string' }, hooks: { type: 'boolean' }, ci: { type: 'boolean' },
          family: { type: 'string' }, suggest: { type: 'boolean' }, version: { type: 'boolean' }, help: { type: 'boolean' },
          all: { type: 'boolean' }, broken: { type: 'boolean' }, file: { type: 'string' }, new: { type: 'boolean' }, debt: { type: 'boolean' },
          lang: { type: 'string' }, as: { type: 'string' }, port: { type: 'string' }, stdio: { type: 'boolean' }, watch: { type: 'boolean' },
          markdown: { type: 'boolean' }, since: { type: 'string' }, strict: { type: 'boolean' }, list: { type: 'boolean' },
          overlay: { type: 'boolean' }, write: { type: 'boolean' }, origin: { type: 'string' }, 'served-root': { type: 'string' },
      } as const;
      // Probe command with all value-taking flags known; --agent is an install
      // target only for install, and remains a boolean report flag elsewhere.
      const probe = parseArgs({ options: { ...options, agent: { type: 'string', multiple: true } }, strict: false, allowPositionals: true });
      return parseArgs({
        options: { ...options, agent: probe.positionals[0] === 'install' ? { type: 'string', multiple: true } : { type: 'boolean' } },
        allowPositionals: true,
        strict: true,
      });
    } catch (error) {
      const problem = error as Error & { code?: string };
      const flag = /['"](-[^'" =]+)/.exec(problem.message)?.[1];
      if (problem.code === 'ERR_PARSE_ARGS_UNKNOWN_OPTION' && flag) {
        throw new UsageError(unknownName('option', flag, [...new Set(Object.values(commandFlags).flat())].map(name => '--' + name)));
      }
      throw new UsageError(`${flag ? `Option ${flag} needs ${problem.message.includes('argument missing') ? 'a value' : 'a valid value'}.` : 'Could not read these options.'}\n  → plumber --help`);
    }
  })();
  if (args.values.help) { process.stdout.write(help); return; }
  if (args.values.version) { process.stdout.write(`${tool.version}\n`); return; }
  const command = args.positionals[0] ?? 'check';
  const deciding = command === 'decisions';
  const listingHabits = command === 'habits';
  const explaining = command === 'explain';
  const suggesting = command === 'imitation';
  const comparingTokens = command === 'parity';
  const mutating = ['init', 'baseline', 'accept', 'accept-decisions', 'ledger'].includes(command);
  const inspecting = command === 'show' || command === 'why';
  const families = ['spacing', 'color', 'radius', 'type', 'motion', 'elevation', 'size', 'z', 'opacity'];
  if (args.values.family !== undefined && (!(deciding || command === 'check') || !families.includes(args.values.family))) throw new UsageError('--family requires plumber check or decisions and a known family.\n  → plumber check --help');
  if (!Object.hasOwn(commandFlags, command)) throw new UsageError(unknownName('command', command, Object.keys(commandFlags)));
  if ((explaining || inspecting || comparingTokens) ? args.positionals.length !== 2 : command === 'accept' ? args.positionals.length > 2 : args.positionals.length > 1) {
    throw new UsageError(`Unexpected arguments for plumber ${command}.\n  → plumber --help`);
  }
  if (args.values.json && ['install', 'doctor'].includes(command)) throw new UsageError(`plumber ${command} prints text; remove --json.\n  → plumber ${command}`);
  if (command === 'serve' && (args.values.json || args.values.verbose)) throw new UsageError('Serve uses JSON responses. Omit --json and --verbose.\n  → plumber serve');
  for (const flag of Object.keys(args.values)) if (!commandFlags[command]!.includes(flag)) {
    const commands = Object.keys(commandFlags).filter(name => commandFlags[name]!.includes(flag));
    throw new UsageError(`--${flag} requires plumber ${commands.join(' or ')}.\n  → plumber ${commands[0]} --help`);
  }
  if (args.values.format !== undefined && args.values.format !== (comparingTokens ? 'dtcg' : 'github')) throw new UsageError(comparingTokens ? '--format supports dtcg for plumber parity.\n  → plumber parity tokens.json --format dtcg' : '--format supports github.\n  → plumber check --format github');
  if ([args.values.json, args.values.sarif, args.values.agent, !comparingTokens && args.values.format !== undefined].filter(Boolean).length > 1) throw new UsageError('Choose one of --json, --sarif, --agent, or --format github.\n  → plumber check --json');
  if (args.values.json && args.values.markdown) throw new UsageError('Choose --json or --markdown.\n  → plumber report --markdown');
  if (args.values.since?.trim() === '') throw new UsageError('Provide a non-empty Git ref for --since.\n  → plumber report --since HEAD');
  if (comparingTokens && !args.positionals[1]?.trim()) throw new UsageError('Provide a token export path for plumber parity.\n  → plumber parity tokens.json');
  if (args.values.changed && args.values.base !== undefined) throw new UsageError('Choose --changed (HEAD) or --base.\n  → plumber check --changed');
  const installAgents = validateAgents(Array.isArray(args.values.agent) ? args.values.agent : []);
  if (args.values.write && (!args.values.overlay || args.values.list)) throw new UsageError('--write requires install --overlay; omit --list.\n  → plumber install --overlay --write');
  if (command === 'install' && args.values.overlay && (args.values.hooks || args.values.ci || installAgents.length)) throw new UsageError('Install --overlay sets up host wiring only; omit --hooks, --ci and --agent.\n  → plumber install --overlay');
  if (args.values.hooks && installAgents.length) throw new UsageError('Use install --agent for selected agents and their hooks; --hooks installs both hooks only.\n  → plumber install --hooks');
  if (args.values.hooks && args.values.ci) throw new UsageError('Choose install --hooks for hooks only, or install --ci for agents, docs and CI.\n  → plumber install --ci');
  if (suggesting && !args.values.suggest) throw new UsageError('Use plumber imitation --suggest to report candidate fingerprints.\n  → plumber imitation --suggest');
  if (args.values.base?.trim() === '') throw new UsageError('Provide a non-empty Git ref for --base.\n  → plumber check --base HEAD');
  for (const name of ['root', 'config', 'served-root'] as const) {
    if (args.values[name]?.trim() === '') throw new UsageError(`Provide a non-empty path for --${name}.\n  → plumber --help`);
  }
  const project = await cliProject(args.values.root);
  if (project.notice) process.stderr.write(project.notice);
  const options = {
    // Agent edits need a single matching value, not a family's token inventory.
    verbose: args.values.verbose === true || args.values.agent === true,
    root: project.root,
    ...(args.values.config === undefined ? {} : { config: args.values.config }),
  };
  let prepared = false;
  const prepare = async () => {
    if (prepared || command === 'doctor') return;
    profileProgress('phase:config');
    const notice = await prepareCliAnalysis(options.root, options.config, command === 'try');
    prepared = true;
    if (notice) process.stderr.write(notice);
  };
  const analyzing = <T>(run: () => Promise<T>) => withCliProgress(options.root,
    !!(args.values.json || args.values.agent || args.values.sarif || args.values.format === 'github' || args.values.watch || command === 'serve'), async () => { await prepare(); return run(); });
  migrationNotice(resolve(options.root ?? process.cwd()), options.config);
  if (command === 'presets') {
    const loaded = await loadConfig(resolve(options.root ?? process.cwd()), options.config);
    process.stdout.write(args.values.json ? `${JSON.stringify(loaded.presets ?? [], null, 2)}\n` :
      loaded.presets?.length ? loaded.presets.map(preset => `${preset.name}  ${count(preset.decisions, 'token')} (${preset.exported} published), ${count(preset.components.contracts.length, 'contract')}, ${count(preset.imitation.length, 'fingerprint')}, ${count(preset.habits.length, 'habit')}\n` +
        `  source: ${preset.source}\n  components: ${preset.components.from.join(', ') || 'none'}\n` +
        `  contracts: ${preset.components.contracts.join(', ') || 'default ownership'}\n  fingerprints: ${preset.imitation.join(', ') || 'none'}\n  habits: ${preset.habits.join(', ') || 'none'}\n  markers: ${preset.markers.join(', ') || 'none'}\n`).join('') : 'No presets loaded.\n');
    return;
  }
  if (command === 'install' && args.values.overlay) {
    try { process.stdout.write(await installOverlay(resolve(options.root ?? process.cwd()), args.values.write)); }
    catch (error) {
      if (!(error instanceof UsageError)) throw error;
      // Manual host wiring is copyable code: retain its line breaks.
      process.stderr.write(formatUserError(error)); process.exitCode = 2;
    }
    return;
  }
  if (command === 'install' && args.values.hooks) { process.stdout.write(await installHooks(resolve(options.root ?? process.cwd()), undefined, undefined, args.values.list)); return; }
  if (command === 'install') { process.stdout.write(await installProject(resolve(options.root ?? process.cwd()), { list: args.values.list ?? false, ci: args.values.ci ?? false, agents: installAgents })); return; }
  if (command === 'doctor') {
    const result = await analyzing(() => doctor(resolve(options.root ?? process.cwd()), options.config));
    process.stdout.write(result.text); process.exitCode = result.ok ? 0 : 1; return;
  }
  if (command === 'init') {
    let preview = '';
    let result: Awaited<ReturnType<typeof initProject>>;
    try {
      result = await analyzing(() => initProject(resolve(options.root ?? process.cwd()), { ...options,
        ...(args.values.force === undefined ? {} : { force: args.values.force }) },
        text => { preview += text; }));
    } finally {
      if (preview) (args.values.json ? process.stderr : process.stdout).write(preview);
    }
    process.stdout.write(args.values.json ? `${JSON.stringify(result, null, 2)}\n` : `${result.message}\n`); return;
  }
  if (command === 'report' && args.values.since !== undefined) {
    const root = resolve(options.root ?? process.cwd());
    const trend = trendSince(root, await readTrend(root), args.values.since);
    process.stdout.write(args.values.json ? `${JSON.stringify(trend, null, 2)}\n` : trendMarkdown(trend));
    return;
  }
  const emitCheck = async (report: import('./report.js').Report): Promise<void> => {
    if (args.values.sarif) process.stdout.write(`${JSON.stringify(sarif(report), null, 2)}\n`);
    else if (args.values.agent) process.stdout.write(formatAgent(report));
    else if (args.values.format === 'github') {
      const base = args.values.base === undefined ? undefined : await baseReport(report.root, args.values.base, options);
      const scope = args.values.base !== undefined || args.values.changed ? await changedLines(report.root, args.values.base ?? 'HEAD') : undefined;
      const summary = renderSummary(githubSummary(report, base, scope));
      const commands = githubCommands(report, scope);
      process.stdout.write(`${commands}${commands ? '\n' : ''}${summary}`);
      if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, summary);
    } else process.stdout.write(args.values.json ? `${JSON.stringify(report)}\n` : formatCheck(report, {
      ...Object.fromEntries(['all', 'broken', 'family', 'file', 'rule', 'new', 'debt'].filter(flag => args.values[flag as keyof typeof args.values] !== undefined)
        .map(flag => [flag, args.values[flag as keyof typeof args.values]])),
    }, args.values.verbose));
    process.exitCode = !report.config.path && !report.ledger?.exists ? 0 : report.findings.some(finding => finding.severity === 'error') ? 1 : 0;
  };
  if (args.values.watch) {
    await prepare();
    const controller = new AbortController();
    const stop = () => controller.abort();
    process.on('SIGINT', stop); process.on('SIGTERM', stop);
    try { await watchReports({ ...options, ...(args.values.base === undefined ? {} : { base: args.values.base }),
      ...(args.values.changed === undefined ? {} : { changed: args.values.changed }),
      ...(args.values['strict-ledger'] === undefined ? {} : { strictLedger: args.values['strict-ledger'] }) }, emitCheck, controller.signal, error => process.stderr.write(formatUserError(error))); }
    finally { process.off('SIGINT', stop); process.off('SIGTERM', stop); }
    return;
  }
  if (command === 'serve') {
    if (args.values.stdio && args.values.port !== undefined) throw new UsageError('Choose --stdio or --port.\n  → plumber serve --stdio');
    if (args.values['served-root'] !== undefined && !args.values.overlay) throw new UsageError('--served-root requires serve --overlay.\n  → plumber serve --overlay');
    if (args.values.stdio && (args.values.overlay || args.values.origin !== undefined)) throw new UsageError('Serve --overlay requires HTTP; omit --stdio.\n  → plumber serve --overlay');
    await prepare();
    if (args.values.stdio) { await serveStdio(options); return; }
    if (args.values.port !== undefined && !/^\d+$/.test(args.values.port)) throw new UsageError('Port must be an integer from 0 to 65535.\n  → plumber serve --port 0');
    const daemon = await serve({ ...options, overlay: args.values.overlay ?? false,
      ...(args.values['served-root'] === undefined ? {} : { servedRoot: args.values['served-root'] }),
      ...(args.values.origin === undefined ? {} : { origin: args.values.origin }),
      ...(args.values.port === undefined ? {} : { port: Number(args.values.port) }) });
    process.stdout.write(`React Plumber is listening on http://127.0.0.1:${daemon.info.port}. Connection details are in ${statePath(resolve(options.root ?? process.cwd()), 'serve.json')}.\n`);
    await new Promise<void>(done => {
      const stop = () => { process.off('SIGINT', stop); process.off('SIGTERM', stop); void daemon.close().then(done); };
      process.on('SIGINT', stop); process.on('SIGTERM', stop);
    });
    return;
  }
  if (command === 'try') {
    if (args.values.lang !== undefined && !['tsx', 'css'].includes(args.values.lang)) throw new UsageError('--lang must be tsx or css.\n  → plumber try --lang tsx');
    if (args.values.as?.trim() === '') throw new UsageError('Provide a non-empty path for --as.\n  → plumber try --help');
    let text = '';
    for await (const chunk of process.stdin) text += chunk.toString();
    const tryOptions = { ...options,
      ...(args.values.lang === undefined ? {} : { lang: args.values.lang as 'tsx' | 'css' }),
      ...(args.values.as === undefined ? {} : { as: args.values.as }) };
    const report = await analyzing(async () => await clientTry(text, tryOptions) ?? await trySnippet(text, tryOptions));
    process.stdout.write(args.values.json ? `${JSON.stringify(report)}\n` : args.values.agent ? formatAgent(report) : formatText(report, args.values.verbose));
    process.exitCode = report.findings.some(finding => finding.severity === 'error') ? 1 : 0;
    return;
  }
  if (explaining) {
    const result = await analyzing(() => explain(args.positionals[1]!, options));
    const text = result.sites.map(site => `${relative(result.root, site.file)}:${site.line}:${site.column}  ${site.token}  <${site.owner.name}>\n` +
      site.conditions.map(condition => `  ${condition.kind}: ${condition.text}\n`).join('') +
      (site.declarations.length ? site.declarations.map(declaration => `  ${declaration.origin}  ${declaration.prop}: ${declaration.value}\n` + declaration.when.map(condition => `    ${condition.kind}: ${condition.text}\n`).join('')).join('') : '  no lowered declarations\n') +
      (args.values.verbose ? site.notes.map(note => `  note: ${note}\n`).join('') : '')).join('\n');
    const other = result.declarations.filter(declaration => !['class', 'arbitrary'].includes(declaration.origin)).map(declaration => `${relative(result.root, declaration.site.file)}:${declaration.site.line}:${declaration.site.column}  ${declaration.origin}  <${declaration.owner.name}>\n  ${declaration.prop}: ${declaration.value}${declaration.opaque ? ` (${declaration.opaque})` : ''}${declaration.dynamic ? ` (${declaration.dynamic.kind} by ${declaration.dynamic.by})` : ''}\n` + declaration.when.map(condition => `    ${condition.kind}: ${condition.text}\n`).join('')).join('\n');
    process.stdout.write(args.values.json ? `${JSON.stringify(result, null, 2)}\n` : text + other);
    return;
  }
  if (command === 'check' && args.values.json && !args.values.agent && !args.values.sarif && !args.values.format && !args.values.watch && args.values.base === undefined && !args.values.changed && !args.values['strict-ledger']) {
    await prepare();
    const started = performance.now(), cache = await CheckCache.create(options);
    if (cache && await cache.hit()) {
      for await (const chunk of createReadStream(cache.jsonPath, { highWaterMark: 1024 * 1024 })) {
        if (!process.stdout.write(chunk)) await new Promise<void>(done => process.stdout.once('drain', done));
      }
      const metadata = JSON.parse(await readFile(cache.jsonPath.replace(/\.json$/, '.status.json'), 'utf8')) as { exit: number; timing: import('./report.js').Report['timing'] };
      process.stdout.write(`,"timing":${JSON.stringify({ ...metadata.timing, totalMs: performance.now() - started })}}\n`);
      process.exitCode = metadata.exit; return;
    }
  }
  const report = await analyzing(() => check({ ...options, ledger: !mutating && !inspecting && !deciding && !listingHabits && !suggesting && !comparingTokens,
    ...(listingHabits ? { listHabits: true } : {}),
    ...(suggesting ? { suggestImitation: true } : {}),
    ...(args.values.base === undefined ? {} : { base: args.values.base }),
    ...(args.values.changed === undefined ? {} : { changed: args.values.changed }),
    ...(args.values['strict-ledger'] === undefined ? {} : { strictLedger: args.values['strict-ledger'] }) }));
  if (command === 'report') {
    const { record, trend } = await recordTrend(report);
    process.stdout.write(args.values.json ? `${JSON.stringify(record, null, 2)}\n` : args.values.markdown ? trendMarkdown(trend) : 'Wrote plumb/report.json and appended to plumb/trend.json.\n');
    return;
  }
  if (comparingTokens) {
    const result = await parity(report, args.positionals[1]!);
    process.stdout.write(args.values.json ? `${JSON.stringify(result, null, 2)}\n` : formatParity(result));
    process.exitCode = args.values.strict && result.findings.length ? 1 : 0;
    return;
  }
  if (listingHabits) {
    process.stdout.write(args.values.json ? `${JSON.stringify(report.habits, null, 2)}\n` : report.habits!.map(habit =>
      table([[habit.id, habit.breaks === null ? 'not checked' : count(habit.breaks, 'break'), habit.severity, habit.enabled ? 'enabled' : 'disabled']],
        [{ weight: 1 }, { width: 12, align: 'right' }, { width: 5 }, { width: 8 }], { indent: 0 }).join('\n') + '\n' + wrap(`  ${habit.reason}`) + '\n').join(''));
    return;
  }
  if (command === 'agent-docs') { process.stdout.write(await writeAgentDocs(report, (await loadConfig(report.root, options.config)).value)); return; }
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
    process.stdout.write(args.values.json ? `${JSON.stringify(result, null, 2)}\n` : command === 'ledger' ?
      (result.moves.length ? table(result.moves.map(move => ['Moved', { text: move.from, path: true }, '→', { text: move.to, path: true }]),
        [{ width: 5 }, { weight: 1 }, { width: 1 }, { weight: 1 }], { indent: 0 }) : table([[result.message]], [{ weight: 1 }], { indent: 0 })).join('\n') + '\n' : wrap(result.message) + '\n');
    return;
  }
  if (suggesting) {
    const proposals = report.imitationSuggestions ?? [];
    process.stdout.write(args.values.json ? `${JSON.stringify(proposals, null, 2)}\n` :
      'Candidate fingerprints (report only; none enabled):\n' + proposals.map(proposal =>
        `${proposal.component.name}  ${proposal.rawElements} raw elements\n  fingerprint: ${JSON.stringify(proposal.fingerprint)}\n  source: ${relative(report.root, proposal.component.source.file)}:${proposal.component.source.line}\n` +
        (proposal.notes ?? []).map(note => `  note: ${note}\n`).join('')).join(''));
    return;
  }
  if (inspecting) {
    const result = await inspectLedger(command as 'show' | 'why', args.positionals[1]!, report);
    const text = result.findings.map(finding => `${finding.key}\n  ${finding.title}\n  ${finding.because}\n  ${finding.sites.map(site => `${relative(report.root, site.file)}:${site.line}  ${site.text}`).join('\n  ')}\n`).join('') +
      result.declarations.map(d => `  ${d.prop}: ${d.resolved ?? d.value}\n`).join('') +
      result.decisions.map(d => `  decision ${d.name}: ${d.value}  ${d.why}\n`).join('') +
      result.ledger.map(line => `  ${relative(report.root, line.file)}:${line.line}  ${line.entry.kind}  ${line.entry.key}  ${line.entry.why ?? '(no why)'}\n`).join('');
    process.stdout.write(args.values.json ? `${JSON.stringify(result, null, 2)}\n` : text || 'No matching finding, declaration or ledger entry.\n');
    return;
  }
  if (deciding) {
    const records = report.decisions.filter(record => args.values.family === undefined || record.family === args.values.family);
    const columns = [{ width: 9 }, { weight: 3 }, { weight: 2 }, { weight: 3, path: true, ink: 'dim' as const }];
    process.stdout.write(args.values.json ? `${JSON.stringify(records, null, 2)}\n` : records.map(record =>
      table([[record.family, record.name, record.value, `${relative(report.root, record.source.file)}:${record.source.line}`]], columns, { indent: 0 }).join('\n') + '\n' +
      table([[`resolved: ${record.resolved ?? 'unresolved'} · ${record.origin === 'framework' ? "Tailwind's default" : record.origin === 'project' ? 'your theme' : 'inferred'} · ${record.tier === 'primitive' ? 'raw token' : 'named token'}`]], [{ weight: 1, ink: 'dim' }]).join('\n') + '\n' +
      wrap(`  why: ${record.why || '(none)'}`) + '\n').join(''));
    return;
  }
  await emitCheck(report);
}

try {
  await main();
} catch (error) {
  process.stderr.write(formatUserError(error));
  process.exitCode = 2;
}
