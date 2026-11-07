// Where questions go: the server this client was loaded from. On Next that is the route's sidecar (hosts/next-dev.ts),
// another loopback origin; the page's own /__plumb/ (the route) is the door that always answers. When the sidecar stops
// answering (its process gone, the port closed), every question moves to the door, once, and stays there.
let base = new URL('../', import.meta.url).href;
const door = new URL('/__plumb/', location.href).href;
// The page's own tag for this client carries the token. It names the client on the page's origin, so it is found by
// its path, whichever origin the module itself came from.
const clientPath = new URL(base).pathname + 'client.js';
const script = [...document.querySelectorAll('script[type="module"][src]')].find(script => script.src === base + 'client.js' || new URL(script.src, location.href).pathname === clientPath);
const token = script?.dataset.plumbToken;
/** fetch at `base`; a network failure at a sidecar moves base to the door and asks there, once; at the door it fails as it is. */
async function reach(path, init) {
  try { return await fetch(new URL(path, base), init); }
  catch (error) {
    if (error?.name === 'AbortError' || base === door) throw error;
    base = door;
    return fetch(new URL(path, base), init);
  }
}

// The module generation a question is asked against. A hot update (plumb:updated, sent when the source maps are
// invalidated) starts a new one: an answer that comes back for an older generation describes code that is gone, so it
// is dropped and the question is asked again, once, against the code on screen.
let generation = 0;
globalThis.addEventListener?.('plumb:updated', () => { generation++; });
export const moduleGeneration = () => generation;
const unreachable = error => Object.assign(new Error('React Plumber’s server is not reachable; if the dev server is restarting, it will be back.'), { unreachable: true, cause: error });

// Resolve and site questions asked with { batch: true } in the same turn of the event loop go to the server as one
// batch: the blueprint's reader asks about a view's worth of elements as one round trip and one read cohort, not
// one per element behind a six-connection limit. A single reading (the Alt card) goes on its own, as it always
// has. A server that refuses batches answers once, and every question goes on its own from then on.
const BATCH = 128;
let batched = true, queued = [], flushing = 0;
const flights = new Map();
function enqueue(method, params, options) {
  const key = JSON.stringify([method, Object.entries(params).sort(([a], [b]) => a.localeCompare(b)), !!options.explain]);
  if (flights.has(key)) return flights.get(key);
  const pending = new Promise((resolve, reject) => {
    queued.push({ method, params, options, resolve, reject });
    // Worker messages for a wave arrive as separate tasks. Coalesce those
    // tasks too, rather than starting a round trip for every mapped element.
    if (!flushing) flushing = setTimeout(flush, 8);
  }).finally(() => flights.delete(key));
  flights.set(key, pending);
  return pending;
}
async function flush() {
  flushing = 0;
  while (queued.length) {
    const wave = queued.splice(0, BATCH);
    let response;
    try { response = await reach('batch', { method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'application/json', ...(token ? { 'x-plumb-token': token } : {}) }, body: JSON.stringify({ calls: wave.map(({ method, params }) => ({ method, params: Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])) })) }) }); }
    catch (error) { for (const q of wave) q.reject(options404(q, error)); continue; }
    if (response.status === 503) { const body = await response.json().catch(() => ({})); for (const q of wave) q.reject(starting(body)); continue; }
    // a host that does not answer batches (an older server, the docs' replay) refuses the whole wave: every
    // question goes on its own from here, this wave included. A batch never speaks for one question's refusal
    if (!response.ok) { batched = false; for (const q of wave) q.resolve(direct(q.method, q.params, q.options)); continue; }
    const results = await response.json().catch(() => null);
    wave.forEach((q, i) => {
      const r = results?.[i];
      if (!r) return q.reject(new Error('React Plumber answered a batch without this question.'));
      if ('error' in r) return q.options.explain ? q.reject(refusal(q, r.usage ? 400 : 500, r.error)) : q.resolve(null);
      q.resolve(r.value);
    });
  }
}
const starting = (body) => body.status === 'failed' ? Object.assign(new Error(body.diagnostic ?? 'React Plumber could not start.'), { failed: true }) : Object.assign(new Error('React Plumber is still reading your project.'), { starting: true });
const refusal = (q, status, response) => q.options.explain ? Object.assign(new Error('Resolver refused source.'), { reason: 'resolve-refusal', detail: { method: q.method, source: q.params.source, status, response } }) : null;
const options404 = (q, error) => q.options.explain ? Object.assign(new Error(error.message), { reason: 'resolve-refusal', detail: { method: q.method, source: q.params.source, error: error.message } }) : error;

// A resolve asked while the same one is in flight shares its answer (a list's rows and every Link ask the same one at
// once); once answered it is asked afresh, so a changed file or snapshot is always seen.
const resolved = new Map();
export function forgetResolved() { resolved.clear(); }
export async function request(method, params, options = {}) {
  for (let asked = 0;; asked++) {
    const sent = generation;
    const answer = await ask(method, params, options);
    // the answer belongs to the generation it was asked in; after an update, ask again (once) rather than show it
    if (generation === sent || asked > 0 || !['resolve', 'site', 'index', 'class-site', 'text', 'props', 'edits'].includes(method)) return answer;
  }
}
function ask(method, params, options) {
  // a question with its own signal is the caller's alone: it is not shared, and its fetch is aborted with it
  if (options.signal) return direct(method, params, options);
  if (method === 'resolve') {
    const key = JSON.stringify([params, !!options.explain]);
    let answer = resolved.get(key);
    if (!answer) {
      answer = batched && options.batch ? enqueue(method, params, options) : direct(method, params, options);
      resolved.set(key, answer);
      const done = () => { if (resolved.get(key) === answer) resolved.delete(key); };
      answer.then(done, done);
    }
    return answer;
  }
  if (batched && options.batch && method === 'site') return enqueue(method, params, options);
  return direct(method, params, options);
}

async function direct(method, params, options = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) query.set(key, value);
  let response;
  try { response = await reach(`${method}?${query}`, { cache: 'no-store', headers: token ? { 'x-plumb-token': token } : {}, ...(options.signal ? { signal: options.signal } : {}) }); }
  catch (error) {
    if (error?.name === 'AbortError') throw Object.assign(new Error('The question was withdrawn.'), { aborted: true, reason: 'map', detail: { step: 'cancelled', method } });
    if (options.explain) throw Object.assign(new Error(error.message), { reason: 'resolve-refusal', unreachable: true, detail: { method, source: params.source, error: error.message, unreachable: true } });
    throw unreachable(error);
  }
  // The project is still being read for the first time: a state to show, not a refusal.
  if (response.status === 503) {
    const body = await response.json().catch(() => ({}));
    // A failed start is not "still reading": it needs the person, and says why.
    if (body.status === 'failed') throw Object.assign(new Error(body.diagnostic ?? 'React Plumber could not start.'), { failed: true });
    throw Object.assign(new Error('React Plumber is still reading your project.'), { starting: true });
  }
  if (!response.ok) {
    if (options.explain) throw Object.assign(new Error('Resolver refused source.'), { reason: 'resolve-refusal', detail: { method, source: params.source, status: response.status, response: await response.text() } });
    return null;
  }
  return response.json();
}

// Writes go through the same token and origin policy as reads; the server re-derives every edit from current source.
// Every write carries an idempotency key: a retry after a dropped response gets the first answer and applies nothing twice.
export async function post(method, body) {
  // the key travels in its own header: `key` in a body belongs to the endpoint (set's prop key)
  const key = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const payload = JSON.stringify(body ?? {});
  const send = () => reach(method, { method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key, ...(token ? { 'x-plumb-token': token } : {}) }, body: payload });
  let response;
  try { response = await send(); }
  catch (error) {
    // the network dropped: the server may have applied the write; the same key asks for its answer, not a second write
    await new Promise(resolve => setTimeout(resolve, 300));
    try { response = await send(); } catch (again) { throw unreachable(again); }
  }
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(result.error ?? `React Plumber refused ${method}.`), { status: response.status });
  return result;
}

// A write always ends in an answer on screen. A write can take seconds, so there is no deadline; but while it is out,
// the session is watched: when the dev server restarts (a config change does that) the server that took the write is
// gone and will never answer. Then the change log says what happened: the write's group recorded → it landed;
// nothing recorded → it did not, and the caller says so. Resolves to the write's own answer, or { landed, lost: true }.
export async function answered(write, group, { every = 2000 } = {}) {
  const pidNow = async () => { try { return (await request('health', {}))?.pid ?? null; } catch { return null; } };
  const start = await pidNow();
  let stop = false;
  const watch = (async () => {
    let misses = 0;
    while (!stop) {
      await new Promise((r) => setTimeout(r, every));
      if (stop) return null;
      const pid = await pidNow();
      misses = pid == null ? misses + 1 : 0;
      if ((pid != null && start != null && pid !== start) || misses >= 3) {
        // the session that took the write is gone: ask the one there now what it recorded
        for (let i = 0; i < 10 && !stop; i++) {
          try { const t = await request('trace', {}); if (t) return { lost: true, landed: (t.changes ?? []).some((c) => c.group === group && c.state !== 'undone') }; } catch {}
          await new Promise((r) => setTimeout(r, every));
        }
        return { lost: true, landed: false };
      }
    }
    return null;
  })();
  try { return await Promise.race([write, watch.then((r) => r ?? new Promise(() => {}))]); }
  finally { stop = true; }
}
