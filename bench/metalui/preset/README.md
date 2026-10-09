# MetalUI preset snapshot

Runtime module: `index.mjs`. Tokens and policies come from the existing Plumb benchmark configs at MetalUI commit `e0a0b31349a371e48ad38f0cc8099be5fc1b2be5`. All 1,095 token records are published. The preset includes five contract refinements, two fingerprints, nine habits, ten markers, and package-relative source evidence.

To move later: copy this directory to `packages/metalui/plumb`, include `plumb` in package files, and add `"./plumb": "./plumb/index.mjs"` to exports. No build or runtime dependency on Plumb's internal modules is required. The public `@unlocalhosted/plumb` package must be available where the preset runs.

Regenerate in Plumb with `npm run build && node bench/metalui/build-preset.mjs`. This is a versioned snapshot; regenerate when MetalUI tokens change. See `docs/roadmap/5-presets.md` for merge rules and verification.
