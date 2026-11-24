import { isNull, sum } from 'drizzle-orm';
import type { Executor } from '../db/conexao';
import { multas } from '../db/schema';
import { listarEmprestimos } from './emprestimos';
import { listarUsuarios } from './usuarios';

const LIMITE_LISTAS = 5;

export async function obterPainel(db: Executor, hoje: string) {
  const ativos = await listarEmprestimos(db, { situacao: 'ativos' }, hoje);
  const atrasados = ativos.filter((emprestimo) => emprestimo.diasAtraso > 0);
  const [{ total }] = await db.select({ total: sum(multas.valorCentavos).mapWith(Number) }).from(multas).where(isNull(multas.pagaEm));
  const usuarios = await listarUsuarios(db, {}, hoje);

  return {
    hoje,
    emprestimosAtivos: ativos.length,
    emprestimosAtrasados: atrasados.length,
    multasEmAbertoCentavos: total ?? 0,
    usuariosBloqueados: usuarios.filter((usuario) => usuario.resumo.pendente).length,
    totalUsuarios: usuarios.length,
    proximosVencimentos: ativos.filter((emprestimo) => emprestimo.diasAtraso === 0).slice(0, LIMITE_LISTAS),
    maioresAtrasos: [...atrasados].sort((primeiro, segundo) => segundo.diasAtraso - primeiro.diasAtraso).slice(0, LIMITE_LISTAS),
  };
}
