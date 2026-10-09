# Overlay layer 1 review

Verdict: **ship after fixes**. Structured edits and shared dispatch are useful foundations, but source-write safety, authored spans, response consistency, and transport portability still have blockers.

## Verification

Read implementation brief, complete working-tree diff, both untracked implementation/test files, and relevant collection/refresh code. Built an isolated copy under `/tmp/plumb-overlay-review-rmwg8I`, then ran `node --test e2e/edits.test.mjs`: **10 passed, 0 failed**. Build passed. Kept builds, fixtures, caches, and probe scripts outside this checkout; no source edits.

Additional probes used real Sessions and HTTP servers. Filesystem races were injected deterministically at filesystem operation boundaries through `fs.promises.open`/descriptor wrappers; they demonstrate the interleavings below, not a naturally timed exploit. Every finding below is VERIFIED by code inspection or a probe; none relies on an unverified PLAUSIBLE claim.

## Findings, highest severity first

### 1. P1 — Token-less authentication trusts attacker-controlled Host and permits unproven writes

**Location:** `src/session/server.ts:81-88`.

**Failing scenario:** Connect to loopback while supplying `Host: evil.example:<port>` and `Origin: http://evil.example:<port>`. Both `GET /__plumb/edits` and `POST /__plumb/apply` return **200**, and POST rewrites source. Comparing two attacker-controlled authorities does not prevent DNS rebinding: the browser's TCP peer remains loopback after the hostname resolves there.

A separate probe sent a valid apply body with `Content-Type: text/plain`, **no Origin**, and `Sec-Fetch-Site: cross-site`. It also returned **200** and wrote source. The handler defaults absent Origin to trusted and never checks Fetch Metadata. Comparing `.host` also ignores scheme, so it does not establish full origin equality.

**Smallest fix:** Validate Host against explicitly trusted local authorities independently of Origin. For token-less writes require a valid, exact trusted Origin including scheme/port; reject cross-site/same-site Fetch Metadata when present. Token-authenticated access can retain its separate policy. Foreign CORS preflight already returned **403** without allow-origin headers; retain that behavior.

### 2. P1 — Leaf-only no-follow opening still writes through a swapped parent symlink

**Location:** `src/session/index.ts:175-180`, `src/session/index.ts:218-222`.

**Failing scenario:** Immediately after the final `editableFile()` check, rename `<root>/src` and replace it with a symlink to another project's `src`, whose `App.tsx` has the same bytes. `open(file, O_RDWR | O_NOFOLLOW)` follows the intermediate `src` symlink; the opened outside file is regular with `nlink === 1`, and its content hash matches. Apply succeeds and rewrites **the other project's App.tsx**. Verified with deterministic injection before the actual open. Static symlink/hard-link tests do not cover this interleaving.

**Smallest fix:** Bind opening to the validated source identity: capture device/inode during validation, compare against the opened descriptor, and revalidate canonical containment before mutation. For guaranteed no-follow traversal of mutable parent paths, use directory-relative opening against pinned directories with no-follow semantics throughout, or refuse when that guarantee cannot be provided. Leaf `O_NOFOLLOW` alone is insufficient.

### 3. P1 — Successful apply can return a hash belonging to no analyzed revision

**Location:** `src/session/index.ts:176-201`, especially `191` and `201`.

**Failing scenarios:**

- Open `App.tsx`, then simulate an editor's atomic save by renaming that inode to `Previous.tsx` and placing unchanged original content at `App.tsx`. Apply writes the old descriptor and returns success with the edited hash, while the named source retains `py-[10px]`.
- Immediately after apply's truncate, save `original + '// concurrent editor\n'` to the named source. Refresh analyzes that content, but the response still returns `sourceHash(next)` for the discarded edit.

Both injected races returned **revision 1**, with `result.hash !== hash(readFile(result.file))` and remaining findings from the other content. Session serialization excludes its own watcher callbacks, but does not exclude editor saves or pathname replacement.

**Smallest fix:** Check descriptor/path identity around mutation, then compare the refreshed source snapshot's hash with the intended new hash. Refuse/reconcile a conflicting save rather than returning successful applied ids. Return revision, hash, and remaining from one analyzed snapshot; do not compute response hash independently from the local `next` string.

### 4. P1 — Cooked string offsets can pass the exact-text guard at the wrong occurrence

**Location:** `src/surfaces/edits.ts:61-65`; underlying collector at `src/collect/classes.ts:165-169` and `185-186`.

**Failing input:**

```tsx
export const App = () => <div className={"\u0020\u0020py-[10px] py-[10px]"} />;
```

The two authored `py-[10px]` tokens start at columns **55 and 65**. Findings report columns **45 and 55**, because collection tokenizes the cooked string and adds cooked indices to the raw literal start. The second finding's incorrect column happens to land on the first raw token, so `source.slice(start, end) === from` accepts it. Applying the offered edit produces:

```tsx
export const App = () => <div className={"\u0020\u0020py-s2 py-[10px]"} />;
```

It changes the first authored occurrence for the finding representing the second decoded occurrence. Querying the actual second authored column offers no edit. Verified offsets and resulting source through a real Session.

**Smallest fix:** Carry raw authored spans or a cooked-to-raw offset map from collection into edit derivation. Reuse the mapping approach already present for embedded CSS literals. Until mapped, refuse structured edits for escaped literals instead of treating an incidental substring match as proof of site identity. Raw spans are also the missing syntax-extension seam.

### 5. P2 — CSS token replacement removes authored `!important`

**Location:** `src/surfaces/edits.ts:37-44`.

**Failing input:** A tracked non-theme stylesheet containing `.local { gap: 10px !important; padding: 13px; }`. Offered edit is `gap: 10px !important` to `gap: var(--spacing-s2)`. Apply produces `.local { gap: var(--spacing-s2); padding: 13px; }`, changing cascade priority as well as the chosen value. Verified generated edit and written bytes.

**Smallest fix:** Preserve declaration importance separately from the value and render it in CSS replacements. Prefer replacing only the authored value span, leaving property spelling, comments, and importance intact. Class replacements already preserve their importance markers.

### 6. P2 — `remaining` hides untouched findings on the queried element

**Location:** `src/session/index.ts:193-200`, `src/session/worker.ts:71-74`; misleading assertion at `e2e/edits.test.mjs:90`.

**Failing input:** `export const App = () => <div className="py-[10px] gap-[999px]" />;`. Read edits with `edits(file, 1)` and apply the available padding edit. Response says `remaining: []`, but `site(file, 1)` still reports `gap-[999px]` on that same element. The implementation queries only the replaced token's new column, discarding the broader original site scope. Existing tests assert an empty result even while retaining this no-fit finding.

**Smallest fix:** Resolve selected edits to their authored element/site group and return all remaining findings in that group after offset changes. At minimum retain line-scoped lookup semantics for this case. Add an integration assertion that remaining includes the untouched NEEDS-DECISION finding; do not test only selected replacement columns. An explicit site/group identity would let apply preserve scope without transport-specific logic.

### 7. P2 — Apply performs a full inventory and restarts warm workers for ordinary source types

**Location:** `src/session/index.ts:166` and `191`, using `src/session/index.ts:88-107`.

**Failing scenario:** With a warm Session and a long polling interval, apply one tracked `Other.jsx` edit or one non-theme CSS declaration edit. Instrumented probes counted **two full inventory calls and one worker restart** for each apply. The unconditional `scan()` before edit derivation always inventories the project. The existing broad-change predicate permits incremental refresh only for `.tsx`, so `.jsx`, `.js`, `.ts`, and CSS edits terminate the worker and discard caches.

**Smallest fix:** Give apply a targeted changed-path refresh that consumes queued dependency events, with periodic global reconciliation kept outside requests. Admit already tracked JS/JSX/TS sources to incremental collection; invalidate affected stylesheet/compiler phases for ordinary CSS edits. Restart only for inputs that actually require rebuilding session configuration. This requires extending inherited refresh infrastructure, not changing edit transports.

### 8. P2 — Even native warm `edits` reads retain project-wide work

**Location:** `src/session/index.ts:151`, using `91-102`; `src/session/worker.ts:62-68`; `src/surfaces/edits.ts:53-56`.

**Failing scenario:** Exercise the native partial-scan branch on an unchanged four-file inventory and query one source site. Instrumentation observed **eight map entries copied and four old hash keys enumerated**, despite zero inventory calls and no changed source. Two complete maps are cloned and the changed-key union visits the project inventory. With native watching unavailable or disabled, the endpoint instead globs/stats the whole project. Independently, worker edits walks global findings and only filters requested line/column after deriving edits; stylesheet/decision eligibility also scans report arrays.

**Smallest fix:** Keep partial scans proportional to queried/event paths, updating retained hashes/stamps without cloning or enumerating the entire inventory. Index warm report findings, source eligibility, and protected files by file/site, and derive only the requested scope. Reuse the warm report as now; rebuilding analysis is unnecessary for unchanged reads.

### 9. P2 — Exported handler cannot mount in a Next App Router route

**Location:** `src/session/server.ts:65-75`, `82`, `103-110`; public exports at `src/index.ts:248-251`.

**Failing scenario:** A Next route receives a Web `Request` and must return a Web `Response`. `createHandler()` requires Node `IncomingMessage` plus mutable `ServerResponse`, reads `request.socket.remoteAddress` and bracket-indexed headers, streams the Node request, and returns `void`. It therefore mounts in Vite middleware but cannot be used as the Next route handler. `dispatch` shares Session invocation, but remains outside the package's public exports; route parsing, body limits, authorization, and response creation are still coupled to Node HTTP.

**Smallest fix:** Extract one transport-neutral route/auth/body-validation core returning a result/response promise, then expose Node middleware and Web Request/Response adapters over it. Make trusted-origin/peer information explicit because Web Request has no socket peer; do not invent a loopback address. Route dispatch must stay shared rather than being copied into the Next adapter.

## What already holds

Verified stable ids, UTF-16/CRLF handling in ordinary JSX and Unicode CSS, direct expression attributes, `cn(...)`, and template literals. Existing integration coverage passes stale/unknown/overlapping/duplicate refusals, serialized concurrent applies, protected config/ledger/theme files, static symlink/hard-link/traversal refusal, HTTP body limits, and stdio dispatch. Multi-edit application assembles one string and calls source `writeFile` once, followed by truncation. Normal watcher interleavings in probes emitted one revision change; no double rebuild was observed for the same write.

The edit data model can accommodate new rule families that provide decisions without transport changes. Missing seams are trustworthy raw spans with syntax-specific value rendering, explicit element/site scope, snapshot-consistent guarded writing, targeted refresh/invalidation, indexed warm lookup, and a Web/Node-neutral request core. The copied `replacement()` extraction preserves the prior agent sentence rendering by inspection; no separate full agent regression suite was run.

**Final verdict: ship after fixes.**
