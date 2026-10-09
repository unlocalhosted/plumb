#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export function ledgerApproval({ growth, approvers, pullRequest, reviews }) {
  const names = new Set(approvers.split(/[\s,]+/).filter(Boolean).map(name => name.replace(/^@/, '').toLowerCase()));
  if (!growth) return { ok: true, message: 'Ledger did not grow.' };
  if (names.has(pullRequest.user.login.toLowerCase())) return { ok: true, message: 'PR author is a ledger approver.' };
  const latest = new Map();
  // Comments do not cancel an approval; a later dismissal or request for changes does.
  for (const review of [...reviews].sort((a, b) => (a.submitted_at ?? '').localeCompare(b.submitted_at ?? '') || a.id - b.id)) {
    if (['APPROVED', 'CHANGES_REQUESTED', 'DISMISSED'].includes(review.state) && review.user?.login) latest.set(review.user.login.toLowerCase(), review.state);
  }
  if ([...names].some(name => latest.get(name) === 'APPROVED')) return { ok: true, message: 'Ledger growth approved.' };
  return { ok: false, message: `Ledger grew (${growth} lines). Approval required from ${[...names].map(name => '@' + name).join(', ') || 'a configured ledger approver; set ledger-approvers'}.` };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const fixture = JSON.parse(await readFile(process.argv[2], 'utf8'));
  const result = ledgerApproval(fixture);
  process.stdout.write(JSON.stringify(result) + '\n');
  process.exitCode = result.ok ? 0 : 1;
}
