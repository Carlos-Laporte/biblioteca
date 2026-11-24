/** Recurso inexistente → HTTP 404. */
export class NaoEncontradoError extends Error {
  constructor(recurso: string, id: number) {
    super(`${recurso} ${id} não encontrado(a)`);
    this.name = 'NaoEncontradoError';
  }
}

/** Conflito com o estado atual (duplicidade, operação repetida) → HTTP 409. */
export class ConflitoError extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ConflitoError';
  }
}

export type MotivoOperacao = 'USUARIO_INATIVO' | 'LIVRO_INDISPONIVEL' | 'LIVRO_JA_EMPRESTADO';

/** Recusa por regra operacional da biblioteca (fora do RF01) → HTTP 422. */
export class OperacaoRecusadaError extends Error {
  readonly motivo: MotivoOperacao;

  constructor(motivo: MotivoOperacao, mensagem: string) {
    super(mensagem);
    this.name = 'OperacaoRecusadaError';
    this.motivo = motivo;
  }
}

const VIOLACAO_UNICIDADE = '23505';

/** Detecta violação de chave única do PostgreSQL (o Drizzle pode embrulhar o erro em `cause`). */
export function ehViolacaoDeUnicidade(erro: unknown): boolean {
  const comCodigo = (valor: unknown) => (valor as { code?: string } | null)?.code === VIOLACAO_UNICIDADE;
  return comCodigo(erro) || comCodigo((erro as { cause?: unknown } | null)?.cause);
}
