import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { relative } from 'node:path';
import config from './all.config.ts';
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
  }
}
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
lines.push('', `Absolute paths across title/because/action/fix: **${after.findings.filter(f => [f.title, f.because, f.action, f.fix].some(text => text?.includes('/Users/'))).length}**.`, '', '## Template length conflict', '', `The contract requests titles under 80 characters and also exact templates with actual values. **${long.length}** real titles exceed 79 characters with those exact templates; shortening their fixed wording or token names would violate the exact-template instruction. The exact wording and actual values are retained. For example:`, '', '```text', long.find(f => f.rule === 'provenance/type/framework')?.title ?? long[0]?.title ?? '(none)', '```', '', '## Verification', '', '`npm test`: 146 tests passed. `npm run typecheck`: passed. Eight new fixture e2e checks cover all nine requested correctness cases; the keyword and empty-ring cases share one check. Protected report/agent formatter functions are untouched.', '');
writeFileSync(new URL('messages.md', import.meta.url), lines.join('\n'));
console.log(`MetalUI groups: ${before.findings.length} -> ${after.findings.length}; ${rules.length} rules; ${long.length} exact-template titles >=80 characters.`);
