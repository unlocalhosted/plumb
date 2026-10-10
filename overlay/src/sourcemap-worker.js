import { SourceMapStore } from './sourcemap.js';
const store = new SourceMapStore();
const pending = new Map();
// Fetches may overlap; the store serializes only decoding that shares checkpoints.
self.onmessage = async ({ data }) => {
  if (data.invalidate) { store.invalidate(); pending.clear(); return; }
  if (data.cancel) { pending.delete(data.cancel); return; }
  pending.set(data.id, data);
  const result = await store.mapFrame(data.url, data.line, data.column, data.chunks, () => !pending.has(data.id), { explain: data.explain });
  if (!pending.delete(data.id)) return;
  self.postMessage({ id: data.id, result });
};
self.postMessage({ ready: true });
