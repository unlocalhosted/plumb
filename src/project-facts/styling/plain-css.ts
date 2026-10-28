import type { Detector } from '../detector.js';
import { lineOf } from '../detector.js';
import { claim } from '../facts.js';
import type { Detected } from '../support.js';

/** Plain CSS: a React app with stylesheets and no Tailwind claim; judged as stylesheets, values against tokens. */
export const stylingPlainCss: Detector = {
  id: 'styling.plain', reads: ['package.json'],
  detect(ctx) {
    const dependencies = ctx.dependencies();
    if (!dependencies.react && !dependencies.next) return {};
    if (dependencies.tailwindcss) return {};
    const text = ctx.read('package.json') as string;
    const file = ctx.cssFiles?.find(name => /\.css$/.test(name) && !/\.module\.css$/.test(name));
    const item: Detected = { id: 'plain-css', label: 'plain CSS', support: 'supported', source: 'inferred',
      evidence: [file ? ctx.evidence(file, 1, 'stylesheet') : ctx.evidence('package.json', lineOf(text, /"react"\s*:|"next"\s*:/), 'React app without Tailwind')] };
    return { styling: [claim<Detected>(item, 'inferred', item.evidence, this.id)] };
  },
};
