import type { Declaration, Finding, Site } from '../report.js';

export interface LedgerEntry {
  key: string;
  kind: 'debt' | 'exception' | 'decision' | 'declined';
  count?: number;
  resolved?: string;
  why?: string;
  by?: string;
  on?: string;
  inferred?: boolean;
  rule?: string;
  family?: string;
  owner?: string;
  prop?: string;
  authored?: string;
  path?: string;
  anchor?: string;
  value?: string;
  refs?: string[];
  origin?: string;
  tier?: string;
}
export interface LedgerSummary {
  exists: boolean;
  path: string;
  entries: number;
  new: number;
  debt: number;
  exceptions: number;
  outOfScope: number;
  stale: number;
  growth: number;
  message: string;
}
export interface LedgerOptions { base?: string; strictLedger?: boolean; changed?: boolean }
export interface FindingGroup {
  entry: LedgerEntry;
  finding: Finding;
  declarations: Declaration[];
  sites: Site[];
}
