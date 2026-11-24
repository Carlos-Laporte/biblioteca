import Fastify, { FastifyServerOptions } from 'fastify';
import { hojeEmSaoPaulo } from '../../src/domain';
import type { Banco } from './db/conexao';
import { registrarRotas } from './rotas';
import { tratarErro } from './tratamento-erros';

export interface OpcoesApp {
  readonly db: Banco;
  /** Relógio injetável: os testes fixam a data de "hoje". */
  readonly hoje?: () => string;
  readonly logger?: FastifyServerOptions['logger'];
}

export function construirApp({ db, hoje = () => hojeEmSaoPaulo(), logger = false }: OpcoesApp) {
  const app = Fastify({ logger });
  app.setErrorHandler(tratarErro);
  registrarRotas(app, { db, hoje });
  return app;
}
