#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { appendFile, mkdtemp, readFile, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { ledgerApproval } from './approval.mjs';

const marker = '<!-- plumb-summary -->';
const temp = await mkdtemp(join(tmpdir(), 'plumb-action-'));
try {
  const actionRoot = fileURLToPath(new URL('../../', import.meta.url));
  const root = resolve(process.env.PLUMB_WORKING_DIRECTORY || '.');
  const event = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, 'utf8'));
  const base = process.env.PLUMB_BASE || event.pull_request?.base?.sha;
  if (!base) throw new Error('Plumb Action requires a PR base or the base input. Fetch base history with checkout fetch-depth: 0.');
  const summaryFile = join(temp, 'summary.md');
  const cli = join(actionRoot, 'dist/cli.js');
  const args = [cli, 'check', '--root', root, '--base', base];
  const run = format => {
    const result = spawnSync(process.execPath, [...args, ...format], { encoding: 'utf8', maxBuffer: 128 * 1024 * 1024, env: { ...process.env, GITHUB_STEP_SUMMARY: summaryFile } });
    if (result.error) throw result.error;
    if (result.status === null || result.status > 1) throw new Error(result.stderr || `plumb check exited ${result.status}.`);
    return result;
  };
  const checked = run(['--format', 'github']);
  // Only annotations enter the workflow-command parser. Authored markdown is a file.
  for (const line of checked.stdout.split('\n')) if (/^::(error|warning|notice) /.test(line)) process.stdout.write(line + '\n');
  const summary = await readFile(summaryFile, 'utf8');
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, summary);
  const report = JSON.parse(run(['--json']).stdout);
  let approval = { ok: true, message: 'No PR review gate.' };
  if (event.pull_request) {
    if (!process.env.GITHUB_TOKEN) throw new Error('Set GITHUB_TOKEN with pull-requests: write for the sticky comment and review gate.');
    const repository = event.repository.full_name.split('/').map(encodeURIComponent).join('/');
    const apiRoot = process.env.GITHUB_API_URL || 'https://api.github.com';
    const api = async (path, method = 'GET', body) => {
      const response = await fetch(apiRoot + path, { method, headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
      if (!response.ok) throw new Error(`GitHub ${method} ${path}: ${response.status}. Check token permissions (pull-requests: write).`);
      return response.status === 204 ? undefined : response.json();
    };
    const list = async path => {
      const records = [];
      for (let page = 1; ; page++) {
        const batch = await api(`${path}?per_page=100&page=${page}`);
        if (!Array.isArray(batch)) throw new Error('Expected GitHub list response.');
        records.push(...batch);
        if (batch.length < 100) return records;
      }
    };
    const pr = event.pull_request.number ?? event.number;
    // Fetch fresh PR metadata, rather than trusting the webhook's review state.
    const pullRequest = await api(`/repos/${repository}/pulls/${pr}`);
    const reviews = report.ledger?.growth ? await list(`/repos/${repository}/pulls/${pr}/reviews`) : [];
    approval = ledgerApproval({ growth: report.ledger?.growth ?? 0, approvers: process.env.PLUMB_LEDGER_APPROVERS || '', pullRequest, reviews });
    const comments = await list(`/repos/${repository}/issues/${pr}/comments`);
    const sticky = comments.find(comment => comment.user?.login === 'github-actions[bot]' && comment.body?.startsWith(marker));
    const body = `${marker}\n${summary}\n${approval.message}`;
    const bounded = body.length > 65000 ? body.slice(0, 64000) + '\n\nSummary truncated. See the job summary.\n' + approval.message : body;
    await api(sticky ? `/repos/${repository}/issues/comments/${sticky.id}` : `/repos/${repository}/issues/${pr}/comments`, sticky ? 'PATCH' : 'POST', { body: bounded });
  }
  if (!approval.ok) process.stderr.write(`plumb: ${approval.message}\n`);
  process.exitCode = checked.status || (approval.ok ? 0 : 1);
} catch (error) {
  process.stderr.write(`plumb action: ${error.message}\n`);
  process.exitCode = 1;
} finally { await rm(temp, { recursive: true, force: true }); }
