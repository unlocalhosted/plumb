// Run the real CLI against a frozen, pre-change analyzer response. No clocks,
// source paths or cache state can perturb the machine-output byte comparison.
import { registerHooks } from 'node:module';
import { readFileSync } from 'node:fs';
const report = readFileSync(new URL('./input.json', import.meta.url), 'utf8');
registerHooks({
  load(url, context, next) {
    if (url.endsWith('/dist/index.js')) return { format: 'module', shortCircuit: true,
      source: `export const check = async () => (${report}); export const explain = check; export const trySnippet = check;` };
    if (url.endsWith('/dist/check-cache.js')) return { format: 'module', shortCircuit: true,
      source: 'export class CheckCache { static async create() { return undefined; } }' };
    return next(url, context);
  },
});
