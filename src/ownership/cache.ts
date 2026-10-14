import { cacheDirectory } from '../paths.js';
import { serialize as serializeReceipt, deserialize } from 'node:v8';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { globSync } from 'tinyglobby';
import type { PlumbConfig } from '../config.js';
import type { ComponentGraph, ComponentIdentity } from './components.js';
import type { Site } from '../report.js';

const hash = (text: string) => createHash('sha256').update(text).digest('hex');
export const componentFiles = (directory: string) => existsSync(directory) ? globSync('**/*.{tsx,jsx,ts,js,mts,mjs,cts,cjs}', {
  cwd: directory, absolute: true, ignore: ['**/node_modules/**', '**/*.d.ts'], followSymbolicLinks: false,
}).sort() : [];
export const fileHash = (file: string) => {
  try { return existsSync(file) ? statSync(file).isDirectory() ? '<directory>' : hash(readFileSync(file, 'utf8')) : null; }
  catch { return null; }
};

function serialize(graph: ComponentGraph, lines: Map<string, number[]>) {
  const ids = new Map(graph.components.map((component, index) => [component, index]));
  const id = (component: ComponentIdentity) => ids.get(component)!;
  return {
    diagnostics: graph.diagnostics, root: graph.root, components: graph.components, used: graph.used.map(id), lines: [...lines],
    usages: [...graph.usages].map(([file, usages]) => [file, usages.map(usage => ({ ...usage, component: id(usage.component) }))] as const),
    mounts: graph.mounts.map(mount => ({ ...mount, component: id(mount.component) })),
    elements: graph.elements.map(({ component, ...element }) => ({ ...element, ...(component ? { component: id(component) } : {}) })),
    rootRanges: [...graph.rootRanges].map(([component, ranges]) => [id(component), ranges] as const),
    fingerprintClasses: [...graph.fingerprintClasses].map(([component, classes]) => [id(component), classes] as const),
    sourceTokens: [...graph.sourceTokens].map(([file, tokens]) => [file, { classes: [...tokens.classes], variables: [...tokens.variables] }] as const),
  };
}
type GraphData = ReturnType<typeof serialize>;
function hydrate(data: GraphData): ComponentGraph {
  const component = (id: number) => data.components[id]!;
  const usages = new Map(data.usages.map(([file, usages]) => [file, usages.map(usage => ({ ...usage, component: component(usage.component) }))]));
  const elements = data.elements.map(({ component: id, ...element }) => ({ ...element, ...(id === undefined ? {} : { component: component(id) }) }));
  const byFile = new Map<string, typeof elements>();
  for (const element of elements) { const group = byFile.get(element.site.file) ?? []; group.push(element); byFile.set(element.site.file, group); }
  const lines = new Map(data.lines), elementSites = new Map<string, ReturnType<ComponentGraph['element']>>(), callerSites = new Map<string, ComponentIdentity | undefined>();
  const offset = (site: Site) => (lines.get(site.file)?.[site.line - 1] ?? NaN) + site.column - 1;
  return {
    diagnostics: data.diagnostics, root: data.root, components: data.components, used: data.used.map(component), usages,
    mounts: data.mounts.map(mount => ({ ...mount, component: component(mount.component) })), elements,
    rootRanges: new Map(data.rootRanges.map(([id, ranges]) => [component(id), ranges])),
    fingerprintClasses: new Map(data.fingerprintClasses.map(([id, classes]) => [component(id), classes])),
    sourceTokens: new Map(data.sourceTokens.map(([file, tokens]) => [file, { classes: new Set(tokens.classes), variables: new Set(tokens.variables) }])),
    element(site) {
      const at = offset(site), key = `${site.file}\0${at}`;
      if (!elementSites.has(key)) elementSites.set(key, byFile.get(site.file)?.filter(item => item.styling.some(range => at >= range.start && at < range.end))
        .sort((a, b) => (a.end - a.start) - (b.end - b.start))[0]);
      return elementSites.get(key);
    },
    caller(declaration) {
      const site = declaration.site, at = offset(site), key = `${site.file}\0${at}`;
      if (!callerSites.has(key)) {
        const usage = usages.get(site.file)?.find(item => at >= item.start && at < item.end);
        callerSites.set(key, usage?.component.source.file === site.file ? undefined : usage?.component);
      }
      return callerSites.get(key);
    },
  };
}
interface Receipt { graph: GraphData; files: [string, string | null][]; directories: [string, string[]][]; resolutions: [string, string | undefined][]; contexts: [string, string | undefined][] }
export function componentCache(root: string, files: string[], config: PlumbConfig, includeUnused: boolean) {
  const directory = resolve(cacheDirectory(root), 'components');
  const path = join(directory, hash(JSON.stringify(['components-v3-isolated', root, files, config.components, Object.keys(config.imitation ?? {}), includeUnused])) + '.v8');
  return {
    read(resolveImport: (file: string, specifier: string) => string | undefined, resolveContext: (file: string, specifier: string) => string | undefined): ComponentGraph | undefined {
      let receipt: Receipt;
      try { receipt = deserialize(readFileSync(path)) as Receipt; }
      catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT' || error instanceof SyntaxError || error instanceof Error && error.message.startsWith('Unable to deserialize')) return; throw error; }
      if (receipt.files.some(([file, previous]) => fileHash(file) !== previous)) return;
      if (receipt.directories.some(([directory, previous]) => JSON.stringify(componentFiles(directory)) !== JSON.stringify(previous))) return;
      // Fresh resolution revalidates tsconfig, exports and symlink changes. Never
      // trust importer timestamps for independently changing resolution inputs.
      if (receipt.resolutions.some(([key, previous]) => { const [file, specifier] = key.split('\0'); return resolveImport(file!, specifier!) !== (previous ?? undefined); })) return;
      if (receipt.contexts.some(([key, previous]) => { const [file, specifier] = key.split('\0'); return resolveContext(file!, specifier!) !== (previous ?? undefined); })) return;
      return hydrate(receipt.graph);
    },
    write(graph: ComponentGraph, lines: Map<string, number[]>, files: Map<string, string | null>, directories: Map<string, string[]>, resolutions: Map<string, string | undefined>, contexts: Map<string, string | undefined>): void {
      const receipt: Receipt = { graph: serialize(graph, lines), files: [...files], directories: [...directories], resolutions: [...resolutions], contexts: [...contexts] };
      mkdirSync(dirname(path), { recursive: true });
      const temporary = `${path}.${process.pid}.tmp`;
      writeFileSync(temporary, serializeReceipt(receipt)); renameSync(temporary, path);
    },
  };
}
