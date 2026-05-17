import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    // 本番ビルドではソース露出とサイズ増を避けるため sourcemap を無効化。
    sourcemap: false,
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/sim/**/*.ts'],
      reporter: ['text', 'lcov'],
    },
  },
});
