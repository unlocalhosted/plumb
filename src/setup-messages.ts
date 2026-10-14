import { createRequire } from 'node:module';
import { join } from 'node:path';

export const tailwindFix = 'Use Tailwind 4 in the project containing the CSS entry.';
export const reactOverlayFix = 'Add React to this development project to read and write source with the overlay. Plain CSS checks work without React.';

export function overlaySetupNotice(root: string): string {
  try { createRequire(join(root, 'package.json')).resolve('react'); return ''; }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'MODULE_NOT_FOUND') throw error;
    return `React is not installed. ${reactOverlayFix}\n\n`;
  }
}
