import { SourceMapStore } from './sourcemap.js';
const store = new SourceMapStore();
let latest = 0;
// Serializing avoids competing row checkpoints. Yielding lets cancellation and
// HMR messages discard obsolete work before the next expensive slice.
let queue = Promise.resolve();
self.onmessage = ({ data }) => {
  if (data.invalidate) { store.invalidate(); latest++; return; }
  latest = data.id;
  queue = queue.then(async () => {
    if (latest !== data.id) return;
    const result = await store.mapFrame(data.url, data.line, data.column, data.chunks, () => latest !== data.id, { explain: data.explain });
    self.postMessage({ id: data.id, result });
  });
};
