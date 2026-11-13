// The reading table the server keeps between starts (docs/briefs/server-warm-start.md): for every source file, the
// declarations and findings at each place in it, as a page is sent them, plus the project's decisions. It is what
// a page and the Alt card ask for, and nothing else: no edits, no ledger state, none of the working state.
//
// Stored as tables, not as the objects it is read as. On a 3,588-file app the same 304,350 declarations as plain
// objects were 257 MB, and nine in ten were the same declaration at another place. So:
//   paths    every file path, once; a file is its number
//   bodies   each distinct declaration without its place, as JSON text, once; parsed only when a file is read
//   files    per file: its declarations as (body number, place) pairs, and its findings
// Everything a reading says is still there: unpacking a file gives back the same declarations and findings.
import { serialize, deserialize } from 'node:v8';
import { createHash } from 'node:crypto';
import type { Report } from '../report.js';
import { drawn } from '../report.js';

type Declaration = Report['declarations'][number];
type Finding = Report['findings'][number];
/** A place without its file: the file is the table row it sits in. */
type Place = Omit<Declaration['site'], 'file'>;
export interface KeptTable {
  version: 1;
  paths: string[];
  bodies: string[];
  files: { path: number; declarations: [body: number, place: Place][]; findings: Finding[] }[];
  decisions: Report['decisions'];
}
export interface KeptStats { files: number; declarations: number; bodies: number; findings: number; bytes: number; hash: string }
export interface KeptReading { file: string; declarations: Declaration[]; findings: Finding[] }

/** The table for a report (the server's own view of it: no ledger applied). */
export function packReadings(report: Report): { data: Buffer; stats: KeptStats } {
  const paths: string[] = [], pathIds = new Map<string, number>();
  const bodies: string[] = [], bodyIds = new Map<string, number>();
  const files: KeptTable['files'] = [], byPath = new Map<string, KeptTable['files'][number]>();
  const row = (file: string) => {
    let entry = byPath.get(file);
    if (!entry) { pathIds.set(file, paths.length); paths.push(file); entry = { path: paths.length - 1, declarations: [], findings: [] }; byPath.set(file, entry); files.push(entry); }
    return entry;
  };
  let declarations = 0, findings = 0;
  for (const declaration of report.declarations) {
    const { site, ...body } = declaration, { file, ...place } = site;
    const text = JSON.stringify(body);
    let id = bodyIds.get(text);
    if (id === undefined) { id = bodies.length; bodies.push(text); bodyIds.set(text, id); }
    row(file).declarations.push([id, place]);
    declarations++;
  }
  // a finding is kept at every file it has a place in, with only that file's places, as `places` answers it
  for (const finding of report.findings) {
    if (finding.rule.startsWith('config/')) continue;
    for (const file of new Set(finding.sites.map(site => site.file))) {
      row(file).findings.push({ ...drawn(finding), sites: finding.sites.filter(site => site.file === file),
        ...(finding.occurrences ? { occurrences: finding.occurrences.filter(d => d.site.file === file) } : {}) } as Finding);
      findings++;
    }
  }
  const table: KeptTable = { version: 1, paths, bodies, files, decisions: report.decisions };
  const data = serialize(table);
  return { data, stats: { files: files.length, declarations, bodies: bodies.length, findings, bytes: data.length, hash: createHash('sha256').update(data).digest('hex') } };
}

export function loadReadings(data: Uint8Array): KeptTable {
  const table = deserialize(data) as KeptTable;
  if (table?.version !== 1) throw new Error('Not a reading table this build understands.');
  return table;
}

/** One file's reading out of the table; undefined for a file with nothing in it. */
export function readingOf(table: KeptTable, file: string): KeptReading | undefined {
  const path = table.paths.indexOf(file);
  const entry = path < 0 ? undefined : table.files.find(item => item.path === path);
  if (!entry) return undefined;
  return { file, findings: entry.findings,
    declarations: entry.declarations.map(([body, place]) => ({ ...JSON.parse(table.bodies[body]!), site: { file, ...place } }) as Declaration) };
}
