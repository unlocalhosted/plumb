# Ledger, sloppy: the example for demos

The same screens as `examples/ledger`, with no rules accepted: plumber knows where the theme is and nothing else, so
every hard-coded value and every Tailwind default shows. Setup is done (Fast Refresh, a config, timings and layer
order in the theme), so no setup step nags during a demo. Its record of known problems (`.plumber/ledger.jsonl`) is
kept empty on purpose: a recorded problem is known debt, and Blueprint leaves it out (83 notes here, 37 with the record).

```bash
npm run build                      # at the repo root
cd examples/ledger-sloppy && npx vite --config vite.config.js
```

It runs at http://127.0.0.1:4341/. "Reset demo" in the bottom-left corner puts the files back after a fix.
