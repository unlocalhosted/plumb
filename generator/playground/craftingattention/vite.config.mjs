// crafting attention's playground: its LifetimePricing from source beside the generated variants (generator/generate.mjs)
import { fileURLToPath } from 'node:url';
import { playground } from '../vite.base.mjs';
const here = fileURLToPath(new URL('./', import.meta.url));
export default await playground({ here, root: '/Users/vijaysingh/unlocalhosted/craftingattention/app', allow: ['/Users/vijaysingh/unlocalhosted/craftingattention'],
  aliases: [{ find: '@/lib/originApi', replacement: here + 'stubs/originApi.js' }, { find: '@tanstack/react-router', replacement: here + 'stubs/router.jsx' }] });
