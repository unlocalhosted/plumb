const base = new URL('../', import.meta.url).href;
const script = [...document.querySelectorAll('script[type="module"][src]')].find(script => script.src === base + 'client.js');
const token = script?.dataset.plumbToken;

export async function request(method, params, options = {}) {
  const url = new URL(method, base);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  let response;
  try { response = await fetch(url, { cache: 'no-store', headers: token ? { 'x-plumb-token': token } : {} }); }
  catch (error) {
    if (options.explain) throw Object.assign(new Error(error.message), { reason: 'resolve-refusal', detail: { method, source: params.source, error: error.message } });
    throw error;
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
  if (!response.ok) throw Object.assign(new Error(result.error ?? `Plumb refused ${method}.`), { status: response.status });
  return result;
}
