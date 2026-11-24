import { describe, it, expect } from 'vitest';
import { ArgumentoInvalidoError } from '../src/domain/erros';
import { contarLivrosEmUso, possuiPendencia } from '../src/domain/pendencias';

const HOJE = '2026-03-25';

function capturarErro(acao: () => unknown): Error {
  try {
    acao();
  } catch (erro) {
    return erro as Error;
  }
  throw new Error('A ação deveria ter lançado um erro');
}

describe('Extensão — pendência do usuário', () => {
  it('CT50 — sem multas e sem empréstimos ativos não há pendência', () => {
    // Arrange
    const situacao = { multasEmAberto: 0, datasPrevistasAtivas: [], hoje: HOJE };

    // Act
    const pendente = possuiPendencia(situacao);

    // Assert
    expect(pendente).toBe(false);
  });

  it('CT51 — uma multa em aberto gera pendência', () => {
    // Arrange
    const situacao = { multasEmAberto: 1, datasPrevistasAtivas: [], hoje: HOJE };

    // Act
    const pendente = possuiPendencia(situacao);

    // Assert
    expect(pendente).toBe(true);
  });

  it.each([
    ['CT52 — vence hoje: ainda no prazo', ['2026-03-25'], false],
    ['CT52 — vence amanhã: no prazo', ['2026-03-26'], false],
    ['CT52 — venceu ontem: em atraso', ['2026-03-24'], true],
    ['CT52 — um em dia e outro em atraso', ['2026-04-10', '2026-03-01'], true],
  ])('%s', (_descricao, datasPrevistasAtivas, esperado) => {
    // Arrange
    const situacao = { multasEmAberto: 0, datasPrevistasAtivas, hoje: HOJE };

    // Act
    const pendente = possuiPendencia(situacao);

    // Assert
    expect(pendente).toBe(esperado);
  });

  it.each([
    ['multas negativas', { multasEmAberto: -1, datasPrevistasAtivas: [], hoje: HOJE },
      'Quantidade de multas em aberto inválido(a): -1 (mínimo 0)'],
    ['multas não inteiras', { multasEmAberto: 1.5, datasPrevistasAtivas: [], hoje: HOJE },
      'Quantidade de multas em aberto inválido(a): 1.5 (mínimo 0)'],
    ['data atual inválida', { multasEmAberto: 0, datasPrevistasAtivas: [], hoje: '25/03/2026' },
      'Data atual inválida: 25/03/2026'],
    ['data prevista inválida', { multasEmAberto: 0, datasPrevistasAtivas: ['2026-02-30'], hoje: HOJE },
      'Data prevista de devolução inválida: 2026-02-30'],
  ])('CT53 — %s lança ArgumentoInvalidoError', (_caso, situacao, mensagem) => {
    // Arrange (situação da tabela)

    // Act
    const erro = capturarErro(() => possuiPendencia(situacao));

    // Assert
    expect(erro).toBeInstanceOf(ArgumentoInvalidoError);
    expect(erro.message).toBe(mensagem);
  });

  it('CT53 — com multa em aberto, a data atual ainda é validada', () => {
    // Arrange
    const situacao = { multasEmAberto: 2, datasPrevistasAtivas: [], hoje: 'ontem' };

    // Act
    const acao = () => possuiPendencia(situacao);

    // Assert
    expect(acao).toThrow(ArgumentoInvalidoError);
  });
});

describe('Extensão — livros em uso', () => {
  it('CT54 — conta apenas os empréstimos sem data de devolução', () => {
    // Arrange
    const emprestimos = [{ dataDevolucao: null }, { dataDevolucao: '2026-03-20' }, { dataDevolucao: null }];

    // Act
    const emUso = contarLivrosEmUso(emprestimos);

    // Assert
    expect(emUso).toBe(2);
  });

  it('CT54 — lista vazia resulta em zero livros em uso', () => {
    // Arrange
    const emprestimos: { dataDevolucao: string | null }[] = [];

    // Act
    const emUso = contarLivrosEmUso(emprestimos);

    // Assert
    expect(emUso).toBe(0);
  });
});
