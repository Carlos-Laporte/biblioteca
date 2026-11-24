import { paraDiaAbsoluto } from './datas';
import { garantirInteiroMinimo } from './validacoes';

export interface SituacaoUsuario {
  readonly multasEmAberto: number;
  /** Datas previstas (`AAAA-MM-DD`) dos empréstimos ainda não devolvidos. */
  readonly datasPrevistasAtivas: readonly string[];
  readonly hoje: string;
}

export interface EmprestimoResumo {
  readonly dataDevolucao: string | null;
}

const MINIMO_MULTAS = 0;

/** RF01 — pendência: qualquer multa em aberto ou livro com prazo vencido (prevista anterior a hoje). */
export function possuiPendencia(situacao: SituacaoUsuario): boolean {
  garantirInteiroMinimo(situacao.multasEmAberto, MINIMO_MULTAS, 'Quantidade de multas em aberto');
  const hoje = paraDiaAbsoluto(situacao.hoje, 'Data atual');
  const previstas = situacao.datasPrevistasAtivas.map((data) => paraDiaAbsoluto(data, 'Data prevista de devolução'));
  return situacao.multasEmAberto > MINIMO_MULTAS || previstas.some((prevista) => prevista < hoje);
}

export function contarLivrosEmUso(emprestimos: readonly EmprestimoResumo[]): number {
  return emprestimos.filter((emprestimo) => emprestimo.dataDevolucao === null).length;
}
