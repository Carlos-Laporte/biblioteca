import type { FastifyInstance } from 'fastify';
import type { Banco } from './db/conexao';
import {
  esquemaDevolucao,
  esquemaEdicaoLivro,
  esquemaEdicaoUsuario,
  esquemaFiltroEmprestimos,
  esquemaFiltroLivros,
  esquemaFiltroMultas,
  esquemaFiltroUsuarios,
  esquemaId,
  esquemaNovoEmprestimo,
  esquemaNovoLivro,
  esquemaNovoUsuario,
} from './esquemas';
import { listarEmprestimos, registrarDevolucao, registrarEmprestimo } from './servicos/emprestimos';
import { atualizarLivro, criarLivro, listarLivros, obterLivro } from './servicos/livros';
import { listarMultas, pagarMulta } from './servicos/multas';
import { obterPainel } from './servicos/painel';
import { atualizarUsuario, criarUsuario, listarUsuarios, obterUsuario } from './servicos/usuarios';

const CRIADO = 201;

export interface Dependencias {
  readonly db: Banco;
  readonly hoje: () => string;
}

function rotasUsuarios(app: FastifyInstance, { db, hoje }: Dependencias) {
  app.get('/api/usuarios', (req) => listarUsuarios(db, esquemaFiltroUsuarios.parse(req.query), hoje()));
  app.get('/api/usuarios/:id', (req) => obterUsuario(db, esquemaId.parse(req.params).id, hoje()));
  app.post('/api/usuarios', async (req, res) => res.status(CRIADO).send(await criarUsuario(db, esquemaNovoUsuario.parse(req.body))));
  app.put('/api/usuarios/:id', (req) => atualizarUsuario(db, esquemaId.parse(req.params).id, esquemaEdicaoUsuario.parse(req.body)));
}

function rotasLivros(app: FastifyInstance, { db }: Dependencias) {
  app.get('/api/livros', (req) => listarLivros(db, esquemaFiltroLivros.parse(req.query)));
  app.get('/api/livros/:id', (req) => obterLivro(db, esquemaId.parse(req.params).id));
  app.post('/api/livros', async (req, res) => res.status(CRIADO).send(await criarLivro(db, esquemaNovoLivro.parse(req.body))));
  app.put('/api/livros/:id', (req) => atualizarLivro(db, esquemaId.parse(req.params).id, esquemaEdicaoLivro.parse(req.body)));
}

function rotasEmprestimos(app: FastifyInstance, { db, hoje }: Dependencias) {
  app.get('/api/emprestimos', (req) => listarEmprestimos(db, esquemaFiltroEmprestimos.parse(req.query), hoje()));
  app.post('/api/emprestimos', async (req, res) =>
    res.status(CRIADO).send(await registrarEmprestimo(db, esquemaNovoEmprestimo.parse(req.body), hoje())),
  );
  app.post('/api/emprestimos/:id/devolucao', (req) =>
    registrarDevolucao(db, esquemaId.parse(req.params).id, esquemaDevolucao.parse(req.body ?? {}), hoje()),
  );
}

function rotasMultas(app: FastifyInstance, { db, hoje }: Dependencias) {
  app.get('/api/multas', (req) => listarMultas(db, esquemaFiltroMultas.parse(req.query)));
  app.post('/api/multas/:id/pagamento', (req) => pagarMulta(db, esquemaId.parse(req.params).id, hoje()));
}

export function registrarRotas(app: FastifyInstance, dependencias: Dependencias) {
  app.get('/api/saude', () => ({ status: 'ok', hoje: dependencias.hoje() }));
  app.get('/api/painel', () => obterPainel(dependencias.db, dependencias.hoje()));
  rotasUsuarios(app, dependencias);
  rotasLivros(app, dependencias);
  rotasEmprestimos(app, dependencias);
  rotasMultas(app, dependencias);
}
