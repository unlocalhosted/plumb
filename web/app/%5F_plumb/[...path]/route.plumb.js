// React Plumber on its own site, in development: this route serves the overlay and its API at /__plumb/*. The
// session's root is the repository, so words in web/ and in homepage/ can both be edited; web/plumber.site.mjs
// narrows what it reads to those folders and names the theme. Production builds never discover a route.plumb file.
import path from 'node:path';
import { createPlumbRoute } from '@unlocalhosted/react-plumber/next';

export const runtime = 'nodejs';
export const { GET, POST } = createPlumbRoute({ root: path.resolve(process.cwd(), '..'), config: 'web/plumber.site.mjs' });
