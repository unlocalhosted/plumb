import { lstat, mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative } from 'node:path';
import MagicString from 'magic-string';
import { parseSync, visitorKeys } from 'oxc-parser';
import type { Node, Program } from 'oxc-parser';
import { nodeName, unwrap } from '../collect/source.js';
import { UsageError } from '../errors.js';

interface Edit { file: string; before: string | undefined; after: string }
const viteModule = '@unlocalhosted/react-plumber/vite';
const nextModule = '@unlocalhosted/react-plumber/next/config';
const overlayModule = '@unlocalhosted/react-plumber/next';
const route = "import { createPlumbRoute } from '@unlocalhosted/react-plumber/next';\n\nexport const runtime = 'nodejs';\nexport const { GET, POST } = createPlumbRoute();\n";

function refuse(message: string): never { throw new UsageError(`Overlay setup refused: ${message}`); }

// Validate every existing ancestor, including for files that will be created.
// A path lexically inside the root can still escape through a symlink.
async function inside(root: string, file: string): Promise<void> {
  let ancestor = file;
  for (;;) {
    try {
      const path = relative(root, await realpath(ancestor)).replaceAll('\\', '/');
      if (path === '..' || path.startsWith('../') || isAbsolute(path)) refuse(`${relative(root, file)} resolves outside the project root.`);
      return;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      const entry = await lstat(ancestor).catch(missing => {
        if ((missing as NodeJS.ErrnoException).code !== 'ENOENT') throw missing;
        return undefined;
      });
      if (entry?.isSymbolicLink()) refuse(`${relative(root, ancestor)} is a dangling symlink.`);
      const parent = dirname(ancestor);
      if (parent === ancestor) throw error;
      ancestor = parent;
    }
  }
}
async function content(root: string, file: string): Promise<string | undefined> {
  await inside(root, file);
  try { return await readFile(file, 'utf8'); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined; throw error; }
}
async function find(root: string, names: string[]): Promise<{ file: string; source: string }> {
  const found: { file: string; source: string }[] = [];
  for (const name of names) {
    const file = join(root, name), source = await content(root, file);
    if (source !== undefined) found.push({ file, source });
  }
  if (found.length !== 1) refuse(`expected one of ${names.join(', ')}; found ${found.length}.`);
  return found[0]!;
}
function parse(file: string, source: string, jsx = false): Program {
  const parsed = parseSync(file, source, jsx ? { lang: file.endsWith('.tsx') ? 'tsx' : 'jsx' } : {});
  if (parsed.errors.length) refuse(`cannot parse ${file}: ${parsed.errors[0]!.message}`);
  return parsed.program;
}
function walk(node: Node, visit: (node: Node) => void): void {
  visit(node);
  const record = node as unknown as Record<string, unknown>;
  for (const key of visitorKeys[node.type] ?? []) {
    const value = record[key];
    for (const child of Array.isArray(value) ? value : [value]) if (child && typeof child === 'object') walk(child as Node, visit);
  }
}
function imported(ast: Program, module: string, name: string): string | undefined {
  for (const item of ast.body) if (item.type === 'ImportDeclaration' && item.source.value === module && item.importKind !== 'type') {
    if (module === viteModule && name === 'plumb') {
      const defaultImport = item.specifiers.find(specifier => specifier.type === 'ImportDefaultSpecifier');
      if (defaultImport) return defaultImport.local.name;
    }
    for (const specifier of item.specifiers) if (specifier.type === 'ImportSpecifier' && specifier.importKind !== 'type' && nodeName(specifier.imported) === name) return specifier.local.name;
  }
  for (const item of ast.body) if (item.type === 'VariableDeclaration') {
    for (const declaration of item.declarations) {
      const value = declaration.init;
      if (declaration.id.type !== 'ObjectPattern' || value?.type !== 'CallExpression' || value.callee.type !== 'Identifier' || value.callee.name !== 'require' || value.arguments[0]?.type !== 'Literal' || value.arguments[0].value !== module) continue;
      for (const property of declaration.id.properties) if (property.type === 'Property' && nodeName(property.key) === name && property.value.type === 'Identifier') return property.value.name;
    }
  }
  return undefined;
}
function importName(ast: Program, module: string, name: string): string {
  const existing = imported(ast, module, name);
  if (existing) return existing;
  // Do not introduce a binding which would shadow an authored name.
  let collision = false;
  const binding = (node: Node) => walk(node, child => { if (child.type === 'Identifier' && child.name === name) collision = true; });
  walk(ast, node => {
    if (node.type === 'VariableDeclarator') binding(node.id);
    if (node.type === 'ImportSpecifier' || node.type === 'ImportDefaultSpecifier' || node.type === 'ImportNamespaceSpecifier') binding(node.local);
    if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression') {
      if ('id' in node && node.id) binding(node.id);
      for (const parameter of node.params) binding(parameter);
    }
    if (node.type === 'ClassDeclaration' && node.id) binding(node.id);
  });
  if (collision) refuse(`${name} is already used without an import from ${module}.`);
  return name;
}
function newline(source: string): string { return source.includes('\r\n') ? '\r\n' : '\n'; }
function addImport(text: MagicString, ast: Program, source: string, module: string, name: string, commonJS = false): void {
  if (imported(ast, module, name)) return;
  const imports = ast.body.filter(item => item.type === 'ImportDeclaration');
  const last = imports.at(-1);
  const quote = last && source[last.source.start] === '"' ? '"' : "'";
  const semi = !last || source.slice(last.start, last.end).endsWith(';') ? ';' : '';
  const statement = commonJS ? `const { ${name} } = require(${quote}${module}${quote})${semi}` : `import { ${name} } from ${quote}${module}${quote}${semi}`;
  // Import starts are AST-proven boundaries. A trailing multiline comment
  // makes the next newline an unsafe insertion point.
  if (imports[0]) text.appendLeft(imports[0].start, statement + newline(source));
  else {
    const first = ast.body.find(item => !(item.type === 'ExpressionStatement' && item.expression.type === 'Literal' && typeof item.expression.value === 'string'));
    const at = first?.start ?? (source.startsWith('#!') ? source.indexOf('\n') + 1 : 0);
    text.appendLeft(at, statement + newline(source));
  }
}
function constant(ast: Program, node: Node): Node {
  node = unwrap(node);
  if (node.type !== 'Identifier') return node;
  const name = node.name;
  for (const statement of ast.body) {
    const declaration = statement.type === 'ExportNamedDeclaration' ? statement.declaration : statement;
    if (declaration?.type !== 'VariableDeclaration' || declaration.kind !== 'const') continue;
    const match = declaration.declarations.find(item => item.id.type === 'Identifier' && item.id.name === name);
    if (match?.init) return unwrap(match.init);
  }
  return refuse(`config ${name} must be a local const object literal.`);
}
function exported(ast: Program): Node {
  const targets: Node[] = [];
  for (const statement of ast.body) {
    if (statement.type === 'ExportDefaultDeclaration') targets.push(statement.declaration);
    if (statement.type === 'ExpressionStatement' && statement.expression.type === 'AssignmentExpression') {
      const expression = statement.expression, left = expression.left;
      if (left.type === 'MemberExpression' && !left.computed && left.object.type === 'Identifier' && left.object.name === 'module' && nodeName(left.property) === 'exports') targets.push(expression.right);
    }
  }
  if (targets.length !== 1) refuse('config must have one default export or module.exports assignment.');
  return targets[0]!;
}
function object(ast: Program, value: Node): Extract<Node, { type: 'ObjectExpression' }> {
  const node = constant(ast, value);
  if (node.type !== 'ObjectExpression') refuse('config must be a plain object literal; functions and composed configs need manual wiring.');
  if (node.properties.some(item => item.type === 'SpreadElement' || item.computed || item.kind !== 'init' || item.method)) refuse('config has spreads, computed keys or accessors; manual wiring required.');
  return node;
}
function firstEntry(source: string, at: number, first: Node | undefined, entry: string): string {
  const tail = source.slice(at + 1, first?.start);
  if (tail.includes('\n')) {
    const indentation = first ? /^[\t ]*/.exec(source.slice(source.lastIndexOf('\n', first.start - 1) + 1))![0] : '  ';
    return newline(source) + indentation + entry + (first ? ',' : '');
  }
  return entry + (first ? ', ' : '');
}
// Find a separator outside comments. Never consume or rewrite authored comments.
function comma(source: string, start: number, end: number): number | undefined {
  const match = /\/\*[\s\S]*?\*\/|\/\/[^\r\n]*|,/g;
  const slice = source.slice(start, end);
  for (let token; (token = match.exec(slice));) if (token[0] === ',') return start + token.index;
  return undefined;
}
function viteConfig(file: string, source: string): string {
  const ast = parse(file, source), name = importName(ast, viteModule, 'plumb'), text = new MagicString(source);
  let value = constant(ast, exported(ast));
  if (value.type === 'CallExpression' && value.callee.type === 'Identifier' && value.callee.name === imported(ast, 'vite', 'defineConfig') && value.arguments.length === 1) value = value.arguments[0]!;
  const config = object(ast, value);
  const properties = config.properties.filter((item): item is Extract<typeof item, { type: 'Property' }> => item.type === 'Property' && nodeName(item.key) === 'plugins');
  if (properties.length > 1) refuse('config has multiple plugins properties.');
  const property = properties[0];
  if (!property) text.appendLeft(config.start + 1, firstEntry(source, config.start, config.properties[0], `plugins: [${name}()]`));
  else {
    const array = unwrap(property.value);
    if (array.type !== 'ArrayExpression' || array.elements.some(item => !item || item.type === 'SpreadElement')) refuse('plugins must be a literal array without spreads.');
    const elements = array.elements as Node[];
    const installed = elements.filter(item => item.type === 'CallExpression' && item.callee.type === 'Identifier' && item.callee.name === name);
    if (installed.length > 1) refuse('plugins contains more than one React Plumber call.');
    const previous = installed[0];
    if (previous !== elements[0] || !previous) {
      const call = previous ? source.slice(previous.start, previous.end) : `${name}()`;
      text.appendLeft(array.start + 1, firstEntry(source, array.start, elements[0], call));
      if (previous) {
        const index = elements.indexOf(previous);
        const after = comma(source, previous.end, elements[index + 1]?.start ?? array.end - 1);
        const separator = after ?? comma(source, elements[index - 1]!.end, previous.start);
        text.remove(previous.start, previous.end);
        if (separator !== undefined) text.remove(separator, separator + 1);
      }
    }
  }
  addImport(text, ast, source, viteModule, 'plumb');
  const result = text.toString();
  parse(file, result);
  return result;
}
function nextConfig(file: string, source: string): string {
  const ast = parse(file, source), name = importName(ast, nextModule, 'withPlumb'), text = new MagicString(source);
  const value = exported(ast), node = unwrap(value);
  const wrapped = node.type === 'CallExpression' && node.callee.type === 'Identifier' && node.callee.name === name;
  if (wrapped) {
    if (node.arguments.length !== 1) refuse('withPlumb must wrap one plain config object.');
    object(ast, node.arguments[0]!);
  } else {
    object(ast, value);
    text.appendLeft(value.start, `${name}(`); text.appendLeft(value.end, ')');
  }
  const commonJS = !ast.body.some(item => item.type === 'ExportDefaultDeclaration');
  addImport(text, ast, source, nextModule, 'withPlumb', commonJS);
  const result = text.toString();
  parse(file, result);
  return result;
}
function nextLayout(file: string, source: string): string {
  const ast = parse(file, source, true), name = importName(ast, overlayModule, 'PlumbOverlay'), text = new MagicString(source);
  const bodies: Extract<Node, { type: 'JSXElement' }>[] = [];
  walk(ast, node => { if (node.type === 'JSXElement' && nodeName(node.openingElement.name) === 'body') bodies.push(node); });
  if (!ast.body.some(item => item.type === 'ExportDefaultDeclaration') || bodies.length !== 1 || !bodies[0]!.closingElement) refuse('root layout needs one explicit <body> in a default-exported layout.');
  const body = bodies[0]!;
  let present = false;
  walk(body, node => { if (node.type === 'JSXOpeningElement' && nodeName(node.name) === name) present = true; });
  if (!present) {
    const at = body.closingElement!.start, indentation = source.slice(source.lastIndexOf('\n', at - 1) + 1, at);
    text.appendLeft(at, /^[\t ]*$/.test(indentation) ? `  <${name} />${newline(source)}${indentation}` : `<${name} />`);
  }
  addImport(text, ast, source, overlayModule, 'PlumbOverlay');
  const result = text.toString();
  parse(file, result, true);
  return result;
}
function diff(edit: Edit, root: string): string {
  const lines = (source: string | undefined) => source ? source.replace(/\n$/, '').split('\n') : [];
  const file = relative(root, edit.file), before = lines(edit.before), after = lines(edit.after);
  let start = 0, end = 0;
  while (start < before.length && start < after.length && before[start] === after[start]) start++;
  while (end < before.length - start && end < after.length - start && before[before.length - end - 1] === after[after.length - end - 1]) end++;
  const old = before.slice(start, before.length - end), next = after.slice(start, after.length - end);
  return `--- ${edit.before === undefined ? '/dev/null' : file}\n+++ ${file}\n@@ -${old.length ? start + 1 : start},${old.length} +${next.length ? start + 1 : start},${next.length} @@\n` + [...old.flatMap((line, index) => ['-' + line, ...(start + index === before.length - 1 && !edit.before?.endsWith('\n') ? ['\\ No newline at end of file'] : [])]), ...next.flatMap((line, index) => ['+' + line, ...(start + index === after.length - 1 && !edit.after.endsWith('\n') ? ['\\ No newline at end of file'] : [])])].join('\n') + '\n';
}

/** Plan and validate all files before writing; no package manager or parent-repo discovery. */
export async function writeOverlay(project: string, host: 'vite' | 'next' | undefined): Promise<string> {
  const root = await realpath(project), edits: Edit[] = [];
  if (host === 'vite') {
    const { file, source } = await find(root, ['ts', 'mts', 'js', 'mjs'].map(extension => `vite.config.${extension}`));
    edits.push({ file, before: source, after: viteConfig(file, source) });
  } else if (host === 'next') {
    const config = await find(root, ['ts', 'mts', 'js', 'mjs', 'cjs'].map(extension => `next.config.${extension}`));
    edits.push({ file: config.file, before: config.source, after: nextConfig(config.file, config.source) });
    // Next gives app/ precedence over src/app/. Mirror that without guessing.
    const extensions = ['tsx', 'jsx', 'js'];
    const topLevel = await Promise.all(extensions.map(extension => content(root, join(root, `app/layout.${extension}`))));
    const app = topLevel.some(source => source !== undefined) ? 'app' : 'src/app';
    const layout = await find(root, extensions.map(extension => `${app}/layout.${extension}`));
    edits.push({ file: layout.file, before: layout.source, after: nextLayout(layout.file, layout.source) });
    const file = join(root, app, '%5F_plumb/[...path]/route.plumb.ts'), before = await content(root, file);
    if (before !== undefined && before.replace(/[\s;]/g, '') !== route.replace(/[\s;]/g, '')) refuse(`${relative(root, file)} already exists with different content; keep it and wire manually.`);
    edits.push({ file, before, after: before ?? route });
  } else refuse('--write supports Vite and Next.js App Router projects; this host needs manual wiring.');
  const changed = edits.filter(edit => edit.before !== edit.after);
  for (const edit of changed) await inside(root, edit.file);
  for (const edit of changed) {
    await mkdir(dirname(edit.file), { recursive: true });
    await writeFile(edit.file, edit.after, { flag: edit.before === undefined ? 'wx' : 'w' });
  }
  return changed.length ? changed.map(edit => diff(edit, root) + `Wrote ${relative(root, edit.file)}.\n`).join('\n') : 'Overlay already set up; no files changed.\n';
}

// Shared structural config editing; readiness uses the same conservative parser.
export { parse, walk, imported, importName, constant, exported, object, firstEntry, comma, viteConfig, diff };
