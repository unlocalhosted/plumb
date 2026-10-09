import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, join, relative, resolve, matchesGlob } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PlumbConfig } from '../config.js';
import type { Report } from '../report.js';
import { agentDocs } from '../surfaces/docs.js';
import { installHooks } from '../surfaces/hooks.js';

const block = '<!-- plumb:start -->\n' +
  'Read PLUMB.md for tokens, component permissions and enabled habits.\n' +
  'Run `plumb check --changed --agent --strict-ledger` after edits; stop on "0 new".\n' +
  'Never edit plumb.config.ts, .plumb/ledger.jsonl or the theme to pass.\n' +
  'If no token fits, report NEEDS-DECISION with the location and wanted value.\n' +
  '<!-- plumb:end -->\n';

function git(root: string, ...args: string[]): string | undefined {
  const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : undefined;
}
async function content(file: string): Promise<string | undefined> {
  try { return await readFile(file, 'utf8'); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return; throw error; }
}

// CODEOWNERS uses last-match precedence. Read owners of the actual ledger path,
// rather than every owner in the repository (which would broaden approval).
function owns(pattern: string, path: string): boolean {
  if (pattern.startsWith('!') || pattern.includes('[')) return false;
  const anchored = pattern.startsWith('/');
  pattern = pattern.replace(/^\//, '');
  if (!pattern.replace(/\/$/, '').includes('/') && !anchored) pattern = `**/${pattern}`;
  if (pattern.endsWith('/')) return matchesGlob(path, `${pattern}**`);
  return matchesGlob(path, pattern) || matchesGlob(path, `${pattern}/**`);
}
async function approvers(repo: string, path: string): Promise<{ logins: string[]; teams: string[]; source?: string }> {
  for (const name of ['.github/CODEOWNERS', 'CODEOWNERS', 'docs/CODEOWNERS']) {
    const text = await content(join(repo, name));
    if (text === undefined) continue;
    let owners: string[] = [];
    for (const line of text.split(/\r?\n/)) {
      const [pattern, ...names] = line.replace(/\s*#.*$/, '').trim().split(/\s+/);
      if (pattern && owns(pattern, path)) owners = names.filter(name => /^@[\w-]+(?:\/[\w.-]+)?$/.test(name));
    }
    return { logins: [...new Set(owners.filter(name => !name.includes('/')))], teams: owners.filter(name => name.includes('/')), source: name };
  }
  return { logins: [], teams: [] };
}

async function workflow(root: string): Promise<{ file: string; text: string; notes: string[] }> {
  const repo = git(root, 'rev-parse', '--show-toplevel') ?? root;
  const workingDirectory = relative(repo, root).replaceAll('\\', '/') || '.';
  const owners = await approvers(repo, `${workingDirectory === '.' ? '' : workingDirectory + '/'}.plumb/ledger.jsonl`);
  const packageRoot = fileURLToPath(new URL('../../', import.meta.url));
  const metadata = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8')) as { repository: { url: string }; gitHead?: string };
  const repository = metadata.repository.url.replace(/^git\+https:\/\/github.com\//, '').replace(/\.git$/, '');
  // An installed package can live inside the consumer's Git tree. Its HEAD is
  // not a Plumb revision and must never become the action's pin.
  const revision = git(packageRoot, 'rev-parse', '--show-toplevel') === resolve(packageRoot) ? git(packageRoot, 'rev-parse', 'HEAD') : metadata.gitHead;
  const action = `${repository}@${revision && /^[a-f\d]{40}$/.test(revision) ? revision : 'main'}`;
  let dependencies = '';
  if (existsSync(join(repo, 'package-lock.json'))) dependencies = '      - run: npm ci\n';
  else if (existsSync(join(repo, 'pnpm-lock.yaml'))) dependencies = '      - run: corepack enable && pnpm install --frozen-lockfile\n';
  else if (existsSync(join(repo, 'yarn.lock'))) dependencies = '      - run: corepack enable && yarn install --immutable\n';
  else if (existsSync(join(repo, 'package.json'))) dependencies = '      - run: npm install\n';
  const notes = [owners.source ? `CI approvers: ${owners.logins.join(', ') || 'none'} from ${owners.source}.` : 'CI approvers: none. Set ledger-approvers in .github/workflows/plumb.yml before approving new tokens or exceptions.'];
  if (!revision) notes.push('Action revision: main. Pin it to a reviewed Plumb commit in .github/workflows/plumb.yml.');
  if (owners.teams.length) notes.push(`CODEOWNERS teams: ${owners.teams.join(', ')}. The action accepts individual GitHub logins; add team members to ledger-approvers.`);
  return { file: join(repo, '.github/workflows/plumb.yml'), notes, text:
    'name: Plumb\non:\n  pull_request:\n  pull_request_review:\n    types: [submitted, dismissed]\npermissions:\n  contents: read\n  pull-requests: write\njobs:\n  plumb:\n    runs-on: ubuntu-latest\n    steps:\n' +
    '      - uses: actions/checkout@v4\n        with:\n          ref: ${{ github.event.pull_request.head.sha }}\n          fetch-depth: 0\n' +
    "      - uses: actions/setup-node@v4\n        with:\n          node-version: '22.18.0'\n" + dependencies +
    `      - uses: ${action}\n        with:\n          base: \${{ github.event.pull_request.base.sha }}\n          working-directory: ${JSON.stringify(workingDirectory)}\n` +
    `          ledger-approvers: ${JSON.stringify(owners.logins.join(', '))}\n` };
}

export async function installProject(report: Report, config: PlumbConfig, ci = false): Promise<string> {
  const root = report.root;
  const repo = git(root, 'rev-parse', '--show-toplevel') ?? root;
  const scopes = [...new Set([root, repo])];
  const claudeRoot = scopes.find(scope => existsSync(join(scope, '.claude')));
  const cursorRoot = scopes.find(scope => existsSync(join(scope, '.cursor')));
  const claude = claudeRoot !== undefined;
  const cursor = cursorRoot !== undefined;
  const codex = scopes.some(scope => existsSync(join(scope, 'AGENTS.md')));
  const docs = new Set<string>(['PLUMB.md']);
  // Codex has no post-edit hook in the existing integration. Its agent block
  // carries the same check command; never fabricate a hook configuration.
  if (codex || cursor || !claude) docs.add('AGENTS.md');
  if (claude || existsSync(join(root, 'CLAUDE.md'))) docs.add('CLAUDE.md');
  const plans: { file: string; before?: string; after: string }[] = [];
  for (const name of docs) {
    const file = join(root, name), before = await content(file);
    const after = name === 'PLUMB.md' ? before ?? agentDocs(report, config) :
      before?.includes('<!-- plumb:start -->') ? before : `${before ?? ''}${before ? (before.endsWith('\n') ? '\n' : '\n\n') : ''}${block}`;
    plans.push({ file, ...(before === undefined ? {} : { before }), after });
  }
  const ciPlan = ci ? await workflow(root) : undefined;
  if (ciPlan) {
    const before = await content(ciPlan.file);
    plans.push({ file: ciPlan.file, ...(before === undefined ? {} : { before }), after: before ?? ciPlan.text });
  }
  const output = [`Agents: ${[claude && 'Claude Code', cursor && 'Cursor', codex && 'Codex'].filter(Boolean).join(', ') || 'none detected'}.`];
  for (const scope of scopes) {
    const agents = [...(claudeRoot === scope ? ['claude' as const] : []), ...(cursorRoot === scope ? ['cursor' as const] : [])];
    if (!agents.length) continue;
    const hooks = await installHooks(scope, agents, scope === root ? undefined : relative(scope, root).replaceAll('\\', '/'));
    if (hooks) output.push(hooks.replaceAll(scope + '/', (relative(root, scope).replaceAll('\\', '/') || '.') + '/').trimEnd());
  }
  for (const plan of plans) {
    const name = relative(root, plan.file).replaceAll('\\', '/');
    if (plan.before === plan.after) { output.push(`Kept ${name}.`); continue; }
    await mkdir(dirname(plan.file), { recursive: true });
    await writeFile(plan.file, plan.after, { flag: plan.before === undefined ? 'wx' : 'w' });
    output.push(`${plan.before === undefined ? 'Wrote' : 'Added Plumb instructions to'} ${name}.`);
  }
  if (ciPlan && plans.find(plan => plan.file === ciPlan.file)?.before === undefined) output.push(...ciPlan.notes);
  return output.join('\n') + '\n';
}
