import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { relative } from 'node:path';
import { collectClasses } from '../../dist/collect/classes.js';
import { pixels, resolveValue } from '../../dist/decisions/resolve.js';
import { selector, positivePseudo } from '../../dist/habits/css.js';
import config from './all.config.ts';

const cache = new URL('.cache/noise/', import.meta.url);
const before = JSON.parse(readFileSync(new URL('before.json', cache)));
const after = JSON.parse(readFileSync(new URL('after.json', cache)));
const authored = r => r.declarations.map(({ prop, value, when, site, origin }) => ({ prop, value, when, site, origin }));
assert.deepEqual(authored(after), authored(before), 'Source/compiler declarations changed during measurement');
const at = s => `${relative(before.root, s.file)}:${s.line}:${s.column}`;
const loc = s => JSON.stringify([s.file, s.line, s.column, s.text]);
const nextKeys = new Set(after.findings.map(f => f.key));
const oldKeys = new Set(before.findings.map(f => f.key));
const removed = before.findings.filter(f => !nextKeys.has(f.key));
const added = after.findings.filter(f => !oldKeys.has(f.key));
const counts = r => r.findings.reduce((m, f) => (m.set(f.rule, (m.get(f.rule) ?? 0) + 1), m), new Map());
const old = counts(before), now = counts(after);
const collected = await collectClasses([...new Set(before.declarations.filter(d => ['class', 'arbitrary'].includes(d.origin)).map(d => d.site.file))], config.classHelpers);
const contexts = new Map();
for (const s of collected.sites) { const values = contexts.get(loc(s)) ?? new Set(); if (s.context) values.add(s.context); contexts.set(loc(s), values); }
const sameElement = (a, b) => ['class', 'arbitrary'].includes(a.origin)
  ? [...contexts.get(loc(a.site)) ?? []].some(c => contexts.get(loc(b.site))?.has(c))
  : selector(a.when) === selector(b.when);
const scope = d => JSON.stringify(d.when.filter(c => !['selector', 'pseudo', 'branch'].includes(c.kind)));
const state = d => JSON.stringify(d.when.filter(c => ['pseudo', 'branch'].includes(c.kind)));
const amount = d => { const v = d.authoredCss ?? d.value; const resolved = resolveValue(v, new Map()) ?? d.resolved ?? v; return pixels(resolved) ?? resolved; };
const atDeclaration = (f, s) => before.declarations.find(d => loc(d.site) === loc(s) && d.prop === f.declaration.prop && d.value === f.declaration.value && selector(d.when) === selector(f.declaration.when)) ?? f.declaration;
const base = s => s.replace(/(?<!\\):focus-(visible|within)(?![\w-])/gi, '');
const classify = (f, onlySites = f.sites) => {
  const proof = [];
  if (f.rule.endsWith('/by-value') || f.rule === 'provenance/arbitrary') {
    const target = after.findings.find(n => n.rule === `provenance/${f.family}/by-value` && onlySites.every(s => n.sites.some(t => loc(t) === loc(s))));
    assert.ok(target, `Token-match warning vanished: ${f.key}`);
    for (const s of onlySites) {
      const edits = target.edits.filter(e => loc(e.site) === loc(s));
      assert.ok(edits.length, `Missing per-site token: ${at(s)}`);
      assert.ok(edits.some(e => f.decisions.some(d => d.name === e.token)), `Matching token changed: ${at(s)}`);
      proof.push({ site: s, tokens: edits.map(e => e.token), edits: edits.map(e => e.text), retainedIn: target.key });
    }
    return { category: f.rule === 'provenance/arbitrary' ? 'Equal arbitrary literal reclassified as token-match warning' : 'Token-match warnings regrouped by family', proof };
  }
  if (f.rule === 'habits/logical-inline') {
    for (const s of onlySites) {
      const d = atDeclaration(f, s), opposite = d.prop.replace(/left|right/, side => side === 'left' ? 'right' : 'left');
      const pair = before.declarations.find(p => p.prop === opposite && p.site.file === d.site.file && sameElement(d, p) && scope(d) === scope(p) && state(d) === state(p) && amount(d) === amount(p));
      assert.ok(pair, `No symmetric companion for ${at(s)} ${d.prop}`);
      proof.push({ site: s, declaration: d, companion: pair, reason: `${d.prop} = ${opposite} = ${amount(d)} under the same element, state and media; mirroring changes nothing.` });
    }
    return { category: 'Symmetric physical sides', proof };
  }
  if (f.rule === 'habits/focus-outline' && f.declaration.prop === 'box-shadow') {
    for (const s of onlySites) proof.push({ site: s, reason: 'This declaration only sets box-shadow. It does not suppress or change outline; focus-outline must judge actual outline suppression.' });
    return { category: 'Focus shadows mislabeled as outline removal', proof };
  }
  if (f.rule === 'habits/focus-outline') {
    for (const s of onlySites) {
      const d = atDeclaration(f, s);
      const ring = before.declarations.find(p => p.prop === 'box-shadow' && p.site.file === d.site.file &&
        (positivePseudo(selector(p.when), 'focus-visible') || positivePseudo(selector(p.when), 'focus-within')) && base(selector(p.when)) === base(selector(d.when)) && scope(p) === scope(d));
      assert.ok(ring, `No focus ring companion for ${at(s)}`);
      proof.push({ site: s, declaration: d, companion: ring, reason: `Visible focus ring supplied by ${selector(ring.when)}: ${ring.value}` });
    }
    return { category: 'Outline suppression with visible focus ring', proof };
  }
  assert.fail(`Unaccounted removed group: ${f.rule} ${f.key}`);
};
const reconciled = removed.map((f, i) => ({ id: `G${String(i + 1).padStart(3, '0')}`, key: f.key, rule: f.rule, title: f.title, ...classify(f) }));
const partial = [];
for (const f of before.findings.filter(f => nextKeys.has(f.key))) {
  const next = after.findings.find(n => n.key === f.key), sites = f.sites.filter(s => !next.sites.some(t => loc(t) === loc(s)));
  if (sites.length) partial.push({ key: f.key, rule: f.rule, title: f.title, ...classify(f, sites) });
}
assert.ok(added.every(f => f.rule.endsWith('/by-value')), 'Unexpected added groups');
assert.equal(before.findings.length - removed.length + added.length, after.findings.length);
writeFileSync(new URL('reconciliation.json', cache), JSON.stringify({ before: before.findings.length, after: after.findings.length, removed: reconciled, added: added.map(f => ({ key: f.key, rule: f.rule, sites: f.sites })), partial }, null, 2) + '\n');
const escape = value => String(value).replaceAll('|', '\\|').replaceAll('\n', ' ');
const line = proof => proof.companion ? `${proof.reason ?? ''} Companion ${at(proof.companion.site)}: ${proof.companion.site.text}` : proof.tokens ? `Retained warning: ${proof.tokens.join(', ')}. ${proof.edits.join(' ')}` : proof.reason;
const lines = ['# Item 6: noise pass', '', `MetalUI: **${before.findings.length} → ${after.findings.length} groups**, **${before.findings.length - after.findings.length} fewer (${((1-after.findings.length/before.findings.length)*100).toFixed(1)}%)**. No rule disabled; all.config.ts, MetalUI sources, tokens and ledger unchanged. Source/compiler declarations compare exactly between reports.`, '',
'## Measurement', '', '```sh', 'npm run build', 'PLUMB_CACHE_DIR=$PWD/bench/metalui/.cache/noise node dist/cli.js --root /Users/vijaysingh/unlocalhosted/metalui --config $PWD/bench/metalui/all.config.ts --json > bench/metalui/.cache/noise/before.json', '# After implementation: same command, redirect to after.json', 'node bench/metalui/noise-audit.mjs', '```', '',
'Reports and per-site proof: ignored `bench/metalui/.cache/noise/{before,after,reconciliation}.json`. Audit exits nonzero on any unaccounted removal, changed compiler/source declaration, lost token match, missing symmetric companion, or missing focus-ring companion. Analysis exits 1 because existing drift remains.', '',
'## Groups per rule', '', '| Rule | Before | After | Delta |', '|---|---:|---:|---:|'];
for (const rule of [...new Set([...old.keys(), ...now.keys()])].sort()) lines.push(`| ${rule} | ${old.get(rule) ?? 0} | ${now.get(rule) ?? 0} | ${(now.get(rule) ?? 0)-(old.get(rule) ?? 0)} |`);
lines.push(`| **Total** | **${before.findings.length}** | **${after.findings.length}** | **${after.findings.length-before.findings.length}** |`, '', '## Ten largest groups', '', 'Including informational dead-token inventory; no published-token override added to improve the count.');
for (const [label, r] of [['Before', before], ['After', after]]) {
 lines.push('', `### ${label}`, '', '| Rule | Sites | Title | First three real sites |', '|---|---:|---|---|');
 for (const f of [...r.findings].sort((a,b)=>b.sites.length-a.sites.length).slice(0,10)) lines.push(`| ${f.rule} | ${f.sites.length} | ${escape(f.title)} | ${f.sites.slice(0,3).map(s=>`${at(s)}: ${escape(s.text)}`).join('<br>')} |`);
}
lines.push('', '## Removal categories', '', '| Category | Old groups replaced/removed | Site rows retained/cleared |', '|---|---:|---:|');
for (const category of [...new Set(reconciled.map(r=>r.category))]) {
 const items=reconciled.filter(r=>r.category===category);
 lines.push(`| ${category} | ${items.length} | ${items.reduce((n,r)=>n+r.proof.length,0)} |`);
}
lines.push('', `${removed.length} old groups removed/replaced; ${added.length} family warning groups added; net reduction ${removed.length-added.length}. ${partial.length} retained groups also lost noise sites; these are listed below separately. By-value warnings remain real token-linking advice: the noise was per-value interruption, not the evidence.`, '', '## Changes and real examples', '',
'- Equal literals default to warn and one finding per family. Title uses the physical-site count. Every site/token/edit is retained, including equal arbitrary literals previously mislabeled as drift. `--verbose` or `decisions.<family>.byValue: "each"` restores per-value warnings; `--agent` also expands them to keep edits unambiguous. `identity: "value"` continues to accept equal literals.',
'- Logical-inline ignores equal physical pairs and positive `[dir=ltr/rtl]` / `:dir(ltr/rtl)` constraints. Asymmetric sides, text alignment, float and clear remain judged; branch, media, pseudo and element boundaries remain. Negated/descendant/alternative direction tests do not certify unrestricted selectors.',
'- Actual outline removal passes with a visible same-element focus-visible/focus-within ring or ring utility. Zero/transparent rings, other elements, pseudo-elements, conditional branches and restricted media do not certify the base. A box-shadow declaration itself cannot remove an outline.',
'- Elevation without a semantic shadow tier uses one “No tokens fit” action per finding. No NEEDS-DECISION repetition added. MetalUI has named semantic shadows, so this wording change removes zero MetalUI groups.',
'- Runtime values already group once per file as info, summarized by the unchanged formatter; 65 groups retained. `--verbose` lists them. `init` now proposes only hover-gate, focus-outline, transition-named and no-ease-in; all other habits remain explicit opt-ins. No benchmark habit disabled.',
'- Type context is emitted in JSON `configHints.type` and once by the CLI. Existing type drift remains. The roadmap example `utility:type-*` is not implemented by the reader; the hint gives supported `theme:--text-*` rather than recommending a selector that drops project tokens.', '',
'Three real removed-group examples per category follow. Complete group accounting and per-site proof follow them. Direction-specific selectors, same-element class-ring passes, primitive-only shadow messaging and init defaults are covered by fixture E2E; no MetalUI group removal is attributed to those when the live corpus supplies none.');
for(const category of [...new Set(reconciled.map(r=>r.category))]) {
 lines.push('',`### ${category}`);
 for(const r of reconciled.filter(r=>r.category===category).slice(0,3)) lines.push('', `- ${r.id}: ${at(r.proof[0].site)} — ${r.title}`, `  ${line(r.proof[0])}`);
}
lines.push('', '## Every removed/replaced group', '', '| ID | Rule | Title | All sites and proof |', '|---|---|---|---|');
for(const r of reconciled) lines.push(`| ${r.id} | ${r.rule} | ${escape(r.title)} | ${r.proof.map(p=>`${at(p.site)}: ${escape(line(p))}`).join('<br>')} |`);
lines.push('', '## Noise sites removed from retained groups', '');
for(const r of partial) lines.push(`- ${r.rule}: ${r.title}`, ...r.proof.map(p=>`  - ${at(p.site)}: ${line(p)}`));
lines.push('', '## Remaining findings and acceptance', '',
'10px/14px/−3px spacing, raw weights 400/500, z-index 2, ungated hover and tokenless literal shadow stacks remain. No evidence justifies calling these noise or suppressing them. Library dead tokens remain informational; exported inventory was not changed.', '',
'The original roadmap’s under-400 target is not met by honest noise removal on this corpus. This task’s revised acceptance is a substantial reduction with every removed group justified: 18.5%, with every disappearance reconciled and all actual findings retained. Reaching 400 would require separate configuration/product decisions or unsupported suppression.', '',
'## Verification', '',
'- Six new feature-slice E2E checks cover token grouping/default/verbose/config/agent, RTL boundaries, focus companions and shadow-only declarations, elevation messaging, type hints, and init opt-ins.',
'- Existing message-choice E2E uses verbose to inspect individual choices; elevation expectations reflect the new no-fit wording. Existing adoption transcript expects the four roadmap habits.',
'- `npm test`: 186 tests passed (0 failed); final transcript in `.cache/noise/tests.txt`. `npm run typecheck`: passed.',
'- No commits or installs made. `formatText`, `formatFinding`, `brief`, `formatAgent`, `src/surfaces/hooks.ts`, and install code untouched.', '');
writeFileSync(new URL('../../docs/roadmap/6-noise.md', import.meta.url), lines.join('\n'));
console.log(`${before.findings.length} -> ${after.findings.length}; ${removed.length} removed/replaced, ${added.length} added; every removal accounted for.`);
