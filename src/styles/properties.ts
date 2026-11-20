/**
 * The properties a style change can be about, once (docs/briefs/css-parity.md, layer 0): for each, the declarations
 * that carry it in CSS, its own name first, then the shorthands that set it too. The rule system uses it to find the
 * declaration that wins; the page reads the same table (GET style-properties) instead of keeping a copy.
 */
const side = (box: 'padding' | 'margin', s: 'top' | 'right' | 'bottom' | 'left') => {
  const logical = { top: ['block-start', 'block'], bottom: ['block-end', 'block'], left: ['inline-start', 'inline'], right: ['inline-end', 'inline'] }[s];
  return [`${box}-${s}`, `${box}-${logical[0]}`, `${box}-${logical[1]}`, box];
};
const corner = (c: 'top-left' | 'top-right' | 'bottom-right' | 'bottom-left') => [`border-${c}-radius`, 'border-radius'];

export const PROPERTIES: Record<string, { carriers: string[] }> = Object.fromEntries(Object.entries({
  'font-size': ['font-size', 'font'], 'line-height': ['line-height', 'font'], 'font-weight': ['font-weight', 'font'], 'font-family': ['font-family', 'font'],
  'letter-spacing': ['letter-spacing'], 'text-transform': ['text-transform'],
  color: ['color'], 'background-color': ['background-color', 'background'], 'border-color': ['border-color', 'border'],
  'border-width': ['border-width', 'border'], 'box-shadow': ['box-shadow'],
  'border-radius': ['border-radius'],
  'border-top-left-radius': corner('top-left'), 'border-top-right-radius': corner('top-right'),
  'border-bottom-right-radius': corner('bottom-right'), 'border-bottom-left-radius': corner('bottom-left'),
  gap: ['gap'], 'row-gap': ['row-gap', 'gap'], 'column-gap': ['column-gap', 'gap'],
  width: ['width'], height: ['height'], 'max-width': ['max-width'], 'min-height': ['min-height'],
  'padding-top': side('padding', 'top'), 'padding-right': side('padding', 'right'), 'padding-bottom': side('padding', 'bottom'), 'padding-left': side('padding', 'left'),
  'margin-top': side('margin', 'top'), 'margin-right': side('margin', 'right'), 'margin-bottom': side('margin', 'bottom'), 'margin-left': side('margin', 'left'),
  'flex-direction': ['flex-direction', 'flex-flow'], 'align-items': ['align-items', 'place-items'], 'justify-content': ['justify-content', 'place-content'],
  'flex-wrap': ['flex-wrap', 'flex-flow'], flex: ['flex'], 'object-fit': ['object-fit'], 'aspect-ratio': ['aspect-ratio'],
}).map(([prop, carriers]) => [prop, { carriers }]));

/** The declarations that carry `prop`: its own name alone when it isn't in the table. */
export const carriersOf = (prop: string): string[] => PROPERTIES[prop]?.carriers ?? [prop];
