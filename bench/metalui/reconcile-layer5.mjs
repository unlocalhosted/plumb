import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { relative, resolve } from 'node:path';
import { positivePseudo, hoverGated, selector } from '../../dist/habits/css.js';
import { collectClasses } from '../../dist/collect/classes.js';
import { projectSourceFiles } from '../../dist/project.js';
import { habits } from './layer5-habits.ts';
const root = process.env.METALUI_ROOT ?? '/Users/vijaysingh/unlocalhosted/metalui';
const load = name => readFile(`bench/metalui/layer5.${name}.json`, 'utf8').then(JSON.parse);
const docs = await load('docs.warm'), pkg = await load('package.warm'), parity = await load('parity');
const space = s => s.replace(/\s+/g, ' ').trim();
// Selector printing differences do not change the target: pseudo-element colon
// style and unquoted identifier attribute values are canonicalized for keys.
const canonical = s => space(s).replace(/::(before|after)\b/g, ':$1').replace(/\[([\w-]+)=["']([\w-]+)["']\]/g, '[$1=$2]');
const sourceKey = site => `${relative(root, site.file)}:${site.line}:${site.column}`;
const breakdown = [];
const css = resolve('bench/metalui/.cache/layer5/parity/styles.css');
const ids = { 'transition-named': 'transition-all', 'no-ease-in': 'ease-in', 'viewport-dynamic': 'viewport-units' };
const nativeDefault = await readFile('bench/metalui/layer5.native.txt', 'utf8');
const native = {};
const ledger = [];
function cssKeys(report, id) {
  const findings = report.findings.filter(f => f.rule === `habits/${id}`);
  const index = new Map();
  for (const f of findings) {
    const key = JSON.stringify([selector(f.declaration.when), f.declaration.prop, f.declaration.value]);
    const sites = index.get(key) ?? new Set(); f.sites.forEach(site => sites.add(`${site.file}:${site.line}:${site.column}`)); index.set(key, sites);
  }
  return report.declarations.filter(d => d.origin !== 'keyframes' && index.get(JSON.stringify([selector(d.when), d.prop, d.value]))?.has(`${d.site.file}:${d.site.line}:${d.site.column}`)).map(d => canonical(`${id}: ${selector(d.when)} ‖ ${d.prop}: ${space(d.value)}`));
}
for (const id of habits) {
  const ownId = ids[id] ?? id;
  const result = spawnSync(process.execPath, ['scripts/lint-css-habits.mjs', '--css', css, '--rule', ownId], { cwd: root, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
  assert.ifError(result.error); assert.equal(result.status, 0, result.stderr);
  const keys = result.stdout.split('\n').map(line => line.trim()).filter(Boolean).map(line => canonical(line.replace(`${ownId}:`, `${id}:`)));
  const nativeCss = keys.filter(key => !key.includes('packages/metalui/src/'));
  const nativeTsx = keys.filter(key => key.includes('packages/metalui/src/'));
  const measuredDefault = new RegExp(`lint-css-habits: ${ownId}: (\\d+) existing`).exec(nativeDefault);
  assert.ok(measuredDefault, `${ownId}: default native measurement missing`);
  assert.equal(keys.length, Number(measuredDefault[1]), `${ownId}: explicit emitted CSS must match native script's default temp compilation`);
  native[id] = { keys, css: nativeCss.length, tsx: nativeTsx.length };
  const plumbCss = cssKeys(parity, id);
  const count = list => list.reduce((m, key) => (m.set(key, (m.get(key) ?? 0) + 1), m), new Map());
  const a = count(nativeCss), b = count(plumbCss);
  let shared = 0, nativeOnly = 0, plumbOnly = 0;
  for (const key of new Set([...a.keys(), ...b.keys()])) {
    const original = a.get(key) ?? 0, plumb = b.get(key) ?? 0;
    shared += Math.min(original, plumb); nativeOnly += Math.max(0, original - plumb); plumbOnly += Math.max(0, plumb - original);
    let reason = 'Both judge this emitted CSS declaration identically.';
    if (original !== plumb) {
      if (id === 'overflow-clip' && original > plumb) reason = 'Native lint flags every hidden recipe. React Plumber requires decoration evidence and excludes scroll-axis, truncation, and height-transition semantics; it cannot prove clip is appropriate here.';
      else if (id === 'logical-inline' && plumb > original && /border-(top|bottom)-(left|right)-radius/.test(key)) reason = 'React Plumber additionally covers physical corners, which have logical start/end corner equivalents; the native side regex omits them.';
      else if (id === 'viewport-dynamic' && plumb > original && /\b[\d.]+vw\b/.test(key)) reason = 'Layer 5 explicitly includes vw as well as vh; native lint checks only vh.';
      else if (id === 'logical-inline' && plumb > original && key.includes('.progress-segment ‖ left: calc(')) reason = 'Native walkRules misses declarations directly inside nested @media with no nested rule. React Plumber preserves the parent selector and prefers-reduced-motion condition.';
      else reason = 'UNRECONCILED';
    }
    ledger.push({ id, key, native: original, plumb, reason });
  }
  assert.ok(!ledger.some(row => row.reason === 'UNRECONCILED'), `${id}: ${JSON.stringify(ledger.filter(row => row.reason === 'UNRECONCILED'))}`);
  // Native's TSX lane checks only components/blocks, while package React Plumber source
  // includes all package TSX/CSS. Retain each native token for exact site review.
  for (const key of nativeTsx) ledger.push({ id, key, native: 1, plumb: 0, reason: key.includes('navigation-menu') ? 'Navigation popup resizes through navigation-menu-popup height/width transitions; its viewport has no decoration-only evidence. CSS_HABITS explicitly reviews both as formatting/measurement exceptions.' : 'Scroll-area root participates in a scroll component. No decoration-only evidence; CSS_HABITS explicitly reviews this root as a scroll/formatting exception.' });
  breakdown.push({ id, nativeCss: nativeCss.length, plumbCss: plumbCss.length, shared, nativeOnly, plumbOnly, nativeTsx: nativeTsx.length, packageSource: pkg.habits.find(h => h.id === id).breaks, docs: docs.habits.find(h => h.id === id).breaks });
}
const stylesheetHover = [];
for (const file of [...new Set(docs.declarations.filter(d => d.site.file.endsWith('.css') && positivePseudo(selector(d.when), 'hover')).map(d => d.site.file))].sort()) {
  const declarations = docs.declarations.filter(d => d.site.file === file && d.origin !== 'keyframes' && positivePseudo(selector(d.when), 'hover'));
  const failed = declarations.filter(d => !hoverGated(d.when));
  stylesheetHover.push({ file: relative(root, file), hover: declarations.length, breaks: failed.length, gated: declarations.length - failed.length, sites: failed.map(d => ({ location: sourceKey(d.site), prop: d.prop, value: d.value, when: d.when })) });
}
const config = (await import('./layer5.config.ts')).default;
const files = await projectSourceFiles(root, config);
const classes = await collectClasses(files.filter(file => /\.[jt]sx?$/.test(file)));
const classHover = [];
for (const site of classes.sites.filter(site => /(^|:)hover:/.test(site.token))) {
  const declarations = docs.declarations.filter(d => ['class', 'arbitrary'].includes(d.origin) && d.site.file === site.file && d.site.line === site.line && d.site.column === site.column && d.site.text === site.token);
  const findings = docs.findings.filter(f => f.rule === 'habits/hover-gate' && f.sites.some(s => s.file === site.file && s.line === site.line && s.column === site.column));
  classHover.push({ location: sourceKey(site), token: site.token, declarations: declarations.length, findings: findings.map(f => f.key), reason: findings.length ? 'Compiler emits hover capability without fine-pointer capability.' : declarations.length ? 'Compiler-proven combined gate, or no positive hover declaration.' : 'No declaration: handled by existence rather than inventing a habit finding.' });
}
const grepHover = [];
for (const file of files.filter(file => /\.[jt]sx?$/.test(file))) for (const [i, line] of (await readFile(file, 'utf8')).split('\n').entries()) {
  for (const match of line.matchAll(/(?<![\w-])hover:[\w!\[\]-]+/g)) {
    const found = classHover.filter(site => site.location.startsWith(`${relative(root, file)}:${i+1}:`) && site.token.includes(match[0]));
    assert.ok(found.length, `Unaccounted hover grep: ${relative(root,file)}:${i+1} ${match[0]}`);
    grepHover.push({ file: relative(root, file), line: i+1, column: match.index+1, token: match[0], sites: found.map(site => site.location) });
  }
}
const head = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).stdout.trim();
const sourceFindings = pkg.findings.filter(f => f.rule.startsWith('habits/')).map(f => ({ rule: f.rule, prop: f.declaration.prop, value: f.declaration.value, selector: selector(f.declaration.when), sites: f.sites.map(site => ({ ...site, file: relative(root, site.file) })), reason: f.declaration.origin === 'class' || f.declaration.origin === 'arbitrary' ? 'React Plumber judges actual lowered class sites and their companions; native checks emitted utility definitions plus only overflow class strings.' : f.declaration.origin === 'inline' ? 'Inline declarations are inside React Plumber source globs; native CSS/overflow-string scans do not lower React style objects.' : f.sites.some(site => /\/icons\//.test(site.file)) ? 'Separately imported icon CSS is inside the package source globs but absent from styles.input.css emitted bundle; native script does not compile this CSS lane.' : 'React Plumber lowers all source utility definitions, including unused utilities. Native bundle contains only requested candidates; property extensions are reconciled in the emitted CSS ledger.' }));
const evidence = { head, sourceFindings, compiledSha256: createHash('sha256').update(await readFile(css)).digest('hex'), breakdown, native, ledger, stylesheetHover, classHover, grepHover };
await writeFile('bench/metalui/layer5.reconciliation.json', JSON.stringify(evidence, null, 2)+'\n');
console.log(JSON.stringify({ head, breakdown, hoverStylesheets: stylesheetHover.length, grepHover: grepHover.length, classHover: classHover.length }, null, 2));
