const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const limit = 64, lifetime = 60_000;
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

/** Runs in a module worker in browsers. Node HTTP integration uses the same store. */
export class SourceMapStore {
  scripts = new Map(); maps = new Map(); modules = new Map(); decoded = new Map(); generation = 0;
  refresh = '';
  invalidate() { this.generation++; this.refresh = Date.now() + '-' + this.generation; for (const cache of [this.scripts, this.maps, this.modules, this.decoded]) cache.clear(); }
  async cached(cache, key, run) {
    const now = Date.now(), old = cache.get(key);
    if (old && now - old.time < lifetime) return old.value;
    if (cache.size >= limit) cache.delete(cache.keys().next().value);
    const entry = { time: now, value: null };
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
      checkpoints: [{ source: 0, line: 0, column: 0 }] };
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
      let generated = 0; const segments = row === wanted ? [] : null;
      const text = decoded.rows[row];
      const pattern = /[^,]+/g;
      for (const match of text.matchAll(pattern)) {
        if (cancelled()) return null;
        const value = fields(match[0]); generated += value[0];
        if (value.length > 1) { state.source += value[1]; state.line += value[2]; state.column += value[3]; }
        if (generated < 0 || state.source < 0 || state.source >= decoded.map.sources.length || state.line < 0 || state.column < 0) throw new Error('Invalid source map position.');
        if (segments) segments.push(value.length === 1 ? { generated } : { generated, ...state });
        if (performance.now() - slice > 4) { await pause(); slice = performance.now(); }
      }
      decoded.checkpoints[row + 1] = { ...state };
      if (segments) result = segments;
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
    return { source, line: segment.line + 1, column: segment.column + 1, ...(hash ? { hash } : {}) };
  }
  async mapFrame(url, line, column, chunks = [], cancelled = () => false, options = {}) {
    const generation = this.generation;
    const obsolete = () => generation !== this.generation || cancelled();
    try {
      const mapped = await this.original(await this.cached(this.decoded, url, () => this.forScript(url, chunks, obsolete)), line - 1, column - 1, obsolete);
      return options.explain ? mapped ? { location: mapped } : failure('map', { step: obsolete() ? 'cancelled' : 'unmapped-position', url, line, column }) : mapped;
    } catch (error) { return options.explain ? failure(error.reason ?? 'map', error.detail ?? { url, line, column, error: error.message }) : null; }
  }
}
let version = 0, worker, next = 0;
const pending = new Map(), fallback = new SourceMapStore();
export const sourceMapVersion = () => version;
export function invalidateSourceMaps() {
  version++; fallback.invalidate(); worker?.postMessage({ invalidate: true });
  for (const resolve of pending.values()) resolve(failure('map', { step: 'invalidated' })); pending.clear();
}
/** Cancel obsolete pointer work; all large parsing/indexing stays off the main thread. */
export async function mapFrame(url, line, column, options = {}) {
  if (typeof document === 'undefined') return fallback.mapFrame(url, line, column, [], () => false, options);
  if (typeof Worker === 'undefined') return options.explain ? failure('map', { step: 'worker-unavailable' }) : null;
  if (!worker) {
    worker = new Worker(new URL('./sourcemap-worker.js', import.meta.url), { type: 'module' });
    worker.onmessage = ({ data }) => { pending.get(data.id)?.(data.result); pending.delete(data.id); };
    worker.onerror = event => {
      for (const resolve of pending.values()) resolve(failure('map', { step: 'worker-error', error: event.message })); pending.clear();
      invalidateSourceMaps(); worker.terminate(); worker = undefined;
    };
    if (version) worker.postMessage({ invalidate: true });
  }
  const id = ++next;
  for (const resolve of pending.values()) resolve(failure('map', { step: 'superseded' })); pending.clear();
  const result = new Promise(resolve => pending.set(id, resolve));
  // Prefer freshly fetched base chunks over historical updates. Webpack removes
  // hot-update script elements after loading; resource timing supplies a fallback
  // for modules introduced by HMR that are absent from the page's script list.
  const updates = performance.getEntriesByType('resource').map(entry => entry.name).filter(name => /\/_next\/static\/.*\.hot-update\.js(?:\?|$)/.test(name)).reverse();
  const chunks = [...new Set([...[...document.querySelectorAll('script[src]')].map(script => script.src), ...updates])];
  worker.postMessage({ id, url, line, column, chunks, explain: true });
  const resolved = await result;
  return options.explain ? resolved : resolved.location;
}
