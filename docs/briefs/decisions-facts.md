# Brief: facts for the docs page "Decisions" (research + one recording, no UI)

Audience: the docs page site/src/docs/pages/decisions.mdx, which explains where a project's scale comes from. Claude writes
the page and its figure; you supply the truth. Do not edit anything under site/src except the recording file named below.

## 1. Facts sheet → docs/briefs/decisions-facts.result.md
Answer each from the code (cite file:line for every claim; say "not supported" when it isn't). Keep it terse.
1. What a "decision" is in Plumb's model, per family (spacing, colour, radius, type, motion, elevation, z).
2. Every source of decisions and their precedence: the Tailwind v4 theme (@theme in CSS), plumb.config.mjs `decisions.<family>`
   (`from`, `exported`, anything else), defaults when there is no config. What happens to Tailwind's built-in defaults when a
   theme defines its own scale.
3. Reasons: how a "why" is read (the `/* why: … */` comment form? beside which declarations? config `why`?), where reasons show
   (CLI finding text, overlay ladder), and what happens to a token with no reason.
4. `plumb accept-decisions --why`: what it records, where (ledger?), and when it's needed.
5. How decisions changes are treated by the ledger / CI ("ledger/config growth" in check output: what it means).
6. Any command that prints the resolved decisions (e.g. a `decisions` subcommand, `--json`, a server endpoint `decisions`
   used by the overlay at overlay/src/widget.js). Show its exact invocation.

## 2. Recording → site/src/docs/recordings/decisions.json
Run the real resolver on this repo's site (root: site/) and write its resolved decisions as JSON: per family, each token's
name, the class key(s) it compiles from, the resolved value (px where it applies), and its reason (or null). Use the real
code path (CLI, or import the built dist/ module from a small script under scripts/docs/). Commit nothing. If the script is
needed to regenerate it, put it at scripts/docs/record-decisions.mjs and say how to run it.

Verify by spot-checking three tokens against site/src/styles.css and site/plumb.config.mjs, and list them in the result.
