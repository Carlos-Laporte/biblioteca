import { and, asc, desc, eq, ilike, or, SQL } from 'drizzle-orm';
import type { Executor } from '../db/conexao';
import { emprestimos, livros, multas, usuarios } from '../db/schema';
import { ConflitoError, ehViolacaoDeUnicidade, NaoEncontradoError } from '../erros';
import type { EdicaoUsuario, FiltroUsuarios, NovoUsuario } from '../esquemas';
import { carregarIndicadores, resumir } from './situacao';

function filtrar(filtro: FiltroUsuarios): SQL | undefined {
  const termo = filtro.busca ? `%${filtro.busca}%` : undefined;
  return and(
    termo ? or(ilike(usuarios.nome, termo), ilike(usuarios.matricula, termo), ilike(usuarios.email, termo)) : undefined,
    filtro.perfil ? eq(usuarios.perfil, filtro.perfil) : undefined,
  );
}

export async function listarUsuarios(db: Executor, filtro: FiltroUsuarios, hoje: string) {
  const linhas = await db.select().from(usuarios).where(filtrar(filtro)).orderBy(asc(usuarios.nome));
  const indicadores = await carregarIndicadores(db);
  return linhas.map((usuario) => ({ ...usuario, resumo: resumir(usuario.perfil, indicadores.get(usuario.id), hoje) }));
}

async function buscarPorId(db: Executor, id: number) {
  const [usuario] = await db.select().from(usuarios).where(eq(usuarios.id, id));
  if (!usuario) throw new NaoEncontradoError('Usuário', id);
  return usuario;
}

export async function obterUsuario(db: Executor, id: number, hoje: string) {
  const usuario = await buscarPorId(db, id);
  const historico = await db
    .select({
      id: emprestimos.id,
      livroId: livros.id,
      titulo: livros.titulo,
      dataEmprestimo: emprestimos.dataEmprestimo,
      dataPrevista: emprestimos.dataPrevista,
      dataDevolucao: emprestimos.dataDevolucao,
    })
    .from(emprestimos)
    .innerJoin(livros, eq(livros.id, emprestimos.livroId))
    .where(eq(emprestimos.usuarioId, id))
    .orderBy(desc(emprestimos.dataEmprestimo), desc(emprestimos.id));
  const multasDoUsuario = await db.select().from(multas).where(eq(multas.usuarioId, id)).orderBy(desc(multas.id));
  const indicadores = await carregarIndicadores(db);
  return {
    ...usuario,
    resumo: resumir(usuario.perfil, indicadores.get(id), hoje),
    emprestimos: historico,
    multas: multasDoUsuario,
  };
}

function traduzirUnicidade(erro: unknown, matricula: string | undefined): never {
  if (ehViolacaoDeUnicidade(erro)) {
    throw new ConflitoError(`Já existe um usuário com a matrícula ${matricula}`);
  }
  throw erro;
}

export async function criarUsuario(db: Executor, dados: NovoUsuario) {
  try {
    const [criado] = await db.insert(usuarios).values(dados).returning();
    return criado;
  } catch (erro) {
    return traduzirUnicidade(erro, dados.matricula);
  }
}

export async function atualizarUsuario(db: Executor, id: number, dados: EdicaoUsuario) {
  if (Object.keys(dados).length === 0) return buscarPorId(db, id);
  try {
    const [atualizado] = await db.update(usuarios).set(dados).where(eq(usuarios.id, id)).returning();
    if (!atualizado) throw new NaoEncontradoError('Usuário', id);
    return atualizado;
  } catch (erro) {
    return traduzirUnicidade(erro, dados.matricula);
  }
}
