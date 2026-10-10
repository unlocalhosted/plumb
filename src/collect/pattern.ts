import picomatch from 'picomatch';
import { sep } from 'node:path';

const matchers = new Map<string, (file: string) => boolean>();
/** Match retained names with the same dot/brace/extglob semantics as tinyglobby. */
export function matchesPath(file: string, pattern: string): boolean {
  if (sep === '\\') { file = file.replaceAll('\\', '/'); pattern = pattern.replaceAll('\\', '/'); }
  let matcher = matchers.get(pattern);
  if (!matcher) {
    if (matchers.size >= 256) matchers.clear();
    matcher = picomatch(pattern, { dot: true, posix: true });
    matchers.set(pattern, matcher);
  }
  return matcher(file);
}
