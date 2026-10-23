import { allConfigNames, cacheDirectory, statePath } from './paths.js';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { deserialize, serialize } from 'node:v8';
import { fileURLToPath } from 'node:url';
import { glob, globSync } from 'tinyglobby';
import { ResolverFactory } from 'oxc-resolver';
import { componentFiles, fileHash } from './ownership/cache.js';
import { tailwindGraph } from './lower/tailwind.js';
import { discoverProject, ignore } from './project.js';
import { dataConfig } from './data-config.js';
import type { CheckOptions } from './index.js';
import type { Report } from './report.js';
import { hasUntrackedPresetInputs } from './presets/index.js';
import { profileProgress } from './profile.js';

// Complete-result reuse accepts data-only default exports.
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
  compiler: { entry: string; hash: string } | null;
}
const stamp = (file: string): string | null => {
  try { const info = statSync(file, { bigint: true }); return `${info.dev}:${info.ino}:${info.size}:${info.mtimeNs}:${info.ctimeNs}`; } catch { return null; }
};
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const sourceFile = /\.(?:[cm]?[jt]sx?|css|jsonl?)$/;
const codeDirectory = dirname(fileURLToPath(import.meta.url));
const buildHash = hash(globSync('**/*.js', { cwd: codeDirectory, absolute: true }).sort().map(file => readFileSync(file, 'utf8')).join('\0'));


export class CheckCache {
  private generation?: string;
  private selected = new Set<string>();
  private constructor(readonly root: string, private directory: string, private config: string, private css: string | null, private patterns: string[]) {}
  static async create(options: CheckOptions): Promise<CheckCache | undefined> {
    if (options.base !== undefined || options.changed || options.strictLedger || options.ledger === false || options.listHabits || options.suggestImitation) return;
    const root = resolve(options.root ?? process.cwd());
    const config = options.config ? resolve(root, options.config) : allConfigNames.map(name => join(root, name)).find(existsSync);
    if (!config) return;
    const literal = await dataConfig(config);
    if (!literal) return;
    const { text, value } = literal;
    // Data may reference executable package presets. Keep those on the normal
    // path, including explicit module selections not present in package.json.
    const selections = value.presets;
    if (selections && (Array.isArray(selections) ? selections.some(item => typeof item === 'string') : Object.values(selections).some(item => item === true || typeof item === 'string'))) return;
    if (await hasUntrackedPresetInputs(root)) return;
    let css: string | null;
    try {
      css = (await discoverProject(root, value)).tailwind.entry;
      if (css && (await tailwindGraph(css)).files.some(file => !file.endsWith('.css'))) return;
    } catch { return; }
    // Track membership and bytes for data-selected inputs outside the root too.
    const patterns: string[] = [];
    const inputs = (entry: unknown, key = ''): void => {
      if (typeof entry === 'string' && ['source', 'from', 'exported'].includes(key) && !entry.startsWith('theme:')) patterns.push(entry.replace(/^(?:css|dtcg):/, '').split('#')[0]!);
      else if (Array.isArray(entry)) entry.forEach(item => inputs(item, key));
      else if (entry && typeof entry === 'object') Object.entries(entry).forEach(([name, item]) => inputs(item, name));
    };
    inputs(value);
    const base = cacheDirectory(root);
    // Package metadata determines the reported compiler version even when
    // every stylesheet byte stays the same. Resolve it afresh at admission.
    let compilerPackage: string | undefined;
    try { compilerPackage = createRequire(css ?? join(root, 'package.json')).resolve('tailwindcss/package.json'); } catch { /* Plain CSS can have no Tailwind package. */ }
    const key = hash(JSON.stringify(['checked-v3', buildHash, process.versions.v8, root, config, text, !!options.verbose,
      compilerPackage, compilerPackage ? fileHash(compilerPackage) : null]));
    return new CheckCache(root, join(base, 'checked', key), config, css, patterns);
  }
  private async inventory(): Promise<string[]> {
    const options = { cwd: this.root, absolute: true, dot: true, followSymbolicLinks: false, ignore: [...ignore, '**/.plumb-cache/**', '**/.plumber/cache/**', '**/.plumb/cache/**', '**/.cache/**'] };
    this.selected = new Set(await glob(this.patterns, options));
    return [...new Set([...await glob('**/*', options), ...this.selected])].sort();
  }
  async snapshot(): Promise<Map<string, string | null>> {
    const files = await this.inventory();
    return new Map(files.filter(file => sourceFile.test(file) || this.selected.has(file)).map(file => [file, fileHash(file)]));
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
    try { if (receipt.compiler && (await tailwindGraph(receipt.compiler.entry)).hash !== receipt.compiler.hash) return false; } catch { return false; }
    this.generation = receipt.generation;
    return existsSync(join(this.directory, `${receipt.generation}.v8`)) && existsSync(join(this.directory, `${receipt.generation}.json`)) && existsSync(join(this.directory, `${receipt.generation}.status.json`));
  }
  get jsonPath(): string { return join(this.directory, `${this.generation}.json`); }
  async report(): Promise<Report> { return deserialize(await readFile(join(this.directory, `${this.generation}.v8`))) as Report; }
  async save(report: Report, before: Map<string, string | null>): Promise<void> {
    profileProgress('phase:cache-inventory');
    const inventory = await this.inventory();
    const after = new Map(inventory.filter(file => sourceFile.test(file) || this.selected.has(file)).map(file => [file, fileHash(file)]));
    if (JSON.stringify([...before]) !== JSON.stringify([...after])) return;
    after.set(this.config, fileHash(this.config));
    const directories: Receipt['directories'] = [], resolutions: Receipt['resolutions'] = [];
    const base = resolve(this.directory, '../..');
    const moduleResolver = this.resolver('modules');
    // Phase receipts already record independently changing imported evidence.
    // Copy their validation inputs, never trust their cached analysis at a hit.
    for (const kind of ['sources', 'components', 'modules'] as const) {
      profileProgress(`phase:cache-${kind}`);
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
    const compiler = this.css ? { entry: this.css, hash: (await tailwindGraph(this.css)).hash } : null;
    // Ledger diagnostics and allowances are part of this result, too.
    const ledger = statePath(this.root, 'ledger.jsonl'); after.set(ledger, fileHash(ledger));
    const stamps: Receipt['stamps'] = [];
    profileProgress('phase:cache-stamps');
    for (const [file, previous] of after) {
      if (stamps.length % 32 === 0) profileProgress('phase:cache-stamps', { current: stamps.length, total: after.size });
      const current = stamp(file);
      if (fileHash(file) !== previous || stamp(file) !== current) return;
      stamps.push([file, current]);
    }
    profileProgress('phase:cache-stamps', { current: stamps.length, total: after.size });
    const inputs = { inventory, files: [...after], stamps, directories, resolutions: [...uniqueResolutions.values()], compiler };
    const generation = hash(JSON.stringify(inputs));
    const receipt: Receipt = { generation, ...inputs };
    await mkdir(this.directory, { recursive: true });
    const temporary = await mkdtemp(`${this.directory}.tmp-`);
    try {
      profileProgress('phase:cache-binary');
      await writeFile(join(temporary, 'report.v8'), serialize(report));
      // Timing is supplied by the current caller; reuse the expensive evidence
      // serialization rather than traversing hundreds of thousands of rows.
      const { timing: _timing, ...evidence } = report;
      evidence.moduleGraph = { ...report.moduleGraph, cacheHits: report.moduleGraph.followed, cacheMisses: 0, parseMs: 0, totalMs: 0 };
      profileProgress('phase:cache-json');
      const json = JSON.stringify(evidence).slice(0, -1);
      profileProgress('phase:cache-json-write');
      await writeFile(join(temporary, 'report.json'), json);
      profileProgress('phase:cache-publish');
      const timing = { ...report.timing, phases: Object.fromEntries(Object.keys(report.timing.phases).map(name => [name, 0])), cacheHits: report.classes.unique, cacheMisses: 0 };
      await writeFile(join(temporary, 'status.json'), JSON.stringify({ exit: report.findings.some(finding => finding.severity === 'error') ? 1 : 0, timing }));
      await writeFile(join(temporary, 'inputs.json'), JSON.stringify(receipt));
      await rename(join(temporary, 'report.v8'), join(this.directory, `${generation}.v8`));
      await rename(join(temporary, 'report.json'), join(this.directory, `${generation}.json`));
      await rename(join(temporary, 'status.json'), join(this.directory, `${generation}.status.json`));
      await rename(join(temporary, 'inputs.json'), join(this.directory, 'inputs.json'));
    } finally { await rm(temporary, { recursive: true, force: true }); }
  }
}
