import { cacheDirectory, statePath } from './paths.js';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { deserialize, serialize } from 'node:v8';
import { fileURLToPath } from 'node:url';
import { glob, globSync } from 'tinyglobby';
import { ResolverFactory } from 'oxc-resolver';
import { componentFiles, fileHash } from './ownership/cache.js';
import { tailwindGraph } from './lower/tailwind.js';
import { ignore } from './project.js';
import type { CheckOptions } from './index.js';
import type { Report } from './report.js';
import { hasUntrackedPresetInputs } from './presets/index.js';

// Complete-result reuse is deliberately limited to literal CSS-only configs.
// Executable configs, presets, plugins and git-scoped reports keep the normal
// pipeline. Fresh source bytes, membership and import resolution are proof;
// Content hashes are retained behind inode/size/mtime/ctime identities.
// A changed identity rechecks bytes, including saves that preserve mtime.
interface Receipt {
  generation: string;
  inventory: string[];
  files: [string, string | null][];
  stamps: [string, string | null][];
  directories: [string, string[]][];
  resolutions: [string, string, string | null, 'classes' | 'components' | 'modules' | 'contexts'][];
  compiler: { entry: string; hash: string };
}
const stamp = (file: string): string | null => {
  try { const info = statSync(file, { bigint: true }); return `${info.dev}:${info.ino}:${info.size}:${info.mtimeNs}:${info.ctimeNs}`; } catch { return null; }
};
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const sourceFile = /\.(?:[cm]?[jt]sx?|css|jsonl?)$/;
const codeDirectory = dirname(fileURLToPath(import.meta.url));
const buildHash = hash(globSync('**/*.js', { cwd: codeDirectory, absolute: true }).sort().map(file => readFileSync(file, 'utf8')).join('\0'));
const codeOnly = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').trim();

export class CheckCache {
  private generation?: string;
  private constructor(readonly root: string, private directory: string, private config: string, private css: string) {}
  static async create(options: CheckOptions): Promise<CheckCache | undefined> {
    if (options.base !== undefined || options.changed || options.strictLedger || options.ledger === false || options.listHabits || options.suggestImitation) return;
    const root = resolve(options.root ?? process.cwd());
    const config = options.config ? resolve(root, options.config) : undefined;
    if (!config) return;
    let text: string;
    try { text = codeOnly(await readFile(config, 'utf8')); } catch { return; }
    const literal = /^export\s+default\s*\{\s*css\s*:\s*(['"])([^'"\r\n]+)\1\s*,?\s*\}\s*;?$/.exec(text);
    if (!literal) return;
    // A literal project config can still autoload executable package presets.
    // Discover those afresh before admitting a complete-result cache hit.
    if (await hasUntrackedPresetInputs(root)) return;
    const css = resolve(root, literal[2]!);
    let graph: Awaited<ReturnType<typeof tailwindGraph>>;
    try { graph = await tailwindGraph(css); } catch { return; }
    // Module plugins/configs can read arbitrary runtime inputs.
    if (graph.files.some(file => !file.endsWith('.css'))) return;
    const base = cacheDirectory(root);
    // Package metadata determines the reported compiler version even when
    // every stylesheet byte stays the same. Resolve it afresh at admission.
    let compilerPackage: string | undefined;
    try { compilerPackage = createRequire(css).resolve('tailwindcss/package.json'); } catch { /* Plain CSS can have no Tailwind package. */ }
    const key = hash(JSON.stringify(['checked-v3', buildHash, process.versions.v8, root, config, text, !!options.verbose,
      compilerPackage, compilerPackage ? fileHash(compilerPackage) : null]));
    return new CheckCache(root, join(base, 'checked', key), config, css);
  }
  private async inventory(): Promise<string[]> {
    return (await glob('**/*', { cwd: this.root, absolute: true, dot: true, followSymbolicLinks: false, ignore: [...ignore, '**/.plumb-cache/**', '**/.plumber/cache/**', '**/.plumb/cache/**', '**/.cache/**'] })).sort();
  }
  async snapshot(): Promise<Map<string, string | null>> {
    const files = await this.inventory();
    return new Map(files.filter(file => sourceFile.test(file)).map(file => [file, fileHash(file)]));
  }
  private resolver(kind: Receipt['resolutions'][number][3]): ResolverFactory {
    if (kind === 'contexts') return new ResolverFactory({ tsconfig: 'auto', resolveToContext: true });
    const base = { tsconfig: 'auto' as const, extensions: ['.tsx', '.ts', '.jsx', '.js', '.mts', '.mjs', '.cts', '.cjs'],
      extensionAlias: { '.js': ['.ts', '.tsx', '.js'], '.mjs': ['.mts', '.mjs'], '.cjs': ['.cts', '.cjs'] }, conditionNames: ['import', 'browser', 'default'], mainFields: ['browser', 'module', 'main'] };
    if (kind === 'classes') return new ResolverFactory({ tsconfig: 'auto', extensions: ['.tsx', '.ts', '.jsx', '.js'], extensionAlias: { '.js': ['.ts', '.tsx', '.js'] }, conditionNames: ['import', 'node', 'default'] });
    return new ResolverFactory(kind === 'modules' ? { ...base, aliasFields: ['browser'], builtinModules: true } : base);
  }
  async hit(): Promise<boolean> {
    let receipt: Receipt;
    try { receipt = JSON.parse(await readFile(join(this.directory, 'inputs.json'), 'utf8')); } catch { return false; }
    if (JSON.stringify(await this.inventory()) !== JSON.stringify(receipt.inventory)) return false;
    const stamps = new Map(receipt.stamps);
    if (receipt.files.some(([file, previous]) => stamp(file) !== stamps.get(file) && fileHash(file) !== previous)) return false;
    if (receipt.directories.some(([directory, previous]) => JSON.stringify(componentFiles(directory)) !== JSON.stringify(previous))) return false;
    const resolvers = new Map<Receipt['resolutions'][number][3], ResolverFactory>();
    for (const [file, specifier, previous, kind] of receipt.resolutions) {
      let resolver = resolvers.get(kind);
      if (!resolver) { resolver = this.resolver(kind); resolvers.set(kind, resolver); }
      if ((resolver.resolveFileSync(file, specifier).path ?? null) !== previous) return false;
    }
    try { if ((await tailwindGraph(receipt.compiler.entry)).hash !== receipt.compiler.hash) return false; } catch { return false; }
    this.generation = receipt.generation;
    return existsSync(join(this.directory, `${receipt.generation}.v8`)) && existsSync(join(this.directory, `${receipt.generation}.json`)) && existsSync(join(this.directory, `${receipt.generation}.status.json`));
  }
  get jsonPath(): string { return join(this.directory, `${this.generation}.json`); }
  async report(): Promise<Report> { return deserialize(await readFile(join(this.directory, `${this.generation}.v8`))) as Report; }
  async save(report: Report, before: Map<string, string | null>): Promise<void> {
    const inventory = await this.inventory();
    const after = new Map(inventory.filter(file => sourceFile.test(file)).map(file => [file, fileHash(file)]));
    if (JSON.stringify([...before]) !== JSON.stringify([...after])) return;
    after.set(this.config, fileHash(this.config));
    const directories: Receipt['directories'] = [], resolutions: Receipt['resolutions'] = [];
    const base = resolve(this.directory, '../..');
    const moduleResolver = this.resolver('modules');
    // Phase receipts already record independently changing imported evidence.
    // Copy their validation inputs, never trust their cached analysis at a hit.
    for (const kind of ['sources', 'components', 'modules'] as const) {
      for (const file of await glob(kind === 'modules' ? '*.json' : '*.v8', { cwd: join(base, kind), absolute: true })) {
        const data = kind === 'modules' ? JSON.parse(await readFile(file, 'utf8')) : deserialize(await readFile(file));
        if (kind === 'modules') {
          for (const [source, module] of Object.entries(data) as [string, { imports: { specifier: string }[]; resolved: (string | null)[]; mtimeMs: number; size: number }][]) {
            if (!after.has(source)) after.set(source, fileHash(source));
            // Cached module records retain source-path spelling; resolve anew
            // when taking the receipt so symlink canonicalization stays exact.
            const resolver = moduleResolver;
            for (const edge of module.imports) {
              const specifier = edge.specifier.replace(/[?#].*$/, '');
              const target = resolver.resolveFileSync(source, specifier).path ?? null;
              resolutions.push([source, specifier, target, 'modules']);
              if (target && !after.has(target)) after.set(target, fileHash(target));
            }
          }
        } else {
          const inputs = (kind === 'sources' ? data.dependencies : data.files) as Receipt['files'];
          // Older phase receipts remain on disk after an edit. Only current
          // evidence belongs in this result's receipt; a stale entry must not
          // prevent the new result from becoming reusable.
          if (inputs.some(([input, previous]) => fileHash(input) !== previous)) continue;
          for (const [input, previous] of inputs) after.set(input, previous);
          if (kind === 'sources') for (const [source, edges] of data.data.modules as [string, { specifier: string }[]][]) for (const edge of edges) {
            const specifier = edge.specifier.replace(/[?#].*$/, '');
            const target = moduleResolver.resolveFileSync(source, specifier).path ?? null;
            resolutions.push([source, specifier, target, 'modules']);
            if (target && !after.has(target)) after.set(target, fileHash(target));
          }
          for (const [key, previous] of data.resolutions as [string, string | null][]) {
            const [source, specifier] = key.split('\0');
            resolutions.push([source!, specifier!, previous ?? null, kind === 'sources' ? 'classes' : 'components']);
          }
          if (kind === 'components') {
            directories.push(...data.directories);
            for (const [key, previous] of data.contexts as [string, string | null][]) {
              const [source, specifier] = key.split('\0'); resolutions.push([source!, specifier!, previous ?? null, 'contexts']);
            }
          }
        }
      }
    }
    for (const sheet of report.stylesheets) after.set(sheet.file, fileHash(sheet.file));
    const uniqueResolutions = new Map<string, Receipt['resolutions'][number]>();
    for (const edge of resolutions) {
      const key = JSON.stringify([edge[0], edge[1], edge[3]]), previous = uniqueResolutions.get(key);
      if (previous && previous[2] !== edge[2]) return;
      uniqueResolutions.set(key, edge);
    }
    const compiler = { entry: this.css, hash: (await tailwindGraph(this.css)).hash };
    // Ledger diagnostics and allowances are part of this result, too.
    const ledger = statePath(this.root, 'ledger.jsonl'); after.set(ledger, fileHash(ledger));
    const stamps: Receipt['stamps'] = [];
    for (const [file, previous] of after) {
      const current = stamp(file);
      if (fileHash(file) !== previous || stamp(file) !== current) return;
      stamps.push([file, current]);
    }
    const inputs = { inventory, files: [...after], stamps, directories, resolutions: [...uniqueResolutions.values()], compiler };
    const generation = hash(JSON.stringify(inputs));
    const receipt: Receipt = { generation, ...inputs };
    const temporary = `${this.directory}.${process.pid}.tmp`;
    await mkdir(temporary, { recursive: true }); await mkdir(this.directory, { recursive: true });
    await writeFile(join(temporary, 'report.v8'), serialize(report));
    // Timing is supplied by the current caller; reuse the expensive evidence
    // serialization rather than traversing hundreds of thousands of rows.
    const { timing: _timing, ...evidence } = report;
    evidence.moduleGraph = { ...report.moduleGraph, cacheHits: report.moduleGraph.followed, cacheMisses: 0, parseMs: 0, totalMs: 0 };
    await writeFile(join(temporary, 'report.json'), JSON.stringify(evidence).slice(0, -1));
    const timing = { ...report.timing, phases: Object.fromEntries(Object.keys(report.timing.phases).map(name => [name, 0])), cacheHits: report.classes.unique, cacheMisses: 0 };
    await writeFile(join(temporary, 'status.json'), JSON.stringify({ exit: report.findings.some(finding => finding.severity === 'error') ? 1 : 0, timing }));
    await writeFile(join(temporary, 'inputs.json'), JSON.stringify(receipt));
    await rename(join(temporary, 'report.v8'), join(this.directory, `${generation}.v8`));
    await rename(join(temporary, 'report.json'), join(this.directory, `${generation}.json`));
    await rename(join(temporary, 'status.json'), join(this.directory, `${generation}.status.json`));
    await rename(join(temporary, 'inputs.json'), join(this.directory, 'inputs.json'));
    await rm(temporary, { recursive: true, force: true });
  }
}
