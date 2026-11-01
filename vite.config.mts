import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Station UI. Dev server proxies /api to the NestJS backend.
export default defineConfig({
  root: 'src/client',
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: { '/api': 'http://localhost:3000' },
  },
  build: {
    outDir: '../../dist/client',
    emptyOutDir: true,
  },
});
