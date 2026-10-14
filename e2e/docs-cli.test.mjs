import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const repo = fileURLToPath(new URL('../', import.meta.url));
const cli = join(repo, 'dist/cli.js');
const reference = JSON.parse(await readFile(join(repo, 'site/src/docs/recordings/reference/cli.json'), 'utf8'));

test('every documented command flag reaches real CLI dispatch without command rejection', { timeout: 180000 }, async t => {
  const root = await mkdtemp(join(tmpdir(), 'plumber-reference-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'src'));
  await writeFile(join(root, 'package.json'), '{"type":"module","dependencies":{"react":"*","vite":"*"}}');
  await writeFile(join(root, 'src/App.jsx'), 'export default () => <div />;\n');
  await writeFile(join(root, 'plumber.config.mjs'), 'export default { source: ["src/**/*.jsx"] };\n');
  await writeFile(join(root, 'vite.config.mjs'), 'export default {};\n');
  await writeFile(join(root, 'tokens.json'), '{}');
  const env = { ...process.env, PLUMBER_CACHE_DIR: join(root, '.cache'), PLUMBER_WATCH: '0', GIT_CEILING_DIRECTORIES: tmpdir() };
  for (const args of [['init', '-q'], ['add', '.'], ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'fixture']]) {
    const result = spawnSync('git', args, { cwd: root, env, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  }
  const values = {
    '--root': root, '--config': 'plumber.config.mjs', '--base': 'HEAD', '--since': 'HEAD',
    '--family': 'spacing', '--format': 'github', '--lang': 'tsx', '--as': 'src/Snippet.tsx',
    '--port': '0', '--origin': 'http://localhost:5555', '--served-root': root,
    '--why': 'Reviewed fixture exception', '--rule': 'provenance/spacing', '--site': 'src/App.jsx:1',
  };
  let count = 0;
  for (const command of reference.commands) {
    for (const flag of command.flags) {
      const args = [command.name];
      if (command.name === 'explain') args.push('src/App.jsx');
      if (command.name === 'why') args.push('src/App.jsx:1');
      if (command.name === 'show') args.push('provenance/spacing');
      if (command.name === 'parity') args.push('tokens.json');
      if (command.name === 'accept' && !['--rule', '--site'].includes(flag.name)) args.push('fixture-key');
      if (command.name === 'imitation' && flag.name !== '--suggest') args.push('--suggest');
      if (flag.name === '--write') args.push('--overlay');
      if (command.name === 'accept' && flag.name === '--rule') args.push('--site', values['--site'], '--why', values['--why']);
      if (command.name === 'accept' && flag.name === '--site') args.push('--rule', values['--rule'], '--why', values['--why']);
      if (command.name === 'init' && flag.name !== '--force') args.push('--force');
      let http = false;
      if (command.name === 'serve' && !['--help', '--version'].includes(flag.name)) {
        http = ['--port', '--overlay', '--origin', '--served-root'].includes(flag.name);
        if (http) {
          for (const [name, value] of [['--port', '0'], ['--overlay'], ['--origin', values['--origin']]]) if (flag.name !== name) args.push(name, ...value === undefined ? [] : [value]);
        } else if (flag.name !== '--stdio') args.push('--stdio');
      }
      args.push(flag.name);
      if (flag.type.startsWith('string')) args.push(flag.name === '--agent' ? 'codex' : flag.name === '--format' && command.name === 'parity' ? 'dtcg' : values[flag.name]);
      const label = `${command.name} ${flag.name}`;
      assert.ok(args.every(value => typeof value === 'string'), label);
      const result = await new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [cli, ...args], { cwd: root, env, stdio: ['pipe', 'pipe', 'pipe'] });
        let stdout = '', stderr = '', stopped = false;
        const timer = setTimeout(() => { child.kill('SIGKILL'); reject(new Error(`${label} timed out\n${stderr}`)); }, 15000);
        child.on('error', reject);
        child.stdout.on('data', chunk => {
          stdout += chunk;
          if (!stopped && (http && stdout.includes('is listening on http://') || flag.name === '--watch' && stdout.includes('React Plumber'))) {
            stopped = true; child.kill('SIGTERM');
          }
        });
        child.stderr.on('data', chunk => { stderr += chunk; });
        child.on('close', (status, signal) => { clearTimeout(timer); resolve({ status, signal, stdout, stderr, stopped }); });
        child.stdin.end(command.name === 'try' ? '<div />' : command.name === 'serve' && !http ? '{"jsonrpc":"2.0","id":1,"method":"health"}\n' : '');
      });
      assert.doesNotMatch(result.stderr, /Unknown option|Unknown command|requires plumber|prints text; remove|Omit --json and --verbose/, label);
      assert.ok([0, 1, 2].includes(result.status) || result.stopped && result.signal === 'SIGTERM', `${label}: ${JSON.stringify(result)}`);
      if (http || flag.name === '--watch') assert.ok(result.stopped, label);
      count++;
    }
  }
  t.diagnostic(`${reference.commands.length} commands; ${count} listed flags invoked through real CLI.`);
  for (const command of reference.commands) {
    if (command.name !== 'decisions') assert.ok(!command.flags.some(flag => flag.name === '--family'));
    if (['install', 'doctor', 'serve'].includes(command.name)) assert.ok(!command.flags.some(flag => flag.name === '--json'));
    if (command.name === 'serve') assert.ok(!command.flags.some(flag => flag.name === '--verbose'));
  }
});
