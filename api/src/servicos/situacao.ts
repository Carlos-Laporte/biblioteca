import { count, isNull } from 'drizzle-orm';
import { calcularDiasAtraso, possuiPendencia, REGRAS_POR_PERFIL } from '../../../src/domain';
import type { PerfilUsuario } from '../../../src/domain';
import type { Executor } from '../db/conexao';
import { emprestimos, multas } from '../db/schema';

export interface ResumoUsuario {
  readonly livrosEmUso: number;
  readonly limite: number;
  readonly prazoDevolucaoDias: number;
  readonly multasEmAberto: number;
  readonly emAtraso: number;
  readonly pendente: boolean;
}

interface Indicadores {
  readonly previstas: string[];
  readonly multasEmAberto: number;
}

/** `a` é posterior a `b`? (reaproveita a aritmética de datas validada do domínio) */
export function ehPosterior(dataA: string, dataB: string): boolean {
  return calcularDiasAtraso(dataB, dataA) > 0;
}

/** Resumo da situação do usuário; a pendência é decidida pelo domínio. */
export function resumir(perfil: PerfilUsuario, indicadores: Indicadores | undefined, hoje: string): ResumoUsuario {
  const previstas = indicadores?.previstas ?? [];
  const multasEmAberto = indicadores?.multasEmAberto ?? 0;
  const regra = REGRAS_POR_PERFIL[perfil];
  return {
    livrosEmUso: previstas.length,
    limite: regra.limiteLivros,
    prazoDevolucaoDias: regra.prazoDevolucaoDias,
    multasEmAberto,
    emAtraso: previstas.filter((prevista) => ehPosterior(hoje, prevista)).length,
    pendente: possuiPendencia({ multasEmAberto, datasPrevistasAtivas: previstas, hoje }),
  };
}

/** Empréstimos ativos e multas em aberto agrupados por usuário. */
export async function carregarIndicadores(db: Executor): Promise<Map<number, Indicadores>> {
  const ativos = await db
    .select({ usuarioId: emprestimos.usuarioId, dataPrevista: emprestimos.dataPrevista })
    .from(emprestimos)
    .where(isNull(emprestimos.dataDevolucao));
  const abertas = await db
    .select({ usuarioId: multas.usuarioId, total: count() })
    .from(multas)
    .where(isNull(multas.pagaEm))
    .groupBy(multas.usuarioId);

  const porUsuario = new Map<number, { previstas: string[]; multasEmAberto: number }>();
  const obter = (id: number) => {
    const atual = porUsuario.get(id) ?? { previstas: [], multasEmAberto: 0 };
    porUsuario.set(id, atual);
    return atual;
  };
  ativos.forEach((ativo) => obter(ativo.usuarioId).previstas.push(ativo.dataPrevista));
  abertas.forEach((aberta) => {
    obter(aberta.usuarioId).multasEmAberto = aberta.total;
  });
  return porUsuario;
}
