import type { PackData } from './pack-list.js';
export const TELLS: PackData;
export const BOUND_RULES: Set<string>;
export function boundInSource(text: string, line: number, column?: number): boolean;
