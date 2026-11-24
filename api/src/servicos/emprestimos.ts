import { and, asc, count, desc, eq, inArray, isNotNull, isNull, lt, SQL } from 'drizzle-orm';
import {
  ArgumentoInvalidoError,
  calcularDataDevolucao,
  calcularDiasAtraso,
  CalculadoraEmprestimo,
  possuiPendencia,
} from '../../../src/domain';
import type { Banco, Executor } from '../db/conexao';
import { emprestimos, livros, multas, usuarios } from '../db/schema';
import { ConflitoError, NaoEncontradoError, OperacaoRecusadaError } from '../erros';
import type { Devolucao, FiltroEmprestimos, NovoEmprestimo } from '../esquemas';
import { ehPosterior } from './situacao';

const calculadora = new CalculadoraEmprestimo();
const CENTAVOS_POR_REAL = 100;

async function bloquearUsuario(tx: Executor, usuarioId: number) {
  // FOR UPDATE serializa pedidos simultâneos do mesmo usuário: o segundo espera o primeiro terminar.
  const [usuario] = await tx.select().from(usuarios).where(eq(usuarios.id, usuarioId)).for('update');
  if (!usuario) throw new NaoEncontradoError('Usuário', usuarioId);
  if (!usuario.ativo) throw new OperacaoRecusadaError('USUARIO_INATIVO', `O usuário ${usuario.nome} está inativo`);
  return usuario;
}

async function situacaoAtual(tx: Executor, usuarioId: number) {
  const ativos = await tx
    .select({ livroId: emprestimos.livroId, dataPrevista: emprestimos.dataPrevista })
    .from(emprestimos)
    .where(and(eq(emprestimos.usuarioId, usuarioId), isNull(emprestimos.dataDevolucao)));
  const [{ total }] = await tx
    .select({ total: count() })
    .from(multas)
    .where(and(eq(multas.usuarioId, usuarioId), isNull(multas.pagaEm)));
  return { ativos, multasEmAberto: total };
}

async function bloquearLivros(tx: Executor, livroIds: number[]) {
  // Ordem fixa de bloqueio (por id) evita deadlock entre pedidos concorrentes.
  const selecionados = await tx
    .select()
    .from(livros)
    .where(inArray(livros.id, livroIds))
    .orderBy(asc(livros.id))
    .for('update');
  const faltante = livroIds.find((id) => !selecionados.some((livro) => livro.id === id));
  if (faltante !== undefined) throw new NaoEncontradoError('Livro', faltante);
  return selecionados;
}

type Livro = typeof livros.$inferSelect;

function garantirDisponivel(livro: Livro, ocupados: number, jaEmprestados: Set<number>) {
  if (jaEmprestados.has(livro.id)) {
    throw new OperacaoRecusadaError('LIVRO_JA_EMPRESTADO', `O usuário já está com "${livro.titulo}"`);
  }
  if (ocupados >= livro.exemplaresTotal) {
    throw new OperacaoRecusadaError('LIVRO_INDISPONIVEL', `Sem exemplares disponíveis de "${livro.titulo}"`);
  }
}

async function bloquearLivrosDisponiveis(tx: Executor, livroIds: number[], jaEmprestados: Set<number>) {
  const selecionados = await bloquearLivros(tx, livroIds);
  const emUso = await tx
    .select({ livroId: emprestimos.livroId, total: count() })
    .from(emprestimos)
    .where(and(inArray(emprestimos.livroId, livroIds), isNull(emprestimos.dataDevolucao)))
    .groupBy(emprestimos.livroId);
  selecionados.forEach((livro) => {
    garantirDisponivel(livro, emUso.find((uso) => uso.livroId === livro.id)?.total ?? 0, jaEmprestados);
  });
}

function validarDataNaoFutura(data: string, hoje: string, descricao: string) {
  if (ehPosterior(data, hoje)) throw new ArgumentoInvalidoError(`${descricao} não pode ser futura: ${data}`);
}

/** RF01 aplicado a um pedido real: pendência e limite decididos pelo domínio, dentro de uma transação. */
export function registrarEmprestimo(db: Banco, pedido: NovoEmprestimo, hoje: string) {
  return db.transaction(async (tx) => {
    const usuario = await bloquearUsuario(tx, pedido.usuarioId);
    const dataEmprestimo = pedido.dataEmprestimo ?? hoje;
    validarDataNaoFutura(dataEmprestimo, hoje, 'A data do empréstimo');

    const { ativos, multasEmAberto } = await situacaoAtual(tx, usuario.id);
    const pendente = possuiPendencia({ multasEmAberto, datasPrevistasAtivas: ativos.map((ativo) => ativo.dataPrevista), hoje });
    const resultado = calculadora.validarEmprestimo(usuario.perfil, ativos.length, pedido.livroIds.length, pendente);

    await bloquearLivrosDisponiveis(tx, pedido.livroIds, new Set(ativos.map((ativo) => ativo.livroId)));
    const dataPrevista = calcularDataDevolucao(dataEmprestimo, usuario.perfil);
    const criados = await tx
      .insert(emprestimos)
      .values(pedido.livroIds.map((livroId) => ({ usuarioId: usuario.id, livroId, dataEmprestimo, dataPrevista })))
      .returning();
    return { ...resultado, dataEmprestimo, dataPrevista, emprestimos: criados };
  });
}

async function bloquearEmprestimoAtivo(tx: Executor, id: number) {
  const [emprestimo] = await tx.select().from(emprestimos).where(eq(emprestimos.id, id)).for('update');
  if (!emprestimo) throw new NaoEncontradoError('Empréstimo', id);
  if (emprestimo.dataDevolucao) throw new ConflitoError(`O empréstimo ${id} já foi devolvido em ${emprestimo.dataDevolucao}`);
  return emprestimo;
}

/** RF02 aplicado a uma devolução real: atraso por datas e multa pelo domínio. */
export function registrarDevolucao(db: Banco, id: number, dados: Devolucao, hoje: string) {
  return db.transaction(async (tx) => {
    const emprestimo = await bloquearEmprestimoAtivo(tx, id);
    const dataDevolucao = dados.dataDevolucao ?? hoje;
    validarDataNaoFutura(dataDevolucao, hoje, 'A data da devolução');
    if (ehPosterior(emprestimo.dataEmprestimo, dataDevolucao)) {
      throw new ArgumentoInvalidoError('A devolução não pode ser anterior ao empréstimo');
    }
    const [{ perfil }] = await tx.select({ perfil: usuarios.perfil }).from(usuarios).where(eq(usuarios.id, emprestimo.usuarioId));
    const diasAtraso = calcularDiasAtraso(emprestimo.dataPrevista, dataDevolucao);
    const valorCentavos = Math.round(calculadora.calcularMulta(diasAtraso, perfil) * CENTAVOS_POR_REAL);

    const [atualizado] = await tx.update(emprestimos).set({ dataDevolucao }).where(eq(emprestimos.id, id)).returning();
    const [multa] = valorCentavos > 0
      ? await tx.insert(multas).values({ emprestimoId: id, usuarioId: emprestimo.usuarioId, diasAtraso, valorCentavos }).returning()
      : [null];
    return { emprestimo: atualizado, diasAtraso, multa };
  });
}

function condicaoSituacao(filtro: FiltroEmprestimos, hoje: string): SQL | undefined {
  const porSituacao = {
    ativos: isNull(emprestimos.dataDevolucao),
    atrasados: and(isNull(emprestimos.dataDevolucao), lt(emprestimos.dataPrevista, hoje)),
    devolvidos: isNotNull(emprestimos.dataDevolucao),
    todos: undefined,
  };
  return and(porSituacao[filtro.situacao], filtro.usuarioId ? eq(emprestimos.usuarioId, filtro.usuarioId) : undefined);
}

export async function listarEmprestimos(db: Executor, filtro: FiltroEmprestimos, hoje: string) {
  const linhas = await db
    .select({
      id: emprestimos.id,
      dataEmprestimo: emprestimos.dataEmprestimo,
      dataPrevista: emprestimos.dataPrevista,
      dataDevolucao: emprestimos.dataDevolucao,
      usuario: { id: usuarios.id, nome: usuarios.nome, matricula: usuarios.matricula, perfil: usuarios.perfil },
      livro: { id: livros.id, titulo: livros.titulo, autor: livros.autor },
    })
    .from(emprestimos)
    .innerJoin(usuarios, eq(usuarios.id, emprestimos.usuarioId))
    .innerJoin(livros, eq(livros.id, emprestimos.livroId))
    .where(condicaoSituacao(filtro, hoje))
    .orderBy(asc(emprestimos.dataPrevista), desc(emprestimos.id));
  return linhas.map((linha) => ({
    ...linha,
    diasAtraso: calcularDiasAtraso(linha.dataPrevista, linha.dataDevolucao ?? hoje),
  }));
}
