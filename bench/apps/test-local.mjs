// Preload for npm test when every temporary file must stay inside React Plumber.
import fs from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { syncBuiltinESMExports } from 'node:module';

// Only adoption's otherwise git-less CLI fixtures need a discovery boundary.
// Other fixtures intentionally use the enclosing checkout for strict ledger comparisons.
if (basename(process.cwd()).startsWith('plumb-adoption-')) {
  process.env.GIT_CEILING_DIRECTORIES = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
}
const mkdtemp = fs.mkdtemp;
fs.mkdtemp = async function (...args) {
  const directory = await mkdtemp.apply(this, args);
  // Model a missing installation locally so Node cannot borrow ancestor Tailwind.
  if (basename(directory).startsWith('plumb-no-tailwind-')) {
    const packageDirectory = join(directory, 'node_modules/tailwindcss');
    await fs.mkdir(packageDirectory, { recursive: true });
    await fs.writeFile(join(packageDirectory, 'package.json'), JSON.stringify({ name: 'tailwindcss', main: './not-installed.js' }));
  }
  return directory;
};
syncBuiltinESMExports();
