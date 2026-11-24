import { asc, count, eq, getTableColumns, ilike, isNull, or, sql } from 'drizzle-orm';
import type { Executor } from '../db/conexao';
import { emprestimos, livros } from '../db/schema';
import { ConflitoError, ehViolacaoDeUnicidade, NaoEncontradoError } from '../erros';
import type { EdicaoLivro, FiltroLivros, NovoLivro } from '../esquemas';

function consultaComDisponibilidade(db: Executor) {
  const emUso = db
    .select({ livroId: emprestimos.livroId, total: count().as('total') })
    .from(emprestimos)
    .where(isNull(emprestimos.dataDevolucao))
    .groupBy(emprestimos.livroId)
    .as('em_uso');
  return db
    .select({ ...getTableColumns(livros), emUso: sql<number>`coalesce(${emUso.total}, 0)::int` })
    .from(livros)
    .leftJoin(emUso, eq(emUso.livroId, livros.id))
    .$dynamic();
}

type LinhaLivro = Awaited<ReturnType<typeof consultaComDisponibilidade>>[number];

const comDisponiveis = (livro: LinhaLivro) => ({ ...livro, disponiveis: livro.exemplaresTotal - livro.emUso });

export async function listarLivros(db: Executor, filtro: FiltroLivros) {
  const termo = filtro.busca ? `%${filtro.busca}%` : undefined;
  const condicao = termo
    ? or(ilike(livros.titulo, termo), ilike(livros.autor, termo), ilike(livros.isbn, termo))
    : undefined;
  const linhas = await consultaComDisponibilidade(db).where(condicao).orderBy(asc(livros.titulo));
  return linhas.map(comDisponiveis);
}

export async function obterLivro(db: Executor, id: number) {
  const [livro] = await consultaComDisponibilidade(db).where(eq(livros.id, id));
  if (!livro) throw new NaoEncontradoError('Livro', id);
  return comDisponiveis(livro);
}

function traduzirUnicidade(erro: unknown, isbn: string | undefined): never {
  if (ehViolacaoDeUnicidade(erro)) {
    throw new ConflitoError(`Já existe um livro com o ISBN ${isbn}`);
  }
  throw erro;
}

export async function criarLivro(db: Executor, dados: NovoLivro) {
  try {
    const [criado] = await db.insert(livros).values(dados).returning();
    return { ...criado, emUso: 0, disponiveis: criado.exemplaresTotal };
  } catch (erro) {
    return traduzirUnicidade(erro, dados.isbn);
  }
}

export async function atualizarLivro(db: Executor, id: number, dados: EdicaoLivro) {
  const atual = await obterLivro(db, id);
  if (dados.exemplaresTotal !== undefined && dados.exemplaresTotal < atual.emUso) {
    throw new ConflitoError(`Há ${atual.emUso} exemplar(es) emprestado(s); o total não pode ser menor`);
  }
  if (Object.keys(dados).length === 0) return atual;
  try {
    await db.update(livros).set(dados).where(eq(livros.id, id));
  } catch (erro) {
    traduzirUnicidade(erro, dados.isbn);
  }
  return obterLivro(db, id);
}
