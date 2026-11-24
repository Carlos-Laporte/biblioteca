import { defineConfig } from 'vitest/config';

// Fuso fixo e diferente do de Brasília: garante que o domínio converta o fuso explicitamente,
// e que os testes deem o mesmo resultado em qualquer máquina (inclusive no CI).
process.env.TZ = 'UTC';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    reporters: ['verbose'],
    coverage: {
      provider: 'v8',
      include: ['src/domain/**/*.ts'],
      exclude: ['src/domain/index.ts'], // apenas reexportações
      reporter: [['text', { skipFull: false }], 'html', 'json-summary'],
      thresholds: { lines: 90, branches: 90, functions: 90, statements: 90 },
    },
  },
});
