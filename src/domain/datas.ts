import { ArgumentoInvalidoError } from './erros';
import { REGRAS_POR_PERFIL } from './regras';
import { PerfilUsuario } from './tipos';
import { garantirPerfilValido } from './validacoes';

// Datas civis são strings ISO `AAAA-MM-DD` (sem hora).
const MS_POR_DIA = 86_400_000;
const TAMANHO_DATA_ISO = 10;
const FUSO_BIBLIOTECA = 'America/Sao_Paulo';

const formatadorDataCivil = new Intl.DateTimeFormat('en-CA', {
  timeZone: FUSO_BIBLIOTECA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function paraTexto(diaAbsoluto: number): string {
  return new Date(diaAbsoluto * MS_POR_DIA).toISOString().slice(0, TAMANHO_DATA_ISO);
}

/**
 * Converte a data civil em número de dias desde 1970-01-01 (UTC), validando-a.
 * A volta para texto rejeita qualquer entrada que não seja exatamente `AAAA-MM-DD` válida:
 * datas inexistentes (2026-02-30 vira 02/03), outros formatos, espaços e não-strings.
 */
export function paraDiaAbsoluto(data: unknown, descricao: string): number {
  const diaAbsoluto = Date.parse(String(data)) / MS_POR_DIA;
  if (Number.isNaN(diaAbsoluto) || paraTexto(diaAbsoluto) !== data) {
    throw new ArgumentoInvalidoError(`${descricao} inválida: ${String(data)}`);
  }
  return diaAbsoluto;
}

/** Data prevista de devolução: data do empréstimo + prazo do perfil, em dias corridos. */
export function calcularDataDevolucao(dataEmprestimo: string, perfil: PerfilUsuario): string {
  garantirPerfilValido(perfil);
  const dia = paraDiaAbsoluto(dataEmprestimo, 'Data de empréstimo');
  return paraTexto(dia + REGRAS_POR_PERFIL[perfil].prazoDevolucaoDias);
}

/** Dias corridos após a data prevista; devolução antes ou no dia previsto não tem atraso. */
export function calcularDiasAtraso(dataPrevista: string, dataDevolucao: string): number {
  const prevista = paraDiaAbsoluto(dataPrevista, 'Data prevista de devolução');
  const devolucao = paraDiaAbsoluto(dataDevolucao, 'Data de devolução');
  return Math.max(devolucao - prevista, 0);
}

/** Data civil de "hoje" no fuso da biblioteca (America/Sao_Paulo). */
export function hojeEmSaoPaulo(agora: Date = new Date()): string {
  if (!(agora instanceof Date) || Number.isNaN(agora.getTime())) {
    throw new ArgumentoInvalidoError('Instante inválido para calcular a data atual');
  }
  return formatadorDataCivil.format(agora);
}
