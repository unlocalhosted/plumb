# Overlay layer 1 result

Implemented shared structured replacements with stable edit ids, exact UTF-16 source ranges, and token choices. Agent text remains byte-identical; sites without a close token offer no edits.

Added `Session.edits()` and serialized `Session.apply()`. Apply re-derives choices, rejects stale hashes, unknown ids and overlapping ranges, writes the requested source once, refreshes analysis, and returns the new revision/hash plus remaining findings. Config, ledger, theme definitions, untracked files, traversal, symlinks and hard links are protected.

Added GET `edits` and POST `apply` to HTTP and stdio. Exported the types and framework-free `createHandler()` with configurable prefix (default `/__plumb/`), token authentication or same-origin loopback enforcement, and the 1 MiB POST limit. `serve()` uses the handler and retains existing routes.

Validation: `npm test` passed all 220 integration tests; `npm run typecheck` passed. New `e2e/edits.test.mjs` covers Session, real CLI HTTP, stdio, source rewrites, cold CLI parity, refusal cases, protected-file bytes and handler mounting/security. Agent output also matched the previous formatter byte-for-byte across 10 real fixture reports.

No browser/framework code added. No commit created.

## Review fixes

1. **Fixed:** Token-less access validates Host independently against localhost, 127.0.0.1 and [::1] (any valid port), plus explicit `allowedHosts` authorities. Every POST requires an exact Origin for the connection scheme, Host and port; cross-site and same-site Fetch Metadata are refused. Loopback peer checks and token authentication remain separate. Integration requests use raw HTTP to exercise actual Host overrides, missing/wrong-scheme Origins, metadata and allowed hosts.
2. **Fixed:** Capture device/inode during canonical source validation, compare the opened descriptor against that identity, and revalidate containment, identity and link count before mutation. A swapped parent cannot authorize a different inode merely because its contents match. Deterministic parent-symlink injection refuses apply and preserves the other project's bytes.
3. **Fixed:** Check descriptor/path identity around mutation, then require the refreshed analyzed input hash to match the intended write and current named source. Return hash and remaining findings from that analyzed snapshot. Deterministic atomic replacement and concurrent-save injections now refuse success; subsequent reads reconcile with the editor's source.
4. **Fixed:** Reuse embedded CSS's cooked-to-raw literal mapping for class strings and literal object keys; invalidate the old collection cache format. Escaped whitespace no longer shifts token locations onto another occurrence. Integration applies only the second authored token in the review's duplicate-token example.
5. **Fixed:** Structured stylesheet edits replace only the authored value span, retaining property spacing, trailing comments and `!important`. Agent sentence rendering stays unchanged. Integration compares exact written bytes for a commented important declaration.
6. **Fixed:** Remaining findings retain line-scoped lookup semantics after replacements shift offsets. Session and HTTP integration assertions now require the untouched `gap-[999px]` NEEDS-DECISION finding; stylesheet coverage also retains unselected declarations.
7. **Fixed:** Apply refreshes the requested path, its dependencies and queued events without inventory. Tracked JSX/JS/TS and ordinary CSS refresh incrementally; CSS invalidates stylesheet phases and rebuilds the retained Tailwind compiler only when its own inputs change. Config changes, inventory changes and invalid-session recovery still restart as required. Integration checks zero inventory calls, unchanged worker identity and cold CLI parity for all four source types.
8. **Fixed:** Targeted scans update retained hash/stamp maps without copying or enumerating the project inventory, including polling-disabled reads. Report findings are indexed and narrowed by file, line and column once per analyzed report; source eligibility, protected files and decision names are retained indexes. Integration makes inventory and retained-map enumeration throw during an unchanged warm edits read.
9. **Fixed:** One transport-neutral route/auth/streaming-body-validation core calls the existing shared dispatch. Public `createHandler` adapts Node middleware; public `createWebHandler` adapts Web Request/Response, with exported option types. Token-less Web access requires explicit trusted `peerAddress` context; it never invents socket information. Integration exercises Web auth, method/JSON/body limits, edits/apply, snapshot parity, prefix handling and missing-peer refusal.

Validation after review fixes: `npm test` passed 232 integration tests; `npm run typecheck` passed. `e2e/edits.test.mjs` passes all 22 tests, including per-finding assertions and deterministic filesystem races. No unit tests or commits added.
