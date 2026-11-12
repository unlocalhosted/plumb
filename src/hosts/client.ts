import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

// bippy (MIT, react-grab's fiber and source layer) ships ES modules that only import each other, so they are served as is.
const vendor: Record<string, string> = { 'vendor/bippy/source.js': 'source.js', 'vendor/bippy/core.js': 'core.js', 'vendor/bippy/rdt-hook.js': 'rdt-hook.js' };
const bippy = () => dirname(createRequire(import.meta.url).resolve('bippy/source'));

export const overlayModules = [...Object.keys(vendor), 'THIRD_PARTY_NOTICES', 'client.js', 'src/api.js', 'src/errors.js', 'src/stamp.js', 'src/locate.js', 'src/sourcemap.js', 'src/sourcemap-worker.js', 'src/model.js', 'src/geometry.js', 'src/glyphs.js', 'src/choices.js', 'src/value.js', 'src/blueprint.js', 'src/blueprint-reader.js', 'src/blueprint-marks.js', 'src/blueprint-glass.js', 'src/blueprint-panel.js', 'src/craft.js', 'src/craft-rules.js', 'src/craft-headless.js', 'src/craft-facets.js', 'src/craft-read.js', 'src/craft-spec.js', 'src/craft-recommend.js', 'src/fixpanel.js', 'src/field.js', 'src/burst.js', 'src/nametag.js', 'src/typesystem.js', 'src/texteditor.js', 'src/elementcard.js', 'src/layoutcard.js', 'src/tidycard.js', 'src/hierarchy.js', 'src/laws.js', 'src/cleanup.js', 'src/show.js', 'src/stacks.js', 'src/colours.js', 'src/colour-pass.js', 'src/icon-pass.js', 'src/icons.js', 'src/scale.js', 'src/spacing-pass.js', 'src/words.js', 'src/verdict.js', 'src/select.js', 'src/inplace.js', 'src/editor-primitives.js', 'src/craft-run.js', 'src/text-edit.js', 'src/help.js', 'src/history.js', 'src/language.js', 'src/boxmodel.js', 'src/scrub.js', 'src/changes.js', 'src/readiness.js', 'src/widget.js', 'src/project-page.js', 'src/gravity.js', 'src/scale-marks.js', 'src/motion.js', 'src/specimen.js', 'src/cause-list.js', 'src/hydration.js', 'src/tokens.css', 'src/colour-system.js', 'src/ramp.js', 'src/rule-docs.js', 'src/roles.js', 'src/theme-source.js', 'src/speeds.js', 'src/speeds-pass.js', 'src/states.js', 'src/states-pass.js', 'src/radius.js', 'src/radius-pass.js', 'src/control-size.js', 'src/control-size-pass.js', 'src/elevation.js', 'src/elevation-pass.js', 'src/insets.js', 'src/picker.js', 'src/toys.js', 'src/kit.js', 'src/colourpick.js', 'src/scope.js', 'src/claims.js'];

// A file of the overlay's own sources, by name, that exists now: one added after the dev server started is served too
// (a fixed list read at start refused it, and the whole overlay failed to load until a restart). Only a plain name
// directly in overlay/src: no path can leave that folder
const OWN = /^src\/[a-z0-9][a-z0-9-]*\.(?:js|css)$/;
export const isOverlayModule = (module: string): boolean => overlayModules.includes(module) || (OWN.test(module) && existsSync(new URL('../../overlay/' + module, import.meta.url)));

/** Plain ES modules, served identically by every development host. */
export async function overlayClient(module = 'client.js'): Promise<string> {
  if (!isOverlayModule(module)) throw new Error('Unknown overlay module.');
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
