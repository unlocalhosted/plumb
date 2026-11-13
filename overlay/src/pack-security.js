/* ─────────────────────────────────────────────────────────
 * PACK · SECURITY · React Plumber
 *
 * What the security pack is (docs/briefs/rule-packs.md). Plain data, read by the spec (craft-spec.js) on the page and
 * on the server. Its rules read source, not the page, so they run on the server (src/packs/security.ts).
 *
 * Where the rules come from: Chrome's Modern Web Guidance (github.com/GoogleChrome/modern-web-guidance-src, the npm
 * package modern-web-guidance, read at 1.0.0 on 2026-11-13, Apache-2.0), its `security` guide and the guides it points
 * to. A rule here is one piece of that advice made into a check; it names the guide and the section. Nothing of the
 * guide's text is copied: an agent retrieves it with `npx modern-web-guidance retrieve security`.
 *
 * Most of that guide is about what a server sends (CSP, cookies, HSTS, isolation headers). A front-end project's
 * source does not show those, so they are not rules here. What the source does show is.
 * ───────────────────────────────────────────────────────── */

const GUIDE = (id, section) => ({ id: `mwg-${id}`, name: `Modern Web Guidance: ${id}, ${section}`, guide: id });

export const SECURITY = {
  id: 'security',
  title: 'Security',
  // one line for a summary of findings: what they are, as a person would say it
  summary: 'can run others’ code',
  ground: 'Chrome Modern Web Guidance 1.0.0, security guide',
  source: { package: 'modern-web-guidance', version: '1.0.0', guide: 'security' },
  runs: 'source',
  // principle → rule short name → its entry. `source: true` marks a rule the server runs on source; it has a severity
  // (as a habit has), not a tier.
  spec: { safety: {
    'dom-sink': { source: true, severity: 'warn' },
    'postmessage-target': { source: true, severity: 'warn' },
    'message-origin': { source: true, severity: 'warn' },
    'trusted-types-pass-through': { source: true, severity: 'warn' },
    'cookie-flags': { source: true, severity: 'warn' },
    'subresource-integrity': { source: true, severity: 'warn' },
    'insecure-resource': { source: true, severity: 'warn' },
  } },
  words: {},
  laws: {
    'dom-sink': [GUIDE('security', '1.2 Avoid Dangerous DOM Sinks'), GUIDE('sanitize-untrusted-html', 'the modern way to insert untrusted HTML')],
    'postmessage-target': [GUIDE('security', '1.5 Secure Window Messaging'), GUIDE('validate-origins', 'comparing origins safely')],
    'message-origin': [GUIDE('security', '1.5 Secure Window Messaging'), GUIDE('validate-origins', 'comparing origins safely')],
    'trusted-types-pass-through': [GUIDE('security', '3.3 Trusted Types Enforcement'), GUIDE('trusted-types', 'defining a policy')],
    'cookie-flags': [GUIDE('security', '1.3 Secure Cookies')],
    'subresource-integrity': [GUIDE('security', 'Subresource Integrity (SRI)'), GUIDE('secure-external-subresources', 'integrity and crossorigin')],
    'insecure-resource': [GUIDE('security', '1.1 Secure Contexts')],
  },
};
