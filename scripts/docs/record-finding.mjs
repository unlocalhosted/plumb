// Run from repo root: node scripts/docs/record-finding.mjs (uses existing dist/).
import { spawnSync } from 'node:child_process';
import { stripVTControlCharacters } from 'node:util';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { plumbCommand, recordingJSON, recordingPaths } from './recording.mjs';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const cache = await mkdtemp(join(tmpdir(), 'plumb-docs-finding-'));
const portable = recordingPaths({ repo, root: resolve(repo, 'fixtures/docs-judged'), paths: [[cache, '.plumber/cache']] });
try {
  const run = flags => {
    const args = ['dist/cli.js', 'check', '--root', 'fixtures/docs-judged', ...flags];
    const result = spawnSync(process.execPath, args, {
      cwd: repo, encoding: 'utf8', env: { ...process.env, PLUMBER_CACHE_DIR: cache },
      maxBuffer: 32 * 1024 * 1024, timeout: 30_000,
    });
    if (result.error) throw result.error;
    if (![0, 1].includes(result.status)) throw new Error(`CLI failed (${result.status}): ${result.stderr}`);
    return { command: plumbCommand(args.slice(1), 'fixtures/docs-judged'), exitCode: result.status, stderr: stripVTControlCharacters(result.stderr), stdout: stripVTControlCharacters(result.stdout) };
  };
  const textRun = run([]), jsonRun = run(['--json']);
  const report = JSON.parse(jsonRun.stdout);
  const matches = report.findings.filter(f => f.rule === 'provenance/arbitrary' && f.sites.some(s => s.text === 'gap-[13px]'));
  if (matches.length !== 1) throw new Error('Expected exactly one arbitrary gap-[13px] finding.');
  const finding = matches[0];
  const blocks = textRun.stdout.split('\n\n');
  const matchingBlocks = blocks.filter(block => block.startsWith(`${finding.title}  `));
  if (matchingBlocks.length !== 1) throw new Error('Expected one matching terminal finding block.');
  const start = textRun.stdout.indexOf(matchingBlocks[0]);
  const terminalText = textRun.stdout.slice(start, start + matchingBlocks[0].length + 1);
  const lines = terminalText.slice(0, -1).split('\n').map((text, index) => {
    const part = index === 0 ? 'title' : text === `  ${finding.because}` ? 'because'
      : /^  intended\?  /.test(text) ? 'accept' : /^  \S+:\d+:\d+\s/.test(text) ? 'site' : 'fix';
    return { line: index + 1, part, text };
  });
  if (lines.map(line => line.text).join('\n') + '\n' !== terminalText || !textRun.stdout.includes(terminalText)) throw new Error('Terminal bytes changed.');
  const output = join(repo, 'site/src/docs/recordings/finding.json');
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, recordingJSON({
    schemaVersion: 1, fixture: 'fixtures/docs-judged/', regenerate: 'node scripts/docs/record-finding.mjs',
    runs: [{ command: textRun.command, exitCode: textRun.exitCode, stderr: textRun.stderr }, { command: jsonRun.command, exitCode: jsonRun.exitCode, stderr: jsonRun.stderr }],
    terminalText, lines, unprintedParts: ['edit'], finding,
  }, portable));
  console.log('Recorded site/src/docs/recordings/finding.json');
} finally {
  await rm(cache, { recursive: true, force: true });
}
