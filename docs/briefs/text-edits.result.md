# Text edits: server and homepage replay

Implemented the read layer, then the write layer, then the homepage replay layer. The read layer's HTTP integration test passed before write implementation; all three HTTP feature tests passed before replay implementation.

Added `Session.text`, `Session.applyText`, public TypeScript types, coordinator write barriers, HTTP/Web adapter routing, and JSON-RPC allow-list entries. Class-write engine behavior is unchanged. The replay recorder now captures text answers and run metadata from the real HTTP server. Its refreshed fixture contains 62 stamped positions, 21 class states, and 241 distinct responses.

No edits were made to `overlay/src/widget.js`, `overlay/src/tokens.css`, or `src/hosts/vite.ts`. Those files already had unrelated working changes. The existing site's demo transport was extended in place; overlay text controls remain outside this brief.

## Endpoint contracts

`GET /__plumb/text?file=src/App.tsx&line=1&column=26`

`file` is a project-relative or in-root absolute path. `line` and `column` are positive, one-based integers identifying the exact `<` of an authored opening tag. Reads require a tracked JS/JSX/TS/TSX source file.

Editable response, HTTP 200:

```json
{
  "editable": true,
  "hash": "<64-character SHA-256 source hash>",
  "runs": [
    {
      "id": "<64-character SHA-256 run id>",
      "text": "Send",
      "start": 33,
      "end": 37
    }
  ]
}
```

Offsets above illustrate the shape. Actual offsets are zero-based UTF-16 source offsets, with an exclusive `end`. For plain text they cover the entire JSX text node, including formatting whitespace. For a literal child they cover its entire `{...}` container. IDs are SHA-256 of `JSON.stringify([hash, start, end])`; they remain stable for that source hash.

Only direct static runs belonging to the selected element are returned. Nested elements keep their own runs. An element with both static runs and dynamic children exposes the static runs. Plain text follows JSX line folding, tab-to-space conversion, and HTML4/numeric entity decoding; its outer formatting whitespace is excluded from `text`. Spaces inside the label are retained. Braced string literals retain their actual value, including boundary whitespace. Static backtick literals also work; interpolated templates are refused. `<Trans>` and descendants are refused.

Non-editable response, HTTP 200:

```json
{
  "editable": false,
  "hash": "<64-character SHA-256 source hash>",
  "reason": "The text comes from an expression. Edit its source instead."
}
```

Every non-editable `reason` string:

- `The text comes from an expression. Edit its source instead.`
- `The text comes from a prop. Edit the prop source instead.`
- `The text comes from a translation. Edit the translation source instead.`
- `This component receives its children from elsewhere. Edit them at their source.`
- `This element has no static text to edit.`

`POST /__plumb/apply-text`, with JSON body:

```json
{
  "file": "src/App.tsx",
  "hash": "<hash returned by text>",
  "run": "<run id returned by text>",
  "from": "Send",
  "to": "Send message"
}
```

Success, HTTP 200, with exactly the existing `apply` result shape:

```json
{
  "revision": 1,
  "file": "/absolute/project/src/App.tsx",
  "hash": "<new 64-character SHA-256 source hash>",
  "applied": ["<selected previous run id>"],
  "remaining": []
}
```

`remaining` contains the existing finding objects at the resulting authored site; it is not necessarily empty. `applied` identifies the changed run. The client can reread `text` with the returned hash and updated run ID.

Writes compare the current disk hash, re-derive the selected run from the held source descriptor, compare its rendered text with `from`, and replace only that range. They reuse class-write path containment, config protection, symlink/hard-link checks, descriptor identity checks, serialized execution, reconciliation, and post-write source validation. Client offsets are never trusted. Blank or whitespace-only `to` is refused; maximum length is 500 JavaScript string code units.

## Refusals

Text-specific validation/safety refusals return HTTP 400:

```json
{"error":"The file changed since the overlay read it. Read it again."}
```

Every text-specific error string:

- `Apply text requires a file, hash, run id, from string and to string.`
- `Replacement text must not be empty.`
- `Replacement text must be at most 500 characters.`
- `The file changed since the overlay read it. Read it again.`
- `The text changed since the overlay read it. Read it again.`
- `Unknown text run id. Read the element's text again.`
- `Text edits require a tracked JSX source file.`
- `Source position does not identify an authored JSX opening tag.`
- `Fix source syntax errors before editing text.`

Shared request/path refusals also use `{"error":"..."}`:

- HTTP 400: `Parameters must be a JSON object.`
- HTTP 400: `Request body must be valid JSON.`
- HTTP 400: `Request exceeds the 1 MiB request limit.`
- HTTP 400: `file must be a non-empty string.`
- HTTP 400: `line must be a positive integer.`
- HTTP 400: `column must be a positive integer.`
- HTTP 400: `File must be a non-empty source path.`
- HTTP 400: `File must be inside the project root.`
- HTTP 400: `Line and column must be positive integers.`
- HTTP 400: `Apply cannot edit Plumb config or .plumb files.`
- HTTP 400: `Apply cannot edit symbolic links or paths outside the project root.`
- HTTP 400: `Apply requires a regular source file without hard links.`
- HTTP 401: `A valid x-plumb-token header is required.`
- HTTP 403: `A same-origin request from a trusted loopback host is required.`
- HTTP 403: `Origin is not allowed.`
- HTTP 403, CORS preflight: `Request headers are not allowed.`
- HTTP 405, wrong verb for text: `Use GET for this endpoint.`
- HTTP 405, wrong verb for apply-text: `Use POST for this endpoint.`

The wrong-verb responses include `Allow: GET` or `Allow: POST` on the real server. Existing busy/startup responses remain HTTP 503 with `{"status":"busy"}`, `{"status":"starting"}`, or `{"status":"failed","diagnostic":"..."}`. Existing filesystem/analysis errors remain their actual diagnostics; those strings depend on the source and OS rather than this feature.

## Escaping and formatting

Ordinary replacements stay plain JSX text, preserving the run's leading/trailing source whitespace exactly. For `{`, `}`, `<`, `>`, `&`, newlines, tabs, or boundary whitespace in the replacement, the whole replacement label becomes a double-quoted JSON string-literal child. This keeps one logical editable run and prevents both JSX syntax injection and accidental entity decoding.

```jsx
<button>
  Send
</button>
```

Writing `{}<> &amp;` produces:

```jsx
<button>
  {"{}<> &amp;"}
</button>
```

Existing braced literals retain their quote style and whitespace outside the literal. Backslashes, quotes, and control characters are escaped. Static backtick literals additionally escape backticks and `${`.

```jsx
{'Send'}      // writing Don't produces {'Don\'t'}
{ "Send" }   // writing Say "yes" produces { "Say \"yes\"" }
```

The real engine and browser replay share the same encoding module. CRLF, tabs, outer indentation, other runs, nested markup, and all bytes outside the selected replacement range remain intact. Replacing a multiline label replaces its content lines; its surrounding formatting is preserved.

## Homepage replay

Production `text` reads use recorded real-server answers. Hero runs expose the current virtual source hash, rebased ranges, updated text, and freshly hash-bound IDs. `apply-text` validates the same text parameters, hash, ID, `from`, and length, then mutates matching direct DOM text nodes only. It refuses missing, changed, or ambiguous DOM matches rather than replacing nested children. The virtual source is updated solely to maintain hashes/ranges; no source file is written.

Text and class writes share one queue. Class token ranges and text ranges are rebased after either kind of change, so a text edit before a class edit does not corrupt the virtual source or target the wrong characters. Existing class options and DOM class replacements are retained. Both kinds of write emit `plumb:demo-applied`; reloading resets the demo. Development guard mode intercepts hero writes while other files use the real dev server. The explicit Vite demo wiring already existed and needed no host changes.

Demo-only errors, HTTP 400, in the same `{"error":"..."}` shape:

- `This demo only writes the recorded hero card.`
- `The demo element changed since Plumb read it. Read it again.`

Unrecorded reads use recorded fallback refusals. Wrong verbs return HTTP 405 with the same `Use GET/POST for this endpoint.` strings. The replay is finite: only the recorded hero file is writable. Its successful response uses the project-relative `file`, as the existing class replay does.

## Validation

Passed:

```sh
npm run build
node --test e2e/text-edits.test.mjs
node site/scripts/record-replay.mjs
npx vite build --config site/vite.config.mjs
git diff --check
node --check e2e/site-text.test.mjs
node --check site/src/hero/replay.js
node --check site/scripts/record-replay.mjs
```

The read-only layer first passed one HTTP integration test. The completed server layer passes three feature integration tests covering exact label bytes; UTF-16 offsets; JSX whitespace; indentation and CRLF; entity decoding; both quote styles and static templates; repeated rereads; `{}`/`<>`/ampersand escaping; expressions, `t(...)`, `<Trans>`, props, and external children; stale hashes; `from` mismatch; unknown IDs; empty/oversized/malformed replacements; unsafe paths, symlinks and hard links; method restrictions; and concurrent requests. Every tested refusal preserves source bytes.

Existing write regressions and broader checks:

```sh
PLUMB_WATCH=1 PLUMB_POLLING=0 node --test --test-concurrency=1 \
  e2e/text-edits.test.mjs e2e/edits.test.mjs e2e/computed.test.mjs \
  e2e/numeric-spacing.test.mjs e2e/stylesheets-inline.test.mjs \
  e2e/hosts.test.mjs e2e/serve.test.mjs
```

Result: 91 tests, 87 passed, 3 skipped, 1 failed. The skipped tests were missing Chromium, an OS native-watch `EMFILE` limitation, and the polling-only test under native mode. The failure was the existing serve parity test receiving HTTP 503 `{"status":"busy"}`. That exact test subsequently passed in isolation in both modes:

```sh
PLUMB_WATCH=1 PLUMB_POLLING=0 node --test \
  --test-name-pattern='serve incrementally matches cold CLI' e2e/serve.test.mjs
PLUMB_WATCH=0 PLUMB_POLLING=0 node --test \
  --test-name-pattern='serve incrementally matches cold CLI' e2e/serve.test.mjs
```

Each isolated run: 1 passed, 0 failed. The full batch's transient failure is recorded rather than counted as an entirely green batch. Its logs are in `/private/tmp/plumb-text-edits/regression.log`, `serve-isolated.log`, and `serve-nowatch.log`.

Browser checks attempted:

```sh
PLUMB_WATCH=1 PLUMB_POLLING=0 node --test --test-concurrency=1 \
  e2e/edits.test.mjs e2e/verify-writes.test.mjs e2e/site-replay.test.mjs
PLUMB_CHROMIUM='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' \
  node --test --test-concurrency=1 e2e/verify-writes.test.mjs e2e/site-replay.test.mjs
node --test e2e/site-text.test.mjs
```

The first command passed all 24 edit tests; both browser tests failed at launch because Playwright's expected `chromium_headless_shell-1248` executable is absent. The installed Chrome attempt aborted under the sandbox with `SIGABRT`. The new site-text e2e likewise stopped at missing-browser launch, before executing its assertions. A connected Chrome tab did display the built homepage and its stamped text targets; raw CDP execution of replay-write assertions was denied by browser approval and was not retried through another browser mechanism.

`e2e/site-text.test.mjs` is ready to verify dev guard plus production text writes, source-byte integrity, all primary refusals, repeated escaping/rereads, mixed text/class writes, concurrent writes, DOM mismatch refusal, reload reset, and absence of production API network traffic. These browser assertions remain unverified here. No unit tests were added.

## Left undone / environment limits

- Browser replay-write proof and the existing browser Write suites need an environment where browser launch and automation are permitted. Production build and HTTP recorder checks passed; they do not prove DOM writes.
- Commits could not be created. The first read-layer staging attempt failed with `Unable to create '/Users/vijaysingh/unlocalhosted/plumb/.git/index.lock': Operation not permitted`. This session grants only read access to `.git`; no approval escalation is available. Changes remain unstaged, with unrelated WIP preserved.
- Temporary replay QA servers were started on ports 4395/4396 in exec session 99476. Sandbox denied terminating their Node process (`kill 66951 failed: operation not permitted`); they may remain until the execution session is cleaned up.
- Overlay text-edit UI was deliberately not implemented, as specified by the brief.
