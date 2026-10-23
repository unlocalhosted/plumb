import { chmod } from 'node:fs/promises';

// TypeScript recreates this file after clean-dist; linked bins use its mode.
await chmod(new URL('../dist/cli.js', import.meta.url), 0o755);
