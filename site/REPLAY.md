# Homepage overlay replay

From the repository root:

```sh
npm run build
node site/scripts/record-replay.mjs
npx vite build --config site/vite.config.mjs
node --test --test-concurrency=1 e2e/site-replay.test.mjs e2e/site-text.test.mjs
```

Install Playwright Chromium beforehand, or set `PLUMB_CHROMIUM` to an installed Chromium executable. Browser launch needs permission to use macOS browser services; the restricted agent shell cannot launch it here.

Re-record after changing `DriftedCard.jsx`, its owners (`Hero.jsx`, `Home.jsx`, `entry.jsx`), the theme/config, or Plumb's analysis/edit engine. The recorder starts a real Vite server in a temporary copy, with the demo disabled. It records `health`, `resolve`, `site`, `edits`, `classes`, and `text` for every stamped opening in the hero and its owners. Only the copy receives real source writes. It captures the Cartesian product of each element's offered fixes, including intermediate states with another drift on that element still unfixed. Responses for different elements are independent, so these states support any fix order. The current fixture contains 62 positions, 21 per-element states, and 241 distinct responses.

The site's explicit opt-in is:

```js
plumb({
  config: 'plumb.config.mjs',
  demo: { replay: 'src/hero/replay.js', guard: true },
})
```

`demo.replay` is relative to the Vite root. It enables source stamps and the real overlay in production, loading the transport before the client. Ordinary production builds omit both. `guard: true` loads the same transport in development for the recorded hero file; other files still use the real dev server. Recording mode disables the demo entirely. The middleware-served dev client uses an ignored dynamic import so Vite does not try to resolve it as a source module.

In production, the transport answers same-origin `/__plumb/*` reads from the fixture. A write validates the current file hash and recorded edit IDs, serializes writes, replaces class tokens on matching stamped DOM elements, advances an in-memory source/hash/revision, and emits `plumb:demo-applied` with `{ file, line, before, after }` for each edit. Subsequent reads use that element's recorded class state. Reloading starts the demo over. No visitor write changes a source file or needs a backend. Unrecorded elements get the recorded real-server refusal; unrelated fetches pass through.

The current six drifts are card radius/padding, header gap, name size, and button padding/radius. All intended fixes and their alternatives are already safelisted in `src/styles.css`; `bg-primary` is also authored in the card. The old colour drift is no longer part of the hero.

This is a finite recording, not a general offline Plumb server. Only the recorded hero is writable. Production React omits debug owner information, so component-name/owner navigation can be less detailed than development. The real engine also offers `text-xs--line-height` for the name; this is preserved in the recording rather than silently filtered. The intended and verified type fix is `text-base`. The standalone e2e covers dev guard plus three static orders, alternate spacing/radius choices, rendered CSS, unchanged source bytes, six emitted events, no static overlay API traffic, and each corrected element's on-scale reading.

Text reads use the recorded HTTP answers, including static run ranges and literal metadata. `POST /__plumb/apply-text` validates the file hash, current run ID, `from`, and replacement length, then changes only matching direct DOM text nodes. It never replaces a host’s children or nested markup. A missing, ambiguous, or externally changed DOM run is refused. Writes share the class-write queue; rebased source ranges keep text and class hashes consistent in either order. Reads return current text, ranges, hash, and newly hash-bound IDs. Reload resets both kinds of edit. Only the recorded hero card is writable.

Escaping is shared with the real server: simple labels remain JSX text; braces, angle brackets, ampersands, newlines, tabs, or boundary whitespace use a JSON string-literal child. Existing literals retain their quote style. The virtual source preserves outer formatting. No source file is written in the demo.
