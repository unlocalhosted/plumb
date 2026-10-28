import type { Detector } from '../detector.js';
import { lineOf } from '../detector.js';
import { claim } from '../facts.js';
import type { Host } from './host-config.js';

/** Dependencies, then scripts (inferred). Hosts plumb has no plugin for still get a name, so a message can say which. */
export const hostManifest: Detector = {
  id: 'host.manifest', reads: ['package.json'],
  detect(ctx) {
    const manifest = ctx.manifest();
    if (!manifest || manifest instanceof Error) return {};
    const text = ctx.read('package.json') as string;
    const dependencies = ctx.dependencies();
    for (const id of ['next', 'vite']) {
      if (dependencies[id]) return { host: [claim<Host>({ id, configFile: null }, 'inferred', [ctx.evidence('package.json', lineOf(text, new RegExp(`"${id}"\\s*:`)), `${id}: ${dependencies[id]}`)], this.id)] };
    }
    const commands = Object.values(manifest.scripts ?? {}).join(' ');
    const id = /(?:^|\s)(vite|next|react-scripts|parcel|astro|remix|react-router|rsbuild|webpack|expo)(?:\s|$)/.exec(commands)?.[1];
    if (!id) return {};
    return { host: [claim<Host>({ id: id === 'react-router' ? 'remix' : id, configFile: null }, 'inferred', [ctx.evidence('package.json', lineOf(text, /"scripts"\s*:/), `scripts run ${id}`)], this.id)] };
  },
};
