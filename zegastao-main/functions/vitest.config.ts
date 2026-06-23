import { defineConfig } from 'vitest/config';

export default defineConfig({
  css: {
    postcss: {
      plugins: [],
    },
  },
  test: {
    globals: false,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      reporter: ['text', 'html'],
      include: ['src/services/amortization-engine.ts', 'src/services/phase-engine.ts', 'src/services/rules-engine.ts'],
    },
  },
});
