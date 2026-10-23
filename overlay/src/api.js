const base = new URL('../', import.meta.url).href;
const script = [...document.querySelectorAll('script[type="module"][src]')].find(script => script.src === base + 'client.js');
const token = script?.dataset.plumbToken;

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
    try { response = await fetch(new URL('batch', base), { method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'application/json', ...(token ? { 'x-plumb-token': token } : {}) }, body: JSON.stringify({ calls: wave.map(({ method, params }) => ({ method, params: Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])) })) }) }); }
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

export async function request(method, params, options = {}) {
  if (batched && options.batch && (method === 'resolve' || method === 'site')) return enqueue(method, params, options);
  return direct(method, params, options);
}

async function direct(method, params, options = {}) {
  const url = new URL(method, base);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  let response;
  try { response = await fetch(url, { cache: 'no-store', headers: token ? { 'x-plumb-token': token } : {} }); }
  catch (error) {
    if (options.explain) throw Object.assign(new Error(error.message), { reason: 'resolve-refusal', detail: { method, source: params.source, error: error.message } });
    throw error;
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
export async function post(method, body) {
  const response = await fetch(new URL(method, base), { method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'application/json', ...(token ? { 'x-plumb-token': token } : {}) }, body: JSON.stringify(body) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(result.error ?? `React Plumber refused ${method}.`), { status: response.status });
  return result;
}
