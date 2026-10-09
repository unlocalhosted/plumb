import { fileURLToPath } from 'node:url';
import { habits } from './layer5-habits.ts';
// The native oracle judges the emitted bundle, including generated utilities.
// Match its CSS lane separately from authored source globs and TSX call sites.
export default {
  css: 'packages/metalui/styles.input.css',
  source: [fileURLToPath(new URL('.cache/layer5/parity/styles.css', import.meta.url))],
  habits,
};
