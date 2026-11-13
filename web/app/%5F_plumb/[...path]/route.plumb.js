// React Plumber on its own site, in development: this route serves the overlay and its API at /__plumb/*. The
// session's root is the homepage (homepage/), whose sections this page is built from and whose plumber.config.ts
// names its theme and sources. Production builds never discover a route.plumb file.
import path from 'node:path';
import { createPlumbRoute } from '@unlocalhosted/react-plumber/next';

export const runtime = 'nodejs';
export const { GET, POST } = createPlumbRoute({ root: path.resolve(process.cwd(), '../homepage') });
