# Plumb

Plumb is a CLI for Tailwind v4, CSS and React projects. Its planned checks compare the CSS declarations produced by UI code with a team's tokens, component contracts and written styling rules. The [design](docs/DESIGN.md) describes those checks and their build layers.

Status: **layer 0: harness only**. The CLI loads and validates config, discovers a Tailwind entry when present, counts source files and prints a text or JSON report. It currently reports zero findings and performs no design checks. Node 22.18 or newer is required.

From this checkout, install dependencies and run:

```sh
npm install
npm run build
node dist/cli.js --root ./fixtures/tailwind-min
node dist/cli.js check --json --root ./fixtures/plain-css
npm test
```

The package is named `@unlocalhosted/plumb` and exposes the `plumb` binary when installed. Config is optional. Place `plumb.config.ts`, `.mts`, `.mjs` or `.js` in the project root, or pass `--config <path>`. Relative config and CSS paths resolve from `--root`; the default root is the current directory.

```ts
import { defineConfig } from '@unlocalhosted/plumb'

export default defineConfig({
  css: 'src/styles.css',
  source: ['src/**/*.{tsx,jsx,ts,js,css}'],
})
```

Use `plumb --help` for flags. JSON reports follow [report.schema.json](schema/report.schema.json). Exit codes are 0 for success, 1 for failing findings in future layers, and 2 for usage or config errors.
