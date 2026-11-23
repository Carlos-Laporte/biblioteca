import { describe, it, expect, beforeEach } from 'vitest';
import { CalculadoraEmprestimo } from '../src/domain/CalculadoraEmprestimo';
import { ArgumentoInvalidoError, RegraNegocioError } from '../src/domain/erros';
import { PerfilUsuario } from '../src/domain/tipos';

/**
 * Testes complementares criados a partir da análise de mutação (Stryker):
 * 100% de cobertura não detectava mensagens de erro vazias nem perfis não-string.
 */
describe('Complementares — robustez e mensagens de erro', () => {
  let calculadora: CalculadoraEmprestimo;

  beforeEach(() => {
    // Arrange (comum)
    calculadora = new CalculadoraEmprestimo();
  });

  function capturarErro(acao: () => unknown): Error {
    try {
      acao();
    } catch (erro) {
      return erro as Error;
    }
    throw new Error('A ação deveria ter lançado um erro');
  }

  it.each([
    ['array', ['GRADUACAO']],
    ['objeto com toString', { toString: () => 'PROFESSOR' }],
    ['número', 3],
  ])('CT33 — perfil não-string (%s) é rejeitado mesmo se convertido para um perfil válido', (_tipo, valor) => {
    // Arrange
    const perfil = valor as unknown as PerfilUsuario;

    // Act
    const acaoEmprestimo = () => calculadora.validarEmprestimo(perfil, 0, 1, false);
    const acaoMulta = () => calculadora.calcularMulta(5, perfil);

    // Assert
    expect(acaoEmprestimo).toThrow(ArgumentoInvalidoError);
    expect(acaoMulta).toThrow(ArgumentoInvalidoError);
  });

  it('CT34 — erro de argumento identifica o perfil recebido e o nome da classe', () => {
    // Arrange
    const perfil = 'VISITANTE' as PerfilUsuario;

    // Act
    const erro = capturarErro(() => calculadora.validarEmprestimo(perfil, 0, 1, false));

    // Assert
    expect(erro.name).toBe('ArgumentoInvalidoError');
    expect(erro.message).toBe('Perfil de usuário inválido: VISITANTE');
  });

  it.each([
    ['livros emprestados', () => new CalculadoraEmprestimo().validarEmprestimo('GRADUACAO', -1, 1, false),
      'Quantidade de livros emprestados inválido(a): -1 (mínimo 0)'],
    ['livros solicitados', () => new CalculadoraEmprestimo().validarEmprestimo('GRADUACAO', 0, 0, false),
      'Quantidade de livros solicitados inválido(a): 0 (mínimo 1)'],
    ['dias de atraso', () => new CalculadoraEmprestimo().calcularMulta(-1, 'GRADUACAO'),
      'Quantidade de dias de atraso inválido(a): -1 (mínimo 0)'],
  ])('CT35 — mensagem de quantidade inválida informa campo, valor e mínimo (%s)', (_campo, acao, esperado) => {
    // Arrange (ação e mensagem esperada vêm da tabela)

    // Act
    const erro = capturarErro(acao);

    // Assert
    expect(erro.message).toBe(esperado);
  });

  it('CT36 — mensagem de pendência inválida identifica o campo', () => {
    // Arrange
    const pendencia = 'sim' as unknown as boolean;

    // Act
    const erro = capturarErro(() => calculadora.validarEmprestimo(PerfilUsuario.GRADUACAO, 0, 1, pendencia));

    // Assert
    expect(erro.message).toBe('Indicador de pendência deve ser booleano');
  });

  it('CT37 — recusa por pendência explica o motivo ao usuário', () => {
    // Arrange
    const possuiPendencia = true;

    // Act
    const erro = capturarErro(() =>
      calculadora.validarEmprestimo(PerfilUsuario.PROFESSOR, 0, 1, possuiPendencia),
    ) as RegraNegocioError;

    // Assert
    expect(erro.name).toBe('RegraNegocioError');
    expect(erro.motivo).toBe('PENDENCIA');
    expect(erro.message).toBe('Empréstimo recusado: usuário possui multa ou livro em atraso');
  });

  it('CT38 — recusa por limite informa o total e o limite do perfil', () => {
    // Arrange
    const perfil = PerfilUsuario.POS_GRADUACAO;

    // Act
    const erro = capturarErro(() => calculadora.validarEmprestimo(perfil, 5, 1, false));

    // Assert
    expect(erro.message).toBe('Empréstimo recusado: 6 livros excede o limite de 5');
  });
});
