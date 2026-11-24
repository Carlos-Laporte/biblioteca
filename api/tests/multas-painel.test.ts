import { sql } from 'drizzle-orm';
import { describe, it, expect } from 'vitest';
import { lerConfiguracao } from '../src/config';
import { popularSeVazio } from '../src/db/seed';
import { ehViolacaoDeUnicidade } from '../src/erros';
import { criarLivro, criarUsuario, devolver, emprestar, HOJE, prepararAmbiente } from './ambiente';

const { app, db } = prepararAmbiente();

async function gerarMulta(dataEmprestimo: string) {
  const usuario = await criarUsuario(app);
  const livro = await criarLivro(app);
  const id = (await emprestar(app, usuario.id, [livro.id], dataEmprestimo)).json().emprestimos[0].id;
  return (await devolver(app, id)).json().multa as { id: number; valorCentavos: number };
}

describe('API — multas', () => {
  it('IT40 — lista abertas, pagas e todas', async () => {
    // Arrange
    const aberta = await gerarMulta('2026-03-01');
    const paga = await gerarMulta('2026-02-20');
    await app.inject({ method: 'POST', url: `/api/multas/${paga.id}/pagamento` });

    // Act
    const listar = async (situacao: string) => (await app.inject({ url: `/api/multas?situacao=${situacao}` })).json();
    const [abertas, pagas, todas] = await Promise.all(['abertas', 'pagas', 'todas'].map(listar));

    // Assert
    expect(abertas.map((multa: { id: number }) => multa.id)).toEqual([aberta.id]);
    expect(pagas).toEqual([expect.objectContaining({ id: paga.id, pagaEm: HOJE, livro: expect.any(Object) })]);
    expect(todas).toHaveLength(2);
  });

  it('IT41 — pagar duas vezes responde 409 e multa inexistente responde 404', async () => {
    // Arrange
    const multa = await gerarMulta('2026-03-01');
    await app.inject({ method: 'POST', url: `/api/multas/${multa.id}/pagamento` });

    // Act
    const repetido = await app.inject({ method: 'POST', url: `/api/multas/${multa.id}/pagamento` });
    const inexistente = await app.inject({ method: 'POST', url: '/api/multas/9999/pagamento' });

    // Assert
    expect(repetido.statusCode).toBe(409);
    expect(inexistente.statusCode).toBe(404);
  });
});

describe('API — painel', () => {
  it('IT42 — indicadores calculados a partir dos dados reais', async () => {
    // Arrange
    const ana = await criarUsuario(app, 'GRADUACAO');
    await criarUsuario(app, 'PROFESSOR');
    const [emDia, atrasado] = [await criarLivro(app), await criarLivro(app)];
    await emprestar(app, ana.id, [emDia.id]);
    await emprestar(app, ana.id, [atrasado.id], '2026-03-01'); // 9 dias de atraso
    await gerarMulta('2026-03-01'); // R$ 22,50 em aberto

    // Act
    const painel = (await app.inject({ url: '/api/painel' })).json();

    // Assert
    expect(painel).toMatchObject({
      hoje: HOJE,
      emprestimosAtivos: 2,
      emprestimosAtrasados: 1,
      multasEmAbertoCentavos: 2250,
      usuariosBloqueados: 2,
      totalUsuarios: 3,
    });
    expect(painel.proximosVencimentos).toHaveLength(1);
    expect(painel.maioresAtrasos[0]).toMatchObject({ diasAtraso: 9 });
  });

  it('IT43 — painel vazio não quebra (soma nula vira zero)', async () => {
    // Arrange (banco vazio)

    // Act
    const painel = (await app.inject({ url: '/api/painel' })).json();

    // Assert
    expect(painel).toMatchObject({ emprestimosAtivos: 0, multasEmAbertoCentavos: 0, usuariosBloqueados: 0 });
  });
});

describe('API — infraestrutura', () => {
  it('IT44 — saúde informa a data de hoje usada pela API', async () => {
    // Arrange
    const url = '/api/saude';

    // Act
    const resposta = await app.inject({ url });

    // Assert
    expect(resposta.json()).toEqual({ status: 'ok', hoje: HOJE });
  });

  it('IT45 — JSON malformado responde 400 sem vazar detalhes internos', async () => {
    // Arrange
    const corpo = '{"usuarioId":';

    // Act
    const resposta = await app.inject({
      method: 'POST',
      url: '/api/emprestimos',
      headers: { 'content-type': 'application/json' },
      payload: corpo,
    });

    // Assert
    expect(resposta.statusCode).toBe(400);
    expect(resposta.json().erro).toBe('REQUISICAO_INVALIDA');
  });

  it('IT46 — falha inesperada responde 500 genérico', async () => {
    // Arrange
    await db.execute(sql`ALTER TABLE multas RENAME TO multas_temp`);

    // Act
    const resposta = await app.inject({ url: '/api/multas' });
    await db.execute(sql`ALTER TABLE multas_temp RENAME TO multas`);

    // Assert
    expect(resposta.statusCode).toBe(500);
    expect(resposta.json()).toEqual({ erro: 'ERRO_INTERNO', mensagem: 'Erro interno do servidor' });
  });

  it('IT47 — seed popula uma vez e é idempotente', async () => {
    // Arrange (banco vazio)

    // Act
    const primeira = await popularSeVazio(db, HOJE);
    const segunda = await popularSeVazio(db, HOJE);
    const painel = (await app.inject({ url: '/api/painel' })).json();

    // Assert
    expect([primeira, segunda]).toEqual([true, false]);
    expect(painel.totalUsuarios).toBe(15);
    expect(painel.emprestimosAtrasados).toBeGreaterThan(0);
    expect(painel.multasEmAbertoCentavos).toBeGreaterThan(0);
  });

  it('IT48 — configuração valida as variáveis de ambiente', () => {
    // Arrange
    const valido = { DATABASE_URL: 'postgres://u:s@db:5432/biblioteca' };

    // Act
    const config = lerConfiguracao(valido);
    const invalida = () => lerConfiguracao({ DATABASE_URL: 'mysql://db' });

    // Assert
    expect(config).toMatchObject({ PORT: 3000, HOST: '0.0.0.0', SEED: 'false', LOG_LEVEL: 'info' });
    expect(invalida).toThrow(/Configuração inválida/);
  });

  it('IT49 — reconhece violação de unicidade direta ou embrulhada pelo ORM', () => {
    // Arrange
    const direta = { code: '23505' };
    const embrulhada = { cause: { code: '23505' } };

    // Act
    const resultados = [direta, embrulhada, { code: '23503' }, null].map(ehViolacaoDeUnicidade);

    // Assert
    expect(resultados).toEqual([true, true, false, false]);
  });
});
