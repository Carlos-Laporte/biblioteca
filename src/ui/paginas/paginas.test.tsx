import { fireEvent, screen, within } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Layout } from '../layout/Layout';
import { fabricarUsuario, renderizar, simularApi } from '../testes/utilitarios';
import { Devolucoes } from './Devolucoes';
import { Multas } from './Multas';
import { Painel } from './Painel';
import { Usuarios } from './usuarios/Usuarios';

const EMPRESTIMO_ATRASADO = {
  id: 7,
  dataEmprestimo: '2000-01-01',
  dataPrevista: '2000-01-16',
  dataDevolucao: null,
  diasAtraso: 12,
  usuario: { id: 1, nome: 'Ana Souza', matricula: 'G1', perfil: 'GRADUACAO' },
  livro: { id: 1, titulo: 'Dom Casmurro', autor: 'Machado de Assis' },
};

describe('UI — páginas', () => {
  it('UI20 — painel mostra os indicadores e a multa estimada pelo domínio', async () => {
    // Arrange
    simularApi({
      'GET /api/painel': () => [200, {
        hoje: '2026-03-25', emprestimosAtivos: 4, emprestimosAtrasados: 1, multasEmAbertoCentavos: 4250,
        usuariosBloqueados: 1, totalUsuarios: 15, proximosVencimentos: [], maioresAtrasos: [EMPRESTIMO_ATRASADO],
      }],
    });

    // Act
    renderizar(<Painel />);

    // Assert
    expect(await screen.findByText('R$ 42,50')).toBeInTheDocument();
    expect(screen.getByText('Situação da biblioteca em 25/03/2026')).toBeInTheDocument();
    expect(screen.getByText('R$ 35,00', { selector: 'td' })).toBeInTheDocument(); // 12 dias → 25 + 2 × 5
    expect(screen.getByText('Nenhum empréstimo ativo no prazo')).toBeInTheDocument();
  });

  it('UI21 — erro da API mostra alerta e permite tentar de novo', async () => {
    // Arrange
    simularApi({ 'GET /api/painel': () => [500, { erro: 'ERRO_INTERNO', mensagem: 'Erro interno do servidor' }] });

    // Act
    renderizar(<Painel />);

    // Assert
    expect(await screen.findByText('Não foi possível carregar os dados')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument();
  });

  it('UI22 — devolução mostra a multa prevista para a data escolhida e confirma', async () => {
    // Arrange
    const api = simularApi({
      'GET /api/emprestimos': () => [200, [EMPRESTIMO_ATRASADO]],
      'POST /api/emprestimos/7/devolucao': () => [200, { diasAtraso: 12, multa: { id: 1, valorCentavos: 3500 } }],
    });
    const { usuario } = renderizar(<Devolucoes />);
    await usuario.click(await screen.findByRole('button', { name: 'Devolver' }));

    // Act (prevista 16/01: dia 19 = 3 dias, ainda na tolerância; dia 20 = 4 dias → R$ 10,00)
    const data = screen.getByLabelText('Data da devolução');
    const dialogo = screen.getByRole('dialog');
    fireEvent.change(data, { target: { value: '2000-01-19' } });
    expect(within(dialogo).getByText('Sem multa')).toBeInTheDocument();
    fireEvent.change(data, { target: { value: '2000-01-20' } });
    expect(within(dialogo).getByText('Multa de R$ 10,00')).toBeInTheDocument();
    await usuario.click(within(dialogo).getByRole('button', { name: 'Confirmar devolução' }));

    // Assert
    expect(api.chamadas.find((chamada) => chamada.metodo === 'POST')).toMatchObject({ corpo: { dataDevolucao: '2000-01-20' } });
    expect(await screen.findByText('Devolução registrada com multa de R$ 35,00')).toBeInTheDocument();
  });

  it('UI24 — lista de multas permite registrar pagamento', async () => {
    // Arrange
    const multa = { id: 3, diasAtraso: 12, valorCentavos: 3500, pagaEm: null, emprestimoId: 7, dataDevolucao: '2026-03-20',
      usuario: { id: 1, nome: 'Ana Souza', matricula: 'G1' }, livro: { id: 1, titulo: 'Dom Casmurro' } };
    const api = simularApi({
      'GET /api/multas': () => [200, [multa]],
      'POST /api/multas/3/pagamento': () => [200, { ...multa, pagaEm: '2026-03-25' }],
    });
    const { usuario } = renderizar(<Multas />);

    // Act
    await usuario.click(await screen.findByRole('button', { name: 'Registrar pagamento' }));
    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirmar pagamento' }));

    // Assert
    expect(await screen.findByText('Pagamento de R$ 35,00 registrado')).toBeInTheDocument();
    expect(api.chamadas.some((chamada) => chamada.caminho === '/api/multas/3/pagamento')).toBe(true);
  });

  it('UI25 — cadastro de usuário mostra os erros de validação da API em cada campo', async () => {
    // Arrange
    simularApi({
      'GET /api/usuarios': () => [200, [fabricarUsuario()]],
      'POST /api/usuarios': () => [400, { erro: 'ENTRADA_INVALIDA', mensagem: 'Dados inválidos', campos: [{ campo: 'email', mensagem: 'E-mail inválido' }] }],
    });
    const { usuario } = renderizar(<Usuarios />);
    await screen.findByText('Ana Souza');

    // Act
    await usuario.click(screen.getByRole('button', { name: 'Novo usuário' }));
    await usuario.type(screen.getByLabelText('E-mail'), 'ana');
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }));

    // Assert
    expect(await screen.findByText('E-mail inválido')).toBeInTheDocument();
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('aria-invalid', 'true');
  });

  it('UI26 — alternar o tema aplica e lembra a escolha', async () => {
    // Arrange
    simularApi({});
    const { usuario } = renderizar(<Layout />);

    // Act
    await usuario.click(screen.getByRole('button', { name: 'Ativar tema escuro' }));

    // Assert
    expect(document.documentElement.dataset.tema).toBe('escuro');
    expect(localStorage.getItem('biblioteca-tema')).toBe('escuro');
    expect(screen.getByRole('button', { name: 'Ativar tema claro' })).toBeInTheDocument();
  });
});
