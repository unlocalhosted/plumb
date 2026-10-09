import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { collectClasses } from '../../dist/collect/classes.js';
import { projectSourceFiles } from '../../dist/project.js';

const root = resolve(process.env.METALUI_ROOT ?? '/Users/vijaysingh/unlocalhosted/metalui');
const report = JSON.parse(await readFile('bench/metalui/layer2.warm.json', 'utf8'));
assert.equal(report.root, root);
const config = (await import('./plumb.config.ts')).default;
const files = await projectSourceFiles(root, config);
const collected = await collectClasses(files.filter(file => /\.[jt]sx?$/.test(file)));
assert.equal(collected.styles.sites.filter(site => site.literal).length, report.coverage.inline.literalSites);
const location = site => `${relative(root, site.file)}:${site.line}:${site.column}`;
const actual = new Map(collected.styles.sites.map(site => [location(site.site), site]));
const groups = new Map();
const add = (category, value) => { if (!groups.has(category)) groups.set(category, []); groups.get(category).push(value); };
const matched = new Set();
const grep = [];
for (const file of files.filter(file => /\.[jt]sx?$/.test(file))) {
  const lines = (await readFile(file, 'utf8')).split('\n');
  for (const [index, line] of lines.entries()) {
    // Equivalent to rg -n 'style=\{\{[^}]*[0-9#][^}]*\}\}' on source files:
    // rg's default matching is one line, not a multiline negated-character class.
    for (const match of line.matchAll(/style=\{\{[^}]*[0-9#][^}]*\}\}/g)) {
      const key = location({ file, line: index + 1, column: match.index + 1 });
      const site = actual.get(key);
      matched.add(key);
      const row = { location: key, text: match[0], declarations: site?.declarations.map(declaration => ({ prop: declaration.prop, value: declaration.value, opaque: declaration.opaque })) ?? [] };
      grep.push(row);
      if (site?.literal) add('grep hit: literal declaration lowered', row);
      else if (!site) add('grep hit: code example/string, not JSX style', row);
      else if (site.declarations.some(declaration => declaration.opaque === 'spread')) add('grep hit: opaque object/spread/computed key', row);
      else if (/`.*\$\{/.test(match[0])) add('grep hit: template interpolation, opaque value', row);
      else add('grep hit: runtime expression/call/index, opaque value', row);
    }
  }
}
for (const [key, site] of actual) {
  if (!site.literal || matched.has(key)) continue;
  const row = { location: key, text: site.site.text, declarations: site.declarations.map(declaration => ({ prop: declaration.prop, value: declaration.value, opaque: declaration.opaque })) };
  if (site.oneHop) add('literal missed by grep: one-hop const', row);
  else if (site.site.text.includes('\n')) add('literal missed by grep: multiline object', row);
  else if (!/[0-9#]/.test(site.site.text)) add('literal missed by grep: strings without numbers/hex', row);
  else add('literal missed by grep: nested braces, casts or alternate spacing', row);
}

const hover = [];
for (const file of files.filter(file => file.endsWith('.css'))) {
  const css = await readFile(file, 'utf8');
  const declarations = report.declarations.filter(declaration => declaration.site.file === file && declaration.origin !== 'keyframes' && declaration.when.some(condition => condition.kind === 'pseudo' && condition.text === ':hover'));
  if (!declarations.length && !css.includes(':hover')) continue;
  const gated = declaration => {
    const media = declaration.when.filter(condition => condition.kind === 'media').map(condition => condition.text).join(' ');
    return { hover: /\(hover:\s*hover\)/.test(media), pointer: /\(pointer:\s*fine\)/.test(media) };
  };
  hover.push({ file: relative(root, file), rawHover: css.includes(':hover'), crudeUngated: css.includes(':hover') && !/hover:\s*hover|pointer:\s*fine/.test(css),
    declarations: declarations.length, hover: declarations.filter(declaration => gated(declaration).hover).length,
    pointer: declarations.filter(declaration => gated(declaration).pointer).length,
    both: declarations.filter(declaration => gated(declaration).hover && gated(declaration).pointer).length,
    neither: declarations.filter(declaration => !gated(declaration).hover && !gated(declaration).pointer).length,
    locations: [...new Set(declarations.map(declaration => `${declaration.site.line}:${declaration.site.column}`))],
  });
}
const physicalLines = rows => new Set(rows.map(row => row.location.slice(0, row.location.lastIndexOf(':')))).size;
const grepLines = physicalLines(grep);
const literalLines = new Set(collected.styles.sites.filter(site => site.literal).map(site => `${site.site.file}:${site.site.line}`)).size;
const evidence = { root, inline: report.coverage.inline, grepHits: grep.length, grepLines, literalLines, categories: Object.fromEntries(groups), hover };
await writeFile('bench/metalui/layer2.reconciliation.json', JSON.stringify(evidence, null, 2) + '\n');
const markdown = [
  '### Hover stylesheet reconciliation', '',
  `All ${hover.filter(row => row.declarations).length} source-glob docs stylesheets with positive ':hover' declaration conditions are below. Counts are declaration/selector contexts, not unique physical declarations: a comma selector produces separate contexts. No habit judgement runs in Layer 2.`, '',
  '| Docs stylesheet (under apps/docs/src) | Hover declarations | With (hover: hover) | With (pointer: fine) | With both | With neither | Crude grep says ungated |',
  '| --- | ---: | ---: | ---: | ---: | ---: | --- |',
  ...hover.map(row => `| ${row.file.replace('apps/docs/src/', '')} | ${row.declarations} | ${row.hover} | ${row.pointer} | ${row.both} | ${row.neither} | ${row.crudeUngated ? 'yes' : 'no'} |`), '',
  `File-level grep reproduces **${hover.filter(row => row.crudeUngated).length} ungated stylesheets**. Declaration conditions identify **${hover.filter(row => row.neither).length} stylesheets with ungated hover**. The difference is 'kds.css': it contains gated rules and therefore passes the crude file test, while ${hover.find(row => row.file.endsWith('/kds.css')).neither} hover declaration contexts have neither gate. Its ${hover.find(row => row.file.endsWith('/kds.css')).both} other hover contexts have both gates. There are no hover-only or pointer-only cases in this snapshot. All other 21 files agree with the crude claim.`, '',
  '### Inline literal reconciliation', '',
  'Re-run grep equivalent (one line; numeric spelling or hex marker inside the simple object match):', '',
  '```sh', String.raw`rg -n 'style=\{\{[^}]*[0-9#][^}]*\}\}' apps/docs/src -g '*.{tsx,jsx,ts,js}'`, '```', '',
  `Current pinned snapshot produces **${grepLines} matching lines containing ${grep.length} object matches**, rather than the historical **219**. Eleven additional matches share lines with other matched style attributes. The original exact expression/hit list was not saved, so the ${grepLines - 219}-line historical delta cannot honestly be assigned to individual old lines. A looser 'style={{.*[0-9#].*}}' matches 369 lines here because digits after the object also qualify; grep syntax materially affects the count. Neither figure measures literal values. The AST records **${report.coverage.inline.literalSites} sites with at least one literal declaration on ${literalLines} physical lines**, out of ${report.coverage.inline.sites} style attributes; ${report.coverage.inline.opaque} declarations are opaque, including ${report.coverage.inline.spreads} fully opaque objects/spreads/keys.`, '',
  '| Category | Sites/matches | Layer 2 treatment |', '| --- | ---: | --- |',
  ...[...groups].map(([category, rows]) => `| ${category} | ${rows.length} | ${category.includes('opaque') ? 'Known property retained with dynamic-value, or fully opaque object; later rules deferred.' : category.includes('not JSX') ? 'Not an executable JSX style attribute; excluded.' : 'Literal declarations retained; provenance/habits deferred.'} |`), '',
  'Every grep hit and every additional literal site is classified below. Locations include the style attribute column, so multiple attributes on one line remain distinct. Full text and lowered properties: [reconciliation JSON](bench/metalui/layer2.reconciliation.json). A Layer 2 pass here means the declaration was read, not that a future provenance rule accepts it.', '',
];
for (const [category, rows] of groups) {
  markdown.push(`#### ${category}`, '');
  const byFile = new Map();
  for (const row of rows) {
    const match = /^(.*):(\d+):(\d+)$/.exec(row.location);
    if (!byFile.has(match[1])) byFile.set(match[1], []);
    byFile.get(match[1]).push(`${match[2]}:${match[3]}`);
  }
  for (const [file, sites] of byFile) markdown.push(`- ${file}: ${sites.join(', ')}`);
  markdown.push('');
}
await writeFile('bench/metalui/layer2.reconciliation.md', markdown.join('\n').trimEnd() + '\n');
console.log(JSON.stringify({ grepHits: grep.length, grepLines, literalLines, categories: Object.fromEntries([...groups].map(([key, rows]) => [key, rows.length])), hoverFiles: hover.length }));
