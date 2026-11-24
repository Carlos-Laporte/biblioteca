import { defineConfig } from 'drizzle-kit';

// Gera as migrations versionadas a partir do schema:  npm run db:gerar
export default defineConfig({
  dialect: 'postgresql',
  schema: './api/src/db/schema.ts',
  out: './api/drizzle',
});
