// Public recordings use fixture/repository paths, never recorder-machine paths.
export function recordingPaths({ repo, root = repo, paths = [] }) {
  const replacements = [[process.execPath, 'node'], [root, '.'], [repo, '.'], ...paths]
    .sort(([a], [b]) => b.length - a.length);
  return function portable(value) {
    if (Array.isArray(value)) return value.map(portable);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, portable(item)]));
    if (typeof value !== 'string') return value;
    for (const [absolute, path] of replacements) {
      value = value.replaceAll(`${absolute}/`, path === '.' ? '' : `${path}/`).replaceAll(absolute, path);
    }
    return value;
  };
}

export function plumbCommand(args, fixtureRoot) {
  const publicArgs = [];
  for (let i = 0; i < args.length; i++) {
    if (fixtureRoot && args[i] === '--root' && args[i + 1] === fixtureRoot) { i++; continue; }
    if (fixtureRoot && args[i] === `--root=${fixtureRoot}`) continue;
    publicArgs.push(args[i]);
  }
  const shell = value => /^[\w./:@%+=,-]+$/.test(value) ? value : `'${value.replaceAll("'", "'\\''")}'`;
  return ['plumber', ...publicArgs.map(shell)].join(' ');
}

export function recordingJSON(value, portable) {
  const json = JSON.stringify(portable(value), null, 2) + '\n';
  // Fail rather than publish an unexpected local path from a future CLI field.
  if (/\/(?:Users|home|private|tmp|var\/folders|usr|opt|Volumes)\/|[A-Za-z]:\\\\|~\//.test(json)) {
    throw new Error('Recording contains a local absolute path or home directory.');
  }
  return json;
}
