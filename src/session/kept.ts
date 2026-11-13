// The reading table the server keeps between starts (docs/briefs/server-warm-start.md): for every source file, the
// declarations and findings at each place in it, as a page is sent them, plus the project's decisions. It is what
// a page and the Alt card ask for, and nothing else: no edits, no ledger state, none of the working state.
//
// Stored as tables, not as the objects it is read as. On a 3,588-file app the readings as plain objects were 257 MB,
// and almost all of it was the same thing said again: nine declarations in ten are the same declaration at another
// place, a finding repeats the declarations it is about in full, and 20,000 findings share 200 lists of decisions.
//   paths    every file path, once; a file is its number
//   strings  every text a place or a finding carries (a class, an anchor, a title, a fix), once
//   jsons    every value that repeats whole (a declaration without its place, a list of decisions), as JSON text,
//            once; parsed only when a file is read
//   files    per file: its declarations as columns of numbers (which declaration, line, column, text, anchor), and
//            its findings as numbers pointing into the tables and into the file's own declarations
// Everything a reading says is still there: unpacking a file gives back the same declarations and findings.
//
// It is built a slice at a time (ReadingPacker.step), so the worker that builds it can answer between slices.
import { serialize, deserialize } from 'node:v8';
import { createHash } from 'node:crypto';
import type { Report } from '../report.js';
import { drawn } from '../report.js';

type Declaration = Report['declarations'][number];
type Finding = Report['findings'][number];
type Site = Declaration['site'];
const VERSION = 2, MAGIC = 'plumber-readings';
/** Numbers per place: which declaration (or -1), line, column, text, anchor, anything else a place carries. */
const PLACE = 6;
const TEXTS = ['title', 'because', 'why', 'fix', 'action', 'accept'] as const;
const WHOLE = ['decisions', 'choices', 'component'] as const;
interface PackedFinding {
  /** everything small and its own: key, rule, family, severity, … (a json number) */
  rest: number;
  texts: number[];
  whole: number[];
  /** its places in this file, PLACE numbers each (the declaration slot unused) */
  sites: number[];
  /** the declarations it is about: an index into this file's declarations, or -1 and the next entry of `inline` */
  occurrences?: number[];
  declaration?: number;
  /** declarations that are not among this file's own: path, then a place */
  inline: number[];
}
interface PackedFile { path: number; declarations: number[]; findings: PackedFinding[] }
export interface KeptTable {
  version: typeof VERSION;
  paths: string[];
  strings: string[];
  jsons: string[];
  files: PackedFile[];
  decisions: Report['decisions'];
}
export interface KeptStats { files: number; declarations: number; bodies: number; findings: number; bytes: number; hash: string }
export interface KeptReading { file: string; declarations: Declaration[]; findings: Finding[] }

class Interner {
  readonly values: string[] = [];
  private ids = new Map<string, number>();
  id(text: string | undefined): number {
    if (text === undefined) return -1;
    let id = this.ids.get(text);
    if (id === undefined) { id = this.values.length; this.values.push(text); this.ids.set(text, id); }
    return id;
  }
}

/** Builds the table for a report (the server's own view of it: no ledger applied), a few milliseconds at a time. */
export class ReadingPacker {
  private paths = new Interner(); private strings = new Interner(); private jsons = new Interner();
  private files: PackedFile[] = []; private rows = new Map<string, PackedFile>();
  /** per file: a declaration's numbers → where it is in the file's own list */
  private own = new Map<PackedFile, Map<string, number>>();
  private at = 0; private phase: 'declarations' | 'findings' | 'sections' | 'done' = 'declarations';
  private sections: Buffer[] = []; private chunk = 0;
  private counts = { declarations: 0, findings: 0 };
  constructor(readonly report: Report) {}
  private row(file: string): PackedFile {
    let entry = this.rows.get(file);
    if (!entry) { entry = { path: this.paths.id(file), declarations: [], findings: [] }; this.rows.set(file, entry); this.files.push(entry); this.own.set(entry, new Map()); }
    return entry;
  }
  private place(site: Site, body: number, into: number[]): string {
    const { file: _file, line, column, text, anchor, ...extra } = site;
    const numbers = [body, line, column, this.strings.id(text), this.strings.id(anchor), Object.keys(extra).length ? this.jsons.id(JSON.stringify(extra)) : -1];
    into.push(...numbers);
    return numbers.join(',');
  }
  private body(declaration: Declaration): number { const { site: _site, ...body } = declaration; return this.jsons.id(JSON.stringify(body)); }
  /** a declaration a finding is about: its index among the file's own, or -1 and written out in `inline` */
  private reference(declaration: Declaration, row: PackedFile, inline: number[]): number {
    const probe: number[] = [], key = this.place(declaration.site, this.body(declaration), probe);
    const index = this.paths.values[row.path] === declaration.site.file ? this.own.get(row)!.get(key) : undefined;
    if (index !== undefined) return index;
    inline.push(this.paths.id(declaration.site.file), ...probe);
    return -1;
  }
  /** Do up to `budget` ms of the work. True when the table is complete. */
  step(budget: number): boolean {
    const until = performance.now() + budget, report = this.report;
    if (this.phase === 'declarations') {
      const list = report.declarations;
      while (this.at < list.length) {
        const declaration = list[this.at++]!, row = this.row(declaration.site.file);
        const key = this.place(declaration.site, this.body(declaration), row.declarations);
        const own = this.own.get(row)!;
        if (!own.has(key)) own.set(key, row.declarations.length / PLACE - 1);
        this.counts.declarations++;
        if ((this.at & 255) === 0 && performance.now() > until) return false;
      }
      this.phase = 'findings'; this.at = 0;
    }
    if (this.phase === 'findings') {
      const list = report.findings;
      while (this.at < list.length) {
        const finding = list[this.at++]!;
        // a finding is kept at every file it has a place in, with only that file's places, as `places` answers it
        if (!finding.rule.startsWith('config/')) {
          // its places and the declarations it is about, sorted by file once: a finding with thousands of places in
          // hundreds of files must not be searched through again for each of those files
          const places = new Map<string, Site[]>(), about = new Map<string, Declaration[]>();
          for (const site of finding.sites) { const list = places.get(site.file); if (list) list.push(site); else places.set(site.file, [site]); }
          for (const d of finding.occurrences ?? []) { const list = about.get(d.site.file); if (list) list.push(d); else about.set(d.site.file, [d]); }
          const view = drawn(finding) as Record<string, unknown>;
          const rest: Record<string, unknown> = {};
          for (const [key, value] of Object.entries(view)) if (!['sites', 'occurrences', 'declaration', ...TEXTS, ...WHOLE].includes(key)) rest[key] = value;
          const restId = this.jsons.id(JSON.stringify(rest)), texts = TEXTS.map(key => this.strings.id(view[key] as string | undefined));
          const whole = WHOLE.map(key => view[key] === undefined ? -1 : this.jsons.id(JSON.stringify(view[key])));
          for (const [file, own] of places) {
            const row = this.row(file), inline: number[] = [], sites: number[] = [];
            for (const site of own) this.place(site, -1, sites);
            const packed: PackedFinding = { rest: restId, texts, whole, sites, inline };
            if (finding.occurrences) packed.occurrences = (about.get(file) ?? []).map(d => this.reference(d, row, inline));
            if (finding.declaration) packed.declaration = this.reference(finding.declaration, row, inline);
            row.findings.push(packed);
            this.counts.findings++;
          }
        }
        if (performance.now() > until) return false;
      }
      this.phase = 'sections'; this.at = 0;
    }
    if (this.phase === 'sections') {
      // the tables first, then the files a few hundred at a time: no one piece is long to write out
      if (this.chunk === 0) { this.sections.push(serialize({ magic: MAGIC, version: VERSION, paths: this.paths.values, decisions: report.decisions })); this.chunk = 1; if (performance.now() > until) return false; }
      if (this.chunk === 1) { this.sections.push(serialize(this.strings.values)); this.chunk = 2; if (performance.now() > until) return false; }
      if (this.chunk === 2) { this.sections.push(serialize(this.jsons.values)); this.chunk = 3; if (performance.now() > until) return false; }
      while (this.at < this.files.length) {
        this.sections.push(serialize(this.files.slice(this.at, this.at + 128)));
        this.at += 128;
        if (performance.now() > until) return false;
      }
      this.phase = 'done';
    }
    return true;
  }
  /** The finished table as bytes: a count, then each section behind its length. */
  finish(): { data: Buffer; stats: KeptStats } {
    if (this.phase !== 'done') throw new Error('The reading table is not finished.');
    const head = Buffer.alloc(4 + 4 * this.sections.length);
    head.writeUInt32LE(this.sections.length, 0);
    this.sections.forEach((section, index) => head.writeUInt32LE(section.length, 4 + 4 * index));
    const data = Buffer.concat([head, ...this.sections]);
    const bodies = new Set<number>(); for (const file of this.files) for (let i = 0; i < file.declarations.length; i += PLACE) bodies.add(file.declarations[i]!);
    return { data, stats: { files: this.files.length, declarations: this.counts.declarations, bodies: bodies.size, findings: this.counts.findings, bytes: data.length, hash: createHash('sha256').update(data).digest('hex') } };
  }
}

/** The whole table at once (a test, a script). The server builds it in slices. */
export function packReadings(report: Report): { data: Buffer; stats: KeptStats } {
  const packer = new ReadingPacker(report);
  while (!packer.step(Infinity)) { /* until done */ }
  return packer.finish();
}

export function loadReadings(data: Uint8Array): KeptTable {
  const bytes = Buffer.from(data.buffer, data.byteOffset, data.byteLength), count = bytes.readUInt32LE(0);
  const sections: unknown[] = [];
  let offset = 4 + 4 * count;
  for (let index = 0; index < count; index++) { const length = bytes.readUInt32LE(4 + 4 * index); sections.push(deserialize(bytes.subarray(offset, offset + length))); offset += length; }
  const head = sections[0] as { magic?: string; version?: number; paths: string[]; decisions: Report['decisions'] };
  if (head?.magic !== MAGIC || head.version !== VERSION) throw new Error('Not a reading table this build understands.');
  return { version: VERSION, paths: head.paths, decisions: head.decisions, strings: sections[1] as string[], jsons: sections[2] as string[], files: (sections.slice(3) as PackedFile[][]).flat() };
}

/** One file's reading out of the table; undefined for a file with nothing in it. */
export function readingOf(table: KeptTable, file: string): KeptReading | undefined {
  const path = table.paths.indexOf(file), row = path < 0 ? undefined : table.files.find(item => item.path === path);
  if (!row) return undefined;
  const text = (id: number) => (id < 0 ? undefined : table.strings[id]), json = (id: number) => (id < 0 ? undefined : JSON.parse(table.jsons[id]!));
  const site = (numbers: number[], at: number, of: string): Site => {
    const anchor = text(numbers[at + 4]!), extra = json(numbers[at + 5]!);
    return { file: of, line: numbers[at + 1]!, column: numbers[at + 2]!, text: text(numbers[at + 3]!)!, ...(anchor === undefined ? {} : { anchor }), ...extra };
  };
  const declaration = (numbers: number[], at: number, of: string) => ({ ...json(numbers[at]!), site: site(numbers, at, of) }) as Declaration;
  const declarations: Declaration[] = [];
  for (let at = 0; at < row.declarations.length; at += PLACE) declarations.push(declaration(row.declarations, at, file));
  const findings = row.findings.map((packed) => {
    let next = 0;
    // a declaration the finding is about: one of the file's own, or the next one written out in `inline`
    const about = (index: number) => {
      if (index >= 0) return declaration(row.declarations, index * PLACE, file);
      const at = next; next += PLACE + 1;
      return declaration(packed.inline, at + 1, table.paths[packed.inline[at]!]!);
    };
    const finding: Record<string, unknown> = { ...json(packed.rest) };
    TEXTS.forEach((key, index) => { const value = text(packed.texts[index]!); if (value !== undefined) finding[key] = value; });
    WHOLE.forEach((key, index) => { const value = json(packed.whole[index]!); if (value !== undefined) finding[key] = value; });
    const sites: Site[] = []; for (let at = 0; at < packed.sites.length; at += PLACE) sites.push(site(packed.sites, at, file));
    finding.sites = sites;
    if (packed.occurrences) finding.occurrences = packed.occurrences.map(about);
    if (packed.declaration !== undefined) finding.declaration = about(packed.declaration);
    return finding as unknown as Finding;
  });
  return { file, declarations, findings };
}
