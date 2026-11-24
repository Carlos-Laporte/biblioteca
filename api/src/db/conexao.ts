import { fileURLToPath } from 'node:url';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import * as schema from './schema';

export type Banco = NodePgDatabase<typeof schema>;
/** Banco ou transação: os serviços aceitam ambos. */
export type Executor = Banco | Parameters<Parameters<Banco['transaction']>[0]>[0];

export interface Conexao {
  readonly db: Banco;
  readonly encerrar: () => Promise<void>;
}

const PASTA_MIGRATIONS = fileURLToPath(new URL('../../drizzle', import.meta.url));

export function conectar(urlBanco: string): Conexao {
  const pool = new pg.Pool({ connectionString: urlBanco });
  const db = drizzle(pool, { schema });
  return { db, encerrar: () => pool.end() };
}

export async function aplicarMigrations(db: Banco): Promise<void> {
  await migrate(db, { migrationsFolder: PASTA_MIGRATIONS });
}
