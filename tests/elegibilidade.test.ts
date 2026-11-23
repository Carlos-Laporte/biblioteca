import { describe, it, expect, beforeEach } from 'vitest';
import { CalculadoraEmprestimo } from '../src/domain/CalculadoraEmprestimo';
import { RegraNegocioError } from '../src/domain/erros';
import { PerfilUsuario } from '../src/domain/tipos';

describe('RF01 — Elegibilidade e prazo de empréstimo', () => {
  let calculadora: CalculadoraEmprestimo;

  beforeEach(() => {
    // Arrange (comum a todos os testes)
    calculadora = new CalculadoraEmprestimo();
  });

  describe('Graduação (limite 3, prazo 15 dias)', () => {
    it('CT01 — aprova 0 + 3 livros (total = limite) com prazo de 15 dias', () => {
      // Arrange
      const perfil = PerfilUsuario.GRADUACAO;

      // Act
      const resultado = calculadora.validarEmprestimo(perfil, 0, 3, false);

      // Assert
      expect(resultado).toEqual({
        aprovado: true,
        perfil,
        limite: 3,
        totalAposEmprestimo: 3,
        prazoDevolucaoDias: 15,
      });
    });

    it('CT02 — aprova 2 + 1 livros (total = limite)', () => {
      // Arrange
      const perfil = PerfilUsuario.GRADUACAO;

      // Act
      const resultado = calculadora.validarEmprestimo(perfil, 2, 1, false);

      // Assert
      expect(resultado.aprovado).toBe(true);
      expect(resultado.totalAposEmprestimo).toBe(3);
    });

    it('CT03 — recusa 3 + 1 livros (limite + 1)', () => {
      // Arrange
      const perfil = PerfilUsuario.GRADUACAO;

      // Act
      const acao = () => calculadora.validarEmprestimo(perfil, 3, 1, false);

      // Assert
      expect(acao).toThrow(RegraNegocioError);
      expect(acao).toThrow(expect.objectContaining({ motivo: 'LIMITE_EXCEDIDO' }));
    });

    it('CT04 — recusa 0 + 4 livros (limite + 1)', () => {
      // Arrange
      const perfil = PerfilUsuario.GRADUACAO;

      // Act
      const acao = () => calculadora.validarEmprestimo(perfil, 0, 4, false);

      // Assert
      expect(acao).toThrow(expect.objectContaining({ motivo: 'LIMITE_EXCEDIDO' }));
    });

    it('CT09 — aprova 0 + 1 livro (mínimo válido)', () => {
      // Arrange
      const perfil = PerfilUsuario.GRADUACAO;

      // Act
      const resultado = calculadora.validarEmprestimo(perfil, 0, 1, false);

      // Assert
      expect(resultado.totalAposEmprestimo).toBe(1);
      expect(resultado.prazoDevolucaoDias).toBe(15);
    });
  });

  describe('Pós-Graduação (limite 5, prazo 30 dias)', () => {
    it('CT05 — aprova 4 + 1 livros (total = limite) com prazo de 30 dias', () => {
      // Arrange
      const perfil = PerfilUsuario.POS_GRADUACAO;

      // Act
      const resultado = calculadora.validarEmprestimo(perfil, 4, 1, false);

      // Assert
      expect(resultado).toEqual({
        aprovado: true,
        perfil,
        limite: 5,
        totalAposEmprestimo: 5,
        prazoDevolucaoDias: 30,
      });
    });

    it('CT06 — recusa 5 + 1 livros (limite + 1)', () => {
      // Arrange
      const perfil = PerfilUsuario.POS_GRADUACAO;

      // Act
      const acao = () => calculadora.validarEmprestimo(perfil, 5, 1, false);

      // Assert
      expect(acao).toThrow(expect.objectContaining({ motivo: 'LIMITE_EXCEDIDO' }));
    });
  });

  describe('Professor (limite 10, prazo 45 dias)', () => {
    it('CT07 — aprova 9 + 1 livros (total = limite) com prazo de 45 dias', () => {
      // Arrange
      const perfil = PerfilUsuario.PROFESSOR;

      // Act
      const resultado = calculadora.validarEmprestimo(perfil, 9, 1, false);

      // Assert
      expect(resultado).toEqual({
        aprovado: true,
        perfil,
        limite: 10,
        totalAposEmprestimo: 10,
        prazoDevolucaoDias: 45,
      });
    });

    it('CT08 — recusa 10 + 1 livros (limite + 1)', () => {
      // Arrange
      const perfil = PerfilUsuario.PROFESSOR;

      // Act
      const acao = () => calculadora.validarEmprestimo(perfil, 10, 1, false);

      // Assert
      expect(acao).toThrow(expect.objectContaining({ motivo: 'LIMITE_EXCEDIDO' }));
    });
  });
});
