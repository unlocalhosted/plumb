import type { ClaimSource, Evidence } from './facts.js';

/**
 * What plumb can do with a detected system or library, declared by its detector, never decided by a consumer.
 * `supported`: judged fully. `partial`: some of it; `judged` and `skipped` say exactly what. `unsupported`: found,
 * not judged. Every non-supported entry says what still works and the next step.
 */
export type Support = 'supported' | 'partial' | 'unsupported';
export interface SupportNote {
  support: Support;
  /** What plumb judges of it (partial). */
  judged?: string;
  /** What plumb skips (partial, unsupported). */
  skipped?: string;
  /** The person's next step: a config key, an upgrade, a link, or "nothing to do; plumb skips it". */
  next?: string;
}

/** One detected styling system or component library, with where it was found. */
export interface Detected extends SupportNote {
  id: string;
  label: string;
  source: ClaimSource;
  evidence: Evidence[];
  detail?: Record<string, string | number | boolean | null>;
}

export const nothingToDo = 'nothing to do; plumb skips it';
/** A one-line account for footers and tables: `styled-components (src/Button.tsx:3); not judged yet`. */
export function describeDetected(item: Detected): string {
  const where = item.evidence[0] ? ` (${item.evidence[0].file}:${item.evidence[0].line})` : '';
  if (item.support === 'supported') return `${item.label}${where}`;
  if (item.support === 'partial') return `${item.label}${where}: ${item.judged ?? 'partly judged'}; ${item.skipped ?? 'the rest is not'}`;
  return `${item.label}${where}; not judged yet${item.next ? `. ${item.next}` : ''}`;
}
