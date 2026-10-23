# Brief: two engine problems found by the Relay demo

examples/relay is a shadcn/ui app (components in src/components/ui, built with cva and cn) with catalogued planted
drift in src/drift.js. Running `node dist/cli.js check --root examples/relay --all` and `imitation --suggest` shows:

1. **Imitation can't see shadcn components.** `plumber imitation --suggest --root examples/relay` lists Button, Badge,
   Card, Avatar… each with `fingerprint: []`. shadcn builds class strings with `cva({ base, variants, defaultVariants })`
   and `cn(...)` (clsx + tailwind-merge); Plumber derives no classes from them, so the planted hand-rolled "New issue"
   button in src/app/TopBar.jsx (a <button> styled like the default Button) is never reported as `imitation/Button`.
   Read cva definitions (base + defaultVariants, and each variant as its own recipe) and cn() literal arguments into
   fingerprints, statically (no execution). The existing class-helper reading (`classHelpers` config, the "built in
   code" readers) is the place to extend; reuse it. Prove on a fixture copied from Relay's button.jsx/badge.jsx/card.jsx
   (copy, don't import from examples/) with a hand-rolled look-alike: it's reported as imitation/Button with the
   right variant, and a genuinely different button is not.
2. **False alarm on negative ladder steps.** `-space-x-1.5` in src/app/PersonAvatar.jsx is reported "off your spacing
   scale" while `gap-1.5` and `space-x-1.5` pass on the same 4px `--spacing` base. A negative numeric step is on the
   ladder exactly when its positive is. Check every negative-capable spacing utility (-m*, -space-*, -inset*,
   -translate* if judged, -top/-left…). E2E on a fixture.

Don't modify examples/ (read-only reference) or overlay/src or site/src. Focused tests, then the full suite once:
`PLUMBER_CHROMIUM="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm test`. Atomic commits ending with
`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Don't push. Write docs/briefs/relay-findings-1.result.md.
