import { relative, sep } from 'node:path';
import { stampJSX } from './source-stamping.js';

interface LoaderContext {
  resourcePath: string;
  getOptions?: () => { root?: string; hostOnly?: boolean };
  query?: unknown;
  callback(error: Error | null, code?: string, map?: unknown): void;
  async?: () => (error: Error | null, code?: string, map?: unknown) => void;
}

/**
 * A webpack/Turbopack loader that stamps data-plumb-source on every JSX opening, as the Vite host does. Runs before
 * Next's own compiler on the app's .jsx/.tsx (never node_modules, never files outside the project root). The stamp is a
 * plain prop, so it reaches the DOM for server components and client components alike.
 */
export default function plumbStampLoader(this: LoaderContext, source: string | Buffer): void {
  const code = typeof source === 'string' ? source : source.toString('utf8');
  const file = this.resourcePath;
  const options = this.getOptions?.() ?? {};
  const root = options.root ?? process.cwd();
  const path = relative(root, file).split(sep).join('/');
  if (!code.includes('<') || !path || path.startsWith('..') || /(?:^|\/)(?:node_modules|\.next|\.git)(?:\/|$)/.test(path)) return this.callback(null, code);
  try {
    const stamped = stampJSX(code, file, path, { hostOnly: options.hostOnly === true || process.env.PLUMB_STAMP_HOST_ONLY === '1' });
    if (!stamped) return this.callback(null, code);
    this.callback(null, stamped.code, JSON.parse(stamped.map.toString()));
  } catch {
    this.callback(null, code); // never break the host's own compile
  }
}
