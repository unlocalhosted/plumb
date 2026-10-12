// Dedicated network probe: neither the load generator's JSON work nor page animation delays its clock.
import { performance } from 'node:perf_hooks';
process.on('message', async ({ id, origin, route }) => {
  const start = performance.now();
  try {
    const response = await fetch(new URL(route, origin), { cache: 'no-store', signal: AbortSignal.timeout(60_000) });
    const text = await response.text();
    let body; try { body = JSON.parse(text); } catch { body = text; }
    process.send?.({ id, result: { status: response.status, ok: response.ok, ms: performance.now() - start,
      body: route === '/' ? null : body } });
  } catch (error) {
    process.send?.({ id, result: { ok: false, status: null, body: null, ms: performance.now() - start, error: String(error) } });
  }
});
process.on('disconnect', () => process.exit(0));
process.send?.({ type: 'ready' });
