import { describe, it, expect, beforeEach } from 'vitest';
import { CalculadoraEmprestimo } from '../src/domain/CalculadoraEmprestimo';
import { ArgumentoInvalidoError } from '../src/domain/erros';
import { PerfilUsuario } from '../src/domain/tipos';

describe('RF02 — Cálculo de multa por atraso', () => {
  let calculadora: CalculadoraEmprestimo;

  beforeEach(() => {
    // Arrange (comum)
    calculadora = new CalculadoraEmprestimo();
  });

  describe('Tolerância (0 a 3 dias)', () => {
    it.each([
      ['CT21', 0],
      ['CT22', 3],
    ])('%s — %i dias de atraso: isenção (R$ 0,00)', (_id, dias) => {
      // Arrange
      const perfil = PerfilUsuario.GRADUACAO;

      // Act
      const multa = calculadora.calcularMulta(dias, perfil);

      // Assert
      expect(multa).toBe(0);
    });
  });

  describe('Primeira faixa (4 a 10 dias: R$ 2,50/dia desde o 1º dia)', () => {
    it.each([
      ['CT23', 4, 10],
      ['CE18', 7, 17.5],
      ['CT24', 10, 25],
    ])('%s — %i dias de atraso: R$ %d', (_id, dias, esperado) => {
      // Arrange
      const perfil = PerfilUsuario.GRADUACAO;

      // Act
      const multa = calculadora.calcularMulta(dias, perfil);

      // Assert
      expect(multa).toBe(esperado);
    });
  });

  describe('Segunda faixa (> 10 dias: 10 × 2,50 + R$ 5,00/dia excedente)', () => {
    it.each([
      ['CT25', 11, 30],
      ['CE19', 20, 75],
    ])('%s — %i dias de atraso: R$ %d', (_id, dias, esperado) => {
      // Arrange
      const perfil = PerfilUsuario.PROFESSOR;

      // Act
      const multa = calculadora.calcularMulta(dias, perfil);

      // Assert
      expect(multa).toBe(esperado);
    });
  });

  describe('Entradas inválidas', () => {
    it('CT20 — -1 dia de atraso lança ArgumentoInvalidoError', () => {
      // Arrange
      const dias = -1;

      // Act
      const acao = () => calculadora.calcularMulta(dias, PerfilUsuario.GRADUACAO);

      // Assert
      expect(acao).toThrow(ArgumentoInvalidoError);
    });

    it.each([4.5, Number.NaN])('CT30 — dias não inteiro (%s) lança ArgumentoInvalidoError', (dias) => {
      // Arrange
      const perfil = PerfilUsuario.GRADUACAO;

      // Act
      const acao = () => calculadora.calcularMulta(dias, perfil);

      // Assert
      expect(acao).toThrow(ArgumentoInvalidoError);
    });

    it.each([null, undefined, 'VISITANTE'])('CT31 — perfil inválido (%s) lança ArgumentoInvalidoError', (valor) => {
      // Arrange
      const perfil = valor as unknown as PerfilUsuario;

      // Act
      const acao = () => calculadora.calcularMulta(5, perfil);

      // Assert
      expect(acao).toThrow(ArgumentoInvalidoError);
    });
  });

  it('CT32 — a multa independe do perfil do usuário', () => {
    // Arrange
    const dias = 15;

    // Act
    const multas = [PerfilUsuario.GRADUACAO, PerfilUsuario.POS_GRADUACAO, PerfilUsuario.PROFESSOR].map(
      (perfil) => calculadora.calcularMulta(dias, perfil),
    );

    // Assert
    expect(multas).toEqual([50, 50, 50]);
  });
});
