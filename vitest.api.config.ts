import { defineConfig } from 'vitest/config';

process.env.TZ = 'UTC';

// Testes de integração da API contra PostgreSQL REAL (Testcontainers, ou TEST_DATABASE_URL no CI/Docker).
export default defineConfig({
  test: {
    include: ['api/tests/**/*.test.ts'],
    globalSetup: ['api/tests/configuracao-global.ts'],
    fileParallelism: false, // os arquivos compartilham o mesmo banco
    testTimeout: 30_000,
    hookTimeout: 180_000,
    reporters: ['default'],
    coverage: {
      provider: 'v8',
      include: ['api/src/**/*.ts'],
      exclude: ['api/src/main.ts'],
      reportsDirectory: 'coverage/api',
      reporter: [['text', { skipFull: false }], 'html', 'json-summary'],
      thresholds: { lines: 80, branches: 80, functions: 80, statements: 80 },
    },
  },
});
