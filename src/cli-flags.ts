// Complete command acceptance, shared by CLI validation and reference generation.
// New flags must be opted into here; none inherit a universal fallback.
const common = ['root', 'config', 'help', 'version'];
const text = [...common, 'verbose'];
const report = [...text, 'json'];

export const commandFlags: Record<string, readonly string[]> = {
  check: [...report, 'base', 'changed', 'agent', 'sarif', 'format', 'strict-ledger', 'watch', 'all', 'broken', 'family', 'file', 'rule', 'new', 'debt'],
  presets: report,
  habits: report,
  decisions: [...report, 'family'],
  explain: report,
  imitation: [...report, 'suggest'],
  try: [...report, 'agent', 'lang', 'as'],
  init: [...report, 'force'],
  baseline: [...report, 'force'],
  accept: [...report, 'why', 'rule', 'site'],
  'accept-decisions': [...report, 'why'],
  ledger: [...report, 'ratchet', 'prune', 'rebase'],
  show: report,
  why: report,
  'agent-docs': report,
  install: [...text, 'agent', 'list', 'hooks', 'ci', 'overlay', 'write'],
  doctor: text,
  fix: [...common, 'yes'],
  report: [...report, 'markdown', 'since'],
  parity: [...report, 'format', 'strict'],
  craft: [...report, 'url', 'routes', 'sarif', 'timeout'],
  serve: [...common, 'port', 'stdio', 'overlay', 'origin', 'served-root'],
};

/** Suggestions come from the accepted vocabulary, never a second command list. */
export function closeName(input: string, names: readonly string[]): string | undefined {
  let closest: string | undefined, best = Math.min(2, Math.floor(input.length / 3));
  for (const name of names) {
    let row = Array.from({ length: name.length + 1 }, (_, index) => index);
    for (let i = 1; i <= input.length; i++) {
      const next = [i];
      for (let j = 1; j <= name.length; j++) next[j] = Math.min(next[j - 1]! + 1, row[j]! + 1, row[j - 1]! + Number(input[i - 1] !== name[j - 1]));
      row = next;
    }
    const distance = row[name.length]!;
    if (distance <= best && (closest === undefined || distance < best)) { closest = name; best = distance; }
  }
  return closest;
}

export function unknownName(kind: 'command' | 'option', input: string, names: readonly string[]): string {
  const match = closeName(input, names);
  return `Unknown ${kind} ${input}.${match ? ` Did you mean ${match}?` : '\n  → plumber --help'}`;
}
