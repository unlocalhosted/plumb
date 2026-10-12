# Improving Plumb: from a correct CLI to a daily tool
> **Owner decision, 2026-10-10:** no MCP server. Agents use the CLI directly (`plumb try`, `plumb check --changed --agent`, `plumb why`), taught by the shipped skill file `skills/plumb/SKILL.md`, which `plumb install` copies into the project. Item 4 below is dropped; the overlay's "Copy for agent" hands over text the agent acts on with the same CLI.


Written 2026-10-10 against Plumb at the "Final state" of BENCHMARK.md (layers 0 to 10, 137 e2e tests, warm run 997 ms on MetalUI docs) and against react-grab and react.doctor as they are today. Sources: Plumb's README, docs/DESIGN.md, docs/layers/*.md, BENCHMARK.md (Performance pass, Final state), docs/research/react-doctor-landscape.md; react-grab's README, react-grab.com and its "how it works" page; www.react.doctor. Anything I could not confirm from a primary source is marked UNVERIFIED.

The short answer to the owner's question: Plumb is a judge with no courtroom. The engine is right (it judges compiled declarations, it has a ledger, it is fast) but the only place a person meets it is a terminal they chose to open. react-grab and react.doctor are daily tools because they sit at the moment a person already has, cost one gesture, and hand the result to the agent that will do the work. Plumb needs the same three things: a moment, a gesture, a handoff. The rest of this memo says which moments, which gestures, and in what order to build them.

## 1. Why react-grab and react.doctor are daily tools

### react-grab

What it does, verified from the README and site: in a dev build, hover any element and press Cmd+C. The clipboard receives the element's HTML, the owning component's name, and the source location, in the form `[<a class="…" href="#">Forgot your password?</a> in LoginForm (at components/login-form.tsx:46:19)]`. Drag selects several elements. Install is `npx grab@latest init`, or a dev-only `<Script>` / dynamic import for Next, Vite and Webpack. It resolves the element to source by reading the React fiber through bippy (which registers as DevTools), walking the owner stack (`_debugStack` in React 19, `_debugSource` or a guarded re-invocation in 17/18), filtering frames that are not user source, and decoding source maps; for Next server components it posts frames to `/__nextjs_original-stack-frames`. 7.7k stars, MIT. The README also exposes `react-grab/primitives` (hit testing, element filters). I found no primary documentation of an in-page prompt box, an agent-launch mode or a plugin API; treat claims of those as UNVERIFIED.

Why people reach for it every day:

- The moment is one they already have. You are looking at the running app and something is wrong. That is where noticing happens; nobody notices drift in a terminal.
- The gesture costs nothing. Hover, one chord, done. There is no mode to enter, no panel to read, no question to answer. It is faster than describing the element in words.
- It hands over identity, not description. The agent gets `file:line:col` plus the component. That is the one fact an agent cannot get from a screenshot and the one fact that makes "fix the padding here" a two-second job instead of a search.
- It needs nothing from you. No config, no account, no CI. Dev only, so nothing ships.
- It is a bridge, not a product. It makes the tool you already use (Cursor, Claude Code) better, so it has no adoption cost of its own.

### react.doctor

Verified from the landscape research (pinned source) and the current site: `npx react-doctor@latest` scans with no config and prints a 0 to 100 score (computed remotely, formula unpublished) plus findings grouped by root cause with human titles; `--scope changed` reports only introduced findings; `react-doctor ci install` writes a GitHub Action that posts a sticky summary and inline comments, advisory by default; `react-doctor install` adds a skill for detected agents and optional post-edit hooks for Claude Code and Cursor; findings can be copied as a prompt or launched straight into an agent; ESLint and Oxlint plugins bring file rules into the editor; `why file:line` explains a diagnostic. 15k stars.

Why it sticks:

- First run is one command and ends with a number you can quote. The number is gameable and unexplained, but it gives a team a reason to run it again next week.
- The loop terminates. Findings are grouped by root cause, each has a fix recipe, and the agent is told to rerun the tool. A tool that produces work that gets done becomes a habit.
- Enforcement is graduated. Advisory PR comments first, blocking later, and only on introduced findings. Nobody is forced to pay old debt to adopt it.
- It installs itself into the places work already happens: agents, hooks, CI, editor. The user decides once; the tool shows up everywhere after that.

### The principles Plumb should take

1. Be present at the moment of noticing (the browser) and the moment of writing (the agent, the editor), not only at the moment of checking (CI).
2. One gesture, one result. Nothing to configure before the first useful answer.
3. Hand off identity and the exact edit, never a description. Plumb already has this in `--agent`; it needs to reach the surfaces above.
4. The loop must terminate: `0 new` or `NEEDS-DECISION`. Plumb has this.
5. Install once, appear everywhere. `plumb install` should do what `react-doctor install` does and more (hooks, agent docs, MCP, Action).
6. Quiet by default. react.doctor's noise is hidden behind grouping and a score; Plumb has no score, so it must be quiet in fact.

What not to take: the remote score, inline suppressions, the 870-rule sprawl, the source-available licence.

## 2. The people and their moments

Five people, each with one or two moments. For each: what they do, what they see, what it saves. Mock output is in the shape Plumb already prints (verified against `fixtures/spacing`), extended where a surface does not exist yet.

### 2.1 The design-system owner

Moment A: a PR touches the theme or a component. Today she reads a 400-line diff and tries to spot `--spacing-13`. With Plumb in the Action, the PR comment says:

```
plumb  +2 new  −5 fixed  312 debt (−5)   ledger +1 decision (needs review from @design)

decisions/unaccepted  --spacing-13: 13px  added in apps/docs/src/styles.css:41, no why
  accept with: plumb accept-decisions --why "…"   or remove it

spacing 87% → 88%   color 96%   elevation 15%   hover 12% → 31%
```

She reviews one line in `.plumb/ledger.jsonl`, not the diff. The Action blocks until a listed approver accepts. This exists today. What is missing is the second moment.

Moment B: the monthly question "where is the system drifting?" Today the answer is a CLI run and a long text report. She needs one page per family with the top fixes and the trend, generated from the JSON the Action already produces:

```
$ plumb report --since v1.4
family      coverage   Δ      new sites  top fix
color        82%      +1.2    4          --color-ink used raw at 11 sites → text-ink
spacing      74%      +0.4    9          gap: 10px at 12 sites → gap-mu-space-12 "between related parts"
elevation    15%       0      0          no semantic shadows; 92 literal stacks (debt)
type         61%      -2.1    31         font-size without a type-* role in 3 new pages
```

A static Markdown or HTML page committed by the Action is enough. No hosted dashboard (section 4).

Moment C (the ecosystem one): she publishes the design system. Today its 840 exported tokens show as dead in the library's own run, and consumers get nothing. With a preset export (section 5) consumers inherit her decisions, contracts and fingerprints the day they `npm i` her package. This is the moment that makes Plumb mandatory rather than nice, because it is the moment the design-system owner stops being the only person who runs it.

### 2.2 The product engineer

Moment A: about to write a style. Today nothing happens until CI. With the editor plugin (section 4) the squiggle appears as he types `gap-10`:

```
gap-10 compiles to gap: 10px, which is not a spacing decision.
Use gap-mu-space-12 (12px, "between related parts: a label and its control") or gap-mu-space-8.
                                                    [plumb/provenance/spacing]  Quick fix ▸
```

Moment B: he is looking at the page he just built and the card looks off. He holds Alt, hovers the card, clicks. The overlay (section 3) says the card's padding is 10px from `p-[10px]` at `Card.tsx:18`, that the nearest decision is 12px, and that `<Button className="font-semibold tracking-tight">` inside it overrides Button's type contract. He presses Cmd+C and pastes into Claude Code; the agent gets the file, the lines, the compiled values, the decisions and the exact edits. He never opens a terminal.

Moment C: his PR fails. The annotation sits on the changed line with the same text as the squiggle, plus one line he did not know: `This value is debt at 12 other sites; fixing it here does not change the ledger.` He fixes the one line. Exists today.

What it saves: the search for which token to use (the finding names it with the reason), the back-and-forth with the design-system owner, and the review round.

### 2.3 The designer

The designer does not run CLIs and should not have to. Two moments.

Moment A: "does the build match what we decided?" The overlay is the answer, because the browser is already her surface. She opens the staging build with the overlay enabled (dev or a preview build with the Plumb script and a report bundled), hovers the hero, and sees:

```
┌ Hero › <section>  pages/Home.tsx:22 ────────────────────────┐
│ padding-block  48px  p-12          not a decision  → 40 or 64 │
│ gap            24px  gap-mu-space-24   decision "siblings"   │
│ background     var(--color-canvas)     semantic              │
│ box-shadow     0 1px 2px #0002         literal, elevation 15%│
│ ledger: 1 debt, 1 new                            Copy for agent │
└──────────────────────────────────────────────────────────────┘
```

She does not need to know what `p-12` is. She sees "not a decision" and either files it or copies it for whoever fixes it.

Moment B: a token request. She wants a new spacing step. Today that is a Slack message. With the ledger, the request is a PR that adds the token and a ledger line with a why; the Action asks her (as a listed approver) to approve it. Her approval is the decision record. Exists today; it needs to be explained to designers as "your approval is the decision".

What it saves: the audit by eye and the meeting where someone asks whether 48 is a spacing step.

### 2.4 The reviewer

One moment: the PR. He sees the sticky comment (2.1), inline annotations on changed lines only, and the SARIF results in the Security tab if the repository uses code scanning. The one improvement he needs: the annotation must say which of the three cases he is in, because they need different responses.

```
new drift      the branch introduced this; ask for the fix
debt touched   this line had debt before; fixing is welcome, not required
exception      accepted with a reason: "x-ray contrasts a flat fill on purpose"  (vijay, 2026-10-09)
```

Today the annotation shows only new sites, which is right for blocking but hides the second and third cases that make a reviewer trust the tool. Add them as notices.

### 2.5 The AI agent

The agent is the main author of UI code now, and it is the user Plumb was designed for. Three moments, two of them exist.

Moment A, before writing: `plumb try` judges a snippet. Today it is a stdin command that reloads the whole project context (about a second warm). As an MCP tool backed by a warm daemon it is 50 ms and the agent calls it before every `Write`:

```
› plumb.try({ lang: "tsx", as: "src/pages/Fan.tsx", code: '<div className="gap-10 bg-red-500" />' })
2 new
1. provenance/spacing  gap-10 → gap: 2.5rem; not a decision. Use gap-s4 (16px, "breathing room for a group").
2. provenance/color/framework  bg-red-500 is Tailwind's palette, not a decision of this project.
   NEEDS-DECISION: no project colour is near oklch(63.7% 0.237 25.331).
```

Moment B, after writing: the post-edit hook runs `plumb check --changed --agent --strict-ledger` and the agent reads the exact edits. Exists today.

Moment C, when a person points at the screen: the overlay's "Copy for agent" hands the agent an element identity plus Plumb's verdict in one block, and (better) an MCP call `plumb.element(ref)` that returns the full JSON for that element. The agent then edits the right line without a search.

What it saves: invented tokens, a wrong guess at which spacing step, and a loop that does not terminate. The rules block Plumb already prints ("never add a token", "NEEDS-DECISION is fine") is the right contract.

A whole exchange, as it should read once the MCP server exists. The person has pointed at the element with the overlay; the agent does the rest.

```
User: the row on the Fan page is too tight. here: plumb://element/7f3a

Agent: › plumb.element("7f3a")
       gap: 10px via gap-10 (Fan.tsx:41:19), not a decision, ledger: debt.
       Nearest: --mu-space-12 (12px, "between related parts: a label and its control"),
                --mu-space-16 (16px, "between groups").
       The row holds a label and its control, so 12px is the documented step.

       › Edit Fan.tsx:41  gap-10 → gap-mu-space-12
       › plumb.check_changed()
       0 new. Ledger unchanged (the debt line for gap-10 at FanPage is now stale; run plumb ledger --ratchet when you commit).

       Changed one class. Nothing else on that element is off-system.
```

Three things to notice. The agent did not search for the file. It chose between two decisions by their whys, not by proximity, and said why. And it did not touch the ledger; it reported that a human command will clean it up.

## 3. The browser surface

### 3.1 What it is

A dev-only overlay, installed like react-grab (`@unlocalhosted/plumb/vite` plugin or a `<script>` for Next/Webpack), that on Alt+hover highlights an element and on click pins a panel. The panel shows, for that element:

1. every judged declaration the element carries (from classes, inline style and matched stylesheet rules), with its compiled value, where it came from (`gap-10` at `Fan.tsx:41:19`), and the verdict: decision (named, with its why), not a decision (nearest decisions named), framework default, wrong tier, opaque;
2. which design-system component owns it (if it is inside one) and which of the caller's properties override the contract, naming the real variant axes;
3. the ledger status per site: new, debt, exception with the reason;
4. the computed value for each judged property, so the cascade Plumb cannot compute statically is visible here ("computed gap 10px, declared by `.library-row` at library.css:120");
5. one button: Copy for agent. And, when the MCP server is running, an element reference the agent can fetch itself.

It is not a visual-regression tool. It shows the judgement at the place where the person noticed the problem. (Superseded in part, 2026-10-12: the overlay becomes a live editor, layer by layer. See [VISION.md](VISION.md).)

### 3.2 Mapping a DOM element back to Plumb's sites

Plumb's sites are already positioned at the attribute token level (`file`, `line`, `column`, `text`, `anchor`) and every declaration carries its `owner` element or component and its `origin`. The mapping problem is therefore: given a DOM element, find the set of Plumb sites that produced its declarations. Four independent routes, in order of reliability, each degrading gracefully.

Route 1, classes without any fiber. `element.classList` is the authored class string, unchanged in a Tailwind v4 dev build (Tailwind does not rename classes). Plumb's candidate cache maps every class token to its compiled declarations and to the sites that use it. So `gap-10` on the element resolves to its declaration and its candidate sites without knowing the component. Ambiguity (the same class at 30 sites) is resolved by route 2; without it the panel shows the declaration and says "used at 30 sites".

Route 2, the JSX site through the fiber. Use bippy, as react-grab does: `getFiberFromHostInstance(element)`, then the owner stack. In React 19 the stack comes from `_debugStack` and names the call site of the JSX element inside the owner component, which is the file:line:column of the opening tag. That is within a few columns of Plumb's className site on the same element. Index Plumb's sites by (file, line) and pick the ones on that element's attributes. For React 17 and 18, `_debugSource` exists when the dev Babel transform runs; otherwise the fiber gives the component name only and the panel falls back to route 1 plus the component name. Source maps: Vite serves them to the dev server; Next's server components need the `/__nextjs_original-stack-frames` endpoint, which react-grab already uses. Other frameworks: UNVERIFIED, fall back.

Route 3, stylesheet rules. Iterate `document.styleSheets`, test `element.matches(rule.selectorText)` for style rules (and `@media` by `matchMedia`), and map (stylesheet file, selector) to Plumb's lowered stylesheet declarations, which carry the resolved selector and the authored file. Which file a `<style>` belongs to: Vite tags injected styles with `data-vite-dev-id="/abs/path.css"`; for Webpack's style-loader the file identity has to come from a `sourceURL` comment or a source map, UNVERIFIED, so degrade to selector-only matching against Plumb's declaration set, which is unique in practice for project CSS. `@apply` output maps through Plumb's source maps to the authored `@apply` line, which Plumb already records.

Route 4, computed style. `getComputedStyle(element)` for the judged properties. Compare each value to the decision record directly (value identity for spacing and radius, reference identity cannot be read from computed values, so colour and motion show "computed 10px, declared by …" and the verdict comes from the declaring site). Inherited values are labelled inherited and not judged. This is the only place in Plumb where the cascade is observed instead of ignored, and it is a genuine addition: a decision at one site overridden by a literal in a later rule becomes visible.

Component ownership: the fiber's owner chain gives component names and their source files; match against Plumb's discovered components (which carry resolved source paths). The nearest design-system ancestor whose host element is this element, or whose `render` lends identity, is the owner; Plumb's ownership judgement for the caller's JSX site is already in the report. The panel reuses it.

### 3.3 What it needs from the build and the project

- A dev build with React dev mode (owner stacks exist only there) and a dev server that serves source maps. Production builds get route 1 and 4 only, with no file positions. That is acceptable: the overlay is a dev tool, like react-grab.
- A warm Plumb process. The overlay cannot bundle a 1 second analysis into the page. It needs `plumb serve`: a daemon that watches the project, keeps the analysis warm (the caches already exist), and answers over a local HTTP port: `GET /site?file&line`, `GET /classes?names=…`, `POST /element` with `{ file, line, col, classes, inlineStyle, matchedRules, computed }` returning the panel's JSON. This daemon is the same process the MCP server and the editor plugin need, so it is built once (section 7).
- A one-line install: `plumb install --overlay` adds the Vite plugin or the dev-only script and prints the port. The plugin injects the overlay only when `import.meta.env.DEV`.
- Nothing else. No data attributes in source, no build transform, no React patch. bippy pretends to be DevTools; if real DevTools are open both still work (react-grab has the same arrangement).

### 3.4 Limits

- React only, through the fiber route. Routes 1, 3 and 4 work on any framework that keeps authored class names and serves source CSS, so a Vue project gets declarations and verdicts but no component or site; that is still useful and honest.
- Dev builds only for source positions. Minified or hashed class names (CSS modules) are outside Plumb anyway.
- Runtime-computed styles stay opaque; the overlay shows the computed value and that the site is `dynamic-value`, which is more than the CLI can say.
- Shadow DOM and iframes: not in v1.
- Third-party components: the overlay reaches the host element; if the component comes from a package with a Plumb preset, ownership is judged; otherwise the element is plain.
- Latency: route 2 costs a source-map decode per new file (cache it, react-grab caches by WeakMap and 100 ms debounce); the daemon answers from memory.
- It does not prove anything looks right. It says whether each value is a decision. Same limit as the CLI, same honesty.

### 3.5 The element contract

The overlay and the daemon need one agreed shape. The overlay collects what only the browser knows; the daemon answers with what only Plumb knows. Everything in the response already exists in the JSON report schema (`site`, `declaration`, `decisions`, `ledger`, `component`), so this is a view over the report, not a new model.

Request, `POST /element`:

```json
{
  "source":   { "file": "apps/docs/src/pages/components/Fan.tsx", "line": 41, "column": 7 },
  "owners":   ["FanPage", "Section", "Row"],
  "tag":      "div",
  "classes":  ["library-row", "gap-10", "p-mu-space-12"],
  "inline":   { "--cols": "3" },
  "rules":    [{ "sheet": "apps/docs/src/pages/library.css", "selector": ".library-row", "media": null }],
  "computed": { "gap": "10px", "padding-inline": "12px", "background-color": "oklch(0.98 0 0)" }
}
```

Response:

```json
{
  "element": { "tag": "div", "site": { "file": "…/Fan.tsx", "line": 41, "column": 7, "anchor": "FanPage" } },
  "component": null,
  "declarations": [
    { "prop": "gap", "value": "10px", "origin": "class", "site": { "text": "gap-10", "line": 41, "column": 19 },
      "verdict": "off", "decisions": [ { "name": "--mu-space-12", "value": "12px", "why": "between related parts: a label and its control", "use": { "class": "gap-mu-space-12" } } ],
      "ledger": { "key": "provenance/spacing:div:gap:gap-10@apps/docs/src/pages/components/Fan.tsx#FanPage", "status": "debt" },
      "edit": { "replace": "gap-10", "with": "gap-mu-space-12" } },
    { "prop": "padding-inline", "value": "var(--mu-space-12)", "origin": "class", "site": { "text": "p-mu-space-12" },
      "verdict": "decision", "decision": { "name": "--mu-space-12", "why": "…" } },
    { "prop": "gap", "value": "16px", "origin": "stylesheet", "site": { "file": "…/library.css", "line": 120 },
      "verdict": "off", "note": "overridden; computed gap is 10px from gap-10" }
  ],
  "computed": [ { "prop": "gap", "value": "10px", "declaredBy": 0 } ],
  "copy": "[plumb] <div class=\"library-row gap-10 p-mu-space-12\"> in FanPage (apps/docs/src/pages/components/Fan.tsx:41:7)\n…"
}
```

Two details matter. `verdict` is one of `decision`, `off`, `framework`, `tier`, `by-value`, `opaque`, `inherited`, and the panel colours by it. `edit` is present only when `--agent` would also print an exact replacement; otherwise the panel shows the candidates and the copy block says NEEDS-DECISION, so the overlay can never be a way to guess.

When the element is inside a design-system component, `component` carries the Plumb identity (`{ name: "Button", source: "packages/metalui/src/components/button/button.tsx", axes: { cap, size, state } }`) and each caller declaration that overrides the contract gets `verdict: "override"` with the owned family named, which is the ownership finding the CLI already reports.

### 3.6 Is it the most important next surface?

Yes, with one condition. It is the surface that gives Plumb a daily moment for the two people who have none today (the product engineer looking at the page, the designer), it is the one that makes Plumb feel like react-grab, and it is the one that pulls the agent handoff into the place where problems are noticed. Nothing else on the list does that.

The condition is that it comes after the daemon and after publishing, because an overlay without a warm process is a demo, and an overlay for a package nobody can install is a video. The order in section 7 reflects that: publish, daemon, overlay. The MCP server falls out of the daemon almost for free and ships in the same week as the overlay, because "Copy for agent" and `plumb.element` are the same payload.

I considered the editor plugin as the alternative candidate. It serves the engineer at the moment of writing, which is earlier than noticing. But agents write most of the code now, and they already have a hook and `try`; the editor plugin mostly serves humans typing classes, which is the shrinking case. It is fourth, not second.

## 4. Other surfaces and integrations, ranked

1. **`plumb serve` daemon** (prerequisite, not a surface). Warm analysis, file watcher, local HTTP and stdio. Everything below reads it. Also gives `--watch` for free and makes `try` 50 ms.

2. **MCP server** (`plumb mcp`, registered by `plumb install`). Tools: `try` (snippet verdict), `check_changed` (the agent loop), `decisions` (ladders with whys, per family), `why` (file:line), `element` (overlay reference), `explain` (every declaration of a file), `accept_request` (writes nothing; returns the exact ledger line and command a human must run, so the agent can propose an exception without being able to add one). Deslint has `verify_before_write`; Lapidist has an MCP; neither has an element route or the no-write exception path. Registration for Claude Code, Cursor and Codex in `plumb install`.

3. **Design-system presets** (the ecosystem loop; detail in section 5). A package exports `./plumb` returning decisions (with `exported: true`), ownership contracts, imitation fingerprints and recommended habits. Plumb autoloads presets from installed dependencies. The MetalUI preset currently lives in `bench/metalui/` inside the Plumb repo; DESIGN said it belongs in MetalUI and should be published as `@unlocalhosted/metalui/plumb`. Move it and make MetalUI the first consumer.

4. **Editor: Oxlint and ESLint plugins reading the daemon.** Thin: one rule, `plumb/finding`, that asks the daemon for the open file's sites and reports them with Plumb's text and a quick fix when the edit is unambiguous. Oxlint first (react.doctor and shadcn use it, it is what MetalUI's generation runs on), ESLint second for the same file. No LSP in v1; the lint plugins already reach VS Code, Cursor and Zed. An LSP only if a non-lint editor surface (hover cards with the decision's why) proves wanted.

5. **GitHub Action: keep, and fix the three things reviewers need.** Notices for debt-touched and exception sites (2.4), a committed `plumb/report.json` and a Markdown trend page (2.1), and `plumb ci install` that writes the workflow (react.doctor's pattern; DESIGN promised it and it is not in the CLI yet). GitLab CI is a template, not a product.

6. **Token-file parity** (DTCG export from Figma or Tokens Studio versus the theme). Small and valuable for designers: `plumb parity tokens/figma.tokens.json` lists decisions in one source and not the other, and values that differ. Plumb already reads DTCG. Do not build a Figma plugin.

7. **Storybook: nothing to build.** Storybook is a running React app, so the overlay works inside it. Document it.

8. **Hosted dashboard: no.** The per-family trend page in the repository is enough, and a hosted product adds accounts, privacy questions and a reason to compute a score. If a team wants a chart, the JSON schema is public.

## 5. What makes it mandatory rather than nice

### 5.1 Under five minutes on any repo

Today: README says the first run exits 1 ("including the first run"), and adoption is `init` then `baseline` then `agent-docs` then `install --hooks`. DESIGN said first run exits 0 and proposes; the implementation went the other way. Fix the path to three commands:

```
npx @unlocalhosted/plumb          # look. exits 0 always. coverage per family, top 5 fixes, "run plumb init"
npx plumb init                    # config with inferred sources, decisions accepted as inferred, baseline written
npx plumb install                 # detects Claude Code / Cursor / Codex, writes hooks, MCP, PLUMB.md, AGENTS.md block,
                                  # offers --ci (Action) and --overlay (Vite plugin or script)
```

`init` folds `baseline` in (a `--no-baseline` flag for people who want to see red first). `install` with no flags does everything detectable and prints what it did, like `react-doctor install --yes`. Total: three commands, under two minutes on MetalUI's docs (cold run is 4.2 s).

### 5.2 Zero-config value on first run

The first run must say something true and useful without a config, or people leave. Today without a config Plumb judges against the keys the project's CSS declares, with Tailwind's defaults set aside, which is right. Three things to add to that first screen:

- Presets found in dependencies (section 5.3): "found `@unlocalhosted/metalui/plumb`: 1,946 decisions, 23 component contracts, 2 fingerprints". A consumer of a design system gets a full judgement on the first run with no config.
- The top five fixes by site count, with the decision and its why, so the first screen already contains something to do.
- A one-line honesty note per family: "type: 294 sites off decisions; this project has no type roles configured (`decisions.type.from: 'utility:type-*'`)", so a big number reads as a config gap, not a verdict.

### 5.3 The ecosystem loop

This is the mechanism that turns Plumb from a tool a team chooses into a tool a design system requires.

A design-system package adds one export:

```ts
// @unlocalhosted/metalui/plumb
import { definePreset } from '@unlocalhosted/plumb'
export default definePreset({
  decisions: metalTokens,                       // from tokens.json; exported: true
  components: { from: 'package:@unlocalhosted/metalui', contracts: { Surface: { allow: ['padding'] } } },
  imitation: { Textarea: { elements: ['textarea'], fingerprint: ['recipe-well-field'] } },
  habits: ['hover-gate', 'focus-outline', 'logical-inline'],
})
```

Plumb finds presets by scanning installed dependencies for a `plumb` export condition (or a `"plumb"` field in package.json). The consumer's run then knows which values are decisions, which properties Button owns, and which raw textareas are imitations, without writing a config. The design system's own run marks its tokens `exported`, which removes the 840-dead-token noise there.

What a consumer sees on the first run, with the preset and no config:

```
$ npx @unlocalhosted/plumb
plumb 0.2  apps/web  tailwind 4.3.3  theme src/app.css
presets  @unlocalhosted/metalui/plumb  1,946 decisions (exported), 23 component contracts, 2 fingerprints, 4 habits
lowered 88 tsx, 6 css  →  4,120 declarations   0.6s

family      from decisions        off   top fix
spacing     611 / 640  (95%)       29   gap: 10px at 7 sites → gap-mu-space-12 "between related parts"
color       402 / 418  (96%)       16   #111 at 9 sites → text-ink "primary text on canvas"
type        210 / 290  (72%)       80   font-size without a type-* role in 4 files
elevation    12 / 40   (30%)       28   0 1px 2px #0002 at 11 sites; nearest shadow-mu-rest "resting surface"
motion       31 / 31  (100%)        0
radius       55 / 58   (95%)        3
z             4 / 4   (100%)        0

ownership    <Button className="font-semibold tracking-tight shadow-none"> overrides type and elevation at src/pages/Home.tsx:88
             Button has cap: flat | raised | glass and size: sm | md | lg; pick a cap instead of restyling
imitation    <textarea className="recipe-well-field …"> at src/pages/Contact.tsx:40 → use <Textarea>; it already owns this well

run `plumb init` to write this as config and record today's 156 off-system sites as debt
```

Nothing in that screen required the consumer to know what a tier or an identity is. The design system decided; the consumer sees the consequences.

Why it becomes mandatory: the design system's docs say "run `npx plumb`" the way they say "install the fonts". Consumers who skip it ship drift that the design-system owner can now see (the preset is the same record that judges them). Design-system owners want this because it is the first tool that enforces their contracts in consumers' repos without a bespoke ESLint plugin (Atlassian, Primer and Polaris each built one; Plumb makes that a preset). The loop closes when a second design system ships a preset; the first should be MetalUI, and the second should be a shadcn preset derived from `components.json`, which Plumb already reads.

### 5.4 What makes a team put it in CI and keep it

- It fails only on new drift and ledger growth, never on debt. Done.
- Every failure names the fix and the reason. Done.
- The ledger routes to CODEOWNERS. Done, through the Action's approvers.
- It is quiet. Not done; section 6 lists the noise.
- It is fast: 1 s warm, 4 s cold on 341 files. Done.
- It is the same judge the agent used before writing, so CI rarely finds anything. This is the real retention mechanism: once agents call `try` and the hook, CI becomes a receipt rather than a gate, and nobody removes a receipt.

### 5.5 How to know it is working

Counts, not opinions. Each one is readable from the daemon's log or the Action's JSON, so none needs a hosted service.

- Overlay opens per developer per day. If it is under one, the moment is wrong or the install is too hard; react-grab's measure is the same.
- `try` calls per agent session, and the share that return `NEEDS-DECISION` versus an exact edit. A rising exact-edit share means the decision record is getting whys; a rising NEEDS-DECISION share means the ladder has gaps the designer should see.
- New sites per PR, median. The number that should trend to zero once agents call `try`.
- Debt trend per family in the committed report. The number the design-system owner shows her team.
- Ledger lines added per month, with a why, versus without. Without should be zero because the CLI refuses; if it is not, someone is hand-editing and the Action should say so.
- Repositories that load a preset. The ecosystem count. One (MetalUI) is a dogfood; three is a loop.

## 6. Weaknesses and gaps

Specific, in rough order of how much they block the above.

1. **Not published.** Everything else is moot. The npm name dispute can run in parallel; ship `@unlocalhosted/plumb` with `bin: plumb` now. Node 22.18 minimum is higher than react.doctor's 20.19; keep it if the raw-transfer oxc path needs it, otherwise lower it, because a floor above an LTS costs installs.

2. **First run exits 1.** README: "1 for error findings (including the first run)". For `npx plumb` with no config that is wrong; a look must not fail. Exit 0 until a ledger exists, then the normal contract.

3. **CLI-only feedback.** No daemon, no watch, no overlay, no editor, no MCP. Section 7.

4. **Noise, measured on MetalUI's final state (1,072 groups, 3,890 site rows).** The loud ones:
   - `provenance/opaque-inline`: 7 groups, 388 sites. Every runtime number in a `style` object is a warning with the same fix. It should be one informational line per file, not 388 sites, until a team opts in.
   - `habits/logical-inline`: 255 groups, 300 sites. A habit many teams do not hold, enabled in the benchmark config. Fine when chosen, but `init` must not propose it by default. Default habit proposal: `hover-gate`, `focus-outline`, `transition-named`, `no-ease-in` only.
   - `provenance/type`: 62 groups, 294 sites. Mostly a configuration gap (no type roles declared), which the report does not say. See 5.2.
   - `dead/*`: 8 groups, 1,612 definition sites, all noise for a library until `exported` is set. Presets fix it for libraries; for apps the count is real.
   - `provenance/*/by-value`: warns that a literal equals a token. Right rule, but a first-run user reads it as an error. Show as a separate "linkable" count, not in the findings list, until the family's identity is set to `reference` by a human.
   - `provenance/elevation`: 92 groups, 130 sites, coverage 15%. Real drift, but also a family where many systems have no semantic tier; the message should say "no semantic shadows exist; nearest primitive is …" rather than failing.

5. **Config is expert-only.** `identity`, `origins`, `callers`, tiers, `from: 'utility:type-*'`. The defaults are right; the problem is that the first-run screen does not teach them. Each family line in the report should carry the one config line that would change it (5.2). Presets remove most of this for consumers.

6. **The MetalUI preset is in the wrong repo.** `bench/metalui/plumb.config.ts` and friends live in Plumb. DESIGN section 9 says the preset belongs in MetalUI and is published from there. MetalUI itself does not run Plumb in CI today, which means the dogfood is read-only and the ecosystem loop has zero links.

7. **React and Tailwind v4 only.** Tailwind v4 is the right bet (v3 has no `candidatesToCss`); React-only is the real limit. Routes 1, 3 and 4 of the overlay and the whole stylesheet reader are framework-free, so the honest position is "any framework for CSS and custom properties; React for classes in markup, ownership and the overlay's source route". Say that in the README. Vue and Svelte readers only when a repo asks.

8. **`try` reloads the project per call** (about a second warm). Acceptable for a hook, not for an agent calling it before every write. The daemon fixes it.

9. **Ledger size.** MetalUI's baseline is 5,743 lines (3,910 debt). It is sorted and line-wise mergeable, which is right, but a 5,000-line file in the first commit frightens people. Two mitigations: `init` prints "baseline: 3,910 debt sites in .plumb/ledger.jsonl; this file only shrinks", and the Action's summary shows the debt trend so the file is seen as a number going down.

10. **No scoring, correctly, but no headline either.** Per-family coverage is the right report; the PR comment and the trend page need a one-line headline that is not a score: "+3 new, −7 fixed, debt 312 (−7)". Already printed in text; make it the first line of the PR comment and the Action's check title.

11. **Cascade not computed.** Documented limit; the overlay's computed-style route is the right partial answer. Do not try to compute it statically.

12. **Descendant-selector ownership and imitation inference are heuristics** and say so. Fine; keep them at warn and keep `imitation --suggest` report-only.

13. **Name.** `plumb` on npm is taken by an abandoned package. The dispute is filed or should be; until then the scoped name is fine because the binary is still `plumb`.

## 7. Roadmap: the next eight things

Each: what, who, acceptance, size. Built one at a time, finished and verified before the next, per the owner's rules. Non-UI work (daemon, MCP, presets, Action, parity) goes to Codex; the overlay and the report page are UI and stay with Claude.

| # | Build | Serves | Acceptance check | Size |
|---|---|---|---|---|
| 1 | **Publish and the three-command path.** `npm publish` 0.1.x; first run exits 0 and shows coverage, top 5 fixes, preset discovery and per-family config hints; `init` folds in baseline; `install` detects agents and writes hooks, MCP registration, PLUMB.md, the AGENTS.md block; `ci install` writes the Action. | everyone | On a fresh clone of MetalUI docs: `npx @unlocalhosted/plumb` exits 0 in under 5 s; `npx plumb init && npx plumb install --ci` leaves a green `plumb check` and a workflow file; e2e records the three transcripts. | S |
| 2 | **`plumb serve` daemon.** Watches source, CSS, config and ledger; keeps analysis warm; serves HTTP and stdio; `--watch` becomes a client of it; `try` through the daemon. | agents, overlay, editor | Edit one class in MetalUI docs; `curl /site?file&line` answers in under 100 ms with the new finding; `try` through the daemon under 100 ms; 24 h soak with no memory growth beyond the cache. | M |
| 3 | **Browser overlay** (section 3). Vite plugin plus script install; bippy fiber route; class, stylesheet and computed routes; panel with declarations, verdicts, ownership, ledger; "Copy for agent". | engineer, designer, agent | On MetalUI docs in dev: hovering the Fan page's row shows `gap-10` at `Fan.tsx:41` with the nearest decisions and ledger status; hovering a landing CTA shows the Button overrides with the variant axes; Copy pastes a block that lets Claude Code make the exact edit without a search; works with React DevTools open; Playwright slice captures the panel in both colourways. | L |
| 4 | **MCP server** on the daemon: `try`, `check_changed`, `decisions`, `why`, `element`, `explain`, `accept_request` (read-only proposal). Registered by `install`. | agents | A recorded Claude Code session: agent calls `try` before a write, gets NEEDS-DECISION for `bg-red-500`, asks, writes with the decision, hook prints `0 new`; `accept_request` provably writes nothing (snapshot test, as `try` has). | S |
| 5 | **Presets** (section 5.3): `definePreset`, autoload from dependencies' `plumb` export, `exported` by default for preset decisions; move the MetalUI preset into the MetalUI repo, publish as `@unlocalhosted/metalui/plumb`, put Plumb in MetalUI's CI; a shadcn preset from `components.json`. | design-system owners, consumers | A fixture consumer of MetalUI runs `npx plumb` with no config and reports ownership findings against Button and zero dead tokens; MetalUI's own CI is green with its ledger; the shadcn fixture judges a `<Button className="bg-red-500">` against the real cva variants. | M |
| 6 | **Noise pass** (section 6.4): opaque-inline as one informational line per file by default; `init` proposes only four habits; type-family config hint; by-value as a count; elevation message for families with no semantic tier. | everyone | MetalUI docs findings drop from 1,072 groups to under 400 with no rule removed and every removed group accounted for in BENCHMARK.md; the e2e for each change asserts the new default and the opt-in. | S |
| 7 | **Oxlint and ESLint plugins** reading the daemon: one rule, Plumb's text, quick fix when unambiguous. | engineer | In MetalUI with Oxlint, typing `gap-10` shows the squiggle with the decision's why within a second of saving; the quick fix produces the same edit `--agent` prints; without the daemon the rule says so once and stays silent. | M |
| 8 | **Reviewer notices and the trend page**: debt-touched and exception notices in the Action; `plumb report` writes `plumb/report.json` and a Markdown trend; `parity` for DTCG files. | owner, reviewer, designer | Fixture PR shows the three annotation kinds; the trend page shows a coverage delta across two commits; `parity` lists a token present in Figma's export and absent from the theme. | S |

### Deliberately not built

- A score. Per-family coverage plus new/fixed/debt is the headline.
- Inline suppressions. The ledger is the only exception path; the overlay and `why` close the distance.
- A hosted service or dashboard.
- Visual regression, contrast checking, or any claim about how things look.
- Static cascade computation. The overlay observes the cascade; the CLI judges declarations.
- CSS-in-JS, Tailwind v3, Vue and Svelte readers, until a repository asks and can be a fixture.
- An LSP, until the lint plugins prove insufficient.
- A Figma plugin. Token-file parity covers the designer's question without a plugin.
- Auto-fix without a decision. Plumb edits only when exactly one candidate fits; otherwise it says NEEDS-DECISION. Keep that.
- Depending on react-grab. Use bippy directly; react-grab's primitives are a product surface, not a stable library contract (UNVERIFIED either way).

## Summary

1. react-grab and react.doctor are daily tools because they sit at a moment people already have, cost one gesture, and hand identity plus an exact edit to the agent; Plumb has the judge and the handoff but no moment.
2. The people are the design-system owner (PR and trend), the product engineer (typing, looking, PR), the designer (looking, approving tokens), the reviewer (annotations) and the agent (before write, after write, when pointed at).
3. The browser overlay is the most important next surface: Alt+hover an element, see every declaration's compiled value, verdict, owning component, overrides and ledger status, and copy the context for an agent.
4. Map elements to sites by four routes: class names against Plumb's candidate cache, the fiber owner stack via bippy for file:line:col, matched stylesheet rules against lowered declarations, and computed style for the cascade Plumb cannot compute statically.
5. The overlay needs a warm `plumb serve` daemon and a dev build; build the daemon first, then the overlay, then the MCP server on the same process.
6. Make adoption three commands: `npx plumb` (exits 0, proposes), `plumb init` (config plus baseline), `plumb install` (hooks, MCP, docs, Action, overlay).
7. The ecosystem loop is presets: a design-system package exports `./plumb` and its consumers inherit decisions, contracts and fingerprints with no config; move the MetalUI preset into MetalUI and put Plumb in MetalUI's CI.
8. Fix the noise before the overlay shows it per element: opaque-inline, logical-inline by default, the type-family config hint, by-value as a count, elevation messages.
9. Editor plugins come fourth, as thin Oxlint and ESLint rules reading the daemon; no LSP yet.
10. Keep the Action, add debt-touched and exception notices, a committed trend page and `ci install`; no hosted dashboard, no score.
11. Weaknesses that block all of it: not published, first run exits 1, CLI-only loop, the preset in the wrong repo, noise, and a config that teaches nothing on the first screen.
12. Order: publish and three commands (S), daemon (M), overlay (L), MCP (S), presets (M), noise pass (S), editor plugins (M), reviewer notices and trend page (S).
