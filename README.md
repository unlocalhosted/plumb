# Plumb

Plumb is a CLI for Tailwind v4, CSS and React projects. Its planned checks compare the CSS declarations produced by UI code with a team's tokens, component contracts and written styling rules. The [design](docs/DESIGN.md) describes those checks and their build layers.

Status: **layer 2: stylesheet and inline lowering**. The CLI lowers classes through the project's Tailwind v4, follows reachable CSS imports, and reads static JSX stylesheets and inline style objects. One declaration format retains origins, source locations, owners and conditions. Dead classes and dynamic class fragments are judged; provenance, habits and ownership remain planned. CSS selectors count as existing only in reachable stylesheets, source-glob CSS or static JSX stylesheets. See [Layer 2](docs/layers/2-stylesheets-inline.md) and the [benchmark](BENCHMARK.md). Node 22.18 or newer is required.

From this checkout, install dependencies and run:

```sh
npm install
npm run build
node dist/cli.js --root ./fixtures/tailwind-min
node dist/cli.js check --json --root ./fixtures/plain-css
node dist/cli.js explain src/Button.tsx --root ./fixtures/tailwind-min --json
node dist/cli.js explain src/page.css --root ./fixtures/stylesheets-inline --json
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
