# Reference slim result

Run: `node scripts/docs/gen-reference.mjs`. Uses existing `dist/cli.js`; no build or commit.

Full cited evidence: `docs/reference-data/ref-{cli,config,rules,report}.json`. Old full copies removed from `site/src/docs/recordings/`.

Slim display files: `site/src/docs/recordings/reference/`.

- `cli.json`: 21592 bytes (21.59 KB); under 60KB.
- `config.json`: 21786 bytes (21.79 KB); under 60KB.
- `rules.json`: 24977 bytes (24.98 KB); under 60KB.
- `report.json`: 42266 bytes (42.27 KB); under 60KB.

- Exact requested shapes: 20 commands, 175 config paths, 66 rules, 428 report fields.
- CLI retains one shared real --help capture; flags retain only name, type, default and description.
- Config retains every sorted path, including containers, array items and map values. Types use short display strings, array suffixes and literal unions.
- Rules retain family/severity arrays, first title/because/fix templates with placeholders intact, and boolean acceptance support.
- Report example is the single trimmed finding object from the full evidence, without the surrounding report.
- Absent and "not supported" display values become null; false, zero and empty values remain intact.
- All eight JSON files pass recordingJSON absolute-path guard. Display size limit is enforced before files are written.
- Site changes are confined to reference recordings.

## Verification

- `node --check scripts/docs/gen-reference.mjs` passed.
- Generator ran twice; all eight JSON outputs and the generated result were byte-identical.
- Output integration checks passed: exact keys, full-data projections, complete sorted paths, display types, null handling, first message templates, boolean acceptance, single finding example, size limits, absolute-path guard and removal of old copies.
- No unit tests, site build or commit. Existing unrelated changes preserved.
