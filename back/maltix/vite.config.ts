import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, root, '');

  return {
    root,
    base: env.VITE_BASE_PATH || '/maltix/',
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': 'http://localhost:3001',
      },
    },
    build: {
      outDir: resolve(root, '../front/maltix'),
      emptyOutDir: true,
    },
  };
});
