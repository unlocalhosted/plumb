import type { Context, Detector } from '../detector.js';
import { importSite, lineOf } from '../detector.js';
import { claim } from '../facts.js';
import type { Detected, SupportNote } from '../support.js';

/** A styling system known by its packages and the modules that import it; the evidence is the import site when there is one. */
export interface StylingFamily extends SupportNote { id: string; label: string; packages: RegExp; imports?: RegExp; files?: RegExp }

export function stylingFamily(family: StylingFamily): Detector {
  return {
    id: `styling.${family.id}`, reads: ['package.json'],
    detect(ctx: Context) {
      const dependencies = ctx.dependencies(), text = ctx.read('package.json');
      const name = Object.keys(dependencies).filter(key => family.packages.test(key)).sort()[0];
      const site = importSite(ctx, family.imports ?? family.packages);
      const file = family.files ? ctx.cssFiles?.find(item => family.files!.test(item)) : undefined;
      if (!name && !site && !file) return {};
      const evidence = [];
      if (site) evidence.push(site);
      if (file) evidence.push(ctx.evidence(file, 1, file));
      if (name && typeof text === 'string') evidence.push(ctx.evidence('package.json', lineOf(text, new RegExp(`"${name.replace(/[/@.-]/g, '\\$&')}"\\s*:`)), `${name}: ${dependencies[name]}`));
      const { packages: _packages, imports: _imports, files: _files, ...note } = family;
      const item: Detected = { ...note, source: 'declared', evidence, ...(name ? { detail: { package: name } } : {}) };
      return { styling: [claim<Detected>(item, 'declared', evidence, this.id)] };
    },
  };
}
