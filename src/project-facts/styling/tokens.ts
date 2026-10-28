import type { Context } from '../detector.js';
import { lineOf } from '../detector.js';
import type { Evidence } from '../facts.js';

export interface TokenSource { kind: '@theme' | 'shadcn' | 'custom-properties' | 'js-theme'; evidence: Evidence }

/** Where the design tokens are declared: `@theme`, shadcn's `@theme inline`, `:root` custom properties, or a JS theme object. */
export function tokenSource(ctx: Context): TokenSource | null {
  const shadcn = ctx.exists('components.json');
  let root: TokenSource | null = null;
  for (const file of ctx.cssFiles ?? []) {
    const text = ctx.read(file);
    if (typeof text !== 'string') continue;
    const css = text.replace(/\/\*[\s\S]*?\*\//g, '');
    if (shadcn && /@theme\s+inline\b/.test(css)) return { kind: 'shadcn', evidence: ctx.evidence(file, lineOf(css, /@theme\s+inline\b/), '@theme inline with components.json') };
    if (/@theme\b/.test(css)) return { kind: '@theme', evidence: ctx.evidence(file, lineOf(css, /@theme\b/), '@theme') };
    if (!root && /:root\s*\{[^}]*--[\w-]+\s*:/.test(css)) root = { kind: 'custom-properties', evidence: ctx.evidence(file, lineOf(css, /:root\s*\{/), ':root custom properties') };
  }
  if (root) return root;
  for (const file of ['theme.ts', 'theme.js', 'src/theme.ts', 'src/theme.js', 'src/styles/theme.ts', 'src/styles/theme.js', 'src/theme/index.ts', 'src/theme/index.js']) {
    const text = ctx.read(file);
    if (typeof text === 'string' && /export\s+(?:default\s+|const\s+\w+\s*=\s*)\{/.test(text)) return { kind: 'js-theme', evidence: ctx.evidence(file, lineOf(text, /export\s+/), 'theme object') };
  }
  return null;
}
