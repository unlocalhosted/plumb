// Relay on Next.js: the same screens as the Vite host (../src), with React Plumber wired by `plumber install --overlay`.
import { withPlumb } from '@unlocalhosted/react-plumber/next/config';
import path from 'node:path';

const src = path.resolve(import.meta.dirname, '../src');

export default withPlumb({
  turbopack: { root: path.resolve(import.meta.dirname, '../../..'), resolveAlias: { '@': src } },
  webpack: (config) => { config.resolve.alias['@'] = src; return config; },
});
