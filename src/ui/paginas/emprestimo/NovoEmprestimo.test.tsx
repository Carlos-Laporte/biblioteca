import { screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { fabricarUsuario, livroFalso, renderizar, simularApi } from '../../testes/utilitarios';
import { NovoEmprestimo } from './NovoEmprestimo';

const LIVROS = [livroFalso(1, 'Dom Casmurro'), livroFalso(2, 'Vidas Secas'), livroFalso(3, 'Iracema', 0)];

function prepararApi(usuario = fabricarUsuario()) {
  return simularApi({
    'GET /api/usuarios': () => [200, [usuario]],
    'GET /api/livros': () => [200, LIVROS],
    'POST /api/emprestimos': () => [201, { limite: 3, totalAposEmprestimo: 1, prazoDevolucaoDias: 15, dataEmprestimo: '2026-03-25', dataPrevista: '2026-04-09' }],
  });
}

async function abrirComUsuario(usuario = fabricarUsuario()) {
  const api = prepararApi(usuario);
  const tela = renderizar(<NovoEmprestimo />, { rota: `/emprestimos/novo?usuario=${usuario.id}`, caminho: '/emprestimos/novo' });
  await screen.findByText('Dom Casmurro');
  return { api, ...tela };
}

describe('UI — Novo empréstimo (RF01 em tempo real)', () => {
  it('UI10 — sem livros marcados o pedido fica incompleto e o botão desabilitado', async () => {
    // Arrange
    await abrirComUsuario();

    // Act
    const botao = screen.getByRole('button', { name: 'Confirmar empréstimo' });

    // Assert
    expect(screen.getByText('Selecione ao menos um livro.')).toBeInTheDocument();
    expect(botao).toBeDisabled();
  });

  it('UI11 — marcar livros mostra a data prevista calculada pelo domínio e envia o pedido', async () => {
    // Arrange
    const { api, usuario } = await abrirComUsuario();

    // Act
    await usuario.click(screen.getByLabelText(/Dom Casmurro/));
    await usuario.click(screen.getByRole('button', { name: 'Confirmar empréstimo' }));

    // Assert
    expect(await screen.findByText('Página do usuário')).toBeInTheDocument();
    const pedido = api.chamadas.find((chamada) => chamada.metodo === 'POST');
    expect(pedido?.corpo).toMatchObject({ usuarioId: 1, livroIds: [1] });
  });

  it('UI12 — usuário no limite é recusado antes de chegar à API', async () => {
    // Arrange
    const { usuario } = await abrirComUsuario(fabricarUsuario({ resumo: { livrosEmUso: 3 } }));

    // Act
    await usuario.click(screen.getByLabelText(/Vidas Secas/));

    // Assert
    expect(screen.getByText('Empréstimo recusado')).toBeInTheDocument();
    expect(screen.getByText('Empréstimo recusado: 4 livros excede o limite de 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar empréstimo' })).toBeDisabled();
  });

  it('UI13 — usuário com pendência é recusado com o motivo do RF01', async () => {
    // Arrange
    const { usuario } = await abrirComUsuario(fabricarUsuario({ resumo: { multasEmAberto: 1, pendente: true } }));

    // Act
    await usuario.click(screen.getByLabelText(/Dom Casmurro/));

    // Assert
    expect(screen.getByText('Empréstimo recusado: usuário possui multa ou livro em atraso')).toBeInTheDocument();
  });

  it('UI14 — livro sem exemplares fica desabilitado', async () => {
    // Arrange
    await abrirComUsuario();

    // Act
    const indisponivel = screen.getByLabelText(/Iracema/);

    // Assert
    expect(indisponivel).toBeDisabled();
  });

  it('UI15 — recusa vinda da API é exibida ao usuário', async () => {
    // Arrange
    simularApi({
      'GET /api/usuarios': () => [200, [fabricarUsuario()]],
      'GET /api/livros': () => [200, LIVROS],
      'POST /api/emprestimos': () => [422, { erro: 'OPERACAO_RECUSADA', motivo: 'LIVRO_INDISPONIVEL', mensagem: 'Sem exemplares disponíveis de "Dom Casmurro"' }],
    });
    const { usuario } = renderizar(<NovoEmprestimo />, { rota: '/emprestimos/novo?usuario=1', caminho: '/emprestimos/novo' });
    await screen.findByText('Dom Casmurro');

    // Act
    await usuario.click(screen.getByLabelText(/Dom Casmurro/));
    await usuario.click(screen.getByRole('button', { name: 'Confirmar empréstimo' }));

    // Assert
    expect(await screen.findByText('Sem exemplares disponíveis de "Dom Casmurro"')).toBeInTheDocument();
  });
});
