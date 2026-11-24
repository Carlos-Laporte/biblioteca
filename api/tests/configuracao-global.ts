import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import type { TestProject } from 'vitest/node';
import { aplicarMigrations, conectar } from '../src/db/conexao';

declare module 'vitest' {
  export interface ProvidedContext {
    urlBanco: string;
  }
}

/** Nome exclusivo deste projeto: evita reaproveitar por engano a variável de outro projeto. */
const VARIAVEL_BANCO_TESTE = 'BIBLIOTECA_TEST_DATABASE_URL';

/** Os testes apagam as tabelas (TRUNCATE): só aceitamos bancos cujo nome indique que são de teste. */
function garantirBancoDeTeste(url: string) {
  const nomeBanco = new URL(url).pathname.slice(1);
  if (!/teste?/i.test(nomeBanco)) {
    throw new Error(`${VARIAVEL_BANCO_TESTE} aponta para "${nomeBanco}", que não parece um banco de teste. Abortando.`);
  }
}

/** Sobe um PostgreSQL 17 descartável (ou usa BIBLIOTECA_TEST_DATABASE_URL) e aplica as migrations uma vez. */
export default async function configurar(projeto: TestProject) {
  let container: StartedPostgreSqlContainer | undefined;
  let urlBanco = process.env[VARIAVEL_BANCO_TESTE];
  if (urlBanco) {
    garantirBancoDeTeste(urlBanco);
  } else {
    container = await new PostgreSqlContainer('postgres:17-alpine').withDatabase('biblioteca_teste').start();
    urlBanco = container.getConnectionUri();
  }
  const conexao = conectar(urlBanco);
  await aplicarMigrations(conexao.db);
  await conexao.encerrar();
  projeto.provide('urlBanco', urlBanco);

  return async () => {
    await container?.stop();
  };
}
