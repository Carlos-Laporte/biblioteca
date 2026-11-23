import { describe, it, expect, beforeEach } from 'vitest';
import { CalculadoraEmprestimo } from '../src/domain/CalculadoraEmprestimo';
import { PerfilUsuario } from '../src/domain/tipos';

describe('RF02 — Teto máximo da multa (R$ 150,00)', () => {
  let calculadora: CalculadoraEmprestimo;

  beforeEach(() => {
    // Arrange (comum)
    calculadora = new CalculadoraEmprestimo();
  });

  it.each([
    ['CT26 — teto − 1 dia', 34, 145],
    ['CT27 — ponto exato do teto', 35, 150],
    ['CT28 — teto + 1 dia', 36, 150],
    ['CT29 — valor extremo', 1000, 150],
  ])('%s: %i dias => R$ %d', (_descricao, dias, esperado) => {
    // Arrange
    const perfil = PerfilUsuario.POS_GRADUACAO;

    // Act
    const multa = calculadora.calcularMulta(dias, perfil);

    // Assert
    expect(multa).toBe(esperado);
  });

  it('a multa nunca ultrapassa R$ 150,00 para 0..400 dias', () => {
    // Arrange
    const dias = Array.from({ length: 401 }, (_, i) => i);

    // Act
    const maiorMulta = Math.max(...dias.map((d) => calculadora.calcularMulta(d, PerfilUsuario.PROFESSOR)));

    // Assert
    expect(maiorMulta).toBe(150);
  });
});
