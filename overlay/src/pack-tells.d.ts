import type { PackData } from './pack-list.js';
export const TELLS: PackData;
export const BOUND_RULES: Set<string>;
export function boundInSource(text: string, line: number, column?: number): boolean;
export const MEANING_RULES: Set<string>;
export const MEANING_CUTS: { echo: number; near: number; stock: number };
export const STOCK_LINES: string[];
export function hasSpecific(line: string): boolean;
