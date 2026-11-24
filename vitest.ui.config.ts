import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

process.env.TZ = 'UTC';

// Testes de componentes React (Testing Library + jsdom). A API é simulada com um fetch falso.
export default defineConfig({
  plugins: [react()],
  test: {
    include: ['src/ui/**/*.test.tsx'],
    environment: 'jsdom',
    setupFiles: ['src/ui/testes/configuracao.ts'],
    css: false,
    reporters: ['default'],
    coverage: {
      provider: 'v8',
      include: ['src/ui/**/*.{ts,tsx}'],
      exclude: ['src/ui/main.tsx', 'src/ui/testes/**', 'src/ui/**/*.test.tsx'],
      reportsDirectory: 'coverage/ui',
      reporter: [['text', { skipFull: false }], 'html', 'json-summary'],
    },
  },
});
