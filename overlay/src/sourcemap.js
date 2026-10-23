// bippy remains the overlay's source layer. Retain the standalone mapping API
// for existing HTTP consumers and sourcemap-worker.js; both share HMR invalidation.
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const limit = 256;
const pause = () => new Promise(resolve => setTimeout(resolve, 0));
function fields(segment) {
  const values = []; let value = 0, shift = 0;
  for (const char of segment) {
    const digit = alphabet.indexOf(char);
    if (digit < 0 || shift > 50) throw new Error('Invalid source map VLQ.');
    value += (digit & 31) * 2 ** shift;
    if (digit & 32) shift += 5;
    else { values.push(value % 2 ? -Math.floor(value / 2) : value / 2); value = 0; shift = 0; }
  }
  if (shift || ![1, 4, 5].includes(values.length)) throw new Error('Invalid source map segment.');
  return values;
}
function before(values, test) {
  let low = 0, high = values.length;
  while (low < high) { const mid = (low + high) >>> 1; if (test(values[mid])) low = mid + 1; else high = mid; }
  return values[low - 1];
}
function directive(text, name) {
  return [...text.matchAll(new RegExp('(?://#|/\\*#)\\s*' + name + '=([^\\s*]+)', 'g'))].at(-1)?.[1];
}
function refused(reason, detail) { throw Object.assign(new Error(reason), { reason, detail }); }
function failure(reason, detail) { return { location: null, reason, detail }; }

/** Shared by the worker, yielding main-thread fallback and Node HTTP integration. */
export class SourceMapStore {
  scripts = new Map(); maps = new Map(); modules = new Map(); decoded = new Map(); generation = 0;
  refresh = '';
  queue = Promise.resolve();
  traces = new Map();
  invalidate() { this.generation++; this.refresh = Date.now() + '-' + this.generation; for (const cache of [this.scripts, this.maps, this.modules, this.decoded]) cache.clear(); }
  async cached(cache, key, run) {
    // Module URLs include their content version. Keep successful evidence across
    // reader waves; elapsed time is not a new module version.
    const old = cache.get(key);
    if (old) return old.value;
    if (cache.size >= limit) cache.delete(cache.keys().next().value);
    const entry = { value: null };
    entry.value = run().then(value => { if (!value && cache.get(key) === entry) cache.delete(key); return value; }, error => { if (cache.get(key) === entry) cache.delete(key); throw error; });
    cache.set(key, entry); return entry.value;
  }
  async fetch(url, reason) {
    const fresh = new URL(url);
    // Only Next's local static assets are known to accept extra query params.
    // Keep logical URLs unchanged for relative maps and webpack sourceURL keys.
    if (this.refresh && /^https?:$/.test(fresh.protocol) && fresh.pathname.startsWith('/_next/static/') &&
      (typeof location === 'undefined' || fresh.origin === location.origin)) fresh.searchParams.set('__plumb_version', this.refresh);
    let response;
    try {
      response = await fetch(fresh.href, { cache: 'no-store' });
      if (!response.ok && fresh.href !== url) response = await fetch(url, { cache: 'no-store' });
    } catch (error) { refused(reason, { url, fetchURL: fresh.href, error: error.message }); }
    if (!response.ok) refused(reason, { url, fetchURL: response.url, status: response.status });
    return response;
  }
  async script(url) {
    return this.cached(this.scripts, url, async () => {
      const response = await this.fetch(url, 'script-fetch');
      return response.text();
    });
  }
  async load(reference, base) {
    const url = new URL(reference, base).href;
    return this.cached(this.maps, url.startsWith('data:') ? base + '\0' + url : url, async () => {
      const response = await this.fetch(url, 'map');
      try { return this.prepare(await response.json(), url.startsWith('data:') ? base : url); }
      catch (error) { refused('map', { step: 'parse', url, error: error.message }); }
    });
  }
  prepare(map, base) {
    if (map.version !== 3) throw new Error('Unsupported source map version.');
    // Keep sections unopened until the requested generated position selects one.
    if (Array.isArray(map.sections)) return { base, sections: map.sections.map(section => ({ ...section })) };
    if (!Array.isArray(map.sources) || typeof map.mappings !== 'string') throw new Error('Invalid source map.');
    return { map, base, rows: map.mappings.split(';'), decodedRows: new Map(), hashes: new Map(),
      checkpoints: [{ source: 0, line: 0, column: 0, name: 0 }] };
  }
  fromText(text, base) {
    const reference = directive(text, 'sourceMappingURL');
    if (!reference) refused('map', { step: 'missing-source-mapping-url', url: base });
    return this.load(reference, base);
  }
  async moduleIndex(url, cancelled) {
    return this.cached(this.modules, url, async () => {
      const text = await this.script(url); if (!text) return null;
      const index = new Map(); let slice = performance.now();
      // JSON-decode each eval body once per chunk version. Never execute script text.
      for (const match of text.matchAll(/\beval\((?:__webpack_require__\.ts\()?("(?:[^"\\]|\\.)*")\)/g)) {
        if (cancelled()) return null;
        const body = JSON.parse(match[1]), source = directive(body, 'sourceURL');
        if (source) index.set(source, body);
        if (performance.now() - slice > 4) { await pause(); slice = performance.now(); }
      }
      return index;
    });
  }
  async forScript(url, chunks, cancelled) {
    if (/^webpack(?:-internal)?:/.test(url)) {
      for (const chunk of chunks) {
        let index;
        // A removed hot-update resource must not hide modules in other chunks.
        try { index = await this.moduleIndex(chunk, cancelled); }
        catch (error) { if (chunk === chunks.at(-1)) throw error; continue; }
        if (cancelled()) return null;
        if (index?.has(url)) {
          try { return await this.fromText(index.get(url), chunk); }
          catch (error) { this.modules.delete(chunk); this.scripts.delete(chunk); throw error; }
        }
      }
      refused('map', { step: 'eval-module-not-found', url, chunks });
    }
    const text = await this.script(url);
    if (cancelled()) return null;
    let decoded;
    try { decoded = text ? await this.fromText(text, url) : null; }
    catch (error) { this.scripts.delete(url); throw error; }
    if (!decoded) this.scripts.delete(url);
    return decoded;
  }
  async row(decoded, wanted, cancelled) {
    if (decoded.decodedRows.has(wanted)) return decoded.decodedRows.get(wanted);
    if (wanted < 0 || wanted >= decoded.rows.length) return null;
    // VLQ source deltas span rows. Retain only checkpoints for preceding rows,
    // allocating segments only for the requested row. Work yields in bounded slices.
    let row = Math.min(wanted, decoded.checkpoints.length - 1);
    let state = { ...decoded.checkpoints[row] }, slice = performance.now(), result;
    for (; row <= wanted; row++) {
      if (cancelled()) return null;
      let generated = 0; const segments = row === wanted ? [] : null;
      const text = decoded.rows[row];
      const pattern = /[^,]+/g;
      for (const match of text.matchAll(pattern)) {
        if (cancelled()) return null;
        const value = fields(match[0]); generated += value[0];
        if (value.length > 1) { state.source += value[1]; state.line += value[2]; state.column += value[3]; if (value.length === 5) state.name += value[4]; }
        if (generated < 0 || state.source < 0 || state.source >= decoded.map.sources.length || state.line < 0 || state.column < 0) throw new Error('Invalid source map position.');
        if (segments) segments.push(value.length === 1 ? { generated } : { generated, ...state, named: value.length === 5 });
        if (performance.now() - slice > 4) { await pause(); slice = performance.now(); }
      }
      decoded.checkpoints[row + 1] = { ...state };
      if (segments) result = segments;
      if (performance.now() - slice > 4) { await pause(); slice = performance.now(); }
    }
    if (decoded.decodedRows.size >= limit) decoded.decodedRows.delete(decoded.decodedRows.keys().next().value);
    decoded.decodedRows.set(wanted, result); return result;
  }
  async original(decoded, line, column, cancelled) {
    if (!decoded || cancelled()) return null;
    if (decoded.sections) {
      const section = before(decoded.sections, section => section.offset.line < line || section.offset.line === line && section.offset.column <= column);
      if (!section) return null;
      section.decoded ??= section.map ? this.prepare(section.map, decoded.base) : await this.load(section.url, decoded.base);
      return this.original(section.decoded, line - section.offset.line, column - (line === section.offset.line ? section.offset.column : 0), cancelled);
    }
    const row = await this.row(decoded, line, cancelled);
    const segment = row && before(row, segment => segment.generated <= column);
    if (!segment || segment.source === undefined || cancelled()) return null;
    const { map, base } = decoded; let source = map.sources[segment.source];
    if (typeof source !== 'string') return null;
    if (map.sourceRoot) source = map.sourceRoot.replace(/\/?$/, '/') + source;
    if (!/^(?:[a-z][\w+.-]*:|\/|\[project\])/i.test(source)) source = new URL(source, base).href;
    const content = map.sourcesContent?.[segment.source]; let hash;
    if (typeof content === 'string') {
      if (!decoded.hashes.has(segment.source)) decoded.hashes.set(segment.source, crypto.subtle.digest('SHA-256', new TextEncoder().encode(content)).then(bytes => [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, '0')).join('')));
      hash = await decoded.hashes.get(segment.source);
    }
    const ignored = (map.ignoreList ?? map.x_google_ignoreList)?.includes(segment.source);
    const name = segment.named ? map.names?.[segment.name] : undefined;
    return { source, line: segment.line + 1, column: segment.column + 1, ...(hash ? { hash } : {}),
      ...(ignored ? { ignored: true } : {}), ...(name ? { name } : {}) };
  }
  traceFrame(url, line, column, options) {
    const key = JSON.stringify([this.generation, url, options.contentVersion]);
    let wave = this.traces.get(key);
    if (!wave) {
      wave = [];
      this.traces.set(key, wave);
      setTimeout(async () => {
        this.traces.delete(key);
        try {
          const response = await fetch(new URL('/__nextjs_original-stack-frames', url), {
            method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ frames: wave.map(entry => entry.frame), isServer: false, isEdgeServer: false, isAppDirectory: true }),
          });
          if (!response.ok) refused('map', { step: 'next-module-frame', url, status: response.status });
          const results = await response.json();
          wave.forEach((entry, i) => {
            const frame = results?.[i]?.value?.originalStackFrame;
            entry.resolve(frame?.file && frame.line1 && frame.column1 && frame.file !== url && !frame.file.startsWith('/_next/') ? { source: frame.file, line: frame.line1, column: frame.column1 } : null);
          });
        } catch (error) { for (const entry of wave) entry.reject(error); }
      }, 8);
    }
    return new Promise((resolve, reject) => wave.push({ frame: { file: options.traceFile ?? url, line1: line, column1: column }, resolve, reject }));
  }
  async mapFrame(url, line, column, chunks = [], cancelled = () => false, options = {}) {
    const generation = this.generation;
    const obsolete = () => generation !== this.generation || cancelled();
    try {
      const moduleURL = new URL(url);
      // Turbopack's eval'd HMR module carries ?id= and an inline map that
      // differs from the emitted chunk map. Next's tracing endpoint understands
      // that identity. Keep its exact positions, without inventing a content
      // hash from a formatted code frame (the response exposes no source bytes).
      if (/^https?:$/.test(moduleURL.protocol) && moduleURL.pathname.startsWith('/_next/static/chunks/') && moduleURL.searchParams.has('id')) {
        const mapped = await this.cached(this.decoded, JSON.stringify([url, options.contentVersion, line, column]),
          () => this.traceFrame(url, line, column, options));
        return obsolete() ? options.explain ? failure('map', { step: 'cancelled', url }) : null :
          options.explain ? mapped ? { location: mapped } : failure('map', { step: 'unmapped-position', url, line, column }) : mapped;
      }
      // Cached fetch/index work belongs to the generation, not its first caller.
      const key = /^webpack(?:-internal)?:/.test(url) ? JSON.stringify([url, chunks.filter(chunk => /\.hot-update\.js(?:\?|$)/.test(chunk))]) : url;
      const decoded = await this.cached(this.decoded, key, () => this.forScript(url, chunks, () => generation !== this.generation));
      // A yielded row must finish before another request advances its checkpoints.
      const work = this.queue.then(() => this.original(decoded, line - 1, column - 1, obsolete));
      this.queue = work.catch(() => {});
      const mapped = await work;
      if (obsolete()) return options.explain ? failure('map', { step: 'cancelled', url, line, column }) : null;
      return options.explain ? mapped ? { location: mapped } : failure('map', { step: obsolete() ? 'cancelled' : 'unmapped-position', url, line, column }) : mapped;
    } catch (error) { return options.explain ? failure(error.reason ?? 'map', error.detail ?? { url, line, column, error: error.message }) : null; }
  }
}
let version = 0, worker, next = 0, fallbackDetail, startupTimer;
const pending = new Map(), flights = new Map(), fallback = new SourceMapStore();
export const sourceMapVersion = () => version;
export function invalidateSourceMaps() {
  version++; fallback.invalidate();
  for (const entry of [...pending.values()]) finish(entry, failure('map', { step: 'invalidated' }));
  try { worker?.postMessage({ invalidate: true }); }
  catch (error) { useFallback({ step: 'worker-error', error: error.message }); }
}
function finish(entry, result) {
  if (pending.get(entry.id) !== entry) return;
  pending.delete(entry.id);
  if (flights.get(entry.key) === entry) flights.delete(entry.key);
  entry.cancelled = true;
  for (const resolve of entry.callers) resolve(result);
  entry.callers.clear();
}
function decode(entry) {
  void fallback.mapFrame(entry.url, entry.line, entry.column, entry.chunks, () => entry.cancelled, { explain: true, traceFile: entry.traceFile, contentVersion: entry.contentVersion })
    .then(result => finish(entry, fallbackDetail ? { ...result, detail: { ...result.detail, fallback: fallbackDetail } } : result));
}
function useFallback(detail) {
  if (fallbackDetail) return;
  // Sticky for this page: CSP/startup errors must not spawn a worker per hover.
  fallbackDetail = detail;
  clearTimeout(startupTimer);
  worker?.terminate(); worker = undefined;
  for (const entry of pending.values()) decode(entry);
}
function startWorker() {
  if (worker || fallbackDetail) return;
  if (typeof Worker === 'undefined') { useFallback({ step: 'worker-unavailable' }); return; }
  try {
    worker = new Worker(new URL('./sourcemap-worker.js', import.meta.url), { type: 'module' });
    worker.onmessage = ({ data }) => {
      if (data.ready) { clearTimeout(startupTimer); return; }
      const entry = pending.get(data.id);
      if (entry) finish(entry, data.result);
    };
    worker.onerror = event => { event.preventDefault(); useFallback({ step: 'worker-error', error: event.message }); };
    worker.onmessageerror = () => useFallback({ step: 'worker-error', error: 'Unreadable worker response.' });
    startupTimer = setTimeout(() => useFallback({ step: 'worker-startup-timeout' }), 5000);
  } catch (error) { useFallback({ step: 'worker-error', error: error.message }); }
}
// Next traces a browser chunk by its file in the dist directory, never by its http URL; its own overlay rewrites
// /_next/static/... the same way. The Next host renders that directory on the client script.
function traceFile(url) {
  const dist = typeof document === 'undefined' ? undefined : document.querySelector('script[data-plumb-next-dist]')?.dataset.plumbNextDist;
  try {
    const at = new URL(url), m = /\/_next(\/static\/.+)/.exec(at.pathname);
    return dist && m ? 'file://' + dist.replace(/\\/g, '/').replace(/\/$/, '') + m[1] + at.search : undefined;
  } catch { return undefined; }
}
/** Each caller owns its abort; identical in-flight frames share one decoding. */
export async function mapFrame(url, line, column, options = {}) {
  const { signal } = options;
  const cancelled = () => failure('map', { step: 'cancelled' });
  if (signal?.aborted) return options.explain ? cancelled() : null;
  if (typeof document !== 'undefined') startWorker();
  // Next's base webpack chunk can keep its initial eval bodies after HMR.
  // New stacks need the newest update first; old stacks retain decoded evidence.
  // Webpack removes loaded update tags, so resource timing keeps their URLs.
  const updates = typeof document === 'undefined' ? [] : performance.getEntriesByType('resource').map(entry => entry.name).filter(name => /\/_next\/static\/.*\.hot-update\.js(?:\?|$)/.test(name)).reverse();
  const chunks = typeof document === 'undefined' ? [] : [...new Set([...updates, ...[...document.querySelectorAll('script[src]')].map(script => script.src)])];
  const key = JSON.stringify([version, options.contentVersion, url, line, column, chunks]);
  let entry = flights.get(key), fresh = !entry;
  if (!entry) {
    entry = { id: ++next, key, url, line, column, chunks, contentVersion: options.contentVersion, traceFile: traceFile(url), callers: new Set(), cancelled: false };
    pending.set(entry.id, entry); flights.set(key, entry);
  }
  const result = new Promise(resolve => {
    const settle = value => { signal?.removeEventListener('abort', abort); entry.callers.delete(settle); resolve(value); };
    const abort = () => {
      settle(cancelled());
      if (!entry.callers.size && pending.has(entry.id)) {
        finish(entry, cancelled());
        try { worker?.postMessage({ cancel: entry.id }); }
        catch (error) { useFallback({ step: 'worker-error', error: error.message }); }
      }
    };
    entry.callers.add(settle); signal?.addEventListener('abort', abort, { once: true });
  });
  if (fresh) {
    if (worker) {
      try { worker.postMessage({ id: entry.id, url, line, column, chunks, traceFile: entry.traceFile, contentVersion: entry.contentVersion, explain: true }); }
      catch (error) { useFallback({ step: 'worker-error', error: error.message }); }
    } else decode(entry);
  }
  const resolved = await result;
  return options.explain ? resolved : resolved.location;
}
