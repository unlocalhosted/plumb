import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
const here = fileURLToPath(new URL('./', import.meta.url));
// a part that imports something the sandbox lacks fails on its own, at load, without stopping the page
export default { root: here, plugins: [react(), tailwindcss()], resolve: { dedupe: ['react', 'react-dom'] }, server: { fs: { allow: [here] } }, logLevel: 'warn' };
