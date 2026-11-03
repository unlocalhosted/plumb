// The white fixture the causes tests share: crafting-ui's white in small. A theme that names white `on-accent` and
// defines no `white`, so `bg-white` renders nothing, `bg-[#ffffff]` and `text-[#fff]` copy the theme's value, and the
// dead class's nearest spelling is the unrelated `bg-warning`.
import assert from 'node:assert/strict';
import { cp, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const repo = fileURLToPath(new URL('../../', import.meta.url));
export const theme = `@import "tailwindcss";
@theme {
  --color-*: initial;
  --spacing: 1px;
  --spacing-s2: 8px; --spacing-s4: 16px;
  --color-accent: #2563eb; --color-warning: #f59e0b;
  --color-on-accent: #ffffff; --color-ink: #111111;
  --text-body: 16px; --text-small: 14px;
}
`;
export const source = `import './styles.css';
export const App = () => <>
  <button id="a" className="bg-white text-[#fff] px-s4">go</button>
  <button id="b" className="bg-white bg-[#ffffff] text-ink">stop</button>
  <p id="c" className="text-white/15 text-[#ffffff]">soft</p>
  <p id="d" className="text-[15px] text-[0.9375rem]">fifteen</p>
  <div id="e" style={{ background: '#FFFFFF' }} />
</>;
`;
export async function project(t) {
  const root = await mkdtemp(join(repo, 'fixtures/.causes-model-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'fixtures/messages'), root, { recursive: true });
  await writeFile(join(root, 'src/styles.css'), theme);
  await writeFile(join(root, 'src/App.tsx'), source);
  return root;
}
export function check(root) {
  const result = spawnSync(process.execPath, [join(repo, 'dist/cli.js'), 'check', '--root', root, '--json'], { encoding: 'utf8', timeout: 60_000, maxBuffer: 64 * 1024 * 1024 });
  assert.equal(result.stderr, ''); assert.ok([0, 1].includes(result.status), result.stdout);
  return JSON.parse(result.stdout);
}
