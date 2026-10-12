# Health burst result

Implemented the HTTP string response path. HTTP integration checks pass; completion is blocked by Chromium launch restrictions in this sandbox.

## Measurement before changing the transport

The new integration test runs a real Node HTTP host in a separate process, using the existing 1,000-file burst fixture plus one large JSX site. It fires 300 overlapping reads (150 site, 150 edits), checks exact response bytes, and probes health three times while reads remain outstanding. Site bodies are 530,531 bytes; edits bodies are 103,974 bytes, for about 95 MB across the burst.

A host-only Inspector CPU profile, sampled every 100 microseconds during the burst, showed:

| Host sample attribution | Before | After |
| --- | ---: | ---: |
| `respond()` self time (JSON serialization) | 147.96 ms | No samples |
| Socket `writevGeneric` inclusive time | 129.17 ms | 137.34 ms |
| Garbage collection | 54.24 ms | 21.72 ms |
| Unattributed `(program)` | 230.24 ms | 54.11 ms |
| Non-idle sampled time, including profiler overhead | 632.00 ms | 288.18 ms |
| Profile wall time | 1,074.68 ms | 1,127.83 ms |

Serialization was the largest named application frame on the host. This supports moving it off the host. Native structured-clone deserialization was not separately attributed; the reduction in `(program)` and GC time is consistent with removing object transport, but does not establish its exact cost. Total burst throughput did not improve in these profiles; the goal is host availability.

Profiles: [before](health-burst.before.cpuprofile), [after](health-burst.after.cpuprofile). Reproduce with:

```sh
npm run build
PLUMB_BURST_PROFILE="$PWD/docs/briefs/health-burst.after.cpuprofile" \
  node --test --test-name-pattern='HTTP: health' e2e/session-burst.test.mjs
```

## Change

HTTP analysis reads request JSON strings through the same Session admission path. The coordinator serializes the final result, including revision fields, before posting it to the host. Node and Web adapters write that body unchanged. Public object-returning Session methods and stdio dispatch retain object results. Health remains a host snapshot; apply, try, refresh and errors retain their existing transport behavior.

The 512-pending cap, admission deadline and started notification, worker batching, error classification, busy body and Retry-After header are unchanged. Classes validation is shared by object and JSON calls so invalid arguments retain the same errors.

The integration test checks Node/Web response bytes against programmatic results for site, edits, classes, resolve, report, decisions and why. Every burst read must succeed with the exact expected body; all three health probes must overlap outstanding reads and complete below 100 ms. No unit tests were added.

## Health timings

| Local HTTP integration | Probe 1 | Probe 2 | Probe 3 | Outstanding reads |
| --- | ---: | ---: | ---: | --- |
| Before, profiled | 61.23 ms | 1.15 ms | 2.75 ms | 300 / 288 / 286 |
| After, profiled | 41.97 ms | 0.64 ms | 0.46 ms | 300 / 292 / 291 |
| After, all read-route parity checks | 42.89 ms | 0.68 ms | 0.49 ms | 300 / 291 / 289 |
| After, full-suite run | 21.07 ms | 0.73 ms | 0.52 ms | 300 / 296 / 295 |

These are individual runs, not statistical latency bounds. The before run did not reproduce the intermittent over-100-ms failure described in the brief.

## Validation and blocker

- Focused burst integration: 4 tests passed, including existing busy/deadline behavior.
- Full `npm test`, with the supplied Chromium path: exit 1 after the main suite, 331 tests total; 309 passed, 20 failed, 2 skipped (223.71 seconds). Every failure occurred at Chromium launch with the sandbox error below. The HTTP burst and other non-browser checks passed. [Full log](health-burst.tests.log).
- npm's `&&` chain did not reach polling/no-watch checks after the main suite failed. Both stages were subsequently run separately with the same supplied Chromium path: polling exited 0 (25 passed, 1 skipped, 36.10 seconds); no-watch exited 0 (23 passed, 3 skipped, 34.09 seconds). Logs: [polling](health-burst.polling.log), [no-watch](health-burst.no-watch.log).
- Required app verification was attempted before and after with the exact supplied `PLUMB_CHROMIUM` executable. Both exited 1 before starting either app:

  ```text
  FATAL:base/apple/mach_port_rendezvous_mac.cc:159
  bootstrap_check_in org.chromium.Chromium.MachPortRendezvousServer…: Permission denied (1100)
  ```

  MetalUI and Crafting Attention before/after probe numbers are unavailable. The required app verification has not passed. The sandbox forbids privilege escalation, so this launch blocker cannot be resolved within the current run. Browser logs: [before](health-burst.before.log), [after](health-burst.after.log).

All changes are inside this worktree. No app sources were written. No commits, pushes or global installs.
