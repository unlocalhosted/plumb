/**
 * Every method the session answers, in one table. What used to be six hand-kept lists (the HTTP verb, the known endpoints, the
 * endpoints that answer with a pre-serialized body, the JSON-RPC allowlist, the writes a request's trace follows, the reads the
 * coordinator may batch, the calls that wait for as long as they take) is read from the rows below, so a new method is one row.
 *
 *  - `http`   the endpoint's name under /__plumb/, when it has one
 *  - `engine` the Session method that answers it, when one does (a row may be an engine method with no endpoint, or an endpoint the host answers)
 *  - `post`   the endpoint takes a POST body; the others take a GET query
 *  - `read`   the coordinator may run it with other reads in one cohort (every method without it runs alone, in order)
 *  - `json`   a read the coordinator serializes, so the body never crosses to the host as an object graph
 *  - `rpc: false`  not on the JSON-RPC line
 *  - `traced` a write a request's `trace` tag follows (every change it records carries the group and meta)
 *  - `patient` never times out waiting in the queue (a write must not be dropped half way through admission)
 */
interface Row {
  readonly http?: string; readonly engine?: string;
  readonly post?: true; readonly read?: true; readonly json?: true; readonly rpc?: false; readonly traced?: true; readonly patient?: true;
}
export const methods = [
  { http: 'readiness', rpc: false },
  { http: 'readiness/fix', post: true, rpc: false },
  { http: 'report', engine: 'report', read: true, json: true },
  // the report's findings grouped by what the author meant; the session reads them off the report it already has
  { http: 'causes' },
  // what the project page draws (GET /__plumb/system answers it; the POST of that name is the engine's proposal)
  { http: 'system-page' },
  { http: 'site', engine: 'site', read: true, json: true },
  { http: 'classes', engine: 'classes', read: true, json: true },
  // over HTTP only: it needs the root the page is served from, which a stdio line does not have
  { http: 'resolve', engine: 'resolveSource', read: true, json: true, rpc: false },
  // the JSX index of one file (every opening and creator call the build saw), for the overlay's usage answers
  { http: 'index', engine: 'sourceIndex', read: true, json: true, rpc: false },
  { http: 'edits', engine: 'edits', read: true, json: true },
  { http: 'text', engine: 'text', read: true, json: true },
  { http: 'text-at', engine: 'textAt', read: true, json: true },
  { http: 'structure', engine: 'structure', read: true, json: true },
  { http: 'class-site', engine: 'classSite', read: true, json: true },
  { http: 'decisions', engine: 'decisions', read: true, json: true },
  { http: 'spec', engine: 'spec', read: true, json: true },
  { http: 'why', engine: 'why', read: true, json: true },
  { http: 'batch', engine: 'many', post: true, read: true, json: true },
  { http: 'page', engine: 'page', post: true, read: true },
  { http: 'places', engine: 'places', post: true, read: true },
  { http: 'system', engine: 'system', post: true, read: true, patient: true },
  { engine: 'spacingUnit', read: true },
  { http: 'apply', engine: 'apply', post: true, traced: true, patient: true },
  { http: 'apply-text', engine: 'applyText', post: true, traced: true, patient: true },
  { http: 'apply-text-at', engine: 'applyTextAt', post: true, traced: true, patient: true },
  { http: 'undo', engine: 'undo', post: true, patient: true },
  { http: 'undo-change', engine: 'undoChange', post: true, traced: true, patient: true },
  { http: 'undo-group', engine: 'undoGroup', post: true, traced: true, patient: true },
  { http: 'undo-changes', engine: 'undoChanges', post: true, traced: true, patient: true },
  { http: 'set', engine: 'set', post: true, traced: true, patient: true },
  { http: 'swap', engine: 'swap', post: true, traced: true, patient: true },
  { http: 'swaps', engine: 'swaps', post: true, traced: true, patient: true },
  { http: 'prop', engine: 'propEdit', post: true, traced: true, patient: true },
  { http: 'token', engine: 'token', post: true, traced: true, patient: true },
  { http: 'accept', engine: 'accept', post: true, patient: true },
  { http: 'apply-all', engine: 'applyAll', post: true, traced: true, patient: true },
  { http: 'rename', engine: 'rename', post: true, traced: true, patient: true },
  { http: 'recipes', engine: 'recipes' },
  { http: 'recipes/preview', engine: 'recipesPreview', post: true },
  { http: 'recipes/apply', engine: 'recipesApply', post: true, traced: true, patient: true },
  { http: 'props', engine: 'props' },
  { http: 'history', engine: 'history' },
  { http: 'trace', engine: 'trace' },
  { http: 'rhythm', engine: 'rhythm' },
  { http: 'palette', engine: 'palette' },
  { http: 'icons', engine: 'icons' },
  { http: 'try', engine: 'try', post: true },
  { http: 'refresh', engine: 'refresh', patient: true },
  { engine: 'traced', patient: true },
  { http: 'health' },
] as const satisfies readonly Row[];

type Entry = (typeof methods)[number];
/** The names of the Session's methods that go through the worker. */
export type EngineMethod = Extract<Entry, { engine: string }>['engine'];
/** The ones that may run in a read cohort (and so can be answered as a serialized body). */
export type ReadMethod = Extract<Entry, { engine: string; read: true }>['engine'];

const rows: readonly Row[] = methods;
const byHttp = new Map(rows.flatMap(row => row.http ? [[row.http, row] as const] : []));
const engineNames = (keep: (row: Row) => boolean): ReadonlySet<string> => new Set(rows.flatMap(row => row.engine && keep(row) ? [row.engine] : []));

/** Is this an endpoint under /__plumb/? */
export const isEndpoint = (name: string): boolean => byHttp.has(name);
/** The verb an endpoint takes; anything not in the table is a GET. */
export const verbOf = (name: string): 'GET' | 'POST' => byHttp.get(name)?.post ? 'POST' : 'GET';
/** Does the endpoint answer with a body the coordinator serialized? */
export const answersSerialized = (name: string): boolean => byHttp.get(name)?.json === true;
/** Is the method on the JSON-RPC line? */
export const isRpcMethod = (name: string): boolean => { const row = byHttp.get(name); return row !== undefined && row.rpc !== false; };
/** Writes a request's `trace` tag follows. */
export const tracedWrites: ReadonlySet<string> = engineNames(row => row.traced === true);
/** Methods that wait for as long as they take instead of timing out in the queue. */
export const patientMethods: ReadonlySet<string> = engineNames(row => row.patient === true);
const readMethods = engineNames(row => row.read === true);
/** May the coordinator batch this method with other reads? A method it does not know runs alone in order, as the writes do. */
export const isReadMethod = (name: string): boolean => readMethods.has(name);
/** An endpoint that writes (a POST that is not a read cohort): the ones an idempotency key applies to. */
export const isWriteEndpoint = (name: string): boolean => { const row = byHttp.get(name); return row?.post === true && row.read !== true; };
