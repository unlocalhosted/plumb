import type { Report } from './report.js';
import type { Cause } from './causes.js';
import { count } from './messages.js';

/*
 * A cause in words. The terminal (onboarding/path.ts) and the project page (project-page/system.ts) both say a cause
 * with this one function, so the page keeps the terminal's promise word for word (docs/design/onboarding.md, step 4).
 */

const nouns: Record<string, string> = { 'font-size': 'text size', 'font-weight': 'font weight', 'letter-spacing': 'letter spacing', 'line-height': 'line height', 'border-radius': 'corner radius' };
const families: Record<string, string> = { color: 'colour', spacing: 'spacing', radius: 'corner radius', type: 'text style', motion: 'timing', elevation: 'shadow', z: 'layer order' };
const stepOf: Record<string, string> = { color: 'your colours', spacing: 'your spacing', radius: 'your corner radii', type: 'your type scale', motion: 'your timings', elevation: 'your shadows', z: 'your layers' };

/** One cause in a sentence or two a person would say out loud: what they wrote, how many places, what their theme calls it. */
export function sayCause(cause: Cause, report: Report): string {
  const property = /^value:[^:]+:([a-z-]+):/.exec(cause.id)?.[1];
  const noun = (property && nouns[property]) ?? families[cause.family] ?? cause.family;
  const ways = cause.spellings.length;
  let text = cause.family === 'color'
    ? `You wrote ${cause.label} ${ways > 1 ? `${ways} ways, ` : ''}in ${count(cause.count, 'place')}.`
    : `You set ${noun} ${cause.label} ${ways > 1 ? `${ways} ways, ` : ''}in ${count(cause.count, 'place')}.`;
  const step = cause.suggestion && report.decisions.find(decision => decision.name === cause.suggestion!.token);
  const raw = step ? step.resolved ?? step.value : undefined;
  // a person says 16px, not 1rem; a colour's value (oklch(…)) says nothing a name doesn't
  const value = cause.family === 'color' ? undefined : raw && /^[\d.]+rem$/.test(raw) ? `${Number(raw.slice(0, -3)) * 16}px` : raw;
  if (cause.suggestion) {
    text += cause.suggestion.exact ? ` Your theme calls it ${cause.suggestion.name}.`
      : ` The closest in ${stepOf[cause.family] ?? 'your theme'} is ${cause.suggestion.name}${value ? ` (${value})` : ''}.`;
  }
  if (cause.rendersNothing) text += ` ${cause.rendersNothing === cause.count ? 'All of them render' : cause.rendersNothing === 1 ? '1 renders' : `${cause.rendersNothing} render`} nothing.`;
  return text;
}

