/* ─────────────────────────────────────────────────────────
 * RULE DOCS · React Plumber (browser and server)
 *
 * Where a rule is read about: the one place a rule id becomes a URL. Every surface that shows a craft finding reads it
 * here: the overlay's "i" beside a finding (fixpanel.js, blueprint-panel.js, elementcard.js), the CLI's line under a
 * finding and the `docs` field of `check --json` (src/craft-run.ts). The page is the site's rules reference
 * (site/src/docs/pages/rules.mdx), which gives every rule a heading whose id is the rule id with slashes as dashes.
 *
 *  DOCS_ORIGIN   where the docs site lives. The site isn't deployed yet (owner, 2026-11-05: "configurable, default
 *                TBD"): change it here when it ships. PLUMBER_DOCS_ORIGIN overrides it where there is an environment
 *                (the CLI, the session server), e.g. the site's dev server while working on the docs.
 *  docsUrl       a rule id → its page, or null for a rule with no page (only craft rules get the "i" for now)
 * ───────────────────────────────────────────────────────── */

export const DOCS_ORIGIN = 'https://plumber.unlocalhosted.dev';

// the same anchor the rules reference gives a rule's heading (site/src/docs/reference.jsx anchorOf)
export const ruleAnchor = (id) => String(id).replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();

const envOrigin = () => (typeof process !== 'undefined' && process.env?.PLUMBER_DOCS_ORIGIN) || null;

export function docsUrl(rule, origin = envOrigin() ?? DOCS_ORIGIN) {
  if (typeof rule !== 'string' || !/^craft\/[a-z0-9-]+$/.test(rule)) return null;
  return `${String(origin).replace(/\/+$/, '')}/docs/rules#${ruleAnchor(rule)}`;
}
