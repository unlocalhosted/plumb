// Instrument a temporary built collector and Oxc's shipped deserializer.
// No project writes or installed-package edits. Run after `npm run build`.
import { readFile, writeFile, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { performance } from 'node:perf_hooks';
import { resolve } from 'node:path';
import { parseSync, rawTransferSupported } from 'oxc-parser';
import { loadConfig } from '../../dist/config.js';
import { sourceFiles } from '../../dist/project.js';
const mode = process.argv[2] ?? 'raw';
if (!['json', 'raw'].includes(mode)) throw new Error('Use json or raw');
const require = createRequire(import.meta.url);
let deserializeMs = 0;
const deserializers = new Map();
const { parseSyncRawImpl, returnBufferToCache, isJsAst } = await import('oxc-parser/src-js/raw-transfer/common');
// Oxc eager raw transfer does all deserialization inside parseSync. Time its
// callback separately; timing the program getter alone would hide that work.
globalThis.__plumbProfileParse = (file, text) => mode === 'json' ? parseSync(file, text) :
  parseSyncRawImpl(file, text, {}, (buffer, sourceText, sourceStart, byteLength) => {
    const start = performance.now();
    const type = isJsAst(buffer) ? 'js' : 'ts';
    if (!deserializers.has(type)) deserializers.set(type, require(`oxc-parser/src-js/generated/deserialize/${type}`).deserialize);
    const result = deserializers.get(type)(buffer, sourceText, sourceStart, byteLength);
    returnBufferToCache(buffer);
    deserializeMs += performance.now() - start;
    return result;
  });
const root = '/Users/vijaysingh/unlocalhosted/metalui';
const config = await loadConfig(root, resolve('bench/metalui/plumb.config.ts'));
const files = await sourceFiles(root, config.value);
let code = await readFile('dist/collect/classes.js', 'utf8');
code = code.replace('let parseMs = 0;', 'let parseMs = 0, getterMs = 0, parsedFiles = 0, walkMs = 0;');
code = code.replace(/const result = parseSync\(file, text[^;]*;/, 'const result = globalThis.__plumbProfileParse(file, text); const getterStart = performance.now(); parsedFiles++;');
code = code.replace('const ast = result.program;', 'const ast = result.program; getterMs += performance.now() - getterStart;');
code = code.replace("walk(ast, [imports], { kind: 'component', name: '<module>' });", "const walkStart = performance.now(); walk(ast, [imports], { kind: 'component', name: '<module>' }); walkMs += performance.now() - walkStart;");
code = code.replace('return { sites: [...sites.values()], opaque, parseMs,', 'return { getterMs, parsedFiles, walkMs, sites: [...sites.values()], opaque, parseMs,');
const temporary = resolve(`dist/collect/profile-${process.pid}.js`);
await writeFile(temporary, code);
try {
  const { collectClasses } = await import(temporary);
  const result = await collectClasses(files, config.value.classHelpers);
  const hash = createHash('sha256').update(JSON.stringify([result.sites, result.opaque])).digest('hex');
  delete result.sites;
  const astDeserializeMs = mode === 'raw' ? deserializeMs + result.getterMs : result.getterMs;
  console.log(JSON.stringify({ mode, rawTransferSupported: rawTransferSupported(), files: files.length, hash,
    nativeAndTransferMs: result.parseMs - astDeserializeMs, astDeserializeMs, ...result }));
} finally { await rm(temporary); delete globalThis.__plumbProfileParse; }
