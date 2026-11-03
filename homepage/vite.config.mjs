// The new homepage. Plumber's real overlay runs on it in development, so the hero's demo is the product itself.
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { plumb } from '../dist/hosts/vite.js';

export default {
  root: import.meta.dirname,
  plugins: [plumb(), tailwindcss(), react()],
  server: { host: '127.0.0.1', port: 4351, strictPort: true },
};
