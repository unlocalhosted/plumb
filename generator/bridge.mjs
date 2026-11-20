// The bridge: a library part reads its own library's variables (--foreground, --accent, --surface, --space-3,
// --font-display …); the bridge answers each one with the product's token that does the same job, so the part reads
// as the product's. Colours and faces are matched by role (the words in token names); spaces and type sizes by
// nearest value on the product's own scale. Inside a slot the part also takes the look of the house part it replaces
// (its face, size and colour, from the specimen's sidecar), so only its behaviour is new.
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

// the product's tokens: name → value, first definition wins (the light scheme comes first in these files)
export async function tokensOf(product) {
  const tokens = new Map();
  for (const f of product.tokens) {
    const css = await readFile(join(product.root, f), 'utf8');
    for (const m of css.matchAll(/^\s*(--[a-z0-9-]+)\s*:\s*([^;]+);/gim)) if (!tokens.has(m[1])) tokens.set(m[1], m[2].trim());
  }
  return tokens;
}
// the variables a part reads and doesn't define itself
export async function variablesOf(dir, only) {
  const files = only ?? (await readdir(dir, { recursive: true })).filter((f) => /\.(css|tsx?|jsx?)$/.test(f));
  const read = new Set(), own = new Set();
  for (const f of files) {
    const s = await readFile(join(dir, f), 'utf8');
    for (const m of s.matchAll(/var\((--[a-z0-9-]+)/g)) read.add(m[1]);
    for (const m of s.matchAll(/(?:^|[;{\s])(--[a-z0-9-]+)\s*:/g)) own.add(m[1]);
  }
  return [...read].filter((v) => !own.has(v)).sort();
}

const px = (v) => { const m = /^(-?\d+(?:\.\d+)?)px$/.exec(String(v).trim()); return m ? +m[1] : null; };
// a role, and the names products give it, most specific first: semantic names (Tailwind's --color-*, shadcn's bare
// names) before a product's own (--ca-ink). A product's chart and numbered palette tokens never answer a role.
const ROLES = [
  [/^--(foreground|text-primary|text)$/, [/^--color-text-primary$/, /^--foreground$/, /-(ink|text-primary)$/]],
  [/^--text-secondary$/, [/^--color-text-secondary$/, /-(muted-strong|text-secondary)$/]],
  [/^--(text-muted|muted-foreground)$/, [/^--color-text-muted$/, /^--muted-foreground$/, /-(muted|text-muted)$/]],
  [/^--accent-strong$/, [/^--color-accent-text$/, /-(violet|brand|primary|accent)-(light|strong|deep)$/]],
  [/^--accent-(subtle|soft)$/, [/^--color-accent-100$/, /-(violet|brand|primary|accent)-(soft|subtle)$/]],
  [/^--accent-foreground$/, [/^--color-on-accent$/, /^--(primary|accent)-foreground$/, /-on-(violet|brand|primary|accent)$/]],
  [/^--(accent|primary|brand)$/, [/^--color-accent-solid$/, /^--color-action-solid$/, /^--primary$/, /-(violet|brand|primary)$/]],
  [/^--(surface|card|background)$/, [/^--color-surface$/, /^--(card|background)$/, /-(paper|surface)$/]],
  [/^--border-strong$/, [/^--color-border-strong$/, /-(line|border)-strong$/]],
  [/^--border$/, [/^--color-border-default$/, /^--border$/, /-(line|border)$/]],
  [/^--(danger|destructive|error)$/, [/^--color-danger-solid$/, /^--color-status-danger$/, /^--destructive$/, /-(fail|danger)$/]],
  [/^--font-display$/, [/-font-display$/]],
  [/^--font-(body|sans)$/, [/^--font-sans$/]],
  [/^--font-mono$/, [/^--font-mono$/]],
  [/^--duration-/, [/^--duration-(medium|standard|default)$/]],
  [/^--ease-/, [/^--ease-(smooth-out|standard|out-quart|default)$/]],
];
const NEVER = /-(viz|difficulty|instrument|chart)-|-\d+$|-hover$/;
const FIXED = { '--radius-pill': '999px', '--leading-body': '1.45', '--tracking-body': '0', '--tracking-display': '0',
  '--ease-standard': 'cubic-bezier(.22, 1, .36, 1)', '--duration-standard': '200ms', '--ease-spring': 'cubic-bezier(.34, 1.4, .64, 1)', '--duration-spring': '360ms' };
// a library's default steps, so a step can be placed on the product's scale by its size
const SPACE = (n) => n * 4; const TEXT = { xs: 12, sm: 14, base: 16, lg: 18, xl: 20, '2xl': 24, '3xl': 30, '4xl': 36 };

export function answer(variable, tokens) {
  // the product already answers a variable of the same name (its own --font-display, --ease-spring)
  if (tokens.has(variable)) return null;
  const names = [...tokens.keys()];
  for (const [role, wants] of ROLES) if (role.test(variable)) {
    for (const w of wants) { const hit = names.find((n) => w.test(n) && (w.source.startsWith('^--color') || !NEVER.test(n)) && (role.test('--accent-foreground') || !/-on-/.test(n))); if (hit) return `var(${hit})`; }
  }
  const sp = /^--space-(\d+)$/.exec(variable), tx = /^--text-([a-z0-9]+)$/.exec(variable);
  const nearest = (want, re) => { let best = null; for (const [n, v] of tokens) { const p = px(v); if (p != null && re.test(n) && (!best || Math.abs(p - want) < Math.abs(best[1] - want))) best = [n, p]; } return best ? `var(${best[0]})` : `${want}px`; };
  if (sp) return nearest(SPACE(+sp[1]), /space|gap|gutter/);
  if (tx && TEXT[tx[1]]) return nearest(TEXT[tx[1]], /type|text|font-size/);
  return FIXED[variable] ?? null;
}

// the bridge as CSS: one block for the organism, one per slot for the look of the house part it replaces
export async function bridge(product, parts, { scope = '[data-variant]', slotLooks = {} } = {}) {
  const tokens = await tokensOf(product);
  const lines = [], missed = [];
  const all = new Set(); for (const p of parts) for (const v of await variablesOf(p.dir, p.files)) all.add(v);
  for (const v of [...all].sort()) { const a = answer(v, tokens); if (a) lines.push(`  ${v}: ${a};`); else if (!tokens.has(v)) missed.push(v); }
  let css = `/* generated by generator/bridge.mjs for ${product.name}: the library parts' variables, answered by its tokens */\n${scope} {\n${lines.join('\n')}\n}\n`;
  for (const [slot, look] of Object.entries(slotLooks)) {
    css += `${scope} [data-slot="${slot}"] { --font-display: ${look.font}; --text-3xl: ${look.size}px; --foreground: ${look.color}; --tracking-display: 0; }\n${scope} [data-slot="${slot}"] > * { font-weight: inherit; line-height: 1.05; }\n`;
  }
  return { css, answered: lines.length, own: [...all].filter((v) => tokens.has(v)), missed };
}
