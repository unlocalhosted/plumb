// Throwaway apps on every host React Plumber supports, each with the package installed the way a person installs it:
// packed, in a folder of its own outside the repository, from npm's copies of the hosts.
//
// PLUMB_PACKAGE names another package to put under the same tests: a tarball, or a spec such as
// @unlocalhosted/react-plumber@0.6.0 (how a test is shown to fail on the release it was written for).
import { execFile, spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const repo = fileURLToPath(new URL('../../', import.meta.url));
const exec = promisify(execFile);
const run = (cwd, command, ...args) => exec(command, args, { cwd, timeout: 240000, maxBuffer: 8 * 1024 * 1024, env: { ...process.env, npm_config_update_notifier: 'false' } });

const made = [];
after(() => Promise.all(made.map((dir) => rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }))));
async function temporary(name) {
  const dir = await mkdtemp(join(tmpdir(), `plumb-${name}-`));
  made.push(dir);
  return dir;
}

let packing;
function packageUnderTest() {
  packing ??= process.env.PLUMB_PACKAGE ? Promise.resolve(process.env.PLUMB_PACKAGE) : (async () => {
    const dir = await temporary('pack');
    const { stdout } = await run(repo, 'npm', 'pack', '--ignore-scripts', '--json', '--pack-destination', dir);
    return join(dir, JSON.parse(stdout)[0].filename);
  })();
  return packing;
}

const REACT = ['react@19.3.1', 'react-dom@19.3.1'];
const next = (version) => ({
  next: true,
  installs: [...REACT, `next@${version}`, `@next/mdx@${version}`, '@mdx-js/loader@^3', '@mdx-js/react@^3'],
});
export const APPS = {
  next15: next('15.5.29'),
  next16: next('16.4.6'),
  vite8: { next: false, installs: [...REACT, 'vite@8.3.4', '@vitejs/plugin-react@^6'] },
};

const CSS = ':root { --space-2: 8px; --space-4: 16px; }\nbody { font: 16px/1.5 sans-serif; margin: 24px; }\n'
  + '.card { padding: 13px; margin-top: 19px; border-radius: 7px; }\n.lead { text-align: center; max-width: 300px; }\n';
const COUNTER = '<div className="count"><p className="client">Words drawn in the browser by a part.</p><button id="count" onClick={() => set(n + 1)}>Count {n}</button></div>';
const PAGE_TOP = '<h1 className="title">A small test page</h1><p className="lead">Words on the page, with a run <b>in bold after them.</b></p><Card title="A card"><p>Words passed into a card.</p></Card>';
const CARD = 'function Card({ title, children }) { return <section className="card"><h2>{title}</h2>{children}</section>; }\n';

// A server component, a client component, words passed into a component and an MDX page's words: each is located differently
const NEXT_FILES = {
  'next.config.mjs': "import createMDX from '@next/mdx';\nimport { withPlumb } from '@unlocalhosted/react-plumber/next/config';\nexport default withPlumb(createMDX()({ pageExtensions: ['js', 'jsx', 'mdx', 'plumb.js'] }));\n",
  'app/%5F_plumb/[...path]/route.plumb.js': "import { createPlumbRoute } from '@unlocalhosted/react-plumber/next';\nexport const runtime = 'nodejs';\nexport const { GET, POST } = createPlumbRoute();\n",
  'app/layout.jsx': "import { PlumbOverlay } from '@unlocalhosted/react-plumber/next/overlay';\nimport './globals.css';\nexport default function Layout({ children }) { return <html lang=\"en\"><body>{children}<PlumbOverlay /></body></html>; }\n",
  'app/Counter.jsx': `'use client';\nimport { useState } from 'react';\nexport function Counter() { const [n, set] = useState(0); return ${COUNTER}; }\n`,
  'app/page.jsx': `import { Counter } from './Counter';\nimport Words from './words.mdx';\n${CARD}export default function Page() { return <main>${PAGE_TOP}<Counter /><div className="mdx"><Words /></div></main>; }\n`,
  'app/words.mdx': '# A heading from MDX\n\nA paragraph written in MDX, with **bold words** in it.\n',
  'app/globals.css': CSS,
  'mdx-components.jsx': 'export function useMDXComponents(components) { return components; }\n',
};
const VITE_FILES = {
  'vite.config.js': "import { plumb } from '@unlocalhosted/react-plumber/vite';\nimport react from '@vitejs/plugin-react';\nexport default { plugins: [plumb(), react()] };\n",
  'index.html': '<!doctype html><html lang="en"><head></head><body><div id="root"></div><script type="module" src="/src/main.jsx"></script></body></html>\n',
  'src/main.jsx': "import { createRoot } from 'react-dom/client';\nimport { App } from './App.jsx';\nimport './app.css';\ncreateRoot(document.getElementById('root')).render(<App />);\n",
  'src/App.jsx': `import { useState } from 'react';\n${CARD}export function App() { const [n, set] = useState(0); return <main>${PAGE_TOP}${COUNTER}</main>; }\n`,
  'src/app.css': CSS,
  // Vite's command reads `--port 0` as no port at all; its API takes it as any free one
  'serve.mjs': "import { createServer } from 'vite';\nconst server = await createServer({ server: { host: '127.0.0.1', port: 0 } });\nawait server.listen();\nconsole.log(`Ready in http://127.0.0.1:${server.httpServer.address().port}`);\n",
};

const installed = new Map();
/** The app of that host, installed once per test file. */
export function installApp(name) {
  if (!installed.has(name)) installed.set(name, install(name));
  return installed.get(name);
}
async function install(name) {
  const spec = APPS[name], root = await temporary(name);
  const files = {
    ...(spec.next ? NEXT_FILES : VITE_FILES),
    'package.json': `${JSON.stringify({ name: `plumb-${name}`, private: true, type: 'module' })}\n`,
    '.gitignore': 'node_modules\n.next\n.vite\n.plumber\n',
  };
  for (const [path, text] of Object.entries(files)) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), text);
  }
  await run(root, 'npm', 'install', '--ignore-scripts', '--no-audit', '--no-fund', '--prefer-offline', '--package-lock=false', ...spec.installs, await packageUnderTest());
  // a repository of its own: what Plumber may edit is what is tracked inside it
  await run(root, 'git', 'init', '-q');
  await run(root, 'git', 'add', '-A');
  const page = spec.next ? 'app/page.jsx' : 'src/App.jsx';
  return { name, root, next: spec.next, page, read: (path = page) => readFile(join(root, path), 'utf8') };
}

/**
 * The app's dev server on a free port, from a clean cache; closed with the test, or by `stop()`.
 * @param bundler 'webpack' | 'turbopack', for Next
 */
export async function serve(t, app, bundler) {
  await rm(join(app.root, '.next'), { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  // Next 15 has no --webpack flag: webpack is its default
  const flags = bundler === 'turbopack' ? ['--turbopack'] : app.name === 'next15' ? [] : ['--webpack'];
  const args = app.next ? [join(app.root, 'node_modules/next/dist/bin/next'), 'dev', ...flags, '--hostname', '127.0.0.1', '--port', '0'] : ['serve.mjs'];
  const env = { ...process.env, NEXT_TELEMETRY_DISABLED: '1' };
  delete env.NODE_ENV;
  const child = spawn(process.execPath, args, { cwd: app.root, env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let logs = '', ended = false;
  const exited = new Promise((resolve) => child.once('exit', () => { ended = true; resolve(); }));
  for (const stream of [child.stdout, child.stderr]) stream.on('data', (chunk) => { logs += chunk; });
  const stop = async () => {
    try { process.kill(-child.pid, 'SIGTERM'); } catch { /* gone */ }
    await Promise.race([exited, delay(4000)]);
    try { process.kill(-child.pid, 'SIGKILL'); } catch { /* gone */ }
    await exited;
  };
  t.after(stop);
  for (let i = 0; i < 900; i++) {
    const url = /Ready in/.test(logs) && /http:\/\/127\.0\.0\.1:\d+/.exec(logs)?.[0];
    if (url) return { url, stop, logs: () => logs };
    if (ended) break;
    await delay(100);
  }
  throw new Error(`${app.name} ${bundler ?? ''} did not start:\n${logs}`);
}
