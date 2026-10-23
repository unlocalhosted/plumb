import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import MagicString from 'magic-string';
import { ResolverFactory } from 'oxc-resolver';
import type { Node } from 'oxc-parser';
import { nodeName, unwrap } from '../collect/source.js';
import { parse, walk, imported, constant, exported, object, firstEntry, comma, viteConfig } from '../adoption/overlay.js';

type ObjectNode = Extract<Node, { type: 'ObjectExpression' }>;
type Property = Extract<ObjectNode['properties'][number], { type: 'Property' }>;
const reactModules = ['@vitejs/plugin-react', '@vitejs/plugin-react-swc', '@vitejs/plugin-react-oxc'];
export function installedRefresh(file: string): string | undefined {
  // Readiness runs again after installs in a live process. Node's package lookup
  // caches missing packages; a fresh resolver must observe newly installed files.
  const resolver = new ResolverFactory({ conditionNames: ['node', 'import', 'default'] });
  for (const module of reactModules) {
    if (resolver.sync(dirname(file), module).path) return module;
  }
  return undefined;
}
export interface HostConfig {
  file: string; source: string; host: 'vite' | 'next';
  plugin?: boolean | undefined; ordered?: boolean | undefined; refresh?: boolean | undefined; hmr?: boolean | undefined; polling?: boolean | undefined; watching?: boolean | undefined;
  offsets: Record<string, number>;
  changes: Record<string, string>;
}
function property(node: ObjectNode, key: string): Property | undefined {
  const properties = node.properties.filter((item): item is Property => item.type === 'Property' && nodeName(item.key) === key);
  if (properties.length > 1) throw Error('Duplicate config properties need manual review.');
  return properties[0];
}
const boolean = (node: Node | undefined): boolean | undefined => node?.type === 'Literal' && typeof node.value === 'boolean' ? node.value : undefined;
function set(text: MagicString, source: string, node: ObjectNode, key: string, value: string): void {
  const existing = property(node, key);
  if (existing) text.overwrite(existing.value.start, existing.value.end, value);
  else text.appendLeft(node.start + 1, firstEntry(source, node.start, node.properties[0], `${key}: ${value}`));
}
function child(ast: ReturnType<typeof parse>, node: ObjectNode, key: string): ObjectNode | undefined {
  const entry = property(node, key);
  return entry ? object(ast, entry.value) : undefined;
}
function remove(text: MagicString, source: string, node: ObjectNode, entry: Property): void {
  const index = node.properties.indexOf(entry), next = node.properties[index + 1], previous = node.properties[index - 1];
  const separator = comma(source, entry.end, next?.start ?? node.end - 1) ?? (previous ? comma(source, previous.end, entry.start) : undefined);
  text.remove(entry.start, entry.end);
  if (separator !== undefined) text.remove(separator, separator + 1);
}

/** Unreadable, composed and ambiguous configs retain unknown facts. No execution. */
export async function hostConfig(root: string): Promise<HostConfig | undefined> {
  const found: HostConfig[] = [];
  for (const host of ['vite', 'next'] as const) for (const extension of ['ts', 'mts', 'js', 'mjs', ...(host === 'next' ? ['cjs'] : [])]) {
    const file = join(root, `${host}.config.${extension}`);
    try { found.push({ file, source: await readFile(file, 'utf8'), host, offsets: {}, changes: {} }); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  }
  if (found.length !== 1) return;
  const result = found[0]!, { file, source, host } = result;
  try {
    const ast = parse(file, source);
    let value = constant(ast, exported(ast));
    const wrapper = host === 'vite' ? imported(ast, 'vite', 'defineConfig') : imported(ast, '@unlocalhosted/react-plumber/next/config', 'withPlumb');
    if (value.type === 'CallExpression' && value.callee.type === 'Identifier' && value.callee.name === wrapper && value.arguments.length === 1) {
      if (host === 'next') { result.plugin = true; result.ordered = true; }
      value = constant(ast, value.arguments[0]!);
    } else if (host === 'next' && value.type === 'ObjectExpression') result.plugin = false;
    const config = object(ast, value);
    if (host === 'next') return result;
    const plugins = property(config, 'plugins');
    result.offsets.plugin = plugins?.start ?? config.start;
    if (!plugins) { result.plugin = false; result.ordered = false; result.refresh = false; }
    else {
      const array = unwrap(plugins.value);
      if (array.type === 'ArrayExpression' && array.elements.every(item => item && item.type !== 'SpreadElement')) {
        const plumb = imported(ast, '@unlocalhosted/react-plumber/vite', 'plumb');
        const refresh = ast.body.filter(item => item.type === 'ImportDeclaration' && reactModules.includes(item.source.value)).flatMap(item => item.type === 'ImportDeclaration' ? item.specifiers.filter(item => item.type === 'ImportDefaultSpecifier').map(item => item.local.name) : []);
        const calls = array.elements.map(item => item?.type === 'CallExpression' && item.callee.type === 'Identifier' ? item.callee.name : undefined);
        // Unknown expressions may hide either plugin, so absence isn't proof.
        const known = array.elements.every(item => {
          if (item?.type !== 'CallExpression' || item.callee.type !== 'Identifier') return false;
          const name = item.callee.name;
          return ast.body.some(statement => statement.type === 'ImportDeclaration' && statement.specifiers.some(specifier => specifier.local.name === name));
        });
        const transformers = ast.body.filter(item => item.type === 'ImportDeclaration' && item.importKind !== 'type' &&
          (['@vitejs/plugin-react', '@vitejs/plugin-react-swc', '@vitejs/plugin-react-oxc', '@preact/preset-vite'].includes(item.source.value) ||
            /(?:^|[/\-])babel(?:$|[/\-])/.test(item.source.value)))
          .flatMap(item => item.type === 'ImportDeclaration' ? item.specifiers.map(specifier => specifier.local.name) : []);
        const plumbIndex = plumb ? calls.indexOf(plumb) : -1;
        if (plumbIndex >= 0) {
          result.plugin = true;
          const before = calls.slice(0, plumbIndex);
          const transformIndex = before.findIndex(name => name && transformers.includes(name));
          result.ordered = transformIndex >= 0 ? false : before.every(Boolean) ? true : undefined;
          if (transformIndex >= 0 && calls.filter(name => name === plumb).length === 1) {
            const previous = array.elements[plumbIndex]!, target = array.elements[transformIndex]!;
            const edit = new MagicString(source);
            edit.appendLeft(target.start, `${source.slice(previous.start, previous.end)}, `);
            const separator = comma(source, previous.end, array.elements[plumbIndex + 1]?.start ?? array.end - 1) ??
              comma(source, array.elements[plumbIndex - 1]!.end, previous.start);
            edit.remove(previous.start, previous.end);
            if (separator !== undefined) edit.remove(separator, separator + 1);
            result.changes['locate.order'] = edit.toString();
          }
        } else if (known || !array.elements.length) { result.plugin = false; result.ordered = false; }
        if (calls.some(name => name && refresh.includes(name))) result.refresh = true;
        else if (known || !array.elements.length) result.refresh = false;
        if (result.refresh === false && result.plugin && calls.filter(name => name === plumb).length === 1) {
          // Use the installed official plugin. Never edit package.json or install.
          const module = installedRefresh(file);
          if (module) {
            const existing = ast.body.find(item => item.type === 'ImportDeclaration' && item.source.value === module);
            let name = existing?.type === 'ImportDeclaration' ? existing.specifiers.find(item => item.type === 'ImportDefaultSpecifier')?.local.name : undefined;
            const edit = new MagicString(source);
            if (!name) {
              const names = new Set<string>(); walk(ast, node => { if (node.type === 'Identifier') names.add(node.name); });
              name = 'plumberReact'; while (names.has(name)) name += '_';
              edit.appendLeft(ast.body[0]?.start ?? 0, `import ${name} from '${module}';\n`);
            }
            const plumber = array.elements[plumbIndex]!;
            edit.appendLeft(plumber.end, `, ${name}()`);
            result.changes['write.refresh'] = edit.toString();
          }
        }
      }
    }
    try {
      result.changes['locate.plugin'] = viteConfig(file, source);
      if (result.plugin === false) result.changes['locate.order'] = result.changes['locate.plugin']!;
    } catch {}
    // Check and edit each server setting independently; an opaque watcher must
    // not hide an explicit hmr:false, and no nested object is guessed.
    const server = child(ast, config, 'server');
    const hmr = server && property(server, 'hmr');
    result.offsets.hmr = hmr?.start ?? server?.start ?? config.start;
    result.hmr = hmr ? (boolean(unwrap(hmr.value)) ?? (unwrap(hmr.value).type === 'ObjectExpression' ? true : undefined)) : true;
    if (hmr && result.hmr === false) {
      const edit = new MagicString(source); remove(edit, source, server!, hmr); result.changes['write.hmr'] = edit.toString();
    }
    const watchSetting = server && property(server, 'watch');
    if (watchSetting?.value.type === 'Literal' && watchSetting.value.value === null) {
      result.watching = false; result.polling = false; result.offsets.watcher = watchSetting.start;
      const edit = new MagicString(source);
      set(edit, source, server!, 'watch', '{ usePolling: true, interval: 100, awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 100 } }');
      result.changes['write.watcher'] = edit.toString();
    }
    try {
      const watch = server && child(ast, server, 'watch');
      const polling = watch && property(watch, 'usePolling');
      result.polling = polling ? boolean(unwrap(polling.value)) : false;
      result.offsets.watcher = polling?.start ?? watch?.start ?? server?.start ?? config.start;
      const edit = new MagicString(source), pollingOptions = '{ usePolling: true, interval: 100, awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 100 } }';
      if (!server) set(edit, source, config, 'server', `{ watch: ${pollingOptions} }`);
      else if (!watch || !watch.properties.length) set(edit, source, server, 'watch', pollingOptions);
      else {
        set(edit, source, watch, 'usePolling', 'true');
        set(edit, source, watch, 'interval', '100');
        if (!property(watch, 'awaitWriteFinish') || boolean(property(watch, 'awaitWriteFinish')!.value) === false) set(edit, source, watch, 'awaitWriteFinish', '{ stabilityThreshold: 200, pollInterval: 100 }');
      }
      result.changes['write.watcher'] = edit.toString();
    } catch {}
    for (const [id, after] of Object.entries(result.changes)) { try { parse(file, after); } catch { delete result.changes[id]; } }
  } catch { /* No inferred facts for the portion which could not be read. */ }
  return result;
}
