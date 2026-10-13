import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

// bippy (MIT, react-grab's fiber and source layer) ships ES modules that only import each other, so they are served as is.
const vendor: Record<string, string> = { 'vendor/bippy/source.js': 'source.js', 'vendor/bippy/core.js': 'core.js', 'vendor/bippy/rdt-hook.js': 'rdt-hook.js' };
const bippy = () => dirname(createRequire(import.meta.url).resolve('bippy/source'));

export const overlayModules = [...Object.keys(vendor), 'client.js', 'src/api.js', 'src/locate.js', 'src/sourcemap.js', 'src/sourcemap-worker.js', 'src/model.js', 'src/geometry.js', 'src/glyphs.js', 'src/choices.js', 'src/blueprint.js', 'src/blueprint-reader.js', 'src/blueprint-marks.js', 'src/widget.js', 'src/tokens.css'];

/** Plain ES modules, served identically by every development host. */
export async function overlayClient(module = 'client.js'): Promise<string> {
  if (!overlayModules.includes(module)) throw new Error('Unknown overlay module.');
  if (vendor[module]) return readFile(join(bippy(), vendor[module]), 'utf8');
  if (module !== 'client.js') return readFile(new URL('../../overlay/' + module, import.meta.url), 'utf8');
  try { return await readFile(new URL('../../overlay/dist/client.js', import.meta.url), 'utf8'); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  return readFile(new URL('../../overlay/client.js', import.meta.url), 'utf8');
}
