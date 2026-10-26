import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

// bippy (MIT, react-grab's fiber and source layer) ships ES modules that only import each other, so they are served as is.
const vendor: Record<string, string> = { 'vendor/bippy/source.js': 'source.js', 'vendor/bippy/core.js': 'core.js', 'vendor/bippy/rdt-hook.js': 'rdt-hook.js' };
const bippy = () => dirname(createRequire(import.meta.url).resolve('bippy/source'));

export const overlayModules = [...Object.keys(vendor), 'THIRD_PARTY_NOTICES', 'client.js', 'src/api.js', 'src/locate.js', 'src/sourcemap.js', 'src/sourcemap-worker.js', 'src/model.js', 'src/geometry.js', 'src/glyphs.js', 'src/choices.js', 'src/blueprint.js', 'src/blueprint-fix.js', 'src/blueprint-reader.js', 'src/blueprint-marks.js', 'src/blueprint-glass.js', 'src/blueprint-panel.js', 'src/text-edit.js', 'src/readiness.js', 'src/widget.js', 'src/tokens.css'];

/** Plain ES modules, served identically by every development host. */
export async function overlayClient(module = 'client.js'): Promise<string> {
  if (!overlayModules.includes(module)) throw new Error('Unknown overlay module.');
  if (module === 'THIRD_PARTY_NOTICES') return readFile(new URL('../../THIRD_PARTY_NOTICES', import.meta.url), 'utf8');
  if (vendor[module]) {
    const [code, notices] = await Promise.all([readFile(join(bippy(), vendor[module]), 'utf8'), overlayClient('THIRD_PARTY_NOTICES')]);
    // bippy retains its own header but flattens embedded dependencies. Keep
    // every copyright and permission notice in a bundler-preserved banner.
    return `/*!\n${notices.replaceAll('*/', '* /')}*/\n${code}`;
  }
  // Ship the audited ES modules; an old, untracked overlay/dist bundle must
  // never replace them or silently discard dependency license headers.
  return readFile(new URL('../../overlay/' + module, import.meta.url), 'utf8');
}
