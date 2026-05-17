import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  // ルートの .env を読み、VITE_API_BASE を server と単一ソースで共有する。
  envDir: '..',
  server: {
    port: 5173,
  },
});
