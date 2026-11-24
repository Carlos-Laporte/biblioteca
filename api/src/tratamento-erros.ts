import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { ArgumentoInvalidoError, RegraNegocioError } from '../../src/domain';
import { ConflitoError, NaoEncontradoError, OperacaoRecusadaError } from './erros';

type ClasseErro = abstract new (...args: never[]) => Error;

interface Mapeamento {
  readonly classe: ClasseErro;
  readonly status: number;
  readonly codigo: string;
}

const HTTP = { REQUISICAO_INVALIDA: 400, NAO_ENCONTRADO: 404, CONFLITO: 409, RECUSADO: 422, INTERNO: 500 } as const;

const MAPEAMENTOS: readonly Mapeamento[] = [
  { classe: ArgumentoInvalidoError, status: HTTP.REQUISICAO_INVALIDA, codigo: 'ARGUMENTO_INVALIDO' },
  { classe: RegraNegocioError, status: HTTP.RECUSADO, codigo: 'EMPRESTIMO_RECUSADO' },
  { classe: OperacaoRecusadaError, status: HTTP.RECUSADO, codigo: 'OPERACAO_RECUSADA' },
  { classe: NaoEncontradoError, status: HTTP.NAO_ENCONTRADO, codigo: 'NAO_ENCONTRADO' },
  { classe: ConflitoError, status: HTTP.CONFLITO, codigo: 'CONFLITO' },
];

function corpoZod(erro: z.ZodError) {
  return {
    erro: 'ENTRADA_INVALIDA',
    mensagem: 'Dados inválidos',
    campos: erro.issues.map((issue) => ({ campo: issue.path.join('.'), mensagem: issue.message })),
  };
}

/** Traduz erros do domínio e da API em respostas HTTP coerentes. */
export function tratarErro(erro: FastifyError, requisicao: FastifyRequest, resposta: FastifyReply) {
  if (erro instanceof z.ZodError) return resposta.status(HTTP.REQUISICAO_INVALIDA).send(corpoZod(erro));

  const mapeado = MAPEAMENTOS.find((mapeamento) => erro instanceof mapeamento.classe);
  if (mapeado) {
    const motivo = (erro as { motivo?: string }).motivo;
    return resposta.status(mapeado.status).send({ erro: mapeado.codigo, mensagem: erro.message, motivo });
  }

  const status = erro.statusCode ?? HTTP.INTERNO;
  if (status < HTTP.INTERNO) {
    return resposta.status(status).send({ erro: 'REQUISICAO_INVALIDA', mensagem: erro.message });
  }
  requisicao.log.error(erro);
  return resposta.status(HTTP.INTERNO).send({ erro: 'ERRO_INTERNO', mensagem: 'Erro interno do servidor' });
}
