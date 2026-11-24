import { PerfilUsuario } from './tipos';

/** Data civil no formato ISO `AAAA-MM-DD` (sem hora). */
export type DataCivil = string;

export function calcularDataDevolucao(_dataEmprestimo: DataCivil, _perfil: PerfilUsuario): DataCivil {
  throw new Error('Não implementado');
}

export function calcularDiasAtraso(_dataPrevista: DataCivil, _dataDevolucao: DataCivil): number {
  throw new Error('Não implementado');
}

export function hojeEmSaoPaulo(_agora?: Date): DataCivil {
  throw new Error('Não implementado');
}
