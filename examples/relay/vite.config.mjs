// Relay on Vite, with React Plumber's dev plugin first, then React (Fast Refresh) and Tailwind.
import path from 'node:path';
import { plumb } from '@unlocalhosted/react-plumber/vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default {
  plugins: [plumb(), react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') }, dedupe: ['react', 'react-dom'] },
  // Bundle every dependency up front: a dependency found mid-session (opening the first dialog) would re-bundle and
  // load a second copy of React.
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-dom/client', 'react/jsx-dev-runtime', 'clsx', 'tailwind-merge', 'class-variance-authority', 'lucide-react', 'cmdk',
      '@radix-ui/react-avatar', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-slot', '@radix-ui/react-switch', '@radix-ui/react-tabs', '@radix-ui/react-tooltip'],
  },
  server: { host: '127.0.0.1', port: 4320, strictPort: true },
};
