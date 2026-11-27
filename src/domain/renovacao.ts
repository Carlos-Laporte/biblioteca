import { PerfilUsuario } from './tipos';

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

/** RF03 — valida a renovação de um empréstimo ativo. */
export function validarRenovacao(_pedido: PedidoRenovacao): ResultadoRenovacao {
  throw new Error('Não implementado');
}
