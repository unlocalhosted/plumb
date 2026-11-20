// Plumber's craft engine, built into one module the site's pages can load at run time (public/engine/craft.js).
// The site's bundler (Turbopack) can't take the engine's own source: it tries to bundle the engine's server address,
// new URL(..., import.meta.url), and fails on it however it is written. Built the way the generator's reader builds it.
// The engine asks its server two things as it judges: the craft spec and the theme's decisions. No plumber server
// stands behind this copy, so both are files beside it: the standard spec, and no decisions.
//   node web/scripts/engine.mjs   (run by `npm run dev` and `npm run build`)
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolveSpec } from '../../overlay/src/craft-spec.js';
const repo = fileURLToPath(new URL('../../', import.meta.url)), out = `${repo}web/public/engine/`;
await mkdir(out, { recursive: true });
execFileSync(`${repo}node_modules/.bin/rolldown`, [`${repo}generator/read-entry.js`, '--format', 'esm', '-o', `${out}craft.js`], { stdio: 'ignore' });
// the engine's server is its own folder here, where the two answers are
const js = await readFile(`${out}craft.js`, 'utf8'), server = /let base = new URL\([^,]+, import\.meta\.url\)\.href;/;
if (!server.test(js)) throw new Error('the engine no longer sets its server as `let base = new URL(..., import.meta.url).href`: see overlay/src/api.js');
await writeFile(`${out}craft.js`, js.replace(server, 'let base = new URL("./", import.meta.url).href;'));
await writeFile(`${out}spec`, JSON.stringify(resolveSpec()));
await writeFile(`${out}decisions`, '[]');
