# Roadmap 1: adoption

Built the three-command path and doctor. No package publication, package installation or worktree commits. MetalUI was read only.

## Behavior

- A successful check with neither config nor ledger exits 0, retains findings, and prints the next step: run plumb init. A configured or ledger-backed check retains the existing failure contract. Malformed inputs still exit 2. JSON and agent formats remain machine-readable.
- Init proposes a config, validates and analyzes it before replacing files, enables hover-gate, focus-outline, viewport-dynamic and overscroll-contain, and lists all other built-ins commented out with measured break counts. The config includes component discovery and marks every inferred token source. Current findings become debt and current tokens are accepted with inferred: true. No separate baseline command is needed.
- Inferred CSS sources use additive selectors such as css:src/styles.css#--spacing-* to avoid treating unrelated variables as tokens in every scale. Existing selectors retain their behavior. Compact namespace selectors keep warm checks fast and let new tokens require acceptance. Repeated static scalar/color values at three or more locations can become inferred proposals when a scale has no tokens. They are stored in plain config functions with origin: inferred, their original locations, and no invented reason. The source/theme is not edited.
- Init refuses an existing supported config. --force prints a before/after diff first and replaces that same file. Existing ledger allowances and exceptions survive; --force does not silently authorize new debt in an adopted ledger. A failed ledger write rolls the config back. Legacy pending baselines remain readable.
- Install renders the exact packaged skills/plumb/SKILL.md into every detected agent format, with repeatable --agent names adding forced targets. --list prints detection, selections and planned files without writes or analysis/cache creation. Detection checks project then Git root: Claude (.claude/ or CLAUDE.md), Cursor (.cursor/), Codex (AGENTS.md or .codex/), Copilot (.github/copilot-instructions.md), Gemini (GEMINI.md or .gemini/), Windsurf (.windsurf/). Generic is explicit or the no-agent fallback. Claude gets a skill copy with original frontmatter; Cursor and Windsurf get rule frontmatter plus the untouched body. Codex/generic, Copilot and Gemini get marked body blocks in AGENTS.md, .github/copilot-instructions.md and GEMINI.md. Only bytes between markers are replaced; malformed/duplicate markers fail before writes. Dedicated Plumb files change only when content differs. Existing CLAUDE.md and PLUMB.md stay untouched; agent-docs generates the optional PLUMB.md reference. No detected agent writes only AGENTS.md. Existing hooks and workflows survive, and every write is printed. Repository hooks retain the nested project --root. install --hooks retains hooks-only behavior and supports --list.
- install --ci writes .github/workflows/plumb.yml at the Git root, sets the project working directory and explicit PR base SHA, fetches history and reruns on review events. It uses this repository's action.yml through a Plumb action revision, with the last matching CODEOWNERS rule for the actual ledger path. Individual GitHub logins become ledger-approvers. Team-only ownership prints the required individual-login configuration. An empty list leaves growth blocked by the existing Action. Existing workflows are kept. A source checkout pins its Plumb HEAD; installed packages use gitHead when available, otherwise main with instructions to pin a reviewed commit. A consumer's enclosing HEAD is never used as a Plumb pin.
- Doctor prints six independent lines: Node floor (22.18), config validity, Tailwind v4 compatibility, CSS entry, ledger syntax and acceptance/staleness/reasons, and cache path/size/writability. Each line has a fix or says no change is needed. Unhealthy setup exits 1.

## Agent format notes

Checked against current primary docs on 2026-10-10:

- [Cursor Rules](https://cursor.com/docs/rules) documents .cursor/rules/*.mdc and the description, globs and alwaysApply fields, with comma-separated patterns. Generated rule sets all three as requested, scopes **/*.tsx, **/*.jsx, **/*.ts, **/*.js and **/*.css, and sets alwaysApply false. Actual rule attachment and the combined description/globs behavior have not been exercised in Cursor: **unverified editor behavior**.
- [Windsurf/Cascade Rules](https://docs.windsurf.com/windsurf/cascade/memories) redirects to Devin Desktop's Cascade docs. Those document Markdown workspace rules with a trigger frontmatter field and always_on activation. Generated .windsurf/rules/plumb.md uses trigger: always_on. The docs now describe .windsurf/rules as a legacy fallback to .devin/rules; the requested Windsurf path is retained. Loading in particular Windsurf versions is **unverified editor behavior**.
- Skill body wording is unchanged. Claude copies original skill frontmatter; formats without skill metadata strip only that frontmatter. No formatter or finding text changes.

## Integration boundaries

The implementation lives in src/adoption/. Shared changes are CLI wiring, an optional hook target/root, an additive CSS selector fragment, and delegation of the old init ledger branch. Config, index, report, schema and the agent formatter are untouched. No rule message generation was changed. The protected formatText, formatFinding, brief and formatAgent functions remain unchanged. No daemon, MCP, preset autoloading, noise pass or other roadmap item was built.

## Fixture transcripts

The earlier transcript below predates the agent-neutral install adapters. Current install writes the full packaged skill to native targets and leaves PLUMB.md/CLAUDE.md untouched. The real compiled CLI ran over fixtures/adoption, copied into this item's cache. Existing agent instructions, Claude permissions, a Cursor formatting hook and ledger-specific CODEOWNERS were supplied. Paths below use <fixture>; the captured timing is retained. The three-command node:test slice additionally asserts config policy, accepted inferred tokens, baseline coverage, hook preservation, workflow inputs, a green check and byte-preserving reinstallation.

```text
$ plumb
plumb 0.1.0  <fixture>  plain CSS
files 2 tsx, 0 jsx, 1 css, 0 other  41.4ms

provenance/spacing  10px is not a spacing decision  2 sites
    use  8px   var(--spacing-related)  Related items use eight pixels
         16px  var(--spacing-group)
    src/styles.css:7:8    gap: 10px
    src/styles.css:12:13  margin-left: 10px

provenance/motion  200ms is not a motion decision  1 site
    fix  NEEDS-DECISION: no comparable motion decisions; choose or request a named decision.
    src/styles.css:13:11  transition: all 200ms ease-in

dead/spacing  2 unused spacing decisions; no source declaration references them  2 sites
    use  16px  --spacing-group
         8px   --spacing-related  Related items use eight pixels
    src/styles.css:4:1  --spacing-group: 16px
    src/styles.css:3:1  --spacing-related: 8px

existence   6 class tokens, 0 dead classes
spacing     0 of 2 from decisions (0%)   2 declarations off them
color       2 of 2 from decisions (100%) 0 declarations off them
motion      0 of 1 from decisions (0%)   1 declaration off them
inline      0 of 0 style attributes have literal values
3 findings: provenance/spacing 1, provenance/motion 1, dead/spacing 1
dead/color  0 unused of 1 project decisions (1 used, 0 exported)
dead/spacing  2 unused of 2 project decisions (0 used, 0 exported)

Next steps
Run plumb init to write inferred token sources and record current findings as debt.
exit 0
```

```text
$ plumb init
Wrote plumb.config.ts with inferred token sources.
Components: 2 found from directory:src/components/ui.
Baseline: 9 debt entries (9 locations) in .plumb/ledger.jsonl.
Accepted 3 tokens as inferred.
Next steps: run plumb install --ci.
exit 0
```

```text
$ plumb install --ci
Agents: Claude Code, Cursor, Codex.
--- ./.claude/settings.json
+++ ./.claude/settings.json
@@ settings before / after @@
-{"permissions":{"allow":["Read"]}}
+{
+  "permissions": {
+    "allow": [
+      "Read"
+    ]
+  },
+  "hooks": {
+    "PostToolUse": [
+      {
+        "matcher": "Edit|Write|MultiEdit",
+        "hooks": [
+          {
+            "type": "command",
+            "command": "plumb check --changed --agent --strict-ledger"
+          }
+        ]
+      }
+    ]
+  }
+}

--- ./.cursor/hooks.json
+++ ./.cursor/hooks.json
@@ settings before / after @@
-{"version":1,"hooks":{"afterFileEdit":[{"command":"format"}]}}
+{
+  "version": 1,
+  "hooks": {
+    "afterFileEdit": [
+      {
+        "command": "format"
+      },
+      {
+        "command": "plumb check --changed --agent --strict-ledger"
+      }
+    ]
+  }
+}
Wrote PLUMB.md.
Added Plumb instructions to AGENTS.md.
Wrote CLAUDE.md.
Wrote .github/workflows/plumb.yml.
CI approvers: @ledger-owner from .github/CODEOWNERS.
exit 0
```

Full fixture captures: [fixture-transcripts.json](../../bench/metalui/.cache/1-adoption/fixture-transcripts.json).

## MetalUI acceptance

Pinned MetalUI HEAD: e0a0b31349a371e48ad38f0cc8099be5fc1b2be5. A full git archive was extracted into bench/metalui/.cache/1-adoption/input. Git was initialized only in the copy so CI lands there. Dependency directories were linked for reads; workspace package links point to archived sources. No live working-tree source edits were copied. The project was apps/docs, with Node 25.9.0 and Tailwind 4.3.3.

The package binary was linked into the copy and invoked directly, matching the one-shot bin path without npm registry access or installation. The first run below is warm, after one priming run. It exited 0 in 745.9 ms, below 5 s. Init took 1658.4 ms; install --ci took 851.1 ms. The following check exited 0 in 911.4 ms: 0 new, 4374 debt locations, 0 stale, 0 ledger/config growth. The workflow exists at input/.github/workflows/plumb.yml. These are local measurements, not hosted Action execution or an npm release.

```text
$ plumb
plumb 0.1.0  <archive>/apps/docs  tailwind 4.3.3  theme src/styles.css
files 234 tsx, 0 jsx, 33 css, 24 other  651.9ms

[Finding details omitted here; the full transcript is linked below.]

existence   7,258 class tokens, 87 dead classes, 3 dead variables
spacing     1,893 of 2,112 from decisions (90%)  219 declarations off them
color         863 of 1,080 from decisions (80%)  217 declarations off them
radius        329 of   418 from decisions (79%)  89 declarations off them
type            9 of   538 from decisions (2%)   529 declarations off them
motion        154 of   326 from decisions (47%)  172 declarations off them
elevation      23 of   216 from decisions (11%)  193 declarations off them
z              26 of    87 from decisions (30%)  61 declarations off them
inline      238 of 746 style attributes have literal values
454 findings: provenance/elevation 98, provenance/color 77, provenance/type 76, existence/dead-class 50, provenance/motion 45, provenance/spacing 22, provenance/color/by-value 20, provenance/arbitrary 18, provenance/z 16, provenance/opaque-inline 8, provenance/radius 4, existence/dynamic-class 3, provenance/type/framework 3, existence/dead-var 2, provenance/color/framework 2, provenance/motion/framework 2, provenance/radius/framework 1, dead/color 1, dead/elevation 1, dead/motion 1, dead/radius 1, dead/size 1, dead/spacing 1, dead/type 1
dead/type  42 unused of 42 project decisions (0 used, 0 exported)
dead/radius  79 unused of 91 project decisions (12 used, 0 exported)
dead/spacing  843 unused of 866 project decisions (23 used, 0 exported)
dead/color  253 unused of 269 project decisions (16 used, 0 exported)
dead/elevation  5 unused of 5 project decisions (0 used, 0 exported)
dead/size  2 unused of 2 project decisions (0 used, 0 exported)
dead/motion  7 unused of 8 project decisions (1 used, 0 exported)

Next steps
Run plumb init to write inferred token sources and record current findings as debt.
exit 0; wall 745.9 ms
```

```text
$ plumb init
Wrote plumb.config.ts with inferred token sources.
Components: 0 found.
Baseline: 4174 debt entries (4374 locations) in .plumb/ledger.jsonl.
Accepted 1290 tokens as inferred.
Next steps: run plumb install --ci.
exit 0; wall 1658.4 ms
```

```text
$ plumb install --ci
Agents: Codex.
Wrote PLUMB.md.
Wrote AGENTS.md.
Wrote ../../.github/workflows/plumb.yml.
CI approvers: none from .github/CODEOWNERS.
exit 0; wall 851.1 ms
```

Full captures: [first run](../../bench/metalui/.cache/1-adoption/1.txt), [init](../../bench/metalui/.cache/1-adoption/2.txt), [install](../../bench/metalui/.cache/1-adoption/3.txt), [structured timing and check evidence](../../bench/metalui/.cache/1-adoption/transcripts.json). Cache artifacts are intentionally gitignored.

Doctor after adoption:

```text
ok  Node: 25.9.0. No change needed.
ok  Config: plumb.config.ts is valid. No change needed.
ok  Tailwind: 4.3.3. No change needed.
ok  CSS entry: src/styles.css. No change needed.
ok  Ledger: 5464 entries, 0 issues. No change needed.
ok  Cache: <item-cache>, 279479202 bytes. No change needed.
```

Reproduce from this checkout, using already installed dependencies:

```sh
npm run build
PLUMB_CACHE_DIR=$PWD/bench/metalui/.cache/1-adoption node bench/metalui/adoption.mjs
```

## Verification

- npm test: 185 integration/e2e tests pass, zero failures or skips. No unit tests were written.
- npm run typecheck: green.
- Adoption E2Es additionally cover all six agent formats, exact skill body preservation, no-write preview, byte-identical reinstall, marked-block replacement with surrounding CRLF/content intact, stale dedicated-file updates, every forced agent, repeatable forced targets alongside detection, no-agent AGENTS.md-only fallback, malformed inputs without partial writes, and packaged instruction resolution independent of cwd. The original adoption tests cover the path, first-run versus configured/ledger enforcement, refusal and force, repeated-value proposals, source filtering and new-token acceptance, preservation, nested agent/CI roots, doctor repairs, and packaged CLI Action revision selection. Existing hooks/Action surfaces remain covered.
- git diff --check: clean. Protected formatter and rule-message files have no diff.
