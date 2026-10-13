# Brief: facts + recording for the docs page "How a value is judged" (research and scripts, no UI)

Claude writes the page site/src/docs/pages/how-a-value-is-judged.mdx and its figure. You supply the truth. Don't edit
anything under site/src except the recording named below. Commit nothing.

## 1. Facts sheet → docs/briefs/judged-facts.result.md (cite file:line for every claim; "not supported" when it isn't)
Walk one value through Plumb's real pipeline, stage by stage, naming the code that does each stage:
1. Collect: which sources are read (JSX className strings, cn()/clsx/cva calls?, CSS files, @apply, inline style={{}}),
   how a class is located back to file:line:column, and what can't be read (runtime-computed classes/styles).
2. Compile: how classes and @apply go through the project's own Tailwind; what comes out (declarations per property).
3. Resolve: var()/calc()/rem → a comparable value; what stays unresolved.
4. Match: how the value is compared with the family's decisions (identity: value vs reference, per family), exactness,
   how "nearest" choices are picked and ordered, how many, and where reasons come from.
5. Verdict: the rule ids that can fire for an off-scale value (provenance/arbitrary, provenance/spacing, framework
   defaults, dead classes…), severity, and what makes a value pass. What's different for an inline style.
6. Anything surprising a reader should know (e.g. Tailwind default steps, half steps, negative values, 0, `px`).

## 2. Recording → site/src/docs/recordings/judged.json
Create a tiny fixture project under fixtures/docs-judged/ (Tailwind v4, a theme with spacing steps 8/12/16/20 at least,
each with a /* why: */) and one component that writes the SAME value 13px four ways, plus one on-scale case:
  a) className="gap-[13px]"   b) a CSS rule using @apply gap-[13px]   c) style={{ gap: 13 }} (or '13px')
  d) a plain CSS declaration gap: 13px                               e) className="gap-3" (on the scale)
Run the real CLI (`node dist/cli.js check --root fixtures/docs-judged --json` or the closest real path) and write JSON with,
for each case: authored text and file:line, compiled declaration(s), resolved value, the finding (rule id, severity,
message, choices with token/value/reason) or none. Put any script at scripts/docs/record-judged.mjs and say how to run it.
Use the raw report fields; don't invent stage values the code doesn't produce. If a stage isn't exposed, say so and leave
it null rather than reconstructing it.
