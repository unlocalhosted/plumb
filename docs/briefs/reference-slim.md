# Brief: slim display copies of the reference data for the site (script work, no UI)
The full reference data (site/src/docs/recordings/ref-*.json, ~1MB, with citations) is great evidence but too heavy and
noisy to ship. Do this in scripts/docs/gen-reference.mjs:
1. Move the full files out of the site: write them to docs/reference-data/ref-{cli,config,rules,report}.json instead.
   Delete the old copies from site/src/docs/recordings/.
2. Also write slim display files to site/src/docs/recordings/reference/{cli,config,rules,report}.json with EXACTLY these
   shapes. Any value that is absent or "not supported" in the full data becomes null (never the string "not supported").
   - cli.json:    { "commands": [{ "name", "summary", "usage": [string], "flags": [{ "name", "type", "default", "description" }] }],
                    "help": string }   // the single shared --help text, once
   - config.json: { "options": [{ "path", "type", "required", "default", "enum": [..]|null, "description" }] }
                    // drop container-only rows whose only purpose is to hold children? No: keep every path, sorted.
                    // "type" is a short display string, e.g. "string", "string[]", "boolean", "'error'|'warn'|'info'"
   - rules.json:  { "rules": [{ "id", "pattern": bool, "families": [string], "severity": [string],
                    "title": string|null, "because": string|null, "fix": string|null, "accept": bool }] }
                    // title/because/fix: the first message template, placeholders left as {name}
   - report.json: { "fields": [{ "path", "type", "required", "description" }], "example": <the one trimmed finding object> }
3. Each slim file must be under 60KB; report the sizes. No absolute paths (the existing recordingJSON guard applies).
Do not run npm run build. Do not edit site/src except those recordings. Commit nothing.
Report in docs/briefs/reference-slim.result.md.
