# Plumb

Plumb is a CLI for Tailwind v4, CSS and React projects. Its planned checks compare the CSS declarations produced by UI code with a team's tokens, component contracts and written styling rules. The [design](docs/DESIGN.md) describes those checks and their build layers.

Status: **layer 1: class lowering and existence**. The CLI collects static class sites and literal maps, lowers candidates through the project’s Tailwind v4, and reports dead classes and dynamic fragments. Class selectors in project CSS and configured markers count as existing. Other design checks remain planned. See [Layer 1](docs/layers/1-class-lowering.md) and the [benchmark](BENCHMARK.md). Node 22.18 or newer is required.

From this checkout, install dependencies and run:

```sh
npm install
npm run build
node dist/cli.js --root ./fixtures/tailwind-min
node dist/cli.js check --json --root ./fixtures/plain-css
node dist/cli.js explain src/Button.tsx --root ./fixtures/tailwind-min --json
npm test
```

The package is named `@unlocalhosted/plumb` and exposes the `plumb` binary when installed. Config is optional. Place `plumb.config.ts`, `.mts`, `.mjs` or `.js` in the project root, or pass `--config <path>`. Relative config and CSS paths resolve from `--root`; the default root is the current directory.

```ts
import { defineConfig } from '@unlocalhosted/plumb'

export default defineConfig({
  css: 'src/styles.css',
  source: ['src/**/*.{tsx,jsx,ts,js,css}'],
  markers: ['js-*'],
  classHelpers: ['joinStyles'],
})
```

Use `--verbose` to include internal lowering/CSS notes in text output; JSON retains notes by default. Use `plumb --help` for flags. JSON reports follow [report.schema.json](schema/report.schema.json). Exit codes are 0 for success, 1 for error findings (including the first run), and 2 for usage or config errors.
