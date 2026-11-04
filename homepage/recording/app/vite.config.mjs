// RECORDING_PLUMB_DIST is set by record.mjs; it points at this checkout's built dist/hosts/vite.js.
// Installed from npm, the line below is: import { plumb } from '@unlocalhosted/react-plumber/vite'
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';

const { plumb } = await import(process.env.RECORDING_PLUMB_DIST);

export default {
  root: import.meta.dirname,
  plugins: [plumb(), tailwindcss(), react()],
  server: { host: '127.0.0.1', port: Number(process.env.RECORDING_PORT ?? 4361), strictPort: true },
};
