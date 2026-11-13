# Real Next.js apps as a Plumber test corpus

Research date 2026-11-05. All facts come from the GitHub API (`gh api repos/.../contents/...`) at each repo's default branch. Nothing was cloned, installed or run, so every "runs without secrets" claim is read from source and marked UNVERIFIED until someone runs it.

## Top 3

| # | Repo | App path | next / react / tailwind | PM | Why |
|---|---|---|---|---|---|
| 1 | tailwindlabs/tailwindcss.com | repo root | 16.2.6 / 19.2.6 / ^4.3.3 | pnpm 9.14 | Standalone single app, no env, RSC-heavy MDX docs + marketing + client islands; Tailwind's own v4 theme in `globals.css`. Turbopack is its default dev. |
| 2 | magicuidesign/magicui | apps/www | ^15.5.28 (lock 15.5.28) / 19.1.1 / ^4.1.13 (lock 4.3.3) | pnpm 9.15 | Light monorepo, one env var, marketing page full of client animation components plus docs and blog. Webpack dev by default (`next dev`), so it is the webpack arm. |
| 3 | shadcn-ui/ui | apps/v4 | 16.4.2 / 19.2.3 / ^4.3.0 | pnpm 10.33.4 | Biggest real UI surface (examples, dashboards, charts, blocks, 400+ docs pages), Tailwind v4 design tokens. Costs: whole monorepo install and a one-time registry build before dev works. |

Suggested split: magicui on webpack, tailwindcss.com on Turbopack, shadcn v4 on either (its dev script uses `--turbopack`; drop the flag for webpack).

---

## 1. tailwindlabs/tailwindcss.com

- URL: https://github.com/tailwindlabs/tailwindcss.com
- Next app path: repo root (package name `v4.tailwindcss.com`, `src/app`).
- Commit checked: `7f92c2213315c195dae583d68752da4042da3ade` (main, 2026-09-09).
- Versions, from `package.json` at that SHA: `next` 16.2.6 (exact), `react`/`react-dom` 19.2.6, `tailwindcss` ^4.3.3, `@tailwindcss/postcss` ^4.3.3, postcss plugin configured inline in package.json. I did not read `pnpm-lock.yaml` for resolved versions (the exact pins make it unnecessary for next/react).
- Package manager: pnpm 9.14.0 (`packageManager` field), `pnpm-lock.yaml` present. Single package, no workspace.
- Run dev: `pnpm install && pnpm run dev` → `next dev --turbopack`. For webpack, run `pnpm exec next dev` (no flag; Next 16 defaults to Turbopack, so you need `--webpack` on 16: `pnpm exec next dev --webpack`. UNVERIFIED; check the 16.2 CLI help).
- Env/stubs: none found. A code search for `process.env` hit only `src/app/api/og/route.tsx` (OG image route, not a page). `@next/third-parties` is a dependency (analytics script), harmless offline. Search uses `@docsearch/react` (Algolia keys are likely hard-coded public ones; the search box will not work offline, irrelevant to us). UNVERIFIED.
- Size: ~2 MB of TSX/MDX in `src`; 141 `.tsx` files, 70 in `src/components`, 197 MDX docs in `src/docs`. Dependencies are modest (shiki, framer-motion, headlessui, heroicons). Repo size ~965 MB on GitHub is mostly git history/images, not install.
- Routes worth testing:
  - `/` (marketing home, `src/app/page.tsx`): server-rendered page with many client islands (animated demos, framer-motion). Mixed.
  - `/docs/<slug>` e.g. `/docs/padding`, `/docs/flex` (`(docs)/docs/[slug]/page.tsx`): MDX rendered on the server, a few client widgets (example previews, copy/tabs). Server heavy, very large DOM, dense Tailwind classes.
  - `/docs/installation/using-vite` (tabs layout, nested parallel route `@breadcrumb`): server heavy, exercises parallel routes.
  - `/blog` and `/blog/[slug]`: server heavy, MDX.
  - `/showcase`, `/partners`: image/card grids, mostly server.
- Risks:
  - License: not open source ("intellectual property of Tailwind Labs Inc", source is educational). Fine for private local testing; do not vendor or redistribute the code or screenshots.
  - Heavy use of Tailwind v4 features (`@theme`, custom CSS in `globals.css`, `typography.css`, `search.css`); good for the theme-judging test but also the most likely to expose unsupported syntax.
  - Last push 2026-09-09, slower cadence than the others.
  - Some pages are MDX compiled via `@next/mdx`; JSX-source mapping for MDX-authored elements may be impossible by design (useful negative case).
  - `@headlessui/react` is pinned to an insiders build (`0.0.0-insiders.b6f355d1`) which must be fetched from npm; if it was unpublished, install fails. UNVERIFIED.

## 2. magicuidesign/magicui

- URL: https://github.com/magicuidesign/magicui
- Next app path: `apps/www` (pnpm workspace `apps/*`, `packages/*`; only `apps/www` exists).
- Commit checked: `37ce829f18dd7d0a7219531a4249b664419933ea` (main, 2026-11-04).
- Versions, from `apps/www/package.json` and `pnpm-lock.yaml` at that SHA: `next` ^15.5.28 resolved 15.5.28; `react`/`react-dom` 19.1.1; `tailwindcss` ^4.1.13 resolved 4.3.3; `@tailwindcss/postcss` ^4.1.13 (`postcss.config.mjs` uses it). Docs via fumadocs (`fumadocs-core` ^15.8.2, `fumadocs-mdx` ^12).
- Package manager: pnpm 9.15.0; `preinstall` runs `npx only-allow pnpm` (npm/yarn will refuse). `postinstall` runs `fumadocs-mdx` to generate `.source`.
- Run dev: from root `pnpm install` then `pnpm --filter www dev` (script is plain `next dev`, so webpack on 15.5). Root `pnpm dev` runs `turbo run dev --parallel`. For Turbopack: `pnpm --filter www exec next dev --turbopack`.
- Env: `apps/www/.env.example` has only `NEXT_PUBLIC_APP_URL=http://localhost:3000`. Code search shows `process.env` in `lib/posthog.ts`, `lib/utils.ts`, `app/api/blog-webhook/route.ts` only; analytics component is present in the root layout, no key needed to render. Stub: copy `.env.example` to `.env.local`. UNVERIFIED.
- Size: light. 158 `.tsx` files under `components`, `app` and `registry/magicui`; 66 files in `components/`, 79 component docs pages, 289 content files, 268 registry files.
- Routes worth testing:
  - `/` (`(marketing)/page.tsx`): landing page with many animated client components (motion). Client heavy, lots of Tailwind arbitrary values and gradients.
  - `/docs/components/marquee` (and ~79 other component pages) via `(docs)/docs/[[...slug]]/page.tsx`: server-rendered MDX shell around client preview components. Mixed; each page renders the component live plus its source.
  - `/docs` (docs index/introduction): server heavy.
  - `/blog` and `/blog/[...slug]`: server heavy, MDX.
  - `/showcase`: card grid, mostly server.
- Risks:
  - Root layout sets `experimental.inlineCss: true`, which inlines CSS into the HTML; this may change how Plumber reads stylesheets/theme and is worth a dedicated check.
  - Registry demo components are imported dynamically by name from generated files; JSX source mapping through the dynamic-import layer is a good test but may look noisy.
  - Remote images (cdn.magicui.design, unsplash, twimg) will not load offline; layout may shift but it will still render.
  - fumadocs `postinstall` must succeed or `.source` is missing and every docs route 500s. UNVERIFIED.
  - Next 15, not 16, so it will not cover the 16-only paths. Fine as the second version arm.

## 3. shadcn-ui/ui (apps/v4)

- URL: https://github.com/shadcn-ui/ui
- Next app path: `apps/v4` (monorepo with `apps/*` and `packages/*`; pnpm-workspace.yaml excludes test fixtures).
- Commit checked: `8a3536678a528cc012b9e62484290e79d0be410f` (main, pushed 2026-11-05).
- Versions, from `apps/v4/package.json`: `next` 16.4.2, `react`/`react-dom` 19.2.3, `tailwindcss` ^4.3.0, `@tailwindcss/postcss` ^4.3.0 (`postcss.config.mjs` present). I did not read the lockfile (versions are exact pins for next/react).
- Package manager: pnpm 10.33.4 (root `packageManager`); `minimumReleaseAge: 2880` in `pnpm-workspace.yaml` (pnpm 10.16+ feature; fresh packages are refused for 48 h, can cause an install failure on a just-published dep). Some scripts shell out to `bun` (`registry:build` calls `bun run ./scripts/build-registry.mts`), so bun must be installed.
- Run dev: root `pnpm install` (postinstall `fumadocs-mdx`), then, per `next.config.mjs`, generated styles under `apps/v4/styles/` are gitignored and the config throws in dev if they are missing: run `pnpm --filter=v4 registry:build --style all` once, then `pnpm --filter=v4 dev` → `pnpm icons:dev & next dev --turbopack --port 4000`. The `icons:dev` watcher is spawned in the background by that script; kill it when done (per the dev-server rule, start this through `~/.claude/bin/dev-server`). For webpack, run `next dev --port 4000` directly and skip the watcher after running `pnpm icons:build` once.
- Env: `.env.example` has `NEXT_PUBLIC_V0_URL=https://v0.dev` and `NEXT_PUBLIC_APP_URL=http://localhost:4000`. Other `process.env` readers (v0 button, share button, registry-health, subagent demo) are feature-gated or script-only. Stub: copy `.env.example` to `.env.local`. UNVERIFIED.
- Size: heaviest of the three. 682 `.tsx` files in `app`, `components` and `registry/new-york-v4/{ui,blocks,examples}`; 76 files in `components/`, 62 in `ui/`, 158 in `blocks/`, 424 in `content/docs`. Dependencies include `@ai-sdk/*` canaries, several icon packs, dnd-kit, charts; install is large and the `registry:build` step builds workspace packages. Expect several GB on disk and a long first compile. Use `pnpm install --filter v4...` to limit it (UNVERIFIED that this filter suffices for the registry build, which also builds `shadcn...`).
- Routes worth testing:
  - `/examples/dashboard`, `/examples/tasks`, `/examples/authentication`, `/examples/playground` (`(app)/examples/*`): real dashboard/app UIs. Client heavy (tables, charts, forms), server page shells.
  - `/blocks` and `/blocks/[...categories]`: gallery of 158 blocks rendered from the registry. Mixed.
  - `/docs/components/button` (`docs/[[...slug]]`): MDX docs with live component previews. Server shell, client previews.
  - `/charts/[type]` e.g. `/charts/area`: client heavy (Recharts).
  - `/` (`(root)/page.tsx`) and `/colors`: marketing/token page, server-leaning; `/colors` is a direct view of the theme palette (great for the theme-judging test).
- Risks:
  - Setup cost and fragility: gitignored generated `styles/`, a dev-time throw if stale, a background icon watcher, bun plus pnpm, 48 h release-age gate. Budget real time for first success.
  - Many components are served from generated `registry/__components__` shards using dynamic imports, so the file Plumber maps a DOM node to may be a generated copy rather than the hand-authored source (decide which counts as correct).
  - The `ui` primitives are now Base UI / Radix variants across multiple "styles" (base-nova etc.), so the same visible button may come from several source files.
  - `AGENTS.md` warns this Next version has breaking changes (16.4.x); expect newer APIs.
  - Memory: Turbopack on this app can be heavy on a 16 GB machine; run one project at a time.

---

## Rejected

- dubinc/dub (`apps/web`): `tailwindcss` ^3.4.4 in `apps/web/package.json` (commit 6b463b4); Tailwind v3 unsupported. Also needs Prisma/Planetscale, Upstash, Tinybird. Huge monorepo.
- vercel/next-forge: next 16.1.6, react 19.2.4, tailwind ^4.2.1 (good), but `apps/web` and `apps/app` need Clerk, Stripe, Resend, DATABASE_URL, Arcjet, Liveblocks, Knock, BaseHub, Svix, etc. (about 25 env vars, validated at startup); bun-based, large monorepo. Too many stubs; `apps/web` marketing site might render with fakes but UNVERIFIED and brittle.
- vercel/commerce: archived; needs Shopify credentials; pins `next` 15.6.0-canary.60 and react 19.0.0.
- shadcn-ui/taxonomy: next 13.3.2-canary, react 18, tailwind v3.
- vercel/ai-chatbot: next 16.2.10, tailwind ^4.3.2 (good), but needs AUTH_SECRET, AI Gateway key, Postgres, Redis, Blob token; pnpm 12.17.0. Small UI surface anyway.
- vercel/platforms: next ^16.2.10, tailwind ^4.1.6, but multi-tenant wildcard subdomains plus Redis/db; small UI.
- nextjs/saas-starter: next 15.6.0-canary.59, tailwind 4.1.7, but needs Postgres, Stripe; only a few screens; push dated 2025-12.
- vercel/examples: ~dozens of independent small apps (monorepo of 130 MB, many on older Next/Tailwind v3); no single large UI; would need per-example vetting. Not worth it as a primary corpus.
- vercel/ai-elements: component library, `package.json` reading incomplete (no next/tailwind versions surfaced at the root); not an app. Not evaluated further.
- originui: no maintained repo found under that name (only third-party ports for Svelte/Vue); it was folded into other projects. Skipped.
- calcom/cal.com: 1.1 GB repo, huge monorepo, DB and many services. Bad pick, as expected.
- tailwindlabs Tailwind Plus templates: not public repos (404 on `tailwind-plus-transmit`). Skipped.

## Verification status

- Verified (read from API at the cited SHAs): the versions, package managers, scripts, env examples and route file lists above.
- UNVERIFIED (needs a real run): that each app boots with only the stubs described, that `fumadocs-mdx` postinstall and shadcn's `registry:build` succeed, the webpack flags for Next 16, and how `experimental.inlineCss` (magicui) affects Plumber.
