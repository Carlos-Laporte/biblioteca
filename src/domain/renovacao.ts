import { paraDiaAbsoluto, paraTexto } from './datas';
import { RegraNegocioError } from './erros';
import { REGRAS_POR_PERFIL, REGRAS_RENOVACAO } from './regras';
import { PerfilUsuario } from './tipos';
import { garantirBooleano, garantirInteiroMinimo, garantirPerfilValido } from './validacoes';

export interface PedidoRenovacao {
  readonly perfil: PerfilUsuario;
  /** Data prevista de devolução atual (`AAAA-MM-DD`). */
  readonly dataPrevista: string;
  readonly hoje: string;
  readonly renovacoesRealizadas: number;
  /** Outro usuário reservou o mesmo livro. */
  readonly possuiReserva: boolean;
  readonly possuiPendencia: boolean;
}

export interface ResultadoRenovacao {
  aprovada: true;
  novaDataDevolucao: string;
  renovacoesRestantes: number;
}

const MINIMO_RENOVACOES = 0;

interface DiasRenovacao {
  readonly prevista: number;
  readonly hoje: number;
}

function validarEntrada(pedido: PedidoRenovacao): DiasRenovacao {
  garantirPerfilValido(pedido.perfil);
  const prevista = paraDiaAbsoluto(pedido.dataPrevista, 'Data prevista de devolução');
  const hoje = paraDiaAbsoluto(pedido.hoje, 'Data atual');
  garantirInteiroMinimo(pedido.renovacoesRealizadas, MINIMO_RENOVACOES, 'Quantidade de renovações realizadas');
  garantirBooleano(pedido.possuiReserva, 'Indicador de reserva');
  garantirBooleano(pedido.possuiPendencia, 'Indicador de pendência');
  return { prevista, hoje };
}

/** Recusas por situação do usuário e do livro, da mais grave para a menos grave (S12). */
function verificarBloqueios(pedido: PedidoRenovacao, { prevista, hoje }: DiasRenovacao): void {
  if (hoje > prevista) {
    throw new RegraNegocioError('ATRASO', `Renovação recusada: empréstimo vencido em ${pedido.dataPrevista}`);
  }
  if (pedido.possuiPendencia) {
    throw new RegraNegocioError('PENDENCIA', 'Renovação recusada: usuário possui multa ou livro em atraso');
  }
  if (pedido.possuiReserva) {
    throw new RegraNegocioError('RESERVA', 'Renovação recusada: livro reservado por outro usuário');
  }
}

/** Recusas pelas regras da própria renovação: limite (S7) e janela de antecedência (S8). */
function verificarLimiteEPeriodo(pedido: PedidoRenovacao, { prevista, hoje }: DiasRenovacao): void {
  if (pedido.renovacoesRealizadas >= REGRAS_RENOVACAO.MAXIMO_RENOVACOES) {
    throw new RegraNegocioError(
      'LIMITE_RENOVACOES',
      `Renovação recusada: limite de ${REGRAS_RENOVACAO.MAXIMO_RENOVACOES} renovações atingido`,
    );
  }
  const inicioJanela = prevista - REGRAS_RENOVACAO.DIAS_ANTECEDENCIA;
  if (hoje < inicioJanela) {
    throw new RegraNegocioError('FORA_DO_PERIODO', `Renovação recusada: permitida a partir de ${paraTexto(inicioJanela)}`);
  }
}

/**
 * RF03 — valida a renovação de um empréstimo ativo.
 * @throws ArgumentoInvalidoError entrada fora do domínio
 * @throws RegraNegocioError renovação recusada (ATRASO, PENDENCIA, RESERVA, LIMITE_RENOVACOES, FORA_DO_PERIODO)
 */
export function validarRenovacao(pedido: PedidoRenovacao): ResultadoRenovacao {
  const dias = validarEntrada(pedido);
  verificarBloqueios(pedido, dias);
  verificarLimiteEPeriodo(pedido, dias);

  return {
    aprovada: true,
    novaDataDevolucao: paraTexto(dias.hoje + REGRAS_POR_PERFIL[pedido.perfil].prazoDevolucaoDias),
    renovacoesRestantes: REGRAS_RENOVACAO.MAXIMO_RENOVACOES - 1 - pedido.renovacoesRealizadas,
  };
}
