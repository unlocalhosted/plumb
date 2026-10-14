// Complete command acceptance, shared by CLI validation and reference generation.
// New flags must be opted into here; none inherit a universal fallback.
const common = ['root', 'config', 'help', 'version'];
const text = [...common, 'verbose'];
const report = [...text, 'json'];

export const commandFlags: Record<string, readonly string[]> = {
  check: [...report, 'base', 'changed', 'agent', 'sarif', 'format', 'strict-ledger', 'watch'],
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
  report: [...report, 'markdown', 'since'],
  parity: [...report, 'format', 'strict'],
  serve: [...common, 'port', 'stdio', 'overlay', 'origin', 'served-root'],
};
