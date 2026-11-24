import { sql } from 'drizzle-orm';
import { afterAll, beforeEach, inject } from 'vitest';
import { construirApp } from '../src/app';
import { conectar } from '../src/db/conexao';

export const HOJE = '2026-03-25';

/** App + banco reais para um arquivo de teste; as tabelas são limpas antes de cada teste. */
export function prepararAmbiente() {
  const conexao = conectar(inject('urlBanco'));
  const relogio = { hoje: HOJE };
  const app = construirApp({ db: conexao.db, hoje: () => relogio.hoje });

  beforeEach(async () => {
    relogio.hoje = HOJE;
    await conexao.db.execute(sql`TRUNCATE multas, emprestimos, livros, usuarios RESTART IDENTITY CASCADE`);
  });

  afterAll(async () => {
    await app.close();
    await conexao.encerrar();
  });

  return { app, db: conexao.db, relogio };
}

type App = ReturnType<typeof prepararAmbiente>['app'];

let sequencia = 0;

export async function criarUsuario(app: App, perfil = 'GRADUACAO', nome = 'Usuária de Teste') {
  sequencia += 1;
  const resposta = await app.inject({
    method: 'POST',
    url: '/api/usuarios',
    payload: { nome, matricula: `TST${sequencia}`, email: `t${sequencia}@teste.exemplo`, perfil },
  });
  return resposta.json<{ id: number; matricula: string }>();
}

export async function criarLivro(app: App, exemplaresTotal = 3, titulo = 'Livro de Teste') {
  sequencia += 1;
  const resposta = await app.inject({
    method: 'POST',
    url: '/api/livros',
    payload: { titulo, autor: 'Autor', isbn: `978-0-00-${String(sequencia).padStart(6, '0')}-0`, ano: 2020, exemplaresTotal },
  });
  return resposta.json<{ id: number }>();
}

export function emprestar(app: App, usuarioId: number, livroIds: number[], dataEmprestimo?: string) {
  return app.inject({ method: 'POST', url: '/api/emprestimos', payload: { usuarioId, livroIds, dataEmprestimo } });
}

export function devolver(app: App, emprestimoId: number, dataDevolucao?: string) {
  return app.inject({
    method: 'POST',
    url: `/api/emprestimos/${emprestimoId}/devolucao`,
    payload: dataDevolucao ? { dataDevolucao } : {},
  });
}
