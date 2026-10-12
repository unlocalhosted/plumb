import { serialize, deserialize } from 'node:v8';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { ClassSite } from './classes.js';
import type { SourceStyles } from './inline.js';
import type { InlineSite } from './inline.js';
import type { Finding } from '../report.js';
import type { ModuleImport } from './modules.js';
import type { ClassHelperInput } from './class-helpers.js';

export const sourceHash = (text: string) => createHash('sha256').update(text).digest('hex');
interface Data { diagnostics: Finding[]; sites: ClassSite[]; opaque: number; styles: SourceStyles; modules: [string, ModuleImport[]][]; computedDependencies?: string[]; computedClassFiles?: string[] }
interface SerializedData extends Omit<Data, 'styles'> {
  styles: Omit<SourceStyles, 'sites'> & { sites: (Omit<InlineSite, 'declarations'> & { declarations: number[] })[] };
}
interface Receipt { data: SerializedData; dependencies: [string, string][]; resolutions: [string, string | null][] }
export function collectionCache(root: string, helpers: ClassHelperInput[], texts: Map<string, string>) {
  const key = sourceHash(JSON.stringify(['classes-inline-v9-template-boundaries-computed', root, helpers, [...texts].map(([file, text]) => [file, sourceHash(text)])]));
  const directory = resolve(process.env.PLUMB_CACHE_DIR ?? join(root, existsSync(join(root, 'node_modules')) ? 'node_modules/.cache/plumb' : '.plumb-cache'), 'sources');
  const path = join(directory, `${key}.v8`);
  return {
    async read(resolveImport: (file: string, specifier: string) => string | undefined): Promise<Data | undefined> {
      let receipt: Receipt;
      try { receipt = deserialize(await readFile(path)) as Receipt; }
      catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT' || error instanceof SyntaxError || error instanceof Error && error.message.startsWith('Unable to deserialize')) return; throw error; }
      for (const [file, hash] of receipt.dependencies) {
        try { if (sourceHash(texts.get(file) ?? await readFile(file, 'utf8')) !== hash) return; }
        catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return; throw error; }
      }
      for (const [key, previous] of receipt.resolutions) {
        const [file, specifier] = key.split('\0');
        if ((resolveImport(file!, specifier!) ?? null) !== previous) return;
      }
      // Companion analysis keys declarations by object identity. Restore the
      // same declarations in inline groups and the shared declaration list.
      const data = receipt.data;
      return { ...data, styles: { ...data.styles, sites: data.styles.sites.map(site => ({ ...site, declarations: site.declarations.map(id => data.styles.declarations[id]!) })) } };
    },
    async write(data: Data, dependencies: Map<string, string>, resolutions: Map<string, string | undefined>): Promise<void> {
      const ids = new Map(data.styles.declarations.map((declaration, id) => [declaration, id]));
      const stored: SerializedData = { ...data, styles: { ...data.styles, sites: data.styles.sites.map(site => ({ ...site, declarations: site.declarations.map(declaration => ids.get(declaration)!) })) } };
      const receipt: Receipt = { data: stored, dependencies: [...dependencies], resolutions: [...resolutions].map(([key, path]) => [key, path ?? null]) };
      await mkdir(directory, { recursive: true });
      const temporary = `${path}.${process.pid}.tmp`;
      await writeFile(temporary, serialize(receipt)); await rename(temporary, path);
    },
  };
}
