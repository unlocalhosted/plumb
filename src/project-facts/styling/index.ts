import type { Detector } from '../detector.js';
import { stylingTailwind } from './tailwind.js';
import { stylingPlainCss } from './plain-css.js';
import { stylingCssModules } from './css-modules.js';
import { stylingSass } from './sass.js';
import { stylingLess } from './less.js';
import { stylingPostcss } from './postcss.js';
import { stylingUnocss } from './unocss.js';
import { stylingPanda } from './panda.js';
import { stylingVanillaExtract } from './vanilla-extract.js';

/** Every styling system an app may mix; each detector claims its own entry with evidence and a support level. */
export const stylingRegistry: readonly Detector[] = [stylingTailwind, stylingPlainCss, stylingCssModules, stylingSass, stylingLess, stylingPostcss, stylingUnocss, stylingPanda, stylingVanillaExtract];
export { tailwindInstall, tailwindInstalled, tailwindImport } from './tailwind.js';
export { tokenSource } from './tokens.js';
export type { TokenSource } from './tokens.js';
