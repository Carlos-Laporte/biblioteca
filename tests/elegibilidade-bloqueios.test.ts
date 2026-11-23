import { describe, it, expect, beforeEach } from 'vitest';
import { CalculadoraEmprestimo } from '../src/domain/CalculadoraEmprestimo';
import { ArgumentoInvalidoError, RegraNegocioError } from '../src/domain/erros';
import { PerfilUsuario } from '../src/domain/tipos';

describe('RF01 — Bloqueios e entradas inválidas', () => {
  let calculadora: CalculadoraEmprestimo;

  beforeEach(() => {
    // Arrange (comum)
    calculadora = new CalculadoraEmprestimo();
  });

  describe('Bloqueio por pendência', () => {
    it.each([PerfilUsuario.GRADUACAO, PerfilUsuario.POS_GRADUACAO, PerfilUsuario.PROFESSOR])(
      'CT12 — recusa %s com pendência mesmo dentro do limite',
      (perfil) => {
        // Arrange
        const possuiPendencia = true;

        // Act
        const acao = () => calculadora.validarEmprestimo(perfil, 0, 1, possuiPendencia);

        // Assert
        expect(acao).toThrow(RegraNegocioError);
        expect(acao).toThrow(expect.objectContaining({ motivo: 'PENDENCIA' }));
      },
    );

    it('CT19 — pendência tem prioridade sobre o limite excedido', () => {
      // Arrange
      const perfil = PerfilUsuario.GRADUACAO;

      // Act
      const acao = () => calculadora.validarEmprestimo(perfil, 3, 5, true);

      // Assert
      expect(acao).toThrow(expect.objectContaining({ motivo: 'PENDENCIA' }));
    });
  });

  describe('Perfil inválido', () => {
    it.each([
      ['CT13 — nulo', null],
      ['CT14 — indefinido', undefined],
      ['CT15 — desconhecido', 'VISITANTE'],
    ])('%s lança ArgumentoInvalidoError', (_descricao, perfilInvalido) => {
      // Arrange
      const perfil = perfilInvalido as unknown as PerfilUsuario;

      // Act
      const acao = () => calculadora.validarEmprestimo(perfil, 0, 1, false);

      // Assert
      expect(acao).toThrow(ArgumentoInvalidoError);
    });
  });

  describe('Quantidade de livros inválida', () => {
    it('CT10 — livros emprestados = -1 lança ArgumentoInvalidoError', () => {
      // Arrange
      const livrosEmprestados = -1;

      // Act
      const acao = () =>
        calculadora.validarEmprestimo(PerfilUsuario.GRADUACAO, livrosEmprestados, 1, false);

      // Assert
      expect(acao).toThrow(ArgumentoInvalidoError);
    });

    it.each([1.5, Number.NaN])('CT16 — livros emprestados não inteiro (%s) lança erro', (valor) => {
      // Arrange
      const livrosEmprestados = valor;

      // Act
      const acao = () =>
        calculadora.validarEmprestimo(PerfilUsuario.GRADUACAO, livrosEmprestados, 1, false);

      // Assert
      expect(acao).toThrow(ArgumentoInvalidoError);
    });

    it.each([0, -2])('CT11 — livros solicitados = %s lança ArgumentoInvalidoError', (valor) => {
      // Arrange
      const livrosSolicitados = valor;

      // Act
      const acao = () =>
        calculadora.validarEmprestimo(PerfilUsuario.GRADUACAO, 0, livrosSolicitados, false);

      // Assert
      expect(acao).toThrow(ArgumentoInvalidoError);
    });

    it.each([2.5, Number.POSITIVE_INFINITY])(
      'CT17 — livros solicitados não inteiro (%s) lança erro',
      (valor) => {
        // Arrange
        const livrosSolicitados = valor;

        // Act
        const acao = () =>
          calculadora.validarEmprestimo(PerfilUsuario.GRADUACAO, 0, livrosSolicitados, false);

        // Assert
        expect(acao).toThrow(ArgumentoInvalidoError);
      },
    );
  });

  describe('Indicador de pendência inválido', () => {
    it('CT18 — pendência não booleana lança ArgumentoInvalidoError', () => {
      // Arrange
      const pendencia = undefined as unknown as boolean;

      // Act
      const acao = () => calculadora.validarEmprestimo(PerfilUsuario.GRADUACAO, 0, 1, pendencia);

      // Assert
      expect(acao).toThrow(ArgumentoInvalidoError);
    });
  });
});
