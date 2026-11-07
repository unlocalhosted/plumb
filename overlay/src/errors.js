// No side effects: loaded by words.js, which runs outside the page too (no document here).
// What an error is, by the server's code (docs/invariants/api-contract.md). An older server sends no code: its English
// is read as before, so a tab left open across an upgrade (or a downgrade) still tells a stale file from a refusal.
const SAID = { 'stale-file': /changed since|changed after/i, 'nothing-in-group': /Nothing in that group/i, 'no-census': /no census/i, 'not-found': /unknown|not found|404/i };
export function errorIs(error, code) {
  if (!error) return false;
  if (typeof error === 'string') return !!SAID[code]?.test(error);
  if (error.code) return error.code === code;
  if (code === 'not-found' && error.status === 404) return true;
  return !!SAID[code]?.test(error.message ?? error.error ?? '');
}
