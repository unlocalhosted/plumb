import { loadConfig } from '../config.js';
import { projectSourceFiles } from '../project.js';
import { stampedSource } from '../source-identity.js';
import { stampJSX, storeIndex } from './source-stamping.js';

interface LoaderContext {
  resourcePath: string;
  getOptions?: () => { root?: string };
  query?: unknown;
  callback(error: Error | null, code?: string, map?: unknown): void;
  async(): (error: Error | null, code?: string, map?: unknown) => void;
}

const configs = new Map<string, { at: number; loaded: ReturnType<typeof loadConfig> }>();
const ttl = 2000;
function config(root: string) {
  let entry = configs.get(root);
  if (!entry || Date.now() - entry.at > ttl) { entry = { at: Date.now(), loaded: loadConfig(root) }; configs.set(root, entry); entry.loaded.catch(() => configs.delete(root)); }
  return entry.loaded;
}

/**
 * A webpack/Turbopack loader that stamps data-plumb-source on every DOM-tag JSX opening, as the Vite host does. Runs
 * before Next's own compiler on the files that are yours by the same rule as every host (inside the repository, neither
 * installed nor generated, or selected by the config's `source`). The stamp is a plain attribute, so it reaches the DOM
 * for server components and client components alike.
 */
export default function plumbStampLoader(this: LoaderContext, source: string | Buffer): void {
  const callback = this.async();
  const code = typeof source === 'string' ? source : source.toString('utf8');
  const file = this.resourcePath;
  const root = this.getOptions?.().root ?? process.cwd();
  if (!code.includes('<')) return callback(null, code);
  (async () => {
    const loaded = await config(root);
    const identity = await stampedSource(root, file, loaded.value, async () => (await projectSourceFiles(root, loaded.value, [file])).includes(file));
    const stamped = identity && stampJSX(code, file, identity.path);
    if (!stamped) return callback(null, code);
    void storeIndex(root, identity.path, stamped.index);
    if (stamped.code === null) return callback(null, code);
    callback(null, stamped.code, JSON.parse(stamped.map.toString()));
  })().catch(() => callback(null, code)); // never break the host's own compile
}
