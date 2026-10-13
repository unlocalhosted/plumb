# Brief: facts for the four Guides pages (no UI)
Do not run npm run build (dist/ is current; two other jobs share this repo); if you truly need a rebuild, say so in your result instead. Do not edit anything under site/src except the recording files named. Commit nothing. Cite file:line for every factual claim; write "not supported" when something is not. Use real CLI runs for any output; never hand-write output.
Results → docs/briefs/guides-facts.result.md, one section per guide, each with exact commands/config snippets copied
from the code or from real command output.
1. The overlay in your app: Vite and Next.js wiring (what plumb install --overlay prints, the plugin/host code), dev-only
   guards, Alt-click / Alt to inspect, what the reading card shows, Write (which edits it can make: classes, text),
   what it refuses and why, the token header, and how a deployed/static site behaves (site/REPLAY.md).
2. CI and pull requests: the GitHub Action (action.yml inputs/outputs), base comparison, approvals for ledger growth,
   exit codes, a minimal workflow file that works, and what a PR comment/annotation looks like if supported.
3. Agents: what plumb install writes for Claude Code (files, hooks, skills, commands), exact contents or their outline,
   and how an agent is expected to use Plumb. Other agents if supported.
4. Adopting on a big repo: the recommended order (init, baseline, accept-decisions, fixing debt, prune, the ratchet,
   strict ledger), with the exact commands and what each prints in summary.
