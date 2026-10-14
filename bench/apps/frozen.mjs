import fs from 'node:fs/promises';
import { constants } from 'node:fs';
import { execFileSync, execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';

const runFile = promisify(execFile);
const harnessRepo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const inside = (path, root) => path === root || path.startsWith(root + sep);
export const git = (root, ...args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 });
const top = root => git(root, 'rev-parse', '--show-toplevel').trim();
const head = root => git(root, 'rev-parse', 'HEAD').trim();

// Only these ignored runtime artifacts are admitted, never a repository's ignored trees.
export const ignoredInputs = {
  metalui: ['packages/metalui/dist'], // package.json exports: linked Kamui imports JS/CSS chunks here
  kamui: ['web/packages/medium-core/pkg', 'web/vendor/metalui', 'web/vendor/metalui-source.css'],
  // vite.config.ts selects built wasm; mood.ts imports vendor motion; index.css imports the ignored CSS bridge
  craftingattention: [],
  algorecall: [],
};

async function dependencyDirectories(root) {
  const result = [];
  async function visit(directory) {
    const children = await fs.readdir(directory, { withFileTypes: true });
    const candidates = children.filter(entry => entry.isDirectory() && !['.git', 'node_modules'].includes(entry.name));
    const input = candidates.map(entry => relative(root, join(directory, entry.name)) + '/').join('\0') + '\0';
    let ignored = new Set();
    if (candidates.length) {
      try { ignored = new Set(execFileSync('git', ['-C', root, 'check-ignore', '-z', '--stdin'], { input, encoding: 'utf8' }).split('\0')); }
      catch (error) { if (error.status !== 1) throw error; }
    }
    for (const entry of children) {
      if (entry.name === 'node_modules' && (entry.isDirectory() || entry.isSymbolicLink())) result.push(join(directory, entry.name));
      else if (entry.isDirectory() && entry.name !== '.git' && !ignored.has(relative(root, join(directory, entry.name)) + '/')) await visit(join(directory, entry.name));
    }
  }
  await visit(root);
  return result;
}

async function packageLinks(modules, stores) {
  const links = [];
  const installedStore = path => {
    const marker = sep + 'node_modules';
    const index = path.indexOf(marker + sep);
    return index >= 0 ? path.slice(0, index + marker.length) : path.endsWith(marker) ? path : null;
  };
  const store = installedStore(await fs.realpath(modules));
  if (store) stores.add(store);
  async function visit(directory, scope = '') {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (!scope && entry.name.startsWith('@') && entry.isDirectory()) await visit(path, entry.name + '/');
      else if (entry.isSymbolicLink()) {
        let target;
        try { target = await fs.realpath(path); } catch (error) { if (error.code === 'ENOENT') continue; throw error; }
        const store = installedStore(target);
        if (store) stores.add(store);
        if (!target.split(sep).includes('node_modules')) links.push({ path, target, name: scope + entry.name });
      }
    }
  }
  await visit(modules);
  return links;
}

// Returns a content digest, not git status: editing an already-dirty file must be caught too.
export async function fingerprint(roots, outputs = []) {
  const hash = createHash('sha256');
  async function visit(path) {
    if (outputs.some(output => inside(path, output))) return;
    const stat = await fs.lstat(path);
    hash.update(path); hash.update(String(stat.mode));
    if (stat.isSymbolicLink()) hash.update(await fs.readlink(path));
    else if (stat.isDirectory()) {
      for (const name of (await fs.readdir(path)).sort()) if (name !== 'node_modules' && name !== '.git') await visit(join(path, name));
    } else if (stat.isFile()) hash.update(await fs.readFile(path));
  }
  for (const root of roots) await visit(root);
  return hash.digest('hex');
}

// Re-list inputs so added/deleted untracked files and edits to already-dirty files are covered.
async function originalFingerprint(root, ignored) {
  const files = [...new Set([...git(root, 'ls-files', '-co', '--exclude-standard', '-z').split('\0').filter(Boolean), ...ignored])]
    .filter(file => !file.split('/').includes('node_modules')).sort();
  const hash = createHash('sha256');
  for (const file of files) {
    hash.update(file);
    const path = join(root, file);
    const exists = await fs.lstat(path).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
    hash.update(exists ? await fingerprint([path]) : 'missing');
  }
  return hash.digest('hex');
}

export async function freezeApp(app, scratch) {
  const start = performance.now(), repositories = [], adaptations = [], pendingLinks = [];
  let clones = 0, copies = 0, cloneBackend;
  const regularFiles = [];
  const stores = new Set();
  async function copyInput(source, destination, record) {
    const stat = await fs.lstat(source).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
    if (!stat) { record.missing.push(relative(record.original, source)); return; }
    await fs.mkdir(dirname(destination), { recursive: true });
    if (stat.isSymbolicLink()) {
      await fs.symlink(await fs.readlink(source), destination);
      pendingLinks.push({ source, destination, target: resolve(dirname(source), await fs.readlink(source)) });
      record.fileCount++;
    } else if (stat.isDirectory()) {
      await fs.mkdir(destination, { recursive: true });
      for (const name of await fs.readdir(source)) await copyInput(join(source, name), join(destination, name), record);
    } else if (stat.isFile()) {
      regularFiles.push({ source, destination, mode: stat.mode });
      record.fileCount++;
    }
  }
  async function capture(original, name, destination) {
    original = top(original);
    const existing = repositories.find(record => record.original === original);
    if (existing) return existing;
    const record = { original, directory: destination, head: head(original), fileCount: 0, missing: [],
      ignoredInputs: ignoredInputs[name] ?? [], modules: [], tracked: git(original, 'ls-files', '-z').split('\0').filter(Boolean) };
    repositories.push(record);
    record.originalDigestBefore = await originalFingerprint(original, record.ignoredInputs);
    await fs.mkdir(destination, { recursive: true });
    const files = [...new Set(git(original, 'ls-files', '-co', '--exclude-standard', '-z').split('\0').filter(Boolean))];
    record.gitVisibleFiles = files;
    record.gitVisibleFileCount = files.length;
    record.dependencyFilesLinked = files.filter(file => file.split('/').includes('node_modules')).length;
    for (const file of files.filter(file => !file.split('/').includes('node_modules'))) {
      if (!inside(resolve(destination, file), destination)) throw new Error(`Unsafe git path: ${file}`);
      await copyInput(join(original, file), join(destination, file), record);
    }
    for (const file of record.ignoredInputs) {
      if (files.some(visible => visible === file || visible.startsWith(file + '/'))) throw new Error(`Ignored input overlaps visible files: ${file}`);
      if (await fs.stat(join(original, file)).catch(() => null)) await copyInput(join(original, file), join(destination, file), record);
    }
    record.modules = await dependencyDirectories(original);
    for (const modules of record.modules) {
      for (const link of await packageLinks(modules, stores)) pendingLinks.push({ ...link, destination: join(destination, relative(original, link.path)), dependency: true });
    }
    // External source links need their own frozen repository, including explicit package exports.
    for (const link of [...pendingLinks]) if (inside(link.destination, destination) && !inside(link.target, original)) {
      let external;
      try { external = top(link.target); } catch { continue; }
      if (!repositories.some(record => record.original === external)) {
        const externalName = external.endsWith('/metalui') ? 'metalui' : 'linked';
        await capture(external, externalName, join(scratch, 'linked', String(repositories.length)));
      }
    }
    return record;
  }
  const primary = await capture(app.root, app.name, join(scratch, 'source'));
  if (regularFiles.length) {
    const first = regularFiles[0];
    try {
      await fs.copyFile(first.source, first.destination, constants.COPYFILE_FICLONE_FORCE);
      cloneBackend = 'fs.copyFile'; clones++;
    } catch (error) {
      if (!['ENOSYS', 'ENOTSUP', 'EOPNOTSUPP', 'EXDEV', 'EINVAL'].includes(error.code)) throw error;
      await fs.rm(first.destination, { force: true });
      cloneBackend = process.platform === 'darwin' ? 'cp -c' : 'copy';
    }
    if (cloneBackend === 'cp -c') {
      // Node's libuv may lack Darwin cloning (ENOSYS) while APFS clonefile works via cp.
      // Group same-directory inputs: one native process per directory, never one per file.
      const groups = new Map();
      for (const file of regularFiles) {
        const directory = dirname(file.destination);
        if (!groups.has(directory)) groups.set(directory, []);
        groups.get(directory).push(file);
      }
      const batches = [];
      for (const [directory, files] of groups) for (let offset = 0; offset < files.length; offset += 256) {
        batches.push({ directory, files: files.slice(offset, offset + 256) });
      }
      for (let offset = 0; offset < batches.length; offset += 8) await Promise.all(batches.slice(offset, offset + 8).map(async ({ directory, files }) => {
        try {
          await runFile('/bin/cp', ['-c', '-p', ...files.map(file => file.source), directory]);
          clones += files.length;
        } catch {
          for (const file of files) { await fs.copyFile(file.source, file.destination); await fs.chmod(file.destination, file.mode); copies++; }
        }
      }));
    } else {
      const remaining = cloneBackend === 'fs.copyFile' ? regularFiles.slice(1) : regularFiles;
      for (const file of remaining) {
        if (cloneBackend === 'fs.copyFile') {
          try { await fs.copyFile(file.source, file.destination, constants.COPYFILE_FICLONE_FORCE); clones++; }
          catch (error) {
            if (!['ENOSYS', 'ENOTSUP', 'EOPNOTSUPP', 'EXDEV', 'EINVAL'].includes(error.code)) throw error;
            await fs.copyFile(file.source, file.destination); copies++;
          }
        } else { await fs.copyFile(file.source, file.destination); copies++; }
        await fs.chmod(file.destination, file.mode);
      }
      if (clones) await fs.chmod(first.destination, first.mode);
    }
  }
  const remap = path => {
    const record = repositories.find(record => inside(path, record.original));
    return record ? join(record.directory, relative(record.original, path)) : null;
  };
  for (const record of repositories) for (const modules of record.modules) {
    const destination = remap(modules);
    const linked = pendingLinks.filter(link => link.dependency && inside(link.destination, destination));
    const configInside = modules === join(app.app, 'node_modules');
    const cacheInside = app.depsInProject && configInside;
    await fs.mkdir(dirname(destination), { recursive: true });
    if (!linked.length && !configInside) await fs.symlink(modules, destination, 'dir');
    else {
      // A writable facade is necessary: changing links/cache beneath a directory symlink writes the original.
      await fs.mkdir(destination, { recursive: true });
      for (const entry of await fs.readdir(modules, { withFileTypes: true })) {
        if (entry.name.startsWith('.vite')) continue;
        const source = join(modules, entry.name), out = join(destination, entry.name);
        if (entry.name.startsWith('@') && entry.isDirectory()) {
          await fs.mkdir(out);
          for (const name of await fs.readdir(source)) await fs.symlink(join(source, name), join(out, name));
        } else await fs.symlink(source, out);
      }
      adaptations.push(`Dependency facade at ${relative(record.directory, destination)}: workspace links resolve to frozen inputs${configInside ? '; native-loadable Vite config bundles stay in the copy' : ''}${cacheInside ? '; writable dependency cache stays in the copy' : ''}. Registry dependencies remain symlinked to the installed original store.`);
    }
  }
  for (const link of pendingLinks) {
    const target = remap(link.target);
    if (target) {
      await fs.unlink(link.destination);
      await fs.symlink(target, link.destination);
      if (link.dependency) adaptations.push(`Frozen workspace dependency ${link.name}: ${link.target} => ${target}.`);
    } else adaptations.push(`Live non-repository symlink retained: ${link.source ?? link.path}; target ${link.target} is outside git inputs.`);
  }
  // Kamui's generated CSS bridge contains an absolute @source into live MetalUI.
  if (app.name === 'kamui') {
    const bridge = join(primary.directory, 'web/vendor/metalui-source.css');
    let css = await fs.readFile(bridge, 'utf8');
    for (const record of repositories) css = css.replaceAll(record.original + '/', record.directory + '/');
    await fs.writeFile(bridge, css);
    adaptations.push('Rebased ignored MetalUI CSS bridge @source onto the frozen linked MetalUI input; absolute generator output otherwise scans live source.');
  }
  {
    const modules = join(app.app, 'node_modules');
    // pnpm's relative links remain in their original store; resolution must identify the same Vite installation.
    if (await fs.stat(modules).catch(() => null)) {
      const originalVite = createRequire(join(app.app, 'package.json')).resolve('vite');
      const copiedVite = createRequire(join(remap(app.app), 'package.json')).resolve('vite');
      if (await fs.realpath(originalVite) !== await fs.realpath(copiedVite)) throw new Error('Copied node_modules changed Vite resolution: ' + originalVite + ' vs ' + copiedVite);
      adaptations.push('Verified Vite resolution from the copy against the original installed store (including pnpm relative symlinks).');
    }
  }
  let config = app.config;
  const configRoots = [];
  if (config && app.toolRoot) {
    const harness = join(scratch, 'harness');
    await fs.cp(join(app.toolRoot, 'bench'), join(harness, 'bench'), { recursive: true, mode: constants.COPYFILE_FICLONE });
    await fs.symlink(join(app.toolRoot, 'dist'), join(harness, 'dist'), 'dir');
    if (app.name === 'metalui') await fs.symlink(primary.directory, join(scratch, 'metalui'), 'dir');
    config = join(harness, relative(harnessRepo, config));
    configRoots.push(harness);
    adaptations.push('Frozen benchmark configuration and its imports; MetalUI token/CSS providers resolve into the frozen repository, and helper imports use the frozen React Plumber build.');
  }
  adaptations.push('Cloudflare .wrangler and TanStack .tanstack generated state stays in the disposable app; integrity excludes only these dev outputs and node_modules, and covers copied runtime artifacts.');
  const roots = [...repositories.map(record => record.directory), ...configRoots];
  const generatedOutputs = ['.wrangler', '.tanstack'].map(name => join(remap(app.app), name));
  const before = await fingerprint(roots, generatedOutputs);
  const snapshot = { inputDigest: before, original: primary.original, head: primary.head, fileCount: primary.fileCount,
    config: app.config ? { original: app.config, copy: config } : null, generatedOutputs, gitVisibleFileCount: primary.gitVisibleFileCount, dependencyFilesLinked: primary.dependencyFilesLinked,
    cloneBackend, method: copies ? clones ? 'clone+copy' : 'copy' : 'clone', clones, copies,
    ms: Number((performance.now() - start).toFixed(2)), repositories: repositories.map(({ modules, tracked, ...record }) => record) };
  return { app: { ...app, config, app: remap(app.app), root: remap(app.root), dependencyRoots: [...stores], trackedRouteTree: primary.tracked.includes(relative(primary.original, join(app.app, 'src/routeTree.gen.ts'))) },
    snapshot, adaptations, before, roots,
    async finish() {
      snapshot.digestAfter = await fingerprint(roots, generatedOutputs);
      const unchanged = before === snapshot.digestAfter;
      snapshot.unchanged = unchanged;
      for (const record of snapshot.repositories) {
        record.headAfter = head(record.original); record.originalMoved = record.headAfter !== record.head;
        record.originalDigestAfter = await originalFingerprint(record.original, record.ignoredInputs);
        record.originalUnchanged = !record.originalMoved && record.originalDigestBefore === record.originalDigestAfter;
      }
      snapshot.originalUnchanged = snapshot.repositories.every(record => record.originalUnchanged);
      return unchanged;
    } };
}

// React Plumber itself can be edited by another job. All four apps must inspect the same built runtime and oracle.
export async function freezeTool(root, directory, oracle) {
  const start = performance.now();
  await fs.mkdir(directory, { recursive: true });
  for (const input of ['dist', 'overlay', 'package.json', 'bench/metalui/overlay.plumber.config.ts', 'bench/metalui/plumber.config.ts', 'bench/metalui/families.ts', 'bench/apps/algorecall.plumber.config.ts']) {
    await fs.mkdir(dirname(join(directory, input)), { recursive: true });
    await fs.cp(join(root, input), join(directory, input), {
    recursive: true, mode: constants.COPYFILE_FICLONE, filter: path => !path.split(sep).includes('node_modules'),
    });
  }
  await fs.copyFile(oracle, join(directory, 'react-grab.js'), constants.COPYFILE_FICLONE);
  await fs.symlink(join(root, 'node_modules'), join(directory, 'node_modules'), 'dir');
  return { directory, sourceHead: head(root), sha256: await fingerprint([directory]), ms: Number((performance.now() - start).toFixed(2)) };
}
