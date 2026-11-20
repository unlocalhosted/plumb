# Ledger: an example app for React Plumber

A small, deliberately sloppy screen to try plumber on: hard-coded values, Tailwind's default steps, and the marks a
generated screen leaves (labels over headings, badges with no meaning, emoji, numbers with no order).

Plumber is set up here the way a person would set it up: its Vite plugin with React Fast Refresh, a `plumber.config.ts`
with this app's rules, and timings and layer order in its theme.

```bash
npm run build                      # at the repo root: the example runs this build
cd examples/ledger && npx vite --config vite.config.js
```

It runs at http://127.0.0.1:4340/. Writing a fix changes the files here: "Reset demo" in the bottom-left corner puts them back, or
`git checkout -- examples/ledger` when you are done trying.
