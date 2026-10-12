# Computed classes must not depend on timing

Found by bench/apps/verify.mjs (reliability: sampling twice). On MetalUI /foundations/motion, the same LED span's first
GET /__plumb/classes read reported 0 attributed / 6 unattributed; the second reported 6 attributed / 4 ambiguous. On
Crafting Attention a reading's edits hash was missing on the first read only. The class tracer has a 50 ms budget; a cold
first request spends it parsing imported helper modules, stops early, and reports the rest as unattributed.

Rules:
1. The answer for the same element and source revision is identical on every read. A time budget may bound latency but
   never changes the answer: parsing/indexing modules (cold work) is not charged to the evaluation budget, and when the
   budget is exhausted the response is `{ status: 'pending' }` (HTTP 200) or the work completes, never a partial result
   presented as `unattributed`.
2. Hard limits (depth, operation count, import hops) that stop a trace report `limited: true` with which limit, and the
   classes they cover go in `limited` — never in `unattributed`. `unattributed` means proven not to come from a literal in
   reach.
3. `edits` for a site always carries the file hash when the site is a tracked file.
Integration test: a fixture where the className helper lives behind 3 imports in large files; the first classes request
on a cold Session and the tenth on a warm one return identical attributed/unattributed/ambiguous sets; a request that hits
a hard limit lists those classes under `limited`. No unit tests. npm test and typecheck pass. Do not touch overlay/src or
bench/apps/verify.mjs. Do not commit. Summary to docs/briefs/classes-determinism.result.md.
