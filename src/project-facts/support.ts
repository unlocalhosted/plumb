import type { ClaimSource, Evidence } from './facts.js';
import type { Capability, CapabilityRun, LibraryAdapter, Usage } from './libraries/adapter.js';
import { capabilityWords } from './libraries/adapter.js';

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
  /** Every element rendered from the library, when its adapter reads usage. */
  usage?: Usage;
  /** How each capability of the adapter ran: judged, or unknown with the reason in `evidence`. Absent without an adapter. */
  capabilities?: Partial<Record<Capability, CapabilityRun>>;
}

export const nothingToDo = 'nothing to do; plumb skips it';
const allCapabilities: Capability[] = ['usage', 'states', 'structure', 'owned'];
/**
 * A library's support, derived from its adapter: `supported` when every capability it needs ran; `partial` names the
 * ones missing or unknown; without an adapter, found but not understood: its elements are judged like plain ones when
 * the app styles them with classes, and not at all when the library styles itself.
 */
export function derivedSupport(family: { id: string; label: string; styled: 'classes' | 'own'; helper?: boolean }, adapter: LibraryAdapter | undefined, ran: Partial<Record<Capability, CapabilityRun>>): SupportNote {
  if (family.helper) return { support: 'supported', judged: 'class names are read through the helper' };
  if (!adapter) {
    return family.styled === 'classes'
      ? { support: 'partial', judged: 'found, not understood yet: your classes on its elements are judged like plain elements', skipped: 'its states, portals and own variables are not', next: nothingToDo }
      : { support: 'unsupported', skipped: `${family.label}’s own styles (style props, sx, theme)`, next: nothingToDo };
  }
  const needed = family.id === 'shadcn' ? [...allCapabilities, 'system' as const] : allCapabilities;
  const judged = needed.filter(item => ran[item] === 'judged'), unknown = needed.filter(item => adapter.capabilities.includes(item) && ran[item] === 'unknown'), missing = needed.filter(item => !adapter.capabilities.includes(item));
  const words = (list: Capability[]) => list.map(item => capabilityWords[item]).join(', ');
  if (!missing.length && !unknown.length) return { support: 'supported', judged: words(judged) };
  const skipped = [missing.length ? `${words(missing)} ${missing.length === 1 ? 'is' : 'are'} not judged yet` : '', unknown.length ? `${words(unknown)} could not be read here` : ''].filter(Boolean).join('; ');
  // Nothing ran yet: the app's classes on its elements are still judged like plain elements, so it is never a refusal.
  if (!judged.length) return family.styled === 'classes' ? { support: 'partial', judged: 'your classes on its elements are judged like plain elements', skipped, next: nothingToDo } : { support: 'unsupported', skipped, next: nothingToDo };
  return { support: 'partial', judged: words(judged), skipped, next: nothingToDo };
}
/** A one-line account for footers and tables: `styled-components (src/Button.tsx:3); not judged yet`. */
export function describeDetected(item: Detected): string {
  const where = item.evidence[0] ? ` (${item.evidence[0].file}:${item.evidence[0].line})` : '';
  if (item.support === 'supported') return `${item.label}${where}`;
  if (item.support === 'partial') return `${item.label}${where}: ${item.judged ?? 'partly judged'}; ${item.skipped ?? 'the rest is not'}`;
  return `${item.label}${where}; not judged yet${item.next ? `. ${item.next}` : ''}`;
}

/** What the run can judge and what it names as skipped, from the styling and library facts. */
export interface SupportSummary {
  /** Systems judged fully. */
  judged: Detected[];
  /** Systems judged in part; each says what is and is not. */
  partial: Detected[];
  /** Found and not judged. */
  skipped: Detected[];
  /** False only when something was found and none of it can be read: the one case that refuses (exit 2). */
  judgeable: boolean;
}
export function supportSummary(styling: { systems: Detected[] } | null, libraries: Detected[] | null): SupportSummary {
  const systems = styling?.systems ?? [], found = [...systems, ...libraries ?? []];
  const judged = found.filter(item => item.support === 'supported'), partial = found.filter(item => item.support === 'partial'), skipped = found.filter(item => item.support === 'unsupported');
  // Plain CSS with no stylesheet judges nothing on its own; a class helper judges nothing without a system to read.
  const reads = (item: Detected) => item.id === 'plain-css' ? item.evidence.some(where => /\.css$/.test(where.file)) : !['cva', 'tailwind-variants', 'tailwind-merge', 'clsx'].includes(item.id);
  const judgeable = !systems.some(item => item.support === 'unsupported') || [...judged, ...partial].some(reads);
  return { judged, partial, skipped, judgeable };
}
/** The one message shape every surface prints: one line per system that is not judged in full. */
export function supportNotice(summary: SupportSummary): string {
  const lines = [...summary.skipped.map(item => `Not judged: ${describeDetected(item)}`), ...summary.partial.map(item => `Partly judged: ${describeDetected(item)}`)];
  return lines.length ? lines.map(line => `! ${line}\n`).join('') : '';
}
/** The refusal when nothing found can be read: what was found, why it cannot be read, what to do. */
export function supportRefusal(summary: SupportSummary): string {
  const found = summary.skipped.map(item => `${item.label}${item.evidence[0] ? ` (${item.evidence[0].file}:${item.evidence[0].line})` : ''}`).join(', ');
  const why = [...new Set(summary.skipped.map(item => item.skipped).filter(Boolean))].join('; ');
  return `Styles live in ${found}; React Plumber does not read ${why || 'them'} yet.\n  It judges Tailwind 4 classes, stylesheets and inline style; this app has none of those to read.\n  → ${summary.skipped[0]?.next ?? 'nothing to do; plumb skips it'}. Run in an app with Tailwind 4 or stylesheets.`;
}
