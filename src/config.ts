import { stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { errorMessage, UsageError } from './errors.js';
import type { Decision, Family } from './report.js';
import { validateHabits } from './habits/index.js';
import type { CustomHabit } from './habits/predicates.js';
export type { CustomHabit } from './habits/predicates.js';

export interface DecisionSource {
  inferred?: boolean;
  from?: string | string[] | (() => Decision[] | Promise<Decision[]>);
  identity?: 'reference' | 'value';
  callers?: ('primitive' | 'semantic')[];
  origins?: ('project' | 'framework' | 'inferred')[];
  exported?: boolean;
}

export interface ComponentContract {
  own?: string[];
  allow?: string[];
  deny?: string[];
}

export interface PlumbConfig {
  css?: string;
  source?: string[];
  markers?: string[];
  classHelpers?: string[];
  decisions?: Partial<Record<Family, DecisionSource>>;
  components?: {
    from?: string | string[];
    own?: string[];
    contracts?: Record<string, ComponentContract>;
  };
  habits?: (string | CustomHabit)[];
  imitation?: Record<string, { elements: string[]; fingerprint: string[] }>;
}

export interface LoadedConfig {
  path: string | null;
  value: PlumbConfig;
}

export function defineConfig(config: PlumbConfig): PlumbConfig {
  return config;
}

const allowedKeys = ['css', 'source', 'decisions', 'components', 'habits', 'imitation', 'markers', 'classHelpers'];
const families = ['spacing', 'color', 'radius', 'type', 'motion', 'elevation', 'size', 'z', 'opacity'];
const filenames = ['plumb.config.ts', 'plumb.config.mts', 'plumb.config.mjs', 'plumb.config.js'];

function invalid(path: string, expected: string): never {
  throw new UsageError(`Set ${path} to ${expected} in your Plumb config.`);
}

function object(value: unknown, path: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    invalid(path, 'an object');
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) invalid(path, 'a plain object');
  return value as Record<string, unknown>;
}

function keys(value: Record<string, unknown>, allowed: string[], path: string): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) {
      throw new UsageError(`Remove unknown key "${path}.${key}"; allowed keys: ${allowed.join(', ')}.`);
    }
  }
}

function string(value: unknown, path: string): void {
  if (typeof value !== 'string' || value.trim() === '') invalid(path, 'a non-empty string');
}

function strings(value: unknown, path: string, allowed?: string[]): void {
  if (!Array.isArray(value)) invalid(path, 'an array of strings');
  for (const item of value) {
    string(item, path);
    if (allowed && !allowed.includes(item)) invalid(path, `an array containing only ${allowed.join(', ')}`);
  }
}

function from(value: unknown, path: string): void {
  if (Array.isArray(value)) strings(value, path);
  else string(value, path);
}

function validate(value: unknown): PlumbConfig {
  const config = object(value, 'config');
  keys(config, allowedKeys, 'config');
  if ('css' in config) string(config.css, 'css');
  if ('source' in config) strings(config.source, 'source');
  if ('markers' in config) strings(config.markers, 'markers');
  if ('classHelpers' in config) strings(config.classHelpers, 'classHelpers');
  if ('decisions' in config) {
    const decisions = object(config.decisions, 'decisions');
    keys(decisions, families, 'decisions');
    for (const [family, entry] of Object.entries(decisions)) {
      const path = `decisions.${family}`;
      const source = object(entry, path);
      keys(source, ['from', 'identity', 'callers', 'origins', 'exported', 'inferred'], path);
      if ('inferred' in source && typeof source.inferred !== 'boolean') invalid(`${path}.inferred`, 'a boolean');
      if ('from' in source && typeof source.from !== 'function') from(source.from, `${path}.from`);
      if ('identity' in source && source.identity !== 'reference' && source.identity !== 'value') {
        invalid(`${path}.identity`, '"reference" or "value"');
      }
      if ('callers' in source) strings(source.callers, `${path}.callers`, ['primitive', 'semantic']);
      if ('origins' in source) strings(source.origins, `${path}.origins`, ['project', 'framework', 'inferred']);
      if ('exported' in source && typeof source.exported !== 'boolean') invalid(`${path}.exported`, 'a boolean');
    }
  }
  if ('components' in config) {
    const components = object(config.components, 'components');
    keys(components, ['from', 'own', 'contracts'], 'components');
    if ('from' in components) from(components.from, 'components.from');
    if ('own' in components) strings(components.own, 'components.own');
    if ('contracts' in components) {
      for (const [name, value] of Object.entries(object(components.contracts, 'components.contracts'))) {
        const path = `components.contracts.${name}`;
        const contract = object(value, path);
        keys(contract, ['own', 'allow', 'deny'], path);
        if ('own' in contract) strings(contract.own, `${path}.own`);
        if ('allow' in contract) strings(contract.allow, `${path}.allow`);
        if ('deny' in contract) strings(contract.deny, `${path}.deny`);
      }
    }
  }
  if ('habits' in config) {
    if (!Array.isArray(config.habits)) invalid('habits', 'an array');
    validateHabits(config.habits);
  }
  if ('imitation' in config) {
    for (const [name, value] of Object.entries(object(config.imitation, 'imitation'))) {
      const path = `imitation.${name}`;
      const imitation = object(value, path);
      keys(imitation, ['elements', 'fingerprint'], path);
      strings(imitation.elements, `${path}.elements`);
      strings(imitation.fingerprint, `${path}.fingerprint`);
    }
  }
  return config as PlumbConfig;
}

export async function loadConfig(root: string, explicitPath?: string): Promise<LoadedConfig> {
  let path: string | null = explicitPath === undefined ? null : resolve(root, explicitPath);
  if (path === null) {
    for (const filename of filenames) {
      const candidate = resolve(root, filename);
      try {
        const info = await stat(candidate);
        if (!info.isFile()) throw new UsageError(`Replace ${candidate} with a config file.`);
        path = candidate;
        break;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
    }
  }
  if (path === null) return { path: null, value: {} };
  let module: { default?: unknown };
  try {
    module = await import(pathToFileURL(path).href) as { default?: unknown };
  } catch (error) {
    throw new UsageError(`Fix or create config ${path}: ${errorMessage(error)}`);
  }
  try {
    return { path, value: validate(module.default) };
  } catch (error) {
    throw new UsageError(`Fix config ${path}: ${errorMessage(error)}`);
  }
}
