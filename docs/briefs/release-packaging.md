# Brief: release packaging (P1, P2, C2, L1) and one message nit

Repo: this one (React Plumber, `@unlocalhosted/react-plumber`, CLI `plumber`). Evidence for each item is in
docs/briefs/release-readiness.result.md (rows P1, P2, C2, L1). One atomic commit per item, in this order, each ending with
`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

1. **P1** The tarball can carry stale compiled files (dist/hosts/next-loader.cjs, dist/hosts/source-attributes.js and their
   declarations have no source). Make the build clean dist first, and make packing always build fresh (a `prepack`
   script). Prove with an e2e that packs, lists the tarball, and asserts every dist file has a source counterpart.
2. **P2** README links docs/roadmap/1-adoption.md and docs/layers/9-surfaces.md, which aren't packed. Use absolute
   repository URLs (https://github.com/unlocalhosted/plumb/blob/main/...) for every repo-relative link in the README;
   the packed-install e2e should assert the packed README has no relative links to files missing from the tarball.
3. **C2** `plumber install --ci` from a packed install pins the Action to `@main`. Pin it to the released version tag
   (`unlocalhosted/plumb@v<package version>`) when no git head is known, and make the Action's own setup steps pin
   their actions to exact versions or SHAs. Keep the existing behaviour of pinning to a commit when one is known.
   Prove with the packed-install e2e: the written workflow references `@v0.1.0` (from package.json), never `@main`.
   State in the result that the tag must exist at release (it is created in the publish step, C1).
4. **L1** Third-party notices: collect the licenses of everything bundled into what we ship (the served overlay client,
   including bippy (MIT, Aiden Bai), and anything else vendored into dist or overlay output) into a THIRD_PARTY_NOTICES
   file that is included in the npm package, and keep license headers in bundled output. Add a script that regenerates
   it and an e2e that fails if a bundled dependency's license is missing from the file. The site's own bundle is out
   of scope (its deploy is a later brief), but say what it would need.
5. **Message nit** `plumber check` prints "so 1 colour values can't be checked". Make every count-bearing message in
   src/ pluralise correctly (audit them all, per docs/MESSAGES.md voice). Prove with the existing message e2e(s).

Rules: integration/e2e tests only, never unit tests. Don't touch overlay/src UI or site/src. Don't touch ../algorecall.
Finish with `PLUMBER_CHROMIUM="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm test` passing in full and
`npm pack --dry-run` output in the result. Write docs/briefs/release-packaging.result.md and commit it separately.
