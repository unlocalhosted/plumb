// crafting-ui's playground: the home page's organism from source beside the generated variants (generator/generate.mjs)
import { fileURLToPath } from 'node:url';
import { playground } from '../vite.base.mjs';
const here = fileURLToPath(new URL('./', import.meta.url));
export default await playground({ here, root: '/Users/vijaysingh/unlocalhosted/crafting-ui' });
