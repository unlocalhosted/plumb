// The showcase corpus: the screens in overlay/showcase/src/principles/screens, copied byte for byte into a throwaway
// project (the same src/ layout on every host, so a reported file path means the same thing on each). The copy keeps
// the screens' own imports working: ../../media, ./kit.jsx, theme.css (Tailwind v4), and the showcase's plumber.config.ts.
import { createHash } from 'node:crypto';
import { cp, mkdir, readdir, readFile, symlink, writeFile } from 'node:fs/promises';
import { existsSync, realpathSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { mainCheckout, nodeModulesHome, repo } from './lib.mjs';

// Where the screens live. A worktree cut before they were committed has none; then the main checkout's are used and
// the report says so.
export async function findShowcase(override) {
  const candidates = override ? [{ dir: override, origin: 'override' }] : [
    { dir: join(repo, 'overlay/showcase'), origin: 'this tree' },
    { dir: join(mainCheckout(), 'overlay/showcase'), origin: 'main checkout (screens not in this tree)' },
  ];
  for (const { dir, origin } of candidates) {
    const screensDir = join(dir, 'src/principles/screens');
    if (!existsSync(screensDir)) continue;
    const files = (await readdir(screensDir)).filter((f) => /^\d+-.+\.jsx$/.test(f)).sort();
    const hash = createHash('sha256');
    for (const f of [...files, 'kit.jsx']) hash.update(f).update(await readFile(join(screensDir, f)));
    const screens = files.map((file) => {
      const [, num, name] = /^(\d+)-(.+)\.jsx$/.exec(file);
      return { id: num, n: Number(num), name, file };
    });
    return { dir, origin, screensDir, screens, sha256: hash.digest('hex').slice(0, 12), hasKit: existsSync(join(screensDir, 'kit.jsx')) };
  }
  throw new Error('No showcase screens found (looked for overlay/showcase/src/principles/screens). Pass --showcase <dir>.');
}

// Copies what a screen needs into <dest>/src. node_modules stays out: hosts resolve dependencies from the repo's.
export async function copyShowcaseSource(showcase, dest) {
  const from = join(showcase.dir, 'src');
  await mkdir(join(dest, 'src/principles'), { recursive: true });
  await cp(showcase.screensDir, join(dest, 'src/principles/screens'), { recursive: true });
  await cp(join(from, 'media'), join(dest, 'src/media'), { recursive: true });
  await cp(join(from, 'theme.css'), join(dest, 'src/theme.css'));
  if (existsSync(join(showcase.dir, 'plumber.config.ts'))) await cp(join(showcase.dir, 'plumber.config.ts'), join(dest, 'plumber.config.ts'));
  // The showcase's own dependencies (dither-icons, Radix) are installed beside it, not in the repo. A worktree's
  // showcase has no node_modules of its own, so the main checkout's install stands in, then the repo's own.
  const { dependencies = {} } = JSON.parse(await readFile(join(showcase.dir, 'package.json'), 'utf8'));
  const homes = [join(showcase.dir, 'node_modules'), join(mainCheckout(), 'overlay/showcase/node_modules'), join(nodeModulesHome(), 'node_modules')];
  for (const name of Object.keys(dependencies)) {
    const found = homes.map(home => join(home, name)).find(existsSync);
    if (!found) throw new Error(`The showcase depends on ${name}, installed in neither ${homes.join(' nor ')}. Run npm install in overlay/showcase.`);
    await mkdir(dirname(join(dest, 'node_modules', name)), { recursive: true });
    await symlink(realpathSync(found), join(dest, 'node_modules', name), 'dir');
  }
}

// What the showcase's dev server answers on /api for the two screens that fetch (66, 77).
export const apiBody = (url) => (url.startsWith('/activity')
  ? [{ id: 1, what: 'Halden & Co. opened INV-2041', when: '2 min ago' }, { id: 2, what: 'Northfield Dental paid INV-2040', when: '1 h ago' }, { id: 3, what: 'Reminder sent for INV-2039', when: 'Yesterday' }]
  : { ok: true });

export const screenWrapper = '<div id="bench-root" data-example><Screen side="broken" onStatus={() => {}} /></div>';

// Vite: one entry that loads the screen named in ?screen=NN.
export async function writeViteProject(dest) {
  await writeFile(join(dest, 'package.json'), JSON.stringify({ type: 'module', private: true }));
  await writeFile(join(dest, 'index.html'), '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"><title>locate bench</title></head><body><div id="root"></div><script type="module" src="/src/bench-entry.jsx"></script></body></html>\n');
  await writeFile(join(dest, 'src/bench-entry.jsx'), `import { createRoot } from 'react-dom/client';
import './theme.css';
const screens = import.meta.glob('./principles/screens/[0-9]*.jsx');
const id = new URLSearchParams(location.search).get('screen');
const file = Object.keys(screens).find((f) => f.split('/').pop().startsWith(id + '-'));
const { default: Screen } = await screens[file]();
createRoot(document.getElementById('root')).render(${screenWrapper});
`);
}

export const screenUrl = (origin, host, screen) => (host.startsWith('vite') ? `${origin}/?screen=${screen.id}` : `${origin}/s/${screen.id}`);
export const dirOf = (path) => dirname(path);
export const nameOf = (path) => basename(path);
