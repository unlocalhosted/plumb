import fs from 'node:fs';
import fsp from 'node:fs/promises';
import { syncBuiltinESMExports } from 'node:module';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const workspace = dirname(repo);
// Installed dependencies and original repositories are read-only, even through named fs imports.
// Native Vite/Cloudflare outputs live physically in the disposable copy so native loaders can read them.
// This is an accidental-write guard, not a security boundary for third-party native code.
function protectApps(scratch, app) {
  const roots = [...new Set([repo, ...['metalui', 'kamui', 'craftingattention', 'algorecall'].map(name => join(workspace, name))])];
  const writable = resolve(scratch);
  const inside = (path, root) => path === root || path.startsWith(root + sep);
  const pathname = value => value instanceof URL ? fileURLToPath(value) : Buffer.isBuffer(value) ? value.toString() : value;
  function pathFor(value, writing = false) {
    const input = pathname(value);
    if (typeof input !== 'string') return value;
    const path = resolve(input);
    if (writing) {
      let existing = path;
      while (!fs.existsSync(existing) && dirname(existing) !== existing) existing = dirname(existing);
      const real = resolve(fs.realpathSync(existing), relative(existing, path));
      if (!inside(real, writable) || roots.some(root => root !== repo && inside(real, root)))
        throw new Error(`Read-only app/repo write blocked: ${path} (resolved ${real})`);
    }
    return value;
  }
  const writes = new Map([
    ['writeFile', [0]], ['appendFile', [0]], ['mkdir', [0]], ['mkdtemp', [0]], ['rm', [0]], ['rmdir', [0]],
    ['unlink', [0]], ['rename', [0, 1]], ['copyFile', [1]], ['cp', [1]], ['truncate', [0]], ['chmod', [0]],
    ['chown', [0]], ['utimes', [0]], ['link', [1]], ['symlink', [1]],
  ]);
  function wrap(object, name, positions, writing) {
    const original = object[name];
    if (!original) return;
    object[name] = function (...args) {
      try { for (const index of positions) args[index] = pathFor(args[index], writing); }
      catch (error) {
        const callback = args.at(-1);
        if (typeof callback === 'function') { queueMicrotask(() => callback(error)); return; }
        if (object === fsp) return Promise.reject(error);
        throw error;
      }
      return original.apply(this, args);
    };
    Object.assign(object[name], original);
    if (original.native) wrap(object[name], 'native', positions, writing);
  }
  for (const [name, positions] of writes) {
    wrap(fs, name, positions, true); wrap(fs, name + 'Sync', positions, true); wrap(fsp, name, positions, true);
  }
  wrap(fs, 'createWriteStream', [0], true);
  for (const object of [fs, fsp]) for (const name of object === fs ? ['open', 'openSync'] : ['open']) {
    const original = object[name];
    object[name] = function (path, flags, ...args) {
      const writing = typeof flags === 'number'
        ? (flags & (fs.constants.O_WRONLY | fs.constants.O_RDWR | fs.constants.O_CREAT | fs.constants.O_TRUNC | fs.constants.O_APPEND)) !== 0
        : /[wa+]/.test(flags ?? 'r');
      try { path = pathFor(path, writing); }
      catch (error) {
        if (object === fsp) return Promise.reject(error);
        if (typeof args.at(-1) === 'function') { queueMicrotask(() => args.at(-1)(error)); return; }
        throw error;
      }
      return original.call(this, path, flags, ...args);
    };
  }
  syncBuiltinESMExports();
}

protectApps((process.env.PLUMBER_VERIFY_SCRATCH ?? process.env.PLUMB_VERIFY_SCRATCH), JSON.parse((process.env.PLUMBER_VERIFY_APP ?? process.env.PLUMB_VERIFY_APP)));
