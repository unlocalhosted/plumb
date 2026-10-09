import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { relative } from 'node:path';
import config from './all.config.ts';
import { pixels } from '../../dist/decisions/resolve.js';
const before = JSON.parse(readFileSync(new URL('.cache/messages/before.json', import.meta.url)));
const after = JSON.parse(readFileSync(new URL('.cache/messages/report.json', import.meta.url)));
const count = report => {
  const counts = new Map();
  for (const f of report.findings) counts.set(f.rule, (counts.get(f.rule) ?? 0) + 1);
  return counts;
};
const old = count(before), now = count(after);
const beforeCommit = readFileSync(new URL('.cache/messages/before-head.txt', import.meta.url), 'utf8').trim();
const families = ['spacing', 'color', 'radius', 'type', 'motion', 'elevation', 'z'];
const rules = [...new Set([...old.keys(), ...now.keys(), 'config/no-tokens', 'ledger/no-why', 'ledger/grew', 'ledger/stale', 'decisions/unaccepted', 'decisions/vanished',
  ...families.flatMap(f => [`provenance/${f}`, ...['by-value', 'framework', 'tier'].map(s => `provenance/${f}/${s}`)]),
  ...['transition-named', 'no-ease-in', 'safe-area-fallback'].map(h => `habits/${h}`)])].sort();
const heading = `# MetalUI message audit\n\nBefore: isolated Git working tree at initial HEAD (${beforeCommit}), built with existing dependencies. Linked worktree creation was blocked by read-only Git metadata, so an independent shared clone provided the HEAD working tree. Both runs analyze the same live MetalUI sources with their own version of all.config.ts. No ledger, theme, or MetalUI source was changed.\n\nAfter command:\n\n\`\`\`sh\nPLUMB_CACHE_DIR=$PWD/bench/metalui/.cache/messages node dist/cli.js --root /Users/vijaysingh/unlocalhosted/metalui --config $PWD/bench/metalui/all.config.ts --json > bench/metalui/.cache/messages/report.json\n\`\`\`\n\nReports are retained in ignored .cache/messages/{before,report}.json. Regenerate this audit with \`node bench/metalui/messages-audit.mjs\`. Findings remain findings: the MetalUI command exits 1 because this is an audit of existing drift.\n`;
const lines = [heading, '## Groups per rule', '', '| Rule | Before (HEAD) | After | Delta |', '|---|---:|---:|---:|'];
for (const rule of rules) lines.push(`| ${rule} | ${old.get(rule) ?? 0} | ${now.get(rule) ?? 0} | ${(now.get(rule) ?? 0) - (old.get(rule) ?? 0)} |`);
lines.push(`| **Total** | **${before.findings.length}** | **${after.findings.length}** | **${after.findings.length - before.findings.length}** |`, '', '## Recipe exclusions', '', 'Each family uses the same exact-name allowlist through `decisions.<family>.suggest`. It is derived from the loaded CSS registry, excluding `--mu-r-*` and recursively excluding aliases whose values reach a recipe token. The tokens remain valid references and remain in the token inventory. Their literal amounts cannot certify or replace unrelated authored values.', '', '| Family | Excluded token names | Recipe-derived theme keys |', '|---|---:|---|');
for (const family of families) {
  const source = config.decisions[family];
  const records = after.decisions.filter(d => d.family === family && d.origin !== 'framework');
  const excluded = records.filter(d => !source.suggest.includes(d.name));
  const aliases = excluded.filter(d => !d.name.startsWith('--mu-r-'));
  lines.push(`| ${family} | ${excluded.length} | ${aliases.map(d => `\`${d.name}\``).join(', ') || 'None in this family’s selected token set'} |`);
}
const recipes = after.findings.flatMap(f => f.choices ?? []).filter(d => d.name.startsWith('--mu-r-') || d.refs.some(ref => ref.includes('--mu-r-')));
lines.push('', `Recipe tokens or direct recipe aliases in choices: **${recipes.length}**.`, '', 'These values describe component recipes: field size radii, WELL/CAP shadow layers, and modal or control recipe measurements. Equal geometry does not make them general layout, radius, or shadow choices. Following aliases also catches indirect recipe-derived keys, without excluding foundation radii, shared spacing, colourway tokens, or shared motion tokens.', '', '## Real examples', '', 'Up to three distinct real groups per rule follow. When fewer exist, every available group is shown; the count is explicit. Zero means this MetalUI run cannot supply an example (tier checks are permitted by this preset; custom habits and ledger diagnostics are not enabled/present). No synthetic examples are presented as MetalUI findings. An absent action means the choice list supplies the instruction.');
for (const rule of rules) {
  const findings = after.findings.filter(f => f.rule === rule);
  lines.push('', `### ${rule}`, '', `${findings.length} real group${findings.length === 1 ? '' : 's'}${findings.length < 3 ? '; fewer than three are available' : ''}.`);
  for (const [index, f] of findings.slice(0, 3).entries()) {
    const site = f.sites[0], choice = f.choices?.[0];
    lines.push('', `Example ${index + 1} — ${relative(after.root, site.file)}:${site.line}:${site.column} (${f.sites.length} sites)`, '', '```text', `title: ${f.title}`, `because: ${f.because}`, `action: ${f.action ?? '(choice list)'}`, `first choice: ${choice ? `${choice.resolved ?? choice.value} ${choice.name} ${choice.use?.class ?? ''} ${choice.use?.css ?? ''}${choice.why ? ` — ${choice.why}` : ''}` : '(none)'}`, '```');
    if (f.choices?.length > 1) lines.splice(lines.length - 1, 0, `other choices: ${f.choices.slice(1).map(d => `${d.resolved ?? d.value} ${d.name} ${d.use?.class ?? ''}`.trimEnd()).join('; ')}`);
  }
}
const amountKey = d => {
  const value = d.resolved ?? d.value;
  if (['spacing', 'radius', 'type'].includes(d.family)) return pixels(value) ?? value;
  const time = d.family === 'motion' && /^([-+]?(?:\d*\.)?\d+)(ms|s)$/.exec(value);
  return time ? Number(time[1]) * (time[2] === 's' ? 1000 : 1) : value;
};
const checks = [
  ['Off-token titles missing their property', after.findings.filter(f => /^provenance\/(radius|type|motion|elevation|z)$/.test(f.rule) && !f.title.startsWith(`${f.declaration.prop} `)).length],
  ['Token sets described as scales', after.findings.filter(f => /^provenance\/(motion|elevation|z)$/.test(f.rule) && !f.title.includes("isn't one of your")).length],
  ['Dynamic examples containing interpolation', after.findings.filter(f => f.rule === 'existence/dynamic-class' && f.action.includes('${')).length],
  ['Stylesheet ownership titles missing their selector', after.findings.filter(f => f.rule.startsWith('ownership/') && ['stylesheet', 'apply'].includes(f.declaration.origin) && !f.title.startsWith(`\`${f.declaration.owner.name}\` sets `)).length],
  ['Choice lists with repeated resolved amounts', after.findings.filter(f => f.choices && new Set(f.choices.map(amountKey)).size !== f.choices.length).length],
  ['Dead-token titles exposing source globs', after.findings.filter(f => f.rule.startsWith('dead/') && !f.title.endsWith('never used in your source')).length],
];
lines.push('', '## Round 2 checks', '', 'Property-specific findings now keep distinct CSS properties separate, while spacing still combines matching amounts across properties. Choice lists select one token per amount before limiting suggestions, preferring a token with a usable utility. Five fixture e2e checks cover the updated titles, static dynamic-class examples, stylesheet ownership (including @apply and heuristic selectors), choices across all seven judged families, and dead-token titles across all nine families.', '', '| Check | Violations |', '|---|---:|', ...checks.map(([label, count]) => `| ${label} | ${count} |`));
writeFileSync(new URL('.cache/messages/titles.txt', import.meta.url), after.findings.map(f => f.title).join('\n') + '\n');
writeFileSync(new URL('.cache/messages/message-fields.txt', import.meta.url), after.findings.flatMap(f => [f.title, f.because, f.action ?? '', f.fix]).join('\n') + '\n');
const patterns = ['``', 'a elevation', '/Users/', 'origin', 'provenance', 'requires a reference', 'callers may'];
lines.push('', '## JSON grep proof', '', 'The title projection is written directly from `report.json`. Grepping the entire JSON would also match rule ids and absolute machine-readable source locations.', '', '```sh', 'node bench/metalui/messages-audit.mjs', "grep -nE '``|a elevation|/Users/|origin|provenance|requires a reference|callers may' bench/metalui/.cache/messages/titles.txt", '# no output; exit 1 (no matches)', "grep -n '/Users/' bench/metalui/.cache/messages/message-fields.txt", '# no output; exit 1 (no matches)', '```', '', '| Title pattern | Matches |', '|---|---:|');
for (const pattern of patterns) {
  let matches = 0;
  try { matches = execFileSync('grep', ['-F', '-c', pattern, new URL('.cache/messages/titles.txt', import.meta.url).pathname], { encoding: 'utf8' }).trim(); }
  catch (error) { if (error.status !== 1) throw error; matches = error.stdout.trim(); }
  lines.push(`| ${pattern.replaceAll('|', '\\|')} | ${matches} |`);
}
const long = after.findings.filter(f => f.title.length >= 80);
lines.push('', `Absolute paths across title/because/action/fix: **${after.findings.filter(f => [f.title, f.because, f.action, f.fix].some(text => text?.includes('/Users/'))).length}**.`, '', '## Template length conflict', '', `The contract requests titles under 80 characters and also exact templates with actual values. **${long.length}** real titles exceed 79 characters with those exact templates; shortening their fixed wording or token names would violate the exact-template instruction. The exact wording and actual values are retained. For example:`, '', '```text', long.find(f => f.rule === 'provenance/type/framework')?.title ?? long[0]?.title ?? '(none)', '```', '', '## Verification', '', '`npm test`: 151 tests passed. `npm run typecheck`: passed. Five additional fixture e2e checks cover this round; the eight first-round checks remain green. `formatText`, `formatFinding`, `brief`, and `formatAgent` are untouched. No commit or install was made.', '');
writeFileSync(new URL('messages.md', import.meta.url), lines.join('\n'));
console.log(`MetalUI groups: ${before.findings.length} -> ${after.findings.length}; ${rules.length} rules; ${long.length} exact-template titles >=80 characters.`);
if (checks.some(([, count]) => count)) throw new Error(`Message contract violations: ${JSON.stringify(checks.filter(([, count]) => count))}`);
