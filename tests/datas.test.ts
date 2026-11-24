import { describe, it, expect } from 'vitest';
import { CalculadoraEmprestimo } from '../src/domain/CalculadoraEmprestimo';
import { calcularDataDevolucao, calcularDiasAtraso, hojeEmSaoPaulo } from '../src/domain/datas';
import { ArgumentoInvalidoError } from '../src/domain/erros';
import { PerfilUsuario } from '../src/domain/tipos';

function capturarErro(acao: () => unknown): Error {
  try {
    acao();
  } catch (erro) {
    return erro as Error;
  }
  throw new Error('A ação deveria ter lançado um erro');
}

describe('Extensão — data prevista de devolução', () => {
  it.each([
    ['CT39 — Graduação (+15)', PerfilUsuario.GRADUACAO, '2026-03-10', '2026-03-25'],
    ['CT40 — Pós-Graduação (+30), virada de mês', PerfilUsuario.POS_GRADUACAO, '2026-03-10', '2026-04-09'],
    ['CT41 — Professor (+45), virada de ano', PerfilUsuario.PROFESSOR, '2026-12-20', '2027-02-03'],
    ['CT42 — ano bissexto (29/02 existe)', PerfilUsuario.GRADUACAO, '2028-02-20', '2028-03-06'],
    ['CT42 — ano comum (sem 29/02)', PerfilUsuario.GRADUACAO, '2027-02-20', '2027-03-07'],
  ])('%s', (_descricao, perfil, dataEmprestimo, esperado) => {
    // Arrange (dados da tabela)

    // Act
    const dataPrevista = calcularDataDevolucao(dataEmprestimo, perfil);

    // Assert
    expect(dataPrevista).toBe(esperado);
  });

  it.each(['2026-02-30', '2026-13-01', '2026-00-10', '10/03/2026', '', '2026-3-10', ' 2026-03-10'])(
    'CT43 — data inválida (%j) lança ArgumentoInvalidoError',
    (data) => {
      // Arrange
      const perfil = PerfilUsuario.GRADUACAO;

      // Act
      const acao = () => calcularDataDevolucao(data, perfil);

      // Assert
      expect(acao).toThrow(ArgumentoInvalidoError);
    },
  );

  it.each([null, undefined, 20260310])('CT43 — data não-string (%s) lança ArgumentoInvalidoError', (valor) => {
    // Arrange
    const data = valor as unknown as string;

    // Act
    const erro = capturarErro(() => calcularDataDevolucao(data, PerfilUsuario.GRADUACAO));

    // Assert
    expect(erro).toBeInstanceOf(ArgumentoInvalidoError);
    expect(erro.message).toBe(`Data de empréstimo inválida: ${String(valor)}`);
  });

  it('CT43 — mensagem informa a data recebida', () => {
    // Arrange
    const data = '2026-02-30';

    // Act
    const erro = capturarErro(() => calcularDataDevolucao(data, PerfilUsuario.PROFESSOR));

    // Assert
    expect(erro.message).toBe('Data de empréstimo inválida: 2026-02-30');
  });

  it('CT44 — perfil inválido lança ArgumentoInvalidoError', () => {
    // Arrange
    const perfil = 'VISITANTE' as PerfilUsuario;

    // Act
    const acao = () => calcularDataDevolucao('2026-03-10', perfil);

    // Assert
    expect(acao).toThrow(ArgumentoInvalidoError);
  });
});

describe('Extensão — dias de atraso', () => {
  const PREVISTA = '2026-03-25';

  it.each([
    ['CT45 — 5 dias antes', '2026-03-20', 0],
    ['CT45 — no dia previsto', '2026-03-25', 0],
    ['CT46 — 1 dia depois', '2026-03-26', 1],
    ['CT46 — 3 dias (fim da tolerância)', '2026-03-28', 3],
    ['CT46 — 4 dias (início da 1ª faixa)', '2026-03-29', 4],
    ['CT46 — 10 dias (fim da 1ª faixa)', '2026-04-04', 10],
    ['CT46 — 11 dias (início da 2ª faixa)', '2026-04-05', 11],
  ])('%s', (_descricao, dataDevolucao, esperado) => {
    // Arrange (dados da tabela)

    // Act
    const dias = calcularDiasAtraso(PREVISTA, dataDevolucao);

    // Assert
    expect(dias).toBe(esperado);
  });

  it('CT47 — 35 dias de atraso calculados por data geram a multa máxima', () => {
    // Arrange
    const calculadora = new CalculadoraEmprestimo();

    // Act
    const dias = calcularDiasAtraso(PREVISTA, '2026-04-29');
    const multa = calculadora.calcularMulta(dias, PerfilUsuario.GRADUACAO);

    // Assert
    expect(dias).toBe(35);
    expect(multa).toBe(150);
  });

  it.each([
    ['CT48 — fevereiro de ano bissexto', '2028-02-28', '2028-03-01', 2],
    ['CT48 — fevereiro de ano comum', '2027-02-28', '2027-03-01', 1],
    ['CT48 — virada de ano', '2026-12-30', '2027-01-02', 3],
  ])('%s', (_descricao, prevista, devolucao, esperado) => {
    // Arrange (dados da tabela)

    // Act
    const dias = calcularDiasAtraso(prevista, devolucao);

    // Assert
    expect(dias).toBe(esperado);
  });

  it.each([
    ['data prevista', '2026-02-31', '2026-03-01', 'Data prevista de devolução inválida: 2026-02-31'],
    ['data de devolução', '2026-03-01', '01/03/2026', 'Data de devolução inválida: 01/03/2026'],
  ])('CT43 — %s inválida lança erro identificando o campo', (_campo, prevista, devolucao, mensagem) => {
    // Arrange (dados da tabela)

    // Act
    const erro = capturarErro(() => calcularDiasAtraso(prevista, devolucao));

    // Assert
    expect(erro).toBeInstanceOf(ArgumentoInvalidoError);
    expect(erro.message).toBe(mensagem);
  });
});

describe('Extensão — data de hoje no fuso de Brasília', () => {
  it.each([
    ['CT49 — 02:59 UTC ainda é o dia anterior em Brasília', '2026-03-10T02:59:59Z', '2026-03-09'],
    ['CT49 — 03:00 UTC já é o novo dia em Brasília', '2026-03-10T03:00:00Z', '2026-03-10'],
    ['CT49 — virada de ano', '2027-01-01T02:00:00Z', '2026-12-31'],
  ])('%s', (_descricao, instante, esperado) => {
    // Arrange
    const agora = new Date(instante);

    // Act
    const hoje = hojeEmSaoPaulo(agora);

    // Assert
    expect(hoje).toBe(esperado);
  });

  it('CT49 — sem argumento usa o relógio atual e devolve uma data civil', () => {
    // Arrange
    const formato = /^\d{4}-\d{2}-\d{2}$/;

    // Act
    const hoje = hojeEmSaoPaulo();

    // Assert
    expect(hoje).toMatch(formato);
  });

  it.each([new Date('invalida'), 'hoje' as unknown as Date])('CT49 — instante inválido (%s) lança erro', (agora) => {
    // Arrange (instante inválido)

    // Act
    const erro = capturarErro(() => hojeEmSaoPaulo(agora));

    // Assert
    expect(erro).toBeInstanceOf(ArgumentoInvalidoError);
    expect(erro.message).toBe('Instante inválido para calcular a data atual');
  });
});
