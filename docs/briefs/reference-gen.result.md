# Reference generation result

Run: `node scripts/docs/gen-reference.mjs`. Uses existing `dist/cli.js`; no rebuild or commit. Source: scripts/docs/gen-reference.mjs:75.

- CLI: 20 commands, 36 distinct flags; 20 real command help captures. Sources: src/cli.ts:101; src/cli.ts:68.
- Config: 175 dotted paths, including containers, array items and map values. Sources: scripts/docs/gen-reference.mjs:86; schema/config.schema.json:1.
- Rules: 66 entries (63 finite IDs, 3 open patterns), each with emission evidence. Source: site/src/docs/recordings/ref-rules.json:1.
- Report: 428 dotted paths; one real finding retained from 3; CLI exit 1. Source: site/src/docs/recordings/ref-report.json:1.

## Source gaps and disagreements

- Summaries describe source dispatch with individual citations. Non-help examples in src/cli.ts: not supported; examples here are actual per-command help invocations. Sources: src/cli.ts:29; site/src/docs/recordings/ref-cli.json:1.
- Command-specific help: not supported. All commands use the shared help branch before command validation. Built help matches current source text. Captures retain exact newlines. Sources: src/cli.ts:89; site/src/docs/recordings/ref-cli.json:1.
- Most flags lack prose descriptions or explicit parser defaults; absent values are "not supported". Root defaults to current directory. Install changes --agent from boolean to repeatable string. Flag command lists reflect the restriction map; extra constraints are cited separately as validation expressions (serve rejects --json/--verbose, install/doctor reject --json). Sources: src/cli.ts:57; src/cli.ts:69; src/cli.ts:81; src/cli.ts:107; src/cli.ts:123; src/cli.ts:200.
- Runtime config keys absent from schema: presets. Schema forbids unknown properties: schema-based support for those keys is not supported. Callback decision sources are intentionally outside the serializable schema. Sources: src/config.ts:61; src/config.ts:16; schema/config.schema.json:3; schema/config.schema.json:5.
- Config descriptions/defaults/examples and report descriptions: not supported where absent in schemas. Enum/const types derive from schema literals. Required means required by the immediate parent, conditional on that object/union branch existing. [] marks array items; .* marks map keys. Rows retain ref citations and union constraints. Sources: schema/config.schema.json:1; schema/report.schema.json:6; scripts/docs/gen-reference.mjs:86.
- Only 7 families receive provenance judgement; size/opacity remain token families and can emit dead-token findings. Sources: src/rules/families.ts:7; src/report.ts:9; src/rules/dead.ts:65.
- Ownership, imitation and custom-habit IDs depend on project inputs; enumerating all concrete IDs is not supported. Open patterns preserve these emitters. Ownership families come from ownershipFamily; parity findings use token families. Sources: src/ownership/judge.ts:18; src/ownership/judge.ts:123; src/imitation/index.ts:101; src/habits/index.ts:97; src/parity.ts:91.
- docs/MESSAGES.md omits parity, ledger/stale, decisions/vanished, config/unreadable and config/tailwind-entry contracts. Those entries use emission/formatter templates; documented entries also retain their message contracts. Sources: docs/MESSAGES.md:1; src/parity.ts:100; src/ledger/check.ts:12; src/diagnostics.ts:7; src/collect/entries.ts:128.
- By-value entries retain grouped and per-value title templates. Docs and source both support expanding for --verbose/--agent. Sources: docs/MESSAGES.md:88; src/cli.ts:132; src/rules/provenance.ts:408.
- Habit registry fixes differ from final messages (e.g. focus-outline). Entries use habitMessage actions, and registry fixes when action is fix. Custom habits use their configured message for both reason and fix. Sources: src/habits/index.ts:14; src/habits/index.ts:184; src/habits/index.ts:203.
- Undefined-variable, heuristic-ownership and ledger-growth severities are conditional: defaultSeverity lists possible values; severitySources retains conditions. Ledger classification can downgrade findings to info. Sources: src/rules/existence.ts:130; src/ownership/judge.ts:123; src/ledger/check.ts:98; src/ledger/check.ts:113.
- Config/parity exception acceptance: not supported. finishMessages prints accept commands for ledger/stale, ledger/grew and decisions/vanished, but accept runs without ledger diagnostics and cannot match them. Entries mark acceptance "not supported", preserve printedAccept, and retain corrective fix commands. Sources: src/messages.ts:50; src/parity.ts:90; src/cli.ts:248; src/index.ts:241; src/ledger/commands.ts:96.
- Report example preserves real CLI values except repository-relative paths, reduction to one finding, and omission of volatile timing/cache metrics. Coverage still describes the full run. This trimmed example is not a complete schema-valid report because required timing/moduleGraph metrics are omitted for deterministic output. Sources: schema/report.schema.json:6; site/src/docs/recordings/ref-report.json:1; scripts/docs/gen-reference.mjs:372.

## Verification

- All command help and fixture JSON runs succeeded; fixture exit 1. Sources: site/src/docs/recordings/ref-cli.json:1; site/src/docs/recordings/ref-report.json:1.
- Generator rejects CLI failures, missing findings, unknown dynamic rule patterns and unresolved schema refs. Sources: scripts/docs/gen-reference.mjs:75; scripts/docs/gen-reference.mjs:86; scripts/docs/gen-reference.mjs:1.
- Determinism: run generator twice and compare four recordings plus this result byte-for-byte. No build or full suite needed. Sources: scripts/docs/gen-reference.mjs:75; scripts/docs/gen-reference.mjs:372.
