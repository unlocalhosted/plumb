import { statePath } from '../paths.js';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, join, relative, resolve, matchesGlob } from 'node:path';
import { fileURLToPath } from 'node:url';
import { planHooks, writeHooks } from '../surfaces/hooks.js';
import { UsageError } from '../errors.js';
import { readDiscovery } from '../session/discovery.js';
import { writeOverlay } from './overlay.js';
import { overlaySetupNotice } from '../setup-messages.js';
import { manifestAt, packageManagerOf, projectFacts } from '../project-facts/index.js';

export const agentNames = ['claude', 'cursor', 'codex', 'copilot', 'gemini', 'windsurf', 'generic'] as const;
export type AgentName = typeof agentNames[number];
const markers = { start: '<!-- plumb:start -->', end: '<!-- plumb:end -->' };
const globs = '**/*.tsx,**/*.jsx,**/*.ts,**/*.js,**/*.css';
const labels: Record<AgentName, string> = { claude: 'Claude Code', cursor: 'Cursor', codex: 'Codex', copilot: 'Copilot', gemini: 'Gemini CLI', windsurf: 'Windsurf', generic: 'generic' };
const detection: Partial<Record<AgentName, string[]>> = {
  claude: ['.claude', 'CLAUDE.md'], cursor: ['.cursor'], codex: ['AGENTS.md', '.codex'],
  copilot: ['.github/copilot-instructions.md'], gemini: ['GEMINI.md', '.gemini'], windsurf: ['.windsurf'],
};
export function validateAgents(names: (string | boolean)[] = []): AgentName[] {
  for (const name of names) if (!agentNames.includes(name as AgentName)) throw new UsageError('Unknown agent ' + JSON.stringify(name) + '; choose ' + agentNames.join(', ') + '.\n  → plumber install --list');
  return [...new Set(names)] as AgentName[];
}
function instructions(before: string, body: string, file: string): string {
  const starts = before.split(markers.start).length - 1;
  const ends = before.split(markers.end).length - 1;
  if (!starts && !ends) return before + (before ? (before.endsWith('\n') ? '\n' : '\n\n') : '') + markers.start + '\n' + body + markers.end + '\n';
  const start = before.indexOf(markers.start), end = before.indexOf(markers.end);
  if (starts !== 1 || ends !== 1 || end < start) throw new UsageError('Invalid React Plumber markers in ' + file + '; no install files changed.\n  → ${EDITOR:-vi} ' + JSON.stringify(file));
  return before.slice(0, start + markers.start.length) + '\n' + body + before.slice(end);
}

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
  const owners = await approvers(repo, `${workingDirectory === '.' ? '' : workingDirectory + '/'}${relative(root, statePath(root, 'ledger.jsonl')).replaceAll('\\', '/')}`);
  const packageRoot = fileURLToPath(new URL('../../', import.meta.url));
  const metadata = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8')) as { repository: { url: string }; version: string; gitHead?: string };
  const repository = metadata.repository.url.replace(/^git\+https:\/\/github.com\//, '').replace(/\.git$/, '');
  // An installed package can live inside the consumer's Git tree. Its HEAD is
  // not a React Plumber revision and must never become the action's pin.
  const revision = git(packageRoot, 'rev-parse', '--show-toplevel') === resolve(packageRoot) ? git(packageRoot, 'rev-parse', 'HEAD') : metadata.gitHead;
  const commit = revision && /^[a-f\d]{40}$/.test(revision) ? revision : undefined;
  const pin = commit ?? `v${metadata.version}`;
  const action = `${repository}@${pin}`;
  const manager = packageManagerOf(repo), locked = manager.evidence.some(item => /(?:lock|shrinkwrap)/.test(item.file));
  const install = { npm: locked ? 'npm ci' : 'npm install', pnpm: 'corepack enable && pnpm install --frozen-lockfile', yarn: 'corepack enable && yarn install --immutable', bun: 'bun install --frozen-lockfile', deno: 'deno install' }[manager.value!];
  const dependencies = locked || manifestAt(repo) !== undefined ? `      - run: ${install}\n` : '';
  const notes = [owners.source ? `CI approvers: ${owners.logins.join(', ') || 'none'} from ${owners.source}.` : 'CI approvers: none. Set ledger-approvers in .github/workflows/plumb.yml before approving new tokens or exceptions.'];
  if (!commit) notes.push(`Action revision: ${pin}. This release tag must exist in ${repository}.`);
  if (owners.teams.length) notes.push(`CODEOWNERS teams: ${owners.teams.join(', ')}. The action accepts individual GitHub logins; add team members to ledger-approvers.`);
  return { file: join(repo, '.github/workflows/plumb.yml'), notes, text:
    'name: React Plumber\non:\n  pull_request:\n  pull_request_review:\n    types: [submitted, dismissed]\npermissions:\n  contents: read\n  pull-requests: write\njobs:\n  plumb:\n    runs-on: ubuntu-latest\n    steps:\n' +
    '      - uses: actions/checkout@v4\n        with:\n          ref: ${{ github.event.pull_request.head.sha }}\n          fetch-depth: 0\n' +
    "      - uses: actions/setup-node@v4\n        with:\n          node-version: '22.18.0'\n" + dependencies +
    `      - uses: ${action}\n        with:\n          base: \${{ github.event.pull_request.base.sha }}\n          working-directory: ${JSON.stringify(workingDirectory)}\n` +
    `          ledger-approvers: ${JSON.stringify(owners.logins.join(', '))}\n` };
}

/** Print host wiring by default; source edits require explicit --write. */
export async function installOverlay(root: string, write = false): Promise<string> {
  return overlaySetupNotice(root) + await overlayWiring(root, write);
}

async function overlayWiring(root: string, write = false): Promise<string> {
  const host = (await projectFacts(root)).host.value?.id;
  const dependencies = { next: host === 'next', vite: host === 'vite' };
  if (write) {
    try { return await writeOverlay(root, dependencies.next ? 'next' : dependencies.vite ? 'vite' : undefined); }
    catch (error) {
      if (!(error instanceof UsageError)) throw error;
      throw new UsageError(`${error.message}\nNo install files changed. Add this wiring manually:\n${overlaySetupNotice(root)}${await overlayWiring(root)}`);
    }
  }
  if (dependencies.next) return [
    'Wrap your existing next.config.mjs export:',
    "import { withPlumb } from '@unlocalhosted/react-plumber/next/config';",
    'export default withPlumb(nextConfig);',
    '// Keeps existing pageExtensions and serverExternalPackages; adds React Plumber only in development.',
    '',
    'Add to app/%5F_plumb/[...path]/route.plumb.ts (or src/app/%5F_plumb/[...path]/route.plumb.ts):',
    '// Serves /__plumb/*; a literal app/__plumb/ folder is private in Next.js.',
    "import { createPlumbRoute } from '@unlocalhosted/react-plumber/next';",
    "export const runtime = 'nodejs';",
    'export const { GET, POST } = createPlumbRoute();',
    '',
    'Add to your root layout:',
    "import { PlumbOverlay } from '@unlocalhosted/react-plumber/next/overlay';",
    '// Inside <body>:',
    '<PlumbOverlay />',
    '',
  ].join('\n');
  if (dependencies.vite) return [
    'Add to vite.config.ts:',
    "import { plumb } from '@unlocalhosted/react-plumber/vite';",
    '// Put first in your existing plugins array, before react():',
    'plumb()',
    '',
  ].join('\n');
  const info = await readDiscovery(root);
  const ready = info?.overlay === true && info.root === resolve(root) && Number.isSafeInteger(info.port) && info.port > 0 && info.port <= 65535 && /^[a-f\d]{64}$/.test(info.token);
  return [
    ...(ready ? [] : ['Start your overlay server (replace the origin with your development page origin):',
      'plumber serve --overlay --port 7331 --origin http://localhost:5555',
      `Run plumber install --overlay again for the exact port and process token, or replace TOKEN_FROM_SERVE_JSON with ${relative(root, statePath(root, 'serve.json'))} token.`, '']),
    'Paste into your development page only:',
    `<script type="module" src="http://127.0.0.1:${ready ? info!.port : 7331}/__plumb/client.js" data-plumb-token="${ready ? info!.token : 'TOKEN_FROM_SERVE_JSON'}"></script>`,
    '',
  ].join('\n');
}

interface InstallOptions { ci?: boolean; list?: boolean; agents?: AgentName[] }
export async function installProject(root: string, options: InstallOptions = {}): Promise<string> {
  const repo = git(root, 'rev-parse', '--show-toplevel') ?? root;
  const scopes = [...new Set([root, repo])];
  const detected = new Map<AgentName, string>();
  for (const agent of agentNames) {
    const scope = scopes.find(scope => detection[agent]?.some(marker => existsSync(join(scope, marker))));
    if (scope) detected.set(agent, scope);
  }
  const selected = [...new Set([...detected.keys(), ...options.agents ?? []])];
  if (!selected.length) selected.push('generic');
  // Read the package's copy, never a consumer's similarly named skill.
  const skill = await readFile(new URL('../../skills/plumber/SKILL.md', import.meta.url), 'utf8');
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(skill);
  if (!frontmatter) throw new UsageError('Packaged React Plumber skill is missing frontmatter.');
  const body = skill.slice(frontmatter[0].length);
  const description = /^description: (.*)$/m.exec(frontmatter[1]!)?.[1];
  if (!description) throw new UsageError('Packaged React Plumber skill is missing description.');
  const plans: { file: string; before?: string; after: string }[] = [];
  async function add(name: string, render: (before: string | undefined) => string): Promise<void> {
    const file = join(root, name);
    if (plans.some(plan => plan.file === file)) return;
    const before = await content(file);
    plans.push({ file, ...(before === undefined ? {} : { before }), after: render(before) });
  }
  for (const agent of selected) {
    if (agent === 'claude') await add('.claude/skills/plumber/SKILL.md', () => skill);
    else if (agent === 'cursor') await add('.cursor/rules/plumber.mdc', () => '---\ndescription: ' + JSON.stringify(description) + '\nglobs: ' + globs + '\nalwaysApply: false\n---\n' + body);
    else if (agent === 'windsurf') await add('.windsurf/rules/plumber.md', () => '---\ntrigger: always_on\n---\n' + body);
    else {
      const name = agent === 'copilot' ? '.github/copilot-instructions.md' : agent === 'gemini' ? 'GEMINI.md' : 'AGENTS.md';
      await add(name, before => instructions(before ?? '', body, name));
    }
  }
  const ciPlan = options.ci ? await workflow(root) : undefined;
  if (ciPlan) {
    const before = await content(ciPlan.file);
    plans.push({ file: ciPlan.file, ...(before === undefined ? {} : { before }), after: before ?? ciPlan.text });
  }
  const hooks = [];
  for (const scope of scopes) {
    const agents = (['claude', 'cursor'] as const).filter(agent => selected.includes(agent) && (detected.get(agent) ?? root) === scope);
    if (agents.length) hooks.push(...await planHooks(scope, agents, scope === root ? undefined : relative(scope, root).replaceAll('\\', '/')));
  }
  const output = ['Agents: ' + ([...detected.keys()].map(agent => labels[agent]).join(', ') || 'none detected') + '.',
    'Selected: ' + selected.map(agent => labels[agent]).join(', ') + '.'];
  const name = (file: string) => relative(root, file).replaceAll('\\', '/');
  if (options.list) {
    output.push(...[...plans, ...hooks].map(plan => (plan.before === plan.after ? 'Kept ' : 'Would write ') + name(plan.file) + '.'));
    return output.join('\n') + '\n';
  }
  const hookOutput = await writeHooks(hooks);
  if (hookOutput) output.push(hookOutput.trimEnd());
  for (const plan of plans) {
    if (plan.before === plan.after) { output.push('Kept ' + name(plan.file) + '.'); continue; }
    await mkdir(dirname(plan.file), { recursive: true });
    await writeFile(plan.file, plan.after, { flag: plan.before === undefined ? 'wx' : 'w' });
    output.push('Wrote ' + name(plan.file) + '.');
  }
  if (ciPlan && plans.find(plan => plan.file === ciPlan.file)?.before === undefined) output.push(...ciPlan.notes);
  return output.join('\n') + '\n';
}
