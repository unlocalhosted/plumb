/**
 * The icon sets a project has installed (docs/research/icon-system.md §9.2: the icon pass swaps only into a set already there).
 * Read from the project's package.json and node_modules, never installed. Only `lucide-react`'s mark names are read (from the
 * package's own `dist/esm/icons`, checked against lucide-react 1.7.0); any other set is reported as present with `marks: null`,
 * which the pass reads as "its names are not known", never as "has every name".
 */
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

export interface InstalledIconSet { pkg: string; version: string | null; installed: boolean; marks: string[] | null }

const SETS = /^(lucide-react|@heroicons\/react|@phosphor-icons\/react|@tabler\/icons-react|@radix-ui\/react-icons|@mui\/icons-material|react-icons)$/;

async function json(path: string): Promise<Record<string, any> | null> {
  try { return JSON.parse(await readFile(path, 'utf8')); } catch { return null; }
}

export async function installedIconSets(root: string): Promise<InstalledIconSet[]> {
  const pkg = await json(join(root, 'package.json'));
  if (!pkg) return [];
  const names = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies }).filter(n => SETS.test(n)).sort();
  const out: InstalledIconSet[] = [];
  for (const name of names) {
    const dir = join(root, 'node_modules', name), meta = await json(join(dir, 'package.json'));
    let marks: string[] | null = null;
    if (meta && name === 'lucide-react') {
      try { marks = (await readdir(join(dir, 'dist/esm/icons'))).filter(f => f.endsWith('.js')).map(f => f.slice(0, -3)).sort(); } catch { marks = null; }
    }
    out.push({ pkg: name, version: meta?.version ?? null, installed: !!meta, marks });
  }
  return out;
}
