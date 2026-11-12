// Types for the rule docs module (overlay/src/rule-docs.js), which the CLI imports as data.
export const DOCS_ORIGIN: string;
export function ruleAnchor(id: string): string;
export function docsUrl(rule: unknown, origin?: string): string | null;
