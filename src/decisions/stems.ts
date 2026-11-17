import { relative } from 'node:path';
import type { Decision, Family } from '../report.js';

// A stem every token of one file shares and no token of another family does (`--pl-space-` for --pl-space-1 to -8):
// one line for the whole scale, so it reads as the system it is and is corrected in one place
export function stems(decisions: Decision[]): Map<Decision, string> {
  const byFile = new Map<string, Decision[]>();
  for (const d of decisions) byFile.set(d.source.file, [...byFile.get(d.source.file) ?? [], d]);
  const result = new Map<Decision, string>();
  for (const group of byFile.values()) for (const d of group) {
    const parts = d.name.split('-');
    for (let cut = parts.length - 1; cut >= 3; cut--) {
      const stem = parts.slice(0, cut).join('-') + '-';
      const sharing = group.filter(other => other.name.startsWith(stem));
      if (sharing.length > 1 && sharing.every(other => other.family === d.family)) { result.set(d, `${stem}*`); break; }
    }
  }
  return result;
}

/** A token's reading split into its reasons, each said once ("used in gap 3 times" and "used in gap once" are one). */
export function reasons(members: Decision[]): string[] {
  const said = [...new Set(members.flatMap(d => (d.reading ?? '').split('; ')).filter(Boolean).map(reason => reason.replace(/ (?:once|\d+ times)$/, '')))];
  // every "used in …" is one reason: the properties that read the scale, each once
  const props = [...new Set(said.filter(r => r.startsWith('used in ')).flatMap(r => r.slice(8).split(', ')))];
  return [...said.filter(r => !r.startsWith('used in ')), ...(props.length ? [`used in ${props.join(', ')}`] : [])];
}

/** One scale (`pattern` is its stem, `--pl-space-*`), or a file's lone tokens of one kind (`pattern` is empty). */
export interface ReadingGroup { pattern: string; file: string; tokens: { name: string; value: string; raw: string }[]; reasons: string[] }
export interface FamilyReading { family: Family; groups: ReadingGroup[] }

/** How the project's tokens were read, by family, each family's tokens grouped by file and shared stem. */
export function readingOf(decisions: Decision[], root: string): FamilyReading[] {
  const stemOf = stems(decisions), families = new Map<Family, Map<string, Decision[]>>();
  for (const d of decisions) {
    const file = relative(root, d.source.file).replaceAll('\\', '/'), pattern = stemOf.get(d) ?? '';
    const groups = families.get(d.family) ?? new Map<string, Decision[]>();
    const key = JSON.stringify([file, pattern]);
    groups.set(key, [...groups.get(key) ?? [], d]);
    families.set(d.family, groups);
  }
  return [...families].map(([family, groups]) => ({
    family,
    groups: [...groups].map(([key, members]) => {
      const [file, pattern] = JSON.parse(key) as [string, string];
      return { pattern, file, tokens: members.map(d => ({ name: d.name, value: d.resolved ?? d.value, raw: d.value })), reasons: reasons(members) };
    }).sort((a, b) => Number(!a.pattern) - Number(!b.pattern) || b.tokens.length - a.tokens.length || a.pattern.localeCompare(b.pattern)),
  })).sort((a, b) => b.groups.reduce((n, g) => n + g.tokens.length, 0) - a.groups.reduce((n, g) => n + g.tokens.length, 0));
}
