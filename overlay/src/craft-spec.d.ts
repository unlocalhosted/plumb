// Types for the craft spec module (overlay/src/craft-spec.js), which the server and CLI import as data.
export type TierName = 'access' | 'legibility' | 'theme' | 'craft' | 'advisory';
export type Severity = 'error' | 'warn' | 'info';
export interface CraftRuleConfig { enabled?: boolean; tier?: TierName; severity?: Severity }
export interface CraftConfig {
  preset?: 'strict' | 'balanced' | 'relaxed';
  values?: Record<string, Record<string, Record<string, unknown>>>;
  rules?: Record<string, boolean | CraftRuleConfig>;
  tokens?: { create?: boolean; name?: string | Record<string, string>; file?: string };
}
export interface SpecRule {
  id: string; short: string; enabled: boolean; tier: number; tierName: TierName; habit: boolean; severity: Severity | null;
  values: Record<string, unknown>; from: Record<string, string>;
}
export interface SpecPrinciple { id: string; tier: number; why: string; rules: SpecRule[] }
export interface ResolvedSpec {
  preset: string; principles: SpecPrinciple[];
  tokens: { create: boolean; name: string | Record<string, string>; file: string | null; shape?: string | null; hash?: string | null; };
  tokensFrom: Record<string, string>;
}
export const TIER_NAMES: TierName[];
export const PRINCIPLES: Record<string, { tier: number; why: string }>;
export const STANDARD: Record<string, Record<string, Record<string, unknown>>>;
export const PRESETS: Record<string, { values: Record<string, unknown>; rules: Record<string, unknown> }>;
export const TOKENS: { create: boolean; name: string; file: string | null };
export const RULE_IDS: string[];
export function tierNumber(name: TierName | number): number;
export function ruleId(short: string): string;
export function principleOf(id: string): string | null;
export function resolveSpec(craft?: CraftConfig, layers?: { from: string; craft?: CraftConfig }[]): ResolvedSpec;
export function specFor(resolved: ResolvedSpec, id: string): (Record<string, unknown> & { enabled: boolean; tier: number; tierName: TierName; severity: Severity | null }) | null;
export function specRules(resolved: ResolvedSpec): SpecRule[];
export function validateCraft(craft: unknown): string[];
