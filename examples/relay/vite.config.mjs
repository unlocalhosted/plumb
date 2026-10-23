// Relay on Vite, with React Plumber's dev plugin first, then React (Fast Refresh) and Tailwind.
import path from 'node:path';
import { plumb } from '@unlocalhosted/react-plumber/vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default {
  plugins: [plumb(), react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  server: { host: '127.0.0.1', port: 4320, strictPort: true },
};
