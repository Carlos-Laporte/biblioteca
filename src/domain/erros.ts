/** Equivalente a IllegalArgumentException: entrada fora do domínio aceito. */
export class ArgumentoInvalidoError extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ArgumentoInvalidoError';
  }
}

export type MotivoRecusa = 'PENDENCIA' | 'LIMITE_EXCEDIDO';

/** Violação de regra de negócio: o empréstimo é recusado. */
export class RegraNegocioError extends Error {
  readonly motivo: MotivoRecusa;

  constructor(motivo: MotivoRecusa, mensagem: string) {
    super(mensagem);
    this.name = 'RegraNegocioError';
    this.motivo = motivo;
  }
}
