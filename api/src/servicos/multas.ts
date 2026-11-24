import { desc, eq, isNotNull, isNull } from 'drizzle-orm';
import type { Banco, Executor } from '../db/conexao';
import { emprestimos, livros, multas, usuarios } from '../db/schema';
import { ConflitoError, NaoEncontradoError } from '../erros';
import type { FiltroMultas } from '../esquemas';

export async function listarMultas(db: Executor, filtro: FiltroMultas) {
  const porSituacao = { abertas: isNull(multas.pagaEm), pagas: isNotNull(multas.pagaEm), todas: undefined };
  return db
    .select({
      id: multas.id,
      diasAtraso: multas.diasAtraso,
      valorCentavos: multas.valorCentavos,
      pagaEm: multas.pagaEm,
      emprestimoId: multas.emprestimoId,
      dataDevolucao: emprestimos.dataDevolucao,
      usuario: { id: usuarios.id, nome: usuarios.nome, matricula: usuarios.matricula },
      livro: { id: livros.id, titulo: livros.titulo },
    })
    .from(multas)
    .innerJoin(usuarios, eq(usuarios.id, multas.usuarioId))
    .innerJoin(emprestimos, eq(emprestimos.id, multas.emprestimoId))
    .innerJoin(livros, eq(livros.id, emprestimos.livroId))
    .where(porSituacao[filtro.situacao])
    .orderBy(desc(multas.id));
}

/** Pagamento da multa: remove a pendência financeira do usuário (RF01). */
export function pagarMulta(db: Banco, id: number, hoje: string) {
  return db.transaction(async (tx) => {
    const [multa] = await tx.select().from(multas).where(eq(multas.id, id)).for('update');
    if (!multa) throw new NaoEncontradoError('Multa', id);
    if (multa.pagaEm) throw new ConflitoError(`A multa ${id} já foi paga em ${multa.pagaEm}`);
    const [paga] = await tx.update(multas).set({ pagaEm: hoje }).where(eq(multas.id, id)).returning();
    return paga;
  });
}
