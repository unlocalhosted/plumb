# Layer 0

Built the harness only: ESM TypeScript compiled to `dist/`, the `plumb` / `plumb check` CLI, config loading and validation, project discovery, source counts, JSON and text reports, the draft 2020-12 report schema, four fixture projects, CLI e2e tests and README. The package exports typed `defineConfig` and an async `check({ root?, config? })` API. Reports always contain `findings: []` and `coverage: {}`. No lowering or judging runs.

No packages were installed and no commits were made. `tailwindcss: ^4.1` was added to root `devDependencies` as requested. **Run `npm install` to install it and refresh `package-lock.json`**, then `npm test`. The existing lockfile was left untouched because the new package has not been resolved or installed. Fixtures have no local Tailwind dependency, so Node resolves the repository's installation through parent directories.

## Verification

Ran `npm run build`, then `node --test e2e/*.test.mjs` against the compiled CLI:

```text
tests 40
pass 39
fail 0
skipped 1
```

The skipped test says: `tailwindcss is not installed yet; install the declared devDependency to enable the version assertion`. The main Tailwind fixture test still checks its report schema, discovered entry, file counts, zero findings and exit 0. A separate temporary-project e2e test provides package metadata with a known version and verifies that discovery resolves it from the entry directory. This tests resolution without installing or running Tailwind.

Other CLI coverage includes plain CSS, ambiguous entries, unknown config keys, all four config extensions, native TypeScript syntax stripping, `defineConfig`, explicit config paths, nested shape errors, custom source globs, duplicate glob matches, ignored directories, comments, single-quoted subpath imports, default cwd, relative roots, help, version and one-line usage errors. Text and JSON output were also run directly. `git diff --check` passed. Verification ran on Node 25.9.0; Node 22.18 is the declared minimum but was not available for a separate minimum-version run.

## Choices where the design leaves details open

- Report root, config and entry paths are absolute. Relative `--root` resolves from cwd; relative `--config`, `css` and source globs resolve from the project root, including when the config itself lives elsewhere.
- Config discovery uses `.ts`, `.mts`, `.mjs`, `.js` precedence. An explicit `--config` overrides discovery. A config must default-export a plain object. Unknown top-level and specified nested keys are rejected with allowed keys and a fix. No config means `config.path: null` and `config.inferred: true`; even an empty explicit config makes `inferred: false`.
- All discovered Tailwind entries require disambiguation, rather than choosing a nearest file. Setting `css` resolves the ambiguity even if a config already exists. Explicit `css` must name a readable `.css` file; its import contents are not enforced, allowing a plain CSS entry to be named too.
- CSS import discovery strips block comments and recognizes quoted `tailwindcss` and `tailwindcss/...` imports, including quoted `url(...)`. It does not parse CSS, follow imports or load the compiler in this layer. Hidden CSS directories are included; the five excluded directory names are skipped at every depth. Symlink directories are not traversed.
- A missing Tailwind installation yields `version: null` and text `tailwind not installed`, without failing the harness. An entry-less plain CSS project has both entry and version null, regardless of packages installed above it. No Tailwind major-version rejection is implemented before compiler loading exists.
- Source defaults are exactly the requested `src` and `app` patterns. `source: []` scans zero source files. TS and JS count as `other`; CSS entries outside the source globs are discovered but do not inflate source counts. Exclusions apply to custom globs too.
- Config family names use `color` and `z` as in the design's config example. Decision sources accept string selectors, selector arrays or preset functions returning decision records. Preset functions are validated as callable but never executed in Layer 0. `origins`, `callers`, `identity`, `exported`, and component `own` / `allow` shapes are validated without applying rules.
- Custom habits validate the illustrated `id`, `when`, `message` envelope. Predicate data must be declarative, with no callbacks. The design does not specify the full nested predicate grammar, so closing that vocabulary and checking built-in habit names are deferred to Layer 5. Future inference fields and custom property-to-family mappings also need an explicit config shape before implementation.
- Finding types and schema carry the requested fields now. Decisions follow section 2.2; declarations follow section 3.1, with report sites flattened to file, line, column and text. Positions are one-based. Conditions use `{ kind, text }`; severity uses `info`, `warn`, `error`. Coverage entries reserve `fromDecisions`, `total`, `findings`, `debt`, `exceptions`. These details are proposals for later-layer review; none are populated yet.
- `timing.totalMs` covers root validation, config loading and discovery; `phases.discover` covers entry discovery, file counts and version resolution. CLI formatting is excluded.
- The report e2e test checks the schema's required fields, types, enums, references, arrays, bounds and additional-property rules through a small test-only helper. It is not a general JSON Schema validator and adds no dependency.
- `skipLibCheck` is enabled because the installed tinyglobby/fdir declarations refer to absent `@types/picomatch`. Application source remains strict, with unchecked indexed access and exact optional properties enabled. No extra dependency was needed.

Layer 0 has no design findings to reconcile against a production benchmark. Later layers remain unimplemented, and the design document was left unchanged.
