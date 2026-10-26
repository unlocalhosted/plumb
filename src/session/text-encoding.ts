/** Keep ordinary labels as JSX text; use a literal for syntax or whitespace-sensitive labels. */
export function encodeJSXText(raw: string, to: string): string {
  const prefix = raw.match(/^\s*/)?.[0] ?? '', suffix = raw.match(/\s*$/)?.[0] ?? '';
  const value = /[{}<>&\r\n\t]|^\s|\s$/.test(to) ? `{${JSON.stringify(to)}}` : to;
  return prefix + value + suffix;
}

/** Preserve the authored quote style and the braces/spacing outside the literal. */
export function encodeTextLiteral(to: string, quote: string): string {
  let content = JSON.stringify(to).slice(1, -1);
  if (quote === "'") content = content.replace(/\\"/g, '"').replace(/'/g, "\\'");
  if (quote === '`') content = content.replace(/\\"/g, '"').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
  return quote + content + quote;
}

export const textWriteErrors = {
  parameters: 'Apply text requires a file, hash, run id, from string and to string.',
  empty: 'Replacement text must not be empty.',
  length: 'Replacement text must be at most 500 characters.',
  unknown: 'Unknown text run id. Read the element\'s text again.',
  mismatch: 'The text changed since the overlay read it. Read it again.',
} as const;

/** A JSX attribute string has no backslash escapes: the quote and anything entity-shaped are spelled as entities. */
export function encodeAttributeString(to: string, quote: string): string {
  const content = to.replace(/&(?=#x[\da-f]+;|#\d+;|[a-z][\da-z]*;)/gi, '&amp;').replaceAll(quote, quote === '"' ? '&quot;' : '&apos;');
  return quote + content + quote;
}
