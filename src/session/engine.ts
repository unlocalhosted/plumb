import { environment, stateDirectory, statePath, configurationNames, isLedgerPath, cacheDirectory, ignoreCache } from '../paths.js';
import { constants, readFileSync, watch } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { ChangeLog, byLine, locate } from './changes.js';
import type { ChangeRecord, TraceEntry } from './changes.js';
import type { FSWatcher } from 'node:fs';
import { stat, lstat, readdir, readFile, realpath, open } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { Worker } from 'node:worker_threads';
import { EventEmitter } from 'node:events';
import { glob, isDynamicPattern } from 'tinyglobby';
import type { CheckOptions } from '../index.js';
import type { Report } from '../report.js';
import { drawn } from '../report.js';
import type { TryOptions } from '../try.js';
import { errorMessage, UsageError } from '../errors.js';
import { ledgerCommand } from '../ledger/commands.js';
import { findingGroups } from '../ledger/keys.js';
import { ledgerPath } from '../ledger/store.js';
import { sourceHash } from '../collect/cache.js';
import { matchesPath } from '../collect/pattern.js';
import { lineStarts, sourceSite } from '../collect/source.js';
import { parseSync } from 'oxc-parser';
import type { ClassTraceLimit } from '../collect/computed.js';
import type { StructuredEdit, RefusedSite } from '../surfaces/edits.js';
import { isComponentJSX, jsxLocation, jsxAuthoredOwner, positionKind, sourcePaths } from './source-location.js';
import type { PositionKind } from './source-location.js';
import { elementProps, setJsxProp, setProp, swapClasses } from './props.js';
import { classSites, pinWrite, pinnedString } from './class-site.js';
import type { Located, ModuleFacts, PinWrite } from './class-site.js';
import { projectModules } from './modules.js';
import type { ClassString } from './props.js';
import type { ClassSiteAnswer } from './class-site.js';
import type { SpacingUnit } from './props.js';
import { ancestorWith, indexSource } from '../structure/index.js';
import type { StructureEntry } from '../structure/index.js';
import type { Props, RoleOverrides } from './props.js';
import type { ProjectSpec } from '../craft-spec.js';
import { readText, textSites } from './text.js';
import { addTokens, topBlocks } from '../onboarding/write.js';
import { loadConfig } from '../config.js';
import { isTypeProp, proposeTypeRoles, px } from '../rules/type-roles.js';
import { renameInText, validRenameMap } from '../rules/colour-rename.js';
import type { RoleOverride, TypeBundle, TypeClass, TypeMember, TypeProposal } from '../rules/type-roles.js';
import { classEdit } from '../messages.js';
import { useFor } from '../rules/provenance.js';
import { atSite } from '../surfaces/sites.js';
import { resolveTextAt, textTargets } from './text-at.js';
import type { TextAtResult } from './text-at.js';
import { containsPath, ownSourcePath, sourceBoundary, sourcePath } from '../source-boundary.js';
import { forgetProjectFacts } from '../project-facts/index.js';
import { encodeJSXText, encodeTextLiteral, textWriteErrors } from './text-encoding.js';
import type { TextResult } from './text.js';
import { tracedWrites } from './methods.js';
import { projectCensus } from '../census.js';
import type { CensusIcon } from '../census.js';
import { installedIconSets } from './icon-sets.js';
import type { InstalledIconSet } from './icon-sets.js';
import { indexProject } from '../recipes/project.js';
import type { ProjectIndex } from '../recipes/project.js';
import { recipesPlan, recipesPreview, recipesView } from '../recipes/service.js';
import type { PlanParams, RecipeContext } from '../recipes/service.js';
export type { TextRun, TextResult } from './text.js';

export interface SessionOptions extends CheckOptions { watch?: boolean; pollInterval?: number; polling?: boolean;
  /** Maximum wait before read execution, in milliseconds (default 5000). */
  readQueueMs?: number
}
export interface SiteResult { file: string; line: number; column?: number; declarations: Report['declarations']; findings: Report['findings'] }
export type ManyCall = { method: 'resolveSource'; args: Parameters<Session['resolveSource']> } | { method: 'site'; args: Parameters<Session['site']> } | { method: 'classes'; args: Parameters<Session['classes']> } | { method: 'structure'; args: Parameters<Session['structure']> };
export type ManyResult = { value: unknown } | { error: string; usage: boolean };
export interface EditsResult { revision: number; file: string; hash: string; edits: StructuredEdit[]; refused: RefusedSite[] }
export interface ClassesResult {
  revision: number; file: string; line: number; column: number;
  classes: { token: string; ambiguous: boolean; sites: (SiteResult & { column: number; hash: string; edits: StructuredEdit[] })[] }[];
  unattributed: string[];
  /** Rendered tokens whose attribution is incomplete because a hard limit stopped tracing. */
  limited: string[];
  /** Hard limits encountered during this trace; never includes elapsed time. */
  limits: ClassTraceLimit[];
}
export interface ApplyTextOptions { file: string; hash: string; run: string; from: string; to: string }
export interface ApplyTextAtOptions { file: string; hash: string; id: string; from: string; to: string }
export interface ApplyOptions { file: string; hash: string; edits: { id: string }[] }
/** Names one recorded write so it can be undone after the fact. */
export interface UndoHandle { id: string; file: string; label: string }
export interface AcceptOptions { rule: string; sites: { file: string; line: number; column: number; text: string }[]; why: string }
export interface AcceptResult { accepted: number }
/** One stamped element of a page: its stamp (file:line:column#hash), its tag, and its rendered classes when it has any. */
export interface PageItem { stamp: string; tag: string; classes?: string }
export interface PageEntry {
  stamp: string; tag: string; classes?: string;
  status: 'ready' | 'unplaced';
  file?: string; line?: number; column?: number; component?: string; usage?: true; outsideSource?: true;
  /** the reading at that JSX, as GET site answers it, less what only an opened finding needs (report.ts drawn):
   * its edits (asked for with `edits`) and its ledger keys */
  site?: Pick<SiteResult, 'declarations' | 'findings'>;
  /** the trace of the element's classes when the JSX declares none, as GET classes answers it */
  traced?: ClassesResult;
  /** served from the page cache: nothing was analysed for it */
  cached?: true;
}
export interface PageResult { revision: number; items: PageEntry[] }
/** One measured text element of a page: its stamp and tag, whether it sits in a list, and its computed type values. */
export interface CensusEntry { stamp: string; tag: string; list?: boolean; /** its own words are a figure (digits, signs, a mark, at most a two-letter unit) */ number?: boolean; /** it is, or sits inside, something you press, or a form label */ control?: boolean; /** its own words are a sentence (more than one word, ending in . ! or ?) */ sentence?: boolean; /** elements rendered from this stamp, when the census is already one per stamp */ elements?: number; computed?: { size?: number | null; lineHeight?: number | null; letterSpacing?: number | null; weight?: number | null; transform?: string | null } }
export interface SystemOptions { files?: string[]; census?: CensusEntry[]; /** "project": the ladder from every route's text (src/census.ts), the page's own census read over it */ scope?: 'page' | 'project'; /** the page's route, whose kept entries its own census replaces */ route?: string; exclude?: string[]; /** the owner's decisions per role, as config.system.type.roles, for a dry run */ roles?: Record<string, { size?: number; lineHeight?: number; letterSpacing?: number; weight?: number; compact?: { lineHeight: number } }> }
export type SystemWrite = { tokens: (TypeProposal['write']['tokens'][number] & { file: string; hash: string })[]; css: { file: string; hash: string; css: string }[]; swaps: (TypeProposal['write']['swaps'][number] & { hash: string })[] };
export interface SystemResult { revision: number; proposal: Omit<TypeProposal, 'write'> & { write: SystemWrite } }
export interface CssOptions { file: string; hash: string; css: string }
export interface PlacesResult { revision: number; files: { file: string; hash: string | null; findings: Report['findings']; declarations: Report['declarations'] }[] }
/** A whole cause: every place in the project with this class under this rule, each rewritten for the chosen token (its name as the finding lists it) or class. */
export interface Cause { rule: string; text: string; choice: string }
export type CauseSwap = { cause: Cause; file?: string };
/** What follows a new token once it is in the theme: its class at every place of a cause, or per-element swaps (a craft suggestion has no source rule). Neither is written when the token is refused. */
export type TokenThen = CauseSwap | { swaps: SwapsOptions[] };
export interface RenameOptions { /** old name → new name, without `--color-` */ map: Record<string, string> }
export interface RenameResult { revision: number; files: { file: string; ok: boolean; uses: number; error?: string }[]; uses: number; byName: Record<string, number>; undo: UndoHandle[]; labels: string[] }
export interface ApplyAllOptions { tokens?: (Omit<TokenOptions, 'then'> & { then?: TokenThen })[]; /** stylesheet blocks appended to the theme after the tokens (a type role's @utility) */ css?: CssOptions[]; swaps?: (SwapsOptions | CauseSwap)[]; accepts?: AcceptOptions[] }
export interface ApplyAllResult {
  results: {
    tokens: { name: string; ok: boolean; error?: string }[];
    css: { file: string; ok: boolean; written: boolean; error?: string }[];
    /** one entry per file; a whole cause carries the places it found in all, and the cause it answers */
    swaps: { file: string; ok: boolean; applied: string[]; refused: RefusedSwap[]; places?: number; cause?: Cause; /** the token this swap followed */ token?: string; error?: string }[];
    accepts: { rule: string; ok: boolean; accepted: number; error?: string }[];
  };
  undo: UndoHandle[];
  labels: string[];
}
export interface RefusedSwap { line: number; column: number; from: string; to: string; reason: string }
export interface ApplyResult { revision: number; file: string; hash: string; applied: string[]; remaining: Report['findings']; undo: UndoHandle; /** swaps: the places that could not be written, each with its reason; the others were. */ refused?: RefusedSwap[] }
export interface PropsResult extends Props { file: string; line: number; column: number; hash: string }
export interface SetOptions { file: string; hash: string; line: number; column: number; key: string; token: string; /** the string of the element's className to set it in, when the class is under a condition (a ternary's branch) */ at?: { line: number; column: number } }
/** One token's name, value and why as the theme may hold them: one declaration's worth of CSS, nothing that could end
 * the declaration, open or close a block, start a comment or leave a string open (topBlocks is the last guard). */
function checkToken(name: string, value: string, why: unknown): void {
  if (!/^--[a-z][a-z0-9-]*$/.test(name)) throw new UsageError('A token name is --family-name, in lowercase.');
  const clean = value.trim();
  if (!/^[^;{}<>\r\n\\]{1,160}$/.test(clean) || /\/\*|\*\//.test(clean) || (clean.split('"').length - 1) % 2 || (clean.split("'").length - 1) % 2) throw new UsageError('A token value is one CSS value, under 160 characters.');
  if (why !== undefined && (typeof why !== 'string' || /[\r\n*]/.test(why) || why.length > 120)) throw new UsageError('A token why is one short line.');
}
/** A write may never leave a source file that parses worse than it did: every writer's last guard. */
function parsesAsBefore(file: string, before: string, next: string): void {
  if (!/\.[cm]?[jt]sx?$/.test(file)) return;
  const errors = (text: string) => { try { return parseSync(file, text).errors.length; } catch { return Infinity; } };
  if (errors(next) > errors(before)) throw new UsageError('The change would leave the file unable to parse, so nothing was written.');
}

export interface PropEditOptions { file: string; hash: string; line: number; column: number; name: string; value: string | number | boolean }
/** What the source says an element is (docs/briefs/craft-hard-rules.md, structure). */
export interface StructureResult {
  file: string; line: number; column: number; hash: string;
  component: string; source: string | null; library: string | null; role: StructureEntry['role']; props: StructureEntry['props']; handlers: string[];
  /** For a tooltip: the provider whose delays it follows (the one above it in its file, else the project's only one). */
  provider?: { file: string; line: number; column: number; hash: string; component: string; library: string | null; props: StructureEntry['props'] };
}
/** GET class-site: where each class of an element is written, and the hash of every file a site is in. */
export interface ClassSiteResult extends ClassSiteAnswer { revision: number; file: string; hash: string; hashes: Record<string, string> }
/** A pinned string's element as class-site was asked about it: the element and its chain, when the string was reached
 * through the element's usages (a prop other than className at a usage, `styles.root`). Without it the string must be one
 * the written element reaches on its own. */
/** A usage above an element, as the overlay names it (class-site's chain). */
export interface ChainLink { file: string; line: number; column: number }
export interface PinOrigin { file: string; line: number; column: number; chain?: { file: string; line: number; column: number }[] }
export interface SwapsOptions { file: string; hash: string; edits: { line: number; column: number; from: string; to: string; /** the plain string the change is made in (class-site's string.line and string.column), when it is not the element's own */ at?: { line: number; column: number }; of?: PinOrigin }[] }
/** A new token for the theme (a craft suggestion of kind token), then the class that uses it (docs/briefs/craft-spec.md §4). */
export interface TokenOptions { file: string; hash: string; name: string; value: string; why?: string; then?: SwapOptions }
export interface TokenResult { revision: number; file: string; hash: string; applied: string[]; written: boolean; undo: UndoHandle | null; then?: ApplyResult }
/** Several tokens into one theme file as one guarded write: each token stands alone (already there → fine, clashes → its own refusal). */
export interface TokensOptions { file: string; hash: string; tokens: { name: string; value: string; why?: string }[] }
export interface TokensResult { revision: number; file: string; hash: string; applied: string[]; written: boolean; undo: UndoHandle | null; results: { name: string; ok: boolean; written: boolean; error?: string }[] }
export interface SwapOptions { file: string; hash: string; line: number; column: number; from: string; to: string; at?: { line: number; column: number }; of?: PinOrigin }
export interface UndoResult { revision: number; file: string; hash: string; undone: string; remaining: Report['findings'] }
export interface HistoryEntry { id: string; file: string; line: number; label: string; at: string; /** the file was changed outside React Plumber since this write, so it can't be undone */ stale?: true; /** a write made as one over several files (a recipe's theme and element): every file it changed */ files?: string[] }
/** One file write. Writes made as one are a batch (Session.batches): history lists them as one entry, undo takes them back together. */
interface Recorded extends Omit<HistoryEntry, 'files'> { path: string; before: string; hashAfter: string }
/** Writes made as one (a recipe's theme and element): its own id and label, and its members' ids, oldest first. */
interface Batch { label: string; members: string[] }
const historyLimit = 20;
/** What a caller tags a write with (POST body `trace`): a group several calls share, and anything to read back with each change. */
export interface TraceTag { group?: string; meta?: unknown }
export interface UndoChangesResult { revision: number; undone: string[]; undo: UndoHandle[]; files: Record<string, string> }
/** The writes a tag can follow: every change they record carries it. */
const shorten = (text: string) => { const one = text.replace(/\s+/g, ' ').trim(); return one.length > 40 ? one.slice(0, 39) + '…' : one; };
/** A label names only what changed: the words both sides share at the start and the end are left out. */
function changed(from: string, to: string, quote = '“”'): string {
  const a = from.split(/\s+/).filter(Boolean), b = to.split(/\s+/).filter(Boolean);
  let head = 0; while (head < a.length && head < b.length && a[head] === b[head]) head++;
  let tail = 0; while (tail < a.length - head && tail < b.length - head && a[a.length - 1 - tail] === b[b.length - 1 - tail]) tail++;
  const wrap = (words: string[]) => quote ? `${quote[0]}${shorten(words.join(' '))}${quote[1]}` : shorten(words.join(' ')) || '—';
  return `${wrap(a.slice(head, a.length - tail))} → ${wrap(b.slice(head, b.length - tail))}`;
}
export type SourceResolution = { file: string; line?: number; column?: number; hash?: string; component?: string; authoredOwner?: boolean; usage?: true } | { library: true; untracked?: string } | { refused: 'not-jsx'; at: PositionKind } | { refused: 'source-mismatch' };
const staleFile = 'The file changed since the overlay read it. Read it again.';
const ignored = ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**', '**/.next/**', '**/.cache/**', '**/.plumb-cache/**', '**/.plumber/cache/**', '**/.plumb/cache/**'];
const tracked = (file: string) => /\.(?:[cm]?[jt]sx?|css|json|jsonl)$/.test(file) && !/(?:^|\/)(?:node_modules|\.git|dist|build|\.next|\.cache|\.plumb-cache|\.plumber\/cache|\.plumb\/cache)(?:\/|$)/.test(file) && !/(?:^|\/)\.plumb(?:er)?\/serve\.json$/.test(file);
const ignoredDirectory = (file: string) => /(?:^|\/)(?:node_modules|\.git|dist|build|\.next|\.cache|\.plumb-cache|\.plumber\/cache|\.plumb\/cache)(?:\/|$)/.test(file);
const missing = (error: unknown) => ['ENOENT', 'ENOTDIR'].includes((error as NodeJS.ErrnoException).code ?? '');
/** The offset of a 1-based line and column in a text (a pinned string's `at`). */
function offsetOf(text: string, at: { line: number; column: number }): number {
  if (!Number.isSafeInteger(at.line) || !Number.isSafeInteger(at.column) || at.line < 1 || at.column < 1) throw new UsageError('at is { line, column }, both positive integers.');
  let offset = 0;
  for (let line = 1; line < at.line; line++) { const next = text.indexOf('\n', offset); if (next < 0) throw new UsageError('That line is past the end of the file.'); offset = next + 1; }
  // a column past the line's end would land on the next line
  const end = text.indexOf('\n', offset);
  if (offset + at.column - 1 > (end < 0 ? text.length : end)) throw new UsageError('That column is past the end of its line.');
  return offset + at.column - 1;
}

/** Owns one warm analysis worker and serializes changes with reads. */
export class Session extends EventEmitter {
  readonly root: string;
  private worker!: Worker;
  private pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();
  private id = 0;
  private hashes = new Map<string, string>();
  // the whole-page answers (page): one entry per stamp, tag and classes, good for one generation of changes (a theme
  // write or a ledger entry changes every reading, not only its own file's) and while the file it names keeps its hash
  private pageCache = new Map<string, { file: string; hash: string; generation: number; entry: PageEntry }>();
  private pageGeneration = 0;
  /** how many times the recipes' project index was built, for health: a dial drag must not build one per tick */
  private recipeIndexes = 0;
  private unitKept: { generation: number; value: SpacingUnit | null } | undefined;
  /** the recipes' view of the project (recipeContext), kept until a file or a generation of changes moves */
  private recipeProject: { generation: number; manifest: string; stats: Map<string, string>; texts: Map<string, string>; index: ProjectIndex } | undefined;
  private sourceTexts = new Map<string, string>();
  private dependencies = new Set<string>();
  private patterns: string[] = [];
  private sourceFiles = new Set<string>();
  private outsideSources = new Set<string>();
  private configurationFiles = new Set<string>();
  private inputs: string[] = [];
  private inputPatterns: string[] = [];
  private analysisInputs = new Set<string>();
  private queryDependencies = new Map<string, string[]>();
  private watchers: FSWatcher[] = [];
  private timer?: NodeJS.Timeout;
  private debounce?: NodeJS.Timeout;
  private closed = false;
  private refreshing: Promise<string[]> | undefined;
  private batchRead = false;
  private reconciliations = 0;
  private queue: Promise<unknown> = Promise.resolve();
  private failure: Error | undefined;
  private failurePaths: string[] = [];
  private stamps = new Map<string, string>();
  private directories = new Map<string, string | undefined>();
  private directoryFiles = new Map<string, Set<string>>();
  private directoryChildren = new Map<string, Set<string>>();
  private patternRoots = new Map<string, number>();
  private patternsDirty = true;
  private lastStats: unknown;
  private revision = 0;
  private written: Recorded[] = [];
  /** The batches of writes made as one, by their id: history, eviction and undo all read this one structure. */
  private batches = new Map<string, Batch>();
  private writes = 0;
  // per-change trace (changes.ts): the tag of the write in progress, the changes it takes back, this session's write ids
  private changeLog: ChangeLog | undefined;
  private get log(): ChangeLog { return this.changeLog ??= new ChangeLog(resolve(cacheDirectory(this.root), 'changes.jsonl')); }
  private tag: { group: string; meta?: unknown } | undefined;
  private undoing: ChangeRecord[] | undefined;
  private nonce = randomBytes(4).toString('hex');
  private native = false;
  private events = new Set<string>();
  private inventoryDirty = false;
  private patternFiles = new Set<string>();
  private constructor(private options: SessionOptions) { super(); this.root = resolve(options.root ?? process.cwd()); }
  static async create(options: SessionOptions = {}): Promise<Session> {
    if (options.watch === undefined && environment('WATCH') === '0') options = { ...options, watch: false };
    const session = new Session(options);
    ignoreCache(session.root);
    try {
      await session.start(); await session.scan(true);
      await session.request('inventory', { files: session.retainedFiles() });
      if (options.watch !== false) session.observe();
      return session;
    } catch (error) { await session.close(); throw error; }
  }
  private retainedFiles(): string[] {
    const files = new Set(this.hashes.keys());
    for (const entries of this.directoryFiles.values()) for (const file of entries) {
      // A listing can precede a concurrent deletion. File stats are authoritative
      // for tracked entries; never reintroduce a path they have already removed.
      if (!tracked(relative(this.root, file)) && !this.patternMatch(file) && !this.dependencies.has(file)) files.add(file);
    }
    return [...files];
  }
  private async start(): Promise<void> {
    if (this.closed) throw new UsageError('Session is closed. Start a new session.');
    const inventory = this.directories.size ? this.retainedFiles() : undefined;
    const worker = this.worker = new Worker(new URL('./worker.js', import.meta.url), { workerData: { ...this.options, root: this.root, inventory } });
    await new Promise<void>((resolveReady, rejectReady) => {
      this.worker.on('message', message => {
        if (message.health) this.healthSnapshot = message.health;
        if (message.ready) { this.dependencies.clear(); for (const file of message.dependencies) this.dependencies.add(file);
          this.patterns = message.patterns; this.patternsDirty = true; this.sourceFiles.clear(); for (const file of message.files) this.sourceFiles.add(file);
          this.configurationFiles.clear(); for (const file of message.configurationFiles) this.configurationFiles.add(file);
          this.inputs = message.inputs; this.inputPatterns = message.inputPatterns; this.selectAnalysisInputs(); this.queryDependencies.clear(); for (const [file, paths] of message.queryDependencies) this.queryDependencies.set(file, paths);
          resolveReady(); return; }
        const failure = (text: string): Error => {
          const error = message.usageError ? new UsageError(text) : new Error(text);
          if (message.errorStack) error.stack = message.errorStack;
          return error;
        };
        if (message.startupError) { rejectReady(failure(message.startupError)); return; }
        const pending = this.pending.get(message.id); if (!pending) return;
        this.pending.delete(message.id);
        if (message.analysis) {
          this.inputs = message.analysis.inputs;
          if (JSON.stringify(this.inputPatterns) !== JSON.stringify(message.analysis.inputPatterns)) {
            this.inputPatterns = message.analysis.inputPatterns; this.selectAnalysisInputs();
          }
          for (const path of message.analysis.dependencies) this.dependencies.add(path);
          for (const [file, paths] of message.analysis.queryDependencies) this.queryDependencies.set(file, paths);
        }
        if (message.judged) this.lastStats = { ...(this.lastStats as object ?? {}), judged: message.judged };
        if (message.error) pending.reject(failure(message.error)); else pending.resolve(message.result);
      });
      this.worker.on('error', error => { rejectReady(error); this.rejectPending(error); });
      worker.on('exit', code => { if (this.worker === worker && code !== 0) { const error = new Error(`Analysis worker exited with code ${code}.`); rejectReady(error); if (!this.closed) this.rejectPending(error); } });
    });
  }
  private rejectPending(error: Error): void { for (const p of this.pending.values()) p.reject(error); this.pending.clear(); }
  private request<T>(method: string, params: object = {}): Promise<T> {
    if (this.closed) return Promise.reject(new UsageError('Session is closed. Start a new session.'));
    const id = ++this.id;
    return new Promise<T>((resolveValue, reject) => { this.pending.set(id, { resolve: value => resolveValue(value as T), reject }); this.worker.postMessage({ id, method, params }); });
  }
  private serialize<T>(run: () => Promise<T>): Promise<T> {
    const next = this.queue.then(run); this.queue = next.catch(() => {}); return next;
  }
  private selectAnalysisInputs(): void {
    this.analysisInputs = new Set(this.inputPatterns.filter(pattern => !isDynamicPattern(pattern)));
    for (const file of this.patternFiles) if (this.inputPatterns.some(pattern => matchesPath(file, pattern))) this.analysisInputs.add(file);
  }
  private async inventory(): Promise<string[]> {
    const [sources, matches] = await Promise.all([
      glob('**/*.{tsx,jsx,ts,js,mjs,mts,cjs,cts,css,json,jsonl}', { cwd: this.root, absolute: true, dot: true, ignore: ignored, followSymbolicLinks: false }),
      this.patterns.length ? glob(this.patterns, { cwd: this.root, absolute: true, dot: true, followSymbolicLinks: false }) : [],
    ]);
    this.patternFiles.clear(); for (const file of matches) this.patternFiles.add(file);
    return [...new Set([...sources.filter(file => tracked(relative(this.root, file))), ...matches, ...this.dependencies])].sort();
  }
  private patternMatch(file: string): boolean {
    return this.patterns.some(pattern => matchesPath(file, pattern) || matchesPath(file, pattern + '/**'));
  }
  private recursiveDirectory(path: string): boolean {
    const inside = relative(this.root, path).replaceAll('\\', '/');
    if (!inside.startsWith('../') && inside !== '..' && !isAbsolute(inside) && !ignoredDirectory(inside)) return true;
    for (const [root, depth] of this.patternRoots) {
      const child = relative(root, path);
      if (child !== '..' && !child.startsWith('..' + sep) && !isAbsolute(child) && (!child || child.split(sep).length <= depth)) return true;
    }
    return false;
  }
  private async retainDirectory(path: string, paths: Set<string>): Promise<void> {
    if (this.directories.has(path)) return;
    this.directories.set(path, undefined);
    // Missing configured locations stay retained and are statted each read.
    await this.scanDirectory(path, paths);
  }
  private async scanDirectory(path: string, paths: Set<string>): Promise<void> {
    let info;
    try { info = await lstat(path); }
    catch (error) { if (!missing(error)) throw error; this.directories.set(path, undefined); this.directoryFiles.delete(path); this.directoryChildren.delete(path); return; }
    if (!info.isDirectory()) { this.directories.set(path, undefined); this.directoryFiles.delete(path); this.directoryChildren.delete(path); return; }
    const stamp = `${info.mtimeMs}:${info.ino}`;
    if (this.directories.get(path) === stamp) return;
    // Retain the stamp from BEFORE listing. A concurrent membership change
    // must leave a different stamp for the next read, never be acknowledged unseen.
    this.directories.set(path, stamp);
    let entries;
    try { entries = await readdir(path, { withFileTypes: true }); }
    catch (error) { this.directories.set(path, undefined); if (!missing(error)) throw error; return; }
    let files = this.directoryFiles.get(path);
    if (!files) this.directoryFiles.set(path, files = new Set());
    files.clear();
    let children = this.directoryChildren.get(path);
    if (!children) this.directoryChildren.set(path, children = new Set());
    children.clear();
    for (const entry of entries) {
      const file = resolve(path, entry.name);
      if (entry.isDirectory()) {
        children.add(file);
        if (this.recursiveDirectory(file)) await this.retainDirectory(file, paths);
      } else if (entry.isFile()) {
        files.add(file);
        const inside = relative(this.root, file).replaceAll('\\', '/');
        if (this.patternMatch(file)) { this.patternFiles.add(file); paths.add(file); }
        if (this.dependencies.has(file) || inside !== '..' && !inside.startsWith('../') && !isAbsolute(inside) && tracked(inside)) paths.add(file);
      }
    }
  }
  private async retainLocations(paths: Set<string>): Promise<void> {
    if (this.patternsDirty) {
      this.patternRoots.clear();
      for (const pattern of this.patterns) {
        const parts = pattern.split(sep), dynamic = parts.findIndex(part => isDynamicPattern(part));
        const root = dynamic < 0 ? dirname(pattern) : parts.slice(0, dynamic).join(sep) || sep;
        const depth = dynamic < 0 ? 0 : parts.slice(dynamic).some(part => part.includes('**')) ? Infinity : parts.length - dynamic - 1;
        this.patternRoots.set(root, Math.max(this.patternRoots.get(root) ?? 0, depth));
        // Literal patterns can name a directory, including one not created yet.
        if (dynamic < 0) this.patternRoots.set(pattern, Infinity);
      }
    }
    const locations = new Set([this.root, stateDirectory(this.root), ...this.patternRoots.keys(),
      ...[...this.dependencies, ...this.inputs, ...(this.options.config ? [resolve(this.root, this.options.config)] : [])].map(dirname)]);
    for (const path of locations) {
      await this.retainDirectory(path, paths);
    }
    // New configuration can match already-listed files without changing their
    // directory stamp. Match the retained names, never re-glob those locations.
    if (this.patternsDirty) {
      for (const children of this.directoryChildren.values()) for (const child of children) {
        if (this.recursiveDirectory(child)) await this.retainDirectory(child, paths);
      }
      for (const files of this.directoryFiles.values()) for (const file of files) {
        if (this.patternMatch(file)) { this.patternFiles.add(file); paths.add(file); }
      }
      this.patternsDirty = false;
    }
  }
  private async scan(initial = false, query?: string[], full = false): Promise<string[]> {
    if (this.closed) return [];
    const local = query !== undefined && !initial && !full;
    // Dependency closures are query inputs, not startup inventory. Expanding
    // and transferring every file's closure duplicates large shared graphs.
    // Ask the analysis worker for only the paths this reconciliation needs.
    const queryPaths = local ? await this.request<string[]>('queryDependencies', { files: query }) : [];
    const paths = new Set(local ? [...query, ...this.inputs, ...(this.options.config ? [resolve(this.root, this.options.config)] :
      configurationNames(this.root).map(name => resolve(this.root, name))), statePath(this.root, 'ledger.jsonl'),
      ...this.analysisInputs, ...queryPaths] :
      [...this.events, ...query ?? [], ...this.hashes.keys(), ...this.dependencies, ...this.inputs, ...this.patternFiles]);
    if (!local) this.events.clear();
    if (initial || full || !local && this.inventoryDirty) {
      for (const path of await this.inventory()) paths.add(path);
      this.inventoryDirty = false;
    }
    if (local) {
      // Check only target membership. Do not acknowledge directory changes that
      // a later full report still needs to enumerate. Events are never evidence.
      for (const directory of new Set(query.map(dirname))) {
        try { await lstat(directory); } catch (error) { if (!missing(error)) throw error; }
      }
    } else {
      await this.retainLocations(paths);
      for (const path of this.directories.keys()) await this.scanDirectory(path, paths);
    }
    const changed: string[] = [];
    // Full reports reconcile the inventory; targeted reads always stat their
    // known analysis inputs, equally with native, polling or disabled watchers.
    await Promise.all([...paths].map(async path => {
      const old = this.hashes.get(path), previousStamp = this.stamps.get(path);
      let hash: string | undefined;
      try {
        // Event/query paths bypass Dirent classification. Match the startup
        // inventory's followSymbolicLinks:false rule for source membership;
        // explicitly discovered dependencies may still follow their targets.
        const identity = await lstat(path);
        const info = identity.isSymbolicLink() && (this.dependencies.has(path) || this.inputs.includes(path)) ? await stat(path) : identity;
        if (info.isFile()) {
          const stamp = `${info.mtimeMs}:${info.ctimeMs}:${info.ino}:${info.size}`;
          if (previousStamp === stamp && old !== undefined) hash = old;
          else { const text = await readFile(path, 'utf8'); hash = sourceHash(text); if (/\.[cm]?[jt]sx?$/.test(path)) this.sourceTexts.set(path, text); }
          this.stamps.set(path, stamp);
        } else this.stamps.delete(path);
      } catch (error) {
        // Keep unreadable files in the inventory so collection can diagnose
        // them without aborting the Session's reconciliation.
        if (!missing(error)) hash = `<unreadable:${errorMessage(error)}>`;
        this.stamps.delete(path);
      }
      if (hash === undefined) { this.hashes.delete(path); this.sourceTexts.delete(path); this.patternFiles.delete(path); } else this.hashes.set(path, hash);
      if (hash !== old) changed.push(path);
    }));
    if (!local) this.selectAnalysisInputs();
    if (initial) return [];
    if (!changed.length) { if (this.failure) throw this.failure; return []; }
    const broad = changed.some(path => !isLedgerPath(path) && (this.configurationFiles.has(path) || !/\.(?:[jt]sx?|css)$/.test(path) || !this.sourceFiles.has(path) && !this.dependencies.has(path) || !this.hashes.has(path)));
    try {
      if (broad || this.failure) { await this.worker.terminate(); this.rejectPending(new Error('Session inputs changed.')); await this.start(); }
      else {
        const result = await this.request<{ dependencyDelta: string[]; dependencyQueries: [string, string[]][]; queryDependencies: [string, string[]][] }>('refresh', { paths: changed });
        for (const path of result.dependencyDelta) this.dependencies.add(path);
        for (const [file, paths] of result.dependencyQueries) this.queryDependencies.set(file, paths);
        this.lastStats = result;
      }
      if (!local) await this.retainLocations(new Set());
      this.failure = undefined; this.failurePaths = [];
      this.revision++; this.pageGeneration++; this.emit('change', changed);
    } catch (error) { this.failure = error as Error; this.failurePaths = changed; throw error; }
    return changed;
  }
  private observe(): void {
    if (!(this.options.polling ?? environment('POLLING') === '1')) {
      try {
        this.watchers.push(watch(this.root, { recursive: true }, (_event, file) => {
          const name = file === null ? undefined : String(file).replaceAll('\\', '/');
          const path = name === undefined ? undefined : resolve(this.root, name);
          if (name === undefined || path !== undefined && this.dependencies.has(path) || !/(?:^|\/)(?:node_modules|\.git|dist|build|\.next|\.cache|\.plumb-cache|\.plumber\/cache|\.plumb\/cache)(?:\/|$)/.test(name) && !/(?:^|\/)\.plumb(?:er)?\/serve\.json$/.test(name)) {
            if (path && (tracked(name!) || this.dependencies.has(path) || this.directories.has(path))) this.events.add(path);
            if (this.debounce) clearTimeout(this.debounce);
            this.debounce = setTimeout(() => { void this.refresh().catch(error => this.emit('diagnostic', error)); }, 5);
          }
        }));
        this.native = true;
        this.watchers[0]!.on('error', error => { this.native = false; this.inventoryDirty = true; this.watchers[0]?.close(); this.emit('diagnostic', error); });
      } catch { /* Polling below works on platforms without recursive fs.watch. */ }
    }
    this.timer = setInterval(() => { void this.refresh().catch(error => this.emit('diagnostic', error)); }, this.options.pollInterval ?? 250);
  }
  /** Files written inside a many-file write (a rename, its undo), reconciled once when it ends instead of one by one. */
  private deferred: Set<string> | null = null;
  private async settleWritten(path: string): Promise<void> { if (this.deferred) this.deferred.add(path); else await this.reconcile([path]); }
  /** One many-file write: the host holds hot updates until it ends (one page update, never a half-written page), and the
   * written files are reconciled together at the end. */
  private async manyFiles<T>(run: () => Promise<T>, end: (result: T | undefined) => object): Promise<T> {
    const outer = this.transaction;
    if (!outer) { this.emit('transaction', { phase: 'start' }); this.transaction = true; }
    this.deferred = new Set();
    let result: T | undefined;
    try { result = await run(); return result; }
    finally {
      const written = [...this.deferred]; this.deferred = null;
      if (written.length) await this.serialize(() => this.reconcile(written)).catch(() => {});
      if (!outer) { this.transaction = false; this.emit('transaction', { phase: 'end', ...end(result) }); }
    }
  }
  private async reconcile(query?: string[], full = false): Promise<string[]> {
    this.reconciliations++;
    const changed = new Set<string>();
    do {
      for (const path of await this.scan(false, query, full)) changed.add(path);
      full = false;
    } while (query === undefined && this.native && (this.inventoryDirty || this.events.size));
    return [...changed];
  }
  /** Reconcile retained stats; opt into a full inventory only for explicit recovery. */
  refresh(full = false): Promise<string[]> { if (!this.refreshing) { forgetProjectFacts(); this.refreshing = this.serialize(() => this.reconcile(undefined, full)).finally(() => { this.refreshing = undefined; }); } return this.refreshing; }
  private serializeRead<T>(run: () => Promise<T>): Promise<T> { return this.batchRead ? run() : this.serialize(run); }
  /** Coordinator holds the write barrier while one reconciliation serves this read cohort. */
  batch<T>(query: string[] | undefined, run: () => Promise<T>): Promise<T> {
    return this.serialize(async () => {
      await this.reconcile(query);
      this.batchRead = true;
      try { return await run(); } finally { this.batchRead = false; }
    });
  }
  private read<T>(method: string, params: object = {}): Promise<T> { return this.serializeRead(() => this.settledRead<T>(method, params)); }
  private async settledRead<T>(method: string, params: object): Promise<T> {
    do {
      const local = method === 'site' || method === 'why' || method === 'edits' || method === 'classes';
      const query = local ? [(params as { file: string }).file] : undefined;
      if (query) await this.readableSource(query[0]!);
      try { if (!this.batchRead) await this.reconcile(query); }
      catch (error) {
        const as = (params as { as?: string }).as, target = resolve(this.root, as ?? 'src/__plumb_try__.tsx');
        if (method !== 'try' || !this.sourceFiles.has(target) || !this.failurePaths.length || this.failurePaths.some(file => file !== target)) throw error;
        // A valid overlay can repair the sole invalid source for this read.
        // Keep the on-disk diagnostic and the retained project report unchanged.
      }
      const result = await this.request<T>(method, params);
      // Events received while the worker was answering belong to this read too.
      if (this.batchRead || local || !this.native || !this.inventoryDirty && !this.events.size) return result;
    } while (true);
  }
  report(options: Pick<CheckOptions, 'ledger' | 'base' | 'changed' | 'strictLedger' | 'verbose'> = {}): Promise<Report> { return this.read('report', options); }
  private async resolveFile(source: string, servedRoot?: string, stamped = false): Promise<string | SourceResolution> {
    const candidates = sourcePaths(this.root, source, servedRoot, stamped);
    // Fall back only when the served file is absent. Invalid or untracked
    // served evidence must never adopt a same-named repository file.
    let file = candidates[0]!;
    if (candidates.length > 1) for (const candidate of candidates) {
      try { await lstat(candidate); file = candidate; break; }
      catch (error) { if (!missing(error)) throw error; }
    }
    const inside = relative(this.root, file).replaceAll('\\', '/');
    if (!inside || ignoredDirectory(inside) || !/\.[cm]?[jt]sx?$/.test(file)) return { library: true };
    // Authored shared code is a source boundary, never permission to use an
    // ancestor's JSX. Classification does not read bytes outside the project.
    if (!containsPath(this.root, file) && (!containsPath(sourceBoundary(this.root), file) || !this.sourceFiles.has(file))) return { library: true, untracked: inside };
    // Classify before reading source: linked packages and symlinked directories
    // must never introduce external snapshots into this project's Session.
    try {
      if (await realpath(file) !== resolve(await realpath(this.root), inside)) return { library: true };
    } catch (error) {
      if (!missing(error)) throw error;
      return { library: true, untracked: inside };
    }
    return file;
  }
  /** Validate before reconciliation; untrusted source spellings cannot add disk snapshots. */
  async readQuery(method: string, args: unknown[]): Promise<string[] | undefined> {
    if (method === 'many') {
      const paths = new Set<string>();
      for (const call of args[0] as ManyCall[]) {
        const query = await this.readQuery(call.method, call.args);
        if (query === undefined) return undefined;
        for (const path of query) paths.add(path);
      }
      return [...paths];
    }
    if (method === 'resolveSource') {
      const expected = args[3] as { servedRoot?: string; stamp?: boolean } | undefined;
      const file = await this.resolveFile(args[0] as string, expected?.servedRoot, expected?.stamp);
      return typeof file === 'string' ? [file] : [];
    }
    if (method === 'places') {
      const files = (args[0] as string[]).map(file => this.file(file));
      for (const file of files) await this.readableSource(file).catch(() => {});
      return files.filter(file => this.sourceFiles.has(file));
    }
    if (['site', 'edits', 'text', 'textAt', 'why', 'classes', 'structure'].includes(method)) {
      const file = this.file(args[0] as string); this.position(args[1] as number);
      await this.readableSource(file);
      if (method === 'classes') this.validateClasses(args[3]);
      if (method === 'classes' || args[2] !== undefined) this.position(args[2] as number);
      return [file];
    }
    return undefined;
  }
  /**
   * The whole page in one answer: for every stamped element, where its stamp resolves and the reading there (and the
   * trace of its classes when the JSX declares none), computed the way the CLI and the Alt card compute them, in one
   * cohort. Cached by the file's content hash, so a second page costs no analysis and a changed file is never stale.
   * The count a page shows is then a function of its source, not of what was in view.
   */
  async page(items: PageItem[]): Promise<PageResult> {
    if (!Array.isArray(items) || items.length > 8192) throw new UsageError('A page is a list of at most 8192 stamped elements.');
    const parse = (item: PageItem) => {
      if (!item || typeof item.stamp !== 'string' || typeof item.tag !== 'string' || item.classes !== undefined && typeof item.classes !== 'string') throw new UsageError('Each element is { stamp, tag, classes? }.');
      const match = /^(.+):(\d+):(\d+)#([a-f0-9]{12})$/.exec(item.stamp);
      if (!match || item.classes && item.classes.length > 65536) throw new UsageError(`Not a stamp: ${item.stamp.slice(0, 80)}`);
      return { source: match[1]!, line: Number(match[2]), column: Number(match[3]), hash: match[4]! };
    };
    const keyOf = (item: PageItem) => `${item.stamp}\0${item.tag}\0${item.classes ?? ''}`;
    const unique = new Map<string, PageItem>();
    for (const item of items) { parse(item); if (!unique.has(keyOf(item))) unique.set(keyOf(item), item); }
    const answers = new Map<string, PageEntry>();
    const fresh: PageItem[] = [];
    for (const [key, item] of unique) {
      const hit = this.pageCache.get(key);
      if (hit && this.hashes.get(hit.file) === hit.hash && hit.generation === this.pageGeneration) answers.set(key, { ...hit.entry, cached: true });
      else fresh.push(item);
    }
    if (fresh.length) {
      // one cohort for where every stamp resolves, one for the readings: every item sees one revision
      const resolved = await this.many(fresh.map(item => { const at = parse(item); return { method: 'resolveSource' as const, args: [at.source, at.line, at.column, { hash: at.hash, tag: item.tag, stamp: true }] }; }));
      const reads: { key: string; item: PageItem; where: { file: string; line: number; column: number; component?: string; usage?: true } }[] = [];
      fresh.forEach((item, i) => {
        const answer = resolved[i]!;
        const where = 'value' in answer ? answer.value as SourceResolution : undefined;
        if (where && 'file' in where && where.line !== undefined && where.column !== undefined) { reads.push({ key: keyOf(item), item, where: { file: where.file, line: where.line, column: where.column, ...(where.component ? { component: where.component } : {}), ...(where.usage ? { usage: true as const } : {}) } }); return; }
        const untracked = where && 'library' in where ? where.untracked : undefined;
        answers.set(keyOf(item), { stamp: item.stamp, tag: item.tag, ...(item.classes !== undefined ? { classes: item.classes } : {}), status: 'unplaced', ...(untracked ? { outsideSource: true as const, file: untracked } : {}) });
      });
      const sites = await this.many(reads.map(({ where }) => ({ method: 'site' as const, args: [where.file, where.line, where.column] })));
      const traces = await this.many(reads.flatMap(({ item, where }, i) => {
        const site = sites[i]!; const value = 'value' in site ? site.value as SiteResult : undefined;
        return item.classes && value && !value.declarations.length ? [{ method: 'classes' as const, args: [where.file, where.line, where.column, item.classes] }] : [];
      }));
      let traceAt = 0;
      reads.forEach(({ key, item, where }, i) => {
        const site = sites[i]!;
        if (!('value' in site)) { answers.set(key, { stamp: item.stamp, tag: item.tag, ...(item.classes !== undefined ? { classes: item.classes } : {}), status: 'unplaced' }); return; }
        const value = site.value as SiteResult;
        const entry: PageEntry = { stamp: item.stamp, tag: item.tag, ...(item.classes !== undefined ? { classes: item.classes } : {}), status: 'ready', ...where, site: { declarations: value.declarations, findings: value.findings.map(drawn) } };
        if (item.classes && !value.declarations.length) { const trace = traces[traceAt++]!; if ('value' in trace) entry.traced = trace.value as ClassesResult; }
        answers.set(key, entry);
        const path = this.file(where.file), hash = this.hashes.get(path);
        // a trace still being read (pending) is not an answer to keep
        if (hash && (entry.traced as { status?: string } | undefined)?.status !== 'pending') this.pageCache.set(key, { file: path, hash, generation: this.pageGeneration, entry });
      });
      if (this.pageCache.size > 16384) for (const key of [...this.pageCache.keys()].slice(0, 4096)) this.pageCache.delete(key);
    }
    return { revision: this.revision, items: items.map(item => answers.get(keyOf(item))!) };
  }
  /** Several reads in one cohort: the overlay sends a view's worth of resolve and site questions as one request, so
   * the lock, the reconciliation and the round trip are paid once, not once per element. Each answer stands alone:
   * a refused question does not refuse the others. */
  many(calls: ManyCall[]): Promise<ManyResult[]> {
    return this.serializeRead(async () => {
      if (!this.batchRead) await this.reconcile(await this.readQuery('many', [calls]));
      const wasBatch = this.batchRead;
      this.batchRead = true;
      try {
        return await Promise.all(calls.map(async call => {
          try { return { value: await (this[call.method] as (...args: unknown[]) => Promise<unknown>)(...call.args) }; }
          catch (error) { return { error: errorMessage(error), usage: error instanceof UsageError }; }
        }));
      } finally { this.batchRead = wasBatch; }
    });
  }
  resolveSource(source: string, line?: number, column?: number, expected: { tag?: string; component?: boolean; hash?: string; snapshot?: boolean; owner?: boolean; servedRoot?: string; stamp?: boolean } = {}): Promise<SourceResolution> {
    return this.serializeRead(async () => {
      const classified = await this.resolveFile(source, expected.servedRoot, expected.stamp);
      if (typeof classified !== 'string') {
        if ('untracked' in classified && classified.untracked && this.outsideSources.size < 64) this.outsideSources.add(sourcePath(this.root, classified.untracked));
        return classified;
      }
      const file = classified, inside = relative(this.root, file).replaceAll('\\', '/');
      if (!this.batchRead) await this.reconcile([file]);
      if (!this.sourceFiles.has(file)) {
        if (this.outsideSources.size < 64) this.outsideSources.add(file);
        return { library: true, untracked: inside };
      }
      // Hash-bound browser evidence must compare with the file on disk, even
      // if a save races reconciliation or preserves the cached stat stamp.
      const text = expected.snapshot || expected.hash !== undefined ? await readFile(file, 'utf8') : this.sourceTexts.get(file) ?? await readFile(file, 'utf8');
      const hash = expected.snapshot || expected.hash !== undefined ? sourceHash(text) : this.hashes.get(file);
      if (expected.stamp) {
        const location = line === undefined || column === undefined ? undefined : jsxLocation(file, text, this.position(line), this.position(column), undefined, 'any');
        if (!location || location.line !== line || location.column !== column || !expected.tag ||
          !/^[a-f0-9]{12}$/.test(expected.hash ?? '') || !hash?.startsWith(expected.hash!) ||
          !isComponentJSX(location.tag) && location.tag !== expected.tag) return { refused: 'source-mismatch' };
        const usage = isComponentJSX(location.tag);
        if (location.tag === 'Fragment' || location.tag.endsWith('.Fragment')) return { refused: 'source-mismatch' };
        return { file: inside, line, column, hash, ...(usage ? { component: location.tag, usage: true as const } : {}) };
      }
      if (expected.hash !== undefined && expected.hash !== hash) throw new UsageError(staleFile);
      if (line === undefined && column === undefined) return { file: inside, ...(expected.snapshot ? { hash: hash! } : {}) };
      if (line === undefined || column === undefined) throw new UsageError('Source location requires both line and column.');
      const anyOpening = !expected.component && expected.tag === undefined;
      const location = jsxLocation(file, text, this.position(line), this.position(column), expected.tag, anyOpening ? 'any' : expected.component);
      if (!location) {
        if (anyOpening) return { refused: 'not-jsx', at: positionKind(file, text, this.position(line), this.position(column)) };
        throw new UsageError('Source position does not identify an authored JSX element.');
      }
      return { file: inside, line: location.line, column: location.column,
        ...(expected.owner ? { authoredOwner: jsxAuthoredOwner(file, text, location) } : {}),
        ...(expected.component || anyOpening && isComponentJSX(location.tag) ? { component: location.tag } : {}) };
    });
  }
  site(file: string, line: number, column?: number): Promise<SiteResult> {
    return this.read('site', { file: this.file(file), line: this.position(line), ...(column === undefined ? {} : { column: this.position(column) }) });
  }
  text(file: string, line: number, column: number): Promise<TextResult> {
    const path = this.file(file); this.position(line); this.position(column);
    return this.serializeRead(async () => {
      await this.readableSource(path);
      if (!this.batchRead) await this.reconcile([path]);
      if (!this.sourceFiles.has(path) || !/\.[cm]?[jt]sx?$/.test(path)) throw new UsageError('Text edits require a tracked JSX source file.');
      const source = await readFile(path, 'utf8');
      return readText(path, source, line, column);
    });
  }
  edits(file: string, line: number, column?: number): Promise<EditsResult> {
    const params = { file: this.file(file), line: this.position(line), ...(column === undefined ? {} : { column: this.position(column) }) };
    return this.serializeRead(async () => {
      const result = await this.settledRead<Omit<EditsResult, 'revision'>>('edits', params);
      if (result.hash !== this.hashes.get(params.file)) throw new UsageError(staleFile);
      return { revision: this.revision, ...result };
    });
  }
  private validateClasses(classes: unknown): void {
    if (typeof classes !== 'string' || classes.length > 65536) throw new UsageError('classes must be a string of at most 65536 characters.');
  }
  classes(file: string, line: number, column: number, classes: string): Promise<ClassesResult> {
    this.validateClasses(classes);
    const params = { file: this.file(file), line: this.position(line), column: this.position(column), classes };
    return this.serializeRead(async () => {
      const result = await this.settledRead<Omit<ClassesResult, 'revision'>>('classes', params);
      // Reconcile newly discovered helper paths too. Known cohort inputs were
      // already reconciled by batch, including their retained dependencies.
      const paths = [...new Set(result.classes.flatMap(item => item.sites.map(site => site.file)))].filter(path => !this.batchRead || !this.hashes.has(path));
      if (paths.length && (await this.reconcile(paths)).length) return { revision: this.revision, ...await this.settledRead<Omit<ClassesResult, 'revision'>>('classes', params) };
      return { revision: this.revision, ...result };
    });
  }
  applyText(options: ApplyTextOptions): Promise<ApplyResult> {
    const { file, hash, run: id, from, to } = options ?? {} as ApplyTextOptions;
    return this.writeText(file, hash, id, from, to, (_file, source) => {
      // Re-derive the run from the held file, never trust a client range or text.
      const site = textSites(_file, source).find(site => site.runs.some(run => run.id === id));
      const run = site?.runs.find(run => run.id === id);
      if (!site || !run) throw new UsageError(textWriteErrors.unknown);
      if (run.text !== from) throw new UsageError(textWriteErrors.mismatch);
      const start = run.literal?.start ?? run.start, end = run.literal?.end ?? run.end;
      return { start, end, at: site.element.openingElement.start,
        replacement: run.literal ? encodeTextLiteral(to, run.literal.quote) : encodeJSXText(source.slice(start, end), to) };
    });
  }
  /** Every property family an editor needs for the JSX element at this position, set or not. */
  async props(file: string, line: number, column: number, computed?: Record<string, string>): Promise<PropsResult> {
    const path = this.file(file); this.position(line); this.position(column);
    if (computed !== undefined && (!computed || typeof computed !== 'object' || Array.isArray(computed) || Object.values(computed).some(v => typeof v !== 'string'))) throw new UsageError('computed is an object of property → value strings.');
    const { text, location, site, decisions, unit } = await this.elementFacts(path, line, column);
    return { file: path, line: location.line, column: location.column, hash: sourceHash(text),
      ...elementProps(path, text, location.start, location.tag, decisions, site.declarations, { roles: await this.roleDecisions(), ...(unit ? { unit } : {}), ...(computed ? { computed } : {}) }) };
  }
  /**
   * Recipes (docs/briefs/recipe-engine.md): the shadows and motion this project already has, what the packs offer against
   * them, and what the element wears; then a preview of exactly what a recipe would write, and the write.
   */
  async recipes(file: string, line: number, column: number, chain: ChainLink[] = []): Promise<Record<string, unknown>> {
    return recipesView(await this.recipeContext(file, line, column, chain));
  }
  async recipesPreview(params: PlanParams & { file: string; line: number; column: number; chain?: ChainLink[] }): Promise<Record<string, unknown>> {
    return recipesPreview(await this.recipeContext(params.file, params.line, params.column, params.chain), params);
  }
  async recipesApply(params: PlanParams & { file: string; line: number; column: number; chain?: ChainLink[]; hash?: string; hashes?: Record<string, string> }): Promise<{ revision: number; applied: string[]; undo: UndoHandle[]; files: Record<string, string>; choice: string; verdict: unknown; nearest: unknown; notes: string[]; uses?: unknown }> {
    const context = await this.recipeContext(params.file, params.line, params.column, params.chain);
    if (params.hash !== undefined && sourceHash(context.element.text) !== params.hash) throw new UsageError(staleFile);
    const { plan, writes } = recipesPlan(context, params);
    if (!plan.ok) throw new UsageError(plan.refused ?? 'This recipe cannot be written here.');
    if (!writes.length) return { revision: this.revision, applied: [], undo: [], files: {}, choice: plan.choice, verdict: plan.verdict, nearest: plan.nearest, notes: plan.notes, ...(plan.uses ? { uses: plan.uses } : {}) };
    for (const w of writes) if (params.hashes?.[w.file] !== undefined && params.hashes[w.file] !== w.hash) throw new UsageError(staleFile);
    const done: UndoHandle[] = [], files: Record<string, string> = {};
    try {
      for (const w of writes) {
        const result = await this.rewrite(this.file(w.file), w.hash, w.after, `${w.role}: ${w.summary}`.slice(0, 120));
        done.push(result.undo); files[w.file] = result.hash;
      }
    } catch (error) {
      // nothing half done: the files already written go back as they were, and their history entries and trace go with them
      for (const handle of done.toReversed()) await this.undo(handle.id).catch(() => {});
      throw error;
    }
    // one recipe, one entry in the history and one undo, however many files it wrote
    const label = `${plan.choice} ${plan.uses?.class ?? plan.uses?.token ?? 'recipe'}`;
    return { revision: this.revision, applied: writes.map(w => `${w.role}:${w.file}`), undo: [this.asOneWrite(done, label)], files, choice: plan.choice, verdict: plan.verdict, nearest: plan.nearest, notes: plan.notes, ...(plan.uses ? { uses: plan.uses } : {}) };
  }
  /**
   * What the recipes know of the project: every css and code file read once, and the index built from them. It is kept while
   * nothing moved: the same files at the same size and modification time, the same generation of changes (every write the session
   * makes reconciles and counts one), and the element's file reading the same. A dial drag asks per tick; only the element's own
   * position is made fresh for each ask.
   */
  private async recipeContext(file: string, line: number, column: number, chain: ChainLink[] = []): Promise<RecipeContext> {
    if (!Array.isArray(chain) || chain.length > 32) throw new UsageError('chain is a list of at most 32 { file, line, column }.');
    const path = this.file(file); this.position(line); this.position(column);
    const { text, location } = await this.elementFacts(path, line, column);
    const found = await glob('**/*.{css,ts,tsx,js,jsx,mjs,mts}', { cwd: this.root, absolute: false, dot: false, followSymbolicLinks: false, ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.next/**', '**/*.d.ts', '**/*.min.*'] });
    const stats = new Map<string, string>();
    for (const rel of found.map(f => f.replaceAll('\\', '/')).sort().slice(0, 1500)) {
      const info = await stat(resolve(this.root, rel)).catch(() => undefined);
      if (info?.isFile() && info.size <= 300_000) stats.set(rel, `${info.size}:${info.mtimeMs}`);
    }
    const manifest = await stat(resolve(this.root, 'package.json')).then(info => `${info.size}:${info.mtimeMs}`, () => '');
    const relative_ = relative(this.root, path).replaceAll('\\', '/');
    const kept = this.recipeProject;
    const same = kept && kept.generation === this.pageGeneration && kept.manifest === manifest && kept.stats.size === stats.size && kept.texts.get(relative_) === text && [...stats].every(([rel, key]) => kept.stats.get(rel) === key);
    let project: NonNullable<typeof this.recipeProject>;
    if (same) project = kept;
    else {
      const texts = new Map<string, string>();
      for (const [rel, key] of stats) texts.set(rel, kept?.stats.get(rel) === key ? kept.texts.get(rel)! : await readFile(resolve(this.root, rel), 'utf8'));
      texts.set(relative_, text);
      let dependencies: Record<string, string> = {};
      try { const pkg = JSON.parse(await readFile(resolve(this.root, 'package.json'), 'utf8')) as Record<string, Record<string, string> | undefined>; dependencies = { ...pkg.dependencies, ...pkg.devDependencies }; } catch { /* no package.json */ }
      const spec = await this.request<ProjectSpec>('spec').catch(() => undefined);
      const index = indexProject({ files: [...texts].map(([p, t]) => ({ path: p, text: t })), dependencies, themeFile: spec?.tokens.file ?? null });
      this.recipeIndexes++;
      project = { generation: this.pageGeneration, manifest, stats, texts, index };
      // a project too large to keep read is read again each time rather than held
      this.recipeProject = [...texts.values()].reduce((n, t) => n + t.length, 0) <= 32_000_000 ? project : undefined;
    }
    // the usages above the element (as class-site takes them), read fresh: a class passed in is read, and written, there
    const links: { file: string; line: number; column: number }[] = [], fresh = new Map<string, string>([[relative_, text]]);
    for (const link of chain) {
      const linked = await this.sources()(link?.file, link?.line, link?.column), rel = relative(this.root, linked.path).replaceAll('\\', '/');
      if (!fresh.has(rel)) fresh.set(rel, linked.text);
      links.push({ file: rel, line: linked.line, column: linked.column });
    }
    const read = (p: string) => fresh.get(p) ?? project.texts.get(p);
    return { index: project.index, read, modules: this.modules('relative', p => read(p)), element: { file: relative_, text, start: location.start, tag: location.tag, line: location.line, column: location.column, ...(links.length ? { chain: links } : {}) } };
  }
  /** A whole file replaced with the text a plan made, under the same guards as every write: the hash it was read at, one
   * regular file, a result that still parses, one undo handle. */
  private async rewrite(path: string, hash: string, next: string, label: string, blocksRemoved = 0): Promise<{ hash: string; undo: UndoHandle }> {
    return this.serialize(async () => {
      const identity = await this.editableFile(path);
      const handle = await open(path, constants.O_RDWR | constants.O_NOFOLLOW);
      let before: string;
      try {
        const info = await handle.stat();
        if (!info.isFile() || info.nlink !== 1) throw new UsageError('Apply requires a regular source file without hard links.');
        if (info.dev !== identity.dev || info.ino !== identity.ino) throw new UsageError(staleFile);
        before = await readFile(path, 'utf8');
        if (sourceHash(before) !== hash) throw new UsageError(staleFile);
        parsesAsBefore(path, before, next);
        if (/\.css$/.test(path) && topBlocks(next).length < topBlocks(before).length - blocksRemoved) throw new UsageError('The change would leave the stylesheet unreadable, so nothing was written.');
        await this.sameFile(path, identity);
        await handle.writeFile(next, 'utf8'); await handle.truncate(Buffer.byteLength(next));
        await this.sameFile(path, identity);
      } finally { await handle.close(); }
      await this.settleWritten(path);
      this.recipeProject = undefined;
      const hashAfter = sourceHash(next);
      if (sourceHash(await readFile(path, 'utf8')) !== hashAfter) throw new UsageError(staleFile);
      const was = before.split('\n'), now = next.split('\n');
      let line = 0; while (line < was.length && line < now.length && was[line] === now[line]) line++;
      return { hash: hashAfter, undo: this.record(path, before, hashAfter, line + 1, label) };
    });
  }
  /** The owner's decisions per type role, from the config (config.system.type.roles). */
  private async roleDecisions(): Promise<RoleOverrides> {
    const config = await loadConfig(this.root, this.options.config).catch(() => undefined);
    return config?.value.system?.type?.roles ?? {};
  }
  private async elementFacts(path: string, line: number, column: number) {
    await this.readableSource(path);
    if (!/\.[cm]?[jt]sx$/.test(path) && !/\.[cm]?jsx?$/.test(path)) throw new UsageError('Properties need a JSX source file.');
    const text = await readFile(path, 'utf8');
    const location = jsxLocation(path, text, line, column, undefined, 'any');
    if (!location) throw new UsageError('Source position does not identify an authored JSX element.');
    const [site, decisions, unit] = await Promise.all([this.site(path, location.line, location.column), this.decisions(), this.spacingUnit()]);
    if (sourceHash(await readFile(path, 'utf8')) !== sourceHash(text)) throw new UsageError(staleFile);
    return { text, location, site, decisions, unit };
  }
  /**
   * Keep it: each site accepted as an exception in the ledger, exactly as `plumber accept --rule <rule> --site
   * <file:line> --why "…"` does (a ledger that does not exist yet is created the same way, with the current decisions).
   * The next read reports those sites as exceptions. The ledger lives under .plumber, which the write history never
   * touches, so this has no undo: `plumber ledger` and a text editor do.
   */
  async accept(options: AcceptOptions): Promise<AcceptResult> {
    const { rule, sites, why } = options ?? {} as AcceptOptions;
    if (typeof rule !== 'string' || !rule.trim() || !Array.isArray(sites) || !sites.length || sites.length > 200) throw new UsageError('Accept requires a rule, one to two hundred sites and a why.');
    if (typeof why !== 'string' || !why.trim() || /[\r\n]/.test(why) || why.length > 120) throw new UsageError('Accept requires a why: one line, at most 120 characters.');
    const places = sites.map(site => {
      if (!site || typeof site.file !== 'string' || !site.file.trim() || typeof site.text !== 'string') throw new UsageError('Each site is { file, line, column, text }.');
      return { file: this.file(site.file), line: this.position(site.line), column: this.position(site.column), text: site.text };
    });
    // the report is read before the write lock is taken: reads queue behind it
    const report = await this.report();
    // the ledger keys of the named sites alone: two causes on one line are two keys, and only the asked-for one moves
    const keys = [...findingGroups(report).values()].filter(group => group.finding.rule === rule && group.sites.some(s => places.some(p => p.file === s.file && p.line === s.line && p.column === s.column && p.text === s.text))).map(group => group.entry.key);
    if (!keys.length) throw new UsageError('No current finding matches the supplied rule and sites.');
    return this.serialize(async () => {
      const ledger = ledgerPath(this.root);
      for (const key of keys) await ledgerCommand('accept', report, { key, why: why.trim() });
      await this.reconcile([ledger]);
      return { accepted: keys.length };
    });
  }
  /**
   * The whole Apply in one request, in order: theme tokens, then class swaps per file, then the ledger. Each item
   * stands alone (one refusal stops nothing else) and each file's hash moves on within the batch: an item may send the
   * hash the file had when the batch began or the hash after the previous write to it; only a hash that was already
   * stale fails that item. Every written file gets its own history entry and undo handle, as the single endpoints do.
   */
  async applyAll(options: ApplyAllOptions): Promise<ApplyAllResult> {
    const { tokens = [], css = [], swaps = [], accepts = [] } = options ?? {};
    if (![tokens, css, swaps, accepts].every(Array.isArray) || tokens.length + css.length + swaps.length + accepts.length === 0) throw new UsageError('Apply needs at least one token, swap or accept.');
    if (tokens.length + css.length + swaps.length + accepts.length > 400) throw new UsageError('Apply takes at most four hundred items.');
    const result: ApplyAllResult = { results: { tokens: [], css: [], swaps: [], accepts: [] }, undo: [], labels: [] };
    // the host holds hot updates while the transaction is open (hosts/vite.ts), and tells the page once it is done
    this.emit('transaction', { phase: 'start' });
    this.transaction = true;
    try { return await this.applyEach({ tokens, css, swaps, accepts }, result); }
    finally { this.transaction = false; this.emit('transaction', { phase: 'end', ...result }); }
  }
  private transaction = false;
  /** The transaction is alive: the host's dead-transaction timer measures silence, so a long apply is never released mid-write. */
  private progress(): void { if (this.transaction) this.emit('transaction', { phase: 'progress' }); }
  private async applyEach({ tokens, css, swaps, accepts }: Required<ApplyAllOptions>, result: ApplyAllResult): Promise<ApplyAllResult> {
    // the hash each file had when the batch began, and the hash it has now
    const began = new Map<string, string>(), latest = new Map<string, string>();
    const hashFor = async (file: string, sent: string): Promise<string> => {
      const path = this.file(file);
      if (!began.has(path)) { const text = await readFile(path, 'utf8').catch(() => ''); began.set(path, sourceHash(text)); latest.set(path, sourceHash(text)); }
      if (sent === began.get(path) || sent === latest.get(path)) return latest.get(path)!;
      throw new UsageError(staleFile);
    };
    const moved = (file: string, hash: string) => latest.set(this.file(file), hash);
    const message = (error: unknown) => error instanceof UsageError ? error.message : errorMessage(error);
    const swapFile = async (swap: SwapsOptions, token?: string) => {
      const tag = token === undefined ? {} : { token };
      try {
        const written = await this.swaps({ ...swap, hash: await hashFor(swap.file, swap.hash) });
        moved(swap.file, written.hash);
        result.undo.push(written.undo); result.labels.push(written.undo.label);
        result.results.swaps.push({ file: swap.file, ok: true, applied: written.applied, refused: written.refused ?? [], ...tag });
      } catch (error) { result.results.swaps.push({ file: String(swap?.file), ok: false, applied: [], refused: [], ...tag, error: message(error) }); }
    };
    // a token's own class goes to the places its cause had before the theme changed: once the token is in the theme
    // the value matches it, and the finding that named those places is gone
    const before = tokens.some(token => token.then) ? await this.report() : undefined;
    // the tokens bound for one file, in a row, are one guarded write of it (a type system's thirty tokens were thirty
    // writes and thirty analysis refreshes); each still stands alone in the answer, and each gets its own trace change
    for (let k = 0; k < tokens.length;) {
      const file = String(tokens[k]?.file), run: typeof tokens = [];
      while (k < tokens.length && String(tokens[k]?.file) === file) run.push(tokens[k++]!);
      this.progress();
      const fail = (token: typeof run[number], error: unknown) => result.results.tokens.push({ name: String(token?.name), ok: false, error: message(error) });
      // a token whose hash is already stale fails on its own; the rest go in with the hash the file has now
      const live: typeof run = [];
      let hash: string | undefined;
      for (const token of run) { try { hash = await hashFor(file, token.hash); live.push(token); } catch (error) { fail(token, error); } }
      if (!live.length) continue;
      let written: TokensResult;
      try { written = await this.tokens({ file, hash: hash!, tokens: live.map(({ name, value, why }) => ({ name, value, ...(why === undefined ? {} : { why }) })) }); }
      catch (error) { for (const token of live) fail(token, error); continue; }
      moved(file, written.hash);
      if (written.undo) { result.undo.push(written.undo); result.labels.push(written.undo.label); }
      for (const [index, token] of live.entries()) {
        const outcome = written.results[index]!;
        if (!outcome.ok) { fail(token, new UsageError(outcome.error ?? 'The token was not written.')); continue; }
        result.results.tokens.push({ name: token.name, ok: true });
        // the token's own class, now that the theme has it: at every place of its cause, or the swaps sent with it
        try {
          const { then } = token;
          if (then && 'cause' in then) await this.swapCause(then, result, moved, before, token.name);
          else if (then) for (const swap of then.swaps ?? []) await swapFile(swap, token.name);
        } catch (error) { result.results.swaps.push({ file, ok: false, applied: [], refused: [], token: token.name, error: message(error) }); }
      }
    }
    // the stylesheet blocks (a type role's utilities), after the tokens they read
    for (const block of css) {
      this.progress();
      try {
        const written = await this.appendCss({ ...block, hash: await hashFor(block.file, block.hash) });
        moved(block.file, written.hash);
        if (written.undo) { result.undo.push(written.undo); result.labels.push(written.undo.label); }
        result.results.css.push({ file: block.file, ok: true, written: written.written });
      } catch (error) { result.results.css.push({ file: String(block?.file), ok: false, written: false, error: message(error) }); }
    }
    for (const swap of swaps) {
      this.progress();
      if ('cause' in swap) { await this.swapCause(swap, result, moved); continue; }
      await swapFile(swap);
    }
    for (const accept of accepts) {
      try {
        const done = await this.accept(accept);
        result.results.accepts.push({ rule: accept.rule, ok: true, accepted: done.accepted });
      } catch (error) { result.results.accepts.push({ rule: String(accept?.rule), ok: false, accepted: 0, error: message(error) }); }
    }
    return result;
  }
  /**
   * A whole cause: every site in the project's report with the rule and class text (not only what a page has read),
   * each rewritten with the same spelling the single edits use (classEdit), at its literal when the class is read
   * through a variable. One guarded write per file, with history and undo; a place that cannot be rewritten is refused
   * with its reason; `places` is the total found.
   */
  private async swapCause({ cause, file: only }: CauseSwap, result: ApplyAllResult, moved: (file: string, hash: string) => void, placesFrom?: Report, token?: string): Promise<void> {
    const entry = (file: string, fields: Partial<ApplyAllResult['results']['swaps'][number]>) => result.results.swaps.push({ file, ok: false, applied: [], refused: [], cause, ...(token === undefined ? {} : { token }), ...fields });
    if (!cause || typeof cause.rule !== 'string' || typeof cause.text !== 'string' || !cause.text.trim() || typeof cause.choice !== 'string' || !cause.choice.trim()) { entry(only ?? '', { error: 'A cause needs a rule, the class text and the chosen token or class.' }); return; }
    const report = await this.report(), source = placesFrom ?? report;
    // the places: every site of the rule's findings with this class; when no finding of the rule names this class
    // (the token was just added and the value now matches it), every declaration with this class
    const named = source.findings.filter(f => f.rule === cause.rule && f.sites.some(site => site.text === cause.text));
    const seen = new Set<string>();
    const places = (named.length ? named.flatMap(f => f.sites.map(site => ({ site, declaration: atSite(f, site) }))) : source.declarations.filter(d => d.site.text === cause.text).map(d => ({ site: d.site, declaration: d })))
      .filter(({ site }) => { const at = site.defined ?? site, key = `${at.file}:${at.line}:${at.column}`; return site.text === cause.text && (!only || this.file(only) === site.file) && !seen.has(key) && seen.add(key); });
    if (!places.length) { entry(only ?? '', { places: 0, error: 'No place in your code has that class under that rule. Check again.' }); return; }
    const decision = [...report.decisions, ...report.decisionInventory ?? []].find(d => d.name === cause.choice);
    const theme = new Set([...report.decisions, ...report.decisionInventory ?? []].map(d => d.name));
    // the file each place is written in: the literal, when the class is read through a variable
    const byFile = new Map<string, typeof places>();
    for (const place of places) { const at = place.site.defined?.file ?? place.site.file; byFile.set(at, [...byFile.get(at) ?? [], place]); }
    for (const [path, group] of byFile) {
      const file = relative(this.root, path).replaceAll('\\', '/');
      const refused: RefusedSwap[] = [];
      let source: string;
      try { source = await readFile(path, 'utf8'); } catch (error) { entry(file, { places: places.length, error: errorMessage(error) }); continue; }
      const starts = lineStarts(source);
      const edits: { line: number; column: number; start: number; end: number; to: string }[] = [];
      for (const { site, declaration } of group) {
        const at = site.defined ?? site;
        const use = decision ? useFor(decision, declaration.prop, theme) : { class: cause.choice, css: '' };
        const change = classEdit({ ...declaration, site }, use);
        const start = (starts[at.line - 1] ?? -1) + at.column - 1;
        const reason = !change ? 'This spelling cannot be rewritten automatically; change it by hand.'
          : starts[at.line - 1] === undefined || source.slice(start, start + site.text.length) !== site.text ? 'This class is no longer written here. Check again.'
          : edits.some(e => e.start < start + site.text.length && start < e.end) ? 'Another of these changes touches the same classes; apply them one at a time.' : undefined;
        if (reason || !change) { refused.push({ line: at.line, column: at.column, from: site.text, to: change?.to ?? '', reason: reason! }); continue; }
        edits.push({ line: at.line, column: at.column, start, end: start + site.text.length, to: change.beside ? `${site.text} ${change.to}` : change.to });
      }
      if (!edits.length) { entry(file, { places: places.length, refused, error: 'None of these places could be rewritten.' }); continue; }
      edits.sort((a, b) => a.start - b.start);
      try {
        const hash = sourceHash(source);
        const written = await this.writeText(path, hash, `cause:${cause.rule}:${cause.text}`, cause.text, edits[0]!.to, (_file, text) => {
          if (sourceHash(text) !== hash) throw new UsageError(staleFile);
          let next = text;
          for (const e of edits.toReversed()) next = next.slice(0, e.start) + e.to + next.slice(e.end);
          return { start: 0, end: text.length, replacement: next, at: edits[0]!.start };
        }, `${cause.text} → ${edits[0]!.to}${edits.length > 1 ? ` (${edits.length} places)` : ''}`);
        moved(file, written.hash);
        result.undo.push(written.undo); result.labels.push(written.undo.label);
        entry(file, { ok: true, applied: edits.map(e => `swap:${e.line}:${e.column}`), refused, places: places.length });
      } catch (error) { entry(file, { places: places.length, refused, error: error instanceof UsageError ? error.message : errorMessage(error) }); }
    }
  }
  /** A stylesheet block (a type role's @utility) appended to the theme file, with the token write's guards: the
   * same file identity and hash, the same blocks as before plus the new ones, one undo handle. Already there → nothing. */
  async appendCss(options: CssOptions): Promise<Omit<TokenResult, 'then'>> {
    const { file, hash, css } = options ?? {} as CssOptions;
    if (typeof file !== 'string' || !file.trim() || typeof hash !== 'string' || !hash.trim() || typeof css !== 'string' || !css.trim()) throw new UsageError('A stylesheet write requires file, hash and css.');
    if (css.length > 20000 || /<\/?script|@import|url\(/i.test(css)) throw new UsageError('A stylesheet block is at most twenty thousand characters of plain CSS.');
    const spec = await this.request<ProjectSpec>('spec');
    if (!spec.tokens.file || file.replaceAll('\\', '/') !== spec.tokens.file) throw new UsageError(`Styles go in ${spec.tokens.file ?? 'your theme file'}, not ${file}.`);
    const path = this.file(file), block = css.trim();
    return this.serialize(async () => {
      const identity = await this.editableFile(path);
      if (!/\.css$/.test(path)) throw new UsageError('Styles are written to a stylesheet.');
      const handle = await open(path, constants.O_RDWR | constants.O_NOFOLLOW);
      let next: string, before: string;
      try {
        const info = await handle.stat();
        if (!info.isFile() || info.nlink !== 1) throw new UsageError('Apply requires a regular source file without hard links.');
        if (info.dev !== identity.dev || info.ino !== identity.ino) throw new UsageError(staleFile);
        await this.sameFile(path, identity);
        before = await readFile(path, 'utf8');
        if (sourceHash(before) !== hash) throw new UsageError(staleFile);
        if (before.includes(block)) return { revision: this.revision, file: path, hash, applied: [], written: false, undo: null };
        next = `${before.replace(/\s*$/, '')}\n\n${block}\n`;
        const added = block.match(/^@utility\b|^[^\s{]/gm)?.length ?? 1;
        if (topBlocks(next).length < topBlocks(before).length || topBlocks(next).length > topBlocks(before).length + added) throw new UsageError('The change would leave the stylesheet unreadable, so nothing was written.');
        await this.sameFile(path, identity);
        await handle.writeFile(next, 'utf8'); await handle.truncate(Buffer.byteLength(next));
        await this.sameFile(path, identity);
      } finally { await handle.close(); }
      await this.reconcile([path]);
      const hashAfter = sourceHash(next);
      if (sourceHash(await readFile(path, 'utf8')) !== hashAfter) throw new UsageError(staleFile);
      const undo = this.record(path, before, hashAfter, 1, `${block.match(/@utility\s+([\w-]+)/g)?.length ?? 1} type role classes`);
      return { revision: this.revision, file: path, hash: hashAfter, applied: ['css'], written: true, undo };
    });
  }
  /**
   * Rename colour tokens across the project (docs/design/token-spec.md §3.3, rules/colour-rename.ts): the theme's
   * `--color-<old>` and every utility class that uses it, in every source file and the theme, as one transaction with
   * one undo per file. Refused whole when a new name is already a token of the theme (it would merge two colours).
   */
  async rename(options: RenameOptions): Promise<RenameResult> {
    const map = (options ?? {} as RenameOptions).map;
    const invalid = validRenameMap(map);
    if (invalid) throw new UsageError(invalid);
    const spec = await this.request<ProjectSpec>('spec');
    const theme = spec.tokens.file ? this.file(spec.tokens.file) : undefined;
    const paths = [...new Set([...this.sourceFiles, ...(theme ? [theme] : [])])].filter(p => /\.(?:[cm]?[jt]sx?|css)$/.test(p)).sort();
    // a new name that is already a token would merge two colours: refuse before writing anything
    if (theme) {
      const text = await readFile(theme, 'utf8').catch(() => '');
      const clash = Object.values(map).find(to => new RegExp(`--color-${to.replace(/-/g, '\\-')}\\s*:`).test(text) && !(to in map));
      if (clash) throw new UsageError(`--color-${clash} is already in ${spec.tokens.file}; renaming onto it would merge two colours.`);
    }
    const result: RenameResult = { revision: this.revision, files: [], uses: 0, byName: {}, undo: [], labels: [] };
    const none = { tokens: [], css: [], swaps: [], accepts: [] };
    await this.manyFiles(async () => {
      for (const path of paths) {
        this.progress();
        const before = await readFile(path, 'utf8').catch(() => null);
        if (before === null) continue;
        const { text: after, count } = renameInText(before, map);
        if (!count.uses) continue;
        const file = relative(this.root, path).replaceAll('\\', '/');
        try {
          const written = await this.serialize(async () => {
            const identity = await this.editableFile(path);
            const handle = await open(path, constants.O_RDWR | constants.O_NOFOLLOW);
            try {
              const info = await handle.stat();
              if (!info.isFile() || info.nlink !== 1) throw new UsageError('Apply requires a regular source file without hard links.');
              if (info.dev !== identity.dev || info.ino !== identity.ino) throw new UsageError(staleFile);
              await this.sameFile(path, identity);
              if (await readFile(path, 'utf8') !== before) throw new UsageError(staleFile);
              await handle.writeFile(after, 'utf8'); await handle.truncate(Buffer.byteLength(after));
              await this.sameFile(path, identity);
            } finally { await handle.close(); }
            await this.settleWritten(path);
            const hashAfter = sourceHash(after);
            return this.record(path, before, hashAfter, 1, `${count.uses} colour ${count.uses === 1 ? 'name' : 'names'} renamed`);
          });
          result.undo.push(written); result.labels.push(written.label);
          result.files.push({ file, ok: true, uses: count.uses });
          result.uses += count.uses;
          for (const [name, n] of Object.entries(count.byName)) result.byName[name] = (result.byName[name] ?? 0) + n;
        } catch (error) { result.files.push({ file, ok: false, uses: 0, error: error instanceof UsageError ? error.message : errorMessage(error) }); }
      }
    }, () => ({ results: none, undo: result.undo, labels: result.labels }));
    result.revision = this.revision;
    return result;
  }
  /**
   * The type system this code is reaching for (docs/research/type-roles.md): its roles, members, cost and the write
   * that makes it the system, from the report's places and, when a page was measured, the census that confirms them.
   */
  async system(options: SystemOptions = {}): Promise<SystemResult> {
    const { files, exclude, roles, scope, route } = options ?? {};
    let { census } = options ?? {};
    if (scope !== undefined && scope !== 'page' && scope !== 'project') throw new UsageError('scope is "page" or "project".');
    if (scope === 'project') {
      // one ladder for the project: every route's text as last measured, the page's own (fresher) entries over it
      const kept = await projectCensus(this.root);
      if (!kept) throw new UsageError('There is no census of the project yet.\n  → plumber census --url <your dev server>');
      // the page's own census replaces what was kept for its route, nothing else: a header drawn on forty routes keeps
      // its other thirty-nine readings, so the ladder is the same whichever page asks
      census = [...kept.entries.filter(e => !route || (e as { route?: string }).route !== route), ...(Array.isArray(census) && route ? census : [])];
    }
    if (census !== undefined && (!Array.isArray(census) || census.length > 20000)) throw new UsageError('A census is a list of at most twenty thousand elements.');
    const config = await loadConfig(this.root, this.options.config).catch(() => undefined);
    const excluded = [...(config?.value.system?.exclude ?? []), ...(Array.isArray(exclude) ? exclude.filter((p): p is string => typeof p === 'string') : [])];
    // decisions win: the config's, then the request's (a dry run with decisions not yet written into the config)
    const overrides: Record<string, RoleOverride> = { ...(config?.value.system?.type?.roles ?? {}), ...(roles && typeof roles === 'object' ? roles : {}) };
    const members = new Map<string, TypeMember>();
    const member = (where: { file: string; line: number; column: number }, tag: string, declarations: Report['declarations'], entry?: CensusEntry): TypeMember | undefined => {
      // a class behind a variant (`first-letter:uppercase`, `md:text-lg`, `hover:font-medium`) is not the element's own type
      // at rest: it is neither read into the place nor swapped out (crafting-ui's rule titles lost their capital letter)
      const type = declarations.filter(d => isTypeProp(d.prop) && !(['class', 'arbitrary'].includes(d.origin) && (d.site.text ?? '').replace(/\[[^\]]*\]/g, '').includes(':')));
      const classes = new Map<string, TypeClass>();
      let fixed: string | undefined;
      for (const d of type) {
        if (d.origin === 'inline') { fixed = 'an inline style sets its type; change it by hand'; continue; }
        if (!['class', 'arbitrary', 'apply'].includes(d.origin)) continue;
        if (d.site.defined || d.site.file !== this.file(where.file) || d.site.line !== where.line) { fixed = 'its classes are written elsewhere (a variable or a helper); change them there'; continue; }
        const c = classes.get(d.site.text) ?? { text: d.site.text, props: [], value: d.resolved ?? d.value, origin: d.origin };
        if (!c.props.includes(d.prop)) c.props.push(d.prop);
        classes.set(d.site.text, c);
      }
      const value = (prop: string) => { const d = type.filter(d => d.prop === prop).at(-1); return d ? { raw: d.value, resolved: d.resolved ?? d.value } : undefined; };
      const fontSize = value('font-size'), lineHeight = value('line-height'), letterSpacing = value('letter-spacing'), weight = value('font-weight'), transform = value('text-transform');
      const computed = entry?.computed;
      const size = computed?.size ?? px(fontSize?.resolved);
      if (size === null || size === undefined) return undefined;
      const fluid = fontSize && /clamp\(|\bmin\(|\bmax\(/.test(fontSize.raw) ? fontSize.raw : undefined;
      const lhLowered = lineHeight ? (/^[\d.]+$/.test(lineHeight.resolved.trim()) ? parseFloat(lineHeight.resolved) : (px(lineHeight.resolved, size) ?? 0) / size) : null;
      const current: TypeBundle = {
        size: fluid ? null : size, ...(fluid ? { sizeText: fluid } : {}),
        // leading is what the code sets at the element (a class or inline), never the inherited computed value
        lineHeight: lhLowered === null ? null : Math.round(lhLowered * 1000) / 1000,
        letterSpacing: Math.round(((computed?.letterSpacing !== undefined && computed.letterSpacing !== null ? computed.letterSpacing : (px(letterSpacing?.resolved, size) ?? 0)) / size) * 1000) / 1000,
        weight: computed?.weight ?? (parseInt(weight?.resolved ?? '400', 10) || 400),
        transform: (computed?.transform ?? transform?.resolved) === 'uppercase' ? 'uppercase' : 'none',
      };
      return { site: { file: where.file, line: where.line, column: where.column }, ...(entry ? { stamp: entry.stamp } : {}), tag, classes: [...classes.values()], current, list: !!entry?.list, ...(typeof entry?.sentence === 'boolean' ? { sentence: entry.sentence } : {}), ...(entry?.number ? { number: true } : {}), ...(entry?.control ? { control: true } : {}), elements: 1, ...(fixed ? { fixed } : {}) };
    };
    if (census?.length) {
      // the measured page: one member per stamp, with the elements that rendered it
      const unique = new Map<string, CensusEntry & { elements: number }>();
      for (const c of census) { if (!c || typeof c.stamp !== 'string' || typeof c.tag !== 'string') throw new UsageError('Each census element is { stamp, tag, list?, computed? }.'); const n = Number.isFinite(c.elements) ? Math.max(1, Math.floor(c.elements!)) : 1; const u = unique.get(c.stamp); if (u) u.elements += n; else unique.set(c.stamp, { ...c, elements: n }); }
      const entries = [...unique.values()];
      const answers = await this.page(entries.map(c => ({ stamp: c.stamp, tag: c.tag })));
      entries.forEach((c, i) => {
        const a = answers.items[i]!;
        if (a.status !== 'ready' || !a.site || a.file === undefined || a.line === undefined || a.column === undefined) return;
        const m = member({ file: a.file, line: a.line, column: a.column }, c.tag, a.site.declarations, c);
        if (m) { m.elements = c.elements; members.set(`${m.site.file}:${m.site.line}:${m.site.column}`, m); }
      });
    } else {
      // no measured page: every host element in the files that sets its own text size
      const paths = (files?.length ? files.map(f => this.file(f)) : [...this.sourceFiles]).filter(p => /\.[cm]?[jt]sx$/.test(p) && this.sourceFiles.has(p)).sort();
      const targets: { file: string; line: number; column: number; tag: string }[] = [];
      for (const path of paths) {
        const text = await readFile(path, 'utf8').catch(() => '');
        if (!text) continue;
        const rel = relative(this.root, path).replaceAll('\\', '/');
        for (const entry of indexSource(path, text)) if (/^[a-z]/.test(entry.component)) targets.push({ file: rel, line: entry.line, column: entry.column, tag: entry.component });
      }
      const answers = await this.many(targets.map(t => ({ method: 'site' as const, args: [t.file, t.line, t.column] })));
      targets.forEach((t, i) => {
        const a = answers[i]!;
        if (!('value' in a)) return;
        const site = a.value as SiteResult;
        if (!site.declarations.some(d => d.prop === 'font-size')) return;
        const m = member(t, t.tag, site.declarations);
        if (m) members.set(`${m.site.file}:${m.site.line}:${m.site.column}`, m);
      });
    }
    // the theme's own text steps, preferred when within 1px of a cluster's mode
    const themeSteps = (await this.decisions()).filter(d => d.origin === 'project' && d.family === 'type' && /^--text-[a-z0-9]+$/.test(d.name)).map(d => px(d.resolved ?? d.value)).filter((n): n is number => n !== null);
    const proposal = proposeTypeRoles([...members.values()], { exclude: excluded, roles: overrides, themeSteps });
    // the write, with the hashes it must find: the theme for tokens and utilities, each source file for its swaps
    const spec = await this.request<ProjectSpec>('spec');
    const theme = spec.tokens.file ?? '', themeHash = spec.tokens.hash ?? '';
    const swaps: SystemWrite['swaps'] = [];
    for (const swap of proposal.write.swaps) { const text = await readFile(this.file(swap.file), 'utf8').catch(() => null); if (text !== null) swaps.push({ ...swap, hash: sourceHash(text) }); }
    const write: SystemWrite = { tokens: proposal.write.tokens.map(t => ({ ...t, file: theme, hash: themeHash })), css: proposal.write.css ? [{ file: theme, hash: themeHash, css: proposal.write.css }] : [], swaps };
    return { revision: this.revision, proposal: { ...proposal, write } };
  }
  /** Set one property of an element to one of its steps: replace the class that sets it, or add one. */
  async set(options: SetOptions): Promise<ApplyResult> {
    const { file, hash, line, column, key, token, at } = options ?? {} as SetOptions;
    if (typeof file !== 'string' || !file.trim() || typeof hash !== 'string' || !hash.trim() || typeof key !== 'string' || !key.trim() || typeof token !== 'string' || !token.trim()) throw new UsageError('Set requires file, hash, line, column, key and token.');
    const path = this.file(file); this.position(line); this.position(column);
    const facts = await this.elementFacts(path, line, column);
    if (sourceHash(facts.text) !== hash) throw new UsageError(staleFile);
    const roles = await this.roleDecisions();
    const current = elementProps(path, facts.text, facts.location.start, facts.location.tag, facts.decisions, facts.site.declarations, { roles, ...(facts.unit ? { unit: facts.unit } : {}) }).props.find(item => item.key === key);
    const label = `${key}: ${current?.token ?? current?.value ?? 'unset'} → ${token}`;
    return this.writeText(path, hash, `set:${key}`, current?.class ?? key, token, (_file, source) => {
      if (sourceHash(source) !== hash) throw new UsageError(staleFile);
      const change = setProp(_file, source, facts.location.start, facts.location.tag, facts.decisions, facts.site.declarations, key, token, { roles, ...(facts.unit ? { unit: facts.unit } : {}) }, at ? offsetOf(source, at) : undefined);
      return { ...change, replacement: change.replacement };
    }, label);
  }
  /** Swap classes on an element (a craft suggestion): take `from` out of its static className, put `to` in its place. */
  async swap(options: SwapOptions): Promise<ApplyResult> {
    const { file, hash, line, column, from, to, at, of } = options ?? {} as SwapOptions;
    if (typeof file !== 'string' || !file.trim() || typeof hash !== 'string' || !hash.trim() || typeof from !== 'string' || typeof to !== 'string' || !to.trim()) throw new UsageError('Swap requires file, hash, line, column, from and to.');
    const names = (v: string) => v.split(/\s+/).filter(Boolean);
    if (names(from).length > 8 || names(to).length > 8) throw new UsageError('Swap changes at most eight classes.');
    const path = this.file(file); this.position(line); this.position(column);
    const facts = await this.elementFacts(path, line, column);
    if (sourceHash(facts.text) !== hash) throw new UsageError(staleFile);
    // a component's usage is not the element that was measured: a class added there may land elsewhere or nowhere
    if (!at && !names(from).length && isComponentJSX(facts.location.tag)) throw new UsageError(`<${facts.location.tag}> is a component; add the class inside it, by hand.`);
    const pinned = at ? await this.pinned(path, facts, { line, column, at, ...(of ? { of } : {}) }, pinWrite(names(from), names(to))) : undefined;
    return this.writeText(path, hash, `swap:${from}`, from || '∅', to, (_file, source) => {
      if (sourceHash(source) !== hash) throw new UsageError(staleFile);
      return swapClasses(_file, source, facts.location.start, names(from), names(to), pinned);
    }, changed(from, to, ''));
  }
  /** How class-site reaches a component's file from a usage's import (src/session/modules.ts): the project's resolution
   * (relative, index files, tsconfig paths, vite aliases), source files inside the root only, read as they are now. */
  private modules(scheme: 'absolute' | 'relative' = 'absolute', known: (path: string) => string | undefined = () => undefined): ModuleFacts {
    return projectModules(this.root, absolute => {
      const rel = relative(this.root, absolute).replaceAll('\\', '/'), kept = known(scheme === 'relative' ? rel : absolute);
      if (kept !== undefined) return kept;
      try { return readFileSync(absolute, 'utf8'); } catch { return undefined; }
    }, scheme);
  }
  /** The files class-site reads, each once: an element and the usages of its chain, as the resolver takes them. */
  private sources(texts = new Map<string, string>()) {
    return async (name: string, line: number, column: number): Promise<Located> => {
      if (typeof name !== 'string' || !name.trim()) throw new UsageError('A chain link is { file, line, column }.');
      const path = this.file(name); this.position(line); this.position(column);
      if (!texts.has(path)) { await this.readableSource(path); texts.set(path, await readFile(path, 'utf8')); }
      return { file: name, path, text: texts.get(path)!, line, column };
    };
  }
  /**
   * The string a pinned write names, checked by class-site (`pinnedString`): one of the strings the written element reaches
   * on its own, or, with `of`, one of those reached from the element class-site was asked about through its chain, held
   * by the written element. An add must go into a string that always applies and no other place reads. Never a free
   * offset: a stale or wrong pin is refused, not written somewhere else.
   */
  private async pinned(path: string, facts: { text: string; location: { line: number; column: number } }, edit: { line: number; column: number; at: { line: number; column: number }; of?: PinOrigin }, write: PinWrite): Promise<ClassString> {
    const source = this.sources(new Map([[path, facts.text]]));
    const of = edit.of;
    if (of !== undefined && (!of || typeof of !== 'object' || (of.chain !== undefined && (!Array.isArray(of.chain) || of.chain.length > 32)))) throw new UsageError('of is { file, line, column, chain }.');
    const element = of ? await source(of.file, of.line, of.column) : { file: relative(this.root, path).replaceAll('\\', '/'), path, text: facts.text, line: edit.line, column: edit.column };
    const chain: Located[] = [];
    for (const link of of?.chain ?? []) chain.push(await source(link?.file, link?.line, link?.column));
    return pinnedString({ element, chain, modules: this.modules() }, { path, line: facts.location.line, column: facts.location.column }, offsetOf(facts.text, edit.at), write);
  }
  /** What the source says the element at a position is: its component, library and role, literal props and handlers. */
  // What the source says of a file, kept while its text is the same: a page asks about hundreds of elements in a
  // handful of files, and each question used to index its file again (and, for a tooltip, every file in the project).
  private structureIndexes = new Map<string, { text: string; entries: ReturnType<typeof indexSource> }>();
  private indexed(path: string, text: string): ReturnType<typeof indexSource> {
    const hit = this.structureIndexes.get(path);
    if (hit && hit.text === text) return hit.entries;
    const entries = indexSource(path, text);
    this.structureIndexes.set(path, { text, entries });
    if (this.structureIndexes.size > 2048) this.structureIndexes.delete(this.structureIndexes.keys().next().value!);
    return entries;
  }
  private tooltipProviders: { revision: number; found: { path: string; text: string; entry: ReturnType<typeof indexSource>[number] }[] } | undefined;
  async structure(file: string, line: number, column: number): Promise<StructureResult | null> {
    const path = this.file(file); this.position(line); this.position(column);
    await this.readableSource(path);
    const text = await readFile(path, 'utf8');
    const location = jsxLocation(path, text, line, column, undefined, 'any');
    if (!location) return null;
    const entries = this.indexed(path, text);
    const at = entries.findIndex(entry => entry.start === location.start);
    const entry = entries[at];
    if (!entry) return null;
    const rel = (target: string) => relative(this.root, target).split(sep).join('/');
    const out: StructureResult = { file, line: entry.line, column: entry.column, hash: sourceHash(text), component: entry.component, source: entry.source, library: entry.library, role: entry.role, props: entry.props, handlers: entry.handlers };
    // a tooltip, or a trigger inside one: the provider whose delays it follows
    if (entry.role === 'tooltip' || ancestorWith(entries, at, 'tooltip')) {
      let provider = ancestorWith(entries, at, 'tooltip-provider'), where = path, whereText = text;
      if (!provider) {
        // a provider in a layout file: the project's one, when it has exactly one (looked for once per revision)
        let found = this.tooltipProviders?.revision === this.revision ? this.tooltipProviders.found : undefined;
        if (!found) {
          found = [];
          for (const other of this.sourceFiles) {
            if (!/\.[cm]?[jt]sx$/.test(other) || found.length > 1) continue;
            const t = other === path ? text : await readFile(other, 'utf8').catch(() => '');
            for (const e of this.indexed(other, t)) if (e.role === 'tooltip-provider') found.push({ path: other, text: t, entry: e });
          }
          this.tooltipProviders = { revision: this.revision, found };
        }
        if (found.length === 1) { provider = found[0]!.entry; where = found[0]!.path; whereText = found[0]!.text; }
      }
      if (provider) out.provider = { file: where === path ? file : rel(where), line: provider.line, column: provider.column, hash: sourceHash(whereText), component: provider.component, library: provider.library, props: provider.props };
    }
    return out;
  }
  /**
   * Where each class of an element is written (src/session/class-site.ts): its own className, a variable it reads, or the
   * usage up `chain` (the usages above it, nearest first) that passes the prop it reads. `classes` is a space-separated
   * list; every class of the strings found when absent. Each file a site is in comes with its hash, for the write.
   */
  async classSite(file: string, line: number, column: number, classes?: string, chain: { file: string; line: number; column: number }[] = []): Promise<ClassSiteResult> {
    if (!Array.isArray(chain) || chain.length > 32) throw new UsageError('chain is a list of at most 32 { file, line, column }.');
    if (classes !== undefined && (typeof classes !== 'string' || classes.length > 4000)) throw new UsageError('classes is a space-separated list of class names.');
    const source = this.sources();
    const element = await source(file, line, column);
    const links = [];
    for (const link of chain) links.push(await source(link?.file, link?.line, link?.column));
    const names = classes?.split(/\s+/).filter(Boolean);
    const answer = classSites({ element, chain: links, modules: this.modules(), ...(names?.length ? { classes: names } : {}) });
    const hashes: Record<string, string> = {};
    for (const name of [element, ...links]) hashes[name.file] = sourceHash(name.text);
    return { revision: this.revision, file, hash: hashes[file]!, hashes, ...answer };
  }
  /** Set a literal prop on a component (a craft suggestion of kind prop: delayDuration={500}), in one guarded write. */
  async propEdit(options: PropEditOptions): Promise<ApplyResult> {
    const { file, hash, line, column, name, value } = options ?? {} as PropEditOptions;
    if (typeof file !== 'string' || !file.trim() || typeof hash !== 'string' || !hash.trim() || typeof name !== 'string' || !/^[A-Za-z_][\w-]*$/.test(name)) throw new UsageError('A prop edit requires file, hash, line, column, name and value.');
    if (!['string', 'number', 'boolean'].includes(typeof value) || (typeof value === 'number' && !Number.isFinite(value)) || (typeof value === 'string' && /[\r\n]/.test(value))) throw new UsageError('A prop edit sets a string, a number or a boolean.');
    const path = this.file(file); this.position(line); this.position(column);
    const facts = await this.elementFacts(path, line, column);
    if (sourceHash(facts.text) !== hash) throw new UsageError(staleFile);
    return this.writeText(path, hash, `prop:${name}`, name, String(value), (_file, source) => {
      if (sourceHash(source) !== hash) throw new UsageError(staleFile);
      return setJsxProp(_file, source, facts.location.start, name, value);
    }, `${name}={${JSON.stringify(value)}}`);
  }
  /** A token added to the theme file the spec names, in the shape the file has, then (when asked) the class swap that
   * uses it. Two guarded writes, two undo handles; a swap that is refused puts the theme back as it was. */
  async token(options: TokenOptions): Promise<TokenResult> {
    const { file, hash, name, value, why, then } = options ?? {} as TokenOptions;
    if (typeof file !== 'string' || !file.trim() || typeof hash !== 'string' || !hash.trim() || typeof name !== 'string' || typeof value !== 'string') throw new UsageError('A token write requires file, hash, name and value.');
    checkToken(name, value, why);
    const batch = await this.tokens({ file, hash, tokens: [{ name, value, ...(why === undefined ? {} : { why }) }] });
    const [outcome] = batch.results;
    if (!outcome!.ok) throw new UsageError(outcome!.error ?? 'The token was not written.');
    const write: Omit<TokenResult, 'then'> = { revision: batch.revision, file: batch.file, hash: batch.hash, applied: batch.applied, written: batch.written, undo: batch.undo };
    if (!then) return write;
    try {
      const swapped = await this.swap(then);
      return { ...write, then: swapped };
    } catch (error) {
      // the class could not follow: the theme goes back as it was, so nothing is half done
      if (write.undo) await this.undo(write.undo.id).catch(() => {});
      throw error;
    }
  }
  /** Several tokens into the theme file as one guarded write (one reload, one history entry, one undo handle), each
   * traced as a change of its own so one can be taken back alone. A token already there with its value is fine and
   * not written; one there with another value is refused on its own; the rest are written. A run of tokens with the
   * same why carries one comment. */
  async tokens(options: TokensOptions): Promise<TokensResult> {
    const { file, hash, tokens } = options ?? {} as TokensOptions;
    if (typeof file !== 'string' || !file.trim() || typeof hash !== 'string' || !hash.trim() || !Array.isArray(tokens) || !tokens.length || tokens.length > 400) throw new UsageError('A token write requires file, hash and one to four hundred tokens.');
    const results: TokensResult['results'] = tokens.map(token => ({ name: String(token?.name), ok: true, written: false }));
    const refuse = (index: number, error: unknown) => { results[index] = { name: results[index]!.name, ok: false, written: false, error: error instanceof UsageError ? error.message : errorMessage(error) }; };
    for (const [index, token] of tokens.entries()) { try { if (typeof token?.name !== 'string' || typeof token?.value !== 'string') throw new UsageError('A token write requires file, hash, name and value.'); checkToken(token.name, token.value, token.why); } catch (error) { refuse(index, error); } }
    // the server says where tokens go and whether they may be made (plumber spec): the client only repeats it
    const spec = await this.request<ProjectSpec>('spec');
    if (spec.tokens.create === false) throw new UsageError('Your config forbids new tokens (craft.tokens.create). Add it to your theme by hand.');
    if (!spec.tokens.file || file.replaceAll('\\', '/') !== spec.tokens.file) throw new UsageError(`Tokens go in ${spec.tokens.file ?? 'your theme file'}, not ${file}.`);
    const path = this.file(file), shape = spec.tokens.shape ?? 'theme';
    return this.serialize(async (): Promise<TokensResult> => {
      if (spec.tokens.new) throw new UsageError(`Create ${spec.tokens.file} first (plumber propose --write makes it), then add tokens to it.`);
      const identity = await this.editableFile(path);
      if (!/\.css$/.test(path)) throw new UsageError('Tokens are written to a stylesheet.');
      const handle = await open(path, constants.O_RDWR | constants.O_NOFOLLOW);
      let next: string | null = null, before: string;
      const nothing = () => ({ revision: this.revision, file: path, hash, applied: [], written: false, undo: null, results });
      try {
        const info = await handle.stat();
        if (!info.isFile() || info.nlink !== 1) throw new UsageError('Apply requires a regular source file without hard links.');
        if (info.dev !== identity.dev || info.ino !== identity.ino) throw new UsageError(staleFile);
        await this.sameFile(path, identity);
        const bytes = Buffer.alloc(info.size);
        let offset = 0;
        while (offset < bytes.length) { const { bytesRead } = await handle.read(bytes, offset, bytes.length - offset, offset); if (!bytesRead) break; offset += bytesRead; }
        before = bytes.subarray(0, offset).toString('utf8');
        if (sourceHash(before) !== hash) throw new UsageError(staleFile);
        const writing: { index: number; name: string; value: string; why: string }[] = [];
        const seen = new Set<string>();
        for (const [index, token] of tokens.entries()) {
          if (!results[index]!.ok) continue;
          const name = token.name, clean = token.value.trim();
          const declared = new RegExp(`(?:^|[\\s;{])${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:\\s*([^;}]+)`).exec(before);
          if (declared && declared[1]!.trim() === clean) continue; // already there: nothing to write
          if (declared) { refuse(index, new UsageError(`${name} is already ${declared[1]!.trim()} in ${file}. Pick another name.`)); continue; }
          if (seen.has(name)) { refuse(index, new UsageError(`${name} is sent twice in this write.`)); continue; }
          seen.add(name);
          writing.push({ index, name, value: clean, why: token.why ?? 'added by React Plumber' });
        }
        if (!writing.length) return nothing();
        next = addTokens(before, shape, writing.map(({ name, value, why }) => ({ name, value, why })) as Parameters<typeof addTokens>[2]).css;
        // the stylesheet's last guard: the same blocks as before (or one more), and every declaration in it
        const blocksBefore = topBlocks(before).length, blocksAfter = topBlocks(next).length;
        if (!(blocksAfter === blocksBefore || blocksAfter === blocksBefore + 1) || writing.some(({ name, value }) => !next!.includes(`${name}: ${value};`))) throw new UsageError('The change would leave the stylesheet unreadable, so nothing was written.');
        await this.sameFile(path, identity);
        await handle.writeFile(next, 'utf8'); await handle.truncate(Buffer.byteLength(next));
        await this.sameFile(path, identity);
        for (const { index } of writing) results[index]!.written = true;
      } finally { await handle.close(); }
      await this.reconcile([path]);
      const hashAfter = sourceHash(next);
      if (sourceHash(await readFile(path, 'utf8')) !== hashAfter) throw new UsageError(staleFile);
      const written = results.filter(r => r.written);
      const label = written.length === 1 ? `${written[0]!.name}: ${tokens.find(t => t.name === written[0]!.name)!.value.trim()}` : `${written.length} tokens`;
      const undo = this.record(path, before, hashAfter, 1, label, true);
      return { revision: this.revision, file: path, hash: hashAfter, applied: written.map(r => `token:${r.name}`), written: true, undo, results };
    });
  }
  /** Several class swaps in one file, written together in one guarded write (one reload, one undo): the changes a person
   * accepted on several elements of one file, or the rows of one line. Each swap is found against the file as it is. */
  async swaps(options: SwapsOptions): Promise<ApplyResult> {
    const { file, hash, edits } = options ?? {} as SwapsOptions;
    if (typeof file !== 'string' || !file.trim() || typeof hash !== 'string' || !hash.trim() || !Array.isArray(edits) || !edits.length || edits.length > 200) throw new UsageError('Swaps requires file, hash and one to two hundred edits.');
    const names = (v: string) => v.split(/\s+/).filter(Boolean);
    const path = this.file(file);
    // one swap per element: the same element twice with the same edit is one
    const unique = [...new Map(edits.map(e => [`${e.line}:${e.column}|${e.from}|${e.to}|${e.at?.line ?? ''}:${e.at?.column ?? ''}`, e])).values()];
    for (const e of unique) {
      if (typeof e?.from !== 'string' || typeof e?.to !== 'string' || !e.to.trim() || names(e.from).length > 8 || names(e.to).length > 8) throw new UsageError('Each swap needs from and to (at most eight classes).');
      this.position(e.line); this.position(e.column);
    }
    // Every place that can be written is; a place that can't (a className built at runtime, a component's usage, a
    // class not written there) is refused on its own, with its reason. The file itself is still guarded whole: a
    // stale hash writes nothing.
    const refused: RefusedSwap[] = [];
    const order = (a: { line: number; column: number }, b: { line: number; column: number }) => a.line - b.line || a.column - b.column;
    const refuse = (e: SwapsOptions['edits'][number], error: unknown): void => {
      if (!(error instanceof UsageError) || error.message === staleFile) throw error;
      refused.push({ line: e.line, column: e.column, from: e.from, to: e.to, reason: error.message });
    };
    const starts: { edit: SwapsOptions['edits'][number]; start: number; from: string[]; to: string[]; pin?: ClassString }[] = [];
    for (const e of unique) {
      try {
        const facts = await this.elementFacts(path, e.line, e.column);
        if (sourceHash(facts.text) !== hash) throw new UsageError(staleFile);
        if (!e.at && !names(e.from).length && isComponentJSX(facts.location.tag)) throw new UsageError(`<${facts.location.tag}> is a component; add the class inside it, by hand.`);
        const pin = e.at ? await this.pinned(path, facts, { line: e.line, column: e.column, at: e.at, ...(e.of ? { of: e.of } : {}) }, pinWrite(names(e.from), names(e.to))) : undefined;
        starts.push({ edit: e, start: facts.location.start, from: names(e.from), to: names(e.to), ...(pin ? { pin } : {}) });
      } catch (error) { refuse(e, error); }
    }
    const written: SwapsOptions['edits'] = [];
    const nothing = () => new UsageError(`${refused.length === 1 ? 'The change could not be written' : 'None of these changes could be written'}: ${[...new Set(refused.toSorted(order).map(r => r.reason))].join(' ')}`);
    if (!starts.length) throw nothing();
    // the history label: each distinct value once, cut to fit the text guard (a big file's swaps are one write)
    const summary = (xs: string[]) => { const all = [...new Set(xs)].join(', '); return all.length <= 500 ? all : `${all.slice(0, 470).replace(/,[^,]*$/, '')} … (${xs.length} in all)`; };
    const result = await this.writeText(path, hash, `swaps:${unique.length}`, summary(unique.map(e => e.from || '∅')), summary(unique.map(e => e.to)), (_file, source) => {
      if (sourceHash(source) !== hash) throw new UsageError(staleFile);
      const changes: (ReturnType<typeof swapClasses> & { edit: SwapsOptions['edits'][number] })[] = [];
      for (const s of starts) {
        try { changes.push({ ...swapClasses(_file, source, s.start, s.from, s.to, s.pin), edit: s.edit }); }
        catch (error) { refuse(s.edit, error); }
      }
      changes.sort((a, b) => b.start - a.start);
      // two changes to the same string: the first asked for is kept, the other is refused
      const kept: typeof changes = [];
      for (const c of changes) {
        const previous = kept.at(-1);
        if (previous && c.end > previous.start) refuse(c.edit, new UsageError('Another of these changes touches the same classes; apply them one at a time.'));
        else kept.push(c);
      }
      if (!kept.length) throw nothing();
      let next = source;
      for (const c of kept) next = next.slice(0, c.start) + c.replacement + next.slice(c.end);
      written.push(...kept.map(c => c.edit));
      return { start: 0, end: source.length, replacement: next, at: kept.at(-1)!.at };
    }, `${unique.length - refused.length} change${unique.length - refused.length === 1 ? '' : 's'}`);
    const place = (e: SwapsOptions['edits'][number]) => `swap:${e.line}:${e.column}`;
    return { ...result, applied: written.toSorted(order).map(place), refused: refused.toSorted(order) };
  }
  /** The text-at write: one string (JSX text, an attribute or a literal) addressed by the id text-at returned. */
  applyTextAt(options: ApplyTextAtOptions): Promise<ApplyResult> {
    const { file, hash, id, from, to } = options ?? {} as ApplyTextAtOptions;
    return this.writeText(file, hash, id, from, to, (_file, source) => {
      const target = textTargets(_file, source).targets.find(target => target.id === id);
      if (!target) throw new UsageError(textWriteErrors.unknown);
      if (target.text !== from) throw new UsageError(textWriteErrors.mismatch);
      if (target.plain && /[\r\n]/.test(to)) throw new UsageError('An attribute holds one line of text.');
      return { start: target.start, end: target.end, replacement: target.replace(to), at: target.start };
    });
  }
  private async writeText(path: string, hash: string, id: string, from: string, to: string, find: (file: string, source: string) => { start: number; end: number; replacement: string; at: number }, label?: string): Promise<ApplyResult> {
    if (typeof path !== 'string' || !path.trim() || typeof hash !== 'string' || !hash.trim() ||
      typeof id !== 'string' || !id.trim() || typeof from !== 'string' || typeof to !== 'string') throw new UsageError(textWriteErrors.parameters);
    if (!to.trim()) throw new UsageError(textWriteErrors.empty);
    if (to.length > 500) throw new UsageError(textWriteErrors.length);
    const file = this.file(path);
    return this.serialize(async () => {
      await this.editableFile(file);
      if (sourceHash(await readFile(file, 'utf8')) !== hash) throw new UsageError(staleFile);
      await this.reconcile([file]);
      if (!this.sourceFiles.has(file) || !/\.[cm]?[jt]sx?$/.test(file)) throw new UsageError('Text edits require a tracked JSX source file.');
      const identity = await this.editableFile(file);
      const handle = await open(file, constants.O_RDWR | constants.O_NOFOLLOW);
      let next: string, siteLine: number, before: string;
      try {
        const info = await handle.stat();
        if (!info.isFile() || info.nlink !== 1) throw new UsageError('Apply requires a regular source file without hard links.');
        if (info.dev !== identity.dev || info.ino !== identity.ino) throw new UsageError(staleFile);
        await this.sameFile(file, identity);
        const bytes = Buffer.alloc(info.size);
        let offset = 0;
        while (offset < bytes.length) { const { bytesRead } = await handle.read(bytes, offset, bytes.length - offset, offset); if (!bytesRead) break; offset += bytesRead; }
        const source = bytes.subarray(0, offset).toString('utf8');
        if (sourceHash(source) !== hash) throw new UsageError(staleFile);
        before = source;
        const { start, end, replacement, at } = find(file, source);
        next = source.slice(0, start) + replacement + source.slice(end);
        siteLine = sourceSite({ file, text: source, lineStarts: lineStarts(source) }, at, '').line;
        parsesAsBefore(file, source, next);
        await this.sameFile(file, identity);
        await handle.writeFile(next, 'utf8'); await handle.truncate(Buffer.byteLength(next));
        await this.sameFile(file, identity);
      } finally { await handle.close(); }
      await this.reconcile([file]);
      const snapshot = await this.request<{ hash: string; remaining: Report['findings'] }>('remaining', { file, sites: [{ line: siteLine }] });
      if (snapshot.hash !== sourceHash(next) || snapshot.hash !== this.hashes.get(file) || sourceHash(await readFile(file, 'utf8')) !== snapshot.hash) throw new UsageError(staleFile);
      const undo = this.record(file, before, snapshot.hash, siteLine, label ?? changed(from, to));
      return { revision: this.revision, file, hash: snapshot.hash, applied: [id], remaining: snapshot.remaining, undo };
    });
  }
  async apply(options: ApplyOptions): Promise<ApplyResult> {
    if (!options || typeof options.file !== 'string' || !options.file.trim() || typeof options.hash !== 'string' || !options.hash.trim() ||
      !Array.isArray(options.edits) || !options.edits.length || options.edits.some(edit => !edit || typeof edit.id !== 'string' || !edit.id.trim())) {
      throw new UsageError('Apply requires a file, hash and a non-empty array of edit ids.');
    }
    const file = this.file(options.file), hash = options.hash, ids = options.edits.map(edit => edit.id);
    return this.serialize(async () => {
      await this.editableFile(file);
      if (sourceHash(await readFile(file, 'utf8')) !== hash) throw new UsageError(staleFile);
      await this.reconcile([file]);
      // Re-derive every choice from the current source and decisions, never from client text.
      const current = await this.request<Omit<EditsResult, 'revision'>>('edits', { file });
      if (current.hash !== hash || this.hashes.get(file) !== hash) throw new UsageError(staleFile);
      const known = new Map(current.edits.map(edit => [edit.id, edit]));
      const selected = ids.map(id => { const edit = known.get(id); if (!edit) throw new UsageError(`Unknown edit id: ${id}. Read the site's edits again.`); return edit; });
      const ordered = selected.toSorted((a, b) => a.start - b.start || a.end - b.end);
      for (let i = 1; i < ordered.length; i++) if (ordered[i]!.start < ordered[i - 1]!.end) throw new UsageError('Edits overlap. Choose one edit for each source range.');
      // Refuse aliases and hard links, and hold the source descriptor throughout the write.
      const identity = await this.editableFile(file);
      const handle = await open(file, constants.O_RDWR | constants.O_NOFOLLOW);
      let next: string, before: string;
      try {
        const info = await handle.stat();
        if (!info.isFile() || info.nlink !== 1) throw new UsageError('Apply requires a regular source file without hard links.');
        if (info.dev !== identity.dev || info.ino !== identity.ino) throw new UsageError(staleFile);
        await this.sameFile(file, identity);
        const bytes = Buffer.alloc(info.size);
        let offset = 0;
        while (offset < bytes.length) { const { bytesRead } = await handle.read(bytes, offset, bytes.length - offset, offset); if (!bytesRead) break; offset += bytesRead; }
        const source = bytes.subarray(0, offset).toString('utf8');
        if (sourceHash(source) !== hash) throw new UsageError(staleFile);
        before = source;
        next = source;
        for (const edit of ordered.toReversed()) next = next.slice(0, edit.start) + edit.to + next.slice(edit.end);
        parsesAsBefore(file, source, next);
        await this.sameFile(file, identity);
        await handle.writeFile(next, 'utf8');
        await handle.truncate(Buffer.byteLength(next));
        await this.sameFile(file, identity);
      } finally { await handle.close(); }
      await this.reconcile([file]);
      // Earlier replacements can shift later columns. Query the resulting authored sites.
      const starts = lineStarts(next);
      let delta = 0;
      const sites = ordered.map(edit => {
        const site = sourceSite({ file, text: next, lineStarts: starts }, edit.start + delta, edit.to);
        delta += edit.to.length - (edit.end - edit.start);
        return { line: site.line };
      });
      const snapshot = await this.request<{ hash: string; remaining: Report['findings'] }>('remaining', { file, sites });
      if (snapshot.hash !== sourceHash(next) || snapshot.hash !== this.hashes.get(file) || sourceHash(await readFile(file, 'utf8')) !== snapshot.hash) throw new UsageError(staleFile);
      const undo = this.record(file, before, snapshot.hash, sites[0]!.line, ordered.map(edit => changed(edit.from, edit.to, '')).join(', '));
      return { revision: this.revision, file, hash: snapshot.hash, applied: ids, remaining: snapshot.remaining, undo };
    });
  }
  /** Remember the file as it was, so this write can be taken back while nothing has touched it since. */
  private record(path: string, before: string, hashAfter: string, line: number, label: string, perLine = false): UndoHandle {
    const file = relative(this.root, path).replaceAll('\\', '/');
    this.progress();
    const id = `w${++this.writes}`;
    this.written.push({ id, file, line, label, at: new Date().toISOString(), path, before, hashAfter });
    this.evict();
    // each change in it, for the trace; the trace never fails a write that already landed
    try {
      const after = readFileSync(path, 'utf8');
      if (sourceHash(after) === hashAfter) this.log.add({ write: `${this.nonce}:${id}`, file, group: this.tag?.group ?? this.log.group(), ...(this.tag?.meta === undefined ? {} : { meta: this.tag.meta }), ...(this.undoing ? { undoing: this.undoing } : {}) }, before, after, (from, to) => changed(from, to, ''), perLine ? byLine : undefined);
    } catch { /* the write stands; only its trace is missing */ }
    return { id, file, label };
  }
  /** The history keeps the last 20 writes; a batch is kept or dropped whole, never part of one (undo would take the part
   * back as if it were the whole). */
  private evict(): void {
    while (this.written.length > historyLimit) {
      const oldest = this.written[0]!, batch = this.batchOf(oldest.id);
      if (!batch) { this.written.shift(); continue; }
      const members = new Set(this.batches.get(batch)!.members);
      this.written = this.written.filter(entry => !members.has(entry.id));
      this.batches.delete(batch);
    }
  }
  /** The batch a write is a member of. */
  private batchOf(write: string): string | undefined {
    for (const [id, batch] of this.batches) if (batch.members.includes(write)) return id;
    return undefined;
  }
  /** Writes made as one: a batch of its own, named by a handle of its own (the last file's, a new id). */
  private asOneWrite(handles: UndoHandle[], label: string): UndoHandle {
    if (handles.length < 2) return handles[0]!;
    const id = `w${++this.writes}`;
    this.batches.set(id, { label, members: handles.map(h => h.id) });
    this.evict();
    return { id, file: handles.at(-1)!.file, label };
  }
  /** Newest first. A write is stale when the file no longer holds what it wrote and no newer write here explains the
   * difference: something else changed the file, so undo would overwrite that change. Undo itself still refuses it. */
  async history(): Promise<{ writes: HistoryEntry[] }> {
    const stale = new Set<string>();
    for (const path of new Set(this.written.map(entry => entry.path))) {
      let expected = sourceHash(await readFile(path, 'utf8').catch(() => '')), broken = false;
      for (const entry of this.written.filter(entry => entry.path === path).toReversed()) {
        if (!broken && entry.hashAfter !== expected) broken = true;
        if (broken) stale.add(entry.id);
        expected = sourceHash(entry.before);
      }
    }
    // a batch is one entry, where its newest write is, and stale when any of its writes is
    const entries: HistoryEntry[] = [], listed = new Map<string, HistoryEntry>();
    for (const w of this.written.toReversed()) {
      const id = this.batchOf(w.id), batch = id === undefined ? undefined : this.batches.get(id), kept = id === undefined ? undefined : listed.get(id);
      if (kept) { kept.files!.push(w.file); if (stale.has(w.id)) kept.stale = true; continue; }
      const entry: HistoryEntry = { id: id ?? w.id, file: w.file, line: w.line, label: batch?.label ?? w.label, at: w.at, ...(stale.has(w.id) ? { stale: true as const } : {}), ...(batch ? { files: [w.file] } : {}) };
      if (id !== undefined) listed.set(id, entry);
      entries.push(entry);
    }
    return { writes: entries };
  }
  /** Restore the file as it was before a write, when nothing has changed it since. Goes through the same guards as a write. */
  undo(id: string): Promise<UndoResult> {
    if (typeof id !== 'string' || !id.trim()) throw new UsageError('Undo requires the id of a write.');
    return this.serialize(async () => {
      if (this.batches.has(id)) return this.undoBatch(id);
      const entry = this.written.find(item => item.id === id);
      if (!entry) throw new UsageError('That write is not in the history; only the last 20 writes can be undone, and each only once.');
      if (this.batchOf(id) !== undefined) throw new UsageError('That write is part of one made as one; undo that one, whole.');
      return this.undoOne(entry);
    });
  }
  /** One write taken back; the caller holds the lock (serialize). */
  private async undoOne(entry: Recorded): Promise<UndoResult> {
    const id = entry.id;
    const file = this.file(entry.path);
    await this.editableFile(file);
    if (sourceHash(await readFile(file, 'utf8')) !== entry.hashAfter) throw new UsageError('The file changed since this write. Undo the newer writes first, or edit it by hand.');
    await this.reconcile([file]);
    if (this.hashes.get(file) !== entry.hashAfter) throw new UsageError('The file changed since this write. Undo the newer writes first, or edit it by hand.');
    const identity = await this.editableFile(file);
    const handle = await open(file, constants.O_RDWR | constants.O_NOFOLLOW);
    try {
      const info = await handle.stat();
      if (!info.isFile() || info.nlink !== 1) throw new UsageError('Apply requires a regular source file without hard links.');
      if (info.dev !== identity.dev || info.ino !== identity.ino) throw new UsageError(staleFile);
      await this.sameFile(file, identity);
      const bytes = Buffer.alloc(info.size);
      let offset = 0;
      while (offset < bytes.length) { const { bytesRead } = await handle.read(bytes, offset, bytes.length - offset, offset); if (!bytesRead) break; offset += bytesRead; }
      if (sourceHash(bytes.subarray(0, offset).toString('utf8')) !== entry.hashAfter) throw new UsageError('The file changed since this write. Undo the newer writes first, or edit it by hand.');
      await this.sameFile(file, identity);
      await handle.writeFile(entry.before, 'utf8'); await handle.truncate(Buffer.byteLength(entry.before));
      await this.sameFile(file, identity);
    } finally { await handle.close(); }
    this.written = this.written.filter(item => item.id !== id);
    try { this.log.drop(new Set([`${this.nonce}:${id}`])); } catch { /* the trace keeps them; they read as changed */ }
    await this.reconcile([file]);
    const snapshot = await this.request<{ hash: string; remaining: Report['findings'] }>('remaining', { file, sites: [{ line: entry.line }] });
    if (snapshot.hash !== sourceHash(entry.before) || snapshot.hash !== this.hashes.get(file)) throw new UsageError(staleFile);
    return { revision: this.revision, file, hash: snapshot.hash, undone: id, remaining: snapshot.remaining };
  }
  /** Take back writes made as one, under the one lock the caller holds: every file is checked before any is written, then
   * each goes back, newest first; no other write can come between two of them. */
  private async undoBatch(id: string): Promise<UndoResult> {
    const batch = this.batches.get(id)!;
    const members = batch.members.map(member => this.written.find(entry => entry.id === member));
    if (members.some(entry => !entry)) throw new UsageError('Part of that write is no longer in the history, so it can\'t be undone whole; edit it by hand.');
    // a file written twice in the batch holds what its newest write left
    const newest = [...new Map((members as Recorded[]).map(entry => [entry.path, entry])).values()];
    for (const entry of newest) if (sourceHash(await readFile(entry.path, 'utf8').catch(() => '')) !== entry.hashAfter) throw new UsageError(`${entry.file} changed since this write. Undo the newer writes first, or edit it by hand.`);
    let last: UndoResult | undefined;
    try { for (const entry of (members as Recorded[]).toReversed()) last = await this.undoOne(entry); }
    finally {
      // a member that could not go back (a hard link made since) keeps the rest of the batch, to be undone again
      const left = batch.members.filter(member => this.written.some(entry => entry.id === member));
      if (left.length) this.batches.set(id, { ...batch, members: left }); else this.batches.delete(id);
    }
    return { ...last!, undone: id };
  }
  /** Run one write under a tag: every change it records carries the tag's group (a new one when none is given) and meta. */
  async traced(tag: TraceTag | undefined, method: string, args: unknown[]): Promise<unknown> {
    if (!tracedWrites.has(method) || !Array.isArray(args)) throw new UsageError(`${String(method)} is not a write that can be traced.`);
    if (tag !== undefined && (!tag || typeof tag !== 'object' || Array.isArray(tag))) throw new UsageError('trace must be an object: { group, meta }.');
    if (tag?.group !== undefined && (typeof tag.group !== 'string' || !/^[\w:.-]{1,64}$/.test(tag.group))) throw new UsageError('trace.group must be at most 64 letters, digits, _ : . or -.');
    if (tag?.meta !== undefined && JSON.stringify(tag.meta).length > 4000) throw new UsageError('trace.meta must be at most 4000 characters of JSON.');
    const previous = this.tag, group = tag?.group ?? this.log.group();
    this.tag = { group, ...(tag?.meta === undefined ? {} : { meta: tag.meta }) };
    // the answer names the step its changes went into, so the caller can take back exactly that step (the write toast's Undo)
    try { const result = await (this[method as keyof this] as (...a: unknown[]) => Promise<unknown>).apply(this, args); return result && typeof result === 'object' && !Array.isArray(result) ? { ...result, trace: { group } } : result; } finally { this.tag = previous; }
  }
  /** The site's spacing as the census read it: every row-level distance between a stack's children, on every route
   * (the page works out its rhythm with overlay/src/stacks.js rhythmOf, the same reader that measured them). */
  async rhythm(): Promise<{ distances: number[]; gaps: { d: number; em: number | null }[]; routes: number }> {
    const kept = await projectCensus(this.root);
    if (!kept) throw new UsageError('There is no census of the project yet.\n  → plumber census --url <your dev server>');
    return { distances: kept.gaps.map(gap => gap.d), gaps: kept.gaps.map(gap => ({ d: gap.d, em: gap.em ?? null })), routes: kept.census.routes.length };
  }
  /** The site's colours as the census read them: every place's text, background and border colour (composited over its
   * ground, in oklab) with the class that sets it and the route, on every route (overlay/src/colours.js reads them). */
  async palette(): Promise<{ colours: { prop: 'text' | 'bg' | 'border'; oklab: [number, number, number]; cls: string | null; data?: boolean; route: string }[]; routes: number }> {
    const kept = await projectCensus(this.root);
    if (!kept) throw new UsageError('There is no census of the project yet.\n  → plumber census --url <your dev server>');
    if (!kept.colours) throw new UsageError('The census was taken before colours were read.\n  → plumber census --url <your dev server>');
    return { colours: kept.colours.map(row => ({ prop: row.prop, oklab: row.oklab, cls: row.cls, ...(row.data ? { data: true } : {}), route: row.route ?? '' })), routes: kept.census.routes.length };
  }
  /** The site's icons as the census read them: every icon place (an svg's origin, size, stroke, gap, the class that sizes it; an emoji
   * standing in for one) on every route, and the icon sets the project has installed (overlay/src/icons.js reads them). */
  async icons(): Promise<{ icons: (CensusIcon & { route: string })[]; routes: number; installed: InstalledIconSet[] }> {
    const kept = await projectCensus(this.root);
    if (!kept) throw new UsageError('There is no census of the project yet.\n  → plumber census --url <your dev server>');
    if (!kept.icons) throw new UsageError('The census was taken before icons were read.\n  → plumber census --url <your dev server>');
    return { icons: kept.icons.map(row => ({ ...row, route: row.route ?? '' })), routes: kept.census.routes.length, installed: await installedIconSets(this.root) };
  }
  /** Every change written, newest first, each live, undone or changed since (by a later change or by hand). */
  async trace(group?: string): Promise<{ changes: TraceEntry[] }> {
    if (group !== undefined && (typeof group !== 'string' || !group.trim())) throw new UsageError('group must be a non-empty string.');
    const changes = this.log.trace(this.reader());
    return { changes: group === undefined ? changes : changes.filter(change => change.group === group) };
  }
  /** Take back one change: its inverse, written where the change is found now. */
  undoChange(id: string): Promise<UndoChangesResult> {
    if (typeof id !== 'string' || !id.trim()) throw new UsageError('Undo takes the id of a change.');
    return this.undoChanges([id]);
  }
  /** Take back every change of a group still standing, all or nothing. */
  undoGroup(group: string): Promise<UndoChangesResult> {
    if (typeof group !== 'string' || !group.trim()) throw new UsageError('Undo takes the id of a group.');
    const standing = this.log.trace(this.reader()).filter(change => change.group === group && change.state !== 'undone');
    if (!standing.length) throw new UsageError('Nothing in that group is left to undo.');
    return this.undoChanges(standing.map(change => change.id));
  }
  private reader(): (file: string) => string | undefined {
    const texts = new Map<string, string | undefined>();
    return file => {
      if (!texts.has(file)) { let text: string | undefined; try { text = readFileSync(this.file(file), 'utf8'); } catch { /* gone */ } texts.set(file, text); }
      return texts.get(file);
    };
  }
  /** The inverse of each change, one guarded write per file; a change whose place no longer holds what it wrote refuses
   * the lot, and a file that fails puts the files already written back as they were. The timeline's Go back to here:
   * every change after a point, all or nothing. */
  async undoChanges(ids: string[]): Promise<UndoChangesResult> {
    if (!Array.isArray(ids) || !ids.length || ids.some(id => typeof id !== 'string' || !id.trim())) throw new UsageError('Undo takes the ids of the changes.');
    const records = this.log.all(), states = new Map(this.log.trace(this.reader()).map(entry => [entry.id, entry]));
    const targets = ids.map(id => {
      const record = records.find(r => r.id === id), state = states.get(id);
      if (!record || !state) throw new UsageError(`There is no change ${id} in the trace.`);
      if (state.state === 'undone') throw new UsageError(`${id} is already undone (by ${state.undoneBy}).`);
      if (state.state === 'changed') throw new UsageError(`${id} can't be undone: its place no longer holds what it wrote${state.by ? `; changed since by ${state.by.join(', ')}` : '; it was edited outside React Plumber'}.`);
      return record;
    });
    const files = new Map<string, ChangeRecord[]>();
    for (const r of targets) files.set(r.file, [...files.get(r.file) ?? [], r]);
    const done: UndoHandle[] = [], hashes: Record<string, string> = {};
    const previous = this.tag;
    this.tag = { group: previous?.group ?? this.log.group(), ...(previous?.meta === undefined ? {} : { meta: previous.meta }) };
    this.undoing = targets;
    const none = { tokens: [], css: [], swaps: [], accepts: [] };
    try { await this.manyFiles(async () => {
      for (const [file, list] of files) {
        const path = this.file(file), text = await readFile(path, 'utf8');
        const placed = list.map(r => ({ r, at: locate(text, r) })).sort((x, y) => (y.at ?? 0) - (x.at ?? 0));
        if (placed.some(p => p.at === null)) throw new UsageError('A change moved while it was being undone. Read the trace again.');
        for (let k = 1; k < placed.length; k++) if (placed[k]!.at! + placed[k]!.r.to.length > placed[k - 1]!.at!) throw new UsageError('Two of these changes overlap; undo them one at a time.');
        let next = text;
        for (const { r, at } of placed) next = next.slice(0, at!) + r.from + next.slice(at! + r.to.length);
        // taking back a change that wrote whole blocks (a type role's @utility) drops exactly those blocks, and no other
        const blocksRemoved = /\.css$/.test(path) ? list.reduce((n, r) => n + Math.max(0, topBlocks(r.to).length - topBlocks(r.from).length), 0) : 0;
        const result = await this.rewrite(path, sourceHash(text), next, `undo ${list.map(r => r.label).join(', ')}`.slice(0, 120), blocksRemoved);
        done.push(result.undo); hashes[file] = result.hash;
      }
    }, () => ({ results: none, undo: done, labels: done.map(h => h.label) })); } catch (error) {
      this.undoing = undefined;
      for (const handle of done.toReversed()) await this.undo(handle.id).catch(() => {});
      throw error;
    } finally { this.undoing = undefined; this.tag = previous; }
    return { revision: this.revision, undone: ids, undo: done, files: hashes };
  }
  decisions(): Promise<Report['decisions']> { return this.read('decisions'); }
  /** The spacing multiplier, read once per generation of changes: every element card asks, and it walks every declaration. */
  spacingUnit(): Promise<SpacingUnit | null> {
    const generation = this.pageGeneration;
    if (this.unitKept?.generation === generation) return Promise.resolve(this.unitKept.value);
    return this.read<SpacingUnit | null>('spacingUnit').then(value => { this.unitKept = { generation, value }; return value; });
  }
  /** The craft spec in effect (docs/briefs/craft-spec.md): the standard, the project's config over it, the token target. */
  spec(): Promise<ProjectSpec> { return this.read('spec'); }
  /** The places in these files: the findings whose sites are in each (sites filtered to it) and its declarations. */
  places(files: string[]): Promise<PlacesResult> {
    if (!Array.isArray(files) || files.length > 4096 || files.some(file => typeof file !== 'string' || !file.trim())) throw new UsageError('places takes a list of at most 4096 files.');
    const paths = [...new Set(files.map(file => this.file(file)))];
    return this.read('places', { files: paths, revision: this.revision });
  }
  why(file: string, line: number): Promise<Awaited<ReturnType<typeof import('../ledger/commands.js').inspectLedger>>> { return this.read('why', { file: this.file(file), line: this.position(line) }); }
  try(code: string, options: Pick<TryOptions, 'lang' | 'as' | 'verbose'> = {}): Promise<Report> { return this.read('try', { code, ...options }); }
  private healthSnapshot: { caches: object; work?: object } = { caches: {} };
  /** Where these words are written: JSX text in the element, an attribute at it or a use site, or a literal in source. */
  textAt(file: string, line: number, column: number, words: string, owners?: string): Promise<TextAtResult> {
    const path = this.file(file); this.position(line); this.position(column);
    if (typeof words !== 'string' || words.length > 2000) throw new UsageError('text must be at most 2000 characters.');
    // Owners are untrusted: any that is not readable project source is skipped, never an error.
    const chain: { path: string; line: number; column: number }[] = [];
    for (const item of (owners ?? '').split(',').slice(0, 32)) {
      const match = /^(.+):(\d+):(\d+)$/.exec(item.trim());
      if (!match) continue;
      try { chain.push({ path: this.file(match[1]!), line: Number(match[2]), column: Number(match[3]) }); } catch { /* not project source */ }
    }
    return this.serializeRead(async () => {
      await this.readableSource(path);
      if (!this.batchRead) await this.reconcile([path]);
      if (!this.sourceFiles.has(path) || !/\.[cm]?[jt]sx?$/.test(path)) throw new UsageError('Text edits require a tracked JSX source file.');
      const read = async (target: string) => {
        if (!this.sourceFiles.has(target) || !/\.[cm]?[jt]sx?$/.test(target)) return undefined;
        try { await this.readableSource(target); return await readFile(target, 'utf8'); } catch { return undefined; }
      };
      return resolveTextAt({ line, column, words, owners: chain, read, relative: target => relative(this.root, target).replaceAll('\\', '/'),
        files: () => [...this.sourceFiles].filter(target => /\.[cm]?[jt]sx?$/.test(target) && containsPath(sourceBoundary(this.root), target)).sort() }, path);
    });
  }
  health() {
    return Promise.resolve({ ...this.healthSnapshot, work: { ...this.healthSnapshot.work, reconciliations: this.reconciliations, recipeIndexes: this.recipeIndexes }, status: this.failure ? 'invalid' : 'ready', root: this.root,
      ...(this.outsideSources.size ? { outsideSource: [...this.outsideSources].filter(file => !this.sourceFiles.has(file)) } : {}),
      revision: this.revision, pid: process.pid, rss: process.memoryUsage().rss,
      ...(this.failure ? { diagnostic: this.failure.message } : {}) });
  }
  get stats(): unknown { return this.lastStats; }
  private file(file: string): string {
    if (typeof file !== 'string' || !file.trim()) throw new UsageError('File must be a non-empty source path.');
    const path = sourcePath(this.root, file), inside = relative(this.root, path);
    if (!inside || !containsPath(sourceBoundary(this.root), path) || !containsPath(this.root, path) && !this.sourceFiles.has(path)) throw new UsageError('File must be inside the project root.');
    return path;
  }
  private async readableSource(file: string): Promise<void> {
    if (!containsPath(this.root, file) && !await ownSourcePath(this.root, file)) throw new UsageError('Shared source cannot read symbolic links or paths outside the repository/workspace root.');
  }
  private async editableFile(file: string): Promise<{ dev: number; ino: number }> {
    this.file(file);
    const inside = relative(this.root, file).replaceAll('\\', '/');
    if (/(?:^|\/)plumb(?:er)?\.config\.[^/]+$/.test(inside) || /(?:^|\/)\.plumb(?:er)?(?:\/|$)/.test(inside)) throw new UsageError('Apply cannot edit React Plumber config or .plumb files.');
    const identity = await lstat(file);
    const root = await realpath(this.root), path = await realpath(file);
    if (path !== resolve(root, inside)) throw new UsageError('Apply cannot edit symbolic links or paths outside the project root.');
    const current = await lstat(file);
    if (identity.dev !== current.dev || identity.ino !== current.ino) throw new UsageError(staleFile);
    if (!current.isFile() || current.nlink !== 1) throw new UsageError('Apply requires a regular source file without hard links.');
    return identity;
  }
  private async sameFile(file: string, identity: { dev: number; ino: number }): Promise<void> {
    const current = await this.editableFile(file);
    if (current.dev !== identity.dev || current.ino !== identity.ino) throw new UsageError(staleFile);
  }
  private position(value: number): number { if (!Number.isSafeInteger(value) || value < 1) throw new UsageError('Line and column must be positive integers.'); return value; }
  async close(): Promise<void> {
    if (this.closed) return; this.closed = true;
    if (this.timer) clearInterval(this.timer); if (this.debounce) clearTimeout(this.debounce);
    for (const watcher of this.watchers) watcher.close();
    this.rejectPending(new Error('Session is closed.')); if (this.worker) await this.worker.terminate(); this.removeAllListeners();
  }
}
export const createSession = Session.create;
