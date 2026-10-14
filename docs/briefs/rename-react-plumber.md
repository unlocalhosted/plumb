# Brief: rename Plumb to React Plumber (code, CLI, config, tests, recordings)

Owner's decisions (final):
- npm package: `@unlocalhosted/react-plumber` (was `@unlocalhosted/plumb`). Exports become
  `@unlocalhosted/react-plumber`, `/vite`, `/next`, `/next/config`.
- Command: `plumber` (was `plumb`). Ship only the `plumber` bin.
- Product name in CLI output, help, messages, README, docs/*.md, action.yml, skills/: "React Plumber" (or "Plumber" for
  short in running text where "React Plumber" would repeat heavily). Every user-facing command shown reads `plumber …`.
- Config file: `plumber.config.{ts,mts,js,mjs}` (was `plumb.config.*`). Ledger directory: `.plumber/` (was `.plumb/`,
  e.g. `.plumber/ledger.jsonl`, `.plumber/serve.json`, caches). BACKWARD COMPATIBILITY: if only the old names exist, read
  them and print ONE short notice per run saying how to move (`mv plumb.config.ts plumber.config.ts`, `mv .plumb .plumber`).
  Writes go to the new names when no old ones exist; when old ones exist and new don't, keep writing the old ones (don't
  split a project's state across two places). Prove both paths with e2e tests.
- Keep internal identifiers unchanged (invisible to users, renaming them only churns): the `plumb-overlay` custom
  element, `data-plumb-*` attributes, the `/__plumb/` dev-server route, `x-plumb-token`, `--pl-*` CSS variables,
  `plumb:*` DOM event names, sessionStorage keys.
- Environment variables: support `PLUMBER_*` and keep reading `PLUMB_*` as a fallback.
- GitHub Action: keep the repository path as it is (the repo is not being renamed now); update its name/description text.

Scope:
- src/, overlay/client.js and overlay/src/api.js only if they reference package/bin/config names (NOT overlay UI strings;
  Claude does those), package.json (name, bin, exports unchanged in shape), schema/*.json titles/ids if they mention the
  name, action.yml, skills/plumb (rename the skill dir to skills/plumber if the install code references it, keeping the
  installed skill path consistent), README.md, docs/*.md (not docs/briefs history), e2e/*.test.mjs and e2e/helpers
  (imports of '@unlocalhosted/plumb/...' → '@unlocalhosted/react-plumber/...', bin invocations), fixtures/ config files,
  bench/ scripts, scripts/docs/* recorders.
- site/: rename site/plumb.config.mjs → site/plumber.config.mjs and site/.plumb → site/.plumber with `git mv`; update
  site/vite.config.mjs imports. Do NOT edit site/src (Claude does the site text), EXCEPT regenerating the recordings in
  site/src/docs/recordings by running the recorder scripts after the rename so recorded output reads `plumber`.
- `npm run build`, then run the full `npm test` with
  PLUMB_CHROMIUM="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" (or PLUMBER_CHROMIUM if you add it).
  All tests must pass; report counts. Also `node dist/cli.js check --root site` must still report exactly the hero's 6
  deliberate findings, now under the new config/ledger names.
- `npm pack --dry-run` shows the new name and bin.

Rules: integration/e2e tests only, never unit tests. Atomic commits in logical steps (package+bin; config/ledger names
with compatibility + their e2e tests; docs/README; recordings), each ending with:
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Do not touch overlay UI wording or site/src (except recordings). Do not push. Write a report to
docs/briefs/rename-react-plumber.result.md: what changed, compatibility behaviour with real command output, test counts.
