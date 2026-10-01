import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(() => {
  return {
    root: __dirname,
    plugins: [react()],
    build: {
      outDir: path.resolve(__dirname, 'dist'),
      emptyOutDir: true,
    },
    server: {
      port: 8201,
    },
  };
});
