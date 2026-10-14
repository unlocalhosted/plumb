import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, symlinkSync, existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';

// Run final-pass.mjs setup first to create the pinned snapshot. The historical
// config works at every revision; d91c102 predates the suggest policy key.
// Builds and compiler caches stay outside .git and the live MetalUI checkout.
const repo = resolve('.'), base = resolve('bench/metalui/.cache/overlay-5-bisect');
const snapshot = resolve('bench/metalui/.cache/final-check/snapshot');
const refs = process.argv.length > 2 ? process.argv.slice(2) : ['d91c102', 'a274654', '21c194d', 'ab53b7e', '3f83816^', '3f83816'];
function command(binary, args, options = {}) {
  const result = spawnSync(binary, args, { encoding: 'utf8', maxBuffer: 96 * 1024 * 1024, ...options });
  if (result.error || result.status !== 0) throw new Error(result.error?.message ?? (result.stderr || result.stdout));
  return result;
}
for (const ref of refs) {
  const root = resolve(base, ref);
  mkdirSync(root, { recursive: true });
  const archive = command('git', ['archive', ref, 'src', 'tsconfig.json', 'package.json'], { encoding: null }).stdout;
  command('tar', ['-xf', '-', '-C', root], { input: archive });
  if (!existsSync(resolve(root, 'node_modules'))) symlinkSync(resolve(repo, 'node_modules'), resolve(root, 'node_modules'), 'dir');
  command(process.execPath, [resolve(repo, 'node_modules/typescript/bin/tsc'), '-p', resolve(root, 'tsconfig.json')]);
  const configDirectory = resolve(root, 'config');
  mkdirSync(configDirectory, { recursive: true });
  for (const file of ['plumber.config.ts', 'families.ts', 'ownership.config.ts', 'imitation.config.ts', 'layer5-habits.ts']) {
    let text = command('git', ['show', `d91c102:bench/metalui/${file}`]).stdout;
    text = text.replaceAll("'../../dist/", `'${root}/dist/`)
      .replace("new URL('../../../metalui/', import.meta.url)", `new URL(${JSON.stringify(pathToFileURL(snapshot + '/').href)})`)
      .replace("new URL('../../../metalui/tokens/tokens.json', import.meta.url)", `new URL(${JSON.stringify(pathToFileURL(resolve(snapshot, 'tokens/tokens.json')).href)})`);
    writeFileSync(resolve(configDirectory, file), text);
  }
  const config = resolve(configDirectory, 'all.config.ts'), cache = resolve(root, 'cache');
  writeFileSync(config, "import config from './imitation.config.ts';\nimport { habits } from './layer5-habits.ts';\nexport default { ...config, habits };\n");
  rmSync(cache, { recursive: true, force: true });
  const env = { ...process.env, PLUMB_CACHE_DIR: cache }, worker = resolve(root, 'measure.mjs');
  writeFileSync(worker, `import { check } from './dist/index.js';
const report = await check({ root: process.argv[2], config: process.argv[3] });
console.log(JSON.stringify({ timing: report.timing, moduleGraph: report.moduleGraph }));\n`);
  const runs = [];
  for (let index = 0; index < 2; index++) {
    const start = performance.now();
    const result = command(process.execPath, [worker, snapshot, config], { env });
    runs.push({ wallMs: performance.now() - start, ...JSON.parse(result.stdout) });
  }
  const receipt = { ref, runs };
  writeFileSync(resolve(root, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
  console.log(JSON.stringify(receipt));
}
