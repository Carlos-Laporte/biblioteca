import { expect, type APIRequestContext } from '@playwright/test';

const MS_POR_DIA = 86_400_000;
let contador = 0;

/** Identificador único por teste (os testes rodam em paralelo contra o mesmo banco). */
export function unico(prefixo: string) {
  contador += 1;
  return `${prefixo}-${Date.now().toString(36)}${process.pid.toString(36)}${contador}`;
}

export async function hojeDaApi(api: APIRequestContext): Promise<string> {
  const resposta = await api.get('/api/saude');
  return (await resposta.json()).hoje;
}

export const diasAtras = (hoje: string, dias: number) =>
  new Date(Date.parse(hoje) - dias * MS_POR_DIA).toISOString().slice(0, 10);

export async function criarUsuario(api: APIRequestContext, perfil = 'GRADUACAO') {
  const matricula = unico('E2E').slice(0, 20);
  const nome = `Teste ${matricula}`;
  const resposta = await api.post('/api/usuarios', { data: { nome, matricula, email: `${matricula.toLowerCase()}@e2e.exemplo`, perfil } });
  expect(resposta.status()).toBe(201);
  return (await resposta.json()) as { id: number; nome: string };
}

export async function criarLivro(api: APIRequestContext, exemplaresTotal = 3) {
  const titulo = `Livro ${unico('E2E')}`;
  const isbn = `978-${String(Date.now()).slice(-9)}${contador % 10}`;
  const resposta = await api.post('/api/livros', { data: { titulo, autor: 'Autora E2E', isbn, ano: 2020, exemplaresTotal } });
  expect(resposta.status()).toBe(201);
  return (await resposta.json()) as { id: number; titulo: string };
}

export async function emprestar(api: APIRequestContext, usuarioId: number, livroIds: number[], dataEmprestimo?: string) {
  const resposta = await api.post('/api/emprestimos', { data: { usuarioId, livroIds, dataEmprestimo } });
  expect(resposta.status()).toBe(201);
  return resposta.json();
}
