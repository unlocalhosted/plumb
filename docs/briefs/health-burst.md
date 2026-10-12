# Brief: health stays under 100 ms while 300 reads are in flight

## What is observed

`bench/apps/verify.mjs` fires 300 overlapping reads (`/__plumb/site`, `/__plumb/edits`) at an app's Vite dev server and probes `/__plumb/health` three times while they run. The rule is that every health probe answers in under 100 ms.

The first probe, taken as the burst lands, is the slow one. On MetalUI (`/foundations/motion`) it took 101.4 ms; the next two took 0 ms and 1 ms. Earlier runs measured 42–84 ms on MetalUI and 75–151 ms on Crafting Attention, depending on machine load (load average 5–16 on 8 CPUs). The probe is close to the limit and sometimes over it.

## Where the time likely goes

Health is answered on the host's main thread, the Vite process, by `src/session/server.ts`. For every read, that main thread also:

1. receives the coordinator worker's result as a structured clone (`src/session/index.ts`, `session.worker.on('message')` → `pending.resolve(message.result)`), which deserialises the whole object graph on the main thread; then
2. runs `JSON.stringify` over it again (`respond()` in `src/session/server.ts`).

The answers to site and edits reads can be large. Three hundred of them arriving at once leave health queued behind that main-thread work.

Measure before changing anything: confirm with a CPU profile of the host process during the burst, or with timings, that this is where the main thread spends the time. If it isn't, find what is.

## The change, if the measurement agrees

For HTTP reads, have the coordinator send the response body as one JSON string. Passing a string between threads costs almost nothing, and the main thread writes it out untouched. Programmatic `Session` callers (`session.site()` and the rest) must still receive objects, exactly as today. Only the HTTP transport takes the string path. Keep the busy and deadline behaviour, the 512 pending limit, error mapping and response bodies byte-for-byte identical.

## Done when

- `npm test` passes, the whole suite.
- An integration test, through the real HTTP boundary, shows health answering under 100 ms while 300 large reads are in flight. Base it on the existing `e2e/session-burst.test.mjs`. No unit tests.
- `PLUMB_CHROMIUM=<path> node bench/apps/verify.mjs metalui craftingattention` passes, with every burst health probe under 100 ms. Report the measured probes before and after.
- Write the result to `docs/briefs/health-burst.result.md`: what the profile showed, what changed, and the numbers.

## Limits

- Only modify files inside this worktree. Never write inside `metalui`, `kamui`, `craftingattention` or `algorecall`; the verify harness reads them.
- No commits, no pushes, no global installs.
