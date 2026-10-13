# Brief: make the docs recordings safe to ship (script work, no UI)
The JSON in site/src/docs/recordings/ ships in the public site bundle. Several files contain absolute local paths
(/Users/…, /var/folders/…, the node binary path) in commands, cwd, stdout and finding objects.
Change the recorder scripts (scripts/docs/record-*.mjs, gen-reference.mjs) so every recording:
- contains no absolute path, home directory, username or temp dir: paths become fixture- or repo-relative;
- stores each CLI command as the user would type it: `plumb <args>` with `--root` dropped when it's the fixture root
  (keep a separate `invocation` field only if a test needs it, also relative);
- for ledger.json, describes the two file edits (add-new-drift, fix-old-drift) as `edit: { file, before?, after }`
  instead of a node -e command; drop the git-init and git-author steps from `steps` (keep them in `setup` prose).
Re-run every recorder, then prove it: `grep -rnE "/Users/|/var/folders|/private/|\\\\\\\\Users" site/src/docs/recordings` prints
nothing. Do not run npm run build (dist is current). Do not edit site/src except the recordings. Commit nothing.
Report in docs/briefs/recordings-sanitize.result.md, including any field renamed.
