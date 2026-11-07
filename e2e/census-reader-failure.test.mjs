// `plumber census`: when one page can't be read, the crawl ends with an error and the process exits. It used to hang:
// the second reader waited forever for the first one's route to be counted. Real CLI and Chromium against a page
// whose own script breaks the DOM reads the census uses.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const repo = fileURLToPath(new URL('../', import.meta.url)), cli = join(repo, 'dist/cli.js');
const PAGE = `<!doctype html><html><body><p data-plumb-source="src/App.tsx:1:1">Hello</p>
<script>Element.prototype.querySelectorAll = function () { throw new Error('this page broke querySelectorAll'); };</script></body></html>`;

test('a page the census cannot read ends the crawl with an error, and the process exits', async t => {
  const root = await mkdtemp(join(repo, 'fixtures/.census-failure-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const server = createServer((_request, response) => { response.writeHead(200, { 'content-type': 'text/html' }); response.end(PAGE); });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => server.close());
  const child = spawn(process.execPath, [cli, 'census', '--url', `http://127.0.0.1:${server.address().port}/`, '--routes', '/', '--root', root], { stdio: ['ignore', 'pipe', 'pipe'] });
  let stderr = ''; child.stderr.on('data', chunk => stderr += chunk); child.stdout.resume();
  const timer = setTimeout(() => child.kill('SIGKILL'), 30000);
  const [code, signal] = await once(child, 'exit'); clearTimeout(timer);
  assert.equal(signal, null, `the census never exited after its reader failed:\n${stderr}`);
  assert.notEqual(code, 0);
  assert.match(stderr, /querySelectorAll/);
});
