import { describe, it, expect } from 'vitest';
import { criarLivro, criarUsuario, devolver, emprestar, prepararAmbiente } from './ambiente';

const { app } = prepararAmbiente();

describe('API — usuários', () => {
  it('IT20 — cadastra e devolve o usuário criado (201)', async () => {
    // Arrange
    const payload = { nome: 'Ana Souza', matricula: 'G123', email: 'ana@exemplo.com', perfil: 'GRADUACAO' };

    // Act
    const resposta = await app.inject({ method: 'POST', url: '/api/usuarios', payload });

    // Assert
    expect(resposta.statusCode).toBe(201);
    expect(resposta.json()).toMatchObject({ ...payload, id: 1, ativo: true });
  });

  it('IT21 — matrícula duplicada responde 409', async () => {
    // Arrange
    const payload = { nome: 'Ana Souza', matricula: 'G123', email: 'ana@exemplo.com', perfil: 'GRADUACAO' };
    await app.inject({ method: 'POST', url: '/api/usuarios', payload });

    // Act
    const resposta = await app.inject({ method: 'POST', url: '/api/usuarios', payload });

    // Assert
    expect(resposta.statusCode).toBe(409);
    expect(resposta.json().mensagem).toBe('Já existe um usuário com a matrícula G123');
  });

  it.each([
    ['nome curto', { nome: 'An', matricula: 'G1234', email: 'a@exemplo.com', perfil: 'GRADUACAO' }, 'nome'],
    ['e-mail inválido', { nome: 'Ana', matricula: 'G1234', email: 'ana', perfil: 'GRADUACAO' }, 'email'],
    ['perfil desconhecido', { nome: 'Ana', matricula: 'G1234', email: 'a@exemplo.com', perfil: 'VISITANTE' }, 'perfil'],
    ['matrícula com espaço', { nome: 'Ana', matricula: 'G 12', email: 'a@exemplo.com', perfil: 'GRADUACAO' }, 'matricula'],
  ])('IT22 — %s responde 400 apontando o campo', async (_caso, payload, campo) => {
    // Arrange (payload da tabela)

    // Act
    const resposta = await app.inject({ method: 'POST', url: '/api/usuarios', payload });

    // Assert
    expect(resposta.statusCode).toBe(400);
    expect(resposta.json().campos.map((item: { campo: string }) => item.campo)).toContain(campo);
  });

  it('IT23 — lista com busca, filtro por perfil e resumo de pendência calculado pelo domínio', async () => {
    // Arrange
    const ana = await criarUsuario(app, 'GRADUACAO', 'Ana Atrasada');
    await criarUsuario(app, 'PROFESSOR', 'Prof. Bruno');
    const livro = await criarLivro(app);
    await emprestar(app, ana.id, [livro.id], '2026-03-01'); // prevista 2026-03-16 → atraso

    // Act
    const porBusca = (await app.inject({ url: '/api/usuarios?busca=atrasada' })).json();
    const porPerfil = (await app.inject({ url: '/api/usuarios?perfil=PROFESSOR' })).json();

    // Assert
    expect(porBusca).toHaveLength(1);
    expect(porBusca[0].resumo).toEqual({
      livrosEmUso: 1,
      limite: 3,
      prazoDevolucaoDias: 15,
      multasEmAberto: 0,
      emAtraso: 1,
      pendente: true,
    });
    expect(porPerfil.map((usuario: { nome: string }) => usuario.nome)).toEqual(['Prof. Bruno']);
  });

  it('IT24 — detalhe traz histórico de empréstimos e multas', async () => {
    // Arrange
    const usuario = await criarUsuario(app, 'GRADUACAO');
    const livro = await criarLivro(app, 2, 'Dom Casmurro');
    const id = (await emprestar(app, usuario.id, [livro.id], '2026-03-01')).json().emprestimos[0].id;
    await devolver(app, id);

    // Act
    const detalhe = (await app.inject({ url: `/api/usuarios/${usuario.id}` })).json();

    // Assert
    expect(detalhe.emprestimos).toEqual([expect.objectContaining({ titulo: 'Dom Casmurro', dataDevolucao: '2026-03-25' })]);
    expect(detalhe.multas).toEqual([expect.objectContaining({ diasAtraso: 9, valorCentavos: 2250, pagaEm: null })]);
    expect(detalhe.resumo).toMatchObject({ livrosEmUso: 0, multasEmAberto: 1, pendente: true });
  });

  it('IT25 — edita dados; corpo vazio devolve o usuário sem alterar', async () => {
    // Arrange
    const usuario = await criarUsuario(app, 'GRADUACAO');

    // Act
    const editado = await app.inject({ method: 'PUT', url: `/api/usuarios/${usuario.id}`, payload: { perfil: 'POS_GRADUACAO' } });
    const semMudanca = await app.inject({ method: 'PUT', url: `/api/usuarios/${usuario.id}`, payload: {} });

    // Assert
    expect(editado.json().perfil).toBe('POS_GRADUACAO');
    expect(semMudanca.json().perfil).toBe('POS_GRADUACAO');
  });

  it.each([
    ['GET', '/api/usuarios/77', undefined],
    ['PUT', '/api/usuarios/77', { nome: 'Novo Nome' }],
    ['PUT', '/api/usuarios/77', {}],
  ] as const)('IT26 — %s %s inexistente responde 404', async (method, url, payload) => {
    // Arrange (rota da tabela)

    // Act
    const resposta = await app.inject({ method, url, payload });

    // Assert
    expect(resposta.statusCode).toBe(404);
  });

  it('IT27 — editar para uma matrícula já existente responde 409', async () => {
    // Arrange
    const primeiro = await criarUsuario(app);
    const segundo = await criarUsuario(app);

    // Act
    const resposta = await app.inject({ method: 'PUT', url: `/api/usuarios/${segundo.id}`, payload: { matricula: primeiro.matricula } });

    // Assert
    expect(resposta.statusCode).toBe(409);
  });
});

describe('API — acervo', () => {
  it('IT28 — lista com exemplares disponíveis descontando os empréstimos ativos', async () => {
    // Arrange
    const usuario = await criarUsuario(app);
    const livro = await criarLivro(app, 3, 'Vidas Secas');
    await emprestar(app, usuario.id, [livro.id]);

    // Act
    const lista = (await app.inject({ url: '/api/livros?busca=secas' })).json();

    // Assert
    expect(lista).toEqual([expect.objectContaining({ titulo: 'Vidas Secas', exemplaresTotal: 3, emUso: 1, disponiveis: 2 })]);
  });

  it('IT29 — ISBN duplicado responde 409 (no cadastro e na edição)', async () => {
    // Arrange
    const payload = { titulo: 'Iracema', autor: 'José de Alencar', isbn: '978-85-000-0001-1', ano: 1865, exemplaresTotal: 1 };
    await app.inject({ method: 'POST', url: '/api/livros', payload });
    const outro = await criarLivro(app);

    // Act
    const cadastro = await app.inject({ method: 'POST', url: '/api/livros', payload });
    const edicao = await app.inject({ method: 'PUT', url: `/api/livros/${outro.id}`, payload: { isbn: payload.isbn } });

    // Assert
    expect(cadastro.statusCode).toBe(409);
    expect(edicao.statusCode).toBe(409);
    expect(edicao.json().mensagem).toBe('Já existe um livro com o ISBN 978-85-000-0001-1');
  });

  it('IT30 — não permite reduzir exemplares abaixo dos emprestados (409)', async () => {
    // Arrange
    const [ana, bruno] = [await criarUsuario(app), await criarUsuario(app)];
    const livro = await criarLivro(app, 3);
    await emprestar(app, ana.id, [livro.id]);
    await emprestar(app, bruno.id, [livro.id]);

    // Act
    const reduzir = await app.inject({ method: 'PUT', url: `/api/livros/${livro.id}`, payload: { exemplaresTotal: 1 } });
    const ajustar = await app.inject({ method: 'PUT', url: `/api/livros/${livro.id}`, payload: { exemplaresTotal: 2, titulo: 'Novo' } });
    const semMudanca = await app.inject({ method: 'PUT', url: `/api/livros/${livro.id}`, payload: {} });

    // Assert
    expect(reduzir.statusCode).toBe(409);
    expect(reduzir.json().mensagem).toBe('Há 2 exemplar(es) emprestado(s); o total não pode ser menor');
    expect(ajustar.json()).toMatchObject({ exemplaresTotal: 2, disponiveis: 0, titulo: 'Novo' });
    expect(semMudanca.json().titulo).toBe('Novo');
  });

  it.each([
    ['ano anterior à imprensa', { ano: 1200 }],
    ['zero exemplares', { exemplaresTotal: 0 }],
    ['ISBN com letras', { isbn: 'ABC-123' }],
  ])('IT31 — %s responde 400', async (_caso, alteracao) => {
    // Arrange
    const payload = { titulo: 'Livro', autor: 'Autor', isbn: '978-85-000-0002-2', ano: 2000, exemplaresTotal: 1, ...alteracao };

    // Act
    const resposta = await app.inject({ method: 'POST', url: '/api/livros', payload });

    // Assert
    expect(resposta.statusCode).toBe(400);
  });

  it('IT32 — livro inexistente responde 404', async () => {
    // Arrange
    const url = '/api/livros/31337';

    // Act
    const resposta = await app.inject({ url });

    // Assert
    expect(resposta.statusCode).toBe(404);
  });
});
