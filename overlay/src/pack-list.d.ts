export interface PackData {
  id: string; title: string; ground: string; runs: 'page' | 'source'; summary?: string;
  source: { package: string; version: string; guide: string };
  spec: Record<string, Record<string, Record<string, unknown>>>;
  words: Record<string, (n: Record<string, unknown>) => { label: string; line: string; reason: string }>;
  laws: Record<string, { id: string; name: string; guide?: string }[]>;
}
export const PACK_DATA: PackData[];
