export function importedClasses(active: boolean) {
  const dimensions = 'px-[10px]';
  return `${dimensions} ${active ? 'gap-[10px]' : 'gap-[999px]'}`;
}
export const cls = { chosen: 'm-[10px]', ignored: 'm-[999px]' };
export function neverExecute() { throw new Error('must never execute'); }
