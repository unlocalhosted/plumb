/**
 * SCHEMA · one request shape per endpoint (docs/invariants/api-contract.md §2), run by the router before any handler.
 *
 * A shape is a check: it takes the value as it arrived (a query's strings, a body's JSON) and returns it normalised (an
 * integer field as a number, a JSON field parsed), or throws a UsageError with code `bad-request` naming the field. A
 * malformed request never reaches a handler, and a handler never sees a type it did not declare. Fields a shape does not
 * name are kept as they came (recipes pass the rest of their body through). The engine re-checks files, positions and
 * hashes itself: a shape says what a request is, not whether it may be carried out.
 */
import { UsageError } from '../errors.js';

export type Check<T> = (value: unknown, at: string) => T;
type Shape<S extends Record<string, Check<unknown>>> = { [K in keyof S]: ReturnType<S[K]> } & Record<string, unknown>;

const bad = (at: string, want: string) => new UsageError(`${at || 'The request'} must be ${want}.`, 'bad-request');
const isObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const name = (at: string, key: string) => at ? `${at}.${key}` : key;

/** A non-empty string. */
export const str: Check<string> = (v, at) => { if (typeof v !== 'string' || !v.trim()) throw bad(at, 'a non-empty string'); return v; };
/** Any string, empty included. */
export const text: Check<string> = (v, at) => { if (typeof v !== 'string') throw bad(at, 'a string'); return v; };
/** A positive safe integer, as a number or as the digit string a query carries. */
export const int: Check<number> = (v, at) => {
  const n = typeof v === 'string' && /^[1-9]\d*$/.test(v) ? Number(v) : v;
  if (typeof n !== 'number' || !Number.isSafeInteger(n) || n < 1) throw bad(at, 'a positive integer');
  return n;
};
/** A boolean, or the words a query carries. */
export const bool: Check<boolean> = (v, at) => { if (v === 'true') return true; if (v === 'false') return false; if (typeof v !== 'boolean') throw bad(at, 'true or false'); return v; };
export const oneOf = <T extends string>(...options: T[]): Check<T> => (v, at) => { if (typeof v !== 'string' || !options.includes(v as T)) throw bad(at, options.map(o => `"${o}"`).join(' or ')); return v as T; };
export const any: Check<unknown> = v => v;
export const optional = <T>(check: Check<T>): Check<T | undefined> => (v, at) => v === undefined ? undefined : check(v, at);
export const list = <T>(item: Check<T>, min = 0, max = Infinity): Check<T[]> => (v, at) => {
  if (!Array.isArray(v) || v.length < min || v.length > max) throw bad(at, max === Infinity ? `a list of at least ${min}` : min === max ? `a list of ${max}` : `a list of ${min} to ${max}`);
  return v.map((x, i) => item(x, `${at}[${i}]`));
};
/** An object with these fields; other fields are kept as they came. */
export const object = <S extends Record<string, Check<unknown>>>(fields: S): Check<Shape<S>> => (v, at) => {
  if (!isObject(v)) throw bad(at, 'an object');
  const out: Record<string, unknown> = { ...v };
  for (const [key, check] of Object.entries(fields)) { const value = check(v[key], name(at, key)); if (value !== undefined) out[key] = value; }
  return out as Shape<S>;
};
/** A value a query carries as JSON text, or a body as itself. */
export const json = <T>(check: Check<T>): Check<T> => (v, at) => {
  let parsed = v;
  if (typeof v === 'string') { try { parsed = JSON.parse(v); } catch { throw bad(at, 'JSON'); } }
  return check(parsed, at);
};
/** One of two shapes, told apart by a field the first has. */
const either = <A, B>(key: string, a: Check<A>, b: Check<B>): Check<A | B> => (v, at) => isObject(v) && key in v ? a(v, at) : b(v, at);

const position = { file: str, line: int, column: int } as const;
const lineColumn = { line: int, column: int } as const;
const place = object({ line: int, column: int });
const chain = optional(json(list(object(position), 0, 32)));
const trace = { trace: optional(object({ group: optional(str), meta: any })) } as const;
const flag = optional(text);
const siteQuery = object({ file: str, line: int, column: optional(int) });
const resolveQuery = object({ source: str, line: optional(int), column: optional(int), tag: optional(str), hash: optional(str), component: flag, snapshot: flag, owner: flag, stamp: flag });
const swapEdit = object({ line: int, column: int, from: optional(text), to: str, at: optional(place), of: optional(object({ ...position, chain })) });
const swapsBody = object({ file: str, hash: str, edits: list(swapEdit, 1, 200) });
const cause = object({ rule: str, text: str, choice: str });
const causeSwap = object({ cause, file: optional(str) });
const acceptBody = object({ rule: str, why: str, sites: list(object({ file: str, line: int, column: int, text }), 1, 200) });
const tokenThen = optional(either('cause', causeSwap, object({ swaps: optional(list(swapsBody)) })));
const batchCall: Check<{ method: 'site' | 'resolve'; params: Record<string, unknown> }> = (v, at) => {
  const call = object({ method: oneOf('site', 'resolve'), params: any })(v, at);
  return { ...call, params: (call.method === 'site' ? siteQuery : resolveQuery)(call.params, `${at}.params`) };
};

/** The shape of each endpoint's request, by its name under /__plumb/. An endpoint not listed takes any object. */
export const shapes: Record<string, Check<Record<string, unknown>>> = {
  'readiness/fix': object({ id: str, hash: str, confirm: (v, at) => { if (v !== true) throw bad(at, 'true'); return true; }, allowDirty: optional(bool) }),
  report: object({ base: optional(str), changed: optional(bool), strictLedger: optional(bool), verbose: optional(bool), ledger: optional(bool) }),
  site: siteQuery,
  classes: object({ ...position, classes: text }),
  resolve: resolveQuery,
  edits: siteQuery,
  text: object(position),
  'text-at': object({ ...position, text: str, owners: optional(text) }),
  structure: object(position),
  'class-site': object({ ...position, classes: optional(text), chain }),
  why: object({ file: str, line: int }),
  recipes: object({ ...position, chain }),
  props: object({ ...position, computed: optional(json(object({}))) }),
  trace: object({ group: optional(str) }),
  batch: object({ calls: list(batchCall, 1, 256) }),
  page: object({ items: list(object({ stamp: str, tag: str, classes: optional(text) }), 0, 8192) }),
  places: object({ files: list(str, 0, 4096) }),
  system: object({ files: optional(list(str)), census: optional(list(object({ stamp: str, tag: str }), 0, 20000)), scope: optional(oneOf('page', 'project')), route: optional(str), exclude: optional(list(str)), roles: optional(object({})), ...trace }),
  apply: object({ file: str, hash: str, edits: list(object({ id: str }), 1), ...trace }),
  // `to` may arrive blank: the engine's own words say why that is refused
  'apply-text': object({ file: str, hash: str, run: str, from: text, to: text, ...trace }),
  'apply-text-at': object({ file: str, hash: str, id: str, from: text, to: text, ...trace }),
  undo: object({ id: str }),
  'undo-change': object({ id: str, ...trace }),
  'undo-group': object({ group: str, ...trace }),
  'undo-changes': object({ ids: list(str, 1, 500), ...trace }),
  set: object({ file: str, hash: str, ...lineColumn, key: str, token: str, at: optional(place), ...trace }),
  swap: object({ file: str, hash: str, ...lineColumn, from: optional(text), to: str, at: optional(place), of: optional(object({ ...position, chain })), ...trace }),
  swaps: object({ file: str, hash: str, edits: list(swapEdit, 1, 200), ...trace }),
  prop: object({ file: str, hash: str, ...lineColumn, name: str, value: (v, at) => { if (!['string', 'number', 'boolean'].includes(typeof v)) throw bad(at, 'a string, a number or true/false'); return v; }, ...trace }),
  token: object({ file: str, hash: str, name: str, value: str, why: optional(str), then: optional(object({ file: str, hash: str, ...lineColumn, from: optional(text), to: str })), ...trace }),
  accept: acceptBody,
  'apply-all': (v, at) => {
    const body = object({
      tokens: optional(list(object({ file: str, hash: str, name: str, value: str, why: optional(str), then: tokenThen }))),
      css: optional(list(object({ file: str, hash: str, css: str }))),
      swaps: optional(list(either('cause', causeSwap, swapsBody))),
      accepts: optional(list(acceptBody)), ...trace,
    })(v, at);
    if (![body.tokens, body.css, body.swaps, body.accepts].some(Array.isArray)) throw bad(at, 'an apply with tokens, css, swaps or accepts');
    return body;
  },
  'recipes/preview': object({ ...position, chain }),
  'recipes/apply': object({ ...position, chain, hash: optional(str), hashes: optional(object({})), ...trace }),
  try: object({ code: text, lang: optional(oneOf('tsx', 'css')), as: optional(str), verbose: optional(bool) }),
};

/** The request as its endpoint's shape declares it, or a `bad-request` refusal. */
export function validateRequest(method: string, raw: unknown): Record<string, unknown> {
  if (!isObject(raw)) throw new UsageError('Parameters must be a JSON object.', 'bad-request');
  const shape = shapes[method];
  return shape ? shape(raw, '') : raw;
}
