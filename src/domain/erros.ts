/** Equivalente a IllegalArgumentException: entrada fora do domínio aceito. */
export class ArgumentoInvalidoError extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ArgumentoInvalidoError';
  }
}

export type MotivoRecusa =
  | 'PENDENCIA'
  | 'LIMITE_EXCEDIDO'
  | 'ATRASO'
  | 'RESERVA'
  | 'LIMITE_RENOVACOES'
  | 'FORA_DO_PERIODO';

/** Violação de regra de negócio: o empréstimo ou a renovação é recusado. */
export class RegraNegocioError extends Error {
  readonly motivo: MotivoRecusa;

  constructor(motivo: MotivoRecusa, mensagem: string) {
    super(mensagem);
    this.name = 'RegraNegocioError';
    this.motivo = motivo;
  }
}
