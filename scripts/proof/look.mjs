// A quick look at named checks on one test page: the narrow run (plumber craft --only), nothing compared and nothing
// written. For the proofs, use on-off.mjs and fix-undo.mjs once the batch has settled.
//
//   node scripts/proof/look.mjs --rules craft/figure-breaks,craft/rows-cut --page scripts/proof/pages/other-data.jsx
import { join } from 'node:path';
import { repo, servePage } from './serve.mjs';

const args = process.argv.slice(2);
const value = (name) => { const i = args.indexOf(`--${name}`); return i < 0 ? null : args[i + 1]; };
const only = (value('rules') ?? '').split(',').filter(Boolean);
if (!only.length || !value('page')) { console.error('Usage: node scripts/proof/look.mjs --rules <id,id> --page <App.jsx>'); process.exit(2); }
const { craftRun } = await import(join(repo, 'dist/craft-run.js'));
const served = await servePage(value('page')), t = Date.now();
try {
  const [page] = await craftRun({ url: served.url, routes: ['/'], root: served.root, timeout: 60000, only, proof: { without: [] } });
  for (const f of page.findings) console.log(`${f.rule} @ ${f.path}\n  ${f.title}\n  ${f.suggest?.kind === 'class' ? `${f.suggest.from ? `${f.suggest.from} → ` : '+'}${f.suggest.to}` : f.suggest?.text ?? 'no fix'}\n  ${JSON.stringify(f.evidence)}`);
  for (const e of page.thrown ?? []) console.log(`THREW ${e.rule}: ${e.error}`);
  console.log(`\n${page.findings.length} findings, ${page.read} elements read, ${((Date.now() - t) / 1000).toFixed(1)}s`);
} finally { await served.close(); process.exit(0); }
