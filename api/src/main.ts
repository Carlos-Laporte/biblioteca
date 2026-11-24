import { hojeEmSaoPaulo } from '../../src/domain';
import { construirApp } from './app';
import { lerConfiguracao } from './config';
import { aplicarMigrations, conectar } from './db/conexao';
import { popularSeVazio } from './db/seed';

async function iniciar() {
  const config = lerConfiguracao();
  const conexao = conectar(config.DATABASE_URL);
  const app = construirApp({ db: conexao.db, logger: { level: config.LOG_LEVEL } });

  await aplicarMigrations(conexao.db);
  app.log.info('Migrations aplicadas');
  if (config.SEED === 'true' && (await popularSeVazio(conexao.db, hojeEmSaoPaulo()))) {
    app.log.info('Banco populado com dados de exemplo');
  }

  const encerrar = async () => {
    await app.close();
    await conexao.encerrar();
    process.exit(0);
  };
  process.once('SIGTERM', encerrar);
  process.once('SIGINT', encerrar);

  await app.listen({ host: config.HOST, port: config.PORT });
}

iniciar().catch((erro: unknown) => {
  console.error(erro);
  process.exit(1);
});
