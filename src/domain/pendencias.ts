import { DataCivil } from './datas';

export interface SituacaoUsuario {
  readonly multasEmAberto: number;
  readonly datasPrevistasAtivas: readonly DataCivil[];
  readonly hoje: DataCivil;
}

export interface EmprestimoResumo {
  readonly dataDevolucao: DataCivil | null;
}

export function possuiPendencia(_situacao: SituacaoUsuario): boolean {
  throw new Error('Não implementado');
}

export function contarLivrosEmUso(_emprestimos: readonly EmprestimoResumo[]): number {
  throw new Error('Não implementado');
}
