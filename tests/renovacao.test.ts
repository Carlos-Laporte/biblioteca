import { describe, it, expect } from 'vitest';
import { ArgumentoInvalidoError, RegraNegocioError } from '../src/domain/erros';
import { validarRenovacao, type PedidoRenovacao } from '../src/domain/renovacao';
import { PerfilUsuario } from '../src/domain/tipos';

const PREVISTA = '2026-03-25';

function pedido(alteracoes: Partial<Record<keyof PedidoRenovacao, unknown>> = {}): PedidoRenovacao {
  return {
    perfil: PerfilUsuario.GRADUACAO,
    dataPrevista: PREVISTA,
    hoje: '2026-03-24',
    renovacoesRealizadas: 0,
    possuiReserva: false,
    possuiPendencia: false,
    ...alteracoes,
  } as PedidoRenovacao;
}

function capturarErro(acao: () => unknown): Error {
  try {
    acao();
  } catch (erro) {
    return erro as Error;
  }
  throw new Error('A ação deveria ter lançado um erro');
}

describe('RF03 — renovação: janela de datas', () => {
  it('CT55 — 4 dias antes da data prevista ainda está fora do período', () => {
    // Arrange
    const entrada = pedido({ hoje: '2026-03-21' });

    // Act
    const erro = capturarErro(() => validarRenovacao(entrada));

    // Assert
    expect(erro).toBeInstanceOf(RegraNegocioError);
    expect((erro as RegraNegocioError).motivo).toBe('FORA_DO_PERIODO');
    expect(erro.message).toBe('Renovação recusada: permitida a partir de 2026-03-22');
  });

  it.each([
    ['CT56 — 3 dias antes (início da janela)', '2026-03-22', '2026-04-06'],
    ['CT57 — no dia previsto (fim da janela)', '2026-03-25', '2026-04-09'],
  ])('%s é aprovada com prazo contado a partir de hoje', (_descricao, hoje, novaData) => {
    // Arrange
    const entrada = pedido({ hoje });

    // Act
    const resultado = validarRenovacao(entrada);

    // Assert
    expect(resultado).toEqual({ aprovada: true, novaDataDevolucao: novaData, renovacoesRestantes: 1 });
  });

  it('CT58 — 1 dia depois da data prevista o empréstimo está em atraso', () => {
    // Arrange
    const entrada = pedido({ hoje: '2026-03-26' });

    // Act
    const erro = capturarErro(() => validarRenovacao(entrada));

    // Assert
    expect(erro).toBeInstanceOf(RegraNegocioError);
    expect((erro as RegraNegocioError).motivo).toBe('ATRASO');
    expect(erro.message).toBe('Renovação recusada: empréstimo vencido em 2026-03-25');
  });
});

describe('RF03 — renovação: limite e prazo por perfil', () => {
  it.each([
    ['nenhuma renovação feita', 0, 1],
    ['uma renovação feita', 1, 0],
  ])('CT59 — %s: aprovada com %i → %i restantes', (_descricao, realizadas, restantes) => {
    // Arrange
    const entrada = pedido({ renovacoesRealizadas: realizadas });

    // Act
    const resultado = validarRenovacao(entrada);

    // Assert
    expect(resultado.renovacoesRestantes).toBe(restantes);
  });

  it('CT59 — com 2 renovações feitas o limite foi atingido', () => {
    // Arrange
    const entrada = pedido({ renovacoesRealizadas: 2 });

    // Act
    const erro = capturarErro(() => validarRenovacao(entrada));

    // Assert
    expect(erro).toBeInstanceOf(RegraNegocioError);
    expect((erro as RegraNegocioError).motivo).toBe('LIMITE_RENOVACOES');
    expect(erro.message).toBe('Renovação recusada: limite de 2 renovações atingido');
  });

  it.each([
    ['Graduação (+15)', PerfilUsuario.GRADUACAO, '2026-04-08'],
    ['Pós-Graduação (+30)', PerfilUsuario.POS_GRADUACAO, '2026-04-23'],
    ['Professor (+45)', PerfilUsuario.PROFESSOR, '2026-05-08'],
  ])('CT60 — %s', (_descricao, perfil, novaData) => {
    // Arrange
    const entrada = pedido({ perfil, hoje: '2026-03-24' });

    // Act
    const resultado = validarRenovacao(entrada);

    // Assert
    expect(resultado.novaDataDevolucao).toBe(novaData);
  });
});

describe('RF03 — renovação: bloqueios', () => {
  it('CT61 — livro reservado por outro usuário não pode ser renovado', () => {
    // Arrange
    const entrada = pedido({ possuiReserva: true });

    // Act
    const erro = capturarErro(() => validarRenovacao(entrada));

    // Assert
    expect(erro).toBeInstanceOf(RegraNegocioError);
    expect((erro as RegraNegocioError).motivo).toBe('RESERVA');
    expect(erro.message).toBe('Renovação recusada: livro reservado por outro usuário');
  });

  it('CT62 — usuário com pendência não pode renovar', () => {
    // Arrange
    const entrada = pedido({ possuiPendencia: true });

    // Act
    const erro = capturarErro(() => validarRenovacao(entrada));

    // Assert
    expect(erro).toBeInstanceOf(RegraNegocioError);
    expect((erro as RegraNegocioError).motivo).toBe('PENDENCIA');
    expect(erro.message).toBe('Renovação recusada: usuário possui multa ou livro em atraso');
  });

  it.each([
    ['atraso vem antes de tudo', { hoje: '2026-03-26', possuiPendencia: true, possuiReserva: true, renovacoesRealizadas: 2 }, 'ATRASO'],
    ['pendência vem antes de reserva', { possuiPendencia: true, possuiReserva: true, renovacoesRealizadas: 2 }, 'PENDENCIA'],
    ['reserva vem antes do limite', { possuiReserva: true, renovacoesRealizadas: 2, hoje: '2026-03-01' }, 'RESERVA'],
    ['limite vem antes do período', { renovacoesRealizadas: 2, hoje: '2026-03-01' }, 'LIMITE_RENOVACOES'],
  ])('CT63 — %s', (_descricao, alteracoes, motivo) => {
    // Arrange
    const entrada = pedido(alteracoes);

    // Act
    const erro = capturarErro(() => validarRenovacao(entrada));

    // Assert
    expect((erro as RegraNegocioError).motivo).toBe(motivo);
  });
});

describe('RF03 — renovação: entradas inválidas', () => {
  it.each([
    ['perfil desconhecido', { perfil: 'VISITANTE' }, 'Perfil de usuário inválido: VISITANTE'],
    ['perfil nulo', { perfil: null }, 'Perfil de usuário inválido: null'],
    ['data prevista inexistente', { dataPrevista: '2026-02-30' }, 'Data prevista de devolução inválida: 2026-02-30'],
    ['data atual em outro formato', { hoje: '24/03/2026' }, 'Data atual inválida: 24/03/2026'],
    ['renovações negativas', { renovacoesRealizadas: -1 }, 'Quantidade de renovações realizadas inválido(a): -1 (mínimo 0)'],
    ['renovações não inteiras', { renovacoesRealizadas: 1.5 }, 'Quantidade de renovações realizadas inválido(a): 1.5 (mínimo 0)'],
    ['reserva não booleana', { possuiReserva: undefined }, 'Indicador de reserva deve ser booleano'],
    ['pendência não booleana', { possuiPendencia: 'sim' }, 'Indicador de pendência deve ser booleano'],
  ])('CT64 — %s lança ArgumentoInvalidoError', (_descricao, alteracoes, mensagem) => {
    // Arrange
    const entrada = pedido(alteracoes);

    // Act
    const erro = capturarErro(() => validarRenovacao(entrada));

    // Assert
    expect(erro).toBeInstanceOf(ArgumentoInvalidoError);
    expect(erro.message).toBe(mensagem);
  });
});
