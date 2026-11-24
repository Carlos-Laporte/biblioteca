import { describe, it, expect } from 'vitest';
import { criarLivro, criarUsuario, devolver, emprestar, HOJE, prepararAmbiente } from './ambiente';

const { app, relogio } = prepararAmbiente();

describe('API — POST /api/emprestimos (RF01 com dados reais)', () => {
  it('IT01 — aprova dentro do limite e calcula a data prevista pelo perfil', async () => {
    // Arrange
    const usuario = await criarUsuario(app, 'GRADUACAO');
    const livro = await criarLivro(app);

    // Act
    const resposta = await emprestar(app, usuario.id, [livro.id]);

    // Assert
    expect(resposta.statusCode).toBe(201);
    expect(resposta.json()).toMatchObject({
      aprovado: true,
      limite: 3,
      totalAposEmprestimo: 1,
      prazoDevolucaoDias: 15,
      dataEmprestimo: HOJE,
      dataPrevista: '2026-04-09',
    });
  });

  it('IT02 — recusa com 422 LIMITE_EXCEDIDO quando ultrapassa o limite do perfil', async () => {
    // Arrange
    const usuario = await criarUsuario(app, 'GRADUACAO');
    const livros = await Promise.all([1, 2, 3, 4].map(() => criarLivro(app)));
    await emprestar(app, usuario.id, livros.slice(0, 3).map((livro) => livro.id));

    // Act
    const resposta = await emprestar(app, usuario.id, [livros[3].id]);

    // Assert
    expect(resposta.statusCode).toBe(422);
    expect(resposta.json()).toMatchObject({ erro: 'EMPRESTIMO_RECUSADO', motivo: 'LIMITE_EXCEDIDO' });
  });

  it('IT03 — livro em atraso gera pendência e bloqueia novo empréstimo (422 PENDENCIA)', async () => {
    // Arrange
    const usuario = await criarUsuario(app, 'PROFESSOR');
    const [atrasado, novo] = [await criarLivro(app), await criarLivro(app)];
    await emprestar(app, usuario.id, [atrasado.id], '2026-01-10'); // prevista 2026-02-24

    // Act
    const resposta = await emprestar(app, usuario.id, [novo.id]);

    // Assert
    expect(resposta.statusCode).toBe(422);
    expect(resposta.json().motivo).toBe('PENDENCIA');
  });

  it('IT04 — recusa livro sem exemplares disponíveis (422 LIVRO_INDISPONIVEL)', async () => {
    // Arrange
    const [ana, bruno] = [await criarUsuario(app), await criarUsuario(app)];
    const livro = await criarLivro(app, 1);
    await emprestar(app, ana.id, [livro.id]);

    // Act
    const resposta = await emprestar(app, bruno.id, [livro.id]);

    // Assert
    expect(resposta.statusCode).toBe(422);
    expect(resposta.json().motivo).toBe('LIVRO_INDISPONIVEL');
  });

  it('IT05 — recusa o mesmo livro para quem já está com ele (422 LIVRO_JA_EMPRESTADO)', async () => {
    // Arrange
    const usuario = await criarUsuario(app);
    const livro = await criarLivro(app, 5);
    await emprestar(app, usuario.id, [livro.id]);

    // Act
    const resposta = await emprestar(app, usuario.id, [livro.id]);

    // Assert
    expect(resposta.json().motivo).toBe('LIVRO_JA_EMPRESTADO');
  });

  it('IT06 — usuário inativo não pode emprestar (422 USUARIO_INATIVO)', async () => {
    // Arrange
    const usuario = await criarUsuario(app);
    const livro = await criarLivro(app);
    await app.inject({ method: 'PUT', url: `/api/usuarios/${usuario.id}`, payload: { ativo: false } });

    // Act
    const resposta = await emprestar(app, usuario.id, [livro.id]);

    // Assert
    expect(resposta.json().motivo).toBe('USUARIO_INATIVO');
  });

  it.each([
    ['usuário inexistente', 999, 'Usuário 999 não encontrado(a)'],
    ['livro inexistente', 0, 'Livro 999 não encontrado(a)'],
  ])('IT07 — %s responde 404', async (_caso, usuarioIdFixo, mensagem) => {
    // Arrange
    const usuario = await criarUsuario(app);
    const usuarioId = usuarioIdFixo || usuario.id;

    // Act
    const resposta = await emprestar(app, usuarioId, [999]);

    // Assert
    expect(resposta.statusCode).toBe(404);
    expect(resposta.json()).toEqual({ erro: 'NAO_ENCONTRADO', mensagem });
  });

  it.each([
    ['sem livros', { usuarioId: 1, livroIds: [] }],
    ['livro repetido', { usuarioId: 1, livroIds: [1, 1] }],
    ['data em outro formato', { usuarioId: 1, livroIds: [1], dataEmprestimo: '25/03/2026' }],
    ['corpo vazio', {}],
  ])('IT08 — entrada inválida (%s) responde 400 com os campos', async (_caso, payload) => {
    // Arrange (payload da tabela)

    // Act
    const resposta = await app.inject({ method: 'POST', url: '/api/emprestimos', payload });

    // Assert
    expect(resposta.statusCode).toBe(400);
    expect(resposta.json().erro).toBe('ENTRADA_INVALIDA');
    expect(resposta.json().campos.length).toBeGreaterThan(0);
  });

  it('IT09 — data de empréstimo futura responde 400', async () => {
    // Arrange
    const usuario = await criarUsuario(app);
    const livro = await criarLivro(app);

    // Act
    const resposta = await emprestar(app, usuario.id, [livro.id], '2026-03-26');

    // Assert
    expect(resposta.statusCode).toBe(400);
    expect(resposta.json().mensagem).toBe('A data do empréstimo não pode ser futura: 2026-03-26');
  });

  it('IT10 — concorrência: dois pedidos simultâneos não ultrapassam o limite', async () => {
    // Arrange
    const usuario = await criarUsuario(app, 'GRADUACAO'); // limite 3
    const livros = await Promise.all([1, 2, 3, 4].map(() => criarLivro(app)));
    await emprestar(app, usuario.id, [livros[0].id, livros[1].id]); // 2 em uso

    // Act
    const respostas = await Promise.all([emprestar(app, usuario.id, [livros[2].id]), emprestar(app, usuario.id, [livros[3].id])]);

    // Assert
    const status = respostas.map((resposta) => resposta.statusCode).sort();
    expect(status).toEqual([201, 422]);
    const ativos = await app.inject({ url: `/api/emprestimos?usuarioId=${usuario.id}` });
    expect(ativos.json()).toHaveLength(3);
  });
});

describe('API — POST /api/emprestimos/:id/devolucao (RF02 com datas reais)', () => {
  async function emprestimoDeGraduacao(dataEmprestimo: string) {
    const usuario = await criarUsuario(app, 'GRADUACAO');
    const livro = await criarLivro(app);
    const criado = await emprestar(app, usuario.id, [livro.id], dataEmprestimo);
    return { usuario, livro, emprestimoId: criado.json().emprestimos[0].id as number };
  }

  it('IT11 — devolução no prazo não gera multa', async () => {
    // Arrange
    const { emprestimoId } = await emprestimoDeGraduacao('2026-03-10'); // prevista 2026-03-25

    // Act
    const resposta = await devolver(app, emprestimoId);

    // Assert
    expect(resposta.statusCode).toBe(200);
    expect(resposta.json()).toMatchObject({ diasAtraso: 0, multa: null, emprestimo: { dataDevolucao: HOJE } });
  });

  it.each([
    ['IT12 — 3 dias: tolerância', '2026-03-28', 3, null],
    ['IT12 — 4 dias: R$ 10,00', '2026-03-29', 4, 1000],
    ['IT12 — 11 dias: R$ 30,00', '2026-04-05', 11, 3000],
    ['IT12 — 35 dias: teto R$ 150,00', '2026-04-29', 35, 15000],
  ])('%s', async (_caso, dataDevolucao, dias, centavos) => {
    // Arrange
    relogio.hoje = '2026-05-01';
    const { emprestimoId } = await emprestimoDeGraduacao('2026-03-10');

    // Act
    const resposta = await devolver(app, emprestimoId, dataDevolucao);

    // Assert
    expect(resposta.json().diasAtraso).toBe(dias);
    expect(resposta.json().multa?.valorCentavos ?? null).toBe(centavos);
  });

  it('IT13 — multa gerada na devolução bloqueia e o pagamento libera novo empréstimo', async () => {
    // Arrange
    const { usuario, emprestimoId } = await emprestimoDeGraduacao('2026-03-01'); // prevista 2026-03-16
    const multa = (await devolver(app, emprestimoId)).json().multa; // 9 dias → R$ 22,50
    const outroLivro = await criarLivro(app);

    // Act
    const bloqueado = await emprestar(app, usuario.id, [outroLivro.id]);
    const pagamento = await app.inject({ method: 'POST', url: `/api/multas/${multa.id}/pagamento` });
    const liberado = await emprestar(app, usuario.id, [outroLivro.id]);

    // Assert
    expect(multa.valorCentavos).toBe(2250);
    expect(bloqueado.json().motivo).toBe('PENDENCIA');
    expect(pagamento.json().pagaEm).toBe(HOJE);
    expect(liberado.statusCode).toBe(201);
  });

  it('IT14 — devolver duas vezes responde 409', async () => {
    // Arrange
    const { emprestimoId } = await emprestimoDeGraduacao('2026-03-20');
    await devolver(app, emprestimoId);

    // Act
    const resposta = await devolver(app, emprestimoId);

    // Assert
    expect(resposta.statusCode).toBe(409);
    expect(resposta.json().mensagem).toBe(`O empréstimo ${emprestimoId} já foi devolvido em ${HOJE}`);
  });

  it.each([
    ['anterior ao empréstimo', '2026-03-19', 'A devolução não pode ser anterior ao empréstimo'],
    ['futura', '2026-03-26', 'A data da devolução não pode ser futura: 2026-03-26'],
  ])('IT15 — data de devolução %s responde 400', async (_caso, data, mensagem) => {
    // Arrange
    const { emprestimoId } = await emprestimoDeGraduacao('2026-03-20');

    // Act
    const resposta = await devolver(app, emprestimoId, data);

    // Assert
    expect(resposta.statusCode).toBe(400);
    expect(resposta.json().mensagem).toBe(mensagem);
  });

  it('IT16 — empréstimo inexistente responde 404', async () => {
    // Arrange
    const id = 4242;

    // Act
    const resposta = await devolver(app, id);

    // Assert
    expect(resposta.statusCode).toBe(404);
  });

  it('IT17 — a devolução libera o exemplar para outro usuário', async () => {
    // Arrange
    const { livro, emprestimoId } = await emprestimoDeGraduacao('2026-03-20');
    const outro = await criarUsuario(app);
    await devolver(app, emprestimoId);

    // Act
    const resposta = await emprestar(app, outro.id, [livro.id]);

    // Assert
    expect(resposta.statusCode).toBe(201);
  });
});

describe('API — GET /api/emprestimos', () => {
  it('IT18 — filtra por situação e calcula os dias de atraso', async () => {
    // Arrange
    // Usuários distintos: quem tem livro atrasado fica com pendência e não pode pegar outro.
    const [usuario, outro] = [await criarUsuario(app, 'PROFESSOR'), await criarUsuario(app, 'PROFESSOR')];
    const [emDia, atrasado, devolvido] = [await criarLivro(app), await criarLivro(app), await criarLivro(app)];
    await emprestar(app, outro.id, [emDia.id]);
    await emprestar(app, usuario.id, [atrasado.id], '2026-02-01'); // prevista 2026-03-18 → 7 dias
    const paraDevolver = (await emprestar(app, outro.id, [devolvido.id], '2026-03-01')).json().emprestimos[0].id;
    await devolver(app, paraDevolver);

    // Act
    const contar = async (situacao: string) => (await app.inject({ url: `/api/emprestimos?situacao=${situacao}` })).json();
    const [ativos, atrasados, devolvidos, todos] = await Promise.all(['ativos', 'atrasados', 'devolvidos', 'todos'].map(contar));

    // Assert
    expect(ativos).toHaveLength(2);
    expect(atrasados).toHaveLength(1);
    expect(atrasados[0]).toMatchObject({ diasAtraso: 7, livro: { id: atrasado.id }, usuario: { id: usuario.id } });
    expect(devolvidos).toHaveLength(1);
    expect(todos).toHaveLength(3);
  });
});
