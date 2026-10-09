import { matchesGlob } from 'node:path';
import { UsageError } from '../errors.js';
import type { Declaration } from '../report.js';

export type HabitSeverity = 'error' | 'warn' | 'info';
export type ConditionPredicates = Partial<Record<'media' | 'pseudo' | 'selector', string>>;
export interface HabitPredicate {
  prop?: string;
  value?: string;
  when?: { has?: ConditionPredicates; lacks?: ConditionPredicates };
  owner?: string | { kind?: 'element' | 'component'; name?: string };
  /** Compatibility with the example in DESIGN 4.3. */
  ownerElements?: string[];
  origin?: Declaration['origin'] | Declaration['origin'][];
}
export interface CustomHabit { id: string; when: HabitPredicate; message: string; severity?: HabitSeverity }

const origins = ['class', 'arbitrary', 'stylesheet', 'apply', 'inline', 'custom-property', 'keyframes'];
function fail(path: string, detail: string): never { throw new UsageError(`${path}: ${detail}.`); }
function obj(value: unknown, path: string, allowed: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) fail(path, 'Set habits to an object; expected a plain object');
  const record = value as Record<string, unknown>;
  for (const key of Object.keys(record)) if (!allowed.includes(key)) fail(`${path}.${key}`, `unknown predicate; allowed keys: ${allowed.join(', ')}`);
  return record;
}
function str(value: unknown, path: string): asserts value is string {
  if (typeof value === 'function') fail(path, 'expected declarative data, without callbacks');
  if (typeof value !== 'string' || !value.trim()) fail(path, 'expected a non-empty string');
}
function regex(value: unknown, path: string): void {
  str(value, path);
  try { new RegExp(value); } catch { fail(path, 'expected a valid regex source string'); }
}
export function validateHabit(value: unknown, path: string): void {
  const habit = obj(value, path, ['id', 'when', 'message', 'severity']);
  str(habit.id, `${path}.id`); str(habit.message, `${path}.message`);
  if (!/^[a-z][a-z0-9_-]*$/.test(habit.id)) fail(`${path}.id`, 'expected a lowercase rule id');
  if (habit.severity !== undefined && !['error', 'warn', 'info'].includes(String(habit.severity))) fail(`${path}.severity`, 'expected error, warn or info');
  const predicate = obj(habit.when, `${path}.when`, ['prop', 'value', 'when', 'owner', 'ownerElements', 'origin']);
  if ('prop' in predicate) str(predicate.prop, `${path}.when.prop`);
  if ('value' in predicate) regex(predicate.value, `${path}.when.value`);
  if ('when' in predicate) {
    const conditions = obj(predicate.when, `${path}.when.when`, ['has', 'lacks']);
    for (const [quantifier, raw] of Object.entries(conditions)) {
      for (const [kind, pattern] of Object.entries(obj(raw, `${path}.when.when.${quantifier}`, ['media', 'pseudo', 'selector']))) regex(pattern, `${path}.when.when.${quantifier}.${kind}`);
    }
  }
  if ('owner' in predicate) {
    if (typeof predicate.owner === 'string') str(predicate.owner, `${path}.when.owner`);
    else {
      const owner = obj(predicate.owner, `${path}.when.owner`, ['kind', 'name']);
      if ('kind' in owner && !['element', 'component'].includes(String(owner.kind))) fail(`${path}.when.owner.kind`, 'expected element or component');
      if ('name' in owner) str(owner.name, `${path}.when.owner.name`);
    }
  }
  if ('ownerElements' in predicate) {
    if (!Array.isArray(predicate.ownerElements)) fail(`${path}.when.ownerElements`, 'expected an array of element names');
    for (const element of predicate.ownerElements) str(element, `${path}.when.ownerElements`);
  }
  if ('origin' in predicate) for (const origin of Array.isArray(predicate.origin) ? predicate.origin : [predicate.origin]) if (!origins.includes(String(origin))) fail(`${path}.when.origin`, `expected ${origins.join(', ')}`);
}
export function compilePredicate(predicate: HabitPredicate): (declaration: Declaration) => boolean {
  const value = predicate.value === undefined ? undefined : new RegExp(predicate.value);
  const conditions = Object.entries(predicate.when ?? {}).flatMap(([quantifier, entries]) => Object.entries(entries).map(([kind, pattern]) => ({ quantifier, kind, regex: new RegExp(pattern) })));
  return declaration => (!predicate.prop || matchesGlob(declaration.prop, predicate.prop)) &&
    (!value || value.test(declaration.value)) &&
    (!predicate.origin || (Array.isArray(predicate.origin) ? predicate.origin : [predicate.origin]).includes(declaration.origin)) &&
    (!predicate.owner || (typeof predicate.owner === 'string' ? matchesGlob(declaration.owner.name, predicate.owner) :
      (!predicate.owner.kind || declaration.owner.kind === predicate.owner.kind) && (!predicate.owner.name || matchesGlob(declaration.owner.name, predicate.owner.name)))) &&
    (!predicate.ownerElements || declaration.owner.kind === 'element' && predicate.ownerElements.includes(declaration.owner.name)) &&
    conditions.every(({ quantifier, kind, regex }) => declaration.when.some(condition => condition.kind === kind && regex.test(condition.text)) === (quantifier === 'has'));
}
