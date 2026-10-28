// Primitives shared by every detection registry (project, styling, libraries): a fact is a value with the evidence
// that produced it and the source it came from. Rules R1–R4 of docs/briefs/project-detection-design.md live here.

/** How a fact is known. Precedence is fixed and total: override > observed > declared > inferred. */
export type Source = 'override' | 'observed' | 'declared' | 'inferred' | 'unknown';
/** Same shape as readiness evidence: a file (relative to the root), a 1-based line, and the text read there. */
export interface Evidence { file: string; line: number; text: string }
export type ClaimSource = Exclude<Source, 'override' | 'unknown'>;

/** What one detector says about one fact. A `null` value is a declaration of absence (a settings-only file). */
export interface Claim<T> { value: T | null; source: ClaimSource | 'unknown'; evidence: Evidence[]; detector: string }
export interface Fact<T> {
  value: T | null;          // null when source is 'unknown', or when a declared claim says "none"
  source: Source;
  evidence: Evidence[];     // never empty unless nothing on disk spoke to this fact
  conflicts?: Claim<T>[];   // lower-precedence claims that disagreed; kept, never thrown
}

export const evidence = (file: string, line: number, text: string): Evidence => ({ file, line, text });
export const claim = <T>(value: T | null, source: ClaimSource, evidence: Evidence[], detector: string): Claim<T> => ({ value, source, evidence, detector });
/** R2: unparsable is unknown, not an error. The evidence says what could not be read. */
export const unknownClaim = <T>(evidence: Evidence[], detector: string): Claim<T> => ({ value: null, source: 'unknown', evidence, detector });

const rank: Record<Source, number> = { override: 0, observed: 1, declared: 2, inferred: 3, unknown: 4 };
const sameJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * R3: the highest-precedence claim wins; within one source, registry order wins. Every losing claim that disagrees
 * is kept in `conflicts`. Unknown claims never win over a real claim; alone, they make the fact unknown with their
 * evidence, so a consumer can still show what was read.
 */
export function resolveFact<T>(claims: readonly Claim<T>[], override?: { value: T; evidence: Evidence[] }, same: (a: T | null, b: T | null) => boolean = sameJson): Fact<T> {
  if (override) {
    const conflicts = claims.filter(item => item.source !== 'unknown' && !same(item.value, override.value));
    return { value: override.value, source: 'override', evidence: override.evidence, ...(conflicts.length ? { conflicts } : {}) };
  }
  const ordered = claims.map((item, index) => ({ item, index })).sort((a, b) => rank[a.item.source] - rank[b.item.source] || a.index - b.index).map(({ item }) => item);
  const winner = ordered[0];
  if (!winner) return { value: null, source: 'unknown', evidence: [] };
  if (winner.source === 'unknown') return { value: null, source: 'unknown', evidence: ordered.flatMap(item => item.evidence) };
  const conflicts = ordered.slice(1).filter(item => item.source !== 'unknown' && !same(item.value, winner.value));
  const agreeing = ordered.slice(1).filter(item => item.source !== 'unknown' && same(item.value, winner.value));
  return { value: winner.value, source: winner.source, evidence: [...winner.evidence, ...agreeing.flatMap(item => item.evidence)], ...(conflicts.length ? { conflicts } : {}) };
}

export const known = <T>(value: T, source: Exclude<Source, 'unknown'>, evidence: Evidence[]): Fact<T> => ({ value, source, evidence });
export const unknown = <T>(evidence: Evidence[] = []): Fact<T> => ({ value: null, source: 'unknown', evidence });
