# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Product engineers** building UI in a project with a design system: they look at the running app, notice something off, and want the file, line and exact edit. The browser overlay serves them first.
- **Design-system owners**: they track drift across a codebase in CI and approve new tokens and exceptions.
- **Designers**: they check whether a page uses the system, by token name and reason.
- **AI coding agents** of any vendor (Claude Code, Codex, Cursor, Copilot, Gemini CLI, Windsurf, and others): they write most UI code and need deterministic, per-site instructions.

## Product Purpose

Plumb is an open-source developer tool for Tailwind v4, CSS and React projects. It judges every styling choice by the CSS it compiles to (classes, stylesheets, `@apply`, inline styles), using the project's own Tailwind compiler, against the team's own tokens, component contracts and habits, and stops drift in CI with a reviewed ledger of exceptions. Success: drift found where people work (terminal, PR, browser, agent loop) with a message that says what is wrong, why it matters and exactly what to do.

## Positioning

It judges the compiled declaration, not the class spelling, so plain CSS, `@apply`, named utilities and inline styles are one problem with one answer; decisions are read from the project's own theme and token files, never hand-kept; every exception and new token is a reviewed line in one ledger.

## Constraints

- CLI first; agents use the CLI directly, taught by an agent-neutral instruction file. No MCP server.
- No single score; per-family coverage and new/fixed/debt instead.
- No inline suppressions; the ledger is the only exception path.
- No hosted service or dashboard.
- The browser overlay runs inside the project's existing dev server (no dedicated Plumb server), works on top of any app's styles, and never loads remote assets.
- MetalUI is the first user and benchmark, never a dependency of the core.

## Voice

Plain, fact-first sentences; no slogans, no internal jargon (say token, scale, Tailwind default); every finding follows docs/MESSAGES.md.
